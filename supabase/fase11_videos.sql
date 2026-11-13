-- =====================================================================
-- FASE 11: vídeos de análisis del entrenador
-- - Datos (nombre, duración, momentos y dibujos) en la tabla "videos".
-- - El archivo, en un almacén PRIVADO "videos", dentro de la carpeta del equipo: «equipo_id/video_id.mp4».
-- - Solo los ve el entrenador del equipo (la misma regla que jugadores y partidos).
-- - A los 30 días de subirlo, la app lo borra (archivo y datos); a partir del día 31 el servidor no deja abrirlo.
-- =====================================================================
create table if not exists public.videos (
  id           uuid primary key,
  equipo_id    uuid not null references public.equipos(id) on delete cascade,
  nombre       text not null default '' check (char_length(nombre) <= 60),
  duracion     real not null default 0,
  ancho        integer not null default 0,
  alto         integer not null default 0,
  ruta         text not null,
  tipo_archivo text not null default 'video/mp4',
  tamano       bigint not null default 0 check (tamano <= 52428800),
  subido       timestamptz not null default now(),
  momentos     jsonb not null default '[]'::jsonb
);
create index if not exists videos_equipo_idx on public.videos(equipo_id, subido);
alter table public.videos enable row level security;
drop policy if exists "equipo: todo" on public.videos;
create policy "equipo: todo" on public.videos for all using (public.puedo_ver_equipo(equipo_id)) with check (public.puedo_ver_equipo(equipo_id));
grant select, insert, update, delete on public.videos to authenticated;

-- La fecha de subida la pone el servidor y no se puede cambiar (así nadie alarga los 30 días).
create or replace function public.videos_fecha_subida() returns trigger
language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' then new.subido := now(); else new.subido := old.subido; end if;
  return new;
end $$;
drop trigger if exists videos_fecha_subida on public.videos;
create trigger videos_fecha_subida before insert or update on public.videos
  for each row execute function public.videos_fecha_subida();

-- Equipo al que pertenece un archivo según su carpeta (null si la ruta no es válida).
create or replace function public.equipo_de_ruta(p_ruta text) returns uuid
language plpgsql immutable set search_path = public as $$
begin
  return split_part(p_ruta, '/', 1)::uuid;
exception when others then
  return null;
end $$;

-- Almacén privado, como mucho 50 MB por vídeo y solo formatos de vídeo
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('videos', 'videos', false, 52428800, array['video/mp4', 'video/webm', 'video/quicktime'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- La app deja de enseñarlo a los 30 días y lo borra; el servidor da un día de margen
-- (para borrar un archivo hace falta poder leerlo) y a partir de ahí nadie puede abrirlo.
drop policy if exists "videos: ver 30 dias" on storage.objects;
create policy "videos: ver 30 dias" on storage.objects for select to authenticated
  using (bucket_id = 'videos' and public.puedo_ver_equipo(public.equipo_de_ruta(name)) and created_at > now() - interval '31 days');
drop policy if exists "videos: subir" on storage.objects;
create policy "videos: subir" on storage.objects for insert to authenticated
  with check (bucket_id = 'videos' and public.puedo_ver_equipo(public.equipo_de_ruta(name)));
drop policy if exists "videos: borrar" on storage.objects;
create policy "videos: borrar" on storage.objects for delete to authenticated
  using (bucket_id = 'videos' and public.puedo_ver_equipo(public.equipo_de_ruta(name)));
