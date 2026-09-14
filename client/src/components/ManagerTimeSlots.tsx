import React, { useState } from 'react';
import { TimeSlot, getDayType, getTimeOfDay } from '../types';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Calendar as CalendarIcon, Clock, Trash2, Plus, CheckCircle2 } from 'lucide-react';
import { parseLocalDateInput } from '../utils/dateOnly';

interface ManagerTimeSlotsProps {
  managerId: string;
  managerName: string;
  schoolId: string;
  slots: TimeSlot[];
  onAddSlot: (slot: Omit<TimeSlot, 'id'>) => void;
  onDeleteSlot: (slotId: string) => void;
}

const TIME_OPTIONS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30',
  '20:00', '20:30', '21:00'
];

// Вспомогательные функции для работы с датами
const formatDateForInput = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDateLong = (date: Date): string => {
  const months = [
    'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
    'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
  ];
  const weekdays = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
  
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  const weekday = weekdays[date.getDay()];
  
  return `${weekday}, ${day} ${month} ${year}`;
};

export function ManagerTimeSlots({
  managerId,
  managerName,
  schoolId,
  slots,
  onAddSlot,
  onDeleteSlot
}: ManagerTimeSlotsProps) {
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [startTime, setStartTime] = useState('09:00');
  const [isAdding, setIsAdding] = useState(false);

  const handleAddSlot = () => {
    if (!selectedDate) {
      alert('Выберите дату');
      return;
    }

    const newSlot: Omit<TimeSlot, 'id'> = {
      managerId,
      managerName,
      date: selectedDate,
      startTime,
      isBooked: false,
      schoolId
    };

    onAddSlot(newSlot);
    
    // Сброс формы
    setSelectedDate(undefined);
    setStartTime('09:00');
    setIsAdding(false);
  };

  // Группировка слотов по дате
  const groupedSlots = slots.reduce((acc, slot) => {
    const dateKey = formatDateForInput(slot.date);
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(slot);
    return acc;
  }, {} as Record<string, TimeSlot[]>);

  // Сортировка дат
  const sortedDates = Object.keys(groupedSlots).sort((a, b) => 
    new Date(a).getTime() - new Date(b).getTime()
  );

  const getDayTypeLabel = (dayType: 'weekday' | 'weekend') => {
    return dayType === 'weekday' ? '📅 Будни' : '🎉 Выходные';
  };

  const getTimeOfDayLabel = (timeOfDay: 'morning' | 'afternoon' | 'evening') => {
    switch (timeOfDay) {
      case 'morning': return '🌅 Утро';
      case 'afternoon': return '☀️ День';
      case 'evening': return '🌙 Вечер';
    }
  };

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <h2>Мои окошки</h2>
          <p className="text-gray-600 mt-1">
            Управляйте своим расписанием для встреч с клиентами
          </p>
        </div>
        <Button
          onClick={() => setIsAdding(!isAdding)}
          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg"
        >
          {isAdding ? (
            <>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Скрыть форму
            </>
          ) : (
            <>
              <Plus className="w-4 h-4 mr-2" />
              Добавить окошко
            </>
          )}
        </Button>
      </div>

      {/* Форма добавления */}
      {isAdding && (
        <div className="bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 rounded-3xl p-6 border-2 border-purple-200 shadow-lg">
          <h3 className="text-lg font-bold text-[#2D1B69] mb-4">
            ✨ Добавить свободное окно
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Выбор даты */}
            <div className="space-y-2">
              <Label htmlFor="date" className="text-gray-700 font-semibold">
                Дата
              </Label>
              <Input
                id="date"
                type="date"
                value={selectedDate ? formatDateForInput(selectedDate) : ''}
                onChange={(e) => setSelectedDate(parseLocalDateInput(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Время начала */}
            <div className="space-y-2">
              <Label htmlFor="startTime" className="text-gray-700 font-semibold">
                Время начала
              </Label>
              <select
                id="startTime"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {TIME_OPTIONS.map(time => (
                  <option key={time} value={time}>{time}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Кнопка добавления */}
          <div className="mt-4 flex justify-end">
            <Button
              onClick={handleAddSlot}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Создать окошко
            </Button>
          </div>

          {/* Автоматическая метка */}
          {selectedDate && (
            <div className="mt-4 p-3 bg-white/80 rounded-xl border border-purple-200">
              <p className="text-sm text-gray-600">
                <strong>Автоматические метки:</strong>
              </p>
              <div className="flex gap-3 mt-2">
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm">
                  {getDayTypeLabel(getDayType(selectedDate))}
                </span>
                {getTimeOfDay(startTime) && (
                  <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-sm">
                    {getTimeOfDayLabel(getTimeOfDay(startTime)!)}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Список существующих слотов */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-[#2D1B69]">
          📋 Ваши свободные окна ({slots.filter(s => !s.isBooked).length})
        </h3>

        {slots.length === 0 ? (
          <div className="text-center py-12 bg-gradient-to-br from-gray-50 to-gray-100 rounded-3xl border-2 border-dashed border-gray-300">
            <Clock className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 text-lg">У вас пока нет окошек</p>
            <p className="text-gray-500 mt-2">Добавьте свободные окошки для встреч с клиентами</p>
          </div>
        ) : (
          <div className="space-y-6">
            {sortedDates.map(dateKey => {
              const date = new Date(dateKey);
              const slotsForDate = groupedSlots[dateKey].sort((a, b) => 
                a.startTime.localeCompare(b.startTime)
              );

              return (
                <div key={dateKey} className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                  {/* Заголовок даты */}
                  <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-white font-bold text-lg">
                        {formatDateLong(date)}
                      </h4>
                      <span className="px-3 py-1 bg-white/20 rounded-lg text-white text-sm">
                        {slotsForDate.filter(s => !s.isBooked).length} свободных
                      </span>
                    </div>
                  </div>

                  {/* Слоты */}
                  <div className="divide-y divide-gray-100">
                    {slotsForDate.map(slot => (
                      <div
                        key={slot.id}
                        className={`px-6 py-4 flex items-center justify-between transition-all ${
                          slot.isBooked 
                            ? "bg-gray-100 opacity-60" 
                            : "hover:bg-purple-50"
                        }`}
                      >
                        <div className="flex items-center gap-4 flex-1">
                          {/* Иконка времени */}
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                            slot.isBooked 
                              ? "bg-gray-200" 
                              : "bg-gradient-to-br from-purple-100 to-pink-100"
                          }`}>
                            <Clock className={`w-6 h-6 ${
                              slot.isBooked ? "text-gray-500" : "text-purple-600"
                            }`} />
                          </div>

                          {/* Информация о слоте */}
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-lg font-bold text-gray-800">
                                {slot.startTime}
                              </span>
                              {slot.isBooked && (
                                <span className="px-2 py-0.5 bg-gray-300 text-gray-700 rounded text-xs font-semibold">
                                  ЗАНЯТ
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Кнопка удаления */}
                        {!slot.isBooked && (
                          <Button
                            onClick={() => onDeleteSlot(slot.id)}
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-4 border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-700 text-sm font-semibold">Свободных окошек</p>
              <p className="text-3xl font-bold text-green-800 mt-1">
                {slots.filter(s => !s.isBooked).length}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-200 rounded-xl flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-4 border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-700 text-sm font-semibold">Забронировано</p>
              <p className="text-3xl font-bold text-purple-800 mt-1">
                {slots.filter(s => s.isBooked).length}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-200 rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-4 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-700 text-sm font-semibold">Всего окошек</p>
              <p className="text-3xl font-bold text-blue-800 mt-1">
                {slots.length}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-200 rounded-xl flex items-center justify-center">
              <CalendarIcon className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
