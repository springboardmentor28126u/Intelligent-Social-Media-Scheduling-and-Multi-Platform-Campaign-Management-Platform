import { Link2 } from 'lucide-react';
import Reveal from '@/components/common/Reveal';
import Button from '@/components/common/Button';
import EmptyState from '@/components/common/EmptyState';
import { platforms } from '@/components/common/PlatformIcons';

export default function AccountConnectionSection() {
  return (
    <section className="relative bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">
            Social Accounts
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl lg:text-5xl">
            Connect your platforms in one click.
          </h2>
        </Reveal>

        <Reveal delay={100} className="mt-12">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {platforms.map((p, i) => (
              <Reveal
                key={p.key}
                delay={i * 70}
                className="group flex items-center justify-between rounded-2xl border border-ink-100 bg-white p-5 shadow-soft transition-all duration-300 hover:shadow-lift hover:border-ink-200"
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl ${p.bg} ${p.color} transition-transform duration-300 group-hover:scale-110`}
                  >
                    <p.Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-ink-900">{p.name}</p>
                    <p className="text-xs text-ink-400">Not connected</p>
                  </div>
                </div>
                <Button size="sm" variant="outline" leftIcon={<Link2 className="h-3.5 w-3.5" />}>
                  Connect
                </Button>
              </Reveal>
            ))}
          </div>
        </Reveal>

        <Reveal delay={200} className="mt-12">
          <div className="rounded-2xl border border-dashed border-ink-200 bg-ink-50/50">
            <EmptyState
              icon={<Link2 className="h-7 w-7" />}
              title="No social accounts connected yet."
              description="Connect your first account to start scheduling and analyzing your social media."
              action={<Button to="/signup" size="md" variant="secondary">Connect your first account</Button>}
            />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
