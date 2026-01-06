import React from 'react';
import ClientAppointmentForm from '@/components/ClientAppointmentForm';

const ClientAppointmentPage: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <ClientAppointmentForm />
    </div>
  );
};

export default ClientAppointmentPage;