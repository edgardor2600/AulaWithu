import { useState } from 'react';
import { adminService, type User } from '../../services/adminService';
import toast from 'react-hot-toast';
import { X, User as UserIcon, Lock, Loader2, ShieldCheck, Eye, EyeOff, KeyRound } from 'lucide-react';

interface EditCredentialsModalProps {
  user: User;
  onClose: () => void;
  onSuccess: (updatedUsername?: string) => void;
}

const USERNAME_REGEX = /^[a-zA-Z0-9._-]+$/;

const getPasswordStrength = (pass: string) => {
  const hasMinLength = pass.length >= 8;
  const hasUppercase = /[A-Z]/.test(pass);
  const hasNumber = /[0-9]/.test(pass);
  const hasSpecial = /[^A-Za-z0-9]/.test(pass);
  const score = [hasMinLength, hasUppercase, hasNumber, hasSpecial].filter(Boolean).length;

  if (!pass) return null;
  if (score <= 1) return { label: 'Débil', color: 'bg-red-500', trackColor: 'bg-red-100 dark:bg-red-900/20', width: 'w-1/4', textColor: 'text-red-600 dark:text-red-400' };
  if (score === 2) return { label: 'Regular', color: 'bg-amber-500', trackColor: 'bg-amber-100 dark:bg-amber-900/20', width: 'w-2/4', textColor: 'text-amber-600 dark:text-amber-400' };
  if (score === 3) return { label: 'Buena', color: 'bg-blue-500', trackColor: 'bg-blue-100 dark:bg-blue-900/20', width: 'w-3/4', textColor: 'text-blue-600 dark:text-blue-400' };
  return { label: 'Fuerte', color: 'bg-emerald-500', trackColor: 'bg-emerald-100 dark:bg-emerald-900/20', width: 'w-full', textColor: 'text-emerald-600 dark:text-emerald-400' };
};

export const EditCredentialsModal = ({ user, onClose, onSuccess }: EditCredentialsModalProps) => {
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const strength = getPasswordStrength(newPassword);
  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);

  const usernameChanged = newUsername.trim().length > 0;
  const passwordChanged = newPassword.length > 0;

  const isUsernameFormatValid = newUsername.length === 0 || USERNAME_REGEX.test(newUsername);
  const passwordsMatch = newPassword === confirmPassword || confirmPassword.length === 0;

  const canSubmit = (usernameChanged || passwordChanged) && !isLoading;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!usernameChanged && !passwordChanged) {
      toast.error('Completa al menos un campo para actualizar');
      return;
    }

    // Validate username
    if (usernameChanged) {
      const u = newUsername.trim();
      if (u.length < 3 || u.length > 20) {
        toast.error('El usuario debe tener entre 3 y 20 caracteres');
        return;
      }
      if (!USERNAME_REGEX.test(u)) {
        toast.error('El usuario solo puede contener letras, números, puntos (.), guiones (-) y guiones bajos (_)');
        return;
      }
    }

    // Validate password
    if (passwordChanged) {
      if (newPassword.length < 8) {
        toast.error('La contraseña debe tener al menos 8 caracteres');
        return;
      }
      if (!/[A-Z]/.test(newPassword)) {
        toast.error('La contraseña debe tener al menos una letra mayúscula');
        return;
      }
      if (!/[0-9]/.test(newPassword)) {
        toast.error('La contraseña debe tener al menos un número');
        return;
      }
      if (newPassword !== confirmPassword) {
        toast.error('Las contraseñas no coinciden');
        return;
      }
    }

    setIsLoading(true);
    try {
      const result = await adminService.updateCredentials(user.id, {
        newUsername: usernameChanged ? newUsername.trim().toLowerCase() : undefined,
        newPassword: passwordChanged ? newPassword : undefined,
      });

      const fieldLabels = result.updatedFields.map((f) => (f === 'username' ? 'usuario' : 'contraseña'));
      toast.success(`✅ ${user.name}: ${fieldLabels.join(' y ')} actualizados correctamente`);
      onSuccess(result.user.username);
    } catch (error: any) {
      const msg = error.response?.data?.error?.message || error.response?.data?.errors?.[0]?.message || 'Error al actualizar credenciales';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.3)] dark:shadow-black/60 max-w-md w-full max-h-[95vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 transition-colors">

        {/* Header */}
        <div className="relative p-6 bg-gradient-to-br from-slate-800 to-slate-900 flex-shrink-0 overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500 opacity-10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-28 h-28 bg-violet-500 opacity-10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center shadow-inner border border-white/20">
                <ShieldCheck className="w-6 h-6 text-indigo-300" />
              </div>
              <div>
                <h2 className="text-xl font-black text-white tracking-tight">Editar Credenciales</h2>
                <p className="text-sm text-slate-400 font-medium mt-0.5">
                  <span className="text-slate-300 font-bold">{user.name}</span>
                  <span className="mx-1.5 text-slate-600">·</span>
                  <span className="font-mono text-xs text-slate-400">@{user.username}</span>
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isLoading}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all duration-200 disabled:opacity-50 hover:rotate-90"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 bg-slate-50 dark:bg-slate-900/50 space-y-6 transition-colors">

          {/* Info banner */}
          <div className="p-3.5 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 rounded-2xl flex items-start gap-3">
            <KeyRound className="w-4 h-4 text-indigo-500 dark:text-indigo-400 shrink-0 mt-0.5" />
            <p className="text-xs font-semibold text-indigo-800 dark:text-indigo-300 leading-relaxed">
              Completa solo los campos que deseas cambiar. Puedes actualizar el usuario, la contraseña, o ambos a la vez.
            </p>
          </div>

          {/* === NUEVO USUARIO === */}
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
              Nuevo Usuario <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 normal-case">(opcional)</span>
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <UserIcon className="w-5 h-5 text-slate-400 dark:text-slate-500 group-focus-within:text-indigo-500 transition-colors" />
              </div>
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:ring-0 focus:border-indigo-500 outline-none transition-all duration-200 shadow-sm font-mono font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 hover:border-slate-300 dark:hover:border-slate-600"
                placeholder={`Actual: ${user.username}`}
                disabled={isLoading}
                autoComplete="off"
                spellCheck={false}
              />
            </div>
            {/* Formato indicator */}
            {newUsername.length > 0 ? (
              <p className={`text-xs font-semibold mt-1.5 flex items-center gap-1.5 transition-colors ${
                isUsernameFormatValid ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'
              }`}>
                <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${
                  isUsernameFormatValid
                    ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600'
                    : 'bg-red-100 dark:bg-red-500/20 text-red-500'
                }`}>{isUsernameFormatValid ? '✓' : '✕'}</span>
                {isUsernameFormatValid ? 'Formato válido — listo para guardar' : 'Solo letras, números, puntos, - y _ (sin espacios)'}
              </p>
            ) : (
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 mt-1.5">
                Ej: juan.perez, ana_garcia, prof-lopez
              </p>
            )}
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
            <span className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Nueva Contraseña</span>
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
          </div>

          {/* === NUEVA CONTRASEÑA === */}
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
              Contraseña <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 normal-case">(opcional)</span>
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Lock className="w-5 h-5 text-slate-400 dark:text-slate-500 group-focus-within:text-indigo-500 transition-colors" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full pl-11 pr-12 py-3 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:ring-0 focus:border-indigo-500 outline-none transition-all duration-200 shadow-sm font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 hover:border-slate-300 dark:hover:border-slate-600"
                placeholder="Mín. 8 chars, mayúscula y número"
                disabled={isLoading}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Strength bar */}
            {newPassword && (
              <div className="mt-2.5 space-y-2">
                <div className="flex items-center gap-2">
                  <div className={`flex-1 h-1.5 rounded-full overflow-hidden ${strength?.trackColor || 'bg-slate-100 dark:bg-slate-800'}`}>
                    <div className={`h-full rounded-full transition-all duration-500 ease-out ${strength?.color || ''} ${strength?.width || 'w-0'}`} />
                  </div>
                  <span className={`text-[11px] font-black tabular-nums w-14 text-right transition-colors ${strength?.textColor || ''}`}>
                    {strength?.label}
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  {[
                    { ok: hasMinLength, label: '8+ caracteres' },
                    { ok: hasUppercase, label: 'Mayúscula' },
                    { ok: hasNumber, label: 'Número' },
                  ].map(({ ok, label }) => (
                    <span key={label} className={`flex items-center gap-1 text-[11px] font-semibold transition-colors ${ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>
                      <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] transition-all ${ok ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-800'}`}>
                        {ok ? '✓' : ''}
                      </span>
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* === CONFIRMAR CONTRASEÑA (solo si está escribiendo) === */}
          {passwordChanged && (
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                Confirmar Contraseña *
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="w-5 h-5 text-slate-400 dark:text-slate-500 group-focus-within:text-indigo-500 transition-colors" />
                </div>
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full pl-11 pr-12 py-3 bg-white dark:bg-slate-800 border-2 rounded-xl focus:ring-0 outline-none transition-all duration-200 shadow-sm font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 ${
                    confirmPassword.length > 0
                      ? passwordsMatch
                        ? 'border-emerald-400 dark:border-emerald-500/60 focus:border-emerald-500'
                        : 'border-red-400 dark:border-red-500/60 focus:border-red-500'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 focus:border-indigo-500'
                  }`}
                  placeholder="Repite la nueva contraseña"
                  disabled={isLoading}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  tabIndex={-1}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {confirmPassword.length > 0 && (
                <p className={`text-xs font-semibold mt-1.5 flex items-center gap-1.5 ${passwordsMatch ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                  <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${passwordsMatch ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600' : 'bg-red-100 dark:bg-red-500/20 text-red-500'}`}>
                    {passwordsMatch ? '✓' : '✕'}
                  </span>
                  {passwordsMatch ? 'Las contraseñas coinciden' : 'Las contraseñas no coinciden'}
                </p>
              )}
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="p-5 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-3 transition-colors">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="w-full sm:w-1/3 px-4 py-3.5 rounded-xl font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-all focus:outline-none disabled:opacity-50"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={!canSubmit}
            className="w-full sm:w-2/3 px-4 py-3.5 rounded-xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2 hover:-translate-y-0.5 focus:outline-none bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200 dark:shadow-indigo-900/30 disabled:opacity-50 disabled:hover:translate-y-0 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Guardando cambios...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-5 h-5" />
                <span>
                  {!usernameChanged && !passwordChanged
                    ? 'Guardar Cambios'
                    : usernameChanged && passwordChanged
                    ? 'Actualizar Usuario y Contraseña'
                    : usernameChanged
                    ? 'Actualizar Usuario'
                    : 'Actualizar Contraseña'}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
