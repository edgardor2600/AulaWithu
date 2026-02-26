import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ClassesPage } from './pages/ClassesPage';
import { ClassDetailPage } from './pages/ClassDetailPage';
import { TopicDetailPage } from './pages/TopicDetailPage';
import { EditorPage } from './pages/EditorPage';
import { SlideViewerPage } from './pages/SlideViewerPage';
import { JoinSessionPage } from './pages/JoinSessionPage';
import { SessionViewPage } from './pages/SessionViewPage';
import { AdminPanel } from './pages/AdminPanel';
import { GroupManagementPage } from './pages/GroupManagementPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { useAuthStore } from './store/authStore';

import { ThemeProvider } from './components/ThemeProvider';

// Component to handle authenticated redirect based on role
const AuthenticatedRedirect = () => {
  const user = useAuthStore((state) => state.user);
  
  // Redirect based on role
  if (user?.role === 'admin') {
    return <Navigate to="/admin" replace />;
  }
  return <Navigate to="/dashboard" replace />;
};

function App() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return (
    <ThemeProvider>
      <BrowserRouter>
        {/* Toast Notifications */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#10b981',
                secondary: '#fff',
              },
            },
            error: {
              duration: 4000,
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />

        {/* Routes */}
        <Routes>
          {/* Public Routes */}
          <Route
            path="/login"
            element={isAuthenticated ? <AuthenticatedRedirect /> : <LoginPage />}
          />

          {/* Admin Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminPanel />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/groups"
            element={
              <ProtectedRoute requiredRole="admin">
                <GroupManagementPage />
              </ProtectedRoute>
            }
          />

          {/* Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/classes"
            element={
              <ProtectedRoute>
                <ClassesPage />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/classes/:id"
            element={
              <ProtectedRoute>
                <ClassDetailPage />
              </ProtectedRoute>
            }
          />
          
          {/* Topic Detail - View slides for a specific topic */}
          <Route
            path="/classes/:classId/topics/:topicId"
            element={
              <ProtectedRoute>
                <TopicDetailPage />
              </ProtectedRoute>
            }
          />
          
          {/* Slide Viewer - For students to view slides in read-only mode */}
          <Route
            path="/classes/:id/view"
            element={
              <ProtectedRoute>
                <SlideViewerPage />
              </ProtectedRoute>
            }
          />
          
          {/* Editor - Teachers only */}
          <Route
            path="/classes/:id/edit"
            element={
              <ProtectedRoute requiredRole="teacher">
                <EditorPage />
              </ProtectedRoute>
            }
          />

          {/* Live Session Routes */}
          <Route
            path="/join"
            element={
              <ProtectedRoute>
                <JoinSessionPage />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/session/:id"
            element={
              <ProtectedRoute>
                <SessionViewPage />
              </ProtectedRoute>
            }
          />

          {/* Default Route - Redirect based on auth and role */}
          <Route
            path="/"
            element={isAuthenticated ? <AuthenticatedRedirect /> : <Navigate to="/login" replace />}
          />

          {/* 404 - Redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
