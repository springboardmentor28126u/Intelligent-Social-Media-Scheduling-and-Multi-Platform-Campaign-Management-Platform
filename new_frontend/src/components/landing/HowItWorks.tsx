import { Plug, PenTool, Clock, TrendingUp } from 'lucide-react';
import Reveal from '@/components/common/Reveal';

const steps = [
  {
    num: '01',
    icon: Plug,
    title: 'Connect',
    desc: 'Connect your social media accounts in seconds.',
  },
  {
    num: '02',
    icon: PenTool,
    title: 'Create',
    desc: 'Create your content and campaigns with intuitive tools.',
  },
  {
    num: '03',
    icon: Clock,
    title: 'Schedule',
    desc: 'Choose platforms, dates, and publishing times.',
  },
  {
    num: '04',
    icon: TrendingUp,
    title: 'Grow',
    desc: 'Monitor your campaigns and improve performance.',
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">
            How It Works
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl lg:text-5xl">
            From setup to growth in four steps.
          </h2>
        </Reveal>

        <div className="relative mt-16">
          {/* Connector line */}
          <div className="absolute left-0 right-0 top-[88px] hidden h-px bg-gradient-to-r from-transparent via-ink-200 to-transparent lg:block" />

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
            {steps.map((s, i) => (
              <Reveal
                key={s.num}
                delay={i * 120}
                className="group relative flex flex-col items-center text-center"
              >
                <div className="relative z-10 flex h-20 w-20 items-center justify-center rounded-2xl border border-ink-100 bg-white shadow-soft transition-all duration-300 group-hover:shadow-lift group-hover:border-brand-200 group-hover:-translate-y-1">
                  <s.icon className="h-8 w-8 text-ink-700 transition-colors group-hover:text-brand-600" />
                  <span className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-ink-900 text-xs font-bold text-white">
                    {s.num}
                  </span>
                </div>
                <h3 className="mt-5 text-lg font-semibold text-ink-900">{s.title}</h3>
                <p className="mt-2 max-w-[220px] text-sm text-ink-500 leading-relaxed">{s.desc}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
