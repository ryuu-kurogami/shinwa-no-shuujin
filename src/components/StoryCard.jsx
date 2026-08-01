import React from "react";
import { Clock } from "lucide-react";

export function StorySeal({ span, portadaUrl }) {
  // Si hay portada, la mostramos rellenando el sello circular en vez del
  // ícono de reloj — el mismo espacio, ahora con la imagen del autor.
  if (portadaUrl) {
    return (
      <div
        className="relative shrink-0 grid place-items-center w-16 h-16 rounded-full overflow-hidden"
        style={{
          boxShadow:
            "inset 0 2px 4px rgba(255,255,255,0.15), inset 0 -3px 6px rgba(0,0,0,0.5), 0 2px 4px rgba(0,0,0,0.4)",
        }}
      >
        <img
          src={portadaUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Degradado oscuro abajo para que el texto del sello siga siendo legible */}
        <div className="absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-black/80 to-transparent" />
        <div className="absolute inset-1 rounded-full border border-[#e8d7b8]/30" />
        <span
          className="absolute bottom-1.5 text-[7.5px] tracking-wide text-[#f1e2c4] font-semibold text-center px-1 leading-tight"
          style={{ fontFamily: "Lora, serif" }}
        >
          {span}
        </span>
      </div>
    );
  }

  return (
    <div
      className="relative shrink-0 grid place-items-center w-16 h-16 rounded-full"
      style={{
        background: "radial-gradient(circle at 35% 30%, #9c6a3d, #7a4f2a 60%, #5c3a1f 100%)",
        boxShadow:
          "inset 0 2px 4px rgba(255,255,255,0.25), inset 0 -3px 6px rgba(0,0,0,0.45), 0 2px 4px rgba(0,0,0,0.4)",
      }}
    >
      <div className="absolute inset-1 rounded-full border border-[#e8d7b8]/30" />
      <Clock size={14} className="text-[#f1e2c4] mb-0.5" strokeWidth={1.75} />
      <span
        className="absolute bottom-1.5 text-[7.5px] tracking-wide text-[#f1e2c4] font-semibold text-center px-1 leading-tight"
        style={{ fontFamily: "Lora, serif" }}
      >
        {span}
      </span>
    </div>
  );
}

export default function StoryCard({ story, onOpen }) {
  return (
    <button
      onClick={() => onOpen(story)}
      className="group text-left w-full rounded-sm border border-[#4a3f52] bg-[#1d1824]/80 hover:bg-[#241d2c] transition-colors duration-300 p-5 flex gap-4 items-start relative overflow-hidden"
      style={{
        clipPath:
          "polygon(0 6px, 6px 0, calc(100% - 6px) 0, 100% 6px, 100% calc(100% - 6px), calc(100% - 6px) 100%, 6px 100%, 0 calc(100% - 6px))",
      }}
    >
      <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-[#7a2e2e]/0 via-[#7a2e2e] to-[#7a2e2e]/0 opacity-60 group-hover:opacity-100 transition-opacity" />
      <StorySeal span={story.span} portadaUrl={story.portada_url} />
      <div className="min-w-0 flex-1">
        <h3
          className="text-[#EDE6D6] text-xl leading-snug mb-1.5 group-hover:text-[#e8c9a3] transition-colors"
          style={{ fontFamily: "Fraunces, serif", fontWeight: 600 }}
        >
          {story.title}
        </h3>
        <p className="text-[#b8afc4] text-[14.5px] leading-relaxed line-clamp-2" style={{ fontFamily: "Lora, serif" }}>
          {story.excerpt}
        </p>
        <p className="text-[#7d7389] text-xs mt-2" style={{ fontFamily: "Lora, serif" }}>
          por {story.author_name}
        </p>
      </div>
    </button>
  );
}