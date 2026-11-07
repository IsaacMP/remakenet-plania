// Qué le pedimos a la IA y en qué forma debe responder.
import { z } from "./deps.ts";

export const MODEL = "claude-opus-5-5";

const Source = z.string().describe(
  'Where this comes from in the document, short. E.g. "p. 7", "pp. 3-4", "slide 12". Use the language of the output.',
);

export const SummarySchema = z.object({
  overview: z.string().describe("2-4 sentences: what the document is about and why it matters."),
  sections: z.array(z.object({
    heading: z.string(),
    points: z.array(z.string()).describe("3-6 short, self-contained study points."),
    source: Source,
  })),
  key_terms: z.array(z.object({ term: z.string(), definition: z.string() })),
});

export const FlashcardSchema = z.object({
  front: z.string().describe("A question or term. Short enough to read in 3 seconds."),
  back: z.string().describe("The answer, 1-2 sentences."),
  source: Source,
});

export const QuestionSchema = z.object({
  question: z.string(),
  options: z.array(z.string()).describe("Exactly 4 options, similar length, one correct."),
  correct_index: z.number().int().describe("0-based index of the correct option."),
  explanation: z.string().describe("1-2 sentences on why the answer is correct."),
  source: Source,
});

export const StudyPackSchema = z.object({
  title: z.string().describe("Short title for this material, max 6 words."),
  summary: SummarySchema,
  flashcards: z.array(FlashcardSchema),
  quiz: z.array(QuestionSchema),
});

export const QuizOnlySchema = z.object({ quiz: z.array(QuestionSchema) });

export type StudyPack = z.infer<typeof StudyPackSchema>;
export type Question = z.infer<typeof QuestionSchema>;

const LANG = { es: "Spanish (Latin American, neutral)", en: "English" } as const;
export type Locale = keyof typeof LANG;

export function systemPrompt(locale: Locale): string {
  return `You are Plania, a study assistant for high-school and university students (ages 15-25) in the Americas.
You turn a student's own class material into study tools. Everything you write must come from the document they uploaded: do not add facts that are not in it. If the document is thin on a topic, write fewer items rather than inventing.

Write all output in ${LANG[locale]}, even when the document is in another language. Keep technical terms the document uses, and add the translation in parentheses the first time when it helps.

Style: clear and direct, like a good classmate explaining before an exam. No filler, no emojis.`;
}

export function packInstructions(): string {
  return `Create a complete study pack from the attached document:

1. summary: an overview plus one section per main topic, in the order they appear. Points should be things a student needs to remember for an exam. Then the key terms with short definitions.
2. flashcards: 15-30 cards covering the key concepts, definitions, dates, formulas and cause-effect relations. One idea per card.
3. quiz: 12-15 multiple-choice questions with exactly 4 options. Mix recall and understanding (applying a concept, comparing, choosing the correct example). Wrong options must be plausible to someone who did not study, and must not be "all of the above" / "none of the above". Spread the correct answer position across 0-3.

Every section, card and question needs a source pointing to the page or slide it came from. Page and slide markers look like "[Página N]" or "[Diapositiva N]" in text documents; PDF pages are numbered from 1.`;
}

export function quizInstructions(previous: string[]): string {
  const avoid = previous.length
    ? `\n\nThe student already practiced these questions. Write new ones that test the same material from different angles; do not repeat them:\n${previous.map((q) => `- ${q}`).join("\n")}`
    : "";
  return `Create a new practice exam from the attached document: 12-15 multiple-choice questions with exactly 4 options each. Mix recall and understanding. Wrong options must be plausible and must not be "all/none of the above". Spread the correct answer position across 0-3. Each question needs a source pointing to its page or slide.${avoid}`;
}

/** Quita preguntas mal formadas en lugar de mostrarle al alumno algo roto. */
export function cleanQuiz(quiz: Question[]): Question[] {
  return quiz.filter((q) =>
    q.options.length >= 3 && q.options.length <= 5 &&
    Number.isInteger(q.correct_index) && q.correct_index >= 0 && q.correct_index < q.options.length &&
    q.question.trim().length > 0
  );
}
