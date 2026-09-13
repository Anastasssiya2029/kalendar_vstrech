import React from 'react';
import { AlertTriangle, Calendar, Clock, XCircle } from 'lucide-react';
import { Client, Meeting } from '../types';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';

interface MeetingCancellationDialogProps {
  meeting: Meeting | null;
  client?: Client | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (meeting: Meeting) => void;
}

const formatDate = (date: Date) => new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
}).format(date);

export function MeetingCancellationDialog({
  meeting,
  client,
  open,
  onOpenChange,
  onConfirm,
}: MeetingCancellationDialogProps) {
  if (!meeting) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="meeting-cancellation-dialog">
        <DialogHeader className="meeting-cancellation-dialog-header">
          <div className="meeting-cancellation-dialog-icon" aria-hidden="true">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <DialogTitle className="meeting-cancellation-dialog-title">Отменить встречу?</DialogTitle>
            <DialogDescription className="meeting-cancellation-dialog-description">
              Встреча будет помечена отменённой, а время снова станет доступно для записи.
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="meeting-cancellation-summary">
          {client && (
            <p className="meeting-cancellation-client">{client.firstName} {client.lastName} <span>{client.username}</span></p>
          )}
          <div className="meeting-cancellation-meta">
            <span><Calendar className="w-4 h-4" />{formatDate(meeting.date)}</span>
            <span><Clock className="w-4 h-4" />{meeting.startTime}</span>
          </div>
        </div>

        <div className="meeting-cancellation-actions">
          <Button type="button" variant="outline" className="meeting-cancellation-back" onClick={() => onOpenChange(false)}>
            Не отменять
          </Button>
          <Button
            type="button"
            className="meeting-cancellation-confirm"
            onClick={() => {
              onConfirm(meeting);
              onOpenChange(false);
            }}
          >
            <XCircle className="w-4 h-4 mr-2" />
            Отменить встречу
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
