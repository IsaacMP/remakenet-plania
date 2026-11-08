-- Organizador: notas, ideas, proyectos y eventos en una sola tabla.
-- Cada uno puede ir ligado a una materia (aparece dentro de ella) y fijarse arriba.

create table public.items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  kind text not null check (kind in ('note', 'idea', 'project', 'event')),
  title text not null default '' check (char_length(title) <= 200),
  body text not null default '' check (char_length(body) <= 20000),
  subject_id uuid references public.subjects (id) on delete set null,
  pinned boolean not null default false,
  color text,
  -- Proyecto: fecha de entrega y lista de tareas [{ "id": "...", "text": "...", "done": false }]
  due_date date,
  tasks jsonb not null default '[]'::jsonb,
  done boolean not null default false,
  -- Evento
  starts_at timestamptz,
  ends_at timestamptz,
  all_day boolean not null default false,
  location_name text,
  location_address text,
  latitude double precision,
  longitude double precision,
  remind_minutes int check (remind_minutes is null or remind_minutes between 0 and 10080),
  -- Idea convertida en proyecto
  converted_to uuid references public.items (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on public.items (user_id, kind, updated_at desc);
create index on public.items (subject_id, pinned desc, updated_at desc);
create index on public.items (user_id, starts_at) where kind = 'event';

alter table public.items enable row level security;
create policy "items: dueño" on public.items for all
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and (subject_id is null or exists (select 1 from public.subjects s where s.id = subject_id and s.user_id = auth.uid()))
  );

create function public.touch_updated_at() returns trigger
language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger items_touch before update on public.items
  for each row execute function public.touch_updated_at();
