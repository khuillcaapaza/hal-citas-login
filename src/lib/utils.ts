import type { Area, AreaAtencion } from "./types";

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

  // Agrupa las áreas por fecha exacta (ISO YYYY-MM-DD).
  const byDate: Record<string, Area[]> = {};
  areas.forEach((a) =>
    (a.dates || []).forEach((d) => {
      (byDate[d] ??= []).push(a);
    })
  );

  const cells: CalendarCell[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const iso = `${m[1]}-${m[2]}-${String(day).padStart(2, "0")}`;
    cells.push({ day, areas: byDate[iso] || [] });
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

// ── Importación de horarios por CSV ───────────────────────────────────

/** Quita acentos y pasa a minúsculas para comparar de forma laxa. */
function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

/** Convierte "dd-mm-yyyy" (admite / . como separador) a ISO "yyyy-mm-dd". */
export function parseFechaDdMmYyyy(value: string): string | null {
  const m = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/.exec(value.trim());
  if (!m) return null;
  const d = +m[1];
  const mo = +m[2];
  const y = +m[3];
  const dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) {
    return null;
  }
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** ISO "yyyy-mm-dd" → "dd/mm" para mostrar de forma compacta. */
export function formatFechaCorta(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}/${m[2]}` : iso;
}

/** Meses (YYYY-MM) distintos presentes en la columna `fecha` del CSV. */
export function mesesEnHorariosCsv(text: string): string[] {
  const rows = parseCsvRows(text);
  if (rows.length < 2) return [];
  const header = rows[0].map((c) => fold(c));
  const iFecha = header.indexOf(fold("fecha"));
  if (iFecha === -1) return [];
  const meses = new Set<string>();
  for (let r = 1; r < rows.length; r++) {
    const iso = parseFechaDdMmYyyy((rows[r][iFecha] ?? "").trim());
    if (iso) meses.add(iso.slice(0, 7));
  }
  return [...meses].sort();
}

/**
 * Parser CSV mínimo que respeta comillas dobles (y "" como comilla escapada)
 * y separadores por coma. Devuelve filas de celdas; ignora líneas vacías.
 */
export function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const push = () => {
    row.push(field);
    field = "";
  };
  const endRow = () => {
    push();
    if (row.some((c) => c.trim() !== "")) rows.push(row);
    row = [];
  };

  const src = text.replace(/\r\n?/g, "\n");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      push();
    } else if (ch === "\n") {
      endRow();
    } else {
      field += ch;
    }
  }
  if (field !== "" || row.length) endRow();

  return rows;
}

export interface HorariosCsvResult {
  areas: Area[];
  errors: string[];
  /** Códigos de áreas omitidas por atender todos los días (sin_restriccion). */
  omitidas: string[];
}

/**
 * Convierte el contenido de un CSV en una lista de áreas del cronograma.
 *
 * Columnas (encabezado obligatorio, sin distinción de tildes/mayúsculas):
 *   codigo, fecha, horario, lugar, nota
 * Una columna `nombre` extra (si existe) se ignora: es solo de referencia.
 * `fecha` va en formato dd-mm-yyyy y debe pertenecer al mes del cronograma.
 * Cada fila liga un área (por `codigo`) a una fecha; varias filas con el mismo
 * código acumulan fechas. Las áreas marcadas como `sin_restriccion` (atención
 * diaria) se omiten: su cupo no se gestiona por fecha.
 */
export function parseHorariosCsv(
  text: string,
  catalogo: AreaAtencion[],
  mes: string
): HorariosCsvResult {
  const rows = parseCsvRows(text);
  if (rows.length === 0) {
    return { areas: [], errors: ["El archivo está vacío."], omitidas: [] };
  }

  const header = rows[0].map((c) => fold(c));
  const col = (name: string) => header.indexOf(fold(name));
  const iCodigo = col("codigo");
  const iFecha = col("fecha");
  const iHorario = col("horario");
  const iLugar = col("lugar");
  const iNota = col("nota");

  if (iCodigo === -1 || iFecha === -1) {
    return {
      areas: [],
      errors: [
        "El encabezado debe incluir al menos las columnas «codigo» y «fecha».",
      ],
      omitidas: [],
    };
  }

  const porCodigo = new Map<string, AreaAtencion>();
  catalogo.forEach((a) => porCodigo.set(fold(a.codigo), a));

  // Agrega las filas por área: cada código acumula sus fechas.
  const porArea = new Map<string, Area>();
  const errors: string[] = [];
  const omitidas: string[] = [];

  for (let r = 1; r < rows.length; r++) {
    const fila = rows[r];
    const linea = r + 1;
    const codigo = (fila[iCodigo] ?? "").trim();
    if (codigo === "") continue;

    const area = porCodigo.get(fold(codigo));
    if (!area) {
      errors.push(`Línea ${linea}: no existe un área con el código «${codigo}».`);
      continue;
    }

    // Las áreas de atención diaria no se gestionan por fecha: se omiten.
    if (area.sin_restriccion) {
      if (!omitidas.includes(area.codigo)) omitidas.push(area.codigo);
      continue;
    }

    const fechaRaw = (fila[iFecha] ?? "").trim();
    const iso = parseFechaDdMmYyyy(fechaRaw);
    if (iso === null) {
      errors.push(`Línea ${linea}: fecha no válida «${fechaRaw}» (usa dd-mm-yyyy).`);
      continue;
    }
    if (iso.slice(0, 7) !== mes) {
      errors.push(`Línea ${linea}: la fecha «${fechaRaw}» no pertenece al mes del cronograma.`);
      continue;
    }

    const key = fold(area.codigo);
    let entry = porArea.get(key);
    if (!entry) {
      entry = {
        area: area.nombre,
        dates: [],
        time: (fila[iHorario] ?? "").trim(),
        location: (fila[iLugar] ?? "").trim(),
        note: (fila[iNota] ?? "").trim(),
      };
      porArea.set(key, entry);
    } else {
      // Completa horario/lugar/nota si vienen en una fila posterior.
      if (!entry.time) entry.time = (fila[iHorario] ?? "").trim();
      if (!entry.location) entry.location = (fila[iLugar] ?? "").trim();
      if (!entry.note) entry.note = (fila[iNota] ?? "").trim();
    }
    if (!entry.dates.includes(iso)) entry.dates.push(iso);
  }

  const areas = [...porArea.values()];
  areas.forEach((a) => a.dates.sort());

  return { areas, errors, omitidas };
}

/**
 * Arreglo de la plantilla: grupos de áreas por día de entrega, en el mismo
 * orden del rol mensual del hospital. Cada grupo recibe un marcador de fecha
 * `d1-mm-yyyy`, `d2-mm-yyyy`, … para que el usuario reemplace por fecha todas
 * las filas de un mismo día con un solo "buscar y reemplazar".
 */
const PLANTILLA_GRUPOS: string[][] = [
  ["CARDIO-RQ", "GINE", "NEONATO", "CIR-PED", "RADIO", "MFR", "ANEST", "ENDO", "INFECTO", "DERMA", "HEMATO", "CIR-PLAS"],
  ["CIR-CC", "REUMA", "NEUMO", "NEURO", "NUTRI", "NEFRO", "PSIQ"],
  ["GINE", "NEONATO", "CIR-PED", "RADIO", "ANEST", "CIR-CV", "CIR-GEN", "GASTRO", "CIR-PLAS"],
  ["INFECTO", "NEUROCIR", "OFTALMO", "TRAUMA", "URO", "URO-ONCO"],
  ["CARDIO-RQ", "GINE", "NEONATO", "CIR-PED", "RADIO", "ANEST", "ENDO", "REUMA", "NEUMO", "CIR-PLAS"],
];

/**
 * Genera la plantilla CSV con el rol mensual por grupos de día. Cada grupo usa
 * un marcador `dN-mm-yyyy`: el usuario reemplaza `d1-mm-yyyy` por la fecha del
 * primer día (todas sus filas a la vez), `d2-mm-yyyy` por la del segundo, etc.
 * El nombre se resuelve del catálogo (columna de referencia, ignorada al
 * importar); si un código no está en el catálogo se usa el propio código.
 */
export function horariosCsvTemplate(catalogo: AreaAtencion[]): string {
  const header = "codigo,nombre,fecha,horario,lugar,nota";
  const horario = "8:00am a 12:00pm";
  const lugar = "Área de Admisión";
  const nombrePorCodigo = new Map<string, string>();
  catalogo.forEach((a) => nombrePorCodigo.set(a.codigo, a.nombre));

  const filas: string[] = [];
  PLANTILLA_GRUPOS.forEach((grupo, i) => {
    const fecha = `d${i + 1}-mm-yyyy`;
    grupo.forEach((codigo) => {
      const nombre = nombrePorCodigo.get(codigo) ?? codigo;
      filas.push(
        `${codigo},${csvCell(nombre)},${fecha},${csvCell(horario)},${csvCell(lugar)},`
      );
    });
  });

  return [header, ...filas].join("\n") + "\n";
}

/** Escapa una celda para CSV si contiene comas, comillas o saltos de línea. */
function csvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}
