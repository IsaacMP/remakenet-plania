// Capa de IA: el resto del servidor no sabe qué proveedor se usa.
//
// Elegir con el secreto AI_PROVIDER en Supabase (Edge Functions → Secrets):
//   AI_PROVIDER=gemini  → Google Gemini (tiene nivel gratis; para desarrollo). Necesita GEMINI_API_KEY.
//   AI_PROVIDER=claude  → Claude de Anthropic (de pago). Necesita ANTHROPIC_API_KEY.
// Si no se define, se usa gemini.
//
// Ojo: en el nivel gratis de Gemini, Google puede usar el contenido para mejorar sus productos.
// Antes de abrir la app a alumnos reales, pasa a Claude o al nivel de pago de Gemini.
import { Anthropic, betaZodOutputFormat, z } from "./deps.ts";

export class StudyError extends Error {
  constructor(public code: string) {
    super(code);
  }
}

export type StudyDoc =
  | { kind: "pdf"; title: string; base64: string }
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

  const docBlock: Anthropic.Beta.BetaContentBlockParam = doc.kind === "pdf"
    ? { type: "document", title: doc.title, source: { type: "base64", media_type: "application/pdf", data: doc.base64 } }
    : { type: "document", title: doc.title, source: { type: "text", media_type: "text/plain", data: doc.text } };

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

  // Gemini acepta JSON Schema; quitamos la clave $schema que agrega zod
  const { $schema: _ignored, ...jsonSchema } = z.toJSONSchema(schema) as Record<string, unknown>;

  const docPart = doc.kind === "pdf"
    ? { inlineData: { mimeType: "application/pdf", data: doc.base64 } }
    : { text: `<document title="${doc.title.replace(/"/g, "'")}">\n${doc.text}\n</document>` };

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
