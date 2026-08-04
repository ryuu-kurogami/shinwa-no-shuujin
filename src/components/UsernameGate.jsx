import React, { useState } from "react";
import { Feather } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { validarUsername } from "../utils/forbiddenUsernames";

// Se muestra cuando hay sesión pero profiles.username todavía es null —
// tanto para cuentas nuevas (Google/Discord/Email) como para cualquier
// cuenta vieja que nunca pasó por esto. No se puede cerrar sin completar.
export default function UsernameGate({ userId, onDone }) {
  const [username, setUsername] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    const limpio = username.trim();

    const resultado = validarUsername(limpio);
    if (!resultado.valid) {
      setErr(resultado.error);
      return;
    }

    setSaving(true);
    setErr("");
    try {
      const { error } = await supabase.from("profiles").update({ username: limpio }).eq("id", userId);
      if (error) {
        if (error.code === "23505") {
          setErr("Ese nombre de usuario ya está en uso. Probá con otro.");
        } else if (error.message) {
          // El trigger de la base (reservados, groserías, cooldown) ya
          // devuelve el mensaje en español listo para mostrar.
          setErr(error.message);
        } else {
          setErr("No se pudo guardar. Probá de nuevo.");
        }
        return;
      }
      onDone(limpio);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#17131C] flex items-center justify-center px-6">
      <div className="max-w-sm w-full text-center">
        <Feather size={22} className="text-[#7C8B63] mx-auto mb-5" />
        <h2 className="text-[#EDE6D6] text-2xl mb-3" style={{ fontFamily: "Fraunces, serif", fontWeight: 700 }}>
          Elegí tu nombre de autor
        </h2>
        <p className="text-[#b8afc4] text-sm leading-relaxed mb-7" style={{ fontFamily: "Lora, serif" }}>
          Es el nombre con el que vas a firmar tus historias y comentarios en el Sitio. Es único —
          nadie más va a poder usarlo — y solo se pide una vez.
        </p>

        <form onSubmit={submit} className="space-y-3 text-left">
          <input
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="tu_nombre_de_autor"
            className="w-full bg-[#1d1824] border border-[#4a3f52] rounded-sm px-3 py-2.5 text-sm text-[#EDE6D6] placeholder-[#7d7389] focus:outline-none focus:ring-1 focus:ring-[#B08D57]"
            style={{ fontFamily: "Lora, serif" }}
          />
          {err && <p className="text-[#e08a8a] text-xs">{err}</p>}
          <button
            type="submit"
            disabled={saving || !username.trim()}
            className="w-full py-3 rounded-sm bg-[#7A2E2E] hover:bg-[#8f3838] disabled:opacity-40 transition-colors text-sm text-[#EDE6D6]"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            {saving ? "Guardando..." : "Confirmar nombre de autor"}
          </button>
        </form>
      </div>
    </div>
  );
}