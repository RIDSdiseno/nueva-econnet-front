/**
 * El panel de inventario, contra el backend de verdad.
 *
 * Lo que se prueba aquí no es la pantalla: es que el panel y la tienda son la
 * misma cosa. Un equipo dado de alta con precio y stock tiene que aparecer en
 * `/tienda` sin volver a construir nada, y uno retirado tiene que desaparecer.
 *
 * Necesita el backend en pie con `ADMIN_CLAVE_HASH` puesto y la clave en
 * `E2E_CLAVE_PANEL`. Sin eso la batería se salta sola: no hay forma de probar
 * un panel cerrado sin abrirlo.
 */
import { expect, test, type BrowserContext, type Page } from "@playwright/test";

const CLAVE = process.env.E2E_CLAVE_PANEL ?? "";

/** Un identificador distinto en cada pasada: la base no se limpia entre e2e. */
const sufijo = () => Date.now().toString(36);

/** Un PNG de 1×1 de verdad: lo que el servidor comprueba son sus primeros bytes. */
const PNG_1PX =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

/**
 * El checkout, rellenado despacio a propósito: el servidor descarta como robot
 * todo formulario enviado en menos de 1,2 s.
 */
async function rellenarComoPersona(pagina: Page, region = "Metropolitana de Santiago") {
  await pagina.getByLabel("Nombre y apellido", { exact: true }).fill("Omar García");
  await pagina.getByLabel("Correo", { exact: true }).fill(`panel+${Date.now()}@econnet-pruebas.cl`);
  await pagina.getByLabel("Región", { exact: true }).selectOption(region);
  await pagina.getByLabel("Comuna", { exact: true }).fill("Providencia");
  await pagina.getByLabel("Dirección", { exact: true }).fill("La Concepción 65, oficina 1003");
  await pagina.getByRole("checkbox", { name: /términos y condiciones/i }).check();
  await pagina.waitForTimeout(1600);
}

/**
 * Se entra **una sola vez** para toda la batería, y las demás pruebas abren
 * pestañas de ese mismo contexto. No es por velocidad: el backend limita los
 * intentos de clave por IP (10 por ventana), y una prueba que entra ocho veces
 * se choca con su propia protección. Bajar el límite para que quepan las
 * pruebas sería apagar lo que se quiere tener puesto.
 */
let contexto: BrowserContext;

/**
 * El formulario del equipo. Hay que acotar a él: «Unidades» también es la
 * etiqueta de la celda editable de cada fila de la tabla, y sin acotar el
 * localizador encuentra diecisiete.
 */
const ficha = (pagina: Page) => pagina.getByRole("dialog");

/**
 * Lo que estas pruebas dan de alta. Al terminar se retira, no se borra: es la
 * regla de la casa, y además el catálogo es compartido — un equipo de prueba
 * olvidado descuadra el informe de feeds, que cuenta cuántos hay.
 */
const creados: string[] = [];

/** Abre el formulario de alta y lo rellena con lo mínimo. */
async function nuevoEquipo(pagina: Page, marca: string, nombre: string) {
  creados.push(`${marca} ${nombre}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""));
  await pagina.getByRole("button", { name: /Añadir equipo/ }).click();
  const formulario = ficha(pagina);
  await formulario.getByLabel(/^Marca/).fill(marca);
  await formulario.getByLabel(/^Nombre/).fill(nombre);
  await formulario.getByLabel(/^Categoría/).fill("Notebook");
  return formulario;
}

async function panelAbierto(): Promise<Page> {
  const pagina = await contexto.newPage();
  await pagina.goto("/panel");
  await expect(pagina.getByRole("button", { name: /Añadir equipo/ })).toBeVisible();
  return pagina;
}

/**
 * Se entra una vez para **todo el fichero**, no por bloque: el `beforeAll` de
 * un `describe` no alcanza a los demás, y el segundo bloque se quedaba sin
 * contexto y fallaba en tres milisegundos.
 */
test.skip(!CLAVE, "sin E2E_CLAVE_PANEL no se puede abrir el panel");

test.beforeAll(async ({ browser, baseURL }) => {
  contexto = await browser.newContext({ baseURL });
  const pagina = await contexto.newPage();
  await pagina.goto("/panel");
  await pagina.getByLabel("Clave").fill(CLAVE);
  await pagina.getByRole("button", { name: "Entrar" }).click();
  await expect(pagina.getByRole("button", { name: /Añadir equipo/ })).toBeVisible();
  await pagina.close();
});

test.afterAll(async () => {
  /* Se retiran, no se borran: salen del catálogo público y se quedan en el
     panel con su historial, que es lo que hace el panel de verdad. */
  for (const id of creados) {
    await contexto?.request
      .post(`/api/panel/productos/${id}/archivo`, {
        data: { archivar: true, motivo: "equipo de prueba de extremo a extremo" },
        headers: { "X-Panel": "1" }
      })
      .catch(() => undefined);
  }
  /* Los ajustes que toca esta batería se devuelven a vacío. Si no, la
     siguiente pasada arranca con la tarifa ya puesta —y entonces no hay nada
     que guardar, que es justo lo que la prueba quiere ver cambiar—, y además
     deja la tienda de desarrollo con datos legales inventados. */
  await contexto?.request
    .post("/api/panel/ajustes", {
      data: { ENVIO_TABLA: "", RAZON_SOCIAL: "", RUT_EMPRESA: "" },
      headers: { "X-Panel": "1" }
    })
    .catch(() => undefined);

  await contexto?.close();
});

test.describe("el panel de inventario", () => {

  test("sin clave no se ve nada del inventario", async ({ page }) => {
    await page.goto("/panel");
    await expect(page.getByLabel("Clave")).toBeVisible();
    await expect(page.getByRole("table")).toHaveCount(0);
  });

  test("con la clave equivocada no entra y lo dice", async ({ page }) => {
    await page.goto("/panel");
    await page.getByLabel("Clave").fill("esta-no-es-la-clave");
    await page.getByRole("button", { name: "Entrar" }).click();

    await expect(page.getByRole("alert")).toContainText(/incorrecta/i);
    await expect(page.getByRole("table")).toHaveCount(0);
  });

  test("el inventario enseña los equipos y qué le falta a cada uno", async () => {
    const page = await panelAbierto();

    await expect(page.getByRole("table")).toBeVisible();
    /* Hoy ningún equipo tiene fotografía: el panel lo cuenta como hueco. */
    await expect(page.getByRole("button", { name: /sin imagen · \d+/ })).toBeVisible();
  });

  test("un equipo dado de alta con precio y stock aparece en la tienda sin volver a publicar", async () => {
    const page = await panelAbierto();
    const marca = `PruebaPanel${sufijo()}`;

    const formulario = await nuevoEquipo(page, marca, "Equipo de prueba e2e");
    await formulario.getByLabel("Precio de venta (IVA incluido)").fill("499990");
    await formulario.getByLabel("Unidades").fill("5");
    await formulario.getByRole("button", { name: "Añadir al inventario" }).click();

    /* Aparece ya en el panel… */
    await expect(page.getByText(`${marca} Equipo de prueba e2e`)).toBeVisible();

    /* …y en la tienda pública, que sirve HTML construido antes de existir. */
    await page.goto("/tienda");
    await expect(page.getByText(`${marca} Equipo de prueba e2e`)).toBeVisible();
    await expect(page.getByText("$499.990").first()).toBeVisible();
  });

  test("lo que se da de alta sin precio no se puede comprar, y la ficha lo dice", async () => {
    const page = await panelAbierto();
    const marca = `SinPrecio${sufijo()}`;

    const formulario = await nuevoEquipo(page, marca, "Equipo sin precio");
    await formulario.getByRole("button", { name: "Añadir al inventario" }).click();

    await expect(page.getByText(`${marca} Equipo sin precio`)).toBeVisible();

    /* La ficha no existía cuando se construyó el sitio: la sirve el mismo
       fallback que cualquier ruta nueva, y los datos salen de la API. */
    await page.goto(`/tienda/${marca.toLowerCase()}-equipo-sin-precio`);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Equipo sin precio");
    /* Ni botón de comprar, ni un precio inventado a partir de nada. */
    await expect(page.getByRole("button", { name: "Agregar al carrito" })).toHaveCount(0);
    await expect(page.getByText(/todavía no tiene precio publicado|Consultar precio/)).toBeVisible();
  });

  test("cambiar el precio en la fila se ve en la ficha pública", async () => {
    const page = await panelAbierto();
    const marca = `Precio${sufijo()}`;

    const formulario = await nuevoEquipo(page, marca, "Equipo con precio");
    await formulario.getByLabel("Precio de venta (IVA incluido)").fill("400000");
    await formulario.getByLabel("Unidades").fill("2");
    await formulario.getByRole("button", { name: "Añadir al inventario" }).click();

    const celda = page.getByLabel(`Precio de ${marca} Equipo con precio`);
    await celda.fill("450000");
    await celda.press("Enter");
    await expect(page.getByText(/actualizando/)).toHaveCount(0, { timeout: 10_000 });

    await page.goto(`/tienda/${marca.toLowerCase()}-equipo-con-precio`);
    await expect(page.getByText("$450.000").first()).toBeVisible();
  });

  test("un equipo retirado sale del catálogo público y sigue en el panel", async () => {
    const page = await panelAbierto();
    const marca = `Retirado${sufijo()}`;

    const formulario = await nuevoEquipo(page, marca, "Equipo a retirar");
    await formulario.getByLabel("Precio de venta (IVA incluido)").fill("300000");
    await formulario.getByLabel("Unidades").fill("1");
    await formulario.getByRole("button", { name: "Añadir al inventario" }).click();

    await page.getByRole("row", { name: new RegExp(marca) }).getByRole("button", { name: "Abrir" }).click();
    await ficha(page).getByRole("button", { name: "Retirar de la tienda" }).click();
    await expect(ficha(page)).toHaveCount(0);

    await page.goto("/tienda");
    await expect(page.getByText(`${marca} Equipo a retirar`)).toHaveCount(0);

    /* No se borró: sigue en el panel, bajo el filtro de retirados. */
    await page.goto("/panel");
    await page.getByRole("button", { name: "Retirados" }).click();
    await expect(page.getByText(`${marca} Equipo a retirar`)).toBeVisible();
  });

  test("las unidades no pueden bajar por debajo de lo reservado", async () => {
    const page = await panelAbierto();

    /* El ExpertBook de la semilla es el que usa la batería de compra: lleva
       reservas vivas de los pedidos que esas pruebas dejan a medio pagar. */
    const fila = page.getByRole("row", { name: /ExpertBook/ }).first();
    const reservadas = fila.getByText(/reservada/);
    test.skip(!(await reservadas.isVisible().catch(() => false)), "no hay reservas vivas en esta pasada");

    const unidades = fila.getByLabel(/^Unidades de/);
    await unidades.fill("0");
    await unidades.press("Enter");

    await expect(page.getByRole("alert")).toContainText(/reservadas/);
  });

  test("el panel no se indexa ni sale en el sitemap", async ({ request }) => {
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toContain("Disallow: /panel");

    const mapa = await (await request.get("/sitemap.xml")).text();
    expect(mapa).not.toContain("/panel");

    const page = await panelAbierto();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  });
});

test.describe("el panel gobierna el negocio", () => {
  test("una tarifa puesta en Ajustes se cobra en el checkout, sin volver a publicar", async () => {
    const page = await panelAbierto();
    /* Una tarifa distinta en cada pasada: así siempre hay un cambio que
       guardar, aunque la anterior dejara algo puesto. */
    const tarifa = 7000 + (Date.now() % 900);

    await page.getByRole("button", { name: "Ajustes" }).click();
    const tarifas = page.getByLabel("Tarifas por región");
    await tarifas.fill(`Metropolitana de Santiago:4990:2\nValparaíso:${tarifa}:3`);
    await page.getByRole("button", { name: /Guardar \d+ cambio/ }).click();
    await expect(page.getByText("Ya está en la web.")).toBeVisible();

    /* Y ahora, como cliente: el despacho a Valparaíso cuesta lo que se acaba
       de escribir. Ni un despliegue de por medio. */
    const tienda = await contexto.newPage();
    await tienda.goto("/tienda/asus-expertbook-pm3406cka-ly0433x");
    await tienda.getByRole("button", { name: "Agregar al carrito" }).click();
    await tienda.goto("/checkout");
    await tienda.getByLabel("Despacho a domicilio").check();
    /* El total se recalcula con la dirección entera, no solo con la región. */
    await rellenarComoPersona(tienda, "Valparaíso");
    await expect(tienda.getByText(`$${tarifa.toLocaleString("es-CL")}`).first()).toBeVisible();
    await tienda.close();
  });

  test("los datos legales se ponen en el panel y salen en los términos", async () => {
    const page = await panelAbierto();
    const razon = `Econnet Pruebas ${sufijo()} SpA`;

    await page.getByRole("button", { name: "Ajustes" }).click();
    await page.getByLabel("Razón social").fill(razon);
    await page.getByLabel("RUT", { exact: true }).fill("76.000.000-0");
    await page.getByRole("button", { name: /Guardar \d+ cambio/ }).click();
    await expect(page.getByText("Ya está en la web.")).toBeVisible();

    const legal = await contexto.newPage();
    await legal.goto("/legal/terminos");
    await expect(legal.getByText(razon)).toBeVisible();
    await expect(legal.getByText("76.000.000-0")).toBeVisible();
    await legal.close();
  });

  test("el margen no sale hasta que hay coste, y entonces sale bien", async () => {
    const page = await panelAbierto();
    const marca = `Margen${sufijo()}`;

    const formulario = await nuevoEquipo(page, marca, "Equipo con coste");
    await formulario.getByLabel("Precio de venta (IVA incluido)").fill("1190000");
    await formulario.getByRole("button", { name: "Añadir al inventario" }).click();

    /* Sin coste: se dice que falta, no se enseña un 100%. */
    const fila = page.getByRole("row", { name: new RegExp(marca) });
    await expect(fila.getByText("sin coste")).toBeVisible();

    await fila.getByRole("button", { name: "Abrir" }).click();
    await ficha(page).getByLabel("Coste de compra (neto, sin IVA)").fill("800000");
    await ficha(page).getByRole("button", { name: "Guardar cambios" }).click();
    await expect(ficha(page)).toHaveCount(0);

    /* 1.190.000 con IVA son 1.000.000 netos; con coste 800.000 quedan 200.000,
       que es el 20%. No el 32,8% de comparar contra el precio con IVA. */
    await expect(page.getByRole("row", { name: new RegExp(marca) }).getByText("20%")).toBeVisible();
  });

  test("un pedido se ve y se mueve desde el panel, sin saltarse la máquina de estados", async () => {
    /* Primero, una compra de verdad. */
    const tienda = await contexto.newPage();
    await tienda.goto("/tienda/asus-expertbook-pm3406cka-ly0433x");
    await tienda.getByRole("button", { name: "Agregar al carrito" }).click();
    await tienda.goto("/carrito");
    await tienda.getByRole("button", { name: /Ir a pagar|Finalizar|Continuar/ }).first().click();
    await rellenarComoPersona(tienda);
    await tienda.getByRole("button", { name: /Ir a pagar|Reservar mi pedido/ }).click();
    await tienda.waitForURL(/\/tienda\/gracias/, { timeout: 20_000 });
    const numero = (await tienda.locator("b.tabular-nums").textContent())?.trim() ?? "";
    await tienda.close();
    expect(numero).toBeTruthy();

    const page = await panelAbierto();
    await page.getByRole("button", { name: "Pedidos" }).click();
    await page.getByLabel("Buscar pedidos").fill(numero);
    await page.getByRole("row", { name: new RegExp(numero) }).getByRole("button", { name: "Abrir" }).click();

    const detalle = page.getByRole("dialog");
    await expect(detalle.getByText("Omar García")).toBeVisible();
    /* Desde donde está, «Entregado» no es una opción: no está el botón. */
    await expect(detalle.getByRole("button", { name: "Entregado" })).toHaveCount(0);
  });

  /**
   * El formulario manda la ficha entera, no solo lo que se tocó. Un equipo del
   * catálogo real trae la fecha del dato a la chilena, y eso tumbaba el
   * guardado completo con un 400 por un campo que nadie había tocado.
   */
  test("se puede editar un equipo del catálogo de verdad, no solo los recién creados", async () => {
    const page = await panelAbierto();

    await page.getByRole("row", { name: /ExpertBook PM3406/ }).getByRole("button", { name: "Abrir" }).click();
    await ficha(page).getByLabel("Coste de compra (neto, sin IVA)").fill("790000");
    await ficha(page).getByRole("button", { name: "Guardar cambios" }).click();

    /* Si el guardado falla, la ficha se queda abierta con el error dentro. */
    await expect(ficha(page)).toHaveCount(0);
    await expect(page.getByRole("row", { name: /ExpertBook PM3406/ }).getByText("%")).toBeVisible();
  });

  test("importar un CSV enseña qué pasaría antes de tocar nada", async () => {
    const page = await panelAbierto();
    const marca = `Import${sufijo()}`;
    /* El SKU también distinto en cada pasada: la importación busca primero por
       SKU —que es lo correcto— y con un SKU repetido la segunda vez no es un
       alta, es un cambio. */
    const sku = `IMP-${sufijo()}`;
    creados.push(`${marca.toLowerCase()}-equipo-importado`);

    await page.getByRole("button", { name: "Importar" }).click();
    await page.getByLabel("Fichero CSV").setInputFiles({
      name: "catalogo.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(
        `sku,marca,nombre,categoria,precio,costo,stock\n${sku},${marca},Equipo importado,Notebook,"$1.190.000",800000,3\n`
      )
    });

    await expect(page.getByText("Columnas entendidas:")).toBeVisible();
    await expect(page.getByRole("button", { name: /Aplicar: 1 alta/ })).toBeVisible();

    /* Todavía no está en el inventario, y se comprueba desde otra pestaña
       para no perder el ensayo que hay en esta. */
    const mirar = await contexto.newPage();
    await mirar.goto("/panel");
    await expect(mirar.getByText(`${marca} Equipo importado`)).toHaveCount(0);
    await mirar.close();

    /* Y ahora sí. */
    await page.getByRole("button", { name: /Aplicar: 1 alta/ }).click();
    await expect(page.getByText("Los equipos ya están en el inventario")).toBeVisible();

    await page.getByRole("button", { name: "Inventario" }).click();
    const fila = page.getByRole("row", { name: new RegExp(marca) });
    await expect(fila).toBeVisible();
    await expect(fila.getByText("20%")).toBeVisible();
  });

  test("una foto subida se ve en la ficha pública y deja de ser un hueco", async () => {
    const page = await panelAbierto();
    const marca = `Foto${sufijo()}`;

    const formulario = await nuevoEquipo(page, marca, "Equipo con foto");
    await formulario.getByLabel("Precio de venta (IVA incluido)").fill("500000");
    await formulario.getByRole("button", { name: "Añadir al inventario" }).click();

    await page.getByRole("row", { name: new RegExp(marca) }).getByRole("button", { name: "Abrir" }).click();
    await ficha(page).getByLabel("Subir fotografía").setInputFiles({
      name: "equipo.png",
      mimeType: "image/png",
      buffer: Buffer.from(PNG_1PX, "base64")
    });
    await expect(ficha(page).getByRole("button", { name: "Cambiar foto" })).toBeVisible();
    await ficha(page).getByRole("button", { name: "Guardar cambios" }).click();
    await expect(ficha(page)).toHaveCount(0);

    /* Ya no cuenta como «sin imagen» en la fila. */
    const fila = page.getByRole("row", { name: new RegExp(marca) });
    await expect(fila.getByText("imagen")).toHaveCount(0);

    /* Y la ficha pública la sirve de verdad. */
    const tienda = await contexto.newPage();
    await tienda.goto(`/tienda/${marca.toLowerCase()}-equipo-con-foto`);
    const imagen = tienda.locator('img[src*="/api/medios/"]').first();
    await expect(imagen).toBeVisible();
    await tienda.close();
  });

  test("las cotizaciones se ven y se cierran desde el panel", async () => {
    const empresas = await contexto.newPage();
    await empresas.goto("/empresas");
    /* «Tu correo» y una casilla de consentimiento también están en el pie de
       página: hay que acotar al contenido. */
    const formulario = empresas.getByRole("main");
    /* Las cuatro elecciones son obligatorias: sin ellas no hay propuesta que
       calcular, y el formulario no manda nada. */
    await formulario.getByRole("button", { name: "11 — 25" }).click();
    await formulario.getByRole("button", { name: "Administrativo" }).click();
    await formulario.getByRole("button", { name: "$1.200.000" }).click();
    await formulario.getByRole("button", { name: "No, solo el equipo" }).click();
    await formulario.getByLabel("Tu correo").fill(`cot+${Date.now()}@econnet-pruebas.cl`);
    await formulario.getByRole("checkbox").check();
    /* La misma espera que un formulario de verdad: por debajo de 1,2 s el
       servidor lo toma por un robot. */
    await empresas.waitForTimeout(1600);
    await formulario.getByRole("button", { name: "Recibir la propuesta" }).click();
    /* El número sale dos veces: en el aviso y en la cabecera de la propuesta. */
    await expect(empresas.getByText(/COT-/).first()).toBeVisible({ timeout: 15_000 });
    await empresas.close();

    const page = await panelAbierto();
    await page.getByRole("button", { name: "Cotizaciones" }).click();
    await expect(page.getByRole("table")).toBeVisible();
    await expect(page.getByRole("button", { name: "Ganada" }).first()).toBeVisible();
  });
});
