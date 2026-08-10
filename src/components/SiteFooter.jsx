import React from "react";
import { Flag } from "lucide-react";

// Footer general del sitio — no es específico de ningún tema puntual
// (donaciones, moderación, etc.), es el "esto es lo que hay que saber"
// mínimo, visible en cualquier pestaña.
export default function SiteFooter() {
  return (
    <footer className="max-w-3xl mx-auto px-5 pt-10 pb-8 mt-6 border-t border-[#4a3f52]/60">
      <p className="text-[#7d7389] text-xs leading-relaxed mb-3" style={{ fontFamily: "Lora, serif" }}>
        Shinwa no Shuujin es un proyecto sin fines de lucro. El autor de cada obra conserva sus derechos sobre
        ella; publicarla acá no le transfiere la propiedad al Sitio ni a terceros. El Sitio respeta los
        derechos de autor de obras de terceros y actúa ante reportes de infracción con evidencia razonable.
      </p>
      <p className="flex items-center gap-1.5 text-[#7d7389] text-xs" style={{ fontFamily: "Lora, serif" }}>
        <Flag size={12} className="text-[#B08D57]" />
        ¿Encontraste tu obra publicada acá sin tu permiso? Podés reportarla directamente desde cualquier
        capítulo — no hace falta crear una cuenta.
      </p>
    </footer>
  );
}
