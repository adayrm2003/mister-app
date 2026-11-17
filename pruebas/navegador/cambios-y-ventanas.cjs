const { chromium } = require('playwright');
const S = process.argv[2] || require('path').join(__dirname, '..', 'capturas'), URL = process.env.MISTER_URL || 'http://localhost:5173/';
require('fs').mkdirSync(require('path').join(S, 'shots'), { recursive: true });
const espera = (p, ms = 400) => p.waitForTimeout(ms);
const pulsar = async (p, sel) => { const l = p.locator(sel).first(); await l.evaluate((el) => el.scrollIntoView({ block: 'center' })); await l.click(); await espera(p, 300); };
const reloj = async (p, r) => { await p.evaluate((r) => { const bd = JSON.parse(localStorage.getItem('mister-modo-prueba')); bd.filas.partidos[0].reloj = r === 'descanso' ? { parte: 1, inicio: null, terminado: false } : { ...r, inicio: Date.now() - r.min * 60000 }; localStorage.setItem('mister-modo-prueba', JSON.stringify(bd)); }, r); await p.reload(); await espera(p, 1000); };
const acciones = (p) => p.evaluate(() => (JSON.parse(localStorage.getItem('mister-modo-prueba')).filas.partidos[0].acciones || []).map((a) => `${a.minuto}${a.descanso ? '(descanso)' : ''}${a.ventana ? '[v' + a.ventana + ']' : ''}`));
async function cambio(p, sale, entra, opcion) {
  await pulsar(p, '.botones-accion button:has-text("Cambio")'); await espera(p, 300);
  if (opcion) await pulsar(p, `.hoja .cuando-cambio button:has-text("${opcion}")`);
  const texto = await p.locator('.hoja .cuando-cambio small').innerText().catch(() => 'NO');
  if (await p.locator(`.hoja .elegir-jugador button:has-text("${sale}")`).count() === 0) { await p.keyboard.press('Escape'); await espera(p, 300); return texto + ' [sin lista]'; }
  await pulsar(p, `.hoja .elegir-jugador button:has-text("${sale}")`);
  await pulsar(p, `.hoja .elegir-jugador button:has-text("${entra}")`); await espera(p, 400);
  return texto;
}
(async () => {
  const b = await chromium.launch(); const r = {};
  const ctx = await b.newContext({ viewport: { width: 375, height: 820 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(URL); await espera(p, 900);
  await p.click('.segmentos >> text=Crear cuenta'); await p.click('label.rol:has-text("Directiva")'); await p.fill('input[autocomplete=organization]', 'CD Prueba');
  await p.fill('input[type=email]', 'club@prueba.test'); await p.fill('#contrasena', 'prueba1234'); await p.check('label.acepto input'); await p.click('button[type=submit]'); await espera(p, 1500);
  await p.click('text=Entrenar yo también'); await espera(p, 1500);
  await p.fill('#nombre-equipo', 'Equipo A'); await p.click('.opciones button:has-text("Fútbol 7")'); await p.click('button[type=submit]:has-text("Crear equipo")'); await espera(p, 1500);
  const sembrar = () => p.evaluate(() => {
    const bd = JSON.parse(localStorage.getItem('mister-modo-prueba')); const eq = bd.equipos[0].id;
    const n = ['Leo', 'Hugo', 'Mario', 'Álex', 'Pablo', 'Dani', 'Iker', 'Noa', 'Marcos', 'Sara', 'Unai', 'Bruno', 'Gael'];
    const pos = ['portero', 'defensa', 'defensa', 'medio', 'medio', 'medio', 'delantero', 'delantero', 'defensa', 'medio', 'medio', 'delantero', 'defensa'];
    bd.filas.jugadores = n.map((x, i) => ({ id: 'j' + i, equipoId: eq, nombre: x, pierna: 'derecha', posicion: pos[i], dorsal: i + 1, notas: '' }));
    bd.filas.partidos = [{ id: 'p1', equipoId: eq, rival: 'Verdellada', fecha: '2026-11-20', hora: '10:00', campo: '', casa: true, competicion: 'Liga', notas: '',
      alineacion: { sistemaId: 'f7-231', sistemaNombre: '2-3-1', posiciones: [], titulares: ['j0','j1','j2','j3','j4','j5','j6'], suplentes: ['j7','j8','j9','j10','j11','j12'], dorsales: {} } }];
    bd.ajustesEquipo[eq] = { ...(bd.ajustesEquipo[eq] || {}), modalidad: 'F7', duracion: '2x30' };
    localStorage.setItem('mister-modo-prueba', JSON.stringify(bd));
  });
  await sembrar();
  await p.goto(URL + 'ajustes#cambios'); await espera(p, 1000);
  await pulsar(p, '#cambios button[role=radio]:has-text("Máximo 5")'); await espera(p, 400);
  r.ajustesSinMinutos = await p.locator('#cambios .contador-num').count();
  r.infoAjustes = await p.locator('.ventanas-info').innerText().then((t) => t.replace(/\n/g, ' | '));
  await p.locator('#cambios').evaluate((el) => el.scrollIntoView({ block: 'start' })); await p.screenshot({ path: `${S}/shots/v3-ajustes.png` });
  // Partido
  await p.goto(URL + 'partidos/p1/partido'); await espera(p, 600);
  await reloj(p, { parte: 1, min: 11.5 });
  r.c1 = await cambio(p, 'Iker', 'Noa');
  r.c2 = await cambio(p, 'Dani', 'Sara');
  await p.screenshot({ path: `${S}/shots/v3-hoja.png` });
  await reloj(p, { parte: 1, min: 19.5 });
  r.c3 = await cambio(p, 'Pablo', 'Unai');
  await reloj(p, 'descanso');
  r.c4 = await cambio(p, 'Mario', 'Marcos');
  await reloj(p, { parte: 2, min: 10.5 });
  r.contador = await p.locator('.contador-cambios').innerText().catch(() => 'NO');
  r.c5 = await cambio(p, 'Álex', 'Bruno');
  r.acciones1 = await acciones(p);
  r.boton = await p.locator('.botones-accion button:has-text("Cambio")').innerText();
  r.bloqueado = await p.locator('.botones-accion button:has-text("Cambio")').isDisabled();
  r.contadorFinal = await p.locator('.contador-cambios').innerText().catch(() => 'NO');
  await p.screenshot({ path: `${S}/shots/v3-final.png` });
  // Escenario 2: 3 ventanas gastadas con 3 cambios; en juego no deja; en descanso sí
  await p.evaluate(() => { const bd = JSON.parse(localStorage.getItem('mister-modo-prueba')); bd.filas.partidos[0].acciones = []; localStorage.setItem('mister-modo-prueba', JSON.stringify(bd)); });
  await reloj(p, { parte: 1, min: 4.5 }); await cambio(p, 'Iker', 'Noa');
  await reloj(p, { parte: 1, min: 9.5 }); await cambio(p, 'Dani', 'Sara');
  await reloj(p, { parte: 1, min: 14.5 }); await cambio(p, 'Pablo', 'Unai');
  await reloj(p, { parte: 1, min: 24.5 });
  r.avisoSinVentanas = await p.locator('.aviso-minutos .mensaje-aviso').allInnerTexts();
  r.c6 = await cambio(p, 'Mario', 'Marcos');
  r.c7 = await cambio(p, 'Mario', 'Marcos', 'En el descanso');
  r.acciones2 = await acciones(p);
  r.ancho = await p.evaluate(() => document.documentElement.scrollWidth); r.errs = errs;
  console.log(JSON.stringify(r, null, 1)); await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
