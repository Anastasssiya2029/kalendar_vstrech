import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { AuthContextType, School, User, UserRole } from "../types/auth";
import { apiService } from "../services/api";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function toUser(value: any): User {
  return {
    id: value.id,
    email: value.email,
    name: value.name,
    role: value.role as UserRole,
    schoolId: value.schoolId ?? value.school_id,
  };
}

function toSchool(value: any): School | null {
  if (!value) return null;
  return {
    id: value.id,
    name: value.name,
    createdAt: new Date(value.createdAt ?? value.created_at),
    adminName: value.adminName ?? value.admin_name ?? undefined,
    adminEmail: value.adminEmail ?? value.admin_email ?? undefined,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [school, setSchool] = useState<School | null>(null);
  const [schools, setSchools] = useState<School[]>([]);
  const [isSchoolsDirectory, setIsSchoolsDirectory] = useState(false);
  const [loading, setLoading] = useState(true);

  const applySession = useCallback((session: { user: any; school: any }) => {
    setUser(toUser(session.user));
    setSchool(toSchool(session.school));
    setIsSchoolsDirectory(false);
  }, []);

  const refreshSchools = useCallback(async () => {
    const result = await apiService.getSchools();
    const nextSchools = result.schools.map(toSchool).filter((item): item is School => item !== null);
    setSchools(nextSchools);
    return nextSchools;
  }, []);

  useEffect(() => {
    let mounted = true;
    apiService.getCurrentUser()
      .then(async (session) => {
        if (!mounted) return;
        applySession(session);
        await refreshSchools();
      })
      .catch(() => { if (mounted) { setUser(null); setSchool(null); } })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [applySession]);

  const login = async (email: string, password: string) => {
    const session = await apiService.login(email, password);
    applySession(session);
    await refreshSchools();
  };

  const logout = async () => {
    try {
      await apiService.logout();
    } finally {
      setUser(null);
      setSchool(null);
      setSchools([]);
      setIsSchoolsDirectory(false);
    }
  };

  const createSchool = async (data: { name: string; description?: string }) => {
    const result = await apiService.createSchool(data);
    const createdSchool = toSchool(result.school);
    if (!createdSchool) throw new Error("Не удалось создать школу");
    setSchools((current) => [createdSchool, ...current]);
    return createdSchool;
  };

  const updateSchool = async (schoolId: string, data: { name: string; adminName?: string; adminEmail?: string }) => {
    const result = await apiService.updateSchool(schoolId, data);
    const updatedSchool = toSchool(result.school);
    if (!updatedSchool) throw new Error("Не удалось обновить школу");
    setSchools((current) => current.map((item) => item.id === updatedSchool.id ? updatedSchool : item));
    setSchool((current) => current?.id === updatedSchool.id ? updatedSchool : current);
    return updatedSchool;
  };

  const updateProfile = async (data: { name: string; email: string }) => {
    const result = await apiService.updateProfile(data);
    setUser(toUser(result.user));
  };

  return (
    <AuthContext.Provider value={{
      user,
      school,
      schools,
      isSchoolsDirectory,
      isAuthenticated: Boolean(user),
      loading,
      login,
      logout,
      openSchoolsDirectory: () => {
        if (user?.role === "architect") setIsSchoolsDirectory(true);
      },
      selectSchool: (selectedSchool) => {
        setSchool(selectedSchool);
        setIsSchoolsDirectory(false);
      },
      createSchool,
      updateSchool,
      updateProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
