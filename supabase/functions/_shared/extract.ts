// Extrae texto de Word (.docx) y PowerPoint (.pptx) con marcas de página/diapositiva,
// para que la IA pueda citar de dónde sale cada pregunta.
// Los PDF no pasan por aquí: se envían tal cual a Claude, que los lee con sus páginas.
import { strFromU8, unzipSync } from "./deps.ts";

export const MIME = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
} as const;

export type Extracted = { text: string; pages: number };

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

export function decodeXml(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, e: string) => {
    if (e[0] === "#") {
      const code = e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : "";
    }
    return ENTITIES[e.toLowerCase()] ?? "";
  });
}

/** Une los fragmentos <w:t>/<a:t> de un párrafo. */
function runsText(paragraphXml: string, tag: "w:t" | "a:t"): string {
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "g");
  let out = "";
  for (const m of paragraphXml.matchAll(re)) out += decodeXml(m[1]);
  if (tag === "w:t") {
    // tabulaciones y saltos dentro del párrafo
    out = out.replace(/\s+/g, " ");
  }
  return out.trim();
}

export function extractDocx(bytes: Uint8Array): Extracted {
  const files = unzipSync(bytes, { filter: (f) => f.name === "word/document.xml" });
  const xml = files["word/document.xml"];
  if (!xml) throw new Error("unsupported");
  const doc = strFromU8(xml);
  const body = doc.slice(doc.indexOf("<w:body"));

  let page = 1;
  const lines: string[] = [`[Página 1]`];
  for (const m of body.matchAll(/<w:p[\s>][\s\S]*?<\/w:p>/g)) {
    const p = m[0];
    const style = p.match(/<w:pStyle w:val="([^"]+)"/)?.[1] ?? "";
    const heading = /^(Heading|Ttulo|Titulo|Title)(\d)?/i.exec(style);
    const isList = /<w:numPr>/.test(p) || /List|Lista|Vi[ñn]eta/i.test(style);
    // Word guarda dónde cayó cada salto de página; el texto antes del salto es de la página anterior
    const pieces = p.split(/<w:lastRenderedPageBreak\/>|<w:br [^>]*w:type="page"[^>]*\/>/);
    pieces.forEach((piece, i) => {
      if (i > 0) {
        page++;
        lines.push(`\n[Página ${page}]`);
      }
      const text = runsText(piece, "w:t");
      if (!text) return;
      if (heading) {
        const level = Math.min(Number(heading[2] ?? 1), 3);
        lines.push(`${"#".repeat(level)} ${text}`);
      } else if (isList) {
        lines.push(`- ${text}`);
      } else {
        lines.push(text);
      }
    });
  }
  return { text: lines.join("\n").trim(), pages: page };
}

export function extractPptx(bytes: Uint8Array): Extracted {
  const files = unzipSync(bytes, {
    filter: (f) => /^ppt\/(slides\/slide|notesSlides\/notesSlide)\d+\.xml$/.test(f.name),
  });
  const slideNum = (name: string) => Number(name.match(/(\d+)\.xml$/)?.[1] ?? 0);
  const slides = Object.keys(files)
    .filter((n) => n.startsWith("ppt/slides/"))
    .sort((a, b) => slideNum(a) - slideNum(b));
  if (slides.length === 0) throw new Error("unsupported");

  const parts: string[] = [];
  for (const name of slides) {
    const n = slideNum(name);
    const xml = strFromU8(files[name]);
    const paragraphs = [...xml.matchAll(/<a:p>[\s\S]*?<\/a:p>/g)]
      .map((m) => runsText(m[0], "a:t"))
      .filter(Boolean);
    const notesXml = files[`ppt/notesSlides/notesSlide${n}.xml`];
    const notes = notesXml
      ? [...strFromU8(notesXml).matchAll(/<a:p>[\s\S]*?<\/a:p>/g)]
        .map((m) => runsText(m[0], "a:t"))
        .filter((t) => t && !/^\d+$/.test(t))
      : [];
    let block = `[Diapositiva ${n}]\n${paragraphs.join("\n")}`;
    if (notes.length) block += `\nNotas del presentador: ${notes.join(" ")}`;
    parts.push(block);
  }
  // Numeración por posición real (los archivos pueden saltar números)
  return { text: parts.join("\n\n"), pages: slides.length };
}

/** Conteo aproximado de páginas de un PDF sin abrirlo por completo. */
export function countPdfPages(bytes: Uint8Array): number {
  const head = new TextDecoder("latin1").decode(bytes);
  // /Type /Pages con /Count N (toma el mayor, que es el árbol raíz)
  let max = 0;
  for (const m of head.matchAll(/\/Type\s*\/Pages\b[^>]*?\/Count\s+(\d+)/g)) max = Math.max(max, Number(m[1]));
  for (const m of head.matchAll(/\/Count\s+(\d+)[^>]*?\/Type\s*\/Pages\b/g)) max = Math.max(max, Number(m[1]));
  if (max > 0) return max;
  return (head.match(/\/Type\s*\/Page(?!s)\b/g) ?? []).length;
}
