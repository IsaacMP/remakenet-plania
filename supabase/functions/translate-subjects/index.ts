// POST /translate-subjects
// Busca las materias del usuario a las que les falta el nombre en español o en inglés
// y las traduce con la IA. Así "Inglés" se ve como "English" con la app en inglés, y al revés.
import { z } from "../_shared/deps.ts";
import { StudyError, withDocument } from "../_shared/ai.ts";
import { adminClient, corsHeaders, json, requireUser } from "../_shared/http.ts";

const Result = z.object({
  items: z.array(z.object({ id: z.string(), es: z.string(), en: z.string() })),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const admin = adminClient();
  const user = await requireUser(req, admin);
  if (!user) return json({ error: "not_authenticated" }, 401);

  const { data: subjects, error } = await admin
    .from("subjects")
    .select("id, name, name_i18n")
    .eq("user_id", user.id)
    .eq("is_shared_inbox", false)
    .limit(100);
  if (error) return json({ error: "db_error" }, 500);

  const missing = (subjects ?? []).filter((s) => {
    const n = (s.name_i18n ?? {}) as Record<string, string>;
    return !n.es || !n.en;
  }).slice(0, 50);
  if (missing.length === 0) return json({ updated: 0 });

  const list = missing.map((s) => ({ id: s.id, name: s.name }));
  let result: z.infer<typeof Result>;
  try {
    result = await withDocument(
      { kind: "text", title: "subjects", text: JSON.stringify(list) },
      (gen) =>
        gen({
          system: "You translate the names of school and university subjects for a study app used across the Americas.",
          instructions:
            "For each subject in the attached JSON list, return its name in Latin American Spanish (es) and in English (en), using the usual name of that subject in each language (e.g. Matemáticas / Math, Inglés / English, Cálculo diferencial / Differential Calculus). If a name is a proper noun or a code (e.g. \"MAT-101\", a teacher's name), keep it the same in both. Keep the original capitalization style. Return every id exactly once.",
          schema: Result,
        }),
    );
  } catch (err) {
    const code = err instanceof StudyError ? err.code : "ai_error";
    console.error("translate-subjects failed", code, err);
    return json({ error: code }, code === "busy" ? 503 : 500);
  }

  const byId = new Map(list.map((s) => [s.id, s]));
  let updated = 0;
  for (const item of result.items) {
    const original = byId.get(item.id);
    if (!original || !item.es.trim() || !item.en.trim()) continue;
    const { error: upError } = await admin
      .from("subjects")
      .update({ name_i18n: { es: item.es.trim().slice(0, 60), en: item.en.trim().slice(0, 60) } })
      .eq("id", item.id)
      .eq("user_id", user.id)
      // Si el usuario renombró la materia mientras tanto, no pisar su cambio
      .eq("name", original.name);
    if (!upError) updated++;
  }
  return json({ updated });
});
