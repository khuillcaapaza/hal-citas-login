export interface Area {
  area: string;
  days: string[];
  time: string;
  location: string;
  note: string;
}

export interface CronogramaMeta {
  mes: string;
  monthLabel: string;
  titulo: string;
  excerpt: string;
  publicado: boolean;
}

export interface Cronograma extends CronogramaMeta {
  indicaciones: string;
  areas: Area[];
  actualizado?: string;
}

export interface Usuario {
  usuario: string;
  email?: string;
  nombre?: string;
  rol?: string;
}

export interface AreaAtencion {
  id: number;
  nombre: string;
  descripcion: string;
  activo: boolean;
}

export interface AreaAtencionForm {
  nombre: string;
  descripcion: string;
  activo: boolean;
}

export interface LoginResponse {
  token: string;
  usuario: Usuario;
}

/** Respuesta del primer paso del login: se envió un código al email. */
export interface LoginChallenge {
  requiere2fa: true;
  email: string;
  expira_en?: number;
  mensaje?: string;
}

/** Datos del formulario del editor (antes de enviar a la API). */
export interface CronogramaForm {
  mes: string;
  titulo: string;
  excerpt: string;
  indicaciones: string;
  publicado: boolean;
  areas: Area[];
}
