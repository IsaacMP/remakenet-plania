// Límites por plan. Mantener sincronizado con src/lib/plans.ts en la app.
export const PLAN_LIMITS = {
  free: {
    generationsPerMonth: 10,
    maxFileBytes: 10 * 1024 * 1024,
    maxPages: 30,
    maxChars: 120_000,
  },
  pro: {
    // Tope para controlar el costo de IA por usuario
    generationsPerMonth: 100,
    maxFileBytes: 25 * 1024 * 1024,
    maxPages: 300,
    maxChars: 800_000,
  },
} as const;

export type Plan = keyof typeof PLAN_LIMITS;
