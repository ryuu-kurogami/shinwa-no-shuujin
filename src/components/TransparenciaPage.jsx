import React, { useEffect, useState, useCallback } from "react";
import {
  ArrowLeft,
  Heart,
  Users,
  ScrollText,
  Eye,
  Mail,
  Megaphone,
  Trash2,
  Clock3,
  ExternalLink,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";

// --- Configuración que Santi puede ajustar sin tocar el resto del archivo ---

// TODO Santi: poné acá la fecha real de lanzamiento del sitio.
const FECHA_LANZAMIENTO = new Date("2026-07-30T16:35:50-03:00");

// Cambiá a "USD" (u otra) si las donaciones no son en guaraníes.
const MONEDA = "₲";

// Completá los links reales cuando tengas las cuentas creadas — mientras
// una red no tenga url, no se muestra.
const REDES = [
  { label: "Facebook", url: "" },
  { label: "Discord", url: "" },
  { label: "Reddit", url: "" },
];

const CONTACTO = "shinwanoshuujin@gmail.com";

function formatMonto(n) {
  return `${MONEDA} ${Number(n || 0).toLocaleString("es-PY")}`;
}

function tiempoActivo(desde) {
  const ms = Date.now() - desde.getTime();
  const dias = Math.floor(ms / (1000 * 60 * 60 * 24));
  const anios = Math.floor(dias / 365);
  const meses = Math.floor((dias % 365) / 30);
  const diasRestantes = dias % 30;

  const partes = [];
  if (anios > 0) partes.push(`${anios} año${anios !== 1 ? "s" : ""}`);
  if (meses > 0) partes.push(`${meses} mes${meses !== 1 ? "es" : ""}`);
  if (anios === 0 && diasRestantes > 0) partes.push(`${diasRestantes} día${diasRestantes !== 1 ? "s" : ""}`);
  return partes.length > 0 ? partes.join(", ") : "recién empezando";
}

export default function TransparenciaPage({ onBack, isAdmin }) {
  const [stats, setStats] = useState(null);
  const [fondos, setFondos] = useState(null);
  const [anuncios, setAnuncios] = useState(null);
  const [nuevoAnuncio, setNuevoAnuncio] = useState("");
  const [guardandoAnuncio, setGuardandoAnuncio] = useState(false);

  const cargarStats = useCallback(async () => {
    const { data } = await supabase.from("stories").select("author_id, lecturas").eq("estado", "publicado");
    if (!data) return;
    setStats({
      historias: data.length,
      autores: new Set(data.map((s) => s.author_id)).size,
      lecturas: data.reduce((sum, s) => sum + (s.lecturas || 0), 0),
    });
  }, []);

  const cargarFondos = useCallback(async () => {
    const { data } = await supabase.from("fondos_sitio").select("*").order("created_at", { ascending: false });
    setFondos(data || []);
  }, []);

  const cargarAnuncios = useCallback(async () => {
    const { data } = await supabase.from("anuncios").select("*").order("created_at", { ascending: false });
    setAnuncios(data || []);
  }, []);

  useEffect(() => {
    cargarStats();
    cargarFondos();
    cargarAnuncios();
  }, [cargarStats, cargarFondos, cargarAnuncios]);

  const publicarAnuncio = async (e) => {
    e.preventDefault();
    if (!nuevoAnuncio.trim()) return;
    setGuardandoAnuncio(true);
    await supabase.from("anuncios").insert({ texto: nuevoAnuncio.trim() });
    setNuevoAnuncio("");
    setGuardandoAnuncio(false);
    cargarAnuncios();
  };

  const borrarAnuncio = async (id) => {
    await supabase.from("anuncios").delete().eq("id", id);
    cargarAnuncios();
  };

  const totalRecibido = (fondos || [])
    .filter((f) => f.tipo === "ingreso")
    .reduce((s, f) => s + Number(f.monto), 0);
  const gastos = (fondos || []).filter((f) => f.tipo === "gasto");
  const totalGastado = gastos.reduce((s, f) => s + Number(f.monto), 0);
  const reserva = totalRecibido - totalGastado;

  const redesConLink = REDES.filter((r) => r.url);

  return (
    <div className="max-w-2xl 2xl:max-w-3xl mx-auto px-5 pt-10 sm:pt-14 pb-24">
      <button
        onClick={onBack}
        className="mb-8 flex items-center gap-1.5 text-[#B08D57] hover:text-[#e8c9a3] transition-colors text-sm"
        style={{ fontFamily: "Lora, serif" }}
      >
        <ArrowLeft size={16} /> Volver al archivo
      </button>

      <h1 className="text-[#EDE6D6] text-3xl mb-2" style={{ fontFamily: "Fraunces, serif", fontWeight: 700 }}>
        Sobre Shinwa no Shuujin
      </h1>
      <p className="text-[#7d7389] text-sm mb-2" style={{ fontFamily: "Lora, serif" }}>
        En línea desde el {FECHA_LANZAMIENTO.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })} ·{" "}
        {tiempoActivo(FECHA_LANZAMIENTO)} activo
      </p>
      <p className="text-[#b8afc4] text-[15px] leading-relaxed mb-10 max-w-xl" style={{ fontFamily: "Lora, serif" }}>
        Un espacio gratuito y sin fines de lucro para leer y publicar ficción — relatos cortos, novelas y
        fanfics. Un proyecto de una sola persona, hecho por amor a la escritura y a la lectura.
      </p>

      {/* ---------- Estadísticas ---------- */}
      <div className="grid grid-cols-3 gap-3 mb-10">
        <div className="rounded-sm border border-[#4a3f52] bg-[#1d1824]/80 p-4 text-center">
          <ScrollText size={16} className="text-[#7C8B63] mx-auto mb-1.5" />
          <p className="text-[#EDE6D6] text-xl" style={{ fontFamily: "Fraunces, serif", fontWeight: 700 }}>
            {stats ? stats.historias : "…"}
          </p>
          <p className="text-[#7d7389] text-[11px] uppercase tracking-wide" style={{ fontFamily: "Lora, serif" }}>
            Historias
          </p>
        </div>
        <div className="rounded-sm border border-[#4a3f52] bg-[#1d1824]/80 p-4 text-center">
          <Users size={16} className="text-[#7C8B63] mx-auto mb-1.5" />
          <p className="text-[#EDE6D6] text-xl" style={{ fontFamily: "Fraunces, serif", fontWeight: 700 }}>
            {stats ? stats.autores : "…"}
          </p>
          <p className="text-[#7d7389] text-[11px] uppercase tracking-wide" style={{ fontFamily: "Lora, serif" }}>
            Autores
          </p>
        </div>
        <div className="rounded-sm border border-[#4a3f52] bg-[#1d1824]/80 p-4 text-center">
          <Eye size={16} className="text-[#7C8B63] mx-auto mb-1.5" />
          <p className="text-[#EDE6D6] text-xl" style={{ fontFamily: "Fraunces, serif", fontWeight: 700 }}>
            {stats ? stats.lecturas : "…"}
          </p>
          <p className="text-[#7d7389] text-[11px] uppercase tracking-wide" style={{ fontFamily: "Lora, serif" }}>
            Lecturas
          </p>
        </div>
      </div>

      {/* ---------- Donaciones ---------- */}
      <div className="flex items-center gap-2 mb-4">
        <Heart size={15} className="text-[#7A2E2E]" />
        <h2 className="text-[#B08D57] text-xs tracking-[0.2em] uppercase" style={{ fontFamily: "Lora, serif" }}>
          Donaciones al sitio
        </h2>
        <div className="flex-1 h-px bg-[#4a3f52]" />
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-sm border border-[#4a3f52] bg-[#1d1824]/80 p-4">
          <p className="text-[#7d7389] text-[11px] uppercase tracking-wide mb-1" style={{ fontFamily: "Lora, serif" }}>
            Total recibido
          </p>
          <p className="text-[#e8c9a3] text-lg" style={{ fontFamily: "Fraunces, serif", fontWeight: 700 }}>
            {formatMonto(totalRecibido)}
          </p>
        </div>
        <div className="rounded-sm border border-[#4a3f52] bg-[#1d1824]/80 p-4">
          <p className="text-[#7d7389] text-[11px] uppercase tracking-wide mb-1" style={{ fontFamily: "Lora, serif" }}>
            Reserva actual
          </p>
          <p className="text-[#c3d1a8] text-lg" style={{ fontFamily: "Fraunces, serif", fontWeight: 700 }}>
            {formatMonto(reserva)}
          </p>
        </div>
      </div>

      {gastos.length > 0 && (
        <div className="mb-10">
          <p className="text-[#7d7389] text-xs mb-2" style={{ fontFamily: "Lora, serif" }}>
            En qué se usó ({formatMonto(totalGastado)} en total):
          </p>
          <ul className="space-y-1.5">
            {gastos.map((g) => (
              <li key={g.id} className="flex justify-between gap-3 text-sm" style={{ fontFamily: "Lora, serif" }}>
                <span className="text-[#b8afc4]">{g.descripcion}</span>
                <span className="text-[#7d7389] shrink-0">{formatMonto(g.monto)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {gastos.length === 0 && <div className="mb-10" />}

      {/* ---------- Qué se viene ---------- */}
      <div className="flex items-center gap-2 mb-4">
        <Megaphone size={15} className="text-[#B08D57]" />
        <h2 className="text-[#B08D57] text-xs tracking-[0.2em] uppercase" style={{ fontFamily: "Lora, serif" }}>
          Qué se viene
        </h2>
        <div className="flex-1 h-px bg-[#4a3f52]" />
      </div>

      {isAdmin && (
        <form onSubmit={publicarAnuncio} className="mb-4 flex gap-2">
          <input
            value={nuevoAnuncio}
            onChange={(e) => setNuevoAnuncio(e.target.value)}
            placeholder="Nuevo aviso para los lectores..."
            className="flex-1 bg-[#1d1824] border border-[#4a3f52] rounded-sm px-3 py-2 text-sm text-[#EDE6D6] placeholder-[#7d7389] focus:outline-none focus:ring-1 focus:ring-[#B08D57]"
            style={{ fontFamily: "Lora, serif" }}
          />
          <button
            type="submit"
            disabled={guardandoAnuncio || !nuevoAnuncio.trim()}
            className="px-3.5 py-2 rounded-sm bg-[#7A2E2E] hover:bg-[#8f3838] disabled:opacity-40 text-[#EDE6D6] text-sm transition-colors"
            style={{ fontFamily: "Lora, serif" }}
          >
            Publicar
          </button>
        </form>
      )}

      {anuncios === null ? (
        <p className="text-[#7d7389] text-sm mb-10" style={{ fontFamily: "Lora, serif" }}>Cargando...</p>
      ) : anuncios.length === 0 ? (
        <p className="text-[#7d7389] italic text-sm mb-10" style={{ fontFamily: "Lora, serif" }}>
          No hay avisos por ahora.
        </p>
      ) : (
        <div className="space-y-2.5 mb-10">
          {anuncios.map((a) => (
            <div key={a.id} className="rounded-sm border border-[#4a3f52] bg-[#1d1824]/80 p-3.5 flex gap-3 items-start">
              <div className="min-w-0 flex-1">
                <p className="text-[#c9c1d4] text-sm leading-relaxed" style={{ fontFamily: "Lora, serif" }}>
                  {a.texto}
                </p>
                <p className="flex items-center gap-1 text-[#7d7389] text-[11px] mt-1">
                  <Clock3 size={10} />
                  {new Date(a.created_at).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              </div>
              {isAdmin && (
                <button
                  onClick={() => borrarAnuncio(a.id)}
                  className="text-[#7d7389] hover:text-[#e08a8a] transition-colors shrink-0"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ---------- Redes y asistencia ---------- */}
      <div className="grid sm:grid-cols-2 gap-6 mb-10">
        <div>
          <h2 className="text-[#B08D57] text-xs tracking-[0.2em] uppercase mb-3" style={{ fontFamily: "Lora, serif" }}>
            Redes
          </h2>
          {redesConLink.length === 0 ? (
            <p className="text-[#7d7389] text-sm italic" style={{ fontFamily: "Lora, serif" }}>
              Todavía no hay redes activas.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {redesConLink.map((r) => (
                <a
                  key={r.label}
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-[#b8afc4] hover:text-[#e8c9a3] text-sm transition-colors"
                  style={{ fontFamily: "Lora, serif" }}
                >
                  <ExternalLink size={13} /> {r.label}
                </a>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="text-[#B08D57] text-xs tracking-[0.2em] uppercase mb-3" style={{ fontFamily: "Lora, serif" }}>
            Asistencia
          </h2>
          <a
            href={`mailto:${CONTACTO}`}
            className="flex items-center gap-1.5 text-[#b8afc4] hover:text-[#e8c9a3] text-sm transition-colors"
            style={{ fontFamily: "Lora, serif" }}
          >
            <Mail size={13} /> {CONTACTO}
          </a>
        </div>
      </div>

      {/* ---------- Legal y créditos (franja discreta) ---------- */}
      <div className="pt-6 border-t border-[#4a3f52] flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <a
          href="/terminos"
          className="text-[#7d7389] text-xs hover:text-[#b8afc4] transition-colors underline"
          style={{ fontFamily: "Lora, serif" }}
        >
          Términos y Condiciones
        </a>
        <a
          href="/privacidad"
          className="text-[#7d7389] text-xs hover:text-[#b8afc4] transition-colors underline"
          style={{ fontFamily: "Lora, serif" }}
        >
          Política de Privacidad
        </a>
        <span className="text-[#7d7389] text-xs" style={{ fontFamily: "Lora, serif" }}>
          Hecho con Supabase, Vercel, Cloudinary y Cloudflare Turnstile.
        </span>
      </div>
    </div>
  );
}