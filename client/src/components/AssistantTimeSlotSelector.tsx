import React, { useState, useEffect } from 'react';
import { Client, TimeSlot, TimeSlotFilter, DayType, TimeOfDay, Meeting, getDayType, getTimeOfDay } from '../types';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Calendar, CalendarDays, Clock, User, Copy, CheckCircle, Filter as FilterIcon, Search, Minus, ChevronDown, Sun, CloudSun, Moon, ClipboardList, Send, X } from 'lucide-react';
import { toast } from 'sonner';
import { copyToClipboard } from '../utils/clipboard';

interface AssistantTimeSlotSelectorProps {
  clients: Client[];
  timeSlots: TimeSlot[];
  onBookSlot: (clientId: string, slot: TimeSlot) => Promise<void>;
  onProvideSlots?: (clientId: string, slotIds: string[]) => void;
  onCloseCancelledClient?: (clientId: string) => void;
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
  const weekdays = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
  
  const day = date.getDate();
  const month = months[date.getMonth()];
  const weekday = weekdays[date.getDay()];
  
  return `${weekday}, ${day} ${month}`;
};

const formatDateForClientOffer = (date: Date): string => {
  const months = [
    'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
    'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
  ];
  const weekdays = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];

  return `${date.getDate()} ${months[date.getMonth()]}, ${weekdays[date.getDay()]}`;
};

const formatDateForInput = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export function AssistantTimeSlotSelector({ 
  clients, 
  timeSlots,
  onBookSlot,
  onProvideSlots,
  onCloseCancelledClient,
}: AssistantTimeSlotSelectorProps) {
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [filters, setFilters] = useState<TimeSlotFilter>({});
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [clientViewMode, setClientViewMode] = useState<boolean>(false);
  const [excludedSlotIds, setExcludedSlotIds] = useState<Set<string>>(new Set());
  const [isManagerDropdownOpen, setIsManagerDropdownOpen] = useState(false);
  const [managerDropdownButtonRef, setManagerDropdownButtonRef] = useState<HTMLButtonElement | null>(null);
  const [isBooking, setIsBooking] = useState(false);
  const [clientViewText, setClientViewText] = useState('');

  // Функция для подсчета таблеток (количество клиентов, которым предоставлено это окошко)
  const getSlotPillCount = (slotId: string): number => {
    return clients.filter(c => 
      c.id !== selectedClientId && // Не считаем текущего клиента
      c.providedSlotIds?.includes(slotId)
    ).length;
  };

  // Функция для переключения исключения окошка
  const toggleSlotExclusion = (slotId: string) => {
    setExcludedSlotIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(slotId)) {
        newSet.delete(slotId);
      } else {
        newSet.add(slotId);
      }
      return newSet;
    });
  };

  // Слушаем событие выбора клиента из карточки
  useEffect(() => {
    const handleSelectClient = (event: CustomEvent) => {
      const { clientId } = event.detail;
      if (clientId) {
        setSelectedClientId(clientId);
      }
    };

    window.addEventListener('selectClientForAssistant', handleSelectClient as EventListener);
    return () => {
      window.removeEventListener('selectClientForAssistant', handleSelectClient as EventListener);
    };
  }, []);

  // Сброс excludedSlotIds при смене клиента
  useEffect(() => {
    setExcludedSlotIds(new Set());
    setClientViewText('');
  }, [selectedClientId]);

  // Клиенты, которые ищут время, плюс явно выбранный клиент для повторной записи.
  // После отмены клиент тоже может сразу вернуться к подбору времени.
  const availableClients = clients.filter(c =>
    c.status === 'selecting_time' ||
    (c.status === 'cancelled' && !c.timeSelectionClosed) ||
    c.id === selectedClientId,
  );

  // Получить уникальных менеджеров из тайм-слотов
  const managers = Array.from(new Set(timeSlots.map(s => s.managerName)));

  // Фильтрация тайм-слотов
  const filteredSlots = timeSlots.filter(slot => {
    // Только свободные слоты
    if (slot.isBooked) return false;

    // Только будущие даты
    if (slot.date < new Date(new Date().setHours(0, 0, 0, 0))) return false;

    // Фильтр по типу дня (вычисляем динамически)
    if (filters.dayType) {
      const slotDayType = getDayType(slot.date);
      if (slotDayType !== filters.dayType) return false;
    }

    // Фильтр по времени суток (вычисляем динамически)
    if (filters.timeOfDay) {
      const slotTimeOfDay = getTimeOfDay(slot.startTime);
      if (slotTimeOfDay !== filters.timeOfDay) return false;
    }

    // Фильтр по менеджеру
    if (filters.managerId && slot.managerId !== filters.managerId) return false;

    // Фильтр по дате от
    if (filters.dateFrom && slot.date < filters.dateFrom) return false;

    // Фильтр по дате до
    if (filters.dateTo && slot.date > filters.dateTo) return false;

    return true;
  });

  // Группировка слотов по дате
  const groupedSlots = filteredSlots.reduce((acc, slot) => {
    const dateKey = formatDateShort(slot.date);
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(slot);
    return acc;
  }, {} as Record<string, TimeSlot[]>);

  // Сортировка дат
  const sortedDates = Object.keys(groupedSlots).sort((a, b) => {
    const [dayA, monthA, yearA] = a.split('.').map(Number);
    const [dayB, monthB, yearB] = b.split('.').map(Number);
    const dateA = new Date(yearA, monthA - 1, dayA);
    const dateB = new Date(yearB, monthB - 1, dayB);
    return dateA.getTime() - dateB.getTime();
  });

  // Формирование текста для копирования
  const generateTelegramText = (): string => {
    if (!selectedSlot) return '';

    const client = clients.find(c => c.id === selectedClientId);
    if (!client) return '';

    const dateStr = formatDateLong(selectedSlot.date);
    // Вычисляем endTime как +1 час от startTime
    const [hours, minutes] = selectedSlot.startTime.split(':').map(Number);
    const endHours = (hours + 1) % 24;
    const endTime = `${endHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    const timeStr = `${selectedSlot.startTime} - ${endTime}`;

    return `Здравствуйте, ${client.firstName}! 👋

Отлично! Подобрал для вас время на встречу с менеджером ${selectedSlot.managerName}:

📅 ${dateStr}
🕐 ${timeStr}

Вам подходит это время?`;
  };

  // Формирование текста для клиента (версия для клиента)
  const generateClientViewText = (): string => {
    const client = clients.find(c => c.id === selectedClientId);
    if (!client) return '';

    const availableOffers = sortedDates.flatMap(dateKey =>
      groupedSlots[dateKey]
        .filter(slot => !excludedSlotIds.has(slot.id))
        .sort((a, b) => a.startTime.localeCompare(b.startTime) || a.managerName.localeCompare(b.managerName))
    );

    let text = `${client.firstName}, из ближайших свободных тайм-слотов могу предложить:\n\n`;
    availableOffers.forEach((slot, index) => {
      text += `${index + 1}. ${formatDateForClientOffer(slot.date)} — ${slot.startTime}\n`;
    });

    text += `\n❗ На встречу закладывайте не менее 1,5 ч.\n\nКакое окошко вам подходит, на какое время вас записать?`;

    return text;
  };

  const handleCopyText = async () => {
    const text = generateTelegramText();
    const success = await copyToClipboard(text);
    
    if (success) {
      toast.success('Текст скопирован в буфер обмена!');
    } else {
      toast.error('Не удалось скопировать автоматически. Скопируйте текст вручную.');
    }
  };

  const handleCopyClientViewText = async () => {
    const text = clientViewText;
    const success = await copyToClipboard(text);
    
    if (success) {
      toast.success('Текст для клиента скопирован!');
    } else {
      toast.error('Не удалось скопировать автоматически.');
    }
  };

  const handleBookSlot = async () => {
    if (!selectedSlot || !selectedClientId || isBooking) return;
    setIsBooking(true);
    try {
      await onBookSlot(selectedClientId, selectedSlot);
      setSelectedClientId('');
      setFilters({});
      setSelectedSlot(null);
      setClientViewMode(false);
      toast.success('Клиент записан на встречу!');
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Не удалось забронировать окошко');
    } finally {
      setIsBooking(false);
    }
  };

  const handleProvideSlots = () => {
    if (!onProvideSlots || !selectedClientId) return;
    
    // Собираем все неисключенные окошки
    const slotsToProvide = filteredSlots
      .filter(slot => !excludedSlotIds.has(slot.id))
      .map(slot => slot.id);
    
    if (slotsToProvide.length === 0) {
      toast.error('Выберите хотя бы одно окошко для предоставления');
      return;
    }
    
    onProvideSlots(selectedClientId, slotsToProvide);
    toast.success(`Предоставлено ${slotsToProvide.length} окошек на выбор`);
  };

  const handleCloseCancelledClient = (client: Client) => {
    if (client.status !== 'cancelled' || !onCloseCancelledClient) return;
    onCloseCancelledClient(client.id);
    if (selectedClientId === client.id) {
      setSelectedClientId('');
      setSelectedSlot(null);
      setClientViewMode(false);
      setFilters({});
    }
    toast.success('Подбор времени для клиента закрыт');
  };

  const selectedClient = clients.find(c => c.id === selectedClientId);

  return (
    <div className="time-selector space-y-6">
      {/* Заголовок */}
      <div className="time-selector-section">
        <div className="flex items-center gap-3 mb-4">
          <div className="time-selector-heading-icon">
            <Search className="w-5 h-5" />
          </div>
          <div>
            <h2>Подбор времени</h2>
            <p className="text-gray-600 text-sm">Найдите подходящее окошко и запишите клиента</p>
          </div>
        </div>

        {/* Шаг 1: Выбор клиента */}
        <div className="space-y-3">
          <Label className="text-gray-700 font-semibold flex items-center gap-2">
            <User className="w-4 h-4" />
            Шаг 1: Выберите клиента
          </Label>
          
          {availableClients.length === 0 ? (
            <div className="time-selector-empty-note">
              <p className="text-gray-600 text-sm">
                Нет клиентов, ожидающих подбора времени
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {availableClients.map(client => (
                <div
                  key={client.id}
                  className={`time-selector-client ${selectedClientId === client.id ? 'is-selected' : ''}`}
                >
                  <button type="button" className="time-selector-client-select" onClick={() => setSelectedClientId(client.id)}>
                    <div className="flex items-center gap-3">
                      <div className="time-selector-client-avatar">
                        {client.firstName[0]}{client.lastName[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800 truncate">
                          {client.firstName} {client.lastName}
                        </p>
                        <p className="text-sm text-gray-600 truncate">{client.username}</p>
                      </div>
                    </div>
                  </button>
                  {client.status === 'cancelled' && onCloseCancelledClient && (
                    <button
                      type="button"
                      className="time-selector-client-close"
                      onClick={() => handleCloseCancelledClient(client)}
                      title="Закрыть подбор времени для этого клиента"
                    >
                      <X className="w-3.5 h-3.5" />
                      Закрыть подбор
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Шаг 2: Фильтры (показываем только если выбран клиент) */}
      {selectedClientId && (
        <div className="time-selector-section">
          <Label className="text-gray-700 font-semibold flex items-center gap-2 mb-4">
            <FilterIcon className="w-4 h-4" />
            Шаг 2: Настройте фильтры
          </Label>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Фильтр: Будни/Выходные */}
            <div className="space-y-2">
              <Label className="text-gray-600 text-sm">Тип дня</Label>
              <div className="time-selector-day-type-filters">
                <button
                  onClick={() => setFilters(prev => ({ ...prev, dayType: undefined }))}
                  className={`time-selector-filter-button ${!filters.dayType ? 'is-active' : ''}`}
                >
                  Все
                </button>
                <button
                  onClick={() => setFilters(prev => ({ ...prev, dayType: 'weekday' }))}
                  className={`time-selector-filter-button ${filters.dayType === 'weekday' ? 'is-active' : ''}`}
                >
                  <CalendarDays className="w-3.5 h-3.5" />
                  Будни
                </button>
                <button
                  onClick={() => setFilters(prev => ({ ...prev, dayType: 'weekend' }))}
                  className={`time-selector-filter-button ${filters.dayType === 'weekend' ? 'is-active' : ''}`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  Выходные
                </button>
              </div>
            </div>

            {/* Фильтр: Время суток */}
            <div className="space-y-2">
              <Label className="text-gray-600 text-sm">Время суток</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setFilters(prev => ({ ...prev, timeOfDay: undefined }))}
                  className={`time-selector-filter-button ${!filters.timeOfDay ? 'is-active' : ''}`}
                >
                  Все
                </button>
                <button
                  onClick={() => setFilters(prev => ({ ...prev, timeOfDay: 'morning' }))}
                  className={`time-selector-filter-button ${filters.timeOfDay === 'morning' ? 'is-active' : ''}`}
                >
                  <Sun className="w-3.5 h-3.5" />
                  Утро
                </button>
                <button
                  onClick={() => setFilters(prev => ({ ...prev, timeOfDay: 'afternoon' }))}
                  className={`time-selector-filter-button ${filters.timeOfDay === 'afternoon' ? 'is-active' : ''}`}
                >
                  <CloudSun className="w-3.5 h-3.5" />
                  День
                </button>
                <button
                  onClick={() => setFilters(prev => ({ ...prev, timeOfDay: 'evening' }))}
                  className={`time-selector-filter-button ${filters.timeOfDay === 'evening' ? 'is-active' : ''}`}
                >
                  <Moon className="w-3.5 h-3.5" />
                  Вечер
                </button>
              </div>
            </div>

            {/* Фильтр: Менеджер */}
            <div className="space-y-2 relative">
              <Label className="text-gray-600 text-sm">
                Менеджер
              </Label>
              <button
                ref={setManagerDropdownButtonRef}
                onClick={() => setIsManagerDropdownOpen(!isManagerDropdownOpen)}
                className="time-selector-manager-trigger"
              >
                <span className="text-sm">
                  {filters.managerId 
                    ? managers.find(m => timeSlots.find(s => s.managerName === m)?.managerId === filters.managerId) || 'Все менеджеры'
                    : 'Все менеджеры'}
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform text-gray-500 ${isManagerDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {isManagerDropdownOpen && managerDropdownButtonRef && (
                <>
                  <div 
                    className="fixed inset-0 z-[100]" 
                    onClick={() => setIsManagerDropdownOpen(false)}
                  />
                  <div 
                    className="time-selector-manager-menu fixed z-[101]"
                    style={{
                      top: `${managerDropdownButtonRef.getBoundingClientRect().bottom + 8}px`,
                      width: `${Math.min(Math.max(managerDropdownButtonRef.getBoundingClientRect().width, 200), window.innerWidth - 24)}px`,
                      left: `${Math.max(
                        12,
                        Math.min(
                          managerDropdownButtonRef.getBoundingClientRect().left,
                          window.innerWidth - Math.min(Math.max(managerDropdownButtonRef.getBoundingClientRect().width, 200), window.innerWidth - 24) - 12,
                        ),
                      )}px`,
                    }}
                  >
                    <div className="py-1 max-h-[300px] overflow-y-auto">
                      <button
                        onClick={() => {
                          setFilters(prev => ({ ...prev, managerId: undefined }));
                          setIsManagerDropdownOpen(false);
                        }}
                        className={`time-selector-manager-option ${
                          !filters.managerId ? 'is-selected' : ''
                        }`}
                      >
                        Все менеджеры
                      </button>
                      {managers.map(manager => {
                        const managerId = timeSlots.find(s => s.managerName === manager)?.managerId;
                        return (
                          <button
                            key={managerId}
                            onClick={() => {
                              setFilters(prev => ({ ...prev, managerId }));
                              setIsManagerDropdownOpen(false);
                            }}
                            className={`time-selector-manager-option ${
                              filters.managerId === managerId ? 'is-selected' : ''
                            }`}
                          >
                            {manager}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Фильтр: Дата от */}
            <div className="space-y-2">
              <Label htmlFor="date-from" className="text-gray-600 text-sm">
                Дата от
              </Label>
              <input
                id="date-from"
                type="date"
                value={filters.dateFrom ? formatDateForInput(filters.dateFrom) : ''}
                onChange={(e) => setFilters(prev => ({ 
                  ...prev, 
                  dateFrom: e.target.value ? new Date(e.target.value) : undefined 
                }))}
                min={formatDateForInput(new Date())}
                className="time-selector-date-input"
              />
            </div>
          </div>

          {/* Кнопка сброса фильтров */}
          {(filters.dayType || filters.timeOfDay || filters.managerId || filters.dateFrom) && (
            <div className="mt-4">
              <Button
                onClick={() => setFilters({})}
                variant="outline"
                size="sm"
                className="text-gray-600"
              >
                Сбросить фильтры
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Шаг 3: Результаты поиска */}
      {selectedClientId && (
        <div className="time-selector-section">
          <div className="time-selector-results-heading flex items-center justify-between gap-3 mb-4">
            <Label className="text-gray-700 font-semibold flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Шаг 3: Выберите окошко ({filteredSlots.length})
            </Label>
            <div className="flex items-center gap-3">
              {selectedSlot && (
                <span className="time-selector-selected-badge">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Выбрано окно
                </span>
              )}
            </div>
          </div>

          {/* Радиокнопка "Версия для клиента" */}
          {filteredSlots.length > 0 && (
            <div className="time-selector-mode-switch">
              <label className="time-selector-mode-option">
                <input
                  type="radio"
                  checked={!clientViewMode}
                  onChange={() => setClientViewMode(false)}
                  className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                />
                <span>Обычный режим</span>
              </label>
              <label className="time-selector-mode-option">
                <input
                  type="radio"
                  checked={clientViewMode}
                  onChange={() => {
                    setClientViewText(generateClientViewText());
                    setClientViewMode(true);
                  }}
                  className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                />
                <ClipboardList className="w-3.5 h-3.5" />
                <span>Версия для клиента</span>
              </label>
            </div>
          )}

          {filteredSlots.length === 0 ? (
            <div className="time-selector-empty-state">
              <Calendar className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 text-lg">Нет доступных окошек</p>
              <p className="text-gray-500 mt-2">Попробуйте изменить фильтры</p>
            </div>
          ) : clientViewMode ? (
            // Режим для клиента - компактный вывод
            <div className="space-y-4">
              <div className="time-selector-client-copy">
                <Label className="time-selector-client-copy-label">
                  Текст для отправки клиенту:
                </Label>
                <Textarea
                  value={clientViewText}
                  onChange={(event) => setClientViewText(event.target.value)}
                  className="time-selector-copy-text"
                  rows={Math.max(8, clientViewText.split('\n').length + 1)}
                  aria-label="Текст для отправки клиенту"
                />
                <div className="time-selector-copy-actions">
                  <Button
                    type="button"
                    onClick={handleCopyClientViewText}
                    className="time-selector-copy-button"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Скопировать текст
                  </Button>
                  {onProvideSlots && (
                    <Button
                      type="button"
                      onClick={handleProvideSlots}
                      className="time-selector-provide-button"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Предоставить клиенту выбор
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            // Обычный режим - выбор окошка
            <div className="time-selector-slots-list space-y-4 max-h-[500px] overflow-y-auto pr-2">
              {sortedDates.map(dateKey => {
                const slotsForDate = groupedSlots[dateKey].sort((a, b) => 
                  a.startTime.localeCompare(b.startTime)
                );
                const date = slotsForDate[0].date;

                return (
                  <div key={dateKey} className="time-selector-date-group">
                    <h4 className="time-selector-date-title">
                      {formatDateLong(date)}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {slotsForDate.map(slot => {
                        const pillCount = getSlotPillCount(slot.id);
                        const isExcluded = excludedSlotIds.has(slot.id);
                        
                        return (
                          <div key={slot.id} className="relative group">
                            <button
                              onClick={() => setSelectedSlot(selectedSlot?.id === slot.id ? null : slot)}
                              className={`time-selector-slot ${selectedSlot?.id === slot.id ? 'is-selected' : ''} ${isExcluded ? 'is-excluded' : ''}`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className="time-selector-slot-time">
                                  {slot.startTime}
                                </span>
                                {selectedSlot?.id === slot.id && (
                                  <CheckCircle className="w-5 h-5" />
                                )}
                              </div>
                              <div className="time-selector-slot-manager">
                                <User className="w-3 h-3" />
                                <span>{slot.managerName}</span>
                              </div>
                            </button>
                            
                            {/* Метка показывает, скольким другим клиентам уже предлагали это окно. */}
                            {pillCount > 0 && (
                              <span className="time-selector-slot-count" title="Уже предложено другим клиентам">
                                {pillCount}
                              </span>
                            )}
                            
                            {/* Кнопка минус для исключения */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSlotExclusion(slot.id);
                              }}
                              className="time-selector-exclude"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Кнопка "Записать клиента" - показываем только в обычном режиме при выбранном слоте */}
          {!clientViewMode && selectedSlot && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="time-selector-confirmation">
                <div className="flex items-center gap-3 mb-3">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <div>
                    <p className="time-selector-confirmation-title">Выбрано окно</p>
                    <p className="time-selector-confirmation-text">
                      {formatDateLong(selectedSlot.date)} в {selectedSlot.startTime} - {selectedSlot.managerName}
                    </p>
                  </div>
                </div>
              </div>
              <Button
                onClick={handleBookSlot}
                disabled={isBooking}
                className="time-selector-book-button"
              >
                <CheckCircle className="w-5 h-5 mr-2" />
                {isBooking ? 'Записываем…' : 'Записать клиента на встречу'}
              </Button>
              <p className="text-xs text-gray-600 mt-3 text-center">
                Клиент будет записан на встречу, статус изменится на "Записан"
              </p>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
