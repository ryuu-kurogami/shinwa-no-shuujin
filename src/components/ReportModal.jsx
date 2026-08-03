import React, { useState } from "react";
import { X, Flag } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

const MOTIVOS = [
  { value: "contenido_prohibido", label: "Contenido prohibido (menores, no consensual, violencia extrema)" },
  { value: "plagio_interno", label: "Plagio de otro autor del sitio" },
  { value: "plagio_externo", label: "Plagio de una obra externa" },
  { value: "spam", label: "Spam" },
  { value: "otro", label: "Otro" },
];

export default function ReportModal({ user, historiaId, comentarioId, onClose }) {
  const [motivo, setMotivo] = useState("contenido_prohibido");
  const [evidencia, setEvidencia] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [enviado, setEnviado] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErr("");
    try {
      const { error } = await supabase.from("reportes").insert({
        historia_id: historiaId || null,
        comentario_id: comentarioId || null,
        reportado_por: user.id,
        motivo,
        evidencia: evidencia.trim() || null,
      });
      if (error) throw error;
      setEnviado(true);
    } catch {
      setErr("No se pudo enviar el reporte. Probá de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-[#0e0b13]/90 backdrop-blur-sm flex items-center justify-center px-5">
      <div className="max-w-md w-full bg-[#1d1824] border border-[#4a3f52] rounded-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[#EDE6D6] text-lg flex items-center gap-2" style={{ fontFamily: "Fraunces, serif", fontWeight: 600 }}>
            <Flag size={16} className="text-[#7A2E2E]" /> Reportar
          </h3>
          <button onClick={onClose} className="text-[#7d7389] hover:text-[#e08a8a] transition-colors">
            <X size={16} />
          </button>
        </div>

        {enviado ? (
          <p className="text-[#7C8B63] text-sm" style={{ fontFamily: "Lora, serif" }}>
            Reporte enviado. Gracias por ayudar a mantener el archivo seguro.
          </p>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-[#7C8B63] text-xs tracking-wide uppercase mb-1.5" style={{ fontFamily: "Lora, serif" }}>
                Motivo
              </label>
              <select
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                className="w-full bg-[#0f0c14] border border-[#4a3f52] rounded-sm px-3 py-2.5 text-sm text-[#EDE6D6] focus:outline-none focus:ring-1 focus:ring-[#B08D57]"
                style={{ fontFamily: "Lora, serif" }}
              >
                {MOTIVOS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[#7C8B63] text-xs tracking-wide uppercase mb-1.5" style={{ fontFamily: "Lora, serif" }}>
                Evidencia / detalles (opcional)
              </label>
              <textarea
                value={evidencia}
                onChange={(e) => setEvidencia(e.target.value)}
                rows={3}
                className="w-full bg-[#0f0c14] border border-[#4a3f52] rounded-sm px-3 py-2.5 text-sm text-[#EDE6D6] focus:outline-none focus:ring-1 focus:ring-[#B08D57] resize-none"
                style={{ fontFamily: "Lora, serif" }}
                placeholder="Links, capturas, contexto adicional..."
              />
            </div>

            {err && <p className="text-[#e08a8a] text-xs">{err}</p>}

            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 rounded-sm bg-[#7A2E2E] hover:bg-[#8f3838] disabled:opacity-50 text-[#EDE6D6] text-sm font-medium transition-colors"
              style={{ fontFamily: "Fraunces, serif" }}
            >
              {saving ? "Enviando..." : "Enviar reporte"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
