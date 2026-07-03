import axios from "axios";
import type {
  AreaAtencion,
  AreaAtencionForm,
  Cronograma,
  CronogramaForm,
  CronogramaMeta,
  LoginChallenge,
  LoginResponse,
  Usuario,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "/api";
const TOKEN_KEY = "citas_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(TOKEN_KEY);
}

const http = axios.create({ baseURL: API_BASE });

// Añade el token a cada petición si existe.
http.interceptors.request.use((config) => {
  const t = getToken();
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

// Normaliza errores y gestiona la expiración de sesión (401).
http.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const url: string = error?.config?.url ?? "";
    // 401 en rutas protegidas => cerrar sesión (no en el propio /login).
    if (status === 401 && !url.includes("/login")) {
      clearToken();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("auth:logout"));
      }
      return Promise.reject(new Error("Sesión expirada. Vuelve a entrar."));
    }
    const msg =
      error?.response?.data?.error || error?.message || "Error en la solicitud";
    return Promise.reject(new Error(msg));
  }
);

export async function login(
  email: string,
  password: string
): Promise<LoginChallenge> {
  const { data } = await http.post<LoginChallenge>("/login", {
    email,
    password,
  });
  return data;
}

export async function verifyCode(
  email: string,
  codigo: string
): Promise<LoginResponse> {
  const { data } = await http.post<LoginResponse>("/login/verify", {
    email,
    codigo,
  });
  return data;
}

export async function fetchPerfil(): Promise<Usuario> {
  const { data } = await http.get<{ usuario: Usuario }>("/me");
  return data.usuario;
}

export async function listCronogramas(): Promise<CronogramaMeta[]> {
  const { data } = await http.get<{ cronogramas: CronogramaMeta[] }>(
    "/admin/cronogramas"
  );
  return data.cronogramas ?? [];
}

export async function getCronograma(mes: string): Promise<Cronograma> {
  const { data } = await http.get<{ cronograma: Cronograma }>(
    `/admin/cronogramas/${encodeURIComponent(mes)}`
  );
  return data.cronograma;
}

export async function createCronograma(payload: CronogramaForm): Promise<void> {
  await http.post("/admin/cronogramas", payload);
}

export async function updateCronograma(
  mes: string,
  payload: CronogramaForm
): Promise<void> {
  await http.put(`/admin/cronogramas/${encodeURIComponent(mes)}`, payload);
}

export async function deleteCronograma(mes: string): Promise<void> {
  await http.delete(`/admin/cronogramas/${encodeURIComponent(mes)}`);
}

// ── Áreas de atención ─────────────────────────────────────────────────

export async function listAreas(): Promise<AreaAtencion[]> {
  const { data } = await http.get<{ areas: AreaAtencion[] }>("/admin/areas");
  return data.areas ?? [];
}

export async function listAreasActivas(): Promise<AreaAtencion[]> {
  const { data } = await http.get<{ areas: AreaAtencion[] }>("/areas");
  return data.areas ?? [];
}

export async function createArea(
  payload: AreaAtencionForm
): Promise<AreaAtencion> {
  const { data } = await http.post<{ area: AreaAtencion }>(
    "/admin/areas",
    payload
  );
  return data.area;
}

export async function updateArea(
  id: number,
  payload: AreaAtencionForm
): Promise<AreaAtencion> {
  const { data } = await http.put<{ area: AreaAtencion }>(
    `/admin/areas/${id}`,
    payload
  );
  return data.area;
}

export async function deleteArea(id: number): Promise<void> {
  await http.delete(`/admin/areas/${id}`);
}

// Cliente REST genérico (usado por los hooks de gestión de usuarios).
export const api = {
  async get(url: string, config?: any) {
    const { data } = await http.get(url, config);
    return data;
  },

  async post(url: string, payload?: any, config?: any) {
    const { data } = await http.post(url, payload, config);
    return data;
  },

  async put(url: string, payload?: any, config?: any) {
    const { data } = await http.put(url, payload, config);
    return data;
  },

  async delete(url: string, config?: any) {
    const { data } = await http.delete(url, config);
    return data;
  },
};

export default http;
