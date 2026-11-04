/* =============================================================
   PIZARRA.JS · Fase 3: alineación sobre un campo de fútbol
   -------------------------------------------------------------
   #/pizarra          -> pizarra libre de la categoría elegida
   #/pizarra/ID       -> alineación de un partido concreto

   Cómo se usa:
   - Arrastra un jugador del banquillo a un puesto del campo.
   - Arrastra a un jugador del campo para moverlo libremente,
     o suéltalo en el banquillo para quitarlo.
   - Sin arrastrar: toca un jugador y luego un puesto (más cómodo
     en móviles pequeños). Tocar dos puestos los intercambia.

   La alineación se guarda así:
     { formacion: '4-4-2', puestos: [ { x: 50, y: 90, jugador: 'id' }, ... ] }
   x e y van de 0 a 100 (porcentaje del campo). y=100 es nuestra portería.
   ============================================================= */

const Pizarra = {
  FORMACIONES: {
    7: ['3-2-1', '2-3-1', '3-1-2', '2-1-2-1'],
    8: ['3-3-1', '3-2-2', '2-3-2', '3-1-3'],
    11: ['4-4-2', '4-3-3', '4-2-3-1', '3-5-2', '5-3-2', '4-1-4-1'],
  },

  // Formaciones según la modalidad del equipo (fútbol 7, 8 u 11)
  formacionesDe(equipo) {
    return Pizarra.FORMACIONES[equipo?.modalidad] || Pizarra.FORMACIONES[7];
  },

  /* Calcula dónde va cada puesto según la formación.
     "4-4-2" = 4 defensas, 4 medios, 2 delanteros (+ el portero) */
  posiciones(formacion) {
    const lineas = formacion.split('-').map(Number);
    const puestos = [{ x: 50, y: 90 }]; // portero
    lineas.forEach((cuantos, i) => {
      const y = lineas.length === 1 ? 50 : 72 - (i * (72 - 18)) / (lineas.length - 1);
      const margen = cuantos <= 2 ? 30 : cuantos === 3 ? 20 : 12;
      for (let k = 0; k < cuantos; k++) {
        const x = cuantos === 1 ? 50 : margen + (k * (100 - 2 * margen)) / (cuantos - 1);
        puestos.push({ x: Math.round(x), y: Math.round(y) });
      }
    });
    return puestos;
  },

  nueva(formacion) {
    return { formacion, puestos: Pizarra.posiciones(formacion).map((p) => ({ ...p, jugador: null })) };
  },

  // Cambia de formación manteniendo a los jugadores en el mismo orden
  cambiarFormacion(al, formacion) {
    const jugadores = al.puestos.map((p) => p.jugador);
    const nueva = Pizarra.nueva(formacion);
    nueva.puestos.forEach((p, i) => { p.jugador = jugadores[i] || null; });
    return nueva;
  },

  /* Texto de la alineación (para WhatsApp) */
  texto(al, categoria, titulo) {
    const nombre = (id) => {
      const j = DB.obtener('jugadores', id);
      return j ? j.nombre : '—';
    };
    // Agrupamos por altura en el campo: portería, defensa, medio, ataque
    const ordenados = al.puestos.filter((p) => p.jugador).sort((a, b) => b.y - a.y || a.x - b.x);
    const grupos = [['🧤 Portería', (p) => p.y >= 82], ['🛡️ Defensa', (p) => p.y >= 60 && p.y < 82], ['⚙️ Medio', (p) => p.y >= 35 && p.y < 60], ['🎯 Ataque', (p) => p.y < 35]];
    let t = `⚽ *C.D. EL TRANVÍA · ${DB.categoria(categoria).nombre.toUpperCase()}*\n📋 *${titulo}* (${al.formacion})\n`;
    grupos.forEach(([g, cond]) => {
      const js = ordenados.filter(cond);
      if (js.length) t += `\n${g}: ${js.map((p) => nombre(p.jugador)).join(', ')}`;
    });
    return t + '\n\n¡Vamos Tranvía! 🔴🔵';
  },
};

Vistas.pizarra = {
  tab: 'partidos',
  titulo: 'Pizarra',
  atras: '#/partidos',
  seleccion: null, // lo que se ha tocado (para el modo "tocar y colocar")

  // Reúne todo lo necesario: equipo, alineación y jugadores disponibles
  contexto(partidoId) {
    let p = null;
    let al;
    let disponibles;
    if (partidoId) {
      p = DB.obtener('partidos', partidoId);
      if (!p) return null;
      al = p.alineacion;
      disponibles = p.convocados?.length ? p.convocados.map((id) => DB.obtener('jugadores', id)).filter(Boolean) : DB.jugadoresDe(p.equipoId);
    }
    const equipo = DB.obtener('equipos', p?.equipoId) || DB.equipo();
    if (!p) {
      al = (DB.ajuste('pizarras') || {})[equipo.id];
      disponibles = DB.jugadoresDe(equipo.id);
    }
    const formaciones = Pizarra.formacionesDe(equipo);
    if (!al) al = Pizarra.nueva(formaciones[0]);
    // Si el equipo cambió de modalidad (ej.: de F7 a F8), adaptamos la alineación
    else if (al.puestos.length !== Number(equipo.modalidad)) al = Pizarra.cambiarFormacion(al, formaciones[0]);
    return { partido: p, equipo, categoria: equipo.categoria, al, disponibles };
  },

  guardar(partidoId, ctx) {
    if (partidoId) DB.actualizar('partidos', partidoId, { alineacion: ctx.al });
    else DB.cambiarAjuste('pizarras', { ...(DB.ajuste('pizarras') || {}), [ctx.equipo.id]: ctx.al });
  },

  pintar(partidoId) {
    this.atras = partidoId ? '#/partido/' + partidoId : '#/partidos';
    const ctx = this.contexto(partidoId);
    if (!ctx) return UI.vacio('trofeo', 'Partido no encontrado', '');
    this.seleccion = null;
    const cat = DB.categoria(ctx.categoria);
    return `
      <div class="pantalla-cab">
        <div><h1>${ctx.partido ? 'Alineación' : 'Pizarra'}</h1>
        <p>${ctx.partido ? 'vs ' + UI.esc(ctx.partido.rival) + ' · ' : ''}${cat.nombre} · Fútbol ${ctx.equipo.modalidad}</p></div>
      </div>
      <div class="chips">
        ${Pizarra.formacionesDe(ctx.equipo).map((f) => `<button class="chip ${ctx.al.formacion === f ? 'activo' : ''}" data-accion="pizarra-formacion" data-formacion="${f}" data-partido="${partidoId || ''}">${f}</button>`).join('')}
      </div>
      <p class="texto-suave peq" style="margin:0 0 10px">${UI.icono('info', 'peq')} Arrastra jugadores al campo, o toca uno y después su puesto.</p>
      <div id="pizarra-zona" data-partido="${partidoId || ''}">${this.zonaHTML(ctx)}</div>
      <div class="fila-botones mt no-imprimir">
        <button class="btn btn-whatsapp" data-accion="pizarra-whatsapp" data-partido="${partidoId || ''}">${UI.icono('whatsapp')} Compartir</button>
        <button class="btn btn-borde" data-accion="pizarra-reset" data-partido="${partidoId || ''}">${UI.icono('papelera')} Vaciar</button>
      </div>
    `;
  },

  // El campo y el banquillo (se repintan sin recargar la pantalla entera)
  zonaHTML(ctx) {
    const enCampo = new Set(ctx.al.puestos.map((p) => p.jugador).filter(Boolean));
    const banquillo = ctx.disponibles.filter((j) => !enCampo.has(j.id));
    const sel = this.seleccion;
    return `
      <div class="campo-futbol" id="campo">
        ${Vistas.pizarra.lineasCampo()}
        ${ctx.al.puestos.map((p, i) => {
          const j = p.jugador ? DB.obtener('jugadores', p.jugador) : null;
          const elegido = sel && sel.tipo === 'puesto' && sel.valor === String(i);
          return `<div class="ficha-campo ${j ? '' : 'vacia'} ${i === 0 ? 'portero' : ''} ${elegido ? 'elegida' : ''}"
            style="left:${p.x}%;top:${p.y}%" data-ficha="puesto" data-valor="${i}">
            <span class="ficha-circulo">${j ? UI.esc(UI.iniciales(j.nombre)) : '+'}</span>
            ${j ? `<span class="ficha-nombre">${UI.esc(j.nombre)}</span>` : ''}
          </div>`;
        }).join('')}
      </div>
      <div class="banquillo" id="banquillo">
        <div class="banquillo-titulo">Banquillo · ${banquillo.length}</div>
        <div class="banquillo-lista">
          ${banquillo.map((j) => `<div class="ficha-banco ${sel && sel.tipo === 'banco' && sel.valor === j.id ? 'elegida' : ''}" data-ficha="banco" data-valor="${j.id}">
            <span class="ficha-circulo">${UI.esc(UI.iniciales(j.nombre))}</span><span>${UI.esc(j.nombre)}</span><small title="Pierna ${DB.pierna(j.pierna).nombre.toLowerCase()}">${DB.pierna(j.pierna).corto}</small></div>`).join('')
            || '<p class="texto-suave peq" style="margin:4px">Todos en el campo 👍</p>'}
        </div>
      </div>`;
  },

  // Dibujo de las líneas del campo (vertical: nuestra portería abajo)
  lineasCampo() {
    return `<svg class="campo-lineas" viewBox="0 0 68 100" preserveAspectRatio="none" aria-hidden="true">
      <g fill="none" stroke="rgba(255,255,255,.75)" stroke-width=".4">
        <rect x="2" y="2" width="64" height="96"/>
        <line x1="2" y1="50" x2="66" y2="50"/>
        <circle cx="34" cy="50" r="7"/><circle cx="34" cy="50" r=".6" fill="rgba(255,255,255,.75)"/>
        <rect x="14" y="2" width="40" height="15"/><rect x="24" y="2" width="20" height="5.5"/>
        <rect x="14" y="83" width="40" height="15"/><rect x="24" y="92.5" width="20" height="5.5"/>
        <path d="M27 17 A7 7 0 0 0 41 17"/><path d="M27 83 A7 7 0 0 1 41 83"/>
      </g></svg>`;
  },

  repintarZona(partidoId, ctx) {
    document.getElementById('pizarra-zona').innerHTML = this.zonaHTML(ctx);
  },

  /* ---------- ARRASTRAR Y SOLTAR ----------
     Usamos "pointer events", que funcionan igual con ratón y con dedo. */
  montar(partidoId) {
    const zona = document.getElementById('pizarra-zona');
    if (!zona) return;
    let arrastre = null;

    zona.addEventListener('pointerdown', (e) => {
      const ficha = e.target.closest('[data-ficha]');
      if (!ficha) return;
      arrastre = { ficha, tipo: ficha.dataset.ficha, valor: ficha.dataset.valor, x0: e.clientX, y0: e.clientY, movido: false, fantasma: null };
    });

    const mover = (e) => {
      if (!arrastre) return;
      const dx = e.clientX - arrastre.x0, dy = e.clientY - arrastre.y0;
      if (!arrastre.movido && Math.hypot(dx, dy) < 6) return; // aún no es un arrastre
      e.preventDefault();
      if (!arrastre.movido) {
        arrastre.movido = true;
        // Creamos una copia de la ficha que sigue al dedo
        const f = arrastre.ficha.cloneNode(true);
        f.classList.add('fantasma');
        f.style.left = f.style.top = '';
        document.body.appendChild(f);
        arrastre.fantasma = f;
        arrastre.ficha.style.opacity = '.3';
      }
      arrastre.fantasma.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -50%) scale(1.12)`;
    };

    const soltar = (e) => {
      if (!arrastre) return;
      const a = arrastre;
      arrastre = null;
      const ctx = Vistas.pizarra.contexto(partidoId);
      if (!a.movido) { Vistas.pizarra.tocar(a.tipo, a.valor, ctx, partidoId); return; }
      a.fantasma.remove();

      const campo = document.getElementById('campo').getBoundingClientRect();
      const banco = document.getElementById('banquillo').getBoundingClientRect();
      const dentro = (r) => e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;

      if (dentro(campo)) {
        const x = Math.min(96, Math.max(4, ((e.clientX - campo.left) / campo.width) * 100));
        const y = Math.min(97, Math.max(3, ((e.clientY - campo.top) / campo.height) * 100));
        if (a.tipo === 'puesto') {
          // Mover un jugador del campo a otro sitio
          Object.assign(ctx.al.puestos[Number(a.valor)], { x: Math.round(x), y: Math.round(y) });
        } else {
          // Del banquillo al puesto más cercano
          const i = Vistas.pizarra.puestoCercano(ctx.al, x, y);
          if (i !== -1) ctx.al.puestos[i].jugador = a.valor;
        }
      } else if (dentro(banco) && a.tipo === 'puesto') {
        ctx.al.puestos[Number(a.valor)].jugador = null; // al banquillo
      }
      Vistas.pizarra.guardar(partidoId, ctx);
      Vistas.pizarra.repintarZona(partidoId, ctx);
    };

    // Escuchamos en toda la ventana para no perder el dedo si sale de la zona
    window.addEventListener('pointermove', mover, { passive: false });
    window.addEventListener('pointerup', soltar);
    const cancelar = () => { if (arrastre?.fantasma) arrastre.fantasma.remove(); arrastre = null; App.refrescar(); };
    window.addEventListener('pointercancel', cancelar);
    // Al cambiar de pantalla, dejamos de escuchar
    window.addEventListener('hashchange', function limpiar() {
      window.removeEventListener('pointermove', mover);
      window.removeEventListener('pointerup', soltar);
      window.removeEventListener('pointercancel', cancelar);
      window.removeEventListener('hashchange', limpiar);
    });
  },

  // El puesto más cercano a un punto (o -1 si está lejos de todos)
  puestoCercano(al, x, y) {
    let mejor = -1, distancia = 16;
    al.puestos.forEach((p, i) => {
      const d = Math.hypot(p.x - x, (p.y - y) * 1.4);
      if (d < distancia) { distancia = d; mejor = i; }
    });
    return mejor;
  },

  // Modo "tocar y colocar"
  tocar(tipo, valor, ctx, partidoId) {
    const sel = this.seleccion;
    const puestos = ctx.al.puestos;
    if (tipo === 'puesto') {
      const i = Number(valor);
      if (sel?.tipo === 'banco') { puestos[i].jugador = sel.valor; this.seleccion = null; }
      else if (sel?.tipo === 'puesto' && sel.valor !== valor) {
        const k = Number(sel.valor);
        [puestos[i].jugador, puestos[k].jugador] = [puestos[k].jugador, puestos[i].jugador]; // intercambio
        this.seleccion = null;
      } else this.seleccion = sel?.valor === valor ? null : { tipo, valor };
    } else {
      // Si había un puesto elegido, este jugador entra en él (el anterior vuelve al banquillo)
      if (sel?.tipo === 'puesto') { puestos[Number(sel.valor)].jugador = valor; this.seleccion = null; }
      else this.seleccion = sel?.valor === valor ? null : { tipo, valor };
    }
    this.guardar(partidoId, ctx);
    this.repintarZona(partidoId, ctx);
  },
};

/* ---------- ACCIONES DE LA PIZARRA ---------- */
Acciones['pizarra-formacion'] = (el) => {
  const pid = el.dataset.partido || undefined;
  const ctx = Vistas.pizarra.contexto(pid);
  ctx.al = Pizarra.cambiarFormacion(ctx.al, el.dataset.formacion);
  Vistas.pizarra.guardar(pid, ctx);
  App.refrescar();
};

Acciones['pizarra-reset'] = async (el) => {
  const pid = el.dataset.partido || undefined;
  if (!(await UI.confirmar('Se quitarán todos los jugadores del campo y se recolocarán los puestos.', 'Vaciar'))) return;
  const ctx = Vistas.pizarra.contexto(pid);
  ctx.al = Pizarra.nueva(ctx.al.formacion);
  Vistas.pizarra.guardar(pid, ctx);
  App.refrescar();
};

Acciones['pizarra-whatsapp'] = (el) => {
  const pid = el.dataset.partido || undefined;
  const ctx = Vistas.pizarra.contexto(pid);
  if (!ctx.al.puestos.some((p) => p.jugador)) { UI.aviso('Coloca algún jugador en el campo', 'error'); return; }
  Compartir.whatsapp(Pizarra.texto(ctx.al, ctx.categoria, ctx.partido ? 'ALINEACIÓN vs ' + ctx.partido.rival : 'ALINEACIÓN'));
};
