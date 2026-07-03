import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock de axios: capturamos la instancia y los interceptores para poder
// invocarlos directamente y verificar las llamadas HTTP.
const mocks = vi.hoisted(() => {
  const instance = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  };
  const axiosDefault = {
    create: vi.fn(() => instance),
    post: vi.fn(),
    delete: vi.fn(),
  };
  return { instance, axiosDefault };
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

beforeEach(() => {
  vi.clearAllMocks();
  window.sessionStorage.clear();
});

describe("token helpers", () => {
  it("set/get/clear sobre sessionStorage", () => {
    expect(api.getToken()).toBeNull();
    api.setToken("abc");
    expect(api.getToken()).toBe("abc");
    api.clearToken();
    expect(api.getToken()).toBeNull();
  });

  it("no fallan en SSR (sin window)", () => {
    vi.stubGlobal("window", undefined);
    expect(api.getToken()).toBeNull();
    expect(() => api.setToken("x")).not.toThrow();
    expect(() => api.clearToken()).not.toThrow();
    vi.unstubAllGlobals();
  });
});

describe("interceptor de petición", () => {
  it("añade Authorization si hay token", () => {
    api.setToken("tok");
    const cfg = reqInterceptor({ headers: {} });
    expect(cfg.headers.Authorization).toBe("Bearer tok");
  });

  it("no añade Authorization sin token", () => {
    const cfg = reqInterceptor({ headers: {} });
    expect(cfg.headers.Authorization).toBeUndefined();
  });
});

describe("interceptor de respuesta", () => {
  it("deja pasar las respuestas correctas", () => {
    expect(onFulfilled("ok")).toBe("ok");
  });

  it("401 fuera de /login cierra sesión", async () => {
    api.setToken("tok");
    const eventSpy = vi.fn();
    window.addEventListener("auth:logout", eventSpy);

    await expect(
      onRejected({ response: { status: 401 }, config: { url: "/me" } })
    ).rejects.toThrow("Sesión expirada");

    expect(api.getToken()).toBeNull();
    expect(eventSpy).toHaveBeenCalled();
    window.removeEventListener("auth:logout", eventSpy);
  });

  it("401 en /login se trata como error normal", async () => {
    await expect(
      onRejected({
        response: { status: 401, data: { error: "Credenciales inválidas" } },
        config: { url: "/login" },
      })
    ).rejects.toThrow("Credenciales inválidas");
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

describe("llamadas a la API", () => {
  it("login", async () => {
    mocks.instance.post.mockResolvedValue({ data: { requiere2fa: true } });
    await api.login("a@b.test", "pass");
    expect(mocks.instance.post).toHaveBeenCalledWith("/login", {
      email: "a@b.test",
      password: "pass",
    });
  });

  it("verifyCode", async () => {
    mocks.instance.post.mockResolvedValue({ data: { token: "t" } });
    const r = await api.verifyCode("a@b.test", "123456");
    expect(r.token).toBe("t");
  });

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
    await api.createCronograma({
      mes: "2026-07", titulo: "T", excerpt: "", indicaciones: "", publicado: true, areas: [],
    });
    expect(mocks.instance.post).toHaveBeenCalledWith("/admin/cronogramas", expect.any(Object));
  });

  it("updateCronograma", async () => {
    mocks.instance.put.mockResolvedValue({ data: {} });
    await api.updateCronograma("2026-07", {
      mes: "2026-07", titulo: "T", excerpt: "", indicaciones: "", publicado: true, areas: [],
    });
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
