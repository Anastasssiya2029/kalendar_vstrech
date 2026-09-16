import React, { useState } from 'react';
import { Meeting, Client, Tariff, PaymentMethod, getActualMeetingStatus } from '../types';
import { Button } from './ui/button';
import { ChevronDown, ChevronLeft, ChevronRight, Calendar as CalendarIcon, User, TrendingUp, CheckCircle, RefreshCw, XCircle, DollarSign } from 'lucide-react';
import { DayDetailsDialog } from './DayDetailsDialog';
import { useAuth } from '../contexts/AuthContext';

interface MeetingsCalendarProps {
  meetings: Meeting[];
  clients: Client[];
  currentMonth?: Date;
  onMonthChange?: (month: Date) => void;
  onStatusChange?: (meetingId: string, newStatus: 'completed' | 'completed_with_sale' | 'cancelled', soldTariff?: string, saleAmount?: number, paymentMethod?: PaymentMethod) => void;
  onUpdateNotes?: (meetingId: string, notes: string) => void;
  onRescheduleMeeting?: (meeting: Meeting) => void;
  availableTariffs?: Tariff[];
}

const getMonthName = (date: Date) => {
  const months = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
  return `${months[date.getMonth()]} ${date.getFullYear()}`;
};

const getMonthNameOnly = (date: Date) => {
  const months = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
  return months[date.getMonth()];
};

const getDaysInMonth = (date: Date) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  return new Date(year, month + 1, 0).getDate();
};

const getFirstDayOfMonth = (date: Date) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  // Конвертируем в европейский формат (пн=0, вс=6)
  return firstDay === 0 ? 6 : firstDay - 1;
};

const WEEK_DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

type CalendarPeriod = 'month' | 'quarter' | 'year';

const getMeetingTone = (status: Meeting['status']) => {
  switch (status) {
    case 'scheduled_ready': return 'ready';
    case 'completed': return 'completed';
    case 'completed_with_sale': return 'sale';
    case 'rescheduled': return 'rescheduled';
    case 'cancelled': return 'cancelled';
    default: return 'scheduled';
  }
};

interface CalendarMonthViewProps {
  month: Date;
  meetings: Meeting[];
  clients: Client[];
  isManager: boolean;
  condensed?: boolean;
  onSelectDay: (date: Date, dayMeetings: Meeting[]) => void;
}

function CalendarMonthView({
  month,
  meetings,
  clients,
  isManager,
  condensed = false,
  onSelectDay
}: CalendarMonthViewProps) {
  const daysInMonth = getDaysInMonth(month);
  const firstDay = getFirstDayOfMonth(month);
  const meetingsByDay: Record<number, Meeting[]> = {};

  meetings
    .filter(meeting => {
      const date = new Date(meeting.date);
      return date.getMonth() === month.getMonth() && date.getFullYear() === month.getFullYear();
    })
    .forEach(meeting => {
      const day = new Date(meeting.date).getDate();
      if (!meetingsByDay[day]) meetingsByDay[day] = [];
      meetingsByDay[day].push(meeting);
    });

  return (
    <section className={`calendar-period-month ${condensed ? 'is-condensed' : ''}`} aria-label={getMonthName(month)}>
      {condensed && <h3 className="calendar-period-month-title">{getMonthName(month)}</h3>}
      <div className="calendar-period-weekdays">
        {WEEK_DAYS.map(day => <span key={day}>{day}</span>)}
      </div>
      <div className="calendar-period-days">
        {Array.from({ length: firstDay }).map((_, index) => <span key={`empty-${index}`} aria-hidden="true" />)}
        {Array.from({ length: daysInMonth }).map((_, index) => {
          const day = index + 1;
          const sortedDayMeetings = [...(meetingsByDay[day] || [])].sort((a, b) => a.startTime.localeCompare(b.startTime));
          const hasMeetings = sortedDayMeetings.length > 0;
          const isToday = day === new Date().getDate() && month.getMonth() === new Date().getMonth() && month.getFullYear() === new Date().getFullYear();

          return (
            <button
              key={day}
              type="button"
              disabled={!hasMeetings}
              onClick={() => hasMeetings && onSelectDay(new Date(month.getFullYear(), month.getMonth(), day), sortedDayMeetings)}
              className={`calendar-period-day ${isToday ? 'is-today' : ''} ${hasMeetings ? 'has-meetings' : ''}`}
              aria-label={hasMeetings ? `${day} ${getMonthName(month)}: ${hasMeetings ? sortedDayMeetings.length : 0} встреч` : `${day} ${getMonthName(month)}`}
            >
              <span className="calendar-period-day-number">{day}</span>
              {hasMeetings && (
                <span className="calendar-period-meeting-count" aria-hidden="true">
                  {sortedDayMeetings.length}
                </span>
              )}
              {condensed ? (
                <span className="calendar-period-dot-row" aria-hidden="true">
                  {sortedDayMeetings.slice(0, 3).map(meeting => {
                    const client = clients.find(item => item.id === meeting.clientId);
                    if (!client) return null;
                    const actualStatus = getActualMeetingStatus(meeting, client);
                    return <span key={meeting.id} className={`calendar-period-dot calendar-period-dot--${getMeetingTone(actualStatus)}`} />;
                  })}
                </span>
              ) : (
                <span className="calendar-period-meetings">
                  {sortedDayMeetings.slice(0, 3).map(meeting => {
                    const client = clients.find(item => item.id === meeting.clientId);
                    if (!client) return null;
                    const actualStatus = getActualMeetingStatus(meeting, client);
                    return (
                      <span
                        key={meeting.id}
                        className={`calendar-period-meeting-chip calendar-period-meeting-chip--${getMeetingTone(actualStatus)}`}
                        title={`${client.firstName} ${client.lastName} — ${meeting.startTime}${isManager ? '' : ` (${meeting.managerName})`}${actualStatus === 'scheduled_ready' ? ' • Анкета заполнена' : ''}`}
                      >
                        {actualStatus === 'scheduled_ready' && <CheckCircle className="calendar-period-meeting-icon" aria-hidden="true" />}
                        {meeting.startTime} {client.firstName}{isManager ? '' : ` • ${meeting.managerName}`}
                      </span>
                    );
                  })}
                  {sortedDayMeetings.length > 3 && <span className="calendar-period-more">+{sortedDayMeetings.length - 3}</span>}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function MeetingsCalendar({ 
  meetings, 
  clients, 
  currentMonth: propCurrentMonth,
  onMonthChange,
  onStatusChange,
  onUpdateNotes,
  onRescheduleMeeting,
  availableTariffs 
}: MeetingsCalendarProps) {
  const [selectedMonth, setSelectedMonth] = useState(propCurrentMonth || new Date());
  const [calendarPeriod, setCalendarPeriod] = useState<CalendarPeriod>('month');
  const [selectedDayDate, setSelectedDayDate] = useState<Date | null>(null);
  const [managerFilter, setManagerFilter] = useState<string>('all');
  const [isPeriodDropdownOpen, setIsPeriodDropdownOpen] = useState(false);
  const [periodDropdownButton, setPeriodDropdownButton] = useState<HTMLButtonElement | null>(null);
  const { user } = useAuth();

  const movePeriod = (direction: -1 | 1) => {
    const newMonth = new Date(selectedMonth);
    const monthStep = calendarPeriod === 'month' ? 1 : calendarPeriod === 'quarter' ? 3 : 12;
    newMonth.setMonth(newMonth.getMonth() + direction * monthStep);
    setSelectedMonth(newMonth);
    onMonthChange?.(newMonth);
  };

  const getPeriodStart = () => {
    if (calendarPeriod === 'year') return new Date(selectedMonth.getFullYear(), 0, 1);
    if (calendarPeriod === 'quarter') return new Date(selectedMonth.getFullYear(), Math.floor(selectedMonth.getMonth() / 3) * 3, 1);
    return new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
  };

  const periodStart = getPeriodStart();
  const periodMonthCount = calendarPeriod === 'year' ? 12 : calendarPeriod === 'quarter' ? 3 : 1;
  const periodEnd = new Date(periodStart.getFullYear(), periodStart.getMonth() + periodMonthCount, 0, 23, 59, 59, 999);
  const periodMonths = Array.from({ length: periodMonthCount }, (_, index) => new Date(periodStart.getFullYear(), periodStart.getMonth() + index, 1));
  const quarterNumber = Math.floor(selectedMonth.getMonth() / 3) + 1;
  const periodTitle = calendarPeriod === 'year'
    ? `${selectedMonth.getFullYear()} год`
    : calendarPeriod === 'quarter'
      ? `${quarterNumber} квартал ${selectedMonth.getFullYear()}`
      : getMonthName(selectedMonth);
  const navigationLabel = calendarPeriod === 'year'
    ? String(selectedMonth.getFullYear())
    : calendarPeriod === 'quarter'
      ? `${quarterNumber} квартал`
      : getMonthNameOnly(selectedMonth);

  const selectCalendarPeriod = (period: CalendarPeriod) => {
    setCalendarPeriod(period);
    setIsPeriodDropdownOpen(false);
  };

  // Получить уникальных менеджеров
  const uniqueManagers = Array.from(new Set(meetings.map(m => m.managerName)));
  const showManagerFilter = user?.role !== 'manager' && uniqueManagers.length > 1;

  // Фильтрация встреч по выбранному периоду и менеджеру
  const periodMeetings = meetings.filter(meeting => {
    const meetingDate = new Date(meeting.date);
    const isInPeriod = meetingDate >= periodStart && meetingDate <= periodEnd;
    
    if (!isInPeriod) return false;
    
    // Фильтр по менеджеру (только для не-менеджеров)
    if (user?.role !== 'manager' && managerFilter !== 'all') {
      return meeting.managerName === managerFilter;
    }
    
    return true;
  });

  // Статистика выбранного периода. «Проведено с продажей» — отдельный исход,
  // поэтому не прячем его внутри общего счётчика проведённых.
  const monthStats = {
    scheduled: periodMeetings.filter(m => m.status === 'scheduled' || m.status === 'scheduled_ready').length,
    rescheduled: periodMeetings.filter(m => m.status === 'rescheduled').length,
    cancelled: periodMeetings.filter(m => m.status === 'cancelled').length,
    completed: periodMeetings.filter(m => m.status === 'completed').length,
    completedWithSale: periodMeetings.filter(m => m.status === 'completed_with_sale').length,
  };

  // Конверсионная статистика
  const allScheduled = monthStats.scheduled;
  const completedWithSale = monthStats.completedWithSale;
  const conductedMeetings = monthStats.completed + completedWithSale;
  
  // Все встречи (включая запланированные, проведенные, отмененные, перенесенные)
  const totalPlannedMeetings = allScheduled + conductedMeetings + monthStats.cancelled + monthStats.rescheduled;
  
  // Процент проведенных встреч от всех запланированных
  const completedPercent = totalPlannedMeetings > 0 
    ? Math.round((conductedMeetings / totalPlannedMeetings) * 100) 
    : 0;
  
  // Процент встреч с продажами от всех проведенных
  const salesFromCompletedPercent = conductedMeetings > 0 
    ? Math.round((completedWithSale / conductedMeetings) * 100) 
    : 0;
  
  // Процент встреч с продажами от всех запланированных
  const salesFromPlannedPercent = totalPlannedMeetings > 0 
    ? Math.round((completedWithSale / totalPlannedMeetings) * 100) 
    : 0;
  
  // Процент отмененных и перенесенных от запланированных
  const cancelledRescheduledPercent = totalPlannedMeetings > 0 
    ? Math.round(((monthStats.cancelled + monthStats.rescheduled) / totalPlannedMeetings) * 100) 
    : 0;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Заголовок и навигация */}
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-3d p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <CalendarIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <h2>Календарь встреч</h2>
              <p className="text-gray-900 text-base font-semibold">{periodTitle}</p>
            </div>
          </div>

          <div className="calendar-period-controls flex flex-wrap items-center gap-2">
            <Button
              onClick={() => movePeriod(-1)}
              variant="outline"
              size="sm"
              className="rounded-xl hover:bg-gray-50 transition-all border-2 border-gray-200 hover:border-purple-300 p-2"
              aria-label="Предыдущий период"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="calendar-period-current" aria-live="polite">{navigationLabel}</span>
            <Button
              onClick={() => movePeriod(1)}
              variant="outline"
              size="sm"
              className="rounded-xl hover:bg-gray-50 transition-all border-2 border-gray-200 hover:border-purple-300 p-2"
              aria-label="Следующий период"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            <div className="calendar-period-picker">
              <button
                ref={setPeriodDropdownButton}
                type="button"
                onClick={() => setIsPeriodDropdownOpen((open) => !open)}
                className="calendar-period-trigger"
                aria-label="Выбрать период календаря"
                aria-haspopup="listbox"
                aria-expanded={isPeriodDropdownOpen}
              >
                <span>{{ month: 'Месяц', quarter: 'Квартал', year: 'Год' }[calendarPeriod]}</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${isPeriodDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isPeriodDropdownOpen && periodDropdownButton && (
                <>
                  <div className="fixed inset-0 z-[100]" onClick={() => setIsPeriodDropdownOpen(false)} />
                  <div
                    className="calendar-period-menu fixed z-[101]"
                    role="listbox"
                    aria-label="Период календаря"
                    style={{
                      top: `${periodDropdownButton.getBoundingClientRect().bottom + 8}px`,
                      left: `${Math.max(12, Math.min(periodDropdownButton.getBoundingClientRect().left, window.innerWidth - 212))}px`,
                    }}
                  >
                    {([
                      ['month', 'Месяц'],
                      ['quarter', 'Квартал'],
                      ['year', 'Год'],
                    ] as Array<[CalendarPeriod, string]>).map(([period, label]) => (
                      <button
                        key={period}
                        type="button"
                        role="option"
                        aria-selected={calendarPeriod === period}
                        onClick={() => selectCalendarPeriod(period)}
                        className={`calendar-period-option ${calendarPeriod === period ? 'is-selected' : ''}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Фильтр по менеджеру (только для архитектора/админа/пощника) */}
        {showManagerFilter && (
          <div className="mb-4 pb-4 border-b border-gray-200">
            <div className="flex items-center gap-2 flex-wrap">
              <User className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600 mr-2">Менеджер:</span>
              
              <button
                onClick={() => setManagerFilter('all')}
                className={`calendar-manager-filter-button px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm transition-all ${
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
                  className={`calendar-manager-filter-button px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm transition-all ${
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

        {/* Статистика периода */}
        <div className="calendar-month-stats grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-4">
          <div className="calendar-stat-card calendar-stat-card--scheduled">
            <span className="calendar-stat-icon" aria-hidden="true"><CalendarIcon className="w-4 h-4" strokeWidth={2.1} /></span>
            <div>
              <div className="calendar-stat-value">{allScheduled}</div>
              <p className="calendar-stat-label">Запланировано</p>
            </div>
          </div>
          <div className="calendar-stat-card calendar-stat-card--completed">
            <span className="calendar-stat-icon" aria-hidden="true"><CheckCircle className="w-4 h-4" strokeWidth={2.1} /></span>
            <div>
              <div className="calendar-stat-value">{monthStats.completed}</div>
              <p className="calendar-stat-label">Проведено</p>
            </div>
          </div>
          <div className="calendar-stat-card calendar-stat-card--rescheduled">
            <span className="calendar-stat-icon" aria-hidden="true"><RefreshCw className="w-4 h-4" strokeWidth={2.1} /></span>
            <div>
              <div className="calendar-stat-value">{monthStats.rescheduled}</div>
              <p className="calendar-stat-label">Перенесено</p>
            </div>
          </div>
          <div className="calendar-stat-card calendar-stat-card--cancelled">
            <span className="calendar-stat-icon" aria-hidden="true"><XCircle className="w-4 h-4" strokeWidth={2.1} /></span>
            <div>
              <div className="calendar-stat-value">{monthStats.cancelled}</div>
              <p className="calendar-stat-label">Отменено</p>
            </div>
          </div>
          <div className="calendar-stat-card calendar-stat-card--sale">
            <span className="calendar-stat-icon" aria-hidden="true"><DollarSign className="w-4 h-4" strokeWidth={2.1} /></span>
            <div>
              <div className="calendar-stat-value">{completedWithSale}</div>
              <p className="calendar-stat-label">Проведено с продажей</p>
            </div>
          </div>
        </div>

        {/* Конверсионная статистика */}
        <section className="calendar-conversion" aria-labelledby="calendar-conversion-title">
          <h3 id="calendar-conversion-title" className="calendar-conversion-title">
            <span className="calendar-conversion-title-icon" aria-hidden="true"><TrendingUp className="w-4 h-4" strokeWidth={2.1} /></span>
            Конверсия за период
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {/* Проведено от запланированных */}
            <div className="calendar-conversion-metric calendar-conversion-metric--completed flex flex-col items-center">
              <div className="calendar-conversion-ring relative w-20 h-20 mb-2">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80" aria-hidden="true">
                  <circle
                    cx="40"
                    cy="40"
                    r="32"
                    fill="none"
                    stroke="#eaddec"
                    strokeWidth="6"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r="32"
                    fill="none"
                    stroke="url(#gradient-completed)"
                    strokeWidth="6"
                    strokeDasharray={`${2 * Math.PI * 32}`}
                    strokeDashoffset={`${2 * Math.PI * 32 * (1 - completedPercent / 100)}`}
                    strokeLinecap="round"
                    className="transition-all duration-500"
                  />
                  <defs>
                    <linearGradient id="gradient-completed" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#C96C29" />
                      <stop offset="100%" stopColor="#E9A05B" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="calendar-conversion-value">{completedPercent}%</span>
                </div>
              </div>
              <p className="calendar-conversion-label">Проведено</p>
              <p className="calendar-conversion-ratio">{conductedMeetings}/{totalPlannedMeetings}</p>
            </div>

            {/* С продажами от проведенных */}
            <div className="calendar-conversion-metric calendar-conversion-metric--sales flex flex-col items-center">
              <div className="calendar-conversion-ring relative w-20 h-20 mb-2">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80" aria-hidden="true">
                  <circle
                    cx="40"
                    cy="40"
                    r="32"
                    fill="none"
                    stroke="#eaddec"
                    strokeWidth="6"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r="32"
                    fill="none"
                    stroke="url(#gradient-sales-completed)"
                    strokeWidth="6"
                    strokeDasharray={`${2 * Math.PI * 32}`}
                    strokeDashoffset={`${2 * Math.PI * 32 * (1 - salesFromCompletedPercent / 100)}`}
                    strokeLinecap="round"
                    className="transition-all duration-500"
                  />
                  <defs>
                    <linearGradient id="gradient-sales-completed" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#4F164B" />
                      <stop offset="100%" stopColor="#772559" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="calendar-conversion-value">{salesFromCompletedPercent}%</span>
                </div>
              </div>
              <p className="calendar-conversion-label">Продажи / проведено</p>
              <p className="calendar-conversion-ratio">{completedWithSale}/{conductedMeetings}</p>
            </div>

            {/* С продажами от запланированных */}
            <div className="calendar-conversion-metric calendar-conversion-metric--planned flex flex-col items-center">
              <div className="calendar-conversion-ring relative w-20 h-20 mb-2">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80" aria-hidden="true">
                  <circle
                    cx="40"
                    cy="40"
                    r="32"
                    fill="none"
                    stroke="#eaddec"
                    strokeWidth="6"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r="32"
                    fill="none"
                    stroke="url(#gradient-sales-planned)"
                    strokeWidth="6"
                    strokeDasharray={`${2 * Math.PI * 32}`}
                    strokeDashoffset={`${2 * Math.PI * 32 * (1 - salesFromPlannedPercent / 100)}`}
                    strokeLinecap="round"
                    className="transition-all duration-500"
                  />
                  <defs>
                    <linearGradient id="gradient-sales-planned" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#683489" />
                      <stop offset="100%" stopColor="#924373" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="calendar-conversion-value">{salesFromPlannedPercent}%</span>
                </div>
              </div>
              <p className="calendar-conversion-label">Продажи / запланировано</p>
              <p className="calendar-conversion-ratio">{completedWithSale}/{totalPlannedMeetings}</p>
            </div>

            {/* Отмененных и перенесенных */}
            <div className="calendar-conversion-metric calendar-conversion-metric--cancelled flex flex-col items-center">
              <div className="calendar-conversion-ring relative w-20 h-20 mb-2">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80" aria-hidden="true">
                  <circle
                    cx="40"
                    cy="40"
                    r="32"
                    fill="none"
                    stroke="#f5dbe1"
                    strokeWidth="6"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r="32"
                    fill="none"
                    stroke="url(#gradient-cancelled)"
                    strokeWidth="6"
                    strokeDasharray={`${2 * Math.PI * 32}`}
                    strokeDashoffset={`${2 * Math.PI * 32 * (1 - cancelledRescheduledPercent / 100)}`}
                    strokeLinecap="round"
                    className="transition-all duration-500"
                  />
                  <defs>
                    <linearGradient id="gradient-cancelled" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#B42345" />
                      <stop offset="100%" stopColor="#D15774" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="calendar-conversion-value">{cancelledRescheduledPercent}%</span>
                </div>
              </div>
              <p className="calendar-conversion-label">Отменено и перенесено</p>
              <p className="calendar-conversion-ratio">{monthStats.cancelled + monthStats.rescheduled}/{totalPlannedMeetings}</p>
            </div>
          </div>
        </section>
      </div>

      {/* Календарная сетка */}
      <div className="calendar-period-surface bg-white rounded-3xl shadow-lg p-4 sm:p-6">
        <div className={`calendar-period-grid calendar-period-grid--${calendarPeriod}`}>
          {periodMonths.map(month => (
            <CalendarMonthView
              key={`${month.getFullYear()}-${month.getMonth()}`}
              month={month}
              meetings={periodMeetings}
              clients={clients}
              isManager={user?.role === 'manager'}
              condensed={calendarPeriod !== 'month'}
              onSelectDay={(date) => {
                setSelectedDayDate(date);
              }}
            />
          ))}
        </div>
      </div>

      {/* Легенда */}
      <div className="bg-white rounded-3xl shadow-lg p-6">
        <h3 className="font-bold text-[#2D1B69] mb-4">Обозначения</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="flex items-center gap-2">
            <div className="calendar-period-legend-swatch calendar-period-legend-swatch--scheduled" />
            <span className="text-sm text-gray-700">Записан</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="calendar-period-legend-swatch calendar-period-legend-swatch--ready" />
            <span className="text-sm text-gray-700">Анкета заполнена</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="calendar-period-legend-swatch calendar-period-legend-swatch--completed" />
            <span className="text-sm text-gray-700">Проведена</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="calendar-period-legend-swatch calendar-period-legend-swatch--sale" />
            <span className="text-sm text-gray-700">С продажей</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="calendar-period-legend-swatch calendar-period-legend-swatch--cancelled" />
            <span className="text-sm text-gray-700">Отменена</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="calendar-period-legend-swatch calendar-period-legend-swatch--rescheduled" />
            <span className="text-sm text-gray-700">Перенесена</span>
          </div>
        </div>
      </div>

      {/* Диалог с подробностями дня */}
      {selectedDayDate !== null && (
        <DayDetailsDialog
          day={selectedDayDate.getDate()}
          month={selectedDayDate.getMonth()}
          year={selectedDayDate.getFullYear()}
          meetings={periodMeetings.filter(meeting =>
            meeting.date.getFullYear() === selectedDayDate.getFullYear() &&
            meeting.date.getMonth() === selectedDayDate.getMonth() &&
            meeting.date.getDate() === selectedDayDate.getDate())}
          clients={clients}
          onStatusChange={onStatusChange}
          onUpdateNotes={onUpdateNotes}
          onRescheduleMeeting={onRescheduleMeeting}
          onClose={() => {
            setSelectedDayDate(null);
          }}
          availableTariffs={availableTariffs}
        />
      )}
    </div>
  );
}
