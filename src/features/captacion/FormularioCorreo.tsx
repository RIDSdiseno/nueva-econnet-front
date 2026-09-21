/**
 * El formulario de todos los imanes de captación.
 *
 * Tres cosas no son decorativas:
 *  · El consentimiento es una casilla, no una letra pequeña (Ley 19.628).
 *  · Se dice desde el principio que la baja es de un clic (Ley 19.496 art. 28 B).
 *  · `empresa_web` es una trampa para robots: una persona nunca la ve ni la
 *    rellena. El servidor descarta lo que llegue con ella puesta.
 */
import { useState, type FormEvent } from "react";
import { api, ErrorDeApi } from "../../services/api.js";
import { Boton } from "../../components/ui/Boton.js";
import { dejarCorreo } from "../analitica/eventos.js";

export type OrigenCaptacion = "boletin" | "guia" | "test" | "aviso-precio" | "carrito";

export function FormularioCorreo({
  origen,
  titulo,
  texto,
  etiquetaBoton = "Quiero recibirlo",
  consentimiento,
  recomendados,
  compacto = false
}: {
  origen: OrigenCaptacion;
  titulo: string;
  texto: string;
  etiquetaBoton?: string;
  consentimiento: string;
  recomendados?: string[];
  compacto?: boolean;
}) {
  const [correo, setCorreo] = useState("");
  const [acepta, setAcepta] = useState(false);
  const [trampa, setTrampa] = useState("");
  const [estado, setEstado] = useState<"reposo" | "enviando" | "listo">("reposo");
  const [aviso, setAviso] = useState<string | null>(null);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setAviso(null);

    if (!/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(correo)) {
      setAviso("Revisa el correo.");
      return;
    }
    if (!acepta) {
      setAviso("Marca la casilla para que podamos escribirte.");
      return;
    }

    setEstado("enviando");
    try {
      const respuesta = await api.suscribir({
        correo,
        origen,
        consentimiento: true,
        ...(recomendados?.length ? { recomendados: recomendados.slice(0, 3) } : {}),
        ...(trampa ? { empresa_web: trampa } : {})
      });
      dejarCorreo(origen);
      setEstado("listo");
      setAviso(respuesta.mensaje);
    } catch (e) {
      setEstado("reposo");
      setAviso(e instanceof ErrorDeApi ? e.message : "No pudimos guardarlo. Inténtalo otra vez.");
    }
  }

  const idCorreo = `correo-${origen}`;

  if (estado === "listo") {
    return (
      <div className="rounded-marco border border-verde/35 bg-verde/10 p-5">
        <p className="text-[14.5px]">{aviso ?? "Listo. Revisa tu correo."}</p>
      </div>
    );
  }

  return (
    <form className={compacto ? "" : "rounded-marco border border-linea bg-panel p-5"} onSubmit={enviar} noValidate>
      <h4 className="text-[16px] font-semibold">{titulo}</h4>
      <p className="mt-1 text-[13.5px] text-tinta-2">{texto}</p>

      <div className="mt-3 flex flex-wrap gap-2">
        <label className="sr-only" htmlFor={idCorreo}>
          Tu correo
        </label>
        <input
          id={idCorreo}
          type="email"
          autoComplete="email"
          className="h-11 min-w-[220px] flex-1 rounded-xl border border-linea-fuerte bg-white/5 px-4 text-[15px]"
          placeholder="Tu correo"
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
        />
        <Boton tamano="pequeno" type="submit" disabled={estado === "enviando"}>
          {estado === "enviando" ? "Enviando…" : etiquetaBoton}
        </Boton>
      </div>

      {/* Trampa para robots: fuera de la vista y fuera del recorrido con teclado. */}
      <input
        type="text"
        name="empresa_web"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute left-[-9999px] h-0 w-0 opacity-0"
        value={trampa}
        onChange={(e) => setTrampa(e.target.value)}
      />

      <label className="mt-3 flex cursor-pointer items-start gap-2 text-[12.5px] text-apagado">
        <input type="checkbox" className="mt-0.5 accent-azul" checked={acepta} onChange={(e) => setAcepta(e.target.checked)} />
        {consentimiento} Te das de baja en un clic, desde cualquier correo.
      </label>

      {aviso && (
        <p className="mt-2 text-[12.5px] text-[#F0C27A]" aria-live="polite">
          {aviso}
        </p>
      )}
    </form>
  );
}
