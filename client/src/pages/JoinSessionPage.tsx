import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { sessionService } from '../services/sessionService';
import { Layout } from '../components/Layout';
import { Radio, ArrowRight, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export const JoinSessionPage = () => {
  const navigate = useNavigate();
  const [sessionCode, setSessionCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState('');

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!sessionCode.trim()) {
      setError('Please enter a session code');
      return;
    }

    if (sessionCode.length !== 6) {
      setError('Session code must be 6 characters');
      return;
    }

    setIsJoining(true);
    setError('');

    try {
      const session = await sessionService.joinByCode(sessionCode.toUpperCase());
      
      toast.success(`Joined session: ${session.session_code}`);
      
      // Navigate to the session view
      navigate(`/session/${session.id}`);
    } catch (err: any) {
      console.error('Failed to join session:', err);
      
      if (err.response?.status === 404) {
        setError('Session not found. Please check the code.');
      } else if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('Failed to join session. Please try again.');
      }
    } finally {
      setIsJoining(false);
    }
  };

  const handleCodeChange = (value: string) => {
    // Only allow alphanumeric characters and max 6 chars
    const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    setSessionCode(cleaned);
    setError('');
  };

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 transition-colors duration-300">
        <div className="max-w-md w-full">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 dark:bg-emerald-500/10 rounded-full mb-4 shadow-inner border border-emerald-200 dark:border-emerald-500/20">
              <Radio className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">
              Unirse a Sesión en Vivo
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              Ingresa el código de 6 caracteres compartido por tu profesor
            </p>
          </div>

          {/* Form Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl dark:shadow-2xl p-8 border border-slate-200 dark:border-slate-800 transition-colors duration-300">
            <form onSubmit={handleJoin} className="space-y-6">
              {/* Session Code Input */}
              <div>
                <label htmlFor="sessionCode" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Código de Sesión
                </label>
                <input
                  id="sessionCode"
                  type="text"
                  value={sessionCode}
                  onChange={(e) => handleCodeChange(e.target.value)}
                  placeholder="ABC123"
                  className="w-full px-4 py-3.5 text-center text-2xl font-black tracking-[0.3em] bg-slate-50 dark:bg-slate-950 border-2 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-300 dark:placeholder-slate-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:focus:ring-emerald-500 dark:focus:border-emerald-500 transition-all uppercase shadow-inner"
                  maxLength={6}
                  autoFocus
                  disabled={isJoining}
                />
                <p className="mt-2 text-xs font-bold text-slate-500 dark:text-slate-500 text-center uppercase tracking-widest">
                  {sessionCode.length}/6 caracteres
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex items-start space-x-2 p-3.5 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 rounded-xl">
                  <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm font-bold text-rose-700 dark:text-rose-300">{error === 'Please enter a session code' ? 'Por favor ingresa un código válida' : error === 'Session code must be 6 characters' ? 'El código debe tener 6 caracteres' : error === 'Session not found. Please check the code.' ? 'Sesión no encontrada. Verifica el código.' : error === 'Failed to join session. Please try again.' ? 'Error al unirse. Inténtalo de nuevo.' : error}</p>
                </div>
              )}

              {/* Join Button */}
              <button
                type="submit"
                disabled={isJoining || sessionCode.length !== 6}
                className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all font-bold shadow-md shadow-emerald-600/20 dark:shadow-none"
              >
                {isJoining ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Conectando...</span>
                  </>
                ) : (
                  <>
                    <span>Unirme a la Sesión</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>

            {/* Help Text */}
            <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400 text-center">
                ¿No tienes un código?{' '}
                <span className="text-emerald-600 dark:text-emerald-400 font-bold block mt-1">
                  Pídele a tu profesor que inicie una sesión en vivo
                </span>
              </p>
            </div>
          </div>

          {/* Back Link */}
          <div className="mt-8 text-center">
            <button
              onClick={() => navigate('/')}
              className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors font-bold text-sm"
            >
              ← Volver al Inicio
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
};
