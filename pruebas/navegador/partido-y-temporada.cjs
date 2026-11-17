const { chromium } = require('playwright');
const S = process.argv[2] || require('path').join(__dirname, '..', 'capturas'), URL = process.env.MISTER_URL || 'http://localhost:5173/';
require('fs').mkdirSync(require('path').join(S, 'shots'), { recursive: true });
const espera = (p, ms = 400) => p.waitForTimeout(ms);
const pulsar = async (p, sel) => { const l = p.locator(sel).first(); await l.evaluate((el) => el.scrollIntoView({ block: 'center' })); await l.click(); await espera(p, 300); };
(async () => {
  const b = await chromium.launch(); const r = {};
  const [vista, tema] = process.argv[3] === 'tablet' ? [{ width: 1024, height: 1300 }, 'dark'] : [{ width: 375, height: 820 }, 'light'];
  const n = process.argv[3] || 'movil';
  const ctx = await b.newContext({ viewport: vista, deviceScaleFactor: 2, colorScheme: tema, permissions: ['clipboard-read', 'clipboard-write'] });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  const foto = (x, full) => p.screenshot({ path: `${S}/shots/n-${n}-${x}.png`, fullPage: !!full });
  await p.goto(URL); await espera(p, 900);
  await p.click('.segmentos >> text=Crear cuenta'); await p.click('label.rol:has-text("Directiva")'); await p.fill('input[autocomplete=organization]', 'CD Prueba');
  await p.fill('input[type=email]', 'club@prueba.test'); await p.fill('#contrasena', 'prueba1234'); await p.check('label.acepto input'); await p.click('button[type=submit]'); await espera(p, 1500);
  await p.click('text=Entrenar yo también'); await espera(p, 1500);
  await p.fill('#nombre-equipo', 'Equipo A'); await p.click('.opciones button:has-text("Fútbol 7")'); await p.click('button[type=submit]:has-text("Crear equipo")'); await espera(p, 1500);
  const fut = new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10);
  await p.evaluate((fut) => {
    const bd = JSON.parse(localStorage.getItem('mister-modo-prueba')); const eq = bd.equipos[0].id;
    const n = ['Leo', 'Hugo', 'Mario', 'Álex', 'Pablo', 'Dani', 'Iker', 'Noa', 'Marcos', 'Sara', 'Unai'];
    const pos = ['portero', 'defensa', 'defensa', 'medio', 'medio', 'medio', 'delantero', 'delantero', 'defensa', 'medio', 'portero'];
    bd.filas.jugadores = n.map((x, i) => ({ id: 'j' + i, equipoId: eq, nombre: x, pierna: 'derecha', posicion: pos[i], dorsal: i + 1, notas: '' }));
    bd.filas.partidos = [
      { id: 'p1', equipoId: eq, rival: 'Verdellada', fecha: fut, hora: '10:00', campo: 'Campo Municipal', casa: true, competicion: 'Liga', notas: '', alineacion: null },
      { id: 'p0', equipoId: eq, rival: 'verdellada ', fecha: '2026-10-04', hora: '11:00', campo: '', casa: false, competicion: 'Liga', notas: '', alineacion: null, acciones: [{ id: 'a', tipo: 'gol', minuto: 3, jugadorId: 'j6' }], reloj: { parte: 2, inicio: null, terminado: true } }
    ];
    bd.ajustesEquipo[eq] = { ...(bd.ajustesEquipo[eq] || {}), modalidad: 'F7', duracion: '2x30' };
    localStorage.setItem('mister-modo-prueba', JSON.stringify(bd));
  }, fut);
  await p.goto(URL + 'inicio'); await espera(p, 1000);
  await foto('0-inicio');
  // 2. Convocatoria desde Inicio (1 toque)
  await pulsar(p, '.proximo button:has-text("Convocar")'); await espera(p, 600);
  r.hojaConvocatoria = await p.locator('.hoja h2').first().innerText().catch(() => 'NO');
  for (const x of ['Leo', 'Hugo', 'Mario', 'Álex', 'Pablo', 'Dani', 'Iker', 'Noa', 'Marcos', 'Sara']) await pulsar(p, `.fila-convocar:has-text("${x}")`);
  await p.fill('.hoja input.entrada', '9:15 en la puerta del campo');
  await foto('1-convocatoria');
  await pulsar(p, '.hoja button:has-text("Ver mensaje")'); await espera(p, 300); await foto('1b-tras'); console.log(await p.locator('.hoja').count(), await p.locator('.hoja h2').allInnerTexts());
  r.mensaje = await p.locator('.mensaje-whatsapp').innerText();
  r.enlaceWA = (await p.locator('a.boton-whatsapp').getAttribute('href')).slice(0, 60);
  await foto('2-mensaje');
  await p.keyboard.press('Escape'); await espera(p, 400);
  // 1. Plan de minutos (desde Alineación) — sin alineación: usa la convocatoria
  await p.goto(URL + 'partidos/p1/alineacion'); await espera(p, 1000);
  r.alineacionLlamados = await p.locator('.chips-llamados .chip-jugador').count();
  await pulsar(p, 'button:has-text("Reparto de minutos")'); await espera(p, 500);
  await foto('3-plan');
  r.minutosPrevistos = await p.locator('.barras-minutos li').allInnerTexts().then((l) => l.map((x) => x.replace(/\n/g, ' ')));
  r.cambiosPrevistos = await p.locator('.cambios-previstos li').allInnerTexts().then((l) => l.map((x) => x.replace(/\n/g, ' ')));
  await pulsar(p, '.hoja button:has-text("Listo")'); await espera(p, 600);
  // Partido en juego: aviso y cambio en un toque
  await p.goto(URL + 'partidos/p1/partido'); await espera(p, 900);
  await p.evaluate(() => { const bd = JSON.parse(localStorage.getItem('mister-modo-prueba')); const pt = bd.filas.partidos.find((x) => x.id === 'p1');
    pt.alineacion = { sistemaId: 'f7-231', sistemaNombre: '2-3-1', posiciones: [], titulares: ['j0','j1','j2','j3','j4','j5','j6'], suplentes: ['j7','j8','j9'], dorsales: {} };
    pt.reloj = { parte: 1, inicio: Date.now() - 16 * 60000, terminado: false }; localStorage.setItem('mister-modo-prueba', JSON.stringify(bd)); });
  await p.reload(); await espera(p, 1200);
  r.avisoPartido = await p.locator('.aviso-minutos').innerText().then((t) => t.replace(/\n/g, ' | ')).catch(() => 'NO');
  await foto('4-en-juego');
  await pulsar(p, '.aviso-minutos button:has-text("Hacer cambio")'); await espera(p, 600);
  r.trasCambio = await p.locator('.aviso-minutos').innerText().then((t) => t.replace(/\n/g, ' | ')).catch(() => 'NO');
  r.accionesCambio = await p.evaluate(() => JSON.parse(localStorage.getItem('mister-modo-prueba')).filas.partidos.find((x) => x.id === 'p1').acciones.map((a) => `${a.tipo} ${a.minuto} ${a.jugadorId}->${a.entraId}`));
  // Aviso "aún no han jugado" a mitad de partido
  await p.evaluate(() => { const bd = JSON.parse(localStorage.getItem('mister-modo-prueba')); const pt = bd.filas.partidos.find((x) => x.id === 'p1'); pt.reloj = { parte: 2, inicio: Date.now() - 2 * 60000, terminado: false }; localStorage.setItem('mister-modo-prueba', JSON.stringify(bd)); });
  await p.reload(); await espera(p, 1200);
  r.avisoMitad = await p.locator('.aviso-minutos .mensaje-aviso').innerText().catch(() => 'NO');
  // 5. Valoración
  await pulsar(p, 'button[role=tab]:has-text("Valoración")'); await espera(p, 600);
  await p.fill('.valoracion textarea', 'Buena presión. Hay que mejorar la salida de balón.');
  await pulsar(p, '.lista-valorar li:has-text("Leo") .circulos button[aria-label="4 de 5"]');
  await pulsar(p, '.lista-valorar li:has-text("Hugo") .circulos button[aria-label="3 de 5"]');
  await pulsar(p, '.lista-valorar li:has-text("Leo") button:has-text("Comentario")');
  await p.fill('.lista-valorar li:has-text("Leo") input', 'Muy atento en los balones largos');
  await espera(p, 1200);
  await foto('5-valoracion');
  r.valoraciones = await p.evaluate(() => { const pt = JSON.parse(localStorage.getItem('mister-modo-prueba')).filas.partidos.find((x) => x.id === 'p1'); return { c: pt.conclusiones, v: pt.valoraciones }; });
  r.jugadoresValorar = await p.locator('.lista-valorar li').count();
  // 4. Ficha del rival
  await pulsar(p, 'button[role=tab]:has-text("Datos")'); await espera(p, 500);
  await pulsar(p, '.tarjeta-rival'); await espera(p, 400);
  await pulsar(p, '.hoja .chips-eleccion button:has-text("3-2-1")');
  await p.fill('.hoja textarea', 'Presionan muy arriba. El 9 es rápido. Córners al primer palo.');
  r.historialRival = await p.locator('.historial-rival li').allInnerTexts().then((l) => l.map((x) => x.replace(/\n/g, ' ')));
  await foto('6-rival');
  await pulsar(p, '.hoja button:has-text("Guardar")'); await espera(p, 500);
  r.tarjetaRival = await p.locator('.tarjeta-rival').innerText().then((t) => t.replace(/\n/g, ' | '));
  await foto('7-datos', true);
  await p.goto(URL + 'rivales'); await espera(p, 800);
  r.rivales = await p.locator('.lista .fila').allInnerTexts().then((l) => l.map((x) => x.replace(/\n/g, ' ')));
  await foto('8-rivales');
  // 6. Temporada
  await p.goto(URL + 'calendario'); await espera(p, 800);
  await pulsar(p, '.selector-biblioteca a:has-text("Temporada")'); await espera(p, 800);
  await p.fill('.objetivos-temporada textarea', 'Que todos jueguen con las dos piernas');
  await pulsar(p, 'button:has-text("Usar etapas típicas")'); await espera(p, 400);
  await pulsar(p, '.semana-actual button'); await espera(p, 400);
  await p.fill('.hoja input.entrada', 'Presión tras pérdida');
  await pulsar(p, '.hoja button:has-text("Guardar")'); await espera(p, 400);
  await pulsar(p, '.etapas button:has-text("Añadir")');
  await p.fill('.hoja input.entrada >> nth=0', 'Torneo de Reyes');
  await p.fill('.hoja input[type=date] >> nth=0', '2027-01-05'); await p.fill('.hoja input[type=date] >> nth=1', '2027-01-02');
  await pulsar(p, '.hoja button[type=submit]');
  r.errorEtapa = await p.locator('.hoja .mensaje-error').innerText().catch(() => 'sin error');
  await p.fill('.hoja input[type=date] >> nth=0', '2027-01-02'); await p.fill('.hoja input[type=date] >> nth=1', '2027-01-05');
  await pulsar(p, '.hoja button[type=submit]'); await espera(p, 1200);
  await p.evaluate(() => window.scrollTo(0, 0)); await foto('9-temporada');
  r.etapas = await p.locator('.fila-etapa').allInnerTexts().then((l) => l.map((x) => x.replace(/\n/g, ' ')));
  r.semanaActual = await p.locator('.semana-actual').innerText().then((t) => t.replace(/\n/g, ' | '));
  await p.reload(); await espera(p, 1200);
  r.trasRecargar = { objetivos: await p.locator('.objetivos-temporada textarea').inputValue(), etapas: await p.locator('.fila-etapa').count() };
  await p.goto(URL + 'inicio'); await espera(p, 1000);
  r.inicioObjetivo = await p.locator('.objetivo-semana-inicio').innerText().then((t) => t.replace(/\n/g, ' | ')).catch(() => 'NO');
  await foto('10-inicio');
  // Estadísticas: reparto de minutos y valoración en la ficha
  await p.evaluate(() => { const bd = JSON.parse(localStorage.getItem('mister-modo-prueba')); const pt = bd.filas.partidos.find((x) => x.id === 'p1'); pt.fecha = '2026-11-15'; pt.reloj = { parte: 2, inicio: null, terminado: true }; localStorage.setItem('mister-modo-prueba', JSON.stringify(bd)); });
  await p.goto(URL + 'estadisticas'); await espera(p, 1000);
  r.reparto = await p.locator('.ranking:has(h2:has-text("Reparto")) li').allInnerTexts().then((l) => l.slice(0, 4).map((x) => x.replace(/\n/g, ' ')));
  await p.goto(URL + 'plantilla/jugador/j0'); await espera(p, 1000);
  r.fichaValoracion = await p.locator('.valoracion-jugador').innerText().then((t) => t.replace(/\n/g, ' | ')).catch(() => 'NO');
  await foto('11-ficha', true);
  r.ancho = await p.evaluate(() => document.documentElement.scrollWidth);
  r.errs = errs;
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
