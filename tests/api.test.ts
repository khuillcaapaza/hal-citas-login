// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock de axios
const mocks = vi.hoisted(() => {
  const instance = {
    get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  };
  return { instance, axiosDefault: { create: vi.fn(() => instance) } };
});

vi.mock("axios", () => ({ default: mocks.axiosDefault }));

import * as api from "../src/lib/api";

const reqInterceptor = mocks.instance.interceptors.request.use.mock.calls[0][0] as (
  c: { headers: Record<string, unknown> }
) => { headers: Record<string, unknown> };
const resCalls = mocks.instance.interceptors.response.use.mock.calls[0] as [
  (r: unknown) => unknown,
  (e: unknown) => Promise<never>
];
const onFulfilled = resCalls[0];
const onRejected = resCalls[1];

function clearCookie() {
  document.cookie = "hal_token=; path=/; max-age=0";
}
function setCookie(value: string) {
  document.cookie = `hal_token=${encodeURIComponent(value)}; path=/`;
}

beforeEach(() => {
  vi.clearAllMocks();
  clearCookie();
});

// ── Token helpers ────────────────────────────────────────────────────

describe("token helpers", () => {
  it("getToken devuelve null sin cookie", () => {
    expect(api.getToken()).toBeNull();
  });

  it("getToken lee el valor de la cookie hal_token", () => {
    setCookie("my-jwt");
    expect(api.getToken()).toBe("my-jwt");
  });

  it("clearToken borra la cookie", () => {
    setCookie("my-jwt");
    api.clearToken();
    expect(api.getToken()).toBeNull();
  });

  it("getToken no falla en SSR (sin document)", () => {
    vi.stubGlobal("document", undefined);
    expect(api.getToken()).toBeNull();
    vi.unstubAllGlobals();
  });

  it("clearToken no falla en SSR (sin document)", () => {
    vi.stubGlobal("document", undefined);
    expect(() => api.clearToken()).not.toThrow();
    vi.unstubAllGlobals();
  });
});

// ── redirectToAuth ────────────────────────────────────────────────────

describe("redirectToAuth", () => {
  it("asigna window.location.href a la URL de auth", () => {
    const original = window.location;
    delete (window as unknown as Record<string, unknown>).location;
    window.location = { href: "" } as Location;
    api.redirectToAuth();
    expect(window.location.href).toMatch(/localhost|hospitalantoniolorena/);
    window.location = original;
  });

  it("no falla en SSR (sin window)", () => {
    vi.stubGlobal("window", undefined);
    expect(() => api.redirectToAuth()).not.toThrow();
    vi.unstubAllGlobals();
  });
});

// ── Interceptor de petición ───────────────────────────────────────────

describe("interceptor de petición", () => {
  it("añade Authorization si hay cookie", () => {
    setCookie("tok");
    const cfg = reqInterceptor({ headers: {} });
    expect(cfg.headers.Authorization).toBe("Bearer tok");
  });

  it("no añade Authorization sin cookie", () => {
    const cfg = reqInterceptor({ headers: {} });
    expect(cfg.headers.Authorization).toBeUndefined();
  });
});

// ── Interceptor de respuesta ──────────────────────────────────────────

describe("interceptor de respuesta", () => {
  it("deja pasar las respuestas correctas", () => {
    expect(onFulfilled("ok")).toBe("ok");
  });

  it("401 dispara auth:logout y rechaza con sesión expirada", async () => {
    const spy = vi.fn();
    window.addEventListener("auth:logout", spy);
    await expect(
      onRejected({ response: { status: 401 }, config: { url: "/me" } })
    ).rejects.toThrow("Sesión expirada");
    expect(spy).toHaveBeenCalled();
    window.removeEventListener("auth:logout", spy);
  });

  it("usa el mensaje del servidor cuando existe", async () => {
    await expect(
      onRejected({ response: { status: 500, data: { error: "boom" } }, config: { url: "/x" } })
    ).rejects.toThrow("boom");
  });

  it("usa error.message si no hay respuesta", async () => {
    await expect(onRejected({ message: "network", config: {} })).rejects.toThrow("network");
  });

  it("mensaje por defecto cuando no hay nada", async () => {
    await expect(onRejected({ config: {} })).rejects.toThrow("Error en la solicitud");
  });
});

// ── Llamadas a la API ─────────────────────────────────────────────────

describe("llamadas a la API", () => {
  it("fetchPerfil", async () => {
    mocks.instance.get.mockResolvedValue({ data: { usuario: { usuario: "admin" } } });
    expect(await api.fetchPerfil()).toEqual({ usuario: "admin" });
  });

  it("listCronogramas con datos", async () => {
    mocks.instance.get.mockResolvedValue({ data: { cronogramas: [{ mes: "2026-07" }] } });
    expect(await api.listCronogramas()).toHaveLength(1);
  });

  it("listCronogramas sin datos devuelve []", async () => {
    mocks.instance.get.mockResolvedValue({ data: {} });
    expect(await api.listCronogramas()).toEqual([]);
  });

  it("getCronograma", async () => {
    mocks.instance.get.mockResolvedValue({ data: { cronograma: { mes: "2026-07" } } });
    expect(await api.getCronograma("2026-07")).toEqual({ mes: "2026-07" });
    expect(mocks.instance.get).toHaveBeenCalledWith("/admin/cronogramas/2026-07");
  });

  it("createCronograma", async () => {
    mocks.instance.post.mockResolvedValue({ data: {} });
    await api.createCronograma({ mes: "2026-07", titulo: "T", excerpt: "", indicaciones: "", publicado: true, areas: [] });
    expect(mocks.instance.post).toHaveBeenCalledWith("/admin/cronogramas", expect.any(Object));
  });

  it("updateCronograma", async () => {
    mocks.instance.put.mockResolvedValue({ data: {} });
    await api.updateCronograma("2026-07", { mes: "2026-07", titulo: "T", excerpt: "", indicaciones: "", publicado: true, areas: [] });
    expect(mocks.instance.put).toHaveBeenCalledWith("/admin/cronogramas/2026-07", expect.any(Object));
  });

  it("deleteCronograma", async () => {
    mocks.instance.delete.mockResolvedValue({ data: {} });
    await api.deleteCronograma("2026-07");
    expect(mocks.instance.delete).toHaveBeenCalledWith("/admin/cronogramas/2026-07");
  });

  it("listAreas con datos", async () => {
    mocks.instance.get.mockResolvedValue({ data: { areas: [{ id: 1 }] } });
    expect(await api.listAreas()).toHaveLength(1);
  });

  it("listAreas sin datos devuelve []", async () => {
    mocks.instance.get.mockResolvedValue({ data: {} });
    expect(await api.listAreas()).toEqual([]);
  });

  it("listAreasActivas con datos", async () => {
    mocks.instance.get.mockResolvedValue({ data: { areas: [{ id: 1 }] } });
    expect(await api.listAreasActivas()).toHaveLength(1);
  });

  it("listAreasActivas sin datos devuelve []", async () => {
    mocks.instance.get.mockResolvedValue({ data: {} });
    expect(await api.listAreasActivas()).toEqual([]);
  });

  it("createArea", async () => {
    mocks.instance.post.mockResolvedValue({ data: { area: { id: 1 } } });
    expect(await api.createArea({ nombre: "X", descripcion: "", activo: true })).toEqual({ id: 1 });
  });

  it("updateArea", async () => {
    mocks.instance.put.mockResolvedValue({ data: { area: { id: 2 } } });
    expect(await api.updateArea(2, { nombre: "X", descripcion: "", activo: true })).toEqual({ id: 2 });
    expect(mocks.instance.put).toHaveBeenCalledWith("/admin/areas/2", expect.any(Object));
  });

  it("deleteArea", async () => {
    mocks.instance.delete.mockResolvedValue({ data: {} });
    await api.deleteArea(3);
    expect(mocks.instance.delete).toHaveBeenCalledWith("/admin/areas/3");
  });
});

describe("cliente REST genérico (api)", () => {
  it("api.get devuelve data", async () => {
    mocks.instance.get.mockResolvedValue({ data: { ok: 1 } });
    expect(await api.api.get("/x")).toEqual({ ok: 1 });
    expect(mocks.instance.get).toHaveBeenCalledWith("/x", undefined);
  });

  it("api.post devuelve data", async () => {
    mocks.instance.post.mockResolvedValue({ data: { ok: 2 } });
    expect(await api.api.post("/x", { a: 1 })).toEqual({ ok: 2 });
    expect(mocks.instance.post).toHaveBeenCalledWith("/x", { a: 1 }, undefined);
  });

  it("api.put devuelve data", async () => {
    mocks.instance.put.mockResolvedValue({ data: { ok: 3 } });
    expect(await api.api.put("/x", { a: 1 })).toEqual({ ok: 3 });
    expect(mocks.instance.put).toHaveBeenCalledWith("/x", { a: 1 }, undefined);
  });

  it("api.delete devuelve data", async () => {
    mocks.instance.delete.mockResolvedValue({ data: { ok: 4 } });
    expect(await api.api.delete("/x")).toEqual({ ok: 4 });
    expect(mocks.instance.delete).toHaveBeenCalledWith("/x", undefined);
  });
});

