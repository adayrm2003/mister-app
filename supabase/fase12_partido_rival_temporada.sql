-- =====================================================================
-- FASE 12: convocatoria, reparto de minutos, valoración del partido, ficha del rival y plan de temporada.
-- Todo es de cada equipo: solo lo ve su entrenador (la misma regla que jugadores y partidos).
-- =====================================================================
alter table public.partidos add column if not exists convocados jsonb;
alter table public.partidos add column if not exists quedada text not null default '';
alter table public.partidos add column if not exists plan_cambios jsonb;
alter table public.partidos add column if not exists conclusiones text not null default '';
alter table public.partidos add column if not exists valoraciones jsonb not null default '{}'::jsonb;

create table if not exists public.rivales (
  id             uuid primary key,
  equipo_id      uuid not null references public.equipos(id) on delete cascade,
  nombre         text not null check (char_length(nombre) between 1 and 40),
  sistema_id     text,
  sistema_nombre text not null default '',
  notas          text not null default '' check (char_length(notas) <= 1500),
  editado        timestamptz not null default now()
);
create index if not exists rivales_equipo_idx on public.rivales(equipo_id);
alter table public.rivales enable row level security;
drop policy if exists "equipo: todo" on public.rivales;
create policy "equipo: todo" on public.rivales for all using (public.puedo_ver_equipo(equipo_id)) with check (public.puedo_ver_equipo(equipo_id));
grant select, insert, update, delete on public.rivales to authenticated;

create table if not exists public.temporadas (
  id         uuid primary key,
  equipo_id  uuid not null references public.equipos(id) on delete cascade,
  temporada  text not null check (temporada ~ '^\d{4}-\d{2}$'),
  objetivos  text not null default '',
  etapas     jsonb not null default '[]'::jsonb,
  semanas    jsonb not null default '{}'::jsonb,
  unique (equipo_id, temporada)
);
alter table public.temporadas enable row level security;
drop policy if exists "equipo: todo" on public.temporadas;
create policy "equipo: todo" on public.temporadas for all using (public.puedo_ver_equipo(equipo_id)) with check (public.puedo_ver_equipo(equipo_id));
grant select, insert, update, delete on public.temporadas to authenticated;
