import React, { useState, useEffect, useCallback, useRef } from "react";
import { MessageCircle, Send, Lock, Trash2, Flag, User, VenetianMask } from "lucide-react";
import { supabase, ADMIN_EMAILS } from "../lib/supabaseClient";
import ReportModal from "./ReportModal";

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY;

export default function CommentThread({ storyId, storyAuthorId, user }) {
  const [comments, setComments] = useState(null);
  const [miUsername, setMiUsername] = useState(null);
  const [modoComentario, setModoComentario] = useState("identificado"); // "identificado" | "anonimo"
  const [text, setText] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState("");
  const [captchaToken, setCaptchaToken] = useState(null);
  const [reportandoComentario, setReportandoComentario] = useState(null);
  const widgetRef = useRef(null);
  const turnstileId = useRef(null);

  const isAdmin = user && ADMIN_EMAILS.includes((user.email || "").toLowerCase());
  const isStoryAuthor = user && user.id === storyAuthorId;
  const canSeePrivate = (c) => isAdmin || isStoryAuthor || (user && c.user_id === user.id);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("comments")
      .select("*")
      .eq("story_id", storyId)
      .order("created_at", { ascending: false });
    if (!error) setComments(data);
  }, [storyId]);

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

  // Renderiza el widget de Cloudflare Turnstile (captcha)
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

  const submit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    if (TURNSTILE_SITE_KEY && !captchaToken) {
      setErr("Completá el captcha antes de enviar.");
      return;
    }
    setSending(true);
    setErr("");
    try {
      // El captcha se valida server-side en la Edge Function, y el user_id
      // se toma del JWT de sesión (no de lo que mandemos acá) — no hay
      // insert directo a la tabla desde el cliente. commenter_name ahora
      // sale de un modo fijo (tu username real o "Anónimo"), nunca de un
      // input de texto libre.
      const { error } = await supabase.functions.invoke("verify-comment", {
        body: {
          token: captchaToken,
          story_id: storyId,
          text: text.trim(),
          is_private: isPrivate,
          commenter_name: modoComentario === "identificado" ? miUsername : "Anónimo",
        },
      });
      if (error) throw error;
      setText("");
      setIsPrivate(false);
      resetTurnstile();
      load();
    } catch {
      setErr("No se pudo enviar el comentario. Probá de nuevo.");
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

  return (
    <div className="mt-10 pt-8 border-t border-[#4a3f52]">
      <div className="flex items-center gap-2 mb-5">
        <MessageCircle size={18} className="text-[#B08D57]" strokeWidth={1.75} />
        <h4
          className="text-[#EDE6D6] text-lg"
          style={{ fontFamily: "Fraunces, serif", fontWeight: 600 }}
        >
          Ecos de los lectores {comments ? `(${comments.length})` : ""}
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
        {err && <p className="text-[#e08a8a] text-xs">{err}</p>}
      </form>

      {comments === null ? (
        <p className="text-[#7d7389] text-sm">Cargando ecos...</p>
      ) : comments.length === 0 ? (
        <p className="text-[#7d7389] text-sm italic" style={{ fontFamily: "Lora, serif" }}>
          Nadie ha dejado un eco todavía. El primero marca el camino.
        </p>
      ) : (
        <ul className="space-y-4">
          {comments
            .filter((c) => !c.is_private || canSeePrivate(c))
            .map((c) => (
              <li
                key={c.id}
                className={`border-l-2 pl-3.5 ${
                  c.is_private ? "border-[#B08D57]/60" : "border-[#7C8B63]/50"
                }`}
              >
                <div className="flex items-baseline gap-2 mb-0.5">
                  <span
                    className="text-[#e8c9a3] text-sm font-semibold"
                    style={{ fontFamily: "Lora, serif" }}
                  >
                    {c.commenter_name}
                  </span>
                  {c.is_private && (
                    <span className="flex items-center gap-1 text-[#B08D57] text-[10px] uppercase tracking-wide">
                      <Lock size={10} /> privado
                    </span>
                  )}
                  <span className="text-[#7d7389] text-[11px]">
                    {new Date(c.created_at).toLocaleDateString("es-ES", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
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
                <p
                  className="text-[#c9c1d4] text-[14.5px] leading-relaxed"
                  style={{ fontFamily: "Lora, serif" }}
                >
                  {c.text}
                </p>
              </li>
            ))}
        </ul>
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