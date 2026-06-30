import { describe, it, expect } from "vitest";
import {
  monthLabel,
  colorMap,
  buildCalendar,
  indicacionesList,
  PALETTE,
} from "../src/lib/utils";
import type { Area } from "../src/lib/types";

const area = (over: Partial<Area> = {}): Area => ({
  area: "Cardiología",
  days: ["Lunes"],
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

  it("construye celdas y asigna áreas por día", () => {
    const areas = [
      area({ area: "Cardio", days: ["Lunes", "DiaInexistente"] }),
      area({ area: "SinDias", days: undefined as unknown as string[] }),
    ];
    const cal = buildCalendar("2026-07", areas);
    expect(cal).not.toBeNull();
    // Julio 2026 tiene 31 días.
    expect(cal!.cells).toHaveLength(31);
    expect(typeof cal!.leading).toBe("number");
    // Algún lunes debe incluir el área "Cardio".
    const conCardio = cal!.cells.some((c) =>
      c.areas.some((a) => a.area === "Cardio")
    );
    expect(conCardio).toBe(true);
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
