import React, { useState, useEffect, useCallback } from "react";
import { BookOpen, Feather, Plus, Trash2, MessageCircle, Send, Users } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

const CATEGORIA_LABEL = {
  escritores: { titulo: "Guías Básicas para Escritores", subtitulo: "Forja de Historias", icono: Feather },
  lectores: { titulo: "Guías Básicas para Lectores", subtitulo: "El Camino del Lector", icono: BookOpen },
  novedad: { titulo: "Lo que se viene", subtitulo: null, icono: Users },
};

// ---------- Guías ----------
function SeccionGuias({ isAdmin }) {
  const [guias, setGuias] = useState(null);
  const [abierta, setAbierta] = useState(null);
  const [nueva, setNueva] = useState({ categoria: "escritores", titulo: "", contenido: "" });
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    const { data } = await supabase.from("guias_articulos").select("*").order("categoria").order("orden");
    setGuias(data || []);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const publicar = async (e) => {
    e.preventDefault();
    if (!nueva.titulo.trim()) return;
    setGuardando(true);
    await supabase.from("guias_articulos").insert({
      categoria: nueva.categoria,
      titulo: nueva.titulo.trim(),
      contenido: nueva.contenido.trim(),
    });
    setNueva({ categoria: nueva.categoria, titulo: "", contenido: "" });
    setGuardando(false);
    cargar();
  };

  const borrar = async (id) => {
    if (!window.confirm("¿Borrar esta guía?")) return;
    await supabase.from("guias_articulos").delete().eq("id", id);
    cargar();
  };

  if (guias === null) {
    return <p className="text-[#7d7389] text-sm" style={{ fontFamily: "Lora, serif" }}>Cargando...</p>;
  }

  const porCategoria = (cat) => guias.filter((g) => g.categoria === cat);

  return (
    <div>
      {isAdmin && (
        <form onSubmit={publicar} className="mb-10 border border-[#4a3f52] rounded-sm p-4 space-y-2.5">
          <div className="flex gap-2">
            <select
              value={nueva.categoria}
              onChange={(e) => setNueva((p) => ({ ...p, categoria: e.target.value }))}
              className="bg-[#0f0c14] border border-[#4a3f52] rounded-sm px-2.5 py-2 text-sm text-[#EDE6D6] focus:outline-none focus:ring-1 focus:ring-[#B08D57]"
              style={{ fontFamily: "Lora, serif" }}
            >
              {Object.entries(CATEGORIA_LABEL).map(([key, v]) => (
                <option key={key} value={key}>{v.titulo}</option>
              ))}
            </select>
            <input
              value={nueva.titulo}
              onChange={(e) => setNueva((p) => ({ ...p, titulo: e.target.value }))}
              placeholder="Título de la guía"
              className="flex-1 bg-[#0f0c14] border border-[#4a3f52] rounded-sm px-3 py-2 text-sm text-[#EDE6D6] placeholder-[#7d7389] focus:outline-none focus:ring-1 focus:ring-[#B08D57]"
              style={{ fontFamily: "Lora, serif" }}
            />
          </div>
          <textarea
            value={nueva.contenido}
            onChange={(e) => setNueva((p) => ({ ...p, contenido: e.target.value }))}
            rows={5}
            placeholder="Contenido (podés dejarlo vacío por ahora y completarlo después, o pegarlo ya armado acá)"
            className="w-full bg-[#0f0c14] border border-[#4a3f52] rounded-sm px-3 py-2.5 text-sm text-[#EDE6D6] placeholder-[#7d7389] focus:outline-none focus:ring-1 focus:ring-[#B08D57] resize-none"
            style={{ fontFamily: "Lora, serif" }}
          />
          <button
            type="submit"
            disabled={guardando || !nueva.titulo.trim()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-sm bg-[#7A2E2E] hover:bg-[#8f3838] disabled:opacity-40 text-[#EDE6D6] text-sm transition-colors"
            style={{ fontFamily: "Lora, serif" }}
          >
            <Plus size={14} /> Publicar guía
          </button>
        </form>
      )}

      {Object.entries(CATEGORIA_LABEL).map(([cat, info]) => {
        const items = porCategoria(cat);
        if (items.length === 0) return null;
        const Icono = info.icono;
        return (
          <div key={cat} className="mb-10">
            <div className="flex items-center gap-2 mb-1">
              <Icono size={15} className="text-[#7C8B63]" />
              <h2 className="text-[#B08D57] text-xs tracking-[0.2em] uppercase" style={{ fontFamily: "Lora, serif" }}>
                {info.titulo}
              </h2>
            </div>
            {info.subtitulo && (
              <p className="text-[#7d7389] text-xs italic mb-3 ml-6" style={{ fontFamily: "Lora, serif" }}>
                {info.subtitulo}
              </p>
            )}
            <div className="space-y-2 mt-3">
              {items.map((g) => {
                const estaAbierta = abierta === g.id;
                return (
                  <div key={g.id} className="rounded-sm border border-[#4a3f52] bg-[#1d1824]/80">
                    <button
                      onClick={() => setAbierta(estaAbierta ? null : g.id)}
                      className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
                    >
                      <span className="text-[#EDE6D6] text-sm" style={{ fontFamily: "Fraunces, serif", fontWeight: 600 }}>
                        {g.titulo}
                      </span>
                      {isAdmin && (
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            borrar(g.id);
                          }}
                          className="text-[#7d7389] hover:text-[#e08a8a] transition-colors shrink-0"
                        >
                          <Trash2 size={13} />
                        </span>
                      )}
                    </button>
                    {estaAbierta && (
                      <div className="border-t border-[#4a3f52] px-4 py-3">
                        {g.contenido ? (
                          <p className="text-[#c9c1d4] text-sm leading-relaxed whitespace-pre-wrap" style={{ fontFamily: "Lora, serif" }}>
                            {g.contenido}
                          </p>
                        ) : (
                          <p className="text-[#7d7389] text-sm italic" style={{ fontFamily: "Lora, serif" }}>
                            Todavía no hay contenido cargado para esta guía.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------- Foro general ----------
function SeccionForo({ user, isAdmin }) {
  const [mensajes, setMensajes] = useState(null);
  const [texto, setTexto] = useState("");
  const [respondiendoA, setRespondiendoA] = useState(null);
  const [textoRespuesta, setTextoRespuesta] = useState("");
  const [enviando, setEnviando] = useState(false);

  const cargar = useCallback(async () => {
    const { data } = await supabase
      .from("foro_mensajes")
      .select("*, autor:profiles!foro_mensajes_autor_id_fkey(username)")
      .order("created_at", { ascending: true });
    setMensajes(data || []);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const publicar = async (e, parentId, valor, limpiar) => {
    e.preventDefault();
    if (!valor.trim()) return;
    setEnviando(true);
    await supabase.from("foro_mensajes").insert({
      autor_id: user.id,
      texto: valor.trim(),
      parent_id: parentId,
    });
    limpiar();
    setEnviando(false);
    cargar();
  };

  const borrar = async (id) => {
    if (!window.confirm("¿Borrar este mensaje?")) return;
    await supabase.from("foro_mensajes").delete().eq("id", id);
    cargar();
  };

  if (mensajes === null) {
    return <p className="text-[#7d7389] text-sm" style={{ fontFamily: "Lora, serif" }}>Cargando...</p>;
  }

  const raices = mensajes.filter((m) => !m.parent_id);
  const respuestasDe = (id) => mensajes.filter((m) => m.parent_id === id);

  return (
    <div>
      <form onSubmit={(e) => publicar(e, null, texto, () => setTexto(""))} className="mb-8 flex gap-2">
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="¿Sobre qué querés charlar hoy?"
          maxLength={1500}
          className="flex-1 bg-[#0f0c14] border border-[#4a3f52] rounded-sm px-3.5 py-2.5 text-sm text-[#EDE6D6] placeholder-[#7d7389] focus:outline-none focus:ring-1 focus:ring-[#B08D57]"
          style={{ fontFamily: "Lora, serif" }}
        />
        <button
          type="submit"
          disabled={enviando || !texto.trim()}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-sm bg-[#7A2E2E] hover:bg-[#8f3838] disabled:opacity-40 text-[#EDE6D6] text-sm transition-colors shrink-0"
          style={{ fontFamily: "Lora, serif" }}
        >
          <Send size={14} />
        </button>
      </form>

      {raices.length === 0 ? (
        <p className="text-[#7d7389] italic text-sm" style={{ fontFamily: "Lora, serif" }}>
          Nadie abrió una charla todavía. Sé el primero.
        </p>
      ) : (
        <div className="space-y-4">
          {raices.map((m) => (
            <div key={m.id} className="rounded-sm border border-[#4a3f52] bg-[#1d1824]/80 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[#B08D57] text-xs mb-1" style={{ fontFamily: "Lora, serif" }}>
                    {m.autor?.username || "Alguien del archivo"}
                  </p>
                  <p className="text-[#c9c1d4] text-sm leading-relaxed" style={{ fontFamily: "Lora, serif" }}>
                    {m.texto}
                  </p>
                </div>
                {(m.autor_id === user.id || isAdmin) && (
                  <button onClick={() => borrar(m.id)} className="text-[#7d7389] hover:text-[#e08a8a] transition-colors shrink-0">
                    <Trash2 size={12} />
                  </button>
                )}
              </div>

              {respuestasDe(m.id).map((r) => (
                <div key={r.id} className="ml-5 mt-3 pt-3 border-t border-[#4a3f52]/60 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[#B08D57] text-xs mb-1" style={{ fontFamily: "Lora, serif" }}>
                      {r.autor?.username || "Alguien del archivo"}
                    </p>
                    <p className="text-[#c9c1d4] text-sm leading-relaxed" style={{ fontFamily: "Lora, serif" }}>
                      {r.texto}
                    </p>
                  </div>
                  {(r.autor_id === user.id || isAdmin) && (
                    <button onClick={() => borrar(r.id)} className="text-[#7d7389] hover:text-[#e08a8a] transition-colors shrink-0">
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              ))}

              {respondiendoA === m.id ? (
                <form
                  onSubmit={(e) => publicar(e, m.id, textoRespuesta, () => { setTextoRespuesta(""); setRespondiendoA(null); })}
                  className="ml-5 mt-3 flex gap-2"
                >
                  <input
                    value={textoRespuesta}
                    onChange={(e) => setTextoRespuesta(e.target.value)}
                    placeholder="Responder..."
                    autoFocus
                    className="flex-1 bg-[#0f0c14] border border-[#4a3f52] rounded-sm px-2.5 py-1.5 text-xs text-[#EDE6D6] placeholder-[#7d7389] focus:outline-none focus:ring-1 focus:ring-[#B08D57]"
                    style={{ fontFamily: "Lora, serif" }}
                  />
                  <button type="submit" disabled={enviando} className="text-[#B08D57] hover:text-[#e8c9a3] transition-colors shrink-0">
                    <Send size={13} />
                  </button>
                </form>
              ) : (
                <button
                  onClick={() => setRespondiendoA(m.id)}
                  className="ml-5 mt-3 flex items-center gap-1 text-[#7d7389] hover:text-[#b8afc4] transition-colors text-xs"
                  style={{ fontFamily: "Lora, serif" }}
                >
                  <MessageCircle size={11} /> Responder
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- Página ----------
export default function CognoscerePage({ user, isAdmin }) {
  const [tab, setTab] = useState("guias");

  return (
    <div className="max-w-2xl 2xl:max-w-3xl mx-auto px-5 pt-10 sm:pt-14 pb-24">
      <h1 className="text-[#EDE6D6] text-3xl mb-2" style={{ fontFamily: "Fraunces, serif", fontWeight: 700 }}>
        Cognoscere
      </h1>
      <p className="text-[#b8afc4] text-[15px] leading-relaxed mb-8 max-w-xl" style={{ fontFamily: "Lora, serif" }}>
        Un rincón para quienes quieren tomarse en serio la lectura y la escritura — guías de iniciación, y un
        espacio para charlar entre quienes comparten este camino.
      </p>

      <div className="flex gap-1 mb-8 border-b border-[#4a3f52]">
        <button
          onClick={() => setTab("guias")}
          className={`px-4 py-2.5 text-sm border-b-2 transition-colors ${
            tab === "guias" ? "border-[#B08D57] text-[#e8c9a3]" : "border-transparent text-[#7d7389] hover:text-[#b8afc4]"
          }`}
          style={{ fontFamily: "Lora, serif" }}
        >
          Guías
        </button>
        <button
          onClick={() => setTab("foro")}
          className={`px-4 py-2.5 text-sm border-b-2 transition-colors ${
            tab === "foro" ? "border-[#B08D57] text-[#e8c9a3]" : "border-transparent text-[#7d7389] hover:text-[#b8afc4]"
          }`}
          style={{ fontFamily: "Lora, serif" }}
        >
          Foro
        </button>
      </div>

      {tab === "guias" ? <SeccionGuias isAdmin={isAdmin} /> : <SeccionForo user={user} isAdmin={isAdmin} />}
    </div>
  );
}