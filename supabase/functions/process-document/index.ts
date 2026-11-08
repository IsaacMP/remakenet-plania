// POST /process-document  { document_id, locale, mode?: "all" | "quiz" }
// Lee el documento del alumno y genera resumen, tarjetas y examen (mode "all"),
// o solo un examen nuevo (mode "quiz"). Responde de inmediato (202) y trabaja en segundo plano;
// la app observa el estado del documento.
import type { SupabaseClient } from "../_shared/deps.ts";
import { currentProvider, generate, StudyError, type StudyDoc } from "../_shared/ai.ts";
import { adminClient, corsHeaders, json, requireUser } from "../_shared/http.ts";
import { countPdfPages, extractDocx, extractPptx, MIME } from "../_shared/extract.ts";
import { type Plan, PLAN_LIMITS } from "../_shared/plans.ts";
import {
  cleanQuiz,
  type Locale,
  packInstructions,
  QuizOnlySchema,
  quizInstructions,
  StudyPackSchema,
  systemPrompt,
} from "../_shared/study.ts";

declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void };

const STALE_MS = 6 * 60 * 1000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const admin = adminClient();
  const user = await requireUser(req, admin);
  if (!user) return json({ error: "not_authenticated" }, 401);

  let body: { document_id?: string; locale?: string; mode?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "bad_request" }, 400);
  }
  const locale: Locale = body.locale === "en" ? "en" : "es";
  const mode = body.mode === "quiz" ? "quiz" : "all";
  if (!body.document_id) return json({ error: "bad_request" }, 400);

  const { data: doc } = await admin
    .from("documents")
    .select("*")
    .eq("id", body.document_id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!doc) return json({ error: "not_found" }, 404);

  if (
    doc.status === "processing" && doc.processing_started_at &&
    Date.now() - new Date(doc.processing_started_at).getTime() < STALE_MS
  ) {
    return json({ error: "already_processing" }, 409);
  }

  // Límite del plan
  const { data: profile } = await admin.from("profiles").select("plan, pro_until").eq("id", user.id).single();
  const plan: Plan = profile?.plan === "pro" && (!profile.pro_until || new Date(profile.pro_until) > new Date())
    ? "pro"
    : "free";
  const limits = PLAN_LIMITS[plan];
  const { data: used } = await admin.rpc("ai_usage_this_month", { uid: user.id });
  if ((used ?? 0) >= limits.generationsPerMonth) {
    return json({ error: "limit_reached", plan, limit: limits.generationsPerMonth }, 402);
  }
  if (doc.size_bytes > limits.maxFileBytes) {
    return json({ error: "file_too_large", plan, limit: limits.maxFileBytes }, 413);
  }

  await admin.from("documents").update({
    status: "processing",
    error_code: null,
    processing_started_at: new Date().toISOString(),
  }).eq("id", doc.id);

  EdgeRuntime.waitUntil(
    run(admin, doc, user.id, plan, locale, mode).catch(async (err) => {
      const code = err instanceof StudyError ? err.code : "ai_error";
      console.error("process-document failed", doc.id, err);
      // Si era un examen extra, el documento sigue listo con su material anterior
      await admin.from("documents").update({
        status: mode === "quiz" ? "ready" : "failed",
        error_code: code,
      }).eq("id", doc.id);
    }),
  );

  return json({ status: "processing" }, 202);
});

type DocRow = {
  id: string;
  subject_id: string;
  title: string;
  file_path: string;
  mime_type: string;
};

async function run(
  admin: SupabaseClient,
  doc: DocRow,
  userId: string,
  plan: Plan,
  locale: Locale,
  mode: "all" | "quiz",
) {
  const started = Date.now();
  const limits = PLAN_LIMITS[plan];

  const { data: file, error } = await admin.storage.from("documents").download(doc.file_path);
  if (error || !file) throw new StudyError("file_missing");
  const bytes = new Uint8Array(await file.arrayBuffer());

  // Preparar el documento para la IA: los PDF van completos, Word y PowerPoint como texto
  let studyDoc: StudyDoc;
  if (doc.mime_type === MIME.pdf) {
    const pages = countPdfPages(bytes);
    if (pages > limits.maxPages) throw new StudyError("too_many_pages");
    studyDoc = { kind: "pdf", title: doc.title, bytes };
  } else {
    let extracted;
    try {
      extracted = doc.mime_type === MIME.pptx ? extractPptx(bytes) : extractDocx(bytes);
    } catch {
      throw new StudyError("unsupported");
    }
    if (extracted.text.replace(/\[(Página|Diapositiva) \d+\]/g, "").trim().length < 200) {
      throw new StudyError("empty");
    }
    if (extracted.pages > limits.maxPages) throw new StudyError("too_many_pages");
    if (extracted.text.length > limits.maxChars) throw new StudyError("too_long");
    studyDoc = { kind: "text", title: doc.title, text: extracted.text };
  }

  let previous: string[] = [];
  if (mode === "quiz") {
    const { data: quizzes } = await admin
      .from("study_sets")
      .select("content")
      .eq("document_id", doc.id)
      .eq("kind", "quiz");
    previous = (quizzes ?? []).flatMap((q) =>
      ((q.content as { questions?: { question: string }[] }).questions ?? []).map((x) => x.question)
    ).slice(-60);
  }

  const instructions = mode === "all" ? packInstructions() : quizInstructions(previous);
  const parsed = mode === "all"
    ? await generate({ system: systemPrompt(locale), doc: studyDoc, instructions, schema: StudyPackSchema })
    : await generate({ system: systemPrompt(locale), doc: studyDoc, instructions, schema: QuizOnlySchema });

  const quiz = cleanQuiz(parsed.quiz);
  if (quiz.length < 3) throw new StudyError("ai_error");

  const quizTitle = locale === "en" ? "Practice exam" : "Examen de práctica";

  if (mode === "all") {
    const pack = parsed as typeof parsed & { title: string; summary: unknown; flashcards: unknown[] };
    // Regenerar todo reemplaza el material anterior del documento
    await admin.from("study_sets").delete().eq("document_id", doc.id).eq("origin", "generated");
    const rows = [
      { kind: "summary", title: pack.title, content: pack.summary },
      { kind: "flashcards", title: pack.title, content: { cards: pack.flashcards } },
      { kind: "quiz", title: `${quizTitle} · ${pack.title}`, content: { questions: quiz } },
    ].map((r) => ({ ...r, user_id: userId, subject_id: doc.subject_id, document_id: doc.id }));
    const { error: insertError } = await admin.from("study_sets").insert(rows);
    if (insertError) throw insertError;
    await admin.from("documents").update({ title: pack.title }).eq("id", doc.id).eq("title", doc.title);
  } else {
    const { count } = await admin.from("study_sets").select("id", { count: "exact", head: true })
      .eq("document_id", doc.id).eq("kind", "quiz");
    const { error: insertError } = await admin.from("study_sets").insert({
      user_id: userId,
      subject_id: doc.subject_id,
      document_id: doc.id,
      kind: "quiz",
      title: `${quizTitle} ${(count ?? 0) + 1} · ${doc.title}`,
      content: { questions: quiz },
    });
    if (insertError) throw insertError;
  }

  await admin.from("ai_usage").insert({ user_id: userId, kind: mode === "all" ? "pack" : "quiz", document_id: doc.id });
  await admin.from("documents").update({ status: "ready", error_code: null }).eq("id", doc.id);
  console.log("process-document ok", doc.id, mode, currentProvider(), `${Date.now() - started}ms`);
}
