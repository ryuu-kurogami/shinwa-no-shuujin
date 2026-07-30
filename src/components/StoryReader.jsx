import React, { useEffect } from "react";
import { X, Trash2, Pencil } from "lucide-react";
import { StorySeal } from "./StoryCard";
import CommentThread from "./CommentThread";
import { supabase, ADMIN_EMAILS } from "../lib/supabaseClient";

export default function StoryReader({ story, user, onClose, onDeleted, onEdit }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const isAdmin = user && ADMIN_EMAILS.includes((user.email || "").toLowerCase());
  const isAuthor = user && user.id === story.author_id;
  // Editar: solo el autor. Borrar: el autor o el admin (moderación de contenido dañino).
  const canEdit = isAuthor;
  const canDelete = isAdmin || isAuthor;

  const remove = async () => {
    if (!window.confirm("¿Borrar esta historia? No se puede deshacer.")) return;
    await supabase.from("stories").delete().eq("id", story.id);
    onDeleted(story.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0e0b13]/90 backdrop-blur-sm overflow-y-auto">
      <div className="max-w-2xl mx-auto px-5 py-10 sm:py-16">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 text-[#B08D57] hover:text-[#e8c9a3] transition-colors text-sm"
            style={{ fontFamily: "Lora, serif" }}
          >
            <X size={16} /> Cerrar
          </button>
          <div className="flex items-center gap-4">
            {canEdit && (
              <button
                onClick={() => onEdit(story)}
                className="flex items-center gap-1.5 text-[#7C8B63] hover:text-[#9db07d] transition-colors text-sm"
                style={{ fontFamily: "Lora, serif" }}
              >
                <Pencil size={14} /> Editar
              </button>
            )}
            {canDelete && (
              <button
                onClick={remove}
                className="flex items-center gap-1.5 text-[#7d7389] hover:text-[#e08a8a] transition-colors text-sm"
                style={{ fontFamily: "Lora, serif" }}
              >
                <Trash2 size={14} /> Borrar
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 mb-3">
          <StorySeal span={story.span} />
          <span className="text-[#7C8B63] text-xs tracking-[0.15em] uppercase" style={{ fontFamily: "Lora, serif" }}>
            Tiempo abarcado en el sueño
          </span>
        </div>

        <h1 className="text-[#EDE6D6] text-3xl sm:text-4xl leading-tight mb-2" style={{ fontFamily: "Fraunces, serif", fontWeight: 700 }}>
          {story.title}
        </h1>
        <p className="text-[#7d7389] text-sm mb-8" style={{ fontFamily: "Lora, serif" }}>
          por {story.author_name}
        </p>

        <div className="text-[#d8d1e0] text-[17px] leading-[1.85] whitespace-pre-line" style={{ fontFamily: "Lora, serif" }}>
          {story.content}
        </div>

        <CommentThread storyId={story.id} storyAuthorId={story.author_id} user={user} />
      </div>
    </div>
  );
}
