/**
 * La guía de compra: el imán que NO se esconde detrás del formulario.
 *
 * Un imán que tapa el contenido convierte peor y enfada. Lo que se pide a
 * cambio del correo es la comodidad de tenerla guardada, no el derecho a
 * leerla — así que la página se lee entera sin dar nada.
 */
import { Link } from "react-router-dom";
import { clp } from "../services/api.js";
import { useCatalogo } from "../features/catalogo/useCatalogo.js";
import { FormularioCorreo } from "../features/captacion/FormularioCorreo.js";
import { ANTES_DE_PAGAR, ERRORES, GLOSARIO, PERFILES } from "../features/guia/glosario.js";

export function Guia() {
  const { productos } = useCatalogo();

  return (
    <article className="mx-auto max-w-[760px] py-10">
      <h1 className="text-4xl sm:text-5xl">Cómo elegir un notebook sin saber de especificaciones</h1>
      <p className="mt-4 text-lg text-tinta-2">
        Diez minutos de lectura. Al final vas a poder mirar cualquier ficha técnica —la nuestra o la de cualquier
        tienda— y saber qué te están cobrando y si lo necesitas.
      </p>

      <div className="mt-8">
        <FormularioCorreo
          origen="guia"
          titulo="¿Te la guardamos?"
          texto="La guía se lee entera aquí, sin dejar nada. El correo es solo para tenerla a mano cuando la necesites."
          etiquetaBoton="Guardármela"
          consentimiento="Acepto que Econnet me mande la guía y sus recomendaciones."
        />
      </div>

      <h2 className="mt-12 text-3xl">1. La única pregunta que importa</h2>
      <p className="mt-3 text-tinta-2">
        No es «¿qué equipo es mejor?». Es <b className="text-tinta">«¿qué voy a hacer con él ocho horas al día?»</b>. Un
        equipo excelente para editar video es un mal equipo para alguien que viaja, y al revés. Todo lo demás sale de
        ahí.
      </p>

      <h2 className="mt-10 text-3xl">2. La ficha técnica, traducida</h2>
      <dl className="mt-4 grid gap-3">
        {GLOSARIO.map(([campo, explicacion]) => (
          <div key={campo} className="rounded-xl border border-linea bg-panel p-4">
            <dt className="font-mono text-[13px] text-azul-claro">{campo}</dt>
            <dd className="mt-1.5 text-[14.5px] text-tinta-2">{explicacion}</dd>
          </div>
        ))}
      </dl>

      <h2 className="mt-10 text-3xl">3. Qué pedir según lo que hagas</h2>
      {PERFILES.map((perfil) => {
        const suyos = productos
          .filter((p) => p.usos.includes(perfil.uso) && p.referencia.valor)
          .sort((a, b) => (a.referencia.valor ?? 0) - (b.referencia.valor ?? 0))
          .slice(0, 3);

        return (
          <section key={perfil.uso} className="mt-6">
            <h3 className="text-xl">{perfil.nombre}</h3>
            <p className="mt-1 text-tinta-2">{perfil.pide}</p>
            <ul className="mt-2 grid gap-1.5">
              {suyos.map((p) => (
                <li key={p.id} className="text-[14.5px] text-tinta-2">
                  <Link className="font-semibold text-tinta hover:text-azul-claro" to={`/tienda/${p.slug}`}>
                    {p.marca} {p.nombre}
                  </Link>{" "}
                  — {p.referencia.propio ? clp(p.referencia.valor) : `${clp(p.referencia.valor)} (publicado en ${p.referencia.canal})`}. {p.para}
                </li>
              ))}
              {!suyos.length && <li className="text-[14.5px] text-apagado">Hoy no tenemos nada publicado con precio para este perfil.</li>}
            </ul>
          </section>
        );
      })}

      <h2 className="mt-10 text-3xl">4. Los cuatro errores que salen caros</h2>
      {ERRORES.map(([titulo, texto]) => (
        <section key={titulo} className="mt-5">
          <h3 className="text-xl">{titulo}</h3>
          <p className="mt-1 text-tinta-2">{texto}</p>
        </section>
      ))}

      <h2 className="mt-10 text-3xl">5. La condición del equipo</h2>
      <p className="mt-3 text-tinta-2">
        <b className="text-tinta">Nuevo</b>: sellado, garantía completa de marca. <b className="text-tinta">Openbox</b>:
        caja abierta, equipo sin uso. <b className="text-tinta">Reacondicionado</b>: uso previo, revisado y probado.{" "}
        <b className="text-tinta">Seminuevo</b>: uso mínimo, con detalles estéticos.
      </p>
      <p className="mt-2 text-tinta-2">Los cuatro son compras legítimas. Lo que no es legítimo es que no te lo digan.</p>

      <h2 className="mt-10 text-3xl">6. Antes de pagar, comprueba esto</h2>
      <ul className="mt-3 grid gap-2">
        {ANTES_DE_PAGAR.map((punto) => (
          <li key={punto} className="flex gap-2 text-tinta-2">
            <span className="text-azul-claro">✓</span>
            {punto}
          </li>
        ))}
      </ul>

      <h2 className="mt-10 text-3xl">¿Lo hacemos contigo?</h2>
      <p className="mt-3 text-tinta-2">
        Cuéntanos qué haces en el día y con qué presupuesto. Te respondemos con dos o tres opciones concretas — y con
        cuál te sobra.
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link className="rounded-full bg-azul px-6 py-3 font-semibold text-white" to="/#test">
          Hacer el test de 60 segundos
        </Link>
        <Link className="rounded-full border border-linea-fuerte px-6 py-3 font-semibold" to="/empresas">
          Hablar con una persona
        </Link>
      </div>
    </article>
  );
}
