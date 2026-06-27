"use client";

import { useState, type FormEvent } from "react";
import { login, setToken, verifyCode } from "@/lib/api";
import type { Usuario } from "@/lib/types";

interface Props {
  onSuccess: (usuario: Usuario) => void;
}

type Paso = "credenciales" | "codigo";

export default function LoginView({ onSuccess }: Props) {
  const [paso, setPaso] = useState<Paso>("credenciales");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [codigo, setCodigo] = useState("");
  const [mensaje, setMensaje] = useState<{ texto: string; tipo?: "error" | "ok" }>(
    { texto: "" }
  );
  const [cargando, setCargando] = useState(false);

  async function onSubmitCredenciales(e: FormEvent) {
    e.preventDefault();
    const correo = email.trim().toLowerCase();
    if (!correo || !password) {
      setMensaje({ texto: "Ingresa tu email y contraseña.", tipo: "error" });
      return;
    }
    setCargando(true);
    setMensaje({ texto: "Verificando…" });
    try {
      const data = await login(correo, password);
      setPassword("");
      setCodigo("");
      setPaso("codigo");
      setMensaje({
        texto: data.mensaje ?? "Te enviamos un código de verificación a tu correo.",
        tipo: "ok",
      });
    } catch (err) {
      setMensaje({ texto: (err as Error).message, tipo: "error" });
    } finally {
      setCargando(false);
    }
  }

  async function onSubmitCodigo(e: FormEvent) {
    e.preventDefault();
    const cod = codigo.replace(/\D/g, "");
    if (cod.length !== 6) {
      setMensaje({ texto: "Ingresa el código de 6 dígitos.", tipo: "error" });
      return;
    }
    setCargando(true);
    setMensaje({ texto: "Validando código…" });
    try {
      const data = await verifyCode(email.trim().toLowerCase(), cod);
      setToken(data.token);
      setCodigo("");
      onSuccess(data.usuario);
    } catch (err) {
      setMensaje({ texto: (err as Error).message, tipo: "error" });
    } finally {
      setCargando(false);
    }
  }

  function volver() {
    setPaso("credenciales");
    setCodigo("");
    setMensaje({ texto: "" });
  }

  return (
    <main className="card">
      <h1 className="titulo">Sistema para el Cronograma de Atención de Citas</h1>
      <p className="subtitulo">Hospital Antonio Lorena</p>

      {paso === "credenciales" ? (
        <form onSubmit={onSubmitCredenciales} autoComplete="off" noValidate>
          <label className="campo">
            <span>Email</span>
            <input
              type="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              autoComplete="username"
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
              autoComplete="current-password"
            />
          </label>

          <button type="submit" className="boton" disabled={cargando}>
            Continuar
          </button>
          <p
            className={"mensaje" + (mensaje.tipo ? " mensaje--" + mensaje.tipo : "")}
            role="alert"
            aria-live="polite"
          >
            {mensaje.texto}
          </p>
        </form>
      ) : (
        <form onSubmit={onSubmitCodigo} autoComplete="off" noValidate>
          <p className="subtitulo">
            Ingresa el código de 6 dígitos que enviamos a<br />
            <strong>{email.trim().toLowerCase()}</strong>
          </p>

          <label className="campo">
            <span>Código de verificación</span>
            <input
              type="text"
              name="codigo"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ""))}
              required
              autoFocus
              autoComplete="one-time-code"
            />
          </label>

          <button type="submit" className="boton" disabled={cargando}>
            Entrar
          </button>
          <button
            type="button"
            className="boton boton--secundario"
            onClick={volver}
            disabled={cargando}
          >
            Volver
          </button>
          <p
            className={"mensaje" + (mensaje.tipo ? " mensaje--" + mensaje.tipo : "")}
            role="alert"
            aria-live="polite"
          >
            {mensaje.texto}
          </p>
        </form>
      )}
    </main>
  );
}
