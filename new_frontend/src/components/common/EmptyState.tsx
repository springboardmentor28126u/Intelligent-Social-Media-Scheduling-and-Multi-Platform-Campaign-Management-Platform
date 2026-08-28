import type { ReactNode } from 'react';

type Props = {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
};

export default function EmptyState({
  icon,
  title,
  description,
  action,
  className = '',
  compact = false,
}: Props) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${
        compact ? 'py-8 px-4' : 'py-16 px-6'
      } ${className}`}
    >
      {icon && (
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-ink-50 text-ink-400 ring-1 ring-ink-100">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-ink-800">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm text-ink-500 leading-relaxed">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
