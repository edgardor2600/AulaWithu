import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { groupsService, type StudentGroup } from '../../services/groupsService';
import toast from 'react-hot-toast';
import { Users, BookOpen, Calendar, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';

export const StudentGroupsView = () => {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<StudentGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    setIsLoading(true);
    try {
      const data = await groupsService.getMyGroups();
      setGroups(data);
    } catch (error) {
      toast.error('Error al cargar tus grupos');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-slate-100 border-t-emerald-500 mb-4"></div>
        <p className="text-sm text-slate-500 font-medium">Cargando tus grupos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full">
      {/* Header Sección */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-2">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Tus Grupos de Estudio</h2>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Accede al material exclusivo de tus clases.
          </p>
        </div>
        {groups.length > 0 && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-700">
            <Users className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <span className="text-xs font-bold uppercase tracking-wider">
              {groups.length} {groups.length === 1 ? 'Grupo' : 'Grupos'}
            </span>
          </div>
        )}
      </div>

      {groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 lg:p-16 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 border-dashed shadow-sm">
          <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800/50 rounded-2xl flex items-center justify-center mb-4 border border-slate-100 dark:border-slate-700">
            <Users className="w-8 h-8 text-slate-300 dark:text-slate-600" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">
            No tienes grupos activos
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs mb-6">
            Pide a tu profesor que te asigne a una clase para comenzar a colaborar.
          </p>
        </div>
      ) : (
        /* RESPONSIVE GRID: 1 columna en móvil, 2 en tablet (sm), 3 en desktop (lg) */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {groups.map((item, index) => {
            if (!item.group || !item.class) return null;

            // Paleta de colores pastel hermosos para asegurar que NO se mezclen con el fondo
            const themeColors = [
              { bg: 'bg-blue-50/80 dark:bg-blue-900/10', border: 'border-blue-200 dark:border-blue-800/50', hoverBg: 'hover:bg-blue-100/60 dark:hover:bg-blue-900/20', hoverBorder: 'hover:border-blue-400 dark:hover:border-blue-700', iconBg: 'bg-blue-100 dark:bg-blue-900/30', iconColor: 'text-blue-700 dark:text-blue-400' },
              { bg: 'bg-indigo-50/80 dark:bg-indigo-900/10', border: 'border-indigo-200 dark:border-indigo-800/50', hoverBg: 'hover:bg-indigo-100/60 dark:hover:bg-indigo-900/20', hoverBorder: 'hover:border-indigo-400 dark:hover:border-indigo-700', iconBg: 'bg-indigo-100 dark:bg-indigo-900/30', iconColor: 'text-indigo-700 dark:text-indigo-400' },
              { bg: 'bg-emerald-50/80 dark:bg-emerald-900/10', border: 'border-emerald-200 dark:border-emerald-800/50', hoverBg: 'hover:bg-emerald-100/60 dark:hover:bg-emerald-900/20', hoverBorder: 'hover:border-emerald-400 dark:hover:border-emerald-700', iconBg: 'bg-emerald-100 dark:bg-emerald-900/30', iconColor: 'text-emerald-700 dark:text-emerald-400' },
              { bg: 'bg-fuchsia-50/80 dark:bg-fuchsia-900/10', border: 'border-fuchsia-200 dark:border-fuchsia-800/50', hoverBg: 'hover:bg-fuchsia-100/60 dark:hover:bg-fuchsia-900/20', hoverBorder: 'hover:border-fuchsia-400 dark:hover:border-fuchsia-700', iconBg: 'bg-fuchsia-100 dark:bg-fuchsia-900/30', iconColor: 'text-fuchsia-700 dark:text-fuchsia-400' },
              { bg: 'bg-rose-50/80 dark:bg-rose-900/10', border: 'border-rose-200 dark:border-rose-800/50', hoverBg: 'hover:bg-rose-100/60 dark:hover:bg-rose-900/20', hoverBorder: 'hover:border-rose-400 dark:hover:border-rose-700', iconBg: 'bg-rose-100 dark:bg-rose-900/30', iconColor: 'text-rose-700 dark:text-rose-400' },
              { bg: 'bg-amber-50/80 dark:bg-amber-900/10', border: 'border-amber-200 dark:border-amber-800/50', hoverBg: 'hover:bg-amber-100/60 dark:hover:bg-amber-900/20', hoverBorder: 'hover:border-amber-400 dark:hover:border-amber-700', iconBg: 'bg-amber-100 dark:bg-amber-900/30', iconColor: 'text-amber-700 dark:text-amber-400' }
            ];
            const theme = themeColors[index % themeColors.length];

            return (
              <div
                key={item.enrollment.id}
                onClick={() => navigate(`/classes/${item.class!.id}`)}
                className={`group relative ${theme.bg} rounded-2xl p-5 shadow-sm hover:shadow-lg transition-all duration-300 border-2 ${theme.border} ${theme.hoverBg} ${theme.hoverBorder} flex flex-col cursor-pointer overflow-hidden transform hover:-translate-y-1`}
              >
                {/* Header de Tarjeta */}
                <div className="flex items-start gap-4 mb-4">
                  {/* Icono Principal Moderno Dinámico */}
                  <div className={`w-12 h-12 rounded-xl ${theme.iconBg} ${theme.iconColor} flex items-center justify-center shrink-0 border border-white/60 dark:border-white/10 shadow-sm group-hover:scale-105 transition-all duration-300`}>
                    <BookOpen className="w-6 h-6" />
                  </div>
                  
                  {/* Títulos */}
                  <div className="flex-1 min-w-0 pt-0.5">
                    <h3 className="font-bold text-base md:text-lg text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate transition-colors leading-tight">
                      {item.class.title}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Users className="w-3.5 h-3.5 text-slate-400 max-w-[14px]" />
                      <span className="text-[13px] font-medium text-slate-600 dark:text-slate-400 truncate">
                        {item.group.name}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Descripción (Opcional) */}
                <div className="flex-1 flex flex-col">
                  {item.group.description && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed mb-4">
                      {item.group.description}
                    </p>
                  )}
                </div>

                {/* Área Inferior: Metadatos */}
                <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800/60 space-y-3 relative">
                  
                  {/* Fecha y Estado */}
                  <div className="flex flex-wrap items-center justify-between gap-y-2">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                      <span>{formatDate(item.enrollment.enrolled_at)}</span>
                    </div>

                    {item.enrollment.status && (
                      <span className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border ${
                        item.enrollment.status === 'active'
                          ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-500/20'
                          : item.enrollment.status === 'completed'
                          ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200/60 dark:border-blue-500/20'
                          : 'bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border-slate-200/60 dark:border-slate-700/50'
                      }`}>
                        {item.enrollment.status === 'active' && <CheckCircle2 className="w-3 h-3" />}
                        {item.enrollment.status === 'active' ? 'Activo' :
                         item.enrollment.status === 'completed' ? 'Finalizado' : 'Inactivo'}
                      </span>
                    )}
                  </div>

                  {/* Notas */}
                  {item.enrollment.notes && (
                    <div className="flex items-start gap-2 bg-amber-50/50 dark:bg-amber-500/10 border border-amber-100/50 dark:border-amber-500/20 p-2.5 rounded-lg text-xs text-slate-600 dark:text-slate-400 mt-2">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                      <span className="block leading-relaxed">
                        {item.enrollment.notes}
                      </span>
                    </div>
                  )}

                  {/* Flecha Flotante sutil en Hover */}
                  <div className="hidden md:flex absolute bottom-0 right-0 w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-500/20 items-center justify-center shadow-sm border border-blue-100 dark:border-blue-400/20 opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all duration-300">
                    <ArrowRight className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
