// Repaso espaciado simple (cajas de Leitner): cada acierto aleja el próximo repaso,
// cada fallo lo regresa a hoy.
import type { CardProgress } from '@/lib/types';

const INTERVAL_DAYS = [0, 1, 2, 4, 8, 16, 32];

export function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** Índices de las tarjetas que tocan hoy; las nuevas y las falladas primero. */
export function dueCards(total: number, progress: CardProgress): number[] {
  const now = today();
  const due: { i: number; box: number }[] = [];
  for (let i = 0; i < total; i++) {
    const p = progress[String(i)];
    if (!p || p.due <= now) due.push({ i, box: p?.box ?? -1 });
  }
  return due.sort((a, b) => a.box - b.box).map((d) => d.i);
}

export function review(progress: CardProgress, index: number, knew: boolean): CardProgress {
  const prev = progress[String(index)];
  const box = knew ? Math.min((prev?.box ?? 0) + 1, INTERVAL_DAYS.length - 1) : 0;
  return { ...progress, [String(index)]: { box, due: addDays(today(), INTERVAL_DAYS[box]) } };
}

/** Porcentaje dominado: tarjetas en caja 3 o más. */
export function mastery(total: number, progress: CardProgress): number {
  if (total === 0) return 0;
  const mastered = Object.values(progress).filter((p) => p.box >= 3).length;
  return Math.round((mastered / total) * 100);
}
