import { useState, useEffect, useMemo } from 'react';
import { Client, Meeting, TimeSlot, Tariff, PaymentMethod } from '../types';
import { MeetingClientList } from './MeetingClientList';
import { MeetingsCalendar } from './MeetingsCalendar';
import { DayDetailsDialog } from './DayDetailsDialog';
import { CompactTimeSlots } from './CompactTimeSlots';
import { AssistantTimeSlotSelector } from './AssistantTimeSlotSelector';
import { ManagerMeetingsList } from './ManagerMeetingsList';
import { MeetingResultDialog } from './MeetingResultDialog';
import { RescheduleMeetingDialog } from './RescheduleMeetingDialog';
import { MeetingsAnalytics } from './MeetingsAnalytics';
import { NotificationsPanel } from './NotificationsPanel';
import { UserProfileSettings } from './UserProfileSettings';
import { SearchAndFilter } from './SearchAndFilter';
import { AddMeetingClientDialog } from './AddMeetingClientDialog';
import { EditMeetingClientDialog } from './EditMeetingClientDialog';
import { AddTimeSlotDialog } from './AddTimeSlotDialog';
import { UserManagement } from './UserManagement';
import { SchoolsDirectory } from './SchoolsDirectory';
import { Header } from './Header';
import { Button } from './ui/button';
import { Plus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { exportToCSV, exportAnalyticsToCSV } from '../utils/exportData';
import { apiService } from '../services/api';

function toLocalDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (typeof value === 'string') {
    const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (dateOnly) return new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]));
    return new Date(value);
  }
  return new Date();
}

// API JSON содержит даты строками, а интерфейс приложения работает с Date.
// Приводим их на границе данных, чтобы вкладки не падали при сортировке/форматировании.
function normalizeMeeting(meeting: any): Meeting {
  return {
    ...meeting,
    date: toLocalDate(meeting.date),
    originalDate: meeting.originalDate ? toLocalDate(meeting.originalDate) : undefined,
    createdAt: toLocalDate(meeting.createdAt),
    updatedAt: toLocalDate(meeting.updatedAt),
    rescheduleHistory: meeting.rescheduleHistory?.map((item: any) => ({
      ...item,
      oldDate: toLocalDate(item.oldDate),
      newDate: toLocalDate(item.newDate),
      timestamp: toLocalDate(item.timestamp),
    })),
  } as Meeting;
}

function normalizeClient(client: any): Client {
  return {
    ...client,
    createdAt: toLocalDate(client.createdAt),
    updatedAt: toLocalDate(client.updatedAt),
    meeting: client.meeting ? normalizeMeeting(client.meeting) : undefined,
  } as Client;
}

function normalizeTimeSlot(slot: any): TimeSlot {
  return {
    ...slot,
    date: toLocalDate(slot.date),
  } as TimeSlot;
}

type TelegramStatus = {
  configured: boolean;
  connected: boolean;
  connectedAt?: string;
  botUsername?: string;
};

type DashboardView = 'clients' | 'calendar' | 'timeslots' | 'assistant' | 'meetings' | 'analytics' | 'users';
type TeamRole = 'manager' | 'admin' | 'super_admin' | 'architect';
type TeamMember = { id: string; name: string; email: string; role: TeamRole; createdAt: Date };

function initialDashboardView(): DashboardView {
  if (typeof window === 'undefined') return 'clients';
  const requestedView = new URLSearchParams(window.location.search).get('tab');
  const views: DashboardView[] = ['clients', 'calendar', 'timeslots', 'assistant', 'meetings', 'analytics', 'users'];
  return views.includes(requestedView as DashboardView) ? requestedView as DashboardView : 'clients';
}

export function MeetingsDashboard() {
  const { user, school, schools, isSchoolsDirectory, selectSchool, createSchool, updateSchool, updateProfile } = useAuth();
  const canManageUsers = user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'architect';
  const canDeleteClients = user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'architect';
  
  const [clients, setClients] = useState<Client[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  
  // UI State
  const [selectedView, setSelectedView] = useState<DashboardView>(initialDashboardView);
  const tabClassName = (view: typeof selectedView) =>
    `meeting-nav-tab ${
      selectedView === view ? 'is-active' : ''
    }`;
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [isAddSlotDialogOpen, setIsAddSlotDialogOpen] = useState(false);
  
  const [selectedManagerIdForSlots, setSelectedManagerIdForSlots] = useState<string>('');
  
  const [meetingResultDialog, setMeetingResultDialog] = useState<{
    meeting: Meeting | null;
    mode: 'completed' | 'with_sale';
  }>({ meeting: null, mode: 'completed' });
  const [reschedulingMeeting, setReschedulingMeeting] = useState<Meeting | null>(null);
  const [openedTimeSlotMeeting, setOpenedTimeSlotMeeting] = useState<Meeting | null>(null);
  
  const [isNotificationsPanelOpen, setIsNotificationsPanelOpen] = useState(false);
  const [isSettingsPanelOpen, setIsSettingsPanelOpen] = useState(false);
  const [telegramStatus, setTelegramStatus] = useState<TelegramStatus | undefined>();

  const [filteredClients, setFilteredClients] = useState<Client[]>([]);

  useEffect(() => {
    if (!school?.id) return;
    
    const loadData = async () => {
      try {
        setDataLoading(true);
        const [clientsRes, meetingsRes, tariffsRes, timeSlotsRes, membersRes] = await Promise.all([
          apiService.getClients(school.id),
          apiService.getMeetings(school.id),
          apiService.getTariffs(school.id),
          apiService.getTimeSlots(school.id),
          canManageUsers ? apiService.getSchoolMembers(school.id) : Promise.resolve({ members: [] }),
        ]);
        setClients((clientsRes.clients || []).map(normalizeClient));
        setMeetings((meetingsRes.meetings || []).map(normalizeMeeting));
        setTariffs(tariffsRes.tariffs || []);
        setTimeSlots((timeSlotsRes.timeSlots || []).map(normalizeTimeSlot));
        setTeamMembers((membersRes.members || [])
          .filter((member: any) => ['manager', 'admin', 'super_admin', 'architect'].includes(member.role))
          .map((member: any) => ({ ...member, createdAt: toLocalDate(member.createdAt) } as TeamMember)));
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('Не удалось загрузить данные');
      } finally {
        setDataLoading(false);
      }
    };
    
    loadData();
  }, [school?.id, canManageUsers]);

  const refreshTelegramStatus = async () => {
    if (user?.role !== 'manager' && user?.role !== 'admin' && user?.role !== 'super_admin' && user?.role !== 'architect') return;
    const result = await apiService.getTelegramStatus();
    setTelegramStatus(result.telegram);
    return result.telegram;
  };

  useEffect(() => {
    if (user?.role !== 'manager' && user?.role !== 'admin' && user?.role !== 'super_admin' && user?.role !== 'architect') {
      setTelegramStatus(undefined);
      return;
    }
    refreshTelegramStatus().catch(() => setTelegramStatus({ configured: false, connected: false }));
  }, [user?.id, user?.role]);

  useEffect(() => {
    setFilteredClients(clients);
  }, [clients]);

  const handleSaveSettings = async (settings: { name: string; email: string }) => {
    await updateProfile({ name: settings.name.trim(), email: settings.email.trim() });
  };

  const handleConnectTelegram = async () => {
    const telegramWindow = window.open('', '_blank');
    try {
      const result = await apiService.createTelegramConnectUrl();
      if (telegramWindow) {
        telegramWindow.opener = null;
        telegramWindow.location.href = result.url;
      } else {
        window.open(result.url, '_blank', 'noopener,noreferrer');
      }
      toast.message('Откройте бота, нажмите Start и затем вернитесь сюда для проверки.');
    } catch (cause) {
      telegramWindow?.close();
      throw cause;
    }
  };

  const handleRefreshTelegram = async () => {
    const status = await refreshTelegramStatus();
    if (status?.connected) toast.success('Telegram подключён');
  };

  const handleDisconnectTelegram = async () => {
    await apiService.disconnectTelegram();
    setTelegramStatus((current) => current ? { ...current, connected: false, connectedAt: undefined } : current);
  };

  const handleAddClient = async (clientData: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>) => {
    const tempId = Date.now().toString();
    const newClient: Client = {
      ...clientData,
      id: tempId,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    setClients([...clients, newClient]);
    toast.success(`Клиент ${newClient.firstName} ${newClient.lastName} добавлен`);

    const openTimeSelection = (clientId: string) => {
      setSelectedView('assistant');
      window.setTimeout(() => {
        window.dispatchEvent(new CustomEvent('selectClientForAssistant', { detail: { clientId } }));
      }, 100);
    };

    if (school?.id) {
      try {
        const res = await apiService.createClient(school.id, clientData);
        if (res.client) {
          setClients(prev => prev.map(c => c.id === tempId ? normalizeClient({ ...c, ...res.client }) : c));
          openTimeSelection(res.client.id);
        } else {
          openTimeSelection(tempId);
        }
      } catch (error) {
        console.error('Error creating client:', error);
        toast.error('Ошибка сохранения клиента');
      }
    } else {
      openTimeSelection(tempId);
    }
  };

  const handleEditClient = async (clientId: string, data: Partial<Client>) => {
    setClients(prevClients =>
      prevClients.map(client =>
        client.id === clientId
          ? { ...client, ...data }
          : client
      )
    );
    toast.success('Данные клиента обновлены');

    if (school?.id) {
      try {
        const res = await apiService.updateClient(school.id, clientId, data);
        if (res.client) {
          setClients(prev => prev.map(client =>
            client.id === clientId ? normalizeClient({ ...client, ...res.client }) : client
          ));
        }
      } catch (error) {
        console.error('Error updating client:', error);
        toast.error('Ошибка обновления клиента');
      }
    }
  };

  const handleToggleFormCompleted = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    if (!client) return;

    const newFormCompleted = !client.formCompleted;
    let newStatus = client.status;
    
    if (newFormCompleted && client.status === 'scheduled') {
      newStatus = 'ready';
    } else if (!newFormCompleted && client.status === 'ready') {
      newStatus = 'scheduled';
    }

    setClients(prevClients =>
      prevClients.map(c =>
        c.id === clientId
          ? { ...c, formCompleted: newFormCompleted, status: newStatus, updatedAt: new Date() }
          : c
      )
    );
    
    setMeetings(prevMeetings =>
      prevMeetings.map(meeting => {
        if (meeting.clientId === clientId) {
          const meetingDate = new Date(meeting.date);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          meetingDate.setHours(0, 0, 0, 0);
          
          if (meetingDate >= today && (meeting.status === 'scheduled' || meeting.status === 'scheduled_ready')) {
            const meetingNewStatus = newFormCompleted ? 'scheduled_ready' : 'scheduled';
            return { ...meeting, status: meetingNewStatus, updatedAt: new Date() };
          }
        }
        return meeting;
      })
    );

    if (school?.id) {
      apiService.updateClient(school.id, clientId, { formCompleted: newFormCompleted, status: newStatus }).catch(error => {
        console.error('Error updating form completed:', error);
        toast.error('Ошибка обновления статуса анкеты');
      });
    }
  };

  const handleAddTimeSlot = async (slot: Omit<TimeSlot, 'id'>) => {
    const tempId = Date.now().toString();
    const newSlot: TimeSlot = {
      ...slot,
      id: tempId
    };
    setTimeSlots([...timeSlots, newSlot]);
    toast.success('Окошко успешно добавлено');

    if (school?.id) {
      try {
        const res = await apiService.createTimeSlot(school.id, slot);
        if (res.timeSlot) {
          setTimeSlots(prev => prev.map(s => s.id === tempId ? normalizeTimeSlot({ ...s, ...res.timeSlot }) : s));
        }
      } catch (error) {
        console.error('Error creating time slot:', error);
        setTimeSlots(prev => prev.filter(item => item.id !== tempId));
        toast.error('Ошибка сохранения окошка');
      }
    }
  };

  const handleDeleteTimeSlot = async (slotId: string) => {
    const removedIndex = timeSlots.findIndex(slot => slot.id === slotId);
    const removedSlot = removedIndex >= 0 ? timeSlots[removedIndex] : undefined;
    setTimeSlots(prevSlots => prevSlots.filter(slot => slot.id !== slotId));
    toast.success('Окошко удалено');

    if (school?.id) {
      try {
        await apiService.deleteTimeSlot(school.id, slotId);
      } catch (error) {
        console.error('Error deleting time slot:', error);
        if (removedSlot) {
          setTimeSlots(prevSlots => {
            if (prevSlots.some(slot => slot.id === removedSlot.id)) return prevSlots;
            const restored = [...prevSlots];
            restored.splice(Math.max(0, removedIndex), 0, removedSlot);
            return restored;
          });
        }
        toast.error('Ошибка удаления окошка');
      }
    }
  };

  const handleDeleteClient = async (clientId: string) => {
    if (!school?.id) return;

    try {
      await apiService.deleteClient(school.id, clientId);

      const deletedMeetingIds = new Set(
        meetings
          .filter((meeting) => meeting.clientId === clientId)
          .map((meeting) => meeting.id),
      );

      setClients((current) => current.filter((client) => client.id !== clientId));
      setMeetings((current) => current.filter((meeting) => meeting.clientId !== clientId));
      setTimeSlots((current) => current.map((slot) =>
        slot.bookingId && deletedMeetingIds.has(slot.bookingId)
          ? { ...slot, isBooked: false, bookingId: undefined }
          : slot,
      ));
      setEditingClient((current) => current?.id === clientId ? null : current);
      toast.success('Клиент удалён');
    } catch (error) {
      console.error('Error deleting client:', error);
      toast.error('Не удалось удалить клиента');
    }
  };

  const handleBookSlot = async (clientId: string, slot: TimeSlot) => {
    if (!school?.id) throw new Error('Школа не выбрана');

    const result = await apiService.bookTimeSlot(school.id, clientId, slot.id);
    const createdMeeting = normalizeMeeting(result.meeting);
    const updatedSlot = normalizeTimeSlot(result.timeSlot);
    const updatedClient = normalizeClient(result.client);

    setMeetings(prev => [...prev.filter(meeting => meeting.id !== createdMeeting.id), createdMeeting]);
    setTimeSlots(prev => prev.map(item => item.id === updatedSlot.id ? updatedSlot : item));
    setClients(prev => prev.map(client => client.id === updatedClient.id ? updatedClient : client));
  };

  const handleProvideSlots = (clientId: string, slotIds: string[]) => {
    setClients(prevClients =>
      prevClients.map(client => {
        if (client.id === clientId) {
          return {
            ...client,
            providedSlotIds: slotIds,
            updatedAt: new Date()
          };
        }
        return client;
      })
    );

    if (school?.id) {
      apiService.updateClient(school.id, clientId, { providedSlotIds: slotIds }).catch(error => {
        console.error('Error updating provided slots:', error);
        toast.error('Ошибка сохранения окошек');
      });
    }
  };

  const handleCloseCancelledClientTimeSelection = (clientId: string) => {
    const client = clients.find((item) => item.id === clientId);
    if (!client || client.status !== 'cancelled') return;

    setClients((current) => current.map((item) =>
      item.id === clientId
        ? { ...item, timeSelectionClosed: true, updatedAt: new Date() }
        : item,
    ));

    if (school?.id) {
      apiService.updateClient(school.id, clientId, { timeSelectionClosed: true }).catch((error) => {
        console.error('Error closing cancelled client time selection:', error);
        setClients((current) => current.map((item) =>
          item.id === clientId ? { ...item, timeSelectionClosed: false } : item,
        ));
        toast.error('Не удалось закрыть подбор времени');
      });
    }
  };

  // Обработчики для управления встречами менеджером
  const handleMarkMeetingCompleted = (meeting: Meeting) => {
    setMeetingResultDialog({ meeting, mode: 'completed' });
  };

  const handleMarkMeetingWithSale = (meeting: Meeting) => {
    setMeetingResultDialog({ meeting, mode: 'with_sale' });
  };

  const persistMeetingStatus = async (meetingId: string, data: Record<string, unknown>) => {
    if (!school?.id) return;
    try {
      const result = await apiService.updateMeeting(school.id, meetingId, data);
      const savedMeeting = normalizeMeeting(result.meeting);
      setMeetings(current => current.map(meeting => meeting.id === meetingId ? savedMeeting : meeting));
      if (result.client) {
        const savedClient = normalizeClient(result.client);
        setClients(current => current.map(client => client.id === savedClient.id
          ? { ...client, ...savedClient, meeting: savedMeeting } : client));
      }
      if (result.timeSlot) {
        const savedSlot = normalizeTimeSlot(result.timeSlot);
        setTimeSlots(current => current.map(slot => slot.id === savedSlot.id ? savedSlot : slot));
      }
    } catch (cause) {
      console.error('Error updating meeting status:', cause);
      toast.error('Не удалось сохранить статус встречи. Обновите страницу');
    }
  };

  const handleCancelMeeting = (meeting: Meeting) => {
    setMeetings(prevMeetings =>
      prevMeetings.map(m =>
        m.id === meeting.id
          ? { ...m, status: 'cancelled' as const, updatedAt: new Date() }
          : m
      )
    );

    setClients(prevClients =>
      prevClients.map(client =>
        client.meeting?.id === meeting.id
          ? {
              ...client,
              status: 'selecting_time' as const,
              meeting: { ...meeting, status: 'cancelled' as const },
              updatedAt: new Date()
            }
          : client
      )
    );

    setTimeSlots(prevSlots =>
      prevSlots.map(slot =>
        slot.bookingId === meeting.id
          ? { ...slot, isBooked: false, bookingId: undefined }
          : slot
      )
    );

    toast.success('Встреча отменена');

    void persistMeetingStatus(meeting.id, { status: 'cancelled' });
  };

  const handleSaveMeetingResult = (
    meetingId: string,
    result: {
      status: 'completed' | 'completed_with_sale';
      notes?: string;
      soldTariff?: string;
      saleAmount?: number;
      paymentMethod?: PaymentMethod;
    }
  ) => {
    const resultMeeting = meetings.find(meeting => meeting.id === meetingId);
    setMeetings(prevMeetings =>
      prevMeetings.map(m =>
        m.id === meetingId
          ? { ...m, ...result, updatedAt: new Date() }
          : m
      )
    );

    setClients(prevClients =>
      prevClients.map(client =>
        client.id === resultMeeting?.clientId
          ? {
              ...client,
              meeting: resultMeeting ? { ...resultMeeting, ...result, updatedAt: new Date() } : client.meeting,
              status: result.status === 'completed_with_sale' ? 'completed_with_sale' : 'completed',
              updatedAt: new Date()
            }
          : client
      )
    );

    toast.success(
      result.status === 'completed_with_sale' 
        ? 'Отлично! Встреча с продажей отмечена' 
        : 'Встреча отмечена как проведенная'
    );

    void persistMeetingStatus(meetingId, result);
  };

  const handleMarkSale = (clientId: string, soldTariff: string, saleAmount: number) => {
    const client = clients.find(c => c.id === clientId);
    const saleMeeting = meetings
      .filter(meeting => meeting.clientId === clientId && meeting.status === 'completed')
      .sort((a, b) => b.date.getTime() - a.date.getTime())[0];
    if (!client || !saleMeeting) return;

    const meetingId = saleMeeting.id;

    setMeetings(prevMeetings =>
      prevMeetings.map(m =>
        m.id === meetingId
          ? { ...m, status: 'completed_with_sale' as const, soldTariff, saleAmount, updatedAt: new Date() }
          : m
      )
    );

    setClients(prevClients =>
      prevClients.map(c =>
        c.id === clientId
          ? {
              ...c,
              status: 'completed_with_sale' as const,
              meeting: { ...saleMeeting, status: 'completed_with_sale' as const, soldTariff, saleAmount, updatedAt: new Date() },
              updatedAt: new Date()
            }
          : c
      )
    );

    toast.success(`Продажа ${soldTariff} на сумму ${saleAmount.toLocaleString('ru-RU')} руб. отмечена!`);

    void persistMeetingStatus(meetingId, { status: 'completed_with_sale', soldTariff, saleAmount });
  };

  const handleTogglePin = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    const newPinned = client ? !client.pinned : true;

    setClients(prevClients =>
      prevClients.map(c =>
        c.id === clientId
          ? { ...c, pinned: newPinned, updatedAt: new Date() }
          : c
      )
    );

    if (client) {
      toast.success(client.pinned ? 'Клиент откреплен' : 'Клиент закреплен');
    }

    if (school?.id) {
      apiService.updateClient(school.id, clientId, { pinned: newPinned }).catch(error => {
        console.error('Error toggling pin:', error);
      });
    }
  };

  const handleRescheduleMeeting = async (meetingId: string, newSlot: TimeSlot, reason: string) => {
    if (!school?.id) throw new Error('Школа не выбрана');
    const previous = meetings.find((meeting) => meeting.id === meetingId);
    if (!previous) throw new Error('Встреча не найдена. Обновите календарь');

    const result = await apiService.rescheduleMeeting(school.id, meetingId, newSlot.id, reason);
    const oldMeeting = normalizeMeeting(result.previousMeeting);
    const replacement = normalizeMeeting(result.meeting);
    const oldTimeSlot = normalizeTimeSlot(result.oldTimeSlot);
    const bookedTimeSlot = normalizeTimeSlot(result.timeSlot);
    const updatedClient = normalizeClient(result.client);

    setMeetings((current) => [
      ...current.filter((meeting) => meeting.id !== replacement.id).map((meeting) =>
        meeting.id === meetingId ? oldMeeting : meeting),
      replacement,
    ]);
    setTimeSlots((current) => current.map((slot) =>
      slot.id === oldTimeSlot.id ? oldTimeSlot
        : slot.id === bookedTimeSlot.id ? bookedTimeSlot : slot));
    setClients((current) => current.map((client) =>
      client.id === updatedClient.id
        ? { ...client, ...updatedClient, meeting: replacement }
        : client));

    toast.success(previous.managerId !== replacement.managerId
      ? `Встреча перенесена к менеджеру ${replacement.managerName}`
      : 'Встреча успешно перенесена');
  };

  const handleCalendarStatusChange = (
    meetingId: string, 
    newStatus: 'completed' | 'completed_with_sale' | 'cancelled',
    soldTariff?: string,
    saleAmount?: number,
    paymentMethod?: PaymentMethod
  ) => {
    setMeetings(prevMeetings =>
      prevMeetings.map(m =>
        m.id === meetingId
          ? { 
              ...m, 
              status: newStatus, 
              soldTariff, 
              saleAmount,
              paymentMethod,
              updatedAt: new Date() 
            }
          : m
      )
    );

    const meeting = meetings.find(m => m.id === meetingId);
    if (meeting) {
      const newClientStatus = 
        newStatus === 'completed_with_sale' ? 'completed_with_sale' :
        newStatus === 'completed' ? 'completed' :
        'cancelled';
      
      setClients(prevClients =>
        prevClients.map(c =>
          c.id === meeting.clientId
            ? {
                ...c,
                status: newClientStatus,
                meeting: c.meeting?.id === meetingId
                  ? { ...c.meeting, status: newStatus, soldTariff, saleAmount, paymentMethod, updatedAt: new Date() }
                  : c.meeting,
                updatedAt: new Date(),
              }
            : c
        )
      );

      toast.success(
        newStatus === 'completed_with_sale' ? 'Встреча отмечена с продажей!' :
        newStatus === 'completed' ? 'Встреча отмечена как проведенная' :
        'Встреча отменена'
      );

      void persistMeetingStatus(meetingId, { status: newStatus, soldTariff, saleAmount, paymentMethod });
    }
  };

  const handleUpdateNotes = (meetingId: string, notes: string) => {
    setMeetings(prevMeetings =>
      prevMeetings.map(m =>
        m.id === meetingId
          ? { ...m, notes, updatedAt: new Date() }
          : m
      )
    );
    
    setClients(prevClients =>
      prevClients.map(client =>
        client.meeting?.id === meetingId
          ? { 
              ...client, 
              meeting: { ...client.meeting, notes, updatedAt: new Date() },
              updatedAt: new Date() 
            }
          : client
      )
    );
    
    toast.success('Заметка сохранена');

    if (school?.id) {
      apiService.updateMeeting(school.id, meetingId, { notes }).catch(error => {
        console.error('Error updating notes:', error);
        toast.error('Ошибка сохранения заметки');
      });
    }
  };

  const handleAddTariff = async (tariffData: Omit<Tariff, 'id'>) => {
    const tempId = Date.now().toString();
    const newTariff: Tariff = {
      ...tariffData,
      id: tempId
    };
    setTariffs([...tariffs, newTariff]);

    if (school?.id) {
      try {
        const res = await apiService.createTariff(school.id, tariffData);
        if (res.tariff) {
          setTariffs(prev => prev.map(t => t.id === tempId ? { ...t, ...res.tariff } : t));
        }
      } catch (error) {
        console.error('Error creating tariff:', error);
        toast.error('Ошибка создания тарифа');
      }
    }
  };

  const handleEditTariff = (id: string, tariffData: Partial<Tariff>) => {
    setTariffs(prevTariffs =>
      prevTariffs.map(t => t.id === id ? { ...t, ...tariffData } : t)
    );

    if (school?.id) {
      apiService.updateTariff(school.id, id, tariffData).catch(error => {
        console.error('Error updating tariff:', error);
        toast.error('Ошибка обновления тарифа');
      });
    }
  };

  const handleDeleteTariff = (id: string) => {
    setTariffs(prevTariffs => prevTariffs.filter(t => t.id !== id));
  };

  const handleToggleTariffActive = (id: string) => {
    const tariff = tariffs.find(t => t.id === id);
    const newIsActive = tariff ? !tariff.isActive : true;

    setTariffs(prevTariffs =>
      prevTariffs.map(t => t.id === id ? { ...t, isActive: newIsActive } : t)
    );

    if (school?.id) {
      apiService.updateTariff(school.id, id, { isActive: newIsActive }).catch(error => {
        console.error('Error toggling tariff active:', error);
        toast.error('Ошибка обновления тарифа');
      });
    }
  };

  const handleAddManager = async (member: { name: string; email: string; password: string; role: 'manager' | 'admin' | 'super_admin' }) => {
    if (!school?.id) return;
    try {
      const result = await apiService.createUser({ ...member, schoolId: school.id });
      setTeamMembers((current) => [...current, {
        ...result.user,
        role: result.user.role as TeamRole,
        createdAt: toLocalDate(result.user.createdAt),
      }]);
      const roleLabel = member.role === 'super_admin' ? 'Супер-администратор' : member.role === 'admin' ? 'Администратор' : 'Менеджер';
      toast.success(`${roleLabel} ${member.name} добавлен`);
    } catch (cause) {
      console.error('Error creating manager:', cause);
      toast.error(cause instanceof Error ? cause.message : 'Не удалось добавить сотрудника');
    }
  };

  const handleEditManager = async (managerId: string, member: { name: string; email: string; password?: string; role?: 'manager' | 'admin' | 'super_admin' }) => {
    if (!school?.id) return;
    try {
      const result = await apiService.updateUser(school.id, managerId, member);
      setTeamMembers((current) => current.map((item) => item.id === managerId
        ? { ...item, ...result.user, role: result.user.role as TeamRole, createdAt: toLocalDate(result.user.createdAt ?? item.createdAt) }
        : item));
      toast.success('Данные сотрудника обновлены');
    } catch (cause) {
      console.error('Error updating manager:', cause);
      toast.error(cause instanceof Error ? cause.message : 'Не удалось обновить сотрудника');
    }
  };

  const handleDeleteManager = async (memberId: string) => {
    if (!school?.id) return;
    try {
      await apiService.deleteUser(school.id, memberId);
      setTeamMembers((current) => current.filter((member) => member.id !== memberId));
      toast.success('Доступ сотрудника отключён');
    } catch (cause) {
      console.error('Error deleting manager:', cause);
      toast.error(cause instanceof Error ? cause.message : 'Не удалось удалить сотрудника');
    }
  };

  // Фильтр встреч для менеджера
  const managerMeetings = user?.role === 'manager'
    ? meetings.filter(meeting => meeting.managerId === user.id)
    : meetings;

  // Фильтр окошек для менеджера
  const managerTimeSlots = user?.role === 'manager'
    ? timeSlots.filter(slot => slot.managerId === user.id)
    : timeSlots;

  // Фильтр клиентов для менеджера
  const displayedClients = clients;

  const displayedMeetings = user?.role === 'manager'
    ? meetings.filter(meeting => meeting.managerId === user.id)
    : meetings;

  const slotBookingStates = useMemo(() => {
    const clientById = new Map(clients.map(client => [client.id, client]));
    return meetings.reduce<Record<string, { meetingStatus: Meeting['status']; formCompleted: boolean }>>((states, meeting) => {
      states[meeting.id] = {
        meetingStatus: meeting.status,
        formCompleted: clientById.get(meeting.clientId)?.formCompleted ?? false,
      };
      return states;
    }, {});
  }, [clients, meetings]);

  if (isSchoolsDirectory) {
    return (
      <div className="meeting-app min-h-screen relative">
        <Header />
        <main className="relative z-10 container mx-auto max-w-7xl px-4 py-6 sm:py-8">
          <SchoolsDirectory
            schools={schools}
            onOpenSchool={selectSchool}
            onCreateSchool={createSchool}
            onUpdateSchool={updateSchool}
          />
        </main>
      </div>
    );
  }

  if (dataLoading) {
    return (
      <div className="meeting-app min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-[#6f2e89] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600 mt-4">Загрузка данных...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="meeting-app min-h-screen relative">
      {/* Header с уведомлениями */}
      <Header 
        onOpenNotifications={() => setIsNotificationsPanelOpen(true)}
        onOpenSettings={() => setIsSettingsPanelOpen(true)}
        unreadNotificationsCount={3} // Будет подсчитываться динамически
      />
      
      <div className="meeting-dashboard-shell relative z-10 container mx-auto px-4 py-6 sm:py-8 max-w-7xl">
        <div className="meeting-dashboard-toolbar meeting-toolbar mb-6 sm:mb-8 rounded-3xl p-4 sm:p-6 lg:p-8 transition-shadow duration-300">
          <div className="meeting-dashboard-title-row flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 sm:mb-6">
            <div>
              <h1 className="mb-2">
                Календарь встреч
              </h1>
              <p className="text-gray-600 text-sm sm:text-base">
                Управление клиентами и записями на встречи
              </p>
            </div>
            {user?.role === 'manager' && selectedView !== 'clients' ? (
              <Button 
                onClick={() => setIsAddSlotDialogOpen(true)}
                className="brand-primary-button rounded-xl px-4 sm:px-6 py-4 sm:py-6 w-full sm:w-auto touch-feedback"
              >
                <Plus className="w-5 h-5 mr-2" />
                Добавить окошко
              </Button>
            ) : (
              <Button 
                onClick={() => setIsAddDialogOpen(true)}
                className="brand-primary-button rounded-xl px-4 sm:px-6 py-4 sm:py-6 w-full sm:w-auto touch-feedback"
              >
                <Plus className="w-5 h-5 mr-2" />
                Добавить клиента
              </Button>
            )}
          </div>

          {/* Manager Info Banner */}
          {user?.role === 'manager' && (
            <div className="mb-4 p-3 sm:p-4 bg-[#f7f0f8] rounded-xl border border-[#eaddec]">
              <p className="text-gray-600 text-sm sm:text-base">
                Вы видите только своих клиентов и встречи
              </p>
            </div>
          )}

          {/* Tabs Navigation */}
          <nav className="meeting-nav" aria-label="Разделы календаря встреч">
            <div className="meeting-nav-list">
              {/* Клиенты */}
              <button
                type="button"
                onClick={() => setSelectedView('clients')}
                className={tabClassName('clients')}
                aria-current={selectedView === 'clients' ? 'page' : undefined}
              >
                Клиенты
              </button>
              
              <button
                type="button"
                onClick={() => setSelectedView('calendar')}
                className={tabClassName('calendar')}
                aria-current={selectedView === 'calendar' ? 'page' : undefined}
              >
                Календарь встреч
              </button>

              {user?.role === 'manager' && (
                <button
                  type="button"
                  onClick={() => setSelectedView('timeslots')}
                  className={tabClassName('timeslots')}
                  aria-current={selectedView === 'timeslots' ? 'page' : undefined}
                >
                  Мои окошки
                </button>
              )}

              {user?.role !== 'manager' && (
                <button
                  type="button"
                  onClick={() => setSelectedView('timeslots')}
                  className={tabClassName('timeslots')}
                  aria-current={selectedView === 'timeslots' ? 'page' : undefined}
                >
                  Окошки на неделю
                </button>
              )}

              {/* Подбор времени */}
              <button
                type="button"
                onClick={() => setSelectedView('assistant')}
                className={tabClassName('assistant')}
                aria-current={selectedView === 'assistant' ? 'page' : undefined}
              >
                Подбор времени
              </button>

              {/* Аналитика - для архитектора и админа */}
              {(user?.role === 'architect' || user?.role === 'super_admin' || user?.role === 'admin') && (
                <button
                  type="button"
                  onClick={() => setSelectedView('analytics')}
                  className={tabClassName('analytics')}
                  aria-current={selectedView === 'analytics' ? 'page' : undefined}
                >
                  Аналитика
                </button>
              )}

              {canManageUsers && (
                <button
                  type="button"
                  onClick={() => setSelectedView('users')}
                  className={tabClassName('users')}
                  aria-current={selectedView === 'users' ? 'page' : undefined}
                >
                  Менеджеры
                </button>
              )}

            </div>
          </nav>
        </div>

        {/* Main Content */}
        {selectedView === 'clients' ? (
          <MeetingClientList
            clients={displayedClients}
            meetings={meetings}
            onEdit={(client) => setEditingClient(client)}
            onToggleFormCompleted={handleToggleFormCompleted}
            onRescheduleMeeting={setReschedulingMeeting}
            onCancelMeeting={(meeting) => handleCalendarStatusChange(meeting.id, 'cancelled')}
            onMarkSale={handleMarkSale}
            onTogglePin={handleTogglePin}
            onSelectTimeForClient={(clientId) => {
              setSelectedView('assistant');
              // Небольшая задержка для переключения вида перед открытием компонента
              setTimeout(() => {
                // Компонент AssistantTimeSlotSelector автоматически откроется с выбранным клиентом
                const event = new CustomEvent('selectClientForAssistant', { detail: { clientId } });
                window.dispatchEvent(event);
              }, 100);
            }}
            onDeleteClient={canDeleteClients ? handleDeleteClient : undefined}
          />
        ) : selectedView === 'calendar' ? (
          <MeetingsCalendar
            meetings={displayedMeetings}
            clients={displayedClients}
            onStatusChange={handleCalendarStatusChange}
            onUpdateNotes={handleUpdateNotes}
            onRescheduleMeeting={setReschedulingMeeting}
            availableTariffs={tariffs}
          />
        ) : selectedView === 'timeslots' ? (
          <CompactTimeSlots
            slots={user?.role === 'manager' ? managerTimeSlots : timeSlots}
            slotOwners={teamMembers}
            bookingStates={slotBookingStates}
            onAddSlot={handleAddTimeSlot}
            onDeleteSlot={handleDeleteTimeSlot}
            onOpenBookedSlot={(bookingId) => {
              const meeting = displayedMeetings.find(item => item.id === bookingId);
              if (meeting) setOpenedTimeSlotMeeting(meeting);
              else toast.error('Не удалось найти данные встречи');
            }}
            schoolId={school?.id || ''}
          />
        ) : selectedView === 'meetings' ? (
          <ManagerMeetingsList
            meetings={managerMeetings}
            clients={clients}
            onMarkCompleted={handleMarkMeetingCompleted}
            onMarkWithSale={handleMarkMeetingWithSale}
            onCancel={handleCancelMeeting}
            onReschedule={setReschedulingMeeting}
          />
        ) : selectedView === 'analytics' ? (
          <MeetingsAnalytics
            meetings={meetings}
            clients={clients}
          />
        ) : selectedView === 'users' && canManageUsers ? (
          <UserManagement
            users={teamMembers.filter((member): member is TeamMember & { role: 'manager' | 'admin' | 'super_admin' } => member.role === 'manager' || member.role === 'admin' || member.role === 'super_admin')}
            canManageAdministrators={user?.role === 'super_admin' || user?.role === 'architect'}
            canManageSuperAdministrators={user?.role === 'architect'}
            onAddUser={handleAddManager}
            onEditUser={handleEditManager}
            onDeleteUser={handleDeleteManager}
          />
        ) : (
          <AssistantTimeSlotSelector
            clients={clients}
            timeSlots={timeSlots}
            onBookSlot={handleBookSlot}
            onProvideSlots={handleProvideSlots}
            onCloseCancelledClient={handleCloseCancelledClientTimeSelection}
          />
        )}
      </div>

      {/* Dialogs */}
      <AddMeetingClientDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onAddClient={handleAddClient}
        schoolId={school?.id || ''}
        existingClients={clients}
        onOpenExistingClient={(client) => setEditingClient(client)}
      />

      <EditMeetingClientDialog
        client={editingClient}
        open={!!editingClient}
        onOpenChange={(open) => !open && setEditingClient(null)}
        onSave={handleEditClient}
        meetings={meetings}
        onRescheduleMeeting={(meeting) => {
          setEditingClient(null);
          setReschedulingMeeting(meeting);
        }}
        onCancelMeeting={(meeting) => handleCalendarStatusChange(meeting.id, 'cancelled')}
      />

      <AddTimeSlotDialog
        open={isAddSlotDialogOpen}
        onOpenChange={setIsAddSlotDialogOpen}
        onAddSlot={handleAddTimeSlot}
        schoolId={school?.id || ''}
        allSlots={timeSlots}
      />

      <MeetingResultDialog
        open={!!meetingResultDialog.meeting}
        onOpenChange={() => setMeetingResultDialog({ meeting: null, mode: 'completed' })}
        meeting={meetingResultDialog.meeting}
        client={meetingResultDialog.meeting ? clients.find(c => c.id === meetingResultDialog.meeting?.clientId) || null : null}
        mode={meetingResultDialog.mode}
        onSave={handleSaveMeetingResult}
        availableTariffs={tariffs}
      />

      <RescheduleMeetingDialog
        open={!!reschedulingMeeting}
        onOpenChange={() => setReschedulingMeeting(null)}
        meeting={reschedulingMeeting}
        client={reschedulingMeeting ? clients.find(c => c.id === reschedulingMeeting?.clientId) || null : null}
        availableSlots={timeSlots}
        allClients={clients}
        onReschedule={handleRescheduleMeeting}
        onProvideSlots={handleProvideSlots}
      />

      {openedTimeSlotMeeting && (
        <DayDetailsDialog
          day={openedTimeSlotMeeting.date.getDate()}
          month={openedTimeSlotMeeting.date.getMonth()}
          year={openedTimeSlotMeeting.date.getFullYear()}
          meetings={[openedTimeSlotMeeting]}
          clients={displayedClients}
          onClose={() => setOpenedTimeSlotMeeting(null)}
          onStatusChange={handleCalendarStatusChange}
          onUpdateNotes={handleUpdateNotes}
          onRescheduleMeeting={(meeting) => {
            setOpenedTimeSlotMeeting(null);
            setReschedulingMeeting(meeting);
          }}
          availableTariffs={tariffs}
        />
      )}

      {/* Notifications Panel */}
      {isNotificationsPanelOpen && (
        <NotificationsPanel
          meetings={meetings}
          clients={clients}
          currentUserRole={user?.role || 'assistant'}
          onClose={() => setIsNotificationsPanelOpen(false)}
        />
      )}

      {/* Settings Panel */}
      {isSettingsPanelOpen && user && (
        <UserProfileSettings
          user={{ id: user.id, name: user.name, email: user.email || 'user@example.com', role: user.role }}
          onSave={handleSaveSettings}
          onClose={() => setIsSettingsPanelOpen(false)}
          tariffs={tariffs}
          onAddTariff={handleAddTariff}
          onEditTariff={handleEditTariff}
          onDeleteTariff={handleDeleteTariff}
          onToggleTariffActive={handleToggleTariffActive}
          telegram={telegramStatus}
          onConnectTelegram={handleConnectTelegram}
          onRefreshTelegram={handleRefreshTelegram}
          onDisconnectTelegram={handleDisconnectTelegram}
        />
      )}
    </div>
  );
}
