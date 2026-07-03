'use client';

import { useState } from 'react';
import { useUsers } from '@/hooks/useUsers';

const MIN_LEN = 8;

export const ChangePasswordForm = () => {
  const { cambiarPassword, error: hookError } = useUsers();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [verActual, setVerActual] = useState(false);
  const [verNueva, setVerNueva] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const largoOk = newPassword.length >= MIN_LEN;
  const coinciden = confirmPassword.length > 0 && newPassword === confirmPassword;
  const puedeEnviar =
    currentPassword.length > 0 && largoOk && coinciden && !loading;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (newPassword.length < MIN_LEN) {
      setError(`La contraseña debe tener al menos ${MIN_LEN} caracteres`);
      return;
    }

    setLoading(true);

    try {
      const result = await cambiarPassword(currentPassword, newPassword);
      if (result.success) {
        setSuccess(true);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setSuccess(false), 5000);
      } else {
        setError(result.error || 'Error al cambiar contraseña');
      }
    } catch (err: any) {
      setError(err.message || 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section>
      <div className="seccion-head">
        <div>
          <h2>Cambiar Contraseña</h2>
          <p className="seccion-sub">
            Actualiza tu contraseña de acceso al sistema.
          </p>
        </div>
      </div>

      <div className="form-estrecho">
        <div className="panel-card">
          {success && <p className="aviso">Contraseña cambiada exitosamente.</p>}
          {error && <p className="aviso aviso--error">{error}</p>}
          {hookError && !error && (
            <p className="aviso aviso--error">{hookError}</p>
          )}

          <form onSubmit={handleSubmit}>
            <label className="campo">
              <span>Contraseña actual</span>
              <div className="input-clave">
                <input
                  type={verActual ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="input-clave__toggle"
                  onClick={() => setVerActual((v) => !v)}
                  aria-label={verActual ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {verActual ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
            </label>

            <label className="campo">
              <span>Nueva contraseña</span>
              <div className="input-clave">
                <input
                  type={verNueva ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={MIN_LEN}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="input-clave__toggle"
                  onClick={() => setVerNueva((v) => !v)}
                  aria-label={verNueva ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {verNueva ? 'Ocultar' : 'Mostrar'}
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
                {largoOk || newPassword.length === 0
                  ? `Mínimo ${MIN_LEN} caracteres`
                  : `Faltan ${MIN_LEN - newPassword.length} caracteres`}
              </p>
            </label>

            <label className="campo">
              <span>Confirmar nueva contraseña</span>
              <input
                type={verNueva ? 'text' : 'password'}
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

            <button type="submit" className="boton" disabled={!puedeEnviar}>
              {loading ? 'Cambiando…' : 'Cambiar Contraseña'}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
};
