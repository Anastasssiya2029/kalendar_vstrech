import React from 'react';
import { Client } from '../types';
import { useMemo } from 'react';

interface YearlyOverviewProps {
  clients: Client[];
  onMonthClick: (month: Date) => void;
}

const getMonthName = (date: Date) => {
  const months = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
  return months[date.getMonth()];
};

export function YearlyOverview({ clients, onMonthClick }: YearlyOverviewProps) {
  const monthsData = useMemo(() => {
    const data = [];
    const today = new Date();
    
    for (let i = 0; i < 12; i++) {
      const monthDate = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const start = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
      const end = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59);

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

      data.push({
        date: monthDate,
        totalAmount,
        paidAmount,
        count,
        paidCount,
        percentage: count > 0 ? Math.round((paidCount / count) * 100) : 0
      });
    }

    return data;
  }, [clients]);

  const maxAmount = Math.max(...monthsData.map(m => m.totalAmount), 1);

  return (
    <div className="bg-white rounded-3xl shadow-3d hover:shadow-3d-hover transition-all duration-500">
      <div className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h3 className="text-[#2D1B69] font-semibold text-base sm:text-lg">Обзор платежей на год</h3>
          <div className="flex items-center gap-4 sm:gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg shadow-sm" />
              <span className="text-gray-600">Оплачено</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-[#E8E3FF] rounded-lg" />
              <span className="text-gray-600">Ожидается</span>
            </div>
          </div>
        </div>
        
        {/* Horizontal scroll wrapper for mobile */}
        <div className="overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 scroll-fade-right relative">
          <div className="grid grid-cols-12 gap-2 sm:gap-3 min-w-[800px] sm:min-w-0">
            {monthsData.map((month, index) => {
              const heightPercentage = (month.totalAmount / maxAmount) * 100;
              const paidHeightPercentage = (month.paidAmount / maxAmount) * 100;
              const expectedHeightPercentage = heightPercentage - paidHeightPercentage;
              const isPastMonth = month.date < new Date(new Date().getFullYear(), new Date().getMonth(), 1);
              
              return (
                <div key={index} className="flex flex-col items-center">
                  {/* Bar chart - стаканчик наполняется снизу вверх */}
                  <div 
                    className="w-full h-36 sm:h-48 flex flex-col justify-end mb-2 sm:mb-3 relative group cursor-pointer"
                    onClick={() => onMonthClick(month.date)}
                    title="Кликните для просмотра календаря"
                  >
                    {month.totalAmount > 0 ? (
                      <div 
                        className="w-full flex flex-col rounded-t-2xl overflow-hidden transition-all duration-500 hover:shadow-xl hover:scale-105 shadow-lg"
                        style={{ height: `${heightPercentage}%` }}
                      >
                        {/* Ожидается - сверху */}
                        {expectedHeightPercentage > 0 && (
                          <div 
                            className="w-full bg-gradient-to-b from-purple-200/50 to-purple-100/50 transition-all duration-500"
                            style={{ height: `${(expectedHeightPercentage / heightPercentage) * 100}%` }}
                          />
                        )}
                        {/* Оплачено - снизу (космический градиент) */}
                        {paidHeightPercentage > 0 && (
                          <div 
                            className="w-full bg-gradient-to-t from-blue-500 via-purple-500 to-purple-400 transition-all duration-500"
                            style={{ height: `${(paidHeightPercentage / heightPercentage) * 100}%` }}
                          />
                        )}
                      </div>
                    ) : (
                      <div className="w-full h-4 bg-gray-100 rounded-2xl opacity-50" />
                    )}
                  </div>
                  
                  {/* Month label and amounts */}
                  <div className="text-center w-full space-y-1">
                    <p className="text-gray-900 text-xs sm:text-sm">
                      {getMonthName(month.date)}
                    </p>
                    {month.count > 0 && (
                      <>
                        <p className="text-gray-500 text-xs">
                          {month.count} шт
                        </p>
                        <div className="bg-gray-50 rounded-lg p-1.5 sm:p-2 space-y-0.5">
                          <p className="text-gray-900 text-xs flex items-center gap-1.5 justify-center">
                            <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-purple-200 flex-shrink-0" />
                            <span className="min-w-[24px] sm:min-w-[28px]">{(month.totalAmount / 1000).toFixed(0)}k</span>
                          </p>
                          <p className="text-[#263238] text-xs flex items-center gap-1.5 justify-center">
                            <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-purple-500 flex-shrink-0" />
                            <span className="min-w-[24px] sm:min-w-[28px]">{(month.paidAmount / 1000).toFixed(0)}k</span>
                          </p>
                          {/* Процент оплаты */}
                          <div className="pt-1 border-t border-gray-200/50">
                            <p className={`text-xs font-semibold ${
                              month.totalAmount > 0 
                                ? (month.paidAmount / month.totalAmount * 100) >= 100 
                                  ? 'text-green-600' 
                                  : (month.paidAmount / month.totalAmount * 100) >= 50
                                    ? 'text-[#2D1B69]'
                                    : 'text-orange-500'
                                : 'text-gray-400'
                            }`}>
                              {month.totalAmount > 0 
                                ? `${Math.round((month.paidAmount / month.totalAmount) * 100)}%`
                                : '0%'}
                            </p>
                          </div>
                        </div>
                        {isPastMonth && month.percentage < 100 && (
                          <p className="text-red-500 text-xs mt-1">
                            {month.percentage}%
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}