// Only admin and manager accounts are issued by this deployment. The legacy values
// remain in the type while old, unmounted components are being retained for history.
export type UserRole = 'architect' | 'admin' | 'manager' | 'assistant';

export interface School {
  id: string;
  name: string;
  createdAt: Date;
  adminName?: string;
  adminEmail?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  schoolId: string | null; // null для Архитектора
  managerId?: string; // ID менеджера, за которым закреплены клиенты
}

export interface AuthContextType {
  user: User | null;
  school: School | null;
  schools: School[];
  isSchoolsDirectory: boolean;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  openSchoolsDirectory: () => void;
  selectSchool: (school: School) => void;
  createSchool: (data: { name: string; description?: string }) => Promise<School>;
  updateSchool: (schoolId: string, data: { name: string; adminName?: string; adminEmail?: string }) => Promise<School>;
  updateProfile: (data: { name: string; email: string }) => Promise<void>;
}
