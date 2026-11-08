// Límites y funciones por plan. Mantener sincronizado con supabase/functions/_shared/plans.ts.

export const PLAN_LIMITS = {
  // Lo que cuesta son las páginas, no el peso del archivo. 50 MB es el máximo actual (Supabase gratis y Gemini).
  free: { generationsPerMonth: 10, maxFileMb: 35, maxPages: 60 },
  pro: { generationsPerMonth: 100, maxFileMb: 50, maxPages: 500 },
} as const;

export type Plan = keyof typeof PLAN_LIMITS;

/** Precios de lanzamiento en México (MXN). Las tiendas convierten al precio local en el resto de América. */
export const PRO_PRICES_MXN = { monthly: 89, yearly: 699 } as const;

/**
 * Funciones que todavía no existen. Al tocarlas se abre la lista de espera.
 * `coupon: true` → son Pro, y quien deja su correo recibe un cupón de 65%.
 */
export const FUTURE_FEATURES = {
  // Estudio
  exam_plan: { coupon: true, icon: 'calendar' },
  notes_chat: { coupon: true, icon: 'chat' },
  class_audio: { coupon: true, icon: 'mic' },
  photo_notes: { coupon: true, icon: 'camera' },
  mind_map: { coupon: true, icon: 'mindmap' },
  pro_plan: { coupon: true, icon: 'sparkle' },
  // Notas (Pro)
  note_ai_polish: { coupon: true, icon: 'sparkle' },
  note_to_study: { coupon: true, icon: 'cards' },
  note_voice: { coupon: true, icon: 'mic' },
  // Ideas (Pro)
  idea_ai_expand: { coupon: true, icon: 'sparkle' },
  idea_brainstorm: { coupon: true, icon: 'idea' },
  // Proyectos (Pro)
  project_ai_plan: { coupon: true, icon: 'sparkle' },
  project_team: { coupon: true, icon: 'person' },
  project_board: { coupon: true, icon: 'checklist' },
  // Gratis, en camino
  focus: { coupon: false, icon: 'timer' },
} as const;

export type FutureFeature = keyof typeof FUTURE_FEATURES;

export const PRO_FEATURE_LIST: FutureFeature[] = ['exam_plan', 'notes_chat', 'class_audio', 'photo_notes', 'mind_map'];

/** Funciones Pro que se muestran dentro de cada tipo del organizador. Los eventos no tienen. */
export const ORGANIZER_PRO: Record<'note' | 'idea' | 'project' | 'event', FutureFeature[]> = {
  note: ['note_ai_polish', 'note_to_study', 'note_voice'],
  idea: ['idea_ai_expand', 'idea_brainstorm'],
  project: ['project_ai_plan', 'project_team', 'project_board'],
  event: [],
};

export const ORGANIZER_PRO_LIST: FutureFeature[] = [...ORGANIZER_PRO.note, ...ORGANIZER_PRO.idea, ...ORGANIZER_PRO.project];
