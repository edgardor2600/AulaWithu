import { Users } from 'lucide-react';

interface Participant {
  clientId: number;
  userId?: string;
  name: string;
  color: string;
  isTeacher?: boolean;
}

interface ParticipantsListProps {
  participants: Participant[];
  currentUserId?: number;
}

export const ParticipantsList = ({ participants, currentUserId }: ParticipantsListProps) => {
  // Defensive deduplication: ensure no duplicate userId or clientId is rendered
  const uniqueParticipants: Participant[] = [];
  const seenUserIds = new Set<string>();
  const seenClientIds = new Set<number>();

  for (const p of participants) {
    if (p.userId) {
      if (!seenUserIds.has(p.userId)) {
        seenUserIds.add(p.userId);
        seenClientIds.add(p.clientId);
        uniqueParticipants.push(p);
      }
    } else if (!seenClientIds.has(p.clientId)) {
      seenClientIds.add(p.clientId);
      uniqueParticipants.push(p);
    }
  }

  if (uniqueParticipants.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center space-x-2 mb-3">
        <Users className="w-5 h-5 text-gray-700" />
        <h3 className="font-semibold text-gray-900">
          Connected ({uniqueParticipants.length})
        </h3>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {uniqueParticipants.map((participant) => {
          const isCurrentUser = participant.clientId === currentUserId;
          
          return (
            <div
              key={participant.clientId}
              className={`flex items-center space-x-3 p-2 rounded-lg transition ${
                isCurrentUser 
                  ? 'bg-blue-50 border border-blue-200' 
                  : 'bg-gray-50 hover:bg-gray-100'
              }`}
            >
              {/* Avatar with user's color */}
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-medium text-sm flex-shrink-0"
                style={{ backgroundColor: participant.color }}
              >
                {participant.name.charAt(0).toUpperCase()}
              </div>

              {/* Name */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate flex items-center gap-1.5">
                  <span className="truncate">{participant.name}</span>
                  {participant.isTeacher && (
                    <span className="text-[10px] uppercase font-semibold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">
                      Teacher
                    </span>
                  )}
                  {isCurrentUser && (
                    <span className="text-xs text-blue-600 font-normal">
                      (You)
                    </span>
                  )}
                </p>
              </div>

              {/* Online indicator */}
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse flex-shrink-0" />
            </div>
          );
        })}
      </div>
    </div>
  );
};
