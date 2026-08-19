import React from "react";
import { signInWithGoogle } from "../lib/supabaseClient";

// A diferencia de los gates de "bloqueo" (DeletionPendingGate,
// BanApelacionGate), este es un gate de INVITACIÓN — se muestra sin
// sesión al entrar a Cognoscere, no tapa nada por error o sanción, solo
// invita a sumarse. Mismo signInWithGoogle() que usa el resto del sitio.
export default function CognoscereGate() {
  return (
    <div className="max-w-md mx-auto px-5 pt-20 pb-24 text-center">
      <p className="text-[#b8afc4] text-[15px] leading-relaxed mb-8 italic" style={{ fontFamily: "Lora, serif" }}>
        Para rasgar el letargo y rescatar nuevas verdades,
        <br />
        el recolector no debe habitar las sombras. Inicia sesión,
        <br />
        revela tu identidad y comparte tu conocimiento con la comunidad de Shinwa.
      </p>

      <button
        onClick={signInWithGoogle}
        className="inline-flex items-center gap-2 px-6 py-3 rounded-sm border border-[#B08D57] text-[#e8c9a3] hover:bg-[#B08D57]/10 transition-colors text-sm tracking-wide"
        style={{ fontFamily: "Fraunces, serif", fontWeight: 600 }}
      >
        Dejar las Sombras
      </button>
      <p className="text-[#7d7389] text-xs mt-3" style={{ fontFamily: "Lora, serif" }}>
        Continuar con Google...
      </p>
    </div>
  );
}