import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { examsService, type Exam, type ExamQuestion } from '../services/examsService';
import { groupsService, type Group } from '../services/groupsService';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Plus, Trash2, Save, Send, Clock, CheckSquare,
  AlignLeft, ChevronUp, ChevronDown, Loader2, Eye, X, BookOpen,
  Copy, Sparkles, Music, Image as ImageIcon, Volume2, Globe, Check, AlertCircle, Edit3
} from 'lucide-react';

const SKILL_ICONS: Record<string, any> = {
  listening: Volume2,
  speaking: Sparkles,
  writing: Edit3,
  complete: Globe,
};

const SKILL_LABELS: Record<string, string> = {
  listening: 'Comprensión Auditiva (Listening)',
  speaking: 'Expresión Oral (Speaking)',
  writing: 'Expresión Escrita (Writing)',
  writing_listening: 'Escritura & Escucha',
  writing_speaking: 'Escritura & Habla',
  complete: 'Evaluación Completa (Habilidades Combinadas)',
};

export const ExamBuilderPage = () => {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();

  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingMeta, setSavingMeta] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  // Metadata form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [passingScore, setPassingScore] = useState(60);
  const [availableFrom, setAvailableFrom] = useState('');
  const [availableTo, setAvailableTo] = useState('');
  const [scaleMax, setScaleMax] = useState(5.0);
  const [skillType, setSkillType] = useState('complete');
  const [groupId, setGroupId] = useState('');
  const [groups, setGroups] = useState<Group[]>([]);

  // Active question being edited in detail / media
  const [expandedMediaId, setExpandedMediaId] = useState<string | null>(null);

  // Load Exam
  const loadExam = async () => {
    if (!examId) return;
    try {
      setLoading(true);
      const { exam: e, questions: qs } = await examsService.getExam(examId);
      setExam(e);
      setQuestions(qs);
      setTitle(e.title);
      setDescription(e.description || '');
      setDurationMinutes(e.duration_minutes);
      setPassingScore(e.passing_score);
      setAvailableFrom(e.available_from ? e.available_from.slice(0, 16) : '');
      setAvailableTo(e.available_to ? e.available_to.slice(0, 16) : '');
      setScaleMax(e.scale_max ? Number(e.scale_max) : 5.0);
      setSkillType(e.skill_type || 'complete');
      setGroupId(e.group_id || '');
    } catch {
      toast.error('Error al cargar la información del examen');
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExam();
  }, [examId]);

  useEffect(() => {
    if (exam) {
      groupsService.getClassGroups(exam.class_id).then(setGroups).catch(console.error);
    }
  }, [exam]);

  // Save Meta
  const handleSaveMeta = async () => {
    if (!exam) return;
    if (!title.trim()) { toast.error('El título es requerido'); return; }
    setSavingMeta(true);
    
    const isoAvailableFrom = availableFrom ? new Date(availableFrom).toISOString() : null;
    const isoAvailableTo = availableTo ? new Date(availableTo).toISOString() : null;

    try {
      const updated = await examsService.updateExam(exam.id, {
        groupId: groupId || null,
        title: title.trim(),
        description: description.trim() || undefined,
        durationMinutes,
        passingScore,
        scaleMax: 5.0, // scaleMax is fixed to 5.0
        skillType,
        availableFrom: isoAvailableFrom,
        availableTo: isoAvailableTo,
      });
      setExam(updated);
      toast.success('Configuración básica guardada');
    } catch (e: any) {
      toast.error(e.response?.data?.error?.message || 'Error al guardar metadatos');
    } finally {
      setSavingMeta(false);
    }
  };

  // Add Question
  const handleAddQuestion = async (type: 'multiple_choice' | 'short_answer') => {
    if (!exam) return;
    try {
      const defaultText = type === 'multiple_choice'
        ? 'Nueva pregunta de opción múltiple. Escribe el enunciado aquí.'
        : 'Nueva pregunta de respuesta corta / desarrollo. Escribe el enunciado aquí.';
      const newQ = await examsService.addQuestion(exam.id, {
        type,
        text: defaultText,
        options: type === 'multiple_choice' ? ['Opción A', 'Opción B', 'Opción C', 'Opción D'] : undefined,
        correctAnswer: type === 'multiple_choice' ? '0' : undefined,
        points: 1.0,
        skillCategory: exam.skill_type === 'complete' ? 'writing' : exam.skill_type,
      });
      setQuestions(prev => [...prev, newQ]);
      toast.success('Pregunta añadida al borrador');
    } catch (e: any) {
      toast.error('Error al agregar pregunta');
    }
  };

  // Update Question Field Inline
  const handleUpdateQuestionField = async (qId: string, fields: Partial<ExamQuestion>) => {
    if (!exam) return;
    try {
      // Optimistic update
      setQuestions(prev => prev.map(q => q.id === qId ? { ...q, ...fields } as ExamQuestion : q));
      
      const payload: any = {};
      if (fields.text !== undefined) payload.text = fields.text;
      if (fields.points !== undefined) payload.points = fields.points;
      if (fields.options !== undefined) payload.options = fields.options;
      if (fields.correct_answer !== undefined) payload.correctAnswer = fields.correct_answer;
      if (fields.skill_category !== undefined) payload.skillCategory = fields.skill_category;
      if (fields.media_url !== undefined) payload.mediaUrl = fields.media_url;

      await examsService.updateQuestion(exam.id, qId, payload);
    } catch (e: any) {
      toast.error('Error al sincronizar cambios con el servidor');
      loadExam(); // fallback
    }
  };

  // Duplicate Question
  const handleDuplicateQuestion = async (q: ExamQuestion) => {
    if (!exam) return;
    try {
      await examsService.addQuestion(exam.id, {
        type: q.type,
        text: `${q.text} (Copia)`,
        options: q.options || undefined,
        correctAnswer: q.correct_answer || undefined,
        points: q.points,
        skillCategory: q.skill_category,
        mediaUrl: q.media_url,
      });
      const { questions: qs } = await examsService.getExam(exam.id);
      setQuestions(qs);
      toast.success('Pregunta duplicada');
    } catch (e: any) {
      toast.error('Error al duplicar pregunta');
    }
  };

  const handleUpdateQuestionPoints = async (q: ExamQuestion, newPoints: number) => {
    if (!exam) return;
    if (isNaN(newPoints) || newPoints < 0.1 || newPoints > 100) return;
    try {
      await examsService.updateQuestion(exam.id, q.id, { points: newPoints });
      setQuestions(prev => prev.map(x => x.id === q.id ? { ...x, points: newPoints } : x));
    } catch (e: any) {
      toast.error('Error al actualizar los puntos');
    }
  };

  // Toggle Type
  const handleToggleQuestionType = async (q: ExamQuestion) => {
    const newType = q.type === 'multiple_choice' ? 'short_answer' : 'multiple_choice';
    const fields = {
      type: newType,
      options: newType === 'short_answer' ? null : ['Opción A', 'Opción B', 'Opción C', 'Opción D'],
      correct_answer: newType === 'short_answer' ? null : '0',
    };
    
    // Update local state first
    setQuestions(prev => prev.map(item => item.id === q.id ? { ...item, ...fields } as ExamQuestion : item));
    
    try {
      await examsService.updateQuestion(exam!.id, q.id, {
        type: newType,
        options: newType === 'short_answer' ? [] : ['Opción A', 'Opción B', 'Opción C', 'Opción D'],
        correctAnswer: newType === 'short_answer' ? null : '0',
      });
      toast.success('Tipo de pregunta modificado');
    } catch (e: any) {
      toast.error('Error al cambiar tipo');
      loadExam();
    }
  };

  // Delete Question
  const handleDeleteQuestion = async (qId: string) => {
    if (!exam) return;
    if (!confirm('¿Estás seguro de eliminar esta pregunta?')) return;
    try {
      await examsService.deleteQuestion(exam.id, qId);
      setQuestions(prev => prev.filter(x => x.id !== qId).map((x, i) => ({ ...x, question_number: i + 1 })));
      toast.success('Pregunta eliminada');
    } catch (e: any) {
      toast.error('Error al eliminar pregunta');
    }
  };

  const handlePublish = async () => {
    if (!exam) return;
    if (questions.length === 0) { toast.error('El examen debe tener al menos una pregunta antes de publicarlo'); return; }
    setPublishing(true);
    try {
      const updated = await examsService.publishExam(exam.id);
      setExam(updated);
      toast.success('✅ El examen ha sido publicado con éxito');
      navigate(`/classes/${exam.class_id}?tab=exams`, { replace: true });
    } catch (e: any) {
      toast.error(e.response?.data?.error?.message || 'Error al publicar');
    } finally {
      setPublishing(false);
    }
  };

  const totalPoints = questions.reduce((s, q) => s + q.points, 0);
  const isDraft = exam?.status === 'draft';
  const GlobalIcon = exam ? (SKILL_ICONS[exam.skill_type] || Globe) : Globe;

  if (loading || !exam) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen bg-slate-50 dark:bg-slate-950">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
            <p className="text-slate-500 font-bold text-sm">Cargando constructor de exámenes...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
        
        {/* Sticky Glassmorphic Header */}
        <header className="sticky top-0 z-40 backdrop-blur-lg bg-white/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800/80 px-6 py-4 shadow-sm">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            <div className="flex items-center gap-3">
              <button onClick={() => navigate(`/classes/${exam.class_id}?tab=exams`)}
                className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-black text-slate-900 dark:text-white truncate max-w-md">{exam.title}</h1>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${isDraft ? 'bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20' : 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'}`}>
                    {isDraft ? 'Borrador' : 'Publicado'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                  <GlobalIcon className="w-3.5 h-3.5 text-indigo-500" />
                  {SKILL_LABELS[exam.skill_type]}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button onClick={() => setPreviewMode(true)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-sm transition">
                <Eye className="w-4 h-4" /> Previsualizar
              </button>
              
              {isDraft && (
                <button onClick={handlePublish} disabled={publishing}
                  className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-sm transition shadow-md shadow-indigo-100 dark:shadow-indigo-900/30 disabled:opacity-50">
                  {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Publicar Examen
                </button>
              )}
            </div>

          </div>
        </header>

        {/* Builder Content Container */}
        <div className="max-w-7xl mx-auto px-6 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT COLUMN: Metadata & Settings Panel */}
          <aside className="lg:col-span-4 space-y-6">
            
            {/* Quick config card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm space-y-5">
              <h2 className="text-base font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                Configuración del Examen
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Título</label>
                  <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                    disabled={!isDraft}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-indigo-500 text-slate-800 dark:text-white transition disabled:opacity-60" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Descripción</label>
                  <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
                    disabled={!isDraft}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-indigo-500 text-slate-800 dark:text-white transition resize-none disabled:opacity-60" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Nota Máxima</label>
                    <input type="text" disabled value="5.0 Puntos"
                      className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-center font-black text-slate-500 dark:text-slate-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Min. Aprobación (%)</label>
                    <input type="number" min="0" max="100" value={passingScore} onChange={e => setPassingScore(parseInt(e.target.value) || 60)}
                      disabled={!isDraft}
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none text-center font-black focus:border-indigo-500 text-slate-800 dark:text-white disabled:opacity-60" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Habilidad Principal</label>
                    <select value={skillType} onChange={e => setSkillType(e.target.value)}
                      disabled={!isDraft}
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-indigo-500 text-slate-800 dark:text-white font-medium disabled:opacity-60">
                      <option value="complete">Completo (Habilidades Combinadas)</option>
                      <option value="listening">Comprensión Auditiva (Listening)</option>
                      <option value="speaking">Expresión Oral (Speaking)</option>
                      <option value="writing">Expresión Escrita (Writing)</option>
                      <option value="writing_listening">Escritura & Escucha</option>
                      <option value="writing_speaking">Escritura & Habla</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Grupo Destinatario (Opcional)</label>
                  <select value={groupId} onChange={e => setGroupId(e.target.value)}
                    disabled={!isDraft}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-indigo-500 text-slate-800 dark:text-white font-medium disabled:opacity-60">
                    <option value="">Todos los estudiantes (Global)</option>
                    {groups.map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>

                <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-3">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ventana de Disponibilidad</h3>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">Apertura</label>
                    <input type="datetime-local" value={availableFrom} onChange={e => setAvailableFrom(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:border-indigo-500 text-slate-800 dark:text-white" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">Cierre</label>
                    <input type="datetime-local" value={availableTo} onChange={e => setAvailableTo(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:border-indigo-500 text-slate-800 dark:text-white" />
                  </div>
                </div>
              </div>

              <button onClick={handleSaveMeta} disabled={savingMeta}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50">
                {savingMeta ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Guardar Configuración
              </button>
            </div>

            {/* Distribution and progress card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center justify-between">
                <span>Distribución del Examen</span>
                <span className="text-xs text-indigo-600 dark:text-indigo-400 font-black">{totalPoints} pts asignados</span>
              </h3>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                  <span>Meta de Calificación Máxima</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{scaleMax.toFixed(2)}</span>
                </div>
                <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, totalPoints > 0 ? (totalPoints / scaleMax) * 100 : 0)}%` }} />
                </div>
                <p className="text-[10px] text-slate-400">
                  * Las calificaciones de los estudiantes se ajustarán automáticamente a una nota sobre {scaleMax.toFixed(1)} en base a los puntos ganados.
                </p>
              </div>
            </div>

          </aside>

          {/* RIGHT COLUMN: Canvas - Large Question Cards */}
          <main className="lg:col-span-8 space-y-6">
            
            {/* Action Bar for Adding Questions */}
            {isDraft && (
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/20 border border-indigo-100 dark:border-indigo-500/20 rounded-3xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-black text-indigo-950 dark:text-indigo-300 text-sm">Añadir Nueva Pregunta</h3>
                  <p className="text-xs text-indigo-700/70 dark:text-indigo-400/70 mt-0.5">Diseña tus preguntas libremente o genera en base a las plantillas.</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleAddQuestion('multiple_choice')}
                    className="flex items-center gap-1.5 px-4 py-2 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-slate-800 hover:bg-slate-50 text-indigo-700 dark:text-indigo-300 rounded-xl font-bold text-xs shadow-sm transition">
                    <Plus className="w-3.5 h-3.5" /> Opción Múltiple
                  </button>
                  <button onClick={() => handleAddQuestion('short_answer')}
                    className="flex items-center gap-1.5 px-4 py-2 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-slate-800 hover:bg-slate-50 text-indigo-700 dark:text-indigo-300 rounded-xl font-bold text-xs shadow-sm transition">
                    <Plus className="w-3.5 h-3.5" /> Respuesta Corta
                  </button>
                </div>
              </div>
            )}

            {/* Questions List */}
            {questions.length === 0 ? (
              <div className="text-center py-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm">
                <Sparkles className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <h3 className="font-bold text-slate-700 dark:text-slate-300">Tu Canvas de Preguntas está Vacío</h3>
                <p className="text-sm text-slate-400 dark:text-slate-500 mt-1 max-w-sm mx-auto">Comienza agregando preguntas personalizadas o utilizando las plantillas por habilidad.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {questions.map((q, idx) => {
                  const QuestionIcon = SKILL_ICONS[q.skill_category] || AlignLeft;
                  const isMediaExpanded = expandedMediaId === q.id;

                  return (
                    <div key={q.id}
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                      
                      {/* Top banner indicator of skill */}
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-4 mb-4">
                        <div className="flex items-center gap-2">
                          <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-black text-sm flex items-center justify-center shadow-sm">
                            {idx + 1}
                          </span>
                          <span className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                            Pregunta
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {/* Skill label of the question */}
                          <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full border border-slate-200/50 dark:border-slate-700/50">
                            <QuestionIcon className="w-3.5 h-3.5 text-indigo-500" />
                            <select value={q.skill_category || 'writing'}
                              onChange={(e) => handleUpdateQuestionField(q.id, { skill_category: e.target.value })}
                              disabled={!isDraft}
                              className="bg-transparent border-none outline-none text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 pr-1">
                              <option value="listening">Listening</option>
                              <option value="speaking">Speaking</option>
                              <option value="writing">Writing</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Question Text Area (Editable inline) */}
                      <div className="space-y-4">
                        <div>
                          <textarea value={q.text}
                            onChange={(e) => handleUpdateQuestionField(q.id, { text: e.target.value })}
                            disabled={!isDraft}
                            placeholder="Escribe el enunciado de la pregunta aquí..."
                            rows={3}
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-850 rounded-2xl text-sm font-semibold text-slate-800 dark:text-white outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 transition resize-none leading-relaxed" />
                        </div>

                        {/* Audio / Media Player Preview if mediaUrl exists */}
                        {q.media_url && (
                          <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-4 border border-slate-100 dark:border-slate-850 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                              <Music className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">{q.media_url}</p>
                              <div className="mt-1.5">
                                <audio src={q.media_url} controls className="w-full max-h-8 scale-95 origin-left" />
                              </div>
                            </div>
                            {isDraft && (
                              <button onClick={() => handleUpdateQuestionField(q.id, { media_url: null })}
                                className="p-1 text-slate-400 hover:text-rose-500 transition rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        )}

                        {/* Dropdown details to add Media URL */}
                        {isDraft && (
                          <div>
                            <button onClick={() => setExpandedMediaId(isMediaExpanded ? null : q.id)}
                              className="text-xs font-bold text-slate-400 dark:text-slate-500 hover:text-indigo-600 flex items-center gap-1 transition">
                              {q.media_url ? 'Modificar Audio/Multimedia' : '+ Agregar Audio / Archivo de Apoyo'}
                            </button>
                            
                            {isMediaExpanded && (
                              <div className="mt-2 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">URL de Recurso de Audio/Media</label>
                                <div className="flex gap-2">
                                  <input type="text"
                                    placeholder="https://ejemplo.com/audio-listening.mp3"
                                    defaultValue={q.media_url || ''}
                                    onBlur={(e) => { handleUpdateQuestionField(q.id, { media_url: e.target.value.trim() || null }); setExpandedMediaId(null); }}
                                    className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none text-slate-800 dark:text-white" />
                                  <button onClick={() => setExpandedMediaId(null)}
                                    className="px-3 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold">
                                    Listo
                                  </button>
                                </div>
                                <p className="text-[10px] text-slate-400">Pega un enlace directo de audio. Los formatos recomendados son MP3 o WAV.</p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Answer Choices for Multiple Choice */}
                        {q.type === 'multiple_choice' ? (
                          <div className="space-y-2.5">
                            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                              Opciones de Respuesta (Marca la correcta)
                            </p>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {(q.options || ['']).map((opt, oi) => {
                                const isCorrect = q.correct_answer === String(oi);
                                return (
                                  <div key={oi}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-2xl border transition-all ${isCorrect ? 'bg-indigo-50/50 dark:bg-indigo-950/10 border-indigo-200 dark:border-indigo-500/30' : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200/50 dark:border-slate-800'}`}>
                                    
                                    <button onClick={() => isDraft && handleUpdateQuestionField(q.id, { correct_answer: String(oi) })}
                                      className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${isCorrect ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 dark:border-slate-650 bg-white dark:bg-slate-900 hover:border-indigo-400'}`}>
                                      {isCorrect && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                    </button>

                                    <input type="text"
                                      value={opt}
                                      disabled={!isDraft}
                                      onChange={(e) => {
                                        const newOpts = [...(q.options || [])];
                                        newOpts[oi] = e.target.value;
                                        handleUpdateQuestionField(q.id, { options: newOpts });
                                      }}
                                      className="flex-1 bg-transparent border-none text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none focus:ring-0" />
                                    
                                    {isDraft && (q.options || []).length > 2 && (
                                      <button onClick={() => {
                                        const newOpts = (q.options || []).filter((_, i) => i !== oi);
                                        const newCorrect = q.correct_answer === String(oi) ? '0' : q.correct_answer;
                                        handleUpdateQuestionField(q.id, { options: newOpts, correct_answer: newCorrect });
                                      }}
                                        className="text-slate-400 hover:text-rose-500 transition opacity-0 group-hover:opacity-100 p-1">
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                              
                              {isDraft && (q.options || []).length < 6 && (
                                <button onClick={() => {
                                  const newOpts = [...(q.options || []), `Nueva Opción ${(q.options || []).length + 1}`];
                                  handleUpdateQuestionField(q.id, { options: newOpts });
                                }}
                                  className="flex items-center justify-center gap-1 py-2 border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-indigo-400 rounded-2xl text-xs font-bold text-indigo-600 dark:text-indigo-400 transition">
                                  <Plus className="w-3.5 h-3.5" /> Agregar Opción
                                </button>
                              )}
                            </div>
                          </div>
                        ) : (
                          // Short Answer Info
                          <div className="bg-slate-50 dark:bg-slate-800/30 rounded-2xl p-4 border border-slate-100 dark:border-slate-850 flex items-center gap-3">
                            <AlertCircle className="w-5 h-5 text-indigo-500 flex-none" />
                            <div>
                              <p className="text-xs font-bold text-slate-700 dark:text-slate-350">Tipo: Respuesta Corta / Desarrollo Oral o Escrito</p>
                              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">El estudiante responderá mediante un cuadro de texto amplio o envío de audio.</p>
                            </div>
                          </div>
                        )}

                      </div>

                      {/* Card Footer Actions */}
                      <div className="flex flex-wrap items-center justify-between border-t border-slate-100 dark:border-slate-800/60 pt-4 mt-5 gap-3">
                        
                        <div className="flex items-center gap-3">
                          {isDraft ? (
                            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-3 py-1 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Valor:</span>
                              <input type="number" min="0.1" max="100" step="0.1"
                                value={q.points}
                                onChange={(e) => handleUpdateQuestionPoints(q, parseFloat(e.target.value))}
                                className="w-10 h-6 text-xs font-black text-center bg-transparent border-none outline-none focus:ring-0 text-slate-800 dark:text-white" />
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">pts</span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 font-bold">{q.points} {q.points === 1 ? 'pt' : 'pts'}</span>
                          )}
                        </div>

                        {isDraft && (
                          <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800/40 p-1 rounded-xl">
                            <button onClick={() => handleToggleQuestionType(q)}
                              title="Alternar Tipo (Opción Múltiple / Desarrollo)"
                              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition">
                              <AlignLeft className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDuplicateQuestion(q)}
                              title="Duplicar pregunta"
                              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition">
                              <Copy className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDeleteQuestion(q.id)}
                              title="Eliminar pregunta"
                              className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}

                      </div>

                    </div>
                  );
                })}
              </div>
            )}

          </main>

        </div>

      </div>

      {/* STUDENT HIGH FIDELITY PREVIEW MODAL */}
      {previewMode && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-black text-slate-950 dark:text-white">Vista Previa del Estudiante</h3>
                <p className="text-xs text-slate-400">Simulación del examen tal como se presentará en la interfaz del alumno.</p>
              </div>
              <button onClick={() => setPreviewMode(false)}
                className="p-2 bg-slate-200 hover:bg-slate-350 dark:bg-slate-700 dark:hover:bg-slate-650 rounded-xl transition text-slate-500 dark:text-slate-300">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-8 space-y-6">
              
              <div className="bg-indigo-50/50 dark:bg-indigo-950/10 border border-indigo-100 dark:border-indigo-500/20 rounded-2xl p-4 flex items-center justify-between text-xs text-indigo-900 dark:text-indigo-300">
                <span className="font-bold">⏱ Tiempo restante simulado: 1h 30m</span>
                <span className="font-bold">Calificación Máxima: {scaleMax.toFixed(1)} pts</span>
              </div>

              <div className="space-y-8">
                {questions.map((q, idx) => {
                  const CategoryIcon = SKILL_ICONS[q.skill_category] || AlignLeft;
                  return (
                    <div key={q.id} className="border-b border-slate-100 dark:border-slate-800/60 pb-8 last:border-b-0 space-y-4">
                      
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-xs font-black flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <span className="text-xs font-black uppercase text-slate-400 flex items-center gap-1">
                          <CategoryIcon className="w-3.5 h-3.5 text-indigo-500" />
                          {q.skill_category || 'General'} · {q.points} pt{q.points !== 1 ? 's' : ''}
                        </span>
                      </div>

                      <p className="text-slate-800 dark:text-slate-200 font-semibold text-sm leading-relaxed whitespace-pre-wrap">{q.text}</p>

                      {/* Audio widget if mediaUrl exists */}
                      {q.media_url && (
                        <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-3 border border-slate-100 dark:border-slate-800 flex items-center gap-3 max-w-lg">
                          <Music className="w-4 h-4 text-indigo-500 flex-none" />
                          <audio src={q.media_url} controls className="w-full h-8 scale-95" />
                        </div>
                      )}

                      {/* Options */}
                      {q.type === 'multiple_choice' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-w-2xl">
                          {(q.options || []).map((opt, oi) => (
                            <label key={oi} className="flex items-center gap-3 px-4 py-3 bg-slate-50 hover:bg-indigo-50/30 dark:bg-slate-800/50 dark:hover:bg-indigo-950/10 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-350 cursor-pointer transition">
                              <input type="radio" name={`preview-q-${q.id}`} className="w-4 h-4 text-indigo-600" />
                              <span>{String.fromCharCode(65 + oi)}. {opt}</span>
                            </label>
                          ))}
                        </div>
                      ) : (
                        <textarea placeholder="Escribe tu respuesta aquí..." rows={3}
                          className="w-full max-w-2xl px-4 py-3 bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white outline-none focus:border-indigo-500" />
                      )}

                    </div>
                  );
                })}
              </div>

            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button onClick={() => setPreviewMode(false)}
                className="px-5 py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs transition">
                Cerrar Vista Previa
              </button>
            </div>

          </div>
        </div>
      )}

    </Layout>
  );
};
