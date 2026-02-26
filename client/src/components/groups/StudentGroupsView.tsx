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
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg border border-slate-200">
            <Users className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-bold uppercase tracking-wider">
              {groups.length} {groups.length === 1 ? 'Grupo' : 'Grupos'}
            </span>
          </div>
        )}
      </div>

      {groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 lg:p-16 text-center bg-white rounded-2xl border border-slate-200 border-dashed shadow-sm">
          <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4 border border-slate-100">
            <Users className="w-8 h-8 text-slate-300" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">
            No tienes grupos activos
          </h3>
          <p className="text-sm text-slate-500 max-w-xs mb-6">
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
              { bg: 'bg-blue-50/80', border: 'border-blue-200', hoverBg: 'hover:bg-blue-100/60', hoverBorder: 'hover:border-blue-400', iconBg: 'bg-blue-100', iconColor: 'text-blue-700' },
              { bg: 'bg-indigo-50/80', border: 'border-indigo-200', hoverBg: 'hover:bg-indigo-100/60', hoverBorder: 'hover:border-indigo-400', iconBg: 'bg-indigo-100', iconColor: 'text-indigo-700' },
              { bg: 'bg-emerald-50/80', border: 'border-emerald-200', hoverBg: 'hover:bg-emerald-100/60', hoverBorder: 'hover:border-emerald-400', iconBg: 'bg-emerald-100', iconColor: 'text-emerald-700' },
              { bg: 'bg-fuchsia-50/80', border: 'border-fuchsia-200', hoverBg: 'hover:bg-fuchsia-100/60', hoverBorder: 'hover:border-fuchsia-400', iconBg: 'bg-fuchsia-100', iconColor: 'text-fuchsia-700' },
              { bg: 'bg-rose-50/80', border: 'border-rose-200', hoverBg: 'hover:bg-rose-100/60', hoverBorder: 'hover:border-rose-400', iconBg: 'bg-rose-100', iconColor: 'text-rose-700' },
              { bg: 'bg-amber-50/80', border: 'border-amber-200', hoverBg: 'hover:bg-amber-100/60', hoverBorder: 'hover:border-amber-400', iconBg: 'bg-amber-100', iconColor: 'text-amber-700' }
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
                  <div className={`w-12 h-12 rounded-xl ${theme.iconBg} ${theme.iconColor} flex items-center justify-center shrink-0 border border-white/60 shadow-sm group-hover:scale-105 transition-all duration-300`}>
                    <BookOpen className="w-6 h-6" />
                  </div>
                  
                  {/* Títulos */}
                  <div className="flex-1 min-w-0 pt-0.5">
                    <h3 className="font-bold text-base md:text-lg text-slate-800 group-hover:text-blue-600 truncate transition-colors leading-tight">
                      {item.class.title}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-[13px] font-medium text-slate-600 truncate">
                        {item.group.name}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Descripción (Opcional) */}
                <div className="flex-1 flex flex-col">
                  {item.group.description && (
                    <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed mb-4">
                      {item.group.description}
                    </p>
                  )}
                </div>

                {/* Área Inferior: Metadatos */}
                <div className="mt-auto pt-4 border-t border-slate-100 space-y-3 relative">
                  
                  {/* Fecha y Estado */}
                  <div className="flex flex-wrap items-center justify-between gap-y-2">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{formatDate(item.enrollment.enrolled_at)}</span>
                    </div>

                    {item.enrollment.status && (
                      <span className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border ${
                        item.enrollment.status === 'active'
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-200/60'
                          : item.enrollment.status === 'completed'
                          ? 'bg-blue-50 text-blue-600 border-blue-200/60'
                          : 'bg-slate-50 text-slate-600 border-slate-200/60'
                      }`}>
                        {item.enrollment.status === 'active' && <CheckCircle2 className="w-3 h-3" />}
                        {item.enrollment.status === 'active' ? 'Activo' :
                         item.enrollment.status === 'completed' ? 'Finalizado' : 'Inactivo'}
                      </span>
                    )}
                  </div>

                  {/* Notas */}
                  {item.enrollment.notes && (
                    <div className="flex items-start gap-2 bg-amber-50/50 border border-amber-100/50 p-2.5 rounded-lg text-xs text-slate-600 mt-2">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                      <span className="block leading-relaxed">
                        {item.enrollment.notes}
                      </span>
                    </div>
                  )}

                  {/* Flecha Flotante sutil en Hover (Oculta en móviles para evitar distracciones, visible en md+) */}
                  <div className="hidden md:flex absolute bottom-0 right-0 w-8 h-8 rounded-full bg-blue-50 items-center justify-center shadow-sm border border-blue-100 opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all duration-300">
                    <ArrowRight className="w-4 h-4 text-blue-600" />
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
