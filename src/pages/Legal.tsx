/**
 * Páginas legales. **Borradores para revisar con abogado**: lo marcado en
 * amarillo es una decisión del negocio o una cifra legal que hay que
 * confirmar. Escribir un plazo legal inventado en una tienda es peor que no
 * escribirlo.
 */
import { useParams } from "react-router-dom";
import { NoEncontrada } from "./NoEncontrada.js";
import { faltanDatos, useNegocio, type Negocio } from "../config/negocio.js";

const Hueco = ({ children }: { children: string }) => (
  <span className="rounded border border-ambar/40 bg-ambar/15 px-2 py-0.5 text-[13.5px] text-[#F0C27A]">{children}</span>
);

/**
 * Un dato de empresa: si está configurado se imprime; si no, se enseña el
 * hueco. Nunca se inventa — un RUT falso en unos términos es una declaración
 * falsa, no un detalle de maqueta.
 */
const Dato = ({ valor, falta }: { valor: string | null; falta: string }) =>
  valor ? <>{valor}</> : <Hueco>{falta}</Hueco>;

/**
 * Las páginas son una función de los datos del negocio, no una constante: los
 * datos llegan de la API y pueden cambiar sin desplegar, así que el texto se
 * arma con lo que haya en ese momento.
 */
const PAGINAS = (NEGOCIO: Negocio): Record<string, { titulo: string; contenido: React.ReactNode }> => ({
  terminos: {
    titulo: "Términos y condiciones",
    contenido: (
      <>
        <h2>Quiénes somos</h2>
        <p>
          econnet.cl es operado por <Dato valor={NEGOCIO.razonSocial} falta="razón social" />, RUT{" "}
          <Dato valor={NEGOCIO.rut} falta="RUT" />, con domicilio en{" "}
          <Dato valor={NEGOCIO.direccion} falta="dirección" />.
          {NEGOCIO.correo ? <> Contacto: {NEGOCIO.correo}.</> : null}
        </p>
        <h2>Precios</h2>
        <p>
          En pesos chilenos con IVA incluido. El precio que vale es el que aparece al completar la compra. Los precios de
          nuestras publicaciones en Falabella o Lider corresponden a esos canales y pueden ser distintos.
        </p>
        <h2>Stock</h2>
        <p>
          Cuando un producto tiene el stock por confirmar, tu pedido queda anotado y <b>no se te cobra nada</b> hasta que
          confirmemos disponibilidad y el total definitivo.
        </p>
        <h2>Derecho a retracto</h2>
        <p>
          En compras a distancia, la Ley 19.496 contempla poner término al contrato dentro de un plazo desde la recepción
          (art. 3 bis). Plazo y excepciones aplicables: <Hueco>confirmar con abogado</Hueco>.
        </p>
      </>
    )
  },
  privacidad: {
    titulo: "Política de privacidad",
    contenido: (
      <>
        <h2>Qué guardamos y para qué</h2>
        <p>
          Tu correo, si nos lo dejas, para mandarte lo que pediste. Tu pedido: nombre, correo, teléfono, dirección y datos
          de facturación, porque sin eso no podemos despachar ni emitir documento. Tu carrito, para poder retomarlo.
        </p>
        <p>
          <b>No guardamos datos de tarjetas</b>: el pago lo procesa la pasarela. De tu IP guardamos una huella, no la IP.
        </p>
        <h2>Consentimiento</h2>
        <p>
          Para los correos comerciales guardamos el texto que aceptaste y la fecha. Puedes retirarlo con el enlace de baja
          que va en todos nuestros correos.
        </p>
        <h2>Marco legal</h2>
        <p>
          Ley 19.628 y, cuando entre en vigor, la Ley 21.719 de protección de datos:{" "}
          <Hueco>confirmar vigencia y adaptar consentimiento, plazos y registro de tratamientos</Hueco>.
        </p>
      </>
    )
  },
  cookies: {
    titulo: "Cookies y almacenamiento",
    contenido: (
      <>
        <h2>Lo que guardamos en tu navegador</h2>
        <p>
          Tu carrito (almacenamiento local) y una clave del intento de compra (de sesión), para que dos clics no sean dos
          pedidos. Las dos son técnicas: sin ellas la tienda no funciona, y no siguen tu navegación fuera de aquí.
        </p>
        <h2>Analítica y publicidad</h2>
        <p>
          <Hueco>Si se instala analítica o píxeles, hay que declararlo acá y pedir consentimiento antes de cargarlos</Hueco>.
        </p>
      </>
    )
  },
  "despacho-y-retiro": {
    titulo: "Despacho y retiro",
    contenido: (
      <>
        <h2>Retiro en oficina</h2>
        <p>La Concepción 65, oficina 1003, Providencia · lunes a viernes de 08:30 a 18:00. Te avisamos cuando esté listo.</p>
        <h2>Despacho a todo Chile</h2>
        <p>
          El costo se calcula en el checkout según tu región. Mientras no haya tarifa cargada, tu pedido queda anotado y{" "}
          <b>te confirmamos el costo antes de cobrarte</b>. Nunca vas a ver aquí una cifra de despacho inventada.
        </p>
        <h2>Plazos</h2>
        <p><Hueco>plazos por zona, acordados con el courier</Hueco></p>
      </>
    )
  },
  "cambios-y-devoluciones": {
    titulo: "Cambios y devoluciones",
    contenido: (
      <>
        <h2>Si el equipo llegó fallado</h2>
        <p>
          Escríbenos dentro de <Hueco>plazo</Hueco> con tu número de pedido. Nos hacemos cargo de la gestión con la marca.
        </p>
        <h2>Si te arrepentiste</h2>
        <p>
          Aplica el derecho a retracto de la Ley 19.496 (art. 3 bis). Plazo, condiciones y quién paga el envío de vuelta:{" "}
          <Hueco>definir con abogado y con el courier</Hueco>.
        </p>
        <h2>Equipos renovados</h2>
        <p>Tienen garantía. Lo que no cubre es el desgaste estético declarado en la ficha: por eso la condición va antes del precio.</p>
      </>
    )
  },
  garantia: {
    titulo: "Garantía",
    contenido: (
      <>
        <h2>Garantía legal</h2>
        <p>
          Todos los productos tienen la garantía legal de la Ley 19.496: ante una falla puedes optar entre reparación,
          cambio o devolución. Plazo vigente hoy:{" "}
          <Hueco>confirmar — la garantía legal era de 3 meses y la Ley 21.398 la modificó</Hueco>.
        </p>
        <h2>Quién la gestiona</h2>
        <p>Nosotros. Escríbenos con tu número de pedido y hacemos el trámite con la marca.</p>
      </>
    )
  }
});

export function Legal() {
  const { slug } = useParams();
  const negocio = useNegocio();
  const faltan = faltanDatos(negocio);
  const pagina = slug ? PAGINAS(negocio)[slug] : undefined;
  if (!pagina) return <NoEncontrada />;

  return (
    <article className="max-w-[75ch] py-4 [&_h2]:mt-9 [&_h2]:text-2xl [&_p]:mt-3 [&_p]:text-[15.5px] [&_p]:text-tinta-2">
      <h1 className="text-4xl">{pagina.titulo}</h1>
      <p className="mt-4 rounded-xl border border-ambar/40 bg-ambar/10 p-4 text-[13.5px] text-[#F0C27A]">
        {faltan.length > 0 && (
          <>
            Faltan datos de la empresa: <b>{faltan.join(", ")}</b>. Se ponen en el panel, en{" "}
            <b>Ajustes → Datos legales</b>, y se ven aquí sin volver a publicar la web.{" "}
          </>
        )}
        Borrador. Lo marcado en amarillo es una decisión del negocio o una cifra legal que hay que confirmar con abogado
        antes de publicar.
      </p>
      {pagina.contenido}
      <p className="mt-10 text-[13px] text-apagado">Última actualización: 18 de septiembre de 2026.</p>
    </article>
  );
}
