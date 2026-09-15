import React, { useState } from 'react';
import { Meeting, Client, Tariff, PaymentMethod, getActualMeetingStatus, getMeetingStatusColor, getMeetingStatusText } from '../types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { User, Clock, MessageSquare, TrendingUp, DollarSign, Calendar, CheckCircle, RefreshCw, XCircle, Check } from 'lucide-react';
import { MeetingResultDialog } from './MeetingResultDialog';
import { MeetingCancellationDialog } from './MeetingCancellationDialog';
import { useAuth } from '../contexts/AuthContext';
import { TelegramUsername } from './TelegramUsername';

interface DayDetailsDialogProps {
  day: number;
  month: number;
  year: number;
  meetings: Meeting[];
  clients: Client[];
  onClose: () => void;
  onStatusChange?: (meetingId: string, newStatus: 'completed' | 'completed_with_sale' | 'cancelled', soldTariff?: string, saleAmount?: number, paymentMethod?: PaymentMethod) => void;
  onUpdateNotes?: (meetingId: string, notes: string) => void;
  onRescheduleMeeting?: (meeting: Meeting) => void;
  availableTariffs?: Tariff[];
}

export function DayDetailsDialog({ 
  day,
  month,
  year,
  meetings, 
  clients, 
  onClose,
  onStatusChange,
  onUpdateNotes,
  onRescheduleMeeting,
  availableTariffs
}: DayDetailsDialogProps) {
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [showResultDialog, setShowResultDialog] = useState(false);
  const [resultMode, setResultMode] = useState<'completed' | 'with_sale'>('completed');
  const [editingNotesFor, setEditingNotesFor] = useState<string | null>(null);
  const [notesText, setNotesText] = useState<string>('');
  const [meetingToCancel, setMeetingToCancel] = useState<Meeting | null>(null);
  const { user } = useAuth();

  // Получить клиента по ID
  const getClient = (clientId: string) => {
    return clients.find(c => c.id === clientId);
  };

  // Форматирование даты
  const formatDate = () => {
    const date = new Date(year, month, day);
    const days = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
    const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
    
    return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  // Сортировка встреч по времени
  const sortedMeetings = [...meetings].sort((a, b) => {
    return a.startTime.localeCompare(b.startTime);
  });

  const handleMarkCompleted = (meeting: Meeting) => {
    setSelectedMeeting(meeting);
    setShowResultDialog(true);
    setResultMode('completed');
  };

  const handleSaveMeetingResult = (meetingId: string, result: {
    status: 'completed' | 'completed_with_sale';
    notes?: string;
    soldTariff?: string;
    saleAmount?: number;
    paymentMethod?: PaymentMethod;
  }) => {
    onStatusChange?.(meetingId, result.status, result.soldTariff, result.saleAmount, result.paymentMethod);
    setShowResultDialog(false);
    setSelectedMeeting(null);
  };

  const getMeetingCardColor = (status: Meeting['status']) =>
    status === 'completed' ? '#ad5b1a' : getMeetingStatusColor(status);

  const handleEditNotes = (meetingId: string) => {
    setEditingNotesFor(meetingId);
    const meeting = meetings.find(m => m.id === meetingId);
    if (meeting) {
      setNotesText(meeting.notes || '');
    }
  };

  const handleSaveNotes = () => {
    if (editingNotesFor && onUpdateNotes) {
      onUpdateNotes(editingNotesFor, notesText);
      setEditingNotesFor(null);
    }
  };

  const getMeetingTone = (status: Meeting['status']) => {
    switch (status) {
      case 'completed': return 'completed';
      case 'completed_with_sale': return 'sale';
      case 'rescheduled': return 'rescheduled';
      case 'cancelled': return 'cancelled';
      default: return 'scheduled';
    }
  };

  return (
    <>
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="meeting-details-dialog">
          <DialogHeader className="meeting-details-dialog-header">
            <DialogTitle className="meeting-details-dialog-title">
              <span className="meeting-details-dialog-icon" aria-hidden="true">
                <Calendar className="w-5 h-5" />
              </span>
              <div className="meeting-details-dialog-heading">
                <p className="meeting-details-dialog-eyebrow">Календарь встреч</p>
                <h2>Встречи на день</h2>
                <p className="meeting-details-dialog-date">{formatDate()}</p>
              </div>
            </DialogTitle>
            <DialogDescription className="sr-only">
              Список всех встреч запланированных на выбранный день с возможностью управления их статусами
            </DialogDescription>
          </DialogHeader>

          <div className="meeting-details-dialog-body">
            {sortedMeetings.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Clock className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p>На этот день нет запланированных встреч</p>
              </div>
            ) : (
              sortedMeetings.map(meeting => {
                const client = getClient(meeting.clientId);
                if (!client) return null;

                const rescheduleCount = meeting.rescheduleHistory?.length || 0;
                const actualStatus = getActualMeetingStatus(meeting, client);
                const isActionable = actualStatus === 'scheduled' || actualStatus === 'scheduled_ready';

                return (
                  <div 
                    key={meeting.id}
                    className={`meeting-detail-card meeting-detail-card--${getMeetingTone(actualStatus)}`}
                  >
                    {/* Заголовок карточки с цветом статуса */}
                    <div className="meeting-detail-card-header flex items-start justify-between mb-3">
                      <div className="meeting-detail-card-title flex items-center gap-3">
                          <div 
                            className="meeting-detail-status-dot"
                          style={{ backgroundColor: getMeetingCardColor(actualStatus) }}
                        />
                        <div>
                          <h3 className="meeting-detail-client-name">
                            {client.firstName} {client.lastName}
                          </h3>
                          <p className="meeting-detail-status">{getMeetingStatusText(actualStatus)}</p>
                          {client.formCompleted && (
                            <span className="meeting-detail-form-completed">
                              <Check className="w-3.5 h-3.5" strokeWidth={2.8} />
                              Анкета заполнена
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Индикатор переносов */}
                      {rescheduleCount > 0 && (
                        <div className="meeting-detail-reschedule">
                          <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                          <span className="text-sm font-semibold text-blue-700">
                            Перенос ×{rescheduleCount}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Детали встречи */}
                    <div className="meeting-detail-meta-grid grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                      {/* Юзернейм */}
                      <div className="meeting-detail-meta meeting-detail-meta--client">
                        <User className="w-4 h-4" />
                        <TelegramUsername username={client.username} className="text-sm text-gray-700" />
                      </div>

                      {/* Время */}
                      <div className="meeting-detail-meta meeting-detail-meta--time">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm font-semibold text-gray-900">{meeting.startTime}</span>
                      </div>

                      {/* Менеджер */}
                      <div className="meeting-detail-meta meeting-detail-meta--manager">
                        <TrendingUp className="w-4 h-4" />
                        <span className="text-sm text-gray-700">
                          <span className="font-semibold">Менеджер:</span> {meeting.managerName}
                        </span>
                      </div>

                      {/* Продажа (если есть) */}
                      {actualStatus === 'completed_with_sale' && meeting.soldTariff && (
                        <div className="meeting-detail-sale">
                          <div className="meeting-detail-sale-title">
                            <DollarSign className="w-4 h-4" />
                            <span>
                              {meeting.soldTariff} - {meeting.saleAmount?.toLocaleString()} ₽
                            </span>
                          </div>
                          {meeting.paymentMethod && (
                            <div className="meeting-detail-sale-method">
                              Способ оплаты: {
                                meeting.paymentMethod === 'link' ? 'По ссылке' :
                                meeting.paymentMethod === 'invoice' ? 'По счету' :
                                meeting.paymentMethod === 'bank_installment' ? 'Рассрочка от банка' :
                                meeting.paymentMethod === 'internal_installment' ? 'Внутренняя рассрочка' :
                                'Не указан'
                              }
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Комментарий к клиенту */}
                    {client.comment && (
                      <div className="meeting-detail-comment">
                        <div className="flex items-start gap-2">
                          <MessageSquare className="w-4 h-4 text-gray-600 mt-0.5" />
                          <div className="flex-1">
                            <p className="meeting-detail-comment-label">Комментарий менеджера по перепискам</p>
                            <p className="text-sm text-gray-700">{client.comment}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Заметки к встрече */}
                    {editingNotesFor === meeting.id ? (
                      <div className="meeting-detail-notes-form">
                        <div className="flex items-start gap-2">
                          <MessageSquare className="meeting-detail-notes-icon w-4 h-4 mt-0.5" />
                          <div className="flex-1">
                            <p className="meeting-detail-notes-label">Заметка после встречи</p>
                            <textarea
                              value={notesText}
                              onChange={(e) => setNotesText(e.target.value)}
                              className="meeting-detail-notes-input"
                              rows={3}
                              placeholder="Введите заметки о встрече..."
                            />
                            <div className="flex gap-2 mt-2">
                              <Button
                                onClick={handleSaveNotes}
                                className="meeting-detail-notes-save"
                                size="sm"
                              >
                                Сохранить
                              </Button>
                              <Button
                                onClick={() => setEditingNotesFor(null)}
                                variant="outline"
                                className="meeting-detail-notes-cancel"
                                size="sm"
                              >
                                Отменить
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : meeting.notes ? (
                      <div className="meeting-detail-notes">
                        <div className="flex items-start gap-2">
                          <MessageSquare className="meeting-detail-notes-icon w-4 h-4 mt-0.5" />
                          <div className="flex-1">
                            <p className="meeting-detail-notes-label">Заметка после встречи</p>
                            <p className="meeting-detail-notes-text">{meeting.notes}</p>
                          </div>
                          <Button
                            onClick={() => handleEditNotes(meeting.id)}
                            variant="ghost"
                            size="sm"
                            className="meeting-detail-notes-edit"
                          >
                            Изменить
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="mb-3">
                        <Button
                          onClick={() => handleEditNotes(meeting.id)}
                          variant="outline"
                          size="sm"
                          className="meeting-detail-notes-add"
                        >
                          <MessageSquare className="w-4 h-4 mr-2" />
                          Добавить заметку к встрече
                        </Button>
                      </div>
                    )}

                    {/* Действия доступны для запланированной встречи. */}
                    {isActionable ? (
                      <div className="meeting-detail-actions">
                        <Button
                          onClick={() => handleMarkCompleted(meeting)}
                          className="meeting-detail-action meeting-detail-action--completed"
                          size="sm"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Встреча проведена
                        </Button>
                        <Button
                          onClick={() => {
                            setSelectedMeeting(meeting);
                            setResultMode('with_sale');
                            setShowResultDialog(true);
                          }}
                          className="meeting-detail-action meeting-detail-action--sale"
                          size="sm"
                        >
                          <DollarSign className="w-4 h-4 mr-1" />
                          С продажей
                        </Button>
                        {onRescheduleMeeting && (
                          <Button
                            onClick={() => {
                              onRescheduleMeeting(meeting);
                              onClose();
                            }}
                            variant="outline"
                            className="meeting-detail-action meeting-detail-action--rescheduled"
                            size="sm"
                          >
                            <Calendar className="w-4 h-4 mr-2" />
                            Перенести встречу
                          </Button>
                        )}
                        <Button
                          onClick={() => setMeetingToCancel(meeting)}
                          variant="outline"
                          className="meeting-detail-action meeting-detail-action--cancelled"
                          size="sm"
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Отменить
                        </Button>
                      </div>
                    ) : actualStatus === 'completed' ? (
                      <div className="space-y-2">
                        <div className="meeting-detail-status-summary">
                          Статус: {getMeetingStatusText(actualStatus)}
                        </div>
                        <Button
                          onClick={() => {
                            setSelectedMeeting(meeting);
                            setResultMode('with_sale');
                            setShowResultDialog(true);
                          }}
                          className="meeting-detail-action meeting-detail-action--sale"
                          size="sm"
                        >
                          <DollarSign className="w-4 h-4 mr-2" />
                          Отметить продажу
                        </Button>
                      </div>
                    ) : actualStatus === 'cancelled' ? (
                      <div className="space-y-2">
                        <div className="meeting-detail-status-summary">
                          Статус: {getMeetingStatusText(actualStatus)}
                        </div>
                        {onRescheduleMeeting && (
                          <Button
                            onClick={() => {
                              onRescheduleMeeting(meeting);
                              onClose();
                            }}
                            variant="outline"
                            className="meeting-detail-action meeting-detail-action--rescheduled"
                            size="sm"
                          >
                            <Calendar className="w-4 h-4 mr-2" />
                            Перенести встречу
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="meeting-detail-status-summary">
                        Статус: {getMeetingStatusText(actualStatus)}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      <MeetingCancellationDialog
        meeting={meetingToCancel}
        client={meetingToCancel ? getClient(meetingToCancel.clientId) : null}
        open={!!meetingToCancel}
        onOpenChange={(open) => !open && setMeetingToCancel(null)}
        onConfirm={(meeting) => onStatusChange?.(meeting.id, 'cancelled')}
      />

      {/* Диалог отметки результата встречи */}
      {showResultDialog && selectedMeeting && (() => {
        const selectedClient = getClient(selectedMeeting.clientId);
        return (
          <MeetingResultDialog
            meeting={selectedMeeting}
            client={selectedClient || null}
            open={showResultDialog}
            onOpenChange={(open) => {
              setShowResultDialog(open);
              if (!open) setSelectedMeeting(null);
            }}
            onSave={handleSaveMeetingResult}
            mode={resultMode}
            availableTariffs={availableTariffs || []}
          />
        );
      })()}
    </>
  );
}
