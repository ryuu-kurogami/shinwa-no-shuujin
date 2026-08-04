import React from "react";
import { ShieldAlert } from "lucide-react";

const STORAGE_KEY = "shinwa_edad18_confirmada";

// Confirmación de edad ya dada en este navegador (ver Términos, Sección 4.2).
// No es verificación real de edad — es una declaración bajo responsabilidad
// del usuario, tal como aclara el propio documento legal.
export function edad18YaConfirmada() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function confirmarEdad18() {
  try {
    localStorage.setItem(STORAGE_KEY, "true");
  } catch {
    // localStorage no disponible (modo privado, etc.) — la confirmación
    // simplemente no persiste entre sesiones, no es un error crítico.
  }
}

export default function AgeGate({ onConfirm, onDecline }) {
  return (
    <div className="fixed inset-0 z-[60] bg-[#0e0b13]/95 backdrop-blur-sm flex items-center justify-center px-5">
      <div className="max-w-md w-full border border-[#4a3f52] rounded-sm bg-[#17131C] p-7">
        <div className="flex items-center gap-2.5 mb-4 text-[#7A2E2E]">
          <ShieldAlert size={22} />
          <h2 className="text-[#EDE6D6] text-xl" style={{ fontFamily: "Fraunces, serif", fontWeight: 700 }}>
            Contenido para mayores de edad
          </h2>
        </div>

        <p className="text-[#b8afc4] text-sm leading-relaxed mb-3" style={{ fontFamily: "Lora, serif" }}>
          La historia que intentás abrir pertenece a la sección +18 del Sitio y puede incluir lenguaje
          explícito, contenido sexual entre personajes adultos, violencia intensa u otras temáticas maduras.
        </p>

        <p className="text-[#b8afc4] text-sm leading-relaxed mb-6" style={{ fontFamily: "Lora, serif" }}>
          Al continuar, declarás bajo tu exclusiva responsabilidad contar con la mayoría de edad legal en tu
          país de residencia, tal como establece la Sección 4.2 de los{" "}
          <a href="/terminos" target="_blank" rel="noreferrer" className="text-[#B08D57] hover:text-[#e8c9a3] underline">
            Términos y Condiciones
          </a>
          .
        </p>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onDecline}
            className="flex-1 py-2.5 rounded-sm border border-[#4a3f52] text-[#b8afc4] hover:text-[#e8c9a3] hover:border-[#B08D57] transition-colors text-sm"
            style={{ fontFamily: "Lora, serif" }}
          >
            Volver
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-sm bg-[#7A2E2E] hover:bg-[#8f3838] text-[#EDE6D6] font-medium tracking-wide transition-colors text-sm"
            style={{ fontFamily: "Lora, serif" }}
          >
            Soy mayor de 18 años
          </button>
        </div>
      </div>
    </div>
  );
}
