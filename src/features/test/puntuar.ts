/**
 * La puntuación del test de 60 segundos, a solas y probada.
 *
 * Puntúa lo que se sabe y nada más: un producto sin precio de referencia no
 * suma ni resta por presupuesto, porque no se sabe cuánto cuesta.
 */
import type { Producto } from "../../services/tipos.js";

export interface Puntuado {
  producto: Producto;
  puntos: number;
  motivos: string[];
}

/** La misma puntuación de siempre, escrita una vez y probada. */
export function puntuar(productos: Producto[], uso: string, rango: string, valor: string): Puntuado[] {
  const [desde = 0, hasta = 0] = rango.split("-").map(Number);

  return productos
    .map((producto): Puntuado => {
      const referencia = producto.referencia.valor;
      let puntos = 0;
      const motivos: string[] = [];

      if (producto.usos.includes(uso)) {
        puntos += 4;
        motivos.push("está pensado para eso");
      }
      if (referencia) {
        if (referencia >= desde && referencia <= hasta) {
          puntos += 3;
          motivos.push("entra en tu presupuesto");
        } else if (referencia < desde) {
          puntos += 1;
          motivos.push("cuesta menos de lo que pensabas gastar");
        } else {
          puntos -= 2;
        }
      }
      if (producto.valores.includes(valor)) {
        puntos += 2;
        motivos.push("es fuerte justo en lo que valoras");
      }
      if (producto.confianza === "ALTA") puntos += 0.5;

      return { producto, puntos, motivos };
    })
    .filter((x) => x.puntos > 3)
    .sort((a, b) => b.puntos - a.puntos)
    .slice(0, 3);
}

