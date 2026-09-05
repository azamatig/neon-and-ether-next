/**
 * @neon-ether/shared-ui
 * Cyberpunk Framed HUD Panel with tactical borders and header.
 */

import React from 'react';

export interface PanelProps {
  title?: string;
  subtitle?: string;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  glow?: 'cyan' | 'purple' | 'rose' | 'amber' | 'none';
}

export const Panel: React.FC<PanelProps> = ({
  title,
  subtitle,
  headerRight,
  children,
  className = '',
  glow = 'none',
}) => {
  const glowStyles = {
    cyan: 'border-[#00f2ff]/30 shadow-[0_0_20px_rgba(0,242,255,0.06)]',
    purple: 'border-[#bc13fe]/30 shadow-[0_0_20px_rgba(188,19,254,0.06)]',
    rose: 'border-rose-500/30 shadow-[0_0_20px_rgba(244,63,94,0.07)]',
    amber: 'border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.07)]',
    none: 'border-white/10',
  }[glow];

  return (
    <div
      className={`relative bg-black/40 border rounded-xl backdrop-blur-md flex flex-col overflow-hidden transition-all duration-200 ${glowStyles} ${className}`}
    >
      {title && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-2.5">
            <span
              className={`w-2 h-2 rounded-full ${
                glow === 'purple'
                  ? 'bg-[#bc13fe] shadow-[0_0_8px_#bc13fe]'
                  : 'bg-[#00f2ff] shadow-[0_0_8px_#00f2ff]'
              }`}
            />
            <h3 className="font-mono text-xs uppercase tracking-widest text-white font-bold">
              {title}
            </h3>
            {subtitle && (
              <span className="font-mono text-[10px] text-slate-400">
                // {subtitle}
              </span>
            )}
          </div>
          {headerRight && <div className="flex items-center gap-2">{headerRight}</div>}
        </div>
      )}

      <div className="p-4 flex-1 flex flex-col">{children}</div>
    </div>
  );
};
