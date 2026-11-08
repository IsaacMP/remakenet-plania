// Nombre de una materia en el idioma activo.
// Las materias sugeridas se traducen con la lista de la app; las personalizadas las traduce
// el servidor con IA (función translate-subjects) y se guardan en subjects.name_i18n.
import { useTranslation } from 'react-i18next';

import en from '@/locales/en';
import es from '@/locales/es';
import type { AppLocale } from '@/lib/i18n';

export type NameI18n = Partial<Record<AppLocale, string>>;
type Named = { name: string; name_i18n?: NameI18n | null };

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

// "Matemáticas" ↔ "Math": mismas posiciones en las listas de español e inglés
const TEMPLATE_PAIRS: { es: string; en: string }[] = (['prepa', 'uni', 'other'] as const).flatMap((level) =>
  es.onboarding.templates[level].map((name, i) => ({ es: name, en: en.onboarding.templates[level][i] ?? name })),
);
const BY_NAME = new Map<string, { es: string; en: string }>();
for (const pair of TEMPLATE_PAIRS) {
  BY_NAME.set(norm(pair.es), pair);
  BY_NAME.set(norm(pair.en), pair);
}

/** Si el nombre es una materia sugerida, devuelve sus dos nombres. */
export function templateNames(name: string): { es: string; en: string } | null {
  return BY_NAME.get(norm(name)) ?? null;
}

/** Nombres a guardar al crear o renombrar: los dos si es sugerida; si no, solo el idioma actual. */
export function namesFor(name: string, locale: AppLocale): NameI18n {
  return templateNames(name) ?? { [locale]: name.trim() };
}

export function subjectName(subject: Named, locale: AppLocale): string {
  return subject.name_i18n?.[locale] || templateNames(subject.name)?.[locale] || subject.name;
}

export function needsTranslation(subject: Named): boolean {
  if (templateNames(subject.name)) return false;
  return !subject.name_i18n?.es || !subject.name_i18n?.en;
}

/** Devuelve una función que nombra materias en el idioma activo (y se actualiza al cambiarlo). */
export function useSubjectName(): (subject: Named) => string {
  const { i18n } = useTranslation();
  const locale: AppLocale = i18n.language === 'en' ? 'en' : 'es';
  return (subject: Named) => subjectName(subject, locale);
}
