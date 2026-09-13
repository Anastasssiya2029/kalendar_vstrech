import React, { useState } from 'react';
import { Plus, UserPlus, Calendar, Clock, Download, Zap, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface QuickActionsProps {
  onAddClient: () => void;
  onAddTimeSlot?: () => void;
  onExportData?: () => void;
  userRole: string;
}

export function QuickActions({ onAddClient, onAddTimeSlot, onExportData, userRole }: QuickActionsProps) {
  const [isOpen, setIsOpen] = useState(false);

  const actions = [
    {
      id: 'add-client',
      label: 'Добавить клиента',
      icon: UserPlus,
      color: 'from-blue-500 to-cyan-500',
      onClick: () => {
        onAddClient();
        setIsOpen(false);
      },
      roles: ['admin', 'manager', 'assistant', 'architect'],
    },
    ...(userRole === 'manager' && onAddTimeSlot ? [{
      id: 'add-slot',
      label: 'Создать окошко',
      icon: Clock,
      color: 'from-purple-500 to-pink-500',
      onClick: () => {
        onAddTimeSlot();
        setIsOpen(false);
      },
      roles: ['manager'],
    }] : []),
    ...(onExportData ? [{
      id: 'export',
      label: 'Экспорт данных',
      icon: Download,
      color: 'from-green-500 to-emerald-500',
      onClick: () => {
        onExportData();
        setIsOpen(false);
      },
      roles: ['admin', 'manager', 'architect'],
    }] : []),
  ];

  const visibleActions = actions.filter(action => 
    action.roles.includes(userRole)
  );

  return (
    <div className="fixed bottom-6 right-6 z-40">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-20 right-0 space-y-3 mb-2"
          >
            {visibleActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <motion.button
                  key={action.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={action.onClick}
                  className={`flex items-center gap-3 px-4 py-3 bg-gradient-to-r ${action.color} text-white rounded-2xl shadow-lg hover:shadow-xl transition-all hover:scale-105 whitespace-nowrap group`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-semibold">{action.label}</span>
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main FAB Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className={`w-16 h-16 rounded-full shadow-2xl flex items-center justify-center transition-all ${
          isOpen
            ? 'bg-gradient-to-r from-red-500 to-pink-500'
            : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700'
        }`}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <X className="w-7 h-7 text-white" />
            </motion.div>
          ) : (
            <motion.div
              key="open"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Zap className="w-7 h-7 text-white" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Tooltip */}
      {!isOpen && (
        <div className="absolute bottom-full right-0 mb-2 pointer-events-none">
          <div className="bg-gray-900 text-white text-sm px-3 py-2 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
            Быстрые действия
          </div>
        </div>
      )}
    </div>
  );
}
