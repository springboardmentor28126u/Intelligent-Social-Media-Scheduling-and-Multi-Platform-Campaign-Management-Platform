import { Link } from 'react-router-dom';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger';
type Size = 'sm' | 'md' | 'lg';

type CommonProps = {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  className?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
};

type AsButton = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof CommonProps> & {
    to?: undefined;
  };

type AsLink = CommonProps & {
  to: string;
} & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof CommonProps>;

type Props = AsButton | AsLink;

const base =
  'inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all duration-200 select-none whitespace-nowrap disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2';

const variants: Record<Variant, string> = {
  primary:
    'bg-ink-900 text-white hover:bg-ink-800 active:scale-[0.98] shadow-sm hover:shadow-md',
  secondary:
    'bg-brand-600 text-white hover:bg-brand-700 active:scale-[0.98] shadow-sm hover:shadow-md',
  ghost: 'text-ink-700 hover:bg-ink-100 active:scale-[0.98]',
  outline:
    'border border-ink-200 text-ink-800 bg-white hover:border-ink-300 hover:bg-ink-50 active:scale-[0.98]',
  danger: 'bg-danger-600 text-white hover:bg-danger-700 active:scale-[0.98] shadow-sm',
};

const sizes: Record<Size, string> = {
  sm: 'text-sm px-3.5 py-2',
  md: 'text-sm px-5 py-2.5',
  lg: 'text-base px-6 py-3',
};

export default function Button(props: Props) {
  const {
    children,
    variant = 'primary',
    size = 'md',
    className = '',
    leftIcon,
    rightIcon,
    fullWidth,
    ...rest
  } = props as CommonProps & Record<string, unknown>;

  const classes = `${base} ${variants[variant as Variant]} ${sizes[size as Size]} ${fullWidth ? 'w-full' : ''} ${className}`;

  const content = (
    <>
      {leftIcon && <span className="shrink-0">{leftIcon}</span>}
      {children}
      {rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </>
  );

  if ('to' in props && props.to !== undefined) {
    return (
      <Link to={props.to} className={classes} {...(rest as any)}>
        {content}
      </Link>
    );
  }

  return (
    <button className={classes} {...(rest as any)}>
      {content}
    </button>
  );
}
