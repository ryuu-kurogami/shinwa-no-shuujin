import React from "react";
import { Archive, Compass, Bookmark, UserCircle2, Feather, ShieldAlert } from "lucide-react";

const TABS = [
  { value: "archivo", label: "Archaium", icon: Archive },
  { value: "explorar", label: "Vestigare", icon: Compass },
  { value: "biblioteca", label: "Armarium", icon: Bookmark },
  { value: "perfil", label: "Adumbratio", icon: UserCircle2 },
  { value: "escribir", label: "Fabricari", icon: Feather },
];

export default function NavBar({ current, onChange, user, isAdmin }) {
  const tabs = isAdmin
    ? [...TABS, { value: "moderacion", label: "Moderación", icon: ShieldAlert }]
    : TABS;

  return (
    <nav
      className="sticky top-0 z-40 border-b border-[#4a3f52] backdrop-blur-md"
      style={{ background: "rgba(23,19,28,0.92)" }}
    >
      <div className="max-w-3xl mx-auto px-5 flex gap-1 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isProtected = (tab.value === "perfil" || tab.value === "biblioteca" || tab.value === "escribir") && !user;
          const active = current === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => onChange(tab.value)}
              className={`flex items-center gap-1.5 px-3.5 py-3 text-sm border-b-2 transition-colors whitespace-nowrap ${
                active
                  ? "border-[#B08D57] text-[#e8c9a3]"
                  : "border-transparent text-[#7d7389] hover:text-[#b8afc4]"
              }`}
              style={{ fontFamily: "Lora, serif" }}
              title={isProtected ? "Necesitás iniciar sesión" : undefined}
            >
              <Icon size={15} /> {tab.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
