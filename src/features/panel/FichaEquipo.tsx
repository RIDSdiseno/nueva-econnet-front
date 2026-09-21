/**
 * La ficha de un equipo: sirve para darlo de alta y para editarlo.
 *
 * Un solo formulario para las dos cosas, porque las dos cosas son lo mismo con
 * distinto punto de partida. Al dar de alta solo se exige lo que sin ello no
 * hay producto: marca, nombre, categoría y de dónde sale el dato. El resto
 * puede faltar, y el panel lo enseña como hueco. Obligar a rellenar el precio
 * para poder guardar es obligar a inventárselo.
 */
import { useMemo, useState, type FormEvent } from "react";
import { Boton } from "../../components/ui/Boton.js";
import { clp } from "../../services/api.js";
import type { AltaProducto, EdicionProducto, FilaInventario } from "../../services/tipos.js";
import { Campo, CampoEtiquetas, CampoLargo, CampoLista, CampoNumero, Hueco, Seccion } from "./campos.js";
import { SubirFoto } from "./SubirFoto.js";

const CONDICIONES = [
  { valor: "", texto: "No consta" },
  { valor: "NUEVO", texto: "Nuevo" },
  { valor: "OPENBOX", texto: "Open box" },
  { valor: "REACONDICIONADO", texto: "Reacondicionado" },
  { valor: "SEMINUEVO", texto: "Seminuevo" },
  { valor: "USADO", texto: "Usado" }
];

const CONFIANZAS = [
  { valor: "ALTA", texto: "Alta · dato del proveedor o de la caja" },
  { valor: "MEDIA", texto: "Media · de una ficha pública" },
  { valor: "BAJA", texto: "Baja · a confirmar" }
];

const SPECS = ["cpu", "gpu", "ram", "almacenamiento", "pantalla", "so", "conectividad", "seguridad", "bateria", "peso"];

const NOMBRE_SPEC: Record<string, string> = {
  cpu: "Procesador",
  gpu: "Gráfica",
  ram: "Memoria",
  almacenamiento: "Almacenamiento",
  pantalla: "Pantalla",
  so: "Sistema operativo",
  conectividad: "Conectividad",
  seguridad: "Seguridad",
  bateria: "Batería",
  peso: "Peso"
};

/* El formulario vive como texto: así se distingue «vacío» de «cero». */

const texto = (v: string | null | undefined): string => v ?? "";
const numero = (v: number | null | undefined): string => (v === null || v === undefined ? "" : String(v));

/** De texto a lo que entiende la API: en blanco es `null`, no "" ni 0. */
const oNulo = (v: string): string | null => (v.trim() === "" ? null : v.trim());
const oNuloNumero = (v: string): number | null => (v.trim() === "" ? null : Math.max(0, Math.trunc(Number(v))));

function borradorDe(p: FilaInventario | null): Record<string, string> {
  return {
    marca: texto(p?.marca),
    nombre: texto(p?.nombre),
    categoria: texto(p?.categoria),
    subcategoria: texto(p?.subcategoria),
    tipoProducto: texto(p?.tipoProducto),
    modelo: texto(p?.modelo),
    sku: texto(p?.sku),
    slug: texto(p?.slug),
    etiqueta: texto(p?.etiqueta),
    color: p?.color ?? "#8FA3BF",
    condicion: p?.condicion ?? "",
    garantia: texto(p?.garantia),
    precioVenta: numero(p?.precioVenta),
    precioLista: numero(p?.precioLista),
    costoNeto: numero(p?.costoNeto),
    precioFalabella: numero(p?.precioFalabella),
    precioLider: numero(p?.precioLider),
    stockUnidades: numero(p?.stockUnidades),
    para: texto(p?.para),
    noPara: texto(p?.noPara),
    alerta: texto(p?.alerta),
    descripcionCorta: texto(p?.descripcionCorta),
    descripcionLarga: texto(p?.descripcionLarga),
    imagenUrl: texto(p?.imagenUrl),
    imagenAlt: texto(p?.imagenAlt),
    fuente: texto(p?.fuente),
    fechaDato: texto(p?.fechaDato),
    confianza: p?.confianza ?? "MEDIA",
    motivo: "",
    ...Object.fromEntries(SPECS.map((s) => [`spec_${s}`, texto(p?.specs?.[s])]))
  };
}

export function FichaEquipo({
  producto,
  usosConocidos,
  valoresConocidos,
  categoriasConocidas,
  cerrar,
  crear,
  editar,
  archivar
}: {
  producto: FilaInventario | null;
  usosConocidos: string[];
  valoresConocidos: string[];
  categoriasConocidas: string[];
  cerrar: () => void;
  crear: (datos: AltaProducto) => Promise<unknown>;
  editar: (id: string, datos: EdicionProducto) => Promise<unknown>;
  archivar: (id: string, archivar: boolean, motivo?: string) => Promise<unknown>;
}) {
  const esAlta = producto === null;
  const [campos, setCampos] = useState<Record<string, string>>(() => borradorDe(producto));
  const [usos, setUsos] = useState<string[]>(producto?.usos ?? []);
  const [valores, setValores] = useState<string[]>(producto?.valores ?? []);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const poner = (clave: string) => (v: string) => setCampos((c) => ({ ...c, [clave]: v }));
  /* El borrador es un mapa de texto: lo que no está es "", nunca `undefined`.
     Sin esto, `noUncheckedIndexedAccess` obliga a un `?? ""` en cada campo. */
  const v = (clave: string): string => campos[clave] ?? "";

  const neto = useMemo(() => {
    const venta = Number(campos["precioVenta"]);
    return Number.isFinite(venta) && venta > 0 ? Math.round(venta / 1.19) : null;
  }, [campos]);

  /**
   * El margen mientras se teclea. Sobre el **neto**: comparar el coste contra
   * el precio con IVA infla el margen diecinueve puntos, y con ese número
   * inflado es con el que se decide cuánto se puede pagar por un cliente.
   */
  const margenVivo = useMemo(() => {
    const coste = Number(campos["costoNeto"]);
    if (neto === null || !Number.isFinite(coste) || String(campos["costoNeto"] ?? "").trim() === "") return null;
    const pesos = neto - coste;
    return { pesos: clp(pesos), porcentaje: Math.round((pesos / neto) * 1000) / 10 };
  }, [campos, neto]);

  const specs = useMemo(
    () => Object.fromEntries(SPECS.map((s) => [s, oNulo(campos[`spec_${s}`] ?? "")])),
    [campos]
  );

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!v("marca").trim() || !v("nombre").trim() || !v("categoria").trim()) {
      setError("Marca, nombre y categoría son lo mínimo para que exista una ficha.");
      return;
    }

    const comunes = {
      subcategoria: oNulo(v("subcategoria")),
      tipoProducto: oNulo(v("tipoProducto")),
      modelo: oNulo(v("modelo")),
      sku: oNulo(v("sku")),
      condicion: (oNulo(v("condicion")) as AltaProducto["condicion"]) ?? null,
      garantia: oNulo(v("garantia")),
      precioVenta: oNuloNumero(v("precioVenta")),
      precioLista: oNuloNumero(v("precioLista")),
      costoNeto: oNuloNumero(v("costoNeto")),
      precioFalabella: oNuloNumero(v("precioFalabella")),
      precioLider: oNuloNumero(v("precioLider")),
      stockUnidades: oNuloNumero(v("stockUnidades")),
      specs,
      usos,
      valores,
      para: oNulo(v("para")),
      noPara: oNulo(v("noPara")),
      alerta: oNulo(v("alerta")),
      descripcionCorta: oNulo(v("descripcionCorta")),
      descripcionLarga: oNulo(v("descripcionLarga")),
      imagenUrl: oNulo(v("imagenUrl")),
      imagenAlt: oNulo(v("imagenAlt")),
      confianza: v("confianza") as AltaProducto["confianza"]
    };

    setGuardando(true);
    try {
      if (esAlta) {
        await crear({
          ...comunes,
          marca: v("marca").trim(),
          nombre: v("nombre").trim(),
          categoria: v("categoria").trim(),
          etiqueta: v("etiqueta").trim() || v("categoria").trim(),
          color: v("color"),
          fuente: v("fuente").trim() || "Panel",
          ...(v("slug").trim() ? { slug: v("slug").trim() } : {}),
          ...(v("fechaDato").trim() ? { fechaDato: v("fechaDato").trim() } : {})
        });
      } else {
        await editar(producto.id, {
          ...comunes,
          marca: v("marca").trim(),
          nombre: v("nombre").trim(),
          categoria: v("categoria").trim(),
          etiqueta: v("etiqueta").trim() || v("categoria").trim(),
          color: v("color"),
          slug: v("slug").trim() || producto.slug,
          fuente: v("fuente").trim() || producto.fuente,
          fechaDato: v("fechaDato").trim() || producto.fechaDato,
          ...(v("motivo").trim() ? { motivo: v("motivo").trim() } : {})
        });
      }
      cerrar();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGuardando(false);
    }
  }

  async function alternarArchivo() {
    if (!producto) return;
    setGuardando(true);
    setError(null);
    try {
      await archivar(producto.id, !producto.archivado, v("motivo").trim() || undefined);
      cerrar();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60" role="dialog" aria-modal="true" aria-label={esAlta ? "Añadir equipo" : "Editar equipo"}>
      <button type="button" className="flex-1 cursor-default" onClick={cerrar} aria-label="Cerrar" />

      <form
        onSubmit={enviar}
        className="h-full w-full max-w-[680px] overflow-y-auto border-l border-linea bg-fondo-2 p-6 sm:p-8"
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl">{esAlta ? "Añadir un equipo" : `${producto.marca} ${producto.nombre}`}</h2>
            <p className="mt-1 text-[13px] text-apagado">
              {esAlta
                ? "Lo que no sepas hoy, déjalo en blanco: se queda como hueco y el equipo no sale a la venta hasta que esté."
                : `Cambió por última vez el ${new Date(producto.actualizado).toLocaleString("es-CL")}`}
            </p>
          </div>
          <button type="button" onClick={cerrar} className="text-2xl leading-none text-apagado hover:text-tinta" aria-label="Cerrar">
            ×
          </button>
        </div>

        {!esAlta && !producto.publicable.ok && (
          <div className="mb-6 rounded-xl border border-ambar/30 bg-ambar/5 p-4">
            <p className="mb-2 text-[13px] text-tinta-2">Para que este equipo se pueda vender falta:</p>
            <div className="flex flex-wrap gap-1.5">
              {producto.publicable.faltas.map((f) => (
                <Hueco key={f} texto={f} />
              ))}
            </div>
          </div>
        )}

        <div className="grid gap-6">
          <Seccion titulo="Qué es" nota="Lo único obligatorio. Con esto ya existe la ficha.">
            <Campo id="f-marca" etiqueta="Marca" valor={v("marca")} cambiar={poner("marca")} requerido marcador="Lenovo" />
            <Campo id="f-nombre" etiqueta="Nombre" valor={v("nombre")} cambiar={poner("nombre")} requerido marcador="ThinkPad E14 Gen 6" />
            <Campo
              id="f-categoria"
              etiqueta="Categoría"
              valor={v("categoria")}
              cambiar={poner("categoria")}
              requerido
              ayuda={categoriasConocidas.length ? `Ya usas: ${categoriasConocidas.join(", ")}` : undefined}
            />
            <Campo id="f-subcategoria" etiqueta="Subcategoría" valor={v("subcategoria")} cambiar={poner("subcategoria")} />
            <Campo id="f-modelo" etiqueta="Modelo" valor={v("modelo")} cambiar={poner("modelo")} />
            <Campo id="f-sku" etiqueta="SKU" valor={v("sku")} cambiar={poner("sku")} ayuda="El tuyo, no el del proveedor. Tiene que ser único." />
          </Seccion>

          <Seccion titulo="Precio" nota="Neto e IVA salen solos del precio de venta. Los de marketplace van aparte porque NO son el precio de Econnet.">
            <CampoNumero
              id="f-precio"
              etiqueta="Precio de venta (IVA incluido)"
              valor={v("precioVenta")}
              cambiar={poner("precioVenta")}
              ayuda={neto ? `Neto ${clp(neto)} + IVA ${clp(Number(v("precioVenta")) - neto)}` : "En blanco = no se vende en línea, se consulta."}
            />
            <CampoNumero id="f-lista" etiqueta="Precio de lista (antes)" valor={v("precioLista")} cambiar={poner("precioLista")} ayuda="Solo si de verdad estuvo a ese precio." />
            <CampoNumero
              id="f-costo"
              etiqueta="Coste de compra (neto, sin IVA)"
              valor={v("costoNeto")}
              cambiar={poner("costoNeto")}
              ayuda={
                margenVivo === null
                  ? "En blanco = no consta, y el margen no se calcula. Sale de la factura del proveedor, no de la lista de precios."
                  : `Margen: ${margenVivo.pesos} (${margenVivo.porcentaje}%) sobre el neto.`
              }
            />
            <CampoNumero id="f-falabella" etiqueta="Referencia Falabella" valor={v("precioFalabella")} cambiar={poner("precioFalabella")} ayuda="Comparación. Nunca se cobra este." />
            <CampoNumero id="f-lider" etiqueta="Referencia Líder" valor={v("precioLider")} cambiar={poner("precioLider")} ayuda="Comparación. Nunca se cobra este." />
          </Seccion>

          <Seccion titulo="Existencias y condición">
            <CampoNumero
              id="f-stock"
              etiqueta="Unidades"
              valor={v("stockUnidades")}
              cambiar={poner("stockUnidades")}
              ayuda={
                producto?.reservadas
                  ? `${producto.reservadas} reservadas en pedidos vivos: no puedes bajar de ahí.`
                  : "En blanco = sin contar. El estado se ajusta solo."
              }
            />
            <CampoLista id="f-condicion" etiqueta="Condición" valor={v("condicion")} cambiar={poner("condicion")} opciones={CONDICIONES} ayuda="En un reacondicionado, esto es la mitad del precio." />
            <Campo id="f-garantia" etiqueta="Garantía" valor={v("garantia")} cambiar={poner("garantia")} marcador="12 meses" />
            <Campo id="f-etiqueta" etiqueta="Etiqueta de la tarjeta" valor={v("etiqueta")} cambiar={poner("etiqueta")} ayuda="En blanco = la categoría." />
          </Seccion>

          <Seccion titulo="Especificaciones" nota="Lo que dejes vacío sale como «Por confirmar» en la ficha, no como un dato aproximado.">
            {SPECS.map((s) => (
              <Campo key={s} id={`f-spec-${s}`} etiqueta={NOMBRE_SPEC[s] ?? s} valor={v(`spec_${s}`)} cambiar={poner(`spec_${s}`)} />
            ))}
          </Seccion>

          <Seccion titulo="Para quién" nota="Es lo que más vende de toda la ficha, y lo que usa el buscador de la tienda.">
            <CampoLargo id="f-para" etiqueta="Para quién es" valor={v("para")} cambiar={poner("para")} />
            <CampoLargo id="f-nopara" etiqueta="Para quién NO es" valor={v("noPara")} cambiar={poner("noPara")} />
            <div className="sm:col-span-2">
              <CampoEtiquetas etiqueta="Usos" elegidas={usos} disponibles={usosConocidos} cambiar={setUsos} ayuda="Los filtros de la tienda salen de aquí." />
            </div>
            <div className="sm:col-span-2">
              <CampoEtiquetas etiqueta="Lo que importa" elegidas={valores} disponibles={valoresConocidos} cambiar={setValores} />
            </div>
          </Seccion>

          <Seccion titulo="Texto e imagen" nota="Sin foto, la tienda dibuja un equipo genérico y lo dice. No se enseña la foto de otro.">
            <CampoLargo id="f-corta" etiqueta="Descripción corta" valor={v("descripcionCorta")} cambiar={poner("descripcionCorta")} filas={2} />
            <CampoLargo id="f-larga" etiqueta="Descripción larga (SEO)" valor={v("descripcionLarga")} cambiar={poner("descripcionLarga")} filas={4} />
            <div className="sm:col-span-2">
              <SubirFoto valor={v("imagenUrl")} cambiar={poner("imagenUrl")} alt={`${v("marca")} ${v("nombre")}`} />
            </div>
            <Campo id="f-alt" etiqueta="Texto alternativo de la imagen" valor={v("imagenAlt")} cambiar={poner("imagenAlt")} ayuda="Para quien no la ve. En blanco = marca y nombre." />
            <CampoLargo id="f-alerta" etiqueta="Aviso en la ficha" valor={v("alerta")} cambiar={poner("alerta")} filas={2} ayuda="Ej.: «el teclado es en inglés»." />
          </Seccion>

          <Seccion titulo="De dónde sale el dato" nota="Va impreso en la ficha pública. Es lo que hace que el catálogo sea comprobable.">
            <Campo id="f-fuente" etiqueta="Fuente" valor={v("fuente")} cambiar={poner("fuente")} marcador="Proveedor / ficha del fabricante" />
            <Campo id="f-fecha" etiqueta="Fecha del dato" valor={v("fechaDato")} cambiar={poner("fechaDato")} marcador="18-09-2026" ayuda="Vale AAAA-MM-DD o DD-MM-AAAA. En blanco al dar de alta = hoy." />
            <CampoLista id="f-confianza" etiqueta="Confianza" valor={v("confianza")} cambiar={poner("confianza")} opciones={CONFIANZAS} />
            <Campo id="f-slug" etiqueta="Dirección en la web" valor={v("slug")} cambiar={poner("slug")} ayuda="econnet.cl/tienda/… En blanco = de la marca y el nombre." />
          </Seccion>

          {!esAlta && (
            <Seccion titulo="Por qué este cambio" nota="Opcional, y queda guardado junto al antes y el después.">
              <div className="sm:col-span-2">
                <Campo id="f-motivo" etiqueta="Motivo" valor={v("motivo")} cambiar={poner("motivo")} marcador="Subió el proveedor" />
              </div>
            </Seccion>
          )}
        </div>

        {error && (
          <p className="mt-6 rounded-xl border border-rojo/40 bg-rojo/10 p-3 text-[13.5px] text-rojo" role="alert">
            {error}
          </p>
        )}

        <div className="sticky bottom-0 -mx-6 mt-8 flex items-center gap-3 border-t border-linea bg-fondo-2/95 px-6 py-4 backdrop-blur sm:-mx-8 sm:px-8">
          <Boton type="submit" disabled={guardando}>
            {guardando ? "Guardando…" : esAlta ? "Añadir al inventario" : "Guardar cambios"}
          </Boton>
          <Boton type="button" tono="fantasma" onClick={cerrar} disabled={guardando}>
            Cancelar
          </Boton>
          {!esAlta && (
            <button
              type="button"
              onClick={() => void alternarArchivo()}
              disabled={guardando}
              className="ml-auto text-[13px] text-apagado underline underline-offset-4 hover:text-tinta"
            >
              {producto.archivado ? "Devolver a la venta" : "Retirar de la tienda"}
            </button>
          )}
        </div>

        {!esAlta && (
          <p className="mt-4 text-[12px] text-apagado">
            Retirar no borra nada: el equipo sale del catálogo público y sigue aquí, con su historial y con los pedidos
            que ya lo llevan.
          </p>
        )}
      </form>
    </div>
  );
}
