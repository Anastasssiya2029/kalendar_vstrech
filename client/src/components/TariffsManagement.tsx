import React, { useState } from 'react';
import { Tariff } from '../types';
import { Button } from './ui/button';
import { Plus, Edit2, Trash2, DollarSign, ToggleLeft, ToggleRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { toast } from 'sonner';

interface TariffsManagementProps {
  tariffs: Tariff[];
  onAddTariff: (tariff: Omit<Tariff, 'id'>) => void;
  onEditTariff: (id: string, tariff: Partial<Tariff>) => void;
  onDeleteTariff: (id: string) => void;
  onToggleActive: (id: string) => void;
}

export function TariffsManagement({
  tariffs,
  onAddTariff,
  onEditTariff,
  onDeleteTariff,
  onToggleActive
}: TariffsManagementProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingTariff, setEditingTariff] = useState<Tariff | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    description: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleOpenAddDialog = () => {
    setFormData({ name: '', price: '', description: '' });
    setErrors({});
    setIsAddDialogOpen(true);
  };

  const handleOpenEditDialog = (tariff: Tariff) => {
    setFormData({
      name: tariff.name,
      price: tariff.price.toString(),
      description: tariff.description || ''
    });
    setErrors({});
    setEditingTariff(tariff);
  };

  const handleCloseDialog = () => {
    setIsAddDialogOpen(false);
    setEditingTariff(null);
    setFormData({ name: '', price: '', description: '' });
    setErrors({});
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Валидация
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Введите название тарифа';
    }
    if (!formData.price.trim()) {
      newErrors.price = 'Введите цену';
    } else if (isNaN(Number(formData.price)) || Number(formData.price) <= 0) {
      newErrors.price = 'Цена должна быть положительным числом';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const tariffData = {
      name: formData.name.trim(),
      price: Number(formData.price),
      description: formData.description.trim() || undefined,
      isActive: true
    };

    if (editingTariff) {
      onEditTariff(editingTariff.id, tariffData);
      toast.success('Тариф обновлен');
    } else {
      onAddTariff(tariffData);
      toast.success('Тариф добавлен');
    }

    handleCloseDialog();
  };

  const handleDelete = (tariff: Tariff) => {
    if (window.confirm(`Удалить тариф "${tariff.name}"?`)) {
      onDeleteTariff(tariff.id);
      toast.success('Тариф удален');
    }
  };

  const activeTariffs = tariffs.filter(t => t.isActive);
  const inactiveTariffs = tariffs.filter(t => !t.isActive);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-3d p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2>Управление тарифами</h2>
            <p className="text-gray-600 text-sm mt-1">
              Настройте тарифы для вашей школы
            </p>
          </div>
          <Button
            onClick={handleOpenAddDialog}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl"
          >
            <Plus className="w-4 h-4 mr-2" />
            Добавить тариф
          </Button>
        </div>
      </div>

      {/* Active Tariffs */}
      {activeTariffs.length > 0 && (
        <div className="bg-white rounded-2xl shadow-3d p-6">
          <h3 className="text-xl font-bold text-[#2D1B69] mb-4">Активные тарифы</h3>
          <div className="grid gap-4">
            {activeTariffs.map(tariff => (
              <div
                key={tariff.id}
                className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border-2 border-purple-200"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
                        <DollarSign className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h4 className="font-bold text-lg text-[#2D1B69]">{tariff.name}</h4>
                        <p className="text-2xl font-bold text-purple-600">
                          {tariff.price.toLocaleString('ru-RU')} ₽
                        </p>
                      </div>
                    </div>
                    {tariff.description && (
                      <p className="text-sm text-gray-600 ml-13">{tariff.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => onToggleActive(tariff.id)}
                      variant="outline"
                      size="sm"
                      className="rounded-lg"
                      title="Деактивировать"
                    >
                      <ToggleRight className="w-5 h-5 text-green-600" />
                    </Button>
                    <Button
                      onClick={() => handleOpenEditDialog(tariff)}
                      variant="outline"
                      size="sm"
                      className="rounded-lg"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => handleDelete(tariff)}
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
        <div className="bg-white rounded-2xl shadow-3d p-6">
          <h3 className="text-xl font-bold text-gray-500 mb-4">Неактивные тарифы</h3>
          <div className="grid gap-4">
            {inactiveTariffs.map(tariff => (
              <div
                key={tariff.id}
                className="bg-gray-50 rounded-xl p-4 border-2 border-gray-200 opacity-60"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-gray-400 rounded-xl flex items-center justify-center">
                        <DollarSign className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h4 className="font-bold text-lg text-gray-700">{tariff.name}</h4>
                        <p className="text-2xl font-bold text-gray-600">
                          {tariff.price.toLocaleString('ru-RU')} ₽
                        </p>
                      </div>
                    </div>
                    {tariff.description && (
                      <p className="text-sm text-gray-500 ml-13">{tariff.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => onToggleActive(tariff.id)}
                      variant="outline"
                      size="sm"
                      className="rounded-lg"
                      title="Активировать"
                    >
                      <ToggleLeft className="w-5 h-5 text-gray-400" />
                    </Button>
                    <Button
                      onClick={() => handleOpenEditDialog(tariff)}
                      variant="outline"
                      size="sm"
                      className="rounded-lg"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => handleDelete(tariff)}
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
        <div className="bg-white rounded-2xl shadow-3d p-12 text-center">
          <DollarSign className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500 mb-4">Пока нет добавленных тарифов</p>
          <Button
            onClick={handleOpenAddDialog}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl"
          >
            <Plus className="w-4 h-4 mr-2" />
            Добавить первый тариф
          </Button>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={isAddDialogOpen || !!editingTariff} onOpenChange={handleCloseDialog}>
        <DialogContent className="sm:max-w-[500px] bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-[#2D1B69] flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
              {editingTariff ? 'Редактировать тариф' : 'Добавить тариф'}
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              {editingTariff ? 'Обновите информацию о тарифе' : 'Создайте новый тариф для вашей школы'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            {/* Название */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-gray-700 font-semibold">
                Название тарифа *
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Премиум тариф"
                className={`bg-white ${errors.name ? 'border-red-500' : ''}`}
              />
              {errors.name && (
                <p className="text-red-600 text-sm">{errors.name}</p>
              )}
            </div>

            {/* Цена */}
            <div className="space-y-2">
              <Label htmlFor="price" className="text-gray-700 font-semibold">
                Цена (₽) *
              </Label>
              <Input
                id="price"
                type="number"
                value={formData.price}
                onChange={(e) => handleChange('price', e.target.value)}
                placeholder="25000"
                min="0"
                step="100"
                className={`bg-white ${errors.price ? 'border-red-500' : ''}`}
              />
              {errors.price && (
                <p className="text-red-600 text-sm">{errors.price}</p>
              )}
            </div>

            {/* Описание */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-gray-700 font-semibold">
                Описание (необязательно)
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Подробное описание тарифа..."
                rows={3}
                className="bg-white resize-none"
              />
            </div>

            {/* Кнопки */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseDialog}
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
