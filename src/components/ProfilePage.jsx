import React from "react";
import { ArrowLeft, Pencil, Trash2, ScrollText } from "lucide-react";
import { StorySeal } from "./StoryCard";
import { supabase } from "../lib/supabaseClient";

const CATEGORIA_LABEL = { corto: "Corto", novela: "Novela", fanfic: "Fanfic" };

export default function ProfilePage({ user, stories, onBack, onEdit, onDeleted, onOpen }) {
  const misHistorias = (stories || []).filter((s) => s.author_id === user.id);

  const remove = async (story) => {
    if (!window.confirm(`¿Borrar "${story.title}"? No se puede deshacer.`)) return;
    await supabase.from("stories").delete().eq("id", story.id);
    onDeleted(story.id);
  };

  return (
    <div className="max-w-3xl mx-auto px-5 pt-10 sm:pt-14 pb-24">
      <button
        onClick={onBack}
        className="mb-8 flex items-center gap-1.5 text-[#B08D57] hover:text-[#e8c9a3] transition-colors text-sm"
        style={{ fontFamily: "Lora, serif" }}
      >
        <ArrowLeft size={16} /> Volver al archivo
      </button>

      <h1
        className="text-[#EDE6D6] text-3xl sm:text-4xl leading-tight mb-1"
        style={{ fontFamily: "Fraunces, serif", fontWeight: 700 }}
      >
        Tu perfil
      </h1>
      <p className="text-[#7d7389] text-sm mb-8" style={{ fontFamily: "Lora, serif" }}>
        {user.user_metadata?.full_name || user.email}
      </p>

      <div className="flex items-center gap-3 mb-5">
        <ScrollText size={16} className="text-[#7C8B63]" />
        <h2 className="text-[#7C8B63] text-xs tracking-[0.2em] uppercase" style={{ fontFamily: "Lora, serif" }}>
          Tus crónicas ({misHistorias.length})
        </h2>
        <div className="flex-1 h-px bg-[#4a3f52]" />
      </div>

      {misHistorias.length === 0 ? (
        <p className="text-[#7d7389] italic" style={{ fontFamily: "Lora, serif" }}>
          Todavía no publicaste ninguna crónica.
        </p>
      ) : (
        <div className="space-y-4">
          {misHistorias.map((s) => (
            <div
              key={s.id}
              className="rounded-sm border border-[#4a3f52] bg-[#1d1824]/80 p-5 flex gap-4 items-start"
            >
              <button onClick={() => onOpen(s)} className="shrink-0">
                <StorySeal fraseIconica={s.frase_iconica || s.span} portadaUrl={s.portada_url} />
              </button>

              <div className="min-w-0 flex-1">
                <button onClick={() => onOpen(s)} className="text-left w-full">
                  <h3
                    className="text-[#EDE6D6] text-lg leading-snug mb-1 hover:text-[#e8c9a3] transition-colors"
                    style={{ fontFamily: "Fraunces, serif", fontWeight: 600 }}
                  >
                    {s.title}
                  </h3>
                </button>
                <div className="flex items-center gap-2 text-xs text-[#7d7389] mb-3" style={{ fontFamily: "Lora, serif" }}>
                  <span className="uppercase tracking-wide text-[#7C8B63]">
                    {CATEGORIA_LABEL[s.categoria] || "Corto"}
                  </span>
                  <span>·</span>
                  <span>{s.lecturas ?? 0} lecturas</span>
                  <span>·</span>
                  <span>{new Date(s.created_at).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}</span>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => onEdit(s)}
                    className="flex items-center gap-1.5 text-[#7C8B63] hover:text-[#9db07d] transition-colors text-sm"
                    style={{ fontFamily: "Lora, serif" }}
                  >
                    <Pencil size={13} /> Editar
                  </button>
                  <button
                    onClick={() => remove(s)}
                    className="flex items-center gap-1.5 text-[#7d7389] hover:text-[#e08a8a] transition-colors text-sm"
                    style={{ fontFamily: "Lora, serif" }}
                  >
                    <Trash2 size={13} /> Borrar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
