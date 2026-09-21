export const REGIONES = [
  "Arica y Parinacota", "Tarapacá", "Antofagasta", "Atacama", "Coquimbo",
  "Valparaíso", "Metropolitana de Santiago", "Libertador General Bernardo O'Higgins",
  "Maule", "Ñuble", "Biobío", "La Araucanía", "Los Ríos", "Los Lagos",
  "Aysén del General Carlos Ibáñez del Campo", "Magallanes y de la Antártica Chilena"
] as const;

/** Módulo 11. El servidor lo vuelve a comprobar: esto es solo para avisar antes. */
export function rutValido(rut: string): boolean {
  const limpio = rut.replace(/[.\s]/g, "").toUpperCase();
  const partes = limpio.match(/^(\d{7,8})-([\dK])$/);
  if (!partes) return false;

  const cuerpo = partes[1] as string;
  let suma = 0;
  let factor = 2;
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += Number(cuerpo[i]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const resto = 11 - (suma % 11);
  const esperado = resto === 11 ? "0" : resto === 10 ? "K" : String(resto);
  return partes[2] === esperado;
}
