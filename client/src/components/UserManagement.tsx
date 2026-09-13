import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card } from './ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { DialogDescription } from './ui/dialog';
import { Plus, User, Mail, Shield, Trash2, Edit } from 'lucide-react';
import { Badge } from './ui/badge';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'manager';
  createdAt: Date;
}

interface UserManagementProps {
  users: User[];
  onAddUser: (userData: { 
    name: string; 
    email: string; 
    password: string;
  }) => void;
  onEditUser?: (userId: string, userData: {
    name: string;
    email: string;
    password?: string;
  }) => void;
  onDeleteUser?: (userId: string) => void;
}

export function UserManagement({ users, onAddUser, onEditUser, onDeleteUser }: UserManagementProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Edit form state
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Введите имя пользователя';
    }

    if (!email.trim()) {
      newErrors.email = 'Введите email';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Некорректный email';
    }

    if (!password.trim()) {
      newErrors.password = 'Введите пароль';
    } else if (password.length < 8) {
      newErrors.password = 'Пароль должен быть минимум 8 символов';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateEditForm = () => {
    const newErrors: Record<string, string> = {};

    if (!editName.trim()) {
      newErrors.name = 'Введите имя пользователя';
    }

    if (!editEmail.trim()) {
      newErrors.email = 'Введите email';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editEmail)) {
      newErrors.email = 'Некорректный email';
    }

    if (editPassword.trim() && editPassword.length < 8) {
      newErrors.password = 'Пароль должен быть минимум 8 символов';
    }

    setEditErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    onAddUser({
      name: name.trim(),
      email: email.trim(),
      password: password.trim(),
    });

    // Очищаем форму
    setName('');
    setEmail('');
    setPassword('');
    setErrors({});
    setIsDialogOpen(false);
  };

  const handleEditClick = (user: User) => {
    setSelectedUser(user);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditPassword('');
    setEditErrors({});
    setIsEditDialogOpen(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateEditForm() || !selectedUser || !onEditUser) {
      return;
    }

    const updateData: {
      name: string;
      email: string;
      password?: string;
    } = {
      name: editName.trim(),
      email: editEmail.trim(),
    };

    if (editPassword.trim()) {
      updateData.password = editPassword.trim();
    }

    onEditUser(selectedUser.id, updateData);

    // Очищаем форму
    setEditName('');
    setEditEmail('');
    setEditPassword('');
    setEditErrors({});
    setSelectedUser(null);
    setIsEditDialogOpen(false);
  };

  const getRoleBadge = () => {
    return (
      <Badge className="manager-role-badge">
        Менеджер
      </Badge>
    );
  };

  const managers = users;

  return (
    <div className="user-management space-y-4 sm:space-y-6">
      <div className="user-management-toolbar flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="mb-2">Управление пользователями</h2>
          <p className="text-gray-600 text-sm sm:text-base">Только администратор может создавать учётные записи менеджеров.</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <button className="brand-primary-button rounded-2xl px-4 sm:px-6 py-3 flex items-center justify-center gap-2 w-full sm:w-auto">
              <Plus className="w-5 h-5" />
              <span className="text-sm sm:text-base">Добавить менеджера</span>
            </button>
          </DialogTrigger>
          <DialogContent className="manager-editor-dialog">
            <DialogHeader className="manager-editor-header">
              <div className="manager-editor-heading">
                <div className="manager-editor-icon">
                  <Plus className="w-5 h-5" />
                </div>
                <div className="manager-editor-heading-copy">
                  <DialogTitle className="manager-editor-title">Добавить менеджера</DialogTitle>
                  <DialogDescription className="manager-editor-description">
                    Новый пользователь получит доступ только к своему календарю.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="manager-editor-form">
              <div className="manager-editor-field">
                <Label htmlFor="user-name">
                  Имя <span className="manager-editor-required">*</span>
                </Label>
                <div className="manager-editor-input-wrap">
                  <User className="manager-editor-input-icon w-5 h-5" />
                  <Input
                    id="user-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Иван Иванов"
                    className="manager-editor-input manager-editor-input--with-icon"
                  />
                </div>
                {errors.name && (
                  <p className="manager-editor-error">{errors.name}</p>
                )}
              </div>

              <div className="manager-editor-field">
                <Label htmlFor="user-email">
                  Email <span className="manager-editor-required">*</span>
                </Label>
                <div className="manager-editor-input-wrap">
                  <Mail className="manager-editor-input-icon w-5 h-5" />
                  <Input
                    id="user-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@school.com"
                    className="manager-editor-input manager-editor-input--with-icon"
                  />
                </div>
                {errors.email && (
                  <p className="manager-editor-error">{errors.email}</p>
                )}
              </div>

              <div className="manager-editor-field">
                <Label htmlFor="user-password">
                  Пароль <span className="manager-editor-required">*</span>
                </Label>
                <Input
                  id="user-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Минимум 8 символов"
                  className="manager-editor-input"
                />
                {errors.password && (
                  <p className="manager-editor-error">{errors.password}</p>
                )}
              </div>

              <div className="manager-editor-actions">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false);
                    setErrors({});
                  }}
                  className="manager-editor-cancel"
                >
                  Отмена
                </Button>
                <Button
                  type="submit"
                  className="brand-primary-button manager-editor-save"
                >
                  Добавить
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Статистика */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="user-management-stat-card p-6 rounded-3xl">
          <div className="flex items-center gap-4">
            <div className="user-management-stat-icon">
              <User className="w-7 h-7" />
            </div>
            <div>
              <p className="user-management-stat-label">Менеджеров</p>
              <p className="user-management-stat-value">{managers.length}</p>
            </div>
          </div>
        </Card>
        
      </div>

      {/* Список пользователей */}
      <div className="space-y-4">
        {users.length > 0 ? (
          users.map((user) => (
            <Card key={user.id} className="user-management-card p-5 sm:p-6 rounded-3xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="user-management-avatar">
                    <User className="w-5 h-5" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-gray-900">{user.name}</h3>
                      {getRoleBadge()}
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-gray-600 text-sm">
                      <div className="flex items-center gap-1">
                        <Mail className="w-4 h-4" />
                        <span className="break-all">{user.email}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Shield className="w-4 h-4" />
                        <span>
                          Добавлен {user.createdAt.toLocaleDateString('ru-RU', { 
                            day: 'numeric', 
                            month: 'long', 
                            year: 'numeric' 
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 self-end sm:self-auto">
                  {onEditUser && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditClick(user)}
                      className="manager-card-action manager-card-action--edit rounded-xl"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  )}
                  
                  {onDeleteUser && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeleteUser(user.id)}
                      className="manager-card-action manager-card-action--delete rounded-xl"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))
        ) : (
          <div className="user-management-empty text-center py-12">
            <p className="text-gray-700 text-lg font-semibold mb-2">Пока нет менеджеров</p>
            <p className="text-gray-500 text-sm">Добавьте менеджера для работы с календарём.</p>
          </div>
        )}
      </div>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="manager-editor-dialog">
          <DialogHeader className="manager-editor-header">
            <div className="manager-editor-heading">
              <div className="manager-editor-icon">
                <Edit className="w-5 h-5" />
              </div>
              <div className="manager-editor-heading-copy">
                <DialogTitle className="manager-editor-title">Редактировать менеджера</DialogTitle>
                <DialogDescription className="manager-editor-description">
                  Измените данные пользователя {selectedUser?.name}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <form onSubmit={handleEditSubmit} className="manager-editor-form">
            <div className="manager-editor-field">
              <Label htmlFor="edit-user-name">
                Имя <span className="manager-editor-required">*</span>
              </Label>
              <div className="manager-editor-input-wrap">
                <User className="manager-editor-input-icon w-5 h-5" />
                <Input
                  id="edit-user-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Иван Иванов"
                  className="manager-editor-input manager-editor-input--with-icon"
                />
              </div>
              {editErrors.name && (
                <p className="manager-editor-error">{editErrors.name}</p>
              )}
            </div>

            <div className="manager-editor-field">
              <Label htmlFor="edit-user-email">
                Email <span className="manager-editor-required">*</span>
              </Label>
              <div className="manager-editor-input-wrap">
                <Mail className="manager-editor-input-icon w-5 h-5" />
                <Input
                  id="edit-user-email"
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="user@school.com"
                  className="manager-editor-input manager-editor-input--with-icon"
                />
              </div>
              {editErrors.email && (
                <p className="manager-editor-error">{editErrors.email}</p>
              )}
            </div>

            <div className="manager-editor-field">
              <Label htmlFor="edit-user-password">
                Новый пароль
              </Label>
              <Input
                id="edit-user-password"
                type="password"
                value={editPassword}
                onChange={(e) => setEditPassword(e.target.value)}
                placeholder="Оставьте пустым, чтобы не менять"
                className="manager-editor-input"
              />
              <p className="manager-editor-hint">
                Оставьте поле пустым, если не хотите менять пароль
              </p>
              {editErrors.password && (
                <p className="manager-editor-error">{editErrors.password}</p>
              )}
            </div>

            <div className="manager-editor-actions">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditDialogOpen(false);
                  setEditErrors({});
                }}
                className="manager-editor-cancel"
              >
                Отмена
              </Button>
              <Button
                type="submit"
                className="brand-primary-button manager-editor-save"
              >
                Сохранить
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
