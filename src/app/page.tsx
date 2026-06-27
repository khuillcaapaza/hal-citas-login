"use client";

import { useEffect, useState } from "react";
import AdminPanel from "@/components/AdminPanel";
import LoginView from "@/components/LoginView";
import { clearToken, fetchPerfil, getToken } from "@/lib/api";
import type { Usuario } from "@/lib/types";

export default function Page() {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    function onAuthLogout() {
      setUsuario(null);
    }
    window.addEventListener("auth:logout", onAuthLogout);

    (async () => {
      if (getToken()) {
        try {
          setUsuario(await fetchPerfil());
        } catch {
          clearToken();
        }
      }
      setListo(true);
    })();

    return () => window.removeEventListener("auth:logout", onAuthLogout);
  }, []);

  function cerrarSesion() {
    clearToken();
    setUsuario(null);
  }

  return (
    <div className={"shell " + (usuario ? "shell--panel" : "shell--login")}>
      {!listo ? null : usuario ? (
        <AdminPanel usuario={usuario} onLogout={cerrarSesion} />
      ) : (
        <LoginView onSuccess={setUsuario} />
      )}
    </div>
  );
}
