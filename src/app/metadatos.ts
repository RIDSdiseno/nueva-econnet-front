/**
 * Qué dice cada página cuando la mira un buscador o un motor de IA.
 *
 * Vive fuera de los componentes a propósito: lo usa el prerenderizado —que
 * corre en Node, sin navegador— y también el navegador para poner el título al
 * cambiar de ruta. Una sola fuente.
 */
import { LANDINGS } from "../features/trafico/landings.js";

export const SITIO = "https://econnet.cl";

export const NEGOCIO = {
  nombre: "Econnet",
  descripcion:
    "Tienda chilena de tecnología: notebooks y equipos profesionales seleccionados, nuevos, openbox y reacondicionados, con asesoría para elegir.",
  direccion: "La Concepción 65, oficina 1003, Providencia, Santiago",
  region: "Región Metropolitana de Santiago",
  pais: "CL",
  horario: "Lu-Vi 08:30-18:00"
};

export interface Metadatos {
  titulo: string;
  descripcion: string;
  /** JSON-LD extra de la página, además del de negocio. */
  datos?: object[];
}

const migas = (ruta: string, nombre: string) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Inicio", item: SITIO },
    { "@type": "ListItem", position: 2, name: nombre, item: `${SITIO}${ruta}` }
  ]
});

const preguntasLd = (preguntas: Array<[string, string]>) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: preguntas.map(([pregunta, respuesta]) => ({
    "@type": "Question",
    name: pregunta,
    acceptedAnswer: { "@type": "Answer", text: respuesta }
  }))
});

export const negocioLd = () => ({
  "@context": "https://schema.org",
  "@type": "Store",
  name: NEGOCIO.nombre,
  description: NEGOCIO.descripcion,
  url: SITIO,
  address: {
    "@type": "PostalAddress",
    streetAddress: "La Concepción 65, oficina 1003",
    addressLocality: "Providencia",
    addressRegion: "Región Metropolitana de Santiago",
    addressCountry: "CL"
  },
  openingHours: NEGOCIO.horario,
  areaServed: "CL"
});

const FIJAS: Record<string, Metadatos> = {
  "/": {
    titulo: "Econnet · tecnología elegida con criterio",
    descripcion:
      "Notebooks y equipos profesionales seleccionados, con la condición declarada y el motivo de cada equipo escrito. Asesoría, garantía y despacho a todo Chile."
  },
  "/tienda": {
    titulo: "Todos los equipos | Econnet",
    descripcion:
      "Notebooks, All-in-One, monitores y cámaras con su condición declarada, para quién es cada equipo y para quién no. Despacho a todo Chile, boleta o factura."
  },
  "/empresas": {
    titulo: "Equipar tu empresa | Cotización al momento | Econnet",
    descripcion:
      "Cotización con modelos concretos, neto e IVA desglosados y validez escrita, en el momento. Factura, volumen y renovación por tandas.",
    datos: [migas("/empresas", "Empresas")]
  },
  "/guia-de-compra": {
    titulo: "Cómo elegir un notebook sin saber de especificaciones | Econnet",
    descripcion:
      "Qué significa cada especificación en tu día real, qué pedir según lo que hagas y los cuatro errores que hacen que un equipo se quede corto al segundo año.",
    datos: [migas("/guia-de-compra", "Guía de compra")]
  },
  "/seguimiento": {
    titulo: "Seguir mi pedido | Econnet",
    descripcion: "Consulta el estado de tu pedido con el número y el correo de la compra."
  },
  "/cotizacion": {
    titulo: "Tu cotización | Econnet",
    descripcion: "Consulta tu cotización de empresa con su número y el correo con el que la pediste."
  }
};

export const POR_DEFECTO: Metadatos = {
  titulo: "Econnet · tecnología elegida con criterio",
  descripcion: NEGOCIO.descripcion
};

export function metadatosDe(ruta: string): Metadatos {
  const limpia = ruta.split("?")[0]!.replace(/\/$/, "") || "/";
  const fija = FIJAS[limpia];
  if (fija) return fija;

  const landing = LANDINGS.find((l) => `/${l.slug}` === limpia);
  if (landing) {
    return {
      titulo: landing.titulo,
      descripcion: landing.descripcion,
      datos: [migas(`/${landing.slug}`, landing.h1), preguntasLd(landing.preguntas)]
    };
  }

  return POR_DEFECTO;
}

/** Las rutas que se prerenderizan. Las del carrito para adentro, no: son privadas. */
export const RUTAS_PUBLICAS = [
  "/",
  "/tienda",
  "/empresas",
  "/guia-de-compra",
  "/seguimiento",
  ...LANDINGS.map((l) => `/${l.slug}`),
  "/legal/terminos",
  "/legal/privacidad",
  "/legal/cookies",
  "/legal/despacho-y-retiro",
  "/legal/cambios-y-devoluciones",
  "/legal/garantia"
];
