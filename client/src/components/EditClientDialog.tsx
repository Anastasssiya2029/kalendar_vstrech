import React from 'react';
import { useState, useEffect } from 'react';
import { Client } from '../types';
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

interface EditClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEditClient: (client: Client) => void;
  client: Client | null;
}

const formatDateForInput = (date: Date) => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export function EditClientDialog({ open, onOpenChange, onEditClient, client }: EditClientDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    tariff: '',
    totalAmount: '',
    prepayment: '',
    prepaymentDate: formatDateForInput(new Date()),
    installmentStart: formatDateForInput(new Date()),
    installmentEnd: formatDateForInput(new Date()),
    manager: '',
  });

  useEffect(() => {
    if (client) {
      setFormData({
        name: client.name,
        username: client.username,
        tariff: client.tariff,
        totalAmount: client.totalAmount.toString(),
        prepayment: client.prepayment.toString(),
        prepaymentDate: formatDateForInput(client.prepaymentDate),
        installmentStart: formatDateForInput(client.installmentStart),
        installmentEnd: formatDateForInput(client.installmentEnd),
        manager: client.manager,
      });
    }
  }, [client]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!client) return;

    const updatedClient: Client = {
      ...client,
      name: formData.name,
      username: formData.username,
      tariff: formData.tariff,
      totalAmount: parseFloat(formData.totalAmount),
      prepayment: parseFloat(formData.prepayment),
      prepaymentDate: new Date(formData.prepaymentDate),
      installmentStart: new Date(formData.installmentStart),
      installmentEnd: new Date(formData.installmentEnd),
      manager: formData.manager,
    };

    onEditClient(updatedClient);
    onOpenChange(false);
  };

  if (!client) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white/95 backdrop-blur-xl border-blue-200/50 rounded-3xl shadow-3d-cosmic">
        <DialogHeader>
          <DialogTitle className="text-gradient">Редактировать клиента</DialogTitle>
          <DialogDescription className="text-[#263238]/70">
            Измените информацию о клиенте
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 mt-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-gray-900">Имя клиента</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="rounded-2xl border-blue-200/50 bg-white/90 focus:border-purple-400 transition-colors"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username" className="text-gray-900">Username</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="@username"
                required
                className="rounded-2xl border-blue-200/50 bg-white/90 focus:border-purple-400 transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="tariff" className="text-gray-900">Тариф</Label>
              <Input
                id="tariff"
                value={formData.tariff}
                onChange={(e) => setFormData({ ...formData, tariff: e.target.value })}
                required
                className="rounded-2xl border-blue-200/50 bg-white/90 focus:border-purple-400 transition-colors"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="manager" className="text-gray-900">Менеджер</Label>
              <Input
                id="manager"
                value={formData.manager}
                onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
                required
                className="rounded-2xl border-blue-200/50 bg-white/90 focus:border-purple-400 transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="totalAmount" className="text-gray-900">Общая сумма (₽)</Label>
              <Input
                id="totalAmount"
                type="number"
                value={formData.totalAmount}
                onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
                required
                className="rounded-2xl border-blue-200/50 bg-white/90 focus:border-purple-400 transition-colors"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prepayment" className="text-gray-900">Предоплата (₽)</Label>
              <Input
                id="prepayment"
                type="number"
                value={formData.prepayment}
                onChange={(e) => setFormData({ ...formData, prepayment: e.target.value })}
                required
                className="rounded-2xl border-blue-200/50 bg-white/90 focus:border-purple-400 transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="prepaymentDate" className="text-gray-900">Дата предоплаты</Label>
              <Input
                id="prepaymentDate"
                type="date"
                value={formData.prepaymentDate}
                onChange={(e) => setFormData({ ...formData, prepaymentDate: e.target.value })}
                required
                className="rounded-2xl border-blue-200/50 bg-white/90 focus:border-purple-400 transition-colors"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="installmentStart" className="text-gray-900">Начало рассрочки</Label>
              <Input
                id="installmentStart"
                type="date"
                value={formData.installmentStart}
                onChange={(e) => setFormData({ ...formData, installmentStart: e.target.value })}
                required
                className="rounded-2xl border-blue-200/50 bg-white/90 focus:border-purple-400 transition-colors"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="installmentEnd" className="text-gray-900">Конец рассрочки</Label>
              <Input
                id="installmentEnd"
                type="date"
                value={formData.installmentEnd}
                onChange={(e) => setFormData({ ...formData, installmentEnd: e.target.value })}
                required
                className="rounded-2xl border-blue-200/50 bg-white/90 focus:border-purple-400 transition-colors"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="rounded-2xl border-blue-200/50 hover:bg-blue-50/50 hover:text-gray-900 transition-all"
            >
              Отмена
            </Button>
            <Button 
              type="submit" 
              className="rounded-2xl bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 text-white shadow-3d-cosmic hover:shadow-3d-hover transition-all duration-400 hover:scale-105"
            >
              Сохранить изменения
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}