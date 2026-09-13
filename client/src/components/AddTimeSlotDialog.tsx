import React, { useState, useMemo } from 'react';
import { TimeSlot } from '../types';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useAuth } from '../contexts/AuthContext';

interface AddTimeSlotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddSlot: (slot: Omit<TimeSlot, 'id'>) => void;
  schoolId: string;
  allSlots: TimeSlot[];
}

const TIME_OPTIONS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30',
  '20:00', '20:30', '21:00'
];

const formatDateForInput = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getTodayFormatted = (): string => {
  return formatDateForInput(new Date());
};

export function AddTimeSlotDialog({ 
  open, 
  onOpenChange, 
  onAddSlot, 
  schoolId, 
  allSlots 
}: AddTimeSlotDialogProps) {
  const { user } = useAuth();
  
  // Получаем уникальных менеджеров
  const managers = useMemo(() => {
    const managersMap = new Map<string, string>();
    allSlots.forEach(slot => {
      if (!managersMap.has(slot.managerId)) {
        managersMap.set(slot.managerId, slot.managerName);
      }
    });
    return Array.from(managersMap.entries()).map(([id, name]) => ({ id, name }));
  }, [allSlots]);

  // Инициализируем selectedManagerId правильно
  const getInitialManagerId = () => {
    if (user?.role === 'manager') {
      return user.id;
    }
    // Для админа/помощника берем первого менеджера из списка
    return managers.length > 0 ? managers[0].id : user?.id || '';
  };

  const [selectedDate, setSelectedDate] = useState(getTodayFormatted());
  const [selectedTime, setSelectedTime] = useState('10:00');
  const [selectedManagerId, setSelectedManagerId] = useState(getInitialManagerId());

  // Обновляем selectedManagerId при изменении managers или открытии диалога
  React.useEffect(() => {
    if (open) {
      setSelectedManagerId(getInitialManagerId());
    }
  }, [open, managers, user]);

  const handleSubmit = () => {
    if (!selectedDate || !selectedTime) return;

    const managerName = managers.find(m => m.id === selectedManagerId)?.name || user?.name || '';

    const slot: Omit<TimeSlot, 'id'> = {
      managerId: selectedManagerId,
      managerName: managerName,
      date: new Date(selectedDate),
      startTime: selectedTime,
      isBooked: false,
      schoolId: schoolId
    };

    onAddSlot(slot);
    onOpenChange(false);
    
    // Сбрасываем форму
    setSelectedDate(getTodayFormatted());
    setSelectedTime('10:00');
    setSelectedManagerId(getInitialManagerId());
  };

  const handleCancel = () => {
    onOpenChange(false);
    // Сбрасываем форму
    setSelectedDate(getTodayFormatted());
    setSelectedTime('10:00');
    setSelectedManagerId(getInitialManagerId());
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-3d p-6 max-w-md w-full">
        <h3 className="text-xl mb-4 text-[#2D1B69]">Добавить окошко</h3>
        
        <div className="space-y-4 mb-6">
          {/* Выбор менеджера (только для админа и помощника) */}
          {user?.role !== 'manager' && managers.length > 0 && (
            <div>
              <Label className="mb-2 block">Менеджер</Label>
              <select
                value={selectedManagerId}
                onChange={(e) => setSelectedManagerId(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {managers.map(manager => (
                  <option key={manager.id} value={manager.id}>
                    {manager.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Дата */}
          <div>
            <Label className="mb-2 block">Дата</Label>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={getTodayFormatted()}
              className="rounded-xl border-2 border-gray-200 focus:border-purple-500"
            />
          </div>

          {/* Время */}
          <div>
            <Label className="mb-2 block">Время</Label>
            <select
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
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
            onClick={handleCancel}
            variant="outline"
            className="flex-1 rounded-xl border-2 border-gray-200"
          >
            Отмена
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedDate || !selectedTime || !selectedManagerId}
            className="flex-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 text-white rounded-xl"
          >
            Добавить
          </Button>
        </div>
      </div>
    </div>
  );
}
