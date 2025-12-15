import { X, Copy, Users, CheckCircle } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { ParticipantsList } from './ParticipantsList';

interface LiveSessionModalProps {
  sessionCode: string;
  participants: number;
  participantsList?: Array<{ clientId: number; name: string; color: string }>;
  currentClientId?: number;
  allowStudentDraw: boolean;
  onTogglePermissions: (allow: boolean) => void;
  onEndSession: () => void;
  onClose: () => void;
}

export const LiveSessionModal = ({
  sessionCode,
  participants,
  participantsList = [],
  currentClientId,
  allowStudentDraw,
  onTogglePermissions,
  onEndSession,
  onClose,
}: LiveSessionModalProps) => {
  const [copied, setCopied] = useState(false);

  const copyCode = () => {
    navigator.clipboard.writeText(sessionCode);
    setCopied(true);
    toast.success('Code copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6 text-white flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
              <h2 className="text-2xl font-bold">Live Session Active</h2>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-6">
              {/* Session Code */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Session Code
                </label>
                <div className="flex items-center space-x-2">
                  <div className="flex-1 bg-gray-100 rounded-lg p-4 text-center">
                    <span className="text-3xl font-bold text-gray-900 tracking-widest">
                      {sessionCode}
                    </span>
                  </div>
                  <button
                    onClick={copyCode}
                    className="p-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    title="Copy code"
                  >
                    {copied ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <Copy className="w-5 h-5" />
                    )}
                  </button>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Share this code with students to join the session
                </p>
              </div>

              {/* Participants Count */}
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <Users className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Connected</p>
                    <p className="text-2xl font-bold text-blue-600">{participants}</p>
                  </div>
                </div>
              </div>

              {/* Permissions */}
              <div className="border-t border-gray-200 pt-4">
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <p className="font-medium text-gray-900">Allow Students to Draw</p>
                    <p className="text-sm text-gray-500">
                      Students can add and edit objects on the canvas
                    </p>
                  </div>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={allowStudentDraw}
                      onChange={(e) => onTogglePermissions(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </div>
                </label>
              </div>
            </div>

            {/* Right Column - Participants List */}
            <div>
              <ParticipantsList
                participants={participantsList}
                currentUserId={currentClientId}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-3 border-t border-gray-200 pt-6">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium"
            >
              Minimize
            </button>
            <button
              onClick={onEndSession}
              className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium"
            >
              End Session
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
