import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card } from './ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { DialogDescription } from './ui/dialog';
import { Plus, Building2, Calendar, User, Mail, Edit, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { toast } from 'sonner';

interface School {
  id: string;
  name: string;
  createdAt: Date;
  adminName?: string;
  adminEmail?: string;
}

interface SchoolManagementProps {
  schools: School[];
  onAddSchool: (schoolData: { 
    schoolName: string; 
    adminName: string; 
    adminEmail: string; 
    adminPassword: string;
  }) => void;
  onEditSchool: (schoolId: string, data: {
    schoolName?: string;
    adminName?: string;
    adminEmail?: string;
    adminPassword?: string;
  }) => void;
  onDeleteSchool: (schoolId: string) => void;
}

export function SchoolManagement({ schools, onAddSchool, onEditSchool, onDeleteSchool }: SchoolManagementProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  
  // Add School Form
  const [schoolName, setSchoolName] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Edit School Form
  const [editSchoolName, setEditSchoolName] = useState('');
  const [editAdminName, setEditAdminName] = useState('');
  const [editAdminEmail, setEditAdminEmail] = useState('');
  const [editAdminPassword, setEditAdminPassword] = useState('');
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});

  const validateAddForm = () => {
    const newErrors: Record<string, string> = {};

    if (!schoolName.trim()) {
      newErrors.schoolName = 'Введите название школы';
    }

    if (!adminName.trim()) {
      newErrors.adminName = 'Введите имя администратора';
    }

    if (!adminEmail.trim()) {
      newErrors.adminEmail = 'Введите email администратора';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) {
      newErrors.adminEmail = 'Некорректный email';
    }

    if (!adminPassword.trim()) {
      newErrors.adminPassword = 'Введите пароль';
    } else if (adminPassword.length < 6) {
      newErrors.adminPassword = 'Пароль должен быть минимум 6 символов';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateEditForm = () => {
    const newErrors: Record<string, string> = {};

    if (editAdminEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editAdminEmail)) {
      newErrors.editAdminEmail = 'Некорректный email';
    }

    if (editAdminPassword && editAdminPassword.length < 6) {
      newErrors.editAdminPassword = 'Пароль должен быть минимум 6 символов';
    }

    setEditErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateAddForm()) {
      return;
    }

    onAddSchool({
      schoolName: schoolName.trim(),
      adminName: adminName.trim(),
      adminEmail: adminEmail.trim(),
      adminPassword: adminPassword.trim(),
    });

    // Очищаем форму
    setSchoolName('');
    setAdminName('');
    setAdminEmail('');
    setAdminPassword('');
    setErrors({});
    setIsAddDialogOpen(false);
  };

  const handleEditClick = (school: School) => {
    setSelectedSchool(school);
    setEditSchoolName(school.name || '');
    setEditAdminName(school.adminName || '');
    setEditAdminEmail(school.adminEmail || '');
    setEditAdminPassword('');
    setEditErrors({});
    setIsEditDialogOpen(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedSchool) return;

    if (!validateEditForm()) {
      return;
    }

    const updateData: {
      schoolName?: string;
      adminName?: string;
      adminEmail?: string;
      adminPassword?: string;
    } = {};

    if (editSchoolName.trim() && editSchoolName !== selectedSchool.name) {
      updateData.schoolName = editSchoolName.trim();
    }

    if (editAdminName.trim() && editAdminName !== selectedSchool.adminName) {
      updateData.adminName = editAdminName.trim();
    }

    if (editAdminEmail.trim() && editAdminEmail !== selectedSchool.adminEmail) {
      updateData.adminEmail = editAdminEmail.trim();
    }

    if (editAdminPassword.trim()) {
      updateData.adminPassword = editAdminPassword.trim();
    }

    if (Object.keys(updateData).length === 0) {
      toast.error('Нет изменений для сохранения');
      return;
    }

    onEditSchool(selectedSchool.id, updateData);

    // Очищаем форму
    setEditSchoolName('');
    setEditAdminName('');
    setEditAdminEmail('');
    setEditAdminPassword('');
    setEditErrors({});
    setSelectedSchool(null);
    setIsEditDialogOpen(false);
  };

  const handleDeleteClick = (school: School) => {
    setSelectedSchool(school);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (!selectedSchool) return;
    
    onDeleteSchool(selectedSchool.id);
    setSelectedSchool(null);
    setIsDeleteDialogOpen(false);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="mb-2">Управление школами</h2>
          <p className="text-gray-600 text-sm sm:text-base">Добавление новых онлайн-школ и назначение администраторов</p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <button
              className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 text-white shadow-3d-cosmic hover:shadow-3d-hover transition-all duration-400 hover:scale-105 rounded-2xl px-4 sm:px-6 py-3 flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              <Plus className="w-5 h-5" />
              <span className="text-sm sm:text-base">Добавить школу</span>
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[550px] rounded-3xl">
            <DialogHeader>
              <DialogTitle className="text-gray-900">Добавление новой школы</DialogTitle>
              <DialogDescription className="text-gray-600">
                Заполните информацию о новой школе и её владельце
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleAddSubmit} className="space-y-6 pt-4">
              <div className="space-y-2">
                <Label htmlFor="school-name" className="text-gray-900">
                  Название школы <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="school-name"
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    placeholder="Онлайн-школа программирования"
                    className="pl-10 rounded-2xl border-gray-200 text-gray-900"
                  />
                </div>
                {errors.schoolName && (
                  <p className="text-red-500 text-sm">{errors.schoolName}</p>
                )}
              </div>

              <div className="pt-4 border-t border-gray-200">
                <h3 className="text-gray-900 mb-4">анные главного администратора</h3>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="admin-name" className="text-gray-900">
                      Имя администратора <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <Input
                        id="admin-name"
                        value={adminName}
                        onChange={(e) => setAdminName(e.target.value)}
                        placeholder="Иван Иванов"
                        className="pl-10 rounded-2xl border-gray-200 text-gray-900"
                      />
                    </div>
                    {errors.adminName && (
                      <p className="text-red-500 text-sm">{errors.adminName}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="admin-email" className="text-gray-900">
                      Email администратора <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <Input
                        id="admin-email"
                        type="email"
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                        placeholder="admin@school.com"
                        className="pl-10 rounded-2xl border-gray-200 text-gray-900"
                      />
                    </div>
                    {errors.adminEmail && (
                      <p className="text-red-500 text-sm">{errors.adminEmail}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="admin-password" className="text-gray-900">
                      Пароль <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="admin-password"
                      type="password"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="Минимум 6 символов"
                      className="rounded-2xl border-gray-200 text-gray-900"
                    />
                    {errors.adminPassword && (
                      <p className="text-red-500 text-sm">{errors.adminPassword}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsAddDialogOpen(false);
                    setErrors({});
                  }}
                  className="flex-1 rounded-2xl border-gray-200 text-gray-900 hover:bg-gray-50 hover:text-gray-900"
                >
                  Отмена
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 text-white rounded-2xl shadow-3d-cosmic hover:shadow-3d-hover transition-all duration-400"
                >
                  Создать школу
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit School Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[550px] rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Редактирование школы</DialogTitle>
            <DialogDescription className="text-gray-600">
              Обновите название школы и данные администратора
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleEditSubmit} className="space-y-6 pt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-school-name" className="text-gray-900">
                  Название школы
                </Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="edit-school-name"
                    value={editSchoolName}
                    onChange={(e) => setEditSchoolName(e.target.value)}
                    placeholder="Онлайн-школа программирования"
                    className="pl-10 rounded-2xl border-gray-200 text-gray-900"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-admin-name" className="text-gray-900">
                  Имя администратора
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="edit-admin-name"
                    value={editAdminName}
                    onChange={(e) => setEditAdminName(e.target.value)}
                    placeholder="Иван Иванов"
                    className="pl-10 rounded-2xl border-gray-200 text-gray-900"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-admin-email" className="text-gray-900">
                  Email администратора
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="edit-admin-email"
                    type="email"
                    value={editAdminEmail}
                    onChange={(e) => setEditAdminEmail(e.target.value)}
                    placeholder="admin@school.com"
                    className="pl-10 rounded-2xl border-gray-200 text-gray-900"
                  />
                </div>
                {editErrors.editAdminEmail && (
                  <p className="text-red-500 text-sm">{editErrors.editAdminEmail}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-admin-password" className="text-gray-900">
                  Новый пароль
                </Label>
                <Input
                  id="edit-admin-password"
                  type="password"
                  value={editAdminPassword}
                  onChange={(e) => setEditAdminPassword(e.target.value)}
                  placeholder="Оставьте пустым, чтобы не менять"
                  className="rounded-2xl border-gray-200 text-gray-900"
                />
                {editErrors.editAdminPassword && (
                  <p className="text-red-500 text-sm">{editErrors.editAdminPassword}</p>
                )}
                <p className="text-gray-500 text-sm">Минимум 6 символов</p>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditDialogOpen(false);
                  setEditErrors({});
                  setSelectedSchool(null);
                }}
                className="flex-1 rounded-2xl border-gray-200 text-gray-900 hover:bg-gray-50 hover:text-gray-900"
              >
                Отмена
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 text-white rounded-2xl shadow-3d-cosmic hover:shadow-3d-hover transition-all duration-400"
              >
                Сохранить изменения
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-900">Удаление школы</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600">
              Вы уверены, что хотите удалить школу <strong>{selectedSchool?.name}</strong>?
              <br /><br />
              Это действие приведет к удалению:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Всех клиентов школы</li>
                <li>Всех платежей</li>
                <li>Всех пользователей (включая администратора)</li>
                <li>Всей истории</li>
              </ul>
              <br />
              <span className="text-red-500">Это действие нельзя отменить!</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-2xl border-gray-200 text-gray-900">
              Отмена
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="rounded-2xl bg-red-500 hover:bg-red-600 text-white"
            >
              Удалить школу
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Список школ */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {schools.map((school) => (
          <Card key={school.id} className="p-6 rounded-3xl shadow-3d hover:shadow-3d-hover transition-all duration-400 hover:-translate-y-1 bg-white border-0 flex flex-col">
            <div className="flex-1 space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-3 bg-gradient-to-br from-purple-100 to-blue-100 rounded-2xl">
                  <Building2 className="w-6 h-6 text-purple-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-gray-900 mb-1">{school.name}</h3>
                  <div className="flex items-center gap-1 text-gray-600 text-sm">
                    <Calendar className="w-4 h-4" />
                    <span>
                      Создана {school.createdAt.toLocaleDateString('ru-RU', { 
                        day: 'numeric', 
                        month: 'long', 
                        year: 'numeric' 
                      })}
                    </span>
                  </div>
                </div>
              </div>

              {school.adminName && (
                <div className="pt-4 border-t border-gray-100 space-y-2">
                  <div className="flex items-center gap-2 text-gray-600 text-sm">
                    <User className="w-4 h-4" />
                    <span>{school.adminName}</span>
                  </div>
                  {school.adminEmail && (
                    <div className="flex items-center gap-2 text-gray-600 text-sm">
                      <Mail className="w-4 h-4" />
                      <span>{school.adminEmail}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4 mt-4 border-t border-gray-100">
              <Button
                onClick={() => handleEditClick(school)}
                variant="outline"
                size="sm"
                className="flex-1 rounded-2xl border-[#2D1B69]/30 text-[#2D1B69] hover:bg-[#2D1B69]/10 hover:text-[#2D1B69]"
              >
                <Edit className="w-4 h-4 mr-2" />
                Редактировать
              </Button>
              <Button
                onClick={() => handleDeleteClick(school)}
                variant="outline"
                size="sm"
                className="rounded-2xl border-red-200 text-red-600 hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {schools.length === 0 && (
        <div className="text-center py-12 bg-white rounded-3xl shadow-3d">
          <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 mb-2">Пока нет школ</p>
          <p className="text-gray-500 text-sm">Добавьте первую школу, чтобы начать работу</p>
        </div>
      )}
    </div>
  );
}