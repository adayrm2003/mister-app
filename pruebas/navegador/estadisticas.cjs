const { chromium } = require('playwright');
const S = process.argv[2] || require('path').join(__dirname, '..', 'capturas'), URL = process.env.MISTER_URL || 'http://localhost:5173/';
require('fs').mkdirSync(require('path').join(S, 'shots'), { recursive: true });
const espera = (p, ms = 400) => p.waitForTimeout(ms);
const pulsar = async (p, sel) => { const l = p.locator(sel).first(); await l.evaluate((el) => el.scrollIntoView({ block: 'center' })); await l.click(); await espera(p, 250); };
(async () => {
  const b = await chromium.launch(); const out = {};
  for (const [nombre, vista, tema] of [['movil', { width: 375, height: 820 }, 'light'], ['tablet', { width: 1024, height: 1300 }, 'dark']]) {
    const ctx = await b.newContext({ viewport: vista, deviceScaleFactor: 2, colorScheme: tema });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
    await p.goto(URL); await espera(p, 900);
    await p.click('.segmentos >> text=Crear cuenta'); await p.click('label.rol:has-text("Directiva")'); await p.fill('input[autocomplete=organization]', 'CD Prueba');
    await p.fill('input[type=email]', 'club@prueba.test'); await p.fill('#contrasena', 'prueba1234'); await p.check('label.acepto input'); await p.click('button[type=submit]'); await espera(p, 1500);
    await p.click('text=Entrenar yo también'); await espera(p, 1500);
    await p.fill('#nombre-equipo', 'Equipo A'); await p.click('.opciones button:has-text("Fútbol 7")'); await p.click('button[type=submit]:has-text("Crear equipo")'); await espera(p, 1500);
    await p.evaluate(() => {
      const bd = JSON.parse(localStorage.getItem('mister-modo-prueba')); const eq = bd.equipos[0].id;
      const n = ['Leo', 'Hugo', 'Mario', 'Álex', 'Pablo', 'Dani', 'Iker', 'Noa', 'Marcos', 'Sara'];
      const pos = ['portero', 'defensa', 'defensa', 'medio', 'medio', 'medio', 'delantero', 'delantero', 'defensa', 'medio'];
      bd.filas.jugadores = n.map((x, i) => ({ id: 'j' + i, equipoId: eq, nombre: x, pierna: 'derecha', posicion: pos[i], dorsal: i + 1, notas: '' }));
      const al = (tit, sup) => ({ sistemaId: 'f7-231', sistemaNombre: '2-3-1', posiciones: [], titulares: tit, suplentes: sup, dorsales: {} });
      const P = (id, fecha, rival, casa, tit, sup, acciones) => ({ id, equipoId: eq, rival, fecha, hora: '10:00', campo: '', casa, competicion: 'Liga', notas: '', alineacion: al(tit, sup), acciones, minutosManuales: {}, reloj: { parte: 2, inicio: null, terminado: true }, anotaciones: [] });
      const gol = (id, m, j, a) => ({ id, tipo: 'gol', minuto: m, jugadorId: j, asistenteId: a });
      bd.filas.partidos = [
        // Temporada pasada (2025-26)
        P('p0', '2026-05-10', 'Antiguo', true, ['j0','j1','j2','j3','j4','j5','j6'], ['j7'], [gol('a0', 10, 'j6')]),
        // Esta temporada (2026-27)
        P('p1', '2026-09-20', 'Verdellada', true, ['j0','j1','j2','j3','j4','j5','j6'], ['j7','j8'], [gol('a1', 12, 'j6', 'j3'), gol('a2', 30, 'j7', 'j6'), { id: 'a3', tipo: 'amarilla', minuto: 40, jugadorId: 'j2' }]),
        P('p2', '2026-10-04', 'Tacoronte', false, ['j0','j1','j8','j3','j4','j5','j7'], ['j6','j9'], [{ id: 'b1', tipo: 'golRival', minuto: 5 }, gol('b2', 50, 'j6'), { id: 'b3', tipo: 'amarilla', minuto: 20, jugadorId: 'j2' }, { id: 'b4', tipo: 'roja', minuto: 60, jugadorId: 'j5' }]),
        P('p3', '2026-11-08', 'San Andrés', true, ['j0','j1','j2','j3','j9','j5','j6'], ['j7'], [{ id: 'c1', tipo: 'golRival', minuto: 70 }])
      ];
      const E = (id, fecha, asis) => ({ id, equipoId: eq, tipo: 'entrenamiento', titulo: '', fecha, hora: '19:00', horaFin: '', lugar: '', notas: '', sesionId: null, asistencia: asis });
      const todos = (aus) => Object.fromEntries(n.map((_, i) => ['j' + i, aus.includes('j' + i) ? 'ausente' : 'presente']));
      bd.filas.eventos = [E('e1', '2026-09-15', todos(['j9'])), E('e2', '2026-09-17', todos(['j9', 'j8'])), E('e3', '2026-10-01', todos([])), E('e4', '2026-11-10', {})];
      localStorage.setItem('mister-modo-prueba', JSON.stringify(bd));
    });
    const r = {};
    await p.goto(URL + 'plantilla'); await espera(p, 1000);
    await pulsar(p, '.selector-biblioteca a:has-text("Estadísticas")'); await espera(p, 800);
    r.url = p.url().replace(URL, '');
    r.resumen = await p.locator('.resumen-cifras').innerText().then(t => t.replace(/\n/g, ' '));
    r.goles = await p.locator('.resumen-goles').innerText().then(t => t.replace(/\n/g, ' '));
    r.goleadores = await p.locator('.ranking:has(h2:has-text("Goleadores")) li').allInnerTexts().then(l => l.map(x => x.replace(/\n/g, ' ')));
    r.tarjetas = await p.locator('.ranking:has(h2:has-text("Tarjetas")) li').allInnerTexts().then(l => l.map(x => x.replace(/\n/g, ' ')));
    r.entrenos = await p.locator('.ranking:has(h2:has-text("entrenamientos")) li').first().innerText().then(t => t.replace(/\n/g, ' '));
    r.ultimoEntrenos = await p.locator('.ranking:has(h2:has-text("entrenamientos")) li').last().innerText().then(t => t.replace(/\n/g, ' '));
    r.convocatorias = await p.locator('.ranking:has(h2:has-text("Convocatorias")) li').allInnerTexts().then(l => l.slice(0, 3).map(x => x.replace(/\n/g, ' ')));
    r.avisoLista = await p.locator('.aviso-lista').innerText().then(t => t.replace(/\n/g, ' ')).catch(() => 'NO');
    await p.screenshot({ path: `${S}/shots/st-${nombre}-1.png` });
    await p.screenshot({ path: `${S}/shots/st-${nombre}-1-entera.png`, fullPage: true });
    // Temporada pasada
    await pulsar(p, '.filtro-tipos button:has-text("Temporada 2025-26")');
    r.pasada = await p.locator('.resumen-cifras').innerText().then(t => t.replace(/\n/g, ' '));
    await pulsar(p, '.filtro-tipos button:has-text("Todo")');
    r.todo = await p.locator('.resumen-cifras').innerText().then(t => t.replace(/\n/g, ' '));
    await pulsar(p, '.filtro-tipos button:has-text("Fechas")');
    await p.fill('#periodo-desde', '2026-10-01'); await p.fill('#periodo-hasta', '2026-10-31'); await espera(p, 300);
    r.octubre = await p.locator('.resumen-cifras').innerText().then(t => t.replace(/\n/g, ' '));
    await pulsar(p, '.filtro-tipos button:has-text("Temporada 2026-27")');
    // Ficha de Iker (j6)
    await pulsar(p, '.ranking:has(h2:has-text("Goleadores")) li button >> nth=0'); await espera(p, 800);
    r.ficha = await p.locator('.cifras-jugador').innerText().then(t => t.replace(/\n/g, ' '));
    r.fichaPartidos = await p.locator('.ficha-jugador tbody tr').count();
    r.fichaEntrenos = await p.locator('.punto-asistencia').count();
    await p.screenshot({ path: `${S}/shots/st-${nombre}-ficha.png`, fullPage: true });
    // Pasar lista desde el aviso
    await p.goto(URL + 'estadisticas'); await espera(p, 900);
    r.enPartidos = await p.locator('.selector-biblioteca a.activo').innerText();
    await pulsar(p, '.aviso-lista a'); await espera(p, 800);
    r.pasarListaVa = p.url().replace(URL, '');
    r.ancho = await p.evaluate(() => document.documentElement.scrollWidth); r.errs = errs;
    out[nombre] = r; await ctx.close();
  }
  console.log(JSON.stringify(out, null, 1)); await b.close();
})();
