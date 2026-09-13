// ============================================
// СТАТУСЫ И ПЕРЕЧИСЛЕНИЯ
// ============================================

// Статус клиента в процессе записи
export type ClientStatus = 
  | 'selecting_time'       // 🟡 Выбор времени (желтый)
  | 'scheduled'            // ⚪ Записан на встречу (серый)
  | 'ready'                // Внутренний признак: анкета заполнена
  | 'completed'            // 🟢 Встреча проведена (зелёный)
  | 'completed_with_sale'  // 🟣 Встреча с продажей (фиолетовый)
  | 'cancelled';           // 🔴 Встреча отменена (красный)

// Статус встречи
export type MeetingStatus =
  | 'scheduled'         // 🔘 Записан (серый)
  | 'scheduled_ready'   // Внутренний признак: анкета заполнена
  | 'completed'         // 🟢 Проведена (зелёный)
  | 'completed_with_sale' // 🟣 С продажей (фиолетовый)
  | 'cancelled'         // 🔴 Отменена (красный)
  | 'rescheduled';      // 🔵 🙏 Перенесена (голубой)

// Способ оплаты
export type PaymentMethod =
  | 'link'              // По ссылке
  | 'invoice'           // По счету
  | 'bank_installment'  // В рассрочку от банка
  | 'internal_installment'; // Внутренняя рассрочка

// Время суток для фильтрации
export type TimeOfDay = 
  | 'morning'   // Утро: 8-11
  | 'afternoon' // День: 12-16
  | 'evening';  // Вечер: 17-21

// Тип дня недели
export type DayType = 
  | 'weekday'   // Будни (Пн-Пт)
  | 'weekend';  // Выходные (по производственному календарю РФ)

// Роли пользователей (сохраняем из старой системы)
export type UserRole = 
  | 'architect'    // Архитектор - главный админ, видит все школы
  | 'admin'        // Админ - владелец школы
  | 'manager'      // Менеджер - проводит встречи
  | 'assistant';   // Помощник - записывает клиентов

// ============================================
// ОСНОВНЫЕ СУЩНОСТИ
// ============================================

// Клиент (переработанная структура)
export interface Client {
  id: string;
  firstName: string;           // Имя
  lastName: string;            // Фамилия
  username: string;            // Юзернейм (@telegram)
  comment?: string;            // Комментарий
  status: ClientStatus;        // Статус клиента
  formCompleted: boolean;      // Галочка "Анкета заполнена"
  pinned?: boolean;            // Закреплен ли клиен
  
  // Встреча
  meeting?: Meeting;           // Текущая или последняя встреча
  
  // Подбор окошек (для помощника)
  suggestedSlots?: TimeSlot[]; // Предложенные окошки
  providedSlotIds?: string[];  // ID окошек, предоставленных на выбор
  timeSelectionClosed?: boolean; // Отмененный клиент временно скрыт из подбора времени
  
  // Метаданные
  schoolId: string;            // К какой школе относится
  createdAt: Date;             // Дата создания
  updatedAt: Date;             // Дата обновления
}

// Встреча
export interface Meeting {
  id: string;
  clientId: string;            // ID клиента
  managerId: string;           // ID менеджера
  managerName: string;         // Имя менеджера (для отображения)
  
  // Дата и время
  date: Date;                  // Дата встречи
  startTime: string;           // Время встречи (формат "HH:MM")
  
  // Статус и результаты
  status: MeetingStatus;       // Статус встречи
  
  // Продажа (если была)
  soldTariff?: string;         // Название проданного тарифа
  saleAmount?: number;         // Сумма продажи
  paymentMethod?: PaymentMethod; // Способ оплаты (не обязательное поле)
  
  // История переносов
  originalDate?: Date;         // Оригинальная дата (если перенесена)
  rescheduleReason?: string;   // Причина переноса
  rescheduleHistory?: RescheduleRecord[]; // История всех переносов
  rescheduledToMeetingId?: string; // ID новой встречи (если эта перенесена)
  rescheduledFromMeetingId?: string; // ID старой встречи (если это перенос)
  
  // Комментарии
  notes?: string;              // Заметки менеджера
  
  // Метаданные
  schoolId: string;            // К какой школе относится
  createdAt: Date;             // Дата создания
  updatedAt: Date;             // Дата обновления
}

// Запись о переносе встречи
export interface RescheduleRecord {
  oldDate: Date;
  newDate: Date;
  oldTime: string;
  newTime: string;
  oldManagerId: string;        // ID старого менеджера
  oldManagerName: string;      // Имя старого менеджера
  newManagerId: string;        // ID нового менеджера
  newManagerName: string;      // Имя нового менеджера
  reason: string;
  timestamp: Date;             // Когда был перенос
  performedBy: string;         // Кто перенес
}

// Окошко менеджера
export interface TimeSlot {
  id: string;
  managerId: string;           // ID менеджера
  managerName: string;         // Имя менеджера (для отображения)
  
  // Дата и время
  date: Date;                  // Дата
  startTime: string;           // Время начала (формат "HH:MM")
  
  // Статус
  isBooked: boolean;           // Занят или свободен
  bookingId?: string;          // ID встречи, если забронирован
  
  // Метаданные
  schoolId: string;            // К какой школе относится
}

// ============================================
// ФИЛЬТРЫ И ПАРАМЕТРЫ ПОИСКА
// ============================================

// Фильтр для подбора окошек
export interface TimeSlotFilter {
  dayType?: DayType;           // Будни или выходные
  timeOfDay?: TimeOfDay;       // Утро, день или вечер
  managerId?: string;          // Конкретный менеджер
  dateFrom?: Date;             // Дата от
  dateTo?: Date;               // Дата до
}

// Результат подбора окошек (для помощника)
export interface TimeSlotSuggestion {
  managerName: string;
  slots: TimeSlot[];
  formattedText: string;       // Готовый текст для копирования
}

// ============================================
// АНАЛИТИКА
// ============================================

// Статистика менеджера
export interface ManagerStats {
  managerId: string;
  managerName: string;
  period: {
    from: Date;
    to: Date;
  };
  
  // Основные метрики
  totalScheduled: number;       // Всего запланировано
  totalCompleted: number;       // Проведено встреч
  totalWithSale: number;        // Встреч с продажей
  totalCancelled: number;       // Отменено встреч
  
  // Конверсия
  conversionRate: number;       // (встречи с продажей / проведенные) * 100%
  
  // Финансы
  totalRevenue: number;         // Общий оборот продаж
  averageSale: number;          // Средний чек
  
  // Детальная разбивка по тарифам
  salesByTariff: {
    tariffName: string;
    count: number;
    totalAmount: number;
  }[];
}

// Статистика по месяцу (для годового обзора)
export interface MonthlyStats {
  month: number;                // 0-11 (январь-декабрь)
  year: number;
  totalScheduled: number;       // Запланировано
  totalCompleted: number;       // Проведено
  totalWithSale: number;        // С продажей
  totalCancelled: number;       // Отменено
}

// ============================================
// ПОЛЬЗОВАТЕЛИ И ШКОЛЫ (сохраняем)
// ============================================

// Пользователь
export interface User {
  id: string;
  username: string;
  password: string;             // Хешированный пароль
  role: UserRole;
  firstName: string;
  lastName: string;
  email?: string;
  
  // Привязка к школам
  schoolIds: string[];          // Школы, к которым имеет доступ
  
  // Для менеджеров - доступные окошки
  timeSlots?: TimeSlot[];
  
  createdAt: Date;
  updatedAt: Date;
}

// Школа (онлайн-школа)
export interface School {
  id: string;
  name: string;
  description?: string;
  ownerId: string;              // ID админа-владельца
  
  // Доступные тарифы для продажи
  tariffs: Tariff[];
  
  createdAt: Date;
  updatedAt: Date;
}

// Тариф (для продажи на встречах)
export interface Tariff {
  id: string;
  name: string;
  price: number;
  description?: string;
  isActive: boolean;
}

// ============================================
// ВСПОМОГАТЕЛЬНЫЕ ТИПЫ
// ============================================

// Константы времени суток
export const TIME_OF_DAY_RANGES = {
  morning: { start: '08:00', end: '11:00' },
  afternoon: { start: '12:00', end: '16:00' },
  evening: { start: '17:00', end: '21:00' }
} as const;

// Производственный календарь РФ (упрощенная версия)
// В реальном проекте это должно быть в отдельном модуле с API
export const RUSSIAN_HOLIDAYS_2024 = [
  new Date('2024-01-01'),
  new Date('2024-01-02'),
  new Date('2024-01-03'),
  new Date('2024-01-04'),
  new Date('2024-01-05'),
  new Date('2024-01-06'),
  new Date('2024-01-07'),
  new Date('2024-01-08'),
  new Date('2024-02-23'),
  new Date('2024-03-08'),
  new Date('2024-05-01'),
  new Date('2024-05-09'),
  new Date('2024-06-12'),
  new Date('2024-11-04'),
  // Добавить другие праздники...
];

// Функции-хелперы для определения типа дня
export const getDayType = (date: Date): DayType => {
  const dayOfWeek = date.getDay();
  
  // Проверяем, является ли день выходным по календарю
  const isHoliday = RUSSIAN_HOLIDAYS_2024.some(
    holiday => 
      holiday.getDate() === date.getDate() &&
      holiday.getMonth() === date.getMonth() &&
      holiday.getFullYear() === date.getFullYear()
  );
  
  // Суббота (6) или Воскресенье (0) или раздник
  if (dayOfWeek === 0 || dayOfWeek === 6 || isHoliday) {
    return 'weekend';
  }
  
  return 'weekday';
};

// Функция для определения времени суток
export const getTimeOfDay = (time: string): TimeOfDay | null => {
  const [hours] = time.split(':').map(Number);
  
  if (hours >= 8 && hours < 11) return 'morning';
  if (hours >= 12 && hours < 16) return 'afternoon';
  if (hours >= 17 && hours < 21) return 'evening';
  
  return null;
};

// Функция форматирования имени клиента
export const formatClientName = (client: Client): string => {
  return `${client.firstName} ${client.lastName}`;
};

// Функция получения цвета статуса клиента
export const getClientStatusColor = (status: ClientStatus): string => {
  switch (status) {
    case 'selecting_time': return '#FBBF24'; // Желтый (yellow-500)
    case 'scheduled': return '#A1A1AA';      // Более мягкий серый (zinc-400)
    case 'ready': return '#A1A1AA';          // Не отдельный публичный статус
    case 'completed': return '#2F9E63';      // Зелёный — проведена
    case 'completed_with_sale': return '#6F2E89'; // Фиолетовый — с продажей
    case 'cancelled': return '#D44B66'; // Красный
    default: return '#A1A1AA';
  }
};

// Функция получения цвета статуса встречи
export const getMeetingStatusColor = (status: MeetingStatus): string => {
  switch (status) {
    case 'scheduled': return '#9CA3AF';           // Серый - Записан
    case 'scheduled_ready': return '#9CA3AF';     // Серый — записан, анкета заполнена
    case 'completed': return '#2F9E63';           // Зелёный — проведена
    case 'completed_with_sale': return '#6F2E89'; // Фиолетовый — с продажей
    case 'cancelled': return '#D44B66';           // Красный — отменена
    case 'rescheduled': return '#3B82F6';         // Синий — перенесена
    default: return '#9CA3AF';
  }
};

// Функция получения текста статуса клиента
export const getClientStatusText = (status: ClientStatus): string => {
  switch (status) {
    case 'selecting_time': return 'Выбор времени';
    case 'scheduled': return 'Записан на встречу';
    case 'ready': return 'Записан на встречу';
    case 'completed': return 'Встреча проведена';
    case 'completed_with_sale': return 'Встреча с продажей';
    case 'cancelled': return 'Встреча отменена';
    default: return 'Неизвестно';
  }
};

// Функция получения текста статуса встречи
export const getMeetingStatusText = (status: MeetingStatus): string => {
  switch (status) {
    case 'scheduled': return 'Записан';
    case 'scheduled_ready': return 'Записан';
    case 'completed': return 'Проведена';
    case 'completed_with_sale': return 'С продажей';
    case 'cancelled': return 'Отменена';
    case 'rescheduled': return 'Перенесена';
    default: return 'Неизвестно';
  }
};

// Функция получения актуального статуса встречи на основе статуса клиента
// Это нужно для отображения в календаре - всегда показываем актуальное состояние
export const getActualMeetingStatus = (meeting: Meeting, client: Client): MeetingStatus => {
  const meetingDate = new Date(meeting.date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  meetingDate.setHours(0, 0, 0, 0);
  
  // Если встреча в прошлом - показываем финальный статус
  if (meetingDate < today) {
    // Для прошедших встреч оставляем их итоговый статус
    return meeting.status;
  }
  
  // Если встреча сегодня или в будущем - синхронизируем со статусом клиента
  if (client.status === 'ready' && client.formCompleted) {
    return 'scheduled_ready'; // Внутренний признак: анкета заполнена
  } else if (client.status === 'scheduled') {
    return 'scheduled'; // Просто записан
  } else if (client.status === 'cancelled') {
    return 'cancelled'; // Отменена
  }
  
  // Для остальных случаев возвращаем статус встречи как есть
  return meeting.status;
};
