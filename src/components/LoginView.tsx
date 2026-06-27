"use client";

import { useState, type FormEvent } from "react";
import { login, setToken } from "@/lib/api";
import type { Usuario } from "@/lib/types";

interface Props {
  onSuccess: (usuario: Usuario) => void;
}

export default function LoginView({ onSuccess }: Props) {
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [mensaje, setMensaje] = useState<{ texto: string; tipo?: "error" | "ok" }>(
    { texto: "" }
  );
  const [cargando, setCargando] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!usuario.trim() || !password) {
      setMensaje({ texto: "Ingresa usuario y contraseña.", tipo: "error" });
      return;
    }
    setCargando(true);
    setMensaje({ texto: "Verificando…" });
    try {
      const data = await login(usuario.trim(), password);
      setToken(data.token);
      setPassword("");
      onSuccess(data.usuario);
    } catch (err) {
      setMensaje({ texto: (err as Error).message, tipo: "error" });
    } finally {
      setCargando(false);
    }
  }

  return (
    <main className="card">
      <h1 className="titulo">Sistema de Citas</h1>
      <p className="subtitulo">Hospital Antonio Lorena</p>

      <form onSubmit={onSubmit} autoComplete="off" noValidate>
        <label className="campo">
          <span>Usuario</span>
          <input
            type="text"
            name="usuario"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            required
            autoFocus
          />
        </label>

        <label className="campo">
          <span>Contraseña</span>
          <input
            type="password"
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>

        <button type="submit" className="boton" disabled={cargando}>
          Entrar
        </button>
        <p
          className={"mensaje" + (mensaje.tipo ? " mensaje--" + mensaje.tipo : "")}
          role="alert"
          aria-live="polite"
        >
          {mensaje.texto}
        </p>
      </form>
    </main>
  );
}
