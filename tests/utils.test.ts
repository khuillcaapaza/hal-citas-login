import { describe, it, expect } from "vitest";
import {
  monthLabel,
  colorMap,
  buildCalendar,
  indicacionesList,
  parseFechaDdMmYyyy,
  formatFechaCorta,
  mesesEnHorariosCsv,
  parseCsvRows,
  parseHorariosCsv,
  horariosCsvTemplate,
  mergeAreas,
  PALETTE,
} from "../src/lib/utils";
import type { Area, AreaAtencion } from "../src/lib/types";

const areaAtencion = (over: Partial<AreaAtencion> = {}): AreaAtencion => ({
  id: 1,
  codigo: "GINE",
  nombre: "Ginecología",
  descripcion: "",
  sin_restriccion: false,
  activo: true,
  ...over,
});

const area = (over: Partial<Area> = {}): Area => ({
  area: "Cardiología",
  dates: ["2026-07-06"],
  time: "08:00",
  location: "Piso 1",
  note: "",
  ...over,
});

describe("monthLabel", () => {
  it("formatea AAAA-MM", () => {
    expect(monthLabel("2026-07")).toBe("Julio 2026");
  });

  it("devuelve cadena vacía si la entrada es vacía", () => {
    expect(monthLabel("")).toBe("");
  });

  it("devuelve la entrada si no cumple el formato", () => {
    expect(monthLabel("texto")).toBe("texto");
  });

  it("devuelve la entrada si el mes está fuera de rango", () => {
    expect(monthLabel("2026-13")).toBe("2026-13");
  });
});

describe("colorMap", () => {
  it("asigna colores cíclicamente", () => {
    const areas = Array.from({ length: PALETTE.length + 1 }, (_, i) =>
      area({ area: `A${i}` })
    );
    const map = colorMap(areas);
    expect(map["A0"]).toBe(PALETTE[0]);
    // Se repite la paleta al superar su longitud.
    expect(map[`A${PALETTE.length}`]).toBe(PALETTE[0]);
  });
});

describe("buildCalendar", () => {
  it("devuelve null si el mes es inválido", () => {
    expect(buildCalendar("malo", [])).toBeNull();
  });

  it("construye celdas y asigna áreas por fecha", () => {
    const areas = [
      area({ area: "Cardio", dates: ["2026-07-06", "2026-07-20"] }),
      area({ area: "SinFechas", dates: undefined as unknown as string[] }),
    ];
    const cal = buildCalendar("2026-07", areas);
    expect(cal).not.toBeNull();
    // Julio 2026 tiene 31 días.
    expect(cal!.cells).toHaveLength(31);
    expect(typeof cal!.leading).toBe("number");
    // El día 6 debe incluir el área "Cardio".
    const dia6 = cal!.cells.find((c) => c.day === 6);
    expect(dia6!.areas.some((a) => a.area === "Cardio")).toBe(true);
    // El día 7 no tiene áreas.
    const dia7 = cal!.cells.find((c) => c.day === 7);
    expect(dia7!.areas).toHaveLength(0);
  });
});

describe("indicacionesList", () => {
  it("limpia viñetas y líneas vacías", () => {
    expect(indicacionesList("- uno\n* dos\n\n  tres  ")).toEqual([
      "uno",
      "dos",
      "tres",
    ]);
  });

  it("devuelve [] con texto vacío", () => {
    expect(indicacionesList("")).toEqual([]);
  });
});

describe("parseFechaDdMmYyyy", () => {
  it("convierte dd-mm-yyyy a ISO", () => {
    expect(parseFechaDdMmYyyy("06-07-2026")).toBe("2026-07-06");
    expect(parseFechaDdMmYyyy("6/7/2026")).toBe("2026-07-06");
  });

  it("devuelve null para fechas inválidas", () => {
    expect(parseFechaDdMmYyyy("31-02-2026")).toBeNull();
    expect(parseFechaDdMmYyyy("2026-07-06")).toBeNull();
    expect(parseFechaDdMmYyyy("xx")).toBeNull();
  });

  it("formatea fecha corta dd/mm", () => {
    expect(formatFechaCorta("2026-07-06")).toBe("06/07");
  });
});

describe("mesesEnHorariosCsv", () => {
  it("detecta un único mes", () => {
    const csv = "codigo,fecha\nGINE,05-10-2026\nCARDIO,09-10-2026";
    expect(mesesEnHorariosCsv(csv)).toEqual(["2026-10"]);
  });

  it("detecta varios meses", () => {
    const csv = "codigo,fecha\nGINE,05-10-2026\nCARDIO,03-11-2026";
    expect(mesesEnHorariosCsv(csv)).toEqual(["2026-10", "2026-11"]);
  });

  it("devuelve [] si no hay columna fecha o fechas válidas", () => {
    expect(mesesEnHorariosCsv("codigo\nGINE")).toEqual([]);
    expect(mesesEnHorariosCsv("codigo,fecha\nGINE,xx")).toEqual([]);
  });

  it("devuelve [] con archivo vacío", () => {
    expect(mesesEnHorariosCsv("")).toEqual([]);
  });
});

describe("parseCsvRows", () => {
  it("respeta comillas con comas y comillas escapadas", () => {
    const rows = parseCsvRows('a,"b,c","d""e"\nf,g,h');
    expect(rows).toEqual([
      ["a", "b,c", 'd"e'],
      ["f", "g", "h"],
    ]);
  });

  it("ignora líneas vacías", () => {
    expect(parseCsvRows("a,b\n\n\nc,d")).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });
});

describe("parseHorariosCsv", () => {
  const catalogo: AreaAtencion[] = [
    areaAtencion({ codigo: "GINE", nombre: "Ginecología" }),
    areaAtencion({ id: 2, codigo: "CARDIO", nombre: "Cardiología" }),
    areaAtencion({
      id: 3,
      codigo: "PED",
      nombre: "Pediatría",
      sin_restriccion: true,
    }),
  ];

  it("resuelve códigos a nombres y acumula fechas del mes", () => {
    const csv =
      "codigo,fecha,horario,lugar,nota\nGINE,06-07-2026,08:00 a 12:00,Admisión,sin nota\nGINE,20-07-2026,,,";
    const { areas, errors, omitidas } = parseHorariosCsv(csv, catalogo, "2026-07");

    expect(errors).toEqual([]);
    expect(omitidas).toEqual([]);
    expect(areas).toHaveLength(1);
    expect(areas[0].area).toBe("Ginecología");
    expect(areas[0].dates).toEqual(["2026-07-06", "2026-07-20"]);
    expect(areas[0].time).toBe("08:00 a 12:00");
  });

  it("reporta fechas fuera del mes del cronograma", () => {
    const csv = "codigo,fecha\nGINE,06-08-2026";
    const { areas, errors } = parseHorariosCsv(csv, catalogo, "2026-07");

    expect(areas).toHaveLength(0);
    expect(errors[0]).toContain("no pertenece");
  });

  it("reporta fechas con formato inválido", () => {
    const csv = "codigo,fecha\nGINE,2026-07-06";
    const { errors } = parseHorariosCsv(csv, catalogo, "2026-07");
    expect(errors[0]).toContain("no válida");
  });

  it("omite áreas de atención diaria (sin_restriccion)", () => {
    const csv = "codigo,fecha\nPED,06-07-2026";
    const { areas, omitidas } = parseHorariosCsv(csv, catalogo, "2026-07");

    expect(areas).toHaveLength(0);
    expect(omitidas).toEqual(["PED"]);
  });

  it("reporta códigos inexistentes", () => {
    const csv = "codigo,fecha\nXXX,06-07-2026";
    const { areas, errors } = parseHorariosCsv(csv, catalogo, "2026-07");

    expect(areas).toHaveLength(0);
    expect(errors[0]).toContain("XXX");
  });

  it("exige las columnas codigo y fecha", () => {
    const { errors } = parseHorariosCsv("foo,bar\n1,2", catalogo, "2026-07");
    expect(errors[0]).toContain("codigo");
  });

  it("reporta el archivo vacío", () => {
    const { areas, errors } = parseHorariosCsv("", catalogo, "2026-07");
    expect(areas).toEqual([]);
    expect(errors[0]).toContain("vacío");
  });

  it("ignora filas con código vacío", () => {
    const { areas, errors } = parseHorariosCsv(
      "codigo,fecha\n,05-07-2026",
      catalogo,
      "2026-07"
    );
    expect(areas).toEqual([]);
    expect(errors).toEqual([]);
  });

  it("completa horario/lugar/nota desde una fila posterior", () => {
    const csv =
      "codigo,fecha,horario,lugar,nota\nGINE,05-07-2026,,,\nGINE,06-07-2026,08:00,Admisión,ojo";
    const { areas } = parseHorariosCsv(csv, catalogo, "2026-07");
    expect(areas).toHaveLength(1);
    expect(areas[0].dates).toEqual(["2026-07-05", "2026-07-06"]);
    expect(areas[0].time).toBe("08:00");
    expect(areas[0].location).toBe("Admisión");
    expect(areas[0].note).toBe("ojo");
  });
});

describe("horariosCsvTemplate", () => {
  const catalogo: AreaAtencion[] = [
    areaAtencion({ codigo: "GINE", nombre: "Ginecología" }),
    areaAtencion({
      id: 2,
      codigo: "CARDIO-RQ",
      nombre: "Cardiología +Riesgo Quirúrgico",
    }),
  ];

  it("usa el encabezado y los valores por defecto", () => {
    const csv = horariosCsvTemplate(catalogo);
    expect(csv.split("\n")[0]).toBe("codigo,nombre,fecha,horario,lugar,nota");
    expect(csv).toContain("8:00am a 12:00pm");
    expect(csv).toContain("Área de Admisión");
  });

  it("agrupa por día con marcadores d1..dN y mantiene el orden", () => {
    const csv = horariosCsvTemplate(catalogo);
    const filas = csv.trim().split("\n");
    // Encabezado + 44 filas del rol mensual.
    expect(filas).toHaveLength(45);
    // Primera fila de datos: grupo 1 (d1), empieza con CARDIO-RQ.
    expect(filas[1]).toBe(
      "CARDIO-RQ,Cardiología +Riesgo Quirúrgico,d1-mm-yyyy,8:00am a 12:00pm,Área de Admisión,"
    );
    for (const d of ["d1-mm-yyyy", "d2-mm-yyyy", "d3-mm-yyyy", "d4-mm-yyyy", "d5-mm-yyyy"]) {
      expect(csv).toContain(d);
    }
  });

  it("usa el código como nombre si no está en el catálogo", () => {
    const csv = horariosCsvTemplate([]);
    expect(csv).toContain("GINE,GINE,d1-mm-yyyy");
  });
});

describe("mergeAreas", () => {
  it("acumula fechas de un área existente sin duplicar y ordenadas", () => {
    const existing = [area({ area: "Cardiología", dates: ["2026-10-05", "2026-10-09"] })];
    const imported = [area({ area: "Cardiología", dates: ["2026-10-12", "2026-10-05"] })];

    const merged = mergeAreas(existing, imported);

    expect(merged).toHaveLength(1);
    expect(merged[0].dates).toEqual(["2026-10-05", "2026-10-09", "2026-10-12"]);
  });

  it("agrega áreas nuevas y conserva las existentes", () => {
    const existing = [area({ area: "Cardiología", dates: ["2026-10-05"] })];
    const imported = [area({ area: "Ginecología", dates: ["2026-10-14"] })];

    const merged = mergeAreas(existing, imported);

    expect(merged.map((a) => a.area)).toEqual(["Cardiología", "Ginecología"]);
  });

  it("completa horario/lugar/nota solo si estaban vacíos", () => {
    const existing = [
      area({ area: "Cardiología", dates: ["2026-10-05"], time: "", location: "", note: "" }),
    ];
    const imported = [
      area({ area: "Cardiología", dates: ["2026-10-12"], time: "9:00", location: "M2", note: "ojo" }),
    ];

    const merged = mergeAreas(existing, imported);

    expect(merged[0].time).toBe("9:00");
    expect(merged[0].location).toBe("M2");
    expect(merged[0].note).toBe("ojo");
  });

  it("no sobreescribe horario/lugar/nota existentes", () => {
    const existing = [
      area({ area: "Cardiología", dates: ["2026-10-05"], time: "8:00", location: "M1", note: "a" }),
    ];
    const imported = [
      area({ area: "Cardiología", dates: ["2026-10-12"], time: "9:00", location: "M2", note: "b" }),
    ];

    const merged = mergeAreas(existing, imported);

    expect(merged[0].time).toBe("8:00");
    expect(merged[0].location).toBe("M1");
    expect(merged[0].note).toBe("a");
  });

  it("descarta placeholders sin nombre del formulario", () => {
    const existing = [area({ area: "", dates: [] })];
    const imported = [area({ area: "Ginecología", dates: ["2026-10-14"] })];

    const merged = mergeAreas(existing, imported);

    expect(merged.map((a) => a.area)).toEqual(["Ginecología"]);
  });
});
