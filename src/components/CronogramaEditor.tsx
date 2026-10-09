"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { createCronograma, listAreasActivas, updateCronograma } from "@/lib/api";
import type { Area, AreaAtencion, Cronograma, CronogramaForm } from "@/lib/types";
import {
  MES_REGEX,
  formatFechaCorta,
  horariosCsvTemplate,
  mesesEnHorariosCsv,
  monthLabel,
  parseHorariosCsv,
} from "@/lib/utils";

interface Props {
  initial: Cronograma | null;
  onCancel: () => void;
  onSaved: () => void;
  onPreview: (data: CronogramaForm) => void;
}

function emptyArea(): Area {
  return { area: "", dates: [], time: "", location: "", note: "" };
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
    dates: a.dates || [],
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
  const [areasCatalogo, setAreasCatalogo] = useState<AreaAtencion[]>([]);
  const [importMsg, setImportMsg] = useState<{
    texto: string;
    tipo?: "ok" | "error";
  }>({ texto: "" });
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const data = await listAreasActivas();
        if (activo) setAreasCatalogo(data);
      } catch {
        // El catálogo es opcional para el editor.
      }
    })();
    return () => {
      activo = false;
    };
  }, []);

  const nombresCatalogo = areasCatalogo.map((a) => a.nombre);

  // Rango de fechas válido (primer y último día del mes del cronograma).
  const mesActual = (editando ? initial!.mes : form.mes).trim();
  const mesRange = (() => {
    const m = /^(\d{4})-(\d{2})$/.exec(mesActual);
    if (!m) return { min: "", max: "" };
    const last = new Date(+m[1], +m[2], 0).getDate();
    return {
      min: `${mesActual}-01`,
      max: `${mesActual}-${String(last).padStart(2, "0")}`,
    };
  })();

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

  function addDate(index: number, iso: string) {
    if (!iso) return;
    setForm((f) => ({
      ...f,
      areas: f.areas.map((a, i) => {
        if (i !== index || a.dates.includes(iso)) return a;
        return { ...a, dates: [...a.dates, iso].sort() };
      }),
    }));
  }

  // Edita (o limpia) la fecha principal del área; el resto queda como extra.
  function setFirstDate(index: number, iso: string) {
    setForm((f) => ({
      ...f,
      areas: f.areas.map((a, i) => {
        if (i !== index) return a;
        const rest = a.dates.slice(1);
        const next = iso ? [iso, ...rest] : rest;
        return { ...a, dates: Array.from(new Set(next)).sort() };
      }),
    }));
  }

  function removeDate(index: number, iso: string) {
    setForm((f) => ({
      ...f,
      areas: f.areas.map((a, i) =>
        i === index ? { ...a, dates: a.dates.filter((d) => d !== iso) } : a
      ),
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

  async function onImportCsv(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setImportMsg({ texto: "Procesando…" });
    try {
      const texto = await file.text();

      // El mes lo fija la ruta (edición) o el campo; si falta, se infiere del CSV.
      let mes = (editando ? initial!.mes : form.mes).trim();
      let mesInferido = false;
      if (!MES_REGEX.test(mes)) {
        const meses = mesesEnHorariosCsv(texto);
        if (meses.length === 0) {
          setImportMsg({
            texto:
              "No se detectaron fechas válidas (usa dd-mm-yyyy) ni hay un mes indicado.",
            tipo: "error",
          });
          return;
        }
        if (meses.length > 1) {
          setImportMsg({
            texto:
              "El CSV tiene fechas de varios meses. Indica el mes del cronograma antes de importar.",
            tipo: "error",
          });
          return;
        }
        mes = meses[0];
        mesInferido = true;
      }

      const { areas, errors, omitidas } = parseHorariosCsv(
        texto,
        areasCatalogo,
        mes
      );

      if (areas.length === 0 && errors.length > 0) {
        setImportMsg({ texto: errors.join(" "), tipo: "error" });
        return;
      }

      // Aplica el mes inferido (solo en cronogramas nuevos) junto con las áreas.
      setForm((f) => ({
        ...f,
        mes: mesInferido ? mes : f.mes,
        areas: areas.length ? areas : [emptyArea()],
      }));

      const partes = [`${areas.length} área(s) importada(s).`];
      if (mesInferido) {
        partes.push(`Mes detectado: ${monthLabel(mes)}.`);
      }
      if (omitidas.length > 0) {
        partes.push(`Omitidas (atención diaria): ${omitidas.join(", ")}.`);
      }
      if (errors.length > 0) {
        partes.push(`Avisos: ${errors.join(" ")}`);
      }
      setImportMsg({
        texto: partes.join(" "),
        tipo: errors.length > 0 ? "error" : "ok",
      });
    } catch {
      setImportMsg({ texto: "No se pudo leer el archivo CSV.", tipo: "error" });
    }
  }

  function descargarPlantilla() {
    const csv = horariosCsvTemplate(areasCatalogo);
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" })
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "plantilla-horarios.csv";
    a.click();
    URL.revokeObjectURL(url);
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
          dates: a.dates,
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
            <div className="fila fila--acciones" style={{ margin: 0 }}>
              <button
                type="button"
                className="boton boton--sm boton--ghost"
                onClick={descargarPlantilla}
              >
                Descargar plantilla CSV
              </button>
              <button
                type="button"
                className="boton boton--sm boton--ghost"
                onClick={() => fileRef.current?.click()}
              >
                Importar CSV
              </button>
              <button
                type="button"
                className="boton boton--sm boton--ghost"
                onClick={addArea}
              >
                + Añadir área
              </button>
            </div>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            hidden
            onChange={onImportCsv}
          />

          {importMsg.texto && (
            <p
              className={
                "mensaje" + (importMsg.tipo ? " mensaje--" + importMsg.tipo : "")
              }
              role="status"
              aria-live="polite"
            >
              {importMsg.texto}
            </p>
          )}

          {areasCatalogo.length === 0 && (
            <p className="seccion-sub">
              Aún no hay áreas en el catálogo. Créalas en “Áreas de atención”
              para poder seleccionarlas aquí.
            </p>
          )}

          {form.areas.map((area, i) => {
            const opciones = Array.from(
              new Set([...nombresCatalogo, ...(area.area ? [area.area] : [])])
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
                <div className="area-fechas">
                  <input
                    type="date"
                    className="area-fecha-input"
                    min={mesRange.min}
                    max={mesRange.max}
                    disabled={!mesRange.min}
                    value={area.dates[0] ?? ""}
                    onChange={(e) => setFirstDate(i, e.target.value)}
                  />
                  {area.dates.slice(1).map((iso) => (
                    <span className="fecha-pill" key={iso}>
                      {formatFechaCorta(iso)}
                      <button
                        type="button"
                        className="fecha-pill__x"
                        aria-label={`Quitar ${formatFechaCorta(iso)}`}
                        onClick={() => removeDate(i, iso)}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  {mesRange.min && area.dates.length > 0 && (
                    <label className="area-fecha-add">
                      <span>+ fecha</span>
                      <input
                        type="date"
                        min={mesRange.min}
                        max={mesRange.max}
                        value=""
                        onChange={(e) => {
                          addDate(i, e.target.value);
                          e.target.value = "";
                        }}
                      />
                    </label>
                  )}
                  {!mesRange.min && (
                    <span className="seccion-sub">
                      Indica el mes del cronograma para elegir fechas
                    </span>
                  )}
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
