import { Link, NavLink } from "react-router-dom";
import { useCarrito } from "../../features/carrito/useCarrito.js";

const ENLACES = [
  { a: "/tienda", texto: "Tienda" },
  { a: "/tienda?c=Notebook", texto: "Notebooks" },
  { a: "/tienda?u=renovados", texto: "Renovados" },
  { a: "/empresas", texto: "Empresas" },
  { a: "/seguimiento", texto: "Mi pedido" }
];

export function Cabecera() {
  const { unidades } = useCarrito();

  return (
    <header className="sticky top-0 z-50 border-b border-linea bg-fondo/90 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-[1240px] items-center gap-4 px-4 sm:px-7">
        <Link to="/" className="text-[19px] font-semibold tracking-[-0.045em]">
          econnet
        </Link>

        <nav className="mx-auto hidden gap-5 md:flex" aria-label="Principal">
          {ENLACES.map((e) => (
            <NavLink
              key={e.texto}
              to={e.a}
              className={({ isActive }) =>
                `text-[14.5px] transition ${isActive ? "text-white" : "text-tinta-2 hover:text-white"}`
              }
            >
              {e.texto}
            </NavLink>
          ))}
        </nav>

        <Link
          to="/carrito"
          className="ml-auto flex items-center gap-2 rounded-xl border border-linea-fuerte px-3 py-2 text-sm md:ml-0"
          aria-label={`Carrito, ${unidades} productos`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-[18px] w-[18px]" aria-hidden="true">
            <path d="M2.5 3.5h2.2l2.3 11.3a1.6 1.6 0 0 0 1.6 1.3h8.6a1.6 1.6 0 0 0 1.6-1.3l1.4-7.3H6" />
            <circle cx="9.5" cy="20" r="1.4" />
            <circle cx="17" cy="20" r="1.4" />
          </svg>
          <span className="min-w-5 rounded-lg bg-azul px-1.5 text-center text-xs font-bold">{unidades}</span>
        </Link>
      </div>
    </header>
  );
}
