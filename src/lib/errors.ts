import type { TFunction } from 'i18next';

import { AppError } from '@/lib/api';
import { PLAN_LIMITS } from '@/lib/plans';

const KNOWN = new Set([
  'limit_reached', 'file_too_large', 'too_many_pages', 'too_long', 'unsupported', 'empty', 'unreadable',
  'refusal', 'busy', 'file_missing', 'ai_error', 'network', 'already_processing', 'ai_not_configured',
]);

/** Convierte un código de error del servidor en una frase que el alumno entiende. */
export function errorMessage(t: TFunction, err: unknown, plan: 'free' | 'pro' = 'free'): string {
  const code = typeof err === 'string' ? err : err instanceof AppError ? err.code : 'ai_error';
  const key = KNOWN.has(code) ? code : 'ai_error';
  const limit = err instanceof AppError && typeof err.extra.limit === 'number' ? err.extra.limit : PLAN_LIMITS[plan].generationsPerMonth;
  return t(`document.errors.${key}`, { limit });
}
