import React, { useState, useEffect, useRef } from "react";
import { X, Feather, ImagePlus, ShieldAlert } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import AgeGate, { edad18YaConfirmada, confirmarEdad18 } from "./AgeGate";

const CLOUDINARY_CLOUD_NAME = "ahwle70d";
const CLOUDINARY_UPLOAD_PRESET = "shinwa_portadas";

export default function PublishModal({ user, editingStory, onClose, onSaved }) {
  const isEditing = Boolean(editingStory);
  const [title, setTitle] = useState(editingStory?.title || "");
  const [fraseIconica, setFraseIconica] = useState(editingStory?.frase_iconica || "");
  const [categoria, setCategoria] = useState(editingStory?.categoria || "corto");
  const [tagsInput, setTagsInput] = useState((editingStory?.tags || []).join(", "));
  const [excerpt, setExcerpt] = useState(editingStory?.excerpt || "");
  const [content, setContent] = useState(editingStory?.content || "");
  const [portadaUrl, setPortadaUrl] = useState(editingStory?.portada_url || "");
  const [esAdulto, setEsAdulto] = useState(editingStory?.es_adulto || false);
  const [declaracion18, setDeclaracion18] = useState(editingStory?.declaracion_18_ok || false);
  const [mostrarGateAutor, setMostrarGateAutor] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const widgetRef = useRef(null);

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
    if (!title.trim() || !content.trim()) {
      setErr("El título y el texto son obligatorios.");
      return;
    }
    if (esAdulto && !declaracion18) {
      setErr("Para marcar la historia como contenido +18 tenés que confirmar la declaración del autor (ver Términos, Sección 4.4).");
      return;
    }
    setSaving(true);
    setErr("");
    try {
      // Contenido +18 (ver Términos, Sección 4.5): mientras el Sitio tenga
      // volumen reducido de usuarios, se revisa manualmente antes de
      // publicarse — así que "Publicar" no lo saca directo a producción,
      // lo manda a pendiente_revision. Guardar como borrador nunca dispara
      // esto: solo aplica al intentar publicar.
      const estadoFinal = esAdulto && estadoDestino === "publicado" ? "pendiente_revision" : estadoDestino;

      const payload = {
        title: title.trim(),
        span: editingStory?.span || "instante suspendido", // legado, ya no se muestra en el sello
        frase_iconica: fraseIconica.trim().slice(0, 60) || "Instante suspendido",
        categoria,
        tags: tagsInput
          .split(",")
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean)
          .slice(0, 10), // límite razonable, evita spam de tags
        excerpt: excerpt.trim() || content.trim().slice(0, 140) + "...",
        content: content.trim(),
        portada_url: portadaUrl || null,
        es_adulto: esAdulto,
        declaracion_18_ok: esAdulto ? declaracion18 : false,
        estado: estadoFinal,
      };

      // La base de datos (RLS) ya exige que auth.uid() sea el autor para
      // poder editar o borrar — esto es la UI, la seguridad real está en
      // supabase-schema.sql, así que aunque alguien manipule el frontend
      // no puede editar una historia ajena.
      const query = isEditing
        ? supabase.from("stories").update(payload).eq("id", editingStory.id)
        : supabase.from("stories").insert({
            ...payload,
            author_id: user.id,
            author_name: user.user_metadata?.full_name || user.email,
          });

      const { data, error } = await query.select().single();
      if (error) throw error;
      onSaved(data);
      onClose();
    } catch {
      setErr(isEditing ? "No se pudo guardar el cambio. Probá de nuevo." : "No se pudo publicar. Probá de nuevo.");
    } finally {
      setSaving(false);
    }
  };

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
          <Feather size={22} className="text-[#7C8B63]" /> {isEditing ? "Editar crónica" : "Nueva crónica"}
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
                  Al publicar, esta historia pasará a revisión antes de quedar visible públicamente (Sección 4.5).
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

          <div>
            <label className="block text-[#7C8B63] text-xs tracking-wide uppercase mb-1.5" style={{ fontFamily: "Lora, serif" }}>
              Texto completo
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={12}
              className="w-full bg-[#1d1824] border border-[#4a3f52] rounded-sm px-3 py-2.5 text-[15px] text-[#EDE6D6] focus:outline-none focus:ring-1 focus:ring-[#B08D57] leading-relaxed"
              style={{ fontFamily: "Lora, serif" }}
              placeholder="El manto pesaba como plomo fundido..."
            />
          </div>

          {err && <p className="text-[#e08a8a] text-sm">{err}</p>}

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
              {saving
                ? "Guardando..."
                : esAdulto
                ? "Enviar a revisión"
                : isEditing
                ? "Guardar y publicar"
                : "Publicar crónica"}
            </button>
          </div>
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