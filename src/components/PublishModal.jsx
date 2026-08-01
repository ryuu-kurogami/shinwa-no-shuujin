import React, { useState, useEffect, useRef } from "react";
import { X, Feather, ImagePlus } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

const CLOUDINARY_CLOUD_NAME = "ahwle70d";
const CLOUDINARY_UPLOAD_PRESET = "shinwa_portadas";

export default function PublishModal({ user, editingStory, onClose, onSaved }) {
  const isEditing = Boolean(editingStory);
  const [title, setTitle] = useState(editingStory?.title || "");
  const [span, setSpan] = useState(editingStory?.span || "");
  const [excerpt, setExcerpt] = useState(editingStory?.excerpt || "");
  const [content, setContent] = useState(editingStory?.content || "");
  const [portadaUrl, setPortadaUrl] = useState(editingStory?.portada_url || "");
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

  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setErr("El título y el texto son obligatorios.");
      return;
    }
    setSaving(true);
    setErr("");
    try {
      const payload = {
        title: title.trim(),
        span: span.trim() || "instante suspendido",
        excerpt: excerpt.trim() || content.trim().slice(0, 140) + "...",
        content: content.trim(),
        portada_url: portadaUrl || null,
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

        <form onSubmit={submit} className="space-y-4">
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
              Tiempo que abarca (el sello)
            </label>
            <input
              value={span}
              onChange={(e) => setSpan(e.target.value)}
              className="w-full bg-[#1d1824] border border-[#4a3f52] rounded-sm px-3 py-2.5 text-sm text-[#EDE6D6] focus:outline-none focus:ring-1 focus:ring-[#B08D57]"
              style={{ fontFamily: "Lora, serif" }}
              placeholder="ej. 300 años, un solo instante, tres generaciones"
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

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 rounded-sm bg-[#7A2E2E] hover:bg-[#8f3838] disabled:opacity-50 text-[#EDE6D6] font-medium tracking-wide transition-colors"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            {saving ? (isEditing ? "Guardando..." : "Publicando...") : isEditing ? "Guardar cambios" : "Publicar crónica"}
          </button>
        </form>
      </div>
    </div>
  );
}