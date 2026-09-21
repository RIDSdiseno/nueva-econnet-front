/**
 * Cotizador de empresas: cuatro respuestas y una cotización **en pantalla**.
 *
 * Antes esto guardaba la consulta y decía «te contactamos en 24 horas». Una
 * propuesta que tarda dos días compite con otra que llegó en dos minutos, y
 * pierde. Ahora el servidor la arma con modelos y precios del catálogo, la
 * manda por correo y la devuelve aquí para que se vea sin esperar.
 */
import { useState, type FormEvent, type ReactNode } from "react";
import { api, clp } from "../services/api.js";
import { Boton } from "../components/ui/Boton.js";
import { TablaPropuesta } from "../features/empresas/TablaPropuesta.js";
import { rutValido } from "../features/checkout/regiones.js";
import { pedirCotizacion } from "../features/analitica/eventos.js";
import type { RespuestaCotizacion } from "../services/tipos.js";

const EQUIPOS = [
  { valor: 3, texto: "1 — 5" },
  { valor: 8, texto: "6 — 10" },
  { valor: 18, texto: "11 — 25" },
  { valor: 38, texto: "26 — 50" },
  { valor: 60, texto: "50+" }
];

const PERFILES = [
  { valor: "administrativo", texto: "Administrativo" },
  { valor: "comercial", texto: "Comercial / terreno" },
  { valor: "diseno", texto: "Diseño" },
  { valor: "ingenieria", texto: "Ingeniería" },
  { valor: "direccion", texto: "Dirección" }
];

const PRESUPUESTOS = [600_000, 900_000, 1_200_000, 1_600_000, 2_200_000];

/* Fuera del componente: dentro, React las trataba como componentes nuevos en
   cada respuesta y remontaba los campos. */
function Fila({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div className="mt-5">
      <p className="mb-2 text-[13px] font-semibold text-tinta-2">{etiqueta}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Ficha({ activa, onClick, children }: { activa: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activa}
      className={`rounded-full border px-4 py-2 text-[13.5px] transition ${
        activa ? "border-azul bg-azul font-semibold text-white" : "border-linea-fuerte text-tinta-2 hover:border-white/30"
      }`}
    >
      {children}
    </button>
  );
}

export function Empresas() {
  const [equipos, setEquipos] = useState<number | null>(null);
  const [perfil, setPerfil] = useState<string | null>(null);
  const [presupuesto, setPresupuesto] = useState<number | null>(null);
  const [accesorios, setAccesorios] = useState<boolean | null>(null);
  const [correo, setCorreo] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [rut, setRut] = useState("");
  const [acepta, setAcepta] = useState(false);
  const [estado, setEstado] = useState<{ tipo: "bien" | "mal"; texto: string } | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [cotizacion, setCotizacion] = useState<RespuestaCotizacion | null>(null);

  const completo = equipos !== null && perfil !== null && presupuesto !== null && accesorios !== null;

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    if (!completo) return setEstado({ tipo: "mal", texto: "Primero responde las cuatro de arriba." });
    if (!/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(correo)) return setEstado({ tipo: "mal", texto: "Revisa el correo." });
    if (!acepta) return setEstado({ tipo: "mal", texto: "Necesitamos que aceptes que te contactemos." });
    /* El RUT es opcional —hay quien cotiza antes de tenerlo— pero si lo pone,
       se comprueba: un RUT malo en una factura es un problema con el SII. */
    if (rut.trim() && !rutValido(rut)) {
      return setEstado({ tipo: "mal", texto: "Ese RUT no pasa la comprobación del dígito verificador." });
    }

    setEnviando(true);
    try {
      const respuesta = await api.cotizar({
        correo,
        ...(empresa ? { empresa } : {}),
        ...(rut.trim() ? { rut: rut.trim() } : {}),
        equipos,
        perfil,
        presupuesto,
        accesorios,
        consentimiento: true
      });

      /* Sin número: el servidor la descartó por parecer un robot. No se finge
         una cotización que no existe. */
      if (!respuesta.numero) {
        setEstado({ tipo: "mal", texto: "No pudimos generar la cotización. Inténtalo otra vez en un momento." });
        return;
      }

      pedirCotizacion(respuesta.numero, respuesta.propuesta.total);
      setCotizacion(respuesta);
      setEstado({ tipo: "bien", texto: `Lista. La ${respuesta.numero} también te llegó al correo.` });
    } catch (e) {
      setEstado({ tipo: "mal", texto: (e as Error).message });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="grid items-start gap-8 py-6 lg:grid-cols-2">
      <div>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-azul-claro">Econnet para empresas</p>
        <h1 className="text-4xl">Equipar no es comprar veinte veces lo mismo.</h1>
        <p className="mt-4 max-w-[52ch] text-tinta-2">
          Dinos cuántos puestos, para qué perfil y cuánto quieres invertir por equipo. Te devolvemos una propuesta con
          modelos concretos, plazos y factura — no una lista de precios.
        </p>
        <ul className="mt-6 grid gap-2 sm:grid-cols-2">
          {[
            "Cotización formal con modelos y plazos",
            "Factura y compra por volumen",
            "Notebooks y All-in-One para puesto fijo",
            "Renovación por tandas, sin frenar la operación",
            "Opción renovados para bajar el costo por puesto",
            "Un interlocutor, no una mesa de ayuda"
          ].map((punto) => (
            <li key={punto} className="flex gap-2 text-[13.5px] text-tinta-2">
              <span className="text-azul-claro">✓</span>
              {punto}
            </li>
          ))}
        </ul>
      </div>

      <form className="rounded-marco border border-linea-fuerte bg-white/[0.028] p-6" onSubmit={enviar}>
        <h2 className="text-xl">Cotizador en 4 respuestas</h2>
        <p className="mt-1 text-[13.5px] text-apagado">
          Sale con modelos y precios del catálogo de hoy, y te llega también por correo.
        </p>

        <Fila etiqueta="¿Cuántos equipos?">
          {EQUIPOS.map((o) => (
            <Ficha key={o.valor} activa={equipos === o.valor} onClick={() => setEquipos(o.valor)}>
              {o.texto}
            </Ficha>
          ))}
        </Fila>

        <Fila etiqueta="¿Para qué perfil?">
          {PERFILES.map((o) => (
            <Ficha key={o.valor} activa={perfil === o.valor} onClick={() => setPerfil(o.valor)}>
              {o.texto}
            </Ficha>
          ))}
        </Fila>

        <Fila etiqueta="Presupuesto por equipo">
          {PRESUPUESTOS.map((valor) => (
            <Ficha key={valor} activa={presupuesto === valor} onClick={() => setPresupuesto(valor)}>
              {clp(valor)}
            </Ficha>
          ))}
        </Fila>

        <Fila etiqueta="¿Monitor y accesorios?">
          <Ficha activa={accesorios === true} onClick={() => setAccesorios(true)}>
            Sí, puesto completo
          </Ficha>
          <Ficha activa={accesorios === false} onClick={() => setAccesorios(false)}>
            No, solo el equipo
          </Ficha>
        </Fila>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <input
            className="h-12 rounded-xl border border-linea-fuerte bg-white/5 px-4"
            type="email"
            placeholder="Tu correo"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            aria-label="Tu correo"
          />
          <input
            className="h-12 rounded-xl border border-linea-fuerte bg-white/5 px-4"
            placeholder="Empresa (opcional)"
            value={empresa}
            onChange={(e) => setEmpresa(e.target.value)}
            aria-label="Empresa"
          />
          <input
            className="h-12 rounded-xl border border-linea-fuerte bg-white/5 px-4"
            placeholder="RUT de la empresa (opcional)"
            value={rut}
            onChange={(e) => setRut(e.target.value)}
            aria-label="RUT de la empresa"
          />
        </div>

        <label className="mt-3 flex cursor-pointer items-start gap-3 text-[12.5px] text-apagado">
          <input type="checkbox" className="mt-1 accent-azul" checked={acepta} onChange={(e) => setAcepta(e.target.checked)} />
          Acepto que Econnet me contacte por esta cotización y guarde estos datos para responderla.
        </label>

        <Boton type="submit" className="mt-5" disabled={enviando}>
          {enviando ? "Enviando…" : "Recibir la propuesta"}
        </Boton>

        {estado && (
          <p className={`mt-3 text-[13px] ${estado.tipo === "bien" ? "text-verde" : "text-[#F0C27A]"}`}>{estado.texto}</p>
        )}
      </form>

      {cotizacion?.numero && (
        <div className="lg:col-span-2">
          <TablaPropuesta
            propuesta={cotizacion.propuesta}
            numero={cotizacion.numero}
            validaHasta={cotizacion.validaHasta}
          />
          <p className="mt-3 text-[13px] text-apagado">
            Para aceptarla, el enlace va en el correo que acabamos de mandarte. Si quieres ajustar algo antes, responde
            a ese correo y lo vemos.
          </p>
        </div>
      )}
    </div>
  );
}
