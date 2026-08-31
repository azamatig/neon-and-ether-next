/**
 * @neon-ether/shared-ui
 * Tactical Action Button with hard-boiled cyberpunk styling.
 */

import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ether' | 'danger' | 'warning' | 'ghost' | 'terminal' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles =
    'relative inline-flex items-center justify-center font-mono font-semibold uppercase tracking-wider transition-all duration-200 select-none focus:outline-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed rounded-lg';

  const sizeStyles = {
    sm: 'text-xs px-3 py-1.5 gap-1.5 border',
    md: 'text-sm px-4 py-2 gap-2 border',
    lg: 'text-base px-5 py-2.5 gap-2.5 border',
  }[size];

  const variantStyles: Record<string, string> = {
    primary:
      'bg-[#00f2ff]/10 text-[#00f2ff] border-[#00f2ff]/30 hover:bg-[#00f2ff]/20 hover:border-[#00f2ff] hover:text-white hover:shadow-[0_0_16px_rgba(0,242,255,0.35)]',
    secondary:
      'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10 hover:border-white/20 hover:text-white',
    ether:
      'bg-[#bc13fe]/10 text-[#bc13fe] border-[#bc13fe]/30 hover:bg-[#bc13fe]/20 hover:border-[#bc13fe] hover:text-white hover:shadow-[0_0_16px_rgba(188,19,254,0.35)]',
    danger:
      'bg-rose-500/10 text-rose-300 border-rose-500/30 hover:bg-rose-500/20 hover:border-rose-400 hover:text-white hover:shadow-[0_0_14px_rgba(244,63,94,0.3)]',
    warning:
      'bg-amber-500/10 text-amber-200 border-amber-500/30 hover:bg-amber-500/20 hover:border-amber-400 hover:text-white',
    ghost:
      'bg-transparent text-slate-400 border-transparent hover:bg-white/5 hover:text-slate-200',
    terminal:
      'bg-black/80 text-emerald-400 border-emerald-500/30 hover:bg-emerald-950/40 hover:border-emerald-400 hover:text-emerald-200 hover:shadow-[0_0_12px_rgba(16,185,129,0.3)]',
    outline:
      'bg-transparent text-slate-400 border-white/15 hover:border-slate-300 hover:text-white',
  };

  const currentVariant = variantStyles[variant] || variantStyles.primary;
  const widthStyle = fullWidth ? 'w-full' : '';

  return (
    <button
      className={`${baseStyles} ${sizeStyles} ${currentVariant} ${widthStyle} ${className}`}
      disabled={disabled}
      {...props}
    >
      {leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>}
      <span className="whitespace-nowrap">{children}</span>
      {rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
    </button>
  );
};
