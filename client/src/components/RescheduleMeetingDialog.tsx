import React, { useState } from 'react';
import { Meeting, Client, TimeSlot, DayType, TimeOfDay, getDayType, getTimeOfDay } from '../types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { CalendarClock, AlertCircle, Copy, Calendar, Minus } from 'lucide-react';
import { toast } from 'sonner';
import { copyToClipboard } from '../utils/clipboard';

interface RescheduleMeetingDialogProps {
  meeting: Meeting | null;
  client: Client | null;
  availableSlots: TimeSlot[];
  allClients: Client[]; // Все клиенты для подсчета таблеток
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReschedule: (meetingId: string, newSlot: TimeSlot, reason: string) => void;
  onProvideSlots?: (clientId: string, slotIds: string[]) => void; // Предоставить окошки на выбор
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

export function RescheduleMeetingDialog({ 
  meeting,
  client,
  availableSlots,
  allClients,
  open, 
  onOpenChange, 
  onReschedule,
  onProvideSlots
}: RescheduleMeetingDialogProps) {
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [managerFilter, setManagerFilter] = useState<'current' | 'any'>('current');
  const [clientViewMode, setClientViewMode] = useState<boolean>(false);
  const [dayTypeFilter, setDayTypeFilter] = useState<DayType | undefined>(undefined);
  const [timeOfDayFilter, setTimeOfDayFilter] = useState<TimeOfDay | undefined>(undefined);
  const [dateFrom, setDateFrom] = useState<string>('');
  const [excludedSlotIds, setExcludedSlotIds] = useState<Set<string>>(new Set());

  // Сброс excludedSlotIds при открытии/закрытии диалога
  React.useEffect(() => {
    if (!open) {
      setExcludedSlotIds(new Set());
    }
  }, [open]);

  if (!meeting || !client) return null;

  // Функция для подсчета таблеток (количество клиентов, которым предоставлено это окошко)
  const getSlotPillCount = (slotId: string): number => {
    return allClients.filter(c => 
      c.id !== client.id && // Не считаем текущего клиента
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

  // Фильтруем только свободные слоты
  const availableFreeSlots = availableSlots.filter(
    slot => !slot.isBooked &&
            slot.date >= new Date(new Date().setHours(0, 0, 0, 0))
  );

  // Применяем фильтр по менеджеру
  let filteredSlots = managerFilter === 'current' 
    ? availableFreeSlots.filter(slot => slot.managerId === meeting.managerId)
    : availableFreeSlots;

  // Применяем фильтр по дате от
  if (dateFrom) {
    const [day, month, year] = dateFrom.split('.').map(Number);
    if (day && month && year) {
      const fromDate = new Date(year, month - 1, day);
      fromDate.setHours(0, 0, 0, 0);
      filteredSlots = filteredSlots.filter(slot => {
        const slotDate = new Date(slot.date);
        slotDate.setHours(0, 0, 0, 0);
        return slotDate >= fromDate;
      });
    }
  }

  // Применяем фильтр по типу дня
  if (dayTypeFilter) {
    filteredSlots = filteredSlots.filter(slot => {
      const slotDayType = getDayType(slot.date);
      return slotDayType === dayTypeFilter;
    });
  }

  // Применяем фильтр по времени суток
  if (timeOfDayFilter) {
    filteredSlots = filteredSlots.filter(slot => {
      const slotTimeOfDay = getTimeOfDay(slot.startTime);
      return slotTimeOfDay === timeOfDayFilter;
    });
  }

  // Группировка слотов по менеджерам
  const groupedByManager = filteredSlots.reduce((acc, slot) => {
    const managerKey = slot.managerId;
    if (!acc[managerKey]) {
      acc[managerKey] = {
        managerId: slot.managerId,
        managerName: slot.managerName,
        slots: []
      };
    }
    acc[managerKey].slots.push(slot);
    return acc;
  }, {} as Record<string, { managerId: string; managerName: string; slots: TimeSlot[] }>);

  // Сортировка менеджеров: текущий менеджер первым
  const sortedManagers = Object.values(groupedByManager).sort((a, b) => {
    if (a.managerId === meeting.managerId) return -1;
    if (b.managerId === meeting.managerId) return 1;
    return a.managerName.localeCompare(b.managerName);
  });

  // Группировка всех слотов по датам для версии клиента
  const groupedSlotsByDate = filteredSlots.reduce((acc, slot) => {
    const dateKey = formatDateShort(slot.date);
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(slot);
    return acc;
  }, {} as Record<string, TimeSlot[]>);

  // Сортировка дат
  const sortedDatesForClient = Object.keys(groupedSlotsByDate).sort((a, b) => {
    const [dayA, monthA, yearA] = a.split('.').map(Number);
    const [dayB, monthB, yearB] = b.split('.').map(Number);
    const dateA = new Date(yearA, monthA - 1, dayA);
    const dateB = new Date(yearB, monthB - 1, dayB);
    return dateA.getTime() - dateB.getTime();
  });

  // Формирование текста для клиента
  const generateClientViewText = (): string => {
    const lines: string[] = [];
    lines.push(`${client.firstName}, из свободных окошек могу предложить:` );
    lines.push('');

    sortedDatesForClient.forEach(dateKey => {
      const slotsForDate = groupedSlotsByDate[dateKey]
        .filter(slot => !excludedSlotIds.has(slot.id)) // Исключаем убранные окошки
        .sort((a, b) => a.startTime.localeCompare(b.startTime));
      
      if (slotsForDate.length === 0) return; // Пропускаем даты без окошек
      
      const date = slotsForDate[0].date;
      
      // Получаем уникальные времена (убираем дубли)
      const uniqueTimes = Array.from(new Set(slotsForDate.map(s => s.startTime))).sort();
      
      lines.push(`${formatDateLong(date)}:`);
      uniqueTimes.forEach(time => {
        lines.push(time);
      });
      lines.push('');
    });

    lines.push('❗На встречу закладывайте не менее 1,5ч.❗');
    lines.push('');
    lines.push('Вам когда и во сколько было бы удобнее?');

    return lines.join('\n');
  };

  const handleCopyClientViewText = async () => {
    const text = generateClientViewText();
    const success = await copyToClipboard(text);
    
    if (success) {
      toast.success('Текст для клиента скопирован!');
    } else {
      toast.error('Не удалось скопировать автоматически.');
    }
  };

  const handleProvideSlots = () => {
    if (!onProvideSlots) return;
    
    // Собираем все неисключенные окошки
    const slotsToProvide = filteredSlots
      .filter(slot => !excludedSlotIds.has(slot.id))
      .map(slot => slot.id);
    
    if (slotsToProvide.length === 0) {
      toast.error('Выберите хотя бы одно окошко для предоставления');
      return;
    }
    
    onProvideSlots(client.id, slotsToProvide);
    toast.success(`Предоставлено ${slotsToProvide.length} окошек на выбор`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedSlot) {
      setError('Выберите новое время');
      return;
    }

    if (!reason.trim()) {
      setError('Укажите причину переноса');
      return;
    }

    onReschedule(meeting.id, selectedSlot, reason.trim());
    
    // Сброс формы
    setSelectedSlot(null);
    setReason('');
    setError('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="reschedule-dialog sm:max-w-[680px] max-h-[85vh] sm:max-h-[90vh] overflow-y-auto">
        <DialogHeader className="reschedule-dialog-header">
          <DialogTitle className="reschedule-dialog-title">
            <div className="reschedule-dialog-icon">
              <CalendarClock className="w-5 h-5 text-white" />
            </div>
            <span>Перенос встречи</span>
          </DialogTitle>
          <DialogDescription className="reschedule-dialog-description">
            Новое время для <strong>{client.firstName} {client.lastName}</strong>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="reschedule-form">
          {/* Текущая встреча */}
          <div className="reschedule-current-meeting">
            <p className="reschedule-section-label">Текущая встреча</p>
            <p>
              <strong>Дата:</strong> {formatDateLong(meeting.date)}
            </p>
            <p>
              <strong>Время:</strong> {meeting.startTime}
            </p>
            <p>
              <strong>Менеджер:</strong> {meeting.managerName}
            </p>
          </div>

          {/* Причина переноса */}
          <div className="reschedule-field">
            <Label htmlFor="reason" className="reschedule-field-label">
              Причина переноса *
            </Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setError('');
              }}
              placeholder="По просьбе клиента, занятость менеджера и т.д."
              rows={2}
              className={`reschedule-input reschedule-textarea ${error && !reason.trim() ? 'is-error' : ''}`}
            />
          </div>

          {/* Выбор нового ремени */}
          <div className="reschedule-field">
            <Label className="reschedule-field-label">
              Выберите новое время *
            </Label>

            {/* Фильтр по менеджеру */}
            <div className="reschedule-option-grid reschedule-option-grid--two">
              <button
                type="button"
                onClick={() => {
                  setManagerFilter('current');
                  setSelectedSlot(null);
                }}
                className={`reschedule-option ${managerFilter === 'current' ? 'is-active' : ''}`}
              >
                👤 Текущий менеджер
              </button>
              <button
                type="button"
                onClick={() => {
                  setManagerFilter('any');
                  setSelectedSlot(null);
                }}
                className={`reschedule-option ${managerFilter === 'any' ? 'is-active' : ''}`}
              >
                👥 Любой менеджер
              </button>
            </div>

            {/* Фильтр по типу дня */}
            <div className="reschedule-option-grid reschedule-option-grid--three">
              <button
                type="button"
                onClick={() => {
                  setDayTypeFilter(undefined);
                  setSelectedSlot(null);
                }}
                className={`reschedule-option ${dayTypeFilter === undefined ? 'is-active' : ''}`}
              >
                Все
              </button>
              <button
                type="button"
                onClick={() => {
                  setDayTypeFilter('weekday');
                  setSelectedSlot(null);
                }}
                className={`reschedule-option ${dayTypeFilter === 'weekday' ? 'is-active' : ''}`}
              >
                📅 Будни
              </button>
              <button
                type="button"
                onClick={() => {
                  setDayTypeFilter('weekend');
                  setSelectedSlot(null);
                }}
                className={`reschedule-option ${dayTypeFilter === 'weekend' ? 'is-active' : ''}`}
              >
                🎉 Выходные
              </button>
            </div>

            {/* Фильтр по времени суток */}
            <div className="reschedule-option-grid reschedule-option-grid--four">
              <button
                type="button"
                onClick={() => {
                  setTimeOfDayFilter(undefined);
                  setSelectedSlot(null);
                }}
                className={`reschedule-option ${timeOfDayFilter === undefined ? 'is-active' : ''}`}
              >
                Все
              </button>
              <button
                type="button"
                onClick={() => {
                  setTimeOfDayFilter('morning');
                  setSelectedSlot(null);
                }}
                className={`reschedule-option ${timeOfDayFilter === 'morning' ? 'is-active' : ''}`}
              >
                🌅 Утро
              </button>
              <button
                type="button"
                onClick={() => {
                  setTimeOfDayFilter('afternoon');
                  setSelectedSlot(null);
                }}
                className={`reschedule-option ${timeOfDayFilter === 'afternoon' ? 'is-active' : ''}`}
              >
                ☀️ День
              </button>
              <button
                type="button"
                onClick={() => {
                  setTimeOfDayFilter('evening');
                  setSelectedSlot(null);
                }}
                className={`reschedule-option ${timeOfDayFilter === 'evening' ? 'is-active' : ''}`}
              >
                🌙 Вечер
              </button>
            </div>

            {/* Фильтр по дате от */}
            <div className="reschedule-date-filter">
              <Label htmlFor="dateFrom" className="reschedule-field-label">
                Дата от
              </Label>
              <div className="relative">
                <Input
                  type="text"
                  id="dateFrom"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setSelectedSlot(null);
                  }}
                  placeholder="ДД.ММ.ГГГГ"
                  className="reschedule-input pr-10"
                />
                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Версия для клиента */}
            {filteredSlots.length > 0 && (
              <div className="reschedule-view-switch">
                <label className="reschedule-view-option">
                  <input
                    type="radio"
                    checked={!clientViewMode}
                    onChange={() => setClientViewMode(false)}
                    className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                  />
                  <span>Обычный режим</span>
                </label>
                <label className="reschedule-view-option">
                  <input
                    type="radio"
                    checked={clientViewMode}
                    onChange={() => setClientViewMode(true)}
                    className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                  />
                  <span>Текст для клиента</span>
                </label>
              </div>
            )}

            {availableFreeSlots.length === 0 ? (
              <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-200/50 rounded-2xl p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-yellow-800">
                      Нет доступных окошек
                    </p>
                    <p className="text-sm text-yellow-700 mt-1">
                      Нет свободных окошек. Попросите менеджера добавить новые окошки.
                    </p>
                  </div>
                </div>
              </div>
            ) : filteredSlots.length === 0 ? (
              <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-200/50 rounded-2xl p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-yellow-800">
                      Нет доступных окошек
                    </p>
                    <p className="text-sm text-yellow-700 mt-1">
                      {managerFilter === 'current' 
                        ? `У ${meeting.managerName} нет свободных окошек. Попробуйте выбрать "Любой менеджер".`
                        : 'Нет свободных окошек. Попросите менеджера добавить новые окошки.'
                      }
                    </p>
                  </div>
                </div>
              </div>
            ) : clientViewMode ? (
              // Режим для клиента - компактный вывод
              <div className="reschedule-client-preview-wrap">
                <div className="reschedule-client-preview">
                  <Label className="reschedule-section-label">
                    Текст для отправки клиенту:
                  </Label>
                  <div className="reschedule-client-preview-text">
                    {generateClientViewText()}
                  </div>
                  <Button
                    type="button"
                    onClick={handleCopyClientViewText}
                    className="reschedule-client-copy-button"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Скопировать текст
                  </Button>
                </div>
              </div>
            ) : (
              <div className="reschedule-slot-list">{sortedManagers.map(manager => {
                // Группировка слотов менеджера по датам
                const slotsByDate = manager.slots.reduce((acc, slot) => {
                  const dateKey = formatDateShort(slot.date);
                  if (!acc[dateKey]) {
                    acc[dateKey] = [];
                  }
                  acc[dateKey].push(slot);
                  return acc;
                }, {} as Record<string, TimeSlot[]>);

                // Сортировка дат
                const sortedDates = Object.keys(slotsByDate).sort((a, b) => {
                  const [dayA, monthA, yearA] = a.split('.').map(Number);
                  const [dayB, monthB, yearB] = b.split('.').map(Number);
                  const dateA = new Date(yearA, monthA - 1, dayA);
                  const dateB = new Date(yearB, monthB - 1, dayB);
                  return dateA.getTime() - dateB.getTime();
                });

                return (
                  <div key={manager.managerId} className="reschedule-manager-card">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="reschedule-manager-name">
                        {manager.managerName}
                      </h3>
                      {manager.managerId === meeting.managerId && (
                        <span className="reschedule-current-manager-badge">
                          Текущий менеджер
                        </span>
                      )}
                    </div>

                    <div className="space-y-2">
                      {sortedDates.map(dateKey => {
                        const slotsForDate = slotsByDate[dateKey].sort((a, b) => 
                          a.startTime.localeCompare(b.startTime)
                        );
                        const date = slotsForDate[0].date;

                        return (
                          <div key={dateKey} className="reschedule-date-card">
                            <h4 className="reschedule-date-title">
                              {formatDateLong(date)}
                            </h4>
                            <div className="grid grid-cols-3 md:grid-cols-4 gap-1.5">
                              {slotsForDate.map(slot => {
                                const pillCount = getSlotPillCount(slot.id);
                                const isExcluded = excludedSlotIds.has(slot.id);
                                
                                return (
                                  <div key={slot.id} className="relative group">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedSlot(selectedSlot?.id === slot.id ? null : slot);
                                        setError('');
                                      }}
                                      className={`reschedule-slot-choice ${selectedSlot?.id === slot.id ? 'is-selected' : ''} ${isExcluded ? 'is-excluded' : ''}`}
                                    >
                                      {slot.startTime}
                                    </button>
                                    
                                    {/* Таблетки (красные кружки) */}
                                    {pillCount > 0 && (
                                      <div className="absolute -top-1.5 -right-1.5 flex gap-0.5">
                                        {Array.from({ length: Math.min(pillCount, 5) }).map((_, i) => (
                                          <div
                                            key={i}
                                            className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-red-500 to-red-700 border border-white shadow-lg animate-pulse"
                                            style={{ animationDelay: `${i * 0.1}s` }}
                                          />
                                        ))}
                                        {pillCount > 5 && (
                                          <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-red-500 to-red-700 border border-white shadow-lg flex items-center justify-center text-[6px] text-white font-bold">
                                            +
                                          </div>
                                        )}
                                      </div>
                                    )}
                                    
                                    {/* Кнопка минус для исключения */}
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleSlotExclusion(slot.id);
                                      }}
                                      className="absolute -bottom-1.5 -right-1.5 w-5 h-5 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:scale-110"
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
                  </div>
                );
              })}
              </div>
            )}
          </div>

          {/* Ошибка */}
          {error && (
            <div className="reschedule-error">
              <p>{error}</p>
            </div>
          )}

          {/* Предупреждение */}
          <div className="reschedule-note">
            <p>
              <strong>Важно:</strong> после переноса сообщите клиенту новое время встречи.
            </p>
          </div>

          {/* Кнопки */}
          <div className="reschedule-actions">
            {/* Кнопка "Предоставить выбор" */}
            {onProvideSlots && filteredSlots.length > 0 && (
              <div className="reschedule-provide-action">
                <Button
                  type="button"
                  onClick={handleProvideSlots}
                  className="reschedule-provide-button"
                >
                  Предоставить выбор 💊
                </Button>
              </div>
            )}
            
            {/* Основные кнопки */}
            <div className="reschedule-actions-row">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                  setSelectedSlot(null);
                  setReason('');
                  setError('');
                }}
                className="reschedule-cancel-button"
              >
                Отмена
              </Button>
              <Button
                type="submit"
                disabled={availableFreeSlots.length === 0}
                className="reschedule-submit-button"
              >
                <CalendarClock className="w-4 h-4 mr-2" />
                Перенести встречу
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
