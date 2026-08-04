import React, { useEffect, useState } from "react";
import { ArrowLeft, Pencil, Trash2, ScrollText, UserCircle2, Settings, Heart, Clock3, UserX } from "lucide-react";
import { StorySeal } from "./StoryCard";
import { supabase } from "../lib/supabaseClient";
import EditProfileModal from "./EditProfileModal";

const CATEGORIA_LABEL = { corto: "Corto", novela: "Novela", fanfic: "Fanfic" };

const ESTADO_BADGE = {
  pendiente_revision: { label: "Pendiente de revisión", className: "bg-[#B08D57]/20 text-[#e8c9a3]" },
  borrador: { label: "Borrador", className: "bg-[#4a3f52] text-[#b8afc4]" },
};

// Mismo cálculo que en ModeracionPage — si en algún momento se comparte
// lógica entre páginas, este es el primer candidato a extraer a un util.
function tiempoRestante(baneadoHasta) {
  if (!baneadoHasta) return null;
  if (baneadoHasta.startsWith("9999")) return "permanente";
  const ms = new Date(baneadoHasta).getTime() - Date.now();
  if (ms <= 0) return null;
  const dias = Math.ceil(ms / (1000 * 60 * 60 * 24));
  if (dias >= 1) return `${dias} día${dias !== 1 ? "s" : ""}`;
  const horas = Math.max(1, Math.ceil(ms / (1000 * 60 * 60)));
  return `${horas} hora${horas !== 1 ? "s" : ""}`;
}

export default function ProfilePage({ user, stories, onBack, onEdit, onDeleted, onOpen, onViewAuthor, onDeletionRequested }) {
  const misHistorias = (stories || []).filter((s) => s.author_id === user.id);
  const [siguiendo, setSiguiendo] = useState([]);
  const [profile, setProfile] = useState(null);
  const [editandoPerfil, setEditandoPerfil] = useState(false);
  const [solicitandoBorrado, setSolicitandoBorrado] = useState(false);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("username, bio, avatar_url, link_donacion, baneado_hasta")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => setProfile(data));
  }, [user.id]);

  useEffect(() => {
    supabase
      .from("seguidores")
      .select("seguido_id")
      .eq("seguidor_id", user.id)
      .then(({ data }) => setSiguiendo(data || []));
  }, [user.id]);

  // Nombres de los autores que sigue, tomados de sus propias historias ya
  // cargadas (evita una consulta nueva por cada autor)
  const nombresSeguidos = siguiendo.map((row) => {
    const historiaDeEseAutor = (stories || []).find((s) => s.author_id === row.seguido_id);
    return { id: row.seguido_id, nombre: historiaDeEseAutor?.author_name || "Autor" };
  });

  const remove = async (story) => {
    if (!window.confirm(`¿Borrar "${story.title}"? No se puede deshacer.`)) return;
    await supabase.from("stories").delete().eq("id", story.id);
    onDeleted(story.id);
  };

  const solicitarBorradoCuenta = async () => {
    const confirmado = window.confirm(
      "¿Pedir el borrado de tu cuenta? Tenés 60 días para arrepentirte y recuperarla iniciando sesión de nuevo. Pasado ese plazo, tus historias y tus datos personales se borran de forma definitiva y no se puede deshacer."
    );
    if (!confirmado) return;
    setSolicitandoBorrado(true);
    const eliminarEn = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();
    const { error } = await supabase.from("profiles").update({ eliminar_en: eliminarEn }).eq("id", user.id);
    setSolicitandoBorrado(false);
    if (!error) onDeletionRequested(eliminarEn);
  };

  return (
    <div className="max-w-3xl mx-auto px-5 pt-10 sm:pt-14 pb-24">
      <button
        onClick={onBack}
        className="mb-8 flex items-center gap-1.5 text-[#B08D57] hover:text-[#e8c9a3] transition-colors text-sm"
        style={{ fontFamily: "Lora, serif" }}
      >
        <ArrowLeft size={16} /> Volver al archivo
      </button>

      <div className="flex items-start gap-4 mb-2">
        <div
          className="w-16 h-16 rounded-full shrink-0 overflow-hidden grid place-items-center"
          style={{ background: "radial-gradient(circle at 35% 30%, #9c6a3d, #7a4f2a 60%, #5c3a1f 100%)" }}
        >
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-[#f1e2c4] text-xl" style={{ fontFamily: "Fraunces, serif" }}>
              {(profile?.username || user.email || "?").charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h1
            className="text-[#EDE6D6] text-2xl sm:text-3xl leading-tight"
            style={{ fontFamily: "Fraunces, serif", fontWeight: 700 }}
          >
            {profile?.username || "Tu perfil"}
          </h1>
          <p className="text-[#7d7389] text-sm" style={{ fontFamily: "Lora, serif" }}>
            {user.email}
          </p>
        </div>

        <button
          onClick={() => setEditandoPerfil(true)}
          className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-sm border border-[#4a3f52] text-[#b8afc4] hover:border-[#B08D57] hover:text-[#e8c9a3] transition-colors shrink-0"
          style={{ fontFamily: "Lora, serif" }}
        >
          <Settings size={14} /> Editar
        </button>
      </div>

      {profile?.bio && (
        <p className="text-[#b8afc4] text-[15px] leading-relaxed mb-3 max-w-xl" style={{ fontFamily: "Lora, serif" }}>
          {profile.bio}
        </p>
      )}

      {profile?.link_donacion && (
        <a
          href={profile.link_donacion}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 mb-8 text-sm text-[#7A2E2E] hover:text-[#a34848] transition-colors"
          style={{ fontFamily: "Lora, serif" }}
        >
          <Heart size={13} /> Tu link de donación está activo
        </a>
      )}
      {!profile?.link_donacion && <div className="mb-8" />}

      {tiempoRestante(profile?.baneado_hasta) && (
        <div className="flex items-center gap-2.5 mb-8 px-4 py-3 rounded-sm border border-[#7A2E2E] bg-[#7A2E2E]/10">
          <Clock3 size={15} className="text-[#e08a8a] shrink-0" />
          <p className="text-[#e08a8a] text-sm" style={{ fontFamily: "Lora, serif" }}>
            Tu cuenta tiene restringida la publicación y los comentarios
            {tiempoRestante(profile.baneado_hasta) === "permanente"
              ? " de forma permanente."
              : ` durante ${tiempoRestante(profile.baneado_hasta)} más.`}{" "}
            Podés seguir leyendo con normalidad.
          </p>
        </div>
      )}

      <div className="flex items-center gap-3 mb-5">
        <UserCircle2 size={16} className="text-[#7C8B63]" />
        <h2 className="text-[#7C8B63] text-xs tracking-[0.2em] uppercase" style={{ fontFamily: "Lora, serif" }}>
          Siguiendo ({nombresSeguidos.length})
        </h2>
        <div className="flex-1 h-px bg-[#4a3f52]" />
      </div>

      {nombresSeguidos.length === 0 ? (
        <p className="text-[#7d7389] italic text-sm mb-10" style={{ fontFamily: "Lora, serif" }}>
          Todavía no seguís a ningún autor.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2 mb-10">
          {nombresSeguidos.map((a) => (
            <button
              key={a.id}
              onClick={() => onViewAuthor && onViewAuthor(a.id)}
              className="px-3 py-1.5 rounded-sm border border-[#4a3f52] text-[#b8afc4] hover:border-[#B08D57] hover:text-[#e8c9a3] transition-colors text-sm"
              style={{ fontFamily: "Lora, serif" }}
            >
              {a.nombre}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3 mb-5">
        <ScrollText size={16} className="text-[#7C8B63]" />
        <h2 className="text-[#7C8B63] text-xs tracking-[0.2em] uppercase" style={{ fontFamily: "Lora, serif" }}>
          Tus crónicas ({misHistorias.length})
        </h2>
        <div className="flex-1 h-px bg-[#4a3f52]" />
      </div>

      {misHistorias.length === 0 ? (
        <p className="text-[#7d7389] italic" style={{ fontFamily: "Lora, serif" }}>
          Todavía no publicaste ninguna crónica.
        </p>
      ) : (
        <div className="space-y-4">
          {misHistorias.map((s) => (
            <div
              key={s.id}
              className="rounded-sm border border-[#4a3f52] bg-[#1d1824]/80 p-5 flex gap-4 items-start"
            >
              <button onClick={() => onOpen(s)} className="shrink-0">
                <StorySeal fraseIconica={s.frase_iconica || s.span} portadaUrl={s.portada_url} />
              </button>

              <div className="min-w-0 flex-1">
                <button onClick={() => onOpen(s)} className="text-left w-full">
                  <h3
                    className="text-[#EDE6D6] text-lg leading-snug mb-1 hover:text-[#e8c9a3] transition-colors"
                    style={{ fontFamily: "Fraunces, serif", fontWeight: 600 }}
                  >
                    {s.title}
                  </h3>
                </button>
                <div className="flex items-center gap-2 text-xs text-[#7d7389] mb-3 flex-wrap" style={{ fontFamily: "Lora, serif" }}>
                  <span className="uppercase tracking-wide text-[#7C8B63]">
                    {CATEGORIA_LABEL[s.categoria] || "Corto"}
                  </span>
                  <span>·</span>
                  <span>{s.lecturas ?? 0} lecturas</span>
                  <span>·</span>
                  <span>{new Date(s.created_at).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}</span>
                  {ESTADO_BADGE[s.estado] && (
                    <span className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full ${ESTADO_BADGE[s.estado].className}`}>
                      {ESTADO_BADGE[s.estado].label}
                    </span>
                  )}
                  {s.es_adulto && (
                    <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-[#7A2E2E]/20 text-[#e08a8a]">
                      +18
                    </span>
                  )}
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => onEdit(s)}
                    className="flex items-center gap-1.5 text-[#7C8B63] hover:text-[#9db07d] transition-colors text-sm"
                    style={{ fontFamily: "Lora, serif" }}
                  >
                    <Pencil size={13} /> Editar
                  </button>
                  <button
                    onClick={() => remove(s)}
                    className="flex items-center gap-1.5 text-[#7d7389] hover:text-[#e08a8a] transition-colors text-sm"
                    style={{ fontFamily: "Lora, serif" }}
                  >
                    <Trash2 size={13} /> Borrar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editandoPerfil && (
        <EditProfileModal
          user={user}
          profile={profile}
          onClose={() => setEditandoPerfil(false)}
          onSaved={(nuevoProfile) => setProfile(nuevoProfile)}
        />
      )}

      <div className="mt-14 pt-6 border-t border-[#4a3f52]">
        <button
          onClick={solicitarBorradoCuenta}
          disabled={solicitandoBorrado}
          className="flex items-center gap-1.5 text-[#7d7389] hover:text-[#e08a8a] transition-colors text-xs disabled:opacity-40"
          style={{ fontFamily: "Lora, serif" }}
        >
          <UserX size={12} /> {solicitandoBorrado ? "..." : "Borrar mi cuenta"}
        </button>
      </div>
    </div>
  );
}