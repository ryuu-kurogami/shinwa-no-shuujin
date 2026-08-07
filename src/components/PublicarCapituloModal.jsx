import React, { useState } from "react";
import { X, Feather, ShieldAlert } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { contarPalabras, contarCaracteres } from "../utils/textoStats";

// story: la obra a la que pertenece (necesita id y es_adulto)
// editingCapitulo: si viene, se edita ese capítulo en vez de crear uno nuevo
// siguienteNumero: número que le corresponde al próximo capítulo (solo se usa si no se está editando)
export default function PublicarCapituloModal({ story, editingCapitulo, siguienteNumero, onClose, onSaved }) {
  const isEditing = Boolean(editingCapitulo);
  const [titulo, setTitulo] = useState(editingCapitulo?.titulo || "");
  const [content, setContent] = useState(editingCapitulo?.content || "");
  const [declaracion18, setDeclaracion18] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e, estadoDestino) => {
    e.preventDefault();
    if (!content.trim()) {
      setErr("El texto del capítulo es obligatorio.");
      return;
    }
    if (story.es_adulto && estadoDestino === "publicado" && !declaracion18) {
      setErr("Confirmá la declaración antes de enviar este capítulo a revisión.");
      return;
    }
    setSaving(true);
    setErr("");
    try {
      // La obra ya es +18 (eso se decide a nivel de la obra completa, no
      // por capítulo) — cada capítulo nuevo que se intenta publicar pasa
      // por revisión igual, como con la historia misma (Sección 4.5).
      const estadoFinal = story.es_adulto && estadoDestino === "publicado" ? "pendiente_revision" : estadoDestino;

      const payload = {
        titulo: titulo.trim() || null,
        content: content.trim(),
        estado: estadoFinal,
      };

      const query = isEditing
        ? supabase.from("capitulos").update(payload).eq("id", editingCapitulo.id)
        : supabase.from("capitulos").insert({ ...payload, story_id: story.id, numero: siguienteNumero });

      const { data, error } = await query.select().single();
      if (error) throw error;
      onSaved(data);
      onClose();
    } catch {
      setErr("No se pudo guardar. Probá de nuevo.");
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

        <h2 className="text-[#EDE6D6] text-2xl mb-1 flex items-center gap-2" style={{ fontFamily: "Fraunces, serif", fontWeight: 700 }}>
          <Feather size={22} className="text-[#7C8B63]" />{" "}
          {isEditing ? `Editar capítulo ${editingCapitulo.numero}` : `Nuevo capítulo ${siguienteNumero}`}
        </h2>
        <p className="text-[#7d7389] text-sm mb-6" style={{ fontFamily: "Lora, serif" }}>
          {story.title}
        </p>

        <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
          <div>
            <label className="block text-[#7C8B63] text-xs tracking-wide uppercase mb-1.5" style={{ fontFamily: "Lora, serif" }}>
              Nombre de este capítulo (opcional)
            </label>
            <input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              className="w-full bg-[#1d1824] border border-[#4a3f52] rounded-sm px-3 py-2.5 text-[#EDE6D6] focus:outline-none focus:ring-1 focus:ring-[#B08D57]"
              style={{ fontFamily: "Fraunces, serif" }}
              placeholder={`ej. El regreso, o Prólogo — vacío se muestra como "Capítulo ${isEditing ? editingCapitulo.numero : siguienteNumero}"`}
            />
          </div>

          <div>
            <label className="block text-[#7C8B63] text-xs tracking-wide uppercase mb-1.5" style={{ fontFamily: "Lora, serif" }}>
              Texto
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={14}
              className="w-full bg-[#1d1824] border border-[#4a3f52] rounded-sm px-3 py-2.5 text-[15px] text-[#EDE6D6] focus:outline-none focus:ring-1 focus:ring-[#B08D57] leading-relaxed"
              style={{ fontFamily: "Lora, serif" }}
              placeholder="El capítulo continúa..."
            />
            <p className="text-[#7d7389] text-xs mt-1.5" style={{ fontFamily: "Lora, serif" }}>
              {contarPalabras(content).toLocaleString("es")} palabras · {contarCaracteres(content).toLocaleString("es")} caracteres
            </p>
          </div>

          {story.es_adulto && (
            <div className="border border-[#4a3f52] rounded-sm p-3.5">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={declaracion18}
                  onChange={(e) => setDeclaracion18(e.target.checked)}
                  className="w-4 h-4 mt-0.5 shrink-0 accent-[#7A2E2E]"
                />
                <span className="flex items-start gap-1.5 text-[#b8afc4] text-xs leading-relaxed" style={{ fontFamily: "Lora, serif" }}>
                  <ShieldAlert size={13} className="text-[#e8c9a3] shrink-0 mt-0.5" />
                  Declaro que este capítulo no contiene lo prohibido en la Sección 4.3 de los Términos. Al
                  enviarlo, pasa a revisión antes de quedar visible (Sección 4.5).
                </span>
              </label>
            </div>
          )}

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
              {saving ? "Guardando..." : story.es_adulto ? "Enviar a revisión" : "Publicar capítulo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}