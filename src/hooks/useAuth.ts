import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

export interface UsuarioData {
  id: number;
  usuario: string;
  email: string;
  nombre: string;
  rol: 'admin' | 'usuario';
  activo: boolean;
  creado_en?: string;
  actualizado_en?: string;
}

export const useAuth = () => {
  const [usuario, setUsuario] = useState<UsuarioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await api.get('/users/me');
        setUsuario(response.usuario);
      } catch (err: any) {
        setError(err.message || 'Error al cargar usuario');
        setUsuario(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  return {
    usuario,
    loading,
    error,
    isAuthenticated: !!usuario,
    isAdmin: usuario?.rol === 'admin',
  };
};
