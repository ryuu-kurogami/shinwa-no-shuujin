import React, { useState, useEffect, useCallback } from "react";
import { ScrollText, Sparkles, Search, X, Heart, ShieldAlert, ArrowLeft } from "lucide-react";
import { supabase, signInWithGoogle, ADMIN_EMAILS } from "./lib/supabaseClient";
import AuthButton from "./components/AuthButton";
import NavBar from "./components/NavBar";
import StoryCard from "./components/StoryCard";
import StoryReader from "./components/StoryReader";
import PublishModal from "./components/PublishModal";
import ProfilePage from "./components/ProfilePage";
import AuthorProfile from "./components/AuthorProfile";
import BibliotecaPage from "./components/BibliotecaPage";
import EscribirPage from "./components/EscribirPage";
import UmbralGate, { pactoYaAceptado } from "./components/UmbralGate";
import ModeracionPage from "./components/ModeracionPage";
import AgeGate, { edad18YaConfirmada, confirmarEdad18 } from "./components/AgeGate";
import UsernameGate from "./components/UsernameGate";
import TransparenciaPage from "./components/TransparenciaPage";
import DeletionPendingGate from "./components/DeletionPendingGate";
import BanApelacionGate from "./components/BanApelacionGate";
import SiteFooter from "./components/SiteFooter";

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
  const [busqueda, setBusqueda] = useState("");
  const [tagFiltro, setTagFiltro] = useState(null);
  const [savedIds, setSavedIds] = useState(new Set());
  const [likedIds, setLikedIds] = useState(new Set());
  const [likesCountMap, setLikesCountMap] = useState({});
  const [conteoCapitulos, setConteoCapitulos] = useState({});
  const [ordenExplorar, setOrdenExplorar] = useState("recientes"); // recientes | lecturas | likes
  const [viewingAuthorId, setViewingAuthorId] = useState(null);
  const [tab, setTab] = useState("archivo"); // archivo | explorar | biblioteca | perfil | escribir
  const [umbralCruzado, setUmbralCruzado] = useState(pactoYaAceptado());
  const [edad18Confirmada, setEdad18Confirmada] = useState(edad18YaConfirmada());
  const [accionPendienteDeEdad, setAccionPendienteDeEdad] = useState(null); // historia | "seccion" | null
  const [necesitaUsername, setNecesitaUsername] = useState(false);
  const [eliminarEn, setEliminarEn] = useState(null);
  const [baneoActivo, setBaneoActivo] = useState(null); // { hasta, motivo, apelacionEstado } | null
  const isAdmin = user && ADMIN_EMAILS.includes((user.email || "").toLowerCase());

  // Punto único de apertura de una historia: si es contenido +18 y todavía
  // no se confirmó la mayoría de edad en este navegador, se intercepta con
  // el AgeGate (ver Términos, Sección 4.2) en vez de abrir el lector directo.
  const handleOpenStory = (story) => {
    if (story?.es_adulto && !edad18Confirmada) {
      setAccionPendienteDeEdad(story);
      return;
    }
    setOpenStory(story);
  };

  // Igual que arriba, pero para entrar a la sección +18 en sí (Términos,
  // Sección 4.1) en vez de abrir una historia puntual.
  const irASeccionAdultos = () => {
    if (!edad18Confirmada) {
      setAccionPendienteDeEdad("seccion");
      return;
    }
    setTab("adultos");
  };

  const confirmarYContinuar = () => {
    confirmarEdad18();
    setEdad18Confirmada(true);
    if (accionPendienteDeEdad === "seccion") {
      setTab("adultos");
    } else if (accionPendienteDeEdad) {
      setOpenStory(accionPendienteDeEdad);
    }
    setAccionPendienteDeEdad(null);
  };

  const cancelarAccionPendiente = () => {
    setAccionPendienteDeEdad(null);
  };

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

  // Cualquier cuenta con sesión pero sin username todavía (nueva o vieja)
  // queda bloqueada por el UsernameGate hasta completarlo — es la base para
  // que después, en comentarios, no se pueda escribir un nombre libre.
  // Aprovechamos la misma consulta para saber si la cuenta está en período
  // de gracia de borrado (eliminar_en).
  useEffect(() => {
    if (!user) {
      setNecesitaUsername(false);
      setEliminarEn(null);
      setBaneoActivo(null);
      return;
    }
    supabase
      .from("profiles")
      .select("username, eliminar_en, baneado_hasta, motivo_baneo, apelacion_estado")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setNecesitaUsername(!data?.username);
        setEliminarEn(data?.eliminar_en || null);
        if (data?.baneado_hasta && new Date(data.baneado_hasta) > new Date()) {
          setBaneoActivo({
            hasta: data.baneado_hasta,
            motivo: data.motivo_baneo || null,
            apelacionEstado: data.apelacion_estado || null,
          });
        } else {
          setBaneoActivo(null);
        }
      });
  }, [user]);

  const loadStories = useCallback(async () => {
    const { data, error } = await supabase.from("stories").select("*").order("created_at", { ascending: false });
    if (error) {
      setLoadErr("No se pudieron cargar las historias.");
    } else {
      setStories(data);
    }
  }, []);

  // Cantidad de capítulos publicados por historia, para el badge en
  // StoryCard — se recalcula del lado del cliente en vez de con una
  // función de base, alcanza para el volumen de datos que maneja el sitio.
  const loadConteoCapitulos = useCallback(async () => {
    const { data, error } = await supabase.from("capitulos").select("story_id").eq("estado", "publicado");
    if (error) return;
    const mapa = {};
    (data || []).forEach((c) => {
      mapa[c.story_id] = (mapa[c.story_id] || 0) + 1;
    });
    setConteoCapitulos(mapa);
  }, []);

  useEffect(() => {
    loadStories();
    loadConteoCapitulos();
  }, [loadStories, loadConteoCapitulos]);

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

  // Contador de likes por historia (público, no depende de sesión)
  useEffect(() => {
    supabase
      .from("likes")
      .select("historia_id")
      .then(({ data }) => {
        const map = {};
        (data || []).forEach((row) => {
          map[row.historia_id] = (map[row.historia_id] || 0) + 1;
        });
        setLikesCountMap(map);
      });
  }, [stories]);

  // Cuáles le dio like el usuario logueado
  useEffect(() => {
    if (!user) {
      setLikedIds(new Set());
      return;
    }
    supabase
      .from("likes")
      .select("historia_id")
      .eq("usuario_id", user.id)
      .then(({ data }) => {
        setLikedIds(new Set((data || []).map((l) => l.historia_id)));
      });
  }, [user]);

  const toggleLike = async (storyId) => {
    if (!user) {
      signInWithGoogle();
      return;
    }
    const isLiked = likedIds.has(storyId);

    setLikedIds((prev) => {
      const next = new Set(prev);
      isLiked ? next.delete(storyId) : next.add(storyId);
      return next;
    });
    setLikesCountMap((prev) => ({
      ...prev,
      [storyId]: Math.max(0, (prev[storyId] || 0) + (isLiked ? -1 : 1)),
    }));

    if (isLiked) {
      await supabase.from("likes").delete().eq("usuario_id", user.id).eq("historia_id", storyId);
    } else {
      await supabase.from("likes").insert({ usuario_id: user.id, historia_id: storyId });
    }
  };

  const toggleSave = async (storyId) => {
    if (!user) {
      signInWithGoogle();
      return;
    }
    const isSaved = savedIds.has(storyId);
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

  const handleViewAuthor = (authorId) => {
    setOpenStory(null);
    setViewingAuthorId(authorId);
  };

  const handleChangeTab = (value) => {
    if ((value === "perfil" || value === "biblioteca" || value === "escribir") && !user) {
      signInWithGoogle();
      return;
    }
    setViewingAuthorId(null);
    setTab(value);
  };

  const storiesFiltradas = (() => {
    if (!stories) return null;
    // El contenido +18 no se mezcla acá — vive en su propia sección
    // (Términos, Sección 4.1), no en el archivo general.
    let result = stories.filter((s) => s.estado === "publicado" && !s.es_adulto);
    if (categoriaFiltro !== "todos") {
      result = result.filter((s) => (s.categoria || "corto") === categoriaFiltro);
    }
    return result;
  })();

  const storiesExploradas = (() => {
    if (!stories) return null;
    let result = stories.filter((s) => s.estado === "publicado" && !s.es_adulto);
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

    if (ordenExplorar === "lecturas") {
      result = [...result].sort((a, b) => (b.lecturas || 0) - (a.lecturas || 0));
    } else if (ordenExplorar === "likes") {
      result = [...result].sort(
        (a, b) => (likesCountMap[b.id] || 0) - (likesCountMap[a.id] || 0)
      );
    }
    // "recientes" no necesita re-sort, ya viene ordenado desde loadStories()

    return result;
  })();

  // Lista dedicada de la sección +18 — solo se arma cuando hace falta, no
  // se filtra por categoría/tags/búsqueda, así se mantiene simple.
  const storiesAdultos = stories
    ? stories.filter((s) => s.estado === "publicado" && s.es_adulto)
    : null;

  const tagsDisponibles = stories
    ? [...new Set(stories.filter((s) => s.estado === "publicado" && !s.es_adulto).flatMap((s) => s.tags || []))].sort()
    : [];

  return (
    <div className="min-h-screen w-full" style={{ background: "#17131C" }}>
      {!umbralCruzado && <UmbralGate onEnter={() => setUmbralCruzado(true)} />}
      {umbralCruzado && user && eliminarEn && new Date(eliminarEn) > new Date() && (
        <DeletionPendingGate userId={user.id} eliminarEn={eliminarEn} onCancelado={() => setEliminarEn(null)} />
      )}
      {umbralCruzado && user && !eliminarEn && baneoActivo && (
        <BanApelacionGate
          userId={user.id}
          baneadoHasta={baneoActivo.hasta}
          motivoBaneo={baneoActivo.motivo}
          apelacionEstado={baneoActivo.apelacionEstado}
          onSignOut={() => supabase.auth.signOut()}
        />
      )}
      {umbralCruzado && user && !eliminarEn && !baneoActivo && necesitaUsername && (
        <UsernameGate userId={user.id} onDone={() => setNecesitaUsername(false)} />
      )}
      {accionPendienteDeEdad && <AgeGate onConfirm={confirmarYContinuar} onDecline={cancelarAccionPendiente} />}

      <NavBar current={tab} onChange={handleChangeTab} user={user} isAdmin={isAdmin} />

      <div
        className="min-h-screen w-full"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(122,46,46,0.18), transparent), radial-gradient(ellipse 60% 40% at 90% 10%, rgba(124,139,99,0.12), transparent)",
        }}
      >
        {viewingAuthorId ? (
          <AuthorProfile
            authorId={viewingAuthorId}
            stories={stories}
            user={user}
            onBack={() => setViewingAuthorId(null)}
            onOpenStory={(story) => {
              setViewingAuthorId(null);
              handleOpenStory(story);
            }}
          />
        ) : (
        <>
        {tab === "archivo" && (
          <>
            <header className="max-w-3xl 2xl:max-w-4xl mx-auto px-5 pt-10 sm:pt-14">
              <div className="flex justify-end mb-8">{authLoaded && <AuthButton user={user} />}</div>

              <div className="flex items-center gap-2 mb-4 text-[#7C8B63]">
                <Sparkles size={14} />
                <span className="text-xs tracking-[0.2em] uppercase" style={{ fontFamily: "Lora, serif" }}>
                  Vestigios de un génesis onírico
                </span>
              </div>

              <div className="flex items-center gap-4 mb-5">
                {/* Logo circular al lado del título — reemplazá /logo.png en public/ por tu archivo */}
                <img
                  src="/logo.png"
                  alt="Shinwa no Shuujin"
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover shrink-0 border border-[#4a3f52]"
                  onError={(e) => (e.target.style.display = "none")}
                />
                <h1
                  className="text-[#EDE6D6] text-4xl sm:text-6xl leading-[1.05]"
                  style={{ fontFamily: "Fraunces, serif", fontWeight: 700 }}
                >
                  Shinwa no Shuujin
                </h1>
              </div>

              <p className="text-[#b8afc4] text-[16px] sm:text-lg leading-relaxed max-w-xl mb-8" style={{ fontFamily: "Lora, serif" }}>
                Cada relato es apenas un destello salvado de un universo infinito; el resto queda sumergido en el
                letargo del que nació, ese tejido invisible donde cada autor es un Aedo del mito.
              </p>

              <button
                onClick={() => setTab("transparencia")}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-sm border border-[#B08D57] text-[#e8c9a3] hover:bg-[#B08D57]/10 transition-colors text-sm tracking-wide"
                style={{ fontFamily: "Lora, serif" }}
              >
                <Heart size={16} /> Sobre el sitio · Transparencia
              </button>
            </header>

            <main className="max-w-3xl 2xl:max-w-4xl mx-auto px-5 pt-10 pb-24">
              <div className="flex items-center gap-3 mb-5">
                <ScrollText size={16} className="text-[#7C8B63]" />
                <h2 className="text-[#7C8B63] text-xs tracking-[0.2em] uppercase" style={{ fontFamily: "Lora, serif" }}>
                  Historias publicadas
                </h2>
                <div className="flex-1 h-px bg-[#4a3f52]" />
              </div>

              <div className="flex gap-2 mb-6 flex-wrap">
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

              {loadErr && <p className="text-[#e08a8a] text-sm mb-4">{loadErr}</p>}

              {storiesFiltradas === null ? (
                <p className="text-[#7d7389]" style={{ fontFamily: "Lora, serif" }}>
                  Abriendo el archivo...
                </p>
              ) : storiesFiltradas.length === 0 ? (
                <p className="text-[#7d7389] italic" style={{ fontFamily: "Lora, serif" }}>
                  {categoriaFiltro === "todos"
                    ? "Todavía no hay ninguna crónica publicada. La primera abre el archivo."
                    : "No hay historias en esta categoría todavía."}
                </p>
              ) : (
                <div className="space-y-4">
                  {storiesFiltradas.map((s) => (
                    <StoryCard
                      key={s.id}
                      story={s}
                      onOpen={handleOpenStory}
                      isSaved={savedIds.has(s.id)}
                      onToggleSave={toggleSave}
                      onViewAuthor={handleViewAuthor}
                      isLiked={likedIds.has(s.id)}
                      likesCount={likesCountMap[s.id] || 0}
                      onToggleLike={toggleLike}
                      capitulosCount={conteoCapitulos[s.id]}
                    />
                  ))}
                </div>
              )}
            </main>

          </>
        )}

        {tab === "explorar" && (
          <div className="max-w-3xl 2xl:max-w-4xl mx-auto px-5 pt-10 pb-24">
            <h1 className="text-[#EDE6D6] text-2xl mb-6" style={{ fontFamily: "Fraunces, serif", fontWeight: 700 }}>
              Explorar
            </h1>

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

            <button
              onClick={irASeccionAdultos}
              className="flex items-center gap-1.5 text-[#7d7389] hover:text-[#e08a8a] transition-colors text-xs mb-6"
              style={{ fontFamily: "Lora, serif" }}
            >
              <ShieldAlert size={12} /> Sección +18
            </button>

            {tagsDisponibles.length > 0 && (
              <div className="flex gap-2 mb-6 flex-wrap items-center">
                {tagsDisponibles.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTagFiltro(tagFiltro === t ? null : t)}
                    className={`px-2.5 py-1 rounded-full border text-xs transition-colors ${
                      tagFiltro === t
                        ? "border-[#7C8B63] text-[#c3d1a8] bg-[#7C8B63]/15"
                        : "border-[#4a3f52] text-[#7d7389] hover:text-[#b8afc4]"
                    }`}
                    style={{ fontFamily: "Lora, serif" }}
                  >
                    #{t}
                  </button>
                ))}
              </div>
            )}

            <div className="flex gap-2 mb-8 flex-wrap">
              {[
                { value: "recientes", label: "Recientes" },
                { value: "lecturas", label: "Más leídas" },
                { value: "likes", label: "Más gustadas" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setOrdenExplorar(opt.value)}
                  className={`px-3 py-1.5 rounded-sm border text-sm transition-colors ${
                    ordenExplorar === opt.value
                      ? "border-[#B08D57] text-[#e8c9a3] bg-[#B08D57]/10"
                      : "border-[#4a3f52] text-[#7d7389] hover:text-[#b8afc4]"
                  }`}
                  style={{ fontFamily: "Lora, serif" }}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {storiesExploradas === null ? (
              <p className="text-[#7d7389]" style={{ fontFamily: "Lora, serif" }}>Cargando...</p>
            ) : storiesExploradas.length === 0 ? (
              <p className="text-[#7d7389] italic" style={{ fontFamily: "Lora, serif" }}>
                No encontramos ninguna crónica con esos filtros.
              </p>
            ) : (
              <div className="space-y-4">
                {storiesExploradas.map((s) => (
                  <StoryCard
                    key={s.id}
                    story={s}
                    onOpen={handleOpenStory}
                    isSaved={savedIds.has(s.id)}
                    onToggleSave={toggleSave}
                    onViewAuthor={handleViewAuthor}
                    isLiked={likedIds.has(s.id)}
                    likesCount={likesCountMap[s.id] || 0}
                    onToggleLike={toggleLike}
                    capitulosCount={conteoCapitulos[s.id]}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "biblioteca" && user && (
          <BibliotecaPage
            stories={stories}
            savedIds={savedIds}
            onOpen={handleOpenStory}
            onToggleSave={toggleSave}
            likedIds={likedIds}
            likesCountMap={likesCountMap}
            onToggleLike={toggleLike}
          />
        )}

        {tab === "perfil" && user && (
          <ProfilePage
            user={user}
            stories={stories}
            onBack={() => setTab("archivo")}
            onEdit={startEdit}
            onDeleted={handleDeleted}
            onOpen={handleOpenStory}
            onViewAuthor={handleViewAuthor}
            onDeletionRequested={setEliminarEn}
          />
        )}

        {tab === "escribir" && user && (
          <EscribirPage user={user} stories={stories} onNewStory={openPublish} onEdit={startEdit} />
        )}

        {tab === "moderacion" && isAdmin && <ModeracionPage />}
        {tab === "adultos" && (
          <div className="max-w-3xl 2xl:max-w-4xl mx-auto px-5 pt-10 pb-24">
            <button
              onClick={() => setTab("explorar")}
              className="mb-8 flex items-center gap-1.5 text-[#B08D57] hover:text-[#e8c9a3] transition-colors text-sm"
              style={{ fontFamily: "Lora, serif" }}
            >
              <ArrowLeft size={16} /> Volver
            </button>

            <div className="flex items-center gap-2 mb-6">
              <ShieldAlert size={18} className="text-[#7A2E2E]" />
              <h1 className="text-[#EDE6D6] text-2xl" style={{ fontFamily: "Fraunces, serif", fontWeight: 700 }}>
                Sección +18
              </h1>
            </div>

            {storiesAdultos === null ? (
              <p className="text-[#7d7389]" style={{ fontFamily: "Lora, serif" }}>Cargando...</p>
            ) : storiesAdultos.length === 0 ? (
              <p className="text-[#7d7389] italic" style={{ fontFamily: "Lora, serif" }}>
                Todavía no hay historias en esta sección.
              </p>
            ) : (
              <div className="space-y-4">
                {storiesAdultos.map((s) => (
                  <StoryCard
                    key={s.id}
                    story={s}
                    onOpen={handleOpenStory}
                    isSaved={savedIds.has(s.id)}
                    onToggleSave={toggleSave}
                    onViewAuthor={handleViewAuthor}
                    isLiked={likedIds.has(s.id)}
                    likesCount={likesCountMap[s.id] || 0}
                    onToggleLike={toggleLike}
                    capitulosCount={conteoCapitulos[s.id]}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "transparencia" && (
          <TransparenciaPage onBack={() => setTab("archivo")} isAdmin={isAdmin} />
        )}
        </>
        )}
      </div>

      <SiteFooter />

      {openStory && (
        <StoryReader
          story={openStory}
          user={user}
          onClose={() => setOpenStory(null)}
          onDeleted={handleDeleted}
          onEdit={startEdit}
          onViewAuthor={handleViewAuthor}
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