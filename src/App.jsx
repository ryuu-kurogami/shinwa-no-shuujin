import React, { useState, useEffect, useCallback } from "react";
import { Plus, ScrollText, Sparkles, UserCircle2, Search, X } from "lucide-react";
import { supabase, signInWithGoogle } from "./lib/supabaseClient";
import AuthButton from "./components/AuthButton";
import StoryCard from "./components/StoryCard";
import StoryReader from "./components/StoryReader";
import PublishModal from "./components/PublishModal";
import ProfilePage from "./components/ProfilePage";

const CATEGORIAS = [
  { value: "todos", label: "Todos" },
  { value: "corto", label: "Cortos" },
  { value: "novela", label: "Novelas" },
  { value: "fanfic", label: "Fanfics" },
];

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoaded, setAuthLoaded] = useState(false);
  const [stories, setStories] = useState(null);
  const [loadErr, setLoadErr] = useState("");
  const [openStory, setOpenStory] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStory, setEditingStory] = useState(null);
  const [categoriaFiltro, setCategoriaFiltro] = useState("todos");
  const [showProfile, setShowProfile] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [tagFiltro, setTagFiltro] = useState(null);
  const [savedIds, setSavedIds] = useState(new Set());

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

  // Carga los IDs de historias guardadas por el usuario logueado
  useEffect(() => {
    if (!user) {
      setSavedIds(new Set());
      return;
    }
    supabase
      .from("guardados")
      .select("historia_id")
      .eq("usuario_id", user.id)
      .then(({ data }) => {
        setSavedIds(new Set((data || []).map((g) => g.historia_id)));
      });
  }, [user]);

  const toggleSave = async (storyId) => {
    if (!user) {
      signInWithGoogle();
      return;
    }
    const isSaved = savedIds.has(storyId);

    // Actualización optimista: cambia en pantalla antes de esperar la respuesta
    setSavedIds((prev) => {
      const next = new Set(prev);
      isSaved ? next.delete(storyId) : next.add(storyId);
      return next;
    });

    if (isSaved) {
      await supabase.from("guardados").delete().eq("usuario_id", user.id).eq("historia_id", storyId);
    } else {
      await supabase.from("guardados").insert({ usuario_id: user.id, historia_id: storyId });
    }
  };

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
    setShowProfile(false);
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

  const storiesFiltradas = (() => {
    if (!stories) return null;
    let result = stories;

    if (categoriaFiltro !== "todos") {
      result = result.filter((s) => (s.categoria || "corto") === categoriaFiltro);
    }

    if (tagFiltro) {
      result = result.filter((s) => (s.tags || []).includes(tagFiltro));
    }

    const q = busqueda.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (s) =>
          s.title?.toLowerCase().includes(q) ||
          s.author_name?.toLowerCase().includes(q) ||
          s.frase_iconica?.toLowerCase().includes(q)
      );
    }

    return result;
  })();

  // Tags disponibles: se arman solos a partir de lo que los autores ya usaron,
  // no hay lista fija hardcodeada.
  const tagsDisponibles = stories
    ? [...new Set(stories.flatMap((s) => s.tags || []))].sort()
    : [];

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
          <div className="flex justify-end items-center gap-4 mb-8">
            {authLoaded && user && (
              <button
                onClick={() => setShowProfile(true)}
                className="flex items-center gap-1.5 text-[#B08D57] hover:text-[#e8c9a3] transition-colors text-sm"
                style={{ fontFamily: "Lora, serif" }}
              >
                <UserCircle2 size={16} /> Mi perfil
              </button>
            )}
            {authLoaded && <AuthButton user={user} />}
          </div>

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

        {showProfile && user ? (
          <ProfilePage
            user={user}
            stories={stories}
            onBack={() => setShowProfile(false)}
            onEdit={startEdit}
            onDeleted={handleDeleted}
            onOpen={(story) => {
              setShowProfile(false);
              setOpenStory(story);
            }}
          />
        ) : (
        <main className="max-w-3xl mx-auto px-5 pt-10 pb-24">
          <div className="flex items-center gap-3 mb-5">
            <ScrollText size={16} className="text-[#7C8B63]" />
            <h2 className="text-[#7C8B63] text-xs tracking-[0.2em] uppercase" style={{ fontFamily: "Lora, serif" }}>
              Historias publicadas
            </h2>
            <div className="flex-1 h-px bg-[#4a3f52]" />
          </div>

          {/* Búsqueda por título, autor o frase icónica */}
          <div className="relative mb-4">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7d7389]" />
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por título, autor o frase..."
              className="w-full bg-[#1d1824] border border-[#4a3f52] rounded-sm pl-9 pr-9 py-2.5 text-sm text-[#EDE6D6] placeholder-[#7d7389] focus:outline-none focus:ring-1 focus:ring-[#B08D57]"
              style={{ fontFamily: "Lora, serif" }}
            />
            {busqueda && (
              <button
                onClick={() => setBusqueda("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7d7389] hover:text-[#e08a8a]"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filtro por categoría */}
          <div className="flex gap-2 mb-3 flex-wrap">
            {CATEGORIAS.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setCategoriaFiltro(cat.value)}
                className={`px-3.5 py-1.5 rounded-sm border text-sm transition-colors ${
                  categoriaFiltro === cat.value
                    ? "border-[#B08D57] text-[#e8c9a3] bg-[#B08D57]/10"
                    : "border-[#4a3f52] text-[#7d7389] hover:text-[#b8afc4]"
                }`}
                style={{ fontFamily: "Lora, serif" }}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Tags dinámicos, generados a partir de lo que los autores ya usaron */}
          {tagsDisponibles.length > 0 && (
            <div className="flex gap-2 mb-6 flex-wrap items-center">
              {tagsDisponibles.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setTagFiltro(tagFiltro === tag ? null : tag)}
                  className={`px-2.5 py-1 rounded-full border text-xs transition-colors ${
                    tagFiltro === tag
                      ? "border-[#7C8B63] text-[#c3d1a8] bg-[#7C8B63]/15"
                      : "border-[#4a3f52] text-[#7d7389] hover:text-[#b8afc4]"
                  }`}
                  style={{ fontFamily: "Lora, serif" }}
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}

          {loadErr && <p className="text-[#e08a8a] text-sm mb-4">{loadErr}</p>}

          {storiesFiltradas === null ? (
            <p className="text-[#7d7389]" style={{ fontFamily: "Lora, serif" }}>
              Abriendo el archivo...
            </p>
          ) : storiesFiltradas.length === 0 ? (
            <p className="text-[#7d7389] italic" style={{ fontFamily: "Lora, serif" }}>
              {busqueda || tagFiltro
                ? "No encontramos ninguna crónica con esos filtros."
                : categoriaFiltro === "todos"
                ? "Todavía no hay ninguna crónica publicada. La primera abre el archivo."
                : "No hay historias en esta categoría todavía."}
            </p>
          ) : (
            <div className="space-y-4">
              {storiesFiltradas.map((s) => (
                <StoryCard
                  key={s.id}
                  story={s}
                  onOpen={setOpenStory}
                  isSaved={savedIds.has(s.id)}
                  onToggleSave={toggleSave}
                />
              ))}
            </div>
          )}
        </main>
        )}

        {!showProfile && (
        <footer className="max-w-3xl mx-auto px-5 pb-14">
          <div className="h-px bg-[#4a3f52] mb-5" />
          <p className="text-[#7d7389] text-xs" style={{ fontFamily: "Lora, serif" }}>
            Las historias y los comentarios públicos son visibles para cualquiera que abra esta página. Los
            comentarios privados solo los ve el autor de la historia.
          </p>
        </footer>
        )}
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