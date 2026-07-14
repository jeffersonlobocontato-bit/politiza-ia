import { Link } from 'react-router-dom';
import { ArrowLeft, UserPlus } from 'lucide-react';
import { UsersManager } from '@/components/settings/UsersManager';

export default function CampoMembros() {
  return (
    <div className="campo-screen">
      <div className="campo-page-header">
        <Link to="/campo" className="campo-icon-btn">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: 'rgba(155,135,245,0.15)', border: '1px solid rgba(155,135,245,0.35)' }}
        >
          <UserPlus className="w-4 h-4" style={{ color: '#9B87F5' }} />
        </div>
        <div className="min-w-0 flex-1">
          <h1>Membros da Equipe</h1>
          <p>Cadastre e gerencie os membros da sua equipe</p>
        </div>
      </div>
      <div className="flex-1 overflow-auto px-4 py-4 pb-24 bg-background">
        <UsersManager />
      </div>
    </div>
  );
}
