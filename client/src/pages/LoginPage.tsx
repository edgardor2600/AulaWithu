import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { authService } from '../services/authService';
import toast from 'react-hot-toast';
import { GraduationCap, Users } from 'lucide-react';

export const LoginPage = () => {
  const [name, setName] = useState('');
  const [role, setRole] = useState<'teacher' | 'student'>('student');
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error('Please enter your name');
      return;
    }

    setIsLoading(true);

    try {
      const response = await authService.join({ name: name.trim(), role });
      
      setAuth(response.user, response.token);
      
      toast.success(`Welcome, ${response.user.name}!`);
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Login error:', error);
      // Error is already handled by axios interceptor
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Aula Colaborativa</h1>
          <p className="text-gray-600">Interactive learning platform</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Join Session</h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name Input */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Your Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                disabled={isLoading}
              />
            </div>

            {/* Role Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                I am a...
              </label>
              <div className="grid grid-cols-2 gap-4">
                {/* Teacher Option */}
                <button
                  type="button"
                  onClick={() => setRole('teacher')}
                  className={`p-4 border-2 rounded-lg transition ${
                    role === 'teacher'
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  disabled={isLoading}
                >
                  <GraduationCap
                    className={`w-8 h-8 mx-auto mb-2 ${
                      role === 'teacher' ? 'text-blue-600' : 'text-gray-400'
                    }`}
                  />
                  <span
                    className={`block text-sm font-medium ${
                      role === 'teacher' ? 'text-blue-600' : 'text-gray-700'
                    }`}
                  >
                    Teacher
                  </span>
                </button>

                {/* Student Option */}
                <button
                  type="button"
                  onClick={() => setRole('student')}
                  className={`p-4 border-2 rounded-lg transition ${
                    role === 'student'
                      ? 'border-purple-600 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  disabled={isLoading}
                >
                  <Users
                    className={`w-8 h-8 mx-auto mb-2 ${
                      role === 'student' ? 'text-purple-600' : 'text-gray-400'
                    }`}
                  />
                  <span
                    className={`block text-sm font-medium ${
                      role === 'student' ? 'text-purple-600' : 'text-gray-700'
                    }`}
                  >
                    Student
                  </span>
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 px-4 rounded-lg font-medium text-white transition ${
                role === 'teacher'
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-purple-600 hover:bg-purple-700'
              } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isLoading ? 'Joining...' : 'Join Now'}
            </button>
          </form>

          {/* Info */}
          <p className="mt-6 text-center text-sm text-gray-500">
            No account needed. Just enter your name and start learning!
          </p>
        </div>
      </div>
    </div>
  );
};
