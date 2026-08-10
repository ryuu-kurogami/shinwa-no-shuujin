import React, { useState, useEffect, useRef } from "react";
import { X, Flag } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY;

const MOTIVOS = [
  { value: "contenido_prohibido", label: "Contenido prohibido (menores, no consensual, violencia extrema)" },
  { value: "plagio_interno", label: "Plagio de otro autor del sitio" },
  { value: "plagio_externo", label: "Plagio de una obra externa" },
  { value: "spam", label: "Spam" },
  { value: "otro", label: "Otro" },
];

// "user" es opcional a propósito — reportar no exige cuenta (Términos,
// Sección 7.2). El captcha + el rate limiting del lado del servidor son la
// defensa contra que esto se use para tumbar cuentas legítimas en masa.
export default function ReportModal({ user, historiaId, comentarioId, onClose }) {
  const [motivo, setMotivo] = useState("contenido_prohibido");
  const [evidencia, setEvidencia] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [captchaToken, setCaptchaToken] = useState(null);
  const widgetRef = useRef(null);
  const turnstileId = useRef(null);

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY || !window.turnstile || !widgetRef.current) return;
    turnstileId.current = window.turnstile.render(widgetRef.current, {
      sitekey: TURNSTILE_SITE_KEY,
      theme: "dark",
      callback: (token) => setCaptchaToken(token),
      "expired-callback": () => setCaptchaToken(null),
      "error-callback": () => setCaptchaToken(null),
    });
    return () => {
      if (turnstileId.current && window.turnstile) {
        window.turnstile.remove(turnstileId.current);
      }
    };
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (TURNSTILE_SITE_KEY && !captchaToken) {
      setErr("Completá el captcha antes de enviar.");
      return;
    }
    setSaving(true);
    setErr("");
    try {
      const { error } = await supabase.functions.invoke("submit-report", {
        body: {
          token: captchaToken,
          historia_id: historiaId || null,
          comentario_id: comentarioId || null,
          motivo,
          evidencia: evidencia.trim() || null,
        },
      });
      if (error) throw error;
      setEnviado(true);
    } catch (error) {
      // Igual que en comentarios: leer el body real del error (rate limit,
      // captcha, baneo) en vez de mostrar siempre un mensaje genérico.
      let mensaje = "No se pudo enviar el reporte. Probá de nuevo.";
      try {
        const body = await error?.context?.json();
        if (body?.error) mensaje = body.error;
      } catch {
        // sin body legible, nos quedamos con el genérico
      }
      setErr(mensaje);
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

        {!user && (
          <p className="text-[#7d7389] text-xs mb-4" style={{ fontFamily: "Lora, serif" }}>
            Estás reportando sin una cuenta — tu reporte se envía igual, de forma anónima.
          </p>
        )}

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
                maxLength={2000}
                className="w-full bg-[#0f0c14] border border-[#4a3f52] rounded-sm px-3 py-2.5 text-sm text-[#EDE6D6] focus:outline-none focus:ring-1 focus:ring-[#B08D57] resize-none"
                style={{ fontFamily: "Lora, serif" }}
                placeholder="Links, capturas, contexto adicional..."
              />
            </div>

            {TURNSTILE_SITE_KEY && <div ref={widgetRef} />}

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