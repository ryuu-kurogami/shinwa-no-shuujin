import React, { useEffect, useState } from "react";
import { X, Trash2, Pencil, UserPlus, UserCheck, Eye } from "lucide-react";
import { StorySeal } from "./StoryCard";
import CommentThread from "./CommentThread";
import { supabase, ADMIN_EMAILS, signInWithGoogle } from "../lib/supabaseClient";

export default function StoryReader({ story, user, onClose, onDeleted, onEdit, onViewAuthor }) {
  const [siguiendo, setSiguiendo] = useState(false);
  const [contadorSeguidores, setContadorSeguidores] = useState(null);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Cuenta la lectura una sola vez al abrir esta historia
  useEffect(() => {
    supabase.rpc("increment_lecturas", { p_story_id: story.id }).then(({ error }) => {
      if (error) console.error("Error al contar lectura:", error.message);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story.id]);

  // Estado de "seguir" al autor de esta historia
  useEffect(() => {
    let active = true;

    supabase
      .from("seguidores")
      .select("seguidor_id", { count: "exact" })
      .eq("seguido_id", story.author_id)
      .then(({ data }) => {
        if (active) setContadorSeguidores(data?.length ?? 0);
      });

    if (user) {
      supabase
        .from("seguidores")
        .select("seguido_id")
        .eq("seguidor_id", user.id)
        .eq("seguido_id", story.author_id)
        .maybeSingle()
        .then(({ data }) => {
          if (active) setSiguiendo(Boolean(data));
        });
    } else {
      setSiguiendo(false);
    }

    return () => {
      active = false;
    };
  }, [user, story.author_id]);

  const toggleSeguir = async () => {
    if (!user) {
      signInWithGoogle();
      return;
    }
    if (siguiendo) {
      await supabase.from("seguidores").delete().eq("seguidor_id", user.id).eq("seguido_id", story.author_id);
      setSiguiendo(false);
      setContadorSeguidores((c) => Math.max(0, (c ?? 1) - 1));
    } else {
      await supabase.from("seguidores").insert({ seguidor_id: user.id, seguido_id: story.author_id });
      setSiguiendo(true);
      setContadorSeguidores((c) => (c ?? 0) + 1);
    }
  };

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
          <StorySeal fraseIconica={story.frase_iconica || story.span} portadaUrl={story.portada_url} />
          <span className="text-[#7C8B63] text-xs tracking-[0.15em] uppercase" style={{ fontFamily: "Lora, serif" }}>
            La marca del relato
          </span>
        </div>

        <h1 className="text-[#EDE6D6] text-3xl sm:text-4xl leading-tight mb-2" style={{ fontFamily: "Fraunces, serif", fontWeight: 700 }}>
          {story.title}
        </h1>
        <div className="flex items-center gap-3 mb-8 flex-wrap">
          <p className="text-[#7d7389] text-sm" style={{ fontFamily: "Lora, serif" }}>
            por{" "}
            {onViewAuthor ? (
              <span
                onClick={() => onViewAuthor(story.author_id)}
                className="hover:text-[#b8afc4] hover:underline transition-colors cursor-pointer"
              >
                {story.author_name}
              </span>
            ) : (
              story.author_name
            )}
            {contadorSeguidores !== null && (
              <span className="text-[#7d7389]/70"> · {contadorSeguidores} {contadorSeguidores === 1 ? "seguidor" : "seguidores"}</span>
            )}
            <span className="text-[#7d7389]/70 inline-flex items-center gap-1 ml-1">
              · <Eye size={12} className="inline" /> {story.lecturas || 0}
            </span>
          </p>
          {user?.id !== story.author_id && (
            <button
              onClick={toggleSeguir}
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-sm border transition-colors ${
                siguiendo
                  ? "border-[#7C8B63] text-[#c3d1a8] bg-[#7C8B63]/10"
                  : "border-[#4a3f52] text-[#7d7389] hover:text-[#b8afc4] hover:border-[#B08D57]"
              }`}
              style={{ fontFamily: "Lora, serif" }}
            >
              {siguiendo ? <UserCheck size={12} /> : <UserPlus size={12} />}
              {siguiendo ? "Siguiendo" : "Seguir"}
            </button>
          )}
        </div>

        <div className="text-[#d8d1e0] text-[17px] leading-[1.85] whitespace-pre-line" style={{ fontFamily: "Lora, serif" }}>
          {story.content}
        </div>

        <CommentThread storyId={story.id} storyAuthorId={story.author_id} user={user} />
      </div>
    </div>
  );
}