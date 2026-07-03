// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChangePasswordForm } from "@/components/ChangePasswordForm";

const h = vi.hoisted(() => ({
  users: { error: null as string | null },
  fns: { cambiarPassword: vi.fn() },
}));

vi.mock("@/hooks/useUsers", () => ({
  useUsers: () => ({
    error: h.users.error,
    cambiarPassword: h.fns.cambiarPassword,
  }),
}));

beforeEach(() => {
  h.users.error = null;
  h.fns.cambiarPassword.mockReset().mockResolvedValue({ success: true });
});
afterEach(() => cleanup());

function getInputs(container: HTMLElement) {
  const inputs = container.querySelectorAll("input");
  return {
    actual: inputs[0] as HTMLInputElement,
    nueva: inputs[1] as HTMLInputElement,
    confirmar: inputs[2] as HTMLInputElement,
  };
}

describe("ChangePasswordForm - render", () => {
  it("renderiza los tres campos", () => {
    const { container } = render(<ChangePasswordForm />);
    expect(container.querySelectorAll("input").length).toBe(3);
    expect(screen.getByText("Contraseña actual")).toBeTruthy();
    expect(screen.getByText("Nueva contraseña")).toBeTruthy();
    expect(screen.getByText("Confirmar nueva contraseña")).toBeTruthy();
  });

  it("el botón inicia deshabilitado", () => {
    render(<ChangePasswordForm />);
    const boton = screen.getByRole("button", {
      name: "Cambiar Contraseña",
    }) as HTMLButtonElement;
    expect(boton.disabled).toBe(true);
  });
});

describe("ChangePasswordForm - validación en vivo", () => {
  it("indica faltan caracteres si la nueva es corta", async () => {
    const user = userEvent.setup();
    const { container } = render(<ChangePasswordForm />);
    await user.type(getInputs(container).nueva, "abc");
    expect(screen.getByText(/faltan 5 caracteres/i)).toBeTruthy();
  });

  it("indica que no coinciden", async () => {
    const user = userEvent.setup();
    const { container } = render(<ChangePasswordForm />);
    const { nueva, confirmar } = getInputs(container);
    await user.type(nueva, "clave1234");
    await user.type(confirmar, "otro1234");
    expect(screen.getByText(/no coinciden/i)).toBeTruthy();
  });

  it("indica que coinciden", async () => {
    const user = userEvent.setup();
    const { container } = render(<ChangePasswordForm />);
    const { nueva, confirmar } = getInputs(container);
    await user.type(nueva, "clave1234");
    await user.type(confirmar, "clave1234");
    expect(screen.getByText(/las contraseñas coinciden/i)).toBeTruthy();
  });

  it("habilita el botón cuando todo es válido", async () => {
    const user = userEvent.setup();
    const { container } = render(<ChangePasswordForm />);
    const { actual, nueva, confirmar } = getInputs(container);
    const boton = screen.getByRole("button", {
      name: "Cambiar Contraseña",
    }) as HTMLButtonElement;
    await user.type(actual, "vieja123");
    await user.type(nueva, "clave1234");
    await user.type(confirmar, "clave1234");
    expect(boton.disabled).toBe(false);
  });
});

describe("ChangePasswordForm - visibilidad", () => {
  it("alterna mostrar/ocultar", async () => {
    const user = userEvent.setup();
    const { container } = render(<ChangePasswordForm />);
    const { actual } = getInputs(container);
    expect(actual.type).toBe("password");
    await user.click(screen.getAllByRole("button", { name: "Mostrar contraseña" })[0]);
    expect(actual.type).toBe("text");
  });
});

describe("ChangePasswordForm - envío", () => {
  it("llama a cambiarPassword y muestra éxito", async () => {
    const user = userEvent.setup();
    const { container } = render(<ChangePasswordForm />);
    const { actual, nueva, confirmar } = getInputs(container);
    await user.type(actual, "vieja123");
    await user.type(nueva, "clave1234");
    await user.type(confirmar, "clave1234");
    await user.click(screen.getByRole("button", { name: "Cambiar Contraseña" }));
    expect(h.fns.cambiarPassword).toHaveBeenCalledWith("vieja123", "clave1234");
    expect(await screen.findByText(/cambiada exitosamente/i)).toBeTruthy();
  });

  it("muestra el error cuando falla", async () => {
    h.fns.cambiarPassword.mockResolvedValue({
      success: false,
      error: "Contraseña actual incorrecta",
    });
    const user = userEvent.setup();
    const { container } = render(<ChangePasswordForm />);
    const { actual, nueva, confirmar } = getInputs(container);
    await user.type(actual, "malaclave");
    await user.type(nueva, "clave1234");
    await user.type(confirmar, "clave1234");
    await user.click(screen.getByRole("button", { name: "Cambiar Contraseña" }));
    expect(await screen.findByText("Contraseña actual incorrecta")).toBeTruthy();
  });
});
