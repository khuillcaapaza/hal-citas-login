"use client";

import { useCallback, useEffect, useState } from "react";
import AreasManager from "./AreasManager";
import CronogramaEditor from "./CronogramaEditor";
import CronogramaList from "./CronogramaList";
import CronogramaPreview from "./CronogramaPreview";
import { UsersManagement } from "./UsersManagement";
import { ChangePasswordForm } from "./ChangePasswordForm";
import { deleteCronograma, getCronograma } from "@/lib/api";
import type { Cronograma, CronogramaForm, Usuario } from "@/lib/types";
import { monthLabel } from "@/lib/utils";

interface Props {
  usuario: Usuario;
  onLogout: () => void;
}

type Seccion = "cronogramas" | "areas" | "usuarios" | "settings";
type Vista = "lista" | "editor" | "preview";

function IconoCalendario() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function IconoAreas() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function IconoUsuarios() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconoSeguridad() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

export default function AdminPanel({ usuario, onLogout }: Props) {
  const [seccion, setSeccion] = useState<Seccion>("cronogramas");
  const [vista, setVista] = useState<Vista>("lista");
  const [aviso, setAviso] = useState<{ texto: string; tipo?: "ok" | "error" }>({
    texto: "",
  });
  const [editorInitial, setEditorInitial] = useState<Cronograma | null>(null);
  const [editorKey, setEditorKey] = useState("nuevo");
  const [previewData, setPreviewData] = useState<CronogramaForm | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Sincroniza la sección del sidebar con la URL (?view=) mediante History API.
  const navegar = useCallback((search: string) => {
    const url = window.location.pathname + (search ? `?${search}` : "");
    window.history.pushState(null, "", url);
  }, []);

  const aplicarDesdeUrl = useCallback(() => {
    const view = new URLSearchParams(window.location.search).get("view");
    if (view === "areas" || view === "usuarios" || view === "settings") {
      setSeccion(view);
    } else {
      setSeccion("cronogramas");
      setVista("lista");
    }
  }, []);

  useEffect(() => {
    aplicarDesdeUrl();
    window.addEventListener("popstate", aplicarDesdeUrl);
    return () => window.removeEventListener("popstate", aplicarDesdeUrl);
  }, [aplicarDesdeUrl]);

  function irASeccion(s: Seccion) {
    setSeccion(s);
    if (s === "cronogramas") setVista("lista");
    navegar(s === "cronogramas" ? "" : "view=" + s);
  }

  function nuevo() {
    setAviso({ texto: "" });
    setEditorInitial(null);
    setEditorKey("nuevo-" + Date.now());
    setVista("editor");
  }

  async function editar(mes: string) {
    setAviso({ texto: "" });
    try {
      const c = await getCronograma(mes);
      setEditorInitial(c);
      setEditorKey(mes);
      setVista("editor");
    } catch (err) {
      setAviso({ texto: (err as Error).message, tipo: "error" });
    }
  }

  async function eliminar(mes: string) {
    if (
      !window.confirm(
        `¿Eliminar el cronograma de ${monthLabel(
          mes
        )}? Esta acción no se puede deshacer.`
      )
    ) {
      return;
    }
    try {
      await deleteCronograma(mes);
      setReloadKey((k) => k + 1);
      setAviso({ texto: "Cronograma eliminado.", tipo: "ok" });
    } catch (err) {
      setAviso({ texto: (err as Error).message, tipo: "error" });
    }
  }

  function guardado() {
    setVista("lista");
    setReloadKey((k) => k + 1);
    setAviso({ texto: "Cronograma guardado correctamente.", tipo: "ok" });
  }

  return (
    <div className="panel">
      <header className="topbar">
        <div className="topbar__brand">
          <strong>Sistema para el Cronograma de Atención de Citas</strong>
          <span>Hospital Antonio Lorena</span>
        </div>
        <div className="topbar__user">
          <span>
            Hola, <strong>{usuario.nombre || usuario.usuario}</strong>
            {usuario.rol ? ` (${usuario.rol})` : ""}
          </span>
          <button
            type="button"
            className="boton boton--secundario boton--sm"
            onClick={onLogout}
          >
            Salir
          </button>
        </div>
      </header>

      <div className="layout">
        <aside className="sidebar">
          <nav>
            <button
              type="button"
              className={
                "nav-item" +
                (seccion === "cronogramas" ? " nav-item--activo" : "")
              }
              onClick={() => irASeccion("cronogramas")}
            >
              <IconoCalendario />
              Cronogramas
            </button>
            <button
              type="button"
              className={
                "nav-item" + (seccion === "areas" ? " nav-item--activo" : "")
              }
              onClick={() => irASeccion("areas")}
            >
              <IconoAreas />
              Áreas de atención
            </button>
            {usuario.rol === "admin" && (
              <button
                type="button"
                className={
                  "nav-item" + (seccion === "usuarios" ? " nav-item--activo" : "")
                }
                onClick={() => irASeccion("usuarios")}
              >
                <IconoUsuarios />
                Gestión de Usuarios
              </button>
            )}
            <button
              type="button"
              className={
                "nav-item" + (seccion === "settings" ? " nav-item--activo" : "")
              }
              onClick={() => irASeccion("settings")}
            >
              <IconoSeguridad />
              Cambiar Contraseña
            </button>
          </nav>
        </aside>

        <main className="contenido">
          {seccion === "usuarios" ? (
            <UsersManagement />
          ) : seccion === "settings" ? (
            <ChangePasswordForm />
          ) : seccion === "areas" ? (
            <AreasManager />
          ) : (
            <>
              {vista === "lista" && aviso.texto && (
                <p
                  className={
                    "aviso" + (aviso.tipo ? " aviso--" + aviso.tipo : "")
                  }
                  role="status"
                  aria-live="polite"
                >
                  {aviso.texto}
                </p>
              )}

              {vista === "lista" && (
                <CronogramaList
                  reloadKey={reloadKey}
                  onNew={nuevo}
                  onEdit={editar}
                  onDelete={eliminar}
                />
              )}

              {(vista === "editor" || vista === "preview") && (
                <>
                  <div
                    style={{
                      display: vista === "editor" ? undefined : "none",
                    }}
                  >
                    <CronogramaEditor
                      key={editorKey}
                      initial={editorInitial}
                      onCancel={() => setVista("lista")}
                      onSaved={guardado}
                      onPreview={(data) => {
                        setPreviewData(data);
                        setVista("preview");
                      }}
                    />
                  </div>

                  {vista === "preview" && previewData && (
                    <section className="panel-card">
                      <button
                        type="button"
                        className="link-volver"
                        onClick={() => setVista("editor")}
                      >
                        ← Volver al editor
                      </button>
                      <CronogramaPreview data={previewData} />
                    </section>
                  )}
                </>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
