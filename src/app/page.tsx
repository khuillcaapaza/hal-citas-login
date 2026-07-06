"use client";

import { useEffect, useState } from "react";
import AdminPanel from "@/components/AdminPanel";
import { clearToken, fetchPerfil, getToken, redirectToAuth } from "@/lib/api";
import type { Usuario } from "@/lib/types";

export default function Page() {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    function onAuthLogout() {
      clearToken();
      setUsuario(null);
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
          clearToken();
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
    clearToken();
    redirectToAuth();
  }

  return (
    <div className="shell shell--panel">
      {usuario && <AdminPanel usuario={usuario} onLogout={cerrarSesion} />}
    </div>
  );
}
