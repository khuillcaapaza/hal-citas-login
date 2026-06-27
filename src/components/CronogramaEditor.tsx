"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createCronograma, listAreasActivas, updateCronograma } from "@/lib/api";
import type { Area, Cronograma, CronogramaForm } from "@/lib/types";
import { MES_REGEX, WEEKDAYS, monthLabel } from "@/lib/utils";

interface Props {
  initial: Cronograma | null;
  onCancel: () => void;
  onSaved: () => void;
  onPreview: (data: CronogramaForm) => void;
}

function emptyArea(): Area {
  return { area: "", days: [], time: "", location: "", note: "" };
}

function toForm(c: Cronograma | null): CronogramaForm {
  if (!c) {
    return {
      mes: "",
      titulo: "",
      excerpt: "",
      indicaciones: "",
      publicado: true,
      areas: [emptyArea()],
    };
  }
  const areas: Area[] = (c.areas || []).map((a) => ({
    area: a.area || "",
    days: a.days || [],
    time: a.time || "",
    location: a.location || "",
    note: a.note || "",
  }));
  return {
    mes: c.mes,
    titulo: c.titulo || "",
    excerpt: c.excerpt || "",
    indicaciones: c.indicaciones || "",
    publicado: !!c.publicado,
    areas: areas.length ? areas : [emptyArea()],
  };
}

export default function CronogramaEditor({
  initial,
  onCancel,
  onSaved,
  onPreview,
}: Props) {
  const editando = initial !== null;
  const [form, setForm] = useState<CronogramaForm>(() => toForm(initial));
  const [mensaje, setMensaje] = useState<{ texto: string; tipo?: "error" }>({
    texto: "",
  });
  const [guardando, setGuardando] = useState(false);
  const [areasCatalogo, setAreasCatalogo] = useState<string[]>([]);

  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const data = await listAreasActivas();
        if (activo) setAreasCatalogo(data.map((a) => a.nombre));
      } catch {
        // El catálogo es opcional para el editor.
      }
    })();
    return () => {
      activo = false;
    };
  }, []);

  function setField<K extends keyof CronogramaForm>(
    key: K,
    value: CronogramaForm[K]
  ) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function updateArea(index: number, patch: Partial<Area>) {
    setForm((f) => ({
      ...f,
      areas: f.areas.map((a, i) => (i === index ? { ...a, ...patch } : a)),
    }));
  }

  function toggleDay(index: number, day: string) {
    setForm((f) => ({
      ...f,
      areas: f.areas.map((a, i) => {
        if (i !== index) return a;
        const days = a.days.includes(day)
          ? a.days.filter((d) => d !== day)
          : [...a.days, day];
        return { ...a, days };
      }),
    }));
  }

  function addArea() {
    setForm((f) => ({ ...f, areas: [...f.areas, emptyArea()] }));
  }

  function removeArea(index: number) {
    setForm((f) => {
      const areas = f.areas.filter((_, i) => i !== index);
      return { ...f, areas: areas.length ? areas : [emptyArea()] };
    });
  }

  function payload(): CronogramaForm {
    return {
      mes: (editando ? initial!.mes : form.mes).trim(),
      titulo: form.titulo.trim(),
      excerpt: form.excerpt.trim(),
      indicaciones: form.indicaciones.trim(),
      publicado: form.publicado,
      areas: form.areas
        .filter((a) => a.area.trim() !== "")
        .map((a) => ({
          area: a.area.trim(),
          days: a.days,
          time: a.time.trim(),
          location: a.location.trim(),
          note: a.note.trim(),
        })),
    };
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const datos = payload();
    if (!MES_REGEX.test(datos.mes)) {
      setMensaje({ texto: "Indica un mes válido (AAAA-MM).", tipo: "error" });
      return;
    }
    if (!datos.titulo) {
      setMensaje({ texto: "El título es obligatorio.", tipo: "error" });
      return;
    }

    setGuardando(true);
    setMensaje({ texto: "Guardando…" });
    try {
      if (editando) {
        await updateCronograma(initial!.mes, datos);
      } else {
        await createCronograma(datos);
      }
      onSaved();
    } catch (err) {
      setMensaje({ texto: (err as Error).message, tipo: "error" });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section className="panel-card">
      <button type="button" className="link-volver" onClick={onCancel}>
        ← Volver a la lista
      </button>
      <h2>{editando ? `Editar · ${monthLabel(initial!.mes)}` : "Nuevo cronograma"}</h2>

      <form onSubmit={onSubmit} autoComplete="off" noValidate>
        <div className="fila">
          <label className="campo">
            <span>Mes (AAAA-MM)</span>
            <input
              type="month"
              value={form.mes}
              onChange={(e) => setField("mes", e.target.value)}
              disabled={editando}
              required
            />
          </label>
          <label className="campo campo--check">
            <input
              type="checkbox"
              checked={form.publicado}
              onChange={(e) => setField("publicado", e.target.checked)}
            />
            <span>Publicado</span>
          </label>
        </div>

        <label className="campo">
          <span>Título</span>
          <input
            type="text"
            maxLength={200}
            required
            placeholder="Cronograma de entrega de citas · Julio 2026"
            value={form.titulo}
            onChange={(e) => setField("titulo", e.target.value)}
          />
        </label>

        <label className="campo">
          <span>Resumen</span>
          <input
            type="text"
            maxLength={500}
            placeholder="Rol mensual de entrega de citas por área de Consulta Externa…"
            value={form.excerpt}
            onChange={(e) => setField("excerpt", e.target.value)}
          />
        </label>

        <div className="areas-bloque">
          <div className="seccion-head">
            <h3>Áreas</h3>
            <button
              type="button"
              className="boton boton--sm boton--ghost"
              onClick={addArea}
            >
              + Añadir área
            </button>
          </div>

          {areasCatalogo.length === 0 && (
            <p className="seccion-sub">
              Aún no hay áreas en el catálogo. Créalas en “Áreas de atención”
              para poder seleccionarlas aquí.
            </p>
          )}

          {form.areas.map((area, i) => {
            const opciones = Array.from(
              new Set([...areasCatalogo, ...(area.area ? [area.area] : [])])
            );
            return (
              <div className="area-item" key={i}>
                <div className="area-item__head">
                  <select
                    className="area-nombre"
                    value={area.area}
                    onChange={(e) => updateArea(i, { area: e.target.value })}
                  >
                    <option value="">— Selecciona un área —</option>
                    {opciones.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="boton-icono"
                    title="Eliminar área"
                    aria-label="Eliminar área"
                    onClick={() => removeArea(i)}
                  >
                    ✕
                  </button>
                </div>
                <div className="area-dias">
                  {WEEKDAYS.map((dia) => (
                    <label className="dia-check" key={dia}>
                      <input
                        type="checkbox"
                        checked={area.days.includes(dia)}
                        onChange={() => toggleDay(i, dia)}
                      />
                      <span>{dia}</span>
                    </label>
                  ))}
                </div>
                <div className="fila">
                  <input
                    type="text"
                    placeholder="Horario (ej. 7:00 a.m.)"
                    maxLength={60}
                    value={area.time}
                    onChange={(e) => updateArea(i, { time: e.target.value })}
                  />
                  <input
                    type="text"
                    placeholder="Lugar (ej. Módulo 1 - Admisión)"
                    maxLength={120}
                    value={area.location}
                    onChange={(e) =>
                      updateArea(i, { location: e.target.value })
                    }
                  />
                </div>
                <input
                  type="text"
                  placeholder="Nota (opcional)"
                  maxLength={200}
                  value={area.note}
                  onChange={(e) => updateArea(i, { note: e.target.value })}
                />
              </div>
            );
          })}
        </div>

        <label className="campo">
          <span>Indicaciones generales (una por línea)</span>
          <textarea
            rows={4}
            placeholder={"La entrega de citas es por orden de llegada.\nTrae tu DNI…"}
            value={form.indicaciones}
            onChange={(e) => setField("indicaciones", e.target.value)}
          />
        </label>

        <div className="fila fila--acciones">
          <button type="submit" className="boton" disabled={guardando}>
            Guardar
          </button>
          <button
            type="button"
            className="boton boton--secundario"
            onClick={onCancel}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="boton boton--ghost"
            onClick={() => onPreview(payload())}
          >
            Vista previa
          </button>
        </div>
        <p
          className={"mensaje" + (mensaje.tipo ? " mensaje--" + mensaje.tipo : "")}
          role="alert"
          aria-live="polite"
        >
          {mensaje.texto}
        </p>
      </form>
    </section>
  );
}
