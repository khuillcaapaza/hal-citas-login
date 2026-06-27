"use client";

import { useEffect, useState } from "react";
import { listCronogramas } from "@/lib/api";
import type { CronogramaMeta } from "@/lib/types";

interface Props {
  reloadKey: number;
  onNew: () => void;
  onEdit: (mes: string) => void;
  onDelete: (mes: string) => void;
}

export default function CronogramaList({
  reloadKey,
  onNew,
  onEdit,
  onDelete,
}: Props) {
  const [items, setItems] = useState<CronogramaMeta[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const data = await listCronogramas();
        if (activo) {
          setItems(data);
          setError("");
        }
      } catch (err) {
        if (activo) setError((err as Error).message);
      } finally {
        if (activo) setCargando(false);
      }
    })();
    return () => {
      activo = false;
    };
  }, [reloadKey]);

  return (
    <section>
      <div className="seccion-head">
        <div>
          <h2>Cronogramas</h2>
          <p className="seccion-sub">Rol mensual de entrega de citas por área.</p>
        </div>
        <button type="button" className="boton boton--sm" onClick={onNew}>
          + Nuevo cronograma
        </button>
      </div>

      {error && <p className="aviso aviso--error">{error}</p>}

      {cargando ? (
        <p className="cargando">Cargando…</p>
      ) : items.length === 0 ? (
        <p className="cargando">
          Aún no hay cronogramas. Crea el primero con “+ Nuevo cronograma”.
        </p>
      ) : (
        <div className="grid-cronogramas">
          {items.map((c) => (
            <article className="cron-card" key={c.mes}>
              <div className="cron-card__top">
                <span className="cron-card__mes">{c.monthLabel}</span>
                {c.publicado ? (
                  <span className="chip chip--ok">Publicado</span>
                ) : (
                  <span className="chip chip--off">Borrador</span>
                )}
              </div>
              <h3>{c.titulo}</h3>
              {c.excerpt && <p>{c.excerpt}</p>}
              <div className="cron-card__acciones">
                <button
                  type="button"
                  className="boton boton--sm"
                  onClick={() => onEdit(c.mes)}
                >
                  Editar
                </button>
                <button
                  type="button"
                  className="boton boton--sm boton--peligro"
                  onClick={() => onDelete(c.mes)}
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
