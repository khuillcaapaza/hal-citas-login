import { useState, useCallback } from 'react';
import { api } from '@/lib/api';

export interface Usuario {
  id: number;
  usuario: string;
  email: string;
  nombre: string;
  rol: 'admin' | 'usuario';
  activo: boolean;
  creado_en: string;
  actualizado_en: string;
}

export interface ListadoUsuarios {
  usuarios: Usuario[];
  meta: {
    total: number;
    page: number;
    per_page: number;
    total_pages: number;
  };
}

export const useUsers = () => {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState({ total: 0, page: 1, per_page: 20, total_pages: 0 });

  // Listar usuarios
  const listar = useCallback(async (page: number = 1, per_page: number = 20) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/admin/users?page=${page}&per_page=${per_page}`);
      setUsuarios(response.usuarios);
      setMeta(response.meta);
    } catch (err: any) {
      setError(err.message || 'Error al listar usuarios');
    } finally {
      setLoading(false);
    }
  }, []);

  // Crear usuario
  const crear = useCallback(async (datos: {
    usuario: string;
    email: string;
    nombre: string;
    password: string;
    rol?: string;
  }) => {
    try {
      setError(null);
      await api.post('/admin/users', datos);
      await listar(); // Recargar lista
      return { success: true };
    } catch (err: any) {
      const errMsg = err.message || 'Error al crear usuario';
      setError(errMsg);
      return { success: false, error: errMsg };
    }
  }, [listar]);

  // Actualizar usuario
  const actualizar = useCallback(async (id: number, datos: Partial<Usuario>) => {
    try {
      setError(null);
      await api.put(`/admin/users/${id}`, datos);
      await listar(); // Recargar lista
      return { success: true };
    } catch (err: any) {
      const errMsg = err.message || 'Error al actualizar usuario';
      setError(errMsg);
      return { success: false, error: errMsg };
    }
  }, [listar]);

  // Eliminar usuario
  const eliminar = useCallback(async (id: number) => {
    try {
      setError(null);
      await api.delete(`/admin/users/${id}`);
      await listar(); // Recargar lista
      return { success: true };
    } catch (err: any) {
      const errMsg = err.message || 'Error al eliminar usuario';
      setError(errMsg);
      return { success: false, error: errMsg };
    }
  }, [listar]);

  // Resetear contraseña
  const resetearPassword = useCallback(async (id: number, newPassword: string) => {
    try {
      setError(null);
      await api.post(`/admin/users/${id}/reset-password`, { password: newPassword });
      return { success: true };
    } catch (err: any) {
      const errMsg = err.message || 'Error al resetear contraseña';
      setError(errMsg);
      return { success: false, error: errMsg };
    }
  }, []);

  // Cambiar propia contraseña
  const cambiarPassword = useCallback(async (currentPassword: string, newPassword: string) => {
    try {
      setError(null);
      await api.post('/users/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
      });
      return { success: true };
    } catch (err: any) {
      const errMsg = err.message || 'Error al cambiar contraseña';
      setError(errMsg);
      return { success: false, error: errMsg };
    }
  }, []);

  return {
    usuarios,
    loading,
    error,
    meta,
    listar,
    crear,
    actualizar,
    eliminar,
    resetearPassword,
    cambiarPassword,
  };
};
