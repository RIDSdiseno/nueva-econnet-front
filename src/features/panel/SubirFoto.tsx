/**
 * La subida de una fotografía.
 *
 * Es el hueco número uno del catálogo —quince equipos de quince sin foto— y
 * además el que bloquea los feeds de Google y de Meta, así que tenía que ser
 * un clic y no «pega aquí una URL».
 *
 * El fichero se manda en base64 dentro del JSON, sin dependencias nuevas de
 * subida. El servidor comprueba los primeros bytes: lo que no sea JPEG, PNG o
 * WebP de verdad no entra, se llame como se llame.
 */
import { useRef, useState } from "react";
import { panel } from "../../services/api.js";

const TOPE_BYTES = 4 * 1024 * 1024;

export function SubirFoto({
  valor,
  cambiar,
  alt
}: {
  valor: string;
  cambiar: (url: string) => void;
  alt: string;
}) {
  const entrada = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function elegir(fichero: File) {
    setError(null);
    if (fichero.size > TOPE_BYTES) {
      setError(`Pesa ${Math.round(fichero.size / 1024)} KB y el tope son 4 MB. Exporta la foto más pequeña.`);
      return;
    }

    const lector = new FileReader();
    lector.onload = async () => {
      setSubiendo(true);
      try {
        const medio = await panel.subirFoto(String(lector.result ?? ""), fichero.name);
        cambiar(medio.url);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setSubiendo(false);
      }
    };
    lector.onerror = () => setError("No se pudo leer el fichero.");
    lector.readAsDataURL(fichero);
  }

  return (
    <div>
      <span className="mb-1.5 block text-[12.5px] font-medium text-tinta-2">Fotografía</span>

      <div className="flex items-start gap-3">
        <div className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-xl border border-linea bg-white/5">
          {valor ? (
            <img src={valor} alt={alt || "Vista previa"} className="h-full w-full object-contain" />
          ) : (
            <span className="px-2 text-center text-[11px] text-apagado">sin foto</span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <input
            ref={entrada}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            aria-label="Subir fotografía"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) elegir(f);
            }}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => entrada.current?.click()}
              disabled={subiendo}
              className="rounded-full border border-linea-fuerte bg-white/5 px-3 py-1.5 text-[13px] hover:border-white/30 disabled:opacity-50"
            >
              {subiendo ? "Subiendo…" : valor ? "Cambiar foto" : "Subir foto"}
            </button>
            {valor && (
              <button
                type="button"
                onClick={() => cambiar("")}
                className="rounded-full border border-linea-fuerte px-3 py-1.5 text-[13px] text-apagado hover:text-tinta"
              >
                Quitar
              </button>
            )}
          </div>

          <p className="mt-2 text-[12px] text-apagado">
            JPEG, PNG o WebP, hasta 4 MB. Sin foto, la tienda dibuja un equipo genérico y lo dice — y el equipo no puede
            entrar en los anuncios de Google ni de Meta.
          </p>

          {valor && (
            <p className="mt-1 break-all text-[11.5px] text-apagado">{valor}</p>
          )}

          {error && (
            <p className="mt-2 text-[12.5px] text-rojo" role="alert">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
