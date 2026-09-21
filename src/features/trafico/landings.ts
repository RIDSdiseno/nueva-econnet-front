/**
 * Las landings por necesidad: una página por búsqueda concreta.
 *
 * Para qué: una campaña de «notebook para arquitectura» que aterriza en la
 * portada convierte mal y paga más caro el clic. Cada landing responde a una
 * búsqueda, explica qué pedir, lista lo que hay en catálogo y remata en
 * asesoría.
 *
 * El contenido es el que ya estaba escrito en `os/trafico/landings.mjs`:
 * se porta, no se reinventa.
 */
import { GLOSARIO } from "../guia/glosario.js";

const traduce = Object.fromEntries(GLOSARIO) as Record<string, string>;

export interface Landing {
  slug: string;
  uso: string;
  categorias?: string[];
  consulta: string;
  titulo: string;
  h1: string;
  descripcion: string;
  intro: string;
  pide: Array<[string, string]>;
  preguntas: Array<[string, string]>;
}

export const LANDINGS: Landing[] = [
  {
    slug: "notebooks-para-trabajar",
    uso: "trabajar",
    categorias: ["Notebook"],
    consulta: "notebook para trabajar",
    titulo: "Notebooks para trabajar | Econnet",
    h1: "Notebooks para trabajar",
    descripcion:
      "Equipos de oficina y teletrabajo con Windows 11 Pro, pantalla mate y peso real de notebook. Con asesoría y factura.",
    intro:
      "Un equipo de trabajo se usa ocho horas al día, cinco días a la semana. Lo que decide si es bueno no es el procesador: es la pantalla, el teclado, el peso y que no se quede corto de memoria al tercer año.",
    pide: [
      ["16 GB de memoria", traduce.ram!],
      ["Pantalla mate", "Si trabajas con una ventana detrás, una pantalla brillante te va a hacer la vida imposible."],
      ["Windows 11 Pro", "Es el que se conecta al dominio de una empresa y el que permite cifrar el disco."],
      ["Menos de 1,6 kg", traduce.peso!]
    ],
    preguntas: [
      [
        "¿Me sirve un notebook de 8 GB para la oficina?",
        "Para correo, navegador y ofimática liviana, sí. Si trabajas con muchas pestañas, Excel pesado y videollamada a la vez, se nota y se nota pronto."
      ],
      [
        "¿Necesito Windows 11 Pro o me basta Home?",
        "Home sirve para trabajar solo. Pro es lo que pide el área de TI de una empresa: dominio, cifrado de disco y políticas."
      ],
      ["¿Dan factura?", "Sí, a nombre de tu empresa. También boleta si la compra es personal."]
    ]
  },
  {
    slug: "notebooks-para-empresas",
    uso: "empresa",
    categorias: ["Notebook", "All-in-One"],
    consulta: "notebooks para empresas",
    titulo: "Notebooks para empresas | Cotización por volumen | Econnet",
    h1: "Equipar tu empresa",
    descripcion:
      "Notebooks y All-in-One para 5, 20 o 50 puestos. Cotización con modelos concretos, factura, volumen y renovación por tandas.",
    intro:
      "Equipar no es comprar veinte veces lo mismo. Es elegir un modelo que puedas repetir durante dos años, tener repuestos, y cambiar por tandas sin frenar la operación.",
    pide: [
      [
        "Un solo modelo por perfil",
        "Un parque homogéneo se mantiene, se documenta y se repone. Veinte modelos distintos son veinte problemas distintos."
      ],
      ["Windows 11 Pro", "Sin Pro no hay dominio ni políticas."],
      ["Garantía y repuestos", "Las gamas corporativas (ExpertBook, EliteBook) existen justo por esto."],
      ["Factura", "Y compra por volumen: sobre diez equipos el precio cambia."]
    ],
    preguntas: [
      ["¿Cuánto tardan en cotizar?", "La cotización con modelos y precios sale al momento desde el cotizador, con número y validez escrita."],
      [
        "¿Se puede comprar reacondicionado para una empresa?",
        "Sí, y en parques grandes baja bastante el costo por puesto. Va con su condición declarada y su garantía."
      ],
      ["¿Configuran los equipos antes de entregarlos?", "Sí: te llegan listos para usar, con la configuración que nos indiques."]
    ]
  },
  {
    slug: "notebooks-para-estudiantes",
    uso: "estudiar",
    categorias: ["Notebook"],
    consulta: "notebook para estudiar universidad",
    titulo: "Notebooks para estudiar | Econnet",
    h1: "Notebooks para la universidad",
    descripcion:
      "El equipo que aguanta la carrera completa: qué pide cada carrera de verdad y por qué el más barato sale caro al tercer año.",
    intro:
      "El error caro de la compra universitaria es mirar solo el precio del primer año. Un equipo que se queda corto en tercero se cambia en cuarto, y eso cuesta el doble.",
    pide: [
      ["16 GB si tu carrera usa software", "Diseño, ingeniería y programación se comen la memoria."],
      ["SSD, nunca disco mecánico", traduce.almacenamiento!],
      ["Batería de verdad", "Entre clases no hay enchufe."],
      ['Pantalla de 14" o más', "Apuntes y PDF a la vez."]
    ],
    preguntas: [
      [
        "¿Chromebook o Windows?",
        "Chromebook si tu carrera vive en el navegador: batería, precio y cero mantenimiento. Windows si necesitas instalar programas de escritorio."
      ],
      [
        "¿Sirve un equipo reacondicionado para estudiar?",
        "Muy bien, y suele dar más equipo por el mismo dinero. Lo importante es que la condición esté dicha antes de comprar."
      ]
    ]
  },
  {
    slug: "notebooks-gamer",
    uso: "jugar",
    categorias: ["Notebook"],
    consulta: "notebook gamer",
    titulo: "Notebooks gamer | Econnet",
    h1: "Notebooks para jugar",
    descripcion:
      "Equipos con gráfica dedicada RTX y pantallas de 144 Hz, con el criterio de siempre: qué necesitas de verdad y qué te están cobrando de más.",
    intro:
      "En gaming la tarjeta gráfica manda, pero la pantalla es lo que se nota en la mano: 144 Hz cambia la sensación más que veinte fotogramas de diferencia en el papel.",
    pide: [
      ["Gráfica dedicada", traduce.gpu!],
      ["144 Hz o más", "Es lo primero que se siente al mover el mouse."],
      ["16 GB de memoria", "Es el estándar real para juego actual."],
      ["Aceptar el peso", "Un gamer de 2 kg es un gamer de 2 kg. Si lo vas a cargar cada día, mira otra cosa."]
    ],
    preguntas: [
      ["¿Me sirve para editar video?", "Sí. Una gráfica dedicada acelera la exportación tanto como el juego."],
      ["¿Cuánto dura la batería?", "Poco: con gráfica dedicada, la mitad que un equipo de oficina. Es el precio de la potencia."]
    ]
  },
  {
    slug: "notebooks-reacondicionados",
    uso: "renovados",
    consulta: "notebook reacondicionado chile",
    titulo: "Notebooks reacondicionados y openbox | Econnet",
    h1: "Equipos renovados, con la condición por delante",
    descripcion:
      "Reacondicionados, openbox y seminuevos revisados, con garantía y con su condición declarada antes del precio.",
    intro:
      "Un equipo reacondicionado no es un equipo dudoso: es un equipo profesional revisado que cuesta bastante menos. Lo que no puede pasar es que no sepas cuál estás comprando.",
    pide: [
      ["Que diga la condición", "Nuevo, openbox, reacondicionado o seminuevo. Si no lo dice, pregunta antes de pagar."],
      ["Garantía escrita", "Cuánta, con quién se hace efectiva y quién la gestiona."],
      [
        "Gama corporativa",
        "Un EliteBook o un ThinkPad de hace dos generaciones aguanta más que un equipo doméstico nuevo."
      ],
      ["Batería", "Es la pieza que envejece. Pregunta por ella siempre."]
    ],
    preguntas: [
      [
        "¿Qué diferencia hay entre openbox y reacondicionado?",
        "Openbox es caja abierta con el equipo sin uso. Reacondicionado tuvo uso previo y fue revisado y probado."
      ],
      ["¿Tienen garantía?", "Sí. La condición y la garantía van escritas en cada ficha."]
    ]
  },
  {
    slug: "all-in-one-para-oficina",
    uso: "empresa",
    categorias: ["All-in-One"],
    consulta: "all in one oficina",
    titulo: "All-in-One para oficina | Econnet",
    h1: "All-in-One para puestos fijos",
    descripcion: "Un puesto de trabajo sin torre ni cables: llega, se enchufa y funciona. Con Windows 11 Pro y factura.",
    intro:
      "Para un puesto que no se mueve, un All-in-One ahorra escritorio, cables y tiempo de instalación. Y para una recepción o una sala, se ve mejor.",
    pide: [
      ["16 GB de memoria", traduce.ram!],
      ["Windows 11 Pro", "Dominio y políticas."],
      ["Pantalla incluida", "Es la gracia: un solo aparato, un solo cable."]
    ],
    preguntas: [
      [
        "¿Se puede ampliar después?",
        "La memoria y el disco, normalmente sí. La pantalla y el procesador, no: van soldados al conjunto."
      ]
    ]
  },
  {
    slug: "camaras-de-seguridad",
    uso: "proteger",
    categorias: ["Cámaras de seguridad"],
    consulta: "camara de seguridad wifi",
    titulo: "Cámaras de seguridad Wi-Fi | Econnet",
    h1: "Cámaras de seguridad",
    descripcion:
      "Cámaras Wi-Fi para casa y local, con visión nocturna, 360° y almacenamiento en microSD. Con asesoría para elegir.",
    intro:
      "Una cámara barata que no graba de noche o que pierde la conexión cada dos días no es seguridad: es una luz roja en la pared.",
    pide: [
      ["Resolución 2K si vas a reconocer caras", "En 1080p a cinco metros ya no se distingue quién es."],
      ["Visión nocturna", "Es cuando pasa lo que te importa."],
      ["Dónde se guarda", "MicroSD, nube o las dos. Y qué pasa si te roban la cámara."],
      ["Interior o exterior", "No es lo mismo, y una de interior a la intemperie dura un invierno."]
    ],
    preguntas: [
      [
        "¿Necesito internet en el local?",
        "Sí, para ver desde el teléfono. Grabar en microSD funciona igual sin conexión, pero no la miras a distancia."
      ],
      ["¿Sirven de noche?", "Las que tienen visión nocturna infrarroja, sí, en blanco y negro."]
    ]
  }
];

export const landingPorSlug = (slug: string): Landing | undefined => LANDINGS.find((l) => l.slug === slug);
