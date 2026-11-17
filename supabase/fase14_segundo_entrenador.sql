-- =====================================================================
-- FASE 14: segundo entrenador (ayudante). El entrenador principal añade o quita ayudantes
-- de su equipo; tienen que ser entrenadores que la directiva haya añadido al club.
-- El ayudante ve y apunta lo mismo que el principal, pero no puede cambiar el nombre del equipo ni gestionar ayudantes.
-- =====================================================================
alter table public.entrenadores_equipo add column if not exists rol text not null default 'principal';
alter table public.entrenadores_equipo drop constraint if exists entrenadores_equipo_rol_check;
alter table public.entrenadores_equipo add constraint entrenadores_equipo_rol_check check (rol in ('principal', 'ayudante'));

create or replace function public.soy_principal(p_equipo uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from entrenadores_equipo a where a.equipo_id = p_equipo and a.email = public.mi_correo() and a.rol = 'principal')
$$;

-- Solo el principal cambia el nombre del equipo
drop policy if exists "editar equipos" on public.equipos;
create policy "editar equipos" on public.equipos for update
  using (public.soy_principal(id)) with check (public.soy_principal(id) and public.soy_del_club(club_id));

-- Entrenadores de un equipo (lo ve cualquier entrenador del equipo)
create or replace function public.entrenadores_de_mi_equipo(p_equipo uuid)
returns table (email text, rol text, registrado boolean)
language sql stable security definer set search_path = public as $$
  select a.email, a.rol, exists (select 1 from perfiles p where lower(p.email) = a.email)
  from entrenadores_equipo a
  where a.equipo_id = p_equipo and public.entreno_este_equipo(p_equipo)
  order by a.rol desc, a.email
$$;

create or replace function public.anadir_ayudante(p_equipo uuid, p_email text) returns void
language plpgsql security definer set search_path = public as $$
declare v_club uuid; v_correo text := lower(trim(coalesce(p_email, '')));
begin
  if not public.soy_principal(p_equipo) then raise exception 'Solo el entrenador principal puede añadir ayudantes.'; end if;
  select club_id into v_club from equipos where id = p_equipo;
  if v_correo = public.mi_correo() then raise exception 'Ya eres el entrenador principal de este equipo.'; end if;
  if not exists (select 1 from entrenadores_club m where m.club_id = v_club and m.email = v_correo) then
    raise exception 'Ese correo no es de un entrenador del club. Pide a la directiva que lo añada primero.';
  end if;
  if exists (select 1 from entrenadores_equipo where equipo_id = p_equipo and email = v_correo) then
    raise exception 'Ese entrenador ya está en el equipo.';
  end if;
  if (select count(*) from entrenadores_equipo where equipo_id = p_equipo and rol = 'ayudante') >= 3 then
    raise exception 'Como mucho puede haber 3 ayudantes por equipo.';
  end if;
  insert into entrenadores_equipo (equipo_id, email, rol) values (p_equipo, v_correo, 'ayudante');
end $$;

create or replace function public.quitar_ayudante(p_equipo uuid, p_email text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.soy_principal(p_equipo) then raise exception 'Solo el entrenador principal puede quitar ayudantes.'; end if;
  delete from entrenadores_equipo where equipo_id = p_equipo and email = lower(trim(coalesce(p_email, ''))) and rol = 'ayudante';
end $$;

-- La directiva pasa el equipo a otro entrenador: cambia el principal y los ayudantes se quedan
create or replace function public.pasar_equipo(p_equipo uuid, p_email text) returns void
language plpgsql security definer set search_path = public as $$
declare v_club uuid; v_correo text := lower(trim(coalesce(p_email, '')));
begin
  select e.club_id into v_club from equipos e where e.id = p_equipo and public.es_mi_club(e.club_id);
  if v_club is null then raise exception 'Ese equipo no es de tu club.'; end if;
  if not exists (select 1 from entrenadores_club m where m.club_id = v_club and m.email = v_correo) then
    raise exception 'Ese entrenador no está en tu club.';
  end if;
  delete from entrenadores_equipo where equipo_id = p_equipo and (rol = 'principal' or email = v_correo);
  insert into entrenadores_equipo (equipo_id, email, rol) values (p_equipo, v_correo, 'principal');
end $$;

-- Lo que ve la directiva: ahora también los ayudantes
drop function if exists public.equipos_del_club();
create or replace function public.equipos_del_club()
returns table (id uuid, nombre text, modalidad text, entrenador text, ayudantes text[])
language sql stable security definer set search_path = public as $$
  select e.id, e.nombre, aj.datos->>'modalidad',
         (select min(a.email) from entrenadores_equipo a where a.equipo_id = e.id and a.rol = 'principal'),
         coalesce((select array_agg(a.email order by a.email) from entrenadores_equipo a where a.equipo_id = e.id and a.rol = 'ayudante'), '{}')
  from equipos e
  join clubes c on c.id = e.club_id and c.dueno_id = auth.uid()
  left join ajustes_equipo aj on aj.equipo_id = e.id
  order by e.nombre
$$;

revoke execute on function public.soy_principal(uuid), public.entrenadores_de_mi_equipo(uuid), public.anadir_ayudante(uuid, text),
  public.quitar_ayudante(uuid, text), public.pasar_equipo(uuid, text), public.equipos_del_club() from public, anon;
grant execute on function public.soy_principal(uuid), public.entrenadores_de_mi_equipo(uuid), public.anadir_ayudante(uuid, text),
  public.quitar_ayudante(uuid, text), public.pasar_equipo(uuid, text), public.equipos_del_club() to authenticated;
