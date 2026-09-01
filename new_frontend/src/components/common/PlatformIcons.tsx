type IconProps = {
  className?: string;
};

/** Stylized geometric platform marks — original, not trademarked logos */

export function InstagramIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5.5" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" />
    </svg>
  );
}

export function FacebookIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M14 8.5V11h2.5l.5 3H14v6h-3v-6H9v-3h2V8c0-2 1.3-3.5 3.5-3.5H17v2.8h-1.8c-.7 0-1.2.5-1.2 1.2z"
        fill="currentColor"
      />
      <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth="1.4" opacity="0.3" />
    </svg>
  );
}

export function LinkedInIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="4" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
      <rect x="6.5" y="10" width="2.5" height="7" rx="1" fill="currentColor" />
      <circle cx="7.75" cy="7" r="1.4" fill="currentColor" />
      <path
        d="M11.5 10.5V17h2.4v-3.2c0-1 .6-1.6 1.5-1.6s1.5.6 1.5 1.6V17h2.4v-3.8c0-2-1.2-3-2.8-3-1.1 0-1.9.5-2.4 1.2V10.5h-2.6z"
        fill="currentColor"
      />
    </svg>
  );
}

export function XIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M5 5l6 7.5L5.5 19H8l4.2-5.2L16 19h3l-6.3-7.8L18.5 5H16l-3.9 4.8L8.5 5H5z"
        fill="currentColor"
      />
    </svg>
  );
}

export function YouTubeIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="2.5" y="6" width="19" height="12" rx="3.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 9.5l5 2.5-5 2.5v-5z" fill="currentColor" />
    </svg>
  );
}

export type PlatformKey =
  | 'instagram'
  | 'facebook'
  | 'linkedin'
  | 'x'
  | 'youtube';

export const platforms: {
  key: PlatformKey;
  name: string;
  Icon: (props: IconProps) => JSX.Element;
  color: string;
  bg: string;
}[] = [
  { key: 'instagram', name: 'Instagram', Icon: InstagramIcon, color: 'text-pink-600', bg: 'bg-pink-50' },
  { key: 'facebook', name: 'Facebook', Icon: FacebookIcon, color: 'text-blue-600', bg: 'bg-blue-50' },
  { key: 'linkedin', name: 'LinkedIn', Icon: LinkedInIcon, color: 'text-blue-700', bg: 'bg-blue-50' },
  { key: 'x', name: 'X', Icon: XIcon, color: 'text-ink-900', bg: 'bg-ink-100' },
  { key: 'youtube', name: 'YouTube', Icon: YouTubeIcon, color: 'text-red-600', bg: 'bg-red-50' },
];

export function PlatformIcon({
  platform,
  className = 'h-5 w-5',
}: {
  platform: PlatformKey;
  className?: string;
}) {
  const p = platforms.find((x) => x.key === platform);
  if (!p) return null;
  return <p.Icon className={className} />;
}
