/* =====================================================================
   SANTA AUTOMATIZA · MOTOR DEL LOCAL ONLINE
   ---------------------------------------------------------------------
   Este archivo es el mismo para TODOS los locales y rubros.
   No se edita por cliente: todo lo que cambia de un local a otro
   (productos, precios, colores, horarios, zonas, WhatsApp) vive en
   locales/<nombre>.js. Acá solo está la lógica.
   ===================================================================== */
(function () {
    "use strict";

    const L = window.LOCAL;
    const raiz = document.getElementById("local");
    if (!L || !raiz) return;
    const PAG = window.PAGINA || (() => { try { return JSON.parse(document.getElementById("pagina-datos").textContent); } catch (e) { return {}; } })();
    const EMBEBIDO = location.hash === "#marco"; // la demo se ve dentro del celular de la página de Santa Automatiza

    /* ---------- Utilidades ---------- */
    const $ = (s, c) => (c || document).querySelector(s);
    const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));
    const esc = t => String(t == null ? "" : t).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    const pesos = n => "$" + Math.round(n).toLocaleString("es-AR");
    const suma = (lista, f) => lista.reduce((s, x) => s + f(x), 0);
    const slug = t => String(t).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const CLAVE = "sa:" + (L.carpeta || slug(L.nombre)) + ":";
    const guardar = (k, v) => { try { localStorage.setItem(CLAVE + k, JSON.stringify(v)); } catch (e) {} };
    const leer = (k, def) => { try { const v = JSON.parse(localStorage.getItem(CLAVE + k)); return v == null ? def : v; } catch (e) { return def; } };
    const plural = (n, uno, muchos) => n + " " + (n === 1 ? uno : muchos);

    // Estadísticas: Google Analytics y Píxel de Meta. Si no cargaron (bloqueador), no pasa nada.
    function medir(evento, datosEv) {
        try { if (typeof window.gtag === "function") window.gtag("event", evento, datosEv || {}); } catch (e) {}
        try {
            if (typeof window.fbq !== "function") return;
            const mapa = { add_to_cart: "AddToCart", begin_checkout: "InitiateCheckout", generate_lead: "Lead", view_item: "ViewContent" };
            if (mapa[evento]) window.fbq("track", mapa[evento], { currency: "ARS", value: (datosEv || {}).value || 0 });
        } catch (e) {}
    }

    const ICONOS = {
        mas: '<path d="M12 5v14M5 12h14"/>',
        tel: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z"/>',
        lupa: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
        menos: '<path d="M5 12h14"/>',
        x: '<path d="M6 6l12 12M18 6L6 18"/>',
        atras: '<path d="M15 5l-7 7 7 7"/>',
        bolsa: '<path d="M6 8h12l1 12H5L6 8z"/><path d="M9 8V6a3 3 0 016 0v2"/>',
        reloj: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
        pin: '<path d="M12 21s7-6.2 7-11.5A7 7 0 005 9.5C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
        moto: '<circle cx="6" cy="17" r="3"/><circle cx="18" cy="17" r="3"/><path d="M9 17h6l-2-7h-3M13 10l4 1 1 3M4 11h5"/>',
        tienda: '<path d="M4 10l1.5-5h13L20 10M5 10v9h14v-9M4 10a2.7 2.7 0 005.3 0 2.7 2.7 0 005.4 0 2.7 2.7 0 005.3 0M10 19v-5h4v5"/>',
        ok: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
        copiar: '<rect x="8" y="8" width="11" height="12" rx="2"/><path d="M5 16V6a2 2 0 012-2h8"/>',
        tarjeta: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18"/>',
        billete: '<rect x="3" y="7" width="18" height="10" rx="1.5"/><circle cx="12" cy="12" r="2.3"/>',
        banco: '<path d="M4 10l8-5 8 5M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3.5 19h17"/>',
        etiqueta: '<path d="M4 4h7l9 9-7 7-9-9V4z"/><circle cx="8" cy="8" r="1.3"/>',
        sig: '<path d="M9 5l7 7-7 7"/>',
        ig: '<rect x="4" y="4" width="16" height="16" rx="5"/><circle cx="12" cy="12" r="3.6"/><path d="M16.8 7.2h.01"/>'
    };
    const ico = n => `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONOS[n] || ""}</svg>`;
    const ICO_WA = '<svg class="ico ico-wa" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" d="M12 2.5a9.5 9.5 0 00-8.2 14.3L2.5 21.5l4.9-1.3A9.5 9.5 0 1012 2.5zM8.6 7.2c.3 0 .6 0 .8.5l.9 2.1c.1.3 0 .5-.1.7l-.7.9c.7 1.3 1.7 2.3 3.1 3l.9-1c.2-.2.5-.3.8-.1l2 1c.3.2.4.4.3.8-.2 1-1.2 1.8-2.3 1.8-3.6-.2-7.3-3.9-7.5-7.5 0-1 .7-2 1.8-2.2z"/></svg>';

    /* =====================================================================
       DIBUJOS
       ---------------------------------------------------------------------
       Ilustraciones livianas para cuando un producto no tiene foto.
       Si el producto tiene "foto", se usa la foto y el dibujo no aparece.
       ===================================================================== */
    let nClip = 0;
    const PUNTOS = [[60, 34], [40, 46], [80, 48], [56, 62], [34, 72], [82, 74], [60, 86], [46, 30], [74, 30]];
    function capaPizza(o) {
        o = o || {};
        let s = `<circle cx="60" cy="60" r="50" fill="#D8963F"/><circle cx="60" cy="60" r="43" fill="${o.salsa || "#C7372B"}"/><circle cx="60" cy="60" r="40" fill="${o.queso || "#FFD67A"}"/>`;
        const top = o.top || [];
        top.forEach((t, k) => {
            PUNTOS.forEach((p, i) => {
                if (i % top.length !== k) return;
                const x = p[0], y = p[1];
                if (t.forma === "hoja") s += `<ellipse cx="${x}" cy="${y}" rx="7" ry="3.6" fill="${t.c}" transform="rotate(${i * 47} ${x} ${y})"/>`;
                else if (t.forma === "tira") s += `<rect x="${x - 8}" y="${y - 2.4}" width="16" height="4.8" rx="2.4" fill="${t.c}" transform="rotate(${i * 61} ${x} ${y})"/>`;
                else if (t.forma === "aro") s += `<circle cx="${x}" cy="${y}" r="4.8" fill="none" stroke="${t.c}" stroke-width="2.8"/>`;
                else s += `<circle cx="${x}" cy="${y}" r="${t.r || 5.8}" fill="${t.c}"/>`;
            });
        });
        return s;
    }
    const DIBUJOS = {
        burger(o) {
            const n = o.pisos || 1;
            let y = 104, s = "";
            s += `<rect x="20" y="${y - 13}" width="80" height="13" rx="6.5" fill="#E0993F"/>`; y -= 14;
            for (let i = 0; i < n; i++) {
                s += `<rect x="15" y="${y - 12}" width="90" height="12" rx="6" fill="${o.carne || "#6B3A22"}"/>`; y -= 12;
                if (o.queso !== false) { s += `<path d="M13 ${y - 4}h94v4l-11 7-10-7h-21l-9 8-9-8h-20l-8 6-6-6z" fill="${o.queso || "#FFC93C"}"/>`; y -= 4; }
            }
            if (o.extra) { s += `<rect x="17" y="${y - 5}" width="86" height="5" rx="2.5" fill="${o.extra}"/>`; y -= 5; }
            if (o.verde !== false) { s += `<path d="M13 ${y + 1}q6-9 11.75 0q6-9 11.75 0q6-9 11.75 0q6-9 11.75 0q6-9 11.75 0q6-9 11.75 0q6-9 11.75 0q6-9 11.75 0v3h-94z" fill="#72BE48"/>`; y -= 5; }
            s += `<path d="M18 ${y}q0-34 42-34q42 0 42 34z" fill="#EAA74E"/>`;
            [[44, 18, -20], [60, 26, 10], [76, 18, 25], [52, 10, 0], [68, 10, -15]].forEach(p => {
                s += `<ellipse cx="${p[0]}" cy="${y - p[1]}" rx="3" ry="1.6" fill="#FFF0C4" transform="rotate(${p[2]} ${p[0]} ${y - p[1]})"/>`;
            });
            const arriba = y - 34;
            return `<g transform="translate(0 ${-(arriba - 16) / 2})">${s}</g>`;
        },
        papas(o) {
            let s = "";
            [[40, -14], [50, 6], [58, -4], [66, 10], [76, -8], [84, 14], [46, 18], [72, 20]].forEach((p, i) => {
                s += `<rect x="${p[0] - 4}" y="${22 + (i % 3) * 5}" width="8" height="52" rx="2" fill="${i % 2 ? "#FFD257" : "#F6BE3B"}" transform="rotate(${p[1]} ${p[0]} 70)"/>`;
            });
            if (o.salsa) s += `<path d="M36 52q8-12 18-4q8-10 16 0q10-8 16 4q4 10-6 12h-38q-10-2-6-12z" fill="${o.salsa}"/>`;
            if (o.top) [[46, 50], [58, 46], [70, 52], [78, 48]].forEach(p => { s += `<rect x="${p[0]}" y="${p[1]}" width="7" height="4" rx="1.5" fill="${o.top}"/>`; });
            s += `<path d="M30 58h60l-7 48H37z" fill="${o.caja || "#D7261E"}"/><path d="M30 58h60l-1.5 10h-57z" fill="#000" opacity=".14"/>`;
            return s;
        },
        bebida(o) {
            const c = o.c || "#D7261E";
            if (o.forma === "botella") {
                return `<rect x="52" y="10" width="16" height="10" rx="2" fill="#333"/><path d="M50 20h20v10q10 8 10 22v48a8 8 0 01-8 8H48a8 8 0 01-8-8V52q0-14 10-22z" fill="${c}"/><rect x="40" y="58" width="40" height="24" fill="#fff" opacity=".85"/><path d="M47 34q-3 6-3 16" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".5" fill="none"/>`;
            }
            if (o.forma === "vaso") {
                return `<path d="M62 6l4 2-8 26h-4z" fill="#E94B3C"/><path d="M34 32h52l-6 72a6 6 0 01-6 5H46a6 6 0 01-6-5z" fill="${c}"/><rect x="30" y="26" width="60" height="9" rx="4.5" fill="#fff"/><path d="M37 60h46l-2 22H39z" fill="#fff" opacity=".28"/>`;
            }
            return `<rect x="38" y="14" width="44" height="94" rx="9" fill="${c}"/><rect x="38" y="14" width="44" height="12" rx="6" fill="#C9CED6"/><rect x="38" y="96" width="44" height="12" rx="6" fill="#C9CED6"/><rect x="38" y="46" width="44" height="26" fill="#fff" opacity=".9"/><path d="M46 30v60" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".35"/>`;
        },
        pizza(o) { return capaPizza(o); },
        mitades(o) {
            const a = ++nClip, b = ++nClip;
            const vacia = { salsa: "#E9DCC3", queso: "#F3EAD7", top: [] };
            return `<defs><clipPath id="mz${a}"><rect x="0" y="0" width="60" height="120"/></clipPath><clipPath id="mz${b}"><rect x="60" y="0" width="60" height="120"/></clipPath></defs>
                <g clip-path="url(#mz${a})">${capaPizza(o.a || vacia)}</g><g clip-path="url(#mz${b})">${capaPizza(o.b || vacia)}</g>
                <path d="M60 10v100" stroke="#B87A2E" stroke-width="2.5" stroke-dasharray="5 4"/>`;
        },
        empanada(o) {
            const una = (dx, dy, g) => {
                let s = `<g transform="translate(${dx} ${dy}) rotate(${g} 60 70)"><path d="M16 80q44-76 88 0z" fill="${o.c || "#E7B25C"}"/><path d="M16 80q44-76 88 0" fill="none" stroke="#C98B36" stroke-width="7" stroke-dasharray="3 6.5" stroke-linecap="round"/><path d="M34 74q26-34 52 0" fill="none" stroke="#fff" stroke-width="3" opacity=".25" stroke-linecap="round"/></g>`;
                return s;
            };
            const n = o.n || 1;
            if (n === 1) return una(0, 8, -8);
            if (n === 2) return `<g transform="scale(.82) translate(2 4)">${una(-6, 0, -14)}</g><g transform="scale(.82) translate(30 34)">${una(0, 0, 8)}</g>`;
            return `<g transform="scale(.74) translate(-2 -6)">${una(0, 0, -16)}</g><g transform="scale(.74) translate(44 14)">${una(0, 0, 10)}</g><g transform="scale(.74) translate(14 50)">${una(0, 0, -4)}</g>`;
        },
        pote(o) {
            const col = (o.gustos && o.gustos.length ? o.gustos : ["#F3E7CF"]).slice(0, 4);
            const alto = o.alto || 46, y = 104 - alto; // y = borde de arriba del pote
            const pos = {
                1: [[60, y - 14, 25]],
                2: [[44, y - 12, 21], [77, y - 12, 21]],
                3: [[41, y - 9, 18], [79, y - 9, 18], [60, y - 26, 20]],
                4: [[35, y - 7, 15], [60, y - 9, 15], [85, y - 7, 15], [60, y - 28, 17]]
            }[col.length];
            let s = "";
            pos.forEach((p, i) => { s += `<circle cx="${p[0]}" cy="${p[1]}" r="${p[2]}" fill="${col[i]}"/><circle cx="${p[0] - p[2] * .34}" cy="${p[1] - p[2] * .38}" r="${p[2] * .2}" fill="#fff" opacity=".35"/>`; });
            const x = d => 26 + 7 * d / alto; // el pote se angosta hacia abajo
            const f1 = alto * .34, f2 = alto * .72;
            s += `<path d="M26 ${y}h68l-7 ${alto - 4}a5 5 0 01-5 4H38a5 5 0 01-5-4z" fill="${o.pote || "#fff"}"/>`;
            s += `<path d="M${x(f1)} ${y + f1}H${120 - x(f1)}L${120 - x(f2)} ${y + f2}H${x(f2)}z" fill="${o.borde || "var(--marca)"}" opacity=".9"/>`;
            s += `<rect x="21" y="${y - 5}" width="78" height="10" rx="5" fill="${o.borde || "var(--marca)"}"/>`;
            return s;
        },
        cucurucho(o) {
            const col = (o.gustos && o.gustos.length ? o.gustos : ["#F58FA8", "#8A5A3C"]).slice(0, 2);
            let s = `<path d="M40 56h40l-20 56z" fill="#E2A458"/><path d="M45 62l26 22M52 58l22 18M75 62l-24 24M68 58l-22 18M56 96l10-10" stroke="#B87A2E" stroke-width="1.8" fill="none"/>`;
            if (col[1]) s += `<circle cx="60" cy="24" r="17" fill="${col[1]}"/>`;
            s += `<circle cx="60" cy="${col[1] ? 44 : 40}" r="21" fill="${col[0]}"/><circle cx="52" cy="${col[1] ? 36 : 32}" r="4" fill="#fff" opacity=".3"/>`;
            return s;
        },
        paleta(o) {
            return `<rect x="54" y="78" width="12" height="34" rx="5" fill="#E2C08A"/><rect x="32" y="10" width="56" height="76" rx="26" fill="${o.c || "#6A4028"}"/>` +
                (o.bano ? `<path d="M32 44v-8a28 26 0 0156 0v10q-7 8-14 0q-7 9-14 0q-7 9-14 0q-7 8-14-2z" fill="${o.bano}"/>` : "") +
                `<path d="M44 30q4-10 14-11" stroke="#fff" stroke-width="3.5" stroke-linecap="round" fill="none" opacity=".35"/>`;
        },
        torta(o) {
            return `<path d="M14 96l84-30v24L14 106z" fill="${o.base || "#C9955A"}"/><path d="M14 96l84-30-10-34L14 74z" fill="${o.c || "#F7E3C0"}"/><path d="M14 84l84-30" stroke="${o.capa || "#7A4A2E"}" stroke-width="5"/><path d="M14 74l74-42 10 8-84 40z" fill="${o.arriba || "#7A4A2E"}"/><circle cx="56" cy="50" r="6" fill="${o.fruta || "#D7263D"}"/>`;
        },
        combo(o) {
            return `<g transform="translate(-4 22) scale(.74)">${DIBUJOS.burger(Object.assign({ pisos: 2 }, o.burger, o.pisos ? { pisos: o.pisos } : {}))}</g><g transform="translate(60 44) scale(.5)">${DIBUJOS.papas(o.papas || {})}</g><g transform="translate(74 -2) scale(.44)">${DIBUJOS.bebida(o.bebida || { forma: "vaso" })}</g>`;
        }
    };
    function svgDibujo(d) {
        if (!d || !DIBUJOS[d.tipo]) return "";
        return `<svg class="dib" viewBox="0 0 120 120" aria-hidden="true">${DIBUJOS[d.tipo](d)}</svg>`;
    }
    // La imagen del producto. Con "sel" (lo que el cliente va eligiendo) el dibujo se actualiza en vivo:
    // el pote se llena con los gustos elegidos y la pizza muestra las dos mitades.
    function imagenDe(p, sel) {
        if (p.foto) return `<img src="${esc(p.foto)}" alt="" loading="lazy">`;
        let d = p.dibujo;
        if (!d) return "";
        if (sel) {
            p.grupos && p.grupos.forEach(g => {
                const elegidas = Object.keys(sel[g.id] || {});
                const ops = opcionesDe(g, p);
                elegidas.forEach(n => { const o = ops.find(x => x.nombre === n); if (o && o.cambia) d = Object.assign({}, d, o.cambia); });
                if (d.tipo === "mitades" && g.cobro) {
                    const dib = elegidas.map(n => (ops.find(o => o.nombre === n) || {}).dibujo);
                    d = Object.assign({}, d, { a: dib[0], b: dib[1] });
                } else if ((d.tipo === "pote" || d.tipo === "cucurucho") && g.pinta) {
                    const cols = elegidas.map(n => (ops.find(o => o.nombre === n) || {}).color).filter(Boolean);
                    d = Object.assign({}, d, { gustos: cols.length ? cols : null });
                }
            });
        }
        return svgDibujo(d);
    }

    /* =====================================================================
       CATÁLOGO
       ===================================================================== */
    const productos = {};
    L.categorias.forEach(c => c.productos.forEach(p => { p.cat = c.id; productos[p.id] = p; }));

    const disponible = x => x.disponible !== false && (x.stock === undefined || x.stock > 0);

    // Las opciones de un grupo pueden venir escritas ahí mismo, de una lista compartida
    // (ej: "gustos") o de una categoría entera (ej: las pizzas, para armar mitad y mitad).
    function opcionesDe(g, p) {
        let o = g.opciones;
        if (typeof o === "string") return (L.listas || {})[o] || [];
        if (o && o.categoria) {
            const cat = L.categorias.find(c => c.id === o.categoria);
            return (cat ? cat.productos : [])
                .filter(x => x.id !== (p && p.id) && x.precio > 0 && !(x.grupos || []).some(y => y.cobro))
                .map(x => ({ nombre: x.nombre, precio: x.precio, disponible: disponible(x), dibujo: x.dibujo, detalle: x.desc }));
        }
        return o || [];
    }
    const cuenta = sel => suma(Object.values(sel || {}), n => n);
    function limites(g) {
        if (g.tipo === "uno") return { min: 1, max: 1 };
        if (g.tipo === "cantidades") return { min: g.total != null ? g.total : (g.min || 0), max: g.total != null ? g.total : (g.max || 99) };
        return { min: g.min || 0, max: g.max || 99 };
    }
    function precioGrupo(g, p, sel) {
        const ops = opcionesDe(g, p);
        const elegidas = Object.keys(sel || {}).map(n => ({ o: ops.find(x => x.nombre === n), q: sel[n] })).filter(x => x.o);
        if (!elegidas.length) return 0;
        if (g.cobro === "mayor") return Math.max.apply(null, elegidas.map(x => x.o.precio || 0));
        if (g.cobro === "promedio") return Math.round(suma(elegidas, x => x.o.precio || 0) / elegidas.length / 100) * 100;
        return suma(elegidas, x => (x.o.precio || 0) * x.q);
    }
    function precioUnidad(it) {
        const p = productos[it.id];
        return (p.precio || 0) + suma(p.grupos || [], g => precioGrupo(g, p, (it.sel || {})[g.id]));
    }
    function precioDesde(p) {
        let base = p.precio || 0, desde = !p.precio;
        (p.grupos || []).forEach(g => {
            const ops = opcionesDe(g, p).filter(disponible);
            const { min } = limites(g);
            if (!min || !ops.length) return;
            const precios = ops.map(o => o.precio || 0);
            const menor = Math.min.apply(null, precios);
            if (g.cobro) { base += menor; desde = true; }
            else { base += menor * (g.tipo === "uno" ? 1 : min); if (Math.max.apply(null, precios) !== menor) desde = true; }
        });
        return { base, desde };
    }
    // Texto corto de lo elegido: "Doble · Cheddar extra, Bacon · Sin cebolla"
    function detalleDe(it) {
        const p = productos[it.id];
        return (p.grupos || []).map(g => {
            const sel = (it.sel || {})[g.id] || {};
            const nombres = Object.keys(sel);
            if (!nombres.length) return "";
            if (g.tipo === "cantidades") return nombres.map(n => sel[n] + " " + n).join(", ");
            if (g.cobro) return nombres.join(" / ");
            return nombres.join(", ");
        }).filter(Boolean).join(" · ");
    }

    /* =====================================================================
       SUCURSALES
       ---------------------------------------------------------------------
       Un local con una sola sucursal funciona con los datos de arriba de todo
       (direccion, whatsapp, horarios, entrega), como siempre.
       Con  sucursales: [ { id, nombre, direccion, ciudad, whatsapp, horarios,
       pausa, entrega: { delivery, retiro, zonas } } ]  cada sucursal tiene lo suyo
       y lo que no define lo toma del local. El pedido va al WhatsApp de la
       sucursal elegida: en retiro la elige el cliente; en delivery se le asigna
       según la zona que elige (cada zona sabe qué sucursal la atiende).
       ===================================================================== */
    const ENT = L.entrega || {};
    function datosSuc(s, i) {
        const e = s.entrega || {};
        return {
            id: String(s.id || slug(s.nombre || "") || "suc" + (i + 1)),
            nombre: s.nombre || L.nombre,
            direccion: s.direccion != null ? s.direccion : (L.direccion || ""),
            ciudad: s.ciudad != null ? s.ciudad : (L.ciudad || ""),
            whatsapp: s.whatsapp || L.whatsapp,
            horarios: s.horarios || L.horarios || {},
            pausa: s.pausa || "",
            DEL: Object.assign({ activo: true }, ENT.delivery, e.delivery),
            RET: Object.assign({ activo: false }, ENT.retiro, e.retiro),
            ZONAS: e.zonas || ENT.zonas || []
        };
    }
    const LISTA = (L.sucursales || []).length > 1 ? L.sucursales.map(datosSuc) : []; // con una sola sucursal no hace falta la lista: van los datos de arriba
    const MULTI = LISTA.length > 1;
    const UNICA = MULTI ? null : datosSuc({}, 0);
    // En delivery con varias sucursales: cada zona junto a la sucursal que la atiende
    const PARES = [];
    if (MULTI) LISTA.forEach(s => { if (s.DEL.activo) s.ZONAS.forEach(z => PARES.push({ zona: z, suc: s })); });
    PARES.sort((a, b) => a.zona.nombre.localeCompare(b.zona.nombre, "es") || (a.zona.costo || 0) - (b.zona.costo || 0));
    const PUEDE_DEL = PARES.length > 0;
    // Una sola opción por localidad: si dos sucursales llegan a la misma, la del mismo pueblo y si no la de envío más barato.
    // El cliente elige dónde está; qué sucursal lo prepara se decide solo.
    const LOCALIDADES = (() => {
        const mapa = new Map();
        PARES.forEach(p => {
            const k = slug(p.zona.nombre), ya = mapa.get(k);
            const mejor = !ya || (slug(p.suc.ciudad || "") === k && slug(ya.suc.ciudad || "") !== k) || (slug(ya.suc.ciudad || "") !== k && (p.zona.costo || 0) < (ya.zona.costo || 0));
            if (mejor) mapa.set(k, p);
        });
        return Array.from(mapa.values()).sort((a, b) => a.zona.nombre.localeCompare(b.zona.nombre, "es"));
    })();
    const PUEDE_RET = MULTI && LISTA.some(s => s.RET.activo);
    let ACT = null, DEL = {}, RET = {}, ZONAS = []; // la sucursal en uso y sus datos de entrega
    function usarSuc(s) {
        ACT = s || null;
        if (s) { DEL = s.DEL; RET = s.RET; ZONAS = s.ZONAS; return; }
        // Todavía no eligió sucursal: datos generales de todas juntas
        const gratis = Array.from(new Set(LISTA.filter(x => x.DEL.activo).map(x => x.DEL.gratisDesde || 0)));
        DEL = { activo: PUEDE_DEL, demora: "", minimo: 0, gratisDesde: gratis.length === 1 ? gratis[0] : 0 };
        RET = { activo: PUEDE_RET, demora: "" };
        ZONAS = [];
    }
    usarSuc(MULTI ? null : UNICA);
    const sucPorId = id => LISTA.find(s => s.id === id) || null;
    const dirDe = s => s.direccion + (s.ciudad ? ", " + s.ciudad : "");
    const pausaActual = () => L.pausa || (ACT && ACT.pausa) || "";

    /* =====================================================================
       HORARIOS (abierto / cerrado, siempre en la hora del local)
       ===================================================================== */
    const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
    const TZ = L.zonaHoraria || "America/Argentina/Buenos_Aires";
    function ahoraLocal() {
        try {
            const p = {};
            new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false })
                .formatToParts(new Date()).forEach(x => { p[x.type] = x.value; });
            return { dia: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(p.weekday), min: (Number(p.hour) % 24) * 60 + Number(p.minute) };
        } catch (e) { const d = new Date(); return { dia: d.getDay(), min: d.getHours() * 60 + d.getMinutes() }; }
    }
    const aMin = h => { const x = h.split(":").map(Number); return x[0] * 60 + x[1]; };
    // "hor" son los horarios de una sucursal; sin eso, los de la sucursal en uso
    const franjas = (dia, hor) => ((hor || (ACT ? ACT.horarios : L.horarios) || {})[dia] || []).map(r => {
        const x = r.split("-"); let i = aMin(x[0]), f = aMin(x[1]);
        if (f <= i) f += 1440; // cierra pasada la medianoche
        return { i, f, ini: x[0], fin: x[1] };
    });
    let simulado = L.demo ? leerSesion("sim", "abierto") : null; // en las demos se puede simular abierto/cerrado
    function leerSesion(k, def) { try { return sessionStorage.getItem(CLAVE + k) || def; } catch (e) { return def; } }
    // Si una sucursal está abierta o cerrada ahora
    function estadoDe(s) {
        const pausa = L.pausa || s.pausa;
        if (pausa) return { abierto: false, texto: pausa };
        const { dia, min } = ahoraLocal();
        let abierto = null;
        franjas(dia, s.horarios).forEach(fr => { if (min >= fr.i && min < fr.f) abierto = fr; });
        franjas((dia + 6) % 7, s.horarios).forEach(fr => { if (min + 1440 < fr.f) abierto = fr; });
        if (simulado === "abierto") return { abierto: true, cierra: abierto ? abierto.fin : null };
        if (abierto && simulado !== "cerrado") return { abierto: true, cierra: abierto.fin };
        for (let d = 0; d < 8; d++) {
            const dd = (dia + d) % 7;
            const fr = franjas(dd, s.horarios).find(f => d > 0 || (f.i > min && !abierto));
            if (fr) return { abierto: false, abre: fr.ini, cuando: d === 0 ? "hoy" : d === 1 ? "mañana" : "el " + DIAS[dd], en: d * 1440 + fr.i - min };
        }
        return { abierto: false };
    }
    // Con varias sucursales y ninguna elegida todavía: el resumen de todas juntas
    function estadoGlobal() {
        const es = LISTA.map(estadoDe), n = es.filter(e => e.abierto).length;
        if (n) return { abierto: true, resumen: n === es.length ? `Las ${n} sucursales están abiertas` : `${n} de ${es.length} sucursales abiertas` };
        const prox = es.filter(e => e.abre).sort((a, b) => a.en - b.en)[0];
        return prox ? { abierto: false, abre: prox.abre, cuando: prox.cuando } : { abierto: false, texto: (es[0] || {}).texto };
    }
    function estado() { return ACT ? estadoDe(ACT) : estadoGlobal(); }
    const textoAbre = e => e.texto || (e.abre ? `Abre ${e.cuando} a las ${e.abre}` : "Cerrado por ahora");
    // Lo que se lee al lado de Abierto / Cerrado
    const textoEstado = e => e.abierto ? (e.resumen || (e.cierra ? "Cierra a las " + e.cierra : "")) : textoAbre(e);

    /* ---------- Encargos con hora ("pollo para las 13") ----------
       Se activa con encargos: { activo: true, cada: 30, anticipo: 45 } en el local.
       Ofrece los horarios que quedan hoy (o del próximo día que abre), cada "cada" minutos,
       desde "anticipo" minutos en adelante para que lleguen a prepararlo. */
    const ENC = Object.assign({ activo: false, cada: 30, anticipo: 45 }, L.encargos);
    const hhmm = m => { m = ((m % 1440) + 1440) % 1440; return String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0"); };
    function horariosEncargo() {
        if (!ENC.activo || pausaActual() || (MULTI && !ACT)) return [];
        const { dia, min } = ahoraLocal();
        for (let d = 0; d < 8; d++) {
            const dd = (dia + d) % 7, lista = [];
            franjas(dd).forEach(fr => {
                const desde = d === 0 ? Math.max(fr.i, min + ENC.anticipo) : fr.i;
                for (let t = Math.ceil(desde / ENC.cada) * ENC.cada; t <= fr.f - ENC.cada; t += ENC.cada) lista.push(t);
            });
            if (lista.length) {
                const cuando = d === 0 ? "hoy" : d === 1 ? "mañana" : "el " + DIAS[dd];
                return lista.map(t => ({ valor: cuando + " " + hhmm(t), texto: `${cuando[0].toUpperCase() + cuando.slice(1)} a las ${hhmm(t)}` }));
            }
        }
        return [];
    }

    /* =====================================================================
       CARRITO, PROMOS Y TOTALES
       ===================================================================== */
    /* ---------- Club de clientes, invitaciones y de dónde vino el pedido ----------
       club: { meta: 5, premio: "un 1/4 kg de regalo", amigo: 10 } en el archivo del local.
       meta  = cuántos pedidos completan la tarjeta de sellos
       amigo = % de descuento en el primer pedido de alguien que llega con el link de un cliente
       ?de=qr / ?de=ig en el link anota de dónde vino el cliente (se ve en el panel). */
    const CLUB = L.club && L.club.activo !== false ? Object.assign({ meta: 5, premio: "un regalo", amigo: 10 }, L.club) : null;
    if (CLUB) { CLUB.meta = Math.min(20, Math.max(2, Math.round(Number(CLUB.meta) || 5))); CLUB.amigo = Math.min(50, Math.max(0, Math.round(Number(CLUB.amigo) || 0))); }
    (function () {
        const q = new URLSearchParams(location.search);
        const de = String(q.get("de") || "").toLowerCase(), amigo = String(q.get("amigo") || "").toUpperCase();
        try {
            if (/^[a-z0-9-]{1,20}$/.test(de)) sessionStorage.setItem(CLAVE + "de", de);
            if (/^[A-Z0-9]{4,8}$/.test(amigo)) { sessionStorage.setItem(CLAVE + "amigo", amigo); sessionStorage.setItem(CLAVE + "de", "amigo"); }
        } catch (e) {}
    })();
    let club = Object.assign({ pedidos: 0, codigo: "", amigoUsado: false }, leer("club", {}));
    if (!/^[A-Z0-9]{6}$/.test(club.codigo || "")) {
        const letras = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
        club.codigo = Array.from({ length: 6 }, () => letras[Math.floor(Math.random() * letras.length)]).join("");
        guardar("club", club);
    }
    // El código del amigo que lo invitó, si este es su primer pedido en este celular
    const amigoQueInvito = () => {
        const a = leerSesion("amigo", "");
        return CLUB && CLUB.amigo && a && a !== club.codigo && !club.amigoUsado && !club.pedidos ? a : "";
    };
    const sellosHTML = n => `<span class="sellos" aria-hidden="true">${Array.from({ length: CLUB.meta }, (_, i) => `<i class="${i < n ? "on" : ""}"></i>`).join("")}</span>`;

    const PAGOS = [
        { id: "efectivo", nombre: "Efectivo", icono: "billete" },
        { id: "transferencia", nombre: "Transferencia", icono: "banco" },
        { id: "mercadoPago", nombre: "Mercado Pago", icono: "tarjeta" }
    ].filter(m => (L.pagos || {})[m.id] && L.pagos[m.id].activo !== false).map(m => Object.assign(m, L.pagos[m.id]));

    let carrito = leer("carrito", []).filter(it => productos[it.id] && disponible(productos[it.id]) && it.cant > 0);
    let datos = Object.assign({ modo: "", zona: "", nombre: "", tel: "", direccion: "", ref: "", pago: "", paga: "", nota: "" }, MULTI ? { sucursal: "" } : {}, leer("datos", {}));
    datos.hora = ""; // el horario del encargo no se recuerda de un pedido a otro
    if (MULTI) {
        // Con varias sucursales: la sucursal y la zona tienen que ir juntas (una zona la atiende una sucursal)
        const par = (z, s) => PARES.find(p => p.zona.nombre === z && (!s || p.suc.id === s));
        if (PAG.zona && par(PAG.zona)) { const p = par(PAG.zona, datos.sucursal) || par(PAG.zona); datos.zona = p.zona.nombre; datos.sucursal = p.suc.id; } // página de una localidad
        if (!sucPorId(datos.sucursal)) datos.sucursal = "";
        if (datos.zona && !par(datos.zona, datos.sucursal)) datos.zona = "";
        usarSuc(sucPorId(datos.sucursal));
        if (!((datos.modo === "delivery" && PUEDE_DEL) || (datos.modo === "retiro" && PUEDE_RET))) datos.modo = PUEDE_DEL ? "delivery" : "retiro";
        if (datos.modo === "delivery" && !datos.zona) { datos.sucursal = ""; usarSuc(null); }
        if (datos.modo === "retiro" && ACT && !ACT.RET.activo) { datos.sucursal = ""; usarSuc(null); }
    } else {
        if (PAG.zona) datos.zona = PAG.zona; // en la página de una localidad, esa zona ya viene elegida
        if (!ZONAS.some(z => z.nombre === datos.zona)) datos.zona = ZONAS.length === 1 ? ZONAS[0].nombre : "";
        if (!((datos.modo === "delivery" && DEL.activo) || (datos.modo === "retiro" && RET.activo))) datos.modo = DEL.activo ? "delivery" : "retiro";
    }
    if (!PAGOS.some(m => m.id === datos.pago)) datos.pago = "";

    const unidades = () => suma(carrito, it => it.cant);
    const enCarrito = id => suma(carrito.filter(it => it.id === id), it => it.cant);
    const claveItem = it => it.id + "|" + JSON.stringify(it.sel || {}) + "|" + (it.nota || "");
    const topeDe = p => (p.stock === undefined ? 99 : p.stock);
    const zonaActual = () => ZONAS.find(z => z.nombre === datos.zona) || null;

    function agregar(it) {
        const p = productos[it.id];
        const lugar = topeDe(p) - enCarrito(p.id);
        const cant = Math.min(it.cant, lugar);
        if (cant <= 0) return false;
        const igual = carrito.find(x => claveItem(x) === claveItem(it));
        if (igual) igual.cant += cant; else carrito.push({ id: it.id, sel: it.sel || {}, nota: it.nota || "", cant });
        medir("add_to_cart", { currency: "ARS", value: precioUnidad(it) * cant, items: [{ item_id: p.id, item_name: p.nombre, quantity: cant }] });
        if (navigator.vibrate) { try { navigator.vibrate(25); } catch (e) {} }
        alCambiar();
        avisar(`Agregaste ${cant > 1 ? cant + " × " : ""}${p.nombre}`);
        return true;
    }
    function cambiar(indice, delta) {
        const it = carrito[indice];
        if (!it) return;
        if (delta > 0 && enCarrito(it.id) >= topeDe(productos[it.id])) return;
        it.cant += delta;
        carrito = carrito.filter(x => x.cant > 0);
        alCambiar();
    }

    const promosDeHoy = () => { const d = ahoraLocal().dia; return (L.promos || []).filter(p => !p.dias || p.dias.includes(d)); };
    function totales() {
        const lineas = carrito.map(it => ({ it, p: productos[it.id], total: precioUnidad(it) * it.cant }));
        const subtotal = suma(lineas, l => l.total);
        const descuentos = [], pistas = [];
        promosDeHoy().forEach(pr => {
            const mias = lineas.filter(l => (!pr.categorias || pr.categorias.includes(l.p.cat)) && (!pr.productos || pr.productos.includes(l.p.id)));
            if (pr.tipo === "porcentaje") {
                const base = suma(mias, l => l.total);
                if (base) descuentos.push({ titulo: pr.titulo, monto: Math.round(base * pr.valor / 100) });
            } else if (pr.tipo === "cantidad") {
                const u = suma(mias, l => l.it.cant);
                const veces = Math.floor(u / pr.cada);
                if (veces) descuentos.push({ titulo: pr.titulo, monto: veces * pr.descuento });
                if (u && u % pr.cada === pr.cada - 1) pistas.push(`Sumá 1 más y ahorrás ${pesos(pr.descuento)} (${pr.titulo})`);
            }
        });
        const invito = amigoQueInvito();
        if (invito && subtotal) {
            const base = subtotal - suma(descuentos, d => d.monto);
            if (base > 0) descuentos.push({ titulo: `${CLUB.amigo}% menos por invitación de un amigo`, monto: Math.round(base * CLUB.amigo / 100), amigo: invito });
        }
        const neto = subtotal - suma(descuentos, d => d.monto);
        const zona = zonaActual();
        const esDelivery = datos.modo === "delivery";
        let envio = null, envioGratis = false; // null = todavía no eligió zona
        if (!esDelivery) envio = 0;
        else if (zona) {
            envio = zona.costo || 0;
            if (DEL.gratisDesde && neto >= DEL.gratisDesde) { envioGratis = envio > 0; envio = 0; }
        }
        const minimo = esDelivery ? ((zona && zona.minimo != null) ? zona.minimo : (DEL.minimo || 0)) : 0;
        const falta = Math.max(0, minimo - neto);
        const medio = PAGOS.find(m => m.id === datos.pago);
        const descPago = medio && medio.descuento ? Math.round(neto * medio.descuento / 100) : 0;
        if (esDelivery && DEL.gratisDesde && zona && zona.costo && !envioGratis && neto > 0 && DEL.gratisDesde - neto <= DEL.gratisDesde * 0.35) {
            pistas.push(`Te faltan ${pesos(DEL.gratisDesde - neto)} para el envío gratis`);
        }
        return { lineas, subtotal, descuentos, neto, envio, envioGratis, minimo, falta, medio, descPago, total: neto - descPago + (envio || 0), pistas };
    }

    /* =====================================================================
       PANTALLA PRINCIPAL
       ===================================================================== */
    const iniciales = L.nombre.split(/\s+/).filter(w => /^[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(w) && w.length > 2).map(w => w[0]).join("").slice(0, 2).toUpperCase() || L.nombre.slice(0, 2).toUpperCase();
    const logoHTML = () => L.logo ? `<img class="logo" src="${esc(L.logo)}" alt="">` : `<span class="logo logo-txt" aria-hidden="true">${esc(iniciales)}</span>`;
    const sinTildes = t => String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    const precioHTML = p => { const d = precioDesde(p); return `${d.desde ? "<small>Desde</small> " : ""}${pesos(d.base)}`; };
    let letraGrande = false;
    try { letraGrande = localStorage.getItem("sa:letra") === "1"; } catch (e) {}

    function bannersPromo() {
        const hoy = ahoraLocal().dia;
        const lista = (L.promos || []).map(p => ({
            titulo: p.titulo, detalle: p.detalle || "",
            pie: p.dias ? (p.dias.includes(hoy) ? "Hoy" : "Los " + p.dias.map(d => DIAS[d].replace(/([^s])$/, "$1s")).join(" y ")) : "Todos los días",
            activa: !p.dias || p.dias.includes(hoy), ir: (p.categorias || [])[0] || (p.productos ? productos[p.productos[0]].cat : "")
        }));
        PAGOS.filter(m => m.descuento).forEach(m => lista.push({ titulo: `${m.descuento}% menos pagando ${m.id === "efectivo" ? "en efectivo" : "con " + m.nombre.toLowerCase()}`, detalle: "Se descuenta solo al elegir cómo pagás", pie: "Todos los días", activa: true, ir: "" }));
        if (DEL.activo && DEL.gratisDesde) lista.push({ titulo: "Envío gratis", detalle: `En pedidos desde ${pesos(DEL.gratisDesde)}`, pie: "Todos los días", activa: true, ir: "" });
        return lista;
    }

    // Portada: la foto del local si la hay ("portada" en la configuración).
    // Si no, el color de marca con tres platos de la carta.
    function portadaHTML() {
        if (L.portada) return `<img src="${esc(L.portada)}" alt="">`;
        const todos = Object.values(productos).filter(p => (p.dibujo || p.foto) && disponible(p));
        const tres = todos.filter(p => p.destacado).concat(todos.filter(p => !p.destacado)).slice(0, 3);
        return `<div class="platos" aria-hidden="true">${tres.map(p => `<span class="plato">${imagenDe(p)}</span>`).join("")}</div>`;
    }

    function filaProducto(p) {
        const ok = disponible(p), img = imagenDe(p);
        return `
        <article class="prod${ok ? "" : " agotado"}" data-id="${esc(p.id)}" data-busca="${esc(sinTildes(p.nombre + " " + (p.desc || "")))}">
            <button type="button" class="prod-abrir" data-abrir="${esc(p.id)}" ${ok ? "" : "disabled"}>
                <span class="prod-txt">
                    ${p.etiqueta ? `<span class="prod-etq">${esc(p.etiqueta)}</span>` : ""}
                    <span class="prod-nom">${esc(p.nombre)}</span>
                    ${p.desc ? `<span class="prod-desc">${esc(p.desc)}</span>` : ""}
                    <span class="prod-precio">${precioHTML(p)}${ok && p.stock !== undefined && p.stock <= 3 ? `<em class="quedan">${p.stock === 1 ? "Queda 1" : "Quedan " + p.stock}</em>` : ""}</span>
                </span>
                ${img ? `<span class="prod-img">${img}</span>` : ""}
            </button>
            <span class="prod-acc" data-acc="${esc(p.id)}"></span>
        </article>`;
    }
    const tarjetaProducto = p => `
        <article class="tarjeta" data-id="${esc(p.id)}">
            <button type="button" class="tarjeta-abrir" data-abrir="${esc(p.id)}">
                <span class="tarjeta-img">${imagenDe(p)}</span>
                <span class="tarjeta-nom">${esc(p.nombre)}</span>
                <span class="tarjeta-precio">${precioHTML(p)}</span>
            </button>
            <span class="prod-acc" data-acc="${esc(p.id)}"></span>
        </article>`;

    /* ---------- Delivery o retiro, y la zona (arriba de todo y otra vez en el pedido) ---------- */
    function entregaHTML(donde) {
        const z = zonaActual(), esDel = datos.modo === "delivery";
        const fila = (icono, titulo, detalle, accion, falta, que) => {
            const dentro = `<span class="entrega-ico">${ico(icono)}</span><span class="entrega-txt"><strong>${titulo}</strong><span>${detalle}</span></span>${accion ? `<span class="entrega-accion">${accion}</span>` : ""}`;
            return accion ? `<button type="button" class="entrega-fila${falta ? " falta" : ""}" ${que || "data-zonas"}>${dentro}</button>` : `<div class="entrega-fila">${dentro}</div>`;
        };
        let html = "";
        if (MULTI ? (PUEDE_DEL && PUEDE_RET) : (DEL.activo && RET.activo)) html += `
            <div class="modo" role="radiogroup" aria-label="¿Cómo lo querés?">
                <label><input type="radio" name="modo-${donde}" value="delivery" ${esDel ? "checked" : ""}><span>${ico("moto")} ${L.simple ? "Que me lo lleven" : "Delivery"}</span></label>
                <label><input type="radio" name="modo-${donde}" value="retiro" ${esDel ? "" : "checked"}><span>${ico("tienda")} ${L.simple ? "Paso a buscarlo" : MULTI ? "Retiro en sucursal" : "Retiro en el local"}</span></label>
            </div>`;
        // Delivery sin localidad elegida: las localidades a la vista, un toque y listo
        const opciones = MULTI ? LOCALIDADES.map(p => p.zona) : ZONAS;
        if (esDel && !z && opciones.length && opciones.length <= 24) {
            const costos = Array.from(new Set(opciones.map(o => o.costo || 0)));
            const igual = costos.length === 1;
            html += `
            <div class="localidades">
                <p class="localidades-tit">${ico("pin")}<strong>¿A qué localidad te lo llevamos?</strong></p>
                <div class="localidades-lista">${opciones.map((o, i) => `<button type="button" data-loc="${i}">${esc(o.nombre)}${igual ? "" : `<small>${o.costo ? pesos(o.costo) : "Gratis"}</small>`}</button>`).join("")}</div>
                <p class="localidades-pie">${igual ? `Envío ${costos[0] ? pesos(costos[0]) : "gratis"} a cualquiera de estas localidades.` : "El precio debajo de cada una es el costo de envío."}${DEL.demora ? ` Llega en ${esc(DEL.demora)}.` : ""}</p>
            </div>`;
            return html;
        }
        if (MULTI) { // la zona (delivery) o la sucursal (retiro) deciden a qué WhatsApp va el pedido
            if (!esDel) {
                if (!ACT) html += fila("tienda", "¿En qué sucursal retirás?", "Elegí dónde pasás a buscar tu pedido.", "Elegir", true, "data-sucs");
                else html += fila("tienda", `Retirás en ${esc(ACT.nombre)}`, `${esc(dirDe(ACT))}. ${RET.demora ? `Listo en ${esc(RET.demora)}. ` : ""}Sin costo de envío ni pedido mínimo.`, "Cambiar", false, "data-sucs");
            } else if (!z) html += fila("pin", "¿A dónde te lo llevamos?", "Elegí tu zona: te asignamos la sucursal que te lo lleva.", "Elegir", true);
            else {
                const min = z.minimo != null ? z.minimo : (DEL.minimo || 0);
                html += fila("pin", `Envío a ${esc(z.nombre)}: ${z.costo ? pesos(z.costo) : "gratis"}`, `${DEL.demora ? `Llega en ${esc(DEL.demora)}. ` : ""}${min ? `Pedido mínimo ${pesos(min)}. ` : ""}Lo prepara ${esc(ACT.nombre.replace(/^Sucursal /, "la sucursal "))}.`, "Cambiar");
            }
            return html;
        }
        if (!esDel) html += fila("tienda", `Retirás en ${esc(L.direccion || "el local")}`, `${RET.demora ? `Listo en ${esc(RET.demora)}. ` : ""}Sin costo de envío ni pedido mínimo.`);
        else if (!ZONAS.length) html += fila("moto", `Delivery${DEL.demora ? " en " + esc(DEL.demora) : ""}`, DEL.minimo ? `Pedido mínimo ${pesos(DEL.minimo)}.` : "Te lo llevamos a tu casa.");
        else if (!z) html += fila("pin", "¿A dónde te lo llevamos?", "Elegí tu zona para ver el costo de envío.", "Elegir", true);
        else {
            const min = z.minimo != null ? z.minimo : (DEL.minimo || 0);
            html += fila("pin", `Envío a ${esc(z.nombre)}: ${z.costo ? pesos(z.costo) : "gratis"}`, `${DEL.demora ? `Llega en ${esc(DEL.demora)}. ` : ""}${min ? `Pedido mínimo ${pesos(min)}.` : ""}`, "Cambiar");
        }
        return html;
    }
    function enlazarEntrega(cont, donde) {
        $$(`input[name="modo-${donde}"]`, cont).forEach(r => r.addEventListener("change", () => {
            cambiarModo(r.value); guardar("datos", datos);
            pintarCab(); pintarBarra();
            if (vista === "pedido") pintarPedido();
        }));
        const b = $("[data-zonas]", cont);
        if (b) b.addEventListener("click", () => abrirZonas(donde === "ped"));
        $$("[data-loc]", cont).forEach(x => x.addEventListener("click", () => {
            const i = Number(x.dataset.loc);
            if (MULTI) { const p = LOCALIDADES[i]; if (!p) return; datos.zona = p.zona.nombre; datos.sucursal = p.suc.id; usarSuc(p.suc); }
            else { const zz = ZONAS[i]; if (!zz) return; datos.zona = zz.nombre; }
            datos.modo = "delivery";
            guardar("datos", datos);
            pintarCab(); pintarBarra();
            if (vista === "pedido") pintarPedido();
        }));
        const s = $("[data-sucs]", cont);
        if (s) s.addEventListener("click", () => abrirSucursales(donde === "ped"));
    }
    function pintarEntregaCab() {
        const c = $("[data-entrega]", raiz);
        if (!c) return;
        c.innerHTML = entregaHTML("cab");
        enlazarEntrega(c, "cab");
    }
    // Delivery o retiro. Con varias sucursales, mantiene la sucursal solo si sirve para lo nuevo
    function cambiarModo(modo) {
        datos.modo = modo;
        if (!MULTI) return;
        if (modo === "delivery" && !(ACT && datos.zona && PARES.some(p => p.zona.nombre === datos.zona && p.suc === ACT))) { datos.sucursal = ""; datos.zona = ""; usarSuc(null); }
        if (modo === "retiro" && ACT && !ACT.RET.activo) { datos.sucursal = ""; usarSuc(null); }
    }
    // Lo que depende de la sucursal elegida: el cartel de abierto, los datos rápidos, la entrega y el envío gratis
    function pintarCab() {
        const e = estado(), est = $(".estado", raiz);
        if (est) {
            est.className = "estado " + (e.abierto ? "abierto" : "cerrado");
            $("strong", est).textContent = e.abierto ? "Abierto" : "Cerrado";
            $("span:nth-of-type(2)", est).textContent = textoEstado(e);
        }
        const dr = $(".datos-rapidos", raiz);
        if (dr) dr.innerHTML = datosRapidos();
        pintarEntregaCab();
        pintarPromos();
        pintarPasos();
    }

    /* ---------- Modo simple (para quien nunca pidió online): pasos a la vista y ayuda por teléfono ---------- */
    function pintarPasos() {
        const ol = $("[data-pasos]", raiz);
        if (!ol) return;
        const hecho1 = datos.modo === "delivery" ? !!zonaActual() : (MULTI ? !!ACT : true);
        const hecho2 = unidades() > 0;
        const lista = [
            ["Elegí cómo lo recibís", hecho1],
            ["Elegí qué querés", hecho2],
            ["Mandá el pedido", false]
        ];
        const actual = lista.findIndex(x => !x[1]);
        ol.innerHTML = lista.map((x, i) => `<li class="${x[1] ? "hecho" : i === actual ? "actual" : ""}"><b>${x[1] ? ico("ok") : i + 1}</b><span>${x[0]}</span></li>`).join("");
    }
    function abrirAyuda() {
        const lista = (MULTI ? LISTA : [UNICA]).map(s => ({ nombre: MULTI ? s.nombre : L.nombre, tel: s.telefono || L.telefono || "" })).filter(x => x.tel);
        const unicos = lista.filter((x, i) => lista.findIndex(y => y.tel === x.tel) === i);
        const mostrar = unicos.length === 1 ? [{ nombre: L.nombre, tel: unicos[0].tel }] : lista;
        abrirHoja("ayuda", `${cabHoja("¿Necesitás ayuda?")}
            <div class="hoja-cuerpo">
                <p class="ayuda-txt">Si no podés pedir desde acá, llamanos y te tomamos el pedido por teléfono.</p>
                ${mostrar.map(x => `<a class="btn btn-marca ayuda-tel" href="tel:${esc(x.tel.replace(/[^\d+]/g, ""))}" ${L.demo ? 'data-demo-aviso="En tu local, llama directo al teléfono"' : ""}>${ico("tel")}<span>Llamar${mostrar.length > 1 ? " a " + esc(x.nombre) : " ahora"}</span></a>`).join("")}
                ${L.demo ? `<p class="demo-explica">En la demo el botón no llama. En tu local, un toque y llama.</p>` : ""}
            </div>
            <div class="flota" role="status" aria-live="polite" hidden></div>
            <div class="hoja-pie"><button type="button" class="btn btn-linea" data-cerrar>Volver</button></div>`);
        $$("[data-demo-aviso]", hojaEl()).forEach(a => a.addEventListener("click", ev => { ev.preventDefault(); avisar(a.dataset.demoAviso); }));
    }

    /* Información del local: se usa en la hoja de "Info del local" (arriba) y al pie de la página (para Google) */
    // Con varias sucursales: una tarjeta por sucursal (dirección, horarios, delivery, WhatsApp), y los pagos
    function infoSucursales() {
        const hoy = ahoraLocal().dia;
        // Una lista corta: cada sucursal en una fila (nombre, dirección y si está abierta); al tocarla se despliega lo demás
        const fila = s => {
            const e = estadoDe(s);
            const zonas = s.DEL.activo ? s.ZONAS : [];
            return `
                <details class="suc-fila">
                    <summary>
                        <span class="suc-punto ${e.abierto ? "abierto" : "cerrado"}" aria-hidden="true"></span>
                        <span class="suc-txt"><strong>${esc(s.nombre.replace(/^Sucursal /, ""))}</strong><small>${esc(s.direccion || "")} · ${e.abierto ? (e.cierra ? "Abierto hasta las " + e.cierra : "Abierto") : esc(textoAbre(e))}</small></span>
                        ${ico("sig")}
                    </summary>
                    <div class="suc-mas">
                        <dl class="horas">
                            ${[1, 2, 3, 4, 5, 6, 0].map(d => `<div class="${d === hoy ? "hoy" : ""}${franjas(d, s.horarios).length ? "" : " cerrado"}"><dt>${d === hoy ? "Hoy" : DIAS[d]}</dt><dd>${franjas(d, s.horarios).length ? franjas(d, s.horarios).map(f => f.ini + " a " + f.fin).join(" y ") : "Cerrado"}</dd></div>`).join("")}
                        </dl>
                        <p class="suc-nota">${s.RET.activo ? "Retiro en el local" + (s.RET.demora ? ", listo en " + esc(s.RET.demora) : "") + ". " : ""}${zonas.length ? "Delivery a " + zonas.map(z => esc(z.nombre)).join(", ") + "." : "Sin delivery."}</p>
                        <div class="info-btns">
                            ${s.direccion ? `<a class="btn btn-linea chico" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(dirDe(s))}" target="_blank" rel="noopener" ${L.demo ? 'data-demo-aviso="En tu local, abre Google Maps con la dirección de la sucursal"' : ""}>${ico("pin")}Cómo llegar</a>` : ""}
                            ${s.whatsapp ? `<a class="btn btn-linea chico" href="https://wa.me/${esc(s.whatsapp)}?text=${encodeURIComponent("Hola! Tengo una consulta")}" target="_blank" rel="noopener" ${L.demo ? 'data-demo-aviso="En tu local, abre el WhatsApp de la sucursal para consultas"' : ""}>${ICO_WA}WhatsApp</a>` : ""}
                        </div>
                    </div>
                </details>`;
        };
        const abiertas = LISTA.filter(x => estadoDe(x).abierto).length;
        return `
            <section class="caja caja-sucs">
                <h3>Nuestras ${LISTA.length} sucursales</h3>
                <p class="suc-nota">${abiertas === LISTA.length ? "Todas abiertas ahora." : abiertas ? `${abiertas} abiertas ahora.` : "Ahora están todas cerradas."} Tocá una para ver horarios y cómo llegar.</p>
                ${LISTA.map(fila).join("")}
            </section>
            ${PAGOS.length ? `
            <section class="caja caja-pago">
                <h3>Medios de pago</h3>
                <ul class="info-pagos">${PAGOS.map(m => `<li>${ico(m.icono)}<span>${esc(m.nombre)}</span>${m.descuento ? `<em>${m.descuento}% menos</em>` : ""}</li>`).join("")}</ul>
            </section>` : ""}
            ${L.instagram ? `<section class="caja"><a class="info-ig" href="https://www.instagram.com/${esc(L.instagram)}/" target="_blank" rel="noopener" ${L.demo ? 'data-demo-aviso="En tu local, abre tu Instagram"' : ""}>${ico("ig")}<span>Seguinos en Instagram: <b>@${esc(L.instagram)}</b></span></a></section>` : ""}`;
    }
    function infoCajas() {
        if (MULTI) return infoSucursales();
        const e = estado(), hoy = ahoraLocal().dia;
        return `
            <section class="caja caja-hora">
                <div class="info-estado ${e.abierto ? "abierto" : "cerrado"}">
                    <span class="info-ico">${ico("reloj")}</span>
                    <p><strong>${e.abierto ? "Abierto ahora" : "Cerrado ahora"}</strong><span>${e.abierto ? (e.cierra ? "Cierra a las " + e.cierra : "Recibiendo pedidos") : esc(textoAbre(e))}</span></p>
                </div>
                <details class="info-semana">
                    <summary>Ver todos los horarios ${ico("sig")}</summary>
                    <dl class="horas">
                        ${[1, 2, 3, 4, 5, 6, 0].map(d => `<div class="${d === hoy ? "hoy" : ""}${franjas(d).length ? "" : " cerrado"}"><dt>${d === hoy ? "Hoy" : DIAS[d]}</dt><dd>${franjas(d).length ? franjas(d).map(f => f.ini + " a " + f.fin).join(" y ") : "Cerrado"}</dd></div>`).join("")}
                    </dl>
                </details>
            </section>
            ${DEL.activo ? `
            <section class="caja caja-envio">
                <h3>Delivery</h3>
                ${DEL.demora || DEL.minimo ? `<p class="info-sub">${[DEL.demora ? "Llega en " + esc(DEL.demora) : "", DEL.minimo ? "Pedido mínimo " + pesos(DEL.minimo) : ""].filter(Boolean).map(t => `<span>${t}</span>`).join(" · ")}</p>` : ""}
                ${DEL.gratisDesde ? `<p class="info-chips"><span class="ok">${ico("moto")}Envío gratis desde ${pesos(DEL.gratisDesde)}</span></p>` : ""}
                ${ZONAS.length ? `<ul class="zonas">
                    ${ZONAS.map(z => {
                        const url = (PAG.paginas || {})[z.nombre];
                        const dentro = `<span class="zona-nom">${esc(z.nombre)}</span><strong${z.costo ? "" : ' class="gratis"'}>${z.costo ? pesos(z.costo) : "Gratis"}</strong>`;
                        return `<li>${url ? `<a class="zona" href="${esc(url)}">${dentro}${ico("sig")}</a>` : `<span class="zona">${dentro}</span>`}</li>`;
                    }).join("")}
                </ul>` : ""}
            </section>` : ""}
            ${PAGOS.length ? `
            <section class="caja caja-pago">
                <h3>Medios de pago</h3>
                <ul class="info-pagos">${PAGOS.map(m => `<li>${ico(m.icono)}<span>${esc(m.nombre)}</span>${m.descuento ? `<em>${m.descuento}% menos</em>` : ""}</li>`).join("")}</ul>
            </section>` : ""}
            <section class="caja caja-dir">
                <h3>${RET.activo ? "Dónde retirar" : "Dónde estamos"}</h3>
                <p class="pie-dir">${ico("pin")}<span>${esc(L.direccion || "")}${L.ciudad ? ", " + esc(L.ciudad) : ""}${RET.activo && RET.demora ? `<small>Listo para retirar en ${esc(RET.demora)}</small>` : ""}</span></p>
                <div class="info-btns">
                    ${L.direccion ? `<a class="btn btn-linea chico" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((L.direccion || "") + (L.ciudad ? ", " + L.ciudad : ""))}" target="_blank" rel="noopener" ${L.demo ? 'data-demo-aviso="En tu local, abre Google Maps con tu dirección"' : ""}>${ico("pin")}Cómo llegar</a>` : ""}
                    ${L.whatsapp ? `<a class="btn btn-linea chico" href="https://wa.me/${esc(L.whatsapp)}?text=${encodeURIComponent("Hola! Tengo una consulta")}" target="_blank" rel="noopener" ${L.demo ? 'data-demo-aviso="En tu local, abre tu WhatsApp para consultas"' : ""}>${ICO_WA}WhatsApp</a>` : ""}
                </div>
                ${L.instagram ? `<a class="info-ig" href="https://www.instagram.com/${esc(L.instagram)}/" target="_blank" rel="noopener" ${L.demo ? 'data-demo-aviso="En tu local, abre tu Instagram"' : ""}>${ico("ig")}<span>Seguinos en Instagram: <b>@${esc(L.instagram)}</b></span></a>` : ""}
            </section>`;
    }
    // Lo que el cliente quiere saber antes de pedir, en una línea
    function datosRapidos() {
        const p = [];
        if (MULTI && !ACT) { // todavía no eligió sucursal: lo general de todas juntas
            p.push(`${ico("tienda")}${LISTA.length} sucursales`);
            if (PUEDE_DEL) {
                const min = Math.min.apply(null, PARES.map(x => x.zona.costo || 0));
                p.push(PUEDE_RET ? "Delivery y retiro" : "Delivery");
                p.push(min ? `Envío desde ${pesos(min)}` : "Envío gratis en algunas zonas");
            } else p.push("Solo retiro en sucursal");
            return p.map(t => `<span>${t}</span>`).join('<i aria-hidden="true">·</i>');
        }
        if (MULTI) p.push(`${ico("tienda")}${esc(ACT.nombre)}`);
        if (DEL.activo) {
            if (DEL.demora) p.push(`${ico("moto")}${esc(DEL.demora)}`);
            if (ZONAS.length) { const min = Math.min.apply(null, ZONAS.map(z => z.costo || 0)); p.push(min ? `Envío desde ${pesos(min)}` : "Envío gratis en algunas zonas"); }
            if (DEL.minimo) p.push(`Mínimo ${pesos(DEL.minimo)}`);
        } else if (RET.activo) {
            p.push(`${ico("tienda")}Solo retiro en el local`);
            if (RET.demora) p.push(`Listo en ${esc(RET.demora)}`);
        }
        return p.map(t => `<span>${t}</span>`).join('<i aria-hidden="true">·</i>');
    }
    function abrirInfo() {
        abrirHoja("info", `${cabHoja("Información del local")}
            <div class="hoja-cuerpo info-hoja">${infoCajas()}</div>
            <div class="flota" role="status" aria-live="polite" hidden></div>`);
        const h = hojaEl();
        $$("[data-demo-aviso]", h).forEach(a => a.addEventListener("click", ev => { ev.preventDefault(); avisar(a.dataset.demoAviso); }));
    }

    const promoHTML = p => `
                <${p.ir ? `button type="button" data-ir="cat-${esc(p.ir)}"` : "div"} class="promo${p.activa ? "" : " otra"}">
                    <span class="promo-ico">${ico("etiqueta")}</span>
                    <span class="promo-txt"><strong>${esc(p.titulo)}</strong><span class="promo-det">${esc(p.detalle)}</span><span class="promo-pie">${esc(p.pie)}</span></span>
                </${p.ir ? "button" : "div"}>`;
    // Con varias sucursales, el envío gratis depende de la sucursal: la franja se vuelve a armar al elegir
    function franjaPromos() {
        const promos = bannersPromo();
        if (!promos.length && !MULTI) return "";
        return `
        <section class="franja" aria-label="Promos"${MULTI ? " data-promos" : ""}${promos.length ? "" : " hidden"}>
            <h2>Promos</h2>
            <div class="fila-x">
                ${promos.map(promoHTML).join("")}
            </div>
        </section>`;
    }
    // Tarjeta del club debajo de las promos: cuántos sellos lleva este cliente
    function clubHTML() {
        if (!CLUB) return "";
        const n = club.pedidos % CLUB.meta, lleno = club.pedidos > 0 && n === 0;
        const invito = amigoQueInvito();
        return `
        <section class="club" aria-label="Club de clientes">
            ${invito ? `<p class="club-amigo">${ico("etiqueta")}<span><strong>Te invitó un amigo:</strong> tenés ${CLUB.amigo}% menos en tu primer pedido. Se descuenta solo.</span></p>` : ""}
            <div class="club-caja">
                <div class="club-txt">
                    <strong>Club ${esc(L.nombre)}</strong>
                    <span>${!club.pedidos ? `Juntá ${CLUB.meta} pedidos y te llevás ${esc(CLUB.premio)}.` : lleno ? `¡Completaste la tarjeta! Ganaste ${esc(CLUB.premio)}: avisanos en tu próximo pedido.` : `Llevás ${n} de ${CLUB.meta} sellos. Te faltan ${CLUB.meta - n} para ${esc(CLUB.premio)}.`}</span>
                </div>
                ${sellosHTML(lleno ? CLUB.meta : n)}
            </div>
        </section>`;
    }
    const enlazarIr = ctx => $$("[data-ir]", ctx).forEach(b => b.addEventListener("click", () => { const d = document.getElementById(b.dataset.ir); if (d) d.scrollIntoView({ behavior: "smooth", block: "start" }); }));
    function pintarPromos() {
        const viejo = MULTI && $("[data-promos]", raiz);
        if (!viejo) return;
        viejo.outerHTML = franjaPromos();
        enlazarIr($("[data-promos]", raiz));
    }

    function montar() {
        const e = estado();
        const destacados = Object.values(productos).filter(p => p.destacado && disponible(p));
        const sitio = PAG.sitio || "../../index.html";
        const hoy = ahoraLocal().dia;

        raiz.innerHTML = `
        ${L.demo && !EMBEBIDO && !/[?&]pub=1/.test(location.search) ? (L.demoPara ? `
        <div class="cinta cinta-para" role="note">
            <span class="cinta-txt"><strong>Demo preparada para ${esc(L.demoPara)} por Santa Automatiza</strong><span class="cinta-sub">${esc(L.demoNota || "Los precios, direcciones y horarios son de ejemplo.")}</span></span>
        </div>` : `
        <div class="cinta" role="note">
            <span class="cinta-txt"><strong>Demo.</strong> Probala como si fuera tu local.</span>
            <a class="cinta-cta" href="${esc(sitio)}#planes">Quiero la mía</a>
        </div>`) : ""}
        <header class="cab">
            <div class="cab-portada">
                ${portadaHTML()}
                <button type="button" class="cab-letra" data-letra aria-pressed="false"><b aria-hidden="true">Aa</b><span>Letra grande</span></button>
            </div>
            <div class="cab-info">
                ${logoHTML()}
                <div class="cab-nombre">
                    ${PAG.h1 ? `<p class="cab-marca">${esc(L.nombre)}</p><h1>${esc(PAG.h1)}</h1>` : `<h1>${esc(L.nombre)}</h1>`}
                    <p class="cab-lema">${esc(PAG.intro || L.lema || "")}</p>
                </div>
            </div>
            ${L.simple ? `<ol class="pasos" data-pasos aria-label="Pasos para pedir"></ol>` : ""}
            <button type="button" class="estado ${e.abierto ? "abierto" : "cerrado"}" data-info aria-haspopup="dialog">
                <span class="estado-punto" aria-hidden="true"></span>
                <strong>${e.abierto ? "Abierto" : "Cerrado"}</strong>
                <span>${textoEstado(e)}</span>
                <span class="estado-mas">Info del local${ico("sig")}</span>
            </button>
            <p class="datos-rapidos">${datosRapidos()}</p>
            ${L.demo ? `<button type="button" class="sim" data-sim></button>` : ""}
            <div class="entrega" data-entrega></div>
            ${L.simple ? `<button type="button" class="ayuda" data-ayuda>${ico("tel")}<span>¿Necesitás ayuda? Llamanos</span></button>` : ""}
            <div class="buscar">
                <label class="buscar-caja">
                    ${ico("lupa")}
                    <input type="search" id="buscar" placeholder="Buscar en la carta" autocomplete="off" enterkeyhint="search" aria-label="Buscar en la carta">
                    <button type="button" class="buscar-x" data-borrar aria-label="Borrar la búsqueda" hidden>${ico("x")}</button>
                </label>
            </div>
        </header>

        ${franjaPromos()}

        ${clubHTML()}

        ${destacados.length ? `
        <section class="franja" aria-label="Los más pedidos">
            <h2>Los más pedidos</h2>
            <div class="fila-x">${destacados.map(tarjetaProducto).join("")}</div>
        </section>` : ""}

        <nav class="cats" aria-label="Categorías">
            ${L.categorias.map((c, i) => `<a href="#cat-${esc(c.id)}" class="${i ? "" : "activa"}" data-cat="${esc(c.id)}">${esc(c.nombre)}</a>`).join("")}
        </nav>

        <main class="carta">
            ${L.categorias.map(c => `
            <section class="cat" id="cat-${esc(c.id)}">
                <h2>${esc(c.nombre)}</h2>
                ${c.nota ? `<p class="cat-nota">${esc(c.nota)}</p>` : ""}
                <div class="prods">${c.productos.map(filaProducto).join("")}</div>
            </section>`).join("")}
            <p class="sin-result" role="status" hidden></p>
        </main>

        <footer class="pie" id="info">
            <h2>Información del local</h2>
            ${infoCajas()}
            <p class="pie-firma">${L.demoPara ? `Demo preparada para ${esc(L.demoPara)}. ${esc(L.demoNota || "Los productos, precios, direcciones, teléfonos y horarios son de ejemplo y se reemplazan por los reales.")}` : L.demo ? "Local de ejemplo. Los productos, precios y datos no son reales." : `© ${new Date().getFullYear()} ${esc(L.nombre)}.`}
                <a href="${esc(L.firma || "https://santaautomatiza.com")}" ${L.demo && !L.demoPara ? `data-planes` : `target="_blank" rel="noopener"`}>Local online hecho con Santa Automatiza</a></p>
        </footer>

        <div class="flota" role="status" aria-live="polite" hidden></div>
        <div class="barra" hidden>
            <button type="button" class="barra-btn" data-pedido>
                <span class="barra-n"></span>
                <span class="barra-txt">Ver mi pedido</span>
                <span class="barra-total"></span>
            </button>
        </div>
        <dialog class="hoja" aria-label="Pedido"><div class="hoja-caja"></div></dialog>`;
        if (L.simple) { pintarPasos(); const ay = $("[data-ayuda]", raiz); if (ay) ay.addEventListener("click", abrirAyuda); }

        // Navegación
        enlazarIr(raiz);
        $$(".cats a", raiz).forEach(a => a.addEventListener("click", ev => { ev.preventDefault(); document.getElementById("cat-" + a.dataset.cat).scrollIntoView({ behavior: "smooth", block: "start" }); }));
        if ("IntersectionObserver" in window) {
            const io = new IntersectionObserver(ents => ents.forEach(en => {
                if (!en.isIntersecting) return;
                $$(".cats a", raiz).forEach(a => {
                    const act = "cat-" + a.dataset.cat === en.target.id;
                    a.classList.toggle("activa", act);
                    if (act && a.parentElement.scrollWidth > a.parentElement.clientWidth) a.parentElement.scrollTo({ left: a.offsetLeft - 16, behavior: "smooth" });
                });
            }), { rootMargin: "-25% 0px -65% 0px" });
            $$(".cat", raiz).forEach(s => io.observe(s));
        }
        $$("[data-abrir]", raiz).forEach(b => b.addEventListener("click", () => abrirProducto(b.dataset.abrir)));
        $("[data-pedido]", raiz).addEventListener("click", () => abrirPedido());
        $$("[data-planes]", raiz).forEach(a => a.addEventListener("click", ev => { ev.preventDefault(); irAPlanes(); }));
        $("[data-info]", raiz).addEventListener("click", abrirInfo);
        // En las demos, los botones de contacto explican qué hacen en vez de abrir datos inventados
        $$("[data-demo-aviso]", raiz).forEach(a => a.addEventListener("click", ev => { ev.preventDefault(); avisar(a.dataset.demoAviso); }));

        // Demo: simular el local cerrado
        const sim = $("[data-sim]", raiz);
        if (sim) {
            sim.textContent = e.abierto ? "Probá cómo se ve cerrado" : "Volver a abrir la demo";
            sim.addEventListener("click", () => {
                simulado = estado().abierto ? "cerrado" : "abierto";
                try { sessionStorage.setItem(CLAVE + "sim", simulado); } catch (err) {}
                montar();
            });
        }

        // Letra grande
        const letra = $("[data-letra]", raiz);
        const ponerLetra = () => {
            document.documentElement.classList.toggle("letra-grande", letraGrande);
            letra.setAttribute("aria-pressed", String(letraGrande));
            $("span", letra).textContent = letraGrande ? "Letra normal" : "Letra grande";
        };
        ponerLetra();
        letra.addEventListener("click", () => {
            letraGrande = !letraGrande;
            try { localStorage.setItem("sa:letra", letraGrande ? "1" : ""); } catch (err) {}
            ponerLetra();
        });

        // Buscador
        const buscar = $("#buscar", raiz), borrar = $("[data-borrar]", raiz), nada = $(".sin-result", raiz);
        const filtrar = () => {
            const q = sinTildes(buscar.value.trim());
            raiz.classList.toggle("buscando", !!q);
            borrar.hidden = !q;
            let total = 0;
            $$(".cat", raiz).forEach(cat => {
                let n = 0;
                $$(".prod", cat).forEach(pr => { const ve = !q || pr.dataset.busca.includes(q); pr.hidden = !ve; if (ve) n++; });
                cat.hidden = n === 0;
                total += n;
            });
            nada.hidden = total > 0;
            if (!total) nada.innerHTML = `<strong>No encontramos “${esc(buscar.value.trim())}”</strong>Probá con otra palabra o mirá la carta completa.`;
        };
        buscar.addEventListener("input", filtrar);
        borrar.addEventListener("click", () => { buscar.value = ""; filtrar(); buscar.focus(); });

        const hoja = $(".hoja", raiz);
        hoja.addEventListener("click", ev => { if (ev.target === hoja) cerrarHoja(); });
        hoja.addEventListener("close", () => { vista = null; });
        pintarEntregaCab();
        pintarAcciones();
        pintarBarra();
    }

    // Botón "+" o contador (− 2 +) de cada producto de la carta
    function pintarAcciones() {
        $$("[data-acc]", raiz).forEach(caja => {
            const p = productos[caja.dataset.acc];
            const n = enCarrito(p.id);
            const directo = !(p.grupos && p.grupos.length);
            if (!disponible(p)) { caja.innerHTML = `<span class="sin-stock">Agotado</span>`; return; }
            if (directo && n > 0) {
                caja.innerHTML = `<span class="cont"><button type="button" data-d="-1" aria-label="Quitar uno de ${esc(p.nombre)}">${ico("menos")}</button><b>${n}</b><button type="button" data-d="1" aria-label="Sumar uno de ${esc(p.nombre)}" ${n >= topeDe(p) ? "disabled" : ""}>${ico("mas")}</button></span>`;
                $$("button", caja).forEach(b => b.addEventListener("click", () => {
                    if (b.dataset.d === "1") agregar({ id: p.id, cant: 1 });
                    else cambiar(carrito.findIndex(it => it.id === p.id), -1);
                }));
            } else {
                caja.innerHTML = `<button type="button" class="mas${n > 0 ? " con" : ""}" aria-label="Agregar ${esc(p.nombre)}${n > 0 ? ` (ya tenés ${n})` : ""}">${n > 0 ? n : ico("mas")}</button>`;
                $("button", caja).addEventListener("click", () => { if (directo) agregar({ id: p.id, cant: 1 }); else abrirProducto(p.id); });
            }
        });
    }
    function pintarBarra() {
        const barra = $(".barra", raiz);
        const n = unidades();
        barra.hidden = n === 0;
        document.body.classList.toggle("con-barra", n > 0);
        pintarPasos();
        if (!n) return;
        $(".barra-n", barra).textContent = n;
        $(".barra-total", barra).textContent = pesos(totales().neto);
    }
    let avisoT = null;
    function avisar(texto) {
        const h = hojaEl();
        const a = (h && h.open && $(".hoja-caja .flota", h)) || $(".flota", raiz);
        if (!a) return;
        a.innerHTML = `${ico("ok")}<span>${esc(texto)}</span>`;
        a.hidden = false;
        clearTimeout(avisoT);
        avisoT = setTimeout(() => { a.hidden = true; }, 1900);
    }
    function alCambiar() {
        guardar("carrito", carrito);
        pintarAcciones();
        pintarBarra();
        if (vista === "pedido") pintarPedido();
    }

    /* =====================================================================
       HOJAS (producto, zonas, pedido, datos, enviado)
       ===================================================================== */
    let vista = null;
    const hojaEl = () => $(".hoja", raiz);
    function abrirHoja(nombre, html) {
        const h = hojaEl();
        vista = nombre;
        $(".hoja-caja", h).innerHTML = html;
        h.dataset.vista = nombre;
        if (!h.open) { if (h.showModal) h.showModal(); else h.setAttribute("open", ""); }
        const cuerpo = $(".hoja-cuerpo", h); if (cuerpo) cuerpo.scrollTop = 0;
        $$("[data-cerrar]", h).forEach(b => b.addEventListener("click", cerrarHoja));
    }
    function cerrarHoja() { const h = hojaEl(); if (h.open) { if (h.close) h.close(); else h.removeAttribute("open"); } vista = null; }
    const cabHoja = (titulo, atras, paso) => `
        <div class="hoja-cab">
            ${atras ? `<button type="button" class="hoja-x" data-atras aria-label="Volver">${ico("atras")}</button>` : ""}
            <div class="hoja-tit">${paso ? `<p class="hoja-paso">${paso}</p>` : ""}<h2>${titulo}</h2></div>
            <button type="button" class="hoja-x" data-cerrar aria-label="Cerrar">${ico("x")}</button>
        </div>`;

    /* ---------- Zonas ---------- */
    // Después de elegir zona o sucursal: se actualiza todo lo que depende de ella
    function terminarElegir(volverAlPedido) {
        guardar("datos", datos);
        pintarCab(); pintarBarra();
        if (volverAlPedido) abrirPedido(); else cerrarHoja();
    }
    // Con varias sucursales: cada zona va junto a la sucursal que la atiende, y al elegirla queda asignada
    function abrirZonasMulti(volverAlPedido) {
        abrirHoja("zonas", `${cabHoja("¿A qué localidad te lo llevamos?", volverAlPedido)}
            <div class="hoja-cuerpo">
                <p class="demo-explica">Elegí tu localidad. La sucursal más cercana prepara tu pedido.</p>
                <div>${LOCALIDADES.map((p, i) => `
                    <button type="button" class="zona-op${p.zona.nombre === datos.zona ? " on" : ""}" data-p="${i}">
                        <span class="marca-op">${ico("ok")}</span><span>${esc(p.zona.nombre)}</span><strong>${p.zona.costo ? "Envío " + pesos(p.zona.costo) : "Envío gratis"}</strong>
                    </button>`).join("")}</div>
                ${PUEDE_RET ? `<p class="demo-explica">Si tu zona no está en la lista, podés retirar tu pedido en una de nuestras sucursales.</p>` : ""}
            </div>`);
        const h = hojaEl();
        const atras = $("[data-atras]", h);
        if (atras) atras.addEventListener("click", abrirPedido);
        $$("[data-p]", h).forEach(b => b.addEventListener("click", () => {
            const p = LOCALIDADES[Number(b.dataset.p)];
            datos.zona = p.zona.nombre; datos.sucursal = p.suc.id; datos.modo = "delivery";
            usarSuc(p.suc);
            terminarElegir(volverAlPedido);
        }));
    }
    // Retiro con varias sucursales: el cliente elige dónde pasa a buscar su pedido
    function abrirSucursales(volverAlPedido) {
        abrirHoja("sucursales", `${cabHoja("¿En qué sucursal retirás?", volverAlPedido)}
            <div class="hoja-cuerpo">
                <div>${LISTA.filter(s => s.RET.activo).map(s => {
                    const e = estadoDe(s);
                    return `
                    <button type="button" class="zona-op${s.id === datos.sucursal ? " on" : ""}" data-s="${esc(s.id)}">
                        <span class="marca-op">${ico("ok")}</span><span>${esc(s.nombre)}<small>${esc(dirDe(s))}</small><small class="suc-est ${e.abierto ? "abierto" : "cerrado"}">${e.abierto ? "Abierto" + (e.cierra ? " · cierra a las " + e.cierra : "") : esc(textoAbre(e))}</small></span>
                    </button>`;
                }).join("")}</div>
            </div>`);
        const h = hojaEl();
        const atras = $("[data-atras]", h);
        if (atras) atras.addEventListener("click", abrirPedido);
        $$("[data-s]", h).forEach(b => b.addEventListener("click", () => {
            datos.sucursal = b.dataset.s; datos.modo = "retiro";
            usarSuc(sucPorId(datos.sucursal));
            terminarElegir(volverAlPedido);
        }));
    }
    function abrirZonas(volverAlPedido) {
        if (MULTI) return abrirZonasMulti(volverAlPedido);
        abrirHoja("zonas", `${cabHoja("¿A dónde te lo llevamos?", volverAlPedido)}
            <div class="hoja-cuerpo">
                <div>${ZONAS.map(z => `
                    <button type="button" class="zona-op${z.nombre === datos.zona ? " on" : ""}" data-z="${esc(z.nombre)}">
                        <span class="marca-op">${ico("ok")}</span><span>${esc(z.nombre)}</span><strong>${z.costo ? "Envío " + pesos(z.costo) : "Envío gratis"}</strong>
                    </button>`).join("")}</div>
                ${RET.activo ? `<p class="demo-explica">Si tu zona no está en la lista, podés retirar tu pedido en el local.</p>` : ""}
            </div>`);
        const h = hojaEl();
        const atras = $("[data-atras]", h);
        if (atras) atras.addEventListener("click", abrirPedido);
        $$("[data-z]", h).forEach(b => b.addEventListener("click", () => {
            datos.zona = b.dataset.z; datos.modo = "delivery";
            guardar("datos", datos);
            pintarEntregaCab(); pintarBarra();
            if (volverAlPedido) abrirPedido(); else cerrarHoja();
        }));
    }

    /* ---------- Producto ---------- */
    let borrador = null;
    function abrirProducto(id) {
        const p = productos[id];
        if (!p || !disponible(p)) return;
        borrador = { id, sel: {}, cant: 1, nota: "", pedir: "" };
        (p.grupos || []).forEach(g => {
            borrador.sel[g.id] = {};
            if (g.tipo === "uno") { const prim = opcionesDe(g, p).find(disponible); if (prim) borrador.sel[g.id][prim.nombre] = 1; }
        });
        medir("view_item", { currency: "ARS", value: precioDesde(p).base, items: [{ item_id: p.id, item_name: p.nombre }] });
        abrirHoja("producto", `${cabHoja(esc(p.nombre))}
            <div class="hoja-cuerpo">
                <div class="pd-img" data-pd-img></div>
                <div class="pd-info">
                    ${p.desc ? `<p>${esc(p.desc)}</p>` : ""}
                    <p class="pd-desde">${precioHTML(p)}</p>
                </div>
                <div class="pd-grupos" data-pd-grupos></div>
                <label class="campo pd-nota"><span>Aclaraciones <em>(opcional)</em></span>
                    <input type="text" id="pd-nota" maxlength="80" placeholder="${esc(p.notaEj || "Ej: poco dulce de leche, cucurucho aparte")}" autocomplete="off"></label>
            </div>
            <div class="hoja-pie pd-pie">
                <span class="cont plano grande"><button type="button" data-pd-d="-1" aria-label="Una menos">${ico("menos")}</button><b data-pd-cant>1</b><button type="button" data-pd-d="1" aria-label="Una más">${ico("mas")}</button></span>
                <button type="button" class="btn btn-marca" data-pd-ok></button>
            </div>`);
        const h = hojaEl();
        $("#pd-nota", h).addEventListener("input", ev => { borrador.nota = ev.target.value.trim(); });
        $$("[data-pd-d]", h).forEach(b => b.addEventListener("click", () => {
            const tope = topeDe(p) - enCarrito(p.id);
            borrador.cant = Math.max(1, Math.min(tope, borrador.cant + Number(b.dataset.pdD)));
            pintarProducto();
        }));
        $("[data-pd-ok]", h).addEventListener("click", () => {
            const f = faltaEnBorrador();
            if (f) { // en vez de no hacer nada, lo lleva a lo que falta elegir
                if (!f.grupo) return;
                borrador.pedir = f.grupo;
                pintarProducto();
                const fs = $$("[data-g]", hojaEl()).find(x => x.dataset.g === f.grupo);
                if (fs) fs.scrollIntoView({ behavior: "smooth", block: "start" });
                return;
            }
            const it = { id, sel: {}, nota: borrador.nota, cant: borrador.cant };
            Object.keys(borrador.sel).forEach(g => { if (Object.keys(borrador.sel[g]).length) it.sel[g] = borrador.sel[g]; });
            if (agregar(it)) cerrarHoja();
        });
        pintarProducto();
    }
    function faltaEnBorrador() {
        const p = productos[borrador.id];
        if (topeDe(p) - enCarrito(p.id) <= 0) return { grupo: "", texto: "Ya tenés todas las que quedan" };
        for (const g of (p.grupos || [])) {
            const n = cuenta(borrador.sel[g.id]), { min } = limites(g);
            if (n < min) return { grupo: g.id, texto: g.pedir || (g.tipo === "uno" ? `Elegí ${g.titulo.toLowerCase()}` : g.tipo === "cantidades" ? `Te faltan ${min - n} de ${min}` : min === 1 ? "Elegí al menos 1" : `Te faltan ${min - n} de ${min}`) };
        }
        return null;
    }
    function pintarProducto() {
        const h = hojaEl(), p = productos[borrador.id];
        const cajaImg = $("[data-pd-img]", h);
        const img = imagenDe(p, borrador.sel);
        cajaImg.hidden = !img; cajaImg.innerHTML = img;
        // Con foto: se ve entera, y si sobra lugar a los costados se rellena con la misma foto desenfocada
        cajaImg.style.setProperty("--foto", p.foto ? `url("${String(p.foto).replace(/"/g, "%22")}")` : "none");
        $("[data-pd-grupos]", h).innerHTML = (p.grupos || []).map(g => {
            const ops = opcionesDe(g, p), sel = borrador.sel[g.id], n = cuenta(sel), { min, max } = limites(g);
            const llevas = n ? ` Llevás ${n}.` : "";
            const regla = g.tipo === "uno" ? "Elegí 1 opción."
                : g.tipo === "cantidades" ? `Elegí ${max} en total.${llevas}`
                : min && min === max ? `Elegí ${max}.${llevas}`
                : max < 99 ? `Elegí hasta ${max}.${llevas}` : "Elegí las que quieras.";
            const tag = min > 0
                ? (n >= min ? `<em class="g-tag listo">${ico("ok")} Listo</em>` : `<em class="g-tag obligatorio">${L.simple ? "Tenés que elegir" : "Obligatorio"}</em>`)
                : `<em class="g-tag">Opcional</em>`;
            const lleno = n >= max;
            if (n >= min && borrador.pedir === g.id) borrador.pedir = "";
            return `
            <div class="grupo${borrador.pedir === g.id ? " pedir" : ""}" role="group" aria-label="${esc(g.titulo)}" data-g="${esc(g.id)}">
                <div class="g-cab"><div class="g-cab-in"><span class="g-tit">${esc(g.titulo)}<small>${regla}</small></span>${tag}</div></div>
                ${g.ayuda ? `<p class="grupo-ayuda">${esc(g.ayuda)}</p>` : ""}
                ${(() => { let ultima = ""; return ops.map(o => {
                    // "seccion" en una opción pone un título arriba cuando cambia (ej: los gustos de helado por familia)
                    const sec = o.seccion && o.seccion !== ultima ? (ultima = o.seccion, `<p class="g-sec">${esc(o.seccion)}</p>`) : "";
                    const q = sel[o.nombre] || 0, ok = disponible(o);
                    const extra = g.cobro ? pesos(o.precio || 0) : o.precio ? (o.precio > 0 ? "+ " : "− ") + pesos(Math.abs(o.precio)) : "";
                    const punto = o.color ? `<i class="punto" style="background:${esc(o.color)}"></i>` : "";
                    if (g.tipo === "cantidades") return sec + `
                        <div class="op${ok ? "" : " no"}">${punto}<span class="op-nom">${esc(o.nombre)}${o.detalle ? `<small>${esc(o.detalle)}</small>` : ""}</span>${extra ? `<span class="op-precio">${extra}</span>` : ""}
                            ${ok ? `<span class="cont plano"><button type="button" data-o="${esc(o.nombre)}" data-d="-1" aria-label="Menos ${esc(o.nombre)}" ${q ? "" : "disabled"}>${ico("menos")}</button><b>${q}</b><button type="button" data-o="${esc(o.nombre)}" data-d="1" aria-label="Más ${esc(o.nombre)}" ${lleno ? "disabled" : ""}>${ico("mas")}</button></span>` : `<span class="sin-stock">Agotado</span>`}
                        </div>`;
                    const tipo = g.tipo === "uno" ? "radio" : "checkbox";
                    return sec + `
                        <label class="op${ok ? "" : " no"}${q ? " on" : ""}">
                            <input type="${tipo}" name="g-${esc(g.id)}" value="${esc(o.nombre)}" ${q ? "checked" : ""} ${!ok || (!q && lleno && tipo === "checkbox") ? "disabled" : ""}>
                            <span class="marca-op" aria-hidden="true">${ico("ok")}</span>${punto}
                            <span class="op-nom">${esc(o.nombre)}${o.detalle ? `<small>${esc(o.detalle)}</small>` : ""}</span>
                            <span class="op-precio">${ok ? extra : "Agotado"}</span>
                        </label>`;
                }).join(""); })()}
            </div>`;
        }).join("");
        $$("[data-g]", h).forEach(fs => {
            const g = (p.grupos || []).find(x => x.id === fs.dataset.g), sel = borrador.sel[g.id];
            $$("input", fs).forEach(inp => inp.addEventListener("change", () => {
                if (g.tipo === "uno") { Object.keys(sel).forEach(k => delete sel[k]); sel[inp.value] = 1; }
                else if (inp.checked) sel[inp.value] = 1; else delete sel[inp.value];
                pintarProducto();
            }));
            $$("button[data-o]", fs).forEach(b => b.addEventListener("click", () => {
                const q = (sel[b.dataset.o] || 0) + Number(b.dataset.d);
                if (q <= 0) delete sel[b.dataset.o]; else sel[b.dataset.o] = q;
                const foco = b.dataset.o, dir = b.dataset.d;
                pintarProducto();
                const otra = $$(`button[data-d="${dir}"]`, hojaEl()).find(x => x.dataset.o === foco);
                if (otra && !otra.disabled) otra.focus();
            }));
        });
        $("[data-pd-cant]", h).textContent = borrador.cant;
        const f = faltaEnBorrador();
        const ok = $("[data-pd-ok]", h);
        ok.disabled = !!(f && !f.grupo);
        ok.setAttribute("aria-disabled", String(!!f));
        ok.innerHTML = f ? esc(f.texto) : `<span>Agregar</span><span>${pesos(precioUnidad(borrador) * borrador.cant)}</span>`;
    }

    /* ---------- Pedido (paso 1 de 2) ---------- */
    const filasTotales = (t, conPago) => `
        <dl class="tot">
            <div><dt>Productos</dt><dd>${pesos(t.subtotal)}</dd></div>
            ${t.descuentos.map(d => `<div class="menos"><dt>${esc(d.titulo)}</dt><dd>− ${pesos(d.monto)}</dd></div>`).join("")}
            ${conPago && t.descPago ? `<div class="menos"><dt>${t.medio.descuento}% menos en ${esc(t.medio.nombre.toLowerCase())}</dt><dd>− ${pesos(t.descPago)}</dd></div>` : ""}
            ${datos.modo === "delivery" ? `<div><dt>Envío${datos.zona ? " a " + esc(datos.zona) : ""}</dt><dd>${t.envio === null ? "Falta elegir localidad" : t.envio ? pesos(t.envio) : "Gratis"}</dd></div>` : ""}
            <div class="total"><dt>Total</dt><dd>${pesos(conPago ? t.total : t.neto + (t.envio || 0))}</dd></div>
        </dl>`;

    function abrirPedido() {
        abrirHoja("pedido", "");
        pintarPedido();
    }
    function pintarPedido() {
        const h = hojaEl(), t = totales(), e = estado();
        if (!carrito.length) {
            $(".hoja-caja", h).innerHTML = `${cabHoja("Tu pedido")}
                <div class="hoja-cuerpo vacio"><p>Todavía no agregaste nada.</p><button type="button" class="btn btn-marca" data-cerrar>Ver la carta</button></div>`;
            $$("[data-cerrar]", h).forEach(b => b.addEventListener("click", cerrarHoja));
            return;
        }
        const esDel = datos.modo === "delivery";
        const bloqueado = !e.abierto && (L.pedidosCerrado === "bloquear" || pausaActual());
        const soloRetiro = esDel ? carrito.map(it => productos[it.id]).find(p => p.soloRetiro) : null;
        const faltaZona = MULTI ? (esDel ? !zonaActual() : !ACT) : (esDel && ZONAS.length && !zonaActual()); // con varias sucursales: falta la zona (delivery) o la sucursal (retiro)
        let motivo = "";
        if (bloqueado) motivo = textoAbre(e);
        else if (soloRetiro) motivo = "Quitá lo que es solo para retirar";
        else if (t.falta && !faltaZona) motivo = `Te faltan ${pesos(t.falta)} para el mínimo`;
        const scroll = ($(".hoja-cuerpo", h) || {}).scrollTop || 0;
        $(".hoja-caja", h).innerHTML = `${cabHoja("Tu pedido", false, "Paso 1 de 2")}
            <div class="hoja-cuerpo gris">
                ${!e.abierto ? `<p class="aviso aviso-cerrado">${ico("reloj")}<span><strong>Ahora estamos cerrados.</strong> ${bloqueado ? esc(textoAbre(e)) + "." : `Podés dejar el pedido hecho: lo preparamos cuando abrimos (${esc(textoAbre(e).toLowerCase())}).`}</span></p>` : ""}
                <section class="caja">
                    <ul class="items">
                        ${carrito.map((it, i) => {
                            const p = productos[it.id], det = detalleDe(it);
                            return `<li>
                                <span class="item-txt"><strong>${esc(p.nombre)}</strong>${det ? `<span>${esc(det)}</span>` : ""}${it.nota ? `<span class="item-nota">“${esc(it.nota)}”</span>` : ""}<b>${pesos(precioUnidad(it) * it.cant)}</b></span>
                                <span class="cont plano"><button type="button" data-i="${i}" data-d="-1" aria-label="Quitar uno de ${esc(p.nombre)}">${ico("menos")}</button><b>${it.cant}</b><button type="button" data-i="${i}" data-d="1" aria-label="Sumar uno de ${esc(p.nombre)}" ${enCarrito(it.id) >= topeDe(p) ? "disabled" : ""}>${ico("mas")}</button></span>
                            </li>`;
                        }).join("")}
                    </ul>
                    <button type="button" class="enlace" data-cerrar>${ico("mas")} Agregar más productos</button>
                </section>
                ${t.pistas.map(x => `<p class="aviso aviso-promo">${ico("etiqueta")}<span>${esc(x)}</span></p>`).join("")}
                <section class="caja">
                    <h3>Entrega</h3>
                    <div class="entrega" data-entrega-ped>${entregaHTML("ped")}</div>
                    ${soloRetiro ? `<p class="aviso aviso-min">${ico("tienda")}<span><strong>${esc(soloRetiro.nombre)}</strong> es solo para retirar en el local. Elegí retiro o quitalo del pedido.</span></p>` : ""}
                    ${t.falta && esDel && !faltaZona ? `<p class="aviso aviso-min">${ico("bolsa")}<span>El mínimo para delivery es ${pesos(t.minimo)}. Te faltan <strong>${pesos(t.falta)}</strong>${RET.activo ? ", o podés retirarlo en el local sin mínimo" : ""}.</span></p>` : ""}
                </section>
                <section class="caja">
                    <h3>Resumen</h3>
                    ${filasTotales(t, false)}
                    ${L.demoPara && !L.demoNota ? `<p class="demo-explica">Precios de ejemplo.</p>` : ""}
                </section>
            </div>
            <div class="hoja-pie">
                ${faltaZona && !motivo
                    ? `<button type="button" class="btn btn-marca" data-elegir-zona>${MULTI && !esDel ? "Elegir sucursal para retirar" : "Elegir zona de entrega"}</button>`
                    : `<button type="button" class="btn btn-marca" data-seguir ${motivo ? "disabled" : ""}>${motivo ? esc(motivo) : `<span>${L.simple ? "Siguiente: tus datos" : "Continuar"}</span><span>${pesos(t.neto + (t.envio || 0))}</span>`}</button>`}
            </div>`;
        $(".hoja-cuerpo", h).scrollTop = scroll;
        $$("[data-cerrar]", h).forEach(b => b.addEventListener("click", cerrarHoja));
        $$("button[data-i]", h).forEach(b => b.addEventListener("click", () => cambiar(Number(b.dataset.i), Number(b.dataset.d))));
        enlazarEntrega($("[data-entrega-ped]", h), "ped");
        const ez = $("[data-elegir-zona]", h);
        if (ez) ez.addEventListener("click", () => MULTI && !esDel ? abrirSucursales(true) : abrirZonas(true));
        const seguir = $("[data-seguir]", h);
        if (seguir) seguir.addEventListener("click", () => {
            medir("begin_checkout", { currency: "ARS", value: t.neto });
            abrirDatos();
        });
    }

    /* ---------- Datos del cliente y pago (paso 2 de 2) ---------- */
    function abrirDatos() {
        abrirHoja("datos", "");
        pintarDatos();
    }
    function pintarDatos(errores) {
        const h = hojaEl(), t = totales(), e = estado(), esDel = datos.modo === "delivery";
        errores = errores || {};
        const scroll = ($(".hoja-cuerpo", h) || {}).scrollTop || 0;
        const ayudaPago = m => m.id === "efectivo" ? (esDel ? "Le pagás al repartidor." : "Pagás al retirar.")
            : m.id === "transferencia" ? "Te mostramos el alias al enviar el pedido."
            : (m.link ? "Con tarjeta o dinero en cuenta." : "Te mandamos el link de pago por WhatsApp.");
        $(".hoja-caja", h).innerHTML = `${cabHoja("Tus datos y el pago", true, "Paso 2 de 2")}
            <div class="hoja-cuerpo gris">
                <section class="caja">
                    <h3>${esDel ? `Te lo llevamos a ${esc(datos.zona)}` : (MULTI && ACT ? `Retirás en ${esc(ACT.nombre)}` : "Retirás en el local")}</h3>
                    ${MULTI && ACT && esDel ? `<p class="suc-nota">Lo prepara ${esc(ACT.nombre)}.</p>` : ""}
                    <label class="campo${errores.nombre ? " error" : ""}"><span>Tu nombre</span>
                        <input type="text" id="d-nombre" value="${esc(datos.nombre)}" maxlength="40" autocomplete="given-name" placeholder="Ej: Juli">
                        <small>Escribí tu nombre para identificar el pedido.</small></label>
                    ${CLUB ? `
                    <label class="campo${errores.tel ? " error" : ""}"><span>Tu celular <em>(opcional, para sumar tu sello)</em></span>
                        <input type="tel" id="d-tel" value="${esc(datos.tel)}" maxlength="20" inputmode="tel" autocomplete="tel" placeholder="Ej: 2257 123456">
                        <small>Escribí el celular con característica, o dejalo vacío.</small></label>` : ""}
                    ${esDel ? `
                    <label class="playa-sw${datos.playa ? " on" : ""}"><input type="checkbox" id="d-playa" ${datos.playa ? "checked" : ""}><span class="playa-ico" aria-hidden="true">🏖️</span><span class="playa-txt"><strong>Estoy en la playa</strong><small>Te lo llevamos a la arena</small></span><span class="playa-tg" aria-hidden="true"></span></label>
                    <label class="campo${errores.direccion ? " error" : ""}"><span>${datos.playa ? "Balneario o bajada" : "Calle y número"}</span>
                        <input type="text" id="d-direccion" value="${esc(datos.direccion)}" maxlength="80" autocomplete="${datos.playa ? "off" : "street-address"}" placeholder="${datos.playa ? "Ej: Balneario Los Pinos, bajada calle 40" : "Ej: Calle 39 N° 450"}">
                        <small>${datos.playa ? "Escribí el balneario o la bajada donde estás." : "Escribí la dirección para que podamos llevártelo."}</small></label>
                    ${datos.playa ? `
                    <button type="button" class="btn btn-linea chico playa-gps${datos.ubic ? " on" : ""}" id="d-gps">📍 ${datos.ubic ? "Ubicación agregada ✓" : "Mandar mi ubicación exacta"}</button>` : ""}
                    <label class="campo"><span>${datos.playa ? "¿Cómo te encontramos?" : "Piso, depto o referencia"} <em>(opcional)</em></span>
                        <input type="text" id="d-ref" value="${esc(datos.ref)}" maxlength="80" placeholder="${datos.playa ? "Ej: sombrilla roja, cerca del mar" : "Ej: rejas verdes, tocar timbre"}"></label>` : ""}
                </section>
                <section class="caja">
                    <fieldset class="campo pagos${errores.pago ? " error" : ""}">
                        <legend>¿Cómo pagás?</legend>
                        ${PAGOS.map(m => `
                        <label class="pago${datos.pago === m.id ? " on" : ""}">
                            <input type="radio" name="pago" value="${m.id}" ${datos.pago === m.id ? "checked" : ""}>
                            <span class="marca-op" aria-hidden="true">${ico("ok")}</span>
                            <span class="pago-txt"><strong>${esc(m.nombre)}</strong><span>${ayudaPago(m)}${m.descuento ? ` <em>${m.descuento}% menos.</em>` : ""}</span></span>
                            ${ico(m.icono)}
                        </label>`).join("")}
                        <small>Elegí cómo vas a pagar.</small>
                    </fieldset>
                    ${datos.pago === "efectivo" ? `
                    <label class="campo"><span>¿Con cuánto pagás? <em>(opcional, para llevarte el vuelto)</em></span>
                        <input type="text" id="d-paga" inputmode="numeric" value="${esc(datos.paga)}" maxlength="12" placeholder="Ej: 30000"></label>` : ""}
                </section>
                ${(() => {
                    const hs = horariosEncargo();
                    if (!hs.length) return "";
                    if (datos.hora && !hs.some(x => x.valor === datos.hora)) datos.hora = "";
                    return `
                <section class="caja">
                    <label class="campo"><span>¿Para cuándo lo querés?</span>
                        <select id="d-hora">
                            <option value="">${e.abierto ? "Lo antes posible" : "Apenas abran"}</option>
                            ${hs.map(x => `<option value="${esc(x.valor)}" ${datos.hora === x.valor ? "selected" : ""}>${esc(x.texto)}</option>`).join("")}
                        </select>
                        <small>${esDel ? "Elegí a qué hora te lo llevamos." : "Elegí a qué hora lo pasás a buscar."}</small></label>
                </section>`;
                })()}
                <section class="caja">
                    <label class="campo"><span>¿Algo más que tengamos que saber? <em>(opcional)</em></span>
                        <input type="text" id="d-nota" value="${esc(datos.nota)}" maxlength="120" placeholder="Ej: sin cubiertos"></label>
                </section>
                <section class="caja">
                    <h3>Resumen</h3>
                    ${filasTotales(t, true)}
                    ${L.demoPara && !L.demoNota ? `<p class="demo-explica">Precios de ejemplo.</p>` : ""}
                </section>
                ${!e.abierto ? `<p class="aviso aviso-cerrado">${ico("reloj")}<span>Ahora estamos cerrados. Tu pedido queda hecho y lo preparamos cuando abrimos (${esc(textoAbre(e).toLowerCase())}).</span></p>` : ""}
            </div>
            <div class="hoja-pie">
                ${L.simple ? `<p class="aviso-wa"><strong>Último paso:</strong> al tocar el botón verde se abre WhatsApp con tu pedido ya escrito. Ahí solo tocá la flechita de <strong>enviar</strong>.</p>` : ""}
                <a class="btn btn-wa" id="enviar" href="#" target="_blank" rel="noopener">${ICO_WA}<span>${L.simple ? "Mandar mi pedido" : "Enviar pedido por WhatsApp"}</span></a>
                <p class="hoja-pie-nota">Se abre WhatsApp con tu pedido ya escrito. Solo tenés que tocar enviar.</p>
            </div>`;
        $(".hoja-cuerpo", h).scrollTop = scroll;
        $$("[data-cerrar]", h).forEach(b => b.addEventListener("click", cerrarHoja));
        $("[data-atras]", h).addEventListener("click", abrirPedido);
        const tomar = () => {
            ["nombre", "tel", "direccion", "ref", "paga", "nota", "hora"].forEach(k => { const el = $("#d-" + k, h); if (el) datos[k] = el.value.trim(); });
            guardar("datos", datos);
        };
        $$("input[type=text], input[type=tel]", h).forEach(i => i.addEventListener("input", () => { tomar(); const c = i.closest(".campo"); if (c) c.classList.remove("error"); }));
        const sw = $("#d-playa", h);
        if (sw) sw.addEventListener("change", () => { tomar(); datos.playa = sw.checked; if (!sw.checked) datos.ubic = ""; guardar("datos", datos); pintarDatos(); });
        const gps = $("#d-gps", h);
        if (gps) gps.addEventListener("click", () => {
            const listo = u => { tomar(); datos.ubic = u; guardar("datos", datos); pintarDatos(); };
            if (L.demo || !navigator.geolocation) { listo("https://maps.google.com/?q=-36.5450,-56.7020"); return; }
            gps.textContent = "Buscando tu ubicación…";
            navigator.geolocation.getCurrentPosition(p => listo(`https://maps.google.com/?q=${p.coords.latitude.toFixed(5)},${p.coords.longitude.toFixed(5)}`),
                () => { gps.textContent = "No pudimos tomar la ubicación. Escribí el balneario."; }, { enableHighAccuracy: true, timeout: 10000 });
        });
        $$('input[name="pago"]', h).forEach(r => r.addEventListener("change", () => { tomar(); datos.pago = r.value; guardar("datos", datos); pintarDatos(); }));
        $("#enviar", h).addEventListener("click", ev => {
            tomar();
            const err = {};
            if (!datos.nombre) err.nombre = 1;
            if (esDel && !datos.direccion) err.direccion = 1;
            if (!datos.pago) err.pago = 1;
            const digitos = String(datos.tel || "").replace(/\D/g, "");
            if (CLUB && datos.tel && (digitos.length < 8 || digitos.length > 13)) err.tel = 1;
            if (Object.keys(err).length) {
                ev.preventDefault();
                pintarDatos(err);
                const primero = $(".campo.error", hojaEl());
                if (primero) primero.scrollIntoView({ behavior: "smooth", block: "center" });
                return;
            }
            const pedido = armarPedido();
            registrarPedido(pedido);
            medir("generate_lead", { currency: "ARS", value: pedido.total, modo: datos.modo, zona: datos.zona, pago: datos.pago });
            if (L.demo) { ev.preventDefault(); mostrarEnviado(pedido); return; }
            ev.currentTarget.href = pedido.url; // el link se abre solo (así funciona también dentro de Instagram y Facebook)
            setTimeout(() => mostrarEnviado(pedido), 400);
        });
    }

    /* ---------- Mensaje de WhatsApp ---------- */
    function codigoPedido() {
        const d = new Date(), dos = n => String(n).padStart(2, "0");
        return `${iniciales}-${dos(d.getDate())}${dos(d.getMonth() + 1)}-${Math.floor(100 + Math.random() * 900)}`;
    }
    function armarPedido() {
        const t = totales(), e = estado(), esDel = datos.modo === "delivery";
        const codigo = codigoPedido();
        const suc = MULTI ? ACT : null; // con varias sucursales, el pedido va al WhatsApp de la elegida
        const wa = suc ? suc.whatsapp : L.whatsapp;
        let m = `*Pedido ${codigo}* para *${L.nombre}*${suc ? ` · *${suc.nombre}*` : ""}\n`;
        m += esDel ? `🛵 *Delivery* a ${datos.zona}\n` : suc ? `🏪 *Retiro en ${suc.nombre}* (${dirDe(suc)})\n` : `🏪 *Retiro en el local*\n`;
        if (datos.hora) m += `⏰ *Para ${datos.hora.replace(" ", " a las ")}*\n`;
        else if (!e.abierto) m += `⏰ Para cuando abran (${textoAbre(e).toLowerCase()})\n`;
        m += `\n`;
        carrito.forEach(it => {
            const p = productos[it.id], det = detalleDe(it);
            m += `• ${it.cant}x ${p.nombre} — ${pesos(precioUnidad(it) * it.cant)}\n`;
            if (det) m += `   ${det}\n`;
            if (it.nota) m += `   _Nota: ${it.nota}_\n`;
        });
        m += `\nSubtotal: ${pesos(t.subtotal)}\n`;
        t.descuentos.forEach(d => { m += `${d.titulo}: -${pesos(d.monto)}\n`; });
        if (t.descPago) m += `${t.medio.descuento}% menos en ${t.medio.nombre.toLowerCase()}: -${pesos(t.descPago)}\n`;
        if (esDel) m += `Envío: ${t.envio ? pesos(t.envio) : "gratis"}\n`;
        m += `*Total: ${pesos(t.total)}*\n\n`;
        m += `💳 Pago: ${t.medio.nombre}`;
        const paga = Number(String(datos.paga).replace(/\D/g, ""));
        if (datos.pago === "efectivo" && paga > t.total) m += ` (paga con ${pesos(paga)}, vuelto ${pesos(paga - t.total)})`;
        m += `\n👤 ${datos.nombre}\n`;
        if (esDel && datos.playa) { m += `🏖️ *En la playa:* ${datos.direccion}, ${datos.zona}${datos.ref ? ` (${datos.ref})` : ""}\n`; if (datos.ubic) m += `📍 Ubicación: ${datos.ubic}\n`; }
        else if (esDel) m += `📍 ${datos.direccion}, ${datos.zona}${datos.ref ? ` (${datos.ref})` : ""}\n`;
        if (datos.nota) m += `📝 ${datos.nota}\n`;
        m = m.trim();
        return { codigo, mensaje: m, total: t.total, pago: datos.pago, medio: t.medio, nombre: datos.nombre, sucursal: suc, t,
            url: `https://api.whatsapp.com/send?phone=${wa}&text=${encodeURIComponent(m)}` };
    }
    /* ---------- El pedido queda anotado en el panel ----------
       Se guarda ANTES de abrir WhatsApp, así el dueño lo ve en su panel aunque
       el chat se pierda. Demo: en este celular (el panel de demo lo lee al toque).
       Local real con "registrar: true": lo manda a la base (función registrar_pedido). */
    const CLAVE_PEDIDOS_DEMO = "sa-pedidos-demo:" + (L.carpeta || slug(L.nombre));
    function registrarPedido(pedido) {
        const t = pedido.t, esDel = datos.modo === "delivery";
        const amigo = (t.descuentos.find(d => d.amigo) || {}).amigo || "";
        const tel = String(datos.tel || "").replace(/\D/g, "");
        const reg = {
            codigo: pedido.codigo, creado: new Date().toISOString(), estado: "nuevo",
            nombre: datos.nombre, tel, modo: datos.modo, zona: esDel ? datos.zona : "",
            direccion: esDel ? (datos.playa ? "🏖️ Playa: " : "") + datos.direccion + (datos.ref ? ` (${datos.ref})` : "") + (datos.playa && datos.ubic ? " · " + datos.ubic : "") : "",
            sucursal: pedido.sucursal ? pedido.sucursal.nombre : "",
            items: carrito.map(it => ({ id: it.id, sel: it.sel || {}, n: productos[it.id].nombre, c: it.cant, d: detalleDe(it) || "", t: precioUnidad(it) * it.cant })),
            total: t.total, pago: t.medio ? t.medio.nombre : "", hora: datos.hora || "", nota: datos.nota || "",
            origen: leerSesion("de", "") || "directo", amigo, cliente: club.codigo
        };
        club.pedidos += 1;
        if (amigo) club.amigoUsado = true;
        guardar("club", club);
        if (L.demo) {
            try {
                const lista = JSON.parse(localStorage.getItem(CLAVE_PEDIDOS_DEMO) || "[]");
                lista.unshift(reg);
                localStorage.setItem(CLAVE_PEDIDOS_DEMO, JSON.stringify(lista.slice(0, 200)));
            } catch (e) {}
        } else if (L.negocio && L.registrar && window.fetch) {
            try {
                fetch(BASE.url + "/rest/v1/rpc/registrar_pedido", {
                    method: "POST", keepalive: true,
                    headers: { apikey: BASE.clave, "Content-Type": "application/json" },
                    body: JSON.stringify({ p_slug: L.negocio, p_pedido: reg })
                }).catch(() => {});
            } catch (e) {}
        }
    }
    // Después de enviar: el sello que sumó y el link para invitar a un amigo
    function clubEnviado() {
        if (!CLUB) return "";
        const n = club.pedidos % CLUB.meta, lleno = n === 0;
        const link = location.origin + location.pathname + "?amigo=" + club.codigo;
        const txt = `Te paso ${L.nombre}: pedís online y te lo llevan. Con mi link tenés ${CLUB.amigo}% menos en tu primer pedido 👉 ${link}`;
        return `
            <div class="club-enviado">
                <p><strong>${lleno ? `¡Completaste la tarjeta! Ganaste ${esc(CLUB.premio)}.` : "¡Sumaste un sello!"}</strong> ${lleno ? "Avisá en tu próximo pedido." : `Llevás ${n} de ${CLUB.meta}.`}</p>
                ${sellosHTML(lleno ? CLUB.meta : n)}
                ${CLUB.amigo ? `<a class="btn btn-linea" href="https://api.whatsapp.com/send?text=${encodeURIComponent(txt)}" target="_blank" rel="noopener">${ICO_WA} Invitar a un amigo: ${CLUB.amigo}% menos para él</a>` : ""}
            </div>`;
    }

    // Convierte el formato de WhatsApp (*negrita*, _cursiva_) para mostrar el mensaje en pantalla
    const comoWhatsApp = m => esc(m).replace(/\*([^*\n]+)\*/g, "<b>$1</b>").replace(/_([^_\n]+)_/g, "<i>$1</i>");

    function bloquePago(pedido) {
        const m = pedido.medio;
        if (pedido.pago === "transferencia" && m.alias) return `
            <div class="pagar">
                <p><strong>Transferí ${pesos(pedido.total)}</strong> a este alias y mandanos el comprobante por WhatsApp.</p>
                <div class="alias"><code id="alias-txt">${esc(m.alias)}</code><button type="button" class="btn btn-linea chico" data-copiar>${ico("copiar")} <span>Copiar</span></button></div>
                ${m.titular ? `<p class="pagar-nota">Titular: ${esc(m.titular)}</p>` : ""}
            </div>`;
        if (pedido.pago === "mercadoPago") return m.link ? `
            <div class="pagar">
                <p><strong>Pagá ${pesos(pedido.total)} con Mercado Pago.</strong> Ingresá ese monto en el link y mandanos el comprobante.</p>
                ${L.demo ? `<span class="btn btn-mp">${ico("tarjeta")} Pagar con Mercado Pago</span><p class="pagar-nota">En la demo este botón no cobra. En tu local abre tu link de Mercado Pago.</p>`
                    : `<a class="btn btn-mp" href="${esc(m.link)}" target="_blank" rel="noopener">${ico("tarjeta")} Pagar con Mercado Pago</a>`}
            </div>` : `<div class="pagar"><p>Cuando confirmemos tu pedido te mandamos el link de Mercado Pago por WhatsApp.</p></div>`;
        return "";
    }
    function mostrarEnviado(pedido) {
        const tarjeta = $(".club", raiz); // la tarjeta de sellos de la portada muestra el sello nuevo
        if (tarjeta) tarjeta.outerHTML = clubHTML();
        carrito = [];
        guardar("carrito", carrito);
        pintarAcciones(); pintarBarra();
        if (L.demo) {
            const propio = `https://api.whatsapp.com/send?text=${encodeURIComponent(pedido.mensaje)}`;
            // El panel de demo de este mismo local, con el pedido que acaba de hacer arriba de todo
            const panelDemo = /^demo\/[a-z0-9-]+$/.test(L.carpeta || "") ? `../../panel/?demo=${L.carpeta.slice(5)}#pedidos` : "";
            abrirHoja("enviado", `${cabHoja("Así te llega el pedido")}
                <div class="hoja-cuerpo">
                    <p class="demo-explica">En un local real, acá se abre WhatsApp con este mensaje listo para enviar. Vos lo recibís ordenado, con el total ya calculado.</p>
                    ${pedido.sucursal ? `<p class="demo-explica suc-destino">${ico("pin")}<span>Este pedido le llega al WhatsApp de <strong>${esc(pedido.sucursal.nombre)}</strong>. Cada sucursal recibe solo los suyos.</span></p>` : ""}
                    <div class="chat"><div class="globo">${comoWhatsApp(pedido.mensaje)}<span class="globo-hora">${new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false })}</span></div></div>
                    ${bloquePago(pedido) ? `<p class="demo-explica">Y esto es lo que ve tu cliente después de enviarlo:</p>${bloquePago(pedido)}` : ""}
                    ${CLUB ? `<p class="demo-explica">Y su tarjeta de sellos, para que vuelva a pedirte:</p>${clubEnviado()}` : ""}
                </div>
                <div class="hoja-pie apilado">
                    ${panelDemo ? `<a class="btn btn-marca" href="${esc(panelDemo)}" target="_blank" rel="noopener" data-ver-panel>Ver cómo te llega en tu panel</a>` : ""}
                    ${L.demoPara ? "" : `<a class="btn ${panelDemo ? "btn-linea" : "btn-marca"}" href="${esc(PAG.sitio || "../../index.html")}#planes" data-planes>Quiero este local para mi negocio</a>`}
                    <a class="btn ${L.demoPara && !panelDemo ? "btn-marca" : "btn-linea"}" href="${propio}" target="_blank" rel="noopener">${ICO_WA} Mandármelo a mi WhatsApp</a>
                </div>`);
        } else {
            abrirHoja("enviado", `${cabHoja("Falta un paso")}
                <div class="hoja-cuerpo">
                    <div class="enviado">
                        <span class="enviado-ico">${ICO_WA}</span>
                        <p><strong>Se abrió WhatsApp con tu pedido ${esc(pedido.codigo)}.</strong></p>
                        <p>Tocá enviar en el chat para que nos llegue.</p>
                        <a class="enlace" href="${pedido.url}" target="_blank" rel="noopener">¿No se abrió? Abrir WhatsApp de nuevo</a>
                    </div>
                    ${bloquePago(pedido)}
                    ${clubEnviado()}
                </div>
                <div class="hoja-pie"><button type="button" class="btn btn-linea" data-cerrar>Volver a la carta</button></div>`);
        }
        const h = hojaEl();
        $$("[data-planes]", h).forEach(a => a.addEventListener("click", ev => { ev.preventDefault(); irAPlanes(); }));
        const cop = $("[data-copiar]", h);
        if (cop) cop.addEventListener("click", () => {
            const txt = $("#alias-txt", h);
            const listo = () => { $("span", cop).textContent = "Copiado"; setTimeout(() => { $("span", cop).textContent = "Copiar"; }, 1800); };
            const elegir = () => { const r = document.createRange(); r.selectNodeContents(txt); const s = getSelection(); s.removeAllRanges(); s.addRange(r); };
            try { navigator.clipboard.writeText(txt.textContent).then(listo, elegir); } catch (e) { elegir(); }
        });
    }
    // Desde una demo: volver a los planes de Santa Automatiza
    function irAPlanes() {
        try { localStorage.setItem("sa:rubro", L.rubro || ""); } catch (e) {}
        medir("demo_quiero_la_mia", { rubro: L.rubro });
        if (EMBEBIDO) { try { parent.postMessage({ sa: "planes", rubro: L.rubro }, "*"); } catch (e) {} cerrarHoja(); return; }
        location.href = (PAG.sitio || "../../index.html") + "#planes";
    }

    /* =====================================================================
       PLANILLA (opcional): el dueño cambia precios y marca agotados desde
       una planilla de Google, sin tocar ningún archivo.
       Columnas: id | precio | disponible  (disponible: si / no)
       "id" es el id del producto, o lista/Nombre para una opción compartida
       (ej: gustos/Chocolate). La fila con id LOCAL y disponible "no" cierra el local.
       ===================================================================== */
    function leerCSV(texto) {
        const filas = []; let celda = "", fila = [], comillas = false;
        for (let i = 0; i < texto.length; i++) {
            const c = texto[i];
            if (comillas) { if (c === '"' && texto[i + 1] === '"') { celda += '"'; i++; } else if (c === '"') comillas = false; else celda += c; }
            else if (c === '"') comillas = true;
            else if (c === ",") { fila.push(celda); celda = ""; }
            else if (c === "\n") { fila.push(celda); filas.push(fila); fila = []; celda = ""; }
            else if (c !== "\r") celda += c;
        }
        if (celda || fila.length) { fila.push(celda); filas.push(fila); }
        return filas;
    }
    function aplicarPlanilla(texto) {
        const filas = leerCSV(texto);
        if (filas.length < 2) return;
        const cab = filas[0].map(x => slug(x));
        const col = n => cab.indexOf(n);
        const [cId, cPrecio, cDisp, cNota] = [col("id"), col("precio"), col("disponible"), col("nota")];
        if (cId < 0) return;
        filas.slice(1).forEach(f => {
            const id = (f[cId] || "").trim();
            if (!id) return;
            const precio = cPrecio >= 0 ? Number(String(f[cPrecio] || "").replace(/[^\d]/g, "")) : 0;
            const disp = cDisp >= 0 ? slug(f[cDisp] || "") : "";
            const no = ["no", "0", "agotado", "false"].includes(disp);
            if (id.toUpperCase() === "LOCAL") { if (no) L.pausa = (cNota >= 0 && f[cNota]) || "Hoy no abrimos"; return; }
            if (/^SUC\//i.test(id)) { // cierra una sola sucursal: SUC/id-de-la-sucursal con disponible "no"
                const s = sucPorId(id.slice(4).trim());
                if (s && no) s.pausa = (cNota >= 0 && f[cNota]) || "Hoy esta sucursal no abre";
                return;
            }
            const obj = buscarItem(id);
            if (!obj) return;
            if (precio > 0) obj.precio = precio;
            if (disp) obj.disponible = !no;
        });
        carrito = carrito.filter(it => disponible(productos[it.id]));
        montar();
    }
    // Un producto por su id, o una opción compartida como "gustos/Chocolate"
    function buscarItem(id) {
        if (productos[id]) return productos[id];
        if (!id.includes("/")) return null;
        const i = id.indexOf("/"), lista = id.slice(0, i), nombre = id.slice(i + 1);
        return ((L.listas || {})[lista] || []).find(o => slug(o.nombre) === slug(nombre)) || null;
    }

    /* =====================================================================
       PANEL DEL DUEÑO: precios, agotados, horarios y "cerrado por hoy".
       - Local real (L.negocio = su slug en la base): lo lee de la base.
       - Demo: lo lee de lo que se cambió en el panel de demo en este mismo
         celular, así se ve el cambio al instante.
       ===================================================================== */
    const BASE = { url: "", clave: "" };
    const ORIGINAL = { horarios: L.horarios, pausa: L.pausa || "", items: {} };
    Object.keys(productos).forEach(id => { ORIGINAL.items[id] = { precio: productos[id].precio, disponible: productos[id].disponible }; });
    Object.keys(L.listas || {}).forEach(k => (L.listas[k] || []).forEach(o => { ORIGINAL.items[k + "/" + o.nombre] = { precio: o.precio, disponible: o.disponible, o }; }));
    const CLAVE_DEMO = "sa-panel-demo:" + (L.carpeta || slug(L.nombre));
    const CLAVE_CARTA = "sa-carta:" + (L.negocio || "");

    let pausaHasta = 0; // cuándo vuelve a abrir sola la tienda (milisegundos), si hay un "cerrado por hoy"
    function aplicarPanel(d, repintar) {
        if (!d || typeof d !== "object") return;
        // Primero vuelve todo a como está en la carta, después aplica lo del panel
        Object.keys(ORIGINAL.items).forEach(id => {
            const o = ORIGINAL.items[id], obj = o.o || productos[id];
            if (!obj) return;
            obj.precio = o.precio;
            if (o.disponible === undefined) delete obj.disponible; else obj.disponible = o.disponible;
        });
        (Array.isArray(d.items) ? d.items : []).forEach(x => {
            if (!x || typeof x.i !== "string") return;
            const obj = buscarItem(x.i);
            if (!obj) return;
            if (typeof x.p === "number" && x.p > 0 && obj.precio !== undefined) obj.precio = x.p;
            if (typeof x.d === "boolean") obj.disponible = x.d;
        });
        const h = d.horarios;
        L.horarios = h && typeof h === "object" && Object.keys(h).length ? h : ORIGINAL.horarios;
        // Un "cerrado por hoy" que ya venció no cuenta (el panel de demo guarda cuándo vuelve a abrir)
        pausaHasta = d.pausa_hasta ? Date.parse(d.pausa_hasta) || 0 : 0;
        const vencida = pausaHasta > 0 && Date.now() >= pausaHasta;
        L.pausa = typeof d.pausa === "string" && d.pausa && !vencida ? d.pausa.slice(0, 120) : ORIGINAL.pausa;
        if (repintar) {
            carrito = carrito.filter(it => productos[it.id] && disponible(productos[it.id]));
            if (!vista) montar();
        }
    }
    function leerDemo() { try { return JSON.parse(localStorage.getItem(CLAVE_DEMO)); } catch (e) { return null; } }
    function traerDeBase() {
        if (!window.fetch) return;
        fetch(BASE.url + "/rest/v1/rpc/carta_publica", {
            method: "POST", cache: "no-store",
            headers: { apikey: BASE.clave, "Content-Type": "application/json" },
            body: JSON.stringify({ p_slug: L.negocio })
        }).then(r => r.ok ? r.json() : null).then(d => {
            if (!d) return;
            try { localStorage.setItem(CLAVE_CARTA, JSON.stringify(d)); } catch (e) {}
            aplicarPanel(d, true);
        }).catch(() => {});
    }
    if (L.negocio) { // lo último que se vio, para no mostrar precios viejos mientras carga
        try { aplicarPanel(JSON.parse(localStorage.getItem(CLAVE_CARTA)), false); } catch (e) {}
    } else if (L.demo) aplicarPanel(leerDemo(), false);

    /* ---------- Arranque ---------- */
    montar();
    if (L.planilla && window.fetch) {
        fetch(L.planilla, { cache: "no-store" }).then(r => r.ok ? r.text() : "").then(t => { if (t) aplicarPlanilla(t); }).catch(() => {});
    }
    if (L.negocio) {
        traerDeBase();
        document.addEventListener("visibilitychange", () => { if (!document.hidden) traerDeBase(); });
        setInterval(() => { if (!document.hidden) traerDeBase(); }, 120000);
    } else if (L.demo) {
        // Si el panel de demo está abierto en otra pestaña, el cambio aparece solo
        window.addEventListener("storage", e => { if (e.key === CLAVE_DEMO) aplicarPanel(leerDemo() || {}, true); });
        document.addEventListener("visibilitychange", () => { if (!document.hidden) aplicarPanel(leerDemo() || {}, true); });
    }
    setInterval(() => { // el cartel de abierto/cerrado se actualiza solo
        const b = $(".estado", raiz); if (!b || vista) return;
        if (pausaHasta && L.pausa && Date.now() >= pausaHasta) { L.pausa = ORIGINAL.pausa; pausaHasta = 0; montar(); return; } // terminó el "cerrado por hoy"
        const abierto = estado().abierto;
        if (abierto !== b.classList.contains("abierto")) montar();
    }, 60000);
    if (L.simple) document.documentElement.classList.add("simple");
    if (EMBEBIDO) { document.documentElement.classList.add("marco"); try { parent.postMessage({ sa: "lista", rubro: L.rubro }, "*"); } catch (e) {} }
})();
