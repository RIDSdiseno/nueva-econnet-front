/**
 * Lo que ve un buscador y lo que extrae un motor de IA.
 *
 * Estas pruebas piden el HTML **sin ejecutar JavaScript** (`request`, no
 * `page`): es exactamente lo que hace un bot que no renderiza. Si el
 * prerenderizado se rompe, aquí se ve; en el navegador no se notaría nunca,
 * porque el navegador sí ejecuta el JavaScript.
 */
import { expect, test } from "@playwright/test";

const LANDINGS = [
  ["notebooks-para-trabajar", "Notebooks para trabajar"],
  ["notebooks-para-empresas", "Equipar tu empresa"],
  ["notebooks-para-estudiantes", "Notebooks para la universidad"],
  ["notebooks-gamer", "Notebooks para jugar"],
  ["notebooks-reacondicionados", "Equipos renovados, con la condición por delante"],
  ["all-in-one-para-oficina", "All-in-One para puestos fijos"],
  ["camaras-de-seguridad", "Cámaras de seguridad"]
];

test.describe("sin JavaScript", () => {
  for (const [slug, h1] of LANDINGS) {
    test(`la landing ${slug} trae su contenido en el HTML`, async ({ request }) => {
      const html = await (await request.get(`/${slug}`)).text();

      expect(html).toContain(`>${h1}</h1>`);
      expect(html).toContain("Qué pedir");
      expect(html).toMatch(/<title>.{20,}<\/title>/);
      expect(html).toContain('<link rel="canonical"');
      expect(html).toContain('"@type":"FAQPage"');
    });
  }

  test("la portada y la tienda traen contenido y datos del negocio", async ({ request }) => {
    const portada = await (await request.get("/")).text();
    expect(portada).toContain("Tecnología elegida");
    expect(portada).toContain('"@type":"Store"');
    expect(portada).toContain("La Concepción 65");

    const tienda = await (await request.get("/tienda")).text();
    expect(tienda).toContain("Todos los equipos");
  });

  test("una ficha de producto trae precio y condición como datos estructurados", async ({ request }) => {
    const html = await (await request.get("/tienda/asus-expertbook-pm3406cka-ly0433x")).text();

    expect(html).toContain('"@type":"Product"');
    expect(html).toContain('"priceCurrency":"CLP"');
    expect(html).toContain("<title>ASUS ExpertBook PM3406CKA-LY0433X | Econnet</title>");
  });

  test("un producto sin precio propio NO declara oferta: no se inventa un precio", async ({ request }) => {
    const html = await (await request.get("/tienda/asus-tuf-gaming-f16-fx607vj-rl027w")).text();

    expect(html).toContain('"@type":"Product"');
    expect(html).not.toContain('"offers"');
  });

  test("cada página tiene su propio título y su canónica", async ({ request }) => {
    const titulos = new Set<string>();

    for (const ruta of ["/", "/tienda", "/empresas", "/guia-de-compra", "/notebooks-gamer"]) {
      const html = await (await request.get(ruta)).text();
      const titulo = /<title>([^<]+)<\/title>/.exec(html)?.[1] ?? "";
      const canonica = /<link rel="canonical" href="([^"]+)"/.exec(html)?.[1] ?? "";

      expect(titulo.length).toBeGreaterThan(10);
      expect(canonica).toBe(`https://econnet.cl${ruta === "/" ? "" : ruta}`);
      titulos.add(titulo);
    }

    expect(titulos.size).toBe(5); /* ninguno repetido: dos iguales compiten entre sí */
  });
});

test.describe("ficheros para robots", () => {
  test("robots.txt deja entrar a los bots de IA y apunta al sitemap", async ({ request }) => {
    const texto = await (await request.get("/robots.txt")).text();

    expect(texto).toContain("Sitemap: https://econnet.cl/sitemap.xml");
    for (const bot of ["GPTBot", "ClaudeBot", "PerplexityBot", "Google-Extended"]) {
      expect(texto).toContain(bot);
    }
    expect(texto).toContain("Disallow: /checkout");
  });

  test("el sitemap lleva las landings y las fichas, y nada privado", async ({ request }) => {
    const xml = await (await request.get("/sitemap.xml")).text();

    expect(xml).toContain("https://econnet.cl/notebooks-para-empresas");
    expect(xml).toContain("https://econnet.cl/tienda/asus-expertbook-pm3406cka-ly0433x");
    expect(xml).not.toContain("/checkout");
    expect(xml).not.toContain("/carrito");
  });

  test("llms.txt cuenta qué es Econnet y qué lo distingue", async ({ request }) => {
    const texto = await (await request.get("/llms.txt")).text();

    expect(texto).toContain("# Econnet");
    expect(texto).toContain("para quién no es");
    expect(texto).toContain("La Concepción 65");
    expect(texto).toMatch(/Condición: /); /* el catálogo entró */
  });
});

test.describe("feeds de anuncios", () => {
  test("el informe dice qué se puede anunciar hoy y qué falta", async ({ request }) => {
    const r = await request.get("/api/feed/informe");
    const { informe } = (await r.json()) as {
      informe: { total: number; publicables: number; sePuedeAnunciar: boolean; faltas: Array<{ falta: string; productos: number }> };
    };

    expect(informe.total).toBe(15);
    /* Con el catálogo del 18-09-2026 no hay ni una foto: no se puede anunciar. */
    expect(informe.publicables).toBe(0);
    expect(informe.sePuedeAnunciar).toBe(false);
    expect(informe.faltas.find((f) => f.falta === "sin imagen")?.productos).toBe(15);
  });

  test("el feed de Google sale válido aunque salga vacío", async ({ request }) => {
    const xml = await (await request.get("/api/feed/google.xml")).text();
    expect(xml).toContain("<rss version=\"2.0\"");
    expect(xml).toContain("<title>Econnet</title>");
  });
});

test.describe("asesoría por WhatsApp", () => {
  test("sin número configurado, no hay ningún enlace a wa.me en toda la tienda", async ({ page }) => {
    /* Hoy VITE_WHATSAPP está vacía: el marcador de la maqueta era un número
       que no existe, y un botón verde que no contesta cuesta más que no
       tenerlo. Esta prueba se cae el día que se configure de verdad — y
       entonces hay que cambiarla, no borrarla. */
    for (const ruta of ["/", "/tienda", "/tienda/asus-expertbook-pm3406cka-ly0433x", "/empresas"]) {
      await page.goto(ruta);
      await expect(page.locator('a[href*="wa.me"]')).toHaveCount(0);
    }
  });

  test("un equipo sin precio propio ofrece el aviso por correo en vez de un botón muerto", async ({ page }) => {
    await page.goto("/tienda/asus-tuf-gaming-f16-fx607vj-rl027w");

    await expect(page.getByText(/todavía no tiene precio publicado/)).toBeVisible();
    await expect(page.getByText("¿Te avisamos cuando tenga precio?")).toBeVisible();
  });
});

test.describe("los enlaces que el backend pone en los correos", () => {
  /* La migración cambió las URLs y los correos siguieron apuntando a las
     viejas: `/tienda/carrito` caía en la ficha de un producto inexistente, y
     era el enlace del correo de carrito abandonado. Esta prueba cruza la
     frontera —backend y tienda son repos distintos— y por eso vive aquí. */
  const RUTAS_DE_LOS_CORREOS = ["/", "/tienda", "/carrito", "/seguimiento", "/cotizacion", "/guia-de-compra", "/empresas"];

  for (const ruta of RUTAS_DE_LOS_CORREOS) {
    test(`${ruta} abre una página de verdad, no un 404`, async ({ page }) => {
      await page.goto(ruta);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(page.getByText("Esta página no existe")).toHaveCount(0);
      await expect(page.getByText("No encontramos ese equipo")).toHaveCount(0);
    });
  }
});

test.describe("la ficha entrega el producto sin JavaScript", () => {
  /* Era el peor fallo de SEO: el HTML decía literalmente «Cargando…». */
  test("nombre, precio, condición y especificaciones vienen en el HTML", async ({ request }) => {
    const html = await (await request.get("/tienda/asus-expertbook-pm3406cka-ly0433x")).text();

    expect(html).not.toContain("Cargando…");
    for (const dato of ["ExpertBook PM3406CKA-LY0433X", "1.185.990", "Ryzen", "16 GB DDR5", "Windows 11 Pro"]) {
      expect(html, `falta «${dato}» en el HTML`).toContain(dato);
    }
    /* Y lo que diferencia a Econnet: para quién NO es. */
    expect(html).toMatch(/No es para ti si/);
  });

  test("el catálogo trae los productos en el HTML, no una rejilla vacía", async ({ request }) => {
    const html = await (await request.get("/tienda")).text();
    /* React deja comentarios entre nodos de texto al renderizar en servidor
       («15<!-- --> <!-- -->equipos»). Un buscador los ignora; esta prueba
       también, para no atarse a un detalle del renderizador. */
    const texto = html.replace(/<!--.*?-->/g, "");

    expect(html).not.toContain("Cargando el catálogo");
    expect(html).toContain("ExpertBook");
    expect(texto).toMatch(/15\s+equipos/);
    /* Y las facetas calculadas del catálogo, no una lista fija. */
    expect(texto).toMatch(/Memoria/);
  });

  test("un producto sin foto no inventa ninguna etiqueta de imagen", async ({ request }) => {
    const html = await (await request.get("/tienda/asus-expertbook-pm3406cka-ly0433x")).text();

    expect(html).not.toContain("og:image");
    expect(html).not.toContain('"image"');
    /* Y se dice que es un dibujo, no una foto del equipo. */
    expect(html).toMatch(/sin fotografía disponible/);
  });

  test("los filtros de la tienda solo ofrecen lo que tiene datos", async ({ page }) => {
    await page.goto("/tienda");
    const lateral = page.locator("aside").first();

    await expect(lateral.getByText("Marca")).toBeVisible();
    /* Ningún producto declara GPU en el catálogo de hoy: ese filtro no existe. */
    await expect(lateral.getByText("Gráfica", { exact: true })).toHaveCount(0);
  });
});
