import { useEffect, useRef, useState } from 'react';
import {
  CalendarDays,
  LayoutGrid,
  BarChart3,
  Link2,
  PenTool,
} from 'lucide-react';
import Reveal from '@/components/common/Reveal';

const previews = [
  { icon: CalendarDays, label: 'Calendar', desc: 'Visualize your publishing schedule' },
  { icon: PenTool, label: 'Composer', desc: 'Craft posts with a live preview' },
  { icon: LayoutGrid, label: 'Campaigns', desc: 'Organize content into campaigns' },
  { icon: BarChart3, label: 'Analytics', desc: 'Track performance across platforms' },
  { icon: Link2, label: 'Accounts', desc: 'Connect and manage social accounts' },
];

/** Abstract UI preview card — no fake data */
function PreviewCard({ active }: { active: boolean }) {
  return (
    <div
      className={`relative aspect-[16/10] w-full overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-lift transition-all duration-500 ${
        active ? 'opacity-100 scale-100' : 'opacity-0 scale-95 absolute inset-0'
      }`}
    >
      {/* Window chrome */}
      <div className="flex items-center gap-1.5 border-b border-ink-100 px-4 py-3">
        <div className="h-2.5 w-2.5 rounded-full bg-ink-200" />
        <div className="h-2.5 w-2.5 rounded-full bg-ink-200" />
        <div className="h-2.5 w-2.5 rounded-full bg-ink-200" />
        <div className="ml-3 h-4 flex-1 max-w-[200px] rounded bg-ink-50" />
      </div>

      {/* Abstract content skeleton */}
      <div className="flex h-[calc(100%-44px)]">
        {/* Sidebar */}
        <div className="hidden w-44 border-r border-ink-100 p-4 sm:block">
          <div className="h-6 w-24 rounded-md bg-ink-100" />
          <div className="mt-4 space-y-2.5">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={`flex items-center gap-2.5 rounded-lg p-2 ${
                  i === 0 ? 'bg-brand-50' : ''
                }`}
              >
                <div className={`h-4 w-4 rounded ${i === 0 ? 'bg-brand-300' : 'bg-ink-100'}`} />
                <div
                  className={`h-3 rounded ${
                    i === 0 ? 'w-20 bg-brand-200' : 'w-16 bg-ink-100'
                  }`}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 p-5">
          <div className="flex items-center justify-between">
            <div className="h-5 w-32 rounded-md bg-ink-100" />
            <div className="h-7 w-20 rounded-lg bg-ink-900" />
          </div>

          {/* Cards grid */}
          <div className="mt-5 grid grid-cols-3 gap-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="rounded-xl border border-ink-100 p-3"
              >
                <div className="h-3 w-12 rounded bg-ink-100" />
                <div className="mt-2 h-6 w-16 rounded bg-ink-50" />
                <div className="mt-3 h-2 w-full rounded-full bg-ink-50" />
                <div
                  className="mt-1.5 h-2 rounded-full bg-ink-50"
                  style={{ width: `${60 + i * 5}%` }}
                />
              </div>
            ))}
          </div>

          {/* Chart area */}
          <div className="mt-4 flex h-24 items-end gap-2 rounded-xl border border-ink-100 p-4">
            {[40, 65, 45, 80, 55, 70, 50, 90, 60].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-t bg-gradient-to-t from-brand-100 to-brand-300"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProductExperience() {
  const [active, setActive] = useState(0);
  const sectionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const interval = setInterval(() => {
            setActive((prev) => (prev + 1) % previews.length);
          }, 2800);
          return () => clearInterval(interval);
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="relative overflow-hidden py-24 sm:py-32">
      <div className="absolute inset-0 hero-glow opacity-50" />
      <div className="relative mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">
            Product Experience
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl lg:text-5xl">
            A workspace that scales with your ambitions.
          </h2>
        </Reveal>

        <div className="mt-16 grid gap-10 lg:grid-cols-[280px_1fr] lg:gap-12">
          {/* Preview tabs */}
          <div className="flex gap-3 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible">
            {previews.map((p, i) => (
              <button
                key={p.label}
                onClick={() => setActive(i)}
                className={`flex shrink-0 items-center gap-3 rounded-xl border p-4 text-left transition-all duration-300 lg:w-full ${
                  active === i
                    ? 'border-brand-200 bg-white shadow-card'
                    : 'border-ink-100 bg-transparent hover:bg-white/50'
                }`}
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors ${
                    active === i ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-500'
                  }`}
                >
                  <p.icon className="h-5 w-5" />
                </div>
                <div className="hidden lg:block">
                  <p
                    className={`text-sm font-semibold ${
                      active === i ? 'text-ink-900' : 'text-ink-600'
                    }`}
                  >
                    {p.label}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-400">{p.desc}</p>
                </div>
                <p
                  className={`text-sm font-medium lg:hidden ${
                    active === i ? 'text-ink-900' : 'text-ink-500'
                  }`}
                >
                  {p.label}
                </p>
              </button>
            ))}
          </div>

          {/* Preview area */}
          <Reveal delay={100} variant="scale" className="relative">
            <div className="relative">
              {previews.map((_, i) => (
                <PreviewCard key={i} active={active === i} />
              ))}
            </div>
            {/* Progress dots */}
            <div className="mt-6 flex justify-center gap-2">
              {previews.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActive(i)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    active === i ? 'w-6 bg-brand-600' : 'w-1.5 bg-ink-200 hover:bg-ink-300'
                  }`}
                  aria-label={`Preview ${i + 1}`}
                />
              ))}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
