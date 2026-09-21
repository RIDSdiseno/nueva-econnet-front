import { Link } from "react-router-dom";
import { FormularioCorreo } from "../../features/captacion/FormularioCorreo.js";

const COLUMNAS = [
  {
    titulo: "Comprar",
    enlaces: [
      { a: "/tienda", texto: "Todos los equipos" },
      { a: "/tienda?u=renovados", texto: "Renovados" },
      { a: "/carrito", texto: "Mi carrito" },
      { a: "/seguimiento", texto: "Seguir mi pedido" }
    ]
  },
  {
    titulo: "Ayuda",
    enlaces: [
      { a: "/legal/despacho-y-retiro", texto: "Despacho y retiro" },
      { a: "/legal/cambios-y-devoluciones", texto: "Cambios y devoluciones" },
      { a: "/legal/garantia", texto: "Garantía" },
      { a: "/guia-de-compra", texto: "Guía de compra" },
      { a: "/empresas", texto: "Empresas" }
    ]
  },
  {
    titulo: "Legal",
    enlaces: [
      { a: "/legal/terminos", texto: "Términos y condiciones" },
      { a: "/legal/privacidad", texto: "Privacidad" },
      { a: "/legal/cookies", texto: "Cookies" }
    ]
  }
];

export function Pie() {
  return (
    <footer className="mt-16 border-t border-linea bg-fondo-2 py-11">
      <div className="mx-auto w-full max-w-[1240px] px-4 sm:px-7">
        <div className="grid gap-7 border-b border-linea pb-7 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="text-[19px] font-semibold tracking-[-0.045em]">econnet</div>
            <p className="mt-3 text-sm text-apagado">
              Tecnología elegida con criterio.
              <br />
              La Concepción 65, oficina 1003, Providencia, Santiago.
              <br />
              Lunes a viernes de 08:30 a 18:00.
            </p>
          </div>

          {COLUMNAS.map((columna) => (
            <div key={columna.titulo}>
              <h4 className="mb-3 text-xs uppercase tracking-[0.14em] text-apagado">{columna.titulo}</h4>
              <ul className="grid gap-2">
                {columna.enlaces.map((e) => (
                  <li key={e.a + e.texto}>
                    <Link className="text-sm text-tinta-2 hover:text-white" to={e.a}>
                      {e.texto}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-b border-linea py-7">
          <FormularioCorreo
            origen="boletin"
            titulo="10% en tu primera compra"
            texto="Te mandamos el código y, de vez en cuando, los equipos que valen la pena. Ni uno más."
            etiquetaBoton="Quiero el 10%"
            consentimiento="Acepto recibir el código y las recomendaciones de Econnet."
          />
        </div>

        <p className="pt-5 text-[12.5px] text-apagado">
          © {new Date().getFullYear()} Econnet · Webpay · Mercado Pago · Precios con IVA incluido
        </p>
      </div>
    </footer>
  );
}
