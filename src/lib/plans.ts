// Límites y funciones por plan. Mantener sincronizado con supabase/functions/_shared/plans.ts.

export const PLAN_LIMITS = {
  free: { generationsPerMonth: 10, maxFileMb: 10, maxPages: 30 },
  pro: { generationsPerMonth: 100, maxFileMb: 25, maxPages: 300 },
} as const;

export type Plan = keyof typeof PLAN_LIMITS;

/** Precios de lanzamiento en México (MXN). Las tiendas convierten al precio local en el resto de América. */
export const PRO_PRICES_MXN = { monthly: 89, yearly: 699 } as const;

/**
 * Funciones que todavía no existen. Al tocarlas se abre la lista de espera.
 * `coupon: true` → son Pro, y quien deja su correo recibe un cupón de 65%.
 */
export const FUTURE_FEATURES = {
  exam_plan: { coupon: true, icon: 'calendar' },
  notes_chat: { coupon: true, icon: 'chat' },
  class_audio: { coupon: true, icon: 'mic' },
  photo_notes: { coupon: true, icon: 'camera' },
  mind_map: { coupon: true, icon: 'mindmap' },
  pro_plan: { coupon: true, icon: 'sparkle' },
  focus: { coupon: false, icon: 'timer' },
  organizer_note: { coupon: false, icon: 'note' },
  organizer_idea: { coupon: false, icon: 'idea' },
  organizer_project: { coupon: false, icon: 'checklist' },
  organizer_event: { coupon: false, icon: 'calendar' },
} as const;

export type FutureFeature = keyof typeof FUTURE_FEATURES;

export const PRO_FEATURE_LIST: FutureFeature[] = ['exam_plan', 'notes_chat', 'class_audio', 'photo_notes', 'mind_map'];
