/**
 * La ficha técnica traducida.
 *
 * Copiado **literal** del bloque `traduce` de la extracción del 18-09-2026
 * (`backend-api/prisma/datos/catalogo.json`). Es texto editorial, no dato de
 * producto: no se inventa ni se reescribe aquí. Si cambia en la fuente, se
 * vuelve a copiar y se cambia la fecha de esta cabecera.
 */
export const FECHA_GLOSARIO = "18-09-2026";

export const GLOSARIO: Array<[string, string]> = [
  ["cpu", "Quién hace el trabajo. Manda en render, compilación y planillas enormes."],
  ["gpu", "Quién dibuja: juego, 3D y edición. Si no haces eso, no la necesitas."],
  ["ram", "Cuántas cosas puedes tener abiertas a la vez sin que se ponga lento."],
  ["almacenamiento", "Cuánto cabe y qué tan rápido abre. NVMe es el rápido."],
  ["pantalla", "Donde miras ocho horas. Se nota más que el procesador."],
  ["so", "Qué programas vas a poder instalar, y cómo se conecta al dominio de una empresa."],
  ["conectividad", "Si vas a poder enchufar el proyector, la red por cable y el monitor."],
  ["seguridad", "Huella, TPM y obturador: lo que pide el área de TI de una empresa."],
  ["bateria", "Autonomía declarada por el fabricante en uso liviano. En uso real, cuenta bastante menos."],
  ["peso", "El dato que más se siente y el que nadie mira hasta el segundo mes."]
];

export const PERFILES: Array<{ nombre: string; uso: string; pide: string }> = [
  { nombre: "Oficina y teletrabajo", uso: "trabajar", pide: "16 GB, SSD de 512 GB, Windows 11 Pro y menos de 1,6 kg." },
  { nombre: "Universidad", uso: "estudiar", pide: "SSD siempre, 16 GB si tu carrera usa software, y batería de verdad." },
  { nombre: "Empresa", uso: "empresa", pide: "Un solo modelo por perfil, gama corporativa y factura." },
  { nombre: "Juego y edición", uso: "jugar", pide: "Gráfica dedicada, 144 Hz y asumir el peso." }
];

export const ERRORES: Array<[string, string]> = [
  ["Comprar por el procesador", "El procesador casi nunca es el cuello de botella en un equipo de oficina. La memoria y el disco, sí."],
  ["Ahorrar en memoria", "Es lo que hace que un equipo se sienta viejo al segundo año, y en muchos modelos ya no se puede ampliar."],
  ["Pagar una gráfica que no usas", "Te cuesta dinero, batería y casi un kilo. Si no renderizas ni juegas, no la necesitas."],
  ["No preguntar la condición", "Nuevo, openbox, reacondicionado y seminuevo no son lo mismo ni valen lo mismo. Si no está escrito, pregúntalo antes de pagar."]
];

export const ANTES_DE_PAGAR = [
  "Que la condición esté escrita.",
  "Cuánta garantía lleva y quién la gestiona.",
  "Si el precio incluye IVA y si dan factura.",
  "Que el stock sea real y el plazo de despacho esté dicho antes de cobrarte.",
  "Si la memoria se puede ampliar después, y hasta cuánto."
];
