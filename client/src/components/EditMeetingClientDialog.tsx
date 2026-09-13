import React, { useState, useEffect } from 'react';
import { Client, Meeting, getMeetingStatusText } from '../types';
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
import { Calendar, Clock, Edit2, RefreshCw, XCircle } from 'lucide-react';
import { MeetingCancellationDialog } from './MeetingCancellationDialog';

interface EditMeetingClientDialogProps {
  client: Client | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (clientId: string, data: Partial<Client>) => void;
  meetings?: Meeting[];
  onRescheduleMeeting?: (meeting: Meeting) => void;
  onCancelMeeting?: (meeting: Meeting) => void;
}

export function EditMeetingClientDialog({ 
  client,
  open, 
  onOpenChange, 
  onSave,
  meetings = [],
  onRescheduleMeeting,
  onCancelMeeting,
}: EditMeetingClientDialogProps) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    username: '',
    comment: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [meetingToCancel, setMeetingToCancel] = useState<Meeting | null>(null);

  // Загружаем данные клиента при открытии
  useEffect(() => {
    if (client) {
      setFormData({
        firstName: client.firstName,
        lastName: client.lastName,
        username: client.username,
        comment: client.comment || ''
      });
      setErrors({});
    }
  }, [client]);

  if (!client) return null;

  const clientMeetings = meetings
    .filter((meeting) => meeting.clientId === client.id)
    .sort((a, b) => b.date.getTime() - a.date.getTime() || b.startTime.localeCompare(a.startTime));

  const formatDate = (date: Date) => new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);

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

    // Сохраняем изменения
    onSave(client.id, {
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      username: formData.username.trim(),
      comment: formData.comment.trim() || undefined,
      updatedAt: new Date()
    });

    onOpenChange(false);
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
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="client-editor-dialog">
        <DialogHeader className="client-editor-header">
          <div className="client-editor-heading">
            <div className="client-editor-icon">
              <Edit2 className="w-5 h-5 text-white" />
            </div>
            <div className="client-editor-heading-copy">
              <DialogTitle className="client-editor-title">Редактировать клиента</DialogTitle>
              <DialogDescription className="client-editor-description">
                Обновите информацию о клиенте
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="client-editor-form">
          <div className="client-editor-name-grid">
            <div className="client-editor-field">
              <Label htmlFor="edit-firstName" className="text-gray-700 font-semibold">
                Имя *
              </Label>
              <Input
                id="edit-firstName"
                value={formData.firstName}
                onChange={(e) => handleChange('firstName', e.target.value)}
                placeholder="Иван"
                className={`client-editor-input ${errors.firstName ? 'client-editor-input-error' : ''}`}
              />
              {errors.firstName && (
                <p className="client-editor-error">{errors.firstName}</p>
              )}
            </div>

            <div className="client-editor-field">
              <Label htmlFor="edit-lastName" className="text-gray-700 font-semibold">
                Фамилия *
              </Label>
              <Input
                id="edit-lastName"
                value={formData.lastName}
                onChange={(e) => handleChange('lastName', e.target.value)}
                placeholder="Иванов"
                className={`client-editor-input ${errors.lastName ? 'client-editor-input-error' : ''}`}
              />
              {errors.lastName && (
                <p className="client-editor-error">{errors.lastName}</p>
              )}
            </div>
          </div>

          <div className="client-editor-field">
            <Label htmlFor="edit-username" className="text-gray-700 font-semibold">
              Username (Telegram) *
            </Label>
            <Input
              id="edit-username"
              value={formData.username}
              onChange={(e) => handleChange('username', e.target.value)}
              placeholder="@username"
              className={`client-editor-input ${errors.username ? 'client-editor-input-error' : ''}`}
            />
            {errors.username && (
              <p className="client-editor-error">{errors.username}</p>
            )}
          </div>

          <section className="client-editor-meetings" aria-labelledby="client-editor-meetings-title">
            <div className="client-editor-meetings-heading">
              <div>
                <p className="client-editor-section-kicker">История</p>
                <h3 id="client-editor-meetings-title">Встречи клиента</h3>
              </div>
              <span>{clientMeetings.length}</span>
            </div>

            {clientMeetings.length === 0 ? (
              <p className="client-editor-meetings-empty">Записей о встречах пока нет.</p>
            ) : (
              <div className="client-editor-meetings-list">
                {clientMeetings.map((meeting) => {
                  const canManage = meeting.status === 'scheduled' || meeting.status === 'scheduled_ready';
                  return (
                    <article className={`client-editor-meeting client-editor-meeting--${meeting.status}`} key={meeting.id}>
                      <div>
                        <p className="client-editor-meeting-date">
                          <Calendar className="w-3.5 h-3.5" />{formatDate(meeting.date)}
                          <Clock className="w-3.5 h-3.5" />{meeting.startTime}
                        </p>
                        <p className="client-editor-meeting-manager">{meeting.managerName}</p>
                      </div>
                      <div className="client-editor-meeting-side">
                        <span className="client-editor-meeting-status">{getMeetingStatusText(meeting.status)}</span>
                        {canManage && (onRescheduleMeeting || onCancelMeeting) && (
                          <div className="client-editor-meeting-actions">
                            {onRescheduleMeeting && (
                              <Button
                                type="button"
                                variant="outline"
                                className="client-editor-meeting-reschedule"
                                onClick={() => {
                                  onOpenChange(false);
                                  onRescheduleMeeting(meeting);
                                }}
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                                Перенести
                              </Button>
                            )}
                            {onCancelMeeting && (
                              <Button
                                type="button"
                                variant="outline"
                                className="client-editor-meeting-cancel"
                                onClick={() => setMeetingToCancel(meeting)}
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                Отменить
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <div className="client-editor-field">
            <Label htmlFor="edit-comment" className="text-gray-700 font-semibold">
              Комментарий <span className="client-editor-optional">(необязательно)</span>
            </Label>
            <Textarea
              id="edit-comment"
              value={formData.comment}
              onChange={(e) => handleChange('comment', e.target.value)}
              placeholder="Дополнительная информация о клиенте..."
              rows={3}
              className="client-editor-input client-editor-textarea"
            />
          </div>

          <div className="client-editor-actions">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="client-editor-cancel"
            >
              Отмена
            </Button>
            <Button
              type="submit"
              className="brand-primary-button client-editor-save"
            >
              <Edit2 className="w-4 h-4 mr-2" />
              Сохранить
            </Button>
          </div>
        </form>
      </DialogContent>
      <MeetingCancellationDialog
        meeting={meetingToCancel}
        client={client}
        open={!!meetingToCancel}
        onOpenChange={(open) => !open && setMeetingToCancel(null)}
        onConfirm={(meeting) => onCancelMeeting?.(meeting)}
      />
    </Dialog>
  );
}
