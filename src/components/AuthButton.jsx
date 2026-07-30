import React from "react";
import { LogIn, LogOut } from "lucide-react";
import { supabase, signInWithGoogle } from "../lib/supabaseClient";

export default function AuthButton({ user }) {
  const signOut = async () => {
    await supabase.auth.signOut();
  };

  if (user) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-[#b8afc4] text-sm hidden sm:inline" style={{ fontFamily: "Lora, serif" }}>
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
    <button
      onClick={signInWithGoogle}
      className="flex items-center gap-1.5 text-[#B08D57] hover:text-[#e8c9a3] transition-colors text-sm"
      style={{ fontFamily: "Lora, serif" }}
    >
      <LogIn size={15} /> Iniciar sesión con Google
    </button>
  );
}
