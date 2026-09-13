import React, { useState, useMemo } from 'react';
import { ClientList } from './ClientList';
import { PaymentCalendar } from './PaymentCalendar';
import { MonthlyOverview } from './MonthlyOverview';
import { YearlyOverview } from './YearlyOverview';
import { StatusLegend } from './StatusLegend';
import { AddClientDialog } from './AddClientDialog';
import { EditClientDialog } from './EditClientDialog';
import { SchoolManagement } from './SchoolManagement';
import { UserManagement } from './UserManagement';
import { ManagerTimeSlots } from './ManagerTimeSlots';
import { Button } from './ui/button';
import { Plus, LogOut, User as UserIcon } from 'lucide-react';
import { Client, TimeSlot } from '../types';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { motion } from 'motion/react';

// Начальные данные клиентов
const INITIAL_CLIENTS: Client[] = [
  {
    id: '1',
    name: 'Шавров Александр',
    username: '@shavrov_dubs',
    tariff: 'Бизнес-команда',
    totalAmount: 33001,
    prepayment: 9600,
    prepaymentDate: new Date('2025-10-11'),
    installmentStart: new Date('2025-11-11'),
    installmentEnd: new Date('2026-05-11'),
    manager: 'Галина',
    status: 'reliable',
    overdueHistory: [],
    payments: [
      { date: new Date('2025-10-11'), amount: 9600, paid: true },
      { date: new Date('2025-11-11'), amount: 4680, paid: true },
      { date: new Date('2025-12-11'), amount: 4680, paid: false },
      { date: new Date('2026-01-11'), amount: 4680, paid: false },
      { date: new Date('2026-02-11'), amount: 4680, paid: false },
      { date: new Date('2026-03-11'), amount: 4681, paid: false },
    ]
  },
  {
    id: '2',
    name: 'Иванова Мария',
    username: '@maria_iv',
    tariff: 'Профессионал',
    totalAmount: 45000,
    prepayment: 15000,
    prepaymentDate: new Date('2025-09-01'),
    installmentStart: new Date('2025-10-01'),
    installmentEnd: new Date('2026-03-01'),
    manager: 'Андрей',
    status: 'unreliable',
    overdueHistory: [
      {
        originalDate: new Date('2025-10-15'),
        postponedDate: new Date('2025-11-01'),
        reason: 'Задержка финансирования',
        amount: 6000
      }
    ],
    payments: [
      { date: new Date('2025-09-01'), amount: 15000, paid: true },
      { date: new Date('2025-11-01'), amount: 6000, paid: true, originalDate: new Date('2025-10-15'), postponeReason: 'Задержка финансирования' },
      { date: new Date('2025-11-15'), amount: 6000, paid: false },
      { date: new Date('2025-12-15'), amount: 6000, paid: false },
      { date: new Date('2026-01-15'), amount: 6000, paid: false },
      { date: new Date('2026-02-15'), amount: 6000, paid: false },
    ]
  },
  {
    id: '3',
    name: 'Петров Дмитрий',
    username: '@dmitry_p',
    tariff: 'Старт',
    totalAmount: 25000,
    prepayment: 5000,
    prepaymentDate: new Date('2025-11-05'),
    installmentStart: new Date('2025-12-05'),
    installmentEnd: new Date('2026-04-05'),
    manager: 'Галина',
    status: 'reliable',
    overdueHistory: [],
    payments: [
      { date: new Date('2025-11-05'), amount: 5000, paid: true },
      { date: new Date('2025-12-05'), amount: 5000, paid: false },
      { date: new Date('2026-01-05'), amount: 5000, paid: false },
      { date: new Date('2026-02-05'), amount: 5000, paid: false },
      { date: new Date('2026-03-05'), amount: 5000, paid: false },
    ]
  },
  {
    id: '4',
    name: 'Соколова Анна',
    username: '@anna_sok',
    tariff: 'Премиум',
    totalAmount: 58000,
    prepayment: 20000,
    prepaymentDate: new Date('2025-10-20'),
    installmentStart: new Date('2025-11-20'),
    installmentEnd: new Date('2026-05-20'),
    manager: 'Андрей',
    status: 'reliable',
    overdueHistory: [],
    payments: [
      { date: new Date('2025-10-20'), amount: 20000, paid: true },
      { date: new Date('2025-11-20'), amount: 6333, paid: true },
      { date: new Date('2025-12-20'), amount: 6333, paid: false },
      { date: new Date('2026-01-20'), amount: 6333, paid: false },
      { date: new Date('2026-02-20'), amount: 6333, paid: false },
      { date: new Date('2026-03-20'), amount: 6333, paid: false },
      { date: new Date('2026-04-20'), amount: 6335, paid: false },
    ]
  },
  {
    id: '5',
    name: 'Кузнецов Игорь',
    username: '@igor_kuz',
    tariff: 'Бизнес',
    totalAmount: 42000,
    prepayment: 12000,
    prepaymentDate: new Date('2025-11-01'),
    installmentStart: new Date('2025-12-01'),
    installmentEnd: new Date('2026-05-01'),
    manager: 'Галина',
    status: 'reliable',
    overdueHistory: [],
    payments: [
      { date: new Date('2025-11-01'), amount: 12000, paid: true },
      { date: new Date('2025-12-01'), amount: 6000, paid: false },
      { date: new Date('2026-01-01'), amount: 6000, paid: false },
      { date: new Date('2026-02-01'), amount: 6000, paid: false },
      { date: new Date('2026-03-01'), amount: 6000, paid: false },
      { date: new Date('2026-04-01'), amount: 6000, paid: false },
    ]
  },
  {
    id: '6',
    name: 'Морозова Елена',
    username: '@elena_mor',
    tariff: 'Стандарт',
    totalAmount: 36000,
    prepayment: 10000,
    prepaymentDate: new Date('2025-10-25'),
    installmentStart: new Date('2025-11-25'),
    installmentEnd: new Date('2026-04-25'),
    manager: 'Андрей',
    status: 'unreliable',
    overdueHistory: [
      {
        originalDate: new Date('2025-11-25'),
        postponedDate: new Date('2025-12-05'),
        reason: 'Технические проблемы с банком',
        amount: 5200
      }
    ],
    payments: [
      { date: new Date('2025-10-25'), amount: 10000, paid: true },
      { date: new Date('2025-12-05'), amount: 5200, paid: false, originalDate: new Date('2025-11-25'), postponeReason: 'Технические проблемы с банком' },
      { date: new Date('2025-12-25'), amount: 5200, paid: false },
      { date: new Date('2026-01-25'), amount: 5200, paid: false },
      { date: new Date('2026-02-25'), amount: 5200, paid: false },
      { date: new Date('2026-03-25'), amount: 5200, paid: false },
    ]
  },
  {
    id: '7',
    name: 'Волков Максим',
    username: '@max_wolf',
    tariff: 'Профессионал',
    totalAmount: 48000,
    prepayment: 15000,
    prepaymentDate: new Date('2025-11-10'),
    installmentStart: new Date('2025-12-10'),
    installmentEnd: new Date('2026-06-10'),
    manager: 'Галина',
    status: 'reliable',
    overdueHistory: [],
    payments: [
      { date: new Date('2025-11-10'), amount: 15000, paid: true },
      { date: new Date('2025-12-10'), amount: 5500, paid: false },
      { date: new Date('2026-01-10'), amount: 5500, paid: false },
      { date: new Date('2026-02-10'), amount: 5500, paid: false },
      { date: new Date('2026-03-10'), amount: 5500, paid: false },
      { date: new Date('2026-04-10'), amount: 5500, paid: false },
      { date: new Date('2026-05-10'), amount: 5500, paid: false },
    ]
  },
  {
    id: '8',
    name: 'Новикова Ольга',
    username: '@olga_nov',
    tariff: 'Старт',
    totalAmount: 28000,
    prepayment: 8000,
    prepaymentDate: new Date('2025-11-08'),
    installmentStart: new Date('2025-12-08'),
    installmentEnd: new Date('2026-04-08'),
    manager: 'Андрей',
    status: 'reliable',
    overdueHistory: [],
    payments: [
      { date: new Date('2025-11-08'), amount: 8000, paid: true },
      { date: new Date('2025-12-08'), amount: 5000, paid: false },
      { date: new Date('2026-01-08'), amount: 5000, paid: false },
      { date: new Date('2026-02-08'), amount: 5000, paid: false },
      { date: new Date('2026-03-08'), amount: 5000, paid: false },
    ]
  }
];

export function Dashboard() {
  const { user, logout } = useAuth();
  const [clients, setClients] = useState<Client[]>(INITIAL_CLIENTS);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [selectedView, setSelectedView] = useState<'clients' | 'calendar' | 'schools' | 'users' | 'timeslots'>(
    user?.role === 'architect' ? 'schools' : 'clients'
  );
  const [selectedManager, setSelectedManager] = useState<string>('all');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // State для окошек менеджеров
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);

  // Mock data for schools and users
  const [schools, setSchools] = useState([
    { 
      id: '1', 
      name: 'Онлайн-школа "Прогресс"', 
      createdAt: new Date('2024-01-15'),
      adminName: 'Владелец Прогресса',
      adminEmail: 'admin@progress.com'
    },
    { 
      id: '2', 
      name: 'Академия цифровых навыков', 
      createdAt: new Date('2024-03-20'),
      adminName: 'Директор Академии',
      adminEmail: 'admin@academy.com'
    },
    { 
      id: '3', 
      name: 'Школа программирования "Код"', 
      createdAt: new Date('2024-06-10'),
      adminName: 'Главный Код',
      adminEmail: 'admin@code.com'
    },
  ]);

  const [schoolUsers, setSchoolUsers] = useState([
    {
      id: '3',
      name: 'Галина',
      email: 'galina@progress.com',
      role: 'manager' as const,
      createdAt: new Date('2024-02-01'),
    },
    {
      id: '4',
      name: 'Андрей',
      email: 'andrey@progress.com',
      role: 'manager' as const,
      createdAt: new Date('2024-02-15'),
    },
    {
      id: '5',
      name: 'Помощник Админа',
      email: 'assistant@progress.com',
      role: 'assistant' as const,
      createdAt: new Date('2024-03-01'),
    },
  ]);

  // Generate symbols once
  const backgroundSymbols = useMemo(() => {
    const symbols = ['%', '+', '-', '=', '₽', '×'];
    const colors = [
      'text-rose-300/40',
      'text-peach-300/40',
      'text-pink-300/40',
      'text-purple-300/35',
      'text-orange-200/35',
    ];
    
    return Array.from({ length: 30 }, (_, i) => ({
      id: i,
      symbol: symbols[Math.floor(Math.random() * symbols.length)],
      color: colors[Math.floor(Math.random() * colors.length)],
      left: Math.random() * 100,
      top: Math.random() * 100,
      delay: Math.random() * 5,
      duration: 3 + Math.random() * 3,
      fontSize: 12 + Math.random() * 16,
      fontWeight: Math.random() > 0.5 ? 600 : 400,
    }));
  }, []);

  // Получаем список менеджеров
  const managers = Array.from(new Set(clients.map(c => c.manager))).sort();

  // Фильтруем клиентов по менеджеру
  const filteredClients = selectedManager === 'all' 
    ? clients 
    : clients.filter(c => c.manager === selectedManager);

  // Автоматически фильтруем ля менеджеров по их имени
  // Помощник админа и выше видят всех клиентов школы
  const displayedClients = user?.role === 'manager'
    ? clients.filter(c => c.manager === user.name)
    : filteredClients;

  const handleTogglePayment = (clientId: string, paymentIndex: number) => {
    setClients(prevClients =>
      prevClients.map(client => {
        if (client.id === clientId) {
          const updatedPayments = [...client.payments];
          updatedPayments[paymentIndex] = {
            ...updatedPayments[paymentIndex],
            paid: !updatedPayments[paymentIndex].paid
          };
          return { ...client, payments: updatedPayments };
        }
        return client;
      })
    );
  };

  const handlePostponePayment = (clientId: string, paymentIndex: number, newDate: Date, reason: string) => {
    setClients(prevClients =>
      prevClients.map(client => {
        if (client.id === clientId) {
          const payment = client.payments[paymentIndex];
          const updatedPayments = [...client.payments];
          
          updatedPayments[paymentIndex] = {
            ...payment,
            date: newDate,
            originalDate: payment.originalDate || payment.date,
            postponeReason: reason
          };

          const overdueRecord = {
            originalDate: payment.originalDate || payment.date,
            postponedDate: newDate,
            reason,
            amount: payment.amount
          };

          return {
            ...client,
            payments: updatedPayments,
            overdueHistory: [...client.overdueHistory, overdueRecord],
            status: 'unreliable' as const
          };
        }
        return client;
      })
    );
  };

  const handleAddClient = (newClient: Omit<Client, 'id'>) => {
    // Менеджеры могут добавлять только себе клиентов
    const clientToAdd = user?.role === 'manager'
      ? { ...newClient, manager: user.name }
      : newClient;

    const client: Client = {
      ...clientToAdd,
      id: Date.now().toString()
    };
    setClients([...clients, client]);
  };

  const handleEditClient = (updatedClient: Client) => {
    setClients(prevClients =>
      prevClients.map(client =>
        client.id === updatedClient.id ? updatedClient : client
      )
    );
    setEditingClient(null);
  };

  const handlePaymentAmountChange = (clientId: string, paymentIndex: number, newAmount: number) => {
    setClients(prevClients =>
      prevClients.map(client => {
        if (client.id === clientId) {
          const updatedPayments = [...client.payments];
          const oldAmount = updatedPayments[paymentIndex].amount;
          const difference = newAmount - oldAmount;

          updatedPayments[paymentIndex] = {
            ...updatedPayments[paymentIndex],
            amount: newAmount
          };

          const newTotalAmount = client.totalAmount + difference;

          return {
            ...client,
            payments: updatedPayments,
            totalAmount: newTotalAmount
          };
        }
        return client;
      })
    );
  };

  const handleCommentChange = (clientId: string, paymentIndex: number, comment: string) => {
    setClients(prevClients =>
      prevClients.map(client => {
        if (client.id === clientId) {
          const updatedPayments = [...client.payments];
          updatedPayments[paymentIndex] = {
            ...updatedPayments[paymentIndex],
            comment: comment
          };
          return {
            ...client,
            payments: updatedPayments
          };
        }
        return client;
      })
    );
  };

  const handleMonthClick = (month: Date) => {
    setCurrentMonth(month);
    setSelectedView('calendar');
    // Плавный скролл к началу календаря
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
  };

  // Handlers for schools
  const handleAddSchool = (schoolData: { 
    schoolName: string; 
    adminName: string; 
    adminEmail: string; 
    adminPassword: string;
  }) => {
    const newSchool = {
      id: Date.now().toString(),
      name: schoolData.schoolName,
      createdAt: new Date(),
      adminName: schoolData.adminName,
      adminEmail: schoolData.adminEmail,
    };
    
    setSchools([...schools, newSchool]);
  };

  // Handlers for users
  const handleAddUser = (userData: { 
    name: string; 
    email: string; 
    password: string;
    role: 'manager' | 'assistant';
  }) => {
    const newUser = {
      id: Date.now().toString(),
      name: userData.name,
      email: userData.email,
      role: userData.role,
      createdAt: new Date(),
    };
    
    setSchoolUsers([...schoolUsers, newUser]);
  };

  const handleEditUser = (userId: string, userData: {
    name: string;
    email: string;
    password?: string;
    role: 'manager' | 'assistant';
  }) => {
    setSchoolUsers(prevUsers => 
      prevUsers.map(user => 
        user.id === userId 
          ? { ...user, name: userData.name, email: userData.email, role: userData.role }
          : user
      )
    );
    
    toast.success('Данные пользователя успешно обновлены');
  };

  const handleDeleteUser = (userId: string) => {
    setSchoolUsers(prevUsers => prevUsers.filter(user => user.id !== userId));
  };

  // Handlers for time slots
  const handleAddTimeSlot = (slot: Omit<TimeSlot, 'id'>) => {
    const newSlot: TimeSlot = {
      ...slot,
      id: Date.now().toString()
    };
    setTimeSlots([...timeSlots, newSlot]);
    toast.success('Окошко успешно добавлено');
  };

  const handleDeleteTimeSlot = (slotId: string) => {
    setTimeSlots(prevSlots => prevSlots.filter(slot => slot.id !== slotId));
    toast.success('Окошко удалено');
  };

  // Фильтр окошек для менеджера
  const managerTimeSlots = user?.role === 'manager'
    ? timeSlots.filter(slot => slot.managerId === user.id)
    : timeSlots;

  // Проверка прав доступа для добавления клиентов
  // Помощник админа теперь может добавлять клиентов
  const canAddClients = true; // Все роли могут добавлять клиентов

  return (
    <div className="min-h-screen relative">
      {/* Cosmic Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 overflow-hidden -z-10">
        {/* Soft Cosmic Gradient Overlays */}
        <div className="absolute inset-0 opacity-50">
          <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-radial from-purple-200/60 via-indigo-100/40 to-transparent blur-3xl" />
          <div className="absolute bottom-0 left-0 w-[700px] h-[700px] bg-gradient-radial from-blue-200/50 via-purple-100/40 to-transparent blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-radial from-pink-100/30 via-transparent to-transparent blur-3xl" />
        </div>
        
        {/* Financial Symbols */}
        <div className="absolute inset-0">
          {backgroundSymbols.map((item) => (
            <div
              key={item.id}
              className={`absolute animate-twinkle select-none pointer-events-none`}
              style={{
                left: `${item.left}%`,
                top: `${item.top}%`,
                animationDelay: `${item.delay}s`,
                animationDuration: `${item.duration}s`,
                fontSize: `${item.fontSize}px`,
                fontWeight: item.fontWeight,
                color: item.id % 5 === 0 ? 'rgba(59, 130, 246, 0.3)' : 
                       item.id % 5 === 1 ? 'rgba(139, 92, 246, 0.3)' : 
                       item.id % 5 === 2 ? 'rgba(168, 85, 247, 0.3)' :
                       item.id % 5 === 3 ? 'rgba(236, 72, 153, 0.3)' :
                       'rgba(244, 63, 94, 0.25)',
              }}
            >
              {item.symbol}
            </div>
          ))}
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 relative z-10">
        {/* User Info & Logout - Hide on mobile (already in Header) and for managers */}
        {user?.role !== 'manager' && (
          <div className="mb-4 hidden lg:flex justify-end">
            <div className="flex items-center gap-4 bg-white rounded-2xl shadow-3d px-6 py-3">
              <div className="text-right">
                <p className="text-gray-900 text-sm">{user?.name}</p>
                {user?.role !== 'manager' && (
                  <p className="text-gray-500 text-xs">{user?.email}</p>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-xl"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* 3D Floating Header */}
        <div className="mb-6 sm:mb-8 bg-white rounded-3xl shadow-3d p-4 sm:p-6 lg:p-8 transition-all duration-500 hover:shadow-3d-hover hover:-translate-y-1">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 sm:mb-6">
            <div>
              <h2 className="mb-2">
                Управление рассрочками
              </h2>
              <p className="text-gray-600 text-sm sm:text-base">Учет платежей и клиентов онлайн-школы</p>
            </div>
            {canAddClients && (
              <Button 
                onClick={() => setIsAddDialogOpen(true)}
                className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 text-white shadow-3d-cosmic hover:shadow-3d-hover transition-all duration-400 hover:scale-105 hover:-translate-y-1 rounded-2xl px-4 sm:px-6 py-4 sm:py-6 w-full sm:w-auto touch-feedback"
              >
                <Plus className="w-5 h-5 mr-2" />
                Добавить клиента
              </Button>
            )}
          </div>

          {/* Manager Filter - только для не-менеджеров */}
          {user?.role !== 'manager' && (
            <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <Label htmlFor="global-manager-filter" className="whitespace-nowrap text-gray-900 text-sm sm:text-base">
                Менеджер:
              </Label>
              <Select value={selectedManager} onValueChange={setSelectedManager}>
                <SelectTrigger id="global-manager-filter" className="w-full sm:w-64 rounded-2xl border-gray-200 bg-white text-gray-900">
                  <SelectValue placeholder="Выберите менеджера" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все менеджеры</SelectItem>
                  {managers.map(manager => (
                    <SelectItem key={manager} value={manager}>
                      {manager}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedManager !== 'all' && (
                <span className="text-gray-600 text-sm">
                  Показаны данные только по менеджеру: {selectedManager}
                </span>
              )}
            </div>
          )}

          {user?.role === 'manager' && (
            <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-rose-50/50 rounded-2xl border border-rose-100/50">
              <p className="text-gray-600 text-sm sm:text-base flex items-center gap-2">
                <UserIcon className="w-4 h-4 text-gray-600" />
                Вы видите только своих клиентов: <span className="text-gray-900">{user.name}</span>
              </p>
            </div>
          )}

          {/* Tabs Navigation */}
          <div className="border-b border-gray-200">
            <div className="flex gap-1 overflow-x-auto scrollbar-hide -mx-2 px-2">
              <button
                onClick={() => setSelectedView('clients')}
                className={`px-4 sm:px-6 py-2 sm:py-3 rounded-t-2xl transition-all duration-400 relative whitespace-nowrap text-sm sm:text-base ${
                  selectedView === 'clients'
                    ? 'text-gray-900'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                Клиенты
                {selectedView === 'clients' && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full shadow-lg shadow-purple-300/50" />
                )}
              </button>
              <button
                onClick={() => setSelectedView('calendar')}
                className={`px-4 sm:px-6 py-2 sm:py-3 rounded-t-2xl transition-all duration-400 relative whitespace-nowrap text-sm sm:text-base ${
                  selectedView === 'calendar'
                    ? 'text-gray-900'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                Календарь платежей
                {selectedView === 'calendar' && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full shadow-lg shadow-purple-300/50" />
                )}
              </button>
              {user?.role === 'architect' && (
                <>
                  <button
                    onClick={() => setSelectedView('schools')}
                    className={`px-4 sm:px-6 py-2 sm:py-3 rounded-t-2xl transition-all duration-400 relative whitespace-nowrap text-sm sm:text-base ${
                      selectedView === 'schools'
                        ? 'text-gray-900'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    Школы
                    {selectedView === 'schools' && (
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full shadow-lg shadow-purple-300/50" />
                    )}
                  </button>
                </>
              )}
              {(user?.role === 'architect' || user?.role === 'admin' || user?.role === 'assistant') && (
                <button
                  onClick={() => setSelectedView('users')}
                  className={`px-4 sm:px-6 py-2 sm:py-3 rounded-t-2xl transition-all duration-400 relative whitespace-nowrap text-sm sm:text-base ${
                    selectedView === 'users'
                      ? 'text-gray-900'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  Пользователи
                  {selectedView === 'users' && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full shadow-lg shadow-purple-300/50" />
                  )}
                </button>
              )}
              {user?.role === 'manager' && (
                <button
                  onClick={() => setSelectedView('timeslots')}
                  className={`px-4 sm:px-6 py-2 sm:py-3 rounded-t-2xl transition-all duration-400 relative whitespace-nowrap text-sm sm:text-base ${
                    selectedView === 'timeslots'
                      ? 'text-gray-900'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  Окошки
                  {selectedView === 'timeslots' && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full shadow-lg shadow-purple-300/50" />
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        {selectedView === 'clients' ? (
          <div className="space-y-6">
            <MonthlyOverview clients={displayedClients} />
            <StatusLegend />
            <ClientList 
              clients={displayedClients} 
              onTogglePayment={handleTogglePayment}
              onPostponePayment={handlePostponePayment}
              onEditClient={setEditingClient}
              onPaymentAmountChange={handlePaymentAmountChange}
            />
          </div>
        ) : selectedView === 'calendar' ? (
          <div className="space-y-6">
            <PaymentCalendar 
              clients={displayedClients}
              currentMonth={currentMonth}
              onMonthChange={setCurrentMonth}
              onTogglePayment={handleTogglePayment}
              onPostponePayment={handlePostponePayment}
              onPaymentAmountChange={handlePaymentAmountChange}
              onCommentChange={handleCommentChange}
            />
            <YearlyOverview clients={displayedClients} onMonthClick={handleMonthClick} />
          </div>
        ) : selectedView === 'schools' ? (
          <SchoolManagement
            schools={schools}
            onAddSchool={handleAddSchool}
          />
        ) : selectedView === 'users' ? (
          <UserManagement
            users={schoolUsers.filter((member) => member.role === 'manager')}
            canManageAdministrators={false}
            onAddUser={(member) => handleAddUser({ ...member, role: 'manager' })}
            onEditUser={(memberId, member) => handleEditUser(memberId, { ...member, role: 'manager' })}
            onDeleteUser={handleDeleteUser}
          />
        ) : (
          <ManagerTimeSlots
            managerId={user?.id || ''}
            managerName={user?.name || ''}
            schoolId="1"
            slots={managerTimeSlots}
            onAddSlot={handleAddTimeSlot}
            onDeleteSlot={handleDeleteTimeSlot}
          />
        )}
      </div>

      {canAddClients && (
        <AddClientDialog
          open={isAddDialogOpen}
          onOpenChange={setIsAddDialogOpen}
          onAddClient={handleAddClient}
          existingManagers={managers}
          isManager={user?.role === 'manager'}
          managerName={user?.name}
        />
      )}

      {editingClient && (
        <EditClientDialog
          client={editingClient}
          onSave={handleEditClient}
          onClose={() => setEditingClient(null)}
          existingManagers={managers}
        />
      )}
    </div>
  );
}
