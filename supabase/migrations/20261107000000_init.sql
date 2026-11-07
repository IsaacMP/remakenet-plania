-- Plania · esquema inicial
-- Núcleo: estudio (materias, documentos, sets de estudio). Organizador queda para después.

create extension if not exists pgcrypto;

-- ¿La operación viene del servidor (service role) o de una función interna de confianza?
create function public.is_privileged() returns boolean
language sql stable as $$
  select coalesce(auth.role(), '') = 'service_role'
      or coalesce(current_setting('plania.bypass', true), '') = 'on';
$$;

-- ─────────────────────────────────────────────
-- Perfiles
-- ─────────────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  level text check (level in ('prepa', 'uni', 'other')),
  locale text not null default 'es' check (locale in ('es', 'en')),
  onboarded boolean not null default false,
  -- Plan: solo lo cambia el servidor (webhook de pagos). Ver trigger protect_plan_columns.
  plan text not null default 'free' check (plan in ('free', 'pro')),
  pro_until timestamptz,
  coupon_code text unique,
  streak_count int not null default 0,
  last_study_date date,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
create policy "profiles: leer el propio" on public.profiles for select using (auth.uid() = id);
create policy "profiles: editar el propio" on public.profiles for update using (auth.uid() = id);

-- Crear perfil automáticamente al registrarse con Google
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture')
  );
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- El cliente no puede darse Pro a sí mismo ni tocar racha/cupón directamente
create function public.protect_plan_columns() returns trigger
language plpgsql as $$
begin
  if not public.is_privileged() then
    new.plan := old.plan;
    new.pro_until := old.pro_until;
    new.coupon_code := old.coupon_code;
    new.streak_count := old.streak_count;
    new.last_study_date := old.last_study_date;
    new.email := old.email;
  end if;
  return new;
end $$;

create trigger profiles_protect before update on public.profiles
  for each row execute function public.protect_plan_columns();

create function public.is_pro(uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select plan = 'pro' and (pro_until is null or pro_until > now())
                   from profiles where id = uid), false);
$$;

-- ─────────────────────────────────────────────
-- Materias
-- ─────────────────────────────────────────────
create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  name text not null check (char_length(name) between 1 and 60),
  color text not null default 'teal',
  icon text not null default 'book',
  position int not null default 0,
  is_shared_inbox boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.subjects (user_id, position);

alter table public.subjects enable row level security;
create policy "subjects: dueño" on public.subjects for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- Documentos subidos
-- ─────────────────────────────────────────────
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  subject_id uuid not null references public.subjects (id) on delete cascade,
  title text not null,
  file_path text not null,
  mime_type text not null,
  size_bytes bigint not null default 0,
  -- uploaded → processing → ready | failed
  status text not null default 'uploaded' check (status in ('uploaded', 'processing', 'ready', 'failed')),
  error_code text,
  processing_started_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.documents (subject_id, created_at desc);

alter table public.documents enable row level security;
create policy "documents: leer propios" on public.documents for select using (auth.uid() = user_id);
create policy "documents: crear propios" on public.documents for insert with check (
  auth.uid() = user_id
  and status = 'uploaded'
  and exists (select 1 from public.subjects s where s.id = subject_id and s.user_id = auth.uid())
);
create policy "documents: renombrar propios" on public.documents for update using (auth.uid() = user_id);
create policy "documents: borrar propios" on public.documents for delete using (auth.uid() = user_id);

-- El cliente solo puede cambiar el título; el estado lo maneja la función del servidor
create function public.protect_document_status() returns trigger
language plpgsql as $$
begin
  if not public.is_privileged() then
    new.status := old.status;
    new.error_code := old.error_code;
    new.processing_started_at := old.processing_started_at;
    new.file_path := old.file_path;
    new.user_id := old.user_id;
  end if;
  return new;
end $$;
create trigger documents_protect before update on public.documents
  for each row execute function public.protect_document_status();

-- ─────────────────────────────────────────────
-- Sets de estudio: resumen, tarjetas, examen
-- ─────────────────────────────────────────────
create table public.study_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  subject_id uuid not null references public.subjects (id) on delete cascade,
  document_id uuid references public.documents (id) on delete cascade,
  kind text not null check (kind in ('summary', 'flashcards', 'quiz')),
  title text not null,
  content jsonb not null,
  -- progreso del repaso espaciado: { "0": {"box": 2, "due": "2026-11-09"}, ... }
  progress jsonb not null default '{}'::jsonb,
  origin text not null default 'generated' check (origin in ('generated', 'shared')),
  created_at timestamptz not null default now()
);
create index on public.study_sets (document_id);
create index on public.study_sets (subject_id, created_at desc);

alter table public.study_sets enable row level security;
create policy "study_sets: leer propios" on public.study_sets for select using (auth.uid() = user_id);
create policy "study_sets: actualizar progreso" on public.study_sets for update using (auth.uid() = user_id);
create policy "study_sets: borrar propios" on public.study_sets for delete using (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- Intentos de examen
-- ─────────────────────────────────────────────
create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  study_set_id uuid not null references public.study_sets (id) on delete cascade,
  score int not null,
  total int not null,
  wrong_indexes int[] not null default '{}',
  created_at timestamptz not null default now()
);
create index on public.quiz_attempts (study_set_id, created_at desc);

alter table public.quiz_attempts enable row level security;
create policy "quiz_attempts: dueño" on public.quiz_attempts for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- Uso de IA (para límites del plan gratis)
-- ─────────────────────────────────────────────
create table public.ai_usage (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null,
  document_id uuid references public.documents (id) on delete set null,
  created_at timestamptz not null default now()
);
create index on public.ai_usage (user_id, created_at);

alter table public.ai_usage enable row level security;
create policy "ai_usage: leer propio" on public.ai_usage for select using (auth.uid() = user_id);

create function public.ai_usage_this_month(uid uuid default auth.uid()) returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int from ai_usage
  where user_id = uid and created_at >= date_trunc('month', now())
    and (uid = auth.uid() or public.is_privileged());
$$;

-- ─────────────────────────────────────────────
-- Lista de espera de funciones (con cupón de 65%)
-- ─────────────────────────────────────────────
create table public.waitlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  email text not null,
  feature text not null,
  locale text not null default 'es',
  with_coupon boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, feature)
);

alter table public.waitlist enable row level security;
create policy "waitlist: leer propio" on public.waitlist for select using (auth.uid() = user_id);

-- Une al usuario a la lista y devuelve su cupón (uno por cuenta, se reutiliza)
create function public.join_waitlist(p_feature text, p_email text, p_with_coupon boolean, p_locale text default 'es')
returns text
language plpgsql security definer set search_path = public as $$
declare
  v_code text;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if p_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'invalid_email'; end if;

  insert into waitlist (user_id, email, feature, with_coupon, locale)
  values (auth.uid(), lower(trim(p_email)), p_feature, p_with_coupon, p_locale)
  on conflict (user_id, feature) do update set email = excluded.email;

  if not p_with_coupon then return null; end if;

  select coupon_code into v_code from profiles where id = auth.uid();
  if v_code is null then
    loop
      v_code := 'PLANIA65-' || upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 6));
      begin
        perform set_config('plania.bypass', 'on', true);
        update profiles set coupon_code = v_code where id = auth.uid();
        exit;
      exception when unique_violation then
        -- código repetido, intentar otro
      end;
    end loop;
  end if;
  return v_code;
end $$;

-- ─────────────────────────────────────────────
-- Racha de estudio
-- ─────────────────────────────────────────────
create function public.record_study(p_tz_offset_minutes int default 0) returns int
language plpgsql security definer set search_path = public as $$
declare
  v_today date := (now() + make_interval(mins => p_tz_offset_minutes))::date;
  v_last date;
  v_streak int;
begin
  select last_study_date, streak_count into v_last, v_streak from profiles where id = auth.uid();
  if v_last = v_today then
    return v_streak;
  elsif v_last = v_today - 1 then
    v_streak := v_streak + 1;
  else
    v_streak := 1;
  end if;
  perform set_config('plania.bypass', 'on', true);
  update profiles set streak_count = v_streak, last_study_date = v_today where id = auth.uid();
  return v_streak;
end $$;

-- ─────────────────────────────────────────────
-- Compartir exámenes y tarjetas con un código
-- ─────────────────────────────────────────────
create table public.shares (
  code text primary key,
  study_set_id uuid not null references public.study_sets (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  uses int not null default 0,
  created_at timestamptz not null default now(),
  unique (study_set_id)
);

alter table public.shares enable row level security;
create policy "shares: leer propios" on public.shares for select using (auth.uid() = owner_id);

-- Devuelve el código existente o crea uno nuevo (6 caracteres sin letras confusas)
create function public.create_share(p_study_set_id uuid) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_code text;
  v_alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  i int;
begin
  if not exists (select 1 from study_sets where id = p_study_set_id and user_id = auth.uid()
                 and kind in ('quiz', 'flashcards')) then
    raise exception 'not_found';
  end if;
  select code into v_code from shares where study_set_id = p_study_set_id;
  if v_code is not null then return v_code; end if;
  loop
    v_code := '';
    for i in 1..6 loop
      v_code := v_code || substr(v_alphabet, 1 + (get_byte(gen_random_bytes(1), 0) % length(v_alphabet)), 1);
    end loop;
    begin
      insert into shares (code, study_set_id, owner_id) values (v_code, p_study_set_id, auth.uid());
      return v_code;
    exception when unique_violation then
    end;
  end loop;
end $$;

-- Vista previa antes de guardar
create function public.preview_share(p_code text)
returns table (kind text, title text, item_count int, owner_name text, uses int)
language sql stable security definer set search_path = public as $$
  select s.kind, s.title,
         case when s.kind = 'quiz' then jsonb_array_length(s.content -> 'questions')
              else jsonb_array_length(s.content -> 'cards') end,
         split_part(coalesce(p.full_name, ''), ' ', 1),
         sh.uses
  from shares sh
  join study_sets s on s.id = sh.study_set_id
  left join profiles p on p.id = sh.owner_id
  where sh.code = upper(trim(p_code));
$$;

-- Copia el set compartido a la materia "Compartidos conmigo" del usuario
create function public.import_share(p_code text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_set study_sets%rowtype;
  v_subject uuid;
  v_new uuid;
  v_locale text;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  select s.* into v_set from shares sh join study_sets s on s.id = sh.study_set_id
  where sh.code = upper(trim(p_code));
  if not found then raise exception 'not_found'; end if;

  select id into v_subject from subjects where user_id = auth.uid() and is_shared_inbox limit 1;
  if v_subject is null then
    select locale into v_locale from profiles where id = auth.uid();
    insert into subjects (user_id, name, color, icon, position, is_shared_inbox)
    values (auth.uid(), case when v_locale = 'en' then 'Shared with me' else 'Compartidos conmigo' end,
            'sky', 'share', 999, true)
    returning id into v_subject;
  end if;

  insert into study_sets (user_id, subject_id, document_id, kind, title, content, origin)
  values (auth.uid(), v_subject, null, v_set.kind, v_set.title, v_set.content, 'shared')
  returning id into v_new;

  update shares set uses = uses + 1 where code = upper(trim(p_code));
  return v_new;
end $$;

-- ─────────────────────────────────────────────
-- Almacenamiento de archivos: documents/{user_id}/{archivo}
-- ─────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documents', 'documents', false, 26214400, array[
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation'
]) on conflict (id) do nothing;

create policy "documents bucket: subir a mi carpeta" on storage.objects for insert to authenticated
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "documents bucket: leer mi carpeta" on storage.objects for select to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "documents bucket: borrar mi carpeta" on storage.objects for delete to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);
