/**
 * @neon-ether/shared-ui
 * Status and Check Badges for stat thresholds, AP costs, and item tags.
 */

import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'cyan' | 'purple' | 'emerald' | 'rose' | 'amber' | 'zinc';
  size?: 'xs' | 'sm' | 'md';
  icon?: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'cyan',
  size = 'sm',
  icon,
  className = '',
}) => {
  const sizeStyles = {
    xs: 'text-[9px] px-1.5 py-0.5 font-mono gap-1',
    sm: 'text-[10px] px-2 py-0.5 font-mono gap-1.5',
    md: 'text-xs px-2.5 py-1 font-mono gap-1.5',
  }[size];

  const variantStyles = {
    cyan: 'bg-[#00f2ff]/10 text-[#00f2ff] border border-[#00f2ff]/30 shadow-[0_0_8px_rgba(0,242,255,0.15)]',
    purple: 'bg-[#bc13fe]/10 text-[#bc13fe] border border-[#bc13fe]/30 shadow-[0_0_8px_rgba(188,19,254,0.15)]',
    emerald: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30',
    rose: 'bg-rose-500/10 text-rose-400 border border-rose-500/30',
    amber: 'bg-amber-500/10 text-amber-400 border border-amber-500/30',
    zinc: 'bg-white/5 text-slate-300 border border-white/10',
  }[variant];

  return (
    <span
      className={`inline-flex items-center uppercase tracking-wider font-semibold rounded-md whitespace-nowrap ${sizeStyles} ${variantStyles} ${className}`}
    >
      {icon && <span className="inline-flex shrink-0">{icon}</span>}
      {children}
    </span>
  );
};
