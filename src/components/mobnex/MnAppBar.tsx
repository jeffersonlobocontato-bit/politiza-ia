import { ReactNode } from 'react';
import { Bell } from 'lucide-react';

interface MnAppBarProps {
  brandTag?: string;
  title: string;
  action?: ReactNode;
  onActionClick?: () => void;
}

export function MnAppBar({ brandTag = 'MOBNEX', title, action, onActionClick }: MnAppBarProps) {
  return (
    <header className="mn-app-bar">
      <div>
        <span className="mn-app-bar__brand-tag">{brandTag}</span>
        <span className="mn-app-bar__name">{title}</span>
      </div>
      <button type="button" className="mn-app-bar__action" onClick={onActionClick} aria-label="Ação">
        {action ?? <Bell size={18} strokeWidth={1.8} color="#FFFFFF" />}
      </button>
    </header>
  );
}
