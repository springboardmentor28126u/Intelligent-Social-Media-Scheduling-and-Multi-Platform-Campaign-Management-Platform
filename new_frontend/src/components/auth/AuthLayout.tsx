import { Link } from 'react-router-dom';

export default function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-ink-50">
      {/* Left side — branding */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-ink-950 p-12 lg:flex">
        <div className="absolute -left-1/4 top-0 h-[500px] w-[500px] rounded-full bg-brand-600/20 blur-[120px]" />
        <div className="absolute -right-1/4 bottom-0 h-[400px] w-[400px] rounded-full bg-accent-600/15 blur-[120px]" />
        <div
          className="absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
            maskImage: 'radial-gradient(ellipse 60% 60% at 50% 50%, black 20%, transparent 80%)',
            WebkitMaskImage: 'radial-gradient(ellipse 60% 60% at 50% 50%, black 20%, transparent 80%)',
          }}
        />

        <div className="relative">
          <Link to="/" className="flex items-center gap-2.5 font-semibold">
            <svg viewBox="0 0 32 32" fill="none" className="h-8 w-8">
              <rect x="2" y="2" width="28" height="28" rx="8" fill="white" />
              <path
                d="M10 12.5c0-1.4 1.1-2.5 2.5-2.5h7c1.4 0 2.5 1.1 2.5 2.5v4c0 1.4-1.1 2.5-2.5 2.5h-1.8L14 22v-3h-1.5c-1.4 0-2.5-1.1-2.5-2.5v-4z"
                fill="#0f1115"
              />
              <circle cx="13" cy="14.5" r="1" fill="#6366f1" />
              <circle cx="16" cy="14.5" r="1" fill="#6366f1" />
              <circle cx="19" cy="14.5" r="1" fill="#6366f1" />
            </svg>
            <span className="text-[17px] tracking-tight text-white">SocialPilot</span>
          </Link>
        </div>

        <div className="relative">
          <h2 className="text-3xl font-bold tracking-tight text-white">
            Plan once.
            <br />
            Publish everywhere.
          </h2>
          <p className="mt-4 max-w-md text-white/60">
            The intelligent social media scheduling and multi-platform campaign management platform.
          </p>
        </div>

        <div className="relative flex items-center gap-6 text-sm text-white/40">
          <span>6 platforms</span>
          <span className="h-1 w-1 rounded-full bg-white/20" />
          <span>Smart scheduling</span>
          <span className="h-1 w-1 rounded-full bg-white/20" />
          <span>Real-time analytics</span>
        </div>
      </div>

      {/* Right side — form */}
      <div className="flex w-full flex-col justify-center px-5 py-12 sm:px-12 lg:w-1/2">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Link to="/" className="flex items-center gap-2.5 font-semibold">
              <svg viewBox="0 0 32 32" fill="none" className="h-8 w-8">
                <rect x="2" y="2" width="28" height="28" rx="8" fill="#0f1115" />
                <path
                  d="M10 12.5c0-1.4 1.1-2.5 2.5-2.5h7c1.4 0 2.5 1.1 2.5 2.5v4c0 1.4-1.1 2.5-2.5 2.5h-1.8L14 22v-3h-1.5c-1.4 0-2.5-1.1-2.5-2.5v-4z"
                  fill="white"
                />
                <circle cx="13" cy="14.5" r="1" fill="#818cf8" />
                <circle cx="16" cy="14.5" r="1" fill="#818cf8" />
                <circle cx="19" cy="14.5" r="1" fill="#818cf8" />
              </svg>
              <span className="text-[17px] tracking-tight text-ink-900">SocialPilot</span>
            </Link>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-ink-900">{title}</h1>
          <p className="mt-1.5 text-sm text-ink-500">{subtitle}</p>

          <div className="mt-8">{children}</div>

          <div className="mt-6 text-center text-sm text-ink-500">{footer}</div>
        </div>
      </div>
    </div>
  );
}
