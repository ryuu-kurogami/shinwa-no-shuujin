import React, { useState } from "react";
import { Hourglass } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

// Se muestra cuando hay sesión y profiles.eliminar_en tiene una fecha
// futura — la cuenta está en el período de gracia de 60 días (Términos,
// Sección 9.4). Bloquea todo lo demás hasta que la persona elija.
export default function DeletionPendingGate({ userId, eliminarEn, onCancelado }) {
  const [procesando, setProcesando] = useState(false);
  const fecha = new Date(eliminarEn).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const cancelarBorrado = async () => {
    setProcesando(true);
    const { error } = await supabase.from("profiles").update({ eliminar_en: null }).eq("id", userId);
    setProcesando(false);
    if (!error) onCancelado();
  };

  const seguirConElBorrado = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#17131C] flex items-center justify-center px-6">
      <div className="max-w-sm w-full text-center">
        <Hourglass size={22} className="text-[#B08D57] mx-auto mb-5" />
        <h2 className="text-[#EDE6D6] text-2xl mb-3" style={{ fontFamily: "Fraunces, serif", fontWeight: 700 }}>
          Tu cuenta está programada para eliminarse
        </h2>
        <p className="text-[#b8afc4] text-sm leading-relaxed mb-7" style={{ fontFamily: "Lora, serif" }}>
          El {fecha} se van a borrar definitivamente tus historias y tus datos personales, tal como pediste.
          Si te arrepentiste, todavía estás a tiempo de recuperar tu cuenta.
        </p>

        <button
          onClick={cancelarBorrado}
          disabled={procesando}
          className="w-full py-3 rounded-sm bg-[#7A2E2E] hover:bg-[#8f3838] disabled:opacity-40 transition-colors text-sm text-[#EDE6D6] mb-3"
          style={{ fontFamily: "Fraunces, serif" }}
        >
          {procesando ? "..." : "Cancelar el borrado y recuperar mi cuenta"}
        </button>
        <button
          onClick={seguirConElBorrado}
          className="text-[#7d7389] hover:text-[#b8afc4] transition-colors text-sm"
          style={{ fontFamily: "Lora, serif" }}
        >
          Mantener el borrado programado
        </button>
      </div>
    </div>
  );
}