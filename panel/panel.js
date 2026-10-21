/* =====================================================================
   SANTA AUTOMATIZA · PANEL DEL LOCAL (pedidos)
   ---------------------------------------------------------------------
   El dueño cambia precios, marca agotados, cierra por hoy y edita los
   horarios. Todo se ve al instante en su tienda.

   - Local real: entra con mail y contraseña. La base solo le deja ver y
     cambiar lo de SU local (precio, disponible, horarios y el cartel).
   - Demo: /panel/?demo=heladeria (o pizzeria, hamburgueseria, rotiseria).
     No hay login ni base: lo que se cambia se guarda en este celular y la
     tienda de demo lo muestra al toque. Sirve para mostrarlo en la visita.
   ===================================================================== */
(function () {
  'use strict';
  const C = { url: '', clave: '' };
  // Demo: cualquier tienda publicada en /demo/<nombre>/ (los rubros y las demos armadas para cada local)
  const DEMO = (() => { const d = new URLSearchParams(location.search).get('demo'); return /^[a-z0-9-]{2,40}$/.test(d || '') ? d : null; })();
  const DEMOS = DEMO ? { [DEMO]: 'demo/' + DEMO } : {};
  const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const ORDEN = [1, 2, 3, 4, 5, 6, 0];
  const MENSAJES = ['Hoy no abrimos', 'Cerrado por hoy. ¡Volvemos mañana!', 'Por hoy nos quedamos sin stock. ¡Gracias!'];

  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const plata = (n) => '$' + Math.round(Number(n) || 0).toLocaleString('es-AR');
  const miles = (n) => Math.round(Number(n) || 0).toLocaleString('es-AR');
  const normal = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const leerLS = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
  const guardarLS = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } };

  const st = { sesion: null, negocio: null, local: { horarios: null, pausa: null, pausa_hasta: null }, items: [], filtro: '', soloAgotados: false, horas: null };

  /* ---------- Hora de Argentina (UTC-3, sin horario de verano) ---------- */
  function ahoraAR() {
    const d = new Date(Date.now() - 3 * 3600 * 1000);
    return { dia: d.getUTCDay(), min: d.getUTCHours() * 60 + d.getUTCMinutes(), h: d.getUTCHours(), fecha: d };
  }
  // "Cerrar por hoy" vuelve a abrir solo a las 6 de la mañana siguiente
  function proximas6() {
    const a = ahoraAR();
    const d = new Date(Date.UTC(a.fecha.getUTCFullYear(), a.fecha.getUTCMonth(), a.fecha.getUTCDate() + (a.h < 6 ? 0 : 1), 6 + 3, 0, 0));
    return d.toISOString();
  }
  const aMin = (h) => { const x = String(h).split(':').map(Number); return x[0] * 60 + x[1]; };
  function franjas(dia) {
    const h = st.local.horarios || {};
    return (h[dia] || h[String(dia)] || []).map((r) => {
      const x = String(r).split('-'); const i = aMin(x[0]); let f = aMin(x[1]);
      if (f <= i) f += 1440;
      return { i, f, ini: x[0], fin: x[1] };
    });
  }
  const pausaActiva = () => !!st.local.pausa && (!st.local.pausa_hasta || new Date(st.local.pausa_hasta) > new Date());
  function estadoAhora() {
    const { dia, min } = ahoraAR();
    let abierta = null;
    franjas(dia).forEach((fr) => { if (min >= fr.i && min < fr.f) abierta = fr; });
    franjas((dia + 6) % 7).forEach((fr) => { if (min + 1440 < fr.f) abierta = fr; });
    if (abierta) return { abierto: true, texto: 'Se cierra sola a las ' + abierta.fin };
    for (let k = 0; k < 8; k++) {
      const dd = (dia + k) % 7;
      const fr = franjas(dd).find((f) => k > 0 || f.i > min);
      if (fr) return { abierto: false, texto: 'Se abre sola ' + (k === 0 ? 'hoy' : k === 1 ? 'mañana' : 'el ' + DIAS[dd].toLowerCase()) + ' a las ' + fr.ini };
    }
    return { abierto: false, texto: 'No tiene horarios cargados' };
  }

  /* ---------- Sesión ---------- */
  function fijarSesion(d) {
    st.sesion = d ? { access: d.access_token, refresh: d.refresh_token, vence: Date.now() + ((d.expires_in || 3600) - 60) * 1000, mail: d.user && d.user.email, uid: d.user && d.user.id } : null;
    guardarLS('sa-pedidos:panel', st.sesion);
  }
  async function auth(ruta, cuerpo) {
    const r = await fetch(`${C.url}/auth/v1/${ruta}`, { method: 'POST', headers: { apikey: C.clave, 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error(d.error_code || d.msg || d.error_description || 'error'); e.status = r.status; throw e; }
    return d;
  }
  let refrescando = null;
  function refrescar() {
    if (!st.sesion) return Promise.reject(new Error('sin sesión'));
    refrescando = refrescando || auth('token?grant_type=refresh_token', { refresh_token: st.sesion.refresh })
      .then((d) => fijarSesion(d)).finally(() => { refrescando = null; });
    return refrescando;
  }
  async function api(ruta, opciones = {}, reintento = true) {
    if (st.sesion && Date.now() > st.sesion.vence) await refrescar().catch(() => salir(true));
    const r = await fetch(`${C.url}/rest/v1/${ruta}`, {
      method: opciones.method || 'GET',
      headers: { apikey: C.clave, Authorization: `Bearer ${st.sesion ? st.sesion.access : ''}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: opciones.body ? JSON.stringify(opciones.body) : undefined
    });
    if (r.status === 401 && reintento && st.sesion) {
      try { await refrescar(); } catch (e) { salir(true); throw e; }
      return api(ruta, opciones, false);
    }
    const t = await r.text();
    if (!r.ok) throw new Error(t || 'error');
    return t ? JSON.parse(t) : null;
  }
  function salir(silencioso) {
    if (st.sesion && !silencioso) fetch(`${C.url}/auth/v1/logout`, { method: 'POST', headers: { apikey: C.clave, Authorization: `Bearer ${st.sesion.access}` } }).catch(() => {});
    fijarSesion(null);
    st.negocio = null; st.items = [];
    $('#menu').hidden = true;
    mostrar('entrar');
  }

  /* =====================================================================
     DE DÓNDE SALEN LOS DATOS: la base (local real) o este celular (demo)
     ===================================================================== */
  const BASE = {
    async cargar() {
      const filas = await api('pedidos_local?select=negocio_id,horarios,pausa,pausa_hasta,negocios(slug,nombre)');
      const f = (filas || []).find((x) => x.negocios);
      if (!f) return false;
      st.negocio = { id: f.negocio_id, slug: f.negocios.slug, nombre: f.negocios.nombre, tienda: '../' + f.negocios.slug + '/' };
      st.local = { horarios: f.horarios, pausa: f.pausa, pausa_hasta: f.pausa_hasta };
      st.items = await api(`carta?select=item,nombre,grupo,orden,precio,disponible&negocio_id=eq.${f.negocio_id}&order=orden,nombre`);
      return true;
    },
    async guardarItem(it, cambios) {
      const r = await api(`carta?negocio_id=eq.${st.negocio.id}&item=eq.${encodeURIComponent(it.item)}`, { method: 'PATCH', body: cambios });
      if (!r || !r.length) throw new Error('sin permiso');
    },
    async guardarLocal(cambios) {
      const r = await api(`pedidos_local?negocio_id=eq.${st.negocio.id}`, { method: 'PATCH', body: cambios });
      if (!r || !r.length) throw new Error('sin permiso');
      st.local = { horarios: r[0].horarios, pausa: r[0].pausa, pausa_hasta: r[0].pausa_hasta };
    }
  };

  const CLAVE_DEMO = () => 'sa-panel-demo:' + DEMOS[DEMO];
  const DEMO_FUENTE = {
    cargar() {
      return new Promise((ok, mal) => {
        const s = document.createElement('script');
        s.src = '../' + DEMOS[DEMO] + '/config.js';
        s.onload = () => {
          const L = window.LOCAL;
          if (!L || !L.categorias) { mal(new Error('demo')); return; }
          const guardado = leerLS(CLAVE_DEMO()) || {};
          const cambios = {};
          (guardado.items || []).forEach((x) => { cambios[x.i] = x; });
          st.items = itemsDeLocal(L).map((it) => {
            const c = cambios[it.item];
            if (c) { if (it.precio != null && c.p > 0) it.precio = c.p; if (typeof c.d === 'boolean') it.disponible = c.d; }
            return it;
          });
          st.negocio = { nombre: L.nombre, tienda: '../' + DEMOS[DEMO] + '/', demo: true, logo: L.logo ? '../' + DEMOS[DEMO] + '/' + L.logo : '' };
          colores((L.diseno || {}).panel);
          st.local = { horarios: guardado.horarios || L.horarios || {}, pausa: guardado.pausa || null, pausa_hasta: guardado.pausa_hasta || null };
          if (st.local.pausa && !pausaActiva()) { st.local.pausa = null; st.local.pausa_hasta = null; }
          ok(true);
        };
        s.onerror = () => mal(new Error('demo'));
        document.head.appendChild(s);
      });
    },
    guardar() {
      guardarLS(CLAVE_DEMO(), {
        items: st.items.map((x) => ({ i: x.item, p: x.precio, d: x.disponible })),
        horarios: st.local.horarios,
        pausa: pausaActiva() ? st.local.pausa : null,
        pausa_hasta: pausaActiva() ? st.local.pausa_hasta : null
      });
    },
    async guardarItem(it, cambios) { Object.assign(it, cambios); this.guardar(); },
    async guardarLocal(cambios) { Object.assign(st.local, cambios); if (!st.local.pausa) st.local.pausa_hasta = null; this.guardar(); }
  };
  // El panel con los colores del local (diseno.panel en su archivo). Por JS: la seguridad del panel no deja estilos en el HTML.
  function colores(c) {
    if (!c || typeof c !== 'object') return;
    const hex = (v) => /^#[0-9a-fA-F]{6}$/.test(v || '');
    const r = document.documentElement.style;
    [['fondo', '--noche'], ['acento', '--azul'], ['acentoClaro', '--azul-claro'], ['destaque', '--coral'], ['destaqueClaro', '--coral-claro']]
      .forEach(([k, v]) => { if (hex(c[k])) r.setProperty(v, c[k]); });
    const m = document.querySelector('meta[name="theme-color"]');
    if (m && hex(c.fondo)) m.setAttribute('content', c.fondo);
  }
  const fuente = DEMO ? DEMO_FUENTE : BASE;

  // La carta de un local (locales/*.js) convertida en la lista que muestra el panel.
  // Es la misma regla que usa herramientas/carta-sql.js para cargarla en la base.
  function itemsDeLocal(L) {
    const items = [];
    (L.categorias || []).forEach((c, ci) => (c.productos || []).forEach((p, pi) => {
      items.push({ item: p.id, nombre: p.nombre, grupo: c.nombre, orden: ci * 1000 + pi, precio: p.precio > 0 ? p.precio : null, disponible: p.disponible !== false });
    }));
    Object.keys(L.listas || {}).forEach((k, ki) => (L.listas[k] || []).forEach((o, oi) => {
      items.push({ item: k + '/' + o.nombre, nombre: o.nombre, grupo: k.charAt(0).toUpperCase() + k.slice(1), orden: 900000 + ki * 1000 + oi, precio: null, disponible: o.disponible !== false });
    }));
    return items;
  }

  /* =====================================================================
     PANTALLAS
     ===================================================================== */
  function mostrar(v) {
    document.querySelectorAll('.vista').forEach((x) => { x.hidden = x.id !== 'v-' + v; });
    window.scrollTo(0, 0);
  }

  async function iniciar() {
    mostrar('cargando');
    let hay;
    try { hay = await fuente.cargar(); } catch (e) {
      if (!DEMO && !st.sesion) return;
      mostrar(DEMO ? 'cargando' : 'entrar');
      if (!DEMO) $('#e-error').textContent = 'No pudimos conectarnos. Revisá tu conexión y probá de nuevo.';
      else $('#v-cargando .nota').textContent = 'No se pudo abrir la demo.';
      return;
    }
    if (!DEMO && !st.sesion) { mostrar('entrar'); return; } // la sesión venció mientras cargaba
    if (!hay) { $('#sin-mail').textContent = st.sesion ? st.sesion.mail || '' : ''; mostrar('sin-acceso'); return; }
    document.title = 'Panel · ' + st.negocio.nombre;
    $('#local-nombre').textContent = st.negocio.nombre.replace(/-/g, '\u2011'); // guion que no corta: "Al-Pino" no queda partido
    if (st.negocio.logo && !$('.cabeza-logo')) { const im = new Image(); im.className = 'cabeza-logo'; im.alt = ''; im.src = st.negocio.logo; $('.cabeza-txt').before(im); }
    $('#demo-banda').hidden = !DEMO;
    $('#demo-tienda').href = st.negocio.tienda;
    $('#lateral-tienda').href = st.negocio.tienda;
    $('#m-clave').hidden = !!DEMO;
    $('#m-reiniciar').hidden = !DEMO;
    $('#m-rubros').hidden = !DEMO;
    document.querySelectorAll('[data-salir]').forEach((b) => { b.hidden = !!DEMO; });
    await iniciarVentas();
    mostrar('app');
    pintarEstado();
    pintarCarta();
    ruta();
  }

  function ruta() {
    const pedida = location.hash.slice(1);
    const validas = st.ventas ? ['pedidos', 'clientes', 'carta', 'horarios'] : ['carta', 'horarios'];
    const p = validas.includes(pedida) ? pedida : validas[0];
    ['pedidos', 'clientes', 'carta', 'horarios'].forEach((x) => { $('#p-' + x).hidden = p !== x; });
    document.querySelectorAll('[data-pestana]').forEach((a) => { if (a.dataset.pestana === p) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    if (p === 'horarios') pintarHorarios();
    if (p === 'pedidos') { st.sinVer = 0; pintarPedidos(); }
    if (p === 'clientes') pintarClientes();
  }

  /* ---------- Abierto / cerrado ---------- */
  function pintarEstado() {
    const caja = $('#estado');
    if (pausaActiva()) {
      const vuelve = st.local.pausa_hasta ? 'El cierre se levanta solo a las 6 de la mañana y la tienda sigue con sus horarios de siempre.' : 'Queda cerrada hasta que la abras.';
      caja.innerHTML = `<div class="estado-fila"><span class="punto cerrado"></span><div class="estado-txt"><b>Cerrada por hoy</b><span>Tus clientes ven: “${esc(st.local.pausa)}”. ${vuelve}</span></div></div>
        <button class="btn btn-linea" type="button" id="b-abrir">Abrir de nuevo</button>`;
      return;
    }
    const e = estadoAhora();
    caja.innerHTML = `<div class="estado-fila"><span class="punto ${e.abierto ? 'abierto' : ''}"></span><div class="estado-txt"><b>${e.abierto ? 'Tu tienda está abierta' : 'Tu tienda está cerrada ahora'}</b><span>${esc(e.texto)}</span></div></div>
      <p class="estado-auto">Se abre y se cierra sola con tus horarios: no tenés que tocar nada. <a href="#horarios">Cambiar horarios</a></p>
      <button class="btn btn-coral" type="button" id="b-cerrar">Cerrar por hoy (un imprevisto)</button>`;
  }

  async function cerrarPorHoy() {
    const cuerpo = `<p class="nota">Tu tienda deja de tomar pedidos hasta las 6 de la mañana y después sigue con sus horarios de siempre. ¿Qué mensaje ven tus clientes?</p>
      <div class="opciones" role="radiogroup">
        ${MENSAJES.map((m, i) => `<label class="opcion"><input type="radio" name="msj" value="${i}" ${i === 0 ? 'checked' : ''}><span>${esc(m)}</span></label>`).join('')}
        <label class="opcion"><input type="radio" name="msj" value="otro"><span>Otro mensaje</span></label>
      </div>
      <div class="campo" id="msj-otro-campo" hidden><label for="msj-otro">Tu mensaje</label><input id="msj-otro" maxlength="120" placeholder="Ej: Hoy cerramos por inventario"></div>`;
    const ok = await dialogo('Cerrar por hoy', cuerpo, 'Cerrar por hoy', () => {
      const v = (document.querySelector('input[name="msj"]:checked') || {}).value;
      if (v === 'otro') { const t = $('#msj-otro').value.trim(); if (!t) { $('#msj-otro').focus(); return false; } return t; }
      return MENSAJES[Number(v) || 0];
    });
    if (!ok) return;
    try {
      await fuente.guardarLocal({ pausa: ok.slice(0, 120), pausa_hasta: proximas6() });
      pintarEstado(); aviso('Listo: tu tienda quedó cerrada por hoy.');
    } catch (e) { aviso('No se pudo guardar. Revisá tu conexión.', true); }
  }
  async function abrirDeNuevo() {
    try {
      await fuente.guardarLocal({ pausa: null, pausa_hasta: null });
      pintarEstado(); aviso('Listo: tu tienda vuelve a tomar pedidos.');
    } catch (e) { aviso('No se pudo guardar. Revisá tu conexión.', true); }
  }

  /* ---------- Carta: precios y agotados ---------- */
  function pintarCarta() {
    const f = normal(st.filtro);
    const grupos = [];
    const porGrupo = {};
    st.items.forEach((it, i) => {
      if (st.soloAgotados && it.disponible) return;
      if (f && !normal(it.nombre).includes(f) && !normal(it.grupo).includes(f)) return;
      if (!porGrupo[it.grupo]) { porGrupo[it.grupo] = []; grupos.push(it.grupo); }
      porGrupo[it.grupo].push(i);
    });
    pintarBarra();
    if (!grupos.length) { $('#carta').innerHTML = `<p class="vacio">${st.soloAgotados && !f ? 'No hay nada agotado. ¡Todo se puede pedir!' : f ? 'No encontramos nada con “' + esc(st.filtro) + '”.' : 'Tu carta todavía no está cargada. Escribinos y la dejamos lista.'}</p>`; return; }
    $('#carta').innerHTML = grupos.map((g) => {
      const idx = porGrupo[g];
      const agot = idx.filter((i) => !st.items[i].disponible).length;
      return `<section class="grupo"><h2>${esc(g || 'Carta')}${agot ? `<small>${agot} agotado${agot > 1 ? 's' : ''}</small>` : ''}</h2>
        <div class="items">${idx.map(itemHTML).join('')}</div></section>`;
    }).join('');
  }
  function pintarBarra() {
    const agot = st.items.filter((it) => !it.disponible).length;
    if (st.soloAgotados && !agot) st.soloAgotados = false; // ya no queda nada agotado: vuelve a mostrar todo
    const chip = (k, txt, n) => `<button class="chip" type="button" data-chip="${k}" aria-pressed="${(k === 'agotados') === st.soloAgotados}">${txt} <b>${n}</b></button>`;
    $('#chips').innerHTML = chip('todos', 'Todos', st.items.length) + chip('agotados', 'Agotados', agot);
    $('#b-reponer').hidden = agot === 0;
  }
  async function reponerTodo() {
    const lista = st.items.filter((it) => !it.disponible);
    if (!lista.length) return;
    const ok = await dialogo('Volver todo a “Hay”', `<p class="nota">Vas a marcar ${lista.length === 1 ? '1 producto agotado' : lista.length + ' productos agotados'} como disponibles de nuevo. Es lo que se hace al empezar el día.</p>`, 'Sí, volver todo', () => true);
    if (!ok) return;
    let hechos = 0, fallas = 0;
    aviso('Actualizando…');
    for (const it of lista) {
      try { it.disponible = true; await fuente.guardarItem(it, { disponible: true }); hechos++; } catch (e) { it.disponible = false; fallas++; }
    }
    pintarCarta();
    aviso(fallas ? `Se repusieron ${hechos}; ${fallas} no se pudieron guardar.` : `Listo: ${hechos} ${hechos === 1 ? 'producto disponible' : 'productos disponibles'} de nuevo.`, !!fallas);
  }
  function itemHTML(i) {
    const it = st.items[i];
    const precio = it.precio != null
      ? `<label class="precio"><span aria-hidden="true">$</span><input type="text" inputmode="numeric" autocomplete="off" data-precio="${i}" value="${miles(it.precio)}" aria-label="Precio de ${esc(it.nombre)}"></label>`
      : '<span class="sin-precio"></span>';
    return `<div class="item${it.disponible ? '' : ' agotado'}" id="it-${i}">
      <div class="item-nombre">${esc(it.nombre)}${it.disponible ? '' : '<small>Agotado: no se puede pedir</small>'}</div>
      ${precio}
      <button class="llave" type="button" role="switch" data-llave="${i}" aria-checked="${it.disponible}" aria-label="${esc(it.nombre)}: hay"><span>${it.disponible ? 'Hay' : 'Agotado'}</span><span class="riel"></span></button>
    </div>`;
  }
  function repintarItem(i) {
    const el = document.getElementById('it-' + i);
    if (!el) return;
    el.outerHTML = itemHTML(i);
    const g = document.getElementById('it-' + i).closest('.grupo');
    const total = g.querySelectorAll('.item.agotado').length;
    const h = g.querySelector('h2');
    const small = h.querySelector('small');
    if (small) small.remove();
    if (total) h.insertAdjacentHTML('beforeend', `<small>${total} agotado${total > 1 ? 's' : ''}</small>`);
    const conFiltro = st.soloAgotados;
    pintarBarra();
    if (conFiltro && !st.soloAgotados) pintarCarta(); // ya no queda nada agotado
  }

  async function cambiarDisponible(i) {
    const it = st.items[i];
    const antes = it.disponible;
    it.disponible = !antes;
    repintarItem(i);
    try {
      await fuente.guardarItem(it, { disponible: it.disponible });
      aviso(it.disponible ? `${it.nombre}: se puede pedir de nuevo.` : `${it.nombre}: marcado como agotado.`);
    } catch (e) {
      it.disponible = antes; repintarItem(i);
      aviso('No se pudo guardar. Revisá tu conexión.', true);
    }
  }

  async function guardarPrecio(input) {
    const i = Number(input.dataset.precio);
    const it = st.items[i];
    const nuevo = Number(String(input.value).replace(/[^\d]/g, ''));
    if (nuevo === it.precio) { input.value = miles(it.precio); return; }
    if (!nuevo || nuevo > 10000000) {
      input.classList.add('mal');
      aviso('Escribí un precio válido, solo números.', true);
      setTimeout(() => { input.classList.remove('mal'); input.value = miles(it.precio); }, 1600);
      return;
    }
    input.value = miles(nuevo);
    input.classList.add('guardando');
    const antes = it.precio;
    try {
      it.precio = nuevo;
      await fuente.guardarItem(it, { precio: nuevo });
      input.classList.remove('guardando'); input.classList.add('ok');
      setTimeout(() => input.classList.remove('ok'), 1400);
      aviso(`${it.nombre}: ahora ${plata(nuevo)}.`);
    } catch (e) {
      it.precio = antes;
      input.classList.remove('guardando'); input.classList.add('mal');
      setTimeout(() => { input.classList.remove('mal'); input.value = miles(antes); }, 1600);
      aviso('No se pudo guardar el precio. Revisá tu conexión.', true);
    }
  }

  async function ajustarPorcentaje() {
    const conPrecio = st.items.filter((x) => x.precio != null);
    if (!conPrecio.length) return;
    let pct = 10;
    const ej = conPrecio[0];
    const nuevoPrecio = (p) => Math.max(100, Math.round(p * (1 + pct / 100) / 100) * 100);
    const cuerpo = `<p class="nota">Cambia todos los precios juntos y los redondea a los $100. Útil cuando aumentan los costos.</p>
      <div class="pasos-pct">${[-10, -5, 5, 10, 15, 20].map((v) => `<button type="button" data-pct="${v}" aria-pressed="${v === pct}">${v > 0 ? '+' : ''}${v}%</button>`).join('')}</div>
      <div class="campo"><label for="pct-otro">U otro porcentaje</label><input id="pct-otro" inputmode="decimal" placeholder="Ej: 12"></div>
      <p class="ejemplo" id="pct-ejemplo"></p>`;
    const pintarEj = () => { const e = document.getElementById('pct-ejemplo'); if (e) e.textContent = `Ejemplo: ${ej.nombre} pasa de ${plata(ej.precio)} a ${plata(nuevoPrecio(ej.precio))}. Se cambian ${conPrecio.length} precios.`; };
    const quitar = escuchar('#fondo-dialogo', 'click', (e) => {
      const b = e.target.closest('[data-pct]');
      if (!b) return;
      pct = Number(b.dataset.pct); $('#pct-otro').value = '';
      document.querySelectorAll('[data-pct]').forEach((x) => x.setAttribute('aria-pressed', x === b));
      pintarEj();
    });
    const quitar2 = escuchar('#fondo-dialogo', 'input', (e) => {
      if (e.target.id !== 'pct-otro') return;
      const v = Number(String(e.target.value).replace(',', '.'));
      if (v && v > -90 && v < 300) { pct = v; document.querySelectorAll('[data-pct]').forEach((x) => x.setAttribute('aria-pressed', 'false')); pintarEj(); }
    });
    const ok = await dialogo('Subir o bajar todos los precios', cuerpo, 'Cambiar precios', () => true, pintarEj);
    quitar(); quitar2();
    if (!ok) return;
    let hechos = 0, fallas = 0;
    aviso('Cambiando precios…');
    for (const it of conPrecio) {
      const nuevo = nuevoPrecio(it.precio), antes = it.precio;
      if (nuevo === antes) continue;
      try { it.precio = nuevo; await fuente.guardarItem(it, { precio: nuevo }); hechos++; } catch (e) { it.precio = antes; fallas++; }
    }
    pintarCarta();
    aviso(fallas ? `Se cambiaron ${hechos} precios; ${fallas} no se pudieron guardar.` : `Listo: ${hechos} precios actualizados.`, !!fallas);
  }

  /* ---------- Horarios ---------- */
  // Hora en formato 24 h (00:00 a 23:45, cada 15 minutos): en el celular es una lista simple, sin AM/PM.
  const HORAS = (() => { const l = []; for (let h = 0; h < 24; h++) for (let m = 0; m < 60; m += 15) l.push(String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0')); return l; })();
  function selHora(id, valor, etiqueta) {
    const lista = valor && !HORAS.includes(valor) ? HORAS.concat(valor).sort() : HORAS; // respeta una hora que venga de antes
    return `<select data-h="${id}" aria-label="${esc(etiqueta)}">${lista.map((h) => `<option value="${h}"${h === valor ? ' selected' : ''}>${h}</option>`).join('')}</select>`;
  }
  function pintarHorarios() {
    if (!st.horas) {
      st.horas = {};
      ORDEN.forEach((d) => { st.horas[d] = franjas(d).map((f) => [f.ini, f.fin]); });
    }
    $('#h-error').textContent = '';
    $('#f-horarios').innerHTML = ORDEN.map((d) => {
      const fr = st.horas[d];
      const abierto = fr.length > 0;
      return `<div class="dia${abierto ? '' : ' cerrado'}">
        <div class="dia-cab"><b>${DIAS[d]}</b>
          <button class="llave" type="button" role="switch" data-dia="${d}" aria-checked="${abierto}" aria-label="${DIAS[d]}: abre"><span>${abierto ? 'Abre' : 'Cerrado'}</span><span class="riel"></span></button>
        </div>
        ${fr.map((f, k) => `<div class="franja">
          ${selHora(`${d}-${k}-0`, f[0], `${DIAS[d]}, desde`)}
          <span>a</span>
          ${selHora(`${d}-${k}-1`, f[1], `${DIAS[d]}, hasta`)}
          ${fr.length > 1 ? `<button class="quitar" type="button" data-quitar="${d}-${k}" aria-label="Quitar este horario">×</button>` : '<span></span>'}
        </div>`).join('')}
        <div class="dia-acc">
          ${abierto && fr.length < 2 ? `<button class="agregar" type="button" data-agregar="${d}">+ Agregar otro horario</button>` : ''}
          ${abierto ? `<button class="agregar" type="button" data-copiar="${d}">Copiar a todos los días</button>` : ''}
        </div>
      </div>`;
    }).join('');
  }
  async function guardarHorarios(e) {
    e.preventDefault();
    const err = $('#h-error');
    err.textContent = '';
    const salida = {};
    for (const d of ORDEN) {
      const lista = [];
      for (const f of st.horas[d]) {
        if (!/^\d{2}:\d{2}$/.test(f[0]) || !/^\d{2}:\d{2}$/.test(f[1])) { err.textContent = `Completá los horarios del ${DIAS[d].toLowerCase()}.`; return; }
        if (f[0] === f[1]) { err.textContent = `El ${DIAS[d].toLowerCase()} abre y cierra a la misma hora.`; return; }
        lista.push(f[0] + '-' + f[1]);
      }
      salida[d] = lista;
    }
    const b = $('#h-guardar');
    b.disabled = true;
    try {
      await fuente.guardarLocal({ horarios: salida });
      st.horas = null;
      pintarEstado(); pintarHorarios();
      aviso('Horarios guardados.');
    } catch (ex) { err.textContent = 'No se pudieron guardar. Revisá tu conexión y probá de nuevo.'; }
    finally { b.disabled = false; }
  }

  /* =====================================================================
     PEDIDOS Y CLIENTES
     ---------------------------------------------------------------------
     Cada pedido que se manda desde la tienda queda anotado ANTES de abrir
     WhatsApp. Acá el dueño lo confirma y lo marca entregado, ve sus números
     del mes y su lista de clientes con la tarjeta de sellos del club.
     - Demo: los pedidos de la tienda de demo hechos en este celular, más un
       historial de ejemplo para que se vea cómo queda con un mes de uso.
     - Local real: la tabla `pedidos` de la base (supabase/pedidos_clientes.sql).
     ===================================================================== */
  const ESTADOS = { nuevo: 'Nuevo', confirmado: 'En preparación', entregado: 'Entregado', cancelado: 'Cancelado' };
  const ORIGENES = { qr: 'QR del local', ig: 'Instagram', instagram: 'Instagram', wa: 'WhatsApp', whatsapp: 'WhatsApp', amigo: 'Invitado por un amigo', google: 'Google', fb: 'Facebook', facebook: 'Facebook', tiktok: 'TikTok', tt: 'TikTok', ads: 'Publicidad (Meta Ads)', meta: 'Publicidad (Meta Ads)', directo: 'Link directo' };
  const COMISION_APP = 25; // % que cobra una app de delivery, para la cuenta de "lo que no pagaste" (las apps cobran 25 a 35%)
  const DIA_MS = 86400000;
  const cuenta = (p) => p.estado === 'confirmado' || p.estado === 'entregado'; // lo que suma en los números
  const hace = (iso) => {
    const m = Math.round((Date.now() - new Date(iso)) / 60000);
    if (m < 1) return 'recién';
    if (m < 60) return `hace ${m} min`;
    const h = Math.round(m / 60);
    if (h < 24) return `hace ${h} h`;
    const d = Math.round(h / 24);
    return d === 1 ? 'ayer' : `hace ${d} días`;
  };
  const horaAR = (iso) => new Date(new Date(iso).getTime() - 3 * 3600000).toISOString().slice(11, 16);
  const diaAR = (iso) => new Date(new Date(iso).getTime() - 3 * 3600000).toISOString().slice(0, 10);
  const telWa = (t) => { const d = String(t || '').replace(/\D/g, ''); if (d.length < 8) return ''; return d.startsWith('54') ? d : '549' + d.replace(/^0/, '').replace(/^(\d{2,4})15/, '$1'); };
  const urlTienda = () => { try { return new URL(st.negocio.tienda, location.href).href.split('?')[0]; } catch (e) { return ''; } };
  const tituloBase = () => 'Panel · ' + (st.negocio ? st.negocio.nombre : '');
  st.pedidos = []; st.ventas = false; st.club = null; st.suc = ''; st.filtroPed = 'curso'; st.filtroCli = 'todos'; st.buscaCli = ''; st.vistos = null; st.sinVer = 0;

  /* ---------- Demo: pedidos guardados en este celular + historial de ejemplo ---------- */
  const CLAVE_PED = () => 'sa-pedidos-demo:' + DEMOS[DEMO];
  const CLAVE_EJ = () => 'sa-pedidos-demo-ejemplo2:' + DEMOS[DEMO];
  const CLAVE_EST = () => 'sa-pedidos-demo-estados:' + DEMOS[DEMO];
  // Un mes de pedidos de ejemplo armado con la carta del local (siempre el mismo para cada demo)
  function ejemploDemo(L) {
    let semilla = 0; String(DEMOS[DEMO]).split('').forEach((c) => { semilla = (semilla * 31 + c.charCodeAt(0)) >>> 0; });
    const azar = () => { semilla = (semilla * 1664525 + 1013904223) >>> 0; return semilla / 4294967296; };
    const uno = (l) => l[Math.floor(azar() * l.length)];
    const prods = [];
    (L.categorias || []).forEach((c) => (c.productos || []).forEach((p) => { if (p.precio > 0 && !p.soloRetiro) prods.push(p); }));
    if (!prods.length) return [];
    const zonas = (L.entrega && L.entrega.zonas) || [].concat(...(L.sucursales || []).map((s) => (s.entrega && s.entrega.zonas) || []));
    const sucs = L.sucursales || [];
    const sucDeZona = (z) => sucs.find((s) => ((s.entrega && s.entrega.zonas) || []).some((x) => x.nombre === z.nombre));
    const bajadas = ['Bajada 14 · Balneario Sol', 'Bajada 32 · Parador Mareas', 'Bajada 5 · Balneario Los Pinos', 'Bajada 21 · Balneario Delfín', 'Bajada 9 · Parador del Sur'];
    const calles = ['Calle 3 N° 1250', 'Av. Costanera 480', 'Calle 52 N° 336', 'Calle 7 N° 910', 'Calle 38 N° 145', 'Calle 1 N° 2210'];
    const gente = [['Juli', 6], ['Martín', 4], ['Caro', 4], ['Nico', 3], ['Flor', 3], ['Seba', 2], ['Lu', 2], ['Agus', 2], ['Ramiro', 2], ['Vale', 1], ['Tomi', 1], ['Sofi', 1], ['Diego', 1], ['Meli', 1]];
    const codigos = gente.map((g, i) => 'EJ' + String(1000 + i * 37).slice(-4));
    const lista = [];
    gente.forEach(([nombre, veces], gi) => {
      const tel = '22571' + String(50000 + gi * 731).slice(-5);
      for (let k = 0; k < veces; k++) {
        let dias = Math.floor(azar() * 27) + 1;
        if (nombre === 'Ramiro') dias = 36 + k * 9; // uno que no pide hace más de un mes: para el "te extrañamos"
        if ((nombre === 'Juli' || nombre === 'Martín') && k === 0) dias = 0; // dos pedidos de hoy: uno en preparación y otro entregado
        const hora = 12 + Math.floor(azar() * 11), min = uno([0, 10, 20, 30, 40, 50]);
        const d = new Date(Date.now() - dias * DIA_MS);
        let creado = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), hora + 3, min)).toISOString();
        if (dias === 0) creado = new Date(Date.now() - (nombre === 'Juli' ? 25 : 150) * 60000).toISOString();
        if (new Date(creado) > new Date()) continue;
        const items = [];
        const n = 1 + Math.floor(azar() * 2);
        for (let j = 0; j < n; j++) { const p = uno(prods), c = 1 + Math.floor(azar() * 2); items.push({ n: p.nombre, c, d: '', t: p.precio * c }); }
        const hoyJuli = nombre === 'Juli' && dias === 0;
        const esDel = zonas.length && (hoyJuli || azar() < 0.75), z = esDel ? uno(zonas) : null;
        const suc = z ? (sucDeZona(z) || uno(sucs) || {}) : (uno(sucs) || {});
        const playa = esDel && (hoyJuli || azar() < 0.2);
        const dir = !esDel ? '' : playa ? '🏖️ Playa: ' + uno(bajadas) + ' (' + uno(['sombrilla roja', 'carpa azul', 'cerca del mar', 'toalla amarilla']) + ')' + (azar() < 0.6 ? ' · https://maps.google.com/?q=-36.54,-56.70' : '') : uno(calles);
        const origen = nombre === 'Vale' || nombre === 'Tomi' ? 'amigo' : uno(['ig', 'ig', 'ig', 'qr', 'qr', 'wa', 'wa', 'directo']);
        lista.push({
          ejemplo: true, codigo: `EJ-${String(lista.length + 101)}`, creado, estado: dias === 0 && nombre === 'Juli' ? 'confirmado' : (azar() < 0.04 ? 'cancelado' : 'entregado'),
          nombre, tel, modo: esDel ? 'delivery' : 'retiro', zona: z ? z.nombre : '', direccion: dir, sucursal: suc.nombre || '', items,
          total: items.reduce((s, x) => s + x.t, 0) + (z ? z.costo || 0 : 0), pago: uno(['Efectivo', 'Transferencia', 'Mercado Pago']),
          origen, amigo: origen === 'amigo' ? codigos[0] : '', cliente: codigos[gi]
        });
      }
    });
    return lista;
  }
  function pedidosDemo() {
    let ej = leerLS(CLAVE_EJ());
    if (!Array.isArray(ej)) { ej = ejemploDemo(window.LOCAL || {}); guardarLS(CLAVE_EJ(), ej); }
    const propios = (leerLS(CLAVE_PED()) || []).filter((p) => p && typeof p.codigo === 'string');
    const est = leerLS(CLAVE_EST()) || {};
    return propios.concat(ej).map((p) => Object.assign({}, p, est[p.codigo] ? { estado: est[p.codigo] } : {}))
      .sort((a, b) => new Date(b.creado) - new Date(a.creado));
  }
  Object.assign(DEMO_FUENTE, {
    async pedidos() { return pedidosDemo(); },
    async cambiarEstado(p, estado) { const est = leerLS(CLAVE_EST()) || {}; est[p.codigo] = estado; guardarLS(CLAVE_EST(), est); }
  });

  /* ---------- Local real: la tabla pedidos (si todavía no existe, estas pestañas no aparecen) ---------- */
  Object.assign(BASE, {
    async pedidos() {
      const desde = new Date(Date.now() - 120 * DIA_MS).toISOString();
      return api(`pedidos?select=id,codigo,creado,estado,nombre,tel,modo,zona,direccion,sucursal,items,total,pago,hora,nota,origen,amigo,cliente&negocio_id=eq.${st.negocio.id}&creado=gte.${desde}&order=creado.desc&limit=2000`);
    },
    async cambiarEstado(p, estado) {
      const r = await api(`pedidos?id=eq.${p.id}&negocio_id=eq.${st.negocio.id}`, { method: 'PATCH', body: { estado } });
      if (!r || !r.length) throw new Error('sin permiso');
    },
    async club() {
      const f = await api(`pedidos_local?select=club&negocio_id=eq.${st.negocio.id}`);
      return (f && f[0] && f[0].club) || null;
    }
  });

  // Se llama al abrir el panel: si hay pedidos para mostrar, aparecen las pestañas Pedidos y Clientes
  async function iniciarVentas() {
    try {
      st.pedidos = await fuente.pedidos();
      st.ventas = true;
      st.club = DEMO ? ((window.LOCAL || {}).club || null) : await BASE.club().catch(() => null);
      if (st.club) st.club = Object.assign({ meta: 5, premio: 'un regalo', amigo: 10 }, st.club);
    } catch (e) { st.ventas = false; }
    document.querySelectorAll('[data-ventas]').forEach((a) => { a.hidden = !st.ventas; });
    st.vistos = new Set(st.pedidos.map((p) => p.codigo));
    // Recién llegado desde la tienda de demo: el pedido que acaba de hacer, resaltado
    const recien = st.pedidos.find((p) => !p.ejemplo && p.estado === 'nuevo' && Date.now() - new Date(p.creado) < 10 * 60000);
    if (recien) { st.resaltado = recien.codigo; alertaPedido(recien, false); }
  }
  async function recargarPedidos(silencioso) {
    if (!st.ventas) return;
    let lista;
    try { lista = await fuente.pedidos(); } catch (e) { return; }
    const nuevos = lista.filter((p) => !st.vistos.has(p.codigo) && p.estado === 'nuevo');
    st.pedidos = lista;
    lista.forEach((p) => st.vistos.add(p.codigo));
    if (nuevos.length && !silencioso) { st.resaltado = nuevos[0].codigo; alertaPedido(nuevos[0], true); }
    pintarVentas();
  }

  /* ---------- Aviso de pedido nuevo: cartel, sonido y vibración ---------- */
  let audio = null;
  function sonar() {
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume();
      [0, 0.18, 0.36].forEach((t, i) => {
        const o = audio.createOscillator(), g = audio.createGain();
        o.type = 'sine'; o.frequency.value = [880, 1175, 1568][i];
        g.gain.setValueAtTime(0.0001, audio.currentTime + t);
        g.gain.exponentialRampToValueAtTime(0.35, audio.currentTime + t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + t + 0.16);
        o.connect(g).connect(audio.destination); o.start(audio.currentTime + t); o.stop(audio.currentTime + t + 0.18);
      });
    } catch (e) { /* sin sonido */ }
    try { if (navigator.vibrate) navigator.vibrate([200, 100, 200]); } catch (e) { /* sin vibración */ }
  }
  let tAlerta = null;
  function alertaPedido(p, conSonido) {
    if (conSonido) sonar();
    st.sinVer = (location.hash === '#pedidos' && !document.hidden) ? 0 : st.sinVer + 1;
    const a = $('#alerta-pedido');
    a.innerHTML = `<b>Entró un pedido nuevo</b><span>${esc(p.nombre || 'Cliente')} · ${plata(p.total)} · ${p.modo === 'delivery' ? 'Delivery' : 'Retira'}</span><a href="#pedidos">Ver</a>`;
    a.hidden = false;
    clearTimeout(tAlerta); tAlerta = setTimeout(() => { a.hidden = true; }, 9000);
    pintarBurbuja();
  }
  function pintarBurbuja() {
    const b = $('#burbuja'), n = st.pedidos.filter((p) => p.estado === 'nuevo').length;
    b.hidden = !n; b.textContent = n;
    document.title = (n ? `(${n}) ` : '') + tituloBase();
  }

  /* ---------- Sucursales: cada una ve lo suyo, el dueño ve todo ---------- */
  const sucursalesDe = () => (window.LOCAL && window.LOCAL.sucursales) || [];
  const cortoSuc = (n) => String(n || '').replace(/^Sucursal\s+/i, '');
  const pedidosVis = () => (st.suc ? st.pedidos.filter((p) => p.sucursal === st.suc) : st.pedidos);
  function pintarChipsSuc() {
    const el = $('#chips-suc'); if (!el) return;
    const l = sucursalesDe();
    if (l.length < 2) { el.innerHTML = ''; el.hidden = true; return; }
    el.hidden = false;
    el.innerHTML = `<button class="chip" type="button" data-fsuc="" aria-pressed="${!st.suc}">Todas</button>` + l.map((x) => `<button class="chip" type="button" data-fsuc="${esc(x.nombre)}" aria-pressed="${st.suc === x.nombre}">${esc(cortoSuc(x.nombre))}</button>`).join('');
  }

  /* ---------- Números ---------- */
  function numerosHTML() {
    const ahora = Date.now(), hoy = diaAR(new Date().toISOString());
    const vis = pedidosVis();
    const mes = vis.filter((p) => cuenta(p) && ahora - new Date(p.creado) < 30 * DIA_MS);
    const deHoy = vis.filter((p) => p.estado !== 'cancelado' && diaAR(p.creado) === hoy);
    const plataMes = mes.reduce((s, p) => s + (p.total || 0), 0);
    const clientes = new Map();
    mes.forEach((p) => { const k = claveCliente(p); clientes.set(k, (clientes.get(k) || 0) + 1); });
    const volvieron = Array.from(clientes.values()).filter((n) => n > 1).length;
    const origen = {};
    mes.forEach((p) => { const o = ORIGENES[p.origen] || ORIGENES.directo; origen[o] = (origen[o] || 0) + 1; });
    const filas = Object.entries(origen).sort((a, b) => b[1] - a[1]);
    const max = filas.length ? filas[0][1] : 1;
    return `
      <div class="num"><span>Hoy</span><b>${plata(deHoy.reduce((s, p) => s + (p.total || 0), 0))}</b><small>${deHoy.length} ${deHoy.length === 1 ? 'pedido' : 'pedidos'}</small></div>
      <div class="num"><span>Últimos 30 días</span><b>${plata(plataMes)}</b><small>${mes.length} ${mes.length === 1 ? 'pedido' : 'pedidos'}</small></div>
      <div class="num destacado"><span>Comisión que no pagaste</span><b>${plata(plataMes * COMISION_APP / 100)}</b><small>Lo que se habría llevado una app que cobra ${COMISION_APP}%</small></div>
      <div class="num"><span>Clientes que volvieron</span><b>${volvieron} de ${clientes.size}</b><small>pidieron más de una vez en 30 días</small></div>
      ${sucTarjeta(mes)}
      ${filas.length ? `<div class="num ancho graf"><span>Por dónde llegan</span>
        <div class="barras">${filas.map(([o, n]) => `<div class="barra-fila"><em>${esc(o)}</em><i data-w="${Math.max(6, Math.round(n / max * 100))}"></i><b>${n}</b></div>`).join('')}</div></div>` : ''}`;
  }

  function sucTarjeta(mes) {
    if (st.suc || sucursalesDe().length < 2) return '';
    const cuenta = {}; mes.forEach((p) => { if (p.sucursal) { const o = cuenta[p.sucursal] || (cuenta[p.sucursal] = { n: 0, t: 0 }); o.n += 1; o.t += p.total || 0; } });
    const filas = Object.entries(cuenta).sort((a, b) => b[1].t - a[1].t);
    if (!filas.length) return '';
    const max = filas[0][1].t || 1;
    return `<div class="num ancho graf"><span>Ventas por sucursal (30 días)</span>
        <div class="barras barras-suc">${filas.map(([n, o]) => `<div class="barra-fila"><em>${esc(cortoSuc(n))}</em><i data-w="${Math.max(6, Math.round(o.t / max * 100))}"></i><b>${plata(o.t)}</b></div>`).join('')}</div></div>`;
  }

  /* ---------- Lista de pedidos ---------- */
  function pintarPedidos() {
    pintarChipsSuc();
    $('#numeros').innerHTML = numerosHTML();
    document.querySelectorAll('#numeros [data-w]').forEach((i) => { i.style.width = i.dataset.w + '%'; }); // por JS: la seguridad del panel no deja estilos escritos en el HTML
    const enCurso = pedidosVis().filter((p) => p.estado === 'nuevo' || p.estado === 'confirmado');
    const hoy = diaAR(new Date().toISOString());
    const deHoy = pedidosVis().filter((p) => diaAR(p.creado) === hoy);
    const chip = (k, txt, n) => `<button class="chip" type="button" data-fped="${k}" aria-pressed="${st.filtroPed === k}">${txt} <b>${n}</b></button>`;
    $('#chips-pedidos').innerHTML = chip('curso', 'En curso', enCurso.length) + chip('hoy', 'Hoy', deHoy.length) + chip('todos', 'Todos', pedidosVis().length);
    const lista = st.filtroPed === 'curso' ? enCurso : st.filtroPed === 'hoy' ? deHoy : pedidosVis().slice(0, 80);
    $('#lista-pedidos').innerHTML = lista.length ? lista.map(pedidoHTML).join('')
      : `<p class="vacio">${st.filtroPed === 'curso' ? 'No hay pedidos en curso. Cuando un cliente mande uno desde tu tienda, aparece acá con un aviso.' : 'Todavía no hay pedidos.'}</p>`;
    pintarBurbuja();
  }
  function dondeHTML(p) {
    const hora = p.hora ? ` · para las ${esc(String(p.hora).split(' ').pop())}` : '';
    if (p.modo !== 'delivery') return `<p class="pedido-donde">🏪 Retira en ${p.sucursal ? esc(p.sucursal) : 'el local'}${hora}</p>`;
    const m = String(p.direccion || '').match(/^(.*?)(?: · (https:\/\/maps\.google\.com\/\?q=[-\d.,]+))?$/);
    const dir = m ? m[1] : (p.direccion || ''), mapa = m && m[2];
    const playa = dir.indexOf('🏖️') === 0;
    return `<p class="pedido-donde">${playa ? '<span class="tag-playa">🏖️ Playa</span> ' : '🛵 '}Delivery a ${esc(p.zona)}${dir ? ` · ${esc(playa ? dir.replace(/^🏖️\s*Playa:\s*/, '') : dir)}` : ''}${mapa ? ` · <a class="ver-mapa" href="${esc(mapa)}" target="_blank" rel="noopener">Ver en el mapa</a>` : ''}${hora}</p>${p.sucursal ? `<p class="pedido-suc">Lo prepara: ${esc(p.sucursal)}</p>` : ''}`;
  }
  function pedidoHTML(p) {
    const i = st.pedidos.indexOf(p);
    const acc = p.estado === 'nuevo'
      ? `<button class="btn chico" type="button" data-estado="${i}:confirmado">Confirmar</button><button class="btn btn-linea chico" type="button" data-estado="${i}:cancelado">Cancelar</button>`
      : p.estado === 'confirmado'
        ? `<button class="btn chico btn-ok" type="button" data-estado="${i}:entregado">${p.modo === 'delivery' ? 'Entregado' : 'Lo retiró'}</button><button class="btn btn-linea chico" type="button" data-estado="${i}:cancelado">Cancelar</button>`
        : '';
    const wa = telWa(p.tel);
    return `<article class="pedido ${p.estado}${st.resaltado === p.codigo ? ' resaltado' : ''}">
      <header><div><b>${esc(p.nombre || 'Cliente')}</b><small>${esc(p.codigo)} · ${horaAR(p.creado)} · ${hace(p.creado)}</small></div><span class="est ${p.estado}">${ESTADOS[p.estado] || esc(p.estado)}</span></header>
      ${dondeHTML(p)}
      <ul class="pedido-items">${(p.items || []).map((x) => `<li><span>${x.c}× ${esc(x.n)}${x.d ? `<small>${esc(x.d)}</small>` : ''}</span><b>${plata(x.t)}</b></li>`).join('')}</ul>
      ${p.nota ? `<p class="pedido-nota">📝 ${esc(p.nota)}</p>` : ''}
      <p class="pedido-total"><span>${esc(p.pago || '')}${p.origen && p.origen !== 'directo' ? ` · <em class="origen">${esc(ORIGENES[p.origen] || p.origen)}</em>` : ''}</span><b>${plata(p.total)}</b></p>
      <div class="pedido-acc">${acc}${wa ? `<button class="btn btn-linea chico" type="button" data-wa-pedido="${i}">WhatsApp</button>` : ''}</div>
    </article>`;
  }
  async function cambiarEstado(i, estado) {
    const p = st.pedidos[i];
    if (!p) return;
    if (estado === 'cancelado' && !(await dialogo('Cancelar pedido', `<p class="nota">¿Cancelás el pedido de ${esc(p.nombre || 'este cliente')}? No va a sumar en tus números ni en sus sellos.</p>`, 'Sí, cancelar', () => true))) return;
    const antes = p.estado;
    p.estado = estado;
    if (st.resaltado === p.codigo) st.resaltado = null;
    pintarVentas();
    try {
      await fuente.cambiarEstado(p, estado);
      aviso(estado === 'confirmado' ? 'Confirmado. Avisale al cliente por WhatsApp si hace falta.' : estado === 'entregado' ? 'Listo: pedido entregado. Sumó un sello a su tarjeta.' : 'Pedido cancelado.');
    } catch (e) { p.estado = antes; pintarVentas(); aviso('No se pudo guardar. Revisá tu conexión.', true); }
  }

  /* ---------- Clientes y club ---------- */
  function claveCliente(p) { const t = String(p.tel || '').replace(/\D/g, ''); return t.length >= 8 ? 't:' + t.slice(-8) : 'n:' + normal(p.nombre); }
  function armarClientes() {
    const mapa = new Map();
    st.pedidos.slice().reverse().forEach((p) => { // del más viejo al más nuevo
      if (!cuenta(p)) return;
      const k = claveCliente(p);
      let c = mapa.get(k);
      if (!c) { c = { k, nombre: p.nombre, tel: p.tel, pedidos: 0, gastado: 0, primero: p.creado, ultimo: p.creado, codigos: new Set(), vinoPorAmigo: !!p.amigo, ejemplo: !!p.ejemplo }; mapa.set(k, c); }
      c.nombre = p.nombre || c.nombre; c.tel = p.tel || c.tel; c.pedidos++; c.gastado += p.total || 0; c.ultimo = p.creado;
      if (p.cliente) c.codigos.add(p.cliente);
    });
    const lista = Array.from(mapa.values());
    // Cuántos amigos trajo cada uno: clientes cuyo primer pedido vino con su código
    const primeros = st.pedidos.filter((p) => cuenta(p) && p.amigo);
    lista.forEach((c) => { c.amigos = new Set(primeros.filter((p) => c.codigos.has(p.amigo)).map(claveCliente)).size; });
    const meta = st.club ? st.club.meta : 0;
    lista.forEach((c) => {
      c.dias = Math.floor((Date.now() - new Date(c.ultimo)) / DIA_MS);
      c.sellos = meta ? c.pedidos % meta : 0;
      c.premio = meta && c.pedidos > 0 && c.sellos === 0;
      c.casi = meta && c.sellos === meta - 1;
    });
    return lista.sort((a, b) => new Date(b.ultimo) - new Date(a.ultimo));
  }
  function pintarClientes() {
    const todos = armarClientes();
    const extr = todos.filter((c) => c.dias >= 30), prem = todos.filter((c) => c.premio || c.casi), amig = todos.filter((c) => c.amigos || c.vinoPorAmigo);
    const volvieron = todos.filter((c) => c.pedidos > 1).length;
    $('#numeros-clientes').innerHTML = `
      <div class="num"><span>Clientes</span><b>${todos.length}</b><small>con al menos un pedido</small></div>
      <div class="num"><span>Volvieron a pedir</span><b>${todos.length ? Math.round(volvieron / todos.length * 100) : 0}%</b><small>${volvieron} pidieron más de una vez</small></div>
      <div class="num"><span>Llegaron por un amigo</span><b>${todos.filter((c) => c.vinoPorAmigo).length}</b><small>con el link de otro cliente</small></div>
      <div class="num destacado"><span>Para recuperar</span><b>${extr.length}</b><small>no piden hace más de 30 días</small></div>`;
    $('#club-info').innerHTML = st.club
      ? `<p><b>Tu club:</b> a los ${st.club.meta} pedidos, ${esc(st.club.premio)}.${st.club.amigo ? ` Quien llega invitado por un cliente tiene ${st.club.amigo}% menos en su primer pedido.` : ''}</p>
         <button class="btn btn-linea chico" type="button" id="b-difusion">Armar una promo para tu lista de WhatsApp</button>`
      : `<p>Tu club de sellos todavía no está activado. Escribinos y lo dejamos listo.</p>`;
    const chip = (k, txt, n) => `<button class="chip" type="button" data-fcli="${k}" aria-pressed="${st.filtroCli === k}">${txt} <b>${n}</b></button>`;
    $('#chips-clientes').innerHTML = chip('todos', 'Todos', todos.length) + chip('extranamos', 'Para recuperar', extr.length) + (st.club ? chip('premio', 'Cerca del premio', prem.length) : '') + chip('amigos', 'Amigos', amig.length);
    const f = normal(st.buscaCli);
    let lista = st.filtroCli === 'extranamos' ? extr : st.filtroCli === 'premio' ? prem : st.filtroCli === 'amigos' ? amig : todos;
    if (f) lista = lista.filter((c) => normal(c.nombre).includes(f) || String(c.tel || '').includes(f.replace(/\D/g, '') || '¬'));
    st.listaCli = lista;
    $('#lista-clientes').innerHTML = lista.length ? lista.map((c, i) => clienteHTML(c, i)).join('')
      : `<p class="vacio">${todos.length ? 'No hay clientes en esta lista.' : 'Cuando entren pedidos, acá vas a ver a cada cliente, cuántas veces pidió y su tarjeta de sellos.'}</p>`;
  }
  function clienteHTML(c, i) {
    const meta = st.club ? st.club.meta : 0;
    const etiquetas = [];
    if (c.pedidos === 1) etiquetas.push('<span class="tag">Nuevo</span>');
    if (c.dias >= 30) etiquetas.push(`<span class="tag mal">Hace ${c.dias} días</span>`);
    if (c.premio) etiquetas.push('<span class="tag ok">¡Ganó el premio!</span>');
    else if (c.casi) etiquetas.push('<span class="tag ok">Le falta 1</span>');
    if (c.amigos) etiquetas.push(`<span class="tag azul">Trajo ${c.amigos} ${c.amigos === 1 ? 'amigo' : 'amigos'}</span>`);
    if (c.vinoPorAmigo) etiquetas.push('<span class="tag azul">Vino por un amigo</span>');
    return `<article class="cliente">
      <div class="cliente-txt"><b>${esc(c.nombre || 'Cliente')}</b>
        <small>${c.pedidos} ${c.pedidos === 1 ? 'pedido' : 'pedidos'} · ${plata(c.gastado)} · último ${hace(c.ultimo)}</small>
        ${etiquetas.length ? `<div class="tags">${etiquetas.join('')}</div>` : ''}
      </div>
      ${meta ? `<div class="sellos" aria-label="${c.premio ? meta : c.sellos} de ${meta} sellos">${Array.from({ length: meta }, (_, k) => `<i class="${k < (c.premio ? meta : c.sellos) ? 'on' : ''}"></i>`).join('')}</div>` : ''}
      ${telWa(c.tel) ? `<button class="btn btn-linea chico" type="button" data-escribir="${i}">Escribirle</button>` : ''}
    </article>`;
  }
  function mensajeCliente(c) {
    const n = (c.nombre || '').split(' ')[0] || '', local = st.negocio.nombre, link = urlTienda();
    if (c.dias >= 30) return `¡Hola ${n}! Hace mucho que no te vemos por ${local} 😊 Si pedís esta semana, respondé este mensaje y te hacemos 10% menos. Pedí acá: ${link}`;
    if (c.premio && st.club) return `¡Hola ${n}! Completaste tu tarjeta del club de ${local}: tu próximo pedido tiene ${st.club.premio} 🎁 Pedí acá: ${link}`;
    if (c.casi && st.club) return `¡Hola ${n}! Te falta 1 pedido para ${st.club.premio} en ${local} 🎁 Pedí acá: ${link}`;
    return `¡Hola ${n}! Gracias por pedirnos en ${local} 🙌 Cuando quieras, pedí acá: ${link}`;
  }
  async function escribirCliente(i) {
    const c = (st.listaCli || [])[i];
    if (!c) return;
    const cuerpo = `<p class="nota">Se abre WhatsApp con este mensaje para ${esc(c.nombre)}. Podés cambiarlo antes de mandarlo.</p>
      <div class="campo"><label for="msj-cliente">Mensaje</label><textarea id="msj-cliente" rows="5" maxlength="600">${esc(mensajeCliente(c))}</textarea></div>`;
    const txt = await dialogo('Escribirle por WhatsApp', cuerpo, 'Abrir WhatsApp', () => $('#msj-cliente').value.trim() || false);
    if (!txt) return;
    if (c.ejemplo) { aviso(`En tu local se abre WhatsApp con este mensaje para ${c.nombre}.`); return; }
    window.open(`https://api.whatsapp.com/send?phone=${telWa(c.tel)}&text=${encodeURIComponent(txt)}`, '_blank', 'noopener');
  }
  function escribirPorPedido(i) {
    const p = st.pedidos[i];
    if (!p) return;
    const n = (p.nombre || '').split(' ')[0] || '';
    const txt = p.estado === 'nuevo' || p.estado === 'confirmado'
      ? `¡Hola ${n}! Recibimos tu pedido ${p.codigo} en ${st.negocio.nombre}. ${p.modo === 'delivery' ? 'Ya lo estamos preparando y te avisamos cuando sale.' : 'Te avisamos cuando esté listo para retirar.'}`
      : `¡Hola ${n}! Te escribimos de ${st.negocio.nombre} por tu pedido ${p.codigo}.`;
    if (p.ejemplo) { aviso('En tu local se abre WhatsApp con el cliente y un mensaje listo.'); return; }
    window.open(`https://api.whatsapp.com/send?phone=${telWa(p.tel)}&text=${encodeURIComponent(txt)}`, '_blank', 'noopener');
  }
  async function armarDifusion() {
    const conTel = armarClientes().filter((c) => telWa(c.tel)).length;
    const base = `📣 Hoy en ${st.negocio.nombre}: [escribí acá tu promo, por ejemplo 2x1 en tal cosa hasta las 21].\nPedí desde acá y te llega a casa 👉 ${urlTienda()}`;
    const cuerpo = `<p class="nota">Escribí la promo, copiala y pegala en tu <b>lista de difusión</b> de WhatsApp. Le llega a cada cliente que te tiene agendado, como un mensaje normal. Tenés ${conTel} ${conTel === 1 ? 'cliente' : 'clientes'} con celular en tu lista.</p>
      <div class="campo"><label for="msj-difusion">Promo</label><textarea id="msj-difusion" rows="5" maxlength="600">${esc(base)}</textarea></div>`;
    const txt = await dialogo('Promo para tu lista', cuerpo, 'Copiar el mensaje', () => $('#msj-difusion').value.trim() || false);
    if (!txt) return;
    try { await navigator.clipboard.writeText(txt); aviso('Copiado. Pegalo en tu lista de difusión de WhatsApp.'); } catch (e) { aviso('No se pudo copiar: seleccioná el texto y copialo a mano.', true); }
  }

  function pintarVentas() {
    if (!st.ventas) return;
    if (!$('#p-pedidos').hidden) pintarPedidos();
    if (!$('#p-clientes').hidden) pintarClientes();
    pintarBurbuja();
  }
  // Pedidos nuevos: en la demo llegan por el almacenamiento del celular; en un local real, se consulta cada 30 segundos
  window.addEventListener('storage', (e) => { if (DEMO && e.key === CLAVE_PED()) recargarPedidos(false); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && !$('#v-app').hidden) recargarPedidos(false); });
  setInterval(() => { if (!DEMO && !document.hidden && !$('#v-app').hidden) recargarPedidos(false); }, 30000);
  setInterval(() => { if (!$('#v-app').hidden && !cerrarDlg) pintarVentas(); }, 60000); // "hace 3 min" se actualiza solo

  /* ---------- Diálogo y avisos ---------- */
  let cerrarDlg = null;
  function dialogo(titulo, cuerpo, textoSi, valor, alAbrir) {
    return new Promise((ok) => {
      $('#dlg-titulo').textContent = titulo;
      $('#dlg-cuerpo').innerHTML = cuerpo;
      $('#dlg-si').textContent = textoSi || 'Listo';
      $('#fondo-dialogo').hidden = false;
      if (alAbrir) alAbrir();
      const otro = document.getElementById('msj-otro-campo');
      const alCambiar = (e) => { if (otro && e.target.name === 'msj') { otro.hidden = e.target.value !== 'otro'; if (!otro.hidden) $('#msj-otro').focus(); } };
      $('#dlg-cuerpo').addEventListener('change', alCambiar);
      cerrarDlg = (si) => {
        if (si) { const v = valor(); if (v === false) return; ok(v); } else ok(null);
        $('#dlg-cuerpo').removeEventListener('change', alCambiar);
        $('#fondo-dialogo').hidden = true; cerrarDlg = null;
      };
      $('#dlg-si').focus();
    });
  }
  function escuchar(sel, tipo, fn) { const el = $(sel); el.addEventListener(tipo, fn); return () => el.removeEventListener(tipo, fn); }
  let tAviso = null;
  function aviso(txt, mal) {
    const a = $('#aviso');
    a.textContent = txt; a.className = 'aviso' + (mal ? ' mal' : ''); a.hidden = false;
    clearTimeout(tAviso); tAviso = setTimeout(() => { a.hidden = true; }, 2600);
  }

  /* ---------- Entrar, recuperar y contraseña ---------- */
  async function enviarEntrar(e) {
    e.preventDefault();
    const mail = $('#e-mail').value.trim(), clave = $('#e-clave').value, err = $('#e-error');
    err.textContent = '';
    if (!/^\S+@\S+\.\S+$/.test(mail)) { err.textContent = 'Revisá el mail.'; return; }
    if (clave.length < 8) { err.textContent = 'La contraseña tiene al menos 8 caracteres.'; return; }
    const b = $('#e-boton');
    b.disabled = true;
    try {
      fijarSesion(await auth('token?grant_type=password', { email: mail, password: clave }));
      await iniciar();
    } catch (ex) {
      const c = ex.message || '';
      err.textContent = /invalid_credentials|Invalid login/i.test(c) ? 'Mail o contraseña incorrectos.'
        : /email_not_confirmed/i.test(c) ? 'Todavía no confirmaste el mail. Buscá el mensaje en tu correo.'
        : ex.status === 429 ? 'Probaste muchas veces seguidas. Esperá unos minutos.'
        : 'No pudimos entrar. Revisá tu conexión y probá de nuevo.';
    } finally { b.disabled = false; }
  }
  async function enviarRecuperar(e) {
    e.preventDefault();
    const mail = $('#rp-mail').value.trim(), err = $('#rp-error');
    err.textContent = '';
    if (!/^\S+@\S+\.\S+$/.test(mail)) { err.textContent = 'Revisá el mail.'; return; }
    const b = $('#rp-boton');
    b.disabled = true;
    try {
      const r = await fetch(`${C.url}/auth/v1/recover?redirect_to=${encodeURIComponent(location.origin + location.pathname)}`, {
        method: 'POST', headers: { apikey: C.clave, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: mail })
      });
      if (r.status === 429) { err.textContent = 'Pediste varios links seguidos. Esperá unos minutos.'; return; }
      if (r.status >= 500) { err.textContent = 'No pudimos mandar el mail ahora. Probá de nuevo en un rato.'; return; }
      $('#f-recuperar').hidden = true; $('#rp-listo').hidden = false; // mismo mensaje siempre: no decimos si el mail tiene cuenta
    } catch (ex) { err.textContent = 'No hay conexión. Revisá internet y probá de nuevo.'; }
    finally { b.disabled = false; }
  }
  let modoClave = 'nueva';
  function mostrarClave(modo) {
    modoClave = modo;
    $('#cl-titulo').textContent = modo === 'invitacion' ? '¡Bienvenido a tu panel!' : modo === 'cambiar' ? 'Cambiar contraseña' : 'Contraseña nueva';
    $('#cl-nueva').value = ''; $('#cl-repetir').value = ''; $('#cl-error').textContent = '';
    mostrar('clave');
  }
  async function guardarClave(e) {
    e.preventDefault();
    const a = $('#cl-nueva').value, b2 = $('#cl-repetir').value, err = $('#cl-error');
    err.textContent = '';
    if (a.length < 8) { err.textContent = 'Tiene que tener al menos 8 caracteres.'; return; }
    if (a !== b2) { err.textContent = 'Las dos contraseñas no coinciden.'; return; }
    const b = $('#cl-boton');
    b.disabled = true;
    try {
      if (st.sesion && Date.now() > st.sesion.vence) await refrescar();
      const r = await fetch(`${C.url}/auth/v1/user`, { method: 'PUT', headers: { apikey: C.clave, Authorization: `Bearer ${st.sesion.access}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ password: a }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        const c = d.error_code || d.code || '';
        err.textContent = c === 'weak_password' ? 'Esa contraseña es muy fácil. Hacela más larga y mezclá letras, números y símbolos.'
          : c === 'same_password' ? 'Tiene que ser distinta a la que tenías.'
          : r.status === 401 ? 'El link venció. Pedí uno nuevo con “¿Te olvidaste la contraseña?”.' : 'No pudimos guardarla. Probá de nuevo.';
        return;
      }
      aviso('¡Contraseña guardada!');
      await iniciar();
    } catch (ex) { err.textContent = 'No hay conexión. Revisá internet y probá de nuevo.'; }
    finally { b.disabled = false; }
  }
  // Cuando se entra desde el link del mail (recuperar contraseña o invitación)
  async function entrarDesdeMail() {
    const h = location.hash.slice(1);
    if (!/(^|&)(access_token|error_code|error)=/.test(h)) return false;
    const p = new URLSearchParams(h);
    history.replaceState(null, '', location.pathname + location.search);
    if (p.get('error') || p.get('error_code')) {
      mostrar('entrar');
      $('#e-error').textContent = 'Ese link ya venció o ya se usó. Pedí uno nuevo con “¿Te olvidaste la contraseña?”.';
      return true;
    }
    try {
      const r = await fetch(`${C.url}/auth/v1/user`, { headers: { apikey: C.clave, Authorization: `Bearer ${p.get('access_token')}` } });
      if (!r.ok) throw new Error('link');
      fijarSesion({ access_token: p.get('access_token'), refresh_token: p.get('refresh_token'), expires_in: Number(p.get('expires_in')) || 3600, user: await r.json() });
      const tipo = p.get('type');
      if (tipo === 'invite') mostrarClave('invitacion'); else if (tipo === 'recovery') mostrarClave('nueva'); else await iniciar();
    } catch (ex) {
      fijarSesion(null); mostrar('entrar');
      $('#e-error').textContent = 'Ese link ya venció o ya se usó. Pedí uno nuevo con “¿Te olvidaste la contraseña?”.';
    }
    return true;
  }

  /* ---------- Eventos ---------- */
  document.addEventListener('click', (e) => {
    const b = e.target.closest('button, a');
    if (!e.target.closest('#menu') && !e.target.closest('#b-menu')) $('#menu').hidden = true;
    if (!b) return;
    if (b.id === 'dlg-si') { if (cerrarDlg) cerrarDlg(true); return; }
    if (b.id === 'dlg-no') { if (cerrarDlg) cerrarDlg(false); return; }
    if (b.dataset.llave !== undefined) { cambiarDisponible(Number(b.dataset.llave)); return; }
    if (b.dataset.dia !== undefined) {
      const d = Number(b.dataset.dia);
      st.horas[d] = st.horas[d].length ? [] : [['11:00', '23:00']];
      pintarHorarios(); return;
    }
    if (b.dataset.copiar !== undefined) {
      const d = Number(b.dataset.copiar), modelo = st.horas[d];
      ORDEN.forEach((x) => { if (x !== d) st.horas[x] = modelo.map((f) => f.slice()); });
      pintarHorarios(); aviso('Copiado a todos los días. Revisalo y tocá “Guardar horarios”.'); return;
    }
    if (b.dataset.chip !== undefined) { st.soloAgotados = b.dataset.chip === 'agotados'; pintarCarta(); return; }
    if (b.dataset.fsuc !== undefined) { st.suc = b.dataset.fsuc; pintarPedidos(); return; }
    if (b.dataset.fped !== undefined) { st.filtroPed = b.dataset.fped; pintarPedidos(); return; }
    if (b.dataset.fcli !== undefined) { st.filtroCli = b.dataset.fcli; pintarClientes(); return; }
    if (b.dataset.estado !== undefined) { const [i, e] = b.dataset.estado.split(':'); cambiarEstado(Number(i), e); return; }
    if (b.dataset.waPedido !== undefined) { escribirPorPedido(Number(b.dataset.waPedido)); return; }
    if (b.dataset.escribir !== undefined) { escribirCliente(Number(b.dataset.escribir)); return; }
    if (b.closest('#alerta-pedido')) { $('#alerta-pedido').hidden = true; }
    if (b.dataset.agregar !== undefined) { st.horas[Number(b.dataset.agregar)].push(['19:00', '23:30']); pintarHorarios(); return; }
    if (b.dataset.quitar !== undefined) { const [d, k] = b.dataset.quitar.split('-').map(Number); st.horas[d].splice(k, 1); pintarHorarios(); return; }
    if (b.dataset.salir !== undefined) { salir(); return; }
    switch (b.id) {
      case 'b-cerrar': cerrarPorHoy(); break;
      case 'b-abrir': abrirDeNuevo(); break;
      case 'b-porcentaje': ajustarPorcentaje(); break;
      case 'b-reponer': reponerTodo(); break;
      case 'b-menu': $('#menu').hidden = !$('#menu').hidden; break;
      case 'm-tienda': window.open(st.negocio.tienda, '_blank', 'noopener'); break;
      case 'm-clave': mostrarClave('cambiar'); break;
      case 'm-reiniciar': [CLAVE_DEMO(), CLAVE_PED(), CLAVE_EJ(), CLAVE_EST()].forEach((k) => guardarLS(k, null)); location.reload(); break;
      case 'm-sonido': sonar(); aviso('Así suena cuando entra un pedido.'); break;
      case 'b-difusion': armarDifusion(); break;
      case 'e-olvide': mostrar('recuperar'); $('#rp-mail').value = $('#e-mail').value.trim(); $('#f-recuperar').hidden = false; $('#rp-listo').hidden = true; break;
      case 'rp-volver': mostrar('entrar'); break;
    }
  });
  document.addEventListener('input', (e) => {
    const t = e.target;
    if (t.id === 'buscar') { st.filtro = t.value; pintarCarta(); return; }
    if (t.id === 'buscar-clientes') { st.buscaCli = t.value; pintarClientes(); return; }
    if (t.dataset && t.dataset.h) { const [d, k, x] = t.dataset.h.split('-').map(Number); st.horas[d][k][x] = t.value; }
  });
  document.addEventListener('focusin', (e) => { if (e.target.dataset && e.target.dataset.precio !== undefined) e.target.select(); });
  document.addEventListener('change', (e) => {
    const t = e.target;
    if (t.dataset && t.dataset.precio !== undefined) guardarPrecio(t);
    if (t.dataset && t.dataset.h) { const [d, k, x] = t.dataset.h.split('-').map(Number); st.horas[d][k][x] = t.value; }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.dataset && e.target.dataset.precio !== undefined) {
      e.preventDefault();
      const todos = Array.from(document.querySelectorAll('input[data-precio]')), sig = todos[todos.indexOf(e.target) + 1];
      e.target.blur();
      if (sig && window.matchMedia('(hover: hover) and (pointer: fine)').matches) sig.focus(); // en compu, Enter guarda y pasa al siguiente precio
    }
    if (e.key === 'Escape') { if (cerrarDlg) cerrarDlg(false); $('#menu').hidden = true; }
  });
  $('#f-entrar').addEventListener('submit', enviarEntrar);
  $('#f-recuperar').addEventListener('submit', enviarRecuperar);
  $('#f-clave').addEventListener('submit', guardarClave);
  $('#f-horarios').addEventListener('submit', guardarHorarios);
  window.addEventListener('hashchange', () => { if (!$('#v-app').hidden) ruta(); });
  setInterval(() => { if (!$('#v-app').hidden && !cerrarDlg) pintarEstado(); }, 60000);

  /* ---------- Arranque ---------- */
  (async function () {
    if (DEMO) { iniciar(); return; }
    if (await entrarDesdeMail()) return;
    const s = leerLS('sa-pedidos:panel');
    if (s && s.refresh) { st.sesion = s; iniciar(); } else mostrar('entrar');
  })();
})();
