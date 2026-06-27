import type { Area } from "./types";

export const WEEKDAYS = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];

export const WEEKDAY_SHORT = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export const MONTH_NAMES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

/** Paleta de colores por área (mismo criterio visual que el sitio principal). */
export const PALETTE = [
  "#16a34a",
  "#047857",
  "#0d9488",
  "#65a30d",
  "#0e7490",
  "#d97706",
  "#0369a1",
  "#4f46e5",
];

export const MES_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

/** Convierte "2026-07" en "Julio 2026". */
export function monthLabel(mes: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(mes || "");
  if (!m) return mes || "";
  const idx = parseInt(m[2], 10) - 1;
  if (idx < 0 || idx > 11) return mes;
  return `${MONTH_NAMES[idx]} ${m[1]}`;
}

/** Asigna un color de la paleta a cada área según su orden. */
export function colorMap(areas: Area[]): Record<string, string> {
  const map: Record<string, string> = {};
  areas.forEach((a, i) => {
    map[a.area] = PALETTE[i % PALETTE.length];
  });
  return map;
}

export interface CalendarCell {
  day: number;
  areas: Area[];
}

export interface CalendarData {
  leading: number;
  cells: CalendarCell[];
}

/** Construye los datos del calendario mensual (semana iniciando en lunes). */
export function buildCalendar(mes: string, areas: Area[]): CalendarData | null {
  const m = /^(\d{4})-(\d{2})$/.exec(mes || "");
  if (!m) return null;

  const year = parseInt(m[1], 10);
  const monthIdx = parseInt(m[2], 10) - 1;
  const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
  const leading = (new Date(year, monthIdx, 1).getDay() + 6) % 7;

  const byWeekday: Record<string, Area[]> = {};
  WEEKDAYS.forEach((w) => {
    byWeekday[w] = [];
  });
  areas.forEach((a) =>
    (a.days || []).forEach((d) => {
      if (byWeekday[d]) byWeekday[d].push(a);
    })
  );

  const cells: CalendarCell[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const weekday = WEEKDAYS[(new Date(year, monthIdx, day).getDay() + 6) % 7];
    cells.push({ day, areas: byWeekday[weekday] || [] });
  }

  return { leading, cells };
}

/** Convierte el texto de indicaciones (una por línea) en una lista limpia. */
export function indicacionesList(text: string): string[] {
  return (text || "")
    .split("\n")
    .map((l) => l.replace(/^[-*]\s*/, "").trim())
    .filter(Boolean);
}
