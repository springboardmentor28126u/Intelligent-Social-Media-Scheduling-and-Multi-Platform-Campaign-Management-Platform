import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import Logo from '@/components/common/Logo';
import Button from '@/components/common/Button';

const navLinks = [
  { label: 'Features', href: '#features' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Platforms', href: '#platforms' },
  { label: 'Campaigns', href: '#campaigns' },
  { label: 'Analytics', href: '#analytics' },
];

export default function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled ? 'glass shadow-soft' : 'bg-transparent'
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-6 lg:px-8">
        <Logo />

        <div className="hidden items-center gap-1 lg:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-lg px-3.5 py-2 text-sm font-medium text-ink-600 transition-colors hover:bg-ink-100 hover:text-ink-900"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-3 lg:flex">
          <Link
            to="/signin"
            className="text-sm font-medium text-ink-700 transition-colors hover:text-ink-900"
          >
            Sign In
          </Link>
          <Button to="/signup" size="sm" variant="primary">
            Get Started
          </Button>
        </div>

        <button
          className="flex h-10 w-10 items-center justify-center rounded-lg text-ink-700 hover:bg-ink-100 lg:hidden"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {open && (
        <div className="glass border-t border-ink-100 lg:hidden">
          <div className="space-y-1 px-5 py-4">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="block rounded-lg px-3 py-2.5 text-sm font-medium text-ink-700 hover:bg-ink-100"
              >
                {link.label}
              </a>
            ))}
            <div className="flex gap-3 pt-3">
              <Button to="/signin" variant="outline" size="sm" fullWidth>
                Sign In
              </Button>
              <Button to="/signup" variant="primary" size="sm" fullWidth>
                Get Started
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
