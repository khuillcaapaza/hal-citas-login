// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UsersManagement } from "@/components/UsersManagement";
import type { Usuario } from "@/hooks/useUsers";

const h = vi.hoisted(() => ({
  users: {
    usuarios: [] as Usuario[],
    loading: false,
    error: null as string | null,
    meta: { total: 2, page: 1, per_page: 20, total_pages: 1 },
  },
  auth: {
    usuario: {
      id: 1,
      usuario: "ana",
      email: "ana@example.com",
      nombre: "Ana",
      rol: "admin" as "admin" | "usuario",
      activo: true,
    },
  },
  fns: {
    listar: vi.fn(),
    crear: vi.fn(),
    actualizar: vi.fn(),
    eliminar: vi.fn(),
    resetearPassword: vi.fn(),
    cambiarPassword: vi.fn(),
  },
}));

vi.mock("@/hooks/useUsers", () => ({
  useUsers: () => ({ ...h.users, ...h.fns }),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => h.auth,
}));

function usuariosBase(): Usuario[] {
  return [
    {
      id: 1,
      usuario: "ana",
      email: "ana@example.com",
      nombre: "Ana",
      rol: "admin",
      activo: true,
      creado_en: "2026-01-01",
      actualizado_en: "2026-01-01",
    },
    {
      id: 2,
      usuario: "beto",
      email: "beto@example.com",
      nombre: "Beto",
      rol: "usuario",
      activo: false,
      creado_en: "2026-01-02",
      actualizado_en: "2026-01-02",
    },
  ];
}

beforeEach(() => {
  h.users.usuarios = usuariosBase();
  h.users.loading = false;
  h.users.error = null;
  h.users.meta = { total: 2, page: 1, per_page: 20, total_pages: 1 };
  h.auth.usuario = {
    id: 1,
    usuario: "ana",
    email: "ana@example.com",
    nombre: "Ana",
    rol: "admin",
    activo: true,
  };
  h.fns.listar.mockReset();
  h.fns.crear.mockReset().mockResolvedValue({ success: true });
  h.fns.actualizar.mockReset().mockResolvedValue({ success: true });
  h.fns.eliminar.mockReset().mockResolvedValue({ success: true });
  h.fns.resetearPassword.mockReset().mockResolvedValue({ success: true });
  h.fns.cambiarPassword.mockReset().mockResolvedValue({ success: true });
});
afterEach(() => cleanup());

describe("UsersManagement - control de acceso", () => {
  it("bloquea a usuarios no admin", () => {
    h.auth.usuario = { ...h.auth.usuario, rol: "usuario" };
    render(<UsersManagement />);
    expect(screen.getByText(/no tienes permisos/i)).toBeTruthy();
  });

  it("bloquea si no hay usuario", () => {
    // @ts-expect-error usuario nulo
    h.auth.usuario = null;
    render(<UsersManagement />);
    expect(screen.getByText(/no tienes permisos/i)).toBeTruthy();
  });
});

describe("UsersManagement - listado", () => {
  it("llama a listar al montar", () => {
    render(<UsersManagement />);
    expect(h.fns.listar).toHaveBeenCalledWith(1, 20);
  });

  it("renderiza cards con nombre, usuario y email", () => {
    render(<UsersManagement />);
    expect(screen.getByText("Ana")).toBeTruthy();
    expect(screen.getByText("@ana")).toBeTruthy();
    expect(screen.getByText("ana@example.com")).toBeTruthy();
    expect(screen.getByText("Beto")).toBeTruthy();
  });

  it("muestra rol y estado", () => {
    render(<UsersManagement />);
    expect(screen.getByText("admin")).toBeTruthy();
    expect(screen.getByText("usuario")).toBeTruthy();
    expect(screen.getByText("Activo")).toBeTruthy();
    expect(screen.getByText("Inactivo")).toBeTruthy();
  });

  it("muestra estado de carga", () => {
    h.users.loading = true;
    render(<UsersManagement />);
    expect(screen.getByText(/cargando/i)).toBeTruthy();
  });

  it("muestra estado vacío", () => {
    h.users.usuarios = [];
    render(<UsersManagement />);
    expect(screen.getByText(/aún no hay usuarios/i)).toBeTruthy();
  });

  it("muestra el error del hook", () => {
    h.users.error = "Error de red";
    render(<UsersManagement />);
    expect(screen.getByText("Error de red")).toBeTruthy();
  });
});

describe("UsersManagement - crear", () => {
  it("abre el modal de nuevo usuario", async () => {
    const user = userEvent.setup();
    render(<UsersManagement />);
    await user.click(screen.getByRole("button", { name: /nuevo usuario/i }));
    expect(screen.getByRole("heading", { name: "Nuevo Usuario" })).toBeTruthy();
  });

  it("envía crear con los datos", async () => {
    const user = userEvent.setup();
    const { container } = render(<UsersManagement />);
    await user.click(screen.getByRole("button", { name: /nuevo usuario/i }));
    await user.type(container.querySelector('input[name="usuario"]')!, "nuevo");
    await user.type(container.querySelector('input[name="email"]')!, "nuevo@x.com");
    await user.type(container.querySelector('input[name="nombre"]')!, "Nuevo");
    await user.type(container.querySelector('input[name="password"]')!, "clave1234");
    await user.click(screen.getByRole("button", { name: "Guardar" }));
    expect(h.fns.crear).toHaveBeenCalledWith({
      usuario: "nuevo",
      email: "nuevo@x.com",
      nombre: "Nuevo",
      password: "clave1234",
      rol: "usuario",
    });
  });

  it("muestra error si crear falla", async () => {
    h.fns.crear.mockResolvedValue({ success: false, error: "Usuario duplicado" });
    const user = userEvent.setup();
    const { container } = render(<UsersManagement />);
    await user.click(screen.getByRole("button", { name: /nuevo usuario/i }));
    await user.type(container.querySelector('input[name="usuario"]')!, "dup");
    await user.type(container.querySelector('input[name="email"]')!, "dup@x.com");
    await user.type(container.querySelector('input[name="nombre"]')!, "Dup");
    await user.type(container.querySelector('input[name="password"]')!, "clave1234");
    await user.click(screen.getByRole("button", { name: "Guardar" }));
    expect(await screen.findByText("Usuario duplicado")).toBeTruthy();
  });
});

describe("UsersManagement - editar", () => {
  it("precarga datos en el modal", async () => {
    const user = userEvent.setup();
    const { container } = render(<UsersManagement />);
    await user.click(screen.getAllByRole("button", { name: "Editar" })[0]);
    expect(screen.getByRole("heading", { name: "Editar Usuario" })).toBeTruthy();
    expect(
      (container.querySelector('input[name="usuario"]') as HTMLInputElement).value
    ).toBe("ana");
  });

  it("no muestra campo de contraseña al editar", async () => {
    const user = userEvent.setup();
    const { container } = render(<UsersManagement />);
    await user.click(screen.getAllByRole("button", { name: "Editar" })[0]);
    expect(container.querySelector('input[name="password"]')).toBeNull();
  });

  it("envía actualización con el id", async () => {
    const user = userEvent.setup();
    const { container } = render(<UsersManagement />);
    await user.click(screen.getAllByRole("button", { name: "Editar" })[0]);
    const nombre = container.querySelector('input[name="nombre"]') as HTMLInputElement;
    await user.clear(nombre);
    await user.type(nombre, "Ana Editada");
    await user.click(screen.getByRole("button", { name: "Guardar" }));
    expect(h.fns.actualizar).toHaveBeenCalledWith(1, {
      usuario: "ana",
      email: "ana@example.com",
      nombre: "Ana Editada",
      rol: "admin",
    });
  });
});

describe("UsersManagement - eliminar", () => {
  it("elimina cuando se confirma", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    const user = userEvent.setup();
    render(<UsersManagement />);
    await user.click(screen.getAllByRole("button", { name: "Eliminar" })[0]);
    expect(h.fns.eliminar).toHaveBeenCalledWith(1);
    confirmSpy.mockRestore();
  });

  it("no elimina si se cancela", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    const user = userEvent.setup();
    render(<UsersManagement />);
    await user.click(screen.getAllByRole("button", { name: "Eliminar" })[0]);
    expect(h.fns.eliminar).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });
});

describe("UsersManagement - resetear contraseña", () => {
  it("abre el modal indicando el usuario", async () => {
    const user = userEvent.setup();
    render(<UsersManagement />);
    await user.click(screen.getAllByRole("button", { name: /resetear clave/i })[0]);
    const modal = screen.getByRole("heading", { name: /resetear contraseña/i })
      .parentElement as HTMLElement;
    expect(within(modal).getAllByText(/ana/i).length).toBeGreaterThan(0);
  });

  it("valida el largo mínimo", async () => {
    const user = userEvent.setup();
    const { container } = render(<UsersManagement />);
    await user.click(screen.getAllByRole("button", { name: /resetear clave/i })[0]);
    const inputs = container.querySelectorAll(".modal--form input");
    await user.type(inputs[0] as HTMLInputElement, "corta");
    await user.type(inputs[1] as HTMLInputElement, "corta");
    await user.click(screen.getByRole("button", { name: "Resetear" }));
    expect(screen.getByText(/al menos 8 caracteres/i)).toBeTruthy();
    expect(h.fns.resetearPassword).not.toHaveBeenCalled();
  });

  it("resetea con datos válidos", async () => {
    const user = userEvent.setup();
    const { container } = render(<UsersManagement />);
    await user.click(screen.getAllByRole("button", { name: /resetear clave/i })[0]);
    const inputs = container.querySelectorAll(".modal--form input");
    await user.type(inputs[0] as HTMLInputElement, "clave1234");
    await user.type(inputs[1] as HTMLInputElement, "clave1234");
    await user.click(screen.getByRole("button", { name: "Resetear" }));
    expect(h.fns.resetearPassword).toHaveBeenCalledWith(1, "clave1234");
    expect(await screen.findByText(/contraseña actualizada/i)).toBeTruthy();
  });
});

describe("UsersManagement - paginación", () => {
  it("no muestra controles con una sola página", () => {
    const { container } = render(<UsersManagement />);
    expect(container.querySelector(".paginacion")).toBeNull();
  });

  it("muestra controles con varias páginas", () => {
    h.users.meta = { total: 40, page: 1, per_page: 20, total_pages: 2 };
    const { container } = render(<UsersManagement />);
    expect(container.querySelector(".paginacion")).toBeTruthy();
  });
});
