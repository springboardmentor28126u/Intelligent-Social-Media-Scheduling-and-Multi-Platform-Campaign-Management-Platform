import { Link } from 'react-router-dom';
import logoImg from '@/assets/logo.png';

export default function Logo({
  className = '',
  dark = false,
  showText = true,
}: {
  className?: string;
  dark?: boolean;
  showText?: boolean;
}) {
  return (
    <Link
      to="/"
      className={`flex items-center gap-2.5 font-semibold ${className}`}
      aria-label="SocialPilot home"
    >
      <img
        src={logoImg}
        alt="SocialPilot Logo"
        className={showText ? "h-11 w-11 object-contain" : "h-9 w-9 object-contain"}
      />
      {showText && (
        <span className={`text-xl font-bold tracking-tight ${dark ? 'text-white' : 'text-ink-900'}`}>
          SocialPilot
        </span>
      )}
    </Link>
  );
}
