-- =====================================================================
-- FASE 13: avisos al móvil (notificaciones) de partidos, entrenamientos y pasar lista.
-- - Cada móvil donde el entrenador activa los avisos guarda aquí su "suscripción" (datos técnicos
--   del navegador para poder mandarle avisos; no hay datos de jugadores).
-- - La función "avisos" (Edge Function) se ejecuta cada 10 minutos y manda lo que toque.
-- =====================================================================
create table if not exists public.avisos_suscripciones (
  id           uuid primary key default gen_random_uuid(),
  usuario_id   uuid not null references auth.users(id) on delete cascade,
  endpoint     text not null unique,
  p256dh       text not null,
  auth         text not null,
  zona         text not null default 'Europe/Madrid',
  preferencias jsonb not null default '{"partidos": true, "entrenamientos": true, "lista": true}'::jsonb,
  creado       timestamptz not null default now()
);
alter table public.avisos_suscripciones enable row level security;
drop policy if exists "mis avisos" on public.avisos_suscripciones;
create policy "mis avisos" on public.avisos_suscripciones for select using (usuario_id = auth.uid());
grant select on public.avisos_suscripciones to authenticated;

-- Avisos ya enviados (para no repetirlos). Solo lo usa el servidor.
create table if not exists public.avisos_enviados (
  suscripcion_id uuid not null references public.avisos_suscripciones(id) on delete cascade,
  clave          text not null,
  enviado        timestamptz not null default now(),
  primary key (suscripcion_id, clave)
);
alter table public.avisos_enviados enable row level security;

-- Activar o actualizar los avisos de este móvil (si el móvil era de otra cuenta, pasa a esta)
create or replace function public.registrar_avisos(p_endpoint text, p_p256dh text, p_auth text, p_zona text, p_preferencias jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Tienes que entrar con tu cuenta.'; end if;
  delete from avisos_suscripciones where endpoint = p_endpoint and usuario_id <> auth.uid();
  insert into avisos_suscripciones (usuario_id, endpoint, p256dh, auth, zona, preferencias)
  values (auth.uid(), p_endpoint, p_p256dh, p_auth, coalesce(nullif(p_zona, ''), 'Europe/Madrid'), coalesce(p_preferencias, '{}'::jsonb))
  on conflict (endpoint) do update set p256dh = excluded.p256dh, auth = excluded.auth, zona = excluded.zona, preferencias = excluded.preferencias;
end $$;

create or replace function public.quitar_avisos(p_endpoint text) returns void
language sql security definer set search_path = public as $$
  delete from avisos_suscripciones where endpoint = p_endpoint and usuario_id = auth.uid();
$$;

revoke execute on function public.registrar_avisos(text, text, text, text, jsonb), public.quitar_avisos(text) from public, anon;
grant execute on function public.registrar_avisos(text, text, text, text, jsonb), public.quitar_avisos(text) to authenticated;

-- Claves para firmar los avisos: las crea la propia función "avisos" la primera vez que se ejecuta.
-- La privada se guarda cifrada en el Vault de Supabase y solo el servidor puede leerla.
create table if not exists public.avisos_config (
  id            int primary key default 1 check (id = 1),
  clave_publica text not null
);
alter table public.avisos_config enable row level security;

create or replace function public.clave_avisos() returns text
language sql security definer set search_path = public, vault as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'mister_avisos_vapid' limit 1;
$$;
create or replace function public.guardar_claves_avisos(p_privada text, p_publica text) returns void
language plpgsql security definer set search_path = public, vault as $$
begin
  if exists (select 1 from avisos_config) then return; end if;
  perform vault.create_secret(p_privada, 'mister_avisos_vapid', 'Clave privada para firmar los avisos de Míster');
  insert into avisos_config (id, clave_publica) values (1, p_publica);
end $$;
create or replace function public.clave_publica_avisos() returns text
language sql stable security definer set search_path = public as $$
  select clave_publica from avisos_config where id = 1;
$$;
revoke execute on function public.clave_avisos(), public.guardar_claves_avisos(text, text), public.clave_publica_avisos() from public, anon, authenticated;
grant execute on function public.clave_avisos(), public.guardar_claves_avisos(text, text) to service_role;
grant execute on function public.clave_publica_avisos() to authenticated;

-- Cada 10 minutos se llama a la función "avisos"
create extension if not exists pg_net;
create extension if not exists pg_cron;
select cron.unschedule('mister-avisos') where exists (select 1 from cron.job where jobname = 'mister-avisos');
select cron.schedule('mister-avisos', '*/10 * * * *', $$
  select net.http_post(url := 'https://fnijrktglgfjokvyyoiv.supabase.co/functions/v1/avisos', headers := '{"Content-Type": "application/json"}'::jsonb, body := '{}'::jsonb);
$$);
