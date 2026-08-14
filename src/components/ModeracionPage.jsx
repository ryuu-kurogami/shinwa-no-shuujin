import React, { useState, useEffect, useRef } from "react";
import { X, Feather, ImagePlus, ShieldAlert } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import AgeGate, { edad18YaConfirmada, confirmarEdad18 } from "./AgeGate";
import { contarPalabras, contarCaracteres } from "../utils/textoStats";

const CLOUDINARY_CLOUD_NAME = "ahwle70d";
const CLOUDINARY_UPLOAD_PRESET = "shinwa_portadas";

const ESTADOS_PUBLICACION = [
  { value: "en_emision", label: "En emisión" },
  { value: "en_pausa", label: "En pausa" },
  { value: "finalizado", label: "Finalizado" },
];

// Este modal ahora cubre tres casos distintos:
// 1. Historia nueva → crea la fila en `stories` y su capítulo 1 juntos.
// 2. Editar una historia cuyo capítulo 1 sigue en borrador ("continuar
//    escribiendo") → edita metadatos y el texto del capítulo 1 a la vez.
// 3. Editar una historia cuyo capítulo 1 ya está publicado/en revisión →
//    solo metadatos, el texto de los capítulos se edita desde
//    PublicarCapituloModal (agregar capítulos nuevos vive ahí también).
export default function PublishModal({ user, editingStory, onClose, onSaved }) {
  const isEditing = Boolean(editingStory);
  const [title, setTitle] = useState(editingStory?.title || "");
  const [fraseIconica, setFraseIconica] = useState(editingStory?.frase_iconica || "");
  const [categoria, setCategoria] = useState(editingStory?.categoria || "corto");
  const [estadoPublicacion, setEstadoPublicacion] = useState(editingStory?.estado_publicacion || "en_emision");
  const [tagsInput, setTagsInput] = useState((editingStory?.tags || []).join(", "));
  const [excerpt, setExcerpt] = useState(editingStory?.excerpt || "");
  const [content, setContent] = useState("");
  const [tituloCapitulo, setTituloCapitulo] = useState("");
  const [portadaUrl, setPortadaUrl] = useState(editingStory?.portada_url || "");
  const [esAdulto, setEsAdulto] = useState(editingStory?.es_adulto || false);
  const [declaracion18, setDeclaracion18] = useState(editingStory?.declaracion_18_ok || false);
  const [mostrarGateAutor, setMostrarGateAutor] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const [capituloUno, setCapituloUno] = useState(null);
  const [cargandoCapitulo, setCargandoCapitulo] = useState(isEditing);

  const widgetRef = useRef(null);

  // Al editar, necesitamos saber si el capítulo 1 todavía está en borrador
  // (en cuyo caso su texto se edita acá mismo) o ya está publicado/en
  // revisión (en cuyo caso este modal es solo metadatos).
  useEffect(() => {
    if (!editingStory) return;
    supabase
      .from("capitulos")
      .select("id, content, titulo, estado")
      .eq("story_id", editingStory.id)
      .eq("numero", 1)
      .maybeSingle()
      .then(({ data }) => {
        setCapituloUno(data);
        if (data?.estado === "borrador") {
          setContent(data.content || "");
          setTituloCapitulo(data.titulo || "");
        }
        setCargandoCapitulo(false);
      });
  }, [editingStory]);

  const esBorradorSinTerminar = isEditing && capituloUno?.estado === "borrador";
  const mostrarEditorDeTexto = !isEditing || esBorradorSinTerminar;

  // Carga el script del Upload Widget de Cloudinary una sola vez
  useEffect(() => {
    if (window.cloudinary) return;
    const script = document.createElement("script");
    script.src = "https://upload-widget.cloudinary.com/global/all.js";
    script.async = true;
    document.body.appendChild(script);
  }, []);

  const openUploadWidget = () => {
    if (!window.cloudinary) {
      setErr("El widget de portadas todavía está cargando, esperá un segundo y probá de nuevo.");
      return;
    }
    if (!widgetRef.current) {
      widgetRef.current = window.cloudinary.createUploadWidget(
        {
          cloudName: CLOUDINARY_CLOUD_NAME,
          uploadPreset: CLOUDINARY_UPLOAD_PRESET,
          sources: ["local", "url", "camera"],
          multiple: false,
          maxFileSize: 5_000_000, // 5MB
          cropping: true,
          croppingAspectRatio: 1, // cuadrada, coherente con el sello circular
          language: "es",
          text: {
            es: {
              crop: { title: "Recortá tu portada" },
              local: { browse: "Elegir archivo", dd_title_single: "Arrastrá tu imagen acá" },
            },
          },
        },
        (uploadError, result) => {
          if (uploadError) {
            setErr("No se pudo subir la portada. Probá de nuevo.");
            return;
          }
          if (result?.event === "success") {
            setPortadaUrl(result.info.secure_url);
            setErr("");
          }
        }
      );
    }
    widgetRef.current.open();
  };

  const submit = async (e, estadoDestino) => {
    e.preventDefault();
    if (!title.trim()) {
      setErr("El título es obligatorio.");
      return;
    }
    if (mostrarEditorDeTexto && !content.trim()) {
      setErr("El texto del capítulo 1 es obligatorio.");
      return;
    }
    if (esAdulto && !declaracion18) {
      setErr("Para marcar la historia como contenido +18 tenés que confirmar la declaración del autor (ver Términos, Sección 4.4).");
      return;
    }
    setSaving(true);
    setErr("");
    try {
      const metadatos = {
        title: title.trim(),
        span: editingStory?.span || "instante suspendido", // legado, ya no se muestra en el sello
        frase_iconica: fraseIconica.trim().slice(0, 60) || "Instante suspendido",
        categoria,
        estado_publicacion: estadoPublicacion,
        tags: tagsInput
          .split(",")
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean)
          .slice(0, 10), // límite razonable, evita spam de tags
        excerpt:
          excerpt.trim() ||
          (mostrarEditorDeTexto ? content.trim().slice(0, 140) + "..." : editingStory?.excerpt || ""),
        portada_url: portadaUrl || null,
        es_adulto: esAdulto,
        declaracion_18_ok: esAdulto ? declaracion18 : false,
      };

      if (!isEditing) {
        // Contenido +18 (ver Términos, Sección 4.5): mientras el Sitio tenga
        // volumen reducido de usuarios, se revisa manualmente antes de
        // publicarse — "Publicar" no lo saca directo a producción.
        const estadoFinal = esAdulto && estadoDestino === "publicado" ? "pendiente_revision" : estadoDestino;

        const { data: nuevaHistoria, error: errHistoria } = await supabase
          .from("stories")
          .insert({
            ...metadatos,
            author_id: user.id,
            author_name: user.user_metadata?.full_name || user.email,
            estado: estadoFinal,
          })
          .select()
          .single();
        if (errHistoria) throw errHistoria;

        const { error: errCapitulo } = await supabase
          .from("capitulos")
          .insert({
            story_id: nuevaHistoria.id,
            numero: 1,
            titulo: tituloCapitulo.trim() || null,
            content: content.trim(),
            estado: estadoFinal,
          });
        if (errCapitulo) {
          // No dejamos una historia fantasma sin ningún capítulo.
          await supabase.from("stories").delete().eq("id", nuevaHistoria.id);
          throw errCapitulo;
        }

        onSaved(nuevaHistoria);
        onClose();
      } else if (esBorradorSinTerminar) {
        const estadoFinal = esAdulto && estadoDestino === "publicado" ? "pendiente_revision" : estadoDestino;

        const { data: historiaActualizada, error: errHistoria } = await supabase
          .from("stories")
          .update({ ...metadatos, estado: estadoFinal })
          .eq("id", editingStory.id)
          .select()
          .single();
        if (errHistoria) throw errHistoria;

        const { error: errCapitulo } = await supabase
          .from("capitulos")
          .update({ titulo: tituloCapitulo.trim() || null, content: content.trim(), estado: estadoFinal })
          .eq("id", capituloUno.id);
        if (errCapitulo) throw errCapitulo;

        onSaved(historiaActualizada);
        onClose();
      } else {
        // Solo metadatos — el texto de los capítulos ya publicados se edita
        // aparte, desde PublicarCapituloModal.
        const { data: historiaActualizada, error } = await supabase
          .from("stories")
          .update(metadatos)
          .eq("id", editingStory.id)
          .select()
          .single();
        if (error) throw error;
        onSaved(historiaActualizada);
        onClose();
      }
    } catch {
      setErr(isEditing ? "No se pudo guardar el cambio. Probá de nuevo." : "No se pudo publicar. Probá de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  if (isEditing && cargandoCapitulo) {
    return (
      <div className="fixed inset-0 z-50 bg-[#0e0b13]/90 backdrop-blur-sm flex items-center justify-center">
        <p className="text-[#7d7389]" style={{ fontFamily: "Lora, serif" }}>
          Cargando...
        </p>
      </div>
    );
  }

  if (isEditing && editingStory.congelada) {
    return (
      <div className="fixed inset-0 z-50 bg-[#0e0b13]/90 backdrop-blur-sm flex items-center justify-center px-5">
        <div className="max-w-sm w-full text-center border border-[#7A2E2E] rounded-sm p-6 bg-[#1d1824]">
          <ShieldAlert size={22} className="text-[#e08a8a] mx-auto mb-3" />
          <p className="text-[#e08a8a] text-sm leading-relaxed mb-5" style={{ fontFamily: "Lora, serif" }}>
            Esta obra está congelada por tener un reporte en revisión. No se puede editar hasta que el equipo
            de moderación lo resuelva.
          </p>
          <button
            onClick={onClose}
            className="text-[#B08D57] hover:text-[#e8c9a3] transition-colors text-sm"
            style={{ fontFamily: "Lora, serif" }}
          >
            Entendido
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#0e0b13]/90 backdrop-blur-sm overflow-y-auto">
      <div className="max-w-xl mx-auto px-5 py-10 sm:py-16">
        <button
          onClick={onClose}
          className="mb-6 flex items-center gap-1.5 text-[#B08D57] hover:text-[#e8c9a3] transition-colors text-sm"
          style={{ fontFamily: "Lora, serif" }}
        >
          <X size={16} /> Cancelar
        </button>

        <h2 className="text-[#EDE6D6] text-2xl mb-6 flex items-center gap-2" style={{ fontFamily: "Fraunces, serif", fontWeight: 700 }}>
          <Feather size={22} className="text-[#7C8B63]" />{" "}
          {!isEditing ? "Nueva crónica" : esBorradorSinTerminar ? "Continuar escribiendo" : "Editar datos de la crónica"}
        </h2>

        <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
          <div>
            <label className="block text-[#7C8B63] text-xs tracking-wide uppercase mb-1.5" style={{ fontFamily: "Lora, serif" }}>
              Portada
            </label>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={openUploadWidget}
                className="flex items-center gap-1.5 px-3 py-2 rounded-sm border border-[#4a3f52] text-[#B08D57] hover:text-[#e8c9a3] hover:border-[#B08D57] transition-colors text-sm"
                style={{ fontFamily: "Lora, serif" }}
              >
                <ImagePlus size={15} /> {portadaUrl ? "Cambiar portada" : "Subir portada"}
              </button>
              {portadaUrl && (
                <img
                  src={portadaUrl}
                  alt="Vista previa de la portada"
                  className="w-14 h-14 rounded-sm object-cover border border-[#4a3f52]"
                />
              )}
            </div>
          </div>

          <div>
            <label className="block text-[#7C8B63] text-xs tracking-wide uppercase mb-1.5" style={{ fontFamily: "Lora, serif" }}>
              Categoría
            </label>
            <div className="flex gap-2">
              {[
                { value: "corto", label: "Corto" },
                { value: "novela", label: "Novela" },
                { value: "fanfic", label: "Fanfic" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setCategoria(opt.value)}
                  className={`px-3 py-1.5 rounded-sm border text-sm transition-colors ${
                    categoria === opt.value
                      ? "border-[#B08D57] text-[#e8c9a3] bg-[#B08D57]/10"
                      : "border-[#4a3f52] text-[#7d7389] hover:text-[#b8afc4]"
                  }`}
                  style={{ fontFamily: "Lora, serif" }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {categoria === "fanfic" && (
              <p className="text-[#7d7389] text-xs mt-2" style={{ fontFamily: "Lora, serif" }}>
                Al publicar contenido de fanfic, tu opción de apoyo económico queda desactivada mientras esta
                obra exista (Términos, Sección 5.3).
              </p>
            )}
          </div>

          <div>
            <label className="block text-[#7C8B63] text-xs tracking-wide uppercase mb-1.5" style={{ fontFamily: "Lora, serif" }}>
              Estado de emisión
            </label>
            <div className="flex gap-2">
              {ESTADOS_PUBLICACION.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setEstadoPublicacion(opt.value)}
                  className={`px-3 py-1.5 rounded-sm border text-sm transition-colors ${
                    estadoPublicacion === opt.value
                      ? "border-[#7C8B63] text-[#c3d1a8] bg-[#7C8B63]/10"
                      : "border-[#4a3f52] text-[#7d7389] hover:text-[#b8afc4]"
                  }`}
                  style={{ fontFamily: "Lora, serif" }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="border border-[#4a3f52] rounded-sm p-3.5">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={esAdulto}
                onChange={(e) => {
                  const checked = e.target.checked;
                  if (checked && !edad18YaConfirmada()) {
                    // El autor también tiene que declarar su propia mayoría
                    // de edad, no solo advertir a quien lee (ver 4.2/4.4).
                    setMostrarGateAutor(true);
                    return;
                  }
                  setEsAdulto(checked);
                  if (!checked) setDeclaracion18(false);
                }}
                className="w-4 h-4 accent-[#7A2E2E]"
              />
              <span className="flex items-center gap-1.5 text-[#e8c9a3] text-sm" style={{ fontFamily: "Lora, serif" }}>
                <ShieldAlert size={15} /> Contenido para mayores de edad (+18)
              </span>
            </label>

            {esAdulto && (
              <div className="mt-3 pl-6.5">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={declaracion18}
                    onChange={(e) => setDeclaracion18(e.target.checked)}
                    className="w-4 h-4 mt-0.5 shrink-0 accent-[#7A2E2E]"
                  />
                  <span className="text-[#b8afc4] text-xs leading-relaxed" style={{ fontFamily: "Lora, serif" }}>
                    Declaro que esta obra no contiene lo prohibido en la Sección 4.3 de los Términos y
                    Condiciones (contenido sexual que involucre a menores bajo cualquier justificación,
                    contenido sexual no consensuado presentado de forma que lo promueva, ni violencia
                    extrema gratuita fuera de contexto narrativo).
                  </span>
                </label>
                <p className="text-[#7d7389] text-xs mt-2" style={{ fontFamily: "Lora, serif" }}>
                  Cada capítulo nuevo de una obra +18 pasa por revisión antes de quedar visible (Sección 4.5).
                  Además, tu opción de apoyo económico queda desactivada mientras esta obra exista.
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-[#7C8B63] text-xs tracking-wide uppercase mb-1.5" style={{ fontFamily: "Lora, serif" }}>
              Tags / géneros (separados por coma)
            </label>
            <input
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="w-full bg-[#1d1824] border border-[#4a3f52] rounded-sm px-3 py-2.5 text-sm text-[#EDE6D6] focus:outline-none focus:ring-1 focus:ring-[#B08D57]"
              style={{ fontFamily: "Lora, serif" }}
              placeholder="fantasía, terror, viajes en el tiempo"
            />
          </div>

          <div>
            <label className="block text-[#7C8B63] text-xs tracking-wide uppercase mb-1.5" style={{ fontFamily: "Lora, serif" }}>
              Título
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-[#1d1824] border border-[#4a3f52] rounded-sm px-3 py-2.5 text-[#EDE6D6] focus:outline-none focus:ring-1 focus:ring-[#B08D57]"
              style={{ fontFamily: "Fraunces, serif" }}
              placeholder="El día que el cielo olvidó su nombre"
            />
          </div>

          <div>
            <label className="block text-[#7C8B63] text-xs tracking-wide uppercase mb-1.5" style={{ fontFamily: "Lora, serif" }}>
              Frase icónica (el sello) — máx. 60 caracteres
            </label>
            <input
              value={fraseIconica}
              onChange={(e) => setFraseIconica(e.target.value.slice(0, 60))}
              maxLength={60}
              className="w-full bg-[#1d1824] border border-[#4a3f52] rounded-sm px-3 py-2.5 text-sm text-[#EDE6D6] focus:outline-none focus:ring-1 focus:ring-[#B08D57]"
              style={{ fontFamily: "Lora, serif" }}
              placeholder="ej. Donde el tiempo dejó de contar"
            />
          </div>

          <div>
            <label className="block text-[#7C8B63] text-xs tracking-wide uppercase mb-1.5" style={{ fontFamily: "Lora, serif" }}>
              Adelanto (se muestra en la portada)
            </label>
            <textarea
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              rows={2}
              className="w-full bg-[#1d1824] border border-[#4a3f52] rounded-sm px-3 py-2.5 text-sm text-[#EDE6D6] focus:outline-none focus:ring-1 focus:ring-[#B08D57] resize-none"
              style={{ fontFamily: "Lora, serif" }}
              placeholder="Dejalo vacío para generarlo automáticamente del texto"
            />
          </div>

          {mostrarEditorDeTexto && (
            <div>
              <label className="block text-[#7C8B63] text-xs tracking-wide uppercase mb-1.5" style={{ fontFamily: "Lora, serif" }}>
                Nombre del capítulo 1 (opcional)
              </label>
              <input
                value={tituloCapitulo}
                onChange={(e) => setTituloCapitulo(e.target.value)}
                className="w-full bg-[#1d1824] border border-[#4a3f52] rounded-sm px-3 py-2.5 text-[#EDE6D6] focus:outline-none focus:ring-1 focus:ring-[#B08D57] mb-4"
                style={{ fontFamily: "Fraunces, serif" }}
                placeholder='ej. Prólogo — vacío se muestra como "Capítulo 1"'
              />

              <label className="block text-[#7C8B63] text-xs tracking-wide uppercase mb-1.5" style={{ fontFamily: "Lora, serif" }}>
                Texto del capítulo 1
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={12}
                className="w-full bg-[#1d1824] border border-[#4a3f52] rounded-sm px-3 py-2.5 text-[15px] text-[#EDE6D6] focus:outline-none focus:ring-1 focus:ring-[#B08D57] leading-relaxed"
                style={{ fontFamily: "Lora, serif" }}
                placeholder="El manto pesaba como plomo fundido..."
              />
              <p className="text-[#7d7389] text-xs mt-1.5" style={{ fontFamily: "Lora, serif" }}>
                {contarPalabras(content).toLocaleString("es")} palabras · {contarCaracteres(content).toLocaleString("es")} caracteres
              </p>
            </div>
          )}

          {!mostrarEditorDeTexto && (
            <p className="text-[#7d7389] text-xs" style={{ fontFamily: "Lora, serif" }}>
              El texto de los capítulos se edita desde la lista de capítulos, en la pestaña Escribir.
            </p>
          )}

          {err && <p className="text-[#e08a8a] text-sm">{err}</p>}

          {mostrarEditorDeTexto ? (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={(e) => submit(e, "borrador")}
                disabled={saving}
                className="flex-1 py-3 rounded-sm border border-[#4a3f52] hover:border-[#B08D57] disabled:opacity-50 text-[#b8afc4] hover:text-[#e8c9a3] font-medium tracking-wide transition-colors"
                style={{ fontFamily: "Fraunces, serif" }}
              >
                {saving ? "Guardando..." : "Guardar borrador"}
              </button>
              <button
                type="button"
                onClick={(e) => submit(e, "publicado")}
                disabled={saving}
                className="flex-1 py-3 rounded-sm bg-[#7A2E2E] hover:bg-[#8f3838] disabled:opacity-50 text-[#EDE6D6] font-medium tracking-wide transition-colors"
                style={{ fontFamily: "Fraunces, serif" }}
              >
                {saving ? "Guardando..." : esAdulto ? "Enviar a revisión" : isEditing ? "Guardar y publicar" : "Publicar crónica"}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={(e) => submit(e, null)}
              disabled={saving}
              className="w-full py-3 rounded-sm bg-[#7A2E2E] hover:bg-[#8f3838] disabled:opacity-50 text-[#EDE6D6] font-medium tracking-wide transition-colors"
              style={{ fontFamily: "Fraunces, serif" }}
            >
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
          )}
        </form>
      </div>

      {mostrarGateAutor && (
        <AgeGate
          onConfirm={() => {
            confirmarEdad18();
            setEsAdulto(true);
            setMostrarGateAutor(false);
          }}
          onDecline={() => setMostrarGateAutor(false)}
        />
      )}
    </div>
  );
}