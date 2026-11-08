// Todas las lecturas y escrituras a Supabase pasan por aquí.
import { FunctionsHttpError } from '@supabase/supabase-js';
import { File } from 'expo-file-system';

import { currentLocale } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';
import type {
  CardProgress,
  Item,
  ItemKind,
  ItemWithSubject,
  Profile,
  QuizAttempt,
  SharePreview,
  StudyDocument,
  StudySet,
  Subject,
} from '@/lib/types';

/** Error con un código que la interfaz sabe traducir (ver document.errors en locales). */
export class AppError extends Error {
  constructor(
    public code: string,
    public extra: Record<string, unknown> = {},
  ) {
    super(code);
  }
}

function fail(error: { message: string } | null): asserts error is null {
  if (error) throw new AppError(/fetch|network/i.test(error.message) ? 'network' : 'ai_error', { message: error.message });
}

async function uid(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const id = data.session?.user.id;
  if (!id) throw new AppError('not_authenticated');
  return id;
}

// ── Perfil ──────────────────────────────────────

export async function getProfile(): Promise<Profile> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', await uid()).single();
  fail(error);
  return data as Profile;
}

export async function updateProfile(patch: Partial<Pick<Profile, 'level' | 'locale' | 'onboarded' | 'full_name'>>) {
  const { error } = await supabase.from('profiles').update(patch).eq('id', await uid());
  fail(error);
}

export async function usageThisMonth(): Promise<number> {
  const { data, error } = await supabase.rpc('ai_usage_this_month');
  fail(error);
  return (data as number) ?? 0;
}

export async function recordStudy(): Promise<number> {
  // getTimezoneOffset es positivo al oeste de UTC; la función espera minutos a sumar
  const { data, error } = await supabase.rpc('record_study', {
    p_tz_offset_minutes: -new Date().getTimezoneOffset(),
  });
  fail(error);
  return data as number;
}

export async function deleteAccount() {
  const { error } = await supabase.functions.invoke('delete-account', { method: 'POST' });
  if (error) throw new AppError('ai_error');
  await supabase.auth.signOut();
}

// ── Materias ────────────────────────────────────

export type SubjectWithCount = Subject & { documents: { count: number }[] };

export async function listSubjects(): Promise<SubjectWithCount[]> {
  const { data, error } = await supabase
    .from('subjects')
    .select('*, documents(count)')
    .order('position')
    .order('created_at');
  fail(error);
  return data as SubjectWithCount[];
}

export async function getSubject(id: string): Promise<Subject> {
  const { data, error } = await supabase.from('subjects').select('*').eq('id', id).single();
  fail(error);
  return data as Subject;
}

const AUTO_COLORS = ['teal', 'sky', 'coral', 'sun', 'grape', 'leaf', 'rose', 'slate'];

export async function createSubjects(names: string[], iconFor: (name: string) => string) {
  const userId = await uid();
  const rows = names.map((name, i) => ({
    user_id: userId,
    name: name.trim().slice(0, 60),
    color: AUTO_COLORS[i % AUTO_COLORS.length],
    icon: iconFor(name),
    position: i,
  }));
  const { error } = await supabase.from('subjects').insert(rows);
  fail(error);
}

export async function createSubject(input: { name: string; color: string; icon: string }): Promise<Subject> {
  const { data, error } = await supabase
    .from('subjects')
    .insert({ ...input, name: input.name.trim(), user_id: await uid(), position: Date.now() % 100000 })
    .select()
    .single();
  fail(error);
  return data as Subject;
}

export async function updateSubject(id: string, patch: Partial<Pick<Subject, 'name' | 'color' | 'icon'>>) {
  const { error } = await supabase.from('subjects').update(patch).eq('id', id);
  fail(error);
}

export async function deleteSubject(id: string) {
  const { data: docs } = await supabase.from('documents').select('file_path').eq('subject_id', id);
  if (docs?.length) await supabase.storage.from('documents').remove(docs.map((d) => d.file_path));
  const { error } = await supabase.from('subjects').delete().eq('id', id);
  fail(error);
}

// ── Documentos ──────────────────────────────────

export const ACCEPTED_MIME = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
} as const;

export function mimeFromName(name: string, given?: string | null): string | null {
  if (given && given in ACCEPTED_MIME) return given;
  const ext = name.split('.').pop()?.toLowerCase();
  const found = Object.entries(ACCEPTED_MIME).find(([, e]) => e === ext);
  return found?.[0] ?? null;
}

export async function listDocuments(subjectId: string): Promise<StudyDocument[]> {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('subject_id', subjectId)
    .order('created_at', { ascending: false });
  fail(error);
  return data as StudyDocument[];
}

export async function getDocument(id: string): Promise<StudyDocument> {
  const { data, error } = await supabase.from('documents').select('*').eq('id', id).single();
  fail(error);
  return data as StudyDocument;
}

export async function recentDocument(): Promise<(StudyDocument & { subjects: Pick<Subject, 'name' | 'color'> }) | null> {
  const { data, error } = await supabase
    .from('documents')
    .select('*, subjects(name, color)')
    .eq('status', 'ready')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  fail(error);
  return data as never;
}

/** Sube el archivo al almacenamiento, crea el documento y pide a la IA que lo prepare. */
export async function uploadDocument(
  subjectId: string,
  file: { uri: string; name: string; mimeType: string; size: number },
  maxMb: number,
): Promise<StudyDocument> {
  if (file.size > maxMb * 1024 * 1024) throw new AppError('file_too_large');
  const userId = await uid();
  const ext = ACCEPTED_MIME[file.mimeType as keyof typeof ACCEPTED_MIME];
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const bytes = await new File(file.uri).arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(path, bytes, { contentType: file.mimeType, upsert: false });
  if (uploadError) throw new AppError(/size|large/i.test(uploadError.message) ? 'file_too_large' : 'network');

  const title = file.name.replace(/\.(pdf|docx|pptx)$/i, '').replace(/[_-]+/g, ' ').trim().slice(0, 120);
  const { data, error } = await supabase
    .from('documents')
    .insert({ user_id: userId, subject_id: subjectId, title: title || file.name, file_path: path, mime_type: file.mimeType, size_bytes: file.size })
    .select()
    .single();
  fail(error);
  const doc = data as StudyDocument;
  await processDocument(doc.id, 'all');
  return doc;
}

/** Pide al servidor generar todo el material ("all") o un examen nuevo ("quiz"). */
export async function processDocument(documentId: string, mode: 'all' | 'quiz') {
  const { error } = await supabase.functions.invoke('process-document', {
    method: 'POST',
    body: { document_id: documentId, locale: currentLocale(), mode },
  });
  if (!error) return;
  if (error instanceof FunctionsHttpError) {
    const body = await (error.context as Response).json().catch(() => ({}));
    throw new AppError(body.error ?? 'ai_error', body);
  }
  throw new AppError('network');
}

export async function deleteDocument(doc: StudyDocument) {
  await supabase.storage.from('documents').remove([doc.file_path]);
  const { error } = await supabase.from('documents').delete().eq('id', doc.id);
  fail(error);
}

// ── Material de estudio ─────────────────────────

export async function listDocumentSets(documentId: string): Promise<StudySet[]> {
  const { data, error } = await supabase
    .from('study_sets')
    .select('*')
    .eq('document_id', documentId)
    .order('created_at');
  fail(error);
  return data as StudySet[];
}

export async function listSharedSets(subjectId: string): Promise<StudySet[]> {
  const { data, error } = await supabase
    .from('study_sets')
    .select('*')
    .eq('subject_id', subjectId)
    .is('document_id', null)
    .order('created_at', { ascending: false });
  fail(error);
  return data as StudySet[];
}

export async function getStudySet(id: string): Promise<StudySet> {
  const { data, error } = await supabase.from('study_sets').select('*').eq('id', id).single();
  fail(error);
  return data as StudySet;
}

export async function saveCardProgress(id: string, progress: CardProgress) {
  const { error } = await supabase.from('study_sets').update({ progress }).eq('id', id);
  fail(error);
}

export async function recordQuizAttempt(studySetId: string, score: number, total: number, wrong: number[]) {
  const { error } = await supabase
    .from('quiz_attempts')
    .insert({ user_id: await uid(), study_set_id: studySetId, score, total, wrong_indexes: wrong });
  fail(error);
}

export async function bestAttempts(setIds: string[]): Promise<Record<string, QuizAttempt>> {
  if (setIds.length === 0) return {};
  const { data, error } = await supabase.from('quiz_attempts').select('*').in('study_set_id', setIds);
  fail(error);
  const best: Record<string, QuizAttempt> = {};
  for (const a of data as QuizAttempt[]) {
    const cur = best[a.study_set_id];
    if (!cur || a.score / a.total > cur.score / cur.total) best[a.study_set_id] = a;
  }
  return best;
}

// ── Compartir ───────────────────────────────────

export async function createShare(studySetId: string): Promise<{ code: string; uses: number }> {
  const { data, error } = await supabase.rpc('create_share', { p_study_set_id: studySetId });
  fail(error);
  const code = data as string;
  const { data: row } = await supabase.from('shares').select('uses').eq('code', code).maybeSingle();
  return { code, uses: row?.uses ?? 0 };
}

export function normalizeCode(code: string) {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
}

export async function previewShare(code: string): Promise<SharePreview | null> {
  const { data, error } = await supabase.rpc('preview_share', { p_code: normalizeCode(code) });
  fail(error);
  return ((data as SharePreview[]) ?? [])[0] ?? null;
}

export async function importShare(code: string): Promise<string> {
  const { data, error } = await supabase.rpc('import_share', { p_code: normalizeCode(code) });
  if (error) throw new AppError(/not_found/.test(error.message) ? 'not_found' : 'network');
  return data as string;
}

// ── Lista de espera ─────────────────────────────

export async function joinWaitlist(feature: string, email: string, withCoupon: boolean): Promise<string | null> {
  const { data, error } = await supabase.rpc('join_waitlist', {
    p_feature: feature,
    p_email: email,
    p_with_coupon: withCoupon,
    p_locale: currentLocale(),
  });
  if (error) throw new AppError(/invalid_email/.test(error.message) ? 'invalid_email' : 'network');
  return (data as string | null) ?? null;
}

export async function myWaitlist(): Promise<string[]> {
  const { data, error } = await supabase.from('waitlist').select('feature');
  fail(error);
  return (data ?? []).map((r) => r.feature as string);
}

// ── Organizador: notas, ideas, proyectos, eventos ──

const ITEM_SELECT = '*, subjects(name, color, icon)';

export async function listItems(kind?: ItemKind): Promise<ItemWithSubject[]> {
  let q = supabase.from('items').select(ITEM_SELECT);
  if (kind) q = q.eq('kind', kind);
  const { data, error } = await q.order('pinned', { ascending: false }).order('updated_at', { ascending: false }).limit(200);
  fail(error);
  return data as ItemWithSubject[];
}

/** Eventos desde hoy en adelante, en orden de fecha. */
export async function upcomingEvents(limit = 20): Promise<ItemWithSubject[]> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const { data, error } = await supabase
    .from('items')
    .select(ITEM_SELECT)
    .eq('kind', 'event')
    .gte('starts_at', start.toISOString())
    .order('starts_at')
    .limit(limit);
  fail(error);
  return data as ItemWithSubject[];
}

export async function listSubjectItems(subjectId: string): Promise<ItemWithSubject[]> {
  const { data, error } = await supabase
    .from('items')
    .select(ITEM_SELECT)
    .eq('subject_id', subjectId)
    .order('pinned', { ascending: false })
    .order('updated_at', { ascending: false });
  fail(error);
  return data as ItemWithSubject[];
}

export async function getItem(id: string): Promise<Item> {
  const { data, error } = await supabase.from('items').select('*').eq('id', id).single();
  fail(error);
  return data as Item;
}

export type ItemInput = Partial<Omit<Item, 'id' | 'created_at' | 'updated_at'>> & { kind: ItemKind };

export async function saveItem(id: string | null, input: ItemInput): Promise<Item> {
  const row = { ...input, title: (input.title ?? '').trim().slice(0, 200) };
  const query = id
    ? supabase.from('items').update(row).eq('id', id).select().single()
    : supabase.from('items').insert({ ...row, user_id: await uid() }).select().single();
  const { data, error } = await query;
  fail(error);
  return data as Item;
}

export async function deleteItem(id: string) {
  const { error } = await supabase.from('items').delete().eq('id', id);
  fail(error);
}

/** Convierte una idea en proyecto: crea el proyecto con su texto y marca la idea. */
export async function convertIdeaToProject(idea: Item): Promise<Item> {
  const project = await saveItem(null, {
    kind: 'project',
    title: idea.title,
    body: idea.body,
    subject_id: idea.subject_id,
    tasks: [],
  });
  await saveItem(idea.id, { kind: 'idea', converted_to: project.id });
  return project;
}
