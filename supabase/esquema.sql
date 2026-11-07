-- =====================================================================
-- MÍSTER · Base de datos (fase 2: cuentas, clubes, equipos y entrenadores)
-- Cómo usarlo: Supabase -> SQL Editor -> New query -> pegar todo -> Run.
-- Se puede ejecutar más de una vez sin romper nada.
-- =====================================================================

-- ---------- Tablas ----------
create table if not exists public.perfiles (
  id     uuid primary key references auth.users(id) on delete cascade,
  email  text not null,
  rol    text not null check (rol in ('directiva', 'entrenador')),
  creado timestamptz not null default now()
);

create table if not exists public.clubes (
  id       uuid primary key default gen_random_uuid(),
  nombre   text not null check (char_length(nombre) between 1 and 80),
  dueno_id uuid not null unique references auth.users(id) on delete cascade,
  creado   timestamptz not null default now()
);

create table if not exists public.equipos (
  id      uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubes(id) on delete cascade,
  nombre  text not null check (char_length(nombre) between 1 and 40),
  creado  timestamptz not null default now()
);
create index if not exists equipos_club_idx on public.equipos(club_id);

-- Entrenador asignado a un equipo, por su correo (puede no tener cuenta todavía)
create table if not exists public.entrenadores_equipo (
  id        uuid primary key default gen_random_uuid(),
  equipo_id uuid not null references public.equipos(id) on delete cascade,
  email     text not null check (email = lower(trim(email)) and email like '%@%'),
  creado    timestamptz not null default now(),
  unique (equipo_id, email)
);
create index if not exists entrenadores_equipo_email_idx on public.entrenadores_equipo(email);

-- ---------- Funciones de ayuda para las reglas de seguridad ----------
-- Correo de quien hace la petición (solo cuentas con el correo confirmado)
create or replace function public.mi_correo() returns text
language sql stable security definer set search_path = public as $$
  select lower(u.email) from auth.users u
  where u.id = auth.uid() and u.email_confirmed_at is not null
$$;

-- ¿Soy la directiva dueña de este club?
create or replace function public.es_mi_club(p_club uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from clubes c where c.id = p_club and c.dueno_id = auth.uid())
$$;

-- ¿Puedo trabajar con este equipo? (directiva de su club o entrenador asignado)
-- Las tablas de las próximas fases (jugadores, partidos...) usarán esta función.
create or replace function public.puedo_ver_equipo(p_equipo uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from equipos e
    where e.id = p_equipo
      and (public.es_mi_club(e.club_id)
           or exists (select 1 from entrenadores_equipo a where a.equipo_id = e.id and a.email = public.mi_correo()))
  )
$$;

-- Lista de entrenadores del club de la directiva, indicando si ya tienen cuenta
create or replace function public.asignaciones_del_club()
returns table (id uuid, equipo_id uuid, email text, registrado boolean)
language sql stable security definer set search_path = public as $$
  select a.id, a.equipo_id, a.email,
         exists (select 1 from perfiles p where p.email = a.email) as registrado
  from entrenadores_equipo a
  join equipos e on e.id = a.equipo_id
  join clubes c on c.id = e.club_id
  where c.dueno_id = auth.uid()
  order by a.email
$$;

-- ---------- Al registrarse: crear el perfil (y el club si es directiva) ----------
create or replace function public.al_crear_usuario() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_rol text := coalesce(new.raw_user_meta_data->>'rol', 'entrenador');
begin
  if v_rol not in ('directiva', 'entrenador') then v_rol := 'entrenador'; end if;
  insert into perfiles (id, email, rol) values (new.id, lower(new.email), v_rol)
  on conflict (id) do nothing;
  if v_rol = 'directiva' then
    insert into clubes (nombre, dueno_id)
    values (left(coalesce(nullif(trim(new.raw_user_meta_data->>'nombre_club'), ''), 'Mi club'), 80), new.id)
    on conflict (dueno_id) do nothing;
  end if;
  return new;
end $$;

drop trigger if exists al_crear_usuario on auth.users;
create trigger al_crear_usuario after insert on auth.users
for each row execute function public.al_crear_usuario();

-- ---------- Seguridad por filas (RLS) ----------
alter table public.perfiles            enable row level security;
alter table public.clubes              enable row level security;
alter table public.equipos             enable row level security;
alter table public.entrenadores_equipo enable row level security;

-- Perfiles: cada uno solo ve el suyo. Nadie puede cambiarse el rol.
drop policy if exists "ver mi perfil" on public.perfiles;
create policy "ver mi perfil" on public.perfiles for select using (id = auth.uid());

-- Clubes: la directiva ve el suyo; el entrenador ve el nombre de los clubes de sus equipos
drop policy if exists "ver club" on public.clubes;
create policy "ver club" on public.clubes for select using (
  dueno_id = auth.uid()
  or exists (select 1 from equipos e join entrenadores_equipo a on a.equipo_id = e.id
             where e.club_id = clubes.id and a.email = public.mi_correo())
);
drop policy if exists "renombrar mi club" on public.clubes;
create policy "renombrar mi club" on public.clubes for update using (dueno_id = auth.uid()) with check (dueno_id = auth.uid());

-- Equipos: la directiva los gestiona; el entrenador solo ve los suyos
drop policy if exists "ver equipos" on public.equipos;
create policy "ver equipos" on public.equipos for select using (public.puedo_ver_equipo(id));
drop policy if exists "crear equipos" on public.equipos;
create policy "crear equipos" on public.equipos for insert with check (public.es_mi_club(club_id));
drop policy if exists "editar equipos" on public.equipos;
create policy "editar equipos" on public.equipos for update using (public.es_mi_club(club_id)) with check (public.es_mi_club(club_id));
drop policy if exists "borrar equipos" on public.equipos;
create policy "borrar equipos" on public.equipos for delete using (public.es_mi_club(club_id));

-- Asignaciones: la directiva las gestiona en su club; el entrenador ve las suyas
drop policy if exists "ver asignaciones" on public.entrenadores_equipo;
create policy "ver asignaciones" on public.entrenadores_equipo for select using (
  email = public.mi_correo()
  or exists (select 1 from equipos e where e.id = equipo_id and public.es_mi_club(e.club_id))
);
drop policy if exists "crear asignaciones" on public.entrenadores_equipo;
create policy "crear asignaciones" on public.entrenadores_equipo for insert with check (
  exists (select 1 from equipos e where e.id = equipo_id and public.es_mi_club(e.club_id))
);
drop policy if exists "mover asignaciones" on public.entrenadores_equipo;
create policy "mover asignaciones" on public.entrenadores_equipo for update
  using (exists (select 1 from equipos e where e.id = equipo_id and public.es_mi_club(e.club_id)))
  with check (exists (select 1 from equipos e where e.id = equipo_id and public.es_mi_club(e.club_id)));
drop policy if exists "quitar asignaciones" on public.entrenadores_equipo;
create policy "quitar asignaciones" on public.entrenadores_equipo for delete using (
  exists (select 1 from equipos e where e.id = equipo_id and public.es_mi_club(e.club_id))
);

-- Permisos básicos para usuarios con sesión (las reglas de arriba deciden qué filas)
grant select on public.perfiles to authenticated;
grant select, update on public.clubes to authenticated;
grant select, insert, update, delete on public.equipos, public.entrenadores_equipo to authenticated;
revoke all on function public.al_crear_usuario() from public, anon, authenticated;
grant execute on function public.asignaciones_del_club(), public.puedo_ver_equipo(uuid), public.es_mi_club(uuid), public.mi_correo() to authenticated;

-- =====================================================================
-- FASE 3: ajustes, plantilla, partidos y alineaciones
-- =====================================================================
create table if not exists public.ajustes_equipo (
  equipo_id   uuid primary key references public.equipos(id) on delete cascade,
  datos       jsonb not null default '{}'::jsonb,
  actualizado timestamptz not null default now()
);

create table if not exists public.ajustes_usuario (
  usuario_id  uuid primary key references auth.users(id) on delete cascade,
  datos       jsonb not null default '{}'::jsonb,
  actualizado timestamptz not null default now()
);

-- Jugadores: solo nombre o mote, pierna, posición, dorsal y notas (son menores: nada más)
create table if not exists public.jugadores (
  id        uuid primary key,
  equipo_id uuid not null references public.equipos(id) on delete cascade,
  nombre    text not null check (char_length(nombre) between 1 and 24),
  pierna    text not null default 'derecha' check (pierna in ('derecha', 'izquierda', 'ambas')),
  posicion  text not null default 'medio' check (posicion in ('portero', 'defensa', 'medio', 'delantero')),
  dorsal    smallint check (dorsal between 0 and 99),
  notas     text not null default '' check (char_length(notas) <= 300),
  creado    timestamptz not null default now()
);
create index if not exists jugadores_equipo_idx on public.jugadores(equipo_id);

create table if not exists public.partidos (
  id          uuid primary key,
  equipo_id   uuid not null references public.equipos(id) on delete cascade,
  rival       text not null check (char_length(rival) between 1 and 40),
  fecha       date not null,
  hora        text not null default '',
  campo       text not null default '',
  casa        boolean not null default true,
  competicion text not null default 'Liga',
  notas       text not null default '',
  alineacion  jsonb,
  creado      timestamptz not null default now()
);
create index if not exists partidos_equipo_idx on public.partidos(equipo_id, fecha);

create table if not exists public.plantillas_alineacion (
  id         uuid primary key,
  equipo_id  uuid not null references public.equipos(id) on delete cascade,
  nombre     text not null check (char_length(nombre) between 1 and 30),
  alineacion jsonb not null,
  creado     timestamptz not null default now()
);
create index if not exists plantillas_alineacion_equipo_idx on public.plantillas_alineacion(equipo_id);

alter table public.ajustes_equipo        enable row level security;
alter table public.ajustes_usuario       enable row level security;
alter table public.jugadores             enable row level security;
alter table public.partidos              enable row level security;
alter table public.plantillas_alineacion enable row level security;

-- Datos de un equipo: solo quien puede ver ese equipo (su directiva o sus entrenadores)
do $$
declare t text;
begin
  foreach t in array array['ajustes_equipo', 'jugadores', 'partidos', 'plantillas_alineacion'] loop
    execute format('drop policy if exists "equipo: todo" on public.%I', t);
    execute format('create policy "equipo: todo" on public.%I for all using (public.puedo_ver_equipo(equipo_id)) with check (public.puedo_ver_equipo(equipo_id))', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

-- Preferencias: cada entrenador solo las suyas
drop policy if exists "mis ajustes" on public.ajustes_usuario;
create policy "mis ajustes" on public.ajustes_usuario for all using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());
grant select, insert, update, delete on public.ajustes_usuario to authenticated;
