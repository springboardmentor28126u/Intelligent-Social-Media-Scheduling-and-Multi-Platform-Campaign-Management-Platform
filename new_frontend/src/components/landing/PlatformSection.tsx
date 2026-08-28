import Reveal from '@/components/common/Reveal';
import { platforms } from '@/components/common/PlatformIcons';

export default function PlatformSection() {
  return (
    <section id="platforms" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">
            Platforms
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl lg:text-5xl">
            One workspace for your entire social presence.
          </h2>
          <p className="mt-4 text-lg text-ink-500">
            Connect every channel and manage them from a single, unified workspace.
          </p>
        </Reveal>

        <Reveal delay={100} className="mt-16">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {platforms.map((p, i) => (
              <Reveal
                key={p.key}
                delay={i * 80}
                className="group flex flex-col items-center gap-4 rounded-2xl border border-ink-100 bg-white p-8 shadow-soft transition-all duration-300 hover:shadow-lift hover:-translate-y-1 hover:border-ink-200"
              >
                <div
                  className={`flex h-14 w-14 items-center justify-center rounded-2xl ${p.bg} ${p.color} transition-transform duration-300 group-hover:scale-110`}
                >
                  <p.Icon className="h-7 w-7" />
                </div>
                <span className="text-sm font-medium text-ink-700">{p.name}</span>
              </Reveal>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
