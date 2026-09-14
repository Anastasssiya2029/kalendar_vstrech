import React, { useState } from 'react';
import { X, User, Shield, Save, Mail, Lock, Settings as SettingsIcon, DollarSign, Plus, Edit2, Trash2, ToggleLeft, ToggleRight, Palette, Send, CheckCircle2, RefreshCw, Unplug } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Switch } from './ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { toast } from 'sonner';
import { Tariff } from '../types';

interface UserSettings {
  // Личная информация
  name: string;
  email: string;
  
}

interface UserProfileSettingsProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  onClose: () => void;
  onSave: (settings: Pick<UserSettings, 'name' | 'email'>) => Promise<void>;
  // Для настроек сервиса (только админ)
  tariffs?: Tariff[];
  onAddTariff?: (tariff: Omit<Tariff, 'id'>) => void;
  onEditTariff?: (id: string, tariff: Partial<Tariff>) => void;
  onDeleteTariff?: (id: string) => void;
  onToggleTariffActive?: (id: string) => void;
  telegram?: {
    configured: boolean;
    connected: boolean;
    connectedAt?: string;
    botUsername?: string;
  };
  onConnectTelegram?: () => Promise<void>;
  onRefreshTelegram?: () => Promise<void>;
  onDisconnectTelegram?: () => Promise<void>;
}

export function UserProfileSettings({ 
  user, 
  onClose, 
  onSave,
  tariffs = [],
  onAddTariff,
  onEditTariff,
  onDeleteTariff,
  onToggleTariffActive,
  telegram,
  onConnectTelegram,
  onRefreshTelegram,
  onDisconnectTelegram,
}: UserProfileSettingsProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'service'>('profile');
  const [isChanged, setIsChanged] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTelegramLoading, setIsTelegramLoading] = useState(false);
  
  // State для настроек
  const [settings, setSettings] = useState<UserSettings>({
    name: user.name,
    email: user.email,
  });
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handleSettingChange = (path: string, value: any) => {
    setSettings(prev => {
      const keys = path.split('.');
      if (keys.length === 1) {
        return { ...prev, [keys[0]]: value };
      } else if (keys.length === 2) {
        return {
          ...prev,
          [keys[0]]: {
            ...(prev[keys[0] as keyof UserSettings] as any),
            [keys[1]]: value,
          },
        };
      } else if (keys.length === 3) {
        return {
          ...prev,
          [keys[0]]: {
            ...(prev[keys[0] as keyof UserSettings] as any),
            [keys[1]]: {
              ...((prev[keys[0] as keyof UserSettings] as any)[keys[1]]),
              [keys[2]]: value,
            },
          },
        };
      }
      return prev;
    });
    setIsChanged(true);
  };

  const handleSave = async () => {
    if (!isChanged || isSaving) return;
    setIsSaving(true);
    try {
      await onSave({ name: settings.name, email: settings.email });
      toast.success('Настройки сохранены');
      setIsChanged(false);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Не удалось сохранить настройки');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = () => {
    if (!passwordData.currentPassword || !passwordData.newPassword) {
      toast.error('Заполните все поля');
      return;
    }
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Пароли не совпадают');
      return;
    }
    
    if (passwordData.newPassword.length < 8) {
      toast.error('Пароль должен быть не менее 8 символов');
      return;
    }
    
    // Здесь будет API запрос
    toast.success('Пароль успешно изменен');
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
  };

  const handleTelegramAction = async (action: 'connect' | 'refresh' | 'disconnect') => {
    const handlers = {
      connect: onConnectTelegram,
      refresh: onRefreshTelegram,
      disconnect: onDisconnectTelegram,
    };
    const handler = handlers[action];
    if (!handler || isTelegramLoading) return;
    if (action === 'disconnect' && !window.confirm('Отключить уведомления в Telegram для этого профиля?')) return;
    setIsTelegramLoading(true);
    try {
      await handler();
      if (action === 'disconnect') toast.success('Telegram отключён');
      if (action === 'refresh' && !telegram?.connected) toast.message('Подключение пока не подтверждено. Нажмите Start в боте и попробуйте ещё раз.');
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Не удалось обновить подключение Telegram');
    } finally {
      setIsTelegramLoading(false);
    }
  };

  // Состояния для настроек сервиса
  const [isAddTariffDialogOpen, setIsAddTariffDialogOpen] = useState(false);
  const [editingTariff, setEditingTariff] = useState<Tariff | null>(null);
  const [tariffFormData, setTariffFormData] = useState({
    name: '',
    price: '',
    description: ''
  });
  const [tariffErrors, setTariffErrors] = useState<Record<string, string>>({});
  
  const [displaySettings, setDisplaySettings] = useState({
    timeFormat: '24h' as '12h' | '24h',
    dateFormat: 'dd.MM.yyyy' as 'dd.MM.yyyy' | 'MM/dd/yyyy' | 'yyyy-MM-dd',
    compactMode: false,
  });

  const tabs = [
    { id: 'profile', label: 'Профиль', icon: User },
    { id: 'security', label: 'Безопасность', icon: Shield },
    ...(['admin', 'super_admin'].includes(user.role) ? [{ id: 'service', label: 'Настройки сервиса', icon: SettingsIcon }] : []),
  ] as const;

  // Функции для работы с тарифами
  const handleOpenAddTariffDialog = () => {
    setTariffFormData({ name: '', price: '', description: '' });
    setTariffErrors({});
    setIsAddTariffDialogOpen(true);
  };

  const handleOpenEditTariffDialog = (tariff: Tariff) => {
    setTariffFormData({
      name: tariff.name,
      price: tariff.price.toString(),
      description: tariff.description || ''
    });
    setTariffErrors({});
    setEditingTariff(tariff);
  };

  const handleCloseTariffDialog = () => {
    setIsAddTariffDialogOpen(false);
    setEditingTariff(null);
    setTariffFormData({ name: '', price: '', description: '' });
    setTariffErrors({});
  };

  const handleTariffChange = (field: string, value: string) => {
    setTariffFormData(prev => ({ ...prev, [field]: value }));
    if (tariffErrors[field]) {
      setTariffErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleSubmitTariff = (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};
    if (!tariffFormData.name.trim()) {
      newErrors.name = 'Введите название тарифа';
    }
    if (!tariffFormData.price.trim()) {
      newErrors.price = 'Введите цену';
    } else if (isNaN(Number(tariffFormData.price)) || Number(tariffFormData.price) <= 0) {
      newErrors.price = 'Цена должна быть положительным числом';
    }

    if (Object.keys(newErrors).length > 0) {
      setTariffErrors(newErrors);
      return;
    }

    const tariffData = {
      name: tariffFormData.name.trim(),
      price: Number(tariffFormData.price),
      description: tariffFormData.description.trim() || undefined,
      isActive: true
    };

    if (editingTariff && onEditTariff) {
      onEditTariff(editingTariff.id, tariffData);
      toast.success('Тариф обновлен');
    } else if (onAddTariff) {
      onAddTariff(tariffData);
      toast.success('Тариф добавлен');
    }

    handleCloseTariffDialog();
  };

  const handleDeleteTariff = (tariff: Tariff) => {
    if (window.confirm(`Удалить тариф "${tariff.name}"?`)) {
      onDeleteTariff?.(tariff.id);
      toast.success('Тариф удален');
    }
  };

  const activeTariffs = tariffs.filter(t => t.isActive);
  const inactiveTariffs = tariffs.filter(t => !t.isActive);
  const receivesArchitectUpdates = user.role === 'architect';

  return (
    <div className="profile-settings-overlay fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="profile-settings-dialog bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-scale-in">
        {/* Header */}
        <div className="profile-settings-header p-6 border-b border-gray-200">
          <div className="profile-settings-header-row flex items-center justify-between">
            <div className="profile-settings-identity flex items-center gap-4 min-w-0">
              <div className="profile-settings-avatar w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center">
                <User className="w-7 h-7 text-white" />
              </div>
              <div className="min-w-0">
                <h2>Настройки профиля</h2>
                <p className="text-sm text-gray-600">{user.name} • {user.role === 'architect' ? 'Архитектор' : user.role === 'super_admin' ? 'Супер-администратор' : user.role === 'manager' ? 'Менеджер' : user.role === 'assistant' ? 'Помощник' : 'Администратор'}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="profile-settings-close p-2 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <X className="w-6 h-6 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="profile-settings-tabs px-6 border-b border-gray-200 overflow-x-auto scrollbar-hide">
          <div className="profile-settings-tabs-list flex gap-2 min-w-max">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-3 rounded-t-xl transition-all ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-purple-50 to-pink-50 text-purple-700 border-b-2 border-purple-500'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="font-semibold text-sm">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="profile-settings-content flex-1 overflow-y-auto p-6">
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div>
                <Label htmlFor="name" className="flex items-center gap-2 mb-2">
                  <User className="w-4 h-4 text-purple-600" />
                  Имя
                </Label>
                <Input
                  id="name"
                  value={settings.name}
                  onChange={(e) => handleSettingChange('name', e.target.value)}
                  className="rounded-xl"
                />
              </div>

              <div>
                <Label htmlFor="email" className="flex items-center gap-2 mb-2">
                  <Mail className="w-4 h-4 text-purple-600" />
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={settings.email}
                  onChange={(e) => handleSettingChange('email', e.target.value)}
                  className="rounded-xl"
                />
              </div>

              {(user.role === 'manager' || user.role === 'admin' || user.role === 'super_admin' || user.role === 'architect') && (
                <section className="rounded-2xl border border-[#e7d8e9] bg-[#fcf9fc] p-4 sm:p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex gap-3">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${telegram?.connected ? 'bg-[#ebe2f0] text-[#6b2c75]' : 'bg-[#f4edf5] text-[#83407d]'}`}>
                        {telegram?.connected ? <CheckCircle2 className="h-5 w-5" /> : <Send className="h-5 w-5" />}
                      </div>
                      <div>
                        <h3 className="font-semibold text-[#34203d]">Уведомления в Telegram</h3>
                        {telegram?.connected ? (
                          <p className="mt-1 text-sm leading-5 text-[#615466]">{receivesArchitectUpdates ? 'Подключено. Сюда будут приходить все записи, переносы и отмены, а в воскресенье в 20:00 — сводка по школам.' : 'Подключено. О новых записях, переносах и отменах по вашим встречам будем писать в этот Telegram.'}</p>
                        ) : telegram?.configured ? (
                          <p className="mt-1 text-sm leading-5 text-[#615466]">Откройте {telegram.botUsername ? `@${telegram.botUsername}` : 'бота'}, нажмите Start и вернитесь сюда для проверки. {receivesArchitectUpdates ? 'После подключения вы будете получать общие уведомления архитектора.' : ''}</p>
                        ) : (
                          <p className="mt-1 text-sm leading-5 text-[#615466]">Интеграция Telegram временно недоступна. Обратитесь к администратору сервиса.</p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 sm:justify-end">
                      {!telegram?.connected && telegram?.configured && (
                        <Button type="button" onClick={() => handleTelegramAction('connect')} disabled={isTelegramLoading} className="brand-primary-button rounded-xl">
                          <Send className="mr-2 h-4 w-4" />
                          Подключить
                        </Button>
                      )}
                      {telegram?.configured && (
                        <Button type="button" variant="outline" onClick={() => handleTelegramAction('refresh')} disabled={isTelegramLoading} className="rounded-xl border-[#ddcbe2] text-[#67356e] hover:bg-[#f5eff6]">
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Проверить
                        </Button>
                      )}
                      {telegram?.connected && (
                        <Button type="button" variant="ghost" onClick={() => handleTelegramAction('disconnect')} disabled={isTelegramLoading} className="rounded-xl text-[#874a58] hover:bg-[#f9eff1] hover:text-[#874a58]">
                          <Unplug className="mr-2 h-4 w-4" />
                          Отключить
                        </Button>
                      )}
                    </div>
                  </div>
                </section>
              )}

            </div>
          )}

          {activeTab === 'security' && (
            <div className="profile-security-section">
              <div className="profile-security-intro">
                <div className="flex items-center gap-3 mb-2">
                  <Lock className="w-5 h-5 text-purple-600" />
                  <h3 className="font-semibold text-gray-900">Смена пароля</h3>
                </div>
                <p className="text-sm text-gray-600">
                  Пароль должен быть не менее 8 символов
                </p>
              </div>

              <div className="profile-security-form">
                <div className="profile-security-field">
                  <Label htmlFor="currentPassword" className="mb-2">
                    Текущий пароль
                  </Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                    className="profile-security-input rounded-xl"
                  />
                </div>

                <div className="profile-security-field">
                  <Label htmlFor="newPassword" className="mb-2">
                    Новый пароль
                  </Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                    className="profile-security-input rounded-xl"
                  />
                </div>

                <div className="profile-security-field">
                  <Label htmlFor="confirmPassword" className="mb-2">
                    Подтвердите пароль
                  </Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    className="profile-security-input rounded-xl"
                  />
                </div>

                <Button
                  onClick={handlePasswordChange}
                  className="profile-security-button brand-primary-button rounded-xl"
                >
                  Изменить пароль
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'service' && (user.role === 'admin' || user.role === 'super_admin') && (
            <div className="space-y-6">
              {/* Управление тарифами */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">Управление тарифами</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Настройте тарифы для вашей школы
                    </p>
                  </div>
                  <Button
                    onClick={handleOpenAddTariffDialog}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Добавить
                  </Button>
                </div>

                {/* Active Tariffs */}
                {activeTariffs.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-semibold text-gray-900 mb-3">Активные тарифы</h4>
                    <div className="space-y-3">
                      {activeTariffs.map(tariff => (
                        <div
                          key={tariff.id}
                          className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border-2 border-purple-200"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl flex items-center justify-center flex-shrink-0">
                                  <DollarSign className="w-5 h-5 text-white" />
                                </div>
                                <div className="min-w-0">
                                  <h5 className="font-bold text-gray-900 truncate">{tariff.name}</h5>
                                  <p className="text-xl font-bold text-purple-600">
                                    {tariff.price.toLocaleString('ru-RU')} ₽
                                  </p>
                                </div>
                              </div>
                              {tariff.description && (
                                <p className="text-sm text-gray-600 line-clamp-2">{tariff.description}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <Button
                                onClick={() => onToggleTariffActive?.(tariff.id)}
                                variant="outline"
                                size="sm"
                                className="rounded-lg"
                                title="Деактивировать"
                              >
                                <ToggleRight className="w-5 h-5 text-green-600" />
                              </Button>
                              <Button
                                onClick={() => handleOpenEditTariffDialog(tariff)}
                                variant="outline"
                                size="sm"
                                className="rounded-lg"
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                onClick={() => handleDeleteTariff(tariff)}
                                variant="outline"
                                size="sm"
                                className="rounded-lg text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Inactive Tariffs */}
                {inactiveTariffs.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-semibold text-gray-500 mb-3">Неактивные тарифы</h4>
                    <div className="space-y-3">
                      {inactiveTariffs.map(tariff => (
                        <div
                          key={tariff.id}
                          className="bg-gray-50 rounded-xl p-4 border-2 border-gray-200 opacity-60"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 bg-gray-400 rounded-xl flex items-center justify-center flex-shrink-0">
                                  <DollarSign className="w-5 h-5 text-white" />
                                </div>
                                <div className="min-w-0">
                                  <h5 className="font-bold text-gray-700 truncate">{tariff.name}</h5>
                                  <p className="text-xl font-bold text-gray-600">
                                    {tariff.price.toLocaleString('ru-RU')} ₽
                                  </p>
                                </div>
                              </div>
                              {tariff.description && (
                                <p className="text-sm text-gray-500 line-clamp-2">{tariff.description}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <Button
                                onClick={() => onToggleTariffActive?.(tariff.id)}
                                variant="outline"
                                size="sm"
                                className="rounded-lg"
                                title="Активировать"
                              >
                                <ToggleLeft className="w-5 h-5 text-gray-400" />
                              </Button>
                              <Button
                                onClick={() => handleOpenEditTariffDialog(tariff)}
                                variant="outline"
                                size="sm"
                                className="rounded-lg"
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                onClick={() => handleDeleteTariff(tariff)}
                                variant="outline"
                                size="sm"
                                className="rounded-lg text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {tariffs.length === 0 && (
                  <div className="py-8 text-center">
                    <DollarSign className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-gray-500 mb-4">Пока нет добавленных тарифов</p>
                    <Button
                      onClick={handleOpenAddTariffDialog}
                      className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Добавить первый тариф
                    </Button>
                  </div>
                )}
              </div>

              {/* Настройки отображения */}
              <div className="border-t border-gray-200 pt-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                    <Palette className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Настройки отображения</h3>
                    <p className="text-sm text-gray-600">
                      Форматы времени и даты для всего сервиса
                    </p>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Формат времени */}
                  <div>
                    <Label className="mb-3 block">Формат времени</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setDisplaySettings(prev => ({ ...prev, timeFormat: '12h' }));
                          toast.success('Формат времени изменен');
                        }}
                        className={`p-4 rounded-xl border-2 transition-all ${ 
                          displaySettings.timeFormat === '12h'
                            ? 'border-purple-500 bg-purple-50 text-purple-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="font-semibold">12-часовой</div>
                        <div className="text-sm text-gray-600">02:30 PM</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDisplaySettings(prev => ({ ...prev, timeFormat: '24h' }));
                          toast.success('Формат времени изменен');
                        }}
                        className={`p-4 rounded-xl border-2 transition-all ${ 
                          displaySettings.timeFormat === '24h'
                            ? 'border-purple-500 bg-purple-50 text-purple-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="font-semibold">24-часовой</div>
                        <div className="text-sm text-gray-600">14:30</div>
                      </button>
                    </div>
                  </div>

                  {/* Формат даты */}
                  <div>
                    <Label className="mb-3 block">Формат даты</Label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { value: 'dd.MM.yyyy' as const, label: 'ДД.ММ.ГГГГ', example: '29.11.2025' },
                        { value: 'MM/dd/yyyy' as const, label: 'ММ/ДД/ГГГГ', example: '11/29/2025' },
                        { value: 'yyyy-MM-dd' as const, label: 'ГГГГ-ММ-ДД', example: '2025-11-29' },
                      ].map((format) => (
                        <button
                          key={format.value}
                          type="button"
                          onClick={() => {
                            setDisplaySettings(prev => ({ ...prev, dateFormat: format.value }));
                            toast.success('Формат даты изменен');
                          }}
                          className={`p-3 rounded-xl border-2 transition-all ${ 
                            displaySettings.dateFormat === format.value
                              ? 'border-purple-500 bg-purple-50 text-purple-700'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="font-semibold text-sm">{format.label}</div>
                          <div className="text-xs text-gray-600 mt-1">{format.example}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Компактный режим */}
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200">
                    <div>
                      <h4 className="font-semibold text-gray-900">Компактный режим</h4>
                      <p className="text-sm text-gray-600">Уменьшенные отступы и размеры элементов</p>
                    </div>
                    <Switch
                      checked={displaySettings.compactMode}
                      onCheckedChange={(checked) => {
                        setDisplaySettings(prev => ({ ...prev, compactMode: checked }));
                        toast.success(checked ? 'Компактный режим включен' : 'Компактный режим выключен');
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="profile-settings-footer p-6 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {isChanged && <span className="text-orange-600 font-semibold">• Есть несохраненные изменения</span>}
          </div>
          <div className="flex gap-3">
            <Button
              onClick={onClose}
              variant="outline"
              className="rounded-xl"
            >
              Отмена
            </Button>
            <Button
              onClick={handleSave}
              disabled={!isChanged || isSaving}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl disabled:opacity-50"
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Сохраняем…' : 'Сохранить'}
            </Button>
          </div>
        </div>
      </div>

      {/* Tariff Add/Edit Dialog */}
      <Dialog open={isAddTariffDialogOpen || !!editingTariff} onOpenChange={handleCloseTariffDialog}>
        <DialogContent className="sm:max-w-[500px] bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
              {editingTariff ? 'Редактировать тариф' : 'Добавить тариф'}
            </DialogTitle>
            <DialogDescription className="text-gray-600 text-sm">
              {editingTariff ? 'Обновите информацию о тарифе' : 'Создайте новый тариф для вашей школы'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitTariff} className="space-y-4 mt-4">
            {/* Название */}
            <div className="space-y-2">
              <Label htmlFor="tariff-name" className="text-gray-700 font-semibold text-sm">
                Название тарифа *
              </Label>
              <Input
                id="tariff-name"
                value={tariffFormData.name}
                onChange={(e) => handleTariffChange('name', e.target.value)}
                placeholder="Премиум тариф"
                className={`bg-white ${tariffErrors.name ? 'border-red-500' : ''}`}
              />
              {tariffErrors.name && (
                <p className="text-red-600 text-sm">{tariffErrors.name}</p>
              )}
            </div>

            {/* Цена */}
            <div className="space-y-2">
              <Label htmlFor="tariff-price" className="text-gray-700 font-semibold text-sm">
                Цена (₽) *
              </Label>
              <Input
                id="tariff-price"
                type="number"
                value={tariffFormData.price}
                onChange={(e) => handleTariffChange('price', e.target.value)}
                placeholder="25000"
                min="0"
                step="100"
                className={`bg-white ${tariffErrors.price ? 'border-red-500' : ''}`}
              />
              {tariffErrors.price && (
                <p className="text-red-600 text-sm">{tariffErrors.price}</p>
              )}
            </div>

            {/* Описание */}
            <div className="space-y-2">
              <Label htmlFor="tariff-description" className="text-gray-700 font-semibold text-sm">
                Описание (необязательно)
              </Label>
              <Textarea
                id="tariff-description"
                value={tariffFormData.description}
                onChange={(e) => handleTariffChange('description', e.target.value)}
                placeholder="Подробное описание тарифа..."
                rows={3}
                className="bg-white resize-none text-sm"
              />
            </div>

            {/* Кнопки */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseTariffDialog}
                className="flex-1"
              >
                Отмена
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
              >
                <DollarSign className="w-4 h-4 mr-2" />
                {editingTariff ? 'Сохранить' : 'Добавить'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
