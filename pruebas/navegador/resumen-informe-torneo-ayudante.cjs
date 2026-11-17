const { chromium } = require('playwright');
const S = process.argv[2] || require('path').join(__dirname, '..', 'capturas'), URL = process.env.MISTER_URL || 'http://localhost:5173/';
require('fs').mkdirSync(require('path').join(S, 'shots'), { recursive: true });
const espera = (p, ms = 400) => p.waitForTimeout(ms);
const pulsar = async (p, sel) => { const l = p.locator(sel).first(); await l.evaluate((el) => el.scrollIntoView({ block: 'center' })); await l.click(); await espera(p, 300); };
const foto = (p, n, full) => p.screenshot({ path: `${S}/shots/z-${n}.png`, fullPage: !!full });
async function registrar(p, email, rol) {
  await p.goto(URL); await espera(p, 900);
  await p.click('.segmentos >> text=Crear cuenta');
  if (rol === 'directiva') { await p.click('label.rol:has-text("Directiva")'); await p.fill('input[autocomplete=organization]', 'CD Prueba'); }
  await p.fill('input[type=email]', email); await p.fill('#contrasena', 'prueba1234'); await p.check('label.acepto input'); await p.click('button[type=submit]'); await espera(p, 1500);
}
const entrarComo = async (p, email) => { await p.evaluate((email) => { const bd = JSON.parse(localStorage.getItem('mister-modo-prueba')); bd.sesion = bd.usuarios.find(u => u.email === email).id; localStorage.setItem('mister-modo-prueba', JSON.stringify(bd)); }, email); await p.goto(URL + 'inicio'); await espera(p, 1300); };
(async () => {
  const b = await chromium.launch(); const r = {};
  const ctx = await b.newContext({ viewport: { width: 375, height: 820 }, deviceScaleFactor: 2, acceptDownloads: true, permissions: ['clipboard-read', 'clipboard-write'] });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await registrar(p, 'club@prueba.test', 'directiva');
  await p.click('text=Añadir entrenador'); await espera(p, 400); await p.fill('#correo-entrenador', 'mister.dani@prueba.test'); await p.click('.hoja button[type=submit]'); await espera(p, 900);
  await p.click('text=Entrenar yo también'); await espera(p, 1500);
  await p.fill('#nombre-equipo', 'Equipo A'); await p.click('.opciones button:has-text("Fútbol 7")'); await p.click('button[type=submit]:has-text("Crear equipo")'); await espera(p, 1500);
  await p.evaluate(() => {
    const bd = JSON.parse(localStorage.getItem('mister-modo-prueba')); const eq = bd.equipos[0].id;
    const n = ['Leo', 'Hugo', 'Mario', 'Álex', 'Pablo', 'Dani', 'Iker', 'Noa', 'Marcos', 'Sara', 'Unai'];
    const pos = ['portero', 'defensa', 'defensa', 'medio', 'medio', 'medio', 'delantero', 'delantero', 'defensa', 'medio', 'medio'];
    bd.filas.jugadores = n.map((x, i) => ({ id: 'j' + i, equipoId: eq, nombre: x, pierna: 'derecha', posicion: pos[i], dorsal: i + 1, notas: '' }));
    const al = { sistemaId: 'f7-231', sistemaNombre: '2-3-1', posiciones: [], titulares: ['j0','j1','j2','j3','j4','j5','j6'], suplentes: ['j7','j8','j9','j10'], dorsales: {} };
    bd.filas.partidos = [{ id: 'p1', equipoId: eq, rival: 'Verdellada', fecha: '2026-11-15', hora: '10:00', campo: 'Campo Municipal', casa: true, competicion: 'Liga', notas: '', alineacion: al,
      acciones: [{ id: 'g1', tipo: 'gol', minuto: 12, jugadorId: 'j6', asistenteId: 'j3' }, { id: 'g2', tipo: 'golRival', minuto: 30 }, { id: 'g3', tipo: 'gol', minuto: 51, jugadorId: 'j7' }],
      reloj: { parte: 2, inicio: null, terminado: true }, valoraciones: { j6: { nota: 5, comentario: 'privado' } } }];
    bd.filas.eventos = [{ id: 'e1', equipoId: eq, tipo: 'entrenamiento', titulo: '', fecha: '2026-11-12', hora: '19:00', horaFin: '', lugar: '', notas: '', sesionId: null, asistencia: { j6: 'presente', j0: 'ausente' } }];
    bd.ajustesEquipo[eq] = { ...(bd.ajustesEquipo[eq] || {}), modalidad: 'F7', duracion: '2x30' };
    localStorage.setItem('mister-modo-prueba', JSON.stringify(bd));
  });
  // 1. Resumen del partido + 6. dictado
  await p.goto(URL + 'partidos/p1/partido'); await espera(p, 1000);
  r.dictadoEnPartido = await p.locator('.anotar .boton-dictado').count();
  await pulsar(p, 'button:has-text("Compartir resumen del partido")'); await espera(p, 400);
  await p.fill('.resumen-partido textarea', 'Gran partido de todo el equipo.');
  r.resumen = await p.locator('.resumen-partido .mensaje-whatsapp').innerText();
  r.dictadoEnResumen = await p.locator('.resumen-partido .boton-dictado').count();
  await foto(p, '1-resumen');
  await pulsar(p, '.hoja button:has-text("Crear imagen")'); await p.waitForSelector('.resumen-imagen', { timeout: 10000 });
  await espera(p, 300); await foto(p, '1-resumen-imagen');
  const src = await p.locator('.resumen-imagen').getAttribute('src'); require('fs').writeFileSync(`${S}/shots/z-resumen.png`, Buffer.from(src.split(',')[1], 'base64'));
  await p.keyboard.press('Escape'); await espera(p, 300);
  // 3. Propuesta de sesión
  await p.goto(URL + 'sesiones'); await espera(p, 800);
  await pulsar(p, 'button:has-text("Proponer sesión según un objetivo")'); await espera(p, 600);
  await p.fill('.buscar-objetivo input', 'Presión tras pérdida'); await pulsar(p, 'button:has-text("Buscar ejercicios")'); await espera(p, 1200);
  r.propuestos = await p.locator('.lista-propuesta .fila-convocar.si .fila-texto b').allInnerTexts();
  await foto(p, '3-propuesta');
  await pulsar(p, '.barra-crear-sesion button:has-text("Crear sesión")'); await espera(p, 1500);
  r.trasCrear = p.url().replace(URL, '');
  r.bloquesSesion = await p.evaluate(() => { const bd = JSON.parse(localStorage.getItem('mister-modo-prueba')); const m = Object.values(bd.mios)[0]; return { sesiones: (m.sesiones || []).map((s) => `${s.nombre}: ${s.bloques.length} bloques`), ejercicios: (m.ejercicios || []).length }; });
  // 5. Informe para la familia
  await p.goto(URL + 'plantilla/jugador/j6'); await espera(p, 1000);
  await pulsar(p, 'button:has-text("Informe para la familia")'); await espera(p, 400);
  r.informeCifras = await p.locator('.informe-cifras li').allInnerTexts().then((l) => l.map((x) => x.replace(/\n/g, ' ')));
  r.informeSinValoracion = !(await p.locator('.hoja').innerText()).includes('privado');
  await p.fill('.informe-familia textarea', 'Ha mejorado mucho en el juego sin balón.');
  await p.fill('.informe-familia input.entrada', 'Míster Prueba');
  await foto(p, '5-informe');
  await pulsar(p, '.hoja button:has-text("Crear informe")'); await p.waitForSelector('.hoja a:has-text("Descargar")', { timeout: 10000 });
  const d1 = p.waitForEvent('download'); await pulsar(p, '.hoja a:has-text("Descargar")'); const dl = await d1; await dl.saveAs(`${S}/shots/z-informe.pdf`);
  await p.keyboard.press('Escape'); await espera(p, 300);
  // 7. Torneo
  await p.goto(URL + 'partidos'); await espera(p, 800);
  await pulsar(p, 'button:has-text("Apuntar torneo")'); await espera(p, 400);
  await p.fill('.hoja input.entrada >> nth=0', 'Torneo de Navidad');
  await p.fill('.hoja input[type=date]', '2026-12-20'); await p.fill('.hoja input.entrada >> nth=2', 'Campo Anexo');
  await p.fill('.partidos-torneo-nuevo li >> nth=0 >> input[placeholder="Rival 1"]', 'Tacoronte');
  await p.fill('.partidos-torneo-nuevo li >> nth=1 >> input[placeholder="Rival 2"]', 'San Andrés');
  await pulsar(p, '.hoja button:has-text("Añadir partido")');
  await p.fill('.partidos-torneo-nuevo li >> nth=2 >> input[placeholder="Rival 3"]', 'Verdellada');
  await foto(p, '7-nuevo-torneo');
  await pulsar(p, '.hoja button:has-text("Crear torneo")'); await espera(p, 1500);
  r.urlTorneo = p.url().replace(URL, '').slice(0, 9);
  await pulsar(p, '.convocatoria-resumen button:has-text("Convocar")'); await espera(p, 400);
  for (const x of ['Leo', 'Hugo', 'Mario', 'Álex', 'Pablo', 'Dani', 'Iker', 'Noa', 'Marcos', 'Sara']) await pulsar(p, `.fila-convocar:has-text("${x}")`);
  await pulsar(p, '.hoja button:has-text("Ver mensaje")');
  r.mensajeTorneo = await p.locator('.mensaje-whatsapp').innerText();
  await p.keyboard.press('Escape'); await espera(p, 500);
  r.convocadosEnTodos = await p.evaluate(() => JSON.parse(localStorage.getItem('mister-modo-prueba')).filas.partidos.filter((x) => x.torneo).map((x) => (x.convocados || []).length));
  // Partido 1 del torneo jugado: unos juegan más que otros
  await p.evaluate(() => { const bd = JSON.parse(localStorage.getItem('mister-modo-prueba')); const ps = bd.filas.partidos.filter((x) => x.torneo).sort((a, b) => a.hora.localeCompare(b.hora));
    ps[0].alineacion = { sistemaId: 'f7-231', sistemaNombre: '2-3-1', posiciones: [], titulares: ['j0','j1','j2','j3','j4','j5','j6'], suplentes: ['j7','j8','j9'], dorsales: {} };
    ps[0].reloj = { parte: 2, inicio: null, terminado: true }; localStorage.setItem('mister-modo-prueba', JSON.stringify(bd)); });
  await p.reload(); await espera(p, 1200);
  r.minutosTorneo = await p.locator('.minutos-torneo li').allInnerTexts().then((l) => l.map((x) => x.replace(/\n/g, ' ')));
  await foto(p, '7-torneo', true);
  r.listaPartidos = await p.goto(URL + 'partidos').then(() => espera(p, 800)).then(() => p.locator('.fila-torneo').allInnerTexts().then((l) => l.map((x) => x.replace(/\n/g, ' '))));
  // Plan del 2º partido: empiezan los que no jugaron
  const id2 = await p.evaluate(() => JSON.parse(localStorage.getItem('mister-modo-prueba')).filas.partidos.filter((x) => x.torneo).sort((a, b) => a.hora.localeCompare(b.hora))[1].id);
  await p.goto(URL + `partidos/${id2}/alineacion`); await espera(p, 900);
  await pulsar(p, 'button:has-text("Reparto de minutos")'); await espera(p, 400);
  r.avisoTorneoPlan = await p.locator('.hoja .mensaje-aviso').first().innerText().catch(() => 'NO');
  r.plan2 = await p.locator('.barras-minutos li').allInnerTexts().then((l) => l.map((x) => x.replace(/\n/g, ' ')));
  await p.keyboard.press('Escape'); await espera(p, 300);
  // 10. Calendario en el móvil (en modo prueba avisa)
  await p.goto(URL + 'calendario'); await espera(p, 800);
  await pulsar(p, 'button:has-text("Ver en el calendario del móvil")'); await espera(p, 600);
  r.calendarioPrueba = await p.locator('.aviso, .avisos, [role=status]').allInnerTexts().catch(() => []);
  // 2. Segundo entrenador
  await p.goto(URL + 'ajustes'); await espera(p, 1000); if (!(await p.locator('#grupo-equipo.abierto').count())) await pulsar(p, '.grupo-cabeza:has-text("Mi equipo")');
  await p.fill('.anadir-ayudante input', 'nadie@prueba.test'); await pulsar(p, '.anadir-ayudante button:has-text("Añadir")'); await espera(p, 500);
  r.errorNoClub = await p.locator('[role=status], .aviso').allInnerTexts().catch(() => []);
  await p.fill('.anadir-ayudante input', 'mister.dani@prueba.test'); await pulsar(p, '.anadir-ayudante button:has-text("Añadir")'); await espera(p, 800);
  r.entrenadores = await p.locator('.entrenadores-equipo .fila').allInnerTexts().then((l) => l.map((x) => x.replace(/\n/g, ' ')));
  await p.locator('.entrenadores-equipo').evaluate((el) => el.scrollIntoView({ block: 'center' })); await foto(p, '2-ajustes-principal');
  // Dani entra: es ayudante
  await p.evaluate(() => { const bd = JSON.parse(localStorage.getItem('mister-modo-prueba')); bd.sesion = null; localStorage.setItem('mister-modo-prueba', JSON.stringify(bd)); });
  await registrar(p, 'mister.dani@prueba.test', 'entrenador');
  r.daniVe = await p.locator('.selector-nombre').innerText().catch(() => 'NO');
  await p.goto(URL + 'ajustes'); await espera(p, 1000); if (!(await p.locator('#grupo-equipo.abierto').count())) await pulsar(p, '.grupo-cabeza:has-text("Mi equipo")');
  r.daniRenombrar = await p.locator('#ajustes-nombre-equipo').count();
  r.daniTexto = await p.locator('.entrenadores-equipo > p').innerText().catch(() => 'NO');
  r.daniAnadir = await p.locator('.anadir-ayudante').count();
  await p.goto(URL + 'plantilla'); await espera(p, 800); r.daniPlantilla = await p.locator('.jugador').count();
  // Directiva ve al ayudante
  await entrarComo(p, 'club@prueba.test'); await p.goto(URL + 'club'); await espera(p, 1000);
  await pulsar(p, '.segmentos-dir >> text=Equipos'); await espera(p, 500);
  r.directiva = await p.locator('.equipo').first().innerText().then((t) => t.replace(/\n/g, ' | '));
  r.ancho = await p.evaluate(() => document.documentElement.scrollWidth); r.errs = errs;
  console.log(JSON.stringify(r, null, 1)); await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
