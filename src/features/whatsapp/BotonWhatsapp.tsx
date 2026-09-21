/**
 * El botón de asesoría. Flotante en toda la tienda, porque la pregunta llega
 * en cualquier página — casi siempre en la ficha y en el carrito.
 *
 * Si no hay número configurado no se pinta: en su lugar, cada pantalla ofrece
 * lo que sí existe (el cotizador, el formulario). Nada de botones muertos.
 */
import { enlace, MENSAJE_GENERAL } from "./whatsapp.js";
import { clicWhatsapp } from "../analitica/eventos.js";

export function BotonWhatsapp({ mensaje = MENSAJE_GENERAL }: { mensaje?: string }) {
  const url = enlace(mensaje);
  if (!url) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Preguntar por WhatsApp"
      onClick={() => clicWhatsapp("flotante")}
      className="fixed bottom-5 right-5 z-40 flex h-14 items-center gap-2.5 rounded-full bg-[#25D366] px-5 font-semibold text-[#062B14] shadow-[0_10px_30px_rgba(0,0,0,0.35)] transition hover:brightness-110"
    >
      <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
        <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm0 18.13h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.22 8.22 0 0 1-1.26-4.36c0-4.54 3.7-8.23 8.25-8.23 2.2 0 4.27.86 5.83 2.41a8.18 8.18 0 0 1 2.41 5.83c0 4.54-3.7 8.21-8.24 8.21zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.78.97-.14.16-.29.18-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.15.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.16 0-.43.06-.65.31-.22.24-.86.84-.86 2.05s.88 2.38 1 2.54c.12.16 1.73 2.64 4.19 3.7.59.25 1.04.4 1.4.51.59.19 1.12.16 1.54.1.47-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.11-.22-.17-.47-.29z" />
      </svg>
      <span className="hidden text-[14.5px] sm:inline">Preguntar</span>
    </a>
  );
}
