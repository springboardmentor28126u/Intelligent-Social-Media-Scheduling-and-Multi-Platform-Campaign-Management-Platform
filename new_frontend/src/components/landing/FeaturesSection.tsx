import {
  CalendarDays,
  Share2,
  FolderKanban,
  LayoutGrid,
  BarChart3,
  Link2,
} from 'lucide-react';
import Reveal from '@/components/common/Reveal';

const features = [
  {
    icon: CalendarDays,
    title: 'Intelligent Scheduling',
    desc: 'Plan and schedule content across multiple platforms with smart time recommendations.',
    span: 'lg:col-span-2 lg:row-span-1',
  },
  {
    icon: Share2,
    title: 'Multi-Platform Publishing',
    desc: 'Manage all your social channels from one workspace.',
    span: '',
  },
  {
    icon: FolderKanban,
    title: 'Campaign Management',
    desc: 'Create, organize, and monitor campaigns end-to-end.',
    span: '',
  },
  {
    icon: LayoutGrid,
    title: 'Content Calendar',
    desc: 'Visualize your entire publishing schedule in a beautiful calendar view.',
    span: 'lg:col-span-2',
  },
  {
    icon: BarChart3,
    title: 'Analytics',
    desc: 'Understand campaign and content performance with deep insights.',
    span: '',
  },
  {
    icon: Link2,
    title: 'Social Account Management',
    desc: 'Connect and manage multiple social accounts seamlessly.',
    span: 'lg:col-span-2',
  },
];

export default function FeaturesSection() {
  return (
    <section id="features" className="relative bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">Features</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl lg:text-5xl">
            Everything you need to manage your social presence.
          </h2>
          <p className="mt-4 text-lg text-ink-500">
            Powerful tools designed for modern social media teams.
          </p>
        </Reveal>

        <div className="mt-16 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <Reveal
              key={f.title}
              delay={i * 70}
              className={`group relative overflow-hidden rounded-2xl border border-ink-100 bg-gradient-to-br from-white to-ink-50/50 p-7 shadow-soft transition-all duration-300 hover:shadow-lift hover:-translate-y-1 hover:border-ink-200 ${f.span}`}
            >
              <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-brand-50/60 blur-2xl transition-opacity duration-300 group-hover:opacity-100 opacity-0" />
              <div className="relative">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-ink-900 text-white transition-transform duration-300 group-hover:scale-110 group-hover:bg-brand-600">
                  <f.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-ink-900">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-500">{f.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
