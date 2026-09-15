import React, { useState } from 'react';
import { Client, ClientStatus, Meeting, getCurrentClientMeeting, getLatestClientStatus } from '../types';
import { MeetingClientCard } from './MeetingClientCard';
import { Input } from './ui/input';
import { Users, Clock, Calendar, CheckCircle, DollarSign, XCircle, Search, RefreshCw } from 'lucide-react';

interface MeetingClientListProps {
  clients: Client[];
  onEdit?: (client: Client) => void;
  onToggleFormCompleted?: (clientId: string) => void;
  onRescheduleMeeting?: (meeting: any) => void;
  onCancelMeeting?: (meeting: Meeting) => void;
  onMarkSale?: (clientId: string, soldTariff: string, saleAmount: number) => void;
  onTogglePin?: (clientId: string) => void;
  onSelectTimeForClient?: (clientId: string) => void;
  onDeleteClient?: (clientId: string) => void;
  meetings?: Meeting[];
}

export function MeetingClientList({ clients, onEdit, onToggleFormCompleted, onRescheduleMeeting, onCancelMeeting, onMarkSale, onTogglePin, onSelectTimeForClient, onDeleteClient, meetings = [] }: MeetingClientListProps) {
  type ClientListStatus = Exclude<ClientStatus, 'ready'> | 'rescheduled' | 'all';
  const [statusFilter, setStatusFilter] = useState<ClientListStatus>('all');
  const [usernameSearch, setUsernameSearch] = useState('');

  // Перенос — это событие встречи, а не отдельное состояние записи клиента.
  // Отображаем его как понятный фильтр, сохраняя историю и актуальное время встречи.
  const isRescheduledClient = (client: Client) => {
    const current = getCurrentClientMeeting(client, meetings);
    return Boolean(current && (current.status === 'scheduled' || current.status === 'scheduled_ready') &&
      ((current.rescheduleHistory?.length ?? 0) > 0 || meetings.some(meeting => meeting.rescheduledToMeetingId === current.id)));
  };
  const isScheduledClient = (client: Client) =>
    (getLatestClientStatus(client, meetings) === 'scheduled' || getLatestClientStatus(client, meetings) === 'ready') && !isRescheduledClient(client);

  // Поиск идёт по Telegram-никнейму: менеджер может быстро найти клиента для повторной записи.
  const normalizedSearch = usernameSearch.trim().toLocaleLowerCase('ru-RU');
  const searchMatchedClients = normalizedSearch
    ? clients.filter(client => client.username.toLocaleLowerCase('ru-RU').includes(normalizedSearch))
    : clients;
  const filteredClients = statusFilter === 'all'
    ? searchMatchedClients
    : statusFilter === 'rescheduled'
      ? searchMatchedClients.filter(isRescheduledClient)
      : statusFilter === 'scheduled'
        ? searchMatchedClients.filter(isScheduledClient)
        : searchMatchedClients.filter(client => getLatestClientStatus(client, meetings) === statusFilter);

  // Сортировка:
  // 1. Закрепленные клиенты (pinned) - всегда наверху (кроме отмененных)
  // 2. Выбор времени (selecting_time) - высокий приоритет
  // 3. Записан, перенесена, проведена
  // 4. Встречи с продажами (completed_with_sale)
  // 5. Отмененные встречи (cancelled) - всегда внизу
  const sortedClients = [...filteredClients].sort((a, b) => {
    // Отмененные встречи всегда внизу
    const aStatus = getLatestClientStatus(a, meetings);
    const bStatus = getLatestClientStatus(b, meetings);
    if (aStatus === 'cancelled' && bStatus !== 'cancelled') return 1;
    if (aStatus !== 'cancelled' && bStatus === 'cancelled') return -1;
    
    // Если оба отменены, закрепленные среди отмененных тоже выше
    if (aStatus === 'cancelled' && bStatus === 'cancelled') {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return 0;
    }
    
    // Среди не отмененных: сначала закрепленные
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    
    // "Выбор времени" - наивысший приоритет среди не закрепленных
    if (aStatus === 'selecting_time' && bStatus !== 'selecting_time') return -1;
    if (aStatus !== 'selecting_time' && bStatus === 'selecting_time') return 1;
    
    // Если оба "Выбор времени", сортируем старые первыми
    if (aStatus === 'selecting_time' && bStatus === 'selecting_time') {
      return a.createdAt.getTime() - b.createdAt.getTime();
    }
    
    // Для остальных статусов применяем обычную сортировку
    const statusOrder: Record<string, number> = { 
      'scheduled': 0, 
      'ready': 0,
      'completed': 1,
      'completed_with_sale': 2,
    };
    
    const statusDiff = (statusOrder[aStatus] ?? 99) - (statusOrder[bStatus] ?? 99);
    if (statusDiff !== 0) return statusDiff;
    
    return 0;
  });

  // Подсчет клиентов по статусам
  const statusCounts = {
    all: searchMatchedClients.length,
    selecting_time: searchMatchedClients.filter(c => getLatestClientStatus(c, meetings) === 'selecting_time').length,
    scheduled: searchMatchedClients.filter(isScheduledClient).length,
    rescheduled: searchMatchedClients.filter(isRescheduledClient).length,
    completed: searchMatchedClients.filter(c => getLatestClientStatus(c, meetings) === 'completed').length,
    completed_with_sale: searchMatchedClients.filter(c => getLatestClientStatus(c, meetings) === 'completed_with_sale').length,
    cancelled: searchMatchedClients.filter(c => getLatestClientStatus(c, meetings) === 'cancelled').length,
  };

  const statusFilters: Array<{
    value: Exclude<ClientListStatus, 'all'>;
    label: string;
    icon: React.ElementType;
    tone: string;
  }> = [
    { value: 'selecting_time', label: 'Выбор времени', icon: Clock, tone: 'selecting' },
    { value: 'scheduled', label: 'Записан', icon: Calendar, tone: 'scheduled' },
    { value: 'rescheduled', label: 'Перенесена', icon: RefreshCw, tone: 'rescheduled' },
    { value: 'completed', label: 'Проведена', icon: CheckCircle, tone: 'completed' },
    { value: 'completed_with_sale', label: 'С продажей', icon: DollarSign, tone: 'sale' },
    { value: 'cancelled', label: 'Отменена', icon: XCircle, tone: 'cancelled' },
  ];

  return (
    <div className="meeting-client-list space-y-6">
      {/* Заголовок и фильтры */}
      <div className="meeting-client-list-toolbar bg-white rounded-3xl shadow-lg p-6">
        <div className="meeting-client-list-heading flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2>Клиенты</h2>
              <p className="text-gray-600 text-sm">Всего: {clients.length}</p>
            </div>
          </div>
          <div className="client-username-search">
            <Search className="client-username-search-icon w-4 h-4" aria-hidden="true" />
            <Input
              type="search"
              value={usernameSearch}
              onChange={(event) => setUsernameSearch(event.target.value)}
              placeholder="Поиск по @username"
              aria-label="Поиск клиента по Telegram-никнейму"
              className="client-username-search-input"
            />
          </div>
        </div>

        {/* Фильтры по статусу */}
        <div className="client-status-filters flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setStatusFilter('all')}
            aria-pressed={statusFilter === 'all'}
            className={`client-status-filter status-filter--all ${statusFilter === 'all' ? 'is-active' : ''}`}
          >
            <span className="status-filter-icon" aria-hidden="true">
              <Users className="w-3.5 h-3.5" strokeWidth={2.1} />
            </span>
            <span>Все ({statusCounts.all})</span>
          </button>

          {statusFilters.map(({ value, label, icon: StatusIcon, tone }) => (
            <button
              key={value}
              onClick={() => setStatusFilter(value)}
              aria-pressed={statusFilter === value}
              className={`client-status-filter status-filter--${tone} ${statusFilter === value ? 'is-active' : ''}`}
            >
              <span className="status-filter-icon" aria-hidden="true">
                <StatusIcon className="w-3.5 h-3.5" strokeWidth={2.1} />
              </span>
              <span>{label} ({statusCounts[value]})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Список клиентов */}
      {sortedClients.length === 0 ? (
        <div className="client-list-empty text-center py-12">
          <p className="text-gray-700 text-lg font-semibold">
            {normalizedSearch
              ? 'Клиент с таким никнеймом не найден'
              : statusFilter === 'all' 
              ? 'У вас пока нет клиентов' 
              : `Нет клиентов с выбранным статусом`}
          </p>
          <p className="text-gray-500 mt-2">
            {normalizedSearch
              ? 'Проверьте написание @username или выберите другой статус.'
              : statusFilter === 'all'
              ? 'Добавьте первого клиента — он появится здесь.'
              : 'Попробуйте выбрать другой статус.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedClients.map(client => (
            <MeetingClientCard
              key={client.id}
              client={client}
              onEdit={onEdit}
              onToggleFormCompleted={onToggleFormCompleted}
              onRescheduleMeeting={onRescheduleMeeting}
              onCancelMeeting={onCancelMeeting}
              onMarkSale={onMarkSale}
              onTogglePin={onTogglePin}
              onSelectTimeForClient={onSelectTimeForClient}
              onDeleteClient={onDeleteClient}
              meetings={meetings}
            />
          ))}
        </div>
      )}
    </div>
  );
}
