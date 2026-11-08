// Capa de IA: el resto del servidor no sabe qué proveedor se usa.
//
// Elegir con el secreto AI_PROVIDER en Supabase (Edge Functions → Secrets):
//   AI_PROVIDER=gemini  → Google Gemini (tiene nivel gratis; para desarrollo). Necesita GEMINI_API_KEY.
//   AI_PROVIDER=claude  → Claude de Anthropic (de pago). Necesita ANTHROPIC_API_KEY.
// Si no se define, se usa gemini.
//
// Ojo: en el nivel gratis de Gemini, Google puede usar el contenido para mejorar sus productos.
// Antes de abrir la app a alumnos reales, pasa a Claude o al nivel de pago de Gemini.
import { Anthropic, betaZodOutputFormat, toFile, z } from "./deps.ts";

export class StudyError extends Error {
  constructor(public code: string) {
    super(code);
  }
}

export type StudyDoc =
  | { kind: "pdf"; title: string; bytes: Uint8Array }
  | { kind: "text"; title: string; text: string };

export type GenerateInput<S extends z.ZodType> = {
  system: string;
  doc: StudyDoc;
  instructions: string;
  schema: S;
};

export type Provider = "gemini" | "claude";

export function currentProvider(): Provider {
  return Deno.env.get("AI_PROVIDER")?.toLowerCase() === "claude" ? "claude" : "gemini";
}

// PDF más grandes que esto se suben primero al servicio de archivos del proveedor,
// en lugar de mandarse dentro de la petición (evita peticiones enormes y falta de memoria).
const INLINE_PDF_MAX_BYTES = 15 * 1024 * 1024;

export function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/** Genera material con el proveedor configurado y lo devuelve ya validado con el esquema. */
export function generate<S extends z.ZodType>(input: GenerateInput<S>): Promise<z.infer<S>> {
  return currentProvider() === "claude" ? generateWithClaude(input) : generateWithGemini(input);
}

// ── Claude (Anthropic) ──────────────────────────

export const CLAUDE_MODEL = "claude-opus-5-5";

async function generateWithClaude<S extends z.ZodType>({ system, doc, instructions, schema }: GenerateInput<S>) {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new StudyError("ai_not_configured");
  const anthropic = new Anthropic({ apiKey });

  let uploadedFileId: string | null = null;
  let docBlock: Anthropic.Beta.BetaContentBlockParam;
  if (doc.kind === "text") {
    docBlock = { type: "document", title: doc.title, source: { type: "text", media_type: "text/plain", data: doc.text } };
  } else if (doc.bytes.length <= INLINE_PDF_MAX_BYTES) {
    docBlock = { type: "document", title: doc.title, source: { type: "base64", media_type: "application/pdf", data: toBase64(doc.bytes) } };
  } else {
    const uploaded = await anthropic.files.upload({
      file: await toFile(doc.bytes, "documento.pdf", { type: "application/pdf" }),
    });
    uploadedFileId = uploaded.id;
    docBlock = { type: "document", title: doc.title, source: { type: "file", file_id: uploaded.id } };
  }

  const stream = anthropic.beta.messages.stream({
    model: Deno.env.get("CLAUDE_MODEL") || CLAUDE_MODEL,
    max_tokens: 32000,
    // Si el modelo declina por política, el servidor reintenta con el modelo de respaldo recomendado
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "medium", format: betaZodOutputFormat(schema) },
    system,
    messages: [{ role: "user", content: [docBlock, { type: "text", text: instructions }] }],
  });

  let message;
  try {
    message = await stream.finalMessage();
  } catch (err) {
    if (err instanceof Anthropic.BadRequestError) throw new StudyError("unreadable");
    if (err instanceof Anthropic.RateLimitError) throw new StudyError("busy");
    throw err;
  } finally {
    if (uploadedFileId) anthropic.files.delete(uploadedFileId).catch(() => {});
  }
  if (message.stop_reason === "refusal") throw new StudyError("refusal");
  if (message.stop_reason === "max_tokens") throw new StudyError("too_long");
  if (!message.parsed_output) throw new StudyError("ai_error");
  return message.parsed_output as z.infer<S>;
}

// ── Gemini (Google) ─────────────────────────────

// Alias que Google mantiene apuntando a su Flash vigente; se puede fijar otro con GEMINI_MODEL
export const GEMINI_MODEL = "gemini-flash-latest";

type GeminiResponse = {
  candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
  error?: { code?: number; message?: string; status?: string };
};

async function generateWithGemini<S extends z.ZodType>({ system, doc, instructions, schema }: GenerateInput<S>) {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) throw new StudyError("ai_not_configured");
  const model = Deno.env.get("GEMINI_MODEL") || GEMINI_MODEL;

  let uploadedName: string | null = null;
  let docPart: Record<string, unknown>;
  if (doc.kind === "text") {
    docPart = { text: `<document title="${doc.title.replace(/"/g, "'")}">\n${doc.text}\n</document>` };
  } else if (doc.bytes.length <= INLINE_PDF_MAX_BYTES) {
    docPart = { inlineData: { mimeType: "application/pdf", data: toBase64(doc.bytes) } };
  } else {
    const file = await geminiUpload(apiKey, doc.bytes, doc.title);
    uploadedName = file.name;
    docPart = { fileData: { mimeType: "application/pdf", fileUri: file.uri } };
  }

  try {
    return await geminiGenerate(apiKey, model, system, docPart, instructions, schema);
  } finally {
    if (uploadedName) {
      fetch(`https://generativelanguage.googleapis.com/v1beta/${uploadedName}`, {
        method: "DELETE",
        headers: { "x-goog-api-key": apiKey },
      }).catch(() => {});
    }
  }
}

/** Sube un PDF al servicio de archivos de Gemini (carga reanudable) y espera a que esté listo. */
async function geminiUpload(apiKey: string, bytes: Uint8Array, title: string): Promise<{ name: string; uri: string }> {
  const start = await fetch("https://generativelanguage.googleapis.com/upload/v1beta/files", {
    method: "POST",
    headers: {
      "x-goog-api-key": apiKey,
      "X-Goog-Upload-Protocol": "resumable",
      "X-Goog-Upload-Command": "start",
      "X-Goog-Upload-Header-Content-Length": String(bytes.length),
      "X-Goog-Upload-Header-Content-Type": "application/pdf",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ file: { display_name: title.slice(0, 100) } }),
  });
  const uploadUrl = start.headers.get("x-goog-upload-url");
  if (!start.ok || !uploadUrl) {
    console.error("gemini upload start failed", start.status, await start.text().catch(() => ""));
    throw new StudyError(start.status === 429 ? "busy" : "ai_error");
  }
  const done = await fetch(uploadUrl, {
    method: "POST",
    headers: { "X-Goog-Upload-Command": "upload, finalize", "X-Goog-Upload-Offset": "0" },
    body: new Blob([bytes as Uint8Array<ArrayBuffer>], { type: "application/pdf" }),
  });
  const info = (await done.json().catch(() => ({}))) as { file?: { name: string; uri: string; state?: string } };
  if (!done.ok || !info.file) {
    console.error("gemini upload failed", done.status, JSON.stringify(info).slice(0, 300));
    throw new StudyError(done.status === 400 || done.status === 413 ? "unreadable" : "ai_error");
  }
  let file = info.file;
  for (let i = 0; i < 30 && file.state === "PROCESSING"; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const check = await fetch(`https://generativelanguage.googleapis.com/v1beta/${file.name}`, { headers: { "x-goog-api-key": apiKey } });
    file = (await check.json().catch(() => file)) as typeof file;
  }
  if (file.state === "FAILED") throw new StudyError("unreadable");
  return { name: file.name, uri: file.uri };
}

async function geminiGenerate<S extends z.ZodType>(
  apiKey: string,
  model: string,
  system: string,
  docPart: Record<string, unknown>,
  instructions: string,
  schema: S,
): Promise<z.infer<S>> {
  // Gemini acepta JSON Schema; quitamos la clave $schema que agrega zod
  const { $schema: _ignored, ...jsonSchema } = z.toJSONSchema(schema) as Record<string, unknown>;

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [docPart, { text: instructions }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseJsonSchema: jsonSchema,
        maxOutputTokens: 32000,
      },
    }),
  });

  const body = (await res.json().catch(() => ({}))) as GeminiResponse;
  if (!res.ok) {
    console.error("gemini error", res.status, body.error?.status, body.error?.message);
    if (res.status === 429) throw new StudyError("busy");
    if (res.status === 400 || res.status === 413) throw new StudyError("unreadable");
    throw new StudyError("ai_error");
  }
  if (body.promptFeedback?.blockReason) throw new StudyError("refusal");

  const candidate = body.candidates?.[0];
  const finish = candidate?.finishReason;
  if (finish === "MAX_TOKENS") throw new StudyError("too_long");
  if (finish && ["SAFETY", "RECITATION", "PROHIBITED_CONTENT", "BLOCKLIST", "SPII"].includes(finish)) {
    throw new StudyError("refusal");
  }

  const text = (candidate?.content?.parts ?? []).map((p) => p.text ?? "").join("").trim();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    console.error("gemini returned invalid JSON", text.slice(0, 300));
    throw new StudyError("ai_error");
  }
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    console.error("gemini JSON did not match schema", parsed.error.message.slice(0, 500));
    throw new StudyError("ai_error");
  }
  return parsed.data as z.infer<S>;
}
