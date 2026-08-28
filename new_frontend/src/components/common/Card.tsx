import type { ReactNode } from 'react';

type Props = {
  children?: ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
};

export default function Card({ children, className = '', hover = false, onClick }: Props) {
  return (
    <div
      onClick={onClick}
      className={`bg-white border border-ink-100 rounded-2xl shadow-soft ${
        hover ? 'transition-all duration-300 hover:shadow-lift hover:border-ink-200 hover:-translate-y-0.5' : ''
      } ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {children}
    </div>
  );
}
