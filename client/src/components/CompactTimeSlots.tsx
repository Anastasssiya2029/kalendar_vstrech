import React, { useState, useMemo } from 'react';
import { MeetingStatus, TimeSlot } from '../types';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Calendar as CalendarIcon, Clock, Trash2, Plus, ChevronLeft, ChevronRight, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface CompactTimeSlotsProps {
  slots: TimeSlot[];
  slotOwners?: Array<{ id: string; name: string; role: 'manager' | 'admin' | 'architect' }>;
  bookingStates?: Record<string, { meetingStatus: MeetingStatus; formCompleted: boolean }>;
  onAddSlot: (slot: Omit<TimeSlot, 'id'>) => void;
  onDeleteSlot: (slotId: string) => void;
  onOpenBookedSlot?: (bookingId: string) => void;
  schoolId: string;
}

const TIME_OPTIONS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30',
  '20:00', '20:30', '21:00'
];

// Вспомогательные функции
const formatDateForInput = (value: Date | string): string => {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getWeekDays = (startDate: Date): Date[] => {
  const days: Date[] = [];
  const start = new Date(startDate);
  // Находим понедельник текущей недели
  const dayOfWeek = start.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  start.setDate(start.getDate() + diff);
  
  for (let i = 0; i < 7; i++) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    days.push(day);
  }
  return days;
};

const getWeekStart = (date: Date): Date => {
  const start = new Date(date);
  const dayOfWeek = start.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  start.setDate(start.getDate() + diff);
  start.setHours(0, 0, 0, 0);
  return start;
};

const formatDayShort = (date: Date): string => {
  const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  return days[date.getDay()];
};

const formatDayFull = (date: Date): string => {
  const days = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
  return days[date.getDay()];
};

const formatDateShort = (date: Date): string => {
  const day = date.getDate();
  const months = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  const month = months[date.getMonth()];
  return `${day} ${month}`;
};

const isSameDay = (date1: Date | string, date2: Date | string): boolean => {
  return formatDateForInput(date1) === formatDateForInput(date2);
};

const getMonthDays = (date: Date): Date[] => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: daysInMonth }, (_, index) => new Date(year, month, index + 1));
};

type TimeSlotsRange = 'month' | 'current_week' | 'next_week' | 'next_month';

export function CompactTimeSlots({
  slots,
  slotOwners = [],
  bookingStates = {},
  onAddSlot,
  onDeleteSlot,
  onOpenBookedSlot,
  schoolId
}: CompactTimeSlotsProps) {
  const { user } = useAuth();
  const [timeSlotsRange, setTimeSlotsRange] = useState<TimeSlotsRange>('current_week');
  const [selectedManagerId, setSelectedManagerId] = useState<string>('all');
  const [selectedSlotOwnerId, setSelectedSlotOwnerId] = useState<string>(user?.id || '');
  const [isAddingSlot, setIsAddingSlot] = useState(false);
  const [newSlotDate, setNewSlotDate] = useState<Date | null>(null);
  const [newSlotTime, setNewSlotTime] = useState('10:00');

  // Дни для выбранного периода
  const displayDays = useMemo(() => {
    const today = new Date();
    if (timeSlotsRange === 'month') return getMonthDays(today);
    if (timeSlotsRange === 'next_month') return getMonthDays(new Date(today.getFullYear(), today.getMonth() + 1, 1));

    const weekStart = getWeekStart(today);
    if (timeSlotsRange === 'next_week') weekStart.setDate(weekStart.getDate() + 7);
    return getWeekDays(weekStart);
  }, [timeSlotsRange]);

  // Форматирование месяца и года для отображения
  const formatMonthYear = (date: Date): string => {
    const months = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  const canManageTeamSlots = user?.role === 'admin' || user?.role === 'architect';
  const isManager = user?.role === 'manager';

  // The assignment list includes team members even before they create their first slot.
  const availableSlotOwners = useMemo(() => {
    const managersMap = new Map<string, string>();
    slotOwners.forEach((member) => managersMap.set(member.id, member.name));
    slots.forEach(slot => {
      if (!managersMap.has(slot.managerId)) {
        managersMap.set(slot.managerId, slot.managerName);
      }
    });
    if (user?.id && user?.name && !managersMap.has(user.id)) managersMap.set(user.id, user.name);
    return Array.from(managersMap.entries()).map(([id, name]) => ({ id, name }));
  }, [slotOwners, slots, user?.id, user?.name]);

  // Фильтрация слотов
  const filteredSlots = useMemo(() => {
    let filtered = slots;
    
    // Фильтр по менеджеру (для не-менеджеров)
    if (!isManager && selectedManagerId !== 'all') {
      filtered = filtered.filter(slot => slot.managerId === selectedManagerId);
    }
    
    // Фильтр по менеджеру (для менеджеров - только свои)
    if (isManager) {
      filtered = filtered.filter(slot => slot.managerId === user.id);
    }
    
    return filtered;
  }, [slots, selectedManagerId, user?.id, isManager]);

  const selectedSlotOwner = availableSlotOwners.find((member) => member.id === selectedSlotOwnerId)
    ?? availableSlotOwners.find((member) => member.id === user?.id)
    ?? { id: user?.id || '', name: user?.name || '' };

  const openSlotForm = (date: Date | null = null) => {
    if (canManageTeamSlots && selectedManagerId !== 'all') setSelectedSlotOwnerId(selectedManagerId);
    else if (!selectedSlotOwnerId && user?.id) setSelectedSlotOwnerId(user.id);
    setNewSlotDate(date);
    setIsAddingSlot(true);
  };

  // Группировка слотов по дням
  const slotsByDay = useMemo(() => {
    const grouped: Record<string, TimeSlot[]> = {};
    displayDays.forEach(day => {
      const dateKey = formatDateForInput(day);
      grouped[dateKey] = filteredSlots
        .filter(slot => isSameDay(slot.date, day))
        .sort((a, b) => a.startTime.localeCompare(b.startTime));
    });
    return grouped;
  }, [displayDays, filteredSlots]);

  const handleAddSlot = () => {
    if (!newSlotDate) return;

    const slot: Omit<TimeSlot, 'id'> = {
      managerId: isManager ? user?.id || '' : selectedSlotOwner.id,
      managerName: isManager ? user?.name || '' : selectedSlotOwner.name,
      date: newSlotDate,
      startTime: newSlotTime,
      isBooked: false,
      schoolId
    };

    onAddSlot(slot);
    setIsAddingSlot(false);
    setNewSlotDate(null);
    setNewSlotTime('10:00');
  };

  const today = new Date();
  const isToday = (date: Date) => isSameDay(date, today);
  const isWeekend = (date: Date) => date.getDay() === 0 || date.getDay() === 6;
  const getBookedSlotTone = (slot: TimeSlot) => {
    if (!slot.isBooked) return 'free';
    const booking = slot.bookingId ? bookingStates[slot.bookingId] : undefined;
    if (!booking) return 'scheduled';
    if (booking.meetingStatus === 'completed_with_sale') return 'sale';
    if (booking.meetingStatus === 'completed') return 'completed';
    if (booking.meetingStatus === 'rescheduled') return 'rescheduled';
    if (booking.meetingStatus === 'cancelled') return 'cancelled';
    return booking.formCompleted || booking.meetingStatus === 'scheduled_ready'
      ? 'form-completed'
      : 'scheduled';
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Заголовок и контролы */}
      <div className="time-slots-header">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 sm:mb-6">
          <div>
            <h2 className="mb-1">
              {isManager ? 'Мои окошки' : 'Окошки команды'}
            </h2>
            <p className="text-gray-600 text-sm sm:text-base">
              Просмотр и управление доступными временными окошками
            </p>
          </div>

          {user && (
            <Button
              onClick={() => openSlotForm()}
              className="time-slots-add-button"
            >
              <Plus className="w-4 h-4 mr-2" />
              Добавить окошко
            </Button>
          )}
        </div>

        {/* Фильтр по менеджерам (только для не-менеджеров) */}
        {canManageTeamSlots && availableSlotOwners.length > 0 && (
          <div className="time-slots-manager-filter">
            <div className="flex items-center gap-2 flex-wrap">
              <User className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600 mr-2">Менеджер:</span>
              
              <button
                onClick={() => setSelectedManagerId('all')}
                className={`time-slots-manager-chip ${selectedManagerId === 'all' ? 'is-active' : ''}`}
              >
                Все менеджеры
              </button>
              
              {availableSlotOwners.map(manager => (
                <button
                  key={manager.id}
                  onClick={() => setSelectedManagerId(manager.id)}
                className={`time-slots-manager-chip ${selectedManagerId === manager.id ? 'is-active' : ''}`}
                >
                  {manager.name}{manager.id === user?.id ? ' (я)' : ''}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Период отображения */}
        <div className="mb-4">
          <p className="time-slots-period-title">{formatMonthYear(displayDays[0])}</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            <Button
              onClick={() => setTimeSlotsRange('month')}
              variant={timeSlotsRange === 'month' ? 'default' : 'outline'}
              className={`time-slots-period-button ${timeSlotsRange === 'month' ? 'is-active' : ''}`}
              aria-pressed={timeSlotsRange === 'month'}
            >
              Месяц
            </Button>
            <Button
              onClick={() => setTimeSlotsRange('current_week')}
              variant={timeSlotsRange === 'current_week' ? 'default' : 'outline'}
              className={`time-slots-period-button ${timeSlotsRange === 'current_week' ? 'is-active' : ''}`}
              aria-pressed={timeSlotsRange === 'current_week'}
            >
              Эта неделя
            </Button>
            <Button
              onClick={() => setTimeSlotsRange('next_week')}
              variant={timeSlotsRange === 'next_week' ? 'default' : 'outline'}
              className={`time-slots-period-button ${timeSlotsRange === 'next_week' ? 'is-active' : ''}`}
              aria-pressed={timeSlotsRange === 'next_week'}
            >
              Следующая неделя
            </Button>
            <Button
              onClick={() => setTimeSlotsRange('next_month')}
              variant={timeSlotsRange === 'next_month' ? 'default' : 'outline'}
              className={`time-slots-period-button ${timeSlotsRange === 'next_month' ? 'is-active' : ''}`}
              aria-pressed={timeSlotsRange === 'next_month'}
            >
              Следующий месяц
            </Button>
          </div>
        </div>
      </div>

      {/* Сетка дней недели */}
      <div className="time-slots-grid">
        {displayDays.map((day) => {
          const dateKey = formatDateForInput(day);
          const daySlots = slotsByDay[dateKey] || [];
          const isTodayDay = isToday(day);
          const isWeekendDay = isWeekend(day);

          return (
            <div
              key={dateKey}
              className={`time-slots-day ${isTodayDay ? 'is-today' : ''} ${isWeekendDay ? 'is-weekend' : ''}`}
            >
              {/* Заголовок дня */}
              <div className="time-slots-day-heading">
                <div className="time-slots-day-name">
                  {formatDayShort(day)}
                </div>
                <div className="time-slots-day-number">
                  {day.getDate()}
                </div>
                <div className="time-slots-day-month">
                  {formatDateShort(day).split(' ')[1]}
                </div>
              </div>

              {/* Список окошек */}
              <div className="time-slots-list">
                {daySlots.length === 0 ? (
                  <div className="time-slots-empty-day">
                    Нет окошек
                  </div>
                ) : (
                  daySlots.map(slot => (
                    <div
                      key={slot.id}
                      role={slot.isBooked && slot.bookingId ? 'button' : undefined}
                      tabIndex={slot.isBooked && slot.bookingId ? 0 : undefined}
                      onClick={() => slot.isBooked && slot.bookingId && onOpenBookedSlot?.(slot.bookingId)}
                      onKeyDown={(event) => {
                        if (slot.isBooked && slot.bookingId && (event.key === 'Enter' || event.key === ' ')) {
                          event.preventDefault();
                          onOpenBookedSlot?.(slot.bookingId);
                        }
                      }}
                      title={slot.isBooked && slot.bookingId ? 'Открыть карточку встречи' : undefined}
                      className={`time-slots-slot group ${slot.isBooked ? `is-booked is-booked--${getBookedSlotTone(slot)}` : 'is-free'}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <Clock className="time-slots-slot-icon" />
                          <span className="time-slots-slot-time">
                            {slot.startTime}
                          </span>
                        </div>

                        {!slot.isBooked && (canManageTeamSlots || (isManager && slot.managerId === user?.id)) && (
                          <button
                            type="button"
                            onClick={() => onDeleteSlot(slot.id)}
                            className="time-slots-slot-delete"
                            aria-label={`Удалить окошко ${slot.startTime}`}
                          >
                            <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 text-red-500" />
                          </button>
                        )}
                      </div>

                      {/* Имя менеджера (только для не-менеджеров при просмотре всех) */}
                      {!isManager && selectedManagerId === 'all' && (
                        <div className="time-slots-slot-manager">
                          <User className="w-3 h-3" />
                          <span>{slot.managerName}</span>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Кнопка добавления окошка для этого дня */}
              {user && (
                <button
                  onClick={() => openSlotForm(day)}
                  className="time-slots-add-day"
                >
                  <Plus className="w-4 h-4 inline mr-1" />
                  Добавить
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Диалог добавления окошка */}
      {isAddingSlot && (
        <div className="time-slots-create-overlay">
          <div className="time-slots-create-panel">
            <h3 className="text-xl mb-4 text-[#2D1B69]">Добавить окошко</h3>
            
            <div className="space-y-4 mb-6">
              {canManageTeamSlots && availableSlotOwners.length > 0 && (
                <div>
                  <Label htmlFor="slot-owner" className="mb-2 block">Добавить окошко для</Label>
                  <select
                    id="slot-owner"
                    value={selectedSlotOwner.id}
                    onChange={(event) => setSelectedSlotOwnerId(event.target.value)}
                    className="time-slots-create-select"
                  >
                    {availableSlotOwners.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name}{member.id === user?.id ? ' (я)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <Label className="mb-2 block">Дата</Label>
                <Input
                  type="date"
                  value={newSlotDate ? formatDateForInput(newSlotDate) : ''}
                  onChange={(e) => setNewSlotDate(e.target.value ? new Date(e.target.value) : null)}
                  className="rounded-xl border-2 border-gray-200 focus:border-purple-500"
                />
              </div>

              <div>
                <Label className="mb-2 block">Время</Label>
                <select
                  value={newSlotTime}
                  onChange={(e) => setNewSlotTime(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {TIME_OPTIONS.map(time => (
                    <option key={time} value={time}>{time}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => {
                  setIsAddingSlot(false);
                  setNewSlotDate(null);
                }}
                variant="outline"
                className="flex-1 rounded-xl border-2 border-gray-200"
              >
                Отмена
              </Button>
              <Button
                onClick={handleAddSlot}
                disabled={!newSlotDate}
                className="flex-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 text-white rounded-xl"
              >
                Добавить
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Статистика */}
      <div className="time-slots-summary">
        <div className="time-slots-summary-grid">
          <div className="time-slots-summary-item">
            <div className="text-2xl sm:text-3xl text-blue-600 mb-1">
              {filteredSlots.filter(s => displayDays.some(d => isSameDay(s.date, d))).length}
            </div>
            <div className="text-xs sm:text-sm text-gray-600">Всего окошек</div>
          </div>
          <div className="time-slots-summary-item">
            <div className="text-2xl sm:text-3xl text-green-600 mb-1">
              {filteredSlots.filter(s => s.isBooked && displayDays.some(d => isSameDay(s.date, d))).length}
            </div>
            <div className="text-xs sm:text-sm text-gray-600">Заполнено</div>
          </div>
          <div className="time-slots-summary-item">
            <div className="text-2xl sm:text-3xl text-purple-600 mb-1">
              {filteredSlots.filter(s => !s.isBooked && displayDays.some(d => isSameDay(s.date, d))).length}
            </div>
            <div className="text-xs sm:text-sm text-gray-600">Свободно</div>
          </div>
          <div className="time-slots-summary-item">
            <div className="text-2xl sm:text-3xl text-pink-600 mb-1">
              {Math.round((filteredSlots.filter(s => s.isBooked && displayDays.some(d => isSameDay(s.date, d))).length / 
                Math.max(filteredSlots.filter(s => displayDays.some(d => isSameDay(s.date, d))).length, 1)) * 100)}%
            </div>
            <div className="text-xs sm:text-sm text-gray-600">Загрузка</div>
          </div>
        </div>
      </div>
    </div>
  );
}
