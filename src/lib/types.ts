export interface Area {
  area: string;
  dates: string[];
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
  tituloSinRestriccion: string;
  areas: Area[];
  /** Nombres de áreas de atención diaria (derivadas del catálogo). */
  sinRestriccion?: string[];
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
  codigo: string;
  nombre: string;
  descripcion: string;
  sin_restriccion: boolean;
  activo: boolean;
}

export interface AreaAtencionForm {
  codigo: string;
  nombre: string;
  descripcion: string;
  sin_restriccion: boolean;
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
  tituloSinRestriccion: string;
  publicado: boolean;
  areas: Area[];
  /** Solo para la vista previa: nombres de áreas de atención diaria. */
  sinRestriccion?: string[];
}
