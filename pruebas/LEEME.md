# Pruebas de Míster

Sirven para comprobar, después de cada cambio, que lo que ya funcionaba sigue funcionando.

- `npm run probar:datos` — prueba la parte de «sin cobertura» (copia en el móvil y cambios pendientes), sin navegador.
- `npm run probar` — con la app en marcha (`npm run dev`), recorre la app en un navegador en tamaño móvil,
  en modo prueba (sin Supabase): convocatoria, reparto de minutos, ventanas de cambio, valoración, rival,
  temporada, resumen del partido, sesión según objetivo, informe para la familia, torneo, segundo entrenador
  y estadísticas. Guarda capturas en `pruebas/capturas/` (no se suben a GitHub).
  Para otra dirección: `MISTER_URL=http://localhost:5186/ npm run probar`.
