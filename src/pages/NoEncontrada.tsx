import { Link } from "react-router-dom";

export function NoEncontrada() {
  return (
    <div className="py-24 text-center">
      <p className="text-[13px] uppercase tracking-[0.2em] text-azul-claro">Error 404</p>
      <h1 className="mb-3 mt-3 text-4xl">Esta página no existe</h1>
      <p className="mb-8 text-tinta-2">Puede que el enlace esté viejo o que la hayamos movido.</p>
      <Link className="rounded-full bg-azul px-6 py-3 font-semibold text-white" to="/tienda">
        Ir a la tienda
      </Link>
    </div>
  );
}
