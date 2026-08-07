// Utilidades de texto compartidas entre el lector (tiempo estimado) y los
// editores de capítulo (contador en vivo mientras se escribe).

export function contarPalabras(texto) {
  if (!texto) return 0;
  return texto.trim().split(/\s+/).filter(Boolean).length;
}

export function contarCaracteres(texto) {
  return texto ? texto.length : 0;
}

// ~200 palabras por minuto es el promedio habitual para lectura en español.
const PALABRAS_POR_MINUTO = 200;

export function tiempoLecturaMinutos(texto) {
  const palabras = contarPalabras(texto);
  if (palabras === 0) return 0;
  return Math.max(1, Math.round(palabras / PALABRAS_POR_MINUTO));
}