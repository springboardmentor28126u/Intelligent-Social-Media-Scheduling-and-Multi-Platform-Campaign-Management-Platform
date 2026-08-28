import {
  FolderKanban,
  FileText,
  Share2,
  Calendar,
  Send,
  BarChart3,
  ArrowRight,
} from 'lucide-react';
import Reveal from '@/components/common/Reveal';

const flow = [
  { icon: FolderKanban, label: 'Campaign', desc: 'Define your campaign' },
  { icon: FileText, label: 'Content', desc: 'Create your posts' },
  { icon: Share2, label: 'Platforms', desc: 'Choose channels' },
  { icon: Calendar, label: 'Schedule', desc: 'Set date & time' },
  { icon: Send, label: 'Publish', desc: 'Auto-publish everywhere' },
  { icon: BarChart3, label: 'Analyze', desc: 'Measure performance' },
];

export default function CampaignSection() {
  return (
    <section id="campaigns" className="relative bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">
            Campaign Management
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl lg:text-5xl">
            Turn scattered posts into organized campaigns.
          </h2>
          <p className="mt-4 text-lg text-ink-500">
            A structured workflow that takes you from idea to published campaign — and back to
            insights.
          </p>
        </Reveal>

        <Reveal delay={100} className="mt-16">
          <div className="flex flex-col items-center gap-2 lg:flex-row lg:justify-center lg:gap-1">
            {flow.map((step, i) => (
              <div key={step.label} className="flex items-center gap-2 lg:gap-1">
                <div className="group flex w-44 flex-col items-center gap-3 rounded-2xl border border-ink-100 bg-gradient-to-br from-white to-ink-50/50 p-6 shadow-soft transition-all duration-300 hover:shadow-lift hover:border-brand-200 hover:-translate-y-1">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-ink-900 text-white transition-transform group-hover:scale-110 group-hover:bg-brand-600">
                    <step.icon className="h-6 w-6" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-ink-900">{step.label}</p>
                    <p className="mt-0.5 text-xs text-ink-500">{step.desc}</p>
                  </div>
                </div>
                {i < flow.length - 1 && (
                  <ArrowRight className="hidden h-5 w-5 shrink-0 text-ink-300 lg:block" />
                )}
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
