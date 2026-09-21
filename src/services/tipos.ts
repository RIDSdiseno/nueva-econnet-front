/**
 * Los tipos del contrato con la API.
 *
 * Se definen aquí a propósito: la guía prohíbe importar código del backend.
 * Si el contrato cambia, cambia este fichero — y las pruebas lo cazan.
 */

export type Condicion = "NUEVO" | "OPENBOX" | "REACONDICIONADO" | "SEMINUEVO" | "USADO";
export type EstadoStock = "EN_STOCK" | "LIMITADO" | "SIN_EXISTENCIAS" | "DESCONOCIDO";
export type ModoDespacho = "DESPACHO" | "RETIRO";
export type TipoDocumento = "BOLETA" | "FACTURA";

export interface Producto {
  id: string;
  slug: string;
  sku: string | null;
  marca: string;
  nombre: string;
  etiqueta: string;
  color: string;
  categoria: string;
  subcategoria: string | null;
  tipoProducto: string | null;
  modelo: string | null;
  condicion: Condicion | null;
  garantia: string | null;
  precio: { lista: number | null; venta: number | null };
  marketplaces: { falabella: number | null; lider: number | null };
  referencia: { valor: number | null; propio: boolean; canal: "falabella" | "lider" | null };
  stock: { estado: EstadoStock; unidades: number | null; reservadas: number };
  specs: Record<string, string | null>;
  usos: string[];
  valores: string[];
  para: string;
  noPara: string;
  alerta: string | null;
  descripcionCorta: string | null;
  descripcionLarga: string | null;
  imagenUrl: string | null;
  imagenAlt: string | null;
  imagenes: string[];
  fuente: string;
  fechaDato: string;
  confianza: "ALTA" | "MEDIA" | "BAJA";
  seVende: boolean;
  publicable: { ok: boolean; faltas: string[] };
}

/**
 * El inventario tal y como lo ve el panel. Es más ancho que `Producto`: trae
 * lo archivado, lo reservado y lo que le falta a cada equipo para venderse.
 */
export interface FilaInventario {
  id: string;
  slug: string;
  sku: string | null;
  marca: string;
  nombre: string;
  etiqueta: string;
  color: string;
  categoria: string;
  subcategoria: string | null;
  tipoProducto: string | null;
  modelo: string | null;
  condicion: Condicion | null;
  garantia: string | null;
  precioLista: number | null;
  precioVenta: number | null;
  precioFalabella: number | null;
  precioLider: number | null;
  costoNeto: number | null;
  margen: MargenProducto;
  stockEstado: EstadoStock;
  stockUnidades: number | null;
  reservadas: number;
  disponibles: number | null;
  specs: Record<string, string | null>;
  usos: string[];
  valores: string[];
  para: string | null;
  noPara: string | null;
  alerta: string | null;
  descripcionCorta: string | null;
  descripcionLarga: string | null;
  imagenUrl: string | null;
  imagenAlt: string | null;
  imagenes: string[];
  fuente: string;
  fechaDato: string;
  confianza: "ALTA" | "MEDIA" | "BAJA";
  archivado: string | null;
  actualizado: string;
  seVende: boolean;
  publicable: { ok: boolean; faltas: string[] };
}

export interface MargenProducto {
  pesos: number | null;
  porcentaje: number | null;
  falta: string[];
}

export interface ResumenMargenInventario {
  conDato: number;
  sinDato: number;
  porcentajePonderado: number | null;
  porcentajeMedio: number | null;
  gananciaPotencial: number | null;
  peores: Array<{ id: string; nombre: string; porcentaje: number }>;
}

export interface ResumenInventario {
  total: number;
  enVenta: number;
  archivados: number;
  huecos: Array<{ falta: string; cuantos: number }>;
  sinStockConocido: number;
  agotados: number;
  valorInventario: number | null;
  costeInventario: number | null;
  margen: ResumenMargenInventario;
}

/* ── Pedidos, cotizaciones y ajustes vistos desde el panel ───────────────── */

export type EstadoPedido =
  | "POR_CONFIRMAR" | "PENDIENTE_PAGO" | "PAGADO" | "PREPARANDO"
  | "DESPACHADO" | "ENTREGADO" | "ANULADO" | "DEVUELTO" | "REVISAR";

export type EstadoCotizacion = "ENVIADA" | "VISTA" | "ACEPTADA" | "PERDIDA" | "CADUCADA";

export interface PedidoPanel {
  numero: string;
  estado: EstadoPedido;
  creado: string;
  actualizado: string;
  cliente: { nombre: string; correo: string; telefono: string | null; rut: string | null; razonSocial: string | null };
  despacho: {
    modo: ModoDespacho;
    region: string | null;
    comuna: string | null;
    direccion: string | null;
    notas: string | null;
    porConfirmar: boolean;
  };
  documento: TipoDocumento;
  totales: { subtotal: number; descuento: number; envio: number | null; neto: number; iva: number; total: number };
  pago: { metodo: string | null; estado: string | null; referencia: string | null; monto: number | null; fecha: string | null };
  stock: { estado: string; porConfirmar: boolean };
  terminosEn: string | null;
  caducaEn: string | null;
  items: Array<{ productoId: string; nombre: string; precio: number; cantidad: number; condicion: Condicion | null }>;
}

export interface EventoPedido {
  estado: EstadoPedido;
  nota: string;
  fecha: string;
}

export interface CotizacionPanel {
  numero: string;
  estado: EstadoCotizacion;
  creado: string;
  validaHasta: string;
  empresa: string | null;
  nombre: string | null;
  correo: string;
  rut: string | null;
  telefono: string | null;
  equipos: number;
  perfil: string;
  presupuesto: number;
  accesorios: boolean;
  totales: { neto: number; iva: number; descuento: number; total: number };
  seguimiento: number;
  proximoCorreo: string | null;
  propuesta?: unknown;
  huecos?: unknown;
}

export interface AjusteNegocio {
  clave: string;
  grupo: string;
  etiqueta: string;
  ayuda: string;
  tipo: "texto" | "numero" | "tabla" | "largo";
  ejemplo: string | null;
  siFalta: string;
  valor: string;
  origen: "panel" | "entorno" | "vacío";
}

export interface MedioSubido {
  id: string;
  url: string;
  tipo: string;
  bytes: number;
  nombre: string;
}

export interface DiferenciaImportacion {
  campo: string;
  antes: string | null;
  despues: string | null;
}

export interface FilaImportacion {
  linea: number;
  id: string;
  nombre: string;
  accion: "alta" | "cambio" | "igual" | "error";
  diferencias: DiferenciaImportacion[];
  motivo?: string;
}

export interface InformeImportacion {
  ensayo: boolean;
  columnasReconocidas: string[];
  columnasIgnoradas: string[];
  altas: number;
  cambios: number;
  iguales: number;
  errores: number;
  filas: FilaImportacion[];
}

export interface CambioProducto {
  id: string;
  productoId: string;
  campo: string;
  antes: string | null;
  despues: string | null;
  motivo: string | null;
  autor: string;
  fecha: string;
}

/** Lo que el panel manda al editar. `null` vacía el campo; ausente no lo toca. */
export type EdicionProducto = Partial<{
  slug: string;
  sku: string | null;
  marca: string;
  nombre: string;
  etiqueta: string;
  color: string;
  categoria: string;
  subcategoria: string | null;
  tipoProducto: string | null;
  modelo: string | null;
  condicion: Condicion | null;
  garantia: string | null;
  precioLista: number | null;
  precioVenta: number | null;
  precioFalabella: number | null;
  precioLider: number | null;
  costoNeto: number | null;
  margen: MargenProducto;
  stockEstado: EstadoStock;
  stockUnidades: number | null;
  specs: Record<string, string | null>;
  usos: string[];
  valores: string[];
  para: string | null;
  noPara: string | null;
  alerta: string | null;
  descripcionCorta: string | null;
  descripcionLarga: string | null;
  imagenUrl: string | null;
  imagenAlt: string | null;
  imagenes: string[];
  fuente: string;
  fechaDato: string;
  confianza: "ALTA" | "MEDIA" | "BAJA";
  motivo: string;
}>;

export interface AltaProducto extends EdicionProducto {
  marca: string;
  nombre: string;
  categoria: string;
  fuente: string;
  id?: string;
}

/** Los datos de la empresa, servidos por la API y editables desde el panel. */
export interface Negocio {
  razonSocial: string | null;
  rut: string | null;
  direccion: string | null;
  telefono: string | null;
  horario: string | null;
  correo: string | null;
  whatsapp: string | null;
}

export interface LineaCarrito {
  productoId: string;
  cantidad: number;
}

export interface Totales {
  subtotal: number;
  descuento: number;
  envio: number | null;
  total: number;
  neto: number;
  iva: number;
}

export interface RespuestaTotales {
  ok: true;
  lineas: Array<{ productoId: string; nombre: string; precio: number; cantidad: number; condicion: Condicion | null; stockConocido: boolean }>;
  rechazadas: Array<{ productoId: string; motivo: string }>;
  totales: Totales;
  envio: { costo: number | null; porConfirmar: boolean; nota: string; diasEstimados: number | null };
  cupon: string | null;
  cuponMotivo: string;
  stockPorConfirmar: boolean;
  sePuedeCobrar: boolean;
}

export interface Pago {
  tipo: "redirect" | "post";
  url: string;
  campos?: Record<string, string>;
  referencia: string | null;
}

export interface RespuestaPedido {
  ok: true;
  numero: string;
  estado: string;
  repetido?: boolean;
  totales: Totales;
  porConfirmar: { stock: boolean; envio: boolean };
  cuponMotivo: string | null;
  pago: Pago | null;
  aviso?: string;
}

export interface Seguimiento {
  numero: string;
  estado: string;
  creado: string;
  items: Array<{ nombre: string; cantidad: number }>;
  totales: { subtotal: number; descuento: number; envio: number | null; total: number };
  despacho: { modo: ModoDespacho; region: string | null };
  porConfirmar: { stock: boolean; envio: boolean };
}

export interface ErrorApi {
  codigo: string;
  mensaje: string;
  detalles?: Array<{ campo: string; mensaje: string }> | unknown;
}

export interface LineaPropuesta {
  productoId: string;
  slug: string;
  nombre: string;
  condicion: Condicion | null;
  precioUnitario: number;
  cantidad: number;
  importe: number;
  stockConocido: boolean;
  concepto: "equipo" | "accesorio";
  porQue: string;
}

export interface Propuesta {
  etiquetaPerfil: string;
  lineas: LineaPropuesta[];
  alternativas: Array<{ slug: string; nombre: string; precioUnitario: number; condicion: Condicion | null }>;
  subtotal: number;
  descuento: number;
  descuentoPorcentaje: number;
  neto: number;
  iva: number;
  total: number;
  huecos: string[];
}

export interface RespuestaCotizacion {
  ok: true;
  numero: string;
  validaHasta: string;
  propuesta: Propuesta;
  /** El servidor contesta esto, sin número, cuando el formulario parece un robot. */
  mensaje?: string;
}

export interface CotizacionGuardada {
  numero: string;
  estado: string;
  empresa: string | null;
  equipos: number;
  creada: string;
  validaHasta: string;
  caducada: boolean;
  propuesta: Propuesta;
}
