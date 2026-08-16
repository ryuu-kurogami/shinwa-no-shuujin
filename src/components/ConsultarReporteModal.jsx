import React, { useState } from "react";
import { X, KeyRound, Search } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

const ESTADO_COLOR = {
  pendiente: "text-[#e8c9a3]",
  resuelto: "text-[#c3d1a8]",
};

export default function ConsultarReporteModal({ onClose }) {
  const [codigo, setCodigo] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [err, setErr] = useState("");

  const consultar = async (e) => {
    e.preventDefault();
    if (!codigo.trim()) return;
    setBuscando(true);
    setErr("");
    setResultado(null);
    try {
      const { data, error } = await supabase.functions.invoke("consultar-reporte", {
        body: { codigo: codigo.trim() },
      });
      if (error) throw error;
      setResultado(data);
    } catch (error) {
      let mensaje = "No se pudo consultar el reporte. Probá de nuevo.";
      try {
        const body = await error?.context?.json();
        if (body?.error) mensaje = body.error;
      } catch {
        // sin body legible, nos quedamos con el genérico
      }
      setErr(mensaje);
    } finally {
      setBuscando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-[#0e0b13]/90 backdrop-blur-sm flex items-center justify-center px-5">
      <div className="max-w-md w-full bg-[#1d1824] border border-[#4a3f52] rounded-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[#EDE6D6] text-lg flex items-center gap-2" style={{ fontFamily: "Fraunces, serif", fontWeight: 600 }}>
            <KeyRound size={16} className="text-[#B08D57]" /> Verificar mi reporte
          </h3>
          <button onClick={onClose} className="text-[#7d7389] hover:text-[#e08a8a] transition-colors">
            <X size={16} />
          </button>
        </div>

        <p className="text-[#7d7389] text-xs mb-4" style={{ fontFamily: "Lora, serif" }}>
          Pegá el código que te mostramos al enviar tu reporte de forma anónima.
        </p>

        <form onSubmit={consultar} className="space-y-3">
          <input
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.toUpperCase())}
            placeholder="ej. 7K4M9XQ2"
            maxLength={12}
            className="w-full bg-[#0f0c14] border border-[#4a3f52] rounded-sm px-3 py-2.5 text-sm text-[#EDE6D6] placeholder-[#7d7389] tracking-[0.1em] focus:outline-none focus:ring-1 focus:ring-[#B08D57]"
            style={{ fontFamily: "Lora, serif" }}
          />

          {err && <p className="text-[#e08a8a] text-xs">{err}</p>}

          <button
            type="submit"
            disabled={buscando || !codigo.trim()}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-sm bg-[#7A2E2E] hover:bg-[#8f3838] disabled:opacity-50 text-[#EDE6D6] text-sm font-medium transition-colors"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            <Search size={14} /> {buscando ? "Buscando..." : "Consultar"}
          </button>
        </form>

        {resultado && (
          <div className="mt-4 border border-[#4a3f52] rounded-sm p-3.5">
            <p className={`text-sm mb-1 ${ESTADO_COLOR[resultado.estado] || "text-[#b8afc4]"}`} style={{ fontFamily: "Lora, serif" }}>
              {resultado.mensaje}
            </p>
            <p className="text-[#7d7389] text-xs" style={{ fontFamily: "Lora, serif" }}>
              Enviado el {new Date(resultado.creado_en).toLocaleDateString("es-ES")}.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}