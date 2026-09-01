import Logo from '@/components/common/Logo';
import { InstagramIcon, FacebookIcon, LinkedInIcon, XIcon, YouTubeIcon } from '@/components/common/PlatformIcons';

const columns = [
  {
    title: 'Product',
    links: ['Features', 'Scheduling', 'Campaigns', 'Analytics', 'Calendar'],
  },
  {
    title: 'Company',
    links: ['About', 'Contact', 'Careers'],
  },
  {
    title: 'Resources',
    links: ['Documentation', 'Help Center', 'Privacy', 'Terms'],
  },
];

const socials = [
  { Icon: InstagramIcon, label: 'Instagram' },
  { Icon: FacebookIcon, label: 'Facebook' },
  { Icon: LinkedInIcon, label: 'LinkedIn' },
  { Icon: XIcon, label: 'X' },
  { Icon: YouTubeIcon, label: 'YouTube' },
];

export default function Footer() {
  return (
    <footer className="border-t border-ink-100 bg-white">
      <div className="mx-auto max-w-7xl px-5 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-5">
          {/* Brand */}
          <div className="col-span-2 lg:col-span-2">
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-500">
              The intelligent social media scheduling and multi-platform campaign management
              platform. Plan once. Publish everywhere.
            </p>
            <div className="mt-6 flex items-center gap-2">
              {socials.map((s) => (
                <button
                  key={s.label}
                  aria-label={s.label}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-ink-100 text-ink-500 transition-all hover:border-ink-200 hover:bg-ink-50 hover:text-ink-700"
                >
                  <s.Icon className="h-4 w-4" />
                </button>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="text-sm font-semibold text-ink-900">{col.title}</h4>
              <ul className="mt-4 space-y-3">
                {col.links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-sm text-ink-500 transition-colors hover:text-ink-900"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-ink-100 pt-8 sm:flex-row">
          <p className="text-sm text-ink-400">
            &copy; {new Date().getFullYear()} SocialFlow. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <a href="#" className="text-sm text-ink-400 hover:text-ink-700">Privacy</a>
            <a href="#" className="text-sm text-ink-400 hover:text-ink-700">Terms</a>
            <a href="#" className="text-sm text-ink-400 hover:text-ink-700">Cookies</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
