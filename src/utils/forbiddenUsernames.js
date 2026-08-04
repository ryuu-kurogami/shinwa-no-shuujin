// Validación de username en el cliente — es solo para UX rápida (mensaje
// instantáneo sin esperar el viaje al servidor). La autoridad real vive en
// el trigger de Postgres `validar_username_reservado`, que corre siempre,
// incluso si alguien llama directo a la API sin pasar por este archivo.

const RESERVADOS = [
  "admin",
  "administrador",
  "moderador",
  "moderacion",
  "shinwanoshuujin",
  "shinwa",
  "archaium",
  "soporte",
  "anonimo",
];

// Lista de arranque — misma que el trigger de la base. Si se amplía acá,
// ampliar también allá para que los dos lados coincidan.
const PROHIBIDAS = [
  "puta",
  "pendejo",
  "verga",
  "mierda",
  "pelotudo",
  "forro",
  "cabron",
  "concha",
  "pija",
];

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;

// Mismo criterio que translate() + unaccent() en SQL: minúsculas, sin
// acentos, leetspeak básico, y solo letras a-z al final.
export function normalizarUsername(input) {
  const sinAcentos = input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const leetspeak = { 0: "o", 1: "i", 3: "e", 4: "a", 5: "s", 7: "t", "@": "a", $: "s" };
  const conLeetspeakResuelto = sinAcentos
    .toLowerCase()
    .split("")
    .map((c) => leetspeak[c] ?? c)
    .join("");

  return conLeetspeakResuelto.replace(/[^a-z]/g, "");
}

export function validarUsername(raw) {
  const limpio = raw.trim();

  if (!USERNAME_REGEX.test(limpio)) {
    return { valid: false, error: "Entre 3 y 20 caracteres: letras, números y guion bajo, sin espacios." };
  }

  const normalizado = normalizarUsername(limpio);

  if (RESERVADOS.includes(normalizado)) {
    return { valid: false, error: "Ese nombre de usuario no está disponible." };
  }

  if (PROHIBIDAS.some((palabra) => normalizado.includes(palabra))) {
    return { valid: false, error: "Ese nombre de usuario contiene lenguaje no permitido." };
  }

  return { valid: true };
}