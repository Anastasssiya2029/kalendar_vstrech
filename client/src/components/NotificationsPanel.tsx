import React, { useState, useMemo } from 'react';
import { Bell, Clock, UserPlus, CheckCircle, AlertCircle, X, Calendar } from 'lucide-react';
import { Meeting, Client } from '../types';
import { format, differenceInMinutes, differenceInHours, isPast, isFuture } from 'date-fns';
import { ru } from 'date-fns/locale';

interface Notification {
  id: string;
  type: 'upcoming' | 'new_client' | 'needs_result' | 'overdue';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  relatedId?: string;
  priority: 'high' | 'medium' | 'low';
}

interface NotificationsPanelProps {
  meetings: Meeting[];
  clients: Client[];
  currentUserRole: string;
  onClose: () => void;
}

export function NotificationsPanel({ meetings, clients, currentUserRole, onClose }: NotificationsPanelProps) {
  const [readNotifications, setReadNotifications] = useState<Set<string>>(new Set());
  const [filterType, setFilterType] = useState<'all' | 'upcoming' | 'new_client' | 'needs_result' | 'overdue'>('all');

  // Генерируем уведомления на основе данных
  const notifications = useMemo(() => {
    const notifs: Notification[] = [];
    const now = new Date();

    // Предстоящие встречи (за 1 час и за 24 часа)
    meetings
      .filter(m => m.status === 'scheduled' && isFuture(new Date(m.date)))
      .forEach(meeting => {
        const meetingDate = new Date(meeting.date);
        const minutesUntil = differenceInMinutes(meetingDate, now);
        const hoursUntil = differenceInHours(meetingDate, now);

        if (minutesUntil > 0 && minutesUntil <= 60) {
          notifs.push({
            id: `upcoming-1h-${meeting.id}`,
            type: 'upcoming',
            title: 'Встреча через час!',
            message: `Встреча с ${meeting.clientName} в ${format(meetingDate, 'HH:mm', { locale: ru })}`,
            timestamp: new Date(now.getTime() - (60 - minutesUntil) * 60000),
            read: readNotifications.has(`upcoming-1h-${meeting.id}`),
            relatedId: meeting.id,
            priority: 'high'
          });
        } else if (hoursUntil > 1 && hoursUntil <= 24) {
          notifs.push({
            id: `upcoming-24h-${meeting.id}`,
            type: 'upcoming',
            title: 'Встреча завтра',
            message: `Встреча с ${meeting.clientName} ${format(meetingDate, 'd MMMM в HH:mm', { locale: ru })}`,
            timestamp: new Date(now.getTime() - (24 - hoursUntil) * 3600000),
            read: readNotifications.has(`upcoming-24h-${meeting.id}`),
            relatedId: meeting.id,
            priority: 'medium'
          });
        }
      });

    // Новые клиенты (для помощника и менеджера)
    if (currentUserRole === 'assistant' || currentUserRole === 'manager') {
      clients
        .filter(c => {
          const createdAt = new Date(c.createdAt);
          const hoursSinceCreated = differenceInHours(now, createdAt);
          return hoursSinceCreated <= 24;
        })
        .forEach(client => {
          notifs.push({
            id: `new-client-${client.id}`,
            type: 'new_client',
            title: 'Новый клиент',
            message: `${client.name} ${client.phone}`,
            timestamp: new Date(client.createdAt),
            read: readNotifications.has(`new-client-${client.id}`),
            relatedId: client.id,
            priority: 'medium'
          });
        });
    }

    // Встречи требующие отметки результата (для менеджера)
    if (currentUserRole === 'manager') {
      meetings
        .filter(m => {
          const meetingDate = new Date(m.date);
          return m.status === 'scheduled' && isPast(meetingDate);
        })
        .forEach(meeting => {
          notifs.push({
            id: `needs-result-${meeting.id}`,
            type: 'needs_result',
            title: 'Требуется отметить результат',
            message: `Встреча с ${meeting.clientName} состоялась`,
            timestamp: new Date(meeting.date),
            read: readNotifications.has(`needs-result-${meeting.id}`),
            relatedId: meeting.id,
            priority: 'high'
          });
        });
    }

    // Просроченные встречи (старше 3 дней без результата)
    meetings
      .filter(m => {
        const meetingDate = new Date(m.date);
        const daysSince = differenceInHours(now, meetingDate) / 24;
        return m.status === 'scheduled' && daysSince > 3;
      })
      .forEach(meeting => {
        notifs.push({
          id: `overdue-${meeting.id}`,
          type: 'overdue',
          title: 'Просроченная встреча',
          message: `Встреча с ${meeting.clientName} от ${format(new Date(meeting.date), 'd MMMM', { locale: ru })} не отмечена`,
          timestamp: new Date(meeting.date),
          read: readNotifications.has(`overdue-${meeting.id}`),
          relatedId: meeting.id,
          priority: 'high'
        });
      });

    // Сортируем по приоритету и времени
    return notifs.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return b.timestamp.getTime() - a.timestamp.getTime();
    });
  }, [meetings, clients, currentUserRole, readNotifications]);

  const filteredNotifications = useMemo(() => {
    if (filterType === 'all') return notifications;
    return notifications.filter(n => n.type === filterType);
  }, [notifications, filterType]);

  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n.read).length;
  }, [notifications]);

  const markAsRead = (notificationId: string) => {
    setReadNotifications(prev => new Set([...prev, notificationId]));
  };

  const markAllAsRead = () => {
    setReadNotifications(new Set(notifications.map(n => n.id)));
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'upcoming':
        return <Clock className="w-5 h-5" />;
      case 'new_client':
        return <UserPlus className="w-5 h-5" />;
      case 'needs_result':
        return <CheckCircle className="w-5 h-5" />;
      case 'overdue':
        return <AlertCircle className="w-5 h-5" />;
    }
  };

  const getNotificationColor = (type: Notification['type']) => {
    switch (type) {
      case 'upcoming':
        return 'from-blue-500 to-cyan-500';
      case 'new_client':
        return 'from-purple-500 to-pink-500';
      case 'needs_result':
        return 'from-orange-500 to-red-500';
      case 'overdue':
        return 'from-red-500 to-rose-600';
    }
  };

  const getNotificationBgColor = (type: Notification['type']) => {
    switch (type) {
      case 'upcoming':
        return 'from-blue-50 to-cyan-50';
      case 'new_client':
        return 'from-purple-50 to-pink-50';
      case 'needs_result':
        return 'from-orange-50 to-red-50';
      case 'overdue':
        return 'from-red-50 to-rose-50';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-end p-4 md:p-6">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col animate-slide-in">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center relative">
                <Bell className="w-6 h-6 text-white" />
                {unreadCount > 0 && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">{unreadCount}</span>
                  </div>
                )}
              </div>
              <div>
                <h2>Уведомления</h2>
                <p className="text-sm text-gray-600">{unreadCount} непрочитанных</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Фильтры */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                filterType === 'all'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Все ({notifications.length})
            </button>
            <button
              onClick={() => setFilterType('upcoming')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                filterType === 'upcoming'
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Предстоящие
            </button>
            <button
              onClick={() => setFilterType('new_client')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                filterType === 'new_client'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Клиенты
            </button>
            {currentUserRole === 'manager' && (
              <button
                onClick={() => setFilterType('needs_result')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  filterType === 'needs_result'
                    ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Результаты
              </button>
            )}
          </div>

          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="mt-3 text-sm text-purple-600 hover:text-purple-700 font-semibold"
            >
              Отметить все как прочитанные
            </button>
          )}
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Bell className="w-16 h-16 mb-4 opacity-20" />
              <p className="text-lg font-semibold">Нет уведомлений</p>
              <p className="text-sm">Все в порядке!</p>
            </div>
          ) : (
            filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => markAsRead(notification.id)}
                className={`p-4 rounded-2xl cursor-pointer transition-all hover:shadow-lg ${
                  notification.read
                    ? 'bg-gray-50 border border-gray-200'
                    : `bg-gradient-to-r ${getNotificationBgColor(notification.type)} border-2 border-${notification.priority === 'high' ? 'red' : 'purple'}-200`
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getNotificationColor(notification.type)} flex items-center justify-center text-white flex-shrink-0`}>
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className="font-semibold text-gray-900 text-sm">
                        {notification.title}
                      </h4>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-purple-600 rounded-full flex-shrink-0 mt-1" />
                      )}
                    </div>
                    <p className="text-sm text-gray-700 mb-2">
                      {notification.message}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Calendar className="w-3 h-3" />
                      <span>
                        {format(notification.timestamp, 'd MMMM, HH:mm', { locale: ru })}
                      </span>
                      {notification.priority === 'high' && (
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-semibold">
                          Важно
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
