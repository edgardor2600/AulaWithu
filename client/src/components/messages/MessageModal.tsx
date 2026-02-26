import { useState, useEffect, useRef } from 'react';
import { X, Send, Loader2, Trash2 } from 'lucide-react';
import { messagesService, type Message } from '../../services/messagesService';
import toast from 'react-hot-toast';

interface MessageModalProps {
  recipientId: string;
  recipientName: string;
  onClose: () => void;
}

export const MessageModal = ({ recipientId, recipientName, onClose }: MessageModalProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => {
    loadMessages();
    
    // Poll for new messages every 5 seconds
    pollIntervalRef.current = setInterval(() => {
      loadMessages(true);
    }, 5000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [recipientId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      const data = await messagesService.getConversation(recipientId);
      setMessages(data);
    } catch (error) {
      if (!silent) {
        console.error('Error loading messages:', error);
        toast.error('Error al cargar mensajes');
      }
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMessage.trim()) return;

    setIsSending(true);
    try {
      await messagesService.sendMessage(recipientId, newMessage.trim());
      setNewMessage('');
      await loadMessages(true);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleDelete = async (messageId: string) => {
    if (!confirm('¿Eliminar este mensaje?')) return;

    try {
      await messagesService.deleteMessage(messageId);
      await loadMessages(true);
      toast.success('Mensaje eliminado');
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `Hace ${diffMins}min`;
    
    const diffHours = Math.floor(diffMs / 3600000);
    if (diffHours < 24) return `Hace ${diffHours}h`;

    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[60] transition-all">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl h-[600px] flex flex-col border border-slate-200 dark:border-slate-800 overflow-hidden transform transition-all">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800/60 flex items-center justify-between bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-slate-800 dark:to-slate-900">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 dark:bg-white/10 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-inner border border-white/20 dark:border-white/5">
              {recipientName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">{recipientName}</h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <p className="text-xs font-semibold text-white/80 uppercase tracking-widest">Chat Activo</p>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 hover:bg-white/20 dark:hover:bg-white/10 rounded-xl transition-all duration-300"
            title="Cerrar chat"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50 dark:bg-slate-950/50">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 dark:text-slate-400">
              <div className="w-16 h-16 mb-4 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700">
                <Send className="w-6 h-6 text-slate-300 dark:text-slate-500 opacity-50" />
              </div>
              <p className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-1">El chat está vacío</p>
              <p className="text-sm font-medium opacity-80">Envía el primer mensaje para iniciar la conversación</p>
            </div>
          ) : (
            <>
              {messages.map((message) => {
                const isSent = message.sender_id !== recipientId;

                return (
                  <div
                    key={message.id}
                    className={`flex ${isSent ? 'justify-end' : 'justify-start'} group`}
                  >
                    <div
                      className={`max-w-[75%] rounded-2xl px-5 py-3 shadow-sm ${
                        isSent
                          ? 'bg-blue-600 dark:bg-blue-600 text-white rounded-tr-sm'
                          : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-tl-sm'
                      }`}
                    >
                      <p className="text-[15px] whitespace-pre-wrap break-words leading-relaxed">{message.message}</p>
                      <div className={`flex items-center justify-between gap-3 mt-1.5 ${
                        isSent ? 'text-blue-100 dark:text-blue-200/70' : 'text-slate-500 dark:text-slate-400'
                      }`}>
                        <span className="text-[10px] font-bold tracking-wider uppercase">{formatTime(message.created_at)}</span>
                        {isSent && (
                          <button
                            onClick={() => handleDelete(message.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-black/10 dark:hover:bg-black/20 rounded-lg text-rose-100 dark:text-rose-200 hover:text-white"
                            title="Eliminar mensaje"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} className="h-1" />
            </>
          )}
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors">
          <div className="flex gap-3">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e);
                }
              }}
              placeholder="Escribe tu respuesta aquí..."
              className="flex-1 px-5 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none transition-all shadow-inner"
              rows={1}
              style={{ minHeight: '52px', maxHeight: '120px' }}
              disabled={isSending}
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || isSending}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center font-bold shadow-sm"
              title="Enviar mensaje"
            >
              {isSending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
          <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 dark:text-slate-500 mt-3 text-center">
            Presiona <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">Enter</span> para enviar • <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">Shift</span> + <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">Enter</span> nueva línea
          </p>
        </form>
      </div>
    </div>
  );
};
