import React, { useState } from "react";
import { LogIn, Mail, Ghost, ArrowLeft } from "lucide-react";
import {
  supabase,
  signInWithGoogle,
  signInWithDiscord,
  signInWithEmail,
  signUpWithEmail,
} from "../lib/supabaseClient";

const STORAGE_KEY = "archaium_pacto_aceptado";

export function pactoYaAceptado() {
  return typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY) === "true";
}

export default function UmbralGate({ onEnter }) {
  const [step, setStep] = useState(1); // 1: manifiesto | 2: identidad | 3: email | entering: transición
  const [emailMode, setEmailMode] = useState("login"); // "login" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const marcarPactoAceptado = () => localStorage.setItem(STORAGE_KEY, "true");

  // Google/Discord redirigen fuera de la página — al volver, la sesión ya
  // existe y el umbral no vuelve a aparecer (localStorage ya quedó marcado).
  const entrarConOAuth = (proveedor) => {
    marcarPactoAceptado();
    if (proveedor === "google") signInWithGoogle();
    if (proveedor === "discord") signInWithDiscord();
  };

  const entrarComoSombra = () => {
    marcarPactoAceptado();
    setStep("entering");
    setTimeout(() => onEnter(), 900);
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setMsg("");
    setLoading(true);
    try {
      if (emailMode === "login") {
        const { error } = await signInWithEmail(email, password);
        if (error) throw error;
        marcarPactoAceptado();
        setStep("entering");
        setTimeout(() => onEnter(), 700);
      } else {
        const { error } = await signUpWithEmail(email, password);
        if (error) throw error;
        setMsg("Tu firma quedó registrada. Revisá tu correo para confirmar antes de entrar.");
      }
    } catch (error) {
      setErr(error.message || "Algo salió mal. Probá de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] overflow-y-auto"
      style={{
        background: "#17131C",
        backgroundImage:
          "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(122,46,46,0.22), transparent), radial-gradient(ellipse 60% 40% at 90% 10%, rgba(124,139,99,0.14), transparent)",
      }}
    >
      <div className="max-w-lg mx-auto px-6 py-14 sm:py-20 min-h-screen flex flex-col justify-center">
        {step === "entering" && (
          <div className="text-center animate-pulse">
            <p className="text-[#B08D57] text-sm tracking-[0.3em] uppercase" style={{ fontFamily: "Lora, serif" }}>
              Cruzando el umbral...
            </p>
          </div>
        )}

        {step === 1 && (
          <div className="text-center">
            <span
              className="text-[#7C8B63] text-xs tracking-[0.25em] uppercase block mb-6"
              style={{ fontFamily: "Lora, serif" }}
            >
              El Umbral de Archaium
            </span>

            <p
              className="text-[#d8d1e0] text-[16px] sm:text-[17px] leading-[1.9] mb-10 whitespace-pre-line"
              style={{ fontFamily: "Lora, serif" }}
            >
              {`Detén tu paso, viajero del mundo de vigilia.
Estás ante las puertas de Archaium.

Lo que aquí yace no son fábulas inventadas por el ocio de los hombres, sino vestigios rescatados de un plano onírico: verdades prohibidas que el tiempo sepultó en el letargo y que hoy vuelven a respirar. Quien cruza este umbral no solo lee; se convierte en testigo de realidades que alguna vez existieron.

Despójate del ruido de la tierra. Prepara tu mente para la travesía.`}
            </p>

            <div className="border-t border-b border-[#4a3f52] py-6 mb-8">
              <h3
                className="text-[#B08D57] text-xs tracking-[0.2em] uppercase mb-3"
                style={{ fontFamily: "Lora, serif" }}
              >
                El Juramento del Argonauta
              </h3>
              <p className="text-[#b8afc4] text-sm leading-relaxed italic" style={{ fontFamily: "Lora, serif" }}>
                «Al aceptar, juro respetar la autoría de estas memorias, no replicar sus secretos sin el permiso
                del artífice y navegar por estas aguas con el debido respeto a los mitos aquí revelados».
              </p>
            </div>

            <button
              onClick={() => setStep(2)}
              className="w-full py-3.5 rounded-sm bg-[#7A2E2E] hover:bg-[#8f3838] text-[#EDE6D6] font-medium tracking-wide transition-colors mb-3"
              style={{ fontFamily: "Fraunces, serif" }}
            >
              Sellar el Pacto y Entrar
            </button>

            <a
              href="/terminos"
              className="text-[#7d7389] text-xs hover:text-[#b8afc4] transition-colors underline"
              style={{ fontFamily: "Lora, serif" }}
            >
              Leer los términos completos
            </a>
            {" · "}
            <a
              href="/privacidad"
              className="text-[#7d7389] text-xs hover:text-[#b8afc4] transition-colors underline"
              style={{ fontFamily: "Lora, serif" }}
            >
              Política de privacidad
            </a>
          </div>
        )}

        {step === 2 && (
          <div className="text-center">
            <span
              className="text-[#7C8B63] text-xs tracking-[0.25em] uppercase block mb-6"
              style={{ fontFamily: "Lora, serif" }}
            >
              Manifiesta tu identidad
            </span>

            <p className="text-[#d8d1e0] text-[16px] leading-relaxed mb-10" style={{ fontFamily: "Lora, serif" }}>
              Para grabar tu nombre en el Registro de los Argonautas y dejar tu huella en el tiempo,
              manifiesta tu identidad:
            </p>

            <div className="space-y-3 mb-8">
              <button
                onClick={() => entrarConOAuth("google")}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-sm border border-[#B08D57] text-[#e8c9a3] hover:bg-[#B08D57]/10 transition-colors text-sm"
                style={{ fontFamily: "Lora, serif" }}
              >
                <LogIn size={16} /> Invocar credenciales de Google
              </button>
              <button
                onClick={() => entrarConOAuth("discord")}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-sm border border-[#4a3f52] text-[#b8afc4] hover:border-[#B08D57] hover:text-[#e8c9a3] transition-colors text-sm"
                style={{ fontFamily: "Lora, serif" }}
              >
                <LogIn size={16} /> Invocar credenciales de Discord
              </button>
              <button
                onClick={() => setStep(3)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-sm border border-[#4a3f52] text-[#b8afc4] hover:border-[#B08D57] hover:text-[#e8c9a3] transition-colors text-sm"
                style={{ fontFamily: "Lora, serif" }}
              >
                <Mail size={16} /> Registrar tu firma en el pergamino
              </button>
            </div>

            <p className="text-[#7d7389] text-xs mb-3" style={{ fontFamily: "Lora, serif" }}>
              O, si prefieres recorrer estas tierras sin dejar huella...
            </p>
            <button
              onClick={entrarComoSombra}
              className="flex items-center gap-1.5 mx-auto text-[#7d7389] hover:text-[#b8afc4] transition-colors text-sm"
              style={{ fontFamily: "Lora, serif" }}
            >
              <Ghost size={14} /> Cruzar el Umbral como Sombra
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="text-center">
            <button
              onClick={() => {
                setStep(2);
                setErr("");
                setMsg("");
              }}
              className="flex items-center gap-1.5 text-[#7d7389] hover:text-[#b8afc4] transition-colors text-sm mb-8 mx-auto"
              style={{ fontFamily: "Lora, serif" }}
            >
              <ArrowLeft size={14} /> Volver
            </button>

            <div className="flex gap-4 justify-center mb-6 text-sm" style={{ fontFamily: "Lora, serif" }}>
              <button
                type="button"
                onClick={() => { setEmailMode("login"); setErr(""); setMsg(""); }}
                className={emailMode === "login" ? "text-[#e8c9a3]" : "text-[#7d7389]"}
              >
                Ya tengo firma
              </button>
              <button
                type="button"
                onClick={() => { setEmailMode("signup"); setErr(""); setMsg(""); }}
                className={emailMode === "signup" ? "text-[#e8c9a3]" : "text-[#7d7389]"}
              >
                Registrar firma nueva
              </button>
            </div>

            <form onSubmit={handleEmailSubmit} className="space-y-3 text-left">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="w-full bg-[#1d1824] border border-[#4a3f52] rounded-sm px-3 py-2.5 text-sm text-[#EDE6D6] placeholder-[#7d7389] focus:outline-none focus:ring-1 focus:ring-[#B08D57]"
                style={{ fontFamily: "Lora, serif" }}
              />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Contraseña"
                className="w-full bg-[#1d1824] border border-[#4a3f52] rounded-sm px-3 py-2.5 text-sm text-[#EDE6D6] placeholder-[#7d7389] focus:outline-none focus:ring-1 focus:ring-[#B08D57]"
                style={{ fontFamily: "Lora, serif" }}
              />

              {err && <p className="text-[#e08a8a] text-xs">{err}</p>}
              {msg && <p className="text-[#7C8B63] text-xs">{msg}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-sm bg-[#7A2E2E] hover:bg-[#8f3838] disabled:opacity-40 transition-colors text-sm text-[#EDE6D6]"
                style={{ fontFamily: "Fraunces, serif" }}
              >
                {loading ? "..." : emailMode === "login" ? "Entrar" : "Registrar firma"}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}