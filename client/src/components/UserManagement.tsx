import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card } from './ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { DialogDescription } from './ui/dialog';
import { Plus, User, Mail, Shield, Trash2, Edit } from 'lucide-react';
import { Badge } from './ui/badge';

type ManagedRole = 'manager' | 'admin';

interface ManagedUser {
  id: string;
  name: string;
  email: string;
  role: ManagedRole;
  createdAt: Date;
}

interface UserManagementProps {
  users: ManagedUser[];
  canManageAdministrators: boolean;
  onAddUser: (userData: { name: string; email: string; password: string; role: ManagedRole }) => void;
  onEditUser?: (userId: string, userData: { name: string; email: string; password?: string; role?: ManagedRole }) => void;
  onDeleteUser?: (userId: string) => void;
}

const roleCopy: Record<ManagedRole, { label: string; description: string }> = {
  manager: {
    label: 'Менеджер',
    description: 'Работает со своими клиентами, встречами и окошками.',
  },
  admin: {
    label: 'Администратор',
    description: 'Ведёт свои встречи, видит календарь команды и управляет менеджерами.',
  },
};

export function UserManagement({ users, canManageAdministrators, onAddUser, onEditUser, onDeleteUser }: UserManagementProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null);
  const [pendingDeletion, setPendingDeletion] = useState<ManagedUser | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<ManagedRole>('manager');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState<ManagedRole>('manager');
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});

  const validate = (values: { name: string; email: string; password?: string }, isNew: boolean) => {
    const nextErrors: Record<string, string> = {};
    if (!values.name.trim()) nextErrors.name = 'Введите имя сотрудника';
    if (!values.email.trim()) nextErrors.email = 'Введите email';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) nextErrors.email = 'Некорректный email';
    if (isNew && !values.password?.trim()) nextErrors.password = 'Введите пароль';
    else if (values.password?.trim() && values.password.length < 8) nextErrors.password = 'Пароль должен быть минимум 8 символов';
    return nextErrors;
  };

  const closeCreateDialog = () => {
    setIsDialogOpen(false);
    setErrors({});
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors = validate({ name, email, password }, true);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    onAddUser({ name: name.trim(), email: email.trim(), password: password.trim(), role });
    setName('');
    setEmail('');
    setPassword('');
    setRole('manager');
    closeCreateDialog();
  };

  const handleEditClick = (member: ManagedUser) => {
    setSelectedUser(member);
    setEditName(member.name);
    setEditEmail(member.email);
    setEditPassword('');
    setEditRole(member.role);
    setEditErrors({});
    setIsEditDialogOpen(true);
  };

  const handleEditSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedUser || !onEditUser) return;
    const nextErrors = validate({ name: editName, email: editEmail, password: editPassword }, false);
    setEditErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const update: { name: string; email: string; password?: string; role?: ManagedRole } = {
      name: editName.trim(),
      email: editEmail.trim(),
    };
    if (editPassword.trim()) update.password = editPassword.trim();
    if (canManageAdministrators) update.role = editRole;
    onEditUser(selectedUser.id, update);
    setIsEditDialogOpen(false);
    setSelectedUser(null);
  };

  const managersCount = users.filter((member) => member.role === 'manager').length;
  const adminsCount = users.filter((member) => member.role === 'admin').length;

  return (
    <div className="user-management space-y-4 sm:space-y-6">
      <div className="user-management-toolbar flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="mb-2">Команда школы</h2>
          <p className="text-gray-600 text-sm sm:text-base">
            Администратор ведёт свои встречи, видит всю команду и управляет менеджерами.
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <button className="brand-primary-button rounded-2xl px-4 sm:px-6 py-3 flex items-center justify-center gap-2 w-full sm:w-auto">
              <Plus className="w-5 h-5" />
              <span className="text-sm sm:text-base">Добавить сотрудника</span>
            </button>
          </DialogTrigger>
          <DialogContent className="manager-editor-dialog">
            <DialogHeader className="manager-editor-header">
              <div className="manager-editor-heading">
                <div className="manager-editor-icon"><Plus className="w-5 h-5" /></div>
                <div className="manager-editor-heading-copy">
                  <DialogTitle className="manager-editor-title">Добавить сотрудника</DialogTitle>
                  <DialogDescription className="manager-editor-description">Выберите рабочую роль и создайте учётную запись.</DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="manager-editor-form">
              {canManageAdministrators && (
                <div className="manager-editor-field">
                  <Label htmlFor="user-role">Роль</Label>
                  <select id="user-role" value={role} onChange={(event) => setRole(event.target.value as ManagedRole)} className="manager-editor-input manager-editor-select">
                    <option value="manager">Менеджер</option>
                    <option value="admin">Администратор</option>
                  </select>
                  <p className="manager-editor-hint">{roleCopy[role].description}</p>
                </div>
              )}

              <div className="manager-editor-field">
                <Label htmlFor="user-name">Имя <span className="manager-editor-required">*</span></Label>
                <div className="manager-editor-input-wrap">
                  <User className="manager-editor-input-icon w-5 h-5" />
                  <Input id="user-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Иван Иванов" className="manager-editor-input manager-editor-input--with-icon" />
                </div>
                {errors.name && <p className="manager-editor-error">{errors.name}</p>}
              </div>

              <div className="manager-editor-field">
                <Label htmlFor="user-email">Email <span className="manager-editor-required">*</span></Label>
                <div className="manager-editor-input-wrap">
                  <Mail className="manager-editor-input-icon w-5 h-5" />
                  <Input id="user-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="user@school.com" className="manager-editor-input manager-editor-input--with-icon" />
                </div>
                {errors.email && <p className="manager-editor-error">{errors.email}</p>}
              </div>

              <div className="manager-editor-field">
                <Label htmlFor="user-password">Пароль <span className="manager-editor-required">*</span></Label>
                <Input id="user-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Минимум 8 символов" className="manager-editor-input" />
                {errors.password && <p className="manager-editor-error">{errors.password}</p>}
              </div>

              <div className="manager-editor-actions">
                <Button type="button" variant="outline" onClick={closeCreateDialog} className="manager-editor-cancel">Отмена</Button>
                <Button type="submit" className="brand-primary-button manager-editor-save">Добавить</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="user-management-stats">
        <Card className="user-management-stat-card p-5 sm:p-6 rounded-3xl">
          <div className="flex items-center gap-4">
            <div className="user-management-stat-icon"><User className="w-6 h-6" /></div>
            <div>
              <p className="user-management-stat-label">Сотрудников</p>
              <p className="user-management-stat-value">{users.length}</p>
            </div>
          </div>
          <p className="user-management-stat-detail">{managersCount} менедж. · {adminsCount} админ.</p>
        </Card>
      </div>

      <div className="user-management-list">
        {users.length > 0 ? users.map((member) => (
          <Card key={member.id} className="user-management-card rounded-3xl">
            <div className="user-management-card-layout">
              <div className={`user-management-avatar user-management-avatar--${member.role}`}>
                {member.role === 'admin' ? <Shield className="w-5 h-5" /> : <User className="w-5 h-5" />}
              </div>
              <div className="user-management-card-info">
                <div className="user-management-card-title">
                  <h3>{member.name}</h3>
                  <Badge className={`manager-role-badge manager-role-badge--${member.role}`}>{roleCopy[member.role].label}</Badge>
                </div>
                <div className="user-management-card-meta">
                  <div><Mail className="w-4 h-4" /><span>{member.email}</span></div>
                  <div><Shield className="w-4 h-4" /><span>Добавлен {member.createdAt.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}</span></div>
                </div>
              </div>
              <div className="user-management-card-actions">
                {onEditUser && (
                  <Button variant="ghost" size="sm" onClick={() => handleEditClick(member)} className="manager-card-action manager-card-action--edit" title={`Редактировать: ${member.name}`} aria-label={`Редактировать: ${member.name}`}>
                    <Edit className="w-4 h-4" />
                  </Button>
                )}
                {onDeleteUser && (member.role === 'manager' || canManageAdministrators) && (
                  <Button variant="ghost" size="sm" onClick={() => setPendingDeletion(member)} className="manager-card-action manager-card-action--delete" title={`Удалить: ${member.name}`} aria-label={`Удалить: ${member.name}`}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </Card>
        )) : (
          <div className="user-management-empty text-center py-12">
            <p className="text-gray-700 text-lg font-semibold mb-2">Пока нет сотрудников</p>
            <p className="text-gray-500 text-sm">Добавьте менеджера для работы с календарём.</p>
          </div>
        )}
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="manager-editor-dialog">
          <DialogHeader className="manager-editor-header">
            <div className="manager-editor-heading">
              <div className="manager-editor-icon"><Edit className="w-5 h-5" /></div>
              <div className="manager-editor-heading-copy">
                <DialogTitle className="manager-editor-title">Редактировать сотрудника</DialogTitle>
                <DialogDescription className="manager-editor-description">{selectedUser?.name}</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="manager-editor-form">
            {canManageAdministrators && (
              <div className="manager-editor-field">
                <Label htmlFor="edit-user-role">Роль</Label>
                <select id="edit-user-role" value={editRole} onChange={(event) => setEditRole(event.target.value as ManagedRole)} className="manager-editor-input manager-editor-select">
                  <option value="manager">Менеджер</option>
                  <option value="admin">Администратор</option>
                </select>
                <p className="manager-editor-hint">{roleCopy[editRole].description}</p>
              </div>
            )}
            <div className="manager-editor-field">
              <Label htmlFor="edit-user-name">Имя <span className="manager-editor-required">*</span></Label>
              <div className="manager-editor-input-wrap">
                <User className="manager-editor-input-icon w-5 h-5" />
                <Input id="edit-user-name" value={editName} onChange={(event) => setEditName(event.target.value)} className="manager-editor-input manager-editor-input--with-icon" />
              </div>
              {editErrors.name && <p className="manager-editor-error">{editErrors.name}</p>}
            </div>
            <div className="manager-editor-field">
              <Label htmlFor="edit-user-email">Email <span className="manager-editor-required">*</span></Label>
              <div className="manager-editor-input-wrap">
                <Mail className="manager-editor-input-icon w-5 h-5" />
                <Input id="edit-user-email" type="email" value={editEmail} onChange={(event) => setEditEmail(event.target.value)} className="manager-editor-input manager-editor-input--with-icon" />
              </div>
              {editErrors.email && <p className="manager-editor-error">{editErrors.email}</p>}
            </div>
            <div className="manager-editor-field">
              <Label htmlFor="edit-user-password">Новый пароль</Label>
              <Input id="edit-user-password" type="password" value={editPassword} onChange={(event) => setEditPassword(event.target.value)} placeholder="Оставьте пустым, чтобы не менять" className="manager-editor-input" />
              <p className="manager-editor-hint">Оставьте поле пустым, если пароль менять не нужно.</p>
              {editErrors.password && <p className="manager-editor-error">{editErrors.password}</p>}
            </div>
            <div className="manager-editor-actions">
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)} className="manager-editor-cancel">Отмена</Button>
              <Button type="submit" className="brand-primary-button manager-editor-save">Сохранить</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(pendingDeletion)} onOpenChange={(open) => { if (!open) setPendingDeletion(null); }}>
        <DialogContent className="manager-editor-dialog manager-delete-dialog">
          <DialogHeader className="manager-editor-header">
            <div className="manager-editor-heading">
              <div className="manager-editor-icon manager-editor-icon--danger"><Trash2 className="w-5 h-5" /></div>
              <div className="manager-editor-heading-copy">
                <DialogTitle className="manager-editor-title">Удалить сотрудника?</DialogTitle>
                <DialogDescription className="manager-editor-description">Доступ {pendingDeletion?.name} к сервису будет отключён. История встреч сохранится.</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="manager-editor-actions">
            <Button type="button" variant="outline" onClick={() => setPendingDeletion(null)} className="manager-editor-cancel">Отмена</Button>
            <Button type="button" onClick={() => { if (pendingDeletion) onDeleteUser?.(pendingDeletion.id); setPendingDeletion(null); }} className="manager-delete-confirm">Удалить</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
