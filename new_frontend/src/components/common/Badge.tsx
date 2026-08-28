import type { ReactNode } from 'react';

type Props = {
  children: ReactNode;
  variant?: 'brand' | 'neutral' | 'success' | 'warning' | 'danger' | 'accent';
  size?: 'sm' | 'md';
  dot?: boolean;
  className?: string;
};

const variants = {
  brand: 'bg-brand-50 text-brand-700 ring-brand-200',
  neutral: 'bg-ink-100 text-ink-600 ring-ink-200',
  success: 'bg-success-50 text-success-700 ring-success-200',
  warning: 'bg-warning-50 text-warning-700 ring-warning-200',
  danger: 'bg-danger-50 text-danger-700 ring-danger-200',
  accent: 'bg-accent-50 text-accent-700 ring-accent-200',
};

const dotColors = {
  brand: 'bg-brand-500',
  neutral: 'bg-ink-400',
  success: 'bg-success-500',
  warning: 'bg-warning-500',
  danger: 'bg-danger-500',
  accent: 'bg-accent-500',
};

export default function Badge({
  children,
  variant = 'neutral',
  size = 'sm',
  dot = false,
  className = '',
}: Props) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium ring-1 ring-inset rounded-full ${
        size === 'sm' ? 'text-xs px-2.5 py-0.5' : 'text-sm px-3 py-1'
      } ${variants[variant]} ${className}`}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${dotColors[variant]}`} />}
      {children}
    </span>
  );
}
