-- Endurecer funciones (recomendaciones del asesor de seguridad de Supabase)

-- search_path fijo
alter function public.is_privileged() set search_path = public;
alter function public.protect_plan_columns() set search_path = public;
alter function public.protect_document_status() set search_path = public;

-- Nadie sin sesión puede llamar funciones de la app
revoke execute on function public.ai_usage_this_month(uuid) from public, anon;
revoke execute on function public.create_share(uuid) from public, anon;
revoke execute on function public.import_share(text) from public, anon;
revoke execute on function public.preview_share(text) from public, anon;
revoke execute on function public.join_waitlist(text, text, boolean, text) from public, anon;
revoke execute on function public.record_study(integer) from public, anon;

-- Solo de uso interno (trigger y servidor): no se exponen a la app
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.is_pro(uuid) from public, anon, authenticated;

-- La app sí usa estas con sesión iniciada
grant execute on function public.ai_usage_this_month(uuid) to authenticated, service_role;
grant execute on function public.create_share(uuid) to authenticated;
grant execute on function public.import_share(text) to authenticated;
grant execute on function public.preview_share(text) to authenticated;
grant execute on function public.join_waitlist(text, text, boolean, text) to authenticated;
grant execute on function public.record_study(integer) to authenticated;
grant execute on function public.is_pro(uuid) to service_role;
