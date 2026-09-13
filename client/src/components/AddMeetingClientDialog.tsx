import React, { useState } from 'react';
import { Client } from '../types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { UserPlus } from 'lucide-react';

interface AddMeetingClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddClient: (client: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>) => void;
  schoolId: string;
  existingClients?: Client[];
  onOpenExistingClient?: (client: Client) => void;
}

export function AddMeetingClientDialog({ 
  open, 
  onOpenChange, 
  onAddClient,
  schoolId,
  existingClients = [],
  onOpenExistingClient,
}: AddMeetingClientDialogProps) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    username: '',
    comment: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [duplicateClient, setDuplicateClient] = useState<Client | null>(null);

  const normalizeUsername = (username: string) => username
    .trim()
    .replace(/^@+/, '')
    .toLocaleLowerCase('ru-RU');

  const resetForm = () => {
    setFormData({ firstName: '', lastName: '', username: '', comment: '' });
    setErrors({});
    setDuplicateClient(null);
  };

  const addNewClient = () => {
    const newClient: Omit<Client, 'id' | 'createdAt' | 'updatedAt'> = {
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      username: formData.username.trim(),
      comment: formData.comment.trim() || undefined,
      status: 'selecting_time',
      formCompleted: false,
      schoolId,
    };

    onAddClient(newClient);
    resetForm();
    onOpenChange(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Валидация
    const newErrors: Record<string, string> = {};
    
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'Введите имя';
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Введите фамилию';
    }
    if (!formData.username.trim()) {
      newErrors.username = 'Введите username';
    } else if (!formData.username.startsWith('@')) {
      newErrors.username = 'Username должен начинаться с @';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const normalizedUsername = normalizeUsername(formData.username);
    const duplicate = normalizedUsername
      ? existingClients.find((client) => normalizeUsername(client.username) === normalizedUsername)
      : undefined;

    if (duplicate) {
      setDuplicateClient(duplicate);
      return;
    }

    addNewClient();
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Убираем ошибку при изменении поля
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
    if (field === 'username') setDuplicateClient(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="client-create-dialog">
        <DialogHeader className="client-create-header">
          <div className="client-create-heading">
            <div className="client-create-icon">
              <UserPlus className="w-5 h-5 text-white" />
            </div>
            <div className="client-create-heading-copy">
              <DialogTitle className="client-create-title">
                Добавить клиента
              </DialogTitle>
              <DialogDescription className="client-create-description">
                Заполните основную информацию о новом клиенте
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="client-create-form">
          <div className="client-create-name-grid">
            <div className="client-create-field">
              <Label htmlFor="firstName">Имя *</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => handleChange('firstName', e.target.value)}
                placeholder="Иван"
                autoFocus
                className={`client-create-input ${errors.firstName ? 'border-red-500' : ''}`}
              />
              {errors.firstName && <p className="text-red-600 text-sm">{errors.firstName}</p>}
            </div>

            <div className="client-create-field">
              <Label htmlFor="lastName">Фамилия *</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => handleChange('lastName', e.target.value)}
                placeholder="Иванов"
                className={`client-create-input ${errors.lastName ? 'border-red-500' : ''}`}
              />
              {errors.lastName && <p className="text-red-600 text-sm">{errors.lastName}</p>}
            </div>
          </div>

          <div className="client-create-field">
            <Label htmlFor="username">Username в Telegram *</Label>
            <Input
              id="username"
              value={formData.username}
              onChange={(e) => handleChange('username', e.target.value)}
              placeholder="@username"
              className={`client-create-input ${errors.username ? 'border-red-500' : ''}`}
            />
            {errors.username && <p className="text-red-600 text-sm">{errors.username}</p>}
          </div>

          <div className="client-create-field">
            <Label htmlFor="comment">
              Комментарий менеджера по перепискам: (необязательно)
            </Label>
            <Textarea
              id="comment"
              value={formData.comment}
              onChange={(e) => handleChange('comment', e.target.value)}
              placeholder="Дополнительная информация о клиенте..."
              rows={3}
              className="client-create-input resize-none"
            />
          </div>

          <div className="client-create-note">
            <p>
              <strong>Стартовый статус:</strong> «Выбор времени»
            </p>
          </div>

          {duplicateClient && (
            <div className="client-create-duplicate" role="status">
              <div>
                <p className="client-create-duplicate-title">Такой клиент уже есть</p>
                <p className="client-create-duplicate-copy">
                  В базе уже есть {duplicateClient.firstName} {duplicateClient.lastName} с никнеймом {duplicateClient.username}.
                </p>
              </div>
              <div className="client-create-duplicate-actions">
                {onOpenExistingClient && (
                  <Button
                    type="button"
                    variant="outline"
                    className="client-create-open-existing"
                    onClick={() => {
                      onOpenExistingClient(duplicateClient);
                      resetForm();
                      onOpenChange(false);
                    }}
                  >
                    Открыть карточку
                  </Button>
                )}
                <Button type="button" className="client-create-add-anyway" onClick={addNewClient}>
                  Добавить нового
                </Button>
              </div>
            </div>
          )}

          <div className="client-create-actions">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetForm();
                onOpenChange(false);
              }}
              className="client-create-cancel"
            >
              Отмена
            </Button>
            <Button
              type="submit"
              className="client-create-submit brand-primary-button"
            >
              <UserPlus className="w-4 h-4" />
              Добавить
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
