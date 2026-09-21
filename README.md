# Econnet · frontend-react

La tienda de Econnet: catálogo, ficha, carrito, checkout de invitado,
seguimiento, empresas y los cuatro imanes de captación.
**React 19 + Vite + Tailwind 4 + TypeScript**, según
[`GUIA-TECNICA.md`](../../../GUIA-TECNICA.md) del ecosistema.

Este repositorio es independiente del backend. **No importa código suyo**: la
frontera es HTTP y el contrato vive en `src/services/tipos.ts`. Si el contrato
cambia, se cambia ahí — y las pruebas lo cazan.

---

## Arrancar

```bash
cp .env.example .env          # VITE_API_URL apuntando a la API
npm install
npm run dev                   # http://localhost:5173
```

En desarrollo `/api` va por proxy al backend (`vite.config.ts`), así que el
navegador ve un solo origen y no hay que pelearse con CORS.

Antes de subir nada:

```bash
npm run verify                # typecheck + lint + test + build
```

## Estructura

```
src/
├─ app/            router y disposición común
├─ components/
│  ├─ layout/      cabecera y pie
│  └─ ui/          botón, etiquetas y tarjeta de producto
├─ features/
│  ├─ carrito/     contexto, proveedor y hook
│  ├─ captacion/   el formulario de correo de los cuatro imanes
│  ├─ catalogo/    carga del catálogo, compartida entre pantallas
│  ├─ checkout/    regiones y RUT
│  ├─ guia/        el contenido de la guía de compra
│  ├─ panel/       el inventario: campos, tabla editable, ficha de equipo
│  └─ test/        el test de 60 segundos y su puntuación
├─ pages/          una por ruta
├─ services/       api.ts (único sitio que sabe dónde vive la API) y tipos.ts
└─ styles/         Tailwind y los tokens de color
tests/             unidad y componentes (Vitest + Testing Library)
e2e/               recorrido completo contra el backend real (Playwright)
```

## Lo que estas pruebas defienden

No son de diseño. Son de las tres cosas que cuestan dinero:

- **Lo que no consta, se dice.** Condición, stock y precio pueden faltar: la
  pantalla dice «por confirmar» y nunca inventa un valor ni un cero.
- **El precio de un marketplace no es el precio de Econnet.** Se muestra
  marcado como lo que es, con su canal.
- **Nadie recibe un correo sin haberlo pedido.** Casilla de consentimiento, y
  la baja de un clic dicha desde el principio (Ley 19.496 art. 28 B).

Y dos que se cazaron con las pruebas de extremo a extremo, no antes:

- El cliente mandaba el tiempo de formulario (`ms`) a `/api/totales`, cuyo
  esquema es estricto: el carrito y el checkout daban 400 contra el backend de
  verdad. Ahora solo lo llevan los envíos que el servidor comprueba.
- Un formulario enviado en menos de 1,2 s es un robot para el servidor, que
  contesta «Listo.» sin número de pedido. La tienda vaciaba el carrito y daba
  las gracias por un pedido inexistente. Ahora avisa y **no toca el carrito**.

## Extremo a extremo

Necesita el backend en pie, con la semilla del catálogo y `PASARELA=simulado`:

```bash
# en backend-api
npm run seed && npm start

# aquí
npm run e2e
```

`playwright.config.ts` levanta `vite preview` con el build de producción y le
pasa `/api` al backend: se prueba lo que se despliega, no lo que sirve el
servidor de desarrollo.

Lo que hay que saber antes de correrla:

- **El backend necesita el límite por IP alto para la batería completa**
  (`LIMITE_PETICIONES=2000`). Toda la batería sale de una sola IP y crea decenas
  de pedidos y cotizaciones: con el tope de producción (30) se corta a la mitad,
  y eso es el límite funcionando, no un fallo.

- **El panel de inventario tiene su propio límite**, mucho más estrecho
  (`LIMITE_ENTRADAS`, 10 intentos de clave por ventana). La batería entra una
  sola vez para todas sus pruebas, pero si se repite la batería varias veces
  seguidas se agota la ventana: para pasadas encadenadas, `LIMITE_ENTRADAS=200`.
  Un 429 ahí es la protección contra probar claves, no un fallo.
- Las pruebas del panel necesitan `ADMIN_CLAVE_HASH` en el backend y la misma
  clave en claro en `E2E_CLAVE_PANEL`. Sin `E2E_CLAVE_PANEL` esas pruebas **se
  saltan solas**: no hay forma de probar un panel cerrado sin abrirlo.
- `SITIO_PUBLICO` tiene que apuntar a la propia web (`http://localhost:4173`):
  es a donde la pasarela simulada devuelve al comprador. Si apunta a otro
  sitio, la compra termina en `ERR_CONNECTION_REFUSED`.
- Para que el checkout **cobre** hace falta `ENVIO_TABLA` en el backend. Sin
  tarifa de región no hay total cerrado y la tienda reserva sin cobrar, que es
  lo correcto: no se inventa un costo de despacho.
- El e2e espera 1,6 s antes de enviar el checkout, a propósito: rellenar en
  milisegundos es lo que hace el robot que el servidor descarta.

En un entorno con Chromium ya instalado y sin salida a internet:
`PLAYWRIGHT_CHROMIUM_PATH=/ruta/al/chromium npm run e2e`.

## Configuración

| Variable | Para qué | Si falta |
|---|---|---|
| `VITE_API_URL` | Dónde vive la API en el navegador | Mismo origen (lo normal en producción) |
| `API_URL` | Dónde la busca **el prerenderizado** (Node, al construir) | Las fichas se prerenderizan sin datos de catálogo y el `sitemap` sale sin productos |
| `VITE_WHATSAPP` | Número de asesoría | **No se pinta ningún botón**: un botón verde que no contesta cuesta más que no tenerlo |
| ~~`VITE_RAZON_SOCIAL`, `VITE_RUT_EMPRESA`…~~ | **Ya no se usan.** Los datos de empresa se ponen en el panel (*Ajustes → Datos legales*) y los sirve `GET /api/negocio` | La página legal enseña el hueco en ámbar en vez de inventarlo |

**`API_URL` y `VITE_API_URL` son distintas a propósito.** Lo que empieza por
`VITE_` se hornea en el bundle del navegador; poner ahí la URL interna de la API
para que la lea el prerenderizado hace que el navegador llame a otro origen y se
coma un CORS. Ya pasó una vez.

**Todo lo que empieza por `VITE_` viaja al navegador.** Ahí no va un secreto
nunca: las claves de pasarela, el `APP_SECRET` y el `CRON_SECRET` son del
backend y no se nombran aquí.

## El panel de inventario

`/panel`. Es la puerta de servicio: no se prerenderiza, no está en el sitemap,
lleva `Disallow` en `robots.txt` y `noindex` en cabecera y en meta. Su
JavaScript se carga aparte, así que no viaja en el paquete que descarga quien
entra por una landing.

Cinco pestañas: **Inventario**, **Pedidos**, **Cotizaciones**, **Importar** y
**Ajustes**.

Qué se hace ahí:

- **Añadir un equipo** con lo mínimo —marca, nombre, categoría— y dejar en
  blanco todo lo que todavía no se sabe. Lo que queda en blanco es `null`, y el
  panel lo enseña como hueco en ámbar. **Un precio vacío no es cero.**
- **Cambiar precio y unidades en la propia fila**, que es lo que se toca a
  diario. Se guarda al salir del campo o con Enter, y solo si cambió de verdad.
- **Ver qué falta para poder vender más**: el resumen cuenta los huecos por
  tipo («sin imagen · 15») y cada uno filtra la tabla.
- **Retirar de la tienda** sin borrar: el equipo sale del catálogo público y se
  queda en el panel con su historial.
- **Subir la fotografía** desde la ficha, de un clic. Es el hueco número uno
  (quince de quince sin foto) y el que bloquea los feeds de Google y Meta.
- **Ver el margen** por equipo y del inventario entero — pero solo si hay coste
  de compra puesto: sin él sale «sin coste», nunca un porcentaje inventado.
- **Atender los pedidos**: quién, qué lleva, a dónde, cómo pagó y a qué estado
  se puede mover. Los botones que salen son los estados a los que de verdad se
  puede ir; no hay un desplegable con los nueve.
- **Cerrar las cotizaciones** de empresa como ganadas o perdidas, lo que además
  para el seguimiento automático.
- **Cambiar los ajustes del negocio** —tarifas de envío, descuento por volumen,
  WhatsApp, datos legales— sin volver a publicar la web.
- **Importar el catálogo** desde un CSV, con ensayo previo: primero se ve qué
  pasaría, y aplicar es un segundo botón.

**Esto está conectado a la web de verdad.** El HTML de la tienda y de cada
ficha se escribe en el `build` —es una foto—, y por eso `useCatalogo` y
`Producto` **siempre vuelven a preguntar a la API** detrás de esa foto: se
pinta al instante lo que el HTML traía, y lo que cambió se cambia solo. Sin
eso, un equipo dado de alta en el panel no aparecería hasta el siguiente
despliegue. Lo defienden `tests/componentes/frescura.test.tsx` y
`e2e/panel.spec.ts`.

Para abrirlo hace falta `ADMIN_CLAVE_HASH` en el backend
(`npm run clave` en `backend-api/`). Sin eso el panel dice cómo generarla en
vez de pedir una clave que no existe.

## Lo que falta, y es de Omar

- **Fotos de producto.** Hoy la tarjeta y la ficha dibujan un equipo genérico
  en SVG porque no hay ni una imagen en el catálogo del 18-09-2026.
- **Los textos legales.** `src/pages/Legal.tsx` lleva seis borradores con los
  huecos marcados en ámbar. La razón social, el RUT y la dirección **ya se
  ponen en el panel** (*Ajustes → Datos legales*) y se ven sin volver a
  publicar; lo que sigue faltando es que un abogado revise el texto.
- **La boleta y la factura electrónica (SII).** El panel no factura.

## Cómo se renderiza esto (y por qué importa)

`npm run build` hace tres cosas, en este orden:

1. `vite build` — el paquete del navegador.
2. `vite build --ssr` — el mismo código, compilado para Node.
3. `scripts/prerender.ts` — renderiza **cada ruta pública a HTML de verdad**,
   con su título, su canónica, Open Graph y datos estructurados, y **mete los
   datos del catálogo dentro del HTML** en una isla JSON.

Eso último es lo que hace que la ficha de un producto traiga nombre, precio,
condición y especificaciones **sin ejecutar JavaScript**. Antes servía
literalmente «Cargando…», que es lo que veían Google y los bots de IA.

El navegador lee esa isla como estado inicial: no vuelve a pedir el producto ni
parpadea. Es también la razón de que el CLS sea 0.

Si tocas una ruta pública, añádela a `RUTAS_PUBLICAS` en `src/app/metadatos.ts`
o no se prerenderiza. Hay una prueba que lo comprueba.

## Despliegue

`vercel.json` lleva las seis cabeceras de la casa y la reescritura a
`index.html` que necesita un router de cliente. Dos cosas que no son
decorativas:

- **`script-src 'self'`, sin hashes ni `unsafe-inline`.** El build de Vite no
  deja ni un script en línea, así que la CSP puede ser estricta de verdad. La
  de la versión anterior necesitaba el hash SHA-256 del script incrustado.
- **`form-action` incluye Transbank.** Webpay exige llegar por POST desde un
  formulario; sin esos dos dominios el navegador bloquea el pago y cuesta
  media tarde encontrar por qué.

`connect-src` apunta a `https://api.econnet.cl`. Si el backend acaba detrás
del mismo dominio, `'self'` basta y ese origen sobra.
