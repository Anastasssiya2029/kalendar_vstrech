import React from 'react';
import { Client } from '../types';
import { Calendar, TrendingUp } from 'lucide-react';
import { useMemo } from 'react';
import { motion } from 'motion/react';

interface MonthlyOverviewProps {
  clients: Client[];
}

const getMonthName = (date: Date) => {
  const months = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
  return `${months[date.getMonth()]} ${date.getFullYear()}`;
};

export function MonthlyOverview({ clients }: MonthlyOverviewProps) {
  const currentMonth = new Date();
  const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);

  const currentMonthData = useMemo(() => {
    const start = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const end = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0, 23, 59, 59);
    const now = new Date();

    let totalAmount = 0;
    let paidAmount = 0;
    let overdueAmount = 0;
    let count = 0;
    let paidCount = 0;

    clients.forEach(client => {
      client.payments.forEach(payment => {
        const paymentDate = new Date(payment.date);
        if (paymentDate >= start && paymentDate <= end) {
          totalAmount += payment.amount;
          count++;
          if (payment.paid) {
            paidAmount += payment.amount;
            paidCount++;
          } else if (paymentDate < now) {
            overdueAmount += payment.amount;
          }
        }
      });
    });

    const expectedAmount = totalAmount - paidAmount;

    return { totalAmount, paidAmount, expectedAmount, overdueAmount, count, paidCount };
  }, [clients, currentMonth]);

  const nextMonthData = useMemo(() => {
    const start = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 1);
    const end = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0, 23, 59, 59);

    let totalAmount = 0;
    let paidAmount = 0;
    let count = 0;
    let paidCount = 0;

    clients.forEach(client => {
      client.payments.forEach(payment => {
        const paymentDate = new Date(payment.date);
        if (paymentDate >= start && paymentDate <= end) {
          totalAmount += payment.amount;
          count++;
          if (payment.paid) {
            paidAmount += payment.amount;
            paidCount++;
          }
        }
      });
    });

    return { totalAmount, paidAmount, count, paidCount };
  }, [clients, nextMonth]);

  return (
    <>
      {/* Задача #18 - Sticky summary bar на мобильных */}
      <div className="sticky top-16 sm:top-20 z-40 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 -mx-4 sm:mx-0 px-4 sm:px-0 py-3 sm:py-0 mb-4 sm:mb-0 backdrop-blur-sm sm:backdrop-blur-none shadow-sm sm:shadow-none">
        <div className="grid grid-cols-3 gap-2 sm:hidden">
          <div className="bg-white/90 backdrop-blur-sm rounded-xl p-2 text-center shadow-sm">
            <p className="text-xs text-gray-600 mb-0.5">Ожидается</p>
            <p className="text-sm font-semibold text-gray-900">{currentMonthData.expectedAmount.toLocaleString()} ₽</p>
          </div>
          <div className="bg-white/90 backdrop-blur-sm rounded-xl p-2 text-center shadow-sm">
            <p className="text-xs text-gray-600 mb-0.5">Оплачено</p>
            <p className="text-sm font-semibold text-green-600">{currentMonthData.paidAmount.toLocaleString()} ₽</p>
          </div>
          <div className="bg-white/90 backdrop-blur-sm rounded-xl p-2 text-center shadow-sm">
            <p className="text-xs text-gray-600 mb-0.5">Просрочено</p>
            <p className="text-sm font-semibold text-red-600">{currentMonthData.overdueAmount.toLocaleString()} ₽</p>
          </div>
        </div>
      </div>

      {/* Задача #19 - Spring physics slide анимация */}
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ 
          type: "spring",
          stiffness: 100,
          damping: 15
        }}
        className="bg-white rounded-3xl shadow-3d hover:shadow-3d-hover transition-all duration-500 p-4 sm:p-6 lg:p-8 gpu-accelerated"
      >
        <h2 className="mb-4 sm:mb-6">Ожидаем в этом и следующем месяце</h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          {/* Current Month - 3D Card */}
          <div className="bg-white rounded-3xl shadow-3d hover:shadow-3d-hover transition-all duration-500 hover:-translate-y-2">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-300/40 animate-gradient">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-gray-900">
                  {getMonthName(currentMonth)}
                </h3>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-gray-600 mb-1 font-semibold">Ожидается платежей:</p>
                  <p className="text-gray-900">{currentMonthData.count} платежей на {currentMonthData.totalAmount.toLocaleString('ru-RU')} ₽</p>
                </div>
                <div>
                  <p className="text-gray-600 mb-1 font-semibold">Получено:</p>
                  <p className="text-gray-900">{currentMonthData.paidCount} платежей на {currentMonthData.paidAmount.toLocaleString('ru-RU')} ₽</p>
                </div>
                <div className="pt-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600 font-semibold">Процент выполнения:</span>
                    <span className="text-[#263238]">
                      {currentMonthData.count > 0 
                        ? Math.round((currentMonthData.paidCount / currentMonthData.count) * 100)
                        : 0}%
                    </span>
                  </div>
                  <div className="h-3 bg-gradient-to-r from-blue-100/50 via-purple-100/50 to-pink-100/50 rounded-full overflow-hidden shadow-inner">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transition-all duration-700 ease-out shadow-lg"
                      style={{ 
                        width: `${currentMonthData.count > 0 
                          ? Math.round((currentMonthData.paidCount / currentMonthData.count) * 100) 
                          : 0}%` 
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Next Month - 3D Card */}
          <div className="bg-white rounded-3xl shadow-3d hover:shadow-3d-hover transition-all duration-500 hover:-translate-y-2">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-pink-300/40">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-gray-900">
                  {getMonthName(nextMonth)}
                </h3>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-gray-600 mb-1 font-semibold">Запланировано платежей:</p>
                  <p className="text-gray-900">{nextMonthData.count} платежей на {nextMonthData.totalAmount.toLocaleString('ru-RU')} ₽</p>
                </div>
                <div>
                  <p className="text-gray-600 mb-1 font-semibold">Получено:</p>
                  <p className="text-gray-900">{nextMonthData.paidCount} платежей на {nextMonthData.paidAmount.toLocaleString('ru-RU')} ₽</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}