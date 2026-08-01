import React, { useEffect, useState } from "react";
import { ArrowLeft, UserPlus, UserCheck, ScrollText, Heart } from "lucide-react";
import { StorySeal } from "./StoryCard";
import { supabase, signInWithGoogle } from "../lib/supabaseClient";

export default function AuthorProfile({ authorId, stories, user, onBack, onOpenStory }) {
  const [profile, setProfile] = useState(null);
  const [siguiendo, setSiguiendo] = useState(false);
  const [contadorSeguidores, setContadorSeguidores] = useState(null);

  const historiasDelAutor = (stories || []).filter((s) => s.author_id === authorId);
  const authorName = historiasDelAutor[0]?.author_name || "Autor";

  useEffect(() => {
    supabase.from("profiles").select("username, bio, avatar_url, link_donacion").eq("id", authorId).maybeSingle().then(({ data }) => {
      setProfile(data);
    });
  }, [authorId]);

  useEffect(() => {
    let active = true;

    supabase
      .from("seguidores")
      .select("seguidor_id")
      .eq("seguido_id", authorId)
      .then(({ data }) => {
        if (active) setContadorSeguidores(data?.length ?? 0);
      });

    if (user) {
      supabase
        .from("seguidores")
        .select("seguido_id")
        .eq("seguidor_id", user.id)
        .eq("seguido_id", authorId)
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
  }, [user, authorId]);

  const toggleSeguir = async () => {
    if (!user) {
      signInWithGoogle();
      return;
    }
    if (siguiendo) {
      await supabase.from("seguidores").delete().eq("seguidor_id", user.id).eq("seguido_id", authorId);
      setSiguiendo(false);
      setContadorSeguidores((c) => Math.max(0, (c ?? 1) - 1));
    } else {
      await supabase.from("seguidores").insert({ seguidor_id: user.id, seguido_id: authorId });
      setSiguiendo(true);
      setContadorSeguidores((c) => (c ?? 0) + 1);
    }
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

      <div className="flex items-start gap-4 mb-3">
        <div
          className="w-16 h-16 rounded-full shrink-0 overflow-hidden grid place-items-center"
          style={{ background: "radial-gradient(circle at 35% 30%, #9c6a3d, #7a4f2a 60%, #5c3a1f 100%)" }}
        >
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-[#f1e2c4] text-xl" style={{ fontFamily: "Fraunces, serif" }}>
              {authorName.charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h1 className="text-[#EDE6D6] text-2xl sm:text-3xl leading-tight" style={{ fontFamily: "Fraunces, serif", fontWeight: 700 }}>
            {profile?.username || authorName}
          </h1>
          <p className="text-[#7d7389] text-sm mt-0.5" style={{ fontFamily: "Lora, serif" }}>
            {contadorSeguidores !== null ? `${contadorSeguidores} ${contadorSeguidores === 1 ? "seguidor" : "seguidores"}` : ""}
            {" · "}
            {historiasDelAutor.length} {historiasDelAutor.length === 1 ? "crónica" : "crónicas"}
          </p>
        </div>

        {user?.id !== authorId && (
          <button
            onClick={toggleSeguir}
            className={`flex items-center gap-1.5 text-sm px-3.5 py-2 rounded-sm border transition-colors shrink-0 ${
              siguiendo
                ? "border-[#7C8B63] text-[#c3d1a8] bg-[#7C8B63]/10"
                : "border-[#B08D57] text-[#e8c9a3] hover:bg-[#B08D57]/10"
            }`}
            style={{ fontFamily: "Lora, serif" }}
          >
            {siguiendo ? <UserCheck size={14} /> : <UserPlus size={14} />}
            {siguiendo ? "Siguiendo" : "Seguir"}
          </button>
        )}
      </div>

      {profile?.bio && (
        <p className="text-[#b8afc4] text-[15px] leading-relaxed mb-8 max-w-xl" style={{ fontFamily: "Lora, serif" }}>
          {profile.bio}
        </p>
      )}

      {profile?.link_donacion && (
        <a
          href={profile.link_donacion}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 mb-8 text-sm text-[#7A2E2E] hover:text-[#a34848] transition-colors"
          style={{ fontFamily: "Lora, serif" }}
        >
          <Heart size={13} /> Apoyar a este autor
        </a>
      )}

      <div className="flex items-center gap-3 mb-5">
        <ScrollText size={16} className="text-[#7C8B63]" />
        <h2 className="text-[#7C8B63] text-xs tracking-[0.2em] uppercase" style={{ fontFamily: "Lora, serif" }}>
          Sus crónicas
        </h2>
        <div className="flex-1 h-px bg-[#4a3f52]" />
      </div>

      {historiasDelAutor.length === 0 ? (
        <p className="text-[#7d7389] italic" style={{ fontFamily: "Lora, serif" }}>
          Todavía no publicó ninguna crónica.
        </p>
      ) : (
        <div className="space-y-4">
          {historiasDelAutor.map((s) => (
            <button
              key={s.id}
              onClick={() => onOpenStory(s)}
              className="w-full text-left rounded-sm border border-[#4a3f52] bg-[#1d1824]/80 hover:bg-[#241d2c] transition-colors p-5 flex gap-4 items-start"
            >
              <StorySeal fraseIconica={s.frase_iconica || s.span} portadaUrl={s.portada_url} />
              <div className="min-w-0 flex-1">
                <h3 className="text-[#EDE6D6] text-lg leading-snug mb-1" style={{ fontFamily: "Fraunces, serif", fontWeight: 600 }}>
                  {s.title}
                </h3>
                <p className="text-[#b8afc4] text-sm leading-relaxed line-clamp-2" style={{ fontFamily: "Lora, serif" }}>
                  {s.excerpt}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
