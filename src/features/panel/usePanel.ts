/**
 * El estado del panel: la sesión, el inventario y cada cambio.
 *
 * Después de escribir se relee el inventario entero en vez de parchear la fila
 * en memoria. Es una petición más, y a cambio lo que se ve en el panel es lo
 * que hay en la base — incluidos los efectos que el servidor decide solo, como
 * el estado de stock que se recalcula al cambiar las unidades.
 */
import { useCallback, useEffect, useState } from "react";
import { panel } from "../../services/api.js";
import type {
  AltaProducto,
  CambioProducto,
  EdicionProducto,
  FilaInventario,
  ResumenInventario
} from "../../services/tipos.js";

export type EstadoSesion = "comprobando" | "sin-configurar" | "fuera" | "dentro";

export function usePanel() {
  const [sesion, setSesion] = useState<EstadoSesion>("comprobando");
  const [productos, setProductos] = useState<FilaInventario[]>([]);
  const [resumen, setResumen] = useState<ResumenInventario | null>(null);
  const [cambios, setCambios] = useState<CambioProducto[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recargar = useCallback(async () => {
    setCargando(true);
    try {
      const r = await panel.inventario();
      setProductos(r.productos);
      setResumen(r.resumen);
      setCambios(r.cambios);
      setError(null);
    } catch (e) {
      /* Sesión caducada mientras el panel estaba abierto: se vuelve a pedir
         la clave en vez de dejar una pantalla con datos viejos. */
      if ((e as { estado?: number }).estado === 401) setSesion("fuera");
      else setError((e as Error).message);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    let vivo = true;
    panel
      .sesion()
      .then((r) => {
        if (!vivo) return;
        setSesion(!r.configurado ? "sin-configurar" : r.entrado ? "dentro" : "fuera");
      })
      .catch(() => vivo && setSesion("fuera"));
    return () => {
      vivo = false;
    };
  }, []);

  useEffect(() => {
    if (sesion === "dentro") void recargar();
  }, [sesion, recargar]);

  const entrar = useCallback(async (clave: string) => {
    await panel.entrar(clave);
    setSesion("dentro");
  }, []);

  const salir = useCallback(async () => {
    await panel.salir();
    setProductos([]);
    setResumen(null);
    setSesion("fuera");
  }, []);

  /** Envuelve una escritura: la hace, recarga y deja el error legible. */
  const escribir = useCallback(
    async <T,>(accion: () => Promise<T>): Promise<T> => {
      const salida = await accion();
      await recargar();
      return salida;
    },
    [recargar]
  );

  return {
    sesion,
    productos,
    resumen,
    cambios,
    cargando,
    error,
    entrar,
    salir,
    recargar,
    crear: (datos: AltaProducto) => escribir(() => panel.crear(datos)),
    editar: (id: string, datos: EdicionProducto) => escribir(() => panel.editar(id, datos)),
    fijarStock: (id: string, unidades: number | null, motivo?: string) =>
      escribir(() => panel.stock(id, unidades, motivo)),
    archivar: (id: string, archivar: boolean, motivo?: string) => escribir(() => panel.archivar(id, archivar, motivo))
  };
}
