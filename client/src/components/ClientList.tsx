import React from 'react';
import { Client } from '../types';
import { ClientCard } from './ClientCard';

interface ClientListProps {
  clients: Client[];
  onTogglePayment: (clientId: string, paymentIndex: number) => void;
  onPostponePayment: (clientId: string, paymentIndex: number, newDate: Date, reason: string) => void;
  onEditClient: (client: Client) => void;
  onPaymentAmountChange: (clientId: string, paymentIndex: number, newAmount: number) => void;
}

export function ClientList({ 
  clients, 
  onTogglePayment, 
  onPostponePayment, 
  onEditClient,
  onPaymentAmountChange,
}: ClientListProps) {
  return (
    <div className="space-y-5 sm:space-y-6 lg:space-y-8">
      {clients.length === 0 ? (
        <div className="bg-white rounded-3xl shadow-3d p-12 text-center">
          <p className="text-gray-600">Нет клиентов для отображения</p>
        </div>
      ) : (
        clients.map(client => (
          <ClientCard
            key={client.id}
            client={client}
            onTogglePayment={onTogglePayment}
            onPostponePayment={onPostponePayment}
            onEditClient={onEditClient}
            onPaymentAmountChange={onPaymentAmountChange}
          />
        ))
      )}
    </div>
  );
}