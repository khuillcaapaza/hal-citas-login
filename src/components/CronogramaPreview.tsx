"use client";

import type { CronogramaForm } from "@/lib/types";
import {
  WEEKDAY_SHORT,
  buildCalendar,
  colorMap,
  indicacionesList,
  monthLabel,
} from "@/lib/utils";

interface Props {
  data: CronogramaForm;
}

export default function CronogramaPreview({ data }: Props) {
  const areas = (data.areas || []).filter((a) => a.area);
  const colores = colorMap(areas);
  const label = monthLabel(data.mes);
  const calendario = areas.length > 0 ? buildCalendar(data.mes, areas) : null;
  const indicaciones = indicacionesList(data.indicaciones);

  return (
    <div className="cron-render">
      <span className="cron-render__mes">{label || data.mes}</span>
      <h2>{data.titulo}</h2>
      {data.excerpt && <p className="cron-render__excerpt">{data.excerpt}</p>}

      {areas.length > 0 && (
        <>
          <h3>Rol por área</h3>
          <p className="seccion-sub">
            Días de la semana en que cada área entrega citas durante el mes.
          </p>
          <div className="tabla-wrap">
            <table className="tabla-rol">
              <thead>
                <tr>
                  <th>Área</th>
                  <th>Días de entrega</th>
                  <th>Horario</th>
                  <th>Lugar</th>
                </tr>
              </thead>
              <tbody>
                {areas.map((a) => (
                  <tr key={a.area}>
                    <td>
                      <span
                        className="area-badge"
                        style={{ background: colores[a.area] }}
                      >
                        {a.area}
                      </span>
                      {a.note && <div className="area-nota">{a.note}</div>}
                    </td>
                    <td>
                      {a.days && a.days.length > 0
                        ? a.days.map((d) => (
                            <span className="dia-pill" key={d}>
                              {d}
                            </span>
                          ))
                        : "—"}
                    </td>
                    <td>{a.time || "—"}</td>
                    <td>{a.location || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {calendario && (
        <>
          <h3 style={{ marginTop: "2rem" }}>{label}</h3>
          <p className="seccion-sub">
            Vista del mes con las áreas que entregan citas cada día.
          </p>
          <div className="calendario">
            {WEEKDAY_SHORT.map((d) => (
              <div className="cal-dow" key={d}>
                {d}
              </div>
            ))}
            {Array.from({ length: calendario.leading }).map((_, i) => (
              <div className="cal-blank" key={`blank-${i}`} />
            ))}
            {calendario.cells.map((cell) => (
              <div className="cal-cell" key={cell.day}>
                <span className="cal-num">{cell.day}</span>
                <div className="cal-areas">
                  {cell.areas.map((a) => (
                    <span
                      className="cal-area"
                      style={{ background: colores[a.area] }}
                      title={a.area}
                      key={a.area}
                    >
                      {a.area}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {indicaciones.length > 0 && (
        <>
          <h3 style={{ marginTop: "2rem" }}>Indicaciones generales</h3>
          <ul className="indicaciones">
            {indicaciones.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
