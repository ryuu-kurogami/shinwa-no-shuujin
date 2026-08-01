import React from "react";
import { Feather, Plus, Pencil } from "lucide-react";
import { StorySeal } from "./StoryCard";

export default function EscribirPage({ user, stories, onNewStory, onEdit }) {
  const borradores = (stories || []).filter(
    (s) => s.author_id === user.id && s.estado === "borrador"
  );

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
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-sm border border-[#B08D57] text-[#e8c9a3] hover:bg-[#B08D57]/10 transition-colors text-sm tracking-wide mb-10"
        style={{ fontFamily: "Lora, serif" }}
      >
        <Plus size={16} /> Nueva crónica
      </button>

      <div className="flex items-center gap-3 mb-5">
        <h2 className="text-[#7C8B63] text-xs tracking-[0.2em] uppercase" style={{ fontFamily: "Lora, serif" }}>
          Borradores ({borradores.length})
        </h2>
        <div className="flex-1 h-px bg-[#4a3f52]" />
      </div>

      {borradores.length === 0 ? (
        <p className="text-[#7d7389] italic" style={{ fontFamily: "Lora, serif" }}>
          No tenés borradores sin terminar.
        </p>
      ) : (
        <div className="space-y-4">
          {borradores.map((s) => (
            <button
              key={s.id}
              onClick={() => onEdit(s)}
              className="w-full text-left rounded-sm border border-[#4a3f52] bg-[#1d1824]/80 hover:bg-[#241d2c] transition-colors p-5 flex gap-4 items-start"
            >
              <StorySeal fraseIconica={s.frase_iconica || s.span} portadaUrl={s.portada_url} />
              <div className="min-w-0 flex-1">
                <h3 className="text-[#EDE6D6] text-lg leading-snug mb-1" style={{ fontFamily: "Fraunces, serif", fontWeight: 600 }}>
                  {s.title || "Sin título"}
                </h3>
                <p className="text-[#b8afc4] text-sm leading-relaxed line-clamp-2 mb-2" style={{ fontFamily: "Lora, serif" }}>
                  {s.excerpt || "Sin contenido todavía..."}
                </p>
                <span className="flex items-center gap-1.5 text-[#7C8B63] text-xs" style={{ fontFamily: "Lora, serif" }}>
                  <Pencil size={11} /> Continuar escribiendo
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}