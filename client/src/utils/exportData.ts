import { Client, Meeting } from '../types';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

export function exportToCSV(clients: Client[], meetings: Meeting[], filename: string = 'export') {
  // Создаем CSV для клиентов
  const clientHeaders = [
    'ID',
    'Имя',
    'Фамилия',
    'Username',
    'Статус',
    'Анкета заполнена',
    'Комментарий',
    'Дата создания',
  ];

  const clientRows = clients.map(client => [
    client.id,
    client.firstName,
    client.lastName,
    client.username || '',
    getStatusLabel(client.status),
    client.formCompleted ? 'Да' : 'Нет',
    client.comment || '',
    format(new Date(client.createdAt), 'dd.MM.yyyy HH:mm', { locale: ru }),
  ]);

  const clientCSV = [
    clientHeaders.join(','),
    ...clientRows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ].join('\n');

  // Создаем CSV для встреч
  const meetingHeaders = [
    'ID',
    'Клиент ID',
    'Менеджер',
    'Дата',
    'Время начала',
    'Время конца',
    'Статус',
    'Продан тариф',
    'Сумма продажи',
    'Заметки',
  ];

  const meetingRows = meetings.map(meeting => [
    meeting.id,
    meeting.clientId,
    meeting.managerName,
    format(new Date(meeting.date), 'dd.MM.yyyy', { locale: ru }),
    meeting.startTime,
    meeting.endTime,
    getMeetingStatusLabel(meeting.status),
    meeting.soldTariff || '',
    meeting.saleAmount || '',
    meeting.notes || '',
  ]);

  const meetingCSV = [
    meetingHeaders.join(','),
    ...meetingRows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ].join('\n');

  // Скачиваем файлы
  downloadCSV(clientCSV, `${filename}_clients_${format(new Date(), 'yyyy-MM-dd')}.csv`);
  downloadCSV(meetingCSV, `${filename}_meetings_${format(new Date(), 'yyyy-MM-dd')}.csv`);
}

function downloadCSV(content: string, filename: string) {
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    'selecting_time': 'Подбирает время',
    'scheduled': 'Записан',
    'ready': 'Записан',
  };
  return labels[status] || status;
}

function getMeetingStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    'scheduled': 'Запланирована',
    'completed': 'Проведена',
    'completed_with_sale': 'Проведена с продажей',
    'cancelled': 'Отменена',
    'rescheduled': 'Перенесена',
  };
  return labels[status] || status;
}

export function exportAnalyticsToCSV(
  meetings: Meeting[],
  clients: Client[],
  filename: string = 'analytics'
) {
  const completedMeetings = meetings.filter(m => 
    m.status === 'completed' || m.status === 'completed_with_sale'
  );

  const salesMeetings = meetings.filter(m => m.status === 'completed_with_sale');
  
  const headers = [
    'Метрика',
    'Значение',
  ];

  const rows = [
    ['Всего клиентов', clients.length.toString()],
    ['Всего встреч', meetings.length.toString()],
    ['Запланировано встреч', meetings.filter(m => m.status === 'scheduled').length.toString()],
    ['Проведено встреч', completedMeetings.length.toString()],
    ['Встреч с продажей', salesMeetings.length.toString()],
    ['Конверсия (%)', completedMeetings.length > 0 
      ? Math.round((salesMeetings.length / completedMeetings.length) * 100).toString()
      : '0'],
    ['Общая сумма продаж (₽)', salesMeetings.reduce((sum, m) => sum + (m.saleAmount || 0), 0).toString()],
    ['Средний чек (₽)', salesMeetings.length > 0
      ? Math.round(salesMeetings.reduce((sum, m) => sum + (m.saleAmount || 0), 0) / salesMeetings.length).toString()
      : '0'],
  ];

  const csv = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ].join('\n');

  downloadCSV(csv, `${filename}_${format(new Date(), 'yyyy-MM-dd')}.csv`);
}
