import React, { useState } from 'react';
import {
  MessageSquare,
  Sparkles,
  Bot,
  Play,
  BookOpen,
  FolderOpen,
  Plus,
  Trash2,
  SkipBack,
  Music,
  Volume2,
  SkipForward,
  Subtitles,
  Image,
  Upload,
  Copy
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { UseConversationReturn } from '../hooks/useConversation';

interface ConversationPanelProps {
  conversation: UseConversationReturn;
}

export const ConversationPanel: React.FC<ConversationPanelProps> = ({ conversation }) => {
  const [conversationTab, setConversationTab] = useState<'editor' | 'voices' | 'player' | 'extra' | 'library'>('editor');
  const [activeExtraSubTab, setActiveExtraSubTab] = useState<string>('all');

  if (!conversation.showConversationPanel) return null;

  return (
    <div className="fixed top-20 right-6 z-40 w-96 bg-[#1e2128]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] flex flex-col max-h-[78vh] transition-all duration-300">
      
      {/* Cabecera del Panel */}
      <div className="px-4 py-3 border-b border-white/8 flex items-center justify-between bg-white/5 rounded-t-2xl">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-violet-400 animate-pulse" />
          <span className="font-semibold text-white text-sm">Diálogos y Conversación IA</span>
        </div>
        <button 
          onClick={() => conversation.setShowConversationPanel(false)}
          className="text-slate-400 hover:text-white text-lg font-bold p-1 leading-none transition-colors"
        >
          ×
        </button>
      </div>

      {/* Menú de Pestañas Compacto */}
      <div className="px-2 py-1.5 border-b border-white/8 bg-black/10 flex items-center justify-around gap-1">
        <button
          onClick={() => setConversationTab('editor')}
          className={`flex-1 py-1.5 px-1 rounded-lg text-center transition-all flex flex-col items-center gap-0.5 ${
            conversationTab === 'editor'
              ? 'bg-violet-600/30 border border-violet-500/40 text-violet-200'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
          title="Editor y Generador IA"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span className="text-[9px]">Editor/IA</span>
        </button>
        <button
          onClick={() => setConversationTab('voices')}
          className={`flex-1 py-1.5 px-1 rounded-lg text-center transition-all flex flex-col items-center gap-0.5 ${
            conversationTab === 'voices'
              ? 'bg-violet-600/30 border border-violet-500/40 text-violet-200'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
          title="Asignar Voces"
        >
          <Bot className="w-3.5 h-3.5" />
          <span className="text-[9px]">Voces</span>
        </button>
        <button
          onClick={() => setConversationTab('player')}
          className={`flex-1 py-1.5 px-1 rounded-lg text-center transition-all flex flex-col items-center gap-0.5 ${
            conversationTab === 'player'
              ? 'bg-violet-600/30 border border-violet-500/40 text-violet-200'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
          title="Reproductor de Diálogos"
          disabled={conversation.clips.length === 0}
          style={{ opacity: conversation.clips.length === 0 ? 0.4 : 1 }}
        >
          <Play className="w-3.5 h-3.5" />
          <span className="text-[9px]">Reproductor</span>
        </button>
        <button
          onClick={() => setConversationTab('extra')}
          className={`flex-1 py-1.5 px-1 rounded-lg text-center transition-all flex flex-col items-center gap-0.5 ${
            conversationTab === 'extra'
              ? 'bg-violet-600/30 border border-violet-500/40 text-violet-200'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
          title="Material Complementario"
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span className="text-[9px]">Material</span>
        </button>
        <button
          onClick={() => {
            setConversationTab('library');
            conversation.loadStoriesFromLibrary();
          }}
          className={`flex-1 py-1.5 px-1 rounded-lg text-center transition-all flex flex-col items-center gap-0.5 ${
            conversationTab === 'library'
              ? 'bg-violet-600/30 border border-violet-500/40 text-violet-200'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
          title="Biblioteca de Historias"
        >
          <FolderOpen className="w-3.5 h-3.5" />
          <span className="text-[9px]">Biblioteca</span>
        </button>
      </div>

      {/* Contenido Dinámico de Pestañas con Scroll */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar text-xs text-slate-300">
        
        {/* PESTAÑA 1: EDITOR / GENERADOR */}
        {conversationTab === 'editor' && (
          <div className="space-y-4">
            {/* Parámetros Básicos */}
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <label className="block text-[10px] font-semibold text-slate-400 mb-1">Título de la historia:</label>
                <input
                  type="text"
                  className="w-full p-2 border border-white/10 rounded-lg text-xs text-slate-200 bg-white/5 focus:ring-1 focus:ring-violet-500"
                  placeholder="Ej. En la Cafetería"
                  value={conversation.title}
                  onChange={(e) => conversation.setTitle(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 mb-1">Nivel:</label>
                <select
                  className="w-full p-2 border border-white/10 rounded-lg text-xs text-slate-200 bg-white/5 focus:ring-1 focus:ring-violet-500"
                  value={conversation.level}
                  onChange={(e) => conversation.setLevel(e.target.value)}
                >
                  <option value="A1">A1 (Básico)</option>
                  <option value="A2">A2 (Elemental)</option>
                  <option value="B1">B1 (Intermedio)</option>
                  <option value="B2">B2 (Avanzado)</option>
                  <option value="C1">C1 (Experto)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-400 mb-1">Temas Pedagógicos / Gramática:</label>
              <input
                type="text"
                className="w-full p-2 border border-white/10 rounded-lg text-xs text-slate-200 bg-white/5 focus:ring-1 focus:ring-violet-500"
                placeholder="Ej. Phrasal verbs, Present Perfect, etc."
                value={conversation.topics}
                onChange={(e) => conversation.setTopics(e.target.value)}
              />
            </div>

            {/* Acordeón del Generador IA */}
            <div className="border border-white/10 rounded-xl p-3 bg-white/5 space-y-3">
              <div className="flex items-center gap-1.5 text-violet-300 font-bold border-b border-white/8 pb-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Generador de diálogos por IA</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[9px] text-slate-400 mb-0.5">Personajes (Cantidad):</label>
                  <select
                    className="w-full p-1.5 border border-white/10 rounded-lg text-slate-200 text-xs bg-[#1e2128] focus:ring-1 focus:ring-violet-500"
                    value={conversation.numChars}
                    onChange={(e) => conversation.setNumChars(Number(e.target.value))}
                  >
                    <option value={2}>2 personajes</option>
                    <option value={3}>3 personajes</option>
                    <option value={4}>4 personajes</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] text-slate-400 mb-0.5">Nombres (Opcional):</label>
                  <input
                    type="text"
                    className="w-full p-1.5 border border-white/10 rounded-lg text-xs text-slate-200 bg-[#1e2128] focus:ring-1 focus:ring-violet-500"
                    placeholder="Ej. Jhon, Mary"
                    value={conversation.charNames}
                    onChange={(e) => conversation.setCharNames(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] text-slate-400 mb-1">Trama o contexto (Plot):</label>
                <textarea
                  className="w-full h-14 p-1.5 border border-white/10 rounded-lg text-xs text-slate-200 bg-[#1e2128] focus:ring-1 focus:ring-violet-500 resize-none"
                  placeholder="Ej. Dos personas reservando un hotel..."
                  value={conversation.plot}
                  onChange={(e) => conversation.setPlot(e.target.value)}
                />
              </div>

              <button
                onClick={conversation.generateDialogueText}
                disabled={conversation.isLoading}
                className="w-full py-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-lg font-semibold shadow-lg shadow-violet-900/40 transition disabled:opacity-40"
              >
                {conversation.isLoading && conversation.statusText.includes('Generando') ? 'Generando...' : 'Generar Diálogo'}
              </button>
            </div>

            {/* Caja de Texto Diálogo */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[10px] font-semibold text-slate-400">Texto del Diálogo:</label>
                <span className="text-[9px] text-slate-500">{conversation.dialogueText.length} caracteres</span>
              </div>
              <textarea
                className="w-full h-32 p-2 border border-white/10 rounded-lg text-xs text-slate-100 bg-white/5 focus:ring-1 focus:ring-violet-500 resize-none font-mono"
                placeholder="Pega tu diálogo aquí... Formato:&#10;Alice: Hello.&#10;Bob: Hi. [1.5s]"
                value={conversation.dialogueText}
                onChange={(e) => {
                  conversation.setDialogueText(e.target.value);
                }}
              />
            </div>

            {/* API Key Acordeón Config */}
            <div className="border border-white/10 rounded-xl p-2.5 bg-white/5 space-y-2">
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold border-b border-white/5 pb-1">
                <span>Configuración de IA (Análisis y Generación)</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-1">
                  <label className="block text-[8px] text-slate-400 mb-0.5">Proveedor:</label>
                  <select
                    className="w-full p-1 border border-white/10 rounded-lg text-slate-200 text-[10px] bg-[#1e2128]"
                    value={conversation.aiProvider}
                    onChange={(e) => conversation.setAiProvider(e.target.value)}
                  >
                    <option value="gemini">Gemini</option>
                    <option value="openai">OpenAI</option>
                    <option value="groq">Groq</option>
                    <option value="nvidia">Nvidia</option>
                    <option value="minimax">MiniMax</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-[8px] text-slate-400 mb-0.5">API Key (Local):</label>
                  <input
                    type="password"
                    className="w-full p-1 border border-white/10 rounded-lg text-[10px] text-slate-200 bg-[#1e2128]"
                    placeholder="API Key"
                    value={conversation.aiApiKey}
                    onChange={(e) => conversation.setAiApiKey(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="block text-[8px] text-slate-400 mb-0.5">Modelo (Opcional):</label>
                <input
                  type="text"
                  className="w-full p-1 border border-white/10 rounded-lg text-[10px] text-slate-200 bg-[#1e2128]"
                  placeholder="Ej. gemini-2.5-flash"
                  value={conversation.aiModel}
                  onChange={(e) => conversation.setAiModel(e.target.value)}
                />
              </div>
            </div>

            {/* ✅ NUEVO: Configuración y Generación de Imagen */}
            <div className="border border-white/10 rounded-xl p-2.5 bg-white/5 space-y-2">
              <div className="flex items-center gap-1 text-[10px] text-violet-300 font-semibold border-b border-white/5 pb-1">
                <Image className="w-3.5 h-3.5" />
                <span>Imagen Ilustrativa del Diálogo</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[8px] text-slate-400 mb-0.5">Proveedor de Imagen:</label>
                  <select
                    className="w-full p-1 border border-white/10 rounded-lg text-[10px] text-slate-200 bg-[#1e2128]"
                    value={conversation.imageProvider}
                    onChange={(e) => conversation.setImageProvider(e.target.value as any)}
                  >
                    <option value="gemini">Gemini (Google)</option>
                    <option value="minimax">MiniMax (Premium)</option>
                    <option value="pollinations">Pollinations.ai (Gratis)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[8px] text-slate-400 mb-0.5">Estilo de Imagen:</label>
                  <select
                    className="w-full p-1 border border-white/10 rounded-lg text-[10px] text-slate-200 bg-[#1e2128]"
                    value={conversation.imageStyle}
                    onChange={(e) => conversation.setImageStyle(e.target.value)}
                  >
                    <option value="photorealistic">Fotorrealista</option>
                    <option value="cartoon">Animación / Caricatura</option>
                    <option value="anime">Anime / Manga</option>
                    <option value="watercolor">Acuarela</option>
                    <option value="oil-painting">Pintura al Óleo</option>
                    <option value="3d-render">Render 3D</option>
                    <option value="sketch">Dibujo a Lápiz</option>
                    <option value="comic">Cómic Retro</option>
                    <option value="cyberpunk">Cyberpunk</option>
                    <option value="fantasy">Fantasía Mágica</option>
                  </select>
                </div>
              </div>

              {conversation.imageProvider !== 'pollinations' && (
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="block text-[8px] text-slate-400 mb-0.5">API Key Imagen:</label>
                    <input
                      type="password"
                      className="w-full p-1 border border-white/10 rounded-lg text-[10px] text-slate-200 bg-[#1e2128]"
                      placeholder="API Key de Imagen"
                      value={conversation.imageApiKey}
                      onChange={(e) => conversation.setImageApiKey(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[8px] text-slate-400 mb-0.5">Modelo:</label>
                    <input
                      type="text"
                      className="w-full p-1 border border-white/10 rounded-lg text-[10px] text-slate-200 bg-[#1e2128]"
                      placeholder="Modelo"
                      value={conversation.imageModel}
                      onChange={(e) => conversation.setImageModel(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Previsualización de Imagen Generada */}
              {conversation.imageUrl && (
                <div className="relative group border border-white/10 rounded-lg overflow-hidden bg-black/40 mt-1 max-h-36 flex items-center justify-center">
                  <img
                    src={conversation.imageUrl}
                    alt="Ilustración generada"
                    className="object-contain max-h-36 w-full"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      onClick={() => conversation.addImageToBoard(conversation.imageUrl)}
                      className="px-2 py-1 bg-violet-600 hover:bg-violet-500 text-white rounded text-[10px] font-bold"
                    >
                      Insertar
                    </button>
                    <button
                      onClick={conversation.removeConversationImage}
                      className="p-1 bg-red-600 hover:bg-red-500 text-white rounded"
                      title="Quitar imagen"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 mt-1">
                <button
                  onClick={conversation.generateConversationImage}
                  disabled={conversation.isLoading || !conversation.dialogueText.trim()}
                  className="py-1.5 px-2 bg-violet-600/30 border border-violet-500/40 hover:bg-violet-600/50 text-violet-200 rounded-lg text-[10px] font-bold transition disabled:opacity-40 flex items-center justify-center gap-1"
                >
                  <Sparkles className="w-3 h-3 text-violet-400" />
                  Generar Imagen
                </button>

                <label className="py-1.5 px-2 bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 rounded-lg text-[10px] font-bold transition flex items-center justify-center gap-1 cursor-pointer select-none">
                  <Upload className="w-3 h-3 text-slate-400" />
                  Subir Imagen
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) conversation.uploadConversationImage(file);
                    }}
                  />
                </label>
              </div>
            </div>

            {/* Botón de Analizar */}
            <button
              onClick={conversation.analyzeDialogue}
              disabled={!conversation.dialogueText.trim() || conversation.isLoading}
              className="w-full py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg font-bold shadow-lg shadow-violet-900/50 transition disabled:opacity-40 text-xs"
            >
              {conversation.isLoading && conversation.statusText.includes('Analizando') ? 'Analizando...' : 'Analizar Diálogo y Cargar Voces'}
            </button>
          </div>
        )}

        {/* PESTAÑA 2: ASIGNACIÓN DE VOCES */}
        {conversationTab === 'voices' && (
          <div className="space-y-4">
            <span className="font-bold text-slate-200 block border-b border-white/8 pb-1 mb-2">Configuración de Reproducción</span>
            
            {/* Audio Mode Selector */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <button
                onClick={() => conversation.setAudioMode('browser')}
                className={`py-1 rounded border text-center transition font-semibold text-[11px] ${
                  conversation.audioMode === 'browser'
                    ? 'bg-violet-600 border-violet-500 text-white'
                    : 'border-white/10 hover:bg-white/10 text-slate-400'
                }`}
              >
                Voces del Navegador
              </button>
              <button
                onClick={() => conversation.setAudioMode('server')}
                className={`py-1 rounded border text-center transition font-semibold text-[11px] ${
                  conversation.audioMode === 'server'
                    ? 'bg-violet-600 border-violet-500 text-white'
                    : 'border-white/10 hover:bg-white/10 text-slate-400'
                }`}
              >
                Voces del Servidor
              </button>
            </div>

            {/* Speakers Voice List */}
            <div className="space-y-3">
              {Object.keys(conversation.speakers).length === 0 ? (
                <div className="text-center py-6 text-slate-500 italic">
                  No se han detectado personajes. Ve a la pestaña Editor y haz clic en "Analizar Diálogo".
                </div>
              ) : (
                Object.entries(conversation.speakers).map(([name, conf]) => (
                  <div key={name} className="p-3 border border-white/8 bg-white/5 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-violet-300 text-xs">{name}</span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-semibold ${
                        conf.gender === 'Male' ? 'bg-blue-900/30 text-blue-300' : 'bg-pink-900/30 text-pink-300'
                      }`}>
                        {conf.gender === 'Male' ? 'Masculino' : 'Femenino'}
                      </span>
                    </div>

                    <div>
                      <label className="block text-[9px] text-slate-400 mb-0.5">Voz asignada:</label>
                      {conversation.audioMode === 'browser' ? (
                        <select
                          className="w-full p-1.5 border border-white/10 rounded-lg text-slate-200 text-xs bg-[#1e2128] focus:ring-1 focus:ring-violet-500"
                          value={conf.voice}
                          onChange={(e) => conversation.updateSpeakerVoice(name, e.target.value)}
                        >
                          {conversation.browserVoices.map((v, idx) => (
                            <option key={`${v.voiceURI}-${idx}`} value={v.voiceURI}>
                              {v.name} ({v.lang})
                            </option>
                          ))}
                        </select>
                      ) : (
                        <select
                          className="w-full p-1.5 border border-white/10 rounded-lg text-slate-200 text-xs bg-[#1e2128] focus:ring-1 focus:ring-violet-500"
                          value={conf.voice}
                          onChange={(e) => conversation.updateSpeakerVoice(name, e.target.value)}
                        >
                          {conversation.edgeVoices
                            .filter(v => conf.gender === 'Male' ? v.gender === 'Male' : v.gender === 'Female')
                            .map((v, idx) => (
                              <option key={`${v.shortName || idx}`} value={v.shortName}>
                                {v.friendlyName || v.shortName}
                              </option>
                            ))
                          }
                          {/* Fallback to all voices if gender filter returns empty */}
                          {conversation.edgeVoices.length > 0 && 
                           conversation.edgeVoices.filter(v => conf.gender === 'Male' ? v.gender === 'Male' : v.gender === 'Female').length === 0 &&
                           conversation.edgeVoices.map((v, idx) => (
                             <option key={`${v.shortName || idx}`} value={v.shortName}>
                               {v.friendlyName || v.shortName}
                             </option>
                           ))
                          }
                        </select>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* PESTAÑA 3: REPRODUCTOR */}
        {conversationTab === 'player' && (
          <div className="space-y-4">
            
            {/* Subtítulos activos */}
            {conversation.currentClipIndex !== -1 && conversation.currentClipIndex < conversation.clips.length && (
              <div className="bg-violet-900/10 border border-violet-500/30 rounded-xl p-3 text-center space-y-1">
                <span className="text-[10px] text-violet-400 font-bold uppercase tracking-wider block">
                  {conversation.clips[conversation.currentClipIndex].speaker} está hablando:
                </span>
                <p className="text-sm font-semibold text-white leading-snug">
                  "{conversation.clips[conversation.currentClipIndex].text}"
                </p>
              </div>
            )}

            {/* Listado de frases (Burbujas de chat compactas) */}
            <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar pr-1">
              {conversation.clips.map((clip, idx) => {
                const isActive = idx === conversation.currentClipIndex;
                
                return (
                  <div
                    key={idx}
                    onClick={() => conversation.playClip(idx)}
                    className={`cursor-pointer rounded-xl px-3 py-2 border transition-all select-none ${
                      isActive
                        ? 'bg-violet-600/20 border-violet-500/60 shadow-md shadow-violet-950/20'
                        : 'bg-white/5 border-white/10 hover:border-violet-500/30 hover:bg-violet-600/5'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1 text-[9px]">
                      <span className={`font-bold ${
                        isActive ? 'text-violet-300' : 'text-slate-400'
                      }`}>
                        {clip.speaker}
                      </span>
                      {(clip.delayBefore > 0 || clip.delayAfter > 0) && (
                        <span className="text-slate-500 font-mono">
                          {clip.delayBefore > 0 ? `[+${clip.delayBefore}s]` : ''}
                          {clip.delayAfter > 0 ? `[-${clip.delayAfter}s]` : ''}
                        </span>
                      )}
                    </div>
                    <p className={`text-[11px] leading-snug ${
                      isActive ? 'text-white font-medium' : 'text-slate-200'
                    }`}>
                      {clip.text}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Acciones para insertar en la pizarra */}
            <button
              onClick={conversation.insertDialogueToBoard}
              className="w-full py-1.5 bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 rounded-lg text-[10px] font-semibold flex items-center justify-center gap-1.5 transition"
            >
              <Plus className="w-3.5 h-3.5 text-violet-400" />
              Insertar Diálogo Completo en la Pizarra
            </button>
          </div>
        )}

        {/* PESTAÑA 4: MATERIAL COMPLEMENTARIO */}
        {conversationTab === 'extra' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-white/8 pb-1 mb-2">
              <span className="font-bold text-slate-200">Material de Apoyo</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(conversation.supplementaryText);
                  toast.success('Material complementario copiado');
                }}
                className="text-[10px] text-violet-400 hover:text-violet-300 font-semibold"
              >
                Copiar Todo
              </button>
            </div>

            {!conversation.supplementaryText.trim() ? (
              <div className="text-center py-8 text-slate-500 italic">
                No hay material complementario generado. Pega un texto completo con secciones al final y haz clic en "Analizar".
              </div>
            ) : (() => {
              const groups = conversation.getSupplementaryGroups();
              return (
                <div className="space-y-3">
                  {/* Selector horizontal de sub-secciones */}
                  {groups.length > 0 && (
                    <div className="flex items-center gap-1 overflow-x-auto pb-1.5 custom-scrollbar pr-1">
                      <button
                        onClick={() => setActiveExtraSubTab('all')}
                        className={`px-2.5 py-1 rounded-full text-[9px] font-semibold whitespace-nowrap border transition-all ${
                          activeExtraSubTab === 'all'
                            ? 'bg-violet-600/35 border-violet-500 text-violet-200'
                            : 'bg-white/5 border-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/10'
                        }`}
                      >
                        Ver Todo
                      </button>
                      {groups.map((g) => (
                        <button
                          key={g.key}
                          onClick={() => setActiveExtraSubTab(g.key)}
                          className={`px-2.5 py-1 rounded-full text-[9px] font-semibold whitespace-nowrap border transition-all ${
                            activeExtraSubTab === g.key
                              ? 'bg-violet-600/35 border-violet-500 text-violet-200'
                              : 'bg-white/5 border-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/10'
                          }`}
                        >
                          {g.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Contenido según sub-tab */}
                  {activeExtraSubTab === 'all' || !groups.find(g => g.key === activeExtraSubTab) ? (
                    <div className="space-y-3">
                      <div className="p-3 border border-white/8 bg-black/20 rounded-xl max-h-60 overflow-y-auto custom-scrollbar font-mono text-[10.5px] leading-relaxed text-slate-300 whitespace-pre-wrap">
                        {conversation.supplementaryText}
                      </div>
                      <button
                        onClick={() => conversation.insertTextToCanvas(conversation.supplementaryText)}
                        className="w-full py-1.5 bg-violet-600/20 border border-violet-500/30 hover:bg-violet-600/30 text-violet-200 rounded-lg font-bold transition text-xs flex items-center justify-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5 text-violet-400" />
                        Insertar Todo en la Pizarra
                      </button>
                    </div>
                  ) : (() => {
                    const group = groups.find(g => g.key === activeExtraSubTab)!;
                    return (
                      <div className="space-y-3">
                        <div className="p-3 border border-white/8 bg-black/20 rounded-xl max-h-60 overflow-y-auto custom-scrollbar font-mono text-[10.5px] leading-relaxed text-slate-300 whitespace-pre-wrap">
                          {group.content}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(group.content);
                              toast.success(`Sección "${group.label}" copiada`);
                            }}
                            className="py-1.5 bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 rounded-lg font-semibold text-xs flex items-center justify-center gap-1 transition"
                          >
                            <Copy className="w-3.5 h-3.5 text-slate-400" />
                            Copiar
                          </button>
                          <button
                            onClick={() => conversation.insertTextToCanvas(group.content)}
                            className="py-1.5 bg-violet-600/20 border border-violet-500/30 hover:bg-violet-600/30 text-violet-200 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition"
                          >
                            <Plus className="w-3.5 h-3.5 text-violet-400" />
                            Insertar
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              );
            })()}
          </div>
        )}

        {/* PESTAÑA 5: BIBLIOTECA */}
        {conversationTab === 'library' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/8 pb-1 mb-2">
              <span className="font-bold text-slate-200">Biblioteca de Diálogos</span>
              <button
                onClick={conversation.saveStoryToLibrary}
                disabled={!conversation.dialogueText.trim()}
                className="py-1 px-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-[10px] font-bold rounded-lg transition"
              >
                Guardar Actual
              </button>
            </div>

            {conversation.isLoadingLibrary ? (
              <div className="text-center py-6 text-slate-500 italic">Cargando biblioteca...</div>
            ) : conversation.stories.length === 0 ? (
              <div className="text-center py-8 text-slate-500 italic">No hay historias guardadas en la biblioteca local.</div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar pr-1">
                {conversation.stories.map((story) => (
                  <div
                    key={story.id}
                    className={`p-3 border rounded-xl flex items-start justify-between gap-2 transition ${
                      conversation.currentStoryId === story.id
                        ? 'bg-violet-600/10 border-violet-500/50'
                        : 'bg-white/5 border-white/10 hover:border-violet-500/30'
                    }`}
                  >
                    <div 
                      className="flex-1 cursor-pointer"
                      onClick={() => conversation.loadStory(story)}
                    >
                      <h4 className="font-bold text-slate-200 text-xs leading-snug">{story.title}</h4>
                      <div className="flex items-center gap-2 mt-1 text-[9px] text-slate-400">
                        <span className="px-1.5 py-0.2 bg-white/5 rounded text-violet-300 font-semibold">{story.level}</span>
                        <span className="truncate max-w-[150px]">{story.topics}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        if (window.confirm(`¿Estás seguro de eliminar "${story.title}"?`)) {
                          conversation.deleteStory(story.id);
                        }
                      }}
                      className="text-slate-500 hover:text-red-400 p-1 transition"
                      title="Eliminar Historia"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Acciones Globales */}
            <div className="pt-2 border-t border-white/8 flex items-center justify-between">
              <button
                onClick={conversation.clearAll}
                className="text-slate-400 hover:text-white text-[10px] font-semibold"
              >
                Limpiar Todo
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Estado del Sistema */}
      <div className="bg-black/30 border-t border-white/8 px-4 py-2 flex items-center justify-between text-[9px] text-slate-400 font-mono">
        <span>Estado: {conversation.statusText}</span>
        {conversation.clips.length > 0 && (
          <span>{conversation.clips.length} líneas</span>
        )}
      </div>

      {/* Panel de control de reproducción global */}
      {conversationTab === 'player' && conversation.clips.length > 0 && (
        <div className="p-3 border-t border-white/8 bg-black/20 rounded-b-2xl space-y-2">
          <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
            <span>
              {conversation.currentClipIndex === -1 
                ? 'Listo para iniciar' 
                : `Línea ${conversation.currentClipIndex + 1} de ${conversation.clips.length}`}
            </span>
            <span className="font-bold text-violet-400">
              {conversation.audioMode === 'server' ? 'Edge Voice (Servidor)' : 'Local Speech'}
            </span>
          </div>
          
          {/* Botones de reproducción */}
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => {
                const prevIdx = Math.max(0, conversation.currentClipIndex - 1);
                conversation.playClip(prevIdx);
              }}
              disabled={conversation.currentClipIndex <= 0}
              className="p-2 bg-white/8 border border-white/10 hover:bg-white/15 rounded-lg transition text-slate-300 disabled:opacity-40"
              title="Línea Anterior"
            >
              <SkipBack className="w-3.5 h-3.5" />
            </button>

            {/* Play Continuous (Diálogo corrido) */}
            <button
              onClick={conversation.startContinuousPlay}
              className={`p-2 bg-violet-600/30 border border-violet-500/40 hover:bg-violet-600/50 rounded-lg transition text-violet-200 flex items-center gap-1 text-[10px] font-bold`}
              title="Reproducir Diálogo Corrido"
            >
              <Music className="w-3.5 h-3.5" />
              Corrido
            </button>

            <button
              onClick={() => conversation.stopAudio(false)}
              className="p-2 bg-white/8 border border-white/10 hover:bg-red-900/20 rounded-lg transition text-red-400"
              title="Detener Reproducción"
            >
              <Volume2 className="w-3.5 h-3.5 text-red-600" />
            </button>

            <button
              onClick={() => {
                const nextIdx = Math.min(conversation.clips.length - 1, conversation.currentClipIndex + 1);
                conversation.playClip(nextIdx);
              }}
              disabled={conversation.currentClipIndex >= conversation.clips.length - 1}
              className="p-2 bg-white/8 border border-white/10 hover:bg-white/15 rounded-lg transition text-slate-300 disabled:opacity-40"
              title="Línea Siguiente"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>

            {/* Toggle Subtítulos Flotantes */}
            <button
              onClick={() => conversation.setShowSubtitles(!conversation.showSubtitles)}
              className={`p-2 border rounded-lg transition ${
                conversation.showSubtitles
                  ? 'bg-violet-600 border-violet-500 text-white'
                  : 'bg-white/8 border-white/10 hover:bg-white/15 text-slate-300'
              }`}
              title={conversation.showSubtitles ? "Desactivar Subtítulos Flotantes" : "Activar Subtítulos Flotantes"}
            >
              <Subtitles className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
