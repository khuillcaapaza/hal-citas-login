"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  createArea,
  deleteArea,
  listAreas,
  updateArea,
} from "@/lib/api";
import type { AreaAtencion, AreaAtencionForm } from "@/lib/types";

const FORM_VACIO: AreaAtencionForm = {
  codigo: "",
  nombre: "",
  descripcion: "",
  sin_restriccion: false,
  activo: true,
};

export default function AreasManager() {
  const [items, setItems] = useState<AreaAtencion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [aviso, setAviso] = useState<{ texto: string; tipo?: "ok" | "error" }>({
    texto: "",
  });
  const [reloadKey, setReloadKey] = useState(0);

  const [modo, setModo] = useState<"lista" | "form">("lista");
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<AreaAtencionForm>(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [formMsg, setFormMsg] = useState<{ texto: string; tipo?: "error" }>({
    texto: "",
  });

  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const data = await listAreas();
        if (activo) setItems(data);
      } catch (err) {
        if (activo) setAviso({ texto: (err as Error).message, tipo: "error" });
      } finally {
        if (activo) setCargando(false);
      }
    })();
    return () => {
      activo = false;
    };
  }, [reloadKey]);

  function nuevo() {
    setEditId(null);
    setForm(FORM_VACIO);
    setFormMsg({ texto: "" });
    setModo("form");
  }

  function editar(area: AreaAtencion) {
    setEditId(area.id);
    setForm({
      codigo: area.codigo,
      nombre: area.nombre,
      descripcion: area.descripcion,
      sin_restriccion: area.sin_restriccion,
      activo: area.activo,
    });
    setFormMsg({ texto: "" });
    setModo("form");
  }

  async function eliminar(area: AreaAtencion) {
    if (
      !window.confirm(
        `¿Eliminar el área “${area.nombre}”? Esta acción no se puede deshacer.`
      )
    ) {
      return;
    }
    try {
      await deleteArea(area.id);
      setReloadKey((k) => k + 1);
      setAviso({ texto: "Área eliminada.", tipo: "ok" });
    } catch (err) {
      setAviso({ texto: (err as Error).message, tipo: "error" });
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const datos: AreaAtencionForm = {
      codigo: form.codigo.trim().toUpperCase(),
      nombre: form.nombre.trim(),
      descripcion: form.descripcion.trim(),
      sin_restriccion: form.sin_restriccion,
      activo: form.activo,
    };
    if (!datos.nombre) {
      setFormMsg({ texto: "El nombre del área es obligatorio.", tipo: "error" });
      return;
    }
    if (editId === null) {
      if (!datos.codigo) {
        setFormMsg({ texto: "El código del área es obligatorio.", tipo: "error" });
        return;
      }
      if (!/^[A-Z0-9-]{2,40}$/.test(datos.codigo)) {
        setFormMsg({
          texto:
            "El código solo admite letras, números y guiones (2 a 40 caracteres).",
          tipo: "error",
        });
        return;
      }
    }

    setGuardando(true);
    setFormMsg({ texto: "Guardando…" });
    try {
      if (editId !== null) {
        await updateArea(editId, datos);
      } else {
        await createArea(datos);
      }
      setModo("lista");
      setReloadKey((k) => k + 1);
      setAviso({ texto: "Área guardada correctamente.", tipo: "ok" });
    } catch (err) {
      setFormMsg({ texto: (err as Error).message, tipo: "error" });
    } finally {
      setGuardando(false);
    }
  }

  if (modo === "form") {
    return (
      <section className="panel-card">
        <button
          type="button"
          className="link-volver"
          onClick={() => setModo("lista")}
        >
          ← Volver a la lista
        </button>
        <h2>{editId !== null ? "Editar área" : "Nueva área de atención"}</h2>

        <form onSubmit={onSubmit} autoComplete="off" noValidate>
          <label className="campo">
            <span>Código {editId !== null && "(no editable)"}</span>
            <input
              type="text"
              maxLength={40}
              required
              disabled={editId !== null}
              placeholder="Ej. CARDIO-RQ"
              value={form.codigo}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  codigo: e.target.value.toUpperCase(),
                }))
              }
            />
          </label>

          <label className="campo">
            <span>Nombre</span>
            <input
              type="text"
              maxLength={120}
              required
              placeholder="Ej. Cirugía"
              value={form.nombre}
              onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
            />
          </label>

          <label className="campo">
            <span>Descripción (opcional)</span>
            <input
              type="text"
              maxLength={300}
              placeholder="Breve descripción del área o servicio"
              value={form.descripcion}
              onChange={(e) =>
                setForm((f) => ({ ...f, descripcion: e.target.value }))
              }
            />
          </label>

          <label className="campo campo--check">
            <input
              type="checkbox"
              checked={form.sin_restriccion}
              onChange={(e) =>
                setForm((f) => ({ ...f, sin_restriccion: e.target.checked }))
              }
            />
            <span>Atiende todos los días (se omite en la carga masiva)</span>
          </label>

          <label className="campo campo--check">
            <input
              type="checkbox"
              checked={form.activo}
              onChange={(e) =>
                setForm((f) => ({ ...f, activo: e.target.checked }))
              }
            />
            <span>Activa</span>
          </label>

          <div className="fila fila--acciones">
            <button type="submit" className="boton" disabled={guardando}>
              Guardar
            </button>
            <button
              type="button"
              className="boton boton--secundario"
              onClick={() => setModo("lista")}
            >
              Cancelar
            </button>
          </div>
          <p
            className={
              "mensaje" + (formMsg.tipo ? " mensaje--" + formMsg.tipo : "")
            }
            role="alert"
            aria-live="polite"
          >
            {formMsg.texto}
          </p>
        </form>
      </section>
    );
  }

  return (
    <section>
      <div className="seccion-head">
        <div>
          <h2>Áreas de atención</h2>
          <p className="seccion-sub">
            Catálogo de áreas/servicios usados en los cronogramas.
          </p>
        </div>
        <button type="button" className="boton boton--sm" onClick={nuevo}>
          + Nueva área
        </button>
      </div>

      {aviso.texto && (
        <p
          className={"aviso" + (aviso.tipo ? " aviso--" + aviso.tipo : "")}
          role="status"
          aria-live="polite"
        >
          {aviso.texto}
        </p>
      )}

      {cargando ? (
        <p className="cargando">Cargando…</p>
      ) : items.length === 0 ? (
        <p className="cargando">
          Aún no hay áreas. Crea la primera con “+ Nueva área”.
        </p>
      ) : (
        <div className="grid-cronogramas">
          {items.map((a) => (
            <article className="cron-card" key={a.id}>
              <div className="cron-card__top">
                <h3 style={{ margin: 0 }}>{a.nombre}</h3>
                {a.activo ? (
                  <span className="chip chip--ok">Activa</span>
                ) : (
                  <span className="chip chip--off">Inactiva</span>
                )}
              </div>
              {a.codigo && (
                <p className="seccion-sub" style={{ margin: "4px 0 0" }}>
                  <code>{a.codigo}</code>
                  {a.sin_restriccion && " · todos los días"}
                </p>
              )}
              {a.descripcion && <p>{a.descripcion}</p>}
              <div className="cron-card__acciones">
                <button
                  type="button"
                  className="boton boton--sm"
                  onClick={() => editar(a)}
                >
                  Editar
                </button>
                <button
                  type="button"
                  className="boton boton--sm boton--peligro"
                  onClick={() => eliminar(a)}
                >
                  Eliminar
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
