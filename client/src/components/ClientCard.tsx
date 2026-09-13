import React from 'react';
import { Client } from '../types';
import { ChevronDown, ChevronUp, User, Edit, Calendar, DollarSign } from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Input } from './ui/input';
import { useState } from 'react';
import { PostponePaymentDialog } from './PostponePaymentDialog';
import { motion, AnimatePresence } from 'motion/react';
import { hapticFeedback } from '../utils/haptic';

interface ClientCardProps {
  client: Client;
  onTogglePayment: (clientId: string, paymentIndex: number) => void;
  onPostponePayment: (clientId: string, paymentIndex: number, newDate: Date, reason: string) => void;
  onEditClient: (client: Client) => void;
  onPaymentAmountChange: (clientId: string, paymentIndex: number, newAmount: number) => void;
}

const formatDate = (date: Date) => {
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear() % 100;
  return `${day.toString().padStart(2, '0')}.${month.toString().padStart(2, '0')}.${year.toString().padStart(2, '0')}`;
};

const formatDateLong = (date: Date) => {
  const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
};

export function ClientCard({ client, onTogglePayment, onPostponePayment, onEditClient, onPaymentAmountChange }: ClientCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [postponeDialogOpen, setPostponeDialogOpen] = useState(false);
  const [selectedPaymentIndex, setSelectedPaymentIndex] = useState<number | null>(null);
  const [editingAmountIndex, setEditingAmountIndex] = useState<number | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [isHovered, setIsHovered] = useState(false);

  const paidAmount = client.payments
    .filter(p => p.paid)
    .reduce((sum, p) => sum + p.amount, 0);
  
  const remainingAmount = client.totalAmount - paidAmount;
  const progress = (paidAmount / client.totalAmount) * 100;

  const handlePostponeClick = (index: number) => {
    setSelectedPaymentIndex(index);
    setPostponeDialogOpen(true);
  };

  const handlePostpone = (newDate: Date, reason: string) => {
    if (selectedPaymentIndex !== null) {
      onPostponePayment(client.id, selectedPaymentIndex, newDate, reason);
    }
  };

  const handleEditAmountClick = (index: number, currentAmount: number) => {
    setEditingAmountIndex(index);
    setEditAmount(currentAmount.toString());
  };

  const handleSaveAmount = (index: number) => {
    const newAmount = parseFloat(editAmount);
    if (!isNaN(newAmount) && newAmount > 0) {
      onPaymentAmountChange(client.id, index, newAmount);
    }
    setEditingAmountIndex(null);
  };

  const handleCancelEdit = () => {
    setEditingAmountIndex(null);
    setEditAmount('');
  };

  return (
    <>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`bg-white rounded-3xl shadow-3d transition-all duration-500 overflow-hidden group relative
          ${isExpanded ? 'shadow-3d-hover' : 'hover:shadow-3d-hover hover:-translate-y-1'}
          ${isHovered ? 'scale-[1.01]' : ''}
        `}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Задача #10 - Цветовой индикатор статуса слева */}
        <div className={`absolute left-0 top-0 bottom-0 w-1 ${
          client.status === 'reliable' ? 'bg-gradient-to-b from-green-400 to-emerald-500' : 'bg-gradient-to-b from-red-400 to-rose-500'
        }`} />
        
        {/* Задача #6 - Breathing room, увеличенные отступы */}
        <div className="p-4 sm:p-6 lg:p-8 pl-5 sm:pl-7 lg:pl-9">
          {/* Компактный заголовок с главной информацией */}
          <div className="flex items-start justify-between gap-3 sm:gap-4 mb-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 sm:gap-3 mb-2">
                {/* Задача #1 - Увеличенные размеры шрифтов */}
                <h3 className="text-base sm:text-lg lg:text-xl text-gray-900 truncate">{client.name}</h3>
                {/* Задача #10, #24 - Иконка + эмодзи для статуса */}
                <span className="text-lg sm:text-xl flex-shrink-0" role="img" aria-label={client.status === 'reliable' ? 'Надежный клиент' : 'Ненадежный клиент'}>
                  {client.status === 'reliable' ? '💗' : '💔'}
                </span>
              </div>
              <p className="text-sm sm:text-base text-gray-600 mb-1">{client.username}</p>
              <p className="text-[#2D1B69] font-semibold">«{client.tariff}» за {client.totalAmount.toLocaleString('ru-RU')} руб.</p>
            </div>
            
            {/* Задача #3, #4, #11 - Увеличенные кнопки с touch feedback */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEditClient(client)}
                className="touch-target touch-feedback rounded-xl p-2 sm:p-3 hover:bg-purple-50 hover:text-purple-600"
                aria-label="Редактировать клиента"
              >
                <Edit className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="touch-target touch-feedback rounded-xl p-2 sm:p-3 hover:bg-blue-50 hover:text-blue-600"
                aria-label={isExpanded ? 'Свернуть' : 'Развернуть'}
              >
                {isExpanded ? <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5" /> : <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5" />}
              </Button>
            </div>
          </div>

          {/* Прогресс и суммы - всегда видны */}
          <div className="space-y-3 sm:space-y-4">
            {/* Progress bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <span className="text-gray-600">Оплачено</span>
                <span className="text-gray-900 font-medium">{Math.round(progress)}%</span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                />
              </div>
            </div>

            {/* Задача #1 - Увеличенные размеры для сумм */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="bg-gradient-to-br from-purple-50 to-blue-50 p-3 sm:p-4 rounded-2xl">
                <p className="text-xs sm:text-sm text-gray-600 mb-1">Оплачено</p>
                <p className="text-base sm:text-lg lg:text-xl text-gray-900 font-semibold">{paidAmount.toLocaleString()} ₽</p>
              </div>
              <div className="bg-gradient-to-br from-pink-50 to-purple-50 p-3 sm:p-4 rounded-2xl">
                <p className="text-xs sm:text-sm text-gray-600 mb-1">Осталось</p>
                <p className="text-base sm:text-lg lg:text-xl text-gray-900 font-semibold">{remainingAmount.toLocaleString()} ₽</p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
              <User className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>Менеджер: <span className="text-gray-900 font-medium">{client.manager}</span></span>
            </div>
          </div>

          {/* Задача #9 - Progressive disclosure - детали по клику */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="pt-4 border-t border-purple-200/50"
              >
                <h4 className="text-[#2D1B69] mb-4 font-semibold">График платежей</h4>
                <div className="space-y-2">
                  {client.payments.map((payment, index) => {
                    const isPast = payment.date < new Date();
                    const isOverdue = isPast && !payment.paid;
                    const isPostponed = payment.originalDate !== undefined;
                    const isEditing = editingAmountIndex === index;
                    
                    return (
                      <motion.div 
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={`flex items-center justify-between p-4 rounded-2xl transition-all duration-300 hover:scale-[1.02] ${ 
                          payment.paid 
                            ? 'bg-gradient-to-r from-green-50/80 to-emerald-50/60 border border-green-200/50 shadow-sm hover:shadow-md' 
                            : isOverdue 
                              ? 'bg-gradient-to-r from-red-50/80 to-pink-50/60 border border-red-200/50 shadow-sm hover:shadow-md' 
                              : 'bg-gradient-to-r from-purple-50/50 to-pink-50/30 border border-purple-200/40 shadow-sm hover:shadow-md'
                        }`}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <Checkbox
                            checked={payment.paid}
                            onCheckedChange={() => {
                              // Задача #21 - Haptic feedback при toggle
                              hapticFeedback.selection();
                              onTogglePayment(client.id, index);
                            }}
                            className="rounded-lg"
                            aria-label={payment.paid ? "Отменить оплату" : "Отметить как оплачено"}
                          />
                          <div className="flex-1">
                            <p className="text-[#2D1B69]">
                              {formatDateLong(payment.date)}
                              {isPostponed && ' 🙏'}
                            </p>
                            {isOverdue && (
                              <p className="text-red-500">Просрочен</p>
                            )}
                            {isPostponed && (
                              <p className="text-[#4A148C]">
                                Перенесен с {formatDateLong(payment.originalDate!)}
                              </p>
                            )}
                            {payment.postponeReason && (
                              <p className="text-[#4A148C]/70">
                                Причина: {payment.postponeReason}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            {isEditing ? (
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  value={editAmount}
                                  onChange={(e) => setEditAmount(e.target.value)}
                                  className="w-32 h-8 rounded-lg"
                                  autoFocus
                                />
                                <Button
                                  size="sm"
                                  onClick={() => handleSaveAmount(index)}
                                  className="h-8 bg-green-500 hover:bg-green-600 text-white rounded-lg"
                                >
                                  ✓
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={handleCancelEdit}
                                  className="h-8 text-red-500 hover:bg-red-50 rounded-lg"
                                >
                                  ✕
                                </Button>
                              </div>
                            ) : (
                              <>
                                <p className={payment.paid ? 'text-green-600' : 'text-[#2D1B69]'}>
                                  {payment.amount.toLocaleString('ru-RU')} ₽
                                </p>
                                {index === 0 && (
                                  <Badge variant="outline" className="text-[#4A148C] border-purple-300 bg-purple-50 rounded-lg">
                                    Предоплата
                                  </Badge>
                                )}
                              </>
                            )}
                          </div>
                          {!isEditing && !payment.paid && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditAmountClick(index, payment.amount)}
                                title="Редактировать сумму"
                                className="text-[#4A148C]/70 hover:text-[#4A148C] hover:bg-purple-100/30 transition-all duration-300 rounded-xl"
                              >
                                <DollarSign className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handlePostponeClick(index)}
                                title="Перенести платеж"
                                className="text-[#4A148C]/70 hover:text-[#4A148C] hover:bg-purple-100/30 transition-all duration-300 rounded-xl"
                              >
                                <Calendar className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
                
                {/* Overdue History */}
                {client.overdueHistory.length > 0 && (
                  <div className="mt-6 pt-4 border-t border-purple-200/50">
                    <h4 className="text-[#2D1B69] mb-3">История просрочек</h4>
                    <div className="space-y-2">
                      {client.overdueHistory.map((record, index) => (
                        <div key={index} className="p-4 bg-red-50/80 rounded-2xl shadow-sm">
                          <div className="flex justify-between mb-1">
                            <p className="text-[#2D1B69]">
                              {formatDateLong(record.originalDate)} → {formatDateLong(record.postponedDate)}
                            </p>
                            <p className="text-[#2D1B69]">
                              {record.amount.toLocaleString('ru-RU')} ₽
                            </p>
                          </div>
                          <p className="text-[#4A148C]/70">{record.reason}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      <PostponePaymentDialog
        open={postponeDialogOpen}
        onOpenChange={setPostponeDialogOpen}
        onPostpone={handlePostpone}
        currentDate={selectedPaymentIndex !== null ? client.payments[selectedPaymentIndex].date : new Date()}
        amount={selectedPaymentIndex !== null ? client.payments[selectedPaymentIndex].amount : 0}
      />
    </>
  );
}