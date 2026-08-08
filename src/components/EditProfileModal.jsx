import React, { useState, useEffect, useRef } from "react";
import { X, ImagePlus, Save, Heart } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { validarUsername } from "../utils/forbiddenUsernames";

const CLOUDINARY_CLOUD_NAME = "ahwle70d";
const CLOUDINARY_UPLOAD_PRESET = "shinwa_portadas";

export default function EditProfileModal({ user, profile, onClose, onSaved }) {
  const [username, setUsername] = useState(profile?.username || "");
  const [bio, setBio] = useState(profile?.bio || "");
  const [linkDonacion, setLinkDonacion] = useState(profile?.link_donacion || "");
  const [linkDonacion2, setLinkDonacion2] = useState(profile?.link_donacion_2 || "");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const widgetRef = useRef(null);

  useEffect(() => {
    if (window.cloudinary) return;
    const script = document.createElement("script");
    script.src = "https://upload-widget.cloudinary.com/global/all.js";
    script.async = true;
    document.body.appendChild(script);
  }, []);

  const openUploadWidget = () => {
    if (!window.cloudinary) {
      setErr("El widget todavía está cargando, esperá un segundo y probá de nuevo.");
      return;
    }
    if (!widgetRef.current) {
      widgetRef.current = window.cloudinary.createUploadWidget(
        {
          cloudName: CLOUDINARY_CLOUD_NAME,
          uploadPreset: CLOUDINARY_UPLOAD_PRESET,
          sources: ["local", "url", "camera"],
          multiple: false,
          maxFileSize: 5_000_000,
          cropping: true,
          croppingAspectRatio: 1,
          language: "es",
        },
        (uploadError, result) => {
          if (uploadError) {
            setErr("No se pudo subir la imagen. Probá de nuevo.");
            return;
          }
          if (result?.event === "success") {
            setAvatarUrl(result.info.secure_url);
            setErr("");
          }
        }
      );
    }
    widgetRef.current.open();
  };

  const submit = async (e) => {
    e.preventDefault();
    const limpio = username.trim();
    if (!limpio) {
      setErr("El nombre de usuario es obligatorio.");
      return;
    }

    // Solo corremos la validación de formato/reservados/groserías si el
    // username realmente cambió — si no, es la misma cadena que ya pasó
    // este chequeo antes (o una cuenta vieja de antes de que existiera).
    const usernameCambio = limpio !== (profile?.username || "");
    if (usernameCambio) {
      const resultado = validarUsername(limpio);
      if (!resultado.valid) {
        setErr(resultado.error);
        return;
      }
    }

    setSaving(true);
    setErr("");
    try {
      const { data, error } = await supabase
        .from("profiles")
        .update({
          username: limpio,
          bio: bio.trim().slice(0, 300) || null,
          link_donacion: linkDonacion.trim() || null,
          link_donacion_2: linkDonacion2.trim() || null,
          avatar_url: avatarUrl || null,
        })
        .eq("id", user.id)
        .select()
        .single();

      if (error) throw error;
      onSaved(data);
      onClose();
    } catch (error) {
      if (error.code === "23505") {
        setErr("Ese nombre de usuario ya está en uso.");
      } else if (usernameCambio && error.message) {
        // Cooldown de 30 días, reservados o groserías detectadas por el
        // trigger de la base — el mensaje ya viene en español.
        setErr(error.message);
      } else {
        setErr("No se pudo guardar. Probá de nuevo.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0e0b13]/90 backdrop-blur-sm overflow-y-auto">
      <div className="max-w-lg mx-auto px-5 py-10 sm:py-16">
        <button
          onClick={onClose}
          className="mb-6 flex items-center gap-1.5 text-[#B08D57] hover:text-[#e8c9a3] transition-colors text-sm"
          style={{ fontFamily: "Lora, serif" }}
        >
          <X size={16} /> Cancelar
        </button>

        <h2
          className="text-[#EDE6D6] text-2xl mb-6"
          style={{ fontFamily: "Fraunces, serif", fontWeight: 700 }}
        >
          Editar perfil
        </h2>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-[#7C8B63] text-xs tracking-wide uppercase mb-1.5" style={{ fontFamily: "Lora, serif" }}>
              Avatar
            </label>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={openUploadWidget}
                className="flex items-center gap-1.5 px-3 py-2 rounded-sm border border-[#4a3f52] text-[#B08D57] hover:text-[#e8c9a3] hover:border-[#B08D57] transition-colors text-sm"
                style={{ fontFamily: "Lora, serif" }}
              >
                <ImagePlus size={15} /> {avatarUrl ? "Cambiar avatar" : "Subir avatar"}
              </button>
              {avatarUrl && (
                <img
                  src={avatarUrl}
                  alt="Vista previa del avatar"
                  className="w-14 h-14 rounded-full object-cover border border-[#4a3f52]"
                />
              )}
            </div>
          </div>

          <div>
            <label className="block text-[#7C8B63] text-xs tracking-wide uppercase mb-1.5" style={{ fontFamily: "Lora, serif" }}>
              Nombre de usuario
            </label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-[#1d1824] border border-[#4a3f52] rounded-sm px-3 py-2.5 text-[#EDE6D6] focus:outline-none focus:ring-1 focus:ring-[#B08D57]"
              style={{ fontFamily: "Lora, serif" }}
              placeholder="tu_nombre"
            />
          </div>

          <div>
            <label className="block text-[#7C8B63] text-xs tracking-wide uppercase mb-1.5" style={{ fontFamily: "Lora, serif" }}>
              Bio — máx. 300 caracteres
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 300))}
              rows={4}
              maxLength={300}
              className="w-full bg-[#1d1824] border border-[#4a3f52] rounded-sm px-3 py-2.5 text-sm text-[#EDE6D6] focus:outline-none focus:ring-1 focus:ring-[#B08D57] resize-none"
              style={{ fontFamily: "Lora, serif" }}
              placeholder="Contá algo sobre vos y tus historias..."
            />
          </div>

          <div>
            <label className="block text-[#7C8B63] text-xs tracking-wide uppercase mb-1.5 flex items-center gap-1.5" style={{ fontFamily: "Lora, serif" }}>
              <Heart size={12} /> Link para que te apoyen (opcional)
            </label>
            <input
              value={linkDonacion}
              onChange={(e) => setLinkDonacion(e.target.value)}
              type="url"
              className="w-full bg-[#1d1824] border border-[#4a3f52] rounded-sm px-3 py-2.5 text-sm text-[#EDE6D6] focus:outline-none focus:ring-1 focus:ring-[#B08D57] mb-2"
              style={{ fontFamily: "Lora, serif" }}
              placeholder="https://ko-fi.com/tuusuario"
            />
            <input
              value={linkDonacion2}
              onChange={(e) => setLinkDonacion2(e.target.value)}
              type="url"
              className="w-full bg-[#1d1824] border border-[#4a3f52] rounded-sm px-3 py-2.5 text-sm text-[#EDE6D6] focus:outline-none focus:ring-1 focus:ring-[#B08D57]"
              style={{ fontFamily: "Lora, serif" }}
              placeholder="Un segundo link, opcional (ej. otra plataforma)"
            />
            {profile?.apoyo_habilitado === false && (
              <p className="text-[#B08D57] text-xs mt-2 leading-relaxed" style={{ fontFamily: "Lora, serif" }}>
                Tu opción de apoyo está desactivada mientras tengas contenido +18 o fanfic publicado (o que haya
                estado publicado alguna vez). Podés seguir editando estos links igual — se muestran solos en
                cuanto vuelva a estar habilitado.
              </p>
            )}
          </div>

          {err && <p className="text-[#e08a8a] text-sm">{err}</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-sm bg-[#7A2E2E] hover:bg-[#8f3838] disabled:opacity-50 text-[#EDE6D6] font-medium tracking-wide transition-colors"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            <Save size={16} /> {saving ? "Guardando..." : "Guardar perfil"}
          </button>
        </form>
      </div>
    </div>
  );
}