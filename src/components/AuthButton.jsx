import React, { useState } from "react";
import { LogIn, LogOut, Mail, X } from "lucide-react";
import {
  supabase,
  signInWithGoogle,
  signInWithDiscord,
  signInWithEmail,
  signUpWithEmail,
} from "../lib/supabaseClient";

export default function AuthButton({ user }) {
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setMsg("");
    setLoading(true);
    try {
      if (mode === "login") {
        const { error } = await signInWithEmail(email, password);
        if (error) throw error;
      } else {
        const { error } = await signUpWithEmail(email, password);
        if (error) throw error;
        setMsg("Cuenta creada. Revisá tu correo para confirmar antes de iniciar sesión.");
      }
    } catch (error) {
      setErr(error.message || "Algo salió mal. Probá de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  if (user) {
    return (
      <div className="flex items-center gap-3">
        <span
          className="text-[#b8afc4] text-sm hidden sm:inline"
          style={{ fontFamily: "Lora, serif" }}
        >
          {user.user_metadata?.full_name || user.email}
        </span>
        <button
          onClick={signOut}
          className="flex items-center gap-1.5 text-[#B08D57] hover:text-[#e8c9a3] transition-colors text-sm"
          style={{ fontFamily: "Lora, serif" }}
        >
          <LogOut size={15} /> Salir
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-4 flex-wrap justify-end">
        <button
          onClick={signInWithGoogle}
          className="flex items-center gap-1.5 text-[#B08D57] hover:text-[#e8c9a3] transition-colors text-sm"
          style={{ fontFamily: "Lora, serif" }}
        >
          <LogIn size={15} /> Google
        </button>
        <button
          onClick={signInWithDiscord}
          className="flex items-center gap-1.5 text-[#B08D57] hover:text-[#e8c9a3] transition-colors text-sm"
          style={{ fontFamily: "Lora, serif" }}
        >
          <LogIn size={15} /> Discord
        </button>
        <button
          onClick={() => setShowEmailForm((v) => !v)}
          className="flex items-center gap-1.5 text-[#B08D57] hover:text-[#e8c9a3] transition-colors text-sm"
          style={{ fontFamily: "Lora, serif" }}
        >
          <Mail size={15} /> Email
        </button>
      </div>

      {showEmailForm && (
        <div className="absolute right-0 mt-3 w-72 bg-[#1d1824] border border-[#4a3f52] rounded-sm p-4 shadow-lg z-50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex gap-3 text-sm" style={{ fontFamily: "Lora, serif" }}>
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setErr("");
                  setMsg("");
                }}
                className={mode === "login" ? "text-[#e8c9a3]" : "text-[#7d7389]"}
              >
                Iniciar sesión
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setErr("");
                  setMsg("");
                }}
                className={mode === "signup" ? "text-[#e8c9a3]" : "text-[#7d7389]"}
              >
                Crear cuenta
              </button>
            </div>
            <button
              type="button"
              onClick={() => setShowEmailForm(false)}
              className="text-[#7d7389] hover:text-[#e08a8a]"
            >
              <X size={14} />
            </button>
          </div>

          <form onSubmit={handleEmailSubmit} className="space-y-2.5">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              className="w-full bg-[#0f0c14] border border-[#4a3f52] rounded-sm px-3 py-2 text-sm text-[#EDE6D6] placeholder-[#7d7389] focus:outline-none focus:ring-1 focus:ring-[#B08D57]"
              style={{ fontFamily: "Lora, serif" }}
            />
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña"
              className="w-full bg-[#0f0c14] border border-[#4a3f52] rounded-sm px-3 py-2 text-sm text-[#EDE6D6] placeholder-[#7d7389] focus:outline-none focus:ring-1 focus:ring-[#B08D57]"
              style={{ fontFamily: "Lora, serif" }}
            />

            {err && <p className="text-[#e08a8a] text-xs">{err}</p>}
            {msg && <p className="text-[#7C8B63] text-xs">{msg}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-1.5 px-4 py-2 rounded-sm bg-[#7A2E2E] hover:bg-[#8f3838] disabled:opacity-40 transition-colors text-sm text-[#EDE6D6]"
              style={{ fontFamily: "Lora, serif" }}
            >
              {loading ? "..." : mode === "login" ? "Entrar" : "Crear cuenta"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
