import React, { useState, useMemo } from 'react';
import { Meeting, Client, PaymentMethod } from '../types';
import { TrendingUp, DollarSign, Users, Package, CreditCard, ChevronDown } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, Label, ResponsiveContainer } from 'recharts';

interface MeetingsAnalyticsProps {
  meetings: Meeting[];
  clients: Client[];
}

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  link: 'По ссылке',
  invoice: 'По счету',
  bank_installment: 'Рассрочка от банка',
  internal_installment: 'Внутренняя рассрочка',
};

const COLORS = ['#6F2E89', '#B52A98', '#E7A52E', '#924373', '#683489', '#B42345', '#7D3C8B', '#A96B06'];

export function MeetingsAnalytics({ meetings, clients }: MeetingsAnalyticsProps) {
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [isMonthDropdownOpen, setIsMonthDropdownOpen] = useState(false);
  const [dropdownButtonRef, setDropdownButtonRef] = useState<HTMLButtonElement | null>(null);

  // Получаем список доступных месяцев (для которых есть продажи)
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    meetings
      .filter(m => m.status === 'completed_with_sale' && m.saleAmount)
      .forEach(m => {
        const date = new Date(m.date);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        months.add(key);
    });
    
    // Также добавляем текущий месяц даже если нет продаж
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    months.add(currentMonth);
    
    return Array.from(months).sort().reverse();
  }, [meetings]);

  // Форматирование названия месяца
  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
  };

  // Фильтрация встреч по выбранному месяцу
  const filteredMeetings = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    return meetings.filter(m => {
      if (m.status !== 'completed_with_sale' || !m.saleAmount) return false;
      const date = new Date(m.date);
      return date.getFullYear() === year && date.getMonth() + 1 === month;
    });
  }, [meetings, selectedMonth]);

  // Основные метрики
  const analytics = useMemo(() => {
    const totalRevenue = filteredMeetings.reduce((sum, m) => sum + (m.saleAmount || 0), 0);
    const totalSales = filteredMeetings.length;
    const averageCheck = totalSales > 0 ? totalRevenue / totalSales : 0;

    // Разбивка по тарифам
    const revenueByTariff = filteredMeetings.reduce((acc, m) => {
      const tariff = m.soldTariff || 'Не указан';
      if (!acc[tariff]) {
        acc[tariff] = { name: tariff, revenue: 0, count: 0 };
      }
      acc[tariff].revenue += m.saleAmount || 0;
      acc[tariff].count += 1;
      return acc;
    }, {} as Record<string, { name: string; revenue: number; count: number }>);

    // Разбивка по менеджерам
    const revenueByManager = filteredMeetings.reduce((acc, m) => {
      const manager = m.managerName;
      if (!acc[manager]) {
        acc[manager] = { name: manager, revenue: 0, count: 0, averageCheck: 0 };
      }
      acc[manager].revenue += m.saleAmount || 0;
      acc[manager].count += 1;
      return acc;
    }, {} as Record<string, { name: string; revenue: number; count: number; averageCheck: number }>);

    // Вычисляем средний чек для каждого менеджера
    Object.values(revenueByManager).forEach(manager => {
      manager.averageCheck = manager.count > 0 ? manager.revenue / manager.count : 0;
    });

    // Разбивка по способам оплаты
    const revenueByPayment = filteredMeetings.reduce((acc, m) => {
      const payment = m.paymentMethod ? PAYMENT_METHOD_LABELS[m.paymentMethod] : 'Не указан';
      if (!acc[payment]) {
        acc[payment] = { name: payment, revenue: 0, count: 0 };
      }
      acc[payment].revenue += m.saleAmount || 0;
      acc[payment].count += 1;
      return acc;
    }, {} as Record<string, { name: string; revenue: number; count: number }>);

    // Разбивка по менеджерам и тарифам
    const revenueByManagerAndTariff = filteredMeetings.reduce((acc, m) => {
      const key = `${m.managerName}|${m.soldTariff || 'Не указан'}`;
      if (!acc[key]) {
        acc[key] = {
          manager: m.managerName,
          tariff: m.soldTariff || 'Не указан',
          revenue: 0,
          count: 0
        };
      }
      acc[key].revenue += m.saleAmount || 0;
      acc[key].count += 1;
      return acc;
    }, {} as Record<string, { manager: string; tariff: string; revenue: number; count: number }>);

    // Разбивка по менеджерам и способам оплаты
    const revenueByManagerAndPayment = filteredMeetings.reduce((acc, m) => {
      const payment = m.paymentMethod ? PAYMENT_METHOD_LABELS[m.paymentMethod] : 'Не указан';
      const key = `${m.managerName}|${payment}`;
      if (!acc[key]) {
        acc[key] = {
          manager: m.managerName,
          payment: payment,
          revenue: 0,
          count: 0
        };
      }
      acc[key].revenue += m.saleAmount || 0;
      acc[key].count += 1;
      return acc;
    }, {} as Record<string, { manager: string; payment: string; revenue: number; count: number }>);

    return {
      totalRevenue,
      totalSales,
      averageCheck,
      revenueByTariff: Object.values(revenueByTariff).sort((a, b) => b.revenue - a.revenue),
      revenueByManager: Object.values(revenueByManager).sort((a, b) => b.revenue - a.revenue),
      revenueByPayment: Object.values(revenueByPayment).sort((a, b) => b.revenue - a.revenue),
      revenueByManagerAndTariff: Object.values(revenueByManagerAndTariff),
      revenueByManagerAndPayment: Object.values(revenueByManagerAndPayment),
    };
  }, [filteredMeetings]);

  // Данные для круговой диаграммы тарифов
  const tariffChartData = analytics.revenueByTariff.map((item, index) => ({
    name: item.name,
    value: item.revenue,
    count: item.count,
    color: COLORS[index % COLORS.length]
  }));

  // Данные для круговой диаграммы способов оплаты
  const paymentChartData = analytics.revenueByPayment.map((item, index) => ({
    name: item.name,
    value: item.revenue,
    count: item.count,
    color: COLORS[index % COLORS.length]
  }));

  return (
    <div className="sales-analytics space-y-4 pb-8">
      {/* Заголовок и фильтр по месяцам */}
      <div className="analytics-toolbar bg-white rounded-2xl shadow-lg p-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2>Аналитика продаж</h2>
              <p className="text-gray-600 text-sm">Финансовые показатели и обороты</p>
            </div>
          </div>

          {/* Выбор месяца - выпадающий список */}
          <div className="analytics-month-picker">
            <button
              ref={setDropdownButtonRef}
              onClick={() => setIsMonthDropdownOpen(!isMonthDropdownOpen)}
              className="analytics-month-trigger px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all flex items-center gap-2 min-w-[200px] justify-between"
            >
              <span>{formatMonth(selectedMonth)}</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${isMonthDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {isMonthDropdownOpen && dropdownButtonRef && (
              <>
                <div 
                  className="fixed inset-0 z-[100]" 
                  onClick={() => setIsMonthDropdownOpen(false)}
                />
                <div 
                  className="analytics-month-menu fixed w-[200px] bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden z-[101]"
                  style={{
                    top: `${dropdownButtonRef.getBoundingClientRect().bottom + 8}px`,
                    left: `${Math.max(12, Math.min(dropdownButtonRef.getBoundingClientRect().left, window.innerWidth - 212))}px`,
                  }}
                >
                  <div className="py-1 max-h-[300px] overflow-y-auto">
                    {availableMonths.map(month => (
                      <button
                        key={month}
                        onClick={() => {
                          setSelectedMonth(month);
                          setIsMonthDropdownOpen(false);
                        }}
                        className={`analytics-month-option w-full text-left px-4 py-2.5 text-sm font-medium transition-colors ${selectedMonth === month ? 'is-selected' : ''}`}
                      >
                        {formatMonth(month)}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Основные KPI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Оборот за период */}
        <div className="analytics-kpi-card analytics-kpi-card--revenue rounded-xl p-4 transition-all">
          <div className="flex items-center gap-2 mb-2">
            <div className="analytics-kpi-icon">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <p className="analytics-kpi-label">Оборот за период</p>
              <p className="analytics-kpi-value">{analytics.totalRevenue.toLocaleString('ru-RU')} ₽</p>
            </div>
          </div>
          <div className="analytics-kpi-detail">{analytics.totalSales} сделок</div>
        </div>

        {/* Средний чек */}
        <div className="analytics-kpi-card analytics-kpi-card--average rounded-xl p-4 transition-all">
          <div className="flex items-center gap-2 mb-2">
            <div className="analytics-kpi-icon">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <p className="analytics-kpi-label">Средний чек</p>
              <p className="analytics-kpi-value">{Math.round(analytics.averageCheck).toLocaleString('ru-RU')} ₽</p>
            </div>
          </div>
          <div className="analytics-kpi-detail">За одну сделку</div>
        </div>

        {/* Всего продаж */}
        <div className="analytics-kpi-card analytics-kpi-card--sales rounded-xl p-4 transition-all">
          <div className="flex items-center gap-2 mb-2">
            <div className="analytics-kpi-icon">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="analytics-kpi-label">Всего продаж</p>
              <p className="analytics-kpi-value">{analytics.totalSales}</p>
            </div>
          </div>
          <div className="analytics-kpi-detail">Встреч с продажей</div>
        </div>
      </div>

      {/* Оборот по тарифам и способам оплаты */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {/* Оборот по тарифам */}
        <div className="analytics-surface rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="analytics-section-icon">
              <Package className="w-4 h-4 text-white" />
            </div>
            <h3 className="analytics-section-title">Оборот по тарифам</h3>
          </div>

          {analytics.revenueByTariff.length > 0 ? (
            <div className="space-y-2">
              {tariffChartData.map((item, index) => {
                const percentage = ((item.value / analytics.totalRevenue) * 100).toFixed(1);
                return (
                  <div key={index} className="analytics-list-row flex items-center justify-between p-3">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded flex-shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-sm font-medium text-gray-800">{item.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-gray-900 whitespace-nowrap">
                        {item.value.toLocaleString('ru-RU')} ₽
                      </div>
                      <div className="analytics-list-meta whitespace-nowrap">
                        {percentage}% • {item.count} шт
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="analytics-empty flex items-center justify-center h-48 text-sm">
              Нет данных за выбранный период
            </div>
          )}
        </div>

        {/* Диаграмма тарифов */}
        <div className="analytics-surface rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="analytics-section-icon">
              <Package className="w-4 h-4 text-white" />
            </div>
            <h3 className="analytics-section-title">Диаграмма тарифов</h3>
          </div>

          {analytics.revenueByTariff.length > 0 ? (
            <div className="analytics-chart w-full" style={{ height: '280px', minHeight: '280px', minWidth: '200px' }}>
              <ResponsiveContainer width="100%" height={280} minHeight={280}>
                <PieChart width={280} height={280}>
                  <Pie
                    data={tariffChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius="45%"
                    outerRadius="65%"
                    paddingAngle={3}
                    dataKey="value"
                    label={({ cx, cy, midAngle, outerRadius, percent, name }) => {
                      const RADIAN = Math.PI / 180;
                      const radius = outerRadius + 35;
                      const x = cx + radius * Math.cos(-midAngle * RADIAN);
                      const y = cy + radius * Math.sin(-midAngle * RADIAN);
                      
                      if (percent < 0.05) return null;
                      
                      return (
                        <text 
                          x={x} 
                          y={y} 
                          fill="#2D1B69" 
                          textAnchor={x > cx ? 'start' : 'end'} 
                          dominantBaseline="central"
                          className="text-[10px] font-semibold"
                        >
                          {name} ({(percent * 100).toFixed(0)}%)
                        </text>
                      );
                    }}
                    labelLine={{
                      stroke: '#999',
                      strokeWidth: 1,
                      strokeDasharray: '2 2'
                    }}
                  >
                    {tariffChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                    <Label
                      value={`${analytics.totalRevenue.toLocaleString('ru-RU')} ₽`}
                      position="center"
                      className="font-bold text-xs"
                      fill="#2D1B69"
                    />
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => `${value.toLocaleString('ru-RU')} ₽`}
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '8px',
                      fontSize: '12px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="analytics-empty flex items-center justify-center h-48 text-sm">
              Нет данных за выбранный период
            </div>
          )}
        </div>

        {/* Оборот по способам оплаты */}
        <div className="analytics-surface rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="analytics-section-icon analytics-section-icon--payment">
              <CreditCard className="w-4 h-4 text-white" />
            </div>
            <h3 className="analytics-section-title">Оборот по способам оплаты</h3>
          </div>

          {analytics.revenueByPayment.length > 0 ? (
            <div className="space-y-2">
              {paymentChartData.map((item, index) => {
                const percentage = ((item.value / analytics.totalRevenue) * 100).toFixed(1);
                return (
                  <div key={index} className="analytics-list-row flex items-center justify-between p-3">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded flex-shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-sm font-medium text-gray-800">{item.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-gray-900 whitespace-nowrap">
                        {item.value.toLocaleString('ru-RU')} ₽
                      </div>
                      <div className="analytics-list-meta whitespace-nowrap">
                        {percentage}% • {item.count} шт
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="analytics-empty flex items-center justify-center h-48 text-sm">
              Нет данных за выбранный период
            </div>
          )}
        </div>

        {/* Диаграмма способов оплаты */}
        <div className="analytics-surface rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="analytics-section-icon analytics-section-icon--payment">
              <CreditCard className="w-4 h-4 text-white" />
            </div>
            <h3 className="analytics-section-title">Диаграмма способов оплаты</h3>
          </div>

          {analytics.revenueByPayment.length > 0 ? (
            <div className="analytics-chart w-full" style={{ height: '280px', minHeight: '280px', minWidth: '200px' }}>
              <ResponsiveContainer width="100%" height={280} minHeight={280}>
                <PieChart width={280} height={280}>
                  <Pie
                    data={paymentChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius="45%"
                    outerRadius="65%"
                    paddingAngle={3}
                    dataKey="value"
                    label={({ cx, cy, midAngle, outerRadius, percent, name }) => {
                      const RADIAN = Math.PI / 180;
                      const radius = outerRadius + 35;
                      const x = cx + radius * Math.cos(-midAngle * RADIAN);
                      const y = cy + radius * Math.sin(-midAngle * RADIAN);
                      
                      if (percent < 0.05) return null;
                      
                      return (
                        <text 
                          x={x} 
                          y={y} 
                          fill="#2D1B69" 
                          textAnchor={x > cx ? 'start' : 'end'} 
                          dominantBaseline="central"
                          className="text-[10px] font-semibold"
                        >
                          {name} ({(percent * 100).toFixed(0)}%)
                        </text>
                      );
                    }}
                    labelLine={{
                      stroke: '#999',
                      strokeWidth: 1,
                      strokeDasharray: '2 2'
                    }}
                  >
                    {paymentChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                    <Label
                      value={`${analytics.totalRevenue.toLocaleString('ru-RU')} ₽`}
                      position="center"
                      className="font-bold text-xs"
                      fill="#2D1B69"
                    />
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => `${value.toLocaleString('ru-RU')} ₽`}
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '8px',
                      fontSize: '12px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="analytics-empty flex items-center justify-center h-48 text-sm">
              Нет данных за выбранный период
            </div>
          )}
        </div>
      </div>

      {/* Оборот по менеджерам - единый прогресс-бар */}
      <div className="analytics-surface analytics-manager-surface rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="analytics-section-icon analytics-section-icon--managers">
            <Users className="w-4 h-4 text-white" />
          </div>
          <h3 className="analytics-section-title">Оборот по менеджерам</h3>
        </div>

        {analytics.revenueByManager.length > 0 ? (
          <div className="space-y-4">
            {/* Единый прогресс-бар */}
            <div className="analytics-progress-track relative h-8 rounded-full overflow-hidden flex">
              {analytics.revenueByManager.map((manager, index) => {
                const percentage = (manager.revenue / analytics.totalRevenue) * 100;
                return (
                  <div
                    key={index}
                    className="h-full transition-all duration-500 hover:opacity-80 cursor-pointer relative group"
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: COLORS[index % COLORS.length]
                    }}
                    title={`${manager.name}: ${manager.revenue.toLocaleString('ru-RU')} ₽ (${percentage.toFixed(1)}%)`}
                  >
                    {percentage > 10 && (
                      <div className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold">
                        {percentage.toFixed(0)}%
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Легенда */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {analytics.revenueByManager.map((manager, index) => {
                const percentage = ((manager.revenue / analytics.totalRevenue) * 100).toFixed(1);
                return (
                  <div key={index} className="analytics-manager-row flex items-center justify-between p-2">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded" 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="text-sm font-medium text-gray-800">{manager.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-gray-900">
                        {manager.revenue.toLocaleString('ru-RU')} ₽
                        <span className="analytics-list-meta ml-1">({percentage}%)</span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {manager.count} шт • {Math.round(manager.averageCheck).toLocaleString('ru-RU')} ₽
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="analytics-empty flex items-center justify-center h-24 text-sm">
            Нет данных за выбранный период
          </div>
        )}
      </div>

      {/* Оборот по менеджерам и тарифам */}
      {analytics.revenueByManagerAndTariff.length > 0 && (
        <div className="analytics-surface analytics-table-surface rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="analytics-section-icon analytics-section-icon--tariffs">
              <Package className="w-4 h-4 text-white" />
            </div>
            <h3 className="analytics-section-title">Оборот по менеджерам и тарифам</h3>
          </div>

          <div className="analytics-table-scroll overflow-x-auto">
            <table className="analytics-table w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 font-semibold text-gray-700 text-sm">Менеджер</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-700 text-sm">Тариф</th>
                  <th className="text-right py-2 px-3 font-semibold text-gray-700 text-sm">Продаж</th>
                  <th className="text-right py-2 px-3 font-semibold text-gray-700 text-sm">Оборот</th>
                  <th className="text-right py-2 px-3 font-semibold text-gray-700 text-sm">%</th>
                </tr>
              </thead>
              <tbody>
                {analytics.revenueByManagerAndTariff
                  .sort((a, b) => b.revenue - a.revenue)
                  .map((item, index) => {
                    const percentage = ((item.revenue / analytics.totalRevenue) * 100).toFixed(1);
                    return (
                      <tr key={index}>
                        <td className="py-2 px-3 font-medium text-gray-800 text-sm">{item.manager}</td>
                        <td className="py-2 px-3 text-gray-600 text-sm">{item.tariff}</td>
                        <td className="py-2 px-3 text-right text-gray-600 text-sm">{item.count}</td>
                        <td className="py-2 px-3 text-right font-bold analytics-table-value text-sm">
                          {item.revenue.toLocaleString('ru-RU')} ₽
                        </td>
                        <td className="py-2 px-3 text-right font-semibold analytics-list-meta text-sm">
                          {percentage}%
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Оборот по менеджерам и способам оплаты */}
      {analytics.revenueByManagerAndPayment.length > 0 && (
        <div className="analytics-surface analytics-table-surface rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="analytics-section-icon analytics-section-icon--payment">
              <CreditCard className="w-4 h-4 text-white" />
            </div>
            <h3 className="analytics-section-title">Оборот по менеджерам и способам оплаты</h3>
          </div>

          <div className="analytics-table-scroll overflow-x-auto">
            <table className="analytics-table w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 font-semibold text-gray-700 text-sm">Менеджер</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-700 text-sm">Способ оплаты</th>
                  <th className="text-right py-2 px-3 font-semibold text-gray-700 text-sm">Продаж</th>
                  <th className="text-right py-2 px-3 font-semibold text-gray-700 text-sm">Оборот</th>
                  <th className="text-right py-2 px-3 font-semibold text-gray-700 text-sm">%</th>
                </tr>
              </thead>
              <tbody>
                {analytics.revenueByManagerAndPayment
                  .sort((a, b) => b.revenue - a.revenue)
                  .map((item, index) => {
                    const percentage = ((item.revenue / analytics.totalRevenue) * 100).toFixed(1);
                    return (
                      <tr key={index}>
                        <td className="py-2 px-3 font-medium text-gray-800 text-sm">{item.manager}</td>
                        <td className="py-2 px-3 text-gray-600 text-sm">{item.payment}</td>
                        <td className="py-2 px-3 text-right text-gray-600 text-sm">{item.count}</td>
                        <td className="py-2 px-3 text-right font-bold analytics-table-value text-sm">
                          {item.revenue.toLocaleString('ru-RU')} ₽
                        </td>
                        <td className="py-2 px-3 text-right font-semibold analytics-list-meta text-sm">
                          {percentage}%
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
