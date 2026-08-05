import React, { useEffect, useState, useCallback } from "react";
import { Feather, Plus, Pencil, BookPlus, ScrollText } from "lucide-react";
import { StorySeal } from "./StoryCard";
import { supabase } from "../lib/supabaseClient";
import PublicarCapituloModal from "./PublicarCapituloModal";

const ESTADO_PUBLICACION_LABEL = {
  en_emision: "En emisión",
  en_pausa: "En pausa",
  finalizado: "Finalizado",
};

export default function EscribirPage({ user, stories, onNewStory, onEdit }) {
  const misObras = (stories || []).filter((s) => s.author_id === user.id);
  const borradores = misObras.filter((s) => s.estado === "borrador");
  const obrasEnMarcha = misObras.filter((s) => s.estado !== "borrador");

  const [misCapitulos, setMisCapitulos] = useState(null);
  const [modalCapitulo, setModalCapitulo] = useState(null); // { story, editingCapitulo? }

  const cargarCapitulos = useCallback(async () => {
    const idsObras = misObras.map((s) => s.id);
    if (idsObras.length === 0) {
      setMisCapitulos([]);
      return;
    }
    const { data } = await supabase.from("capitulos").select("*").in("story_id", idsObras).order("numero");
    setMisCapitulos(data || []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stories, user.id]);

  useEffect(() => {
    cargarCapitulos();
  }, [cargarCapitulos]);

  const capitulosDe = (storyId) => (misCapitulos || []).filter((c) => c.story_id === storyId);

  const capitulosSinTerminar = (misCapitulos || []).filter((c) => c.numero > 1 && c.estado === "borrador");

  const abrirNuevoCapitulo = (story) => {
    const numeros = capitulosDe(story.id).map((c) => c.numero);
    const siguienteNumero = numeros.length > 0 ? Math.max(...numeros) + 1 : 2;
    setModalCapitulo({ story, siguienteNumero });
  };

  const abrirEditarCapitulo = (story, capitulo) => {
    setModalCapitulo({ story, editingCapitulo: capitulo });
  };

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

      {/* ---------- Tus obras ---------- */}
      <div className="flex items-center gap-3 mb-5">
        <ScrollText size={16} className="text-[#7C8B63]" />
        <h2 className="text-[#7C8B63] text-xs tracking-[0.2em] uppercase" style={{ fontFamily: "Lora, serif" }}>
          Tus obras ({obrasEnMarcha.length})
        </h2>
        <div className="flex-1 h-px bg-[#4a3f52]" />
      </div>

      {obrasEnMarcha.length === 0 ? (
        <p className="text-[#7d7389] italic mb-10" style={{ fontFamily: "Lora, serif" }}>
          Todavía no tenés ninguna obra publicada.
        </p>
      ) : (
        <div className="space-y-3 mb-10">
          {obrasEnMarcha.map((s) => {
            const caps = capitulosDe(s.id);
            return (
              <div
                key={s.id}
                className="rounded-sm border border-[#4a3f52] bg-[#1d1824]/80 p-4 flex gap-4 items-center"
              >
                <StorySeal fraseIconica={s.frase_iconica || s.span} portadaUrl={s.portada_url} />
                <div className="min-w-0 flex-1">
                  <h3 className="text-[#EDE6D6] text-base leading-snug mb-1" style={{ fontFamily: "Fraunces, serif", fontWeight: 600 }}>
                    {s.title}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-[#7d7389]" style={{ fontFamily: "Lora, serif" }}>
                    <span>{misCapitulos === null ? "…" : `${caps.length} capítulo${caps.length !== 1 ? "s" : ""}`}</span>
                    <span>·</span>
                    <span>{ESTADO_PUBLICACION_LABEL[s.estado_publicacion] || "En emisión"}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <button
                    onClick={() => onEdit(s)}
                    className="flex items-center gap-1.5 text-[#7d7389] hover:text-[#b8afc4] transition-colors text-xs"
                    style={{ fontFamily: "Lora, serif" }}
                  >
                    <Pencil size={12} /> Datos
                  </button>
                  <button
                    onClick={() => abrirNuevoCapitulo(s)}
                    className="flex items-center gap-1.5 text-[#7C8B63] hover:text-[#9db07d] transition-colors text-xs"
                    style={{ fontFamily: "Lora, serif" }}
                  >
                    <BookPlus size={12} /> Agregar capítulo
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ---------- Capítulos sin terminar (2do en adelante) ---------- */}
      {capitulosSinTerminar.length > 0 && (
        <>
          <div className="flex items-center gap-3 mb-5">
            <h2 className="text-[#7C8B63] text-xs tracking-[0.2em] uppercase" style={{ fontFamily: "Lora, serif" }}>
              Capítulos sin terminar ({capitulosSinTerminar.length})
            </h2>
            <div className="flex-1 h-px bg-[#4a3f52]" />
          </div>
          <div className="space-y-3 mb-10">
            {capitulosSinTerminar.map((c) => {
              const obra = misObras.find((s) => s.id === c.story_id);
              if (!obra) return null;
              return (
                <button
                  key={c.id}
                  onClick={() => abrirEditarCapitulo(obra, c)}
                  className="w-full text-left rounded-sm border border-[#4a3f52] bg-[#1d1824]/80 hover:bg-[#241d2c] transition-colors p-4"
                >
                  <p className="text-[#EDE6D6] text-sm" style={{ fontFamily: "Lora, serif" }}>
                    <strong>{obra.title}</strong> — capítulo {c.numero}
                    {c.titulo ? `: ${c.titulo}` : ""}
                  </p>
                  <span className="flex items-center gap-1.5 text-[#7C8B63] text-xs mt-1" style={{ fontFamily: "Lora, serif" }}>
                    <Pencil size={11} /> Continuar escribiendo
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* ---------- Borradores (obras cuyo capítulo 1 nunca se publicó) ---------- */}
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

      {modalCapitulo && (
        <PublicarCapituloModal
          story={modalCapitulo.story}
          editingCapitulo={modalCapitulo.editingCapitulo}
          siguienteNumero={modalCapitulo.siguienteNumero}
          onClose={() => setModalCapitulo(null)}
          onSaved={() => cargarCapitulos()}
        />
      )}
    </div>
  );
}