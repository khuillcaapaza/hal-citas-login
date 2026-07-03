import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// El cleanup automático de RTL solo corre con los globals de Vitest activados;
// lo registramos explícitamente para que los renders no se filtren entre tests.
afterEach(() => {
  cleanup();
});
