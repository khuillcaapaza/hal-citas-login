"use client";

import { useEffect, useState } from "react";
import AdminPanel from "@/components/AdminPanel";
import { fetchPerfil, getToken, redirectToAuth } from "@/lib/api";
import type { Usuario } from "@/lib/types";

export default function Page() {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    function onAuthLogout() {
      // La sesión SSO la gestiona hal-auth; aquí solo volvemos al portal.
      redirectToAuth();
    }
    window.addEventListener("auth:logout", onAuthLogout);

    (async () => {
      const token = getToken();
      if (token) {
        try {
          setUsuario(await fetchPerfil());
        } catch {
          // Token inválido/expirado → redirigir al portal de auth
          redirectToAuth();
          return;
        }
      } else {
        // Sin cookie SSO → ir a hal-auth
        redirectToAuth();
        return;
      }
      setListo(true);
    })();

    return () => window.removeEventListener("auth:logout", onAuthLogout);
  }, []);

  if (!listo) {
    return (
      <div className="shell shell--login">
        <p style={{ color: "rgba(255,255,255,0.8)" }}>Verificando sesión…</p>
      </div>
    );
  }

  function cerrarSesion() {
    // El logout real lo gestiona hal-auth. Los módulos se abren en una pestaña
    // nueva desde el portal, así que aquí solo cerramos esa pestaña. Si el
    // navegador no permite cerrarla (no se abrió por script), volvemos a auth.
    window.close();
    window.setTimeout(redirectToAuth, 150);
  }

  return (
    <div className="shell shell--panel">
      {usuario && <AdminPanel usuario={usuario} onLogout={cerrarSesion} />}
    </div>
  );
}
