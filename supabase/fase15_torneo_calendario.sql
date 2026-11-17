-- =====================================================================
-- FASE 15: torneos y calendario en el móvil.
-- - partidos.torneo: si el partido es de un torneo ({id, nombre}).
-- - calendario_enlaces: enlace privado (token) de cada equipo para suscribirse desde el calendario del móvil.
--   Solo lleva partidos y entrenamientos (fecha, hora, rival, lugar): nada de jugadores.
-- =====================================================================
alter table public.partidos add column if not exists torneo jsonb;

create table if not exists public.calendario_enlaces (
  equipo_id uuid primary key references public.equipos(id) on delete cascade,
  token     uuid not null unique default gen_random_uuid(),
  creado    timestamptz not null default now()
);
alter table public.calendario_enlaces enable row level security;

-- Enlace del equipo (se crea la primera vez). Solo para sus entrenadores.
create or replace function public.enlace_calendario(p_equipo uuid, p_nuevo boolean default false) returns uuid
language plpgsql security definer set search_path = public as $$
declare v uuid;
begin
  if not public.entreno_este_equipo(p_equipo) then raise exception 'No entrenas este equipo.'; end if;
  if p_nuevo then delete from calendario_enlaces where equipo_id = p_equipo; end if;
  insert into calendario_enlaces (equipo_id) values (p_equipo) on conflict (equipo_id) do nothing;
  select token into v from calendario_enlaces where equipo_id = p_equipo;
  return v;
end $$;
revoke execute on function public.enlace_calendario(uuid, boolean) from public, anon;
grant execute on function public.enlace_calendario(uuid, boolean) to authenticated;
