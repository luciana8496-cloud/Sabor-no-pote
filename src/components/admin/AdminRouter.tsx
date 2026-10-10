import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { AdminLogin } from './AdminLogin';
import { AdminDashboard } from './AdminDashboard';
import { Logo } from '../brand/Logo';

interface AdminRouterProps {
  onBackToPublic: () => void;
}

export const AdminRouter: React.FC<AdminRouterProps> = ({ onBackToPublic }) => {
  const { isAdmin, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FFFCF7] flex flex-col items-center justify-center p-6 space-y-4">
        <Logo variant="icon" size="lg" />
        <div className="w-6 h-6 border-2 border-[#171717] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold text-neutral-500">
          Verificando credenciais e permissões RLS...
        </p>
      </div>
    );
  }

  if (isAdmin) {
    return <AdminDashboard onBackToPublic={onBackToPublic} />;
  }

  return <AdminLogin onBackToPublic={onBackToPublic} />;
};
