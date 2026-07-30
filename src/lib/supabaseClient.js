import { createClient } from "@supabase/supabase-js";

// Estas dos son las claves PÚBLICAS de Supabase — son seguras para el navegador,
// no confundir con la "service_role key" (esa NUNCA va en el frontend).
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en tu archivo .env — revisá el README."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Email(s) con permisos de administrador (puede borrar cualquier historia/comentario).
// Reemplazá esto por tu propio email de Google.
export const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export async function signInWithGoogle() {
  await supabase.auth.signInWithOAuth({ provider: "google" });
}
