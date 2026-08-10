import React, { useEffect, useState, useCallback, useRef } from "react";
import { X, Trash2, Pencil, UserPlus, UserCheck, Eye, Flag, ChevronLeft, ChevronRight, BookOpen, Clock3, BookPlus } from "lucide-react";
import { StorySeal } from "./StoryCard";
import CommentThread from "./CommentThread";
import { supabase, ADMIN_EMAILS, signInWithGoogle } from "../lib/supabaseClient";
import ReportModal from "./ReportModal";
import PublicarCapituloModal from "./PublicarCapituloModal";
import { contarPalabras, tiempoLecturaMinutos } from "../utils/textoStats";

const ESTADO_PUBLICACION_LABEL = {
  en_emision: "En emisión",
  en_pausa: "En pausa",
  finalizado: "Finalizado",
};

// Estado interno de un capítulo (distinto del "estado de emisión" de la
// obra) — solo lo ve el autor/admin, porque RLS es lo único que hace que
// un capítulo sin publicar les llegue a ellos en primer lugar.
const ESTADO_CAPITULO_LABEL = {
  borrador: "Borrador",
  pendiente_revision: "En revisión",
};

// Texto pegado desde Word/Docs suele traer un salto de línea manual al
// final de cada renglón (no cada párrafo). Como el lector respeta los
// saltos tal cual (whitespace-pre-line), eso corta el texto siempre en el
// mismo lugar sin importar el ancho de pantalla real. Acá tratamos un
// salto de línea SUELTO como un espacio (para que el párrafo fluya según
// el dispositivo), y dejamos los saltos DOBLES (separación real de
// párrafo) intactos.
function normalizarSaltosDeLinea(texto) {
  if (!texto) return "";
  return texto
    .replace(/\r\n/g, "\n")
    .replace(/([^\n])\n(?!\n)/g, "$1 ")
    .replace(/\n{2,}/g, "\n\n");
}

export default function StoryReader({ story, user, onClose, onDeleted, onEdit, onViewAuthor }) {
  const [siguiendo, setSiguiendo] = useState(false);
  const [contadorSeguidores, setContadorSeguidores] = useState(null);
  const [reportando, setReportando] = useState(false);
  const [modalCapitulo, setModalCapitulo] = useState(null); // { editingCapitulo? , siguienteNumero? }
  const [capitulos, setCapitulos] = useState(null);
  const [capituloActualId, setCapituloActualId] = useState(null);
  const [progresoLectura, setProgresoLectura] = useState(0);
  const contenedorRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Mientras el lector está abierto, el fondo (Archivo/Explorar detrás) no
  // debería poder scrollearse por separado — si no, aparecen dos barras de
  // scroll independientes y el fondo se nota "moviéndose" detrás del blur.
  useEffect(() => {
    const overflowOriginal = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflowOriginal;
    };
  }, []);

  // Carga la lista de capítulos de esta obra (RLS ya filtra: un lector
  // cualquiera solo ve los publicados; el autor/admin ven todos, incluidos
  // borradores y los que están en revisión).
  const cargarCapitulos = useCallback(async () => {
    const { data, error } = await supabase
      .from("capitulos")
      .select("*")
      .eq("story_id", story.id)
      .order("numero", { ascending: true });
    if (!error) {
      setCapitulos(data || []);
      setCapituloActualId((actual) => actual || data?.[0]?.id || null);
    }
  }, [story.id]);

  useEffect(() => {
    cargarCapitulos();
  }, [cargarCapitulos]);

  const capituloActual = capitulos?.find((c) => c.id === capituloActualId) || null;
  const indiceActual = capitulos ? capitulos.findIndex((c) => c.id === capituloActualId) : -1;

  // Progreso de lectura del capítulo actual, medido sobre el contenedor que
  // scrollea (no la ventana, porque el lector es un overlay fixed propio).
  // Al cambiar de capítulo, arrancamos siempre desde arriba.
  useEffect(() => {
    const el = contenedorRef.current;
    if (!el) return;
    el.scrollTo(0, 0);
    setProgresoLectura(0);

    const onScroll = () => {
      const maximo = el.scrollHeight - el.clientHeight;
      setProgresoLectura(maximo > 0 ? Math.min(100, (el.scrollTop / maximo) * 100) : 0);
    };
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, [capituloActualId]);

  const palabrasTotales = (capitulos || []).reduce((sum, c) => sum + contarPalabras(c.content), 0);

  // Cuenta la lectura solo si se quedó al menos 10s en el capítulo, y una
  // sola vez por capítulo por sesión de navegador (sessionStorage) — evita
  // sumar lecturas por alguien que abre y cierra sin llegar a leer.
  useEffect(() => {
    if (!capituloActual || capituloActual.estado !== "publicado") return;

    const storageKey = `read_cap_${capituloActual.id}`;
    if (sessionStorage.getItem(storageKey)) return;

    const timer = setTimeout(() => {
      supabase.rpc("increment_lecturas_capitulo", { p_capitulo_id: capituloActual.id }).then(({ error }) => {
        if (error) {
          console.error("Error al contar lectura:", error.message);
          return;
        }
        sessionStorage.setItem(storageKey, "true");
      });
    }, 10000);

    return () => clearTimeout(timer);
  }, [capituloActual?.id, capituloActual?.estado]);

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
    if (!window.confirm("¿Borrar esta historia? Se borran todos sus capítulos. No se puede deshacer.")) return;
    await supabase.from("stories").delete().eq("id", story.id);
    onDeleted(story.id);
    onClose();
  };

  const irACapitulo = (id) => setCapituloActualId(id);
  const irAAnterior = () => indiceActual > 0 && setCapituloActualId(capitulos[indiceActual - 1].id);

  const abrirNuevoCapitulo = () => {
    const numeros = (capitulos || []).map((c) => c.numero);
    const siguienteNumero = numeros.length > 0 ? Math.max(...numeros) + 1 : 2;
    setModalCapitulo({ siguienteNumero });
  };

  const abrirEditarCapituloActual = () => {
    if (!capituloActual) return;
    setModalCapitulo({ editingCapitulo: capituloActual });
  };
  const irASiguiente = () =>
    capitulos && indiceActual < capitulos.length - 1 && setCapituloActualId(capitulos[indiceActual + 1].id);

  return (
    <>
      <div
        className="fixed top-0 left-0 h-[3px] bg-[#B08D57] z-[70] transition-[width] duration-150"
        style={{ width: `${progresoLectura}%` }}
      />
      <div ref={contenedorRef} className="fixed inset-0 z-50 bg-[#0e0b13]/90 backdrop-blur-sm overflow-y-auto">
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
            <button
              onClick={() => setReportando(true)}
              className="flex items-center gap-1.5 text-[#7d7389] hover:text-[#e08a8a] transition-colors text-sm"
              style={{ fontFamily: "Lora, serif" }}
            >
              <Flag size={13} /> Reportar
            </button>
            {canEdit && (
              <button
                onClick={() => onEdit(story)}
                className="flex items-center gap-1.5 text-[#7C8B63] hover:text-[#9db07d] transition-colors text-sm"
                style={{ fontFamily: "Lora, serif" }}
              >
                <Pencil size={14} /> Datos de la obra
              </button>
            )}
            {canEdit && capituloActual && (
              <button
                onClick={abrirEditarCapituloActual}
                className="flex items-center gap-1.5 text-[#7C8B63] hover:text-[#9db07d] transition-colors text-sm"
                style={{ fontFamily: "Lora, serif" }}
              >
                <Pencil size={14} /> Editar capítulo
              </button>
            )}
            {canEdit && (
              <button
                onClick={abrirNuevoCapitulo}
                className="flex items-center gap-1.5 text-[#B08D57] hover:text-[#e8c9a3] transition-colors text-sm"
                style={{ fontFamily: "Lora, serif" }}
              >
                <BookPlus size={14} /> Agregar capítulo
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
          {story.estado_publicacion && (
            <span className="text-[#7d7389] text-xs tracking-[0.1em] uppercase" style={{ fontFamily: "Lora, serif" }}>
              · {ESTADO_PUBLICACION_LABEL[story.estado_publicacion] || story.estado_publicacion}
            </span>
          )}
        </div>

        <h1 className="text-[#EDE6D6] text-3xl sm:text-4xl leading-tight mb-2" style={{ fontFamily: "Fraunces, serif", fontWeight: 700 }}>
          {story.title}
        </h1>
        <div className="flex items-center gap-3 mb-6 flex-wrap">
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
            {palabrasTotales > 0 && (
              <span className="text-[#7d7389]/70"> · {palabrasTotales.toLocaleString("es")} palabras</span>
            )}
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

        {/* Índice de capítulos — solo tiene sentido mostrarlo si hay más de uno */}
        {capitulos && capitulos.length > 1 && (
          <div className="flex items-center gap-2 mb-6">
            <BookOpen size={13} className="text-[#7C8B63] shrink-0" />
            <div className="flex flex-wrap gap-1.5">
              {capitulos.map((c) => (
                <button
                  key={c.id}
                  onClick={() => irACapitulo(c.id)}
                  className={`px-2.5 py-1 rounded-sm border text-xs transition-colors ${
                    c.id === capituloActualId
                      ? "border-[#B08D57] text-[#e8c9a3] bg-[#B08D57]/10"
                      : "border-[#4a3f52] text-[#7d7389] hover:text-[#b8afc4]"
                  }`}
                  style={{ fontFamily: "Lora, serif" }}
                >
                  {c.numero}
                  {c.estado !== "publicado" && ` · ${ESTADO_CAPITULO_LABEL[c.estado] || c.estado}`}
                </button>
              ))}
            </div>
          </div>
        )}

        {!capituloActual ? (
          <p className="text-[#7d7389]" style={{ fontFamily: "Lora, serif" }}>Cargando capítulo...</p>
        ) : (
          <>
            {(capituloActual.titulo || (capitulos && capitulos.length > 1)) && (
              <h2 className="text-[#e8c9a3] text-xl mb-1" style={{ fontFamily: "Fraunces, serif", fontWeight: 600 }}>
                {capituloActual.titulo || `Capítulo ${capituloActual.numero}`}
              </h2>
            )}
            <p className="flex items-center gap-1 text-[#7d7389] text-xs mb-4" style={{ fontFamily: "Lora, serif" }}>
              <Clock3 size={11} /> ≈ {tiempoLecturaMinutos(capituloActual.content)} min de lectura
            </p>
            {capituloActual.estado !== "publicado" && (
              <p className="text-[#B08D57] text-xs uppercase tracking-wide mb-4" style={{ fontFamily: "Lora, serif" }}>
                {ESTADO_CAPITULO_LABEL[capituloActual.estado] || capituloActual.estado} — solo vos y el admin pueden ver esto
              </p>
            )}
            <div className="text-[#d8d1e0] text-[17px] leading-[1.85] whitespace-pre-line" style={{ fontFamily: "Lora, serif" }}>
              {normalizarSaltosDeLinea(capituloActual.content)}
            </div>

            {capitulos && capitulos.length > 1 && (
              <div className="flex justify-between items-center mt-8 pt-6 border-t border-[#4a3f52]">
                <button
                  onClick={irAAnterior}
                  disabled={indiceActual <= 0}
                  className="flex items-center gap-1.5 text-sm text-[#b8afc4] hover:text-[#e8c9a3] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  style={{ fontFamily: "Lora, serif" }}
                >
                  <ChevronLeft size={16} /> Anterior
                </button>
                <button
                  onClick={irASiguiente}
                  disabled={!capitulos || indiceActual >= capitulos.length - 1}
                  className="flex items-center gap-1.5 text-sm text-[#b8afc4] hover:text-[#e8c9a3] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  style={{ fontFamily: "Lora, serif" }}
                >
                  Siguiente <ChevronRight size={16} />
                </button>
              </div>
            )}

            <CommentThread capituloId={capituloActual.id} storyAuthorId={story.author_id} user={user} />
          </>
        )}
      </div>

      {reportando && (
        <ReportModal user={user} historiaId={story.id} onClose={() => setReportando(false)} />
      )}

      {modalCapitulo && (
        <PublicarCapituloModal
          story={story}
          editingCapitulo={modalCapitulo.editingCapitulo}
          siguienteNumero={modalCapitulo.siguienteNumero}
          onClose={() => setModalCapitulo(null)}
          onSaved={(capituloGuardado) => {
            cargarCapitulos();
            setCapituloActualId(capituloGuardado.id);
          }}
        />
      )}
      </div>
    </>
  );
}