import React from "react";
import { Bookmark } from "lucide-react";
import StoryCard from "./StoryCard";

export default function BibliotecaPage({ stories, savedIds, onOpen, onToggleSave, likedIds, likesCountMap, onToggleLike }) {
  const guardadas = (stories || []).filter((s) => savedIds.has(s.id));

  return (
    <div className="max-w-3xl mx-auto px-5 pt-10 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <Bookmark size={18} className="text-[#B08D57]" />
        <h1 className="text-[#EDE6D6] text-2xl" style={{ fontFamily: "Fraunces, serif", fontWeight: 700 }}>
          Biblioteca
        </h1>
      </div>

      {guardadas.length === 0 ? (
        <p className="text-[#7d7389] italic" style={{ fontFamily: "Lora, serif" }}>
          Todavía no guardaste ninguna crónica. Tocá el marcador en cualquier historia para agregarla acá.
        </p>
      ) : (
        <div className="space-y-4">
          {guardadas.map((s) => (
            <StoryCard
              key={s.id}
              story={s}
              onOpen={onOpen}
              isSaved={true}
              onToggleSave={onToggleSave}
              isLiked={likedIds?.has(s.id)}
              likesCount={likesCountMap?.[s.id] || 0}
              onToggleLike={onToggleLike}
            />
          ))}
        </div>
      )}
    </div>
  );
}
