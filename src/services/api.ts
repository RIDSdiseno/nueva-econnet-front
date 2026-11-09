/**
 * El cliente HTTP. Único sitio que sabe dónde vive la API.
 *
 * Todo error de la API tiene la misma forma, así que se traduce una sola vez
 * aquí y las pantallas solo se preocupan del mensaje.
 */
import type {
  AjusteNegocio,
  AltaProducto,
  CambioProducto,
  CotizacionPanel,
  EventoPedido,
  InformeImportacion,
  MedioSubido,
  PedidoPanel,
  CotizacionGuardada,
  EdicionProducto,
  ErrorApi,
  FilaInventario,
  Negocio,
  Producto,
  ResumenInventario,
  RespuestaCotizacion,
  RespuestaPedido,
  RespuestaTotales,
  Seguimiento
} from "./tipos.js";

const BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

export class ErrorDeApi extends Error {
  constructor(
    public readonly codigo: string,
    mensaje: string,
    public readonly detalles?: ErrorApi["detalles"],
    public readonly estado?: number
  ) {
    super(mensaje);
    this.name = "ErrorDeApi";
  }
}

const abierto = Date.now();

/**
 * `trampa` añade el tiempo que la persona lleva con la página abierta. Solo lo
 * llevan los envíos de formulario que el servidor comprueba —un robot rellena
 * en milisegundos—; recalcular un total no es un formulario, y mandárselo da
 * 400: los esquemas del backend son estrictos y rechazan lo que no esperan.
 */
async function pedir<T>(
  ruta: string,
  opciones: RequestInit & { cuerpo?: unknown; trampa?: boolean; panel?: boolean } = {}
): Promise<T> {
  const { cuerpo, trampa, panel, ...resto } = opciones;

  let respuesta: Response;
  try {
    respuesta = await fetch(`${BASE}${ruta}`, {
      ...resto,
      headers: {
        "Content-Type": "application/json",
        /* La cabecera que un formulario nacido en otra web no puede poner: es
           la segunda mitad de la defensa contra CSRF, tras SameSite=Strict. */
        ...(panel ? { "X-Panel": "1" } : {}),
        ...(resto.headers ?? {})
      },
      /* La sesión del panel viaja en una cookie HttpOnly, y en desarrollo la
         web y la API son orígenes distintos: sin esto no se manda. */
      ...(panel ? { credentials: "include" as const } : {}),
      ...(cuerpo !== undefined
        ? {
            method: resto.method ?? "POST",
            body: JSON.stringify({ ...(cuerpo as object), ...(trampa ? { ms: Date.now() - abierto } : {}) })
          }
        : {})
    });
  } catch {
    throw new ErrorDeApi("sin_conexion", "No pudimos conectar. Revisa tu conexión y vuelve a intentarlo.");
  }

  const datos = (await respuesta.json().catch(() => null)) as { ok?: boolean; error?: ErrorApi } | null;

  if (!respuesta.ok || !datos?.ok) {
    const error = datos?.error;
    throw new ErrorDeApi(
      error?.codigo ?? "error_desconocido",
      error?.mensaje ?? "Algo se rompió. Vuelve a intentarlo o escríbenos.",
      error?.detalles,
      respuesta.status
    );
  }
  return datos as T;
}

export const api = {
  catalogo: () => pedir<{ ok: true; productos: Producto[] }>("/api/catalogo").then((r) => r.productos),

  producto: (slug: string) => pedir<{ ok: true; producto: Producto }>(`/api/catalogo/${slug}`).then((r) => r.producto),

  /** Razón social, RUT, dirección y WhatsApp. Lo que no está puesto viene null. */
  negocio: () => pedir<{ ok: true; negocio: Negocio }>("/api/negocio").then((r) => r.negocio),

  totales: (cuerpo: {
    items: Array<{ productoId: string; cantidad: number }>;
    despacho?: { modo: "DESPACHO" | "RETIRO"; region?: string };
    cupon?: string;
    correo?: string;
  }) => pedir<RespuestaTotales>("/api/totales", { cuerpo }),

  guardarCarrito: (cuerpo: {
    id?: string;
    items: Array<{ productoId: string; cantidad: number }>;
    correo?: string;
    consentimiento?: boolean;
  }) => pedir<{ ok: true; carrito: { id: string; estado: string; valor: number }; avisos: boolean }>("/api/carrito", { cuerpo, trampa: true }),

  crearPedido: (cuerpo: Record<string, unknown>) => pedir<RespuestaPedido>("/api/pedido", { cuerpo, trampa: true }),

  pasarelas: () =>
    pedir<{ ok: true; pasarelas: Array<"webpay" | "mercadopago"> }>("/api/pasarelas").then((r) => r.pasarelas),

  seguimiento: (numero: string, correo: string) =>
    pedir<{ ok: true; pedido: Seguimiento }>(
      `/api/seguimiento?numero=${encodeURIComponent(numero)}&correo=${encodeURIComponent(correo)}`
    ).then((r) => r.pedido),

  /** Con el enlace firmado del correo: no hay que teclear número ni correo. */
  seguimientoFirmado: (token: string) =>
    pedir<{ ok: true; pedido: Seguimiento }>(`/api/seguimiento?t=${encodeURIComponent(token)}`).then((r) => r.pedido),

  suscribir: (cuerpo: {
    correo: string;
    nombre?: string;
    origen?: "boletin" | "guia" | "test" | "aviso-precio" | "carrito";
    consentimiento: true;
    recomendados?: string[];
    empresa_web?: string;
  }) =>
    pedir<{ ok: true; mensaje: string }>("/api/suscribir", { cuerpo, trampa: true }),

  cotizar: (cuerpo: {
    correo: string;
    nombre?: string;
    empresa?: string;
    rut?: string;
    telefono?: string;
    equipos: number;
    perfil: string;
    presupuesto: number;
    accesorios: boolean;
    consentimiento: true;
    empresa_web?: string;
  }) => pedir<RespuestaCotizacion>("/api/cotizar", { cuerpo, trampa: true }),

  verCotizacion: (numero: string, correo: string) =>
    pedir<{ ok: true; cotizacion: CotizacionGuardada }>(
      `/api/cotizacion?numero=${encodeURIComponent(numero)}&correo=${encodeURIComponent(correo)}`
    ).then((r) => r.cotizacion)
};

/**
 * El panel de inventario. Aparte del resto a propósito: es lo único que
 * escribe el catálogo, lo único que necesita sesión, y así se ve de un vistazo
 * qué parte de la API puede cambiar lo que ve un cliente.
 */
export const panel = {
  sesion: () => pedir<{ ok: true; configurado: boolean; entrado: boolean }>("/api/panel/sesion", { panel: true }),

  entrar: (clave: string) => pedir<{ ok: true; entrado: true }>("/api/panel/entrar", { cuerpo: { clave }, panel: true }),

  salir: () => pedir<{ ok: true }>("/api/panel/salir", { cuerpo: {}, panel: true }),

  inventario: () =>
    pedir<{ ok: true; productos: FilaInventario[]; resumen: ResumenInventario; cambios: CambioProducto[] }>(
      "/api/panel/inventario",
      { panel: true }
    ),

  cambios: (id: string) =>
    pedir<{ ok: true; cambios: CambioProducto[] }>(`/api/panel/productos/${encodeURIComponent(id)}/cambios`, {
      panel: true
    }).then((r) => r.cambios),

  crear: (cuerpo: AltaProducto) =>
    pedir<{ ok: true; producto: FilaInventario }>("/api/panel/productos", { cuerpo, panel: true }).then((r) => r.producto),

  editar: (id: string, cuerpo: EdicionProducto) =>
    pedir<{ ok: true; producto: FilaInventario }>(`/api/panel/productos/${encodeURIComponent(id)}`, {
      cuerpo,
      method: "PATCH",
      panel: true
    }).then((r) => r.producto),

  stock: (id: string, unidades: number | null, motivo?: string) =>
    pedir<{ ok: true; producto: FilaInventario }>(`/api/panel/productos/${encodeURIComponent(id)}/stock`, {
      cuerpo: { unidades, ...(motivo ? { motivo } : {}) },
      panel: true
    }).then((r) => r.producto),

  archivar: (id: string, archivar: boolean, motivo?: string) =>
    pedir<{ ok: true; producto: FilaInventario }>(`/api/panel/productos/${encodeURIComponent(id)}/archivo`, {
      cuerpo: { archivar, ...(motivo ? { motivo } : {}) },
      panel: true
    }).then((r) => r.producto),

  /* ── Pedidos ── */

  pedidos: (filtros: { estado?: string; q?: string } = {}) => {
    const busca = new URLSearchParams();
    if (filtros.estado) busca.set("estado", filtros.estado);
    if (filtros.q) busca.set("q", filtros.q);
    const cola = busca.toString();
    return pedir<{ ok: true; pedidos: PedidoPanel[]; cuentas: Record<string, number>; transiciones: Record<string, string[]> }>(
      `/api/panel/pedidos${cola ? `?${cola}` : ""}`,
      { panel: true }
    );
  },

  pedido: (numero: string) =>
    pedir<{ ok: true; pedido: PedidoPanel; eventos: EventoPedido[]; siguientes: string[] }>(
      `/api/panel/pedidos/${encodeURIComponent(numero)}`,
      { panel: true }
    ),

  moverPedido: (numero: string, estado: string, nota?: string) =>
    pedir<{ ok: true; pedido: PedidoPanel }>(`/api/panel/pedidos/${encodeURIComponent(numero)}/estado`, {
      cuerpo: { estado, ...(nota ? { nota } : {}) },
      panel: true
    }).then((r) => r.pedido),

  /* ── Cotizaciones ── */

  cotizaciones: (filtros: { estado?: string; q?: string } = {}) => {
    const busca = new URLSearchParams();
    if (filtros.estado) busca.set("estado", filtros.estado);
    if (filtros.q) busca.set("q", filtros.q);
    const cola = busca.toString();
    return pedir<{ ok: true; cotizaciones: CotizacionPanel[]; cuentas: Record<string, number> }>(
      `/api/panel/cotizaciones${cola ? `?${cola}` : ""}`,
      { panel: true }
    );
  },

  cotizacion: (numero: string) =>
    pedir<{ ok: true; cotizacion: CotizacionPanel }>(`/api/panel/cotizaciones/${encodeURIComponent(numero)}`, {
      panel: true
    }).then((r) => r.cotizacion),

  moverCotizacion: (numero: string, estado: string) =>
    pedir<{ ok: true; cotizacion: CotizacionPanel }>(`/api/panel/cotizaciones/${encodeURIComponent(numero)}/estado`, {
      cuerpo: { estado },
      panel: true
    }).then((r) => r.cotizacion),

  /* ── Ajustes del negocio ── */

  ajustes: () => pedir<{ ok: true; ajustes: AjusteNegocio[] }>("/api/panel/ajustes", { panel: true }).then((r) => r.ajustes),

  guardarAjustes: (pares: Record<string, string>) =>
    pedir<{ ok: true; ajustes: AjusteNegocio[] }>("/api/panel/ajustes", { cuerpo: pares, panel: true }).then((r) => r.ajustes),

  /* ── Fotografías ── */

  medios: () => pedir<{ ok: true; medios: MedioSubido[] }>("/api/panel/medios", { panel: true }).then((r) => r.medios),

  subirFoto: (datos: string, nombre: string) =>
    pedir<{ ok: true; medio: MedioSubido }>("/api/panel/medios", { cuerpo: { datos, nombre }, panel: true }).then((r) => r.medio),

  borrarFoto: (id: string) =>
    pedir<{ ok: true }>(`/api/panel/medios/${encodeURIComponent(id)}/borrar`, { cuerpo: {}, panel: true }),

  /* ── Importación ── */

  importar: (csv: string, aplicar = false) =>
    pedir<{ ok: true; informe: InformeImportacion }>("/api/panel/importar", { cuerpo: { csv, aplicar }, panel: true }).then(
      (r) => r.informe
    )
};

export const clp = (n: number | null | undefined): string =>
  n === null || n === undefined ? "por confirmar" : `$${Math.round(n).toLocaleString("es-CL")}`;
