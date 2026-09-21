/**
 * El panel de inventario.
 *
 * No se prerenderiza, no está en el sitemap y lleva `noindex`: es una puerta
 * de servicio, no una página de la tienda. Lo que se cambia aquí sale por la
 * misma API que lee la web, así que un precio corregido se ve en la ficha en
 * cuanto alguien la abre — sin volver a desplegar.
 */
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Boton } from "../components/ui/Boton.js";
import { clp } from "../services/api.js";
import type { FilaInventario } from "../services/tipos.js";
import { usePanel } from "../features/panel/usePanel.js";
import { TablaInventario } from "../features/panel/TablaInventario.js";
import { FichaEquipo } from "../features/panel/FichaEquipo.js";
import { Pedidos } from "../features/panel/Pedidos.js";
import { Cotizaciones } from "../features/panel/Cotizaciones.js";
import { Ajustes } from "../features/panel/Ajustes.js";
import { Importar } from "../features/panel/Importar.js";

type Filtro = "todos" | "venta" | "huecos" | "agotados" | "retirados";

type Pestana = "inventario" | "pedidos" | "cotizaciones" | "importar" | "ajustes";

const PESTANAS: Array<{ clave: Pestana; texto: string }> = [
  { clave: "inventario", texto: "Inventario" },
  { clave: "pedidos", texto: "Pedidos" },
  { clave: "cotizaciones", texto: "Cotizaciones" },
  { clave: "importar", texto: "Importar" },
  { clave: "ajustes", texto: "Ajustes" }
];

const FILTROS: Array<{ clave: Filtro; texto: string }> = [
  { clave: "todos", texto: "Todos" },
  { clave: "venta", texto: "A la venta" },
  { clave: "huecos", texto: "Les falta algo" },
  { clave: "agotados", texto: "Sin unidades" },
  { clave: "retirados", texto: "Retirados" }
];

function Dato({ titulo, valor, nota }: { titulo: string; valor: string; nota?: string }) {
  return (
    <div className="rounded-xl border border-linea bg-white/[0.025] px-4 py-3">
      <div className="text-[11.5px] uppercase tracking-[0.08em] text-apagado">{titulo}</div>
      <div className="mt-1 text-[22px] tabular-nums">{valor}</div>
      {nota && <div className="text-[11.5px] text-apagado">{nota}</div>}
    </div>
  );
}

function Entrar({ entrar }: { entrar: (clave: string) => Promise<void> }) {
  const [clave, setClave] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [yendo, setYendo] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setYendo(true);
    setError(null);
    try {
      await entrar(clave);
    } catch (err) {
      setError((err as Error).message);
      setClave("");
    } finally {
      setYendo(false);
    }
  }

  return (
    <form onSubmit={enviar} className="mx-auto mt-16 max-w-sm rounded-marco border border-linea bg-panel p-7">
      <h1 className="text-2xl">Inventario</h1>
      <p className="mt-1 text-[13.5px] text-apagado">La clave del panel. No es la de ningún cliente.</p>

      <label className="mt-6 mb-1.5 block text-[12.5px] font-medium text-tinta-2" htmlFor="clave">
        Clave
      </label>
      <input
        id="clave"
        type="password"
        autoComplete="current-password"
        className="h-11 w-full rounded-xl border border-linea-fuerte bg-white/5 px-3 text-[15px] focus:border-azul-claro focus:outline-none"
        value={clave}
        onChange={(e) => setClave(e.target.value)}
      />

      {error && (
        <p className="mt-3 text-[13px] text-rojo" role="alert">
          {error}
        </p>
      )}

      <Boton className="mt-5" ancho type="submit" disabled={yendo || !clave}>
        {yendo ? "Comprobando…" : "Entrar"}
      </Boton>
    </form>
  );
}

export function Panel() {
  const p = usePanel();
  const [pestana, setPestana] = useState<Pestana>("inventario");
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [busca, setBusca] = useState("");
  const [abierto, setAbierto] = useState<FilaInventario | null>(null);
  const [creando, setCreando] = useState(false);

  /* Es una puerta de servicio: que no acabe en un buscador. */
  useEffect(() => {
    const etiqueta = document.createElement("meta");
    etiqueta.name = "robots";
    etiqueta.content = "noindex, nofollow";
    document.head.appendChild(etiqueta);
    const titulo = document.title;
    document.title = "Inventario · Econnet";
    return () => {
      etiqueta.remove();
      document.title = titulo;
    };
  }, []);

  const visibles = useMemo(() => {
    const texto = busca.trim().toLowerCase();
    return p.productos
      .filter((x) => {
        if (filtro === "retirados") return x.archivado !== null;
        if (x.archivado) return false;
        if (filtro === "venta") return x.seVende;
        if (filtro === "huecos") return !x.publicable.ok;
        if (filtro === "agotados") return x.disponibles !== null && x.disponibles <= 0;
        return true;
      })
      .filter((x) =>
        !texto
          ? true
          : [x.marca, x.nombre, x.sku ?? "", x.categoria, x.modelo ?? ""].join(" ").toLowerCase().includes(texto)
      );
  }, [p.productos, filtro, busca]);

  const usosConocidos = useMemo(
    () => [...new Set(p.productos.flatMap((x) => x.usos))].sort(),
    [p.productos]
  );
  const valoresConocidos = useMemo(
    () => [...new Set(p.productos.flatMap((x) => x.valores))].sort(),
    [p.productos]
  );
  const categoriasConocidas = useMemo(
    () => [...new Set(p.productos.map((x) => x.categoria))].sort(),
    [p.productos]
  );

  if (p.sesion === "comprobando") return <p className="py-20 text-center text-tinta-2">Un momento…</p>;

  if (p.sesion === "sin-configurar") {
    return (
      <div className="mx-auto mt-16 max-w-xl rounded-marco border border-ambar/30 bg-ambar/5 p-7">
        <h1 className="text-2xl">El panel todavía no está abierto</h1>
        <p className="mt-3 text-[14.5px] text-tinta-2">
          Falta la clave en el servidor. Se genera una vez, en la carpeta del backend:
        </p>
        <pre className="mt-4 overflow-x-auto rounded-xl border border-linea bg-black/40 p-4 text-[13px]">
          npm run clave -- &quot;la clave que quieras&quot;
        </pre>
        <p className="mt-3 text-[13.5px] text-apagado">
          Imprime un <code>ADMIN_CLAVE_HASH</code> para pegar en las variables de entorno. La clave en claro no se
          guarda en ningún sitio: el servidor solo conoce su huella.
        </p>
      </div>
    );
  }

  if (p.sesion === "fuera") return <Entrar entrar={p.entrar} />;

  return (
    <>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl">Econnet</h1>
          <p className="mt-1 text-[13.5px] text-apagado">
            Lo que cambies aquí sale en{" "}
            <Link className="text-azul-claro underline" to="/tienda">
              la tienda
            </Link>{" "}
            en cuanto alguien la abra. No hay que volver a publicar nada.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {pestana === "inventario" && <Boton onClick={() => setCreando(true)}>+ Añadir equipo</Boton>}
          <button
            type="button"
            onClick={() => void p.salir()}
            className="text-[13px] text-apagado underline underline-offset-4 hover:text-tinta"
          >
            Salir
          </button>
        </div>
      </div>

      <nav className="mb-6 flex flex-wrap gap-2 border-b border-linea pb-3" aria-label="Secciones del panel">
        {PESTANAS.map((t) => (
          <button
            key={t.clave}
            type="button"
            aria-current={pestana === t.clave ? "page" : undefined}
            onClick={() => setPestana(t.clave)}
            className={`rounded-full px-4 py-2 text-[14px] transition ${
              pestana === t.clave ? "bg-azul text-white" : "text-apagado hover:text-tinta"
            }`}
          >
            {t.texto}
          </button>
        ))}
      </nav>

      {pestana === "pedidos" && <Pedidos />}
      {pestana === "cotizaciones" && <Cotizaciones />}
      {pestana === "ajustes" && <Ajustes />}
      {pestana === "importar" && <Importar alTerminar={p.recargar} />}

      {pestana === "inventario" && (
        <>

      {p.resumen && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Dato titulo="Equipos" valor={String(p.resumen.total)} nota={`${p.resumen.archivados} retirados`} />
            <Dato titulo="Se venden en línea" valor={String(p.resumen.enVenta)} nota="tienen precio propio" />
            <Dato
              titulo="Sin unidades"
              valor={String(p.resumen.agotados)}
              nota={`${p.resumen.sinStockConocido} sin contar`}
            />
            <Dato
              titulo="Valor en bodega"
              valor={p.resumen.valorInventario === null ? "no consta" : clp(p.resumen.valorInventario)}
              nota={
                p.resumen.costeInventario === null
                  ? "solo lo que tiene precio y unidades"
                  : `te costó ${clp(p.resumen.costeInventario)}`
              }
            />
          </div>

          {/* El margen: la cifra que decide cuánto se puede gastar en traer un
              cliente. Si falta el coste se dice, no se estima. */}
          <div className="mt-4 rounded-marco border border-linea bg-panel p-5">
            <h2 className="text-[15px] font-semibold">Margen</h2>
            {p.resumen.margen.porcentajePonderado === null ? (
              <>
                <p className="mb-3 mt-1 text-[13.5px] text-tinta-2">
                  Todavía no se puede calcular: falta el coste de compra de{" "}
                  <b>{p.resumen.margen.sinDato} equipo(s)</b>.
                </p>
                <p className="text-[12.5px] text-apagado">
                  El coste va en cada ficha, en «Precio». Sale de la factura del proveedor —no de su lista de precios—,
                  y sin él no hay forma de saber cuánto se puede pagar por un cliente.
                </p>
              </>
            ) : (
              <>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <div>
                    <div className="text-[11.5px] uppercase tracking-[0.08em] text-apagado">Del inventario</div>
                    <div className="mt-1 text-[22px] tabular-nums">{p.resumen.margen.porcentajePonderado}%</div>
                    <div className="text-[11.5px] text-apagado">ponderado por unidades en stock</div>
                  </div>
                  <div>
                    <div className="text-[11.5px] uppercase tracking-[0.08em] text-apagado">Media por equipo</div>
                    <div className="mt-1 text-[22px] tabular-nums">{p.resumen.margen.porcentajeMedio}%</div>
                    <div className="text-[11.5px] text-apagado">
                      {p.resumen.margen.conDato} con dato · {p.resumen.margen.sinDato} sin coste
                    </div>
                  </div>
                  <div>
                    <div className="text-[11.5px] uppercase tracking-[0.08em] text-apagado">Si vendes el stock</div>
                    <div className="mt-1 text-[22px] tabular-nums">
                      {p.resumen.margen.gananciaPotencial === null ? "—" : clp(p.resumen.margen.gananciaPotencial)}
                    </div>
                    <div className="text-[11.5px] text-apagado">sobre el neto, sin IVA</div>
                  </div>
                </div>

                {p.resumen.margen.peores.length > 0 && (
                  <p className="mt-4 text-[12.5px] text-apagado">
                    Los que menos dejan:{" "}
                    {p.resumen.margen.peores.map((x) => `${x.nombre} (${x.porcentaje}%)`).join(" · ")}
                  </p>
                )}
                {p.resumen.margen.sinDato > 0 && (
                  <p className="mt-2 text-[12.5px] text-ambar">
                    Ojo: {p.resumen.margen.sinDato} equipo(s) no entran en esta cuenta porque no tienen coste puesto.
                  </p>
                )}
              </>
            )}
          </div>

          {p.resumen.huecos.length > 0 && (
            <div className="mt-4 rounded-marco border border-linea bg-panel p-5">
              <h2 className="text-[15px] font-semibold">Qué falta para poder vender más</h2>
              <p className="mb-3 mt-1 text-[12.5px] text-apagado">
                Cada línea es un dato que no consta. Pulsa una para ver qué equipos son.
              </p>
              <div className="flex flex-wrap gap-2">
                {p.resumen.huecos.map((h) => (
                  <button
                    key={h.falta}
                    type="button"
                    onClick={() => {
                      setFiltro("huecos");
                      setBusca("");
                    }}
                    className="rounded-full border border-ambar/40 bg-ambar/10 px-3 py-1.5 text-[13px] text-ambar hover:border-ambar"
                  >
                    {h.falta} · {h.cuantos}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <div className="mt-6 mb-4 flex flex-wrap items-center gap-3">
        <input
          className="h-11 min-w-[240px] flex-1 rounded-xl border border-linea-fuerte bg-white/5 px-3 text-[14.5px] focus:border-azul-claro focus:outline-none"
          placeholder="Buscar por marca, nombre, SKU o categoría"
          value={busca}
          aria-label="Buscar en el inventario"
          onChange={(e) => setBusca(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          {FILTROS.map((f) => (
            <button
              key={f.clave}
              type="button"
              aria-pressed={filtro === f.clave}
              onClick={() => setFiltro(f.clave)}
              className={`rounded-full border px-3 py-2 text-[13px] transition ${
                filtro === f.clave
                  ? "border-azul-claro bg-azul/25 text-tinta"
                  : "border-linea-fuerte bg-white/5 text-apagado hover:text-tinta"
              }`}
            >
              {f.texto}
            </button>
          ))}
        </div>
      </div>

      {p.error && (
        <p className="mb-4 rounded-xl border border-rojo/40 bg-rojo/10 p-3 text-[13.5px] text-rojo" role="alert">
          {p.error}
        </p>
      )}

      <p className="mb-2 text-[12.5px] text-apagado" aria-live="polite">
        {visibles.length} de {p.productos.length} equipos
        {p.cargando ? " · actualizando…" : ""}
      </p>

      <TablaInventario
        productos={visibles}
        abrir={setAbierto}
        guardarPrecio={async (id, v) => {
          await p.editar(id, { precioVenta: v });
        }}
        guardarStock={async (id, v) => {
          await p.fijarStock(id, v);
        }}
      />

      {p.cambios.length > 0 && (
        <section className="mt-8 rounded-marco border border-linea bg-panel p-5">
          <h2 className="text-[15px] font-semibold">Lo último que se tocó</h2>
          <ul className="mt-3 grid gap-2 text-[13px]">
            {p.cambios.slice(0, 10).map((c) => (
              <li key={c.id} className="flex flex-wrap gap-x-2 border-b border-linea pb-2 last:border-0">
                <span className="text-apagado">{new Date(c.fecha).toLocaleString("es-CL")}</span>
                <span className="font-medium">{c.campo}</span>
                <span className="text-apagado">
                  {c.antes ?? "no constaba"} → {c.despues ?? "no consta"}
                </span>
                {c.motivo && <span className="text-tinta-2">· {c.motivo}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}
        </>
      )}

      {(creando || abierto) && (
        <FichaEquipo
          producto={creando ? null : abierto}
          usosConocidos={usosConocidos}
          valoresConocidos={valoresConocidos}
          categoriasConocidas={categoriasConocidas}
          cerrar={() => {
            setCreando(false);
            setAbierto(null);
          }}
          crear={p.crear}
          editar={p.editar}
          archivar={p.archivar}
        />
      )}
    </>
  );
}
