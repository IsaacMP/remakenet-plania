// Tipos de la base de datos (ver supabase/migrations).

export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  level: 'prepa' | 'uni' | 'other' | null;
  locale: 'es' | 'en';
  onboarded: boolean;
  plan: 'free' | 'pro';
  pro_until: string | null;
  coupon_code: string | null;
  streak_count: number;
  last_study_date: string | null;
};

export type Subject = {
  id: string;
  name: string;
  color: string;
  icon: string;
  position: number;
  is_shared_inbox: boolean;
  name_i18n: Partial<Record<'es' | 'en', string>>;
  created_at: string;
};

export type DocumentStatus = 'uploaded' | 'processing' | 'ready' | 'failed';

export type StudyDocument = {
  id: string;
  subject_id: string;
  title: string;
  file_path: string;
  mime_type: string;
  size_bytes: number;
  status: DocumentStatus;
  error_code: string | null;
  processing_started_at: string | null;
  created_at: string;
};

export type SummaryContent = {
  overview: string;
  sections: { heading: string; points: string[]; source: string }[];
  key_terms: { term: string; definition: string }[];
};

export type Flashcard = { front: string; back: string; source: string };
export type FlashcardsContent = { cards: Flashcard[] };

export type Question = {
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
  source: string;
};
export type QuizContent = { questions: Question[] };

export type CardProgress = Record<string, { box: number; due: string }>;

type StudySetBase = {
  id: string;
  subject_id: string;
  document_id: string | null;
  title: string;
  progress: CardProgress;
  origin: 'generated' | 'shared';
  created_at: string;
};

export type StudySet =
  | (StudySetBase & { kind: 'summary'; content: SummaryContent })
  | (StudySetBase & { kind: 'flashcards'; content: FlashcardsContent })
  | (StudySetBase & { kind: 'quiz'; content: QuizContent });

export type QuizAttempt = {
  id: string;
  study_set_id: string;
  score: number;
  total: number;
  wrong_indexes: number[];
  created_at: string;
};

export type SharePreview = {
  kind: 'quiz' | 'flashcards';
  title: string;
  item_count: number;
  owner_name: string;
  uses: number;
};

// ── Organizador ─────────────────────────────────

export type ItemKind = 'note' | 'idea' | 'project' | 'event';

export type ProjectTask = { id: string; text: string; done: boolean };

export type Item = {
  id: string;
  kind: ItemKind;
  title: string;
  body: string;
  subject_id: string | null;
  pinned: boolean;
  color: string | null;
  due_date: string | null;
  tasks: ProjectTask[];
  done: boolean;
  starts_at: string | null;
  ends_at: string | null;
  all_day: boolean;
  location_name: string | null;
  location_address: string | null;
  latitude: number | null;
  longitude: number | null;
  remind_minutes: number | null;
  converted_to: string | null;
  created_at: string;
  updated_at: string;
};

export type ItemWithSubject = Item & {
  subjects: { name: string; name_i18n: Partial<Record<'es' | 'en', string>>; color: string; icon: string } | null;
};
