/**
 * El carrito vive en el navegador y se sincroniza con el servidor **con
 * retardo**: una ráfaga de clics es una escritura, no diez. Esa decisión es lo
 * que hace que cien mil personas navegando no se traduzcan en cien mil
 * escrituras por minuto.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { api } from "../../services/api.js";
import type { LineaCarrito } from "../../services/tipos.js";
import { CarritoContexto, type EstadoCarrito } from "./contexto.js";

const CLAVE = "econnet:carrito";
const RETARDO_MS = 1500;
const MAX_CANTIDAD = 20;

function leerGuardado(): { id: string | null; lineas: LineaCarrito[] } {
  try {
    const crudo = JSON.parse(localStorage.getItem(CLAVE) ?? "{}") as { id?: string; lineas?: LineaCarrito[] };
    return { id: crudo.id ?? null, lineas: Array.isArray(crudo.lineas) ? crudo.lineas : [] };
  } catch {
    /* Almacenamiento bloqueado (ventana privada): se sigue en memoria. */
    return { id: null, lineas: [] };
  }
}

export function ProveedorCarrito({ children }: { children: ReactNode }) {
  const inicial = useRef(leerGuardado());
  const [id, setId] = useState<string | null>(inicial.current.id);
  const [lineas, setLineas] = useState<LineaCarrito[]>(inicial.current.lineas);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  const primeraVez = useRef(true);

  useEffect(() => {
    try {
      localStorage.setItem(CLAVE, JSON.stringify({ id, lineas }));
    } catch {
      /* sin almacenamiento: no pasa nada, el carrito vive en memoria */
    }

    /* La primera carga no sincroniza: no hay nada nuevo que contar. */
    if (primeraVez.current) {
      primeraVez.current = false;
      return;
    }

    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => {
      void api
        .guardarCarrito({ ...(id ? { id } : {}), items: lineas })
        .then((r) => setId(r.carrito.id))
        .catch(() => undefined); /* si el servidor no está, el carrito sigue funcionando */
    }, RETARDO_MS);

    return () => {
      if (temporizador.current) clearTimeout(temporizador.current);
    };
  }, [id, lineas]);

  const agregar = useCallback((productoId: string, cantidad = 1) => {
    setLineas((previas) => {
      const existente = previas.find((l) => l.productoId === productoId);
      if (!existente) return [...previas, { productoId, cantidad: Math.min(MAX_CANTIDAD, cantidad) }];
      return previas.map((l) =>
        l.productoId === productoId ? { ...l, cantidad: Math.min(MAX_CANTIDAD, l.cantidad + cantidad) } : l
      );
    });
  }, []);

  const cambiar = useCallback((productoId: string, cantidad: number) => {
    setLineas((previas) =>
      previas
        .map((l) => (l.productoId === productoId ? { ...l, cantidad: Math.min(MAX_CANTIDAD, Math.max(0, cantidad)) } : l))
        .filter((l) => l.cantidad > 0)
    );
  }, []);

  const quitar = useCallback((productoId: string) => cambiar(productoId, 0), [cambiar]);
  const vaciar = useCallback(() => setLineas([]), []);

  const guardarConCorreo = useCallback(
    async (correo: string) => {
      const respuesta = await api.guardarCarrito({ ...(id ? { id } : {}), items: lineas, correo, consentimiento: true });
      setId(respuesta.carrito.id);
    },
    [id, lineas]
  );

  const valor = useMemo<EstadoCarrito>(
    () => ({
      id,
      lineas,
      unidades: lineas.reduce((t, l) => t + l.cantidad, 0),
      agregar,
      cambiar,
      quitar,
      vaciar,
      guardarConCorreo
    }),
    [id, lineas, agregar, cambiar, quitar, vaciar, guardarConCorreo]
  );

  return <CarritoContexto.Provider value={valor}>{children}</CarritoContexto.Provider>;
}
