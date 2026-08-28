import { useEffect, useRef, useState, type ReactNode } from 'react';

type Props = {
  children: ReactNode;
  className?: string;
  /** delay in ms */
  delay?: number;
  /** animation variant */
  variant?: 'up' | 'scale' | 'fade';
  /** only animate once */
  once?: boolean;
  as?: keyof JSX.IntrinsicElements;
};

export default function Reveal({
  children,
  className = '',
  delay = 0,
  variant = 'up',
  once = true,
  as: Tag = 'div',
}: Props) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          if (once) observer.disconnect();
        } else if (!once) {
          setVisible(false);
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [once]);

  const base =
    variant === 'scale' ? 'reveal-scale' : variant === 'fade' ? 'reveal' : 'reveal';
  const style = delay ? { transitionDelay: `${delay}ms` } : undefined;

  return (
    // @ts-expect-error dynamic tag
    <Tag ref={ref} className={`${base} ${visible ? 'is-visible' : ''} ${className}`} style={style}>
      {children}
    </Tag>
  );
}
