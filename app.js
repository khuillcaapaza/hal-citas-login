"use strict";

const API_BASE = (window.APP_CONFIG && window.APP_CONFIG.API_BASE) || "";
const TOKEN_KEY = "citas_token";

const vistaLogin = document.getElementById("vista-login");
const vistaPanel = document.getElementById("vista-panel");
const form = document.getElementById("form-login");
const inputUsuario = document.getElementById("usuario");
const inputPassword = document.getElementById("password");
const btnEntrar = document.getElementById("btn-entrar");
const btnSalir = document.getElementById("btn-salir");
const mensaje = document.getElementById("mensaje");
const panelNombre = document.getElementById("panel-nombre");
const panelRol = document.getElementById("panel-rol");

function mostrarMensaje(texto, tipo) {
  mensaje.textContent = texto;
  mensaje.className = "mensaje" + (tipo ? " mensaje--" + tipo : "");
}

function mostrarPanel(usuario) {
  panelNombre.textContent = usuario.nombre || usuario.usuario || "";
  panelRol.textContent = usuario.rol || "";
  vistaLogin.hidden = true;
  vistaPanel.hidden = false;
}

function mostrarLogin() {
  vistaPanel.hidden = true;
  vistaLogin.hidden = false;
  mostrarMensaje("", null);
}

async function login(usuario, password) {
  const res = await fetch(API_BASE + "/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ usuario, password }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || "No se pudo iniciar sesión");
  }

  return data;
}

async function cargarPerfil(token) {
  const res = await fetch(API_BASE + "/me", {
    headers: { Authorization: "Bearer " + token },
  });

  if (!res.ok) {
    throw new Error("Sesión no válida");
  }

  const data = await res.json();
  return data.usuario;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const usuario = inputUsuario.value.trim();
  const password = inputPassword.value;

  if (!usuario || !password) {
    mostrarMensaje("Ingresa usuario y contraseña.", "error");
    return;
  }

  btnEntrar.disabled = true;
  mostrarMensaje("Verificando…", null);

  try {
    const data = await login(usuario, password);
    sessionStorage.setItem(TOKEN_KEY, data.token);
    mostrarMensaje("Acceso correcto.", "ok");
    mostrarPanel(data.usuario);
    inputPassword.value = "";
  } catch (err) {
    mostrarMensaje(err.message, "error");
  } finally {
    btnEntrar.disabled = false;
  }
});

btnSalir.addEventListener("click", () => {
  sessionStorage.removeItem(TOKEN_KEY);
  mostrarLogin();
});

// Al cargar: si ya hay token guardado, intentar restaurar la sesión.
(async function init() {
  const token = sessionStorage.getItem(TOKEN_KEY);
  if (!token) {
    return;
  }
  try {
    const usuario = await cargarPerfil(token);
    mostrarPanel(usuario);
  } catch {
    sessionStorage.removeItem(TOKEN_KEY);
  }
})();
