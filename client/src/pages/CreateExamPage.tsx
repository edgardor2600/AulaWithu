import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { examsService, type Exam } from '../services/examsService';
import { groupsService, type Group } from '../services/groupsService';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Save, Loader2, BookOpen, HelpCircle, Users
} from 'lucide-react';

/**
 * Parse a raw DB timestamp string to a JS Date in Colombia time.
 * DB column is TIMESTAMP WITHOUT TZ → returns strings like "2026-07-01 13:40:00" (no Z).
 * We append -05:00 so JS treats the value as Colombia time, not UTC.
 */
const parseDbDate = (raw: string): Date => {
  if (raw.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(raw)) return new Date(raw);
  return new Date(raw.replace(' ', 'T') + '-05:00');
};

/**
 * Convert a DB timestamp string to the "YYYY-MM-DDTHH:mm" format
 * expected by <input type="datetime-local">, showing Colombia local time.
 */
const toLocalInput = (raw: string): string => {
  const d = parseDbDate(raw);
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(d).map(p => [p.type, p.value]));
  const h = parts.hour === '24' ? '00' : parts.hour;
  return `${parts.year}-${parts.month}-${parts.day}T${h}:${parts.minute}`;
};

/**
 * Convert a "YYYY-MM-DDTHH:mm" datetime-local input value (Colombia time)
 * to an ISO8601 string with the Colombia UTC offset (-05:00).
 * This passes the server's .isISO8601() validator and is unambiguous.
 * "2026-07-01T08:40" → "2026-07-01T08:40:00-05:00"
 */
const colombiaToDb = (localStr: string): string =>
  localStr + ':00-05:00';

export const CreateExamPage = () => {
  const { classId, examId } = useParams<{ classId: string; examId?: string }>();
  const navigate = useNavigate();
  const isEditing = Boolean(examId);

  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);

  // Groups list for the dropdown
  const [groups, setGroups] = useState<Group[]>([]);

  // Exam form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [passingScore, setPassingScore] = useState(60);
  const [availableFrom, setAvailableFrom] = useState('');
  const [availableTo, setAvailableTo] = useState('');
  const [questionCount, setQuestionCount] = useState(10);
  const [skillType, setSkillType] = useState('complete');
  const [groupId, setGroupId] = useState('');

  // Fetch groups
  useEffect(() => {
    const targetClassId = classId || exam?.class_id;
    if (targetClassId) {
      groupsService.getClassGroups(targetClassId)
        .then(setGroups)
        .catch(err => console.error('Error fetching class groups:', err));
    }
  }, [classId, exam]);

  useEffect(() => {
    if (isEditing && examId) {
      examsService.getExam(examId).then(({ exam: e }) => {
        setExam(e);
        setTitle(e.title);
        setDescription(e.description || '');
        setDurationMinutes(e.duration_minutes);
        setPassingScore(e.passing_score);
        setAvailableFrom(e.available_from ? toLocalInput(e.available_from) : '');
        setAvailableTo(e.available_to   ? toLocalInput(e.available_to)   : '');
        setSkillType(e.skill_type || 'complete');
        setGroupId(e.group_id || '');
        setLoading(false);
      }).catch(() => { toast.error('Error al cargar examen'); navigate(-1); });
    }
  }, [examId, isEditing]);

  const handleSaveMeta = async () => {
    if (!title.trim()) { toast.error('El título es requerido'); return; }
    if (questionCount < 1 || questionCount > 50) {
      toast.error('La cantidad de preguntas debe estar entre 1 y 50');
      return;
    }
    setSaving(true);

    const dbAvailableFrom = availableFrom ? colombiaToDb(availableFrom) : null;
    const dbAvailableTo   = availableTo   ? colombiaToDb(availableTo)   : null;

    try {
      if (isEditing && exam) {
        const updated = await examsService.updateExam(exam.id, {
          groupId: groupId || null,
          title: title.trim(),
          description: description.trim() || undefined,
          durationMinutes,
          passingScore,
          skillType,
          availableFrom: dbAvailableFrom,
          availableTo: dbAvailableTo,
        });
        setExam(updated);
        toast.success('Examen actualizado');
        // Only go to builder if still in draft; otherwise go back
        if (updated.status === 'draft') {
          navigate(`/exams/${exam.id}/builder`);
        } else {
          navigate(-1);
        }
      } else {
        const created = await examsService.createExam({
          classId: classId!,
          groupId: groupId || null,
          title: title.trim(),
          description: description.trim() || undefined,
          durationMinutes,
          passingScore,
          skillType,
          questionCount,
          availableFrom: dbAvailableFrom,
          availableTo: dbAvailableTo,
        });
        toast.success('Examen creado con éxito — redirigiendo al constructor');
        navigate(`/exams/${created.id}/builder`, { replace: true });
      }
    } catch (e: any) {
      toast.error(e.response?.data?.error?.message || 'Error al guardar el examen');
    } finally { setSaving(false); }
  };

  if (loading) return (
    <Layout>
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    </Layout>
  );

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">
              {isEditing ? 'Editar Configuración' : 'Configurar Nuevo Examen'}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Establece las directrices y rango de evaluación para tus alumnos
            </p>
          </div>
        </div>

        {/* Banner for active/closed exams */}
        {isEditing && exam && exam.status !== 'draft' && (
          <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-2xl px-5 py-4">
            <span className="text-amber-500 text-lg">⚠️</span>
            <div>
              <p className="text-sm font-bold text-amber-700 dark:text-amber-400">
                Examen {exam.status === 'active' ? 'activo' : 'cerrado'} — edición restringida
              </p>
              <p className="text-xs text-amber-600/80 dark:text-amber-400/70 mt-0.5">
                Solo puedes modificar el horario, título, descripción y grupo. Las preguntas no se pueden cambiar.
              </p>
            </div>
          </div>
        )}

        {/* Exam metadata form */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800/80 shadow-sm p-8 space-y-6">
          <h2 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <BookOpen className="w-5 h-5 text-indigo-500" /> Información del Examen
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Título del Examen *</label>
              <input value={title} onChange={e => setTitle(e.target.value)}
                placeholder="Ej: Parcial de Suficiencia - IELTS Mock Test"
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm outline-none focus:border-indigo-500 text-slate-800 dark:text-white transition" />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Instrucciones o Descripción</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
                placeholder="Escribe las instrucciones generales que los alumnos verán antes de comenzar..."
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm outline-none focus:border-indigo-500 text-slate-800 dark:text-white transition resize-none" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Habilidad Principal</label>
                <select value={skillType} onChange={e => setSkillType(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm outline-none focus:border-indigo-500 text-slate-800 dark:text-white font-medium">
                  <option value="complete">Completo (Habilidades Combinadas)</option>
                  <option value="listening">Comprensión Auditiva (Listening)</option>
                  <option value="speaking">Expresión Oral (Speaking)</option>
                  <option value="writing">Expresión Escrita (Writing)</option>
                  <option value="writing_listening">Escritura & Escucha</option>
                  <option value="writing_speaking">Escritura & Habla</option>
                </select>
              </div>

              <div>
                {!isEditing ? (
                  <div>
                    <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Cantidad de Preguntas a Generar</label>
                    <div className="relative">
                      <input type="number" min="1" max="50" value={questionCount} onChange={e => setQuestionCount(parseInt(e.target.value) || 10)}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm outline-none focus:border-indigo-500 text-slate-800 dark:text-white font-bold" />
                      <HelpCircle className="w-5 h-5 text-slate-400 absolute right-4 top-3" />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Puntuación Total</label>
                    <input disabled value="5.0 Puntos (Escala Fija)"
                      className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm outline-none text-slate-500 dark:text-slate-400 font-bold" />
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-slate-400" /> Grupo Destinatario (Opcional)
              </label>
              <select value={groupId} onChange={e => setGroupId(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm outline-none focus:border-indigo-500 text-slate-800 dark:text-white font-medium">
                <option value="">Todos los estudiantes de la clase (Examen Global)</option>
                {groups.map(g => (
                  <option key={g.id} value={g.id}>
                    {g.name} {g.schedule_time ? `(${g.schedule_time})` : ''}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5">
                * Si seleccionas un grupo, solo los estudiantes matriculados en él podrán ver y presentar este examen.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800/80">
              <div>
                <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Fecha de Apertura</label>
                <input type="datetime-local" value={availableFrom} onChange={e => setAvailableFrom(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs outline-none focus:border-indigo-500 text-slate-800 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1 font-sans">Fecha de Cierre</label>
                <input type="datetime-local" value={availableTo} onChange={e => setAvailableTo(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs outline-none focus:border-indigo-500 text-slate-800 dark:text-white" />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800/80">
            <button onClick={handleSaveMeta} disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-sm transition disabled:opacity-50 shadow-md shadow-indigo-100 dark:shadow-none">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isEditing
                ? (exam?.status === 'draft' ? 'Guardar y Continuar al Constructor' : 'Guardar Cambios')
                : 'Comenzar Diseño de Preguntas'}
            </button>
          </div>
        </div>

      </div>
    </Layout>
  );
};
