import React from "react";
import { ArrowLeft } from "lucide-react";

// Estilo visual compartido por /terminos y /privacidad. Si en algún momento
// se quiere cambiar cómo se ven estas páginas (tipografía, colores,
// espaciado), se edita ACÁ una sola vez — el contenido de cada documento
// vive aparte, en terminosContent.js / privacidadContent.js.
export default function LegalDocumentLayout({ titulo, subtitulo, ultimaActualizacion, secciones, enlaceRelacionado }) {
  return (
    <div
      className="min-h-screen"
      style={{
        background: "#17131C",
        backgroundImage:
          "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(122,46,46,0.12), transparent)",
      }}
    >
      <div className="max-w-2xl mx-auto px-5 py-14 sm:py-20">
        <a
          href="/"
          className="mb-10 inline-flex items-center gap-1.5 text-[#B08D57] hover:text-[#e8c9a3] transition-colors text-sm"
          style={{ fontFamily: "Lora, serif" }}
        >
          <ArrowLeft size={16} /> Volver al sitio
        </a>

        <h1
          className="text-[#EDE6D6] text-3xl sm:text-4xl leading-tight mb-1"
          style={{ fontFamily: "Fraunces, serif", fontWeight: 700 }}
        >
          {titulo}
        </h1>
        {subtitulo && (
          <p className="text-[#B08D57] text-sm italic mb-1" style={{ fontFamily: "Lora, serif" }}>
            {subtitulo}
          </p>
        )}
        <p className="text-[#7d7389] text-xs mb-12" style={{ fontFamily: "Lora, serif" }}>
          Última actualización: {ultimaActualizacion}
        </p>

        {secciones.map((seccion) => (
          <section key={seccion.encabezado} className="mb-9">
            <h2
              className="text-[#B08D57] text-lg mb-3"
              style={{ fontFamily: "Fraunces, serif", fontWeight: 700 }}
            >
              {seccion.encabezado}
            </h2>
            <div className="space-y-3">
              {seccion.parrafos.map((p, i) =>
                typeof p === "string" ? (
                  <p
                    key={i}
                    className="text-[#c9c1d4] text-[15px] leading-relaxed"
                    style={{ fontFamily: "Lora, serif" }}
                  >
                    {p}
                  </p>
                ) : (
                  <p
                    key={i}
                    className="text-[#c9c1d4] text-[15px] leading-relaxed"
                    style={{ fontFamily: "Lora, serif" }}
                  >
                    <strong className="text-[#e8c9a3]">{p.numero} </strong>
                    {p.texto}
                  </p>
                )
              )}
            </div>
          </section>
        ))}

        {enlaceRelacionado && (
          <a
            href={enlaceRelacionado.href}
            className="text-[#7d7389] text-xs hover:text-[#b8afc4] transition-colors underline"
            style={{ fontFamily: "Lora, serif" }}
          >
            {enlaceRelacionado.texto}
          </a>
        )}
      </div>
    </div>
  );
}