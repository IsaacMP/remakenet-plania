-- Nombre de cada materia en español e inglés: { "es": "Matemáticas", "en": "Math" }.
-- La app muestra el del idioma activo; si falta, usa "name".
alter table public.subjects add column name_i18n jsonb not null default '{}'::jsonb;

-- La materia "Compartidos conmigo" ya existente
update public.subjects set name_i18n = '{"es": "Compartidos conmigo", "en": "Shared with me"}'::jsonb
where is_shared_inbox;

-- Las nuevas también nacen con los dos nombres
create or replace function public.import_share(p_code text) returns uuid
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
    insert into subjects (user_id, name, name_i18n, color, icon, position, is_shared_inbox)
    values (auth.uid(), case when v_locale = 'en' then 'Shared with me' else 'Compartidos conmigo' end,
            '{"es": "Compartidos conmigo", "en": "Shared with me"}'::jsonb,
            'sky', 'share', 999, true)
    returning id into v_subject;
  end if;

  insert into study_sets (user_id, subject_id, document_id, kind, title, content, origin)
  values (auth.uid(), v_subject, null, v_set.kind, v_set.title, v_set.content, 'shared')
  returning id into v_new;

  update shares set uses = uses + 1 where code = upper(trim(p_code));
  return v_new;
end $$;

revoke execute on function public.import_share(text) from public, anon;
grant execute on function public.import_share(text) to authenticated;
