/**
 * Escribe el HTML de verdad de cada ruta pública, más `sitemap.xml`,
 * `robots.txt` y `llms.txt`.
 *
 * Se ejecuta después de `vite build` y de `vite build --ssr`. Lo que produce
 * es lo que ve un buscador y lo que extrae un motor de IA **sin ejecutar
 * JavaScript**: título, descripción, canónica, Open Graph, datos
 * estructurados y el contenido de la página.
 *
 * El catálogo se pide a la API si está a mano. Si no responde —en CI no
 * responde—, las páginas se escriben igual con su contenido y el sitemap sale
 * sin las fichas de producto. Se dice en pantalla en vez de fallar callando.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

interface ModuloServidor {
  render: (ruta: string, datos?: { catalogo?: unknown[]; producto?: unknown; negocio?: unknown }) => string;
  ID_ISLA: string;
  metadatosDe: (ruta: string) => { titulo: string; descripcion: string; datos?: object[] };
  negocioLd: () => object;
  RUTAS_PUBLICAS: string[];
  SITIO: string;
  LANDINGS: Array<{ slug: string; h1: string; descripcion: string }>;
}

interface ProductoMinimo {
  slug: string;
  imagenUrl?: string | null;
  marca: string;
  nombre: string;
  condicion: string | null;
  precio: { venta: number | null };
  stock: { estado: string };
  specs: Record<string, string | null>;
  para: string;
}

const DIST = "dist";

/**
 * Los datos estructurados de un producto.
 *
 * Solo sale `offers` cuando hay precio propio, y `availability` solo cuando el
 * stock consta. Declarar «InStock» de un equipo cuyo stock no se conoce es lo
 * que termina en cuenta de Merchant suspendida — y en un cliente esperando
 * algo que no hay.
 */
function productoLd(p: ProductoMinimo, sitio: string): object {
  const CONDICION: Record<string, string> = {
    NUEVO: "https://schema.org/NewCondition",
    OPENBOX: "https://schema.org/NewCondition",
    REACONDICIONADO: "https://schema.org/RefurbishedCondition",
    SEMINUEVO: "https://schema.org/UsedCondition",
    USADO: "https://schema.org/UsedCondition"
  };
  const DISPONIBLE: Record<string, string> = {
    EN_STOCK: "https://schema.org/InStock",
    LIMITADO: "https://schema.org/LimitedAvailability",
    SIN_EXISTENCIAS: "https://schema.org/OutOfStock"
  };

  const oferta =
    p.precio.venta !== null
      ? {
          offers: {
            "@type": "Offer",
            price: p.precio.venta,
            priceCurrency: "CLP",
            url: `${sitio}/tienda/${p.slug}`,
            ...(p.condicion && CONDICION[p.condicion] ? { itemCondition: CONDICION[p.condicion] } : {}),
            ...(DISPONIBLE[p.stock.estado] ? { availability: DISPONIBLE[p.stock.estado] } : {})
          }
        }
      : {};

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${p.marca} ${p.nombre}`,
    brand: { "@type": "Brand", name: p.marca },
    description: p.para,
    /* Solo si existe: un `image` vacío hace que Merchant rechace el producto. */
    ...(p.imagenUrl ? { image: [p.imagenUrl] } : {}),
    ...oferta
  };
}
const escapar = (t: string) =>
  t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * Los datos van en una isla JSON, no en un `<script>` que se ejecute: así no
 * hace falta abrir la CSP con `unsafe-inline` ni con hashes. El `<` escapado
 * evita que un dato con `</script>` dentro cierre la etiqueta.
 */
const isla = (id: string, datos: unknown): string =>
  `<script type="application/json" id="${id}">${JSON.stringify(datos).replace(/</g, "\\u003c")}</script>`;

/**
 * De dónde saca el catálogo el prerenderizado.
 *
 * `API_URL` primero, y no `VITE_API_URL`, a propósito: lo que empieza por
 * `VITE_` se **hornea en el bundle del navegador**. Poniendo ahí la URL de la
 * API para que la lea este guion, el navegador acaba llamando a otro origen y
 * se come un CORS. `API_URL` solo la ve Node, al construir.
 */
const baseApi = (): string => (process.env.API_URL ?? process.env.VITE_API_URL ?? "").replace(/\/$/, "");

async function catalogo(): Promise<ProductoMinimo[]> {
  const base = baseApi();
  if (!base) return [];
  try {
    const respuesta = await fetch(`${base}/api/catalogo`, { signal: AbortSignal.timeout(5000) });
    const datos = (await respuesta.json()) as { productos?: ProductoMinimo[] };
    return datos.productos ?? [];
  } catch {
    return [];
  }
}

/**
 * Los datos de la empresa, en el HTML.
 *
 * Van aquí porque los textos legales los llevan impresos y un bot no ejecuta
 * JavaScript: sin esto, la página de términos que ve un buscador diría
 * «razón social» en ámbar en vez de la razón social. Si la API no responde,
 * se sigue sin ellos y la web los pide al cargar, como siempre.
 */
async function negocio(): Promise<Record<string, string | null> | undefined> {
  const base = baseApi();
  if (!base) return undefined;
  try {
    const respuesta = await fetch(`${base}/api/negocio`, { signal: AbortSignal.timeout(5000) });
    const datos = (await respuesta.json()) as { negocio?: Record<string, string | null> };
    return datos.negocio;
  } catch {
    return undefined;
  }
}

function cabeza(
  plantilla: string,
  opciones: { ruta: string; titulo: string; descripcion: string; sitio: string; datos: object[]; imagen?: string | null }
): string {
  const { ruta, titulo, descripcion, sitio, datos, imagen } = opciones;
  const canonica = `${sitio}${ruta === "/" ? "" : ruta}`;

  const etiquetas = [
    `<title>${escapar(titulo)}</title>`,
    `<meta name="description" content="${escapar(descripcion)}" />`,
    `<link rel="canonical" href="${canonica}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="Econnet" />`,
    `<meta property="og:title" content="${escapar(titulo)}" />`,
    `<meta property="og:description" content="${escapar(descripcion)}" />`,
    `<meta property="og:url" content="${canonica}" />`,
    `<meta property="og:locale" content="es_CL" />`,
    `<meta name="twitter:card" content="${imagen ? "summary_large_image" : "summary"}" />`,
    ...(imagen ? [`<meta property="og:image" content="${escapar(imagen)}" />`] : []),
    ...datos.map((d) => `<script type="application/ld+json">${JSON.stringify(d)}</script>`)
  ].join("\n    ");

  return plantilla
    .replace(/<title>[\s\S]*?<\/title>\s*/, "")
    .replace(/<meta name="description"[^>]*>\s*/, "")
    .replace("</head>", `  ${etiquetas}\n  </head>`);
}

function sitemap(sitio: string, rutas: string[], productos: ProductoMinimo[]): string {
  const hoy = new Date().toISOString().slice(0, 10);
  const prioridad = (ruta: string) => (ruta === "/" ? "1.0" : ruta.startsWith("/legal") ? "0.3" : "0.8");
  const urls = [
    ...rutas.map((ruta) => ({ loc: `${sitio}${ruta === "/" ? "/" : ruta}`, p: prioridad(ruta) })),
    ...productos.map((p) => ({ loc: `${sitio}/tienda/${p.slug}`, p: "0.7" }))
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u.loc}</loc><lastmod>${hoy}</lastmod><priority>${u.p}</priority></url>`).join("\n")}
</urlset>
`;
}

const robots = (sitio: string): string => `# Econnet
User-agent: *
Allow: /
Disallow: /api/
Disallow: /carrito
Disallow: /checkout
Disallow: /tienda/gracias
Disallow: /cotizacion
# El panel de inventario. Cerrado con clave, y además fuera del índice.
Disallow: /panel

# Los motores de IA entran: que nos citen es tráfico y es marca.
User-agent: GPTBot
Allow: /
User-agent: ClaudeBot
Allow: /
User-agent: PerplexityBot
Allow: /
User-agent: Google-Extended
Allow: /

Sitemap: ${sitio}/sitemap.xml
`;

function llms(modulo: ModuloServidor, productos: ProductoMinimo[]): string {
  const { SITIO, LANDINGS } = modulo;
  const clp = (n: number | null) => (n === null ? "precio en tienda por confirmar" : `$${n.toLocaleString("es-CL")}`);

  const catalogo = productos.length
    ? productos
        .slice(0, 12)
        .map((p) => {
          const specs = [p.specs.cpu, p.specs.ram, p.specs.almacenamiento].filter(Boolean).join(", ");
          return `- **${p.marca} ${p.nombre}** — ${specs}. ${clp(p.precio.venta)}. Condición: ${
            p.condicion ? p.condicion.toLowerCase() : "por confirmar"
          }. Para: ${p.para}`;
        })
        .join("\n")
    : "_(El catálogo no estaba disponible al generar este fichero.)_";

  return `# Econnet

> Tienda chilena de tecnología: notebooks y equipos profesionales seleccionados,
> nuevos, openbox y reacondicionados, con asesoría para elegir. Oficina en
> La Concepción 65, oficina 1003, Providencia, Santiago. Horario 08:30 a 18:00.
> Despacho a todo Chile. Boleta o factura. Pago con Webpay y Mercado Pago.

Lo que distingue a Econnet de una tienda grande: cada equipo lleva escrito para
quién es y **para quién no es**, y la condición del equipo (nuevo, openbox,
reacondicionado o seminuevo) va declarada antes del precio. Cuando un dato no
consta en la fuente, la página dice «por confirmar» en vez de suponerlo.

## Guías

${LANDINGS.map((l) => `- [${l.h1}](${SITIO}/${l.slug}): ${l.descripcion}`).join("\n")}
- [Cómo elegir un notebook sin saber de especificaciones](${SITIO}/guia-de-compra)

## Catálogo

${catalogo}

## Empresas

Cotización con modelos concretos, neto e IVA desglosados y validez escrita, en
el momento: ${SITIO}/empresas

## Contacto

- Web: ${SITIO}
- Dirección: La Concepción 65, oficina 1003, Providencia, Santiago, Chile
- Horario: lunes a viernes de 08:30 a 18:00
`;
}

async function escribir(ruta: string, contenido: string): Promise<void> {
  const destino = join(DIST, ruta);
  await mkdir(dirname(destino), { recursive: true });
  await writeFile(destino, contenido, "utf8");
}

async function principal(): Promise<void> {
  const modulo = (await import("../dist-servidor/entry-servidor.js")) as unknown as ModuloServidor;
  const plantilla = await readFile(join(DIST, "index.html"), "utf8");
  const [productos, empresa] = await Promise.all([catalogo(), negocio()]);

  const rutas = [...modulo.RUTAS_PUBLICAS, ...productos.map((p) => `/tienda/${p.slug}`)];

  const porRuta = new Map(productos.map((p) => [`/tienda/${p.slug}`, p]));

  for (const ruta of rutas) {
    const producto = porRuta.get(ruta);
    const precarga = {
      ...(producto ? { producto } : {}),
      catalogo: productos,
      ...(empresa ? { negocio: empresa } : {})
    };
    const meta = producto
      ? {
          titulo: `${producto.marca} ${producto.nombre} | Econnet`,
          descripcion: producto.para.slice(0, 155),
          datos: [productoLd(producto, modulo.SITIO)]
        }
      : modulo.metadatosDe(ruta);
    const cuerpo = modulo.render(ruta, precarga);
    const datos = [modulo.negocioLd(), ...(meta.datos ?? [])];

    const html = cabeza(plantilla, {
      ruta,
      titulo: meta.titulo,
      descripcion: meta.descripcion,
      sitio: modulo.SITIO,
      datos,
      imagen: producto?.imagenUrl ?? null
    })
      .replace('<div id="raiz"></div>', `<div id="raiz">${cuerpo}</div>`)
      .replace("</body>", `  ${isla(modulo.ID_ISLA, precarga)}\n  </body>`);

    /**
     * Fichero plano (`/tienda/x` → `tienda/x.html`), no `carpeta/index.html`.
     * Es lo que resuelven tanto `vite preview` como Vercel con `cleanUrls`:
     * con `carpeta/index.html`, la URL sin barra final se la come el
     * «todo a index.html» del SPA y el buscador ve una página vacía.
     */
    await escribir(ruta === "/" ? "index.html" : `${ruta.replace(/^\//, "")}.html`, html);
  }

  await escribir("sitemap.xml", sitemap(modulo.SITIO, modulo.RUTAS_PUBLICAS, productos));
  await escribir("robots.txt", robots(modulo.SITIO));
  await escribir("llms.txt", llms(modulo, productos));

  const aviso = productos.length
    ? `${productos.length} fichas de producto`
    : "SIN catálogo (la API no respondió: el sitemap va sin fichas de producto)";
  console.log(`prerenderizado: ${rutas.length} páginas · ${aviso}`);
}

void principal();
