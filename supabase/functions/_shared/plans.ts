// Límites por plan. Mantener sincronizado con src/lib/plans.ts en la app.
export const PLAN_LIMITS = {
  // El tamaño del archivo no es lo que cuesta (un PDF pesado suele serlo por sus imágenes);
  // lo que cuesta son las páginas. Por eso el plan se distingue por páginas.
  // 50 MB es el máximo actual (plan gratis de Supabase y límite de PDF de Gemini); el plan gratis usa 35.
  free: {
    generationsPerMonth: 10,
    maxFileBytes: 35 * 1024 * 1024,
    maxPages: 60,
    maxChars: 300_000,
  },
  pro: {
    // Tope para controlar el costo de IA por usuario
    generationsPerMonth: 100,
    maxFileBytes: 50 * 1024 * 1024,
    maxPages: 500,
    maxChars: 1_500_000,
  },
} as const;

export type Plan = keyof typeof PLAN_LIMITS;
