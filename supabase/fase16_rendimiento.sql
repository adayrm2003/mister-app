-- =====================================================================
-- FASE 16: rendimiento. Las mismas reglas de acceso, escritas para que auth.uid() se calcule
-- una vez por consulta y no una vez por fila (recomendación de Supabase), y dos índices que faltaban.
-- =====================================================================
alter policy "ver club" on public.clubes using ((dueno_id = (select auth.uid())) or public.soy_del_club(id));
alter policy "renombrar mi club" on public.clubes using (dueno_id = (select auth.uid())) with check (dueno_id = (select auth.uid()));
alter policy "mis avisos" on public.avisos_suscripciones using (usuario_id = (select auth.uid()));
alter policy "mis ajustes" on public.ajustes_usuario using (usuario_id = (select auth.uid())) with check (usuario_id = (select auth.uid()));
alter policy "solo mios" on public.ejercicios using (usuario_id = (select auth.uid())) with check (usuario_id = (select auth.uid()));
alter policy "solo mios" on public.sesiones using (usuario_id = (select auth.uid())) with check (usuario_id = (select auth.uid()));
alter policy "ver mi perfil" on public.perfiles using (id = (select auth.uid()));

create index if not exists avisos_suscripciones_usuario_idx on public.avisos_suscripciones(usuario_id);
create index if not exists pizarras_partido_idx on public.pizarras(partido_id);
