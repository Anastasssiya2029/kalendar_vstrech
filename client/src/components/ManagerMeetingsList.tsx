import React, { useState } from 'react';
import { Meeting, Client, MeetingStatus, getMeetingStatusColor, getMeetingStatusText } from '../types';
import { Button } from './ui/button';
import { Calendar, Clock, User, FileText, DollarSign, CheckCircle, XCircle, CalendarClock, Filter as FilterIcon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { MeetingCancellationDialog } from './MeetingCancellationDialog';

interface ManagerMeetingsListProps {
  meetings: Meeting[];
  clients: Client[];
  onMarkCompleted: (meeting: Meeting) => void;
  onMarkWithSale: (meeting: Meeting) => void;
  onCancel: (meeting: Meeting) => void;
  onReschedule: (meeting: Meeting) => void;
}

const formatDateShort = (date: Date): string => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}.${month}.${date.getFullYear()}`;
};

const formatDateLong = (date: Date): string => {
  const months = [
    'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
    'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
  ];
  const weekdays = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  
  const day = date.getDate();
  const month = months[date.getMonth()];
  const weekday = weekdays[date.getDay()];
  
  return `${weekday}, ${day} ${month}`;
};

const isFutureMeeting = (meeting: Meeting): boolean => {
  const now = new Date();
  const meetingDateTime = new Date(meeting.date);
  const [hours, minutes] = meeting.startTime.split(':').map(Number);
  meetingDateTime.setHours(hours, minutes, 0, 0);
  return meetingDateTime > now;
};

const isPastMeeting = (meeting: Meeting): boolean => {
  const now = new Date();
  const meetingDateTime = new Date(meeting.date);
  // Встреча длится 1 час от startTime
  const [hours, minutes] = meeting.startTime.split(':').map(Number);
  meetingDateTime.setHours(hours + 1, minutes, 0, 0); // +1 час от времени начала
  return meetingDateTime < now;
};

export function ManagerMeetingsList({ 
  meetings, 
  clients,
  onMarkCompleted,
  onMarkWithSale,
  onCancel,
  onReschedule
}: ManagerMeetingsListProps) {
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState<MeetingStatus | 'all' | 'upcoming'>('upcoming');
  const [managerFilter, setManagerFilter] = useState<string>('all');
  const [meetingToCancel, setMeetingToCancel] = useState<Meeting | null>(null);

  // Получить клиента по ID
  const getClient = (clientId: string) => {
    return clients.find(c => c.id === clientId);
  };

  // Подсчет встреч по статусам
  const statusCounts = {
    all: meetings.length,
    upcoming: meetings.filter(m => m.status === 'scheduled' && isFutureMeeting(m)).length,
    scheduled: meetings.filter(m => m.status === 'scheduled').length,
    completed: meetings.filter(m => m.status === 'completed').length,
    completed_with_sale: meetings.filter(m => m.status === 'completed_with_sale').length,
    cancelled: meetings.filter(m => m.status === 'cancelled').length,
    rescheduled: meetings.filter(m => m.status === 'rescheduled').length,
  };

  // Получить уникальных менеджеров
  const uniqueManagers = Array.from(new Set(meetings.map(m => m.managerName)));

  // Фильтрация встреч
  const filteredMeetings = meetings.filter(meeting => {
    // Фильтр по статусу
    if (statusFilter === 'all') {
      // Продолжаем
    } else if (statusFilter === 'upcoming') {
      if (meeting.status !== 'scheduled' || !isFutureMeeting(meeting)) {
        return false;
      }
    } else {
      if (meeting.status !== statusFilter) {
        return false;
      }
    }
    
    // Фильтр по менеджеру (только для не-менеджеров)
    if (user?.role !== 'manager' && managerFilter !== 'all') {
      if (meeting.managerName !== managerFilter) {
        return false;
      }
    }
    
    return true;
  });

  // Сортировка: сначала предстоящие, потом прошедшие
  const sortedMeetings = [...filteredMeetings].sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    return dateB.getTime() - dateA.getTime(); // Новые сверху
  });

  // Динамический заголовок в зависимости от роли
  const pageTitle = user?.role === 'manager' ? 'Мои встречи' : 'Все встречи';
  const showManagerFilter = user?.role !== 'manager' && uniqueManagers.length > 1;

  return (
    <div className="space-y-6">
      {/* Заголовок и фильтры */}
      <div className="bg-white rounded-3xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2>{pageTitle}</h2>
              <p className="text-gray-600 text-sm">Всего: {meetings.length}</p>
            </div>
          </div>
        </div>

        {/* Фильтр по менеджеру (только для архитектора/админа/помощника) */}
        {showManagerFilter && (
          <div className="mb-4 pb-4 border-b border-gray-200">
            <div className="flex items-center gap-2 flex-wrap">
              <User className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600 mr-2">Менеджер:</span>
              
              <button
                onClick={() => setManagerFilter('all')}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  managerFilter === 'all'
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Все менеджеры
              </button>
              
              {uniqueManagers.map(managerName => (
                <button
                  key={managerName}
                  onClick={() => setManagerFilter(managerName)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                    managerFilter === managerName
                      ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg'
                      : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                  }`}
                >
                  {managerName}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Фильтры по статусу */}
        <div className="flex items-center gap-2 flex-wrap">
          <FilterIcon className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-600 mr-2">Показать:</span>
          
          <button
            onClick={() => setStatusFilter('upcoming')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              statusFilter === 'upcoming'
                ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg'
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
            }`}
          >
            🔜 Предстоящие ({statusCounts.upcoming})
          </button>
          
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              statusFilter === 'all'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Все ({statusCounts.all})
          </button>
          
          <button
            onClick={() => setStatusFilter('completed')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              statusFilter === 'completed'
                ? 'bg-green-600 text-white shadow-lg'
                : 'bg-green-50 text-green-700 hover:bg-green-100'
            }`}
          >
            🟢 Проведены ({statusCounts.completed})
          </button>

          <button
            onClick={() => setStatusFilter('rescheduled')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              statusFilter === 'rescheduled'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
            }`}
          >
            ↪ Перенесены ({statusCounts.rescheduled})
          </button>
          
          <button
            onClick={() => setStatusFilter('completed_with_sale')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              statusFilter === 'completed_with_sale'
                ? 'bg-purple-600 text-white shadow-lg'
                : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
            }`}
          >
            🟣 С продажей ({statusCounts.completed_with_sale})
          </button>
          
          <button
            onClick={() => setStatusFilter('cancelled')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              statusFilter === 'cancelled'
                ? 'bg-gray-600 text-white shadow-lg'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Отменены ({statusCounts.cancelled})
          </button>
        </div>
      </div>

      {/* Список встреч */}
      {sortedMeetings.length === 0 ? (
        <div className="text-center py-12 bg-gradient-to-br from-gray-50 to-gray-100 rounded-3xl border-2 border-dashed border-gray-300">
          <Calendar className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 text-lg">
            {statusFilter === 'upcoming' 
              ? 'У вас нет предстоящих встреч' 
              : 'Нет встреч с выбранным статусом'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedMeetings.map(meeting => {
            const client = getClient(meeting.clientId);
            if (!client) return null;

            const statusColor = getMeetingStatusColor(meeting.status);
            const statusText = getMeetingStatusText(meeting.status);
            const isUpcoming = isFutureMeeting(meeting);
            const isPast = isPastMeeting(meeting);
            const canMarkResult = meeting.status === 'scheduled' && isPast;

            return (
              <div 
                key={meeting.id}
                className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-300"
              >
                <div className="p-6">
                  {/* Заголовок */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4 flex-1">
                      {/* Аватар клиента */}
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg">
                        {client.firstName[0]}{client.lastName[0]}
                      </div>

                      {/* Информация о клиенте */}
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-800">
                          {client.firstName} {client.lastName}
                        </h3>
                        <p className="text-sm text-gray-600">{client.username}</p>
                      </div>
                    </div>

                    {/* Статус */}
                    <span 
                      className="px-3 py-1 rounded-lg text-sm font-semibold text-white"
                      style={{ backgroundColor: statusColor }}
                    >
                      {statusText}
                    </span>
                  </div>

                  {/* Детали встречи */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 rounded-lg p-3">
                      <Calendar className="w-4 h-4 text-purple-600" />
                      <span>{formatDateLong(meeting.date)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 rounded-lg p-3">
                      <Clock className="w-4 h-4 text-purple-600" />
                      <span>{meeting.startTime}</span>
                    </div>
                    {isUpcoming && (
                      <div className="flex items-center gap-2 text-sm font-semibold text-blue-700 bg-blue-50 rounded-lg p-3">
                        <CalendarClock className="w-4 h-4" />
                        <span>Предстоящая</span>
                      </div>
                    )}
                  </div>

                  {/* Информация о продаже */}
                  {meeting.status === 'completed_with_sale' && meeting.soldTariff && (
                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-200 mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="w-5 h-5 text-purple-600" />
                        <span className="font-bold text-purple-900">Продажа</span>
                      </div>
                      <p className="text-sm text-purple-800">
                        <strong>Тариф:</strong> {meeting.soldTariff}
                      </p>
                      {meeting.saleAmount && (
                        <p className="text-sm text-purple-800">
                          <strong>Сумма:</strong> {meeting.saleAmount.toLocaleString('ru-RU')} ₽
                        </p>
                      )}
                      {meeting.paymentMethod && (
                        <p className="text-xs text-purple-700 mt-1">
                          <strong>Способ оплаты:</strong> {
                            meeting.paymentMethod === 'link' ? 'По ссылке' :
                            meeting.paymentMethod === 'invoice' ? 'По счету' :
                            meeting.paymentMethod === 'bank_installment' ? 'Рассрочка от банка' :
                            meeting.paymentMethod === 'internal_installment' ? 'Внутренняя рассрочка' :
                            'Не указан'
                          }
                        </p>
                      )}
                    </div>
                  )}

                  {/* Заметки */}
                  {meeting.notes && (
                    <div className="bg-gray-50 rounded-xl p-3 mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="w-4 h-4 text-gray-600" />
                        <span className="font-semibold text-gray-700 text-sm">Заметки:</span>
                      </div>
                      <p className="text-sm text-gray-700">{meeting.notes}</p>
                    </div>
                  )}

                  {/* Комментарий клиента */}
                  {client.comment && (
                    <div className="bg-blue-50 rounded-xl p-3 mb-4">
                      <p className="text-sm text-blue-800">
                        <strong>О клиенте:</strong> {client.comment}
                      </p>
                    </div>
                  )}

                  {/* Действия для запланированной встречи */}
                  {meeting.status === 'scheduled' && (
                    <div className="flex gap-2 pt-4 border-t border-gray-200">
                      {canMarkResult && (
                        <>
                          <Button
                            onClick={() => onMarkCompleted(meeting)}
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Проведена
                          </Button>
                          <Button
                            onClick={() => onMarkWithSale(meeting)}
                            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                          >
                            <DollarSign className="w-4 h-4 mr-2" />
                            С продажей
                          </Button>
                        </>
                      )}
                      <Button
                        onClick={() => onReschedule(meeting)}
                        variant="outline"
                        className="flex-1 border-blue-500 text-blue-700 hover:bg-blue-50"
                      >
                        <CalendarClock className="w-4 h-4 mr-2" />
                        Перенести
                      </Button>
                      <Button
                        onClick={() => setMeetingToCancel(meeting)}
                        variant="outline"
                        className="flex-1 border-red-500 text-red-700 hover:bg-red-50"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Отменить
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <MeetingCancellationDialog
        meeting={meetingToCancel}
        client={meetingToCancel ? getClient(meetingToCancel.clientId) : null}
        open={!!meetingToCancel}
        onOpenChange={(open) => !open && setMeetingToCancel(null)}
        onConfirm={onCancel}
      />
    </div>
  );
}
