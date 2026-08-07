import React, { useState, useEffect, useCallback, useRef } from "react";
import { MessageCircle, Send, Lock, Trash2, Flag, User, VenetianMask, Reply } from "lucide-react";
import { supabase, ADMIN_EMAILS } from "../lib/supabaseClient";
import ReportModal from "./ReportModal";

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY;
const PAGE_SIZE = 10;

export default function CommentThread({ capituloId, storyAuthorId, user }) {
  const [comments, setComments] = useState(null); // solo comentarios de primer nivel (parent_id null)
  const [respuestasPorPadre, setRespuestasPorPadre] = useState({}); // { [parentId]: [respuesta, ...] }
  const [totalComments, setTotalComments] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [miUsername, setMiUsername] = useState(null);
  const [modoComentario, setModoComentario] = useState("identificado"); // "identificado" | "anonimo"
  const [text, setText] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [respondiendoA, setRespondiendoA] = useState(null); // id del comentario que se está respondiendo
  const [textoRespuesta, setTextoRespuesta] = useState("");
  const [isPrivateRespuesta, setIsPrivateRespuesta] = useState(false);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState("");
  const [captchaToken, setCaptchaToken] = useState(null);
  const [reportandoComentario, setReportandoComentario] = useState(null);
  const widgetRef = useRef(null);
  const turnstileId = useRef(null);

  const isAdmin = user && ADMIN_EMAILS.includes((user.email || "").toLowerCase());
  const isStoryAuthor = user && user.id === storyAuthorId;
  const canSeePrivate = (c) => isAdmin || isStoryAuthor || (user && c.user_id === user.id);

  // Trae las respuestas (parent_id no nulo) de un lote de comentarios padre,
  // y las agrupa por padre.
  const cargarRespuestas = useCallback(async (padres) => {
    const ids = padres.map((c) => c.id);
    if (ids.length === 0) return;
    const { data } = await supabase
      .from("comments")
      .select("*")
      .in("parent_id", ids)
      .order("created_at", { ascending: true });
    setRespuestasPorPadre((prev) => {
      const copia = { ...prev };
      (data || []).forEach((r) => {
        copia[r.parent_id] = [...(copia[r.parent_id] || []).filter((x) => x.id !== r.id), r];
      });
      return copia;
    });
  }, []);

  // Carga la primera página (10 comentarios de primer nivel) — se usa al
  // entrar al capítulo y después de enviar uno nuevo.
  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("comments")
      .select("*")
      .eq("capitulo_id", capituloId)
      .is("parent_id", null)
      .order("created_at", { ascending: false })
      .range(0, PAGE_SIZE - 1);
    if (!error) {
      setComments(data);
      setHasMore((data || []).length === PAGE_SIZE);
      setRespuestasPorPadre({});
      cargarRespuestas(data || []);
    }

    // El total del encabezado cuenta TODO (comentarios + respuestas), no
    // solo lo que entra en la página actual.
    const { count } = await supabase
      .from("comments")
      .select("id", { count: "exact", head: true })
      .eq("capitulo_id", capituloId);
    setTotalComments(count ?? 0);
  }, [capituloId, cargarRespuestas]);

  // Trae la siguiente página de comentarios de primer nivel (y sus respuestas).
  const cargarMas = async () => {
    if (!comments) return;
    setCargandoMas(true);
    const desde = comments.length;
    const { data, error } = await supabase
      .from("comments")
      .select("*")
      .eq("capitulo_id", capituloId)
      .is("parent_id", null)
      .order("created_at", { ascending: false })
      .range(desde, desde + PAGE_SIZE - 1);
    if (!error) {
      const nuevos = data || [];
      setComments((prev) => [...prev, ...nuevos]);
      setHasMore(nuevos.length === PAGE_SIZE);
      cargarRespuestas(nuevos);
    }
    setCargandoMas(false);
  };

  useEffect(() => {
    load();
  }, [load]);

  // Traemos el username real de la cuenta logueada — ya no es un campo
  // editable, es la única identidad posible en el modo "identificado".
  // Esto es lo que cierra la brecha de suplantación: nadie puede escribir
  // el nombre de otro usuario en un comentario.
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => setMiUsername(data?.username || null));
  }, [user?.id]);

  // Renderiza el widget de Cloudflare Turnstile (captcha) — uno solo,
  // compartido entre el formulario principal y cualquier respuesta que se
  // esté escribiendo.
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

  const resetTurnstile = () => {
    setCaptchaToken(null);
    if (turnstileId.current && window.turnstile) window.turnstile.reset(turnstileId.current);
  };

  // parentId null = comentario de primer nivel; si no, es una respuesta.
  const submit = async (e, parentId = null) => {
    e.preventDefault();
    const cuerpo = parentId ? textoRespuesta : text;
    if (!cuerpo.trim()) return;
    if (TURNSTILE_SITE_KEY && !captchaToken) {
      setErr("Completá el captcha antes de enviar.");
      return;
    }
    setSending(true);
    setErr("");
    try {
      // El captcha se valida server-side en la Edge Function, y tanto el
      // user_id como el nombre a mostrar se resuelven ahí, nunca acá — el
      // cliente solo informa si el modo es anónimo o no.
      const { error } = await supabase.functions.invoke("verify-comment", {
        body: {
          token: captchaToken,
          capitulo_id: capituloId,
          text: cuerpo.trim(),
          is_private: parentId ? isPrivateRespuesta : isPrivate,
          is_anonymous: modoComentario === "anonimo",
          parent_id: parentId,
        },
      });
      if (error) throw error;
      if (parentId) {
        setTextoRespuesta("");
        setIsPrivateRespuesta(false);
        setRespondiendoA(null);
      } else {
        setText("");
        setIsPrivate(false);
      }
      resetTurnstile();
      load();
    } catch (error) {
      // supabase.functions.invoke no expone el body del error directo —
      // hay que leerlo del Response crudo para mostrar el motivo real
      // (rate limit, sin sesión, baneo) en vez de un genérico siempre.
      let mensaje = "No se pudo enviar el comentario. Probá de nuevo.";
      try {
        const body = await error?.context?.json();
        if (body?.error) mensaje = body.error;
      } catch {
        // si no se pudo leer el body, nos quedamos con el mensaje genérico
      }
      setErr(mensaje);
      resetTurnstile();
    } finally {
      setSending(false);
    }
  };

  const deleteComment = async (id) => {
    if (!isAdmin) return;
    await supabase.from("comments").delete().eq("id", id);
    load();
  };

  const abrirRespuesta = (id) => {
    setRespondiendoA((actual) => (actual === id ? null : id));
    setTextoRespuesta("");
    setErr("");
  };

  const renderComentario = (c, esRespuesta) => (
    <div key={c.id}>
      <div className="flex items-baseline gap-2 mb-0.5 flex-wrap">
        <span className="text-[#e8c9a3] text-sm font-semibold" style={{ fontFamily: "Lora, serif" }}>
          {c.commenter_name}
        </span>
        {c.is_private && (
          <span className="flex items-center gap-1 text-[#B08D57] text-[10px] uppercase tracking-wide">
            <Lock size={10} /> privado
          </span>
        )}
        <span className="text-[#7d7389] text-[11px]">
          {new Date(c.created_at).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}
        </span>
        {isAdmin && (
          <button
            onClick={() => deleteComment(c.id)}
            className="ml-auto text-[#7d7389] hover:text-[#e08a8a] transition-colors"
          >
            <Trash2 size={13} />
          </button>
        )}
        {user && !isAdmin && (
          <button
            onClick={() => setReportandoComentario(c.id)}
            className="ml-auto text-[#7d7389] hover:text-[#e08a8a] transition-colors"
            title="Reportar comentario"
          >
            <Flag size={12} />
          </button>
        )}
      </div>
      <p className="text-[#c9c1d4] text-[14.5px] leading-relaxed" style={{ fontFamily: "Lora, serif" }}>
        {c.text}
      </p>
      {!esRespuesta && user && (
        <button
          onClick={() => abrirRespuesta(c.id)}
          className="flex items-center gap-1 text-[#7C8B63] hover:text-[#9db07d] transition-colors text-xs mt-1"
          style={{ fontFamily: "Lora, serif" }}
        >
          <Reply size={11} /> Responder
        </button>
      )}
    </div>
  );

  return (
    <div className="mt-10 pt-8 border-t border-[#4a3f52]">
      <div className="flex items-center gap-2 mb-5">
        <MessageCircle size={18} className="text-[#B08D57]" strokeWidth={1.75} />
        <h4
          className="text-[#EDE6D6] text-lg"
          style={{ fontFamily: "Fraunces, serif", fontWeight: 600 }}
        >
          Ecos de los lectores en este capítulo {totalComments !== null ? `(${totalComments})` : ""}
        </h4>
      </div>

      <form onSubmit={submit} className="mb-7 space-y-2.5">
        <div className="flex gap-2" style={{ fontFamily: "Lora, serif" }}>
          <button
            type="button"
            onClick={() => setModoComentario("identificado")}
            disabled={!miUsername}
            title={!miUsername ? "Todavía no se cargó tu nombre de usuario" : undefined}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-sm border text-xs transition-colors disabled:opacity-40 ${
              modoComentario === "identificado"
                ? "border-[#B08D57] text-[#e8c9a3] bg-[#B08D57]/10"
                : "border-[#4a3f52] text-[#7d7389] hover:text-[#b8afc4]"
            }`}
          >
            <User size={13} /> Comentar como {miUsername || "..."}
          </button>
          <button
            type="button"
            onClick={() => setModoComentario("anonimo")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-sm border text-xs transition-colors ${
              modoComentario === "anonimo"
                ? "border-[#B08D57] text-[#e8c9a3] bg-[#B08D57]/10"
                : "border-[#4a3f52] text-[#7d7389] hover:text-[#b8afc4]"
            }`}
          >
            <VenetianMask size={13} /> Comentar de forma anónima
          </button>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Dejá tu eco sobre esta historia..."
          rows={2}
          maxLength={1000}
          className="w-full bg-[#1d1824] border border-[#4a3f52] rounded-sm px-3 py-2 text-sm text-[#EDE6D6] placeholder-[#7d7389] focus:outline-none focus:ring-1 focus:ring-[#B08D57] resize-none"
          style={{ fontFamily: "Lora, serif" }}
        />

        <label
          className="flex items-center gap-2 text-xs text-[#b8afc4] cursor-pointer select-none"
          style={{ fontFamily: "Lora, serif" }}
        >
          <input
            type="checkbox"
            checked={isPrivate}
            onChange={(e) => setIsPrivate(e.target.checked)}
            className="accent-[#7C8B63]"
          />
          <Lock size={12} /> Enviar solo al autor (privado, nadie más lo ve)
        </label>

        {TURNSTILE_SITE_KEY && <div ref={widgetRef} />}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={sending || !text.trim() || (modoComentario === "identificado" && !miUsername)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-sm bg-[#7A2E2E] hover:bg-[#8f3838] disabled:opacity-40 transition-colors text-sm text-[#EDE6D6]"
            style={{ fontFamily: "Lora, serif" }}
          >
            <Send size={14} /> Enviar
          </button>
        </div>
        {err && !respondiendoA && <p className="text-[#e08a8a] text-xs">{err}</p>}
      </form>

      {comments === null ? (
        <p className="text-[#7d7389] text-sm">Cargando ecos...</p>
      ) : comments.length === 0 ? (
        <p className="text-[#7d7389] text-sm italic" style={{ fontFamily: "Lora, serif" }}>
          Nadie ha dejado un eco todavía. El primero marca el camino.
        </p>
      ) : (
        <ul className="space-y-5">
          {comments
            .filter((c) => !c.is_private || canSeePrivate(c))
            .map((c) => {
              const respuestas = (respuestasPorPadre[c.id] || []).filter((r) => !r.is_private || canSeePrivate(r));
              return (
                <li
                  key={c.id}
                  className={`border-l-2 pl-3.5 ${c.is_private ? "border-[#B08D57]/60" : "border-[#7C8B63]/50"}`}
                >
                  {renderComentario(c, false)}

                  {respondiendoA === c.id && (
                    <form onSubmit={(e) => submit(e, c.id)} className="mt-3 ml-1 space-y-2 border-l-2 border-[#4a3f52] pl-3">
                      <textarea
                        value={textoRespuesta}
                        onChange={(e) => setTextoRespuesta(e.target.value)}
                        placeholder={`Responder a ${c.commenter_name}...`}
                        rows={2}
                        maxLength={1000}
                        autoFocus
                        className="w-full bg-[#1d1824] border border-[#4a3f52] rounded-sm px-3 py-2 text-sm text-[#EDE6D6] placeholder-[#7d7389] focus:outline-none focus:ring-1 focus:ring-[#B08D57] resize-none"
                        style={{ fontFamily: "Lora, serif" }}
                      />
                      {c.is_private ? (
                        <p className="text-[#B08D57] text-xs" style={{ fontFamily: "Lora, serif" }}>
                          Esta respuesta va a ser privada, igual que el comentario original.
                        </p>
                      ) : (
                        <label
                          className="flex items-center gap-2 text-xs text-[#b8afc4] cursor-pointer select-none"
                          style={{ fontFamily: "Lora, serif" }}
                        >
                          <input
                            type="checkbox"
                            checked={isPrivateRespuesta}
                            onChange={(e) => setIsPrivateRespuesta(e.target.checked)}
                            className="accent-[#7C8B63]"
                          />
                          <Lock size={12} /> Enviar solo al autor
                        </label>
                      )}
                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => setRespondiendoA(null)}
                          className="text-[#7d7389] hover:text-[#b8afc4] transition-colors text-xs"
                          style={{ fontFamily: "Lora, serif" }}
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          disabled={sending || !textoRespuesta.trim() || (modoComentario === "identificado" && !miUsername)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-[#7A2E2E] hover:bg-[#8f3838] disabled:opacity-40 transition-colors text-xs text-[#EDE6D6]"
                          style={{ fontFamily: "Lora, serif" }}
                        >
                          <Send size={12} /> Responder
                        </button>
                      </div>
                      {err && <p className="text-[#e08a8a] text-xs">{err}</p>}
                    </form>
                  )}

                  {respuestas.length > 0 && (
                    <div className="mt-3 ml-2 space-y-3">
                      {respuestas.map((r) => (
                        <div key={r.id} className="pl-3 border-l-2 border-[#4a3f52]/60">
                          {renderComentario(r, true)}
                        </div>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
        </ul>
      )}

      {comments && comments.length > 0 && hasMore && (
        <div className="flex justify-center mt-5">
          <button
            onClick={cargarMas}
            disabled={cargandoMas}
            className="text-[#B08D57] hover:text-[#e8c9a3] disabled:opacity-40 transition-colors text-sm"
            style={{ fontFamily: "Lora, serif" }}
          >
            {cargandoMas ? "Cargando..." : "Cargar más ecos"}
          </button>
        </div>
      )}

      {reportandoComentario && (
        <ReportModal
          user={user}
          comentarioId={reportandoComentario}
          onClose={() => setReportandoComentario(null)}
        />
      )}
    </div>
  );
}