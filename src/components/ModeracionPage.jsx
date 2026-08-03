import React, { useEffect, useState, useCallback } from "react";
import { ShieldAlert, Trash2, Ban, CheckCircle2, ExternalLink } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

const MOTIVO_LABEL = {
  contenido_prohibido: "Contenido prohibido",
  plagio_interno: "Plagio interno",
  plagio_externo: "Plagio externo",
  spam: "Spam",
  otro: "Otro",
};

// Prioridad: contenido_prohibido siempre primero
const PRIORIDAD = { contenido_prohibido: 0, plagio_interno: 1, plagio_externo: 1, spam: 2, otro: 3 };

const DURACIONES = [
  { label: "3 días", horas: 72 },
  { label: "7 días", horas: 168 },
  { label: "30 días", horas: 720 },
  { label: "Permanente", horas: null },
];

export default function ModeracionPage() {
  const [reportes, setReportes] = useState(null);
  const [err, setErr] = useState("");

  const cargar = useCallback(async () => {
    const { data, error } = await supabase
      .from("reportes")
      .select("*")
      .eq("estado", "pendiente")
      .order("created_at", { ascending: true });

    if (error) {
      setErr("No se pudieron cargar los reportes.");
      return;
    }

    // Enriquecemos cada reporte con el título de la historia o el texto del
    // comentario, para no tener que navegar afuera a ver de qué se trata.
    const enriquecidos = await Promise.all(
      (data || []).map(async (r) => {
        if (r.historia_id) {
          const { data: historia } = await supabase
            .from("stories")
            .select("id, title, author_id, author_name, estado")
            .eq("id", r.historia_id)
            .maybeSingle();
          return { ...r, tipo: "historia", contenido: historia };
        }
        if (r.comentario_id) {
          const { data: comentario } = await supabase
            .from("comments")
            .select("id, text, user_id, commenter_name, story_id")
            .eq("id", r.comentario_id)
            .maybeSingle();
          return { ...r, tipo: "comentario", contenido: comentario };
        }
        return { ...r, tipo: "desconocido", contenido: null };
      })
    );

    enriquecidos.sort((a, b) => (PRIORIDAD[a.motivo] ?? 9) - (PRIORIDAD[b.motivo] ?? 9));
    setReportes(enriquecidos);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const marcarResuelto = async (id) => {
    await supabase.from("reportes").update({ estado: "resuelto" }).eq("id", id);
    cargar();
  };

  const eliminarContenido = async (r) => {
    if (!window.confirm("¿Eliminar este contenido permanentemente?")) return;
    if (r.tipo === "historia") {
      await supabase.from("stories").delete().eq("id", r.historia_id);
    } else if (r.tipo === "comentario") {
      await supabase.from("comments").delete().eq("id", r.comentario_id);
    }
    await marcarResuelto(r.id);
  };

  const banear = async (r, horas) => {
    const authorId = r.tipo === "historia" ? r.contenido?.author_id : r.contenido?.user_id;
    if (!authorId) {
      alert("No se puede banear: el autor es anónimo o no se encontró.");
      return;
    }
    const baneadoHasta = horas
      ? new Date(Date.now() + horas * 60 * 60 * 1000).toISOString()
      : "9999-12-31T00:00:00Z"; // permanente

    const { data: perfilActual } = await supabase
      .from("profiles")
      .select("infracciones")
      .eq("id", authorId)
      .maybeSingle();

    await supabase
      .from("profiles")
      .update({
        baneado_hasta: baneadoHasta,
        infracciones: (perfilActual?.infracciones || 0) + 1,
      })
      .eq("id", authorId);

    await marcarResuelto(r.id);
  };

  if (reportes === null) {
    return (
      <div className="max-w-3xl mx-auto px-5 pt-10 pb-24">
        <p className="text-[#7d7389]" style={{ fontFamily: "Lora, serif" }}>Cargando reportes...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-5 pt-10 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <ShieldAlert size={18} className="text-[#7A2E2E]" />
        <h1 className="text-[#EDE6D6] text-2xl" style={{ fontFamily: "Fraunces, serif", fontWeight: 700 }}>
          Moderación — {reportes.length} pendiente{reportes.length !== 1 ? "s" : ""}
        </h1>
      </div>

      {err && <p className="text-[#e08a8a] text-sm mb-4">{err}</p>}

      {reportes.length === 0 ? (
        <p className="text-[#7d7389] italic" style={{ fontFamily: "Lora, serif" }}>
          No hay reportes pendientes.
        </p>
      ) : (
        <div className="space-y-4">
          {reportes.map((r) => (
            <div key={r.id} className="rounded-sm border border-[#4a3f52] bg-[#1d1824]/80 p-5">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span
                  className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full ${
                    r.motivo === "contenido_prohibido"
                      ? "bg-[#7A2E2E]/30 text-[#e08a8a]"
                      : "bg-[#4a3f52] text-[#b8afc4]"
                  }`}
                >
                  {MOTIVO_LABEL[r.motivo] || r.motivo}
                </span>
                <span className="text-[#7d7389] text-xs" style={{ fontFamily: "Lora, serif" }}>
                  {r.tipo === "historia" ? "Historia" : "Comentario"} ·{" "}
                  {new Date(r.created_at).toLocaleDateString("es-ES")}
                </span>
              </div>

              {r.tipo === "historia" && r.contenido && (
                <p className="text-[#EDE6D6] text-sm mb-1" style={{ fontFamily: "Lora, serif" }}>
                  <strong>{r.contenido.title}</strong> — por {r.contenido.author_name}
                  {r.contenido.estado === "pendiente_revision" && (
                    <span className="text-[#B08D57] text-xs ml-2">(auto-ocultada por reportes)</span>
                  )}
                </p>
              )}
              {r.tipo === "comentario" && r.contenido && (
                <p className="text-[#EDE6D6] text-sm mb-1" style={{ fontFamily: "Lora, serif" }}>
                  <strong>{r.contenido.commenter_name}:</strong> "{r.contenido.text}"
                </p>
              )}
              {!r.contenido && (
                <p className="text-[#7d7389] text-sm italic mb-1" style={{ fontFamily: "Lora, serif" }}>
                  El contenido original ya no existe.
                </p>
              )}

              {r.evidencia && (
                <p className="text-[#b8afc4] text-xs mb-3" style={{ fontFamily: "Lora, serif" }}>
                  Evidencia: {r.evidencia}
                </p>
              )}

              <div className="flex items-center gap-3 flex-wrap mt-3">
                <button
                  onClick={() => eliminarContenido(r)}
                  className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-sm border border-[#7A2E2E] text-[#e08a8a] hover:bg-[#7A2E2E]/10 transition-colors"
                  style={{ fontFamily: "Lora, serif" }}
                >
                  <Trash2 size={12} /> Eliminar contenido
                </button>

                {DURACIONES.map((d) => (
                  <button
                    key={d.label}
                    onClick={() => banear(r, d.horas)}
                    className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-sm border border-[#4a3f52] text-[#b8afc4] hover:border-[#B08D57] hover:text-[#e8c9a3] transition-colors"
                    style={{ fontFamily: "Lora, serif" }}
                  >
                    <Ban size={12} /> Banear {d.label}
                  </button>
                ))}

                <button
                  onClick={() => marcarResuelto(r.id)}
                  className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-sm border border-[#7C8B63] text-[#c3d1a8] hover:bg-[#7C8B63]/10 transition-colors ml-auto"
                  style={{ fontFamily: "Lora, serif" }}
                >
                  <CheckCircle2 size={12} /> Marcar resuelto
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
