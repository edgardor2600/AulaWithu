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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <Radio className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Join Live Session
            </h1>
            <p className="text-gray-600">
              Enter the 6-character code shared by your teacher
            </p>
          </div>

          {/* Form Card */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <form onSubmit={handleJoin} className="space-y-6">
              {/* Session Code Input */}
              <div>
                <label htmlFor="sessionCode" className="block text-sm font-medium text-gray-700 mb-2">
                  Session Code
                </label>
                <input
                  id="sessionCode"
                  type="text"
                  value={sessionCode}
                  onChange={(e) => handleCodeChange(e.target.value)}
                  placeholder="ABC123"
                  className="w-full px-4 py-3 text-center text-2xl font-bold tracking-widest border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition uppercase"
                  maxLength={6}
                  autoFocus
                  disabled={isJoining}
                />
                <p className="mt-2 text-xs text-gray-500 text-center">
                  {sessionCode.length}/6 characters
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex items-start space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {/* Join Button */}
              <button
                type="submit"
                disabled={isJoining || sessionCode.length !== 6}
                className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium shadow-md"
              >
                {isJoining ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Joining...</span>
                  </>
                ) : (
                  <>
                    <span>Join Session</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>

            {/* Help Text */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-600 text-center">
                Don't have a code?{' '}
                <span className="text-blue-600 font-medium">
                  Ask your teacher to start a live session
                </span>
              </p>
            </div>
          </div>

          {/* Back Link */}
          <div className="mt-6 text-center">
            <button
              onClick={() => navigate('/')}
              className="text-gray-600 hover:text-gray-900 transition"
            >
              ← Back to Home
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
};
