/**
 * @neon-ether/shared-ui
 * Resource Bar (HP, Ether, AP) with crisp segment rendering.
 */

import React from 'react';

export interface StatBarProps {
  label: string;
  current: number;
  max: number;
  variant: 'hp' | 'ether' | 'ap';
  showNumeric?: boolean;
}

export const StatBar: React.FC<StatBarProps> = ({
  label,
  current,
  max,
  variant,
  showNumeric = true,
}) => {
  const percentage = Math.min(100, Math.max(0, (current / (max || 1)) * 100));

  const variantStyles = {
    hp: {
      bar: 'bg-gradient-to-r from-emerald-600 to-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.6)]',
      bg: 'bg-emerald-950/30 border-emerald-500/20',
      labelColor: 'text-emerald-400',
    },
    ether: {
      bar: 'bg-gradient-to-r from-[#bc13fe] to-[#00f2ff] shadow-[0_0_10px_rgba(188,19,254,0.6)]',
      bg: 'bg-[#bc13fe]/10 border-[#bc13fe]/20',
      labelColor: 'text-[#bc13fe]',
    },
    ap: {
      bar: 'bg-gradient-to-r from-amber-500 to-[#00f2ff] shadow-[0_0_10px_rgba(0,242,255,0.6)]',
      bg: 'bg-amber-950/30 border-amber-500/20',
      labelColor: 'text-amber-400',
    },
  }[variant];

  return (
    <div className="flex flex-col gap-1.5 font-mono text-xs select-none">
      <div className="flex justify-between items-center text-[10px]">
        <span className={`font-bold tracking-wider uppercase ${variantStyles.labelColor}`}>
          {label}
        </span>
        {showNumeric && (
          <span className="text-slate-300">
            <span className="font-bold text-white">{current}</span>
            <span className="text-slate-500"> / {max}</span>
          </span>
        )}
      </div>
      <div className={`h-2.5 w-full border rounded-full overflow-hidden p-[1px] ${variantStyles.bg}`}>
        <div
          className={`h-full rounded-full transition-all duration-300 ease-out ${variantStyles.bar}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
