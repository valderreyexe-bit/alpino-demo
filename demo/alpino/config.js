/* =====================================================================
   DEMO PRIVADA: Heladerías Al-Pino (preparada por Santa Automatiza)
   ---------------------------------------------------------------------
   Parte de heladeria.js, con 6 sucursales. Es una demo para mostrarle al
   cliente: no sale en la página principal de Santa Automatiza, Google no
   la muestra y arriba lleva una franja que lo aclara ("demoPara").

   QUÉ ES REAL (sale de la carta y del bot de WhatsApp de Al-Pino, oct 2026):
     - nombre, lema, logo, portada y colores
     - la carta completa con sus precios: potes, sabores, Gelato Zero y
       Vegano, paletas (agua, classic, especiales, deluxe, cannoli),
       alfajores helados y tortas heladas
     - el envío a $2.000 y los mínimos de paletas (3) y gelatos (2)
     - las 6 direcciones de las sucursales
     - la promo del 25% con Cuenta DNI (tope $8.000 semanal)
     - el horario base (el de Google: dom a jue 12 a 1, vie 12 a 1:30, sáb 12 a 2)
     - el Instagram

   QUÉ ES DE EJEMPLO (marcado abajo con "EJEMPLO"):
     - el WhatsApp de cada sucursal (en la realidad hay uno solo: 2257 40 6408)
     - qué zonas atiende cada sucursal y las demoras
     - los horarios distintos de Las Toninas y Costa del Este
     - el alias y el link de Mercado Pago
   Para pasarlo a un cliente real: cambiar los datos marcados y poner
   demo: false (y borrar demoPara).
   ===================================================================== */

// Familia de gustos: se cargan una sola vez y valen para todos los potes.
// Cada gusto: [nombre, color del dibujo, lo que lleva (opcional)]
const familia = (seccion, lista) => lista.map(g => Object.assign({ nombre: g[0], color: g[1], seccion }, g[2] ? { detalle: g[2] } : {}));

const gustos = max => ({ id: "gustos", titulo: max === 1 ? "Gusto" : "Gustos", tipo: "varios", min: 1, max, opciones: "gustos", pinta: true, pedir: "Elegí al menos 1 gusto" });

// Paleta con su dibujo: c = color del helado, bano = cobertura
const paleta = (id, nombre, precio, desc, c, bano, extra) => Object.assign({ id, nombre, precio, desc, dibujo: { tipo: "paleta", c, bano } }, extra);

// Los horarios de casi todas las sucursales (el de Google)
const HORARIO_BASE = {
    0: ["12:00-01:00"], 1: ["12:00-01:00"], 2: ["12:00-01:00"], 3: ["12:00-01:00"], 4: ["12:00-01:00"],
    5: ["12:00-01:30"],
    6: ["12:00-02:00"]
};

window.LOCAL = {
    /* ---------- 1. DATOS DEL LOCAL ---------- */
    demo: true,
    simple: true,                        // modo para quien nunca pidió online: pasos a la vista, textos simples, letra grande y botón de ayuda
    telefono: "+5492257406408",          // REAL (el central de Al-Pino). Cada sucursal puede tener el suyo en "telefono"
    demoPara: "Heladerías Al-Pino",
    demoNota: "La carta y los precios son los de Al-Pino. Los WhatsApp, zonas y horarios de cada sucursal son de ejemplo.",       // la franja de arriba: "Demo preparada para … por Santa Automatiza"
    rubro: "heladeria",
    carpeta: "demo/alpino",
    club: { meta: 5, premio: "un 1/4 kg de regalo", amigo: 10 },   // tarjeta de sellos: a la 5ª compra, premio; "amigo" = % para quien llega invitado
    nombre: "Heladerías Al-Pino",
    lema: "Heladeros artesanos desde 1992. Sabores artesanales y productos locales.",
    logo: "logo.webp",
    ciudad: "La Costa",
    provincia: "Buenos Aires",
    // El WhatsApp de cada sucursal está en "sucursales". El de Al-Pino hoy es uno solo: (2257) 40 6408
    instagram: "heladeriasalpino",
    analytics: "",
    pixel: "",
    planilla: "",

    /* ---------- 2. CÓMO APARECE EN GOOGLE (esta demo no aparece) ---------- */
    seo: {
        palabra: "Helado",
        tipo: "IceCreamShop",
        descripcion: "Helado artesanal desde 1992. Delivery y retiro en sus sucursales de La Costa."
    },

    /* ---------- 3. DISEÑO (los colores del logo) ---------- */
    diseno: {
        marca: "#1A3D37",                 // el verde del logo
        sobreMarca: "#EBD08F",            // el dorado, un poco más claro para que se lea bien sobre el verde
        patron: "liso",
        fuenteTitulos: "Playfair Display",
        // El panel del dueño con los colores de Al-Pino: verde profundo y dorado
        panel: { fondo: "#0F2622", acento: "#1A3D37", acentoClaro: "#E4EEEA", destaque: "#B8893A", destaqueClaro: "#F6EEDC" }
    },
    portada: "portada.webp",

    /* ---------- 4. HORARIOS por defecto (cada sucursal puede tener los suyos) ---------- */
    horarios: HORARIO_BASE,
    pausa: "",
    pedidosCerrado: "bloquear",           // en esta demo, con la sucursal cerrada no se puede pedir

    /* ---------- 5. ENTREGA por defecto (cada sucursal puede cambiarla) ---------- */
    entrega: {
        delivery: { activo: true, demora: "30 a 45 min" },   // la demora es EJEMPLO
        retiro: { activo: true, demora: "10 min" }                                              // EJEMPLO
    },

    /* ---------- 6. LAS SUCURSALES ----------
       Retiro: el cliente elige la sucursal. Delivery: elige su zona y se le asigna la sucursal que la atiende.
       Cada pedido llega al WhatsApp de su sucursal. Las direcciones son reales; lo demás es EJEMPLO. */
    sucursales: [
        {
            id: "las-toninas", nombre: "Sucursal Las Toninas", direccion: "Calle 1 esq. 34", ciudad: "Las Toninas",
            whatsapp: "5492257111101",                                                          // EJEMPLO
            horarios: { 0: ["12:00-00:00"], 1: ["12:00-00:00"], 2: ["12:00-00:00"], 3: ["12:00-00:00"], 4: ["12:00-00:00"], 5: ["12:00-01:00"], 6: ["12:00-01:00"] },   // EJEMPLO
            entrega: { zonas: [{ nombre: "Las Toninas", costo: 2000 }, { nombre: "San Clemente del Tuyú", costo: 2000 }] }   // EJEMPLO
        },
        {
            id: "santa-teresita", nombre: "Sucursal Santa Teresita", direccion: "Calle 2 esq. 32", ciudad: "Santa Teresita",
            whatsapp: "5492257111102",                                                          // EJEMPLO
            entrega: { zonas: [{ nombre: "Santa Teresita", costo: 2000 }, { nombre: "Mar del Tuyú", costo: 2000 }] }   // EJEMPLO
        },
        {
            id: "mar-del-tuyu", nombre: "Sucursal Mar del Tuyú", direccion: "Calle 2 entre 73 y 74", ciudad: "Mar del Tuyú",
            whatsapp: "5492257111103",                                                          // EJEMPLO
            entrega: { zonas: [{ nombre: "Mar del Tuyú", costo: 2000 }, { nombre: "Costa del Este", costo: 2000 }] }   // EJEMPLO
        },
        {
            id: "costa-del-este", nombre: "Sucursal Costa del Este", direccion: "Las Camelias esq. 3", ciudad: "Costa del Este",
            whatsapp: "5492257111104",                                                          // EJEMPLO
            horarios: { 0: ["14:00-00:00"], 1: ["14:00-00:00"], 2: ["14:00-00:00"], 3: ["14:00-00:00"], 4: ["14:00-00:00"], 5: ["14:00-01:00"], 6: ["14:00-01:30"] },   // EJEMPLO
            entrega: { zonas: [{ nombre: "Costa del Este", costo: 2000 }, { nombre: "Aguas Verdes", costo: 2000 }] }   // EJEMPLO
        },
        {
            id: "san-bernardo", nombre: "Sucursal San Bernardo", direccion: "Av. San Bernardo 131", ciudad: "San Bernardo",
            whatsapp: "5492257111105",                                                          // EJEMPLO
            entrega: { zonas: [{ nombre: "San Bernardo", costo: 2000 }, { nombre: "La Lucila del Mar", costo: 2000 }, { nombre: "Aguas Verdes", costo: 2000 }] }   // EJEMPLO
        },
        {
            id: "mar-de-ajo", nombre: "Sucursal Mar de Ajó", direccion: "Azopardo e Yrigoyen", ciudad: "Mar de Ajó",
            whatsapp: "5492257111106",                                                          // EJEMPLO
            entrega: { delivery: { demora: "25 a 40 min" }, zonas: [{ nombre: "Mar de Ajó", costo: 2000 }, { nombre: "Nueva Atlantis", costo: 2000 }, { nombre: "Costa Azul", costo: 2000 }] }   // EJEMPLO
        }
    ],

    /* ---------- 7. PAGOS ---------- */
    pagos: {
        efectivo: { activo: true, descuento: 0 },
        transferencia: { activo: true, alias: "alpino.ejemplo", titular: "Heladerías Al-Pino (ejemplo)" },   // EJEMPLO
        mercadoPago: { activo: true, link: "https://link.mercadopago.com.ar/tulocal" }                      // EJEMPLO
    },

    /* ---------- 8. PROMOS ---------- */
    promos: [
        // Real (post de Instagram). Es solo un cartel: el descuento lo hace Cuenta DNI al pagar.
        { tipo: "aviso", titulo: "25% de ahorro con Cuenta DNI", detalle: "Sábados y domingos, con dinero en cuenta. Válido en todas las sucursales. Tope $8.000 semanal.", dias: [6, 0] },
    ],

    /* ---------- 9. LOS GUSTOS (los de la carta de Al-Pino) ---------- */
    listas: {
        gustos: [].concat(
            familia("Chocolates", [
                ["Chocolate", "#6B4530"],
                ["Chocolate blanco", "#F3E3C4"],
                ["Chocolate Alpino", "#4E2F22", "Con licor Tía María y trozos de chocolate"],
                ["Chocolate blanco Alpino", "#EBD3C4"],
                ["Chocolate amargo", "#3F281D", "Chocolate al 70%"],
                ["Chocolate block", "#5A3B2B", "Con trozos de chocolate block"],
                ["Chocolate con almendras", "#7A5238"],
                ["Chocolate bombón", "#6E4331", "Con bombones rellenos de dulce de leche"],
                ["Chocolate Dubai", "#5F4A2A", "Con capas de pistacho y kadayif crocante"],
                ["Marroc", "#7B4A2C", "Chocolate marroc sembrado con trozos del mismo"],
                ["Ferrero Rocher", "#6A4128", "Chocolate con nutella y trozos de avellanas"]
            ]),
            familia("Cremas", [
                ["Crema americana", "#FAF0D7"],
                ["Crema Oreo", "#D8D2CB", "Crema chantilly con trozos de galletita Oreo"],
                ["Granizado", "#EDE3CC"],
                ["Tramontana", "#E5CB9B"],
                ["Vainilla", "#F6E3A1"],
                ["Banana split", "#F4CE4E"],
                ["Menta granizada", "#86D4AE"],
                ["Frutilla a la crema", "#F59AB5"],
                ["Frutos del bosque", "#8E3B7A", "Crema chantilly con frutos rojos"],
                ["Mousse de limón", "#F3EC9A"]
            ]),
            familia("Al agua", [
                ["Ananá", "#F5D84A"],
                ["Frutilla", "#E8456B"],
                ["Frutos del Caribe", "#F59E2C", "Mix de mango, maracuyá, papaya y banana"],
                ["Frambuesa", "#C2185B"],
                ["Limón", "#F1E46B"],
                ["Limón frutado", "#EFD95B", "Con trozos de durazno, ananá y frutilla"]
            ]),
            familia("Dulce de leche", [
                ["Dulce de leche", "#B9773A"],
                ["Dulce granizado", "#9C6230"],
                ["Dulce Alpino", "#8A5A33", "Con trozos de brownie y nueces"],
                ["Dulce súper", "#A86A2F", "Con dulce de leche repostero"]
            ]),
            familia("Especiales", [
                ["Mascarpone", "#F2E6D8", "Crema mascarpone con frutos rojos"],
                ["Kinder", "#E9D3B8", "Crema sabor Kinder con trozos de huevo Kinder"],
                ["Pistacho", "#A8C66C"],
                ["Bananita Dolca", "#F0D77A", "Crema sabor a bananita Dolca sembrada con trozos de la misma"],
                ["Flan con dulce de leche", "#D9A24E"],
                ["Kinotos al whisky", "#E28A3C"],
                ["Sambayón", "#EFBB45"],
                ["Sambayón con almendras", "#E5AE40"]
            ])
        )
    },

    /* ---------- 10. LA CARTA (la misma en todas las sucursales) ---------- */
    categorias: [
        {
            id: "potes", nombre: "Helado en potes", nota: "Va en pote térmico, para que llegue bien firme.",
            productos: [
                { id: "cuarto", nombre: "1/4 kg", precio: 10800, desc: "Hasta 3 sabores.", dibujo: { tipo: "pote", alto: 34, gustos: ["#B9773A", "#F59AB5"] }, grupos: [gustos(3)] },
                { id: "medio", destacado: true, nombre: "1/2 kg", etiqueta: "El más pedido", precio: 18000, desc: "Hasta 3 sabores.", dibujo: { tipo: "pote", alto: 42, gustos: ["#6B4530", "#F6E3A1", "#F59AB5"] }, grupos: [gustos(3)] },
                { id: "kilo", destacado: true, nombre: "1 kg", precio: 29000, desc: "Hasta 4 sabores.", dibujo: { tipo: "pote", alto: 50, gustos: ["#B9773A", "#86D4AE", "#F59AB5", "#6B4530"] }, grupos: [gustos(4)] }
            ]
        },
        {
            id: "gelatos", nombre: "Gelato Zero y Vegano", nota: "Pote de 200 gramos. Para delivery, mínimo 2 unidades.",
            productos: [
                {
                    id: "gelato-zero", destacado: true, nombre: "Gelato Zero", precio: 10800, desc: "Helado sin azúcar. 0% azúcar, 0% gluten, 100% artesanal.",
                    dibujo: { tipo: "pote", alto: 30, gustos: ["#8E3B7A", "#FAF0D7"], pote: "#F4F1E4" },
                    grupos: [{ id: "sabor", titulo: "Sabor", tipo: "uno", opciones: [{ nombre: "Chocolate y dulce de leche" }, { nombre: "Americana y frutilla" }, { nombre: "Chocolate y frutilla" }, { nombre: "Limón y frutilla" }] }]
                },
                {
                    id: "gelato-vegano", nombre: "Gelato Vegano", precio: 10800, desc: "Sin ingredientes de origen animal. 0% gluten, 100% artesanal.",
                    dibujo: { tipo: "pote", alto: 30, gustos: ["#A8C66C", "#FAF0D7"], pote: "#EEF3E4" },
                    grupos: [{ id: "sabor", titulo: "Sabor", tipo: "uno", opciones: [{ nombre: "Chocolate y dulce de leche" }, { nombre: "Americana y frutilla" }] }]
                }
            ]
        },
        {
            id: "paletas-especiales", nombre: "Paletas especiales", nota: "Para delivery, mínimo 3 unidades.",
            productos: [
                paleta("corazon-rojo", "Corazón rojo", 8400, "Sabor frutilla a la crema, bañada en cobertura de chocolate blanco.", "#E5384F"),
                paleta("pistacho", "Pistacho", 8400, "Sabor pistacho, bañada en cobertura de chocolate blanco con trozos de pistacho.", "#B6CC4A"),
                paleta("corazon-negro", "Corazón negro", 8400, "Sabor Ferrero Rocher, bañada en cobertura de chocolate semi amargo con trozos de avellanas.", "#5A2A45"),
                paleta("frambuesa", "Frambuesa", 8400, "Sabor frambuesa natural, bañada en cobertura de chocolate blanco y semi amargo.", "#7A1F3D"),
                paleta("corazon-mixto", "Corazón mixto", 8400, "Sabor bon o bon, bañada en cobertura de chocolate blanco y semi amargo.", "#F2D6D0", "#3B2418"),
                paleta("kinder", "Kinder", 8400, "Sabor Kinder, bañada en cobertura de chocolate blanco y semi amargo.", "#EBD7C2", "#3B2418"),
                paleta("patita-negra", "Patita negra", 8400, "Sabor crema Oreo, bañada en cobertura de chocolate semi amargo y blanco.", "#3B2418"),
                paleta("patita-blanca", "Patita blanca", 8400, "Sabor dulce de leche, bañada en cobertura de chocolate blanco y semi amargo.", "#F2E6D8")
            ]
        },
        {
            id: "paletas-deluxe", nombre: "Paletas deluxe", nota: "Para delivery, mínimo 3 unidades.",
            productos: [
                paleta("cerdito", "Cerdito", 9600, "Sabor chantilly, bañada en cobertura de chocolate blanco.", "#F58FB5"),
                paleta("panda", "Panda", 9600, "Sabor chocolate, bañada en cobertura de chocolate blanco y semi amargo.", "#F7F3EA", "#2B1A12"),
                paleta("kitty", "Kitty", 9600, "Sabor vainilla, bañada en cobertura de chocolate blanco.", "#F8F4EE"),
                paleta("emoji", "Emoji", 9600, "Sabor dulce de leche, bañada en cobertura de chocolate blanco.", "#F6C93A"),
                paleta("dona-split", "Dona split", 9600, "Sabor banana split, bañada en cobertura de chocolate blanco.", "#F4EEDC", "#4A3426"),
                paleta("dona-rosa", "Dona rosa", 9600, "Sabor frutilla a la crema, bañada en cobertura de chocolate blanco.", "#F06AA6"),
                paleta("dubai", "Dubai", 9600, "Sabor chocolate Dubai, bañada en cobertura de chocolate semi amargo.", "#3B2A1C", "#A8B84A"),
                paleta("minion", "Minion", 9600, "Sabor chantilly, bañada en cobertura de chocolate blanco.", "#F2D23A")
            ]
        },
        {
            id: "paletas-otras", nombre: "Cannoli, agua y classic", nota: "Para delivery, mínimo 3 unidades.",
            productos: [
                paleta("cannoli-nocciola", "Cannoli nocciola", 9600, "Oblea rellena de nocciola Nutella, bañada en cobertura de chocolate blanco y trozos de avellanas.", "#E8D3BC", "#5A3826"),
                paleta("cannoli-pistacho", "Cannoli pistacho", 9600, "Oblea rellena de pistacho, bañada en cobertura de chocolate blanco y trozos de pistachos.", "#B6CC4A", "#4A3A22"),
                paleta("cannoli-dulce-de-leche", "Cannoli dulce de leche", 9600, "Oblea rellena de dulce de leche, bañada en cobertura de chocolate semi amargo.", "#3B2418", "#F2E6D8"),
                paleta("agua-limon", "Paleta al agua de limón", 6000, "Elaborada 100% con jugo natural.", "#F6F0E4"),
                paleta("agua-frutilla", "Paleta al agua de frutilla", 6000, "Elaborada 100% con frutillas naturales frescas.", "#E8456B"),
                paleta("tableta-negra", "Tableta negra", 7200, "Sabor chantilly, bañada en cobertura de chocolate semi amargo.", "#4A2C1E"),
                paleta("crocante-blanco", "Crocante blanco", 7200, "Sabor dulce de leche, bañada en cobertura de chocolate blanco con trozos de maní.", "#F6E6DC"),
                paleta("crocante-negro", "Crocante negro", 7200, "Sabor chocolate, bañada en cobertura de chocolate semi amargo con trozos de maní.", "#3B2418")
            ]
        },
        {
            id: "alfajores", nombre: "Alfajores helados", nota: "Para delivery, mínimo 3 unidades.",
            productos: [
                paleta("alfajor-blanco", "Alfajor blanco", 7200, "Relleno de dulce de leche, con dulce de leche repostero y doble baño de cobertura.", "#F6F0E4", "#F6F0E4", { dibujo: { tipo: "torta", c: "#F6F0E4", arriba: "#FFFFFF", capa: "#B9773A", base: "#EDE3CC", fruta: "#F6F0E4" } }),
                paleta("alfajor-negro", "Alfajor negro", 7200, "Relleno de crema americana, con dulce de leche repostero y doble baño de cobertura.", "#3B2418", "#3B2418", { dibujo: { tipo: "torta", c: "#3B2418", arriba: "#2B1A12", capa: "#FAF0D7", base: "#2B1A12", fruta: "#3B2418" } }),
                paleta("alfajor-pistacho", "Alfajor pistacho", 7200, "Relleno de pistacho, con dulce repostero y doble baño de cobertura.", "#B6CC4A", "#B6CC4A", { dibujo: { tipo: "torta", c: "#B6CC4A", arriba: "#D8E69A", capa: "#B9773A", base: "#8FA83A", fruta: "#C8D868" } })
            ]
        },
        {
            id: "tortas", nombre: "Tortas heladas",
            productos: [
                { id: "torta-dubai", destacado: true, nombre: "Torta Dubai", precio: 58000, desc: "Sabor chocolate Dubai, bañada en cobertura de chocolate semi amargo.", dibujo: { tipo: "torta", c: "#3B2A1C", arriba: "#A8B84A", capa: "#A8B84A", base: "#2B1A12", fruta: "#C8D868" } },
                { id: "torta-cheesecake", nombre: "Torta Cheesecake", precio: 58000, desc: "Sabor cheesecake de pistacho, bañada en cobertura de chocolate blanco.", dibujo: { tipo: "torta", c: "#B6CC4A", arriba: "#D8E69A", capa: "#F6F0E4", base: "#8FA83A", fruta: "#F6F0E4" } },
                { id: "torta-rama", nombre: "Torta Rama", precio: 58000, desc: "Sabor pistacho y chocolate Al-Pino, bañada en cobertura de chocolate blanco.", dibujo: { tipo: "torta", c: "#B6CC4A", arriba: "#4A3A22", capa: "#4A3A22", base: "#8FA83A", fruta: "#4A3A22" } },
                { id: "torta-saturn", nombre: "Torta Saturn", precio: 58000, desc: "Sabor chocolate bombón y chantilly, bañada en cobertura de chocolate semi amargo.", dibujo: { tipo: "torta", c: "#C9955A", arriba: "#5A3826", capa: "#F2E6D8", base: "#7A4A2E", fruta: "#5A3826" } },
                { id: "torta-cubik", nombre: "Torta Cubik", precio: 58000, desc: "Sabor crema Baileys y chocolate, bañada en cobertura de chocolate semi amargo y blanco.", dibujo: { tipo: "torta", c: "#3B2418", arriba: "#F2E6D8", capa: "#F2E6D8", base: "#2B1A12", fruta: "#F2E6D8" } },
                { id: "torta-corazon-rojo", nombre: "Torta corazón rojo", precio: 49000, desc: "Sabor frutilla a la crema y chantilly, bañada en cobertura de chocolate blanco.", dibujo: { tipo: "torta", c: "#E5384F", arriba: "#F8C6CE", capa: "#F8C6CE", base: "#B02A3C", fruta: "#F8C6CE" } },
                { id: "torta-corazon-negro", nombre: "Torta corazón negro", precio: 49000, desc: "Sabor Ferrero Rocher, bañada en cobertura de chocolate semi amargo.", dibujo: { tipo: "torta", c: "#3B2418", arriba: "#F2D77A", capa: "#F2D77A", base: "#2B1A12", fruta: "#F2D77A" } }
            ]
        }
    ]
};
