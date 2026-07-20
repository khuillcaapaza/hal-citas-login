import axios from "axios";
import type {
  AreaAtencion,
  AreaAtencionForm,
  Cronograma,
  CronogramaForm,
  CronogramaMeta,
  Usuario,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "/api";
const COOKIE_NAME = "hal_token";
const COOKIE_DOMAIN =
  process.env.NEXT_PUBLIC_COOKIE_DOMAIN || ".hospitalantoniolorena.gob.pe";
const HAL_AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL || "http://localhost:3005";

// ── Cookie SSO (escrita por hal-auth) ─────────────────────────────────

export function getToken(): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : null;
}

export function clearToken(): void {
  if (typeof document === "undefined") return;
  const base = `${COOKIE_NAME}=; path=/; max-age=0`;
  // Borra la cookie en el dominio actual, en el dominio SSO compartido y en
  // localhost (dev). En prod la cookie vive en .hospitalantoniolorena.gob.pe,
  // así que sin el dominio correcto el logout no la eliminaba.
  document.cookie = base;
  document.cookie = `${base}; domain=${COOKIE_DOMAIN}`;
  document.cookie = `${base}; domain=localhost`;
}

export function redirectToAuth(): void {
  if (typeof window === "undefined") return;
  window.location.href = HAL_AUTH_URL;
}

// ── Cliente HTTP ──────────────────────────────────────────────────────

// ── Cliente HTTP ──────────────────────────────────────────────────────

const http = axios.create({ baseURL: API_BASE });

http.interceptors.request.use((config) => {
  const t = getToken();
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

http.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    if (status === 401) {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("auth:logout"));
      }
      return Promise.reject(new Error("Sesión expirada. Inicia sesión de nuevo."));
    }
    const msg =
      error?.response?.data?.error || error?.message || "Error en la solicitud";
    return Promise.reject(new Error(msg));
  }
);

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

// Cliente REST genérico para utilidades internas del módulo.
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
