import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { LogOut, GraduationCap, Users } from 'lucide-react';
import toast from 'react-hot-toast';

export const DashboardPage = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
                style={{ backgroundColor: user?.avatar_color }}
              >
                {user?.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{user?.name}</h2>
                <div className="flex items-center space-x-1 text-sm text-gray-500">
                  {user?.role === 'teacher' ? (
                    <>
                      <GraduationCap className="w-4 h-4" />
                      <span>Teacher</span>
                    </>
                  ) : (
                    <>
                      <Users className="w-4 h-4" />
                      <span>Student</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Welcome to Aula Colaborativa! 🎉
          </h1>
          <p className="text-gray-600 mb-6">
            You're successfully logged in as a {user?.role}.
          </p>
          <div className="inline-block px-6 py-3 bg-green-100 text-green-800 rounded-lg">
            ✅ Block 4A: Authentication is working!
          </div>
          <p className="mt-6 text-sm text-gray-500">
            Dashboard UI coming in Block 4B...
          </p>
        </div>
      </main>
    </div>
  );
};
