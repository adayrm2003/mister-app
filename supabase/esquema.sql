-- =============================================================
-- ESQUEMA DE BASE DE DATOS · C.D. El Tranvía (FASE 6, PREPARADO)
-- -------------------------------------------------------------
-- NO SE HA EJECUTADO EN NINGÚN SITIO. Cuando confirmes la fase 6,
-- se pega en Supabase > SQL Editor y se ejecuta una sola vez.
--
-- Idea general:
--   · Cada usuario tiene un PERFIL con un ROL: 'entrenador' o 'directiva'.
--   · Los EQUIPOS (ej.: "Alevín A") tienen uno o varios entrenadores.
--   · Jugadores, sesiones, partidos y preparaciones pertenecen a un equipo.
--   · Seguridad por filas (RLS): la base de datos SOLO devuelve las filas
--     de los equipos que entrenas. La directiva lo ve todo.
--     Aunque alguien manipulara la app, el servidor no le daría más datos.
-- =============================================================

-- ---------- 1. TIPOS ----------
create type public.rol_usuario as enum ('entrenador', 'directiva');

-- ---------- 2. TABLAS ----------

-- Perfil de cada usuario (se crea solo al registrarse, ver trigger abajo)
create table public.perfiles (
  id      uuid primary key references auth.users (id) on delete cascade,
  nombre  text not null default '',
  rol     public.rol_usuario not null default 'entrenador',
  creado  timestamptz not null default now()
);

create table public.equipos (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null,                       -- ej.: "Alevín A"
  categoria  text not null check (categoria in ('prebenjamin','benjamin','alevin','infantil','cadete','juvenil','regional')),
  temporada  text not null default '2026/27',
  creado     timestamptz not null default now()
);

-- Qué entrenador lleva qué equipo (un equipo puede tener varios)
create table public.equipo_entrenadores (
  equipo_id      uuid not null references public.equipos (id) on delete cascade,
  entrenador_id  uuid not null references public.perfiles (id) on delete cascade,
  primary key (equipo_id, entrenador_id)
);
create index on public.equipo_entrenadores (entrenador_id);

-- Jugadores: solo los datos mínimos (son menores)
create table public.jugadores (
  id                  uuid primary key default gen_random_uuid(),
  equipo_id           uuid not null references public.equipos (id) on delete cascade,
  nombre              text not null check (char_length(nombre) between 1 and 20), -- nombre de pila o mote
  edad                smallint check (edad between 4 and 60),
  altura              smallint check (altura between 80 and 230),
  peso                numeric(5,1) check (peso between 15 and 150),
  posicion            text,
  dorsal              text,
  valoraciones        jsonb not null default '{}',   -- {defensa, ataque, velocidad, fuerza}
  historial           jsonb not null default '[]',   -- [{fecha, defensa, ...}]
  notas               jsonb not null default '[]',   -- notas privadas del cuerpo técnico
  comentario_informe  text,
  creado              timestamptz not null default now()
);
create index on public.jugadores (equipo_id);

create table public.sesiones (
  id              uuid primary key default gen_random_uuid(),
  equipo_id       uuid not null references public.equipos (id) on delete cascade,
  titulo          text,
  fecha           date not null,
  hora            time,
  partes          jsonb not null default '{}',   -- {calentamiento: {duracion, ejercicios: []}, ...}
  asistencia      jsonb not null default '{}',   -- {jugador_id: 'si' | 'no' | 'just'}
  notas           text,
  preparacion_id  uuid,
  creado          timestamptz not null default now()
);
create index on public.sesiones (equipo_id, fecha);

create table public.preparaciones (
  id          uuid primary key default gen_random_uuid(),
  equipo_id   uuid not null references public.equipos (id) on delete cascade,
  rival       text not null,
  fecha       date not null,
  sistema     text,
  estilos     text[] not null default '{}',
  ejercicios  text[] not null default '{}',
  fuertes     text, debiles text, vigilar text, notas text,
  creado      timestamptz not null default now()
);
create index on public.preparaciones (equipo_id);

create table public.partidos (
  id            uuid primary key default gen_random_uuid(),
  equipo_id     uuid not null references public.equipos (id) on delete cascade,
  rival         text not null,
  competicion   text default 'Liga',
  fecha         date not null,
  hora          time,
  citacion      time,
  lugar         text check (lugar in ('casa','fuera')),
  campo         text,
  jugado        boolean not null default false,
  goles_favor   smallint not null default 0,
  goles_contra  smallint not null default 0,
  convocados    uuid[] not null default '{}',
  alineacion    jsonb,
  stats         jsonb not null default '{}',   -- {jugador_id: {goles, asistencias, minutos, amarillas, rojas}}
  notas         text,
  creado        timestamptz not null default now()
);
create index on public.partidos (equipo_id, fecha);

-- Ejercicios propios: de su autor; si "compartido", los ve todo el club
create table public.ejercicios (
  id           uuid primary key default gen_random_uuid(),
  autor_id     uuid not null default auth.uid() references public.perfiles (id) on delete cascade,
  compartido   boolean not null default false,
  nombre       text not null,
  parte        text not null,
  objetivos    text[] not null default '{}',
  categorias   text[] not null default '{}',
  duracion     smallint not null default 10,
  material     text,
  descripcion  text,
  creado       timestamptz not null default now()
);
create index on public.ejercicios (autor_id);

-- ---------- 3. FUNCIONES DE AYUDA PARA LA SEGURIDAD ----------
-- "security definer" = se ejecutan con permisos de administrador, pero solo
-- responden sí/no; "search_path = ''" evita trucos con nombres de tablas.

create or replace function public.es_directiva()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.perfiles
    where id = (select auth.uid()) and rol = 'directiva'
  );
$$;

create or replace function public.entrena_equipo(eq uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.equipo_entrenadores
    where equipo_id = eq and entrenador_id = (select auth.uid())
  );
$$;

-- Al registrarse un usuario, se crea su perfil como 'entrenador'.
-- La directiva se asigna a mano desde el panel de Supabase.
create or replace function public.crear_perfil()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.perfiles (id, nombre) values (new.id, coalesce(new.raw_user_meta_data ->> 'nombre', ''));
  return new;
end;
$$;
create trigger al_registrarse after insert on auth.users
  for each row execute function public.crear_perfil();

-- ---------- 4. SEGURIDAD POR FILAS (RLS) ----------
alter table public.perfiles            enable row level security;
alter table public.equipos             enable row level security;
alter table public.equipo_entrenadores enable row level security;
alter table public.jugadores           enable row level security;
alter table public.sesiones            enable row level security;
alter table public.preparaciones       enable row level security;
alter table public.partidos            enable row level security;
alter table public.ejercicios          enable row level security;

-- Nadie sin iniciar sesión puede tocar nada
revoke all on all tables in schema public from anon;

-- Perfiles: ves el tuyo (la directiva, todos). Solo puedes cambiar tu NOMBRE, nunca tu rol.
create policy "perfil: ver" on public.perfiles for select to authenticated
  using (id = (select auth.uid()) or (select public.es_directiva()));
create policy "perfil: editar el propio" on public.perfiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
revoke update on public.perfiles from authenticated;
grant update (nombre) on public.perfiles to authenticated;
create policy "perfil: directiva gestiona" on public.perfiles for all to authenticated
  using ((select public.es_directiva())) with check ((select public.es_directiva()));

-- Equipos: los ves si los entrenas; solo la directiva los crea o cambia
create policy "equipos: ver" on public.equipos for select to authenticated
  using ((select public.es_directiva()) or public.entrena_equipo(id));
create policy "equipos: directiva gestiona" on public.equipos for all to authenticated
  using ((select public.es_directiva())) with check ((select public.es_directiva()));

-- Asignaciones entrenador-equipo: ves las tuyas; solo la directiva asigna
create policy "asignaciones: ver" on public.equipo_entrenadores for select to authenticated
  using (entrenador_id = (select auth.uid()) or (select public.es_directiva()));
create policy "asignaciones: directiva gestiona" on public.equipo_entrenadores for all to authenticated
  using ((select public.es_directiva())) with check ((select public.es_directiva()));

-- Datos de equipo (jugadores, sesiones, preparaciones, partidos):
-- mismas 4 reglas para cada tabla. Entrenador de ese equipo o directiva.
do $$
declare t text;
begin
  foreach t in array array['jugadores', 'sesiones', 'preparaciones', 'partidos'] loop
    execute format($f$create policy "%1$s: ver" on public.%1$I for select to authenticated
      using ((select public.es_directiva()) or public.entrena_equipo(equipo_id))$f$, t);
    execute format($f$create policy "%1$s: crear" on public.%1$I for insert to authenticated
      with check ((select public.es_directiva()) or public.entrena_equipo(equipo_id))$f$, t);
    execute format($f$create policy "%1$s: editar" on public.%1$I for update to authenticated
      using ((select public.es_directiva()) or public.entrena_equipo(equipo_id))
      with check ((select public.es_directiva()) or public.entrena_equipo(equipo_id))$f$, t);
    execute format($f$create policy "%1$s: borrar" on public.%1$I for delete to authenticated
      using ((select public.es_directiva()) or public.entrena_equipo(equipo_id))$f$, t);
  end loop;
end $$;

-- Ejercicios propios: los tuyos, los compartidos y (directiva) todos
create policy "ejercicios: ver" on public.ejercicios for select to authenticated
  using (autor_id = (select auth.uid()) or compartido or (select public.es_directiva()));
create policy "ejercicios: crear" on public.ejercicios for insert to authenticated
  with check (autor_id = (select auth.uid()));
create policy "ejercicios: editar" on public.ejercicios for update to authenticated
  using (autor_id = (select auth.uid()) or (select public.es_directiva()))
  with check (autor_id = (select auth.uid()) or (select public.es_directiva()));
create policy "ejercicios: borrar" on public.ejercicios for delete to authenticated
  using (autor_id = (select auth.uid()) or (select public.es_directiva()));
