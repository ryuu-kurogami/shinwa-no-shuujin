import React, { useEffect, useState, useCallback } from "react";
import { ShieldAlert, Trash2, Ban, CheckCircle2, ExternalLink, Clock3, Search, UserX, Eye, Coins, Plus } from "lucide-react";
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

// baneado_hasta permanente se guarda como esta fecha centinela (ver banear())
const PERMANENTE_ISO = "9999-12-31T00:00:00Z";

function tiempoRestante(baneadoHasta) {
  if (!baneadoHasta) return null;
  if (baneadoHasta.startsWith("9999")) return "Permanente";
  const ms = new Date(baneadoHasta).getTime() - Date.now();
  if (ms <= 0) return null;
  const dias = Math.ceil(ms / (1000 * 60 * 60 * 24));
  if (dias >= 1) return `${dias} día${dias !== 1 ? "s" : ""} restante${dias !== 1 ? "s" : ""}`;
  const horas = Math.max(1, Math.ceil(ms / (1000 * 60 * 60)));
  return `${horas} hora${horas !== 1 ? "s" : ""} restante${horas !== 1 ? "s" : ""}`;
}

export default function ModeracionPage() {
  const [reportes, setReportes] = useState(null);
  const [infraccionesPorUsuario, setInfraccionesPorUsuario] = useState({});
  const [enRevision, setEnRevision] = useState(null);
  const [baneados, setBaneados] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [resultadosBusqueda, setResultadosBusqueda] = useState(null);
  const [buscando, setBuscando] = useState(false);
  const [fondos, setFondos] = useState(null);
  const [nuevoFondo, setNuevoFondo] = useState({ tipo: "ingreso", monto: "", descripcion: "" });
  const [guardandoFondo, setGuardandoFondo] = useState(false);
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

    // Reincidencia (infracciones) de cada autor/usuario involucrado, para
    // mostrarla junto al reporte sin tener que ir a buscarla aparte.
    const idsInvolucrados = [
      ...new Set(
        enriquecidos
          .map((r) => (r.tipo === "historia" ? r.contenido?.author_id : r.contenido?.user_id))
          .filter(Boolean)
      ),
    ];
    if (idsInvolucrados.length > 0) {
      const { data: perfiles } = await supabase
        .from("profiles")
        .select("id, infracciones")
        .in("id", idsInvolucrados);
      const mapa = {};
      (perfiles || []).forEach((p) => (mapa[p.id] = p.infracciones || 0));
      setInfraccionesPorUsuario(mapa);
    }
  }, []);

  const cargarEnRevision = useCallback(async () => {
    const [{ data: historias, error: errH }, { data: capitulos, error: errC }] = await Promise.all([
      supabase
        .from("stories")
        .select("id, title, author_id, author_name, created_at, es_adulto")
        .eq("estado", "pendiente_revision")
        .order("created_at", { ascending: true }),
      supabase
        .from("capitulos")
        .select("id, numero, titulo, created_at, story:stories(id, title, author_id, author_name, es_adulto)")
        .eq("estado", "pendiente_revision")
        .order("created_at", { ascending: true }),
    ]);

    if (errH || errC) {
      setErr("No se pudo cargar el contenido en revisión.");
      return;
    }

    const itemsHistorias = (historias || []).map((h) => ({
      tipo: "historia",
      id: h.id,
      title: h.title,
      author_name: h.author_name,
      created_at: h.created_at,
      es_adulto: h.es_adulto,
    }));

    // Capítulos nuevos de obras +18 ya existentes (Sección 4.5) — no
    // confundir con la revisión inicial de la historia, que es la de arriba.
    const itemsCapitulos = (capitulos || [])
      .filter((c) => c.story)
      .map((c) => ({
        tipo: "capitulo",
        id: c.id,
        title: c.story.title,
        author_name: c.story.author_name,
        created_at: c.created_at,
        es_adulto: c.story.es_adulto,
        numero: c.numero,
        capituloTitulo: c.titulo,
      }));

    const todos = [...itemsHistorias, ...itemsCapitulos].sort(
      (a, b) => new Date(a.created_at) - new Date(b.created_at)
    );
    setEnRevision(todos);
  }, []);

  const cargarBaneados = useCallback(async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, baneado_hasta, infracciones")
      .gt("baneado_hasta", new Date().toISOString())
      .order("baneado_hasta", { ascending: false })
      .limit(20);

    if (error) {
      setErr("No se pudo cargar la lista de usuarios baneados.");
      return;
    }
    setBaneados(data || []);
  }, []);

  const cargarFondos = useCallback(async () => {
    const { data, error } = await supabase
      .from("fondos_sitio")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      setErr("No se pudo cargar los fondos del sitio.");
      return;
    }
    setFondos(data || []);
  }, []);

  useEffect(() => {
    cargar();
    cargarEnRevision();
    cargarBaneados();
    cargarFondos();
  }, [cargar, cargarEnRevision, cargarBaneados, cargarFondos]);

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
    const baneadoHasta = horas ? new Date(Date.now() + horas * 60 * 60 * 1000).toISOString() : PERMANENTE_ISO;

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
    cargarBaneados();
  };

  const aprobarEnRevision = async (item) => {
    const tabla = item.tipo === "historia" ? "stories" : "capitulos";
    await supabase.from(tabla).update({ estado: "publicado" }).eq("id", item.id);
    cargarEnRevision();
  };

  const rechazarEnRevision = async (item) => {
    const etiqueta = item.tipo === "historia" ? `"${item.title}"` : `"${item.title}" — capítulo ${item.numero}`;
    if (!window.confirm(`¿Rechazar ${etiqueta}? Vuelve a borrador para que el autor lo revise.`)) return;
    const tabla = item.tipo === "historia" ? "stories" : "capitulos";
    await supabase.from(tabla).update({ estado: "borrador" }).eq("id", item.id);
    cargarEnRevision();
  };

  const quitarBaneo = async (userId) => {
    await supabase.from("profiles").update({ baneado_hasta: null }).eq("id", userId);
    cargarBaneados();
    if (resultadosBusqueda) buscarUsuario();
  };

  const buscarUsuario = async () => {
    const q = busqueda.trim();
    if (!q) {
      setResultadosBusqueda(null);
      return;
    }
    setBuscando(true);
    const { data } = await supabase
      .from("profiles")
      .select("id, username, baneado_hasta, infracciones")
      .ilike("username", `%${q}%`)
      .limit(10);
    setResultadosBusqueda(data || []);
    setBuscando(false);
  };

  const agregarFondo = async (e) => {
    e.preventDefault();
    const monto = parseFloat(nuevoFondo.monto);
    if (!monto || monto <= 0 || !nuevoFondo.descripcion.trim()) return;
    setGuardandoFondo(true);
    const { error } = await supabase.from("fondos_sitio").insert({
      tipo: nuevoFondo.tipo,
      monto,
      descripcion: nuevoFondo.descripcion.trim(),
    });
    setGuardandoFondo(false);
    if (!error) {
      setNuevoFondo({ tipo: "ingreso", monto: "", descripcion: "" });
      cargarFondos();
    }
  };

  const borrarFondo = async (id) => {
    if (!window.confirm("¿Borrar esta entrada? Afecta los totales públicos en Transparencia.")) return;
    await supabase.from("fondos_sitio").delete().eq("id", id);
    cargarFondos();
  };

  if (reportes === null) {
    return (
      <div className="max-w-3xl 2xl:max-w-4xl mx-auto px-5 pt-10 pb-24">
        <p className="text-[#7d7389]" style={{ fontFamily: "Lora, serif" }}>Cargando reportes...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl 2xl:max-w-4xl mx-auto px-5 pt-10 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <ShieldAlert size={18} className="text-[#7A2E2E]" />
        <h1 className="text-[#EDE6D6] text-2xl" style={{ fontFamily: "Fraunces, serif", fontWeight: 700 }}>
          Moderación
        </h1>
      </div>

      {err && <p className="text-[#e08a8a] text-sm mb-4">{err}</p>}

      {/* ---------- Reportes pendientes ---------- */}
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-[#B08D57] text-xs tracking-[0.2em] uppercase" style={{ fontFamily: "Lora, serif" }}>
          Reportes pendientes — {reportes.length}
        </h2>
        <div className="flex-1 h-px bg-[#4a3f52]" />
      </div>

      {reportes.length === 0 ? (
        <p className="text-[#7d7389] italic mb-10" style={{ fontFamily: "Lora, serif" }}>
          No hay reportes pendientes.
        </p>
      ) : (
        <div className="space-y-4 mb-10">
          {reportes.map((r) => {
            const autorId = r.tipo === "historia" ? r.contenido?.author_id : r.contenido?.user_id;
            const infracciones = autorId ? infraccionesPorUsuario[autorId] : undefined;
            return (
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
                  {infracciones > 0 && (
                    <span
                      className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-[#7A2E2E]/20 text-[#e08a8a]"
                      title="Cantidad de veces que este usuario ya fue baneado antes"
                    >
                      Reincidencia: {infracciones}
                    </span>
                  )}
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
                  <p className="text-[#b8afc4] text-xs mb-1" style={{ fontFamily: "Lora, serif" }}>
                    <strong className="text-[#7d7389]">Evidencia de quien reportó:</strong> {r.evidencia}
                  </p>
                )}
                {r.motivo === "plagio_interno" && (
                  <p className="text-[#b8afc4] text-xs mb-3" style={{ fontFamily: "Lora, serif" }}>
                    <strong className="text-[#7d7389]">Evidencia del acusado:</strong>{" "}
                    {r.evidencia_acusado || <span className="italic text-[#7d7389]">todavía no respondió</span>}
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
            );
          })}
        </div>
      )}

      {/* ---------- Contenido en revisión ---------- */}
      <div className="flex items-center gap-2 mb-4">
        <Eye size={13} className="text-[#B08D57]" />
        <h2 className="text-[#B08D57] text-xs tracking-[0.2em] uppercase" style={{ fontFamily: "Lora, serif" }}>
          Contenido en revisión — {enRevision === null ? "…" : enRevision.length}
        </h2>
        <div className="flex-1 h-px bg-[#4a3f52]" />
      </div>

      {enRevision === null ? (
        <p className="text-[#7d7389] mb-10" style={{ fontFamily: "Lora, serif" }}>Cargando...</p>
      ) : enRevision.length === 0 ? (
        <p className="text-[#7d7389] italic mb-10" style={{ fontFamily: "Lora, serif" }}>
          No hay contenido esperando revisión.
        </p>
      ) : (
        <div className="space-y-3 mb-10">
          {enRevision.map((item) => (
            <div
              key={`${item.tipo}-${item.id}`}
              className="rounded-sm border border-[#4a3f52] bg-[#1d1824]/80 p-4 flex items-center gap-3 flex-wrap"
            >
              <div className="min-w-0 flex-1">
                <p className="text-[#EDE6D6] text-sm" style={{ fontFamily: "Lora, serif" }}>
                  <strong>{item.title}</strong>
                  {item.tipo === "capitulo" && ` — capítulo ${item.numero}${item.capituloTitulo ? `: ${item.capituloTitulo}` : ""}`}
                  {" "}— por {item.author_name}
                  {item.es_adulto && (
                    <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-[#7A2E2E]/30 text-[#e08a8a] ml-2">
                      +18
                    </span>
                  )}
                </p>
                <p className="text-[#7d7389] text-xs" style={{ fontFamily: "Lora, serif" }}>
                  Enviad{item.tipo === "capitulo" ? "o" : "a"} el {new Date(item.created_at).toLocaleDateString("es-ES")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => aprobarEnRevision(item)}
                  className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-sm border border-[#7C8B63] text-[#c3d1a8] hover:bg-[#7C8B63]/10 transition-colors"
                  style={{ fontFamily: "Lora, serif" }}
                >
                  <CheckCircle2 size={12} /> Aprobar y publicar
                </button>
                <button
                  onClick={() => rechazarEnRevision(item)}
                  className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-sm border border-[#7A2E2E] text-[#e08a8a] hover:bg-[#7A2E2E]/10 transition-colors"
                  style={{ fontFamily: "Lora, serif" }}
                >
                  <Trash2 size={12} /> Rechazar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ---------- Usuarios baneados ---------- */}
      <div className="flex items-center gap-2 mb-4">
        <UserX size={13} className="text-[#B08D57]" />
        <h2 className="text-[#B08D57] text-xs tracking-[0.2em] uppercase" style={{ fontFamily: "Lora, serif" }}>
          Usuarios baneados
        </h2>
        <div className="flex-1 h-px bg-[#4a3f52]" />
      </div>

      <div className="relative mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7d7389]" />
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && buscarUsuario()}
          placeholder="Buscar usuario baneado por nombre de usuario..."
          className="w-full bg-[#1d1824] border border-[#4a3f52] rounded-sm pl-9 pr-20 py-2.5 text-sm text-[#EDE6D6] placeholder-[#7d7389] focus:outline-none focus:ring-1 focus:ring-[#B08D57]"
          style={{ fontFamily: "Lora, serif" }}
        />
        <button
          onClick={buscarUsuario}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-xs px-2.5 py-1 rounded-sm border border-[#4a3f52] text-[#b8afc4] hover:border-[#B08D57] hover:text-[#e8c9a3] transition-colors"
          style={{ fontFamily: "Lora, serif" }}
        >
          {buscando ? "..." : "Buscar"}
        </button>
      </div>

      {resultadosBusqueda !== null && (
        <div className="mb-4">
          <p className="text-[#7d7389] text-xs mb-2" style={{ fontFamily: "Lora, serif" }}>
            Resultados de la búsqueda:
          </p>
          {resultadosBusqueda.length === 0 ? (
            <p className="text-[#7d7389] italic text-sm" style={{ fontFamily: "Lora, serif" }}>
              No se encontró ningún usuario con ese nombre.
            </p>
          ) : (
            <div className="space-y-2">
              {resultadosBusqueda.map((u) => (
                <FilaUsuarioBaneado key={u.id} usuario={u} onQuitarBaneo={quitarBaneo} />
              ))}
            </div>
          )}
        </div>
      )}

      {baneados === null ? (
        <p className="text-[#7d7389]" style={{ fontFamily: "Lora, serif" }}>Cargando...</p>
      ) : baneados.length === 0 ? (
        <p className="text-[#7d7389] italic" style={{ fontFamily: "Lora, serif" }}>
          No hay usuarios baneados actualmente.
        </p>
      ) : (
        <div className="space-y-2">
          {baneados.map((u) => (
            <FilaUsuarioBaneado key={u.id} usuario={u} onQuitarBaneo={quitarBaneo} />
          ))}
        </div>
      )}

      {/* ---------- Fondos del sitio ---------- */}
      <div className="flex items-center gap-2 mb-4 mt-10">
        <Coins size={13} className="text-[#B08D57]" />
        <h2 className="text-[#B08D57] text-xs tracking-[0.2em] uppercase" style={{ fontFamily: "Lora, serif" }}>
          Fondos del sitio
        </h2>
        <div className="flex-1 h-px bg-[#4a3f52]" />
      </div>
      <p className="text-[#7d7389] text-xs mb-4" style={{ fontFamily: "Lora, serif" }}>
        Esto alimenta los totales públicos que se ven en /transparencia. Usá "ingreso" para donaciones
        recibidas y "gasto" para en qué se usaron.
      </p>

      <form onSubmit={agregarFondo} className="flex flex-wrap gap-2 mb-4">
        <select
          value={nuevoFondo.tipo}
          onChange={(e) => setNuevoFondo((f) => ({ ...f, tipo: e.target.value }))}
          className="bg-[#1d1824] border border-[#4a3f52] rounded-sm px-2.5 py-2 text-sm text-[#EDE6D6] focus:outline-none focus:ring-1 focus:ring-[#B08D57]"
          style={{ fontFamily: "Lora, serif" }}
        >
          <option value="ingreso">Ingreso</option>
          <option value="gasto">Gasto</option>
        </select>
        <input
          type="number"
          min="0.01"
          step="0.01"
          value={nuevoFondo.monto}
          onChange={(e) => setNuevoFondo((f) => ({ ...f, monto: e.target.value }))}
          placeholder="Monto"
          className="w-28 bg-[#1d1824] border border-[#4a3f52] rounded-sm px-2.5 py-2 text-sm text-[#EDE6D6] placeholder-[#7d7389] focus:outline-none focus:ring-1 focus:ring-[#B08D57]"
          style={{ fontFamily: "Lora, serif" }}
        />
        <input
          value={nuevoFondo.descripcion}
          onChange={(e) => setNuevoFondo((f) => ({ ...f, descripcion: e.target.value }))}
          placeholder="Descripción (ej. donación de un lector, hosting del mes)"
          className="flex-1 min-w-[180px] bg-[#1d1824] border border-[#4a3f52] rounded-sm px-2.5 py-2 text-sm text-[#EDE6D6] placeholder-[#7d7389] focus:outline-none focus:ring-1 focus:ring-[#B08D57]"
          style={{ fontFamily: "Lora, serif" }}
        />
        <button
          type="submit"
          disabled={guardandoFondo || !nuevoFondo.monto || !nuevoFondo.descripcion.trim()}
          className="flex items-center gap-1.5 px-3 py-2 rounded-sm bg-[#7A2E2E] hover:bg-[#8f3838] disabled:opacity-40 transition-colors text-sm text-[#EDE6D6]"
          style={{ fontFamily: "Lora, serif" }}
        >
          <Plus size={14} /> Agregar
        </button>
      </form>

      {fondos === null ? (
        <p className="text-[#7d7389]" style={{ fontFamily: "Lora, serif" }}>Cargando...</p>
      ) : fondos.length === 0 ? (
        <p className="text-[#7d7389] italic" style={{ fontFamily: "Lora, serif" }}>
          Todavía no hay entradas cargadas.
        </p>
      ) : (
        <div className="space-y-1.5">
          {fondos.map((f) => (
            <div key={f.id} className="flex items-center justify-between gap-3 rounded-sm border border-[#4a3f52] bg-[#1d1824]/80 px-3.5 py-2.5">
              <div className="min-w-0 flex-1 flex items-center gap-2">
                <span
                  className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full shrink-0 ${
                    f.tipo === "ingreso" ? "bg-[#7C8B63]/20 text-[#c3d1a8]" : "bg-[#7A2E2E]/20 text-[#e08a8a]"
                  }`}
                >
                  {f.tipo}
                </span>
                <p className="text-[#c9c1d4] text-sm truncate" style={{ fontFamily: "Lora, serif" }}>
                  {f.descripcion} — {Number(f.monto).toLocaleString("es-PY")}
                </p>
              </div>
              <button
                onClick={() => borrarFondo(f.id)}
                className="text-[#7d7389] hover:text-[#e08a8a] transition-colors shrink-0"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FilaUsuarioBaneado({ usuario, onQuitarBaneo }) {
  const restante = tiempoRestante(usuario.baneado_hasta);
  return (
    <div className="rounded-sm border border-[#4a3f52] bg-[#1d1824]/80 p-3.5 flex items-center gap-3 flex-wrap">
      <div className="min-w-0 flex-1">
        <p className="text-[#EDE6D6] text-sm" style={{ fontFamily: "Lora, serif" }}>
          {usuario.username || "(sin nombre de usuario)"}
        </p>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="flex items-center gap-1 text-[#e8c9a3] text-xs" style={{ fontFamily: "Lora, serif" }}>
            <Clock3 size={11} /> {restante || "vencido"}
          </span>
          {usuario.infracciones > 0 && (
            <span
              className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-[#7A2E2E]/20 text-[#e08a8a]"
              title="Cantidad de veces que este usuario ya fue baneado"
            >
              Reincidencia: {usuario.infracciones}
            </span>
          )}
        </div>
      </div>
      <button
        onClick={() => onQuitarBaneo(usuario.id)}
        className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-sm border border-[#7C8B63] text-[#c3d1a8] hover:bg-[#7C8B63]/10 transition-colors"
        style={{ fontFamily: "Lora, serif" }}
      >
        <CheckCircle2 size={12} /> Quitar baneo
      </button>
    </div>
  );
}