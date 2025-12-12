import React from 'react';
import { useSession } from './SessionContextProvider';

const PermissionDebug: React.FC = () => {
  const { session, loading, isClient, isProprietario, isAdmin, loadingRoles } = useSession();

  if (loading || loadingRoles) {
    return <div className="text-xs text-gray-500 p-2">Permissões: Carregando...</div>;
  }

  if (!session) {
    return <div className="text-xs text-gray-500 p-2">Permissões: Deslogado</div>;
  }

  const roles = [];
  if (isClient) roles.push('CLIENTE');
  if (isProprietario) roles.push('PROPRIETÁRIO');
  if (isAdmin) roles.push('ADMIN');
  
  const roleStatus = roles.length > 0 ? roles.join(' | ') : 'NENHUMA FUNÇÃO DE GESTÃO';

  return (
    <div className="text-xs text-gray-500 p-2 border-t mt-2">
      <strong>Status de Permissão:</strong> {roleStatus}
    </div>
  );
};

export default PermissionDebug;