import React, { useState } from "react";
import { X, ShieldAlert, Send } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

// disputa: { id, evidencia, contenido: { title } } — el reporte de plagio en sí
export default function ResponderDisputaModal({ disputa, onClose, onSaved }) {
  const [texto, setTexto] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (!texto.trim()) {
      setErr("Escribí tu respuesta antes de enviar.");
      return;
    }
    setSaving(true);
    setErr("");
    // El GRANT a nivel de columna en la base solo permite tocar
    // evidencia_acusado — no hay forma de que este update toque otra cosa
    // del reporte, aunque el payload incluyera más campos.
    const { error } = await supabase
      .from("reportes")
      .update({ evidencia_acusado: texto.trim() })
      .eq("id", disputa.id);
    setSaving(false);
    if (error) {
      setErr("No se pudo enviar tu respuesta. Probá de nuevo.");
      return;
    }
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0e0b13]/90 backdrop-blur-sm overflow-y-auto">
      <div className="max-w-lg mx-auto px-5 py-10 sm:py-16">
        <button
          onClick={onClose}
          className="mb-6 flex items-center gap-1.5 text-[#B08D57] hover:text-[#e8c9a3] transition-colors text-sm"
          style={{ fontFamily: "Lora, serif" }}
        >
          <X size={16} /> Cancelar
        </button>

        <h2 className="text-[#EDE6D6] text-2xl mb-2 flex items-center gap-2" style={{ fontFamily: "Fraunces, serif", fontWeight: 700 }}>
          <ShieldAlert size={22} className="text-[#7A2E2E]" /> Responder a la disputa
        </h2>
        <p className="text-[#7d7389] text-sm mb-6" style={{ fontFamily: "Lora, serif" }}>
          Otro autor acusó de plagio a tu historia <strong className="text-[#b8afc4]">"{disputa.title}"</strong>.
          El Administrador va a evaluar la evidencia de las dos partes antes de tomar una decisión (Términos,
          Sección 7.1).
        </p>

        {disputa.evidencia && (
          <div className="border border-[#4a3f52] rounded-sm p-3.5 mb-6">
            <p className="text-[#7d7389] text-xs uppercase tracking-wide mb-1.5" style={{ fontFamily: "Lora, serif" }}>
              Evidencia presentada en tu contra
            </p>
            <p className="text-[#c9c1d4] text-sm leading-relaxed" style={{ fontFamily: "Lora, serif" }}>
              {disputa.evidencia}
            </p>
          </div>
        )}

        <form onSubmit={submit} className="space-y-3">
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={6}
            placeholder="Explicá tu versión — por ejemplo, fechas de publicación, links a borradores previos, o cualquier evidencia que respalde que la obra es tuya..."
            className="w-full bg-[#1d1824] border border-[#4a3f52] rounded-sm px-3 py-2.5 text-sm text-[#EDE6D6] placeholder-[#7d7389] focus:outline-none focus:ring-1 focus:ring-[#B08D57] resize-none"
            style={{ fontFamily: "Lora, serif" }}
          />
          {err && <p className="text-[#e08a8a] text-sm">{err}</p>}
          <button
            type="submit"
            disabled={saving || !texto.trim()}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-sm bg-[#7A2E2E] hover:bg-[#8f3838] disabled:opacity-50 text-[#EDE6D6] font-medium tracking-wide transition-colors"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            <Send size={15} /> {saving ? "Enviando..." : "Enviar mi respuesta"}
          </button>
        </form>
      </div>
    </div>
  );
}