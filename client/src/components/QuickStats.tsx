import React from 'react';
import { Users, Calendar, TrendingUp, DollarSign, Clock, CheckCircle } from 'lucide-react';
import { Client, Meeting } from '../types';
import { format, startOfWeek, endOfWeek, isWithinInterval, isSameDay } from 'date-fns';
import { ru } from 'date-fns/locale';

interface QuickStatsProps {
  clients: Client[];
  meetings: Meeting[];
}

export function QuickStats({ clients, meetings }: QuickStatsProps) {
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  // Статистика клиентов
  const totalClients = clients.length;
  const newClientsThisWeek = clients.filter(c => 
    isWithinInterval(new Date(c.createdAt), { start: weekStart, end: weekEnd })
  ).length;
  const readyClients = clients.filter(c => c.status === 'ready').length;

  // Статистика встреч
  const totalMeetings = meetings.length;
  const scheduledMeetings = meetings.filter(m => m.status === 'scheduled').length;
  const todayMeetings = meetings.filter(m => 
    isSameDay(new Date(m.date), now) && m.status === 'scheduled'
  ).length;
  const completedMeetings = meetings.filter(m => 
    m.status === 'completed' || m.status === 'completed_with_sale'
  ).length;
  
  // Статистика продаж
  const meetingsWithSales = meetings.filter(m => m.status === 'completed_with_sale');
  const totalSales = meetingsWithSales.reduce((sum, m) => sum + (m.saleAmount || 0), 0);
  const conversionRate = completedMeetings > 0 
    ? Math.round((meetingsWithSales.length / completedMeetings) * 100) 
    : 0;

  const stats = [
    {
      label: 'Всего клиентов',
      value: totalClients,
      subValue: `+${newClientsThisWeek} за неделю`,
      icon: Users,
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'from-blue-50 to-cyan-50',
    },
    {
      label: 'Анкета заполнена',
      value: readyClients,
      subValue: `${Math.round((readyClients / (totalClients || 1)) * 100)}% от общего`,
      icon: CheckCircle,
      color: 'from-green-500 to-emerald-500',
      bgColor: 'from-green-50 to-emerald-50',
    },
    {
      label: 'Встречи сегодня',
      value: todayMeetings,
      subValue: `${scheduledMeetings} запланировано`,
      icon: Calendar,
      color: 'from-purple-500 to-pink-500',
      bgColor: 'from-purple-50 to-pink-50',
    },
    {
      label: 'Проведено встреч',
      value: completedMeetings,
      subValue: `${totalMeetings} всего`,
      icon: Clock,
      color: 'from-orange-500 to-amber-500',
      bgColor: 'from-orange-50 to-amber-50',
    },
    {
      label: 'Конверсия',
      value: `${conversionRate}%`,
      subValue: `${meetingsWithSales.length} продаж`,
      icon: TrendingUp,
      color: 'from-indigo-500 to-purple-500',
      bgColor: 'from-indigo-50 to-purple-50',
    },
    {
      label: 'Продажи',
      value: totalSales > 0 ? `${(totalSales / 1000).toFixed(0)}k ₽` : '0 ₽',
      subValue: `${meetingsWithSales.length} сделок`,
      icon: DollarSign,
      color: 'from-pink-500 to-rose-500',
      bgColor: 'from-pink-50 to-rose-50',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-6">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <div
            key={index}
            className={`bg-gradient-to-br ${stat.bgColor} rounded-2xl p-4 border-2 border-transparent hover:border-purple-200 transition-all duration-300 hover:shadow-lg hover:-translate-y-1`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {stat.value}
            </div>
            <div className="text-xs font-semibold text-gray-600 mb-1">
              {stat.label}
            </div>
            <div className="text-xs text-gray-500">
              {stat.subValue}
            </div>
          </div>
        );
      })}
    </div>
  );
}
