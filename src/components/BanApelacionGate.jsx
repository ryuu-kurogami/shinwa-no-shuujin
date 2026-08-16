import React, { useState } from "react";
import { ShieldAlert, Send } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

// Se muestra cuando hay sesión y profiles.baneado_hasta está en el futuro.
// El baneo sigue activo todo el tiempo — la apelación no lo pausa, solo
// agrega una vía de reclamo (ver Términos, Sección 7.4/7.5). Mismo patrón
// que DeletionPendingGate: una pantalla que bloquea todo lo demás mientras
// la condición esté activa.
export default function BanApelacionGate({
  userId,
  baneadoHasta,
  motivoBaneo,
  apelacionEstado,
  onSignOut,
}) {
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [err, setErr] = useState("");
  const [enviada, setEnviada] = useState(apelacionEstado === "pendiente");

  const esPermanente = baneadoHasta?.startsWith("9999");
  const fecha = !esPermanente
    ? new Date(baneadoHasta).toLocaleDateString("es-ES", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  const enviarApelacion = async (e) => {
    e.preventDefault();
    if (!texto.trim()) return;
    setEnviando(true);
    setErr("");
    const { error } = await supabase
      .from("profiles")
      .update({
        apelacion_estado: "pendiente",
        apelacion_texto: texto.trim(),
        apelacion_creada_en: new Date().toISOString(),
      })
      .eq("id", userId);
    setEnviando(false);
    if (error) {
      setErr("No se pudo enviar la apelación. Probá de nuevo.");
      return;
    }
    setEnviada(true);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#17131C] flex items-center justify-center px-6 overflow-y-auto py-10">
      <div className="max-w-sm w-full text-center">
        <ShieldAlert size={22} className="text-[#7A2E2E] mx-auto mb-5" />
        <h2 className="text-[#EDE6D6] text-2xl mb-3" style={{ fontFamily: "Fraunces, serif", fontWeight: 700 }}>
          Tu cuenta está suspendida
        </h2>
        <p className="text-[#b8afc4] text-sm leading-relaxed mb-2" style={{ fontFamily: "Lora, serif" }}>
          {esPermanente
            ? "Esta suspensión es permanente."
            : `Esta suspensión dura hasta el ${fecha}.`}
        </p>

        {motivoBaneo && (
          <p className="text-[#e8c9a3] text-sm leading-relaxed mb-7 border border-[#4a3f52] rounded-sm p-3.5 text-left" style={{ fontFamily: "Lora, serif" }}>
            <strong className="text-[#7d7389] block text-xs uppercase tracking-wide mb-1">Motivo</strong>
            {motivoBaneo}
          </p>
        )}

        {enviada ? (
          <p className="text-[#7C8B63] text-sm leading-relaxed mb-7" style={{ fontFamily: "Lora, serif" }}>
            Tu apelación está en revisión. Recordá que este es un proyecto de una sola persona — puede tardar
            unos días.
          </p>
        ) : (
          <form onSubmit={enviarApelacion} className="mb-7 text-left">
            <label className="block text-[#7C8B63] text-xs tracking-wide uppercase mb-1.5" style={{ fontFamily: "Lora, serif" }}>
              Si creés que esto es un error, contá por qué
            </label>
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              rows={4}
              maxLength={1500}
              className="w-full bg-[#1d1824] border border-[#4a3f52] rounded-sm px-3 py-2.5 text-sm text-[#EDE6D6] placeholder-[#7d7389] focus:outline-none focus:ring-1 focus:ring-[#B08D57] resize-none mb-3"
              style={{ fontFamily: "Lora, serif" }}
              placeholder="Explicá tu situación con el mayor detalle posible..."
            />
            {err && <p className="text-[#e08a8a] text-xs mb-2">{err}</p>}
            <button
              type="submit"
              disabled={enviando || !texto.trim()}
              className="w-full flex items-center justify-center gap-1.5 py-3 rounded-sm bg-[#7A2E2E] hover:bg-[#8f3838] disabled:opacity-40 transition-colors text-sm text-[#EDE6D6]"
              style={{ fontFamily: "Fraunces, serif" }}
            >
              <Send size={14} /> {enviando ? "Enviando..." : "Enviar apelación"}
            </button>
          </form>
        )}

        <button
          onClick={onSignOut}
          className="text-[#7d7389] hover:text-[#b8afc4] transition-colors text-sm"
          style={{ fontFamily: "Lora, serif" }}
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}