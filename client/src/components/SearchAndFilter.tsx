import React, { useState } from 'react';
import { Search, Filter, X, Calendar, CheckCircle, Clock, UserCheck } from 'lucide-react';
import { Input } from './ui/input';
import { Client } from '../types';

interface SearchAndFilterProps {
  clients: Client[];
  onFilteredClientsChange: (clients: Client[]) => void;
}

export function SearchAndFilter({ clients, onFilteredClientsChange }: SearchAndFilterProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [formCompletedFilter, setFormCompletedFilter] = useState<'all' | 'completed' | 'not_completed'>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Применяем фильтры
  React.useEffect(() => {
    let filtered = clients;

    // Поиск по имени, фамилии, username
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(client =>
        client.firstName.toLowerCase().includes(query) ||
        client.lastName.toLowerCase().includes(query) ||
        client.username?.toLowerCase().includes(query) ||
        client.comment?.toLowerCase().includes(query)
      );
    }

    // Фильтр по статусу
    if (statusFilter.length > 0) {
      filtered = filtered.filter(client => statusFilter.includes(client.status));
    }

    // Фильтр по заполнению анкеты
    if (formCompletedFilter === 'completed') {
      filtered = filtered.filter(client => client.formCompleted);
    } else if (formCompletedFilter === 'not_completed') {
      filtered = filtered.filter(client => !client.formCompleted);
    }

    onFilteredClientsChange(filtered);
  }, [searchQuery, statusFilter, formCompletedFilter, clients]);

  const toggleStatusFilter = (status: string) => {
    setStatusFilter(prev =>
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setStatusFilter([]);
    setFormCompletedFilter('all');
  };

  const hasActiveFilters = searchQuery.trim() !== '' || statusFilter.length > 0 || formCompletedFilter !== 'all';

  const statuses = [
    { id: 'selecting_time', label: 'Подбирает время', icon: Clock, color: 'from-yellow-500 to-orange-500' },
    { id: 'scheduled', label: 'Записан', icon: Calendar, color: 'from-blue-500 to-cyan-500' },
    { id: 'completed', label: 'Встреча проведена', icon: CheckCircle, color: 'from-green-500 to-emerald-500' },
    { id: 'completed_with_sale', label: 'Встреча с продажей', icon: CheckCircle, color: 'from-purple-500 to-pink-500' },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-lg p-4 mb-6">
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search Input */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            type="text"
            placeholder="Поиск по имени, фамилии, username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10 rounded-xl border-gray-200 focus:border-purple-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>

        {/* Filter Toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`px-4 py-2 rounded-xl font-semibold transition-all flex items-center gap-2 ${
            hasActiveFilters
              ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Filter className="w-4 h-4" />
          Фильтры
          {hasActiveFilters && (
            <span className="bg-white text-purple-600 px-2 py-0.5 rounded-full text-xs font-bold">
              {(statusFilter.length > 0 ? 1 : 0) + (formCompletedFilter !== 'all' ? 1 : 0)}
            </span>
          )}
        </button>

        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            className="px-4 py-2 rounded-xl font-semibold bg-red-100 text-red-700 hover:bg-red-200 transition-all flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            Сбросить
          </button>
        )}
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="mt-4 pt-4 border-t border-gray-200 space-y-4">
          {/* Status Filter */}
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-2 block">Статус клиента</label>
            <div className="flex flex-wrap gap-2">
              {statuses.map((status) => {
                const Icon = status.icon;
                const isActive = statusFilter.includes(status.id);
                return (
                  <button
                    key={status.id}
                    onClick={() => toggleStatusFilter(status.id)}
                    className={`px-3 py-2 rounded-xl font-semibold text-sm transition-all flex items-center gap-2 ${
                      isActive
                        ? `bg-gradient-to-r ${status.color} text-white shadow-lg`
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {status.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Form Completed Filter */}
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-2 block">Анкета</label>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'all', label: 'Все' },
                { id: 'completed', label: 'Заполнена' },
                { id: 'not_completed', label: 'Не заполнена' },
              ].map((option) => (
                <button
                  key={option.id}
                  onClick={() => setFormCompletedFilter(option.id as any)}
                  className={`px-3 py-2 rounded-xl font-semibold text-sm transition-all ${
                    formCompletedFilter === option.id
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
