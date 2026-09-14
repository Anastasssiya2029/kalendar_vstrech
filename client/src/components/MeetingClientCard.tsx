import React, { useState } from 'react';
import { Client, Meeting, getClientStatusColor, getClientStatusText, getMeetingStatusColor, getMeetingStatusText } from '../types';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Calendar, Clock, User, Edit2, Check, XCircle, RefreshCw, DollarSign, Pin, Trash2 } from 'lucide-react';
import { MeetingCancellationDialog } from './MeetingCancellationDialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';

interface MeetingClientCardProps {
  client: Client;
  onEdit?: (client: Client) => void;
  onToggleFormCompleted?: (clientId: string) => void;
  onRescheduleMeeting?: (meeting: any) => void;
  onCancelMeeting?: (meeting: Meeting) => void;
  onMarkSale?: (clientId: string, soldTariff: string, saleAmount: number) => void;
  onTogglePin?: (clientId: string) => void;
  onSelectTimeForClient?: (clientId: string) => void;
  onDeleteClient?: (clientId: string) => void;
}

const formatDateShort = (date: Date): string => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}.${month}.${date.getFullYear()}`;
};

const formatDateCompact = (date: Date): string => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);
  return `${day}.${month}.${year}`;
};

export function MeetingClientCard({ client, onEdit, onToggleFormCompleted, onRescheduleMeeting, onCancelMeeting, onMarkSale, onTogglePin, onSelectTimeForClient, onDeleteClient, meetings = [] }: MeetingClientCardProps & { meetings?: Meeting[] }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSaleForm, setShowSaleForm] = useState(false);
  const [saleData, setSaleData] = useState({
    soldTariff: '',
    saleAmount: ''
  });
  const [meetingToCancel, setMeetingToCancel] = useState<Meeting | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const clientMeetingsFromStore = meetings
    .filter((meeting) => meeting.clientId === client.id)
    .sort((a, b) => b.date.getTime() - a.date.getTime() || b.startTime.localeCompare(a.startTime));
  const clientMeetings = clientMeetingsFromStore.length > 0
    ? clientMeetingsFromStore
    : client.meeting ? [client.meeting] : [];
  const getHistoryStatusColor = (status: Meeting['status']) =>
    status === 'completed' ? '#ad5b1a' : getMeetingStatusColor(status);
  
  const hasRescheduleHistory = Boolean(
    client.meeting && (
      client.meeting.status === 'rescheduled' ||
      (client.meeting.rescheduleHistory?.length ?? 0) > 0
    ),
  );
  const statusColor = hasRescheduleHistory
    ? getMeetingStatusColor('rescheduled')
    : getClientStatusColor(client.status);
  const statusText = hasRescheduleHistory
    ? getMeetingStatusText('rescheduled')
    : getClientStatusText(client.status);
  const canScheduleRepeat = Boolean(
    client.meeting && ['completed', 'completed_with_sale'].includes(client.meeting.status),
  );

  return (
    <div className="meeting-client-card bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-300">
      {/* Заголовок карточки */}
      <div 
        className="meeting-client-card-header px-6 py-4 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="meeting-client-card-top flex items-center justify-between">
          {/* Информация о клиенте */}
          <div className="meeting-client-card-info flex items-center gap-4 flex-1">
            {/* Имя и статус */}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-gray-800">
                  {client.firstName} {client.lastName}
                </h3>
                {client.formCompleted && (
                  <div className="w-5 h-5 rounded-full bg-green-600 flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" strokeWidth={3} />
                  </div>
                )}
                {/* Индикатор перенесенной встречи */}
                {hasRescheduleHistory && client.meeting?.rescheduleHistory && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 rounded-lg">
                    <span className="text-lg">🙏</span>
                    <span className="text-xs font-semibold text-blue-700">
                      {client.meeting.rescheduleHistory.length}x
                    </span>
                  </div>
                )}
              </div>
              <div className="meeting-client-card-meta flex items-center gap-2 mt-1">
                <span className="text-sm text-gray-600">{client.username}</span>
                <span 
                  className="px-2 py-0.5 rounded-full text-xs font-semibold text-white opacity-80"
                  style={{ backgroundColor: statusColor }}
                >
                  {statusText}
                </span>
                <span className="text-gray-400">•</span>
                <span className="text-xs text-gray-500">
                  {formatDateCompact(client.createdAt)}
                </span>
                {/* Дата встречи для записанных клиентов */}
                {client.meeting && (client.status === 'scheduled' || client.status === 'ready') && (
                  <>
                    <span className="text-gray-400">•</span>
                    <span className="text-xs text-gray-700 font-medium">
                      Дата встречи: {formatDateCompact(client.meeting.date)}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Кнопки действий */}
          <div className="meeting-client-card-actions flex items-center gap-2">
            {onTogglePin && (
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onTogglePin(client.id);
                }}
                variant="ghost"
                size="sm"
                className={`${
                  client.pinned 
                    ? 'text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50' 
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                }`}
                title={client.pinned ? 'Открепить' : 'Закрепить'}
              >
                <Pin className={`w-4 h-4 ${client.pinned ? 'fill-yellow-600' : ''}`} />
              </Button>
            )}
            
            {onEdit && (
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(client);
                }}
                variant="ghost"
                size="sm"
                className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
              >
                <Edit2 className="w-4 h-4" />
              </Button>
            )}

            {onDeleteClient && (
              <Button
                onClick={(event) => {
                  event.stopPropagation();
                  setIsDeleteDialogOpen(true);
                }}
                variant="ghost"
                size="sm"
                className="meeting-client-delete-action"
                title="Удалить клиента"
                aria-label={`Удалить клиента ${client.firstName} ${client.lastName}`}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
            
            {/* Индикатор раскрытия */}
            <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" className="text-gray-400">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Развернутое содержимое */}
      {isExpanded && (
        <div className="meeting-client-card-details px-6 pb-4 border-t border-gray-100 pt-4 space-y-4">
          {/* Комментарий */}
          {client.comment && (
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-sm text-gray-700">
                <strong>Комментарий:</strong> {client.comment}
              </p>
            </div>
          )}

          {/* Чекбокс "Анкета заполнена" */}
          {onToggleFormCompleted && (
            <div 
              className="meeting-client-form-check"
              onClick={() => onToggleFormCompleted(client.id)}
            >
              <div className={`meeting-client-form-checkpoint ${
                client.formCompleted 
                  ? 'is-completed' 
                  : ''
              }`}>
                {client.formCompleted && (
                  <Check className="w-3 h-3 text-white" strokeWidth={3} />
                )}
              </div>
              <span className="text-sm font-semibold text-gray-700">
                Анкета заполнена
              </span>
            </div>
          )}

          {/* Кнопка "Подобрать время" для клиентов со статусом "Выбор времени" */}
          {(client.status === 'selecting_time' || client.status === 'cancelled') && onSelectTimeForClient && (
            <div className="flex justify-center">
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectTimeForClient(client.id);
                }}
                className="bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 hover:from-purple-700 hover:via-pink-700 hover:to-purple-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-400 hover:scale-105 px-6"
              >
                <Clock className="w-4 h-4 mr-2" />
                {client.status === 'cancelled' ? 'Подобрать новое время' : 'Подобрать время'}
              </Button>
            </div>
          )}

          {canScheduleRepeat && onSelectTimeForClient && (
            <div className="flex justify-center">
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectTimeForClient(client.id);
                }}
                variant="outline"
                className="client-repeat-meeting-button"
              >
                <Calendar className="w-4 h-4 mr-2" />
                Записать повторно
              </Button>
            </div>
          )}

          {/* Информация о встрече */}
          {client.meeting && (
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-purple-900">Встреча</h4>
                  {/* Индикатор перенесенной встречи */}
                  {hasRescheduleHistory && client.meeting.rescheduleHistory && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 rounded-lg">
                      <span className="text-lg">🙏</span>
                      <span className="text-xs font-semibold text-blue-700">
                        {client.meeting.rescheduleHistory.length}x
                      </span>
                    </div>
                  )}
                </div>
                <span 
                  className="px-3 py-1 rounded-lg text-xs font-semibold text-white"
                  style={{ backgroundColor: getMeetingStatusColor(client.meeting.status) }}
                >
                  {getMeetingStatusText(client.meeting.status)}
                </span>
              </div>

              <div className="space-y-2">
                {/* Дата и время */}
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Calendar className="w-4 h-4 text-purple-600" />
                  <span>{formatDateShort(client.meeting.date)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Clock className="w-4 h-4 text-purple-600" />
                  <span>{client.meeting.startTime}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <User className="w-4 h-4 text-purple-600" />
                  <span>{client.meeting.managerName}</span>
                </div>

                {/* Причина переноса */}
                {hasRescheduleHistory && client.meeting.rescheduleHistory && client.meeting.rescheduleHistory.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-purple-200">
                    <div className="bg-blue-50 rounded-lg p-3">
                      <p className="text-sm text-blue-900 mb-1">
                        <strong>Причина переноса:</strong>
                      </p>
                      {client.meeting.rescheduleHistory.map((history, index) => (
                        <div key={index} className="text-sm text-blue-700">
                          <span className="text-blue-500">•</span> {history.reason}
                          {(client.meeting?.rescheduleHistory?.length ?? 0) > 1 && (
                            <span className="text-xs text-blue-600 ml-1">
                              ({formatDateShort(history.oldDate)} → {formatDateShort(history.newDate)})
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Информация о продаже */}
                {client.meeting.status === 'completed_with_sale' && client.meeting.soldTariff && (
                  <div className="mt-3 pt-3 border-t border-purple-200">
                    <p className="text-sm font-semibold text-purple-900">
                      Продан тариф: {client.meeting.soldTariff}
                    </p>
                    {client.meeting.saleAmount && (
                      <p className="text-sm text-purple-700">
                        Сумма: {client.meeting.saleAmount.toLocaleString('ru-RU')} ₽
                      </p>
                    )}
                    {client.meeting.paymentMethod && (
                      <p className="text-xs text-purple-600 mt-1">
                        Способ оплаты: {
                          client.meeting.paymentMethod === 'link' ? 'По ссылке' :
                          client.meeting.paymentMethod === 'invoice' ? 'По счету' :
                          client.meeting.paymentMethod === 'bank_installment' ? 'Рассрочка от банка' :
                          client.meeting.paymentMethod === 'internal_installment' ? 'Внутренняя рассрочка' :
                          'Не указан'
                        }
                      </p>
                    )}
                  </div>
                )}

                {/* Заметки */}
                {client.meeting.notes && (
                  <div className="mt-3 pt-3 border-t border-purple-200">
                    <p className="text-sm text-gray-700">
                      <strong>Заметки:</strong> {client.meeting.notes}
                    </p>
                  </div>
                )}

                {/* Кнопки управления встречей */}
                {client.meeting.status === 'scheduled' && onRescheduleMeeting && (
                  <div className="mt-3 pt-3 border-t border-purple-200 flex gap-2">
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRescheduleMeeting(client.meeting);
                      }}
                      variant="outline"
                      size="sm"
                      className="flex-1 text-blue-600 border-blue-300 hover:bg-blue-50"
                    >
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Перенести
                    </Button>
                    {onCancelMeeting && (
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          setMeetingToCancel(client.meeting!);
                        }}
                        variant="outline"
                        size="sm"
                        className="flex-1 text-rose-700 border-rose-200 hover:bg-rose-50"
                      >
                        <XCircle className="w-3 h-3 mr-1" />
                        Отменить
                      </Button>
                    )}
                  </div>
                )}

                {/* Кнопка переноса для отмененных встреч */}
                {client.meeting.status === 'cancelled' && onRescheduleMeeting && (
                  <div className="mt-3 pt-3 border-t border-purple-200">
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRescheduleMeeting(client.meeting);
                      }}
                      variant="outline"
                      size="sm"
                      className="w-full text-blue-600 border-blue-300 hover:bg-blue-50"
                    >
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Перенести встречу
                    </Button>
                  </div>
                )}

                {/* Форма отметки продажи для проведенных встреч */}
                {client.meeting.status === 'completed' && onMarkSale && (
                  <div className="mt-3 pt-3 border-t border-purple-200">
                    {!showSaleForm ? (
                      <Button
                        onClick={() => {
                          setShowSaleForm(true);
                        }}
                        variant="outline"
                        size="sm"
                        className="w-full text-green-600 border-green-300 hover:bg-green-50 hover:text-green-600"
                      >
                        <DollarSign className="w-4 h-4 mr-2" />
                        Отметить продажу
                      </Button>
                    ) : (
                      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200 space-y-3">
                        <h5 className="font-semibold text-green-900 text-sm">Данные о продаже</h5>
                        
                        <div className="space-y-2">
                          <Label htmlFor="tariff" className="text-gray-700 text-xs">
                            Название тарифа *
                          </Label>
                          <Input
                            id="tariff"
                            value={saleData.soldTariff}
                            onChange={(e) => setSaleData({ ...saleData, soldTariff: e.target.value })}
                            placeholder="Базовый / Стандарт / Премиум"
                            className="bg-white rounded-xl border-green-200"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="amount" className="text-gray-700 text-xs">
                            Сумма (₽) *
                          </Label>
                          <Input
                            id="amount"
                            type="number"
                            value={saleData.saleAmount}
                            onChange={(e) => setSaleData({ ...saleData, saleAmount: e.target.value })}
                            placeholder="15000"
                            className="bg-white rounded-xl border-green-200"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>

                        <div className="flex gap-2 pt-2">
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowSaleForm(false);
                              setSaleData({ soldTariff: '', saleAmount: '' });
                            }}
                            variant="outline"
                            size="sm"
                            className="flex-1 text-gray-600 border-gray-300"
                          >
                            Отмена
                          </Button>
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (saleData.soldTariff && saleData.saleAmount) {
                                onMarkSale(client.id, saleData.soldTariff, parseFloat(saleData.saleAmount));
                                setShowSaleForm(false);
                                setSaleData({ soldTariff: '', saleAmount: '' });
                              }
                            }}
                            size="sm"
                            disabled={!saleData.soldTariff || !saleData.saleAmount}
                            className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
                          >
                            <Check className="w-4 h-4 mr-1" />
                            Сохранить
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {clientMeetings.length > 0 && (
            <section className="client-meeting-history" aria-labelledby={`client-meetings-${client.id}`}>
              <div className="client-meeting-history-heading">
                <div>
                  <p>История записей</p>
                  <h4 id={`client-meetings-${client.id}`}>Встречи клиента</h4>
                </div>
                <span>{clientMeetings.length}</span>
              </div>
              <div className="client-meeting-history-list">
                {clientMeetings.map((meeting) => {
                  const isManageable = meeting.status === 'scheduled' || meeting.status === 'scheduled_ready';
                  return (
                    <article className={`client-meeting-history-item client-meeting-history-item--${meeting.status}`} key={meeting.id}>
                      <div className="client-meeting-history-main">
                        <div className="client-meeting-history-date">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDateShort(meeting.date)}
                          <Clock className="w-3.5 h-3.5" />
                          {meeting.startTime}
                        </div>
                        <p>{meeting.managerName}</p>
                        {client.formCompleted && (meeting.status === 'scheduled' || meeting.status === 'scheduled_ready') && (
                          <span className="client-meeting-history-form"><Check className="w-3 h-3" />Анкета заполнена</span>
                        )}
                      </div>
                      <div className="client-meeting-history-side">
                        <span className="client-meeting-history-status" style={{ backgroundColor: getHistoryStatusColor(meeting.status) }}>
                          {getMeetingStatusText(meeting.status)}
                        </span>
                        {isManageable && (onRescheduleMeeting || onCancelMeeting) && (
                          <div className="client-meeting-history-actions">
                            {onRescheduleMeeting && (
                              <Button type="button" variant="outline" size="sm" className="client-meeting-history-reschedule" onClick={() => onRescheduleMeeting(meeting)}>
                                <RefreshCw className="w-3.5 h-3.5" />Перенести
                              </Button>
                            )}
                            {onCancelMeeting && (
                              <Button type="button" variant="outline" size="sm" className="client-meeting-history-cancel" onClick={() => setMeetingToCancel(meeting)}>
                                <XCircle className="w-3.5 h-3.5" />Отменить
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          )}

          {/* Предложенные окошки */}
          {client.suggestedSlots && client.suggestedSlots.length > 0 && (
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-200">
              <h4 className="font-bold text-blue-900 mb-2">Предложенные варианты</h4>
              <div className="space-y-2">
                {client.suggestedSlots.slice(0, 3).map((slot, index) => (
                  <div key={slot.id} className="flex items-center justify-between text-sm bg-white rounded-lg p-2">
                    <div>
                      <span className="font-semibold text-gray-800">{formatDateShort(slot.date)}</span>
                      <span className="text-gray-600 ml-2">{slot.startTime}</span>
                    </div>
                    <span className="text-xs text-gray-500">{slot.managerName}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Метаданные */}
          <div className="text-xs text-gray-500 pt-2 border-t border-gray-100">
            Создан: {formatDateShort(client.createdAt)}
            {client.updatedAt && client.updatedAt.getTime() !== client.createdAt.getTime() && (
              <> • Обновлен: {formatDateShort(client.updatedAt)}</>
            )}
          </div>
        </div>
      )}

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="client-delete-dialog">
          <DialogHeader className="client-delete-dialog-header">
            <div className="client-delete-dialog-icon"><Trash2 className="w-5 h-5" /></div>
            <div className="client-delete-dialog-copy">
              <p className="client-delete-dialog-eyebrow">Удаление клиента</p>
              <DialogTitle>Удалить клиента?</DialogTitle>
              <DialogDescription className="client-delete-dialog-description">
                Карточка <strong>{client.firstName} {client.lastName}</strong>, связанные встречи и записи будут удалены. Свободные окошки снова станут доступными.
              </DialogDescription>
            </div>
          </DialogHeader>
          <div className="client-delete-dialog-actions">
            <Button type="button" variant="outline" onClick={() => setIsDeleteDialogOpen(false)} className="client-delete-dialog-cancel">Отмена</Button>
            <Button type="button" onClick={() => { onDeleteClient?.(client.id); setIsDeleteDialogOpen(false); }} className="client-delete-dialog-confirm">Удалить клиента</Button>
          </div>
        </DialogContent>
      </Dialog>
      <MeetingCancellationDialog
        meeting={meetingToCancel}
        client={client}
        open={!!meetingToCancel}
        onOpenChange={(open) => !open && setMeetingToCancel(null)}
        onConfirm={(meeting) => onCancelMeeting?.(meeting)}
      />
    </div>
  );
}
