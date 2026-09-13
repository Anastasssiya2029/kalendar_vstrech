import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginPage } from './components/LoginPage';
import { Dashboard } from './components/Dashboard';
import { MeetingsDashboard } from './components/MeetingsDashboard';
import { AnimatedBackgroundCSS } from './components/AnimatedBackgroundCSS';
import { Toaster } from './components/ui/sonner';

function AppContent() {
  const { user, school, isAuthenticated, loading } = useAuth();
  const [appMode, setAppMode] = useState<'installments' | 'meetings'>('meetings');
  const [isNotificationsPanelOpen, setIsNotificationsPanelOpen] = useState(false);

  if (loading) {
    return (
      <div className="login-page min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-10 h-10 border-4 border-[#6f2e89] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600 mt-4">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div className="meeting-app h-screen relative overflow-hidden">
      <AnimatedBackgroundCSS />
      
      <div className="relative z-10 h-full overflow-y-auto">
        {appMode === 'meetings' ? <MeetingsDashboard /> : <Dashboard />}
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
      <Toaster />
    </AuthProvider>
  );
}

export default App;
