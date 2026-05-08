import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

interface MnFeatureIconProps {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
}

export function MnFeatureIcon({ icon: Icon, label, onClick }: MnFeatureIconProps) {
  return (
    <div className="mn-feature-icon" onClick={onClick} role={onClick ? 'button' : undefined}>
      <div className="mn-feature-icon__circle">
        <Icon size={28} strokeWidth={1.8} color="#FFFFFF" fill="none" />
      </div>
      <span className="mn-feature-icon__label">{label}</span>
    </div>
  );
}

export function MnFeatureGrid({ children }: { children: ReactNode }) {
  return <div className="mn-feature-grid">{children}</div>;
}
