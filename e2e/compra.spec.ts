/**
 * El recorrido de una compra, contra el build de producción y el backend de
 * verdad. Lo que se prueba aquí no es el diseño: es que el dinero y el stock
 * hacen lo que dicen las pantallas.
 *
 * Necesita el backend en pie con la semilla del catálogo y `PASARELA=simulado`.
 */
import { expect, test, type Page } from "@playwright/test";

/** Con stock y precio propios: se puede cobrar. */
const CON_STOCK = "asus-expertbook-pm3406cka-ly0433x";

const correoDePrueba = () => `prueba+${Date.now()}@econnet-pruebas.cl`;

/**
 * El servidor descarta como robot todo formulario enviado en menos de 1,2 s.
 * Playwright rellena en milisegundos, así que una compra de verdad tiene que
 * esperar como espera una persona. Esa espera es parte de lo que se prueba.
 */
const COMO_UNA_PERSONA = 1600;

async function rellenarCheckout(pagina: Page, correo: string) {
  /* `exact` importa: el pie de página tiene su propio campo de correo. */
  await pagina.getByLabel("Nombre y apellido", { exact: true }).fill("Omar García");
  await pagina.getByLabel("Correo", { exact: true }).fill(correo);
  await pagina.getByLabel("Región", { exact: true }).selectOption("Metropolitana de Santiago");
  await pagina.getByLabel("Comuna", { exact: true }).fill("Providencia");
  await pagina.getByLabel("Dirección", { exact: true }).fill("La Concepción 65, oficina 1003");
  /* Aceptar las condiciones es obligatorio, y es una casilla distinta de la
     de publicidad: esa se queda sin marcar a propósito. */
  await pagina.getByRole("checkbox", { name: /términos y condiciones/i }).check();
}

test.describe("tienda", () => {
  test("la portada carga y lleva a la tienda", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.getByRole("link", { name: /Tienda/ }).first().click();
    await expect(page).toHaveURL(/\/tienda/);
    await expect(page.getByRole("heading", { name: "Todos los equipos" })).toBeVisible();
  });

  test("el catálogo sale del backend y se puede buscar sin recargar", async ({ page }) => {
    await page.goto("/tienda");
    await expect(page.getByText(/15 equipos/)).toBeVisible();

    await page.getByLabel("Buscar").fill("ExpertBook");
    await expect(page.getByText(/equipos?$/).first()).toBeVisible();
    await expect(page.locator("article")).not.toHaveCount(15);
  });

  test("la ficha dice la condición y para quién NO es", async ({ page }) => {
    await page.goto(`/tienda/${CON_STOCK}`);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("ExpertBook");
    await expect(page.getByText(/No es para|no es para/).first()).toBeVisible();
  });
});

test.describe("compra", () => {
  test("de la ficha al pago: el ciclo entero con la pasarela simulada", async ({ page }) => {
    const correo = correoDePrueba();

    await page.goto(`/tienda/${CON_STOCK}`);
    await page.getByRole("button", { name: /Agregar/ }).first().click();

    await page.goto("/carrito");
    await expect(page.getByText("ExpertBook", { exact: false }).first()).toBeVisible();
    await page.getByRole("button", { name: /Ir a pagar|Finalizar|Continuar/ }).first().click();

    await expect(page).toHaveURL(/\/checkout/);
    await rellenarCheckout(page, correo);

    /* Con stock conocido y tarifa de región, el botón cobra. */
    await expect(page.getByRole("button", { name: "Ir a pagar" })).toBeVisible();
    await page.waitForTimeout(COMO_UNA_PERSONA);
    await page.getByRole("button", { name: "Ir a pagar" }).click();

    /* La pasarela simulada vuelve por /api/pago-retorno y el backend redirige a gracias. */
    await page.waitForURL(/\/tienda\/gracias/, { timeout: 20_000 });
    await expect(page.getByRole("heading", { name: /Pago recibido/ })).toBeVisible();

    const numero = (await page.locator("b.tabular-nums").textContent())?.trim() ?? "";
    expect(numero).toMatch(/^ECN-/);

    /* Y el pedido se puede seguir con el número y el correo. */
    await page.goto("/seguimiento");
    await page.getByLabel("Número de pedido").fill(numero);
    await page.getByLabel("Correo de la compra").fill(correo);
    await page.getByRole("button", { name: /Buscar|Ver/ }).click();
    await expect(page.getByText(numero)).toBeVisible();
  });

  test("un equipo sin stock conocido se reserva, no se cobra", async ({ page }) => {
    await page.goto("/tienda");
    /* El primero sin stock conocido: la tarjeta lo dice. */
    const tarjeta = page.locator("article", { hasText: "Stock por confirmar" }).first();
    await tarjeta.getByRole("button", { name: "Agregar" }).click();

    await page.goto("/checkout");
    await rellenarCheckout(page, correoDePrueba());

    await expect(page.getByText(/no te cobramos nada ahora/)).toBeVisible();
    const boton = page.getByRole("button", { name: "Reservar mi pedido" });
    await expect(boton).toBeVisible();
    await page.waitForTimeout(COMO_UNA_PERSONA);
    await boton.click();

    await page.waitForURL(/\/tienda\/gracias/, { timeout: 20_000 });
    await expect(page.getByRole("heading", { name: /Tu pedido está anotado/ })).toBeVisible();
  });

  test("un formulario enviado en milisegundos no pierde el carrito", async ({ page }) => {
    /* Para el servidor eso es un robot y contesta «Listo.» sin número. La
       tienda no puede dar las gracias por un pedido que no existe. */
    await page.goto(`/tienda/${CON_STOCK}`);
    await page.getByRole("button", { name: /Agregar/ }).first().click();
    await page.goto("/checkout");

    await rellenarCheckout(page, correoDePrueba());
    await page.getByRole("button", { name: /Ir a pagar|Reservar mi pedido/ }).click();

    await expect(page.getByText(/No pudimos registrar el pedido/)).toBeVisible();
    await expect(page).toHaveURL(/\/checkout/);
    await expect(page.getByRole("link", { name: /Carrito/ })).toContainText("1");
  });

  test("el checkout avisa de lo que falta antes de mandar nada", async ({ page }) => {
    await page.goto(`/tienda/${CON_STOCK}`);
    await page.getByRole("button", { name: /Agregar/ }).first().click();
    await page.goto("/checkout");

    await page.getByRole("button", { name: /Ir a pagar|Reservar mi pedido/ }).click();
    await expect(page.getByText("Falta tu nombre.")).toBeVisible();
    await expect(page.getByText("Revisa el correo.")).toBeVisible();
    await expect(page).toHaveURL(/\/checkout/);
  });
});

test.describe("captación", () => {
  test("el imán del pie pide consentimiento y dice que la baja es de un clic", async ({ page }) => {
    await page.goto("/");
    const pie = page.getByRole("contentinfo");

    await expect(pie.getByPlaceholder("Tu correo")).toBeVisible();
    await expect(pie.getByRole("checkbox")).not.toBeChecked();
    await expect(pie.getByText(/de baja en un clic/)).toBeVisible();
  });

  test("sin marcar la casilla no se suscribe a nadie", async ({ page }) => {
    await page.goto("/");
    const pie = page.getByRole("contentinfo");

    await pie.getByPlaceholder("Tu correo").fill("prueba@econnet-pruebas.cl");
    await pie.getByRole("button", { name: "Quiero el 10%" }).click();

    await expect(pie.getByText(/Marca la casilla/)).toBeVisible();
  });

  test("el test de 60 segundos recomienda del catálogo real", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("1 · ¿Para qué lo necesitas?").selectOption("trabajar");
    await page.getByLabel("2 · ¿Cuánto quieres invertir?").selectOption("1000000-1500000");
    await page.getByLabel("3 · ¿Qué valoras más?").selectOption("portabilidad");
    await page.getByRole("button", { name: "Ver mis equipos" }).click();

    await expect(page.getByText("Tu selección")).toBeVisible();
    await expect(page.getByText(/^Porque /).first()).toBeVisible();
    await expect(page.getByText(/No es para ti si:/).first()).toBeVisible();
  });

  test("la guía se lee entera sin dejar el correo", async ({ page }) => {
    await page.goto("/guia-de-compra");
    await expect(page.getByRole("heading", { name: /Cómo elegir un notebook/ })).toBeVisible();
    await expect(page.getByText(/Antes de pagar, comprueba esto/)).toBeVisible();
    await expect(page.getByText(/Los cuatro son compras legítimas/)).toBeVisible();
  });
});

test.describe("empresas", () => {
  /* Todo dentro del contenido: el pie tiene su propio correo y su casilla. */
  const cotizar = async (page: Page, correo: string) => {
    const principal = page.getByRole("main");
    await principal.getByRole("button", { name: "11 — 25" }).click();
    await principal.getByRole("button", { name: "Administrativo" }).click();
    await principal.getByRole("button", { name: "$1.200.000" }).click();
    await principal.getByRole("button", { name: "No, solo el equipo" }).click();
    await principal.getByLabel("Tu correo").fill(correo);
    await principal.getByRole("checkbox").check();

    await page.waitForTimeout(COMO_UNA_PERSONA);
    await principal.getByRole("button", { name: "Recibir la propuesta" }).click();
  };

  test("cuatro respuestas y la cotización sale en pantalla, con número", async ({ page }) => {
    await page.goto("/empresas");
    await cotizar(page, correoDePrueba());

    await expect(page.getByText(/Cotización COT-\d{4}-\d{5}/)).toBeVisible();
    await expect(page.getByText("Total con IVA")).toBeVisible();
    await expect(page.getByText("IVA 19%")).toBeVisible();
    /* El catálogo real de hoy no trae stock: la propuesta tiene que decirlo. */
    await expect(page.getByText("Lo que falta por cerrar")).toBeVisible();
  });

  test("una cotización se consulta después con su número y el correo", async ({ page }) => {
    const correo = correoDePrueba();
    await page.goto("/empresas");
    await cotizar(page, correo);

    const numero = (await page.getByText(/Cotización COT-\d{4}-\d{5}/).textContent())?.replace("Cotización ", "").trim() ?? "";
    expect(numero).toMatch(/^COT-/);

    await page.goto("/cotizacion");
    const principal = page.getByRole("main");
    await principal.getByLabel("Número").fill(numero);
    await principal.getByLabel("Correo", { exact: true }).fill(correo);
    await principal.getByRole("button", { name: "Ver" }).click();

    await expect(page.getByText(`Cotización ${numero}`)).toBeVisible();
  });

  test("la cotización de otro no se ve con otro correo", async ({ page }) => {
    await page.goto("/cotizacion");
    const principal = page.getByRole("main");
    await principal.getByLabel("Número").fill("COT-2026-00001");
    await principal.getByLabel("Correo", { exact: true }).fill("curioso@otro.cl");
    await principal.getByRole("button", { name: "Ver" }).click();

    await expect(page.getByText(/No encontramos esa cotización/)).toBeVisible();
  });
});

test.describe("consentimientos del checkout", () => {
  test("son dos casillas y la de publicidad se queda sin marcar", async ({ page }) => {
    await page.goto(`/tienda/${CON_STOCK}`);
    await page.getByRole("button", { name: /Agregar/ }).first().click();
    await page.goto("/checkout");

    const principal = page.getByRole("main");
    await expect(principal.getByRole("checkbox", { name: /términos y condiciones/i })).not.toBeChecked();
    await expect(principal.getByRole("checkbox", { name: /recibir recomendaciones/i })).not.toBeChecked();
  });

  test("sin aceptar los términos, el pedido no sale", async ({ page }) => {
    await page.goto(`/tienda/${CON_STOCK}`);
    await page.getByRole("button", { name: /Agregar/ }).first().click();
    await page.goto("/checkout");

    await page.getByLabel("Nombre y apellido", { exact: true }).fill("Omar García");
    await page.getByLabel("Correo", { exact: true }).fill(correoDePrueba());
    await page.getByLabel("Región", { exact: true }).selectOption("Metropolitana de Santiago");
    await page.getByLabel("Comuna", { exact: true }).fill("Providencia");
    await page.getByLabel("Dirección", { exact: true }).fill("La Concepción 65");
    await page.waitForTimeout(COMO_UNA_PERSONA);
    await page.getByRole("button", { name: /Ir a pagar|Reservar mi pedido/ }).click();

    await expect(page.getByText(/Hay que aceptar los términos/)).toBeVisible();
    await expect(page).toHaveURL(/\/checkout/);
  });
});

test.describe("comparador", () => {
  test("elegir dos equipos y compararlos, con lo que no consta dicho", async ({ page }) => {
    await page.goto("/tienda");
    const principal = page.getByRole("main");

    await principal.getByRole("button", { name: "Comparar" }).nth(0).click();
    await principal.getByRole("button", { name: "Comparar" }).nth(0).click();

    await expect(principal.getByText(/Comparando 2 equipos/)).toBeVisible();
    await principal.getByRole("link", { name: /Ver la comparación/ }).click();

    await expect(page.getByRole("heading", { name: "Comparar equipos" })).toBeVisible();
    await expect(page.getByRole("row", { name: /Procesador/ })).toBeVisible();
    /* El catálogo real tiene huecos: la tabla tiene que decirlo. */
    await expect(page.getByText("No consta").first()).toBeVisible();
  });

  test("con tres equipos ya elegidos, el cuarto no se puede añadir", async ({ page }) => {
    await page.goto("/tienda");
    const principal = page.getByRole("main");

    for (let i = 0; i < 3; i++) await principal.getByRole("button", { name: "Comparar" }).nth(0).click();

    await expect(principal.getByRole("button", { name: "Comparar" }).first()).toBeDisabled();
  });
});
