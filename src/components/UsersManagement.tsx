'use client';

import { useEffect, useState } from 'react';
import { useUsers, type Usuario } from '@/hooks/useUsers';
import { useAuth } from '@/hooks/useAuth';

/** Controles de paginación (no renderiza nada con una sola página). */
function Paginacion({
  pagina,
  totalPaginas,
  onCambio,
}: {
  pagina: number;
  totalPaginas: number;
  onCambio: (pagina: number) => void;
}) {
  if (totalPaginas <= 1) return null;
  return (
    <div className="paginacion">
      <button
        type="button"
        className="pag-btn"
        onClick={() => onCambio(Math.max(1, pagina - 1))}
        disabled={pagina === 1}
      >
        ‹
      </button>
      {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((p) => (
        <button
          key={p}
          type="button"
          className={'pag-btn' + (p === pagina ? ' pag-btn--activo' : '')}
          onClick={() => onCambio(p)}
        >
          {p}
        </button>
      ))}
      <button
        type="button"
        className="pag-btn"
        onClick={() => onCambio(Math.min(totalPaginas, pagina + 1))}
        disabled={pagina === totalPaginas}
      >
        ›
      </button>
    </div>
  );
}

export const UsersManagement = () => {
  const { usuario: currentUser } = useAuth();
  const { usuarios, loading, error, meta, listar, eliminar } = useUsers();
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<Usuario | null>(null);
  const [resetUser, setResetUser] = useState<Usuario | null>(null);

  useEffect(() => {
    listar(page, 20);
  }, [page, listar]);

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este usuario?')) return;
    const result = await eliminar(id);
    if (result.success) {
      await listar(page, 20);
    }
  };

  const handleEditClick = (user: Usuario) => {
    setEditingUser(user);
    setShowForm(true);
  };

  const handleAddClick = () => {
    setEditingUser(null);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingUser(null);
    listar(page, 20);
  };

  if (!currentUser || currentUser.rol !== 'admin') {
    return (
      <p className="aviso aviso--error">
        No tienes permisos para acceder a esta página.
      </p>
    );
  }

  return (
    <section>
      <div className="seccion-head">
        <div>
          <h2>Gestión de Usuarios</h2>
          <p className="seccion-sub">
            Total: {meta.total} usuario{meta.total === 1 ? '' : 's'}
          </p>
        </div>
        <button type="button" className="boton boton--sm" onClick={handleAddClick}>
          + Nuevo Usuario
        </button>
      </div>

      {error && <p className="aviso aviso--error">{error}</p>}

      {loading ? (
        <p className="cargando">Cargando…</p>
      ) : usuarios.length === 0 ? (
        <p className="cargando">Aún no hay usuarios registrados.</p>
      ) : (
        <>
          <div className="grid-cronogramas">
            {usuarios.map((user) => (
              <article className="cron-card user-card" key={user.id}>
                <div className="user-card__head">
                  <div className="user-card__avatar" aria-hidden="true">
                    {(user.nombre || user.usuario).charAt(0).toUpperCase()}
                  </div>
                  <div className="user-card__ident">
                    <h3>{user.nombre}</h3>
                    <span className="user-card__usuario">@{user.usuario}</span>
                  </div>
                  <span
                    className={
                      'chip ' + (user.rol === 'admin' ? 'chip--admin' : 'chip--ok')
                    }
                  >
                    {user.rol}
                  </span>
                </div>

                <div className="user-card__campo">
                  <span className="user-card__label">Email</span>
                  <span className="user-card__valor">{user.email}</span>
                </div>

                <div className="user-card__campo">
                  <span className="user-card__label">Estado</span>
                  <span
                    className={
                      'user-estado ' +
                      (user.activo ? 'user-estado--on' : 'user-estado--off')
                    }
                  >
                    <span className="user-estado__punto" />
                    {user.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </div>

                <div className="cron-card__acciones">
                  <button
                    type="button"
                    className="boton boton--ghost boton--sm"
                    onClick={() => handleEditClick(user)}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="boton boton--ghost boton--sm"
                    onClick={() => setResetUser(user)}
                  >
                    Resetear clave
                  </button>
                  <button
                    type="button"
                    className="boton boton--peligro boton--sm"
                    onClick={() => handleDelete(user.id)}
                  >
                    Eliminar
                  </button>
                </div>
              </article>
            ))}
          </div>

          <Paginacion
            pagina={meta.page}
            totalPaginas={meta.total_pages}
            onCambio={setPage}
          />
        </>
      )}

      {showForm && <UserForm user={editingUser} onClose={handleFormClose} />}
      {resetUser && (
        <ResetPasswordForm
          user={resetUser}
          onClose={() => setResetUser(null)}
        />
      )}
    </section>
  );
};

// Componente de formulario reutilizable (modal)
interface UserFormProps {
  user: Usuario | null;
  onClose: () => void;
}

const UserForm = ({ user, onClose }: UserFormProps) => {
  const { crear, actualizar } = useUsers();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const datos = {
      usuario: formData.get('usuario') as string,
      email: formData.get('email') as string,
      nombre: formData.get('nombre') as string,
      password: formData.get('password') as string,
      rol: formData.get('rol') as string,
    };

    try {
      let result;
      if (user?.id) {
        result = await actualizar(user.id, {
          usuario: datos.usuario,
          email: datos.email,
          nombre: datos.nombre,
          rol: datos.rol,
        } as any);
      } else {
        result = await crear(datos);
      }

      if (result.success) {
        onClose();
      } else {
        setError(result.error || 'Error desconocido');
      }
    } catch (err: any) {
      setError(err.message || 'Error al guardar usuario');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-fondo" onClick={onClose}>
      <div className="modal modal--form" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal__titulo">
          {user ? 'Editar Usuario' : 'Nuevo Usuario'}
        </h3>

        {error && <p className="aviso aviso--error">{error}</p>}

        <form onSubmit={handleSubmit}>
          <label className="campo">
            <span>Usuario</span>
            <input type="text" name="usuario" defaultValue={user?.usuario} required />
          </label>

          <label className="campo">
            <span>Email</span>
            <input type="email" name="email" defaultValue={user?.email} required />
          </label>

          <label className="campo">
            <span>Nombre</span>
            <input type="text" name="nombre" defaultValue={user?.nombre} required />
          </label>

          {!user && (
            <label className="campo">
              <span>Contraseña</span>
              <input type="password" name="password" required />
            </label>
          )}

          <label className="campo">
            <span>Rol</span>
            <select name="rol" defaultValue={user?.rol || 'usuario'}>
              <option value="usuario">Usuario</option>
              <option value="admin">Admin</option>
            </select>
          </label>

          <div className="modal__acciones">
            <button
              type="button"
              className="boton boton--secundario"
              onClick={onClose}
            >
              Cancelar
            </button>
            <button type="submit" className="boton" disabled={loading}>
              {loading ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Modal para que un admin resetee la contraseña de otro usuario
const MIN_LEN = 8;

interface ResetPasswordFormProps {
  user: Usuario;
  onClose: () => void;
}

const ResetPasswordForm = ({ user, onClose }: ResetPasswordFormProps) => {
  const { resetearPassword } = useUsers();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [verClave, setVerClave] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const largoOk = newPassword.length >= MIN_LEN;
  const coinciden = confirmPassword.length > 0 && newPassword === confirmPassword;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!largoOk) {
      setError(`La contraseña debe tener al menos ${MIN_LEN} caracteres`);
      return;
    }
    if (!coinciden) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    try {
      const result = await resetearPassword(user.id, newPassword);
      if (result.success) {
        setSuccess(true);
        setTimeout(onClose, 1500);
      } else {
        setError(result.error || 'Error al resetear contraseña');
      }
    } catch (err: any) {
      setError(err.message || 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-fondo" onClick={onClose}>
      <div className="modal modal--form" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal__titulo">Resetear contraseña</h3>
        <p className="seccion-sub" style={{ marginBottom: '1.1rem' }}>
          Nueva contraseña para <strong>{user.nombre}</strong> (@{user.usuario}).
        </p>

        {success && <p className="aviso">Contraseña actualizada.</p>}
        {error && <p className="aviso aviso--error">{error}</p>}

        <form onSubmit={handleSubmit}>
          <label className="campo">
            <span>Nueva contraseña</span>
            <div className="input-clave">
              <input
                type={verClave ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={MIN_LEN}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="input-clave__toggle"
                onClick={() => setVerClave((v) => !v)}
              >
                {verClave ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
            <p
              className={
                'clave-pista' +
                (newPassword.length === 0
                  ? ''
                  : largoOk
                  ? ' clave-pista--ok'
                  : ' clave-pista--error')
              }
            >
              Mínimo {MIN_LEN} caracteres
            </p>
          </label>

          <label className="campo">
            <span>Confirmar contraseña</span>
            <input
              type={verClave ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
            {confirmPassword.length > 0 && (
              <p
                className={
                  'clave-pista' +
                  (coinciden ? ' clave-pista--ok' : ' clave-pista--error')
                }
              >
                {coinciden
                  ? 'Las contraseñas coinciden'
                  : 'Las contraseñas no coinciden'}
              </p>
            )}
          </label>

          <div className="modal__acciones">
            <button
              type="button"
              className="boton boton--secundario"
              onClick={onClose}
            >
              Cancelar
            </button>
            <button type="submit" className="boton" disabled={loading}>
              {loading ? 'Reseteando…' : 'Resetear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
