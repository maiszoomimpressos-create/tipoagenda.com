import React from 'react';
import ClientAppointmentForm from '@/components/ClientAppointmentForm';
import { useParams } from 'react-router-dom';

const ClientAppointmentPage: React.FC = () => {
  const { companyId } = useParams<{ companyId: string }>();

  if (!companyId) {
    return <div className="min-h-screen flex items-center justify-center">ID da empresa não encontrado na URL.</div>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <ClientAppointmentForm companyId={companyId} />
    </div>
  );
};

export default ClientAppointmentPage;