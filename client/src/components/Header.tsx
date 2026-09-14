import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { LogOut, User, Building2, Shield, Database, ArrowLeft, Bell, Settings } from 'lucide-react';
import { useState, useEffect } from 'react';

const ROLE_LABELS = {
  architect: { label: 'Архитектор', icon: Shield, color: 'from-[#421f54] via-[#6f2e89] to-[#b52a98]' },
  super_admin: { label: 'Супер-администратор', icon: Shield, color: 'from-[#522064] via-[#7e347f] to-[#b24b88]' },
  admin: { label: 'Администратор', icon: Shield, color: 'from-[#5d286f] to-[#924373]' },
  manager: { label: 'Менеджер', icon: User, color: 'from-[#683489] to-[#8a2f98]' },
  assistant: { label: 'Помощник', icon: User, color: 'from-[#4f164b] to-[#772559]' },
};

interface HeaderProps {
  onOpenNotifications?: () => void;
  unreadNotificationsCount?: number;
  onOpenSettings?: () => void;
}

export function Header({ onOpenNotifications, unreadNotificationsCount = 0, onOpenSettings }: HeaderProps) {
  const { user, school, isSchoolsDirectory, logout, openSchoolsDirectory } = useAuth();
  const apiConnected = true;
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!user) return null;

  const roleInfo = ROLE_LABELS[user.role];
  const isArchitect = user.role === 'architect';

  const handleBackToSchools = () => {
    openSchoolsDirectory();
  };

  return (
    <div className={`app-header border-b sticky top-0 z-50 transition-all duration-300 ${
      isScrolled ? 'py-2 shadow-md' : 'py-3 sm:py-4'
    }`}>
      <div className="app-header-inner max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="app-header-row flex items-center justify-between gap-2 sm:gap-4">
          {/* Left: School Info */}
          <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
            {school && (
              <>
                {isArchitect && !isSchoolsDirectory && (
                  <Button
                    onClick={handleBackToSchools}
                    variant="outline"
                    className="app-outline-button rounded-xl px-2 sm:px-4 h-9 sm:h-10 flex-shrink-0"
                  >
                    <ArrowLeft className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">К списку школ</span>
                  </Button>
                )}
                <div className="app-school-badge flex items-center gap-2 sm:gap-3 px-2 sm:px-4 py-1.5 sm:py-2 rounded-xl min-w-0">
                  <Building2 className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                  <span className="text-gray-900 text-sm sm:text-base truncate">{school.name}</span>
                </div>
              </>
            )}
            
            {/* API Status Badge */}
            {apiConnected === null && (
              <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-yellow-50 rounded-xl border border-yellow-200 flex-shrink-0">
                <Database className="w-4 h-4 text-yellow-600" />
                <span className="text-yellow-700 text-xs">Demo Mode</span>
              </div>
            )}
          </div>

          {/* Right: User Info & Logout */}
          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
            {/* Notifications Button */}
            {onOpenNotifications && (
              <button
                onClick={onOpenNotifications}
                className="app-icon-button relative p-2 sm:p-2.5 rounded-xl transition-all"
              >
                <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 transition-colors" />
                {unreadNotificationsCount > 0 && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-[#b52a98] rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-white text-xs font-bold">
                      {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                    </span>
                  </div>
                )}
              </button>
            )}

            {/* User Badge */}
            <div className="app-user-badge hidden sm:flex items-center gap-3 px-4 py-2 rounded-xl">
              <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${roleInfo.color} flex items-center justify-center shadow-md`}>
                <roleInfo.icon className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-gray-900 leading-tight">{user.name}</p>
                <p className="text-gray-600 leading-tight">{roleInfo.label}</p>
              </div>
            </div>

            {/* Mobile User Badge - Compact */}
            <div className="app-user-badge sm:hidden flex items-center gap-2 px-2 py-1.5 rounded-xl">
              <div className={`w-7 h-7 rounded-xl bg-gradient-to-br ${roleInfo.color} flex items-center justify-center shadow-md`}>
                <roleInfo.icon className="w-3.5 h-3.5 text-white" />
              </div>
            </div>

            {/* Settings Button */}
            {onOpenSettings && (
              <Button
                onClick={onOpenSettings}
                variant="outline"
                className="app-outline-button rounded-xl px-2 sm:px-4 h-9 sm:h-10"
                title="Настройки профиля"
                aria-label="Открыть настройки профиля"
              >
                <Settings className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Профиль</span>
              </Button>
            )}

            {/* Logout Button */}
            <Button
              onClick={logout}
              variant="outline"
              className="app-logout-button rounded-xl px-2 sm:px-4 h-9 sm:h-10"
            >
              <LogOut className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Выйти</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
