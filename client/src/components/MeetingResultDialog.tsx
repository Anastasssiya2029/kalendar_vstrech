import React, { useState } from 'react';
import { Meeting, Client, Tariff, PaymentMethod } from '../types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { CheckCircle, DollarSign, CreditCard, FileText, Building2, Receipt } from 'lucide-react';

interface MeetingResultDialogProps {
  meeting: Meeting | null;
  client: Client | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (meetingId: string, result: {
    status: 'completed' | 'completed_with_sale';
    notes?: string;
    soldTariff?: string;
    saleAmount?: number;
    paymentMethod?: PaymentMethod;
  }) => void;
  mode: 'completed' | 'with_sale';
  availableTariffs?: Tariff[];
}

export function MeetingResultDialog({ 
  meeting,
  client,
  open, 
  onOpenChange, 
  onSave,
  mode,
  availableTariffs = []
}: MeetingResultDialogProps) {
  const [formData, setFormData] = useState({
    notes: '',
    tariffId: '',
    tariffName: '',
    saleAmount: '',
    paymentMethod: '' as PaymentMethod | ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!meeting || !client) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Валидация
    const newErrors: Record<string, string> = {};
    
    if (mode === 'with_sale') {
      if (!formData.tariffName.trim()) {
        newErrors.tariffName = 'Укажите название тарифа';
      }
      if (!formData.saleAmount.trim()) {
        newErrors.saleAmount = 'Укажите сумму продажи';
      } else if (isNaN(Number(formData.saleAmount)) || Number(formData.saleAmount) <= 0) {
        newErrors.saleAmount = 'Сумма должна быть положительным числом';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Сохраняем результат
    const result = {
      status: mode === 'with_sale' ? 'completed_with_sale' as const : 'completed' as const,
      notes: formData.notes.trim() || undefined,
      ...(mode === 'with_sale' && {
        soldTariff: formData.tariffName.trim(),
        saleAmount: Number(formData.saleAmount),
        ...(formData.paymentMethod && { paymentMethod: formData.paymentMethod as PaymentMethod })
      })
    };

    onSave(meeting.id, result);
    
    // Сброс формы
    setFormData({
      notes: '',
      tariffId: '',
      tariffName: '',
      saleAmount: '',
      paymentMethod: '' as PaymentMethod | ''
    });
    setErrors({});
    onOpenChange(false);
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Убираем ошибку при изменении поля
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleTariffSelect = (tariff: Tariff) => {
    setFormData(prev => ({
      ...prev,
      tariffId: tariff.id,
      tariffName: tariff.name,
      saleAmount: tariff.price.toString()
    }));
    setErrors({});
  };

  const isWithSale = mode === 'with_sale';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`meeting-result-dialog sm:max-w-[500px] max-h-[90vh] overflow-hidden flex flex-col ${
        isWithSale ? 'meeting-result-dialog--sale' : 'meeting-result-dialog--completed'
      }`}>
        <DialogHeader className="meeting-result-dialog-header">
          <DialogTitle className="meeting-result-dialog-title">
            <div className={`meeting-result-dialog-icon ${isWithSale ? 'is-sale' : 'is-completed'}`}>
              {isWithSale ? (
                <DollarSign className="w-5 h-5 text-white" />
              ) : (
                <CheckCircle className="w-5 h-5 text-white" />
              )}
            </div>
            {isWithSale ? 'Встреча с продажей' : 'Встреча проведена'}
          </DialogTitle>
          <DialogDescription className="meeting-result-dialog-client">
            Клиент: <strong>{client.firstName} {client.lastName}</strong>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="meeting-result-form flex flex-col flex-1 overflow-hidden">
          <div className="meeting-result-form-content space-y-4 overflow-y-auto pr-2 flex-1">
            {/* Информация о встрече */}
            <div className="meeting-result-meeting-summary">
              <p>
                <strong>Дата:</strong> {new Date(meeting.date).toLocaleDateString('ru-RU')}
              </p>
              <p>
                <strong>Время:</strong> {meeting.startTime}
              </p>
            </div>

            {/* Поля для продажи */}
            {isWithSale && (
              <>
                {/* Выбор тарифа из списка */}
                {availableTariffs.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-gray-700 font-semibold">
                      Выберите тариф (необязательно)
                    </Label>
                    <div className="meeting-result-tariff-list grid grid-cols-1 gap-2">
                      {availableTariffs.filter(t => t.isActive).map(tariff => (
                        <button
                          key={tariff.id}
                          type="button"
                          onClick={() => handleTariffSelect(tariff)}
                          className={`meeting-result-tariff p-3 rounded-xl border-2 transition-all text-left ${
                            formData.tariffId === tariff.id
                              ? 'border-purple-500 bg-purple-50'
                              : 'border-gray-200 bg-white hover:border-purple-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-gray-800">{tariff.name}</p>
                              {tariff.description && (
                                <p className="text-xs text-gray-600">{tariff.description}</p>
                              )}
                            </div>
                            <span className="font-bold text-purple-600">
                              {tariff.price.toLocaleString('ru-RU')} ₽
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Название тарифа */}
                <div className="space-y-2">
                  <Label htmlFor="tariffName" className="text-gray-700 font-semibold">
                    Название тарифа *
                  </Label>
                  <Input
                    id="tariffName"
                    value={formData.tariffName}
                    onChange={(e) => handleChange('tariffName', e.target.value)}
                    placeholder="Премиум тариф"
                    className={`meeting-result-input ${errors.tariffName ? 'border-red-500' : ''}`}
                  />
                  {errors.tariffName && (
                    <p className="text-red-600 text-sm">{errors.tariffName}</p>
                  )}
                </div>

                {/* Сумма продажи */}
                <div className="space-y-2">
                  <Label htmlFor="saleAmount" className="text-gray-700 font-semibold">
                    Сумма продажи (₽) *
                  </Label>
                  <Input
                    id="saleAmount"
                    type="number"
                    value={formData.saleAmount}
                    onChange={(e) => handleChange('saleAmount', e.target.value)}
                    placeholder="25000"
                    min="0"
                    step="100"
                    className={`meeting-result-input ${errors.saleAmount ? 'border-red-500' : ''}`}
                  />
                  {errors.saleAmount && (
                    <p className="text-red-600 text-sm">{errors.saleAmount}</p>
                  )}
                </div>

                {/* Способ оплаты */}
                <div className="space-y-3">
                  <Label className="text-gray-700 font-semibold">
                    Способ оплаты (необязательно)
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleChange('paymentMethod', 'link')}
                      className={`p-3 rounded-xl border-2 transition-all ${
                        formData.paymentMethod === 'link'
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 bg-white hover:border-purple-300'
                      }`}
                    >
                      <CreditCard className="w-5 h-5 mx-auto mb-1 text-purple-600" />
                      <p className="text-sm font-medium text-gray-800">По ссылке</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleChange('paymentMethod', 'invoice')}
                      className={`p-3 rounded-xl border-2 transition-all ${
                        formData.paymentMethod === 'invoice'
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 bg-white hover:border-purple-300'
                      }`}
                    >
                      <FileText className="w-5 h-5 mx-auto mb-1 text-purple-600" />
                      <p className="text-sm font-medium text-gray-800">По счету</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleChange('paymentMethod', 'bank_installment')}
                      className={`p-3 rounded-xl border-2 transition-all ${
                        formData.paymentMethod === 'bank_installment'
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 bg-white hover:border-purple-300'
                      }`}
                    >
                      <Building2 className="w-5 h-5 mx-auto mb-1 text-purple-600" />
                      <p className="text-sm font-medium text-gray-800">Рассрочка от банка</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleChange('paymentMethod', 'internal_installment')}
                      className={`p-3 rounded-xl border-2 transition-all ${
                        formData.paymentMethod === 'internal_installment'
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 bg-white hover:border-purple-300'
                      }`}
                    >
                      <Receipt className="w-5 h-5 mx-auto mb-1 text-purple-600" />
                      <p className="text-sm font-medium text-gray-800">Внутренняя рассрочка</p>
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Заметки */}
            <div className="space-y-2">
              <Label htmlFor="notes" className="text-gray-700 font-semibold">
                Заметки о встрече (необязательно)
              </Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="Клиент заинтересован, планирует начать обучение в следующем месяце..."
                rows={4}
                className="meeting-result-notes-input"
              />
            </div>
          </div>

          {/* Кнопки - вне скролла */}
          <div className="meeting-result-actions">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="meeting-result-cancel"
            >
              Отмена
            </Button>
            <Button
              type="submit"
              className={`meeting-result-submit ${isWithSale ? 'is-sale' : 'is-completed'}`}
            >
              {isWithSale ? (
                <>
                  <DollarSign className="w-4 h-4 mr-2" />
                  Отметить продажу
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Отметить проведенной
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
