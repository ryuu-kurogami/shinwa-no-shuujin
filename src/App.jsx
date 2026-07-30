import React, { useState, useEffect, useCallback } from "react";
import { Plus, ScrollText, Sparkles } from "lucide-react";
import { supabase, signInWithGoogle } from "./lib/supabaseClient";
import AuthButton from "./components/AuthButton";
import StoryCard from "./components/StoryCard";
import StoryReader from "./components/StoryReader";
import PublishModal from "./components/PublishModal";

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoaded, setAuthLoaded] = useState(false);
  const [stories, setStories] = useState(null);
  const [loadErr, setLoadErr] = useState("");
  const [openStory, setOpenStory] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStory, setEditingStory] = useState(null);

  // Sesión: se lee al montar y se escucha cualquier cambio (login/logout)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user || null);
      setAuthLoaded(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const loadStories = useCallback(async () => {
    const { data, error } = await supabase.from("stories").select("*").order("created_at", { ascending: false });
    if (error) {
      setLoadErr("No se pudieron cargar las historias.");
    } else {
      setStories(data);
    }
  }, []);

  useEffect(() => {
    loadStories();
  }, [loadStories]);

  const openPublish = () => {
    if (!user) {
      signInWithGoogle();
      return;
    }
    setEditingStory(null);
    setModalOpen(true);
  };

  const startEdit = (story) => {
    setOpenStory(null);
    setEditingStory(story);
    setModalOpen(true);
  };

  const handleSaved = (story) => {
    setStories((prev) => {
      if (!prev) return [story];
      const exists = prev.some((s) => s.id === story.id);
      return exists ? prev.map((s) => (s.id === story.id ? story : s)) : [story, ...prev];
    });
  };

  const handleDeleted = (id) => {
    setStories((prev) => (prev ? prev.filter((s) => s.id !== id) : prev));
  };

  return (
    <div className="min-h-screen w-full" style={{ background: "#17131C" }}>
      <div
        className="min-h-screen w-full"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(122,46,46,0.18), transparent), radial-gradient(ellipse 60% 40% at 90% 10%, rgba(124,139,99,0.12), transparent)",
        }}
      >
        <header className="max-w-3xl mx-auto px-5 pt-10 sm:pt-14">
          <div className="flex justify-end mb-8">{authLoaded && <AuthButton user={user} />}</div>

          <div className="flex items-center gap-2 mb-4 text-[#7C8B63]">
            <Sparkles size={14} />
            <span className="text-xs tracking-[0.2em] uppercase" style={{ fontFamily: "Lora, serif" }}>
              Fragmentos de mundos soñados
            </span>
          </div>
          <h1
            className="text-[#EDE6D6] text-5xl sm:text-6xl leading-[1.05] mb-5"
            style={{ fontFamily: "Fraunces, serif", fontWeight: 700 }}
          >
            Crónicas
          </h1>
          <p className="text-[#b8afc4] text-[16px] sm:text-lg leading-relaxed max-w-xl mb-8" style={{ fontFamily: "Lora, serif" }}>
            Cada historia aquí es un instante rescatado de un mundo mucho más grande — el resto queda sumergido,
            a propósito, en el sueño del que vino.
          </p>

          <button
            onClick={openPublish}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-sm border border-[#B08D57] text-[#e8c9a3] hover:bg-[#B08D57]/10 transition-colors text-sm tracking-wide"
            style={{ fontFamily: "Lora, serif" }}
          >
            <Plus size={16} /> {user ? "Publicar una crónica" : "Iniciá sesión para publicar"}
          </button>
        </header>

        <main className="max-w-3xl mx-auto px-5 pt-10 pb-24">
          <div className="flex items-center gap-3 mb-5">
            <ScrollText size={16} className="text-[#7C8B63]" />
            <h2 className="text-[#7C8B63] text-xs tracking-[0.2em] uppercase" style={{ fontFamily: "Lora, serif" }}>
              Historias publicadas
            </h2>
            <div className="flex-1 h-px bg-[#4a3f52]" />
          </div>

          {loadErr && <p className="text-[#e08a8a] text-sm mb-4">{loadErr}</p>}

          {stories === null ? (
            <p className="text-[#7d7389]" style={{ fontFamily: "Lora, serif" }}>
              Abriendo el archivo...
            </p>
          ) : stories.length === 0 ? (
            <p className="text-[#7d7389] italic" style={{ fontFamily: "Lora, serif" }}>
              Todavía no hay ninguna crónica publicada. La primera abre el archivo.
            </p>
          ) : (
            <div className="space-y-4">
              {stories.map((s) => (
                <StoryCard key={s.id} story={s} onOpen={setOpenStory} />
              ))}
            </div>
          )}
        </main>

        <footer className="max-w-3xl mx-auto px-5 pb-14">
          <div className="h-px bg-[#4a3f52] mb-5" />
          <p className="text-[#7d7389] text-xs" style={{ fontFamily: "Lora, serif" }}>
            Las historias y los comentarios públicos son visibles para cualquiera que abra esta página. Los
            comentarios privados solo los ve el autor de la historia.
          </p>
        </footer>
      </div>

      {openStory && (
        <StoryReader
          story={openStory}
          user={user}
          onClose={() => setOpenStory(null)}
          onDeleted={handleDeleted}
          onEdit={startEdit}
        />
      )}

      {modalOpen && user && (
        <PublishModal
          user={user}
          editingStory={editingStory}
          onClose={() => {
            setModalOpen(false);
            setEditingStory(null);
          }}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
