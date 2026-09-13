import React from 'react';
import { Client } from '../types';
import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';
import { DayDetailsDialog } from './DayDetailsDialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

interface PaymentCalendarProps {
  clients: Client[];
  currentMonth?: Date;
  onMonthChange?: (month: Date) => void;
  onTogglePayment: (clientId: string, paymentIndex: number) => void;
  onPostponePayment: (clientId: string, paymentIndex: number, newDate: Date, reason: string) => void;
  onPaymentAmountChange: (clientId: string, paymentIndex: number, newAmount: number) => void;
  onCommentChange: (clientId: string, paymentIndex: number, comment: string) => void;
}

const getMonthName = (date: Date) => {
  const months = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
  return `${months[date.getMonth()]} ${date.getFullYear()}`;
};

const formatDateLong = (date: Date) => {
  const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
};

const isSameDay = (date1: Date, date2: Date) => {
  return date1.getDate() === date2.getDate() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getFullYear() === date2.getFullYear();
};

const isSameMonth = (date1: Date, date2: Date) => {
  return date1.getMonth() === date2.getMonth() &&
         date1.getFullYear() === date2.getFullYear();
};

export function PaymentCalendar({ 
  clients, 
  currentMonth: propCurrentMonth,
  onMonthChange,
  onTogglePayment,
  onPostponePayment,
  onPaymentAmountChange,
  onCommentChange
}: PaymentCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(propCurrentMonth || new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dayDetailsOpen, setDayDetailsOpen] = useState(false);

  useEffect(() => {
    if (propCurrentMonth) {
      setCurrentMonth(propCurrentMonth);
    }
  }, [propCurrentMonth]);

  const handleMonthChange = (newMonth: Date) => {
    setCurrentMonth(newMonth);
    onMonthChange?.(newMonth);
  };

  const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
  
  // Get the day of week (0 = Sunday, 1 = Monday, etc.)
  const firstDayOfWeek = monthStart.getDay();
  // Convert to Monday-based (0 = Monday, 6 = Sunday)
  const startDayOffset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
  
  const calendarStart = new Date(monthStart);
  calendarStart.setDate(calendarStart.getDate() - startDayOffset);
  
  const lastDayOfWeek = monthEnd.getDay();
  const endDayOffset = lastDayOfWeek === 0 ? 0 : 7 - lastDayOfWeek;
  
  const calendarEnd = new Date(monthEnd);
  calendarEnd.setDate(calendarEnd.getDate() + endDayOffset);
  
  const calendarDays: Date[] = [];
  const currentDate = new Date(calendarStart);
  while (currentDate <= calendarEnd) {
    calendarDays.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }

  const getPaymentsForDay = (day: Date) => {
    const dayPayments: Array<{
      client: Client;
      paymentIndex: number;
      payment: {
        date: Date;
        amount: number;
        paid: boolean;
        originalDate?: Date;
        postponeReason?: string;
        comment?: string;
      };
    }> = [];
    
    clients.forEach(client => {
      client.payments.forEach((payment, index) => {
        if (isSameDay(payment.date, day)) {
          dayPayments.push({
            client,
            paymentIndex: index,
            payment
          });
        }
      });
    });

    return dayPayments;
  };

  const getDayTotal = (day: Date) => {
    const payments = getPaymentsForDay(day);
    return payments.reduce((sum, p) => sum + p.payment.amount, 0);
  };

  const handleDayClick = (day: Date) => {
    const payments = getPaymentsForDay(day);
    if (payments.length > 0 || isSameMonth(day, currentMonth)) {
      setSelectedDate(day);
      setDayDetailsOpen(true);
    }
  };

  const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  return (
    <>
      <div className="backdrop-blur-xl bg-white/80 rounded-3xl border border-purple-200/50 shadow-2xl shadow-purple-200/20 hover:shadow-purple-300/30 transition-all duration-500">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2>
              {getMonthName(currentMonth)}
            </h2>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleMonthChange(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
                className="border-purple-200/50 bg-white/90 text-[#2D1B69] hover:bg-purple-100/30 hover:text-[#263238] transition-all duration-300 rounded-2xl"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleMonthChange(new Date())}
                className="border-purple-200/50 bg-white/90 text-[#2D1B69] hover:bg-purple-100/30 hover:text-[#263238] transition-all duration-300 rounded-2xl"
              >
                Месяц
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleMonthChange(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
                className="border-purple-200/50 bg-white/90 text-[#2D1B69] hover:bg-purple-100/30 hover:text-[#263238] transition-all duration-300 rounded-2xl"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-0">
            {/* Week Day Headers */}
            {weekDays.map(day => (
              <div key={day} className="text-center py-2 text-[#263238]/70 font-semibold border-b-2 border-dashed border-purple-300/60">
                {day}
              </div>
            ))}

            {/* Calendar Days */}
            <TooltipProvider>
              {calendarDays.map((day, index) => {
                const payments = getPaymentsForDay(day);
                const dayTotal = getDayTotal(day);
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isToday = isSameDay(day, new Date());
                const hasPaidPayments = payments.some(p => p.payment.paid);
                const hasUnpaidPayments = payments.some(p => !p.payment.paid);
                const hasPostponedPayments = payments.some(p => p.payment.originalDate);

                return (
                  <Tooltip key={index}>
                    <TooltipTrigger asChild>
                      <div
                        onClick={() => handleDayClick(day)}
                        className={`
                          min-h-24 p-3 transition-all duration-300 cursor-pointer
                          border border-dashed border-purple-300/50
                          ${!isCurrentMonth ? 'bg-purple-50/30 opacity-40' : 'bg-white/50'}
                          ${isToday ? 'ring-2 ring-purple-600 bg-purple-100/30 shadow-lg shadow-purple-300/20 border-solid border-purple-400/50' : ''}
                          ${payments.length > 0 ? 'hover:shadow-xl hover:scale-[1.02] hover:ring-2 hover:ring-purple-300/50 hover:border-solid hover:border-purple-300/50 hover:z-10' : 'hover:bg-purple-50/50'}
                        `}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className={`${isToday ? 'text-purple-600' : 'text-[#2D1B69]'}`}>
                            {day.getDate()}
                          </span>
                          {payments.length > 0 && (
                            <div className="flex gap-1 items-center flex-wrap">
                              {hasPostponedPayments && <span className="text-xs">🙏</span>}
                              {hasPaidPayments && (
                                <div className="w-2 h-2 rounded-full bg-green-500 shadow-sm shadow-green-500/50" />
                              )}
                              {hasUnpaidPayments && (
                                <div className="w-2 h-2 rounded-full bg-purple-600 shadow-sm shadow-purple-600/50" />
                              )}
                            </div>
                          )}
                        </div>
                        {dayTotal > 0 && (
                          <div className="mt-1">
                            <p className="text-[#2D1B69] break-words text-xs">
                              {(dayTotal / 1000).toFixed(0)}k ₽
                            </p>
                            <p className="text-[#263238]/70 text-xs">
                              {payments.length} шт
                            </p>
                          </div>
                        )}
                      </div>
                    </TooltipTrigger>
                    {payments.length > 0 && (
                      <TooltipContent className="max-w-sm p-4 bg-white/95 backdrop-blur-xl border-purple-200/50 rounded-2xl shadow-2xl">
                        <div className="space-y-2">
                          <p className="text-[#2D1B69] mb-2">
                            {formatDateLong(day)}
                          </p>
                          {payments.slice(0, 3).map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center gap-3 border-t border-purple-200/50 pt-2">
                              <div>
                                <p className="text-[#2D1B69] flex items-center gap-1">
                                  {item.client.name}
                                  {item.payment.originalDate && <span>🙏</span>}
                                </p>
                                <p className="text-[#263238]/70">{item.client.username}</p>
                              </div>
                              <div className="text-right">
                                <p className={item.payment.paid ? 'text-green-600' : 'text-[#263238]'} >
                                  {item.payment.amount.toLocaleString('ru-RU')} ₽
                                </p>
                                <p className={`text-xs ${item.payment.paid ? 'text-green-600' : 'text-[#263238]/70'}`}>
                                  {item.payment.paid ? 'Оплачено' : 'Ожидается'}
                                </p>
                              </div>
                            </div>
                          ))}
                          {payments.length > 3 && (
                            <p className="text-[#263238]/70 text-center text-xs mt-2">
                              И еще {payments.length - 3}...
                            </p>
                          )}
                          <p className="text-[#263238]/70 text-center text-xs mt-2 pt-2 border-t border-purple-200/50">
                            Кликните для подробностей
                          </p>
                        </div>
                      </TooltipContent>
                    )}
                  </Tooltip>
                );
              })}
            </TooltipProvider>
          </div>

          {/* Legend */}
          <div className="mt-6 pt-4 border-t border-purple-200/50 flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500 shadow-sm shadow-green-500/50" />
              <span className="text-[#263238]/70 font-semibold">Оплачено</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-600 shadow-sm shadow-purple-600/50" />
              <span className="text-[#263238]/70 font-semibold">Ожидается</span>
            </div>
            <div className="flex items-center gap-2">
              <span>🙏</span>
              <span className="text-[#263238]/70 font-semibold">Перенесен</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-lg ring-2 ring-purple-600" />
              <span className="text-[#263238]/70 font-semibold">Сегодня</span>
            </div>
          </div>
        </div>
      </div>

      {selectedDate && (
        <DayDetailsDialog
          open={dayDetailsOpen}
          onOpenChange={setDayDetailsOpen}
          date={selectedDate}
          payments={getPaymentsForDay(selectedDate)}
          onTogglePayment={onTogglePayment}
          onPostponePayment={onPostponePayment}
          onPaymentAmountChange={onPaymentAmountChange}
          onCommentChange={onCommentChange}
        />
      )}
    </>
  );
}