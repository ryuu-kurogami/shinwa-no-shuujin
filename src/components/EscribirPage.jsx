import React from "react";
import { Feather, Plus } from "lucide-react";

// Nota: "continuar borradores" queda pendiente hasta implementar la columna
// `estado` (borrador/pendiente_revision/publicado) en stories — ver
// documentación del proyecto, sección 3 y 6. Por ahora esta vista solo
// dispara la publicación directa, igual que el botón que ya existía.
export default function EscribirPage({ onNewStory }) {
  return (
    <div className="max-w-3xl mx-auto px-5 pt-10 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <Feather size={18} className="text-[#7C8B63]" />
        <h1 className="text-[#EDE6D6] text-2xl" style={{ fontFamily: "Fraunces, serif", fontWeight: 700 }}>
          Escribir
        </h1>
      </div>

      <button
        onClick={onNewStory}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-sm border border-[#B08D57] text-[#e8c9a3] hover:bg-[#B08D57]/10 transition-colors text-sm tracking-wide"
        style={{ fontFamily: "Lora, serif" }}
      >
        <Plus size={16} /> Nueva crónica
      </button>

      <p className="text-[#7d7389] text-sm italic mt-6" style={{ fontFamily: "Lora, serif" }}>
        Los borradores para continuar más tarde van a aparecer acá cuando esté
        listo el sistema de guardado sin publicar.
      </p>
    </div>
  );
}
