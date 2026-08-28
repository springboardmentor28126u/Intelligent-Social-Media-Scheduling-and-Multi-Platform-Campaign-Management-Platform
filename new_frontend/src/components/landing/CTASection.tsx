import { ArrowRight, Sparkles } from 'lucide-react';
import Reveal from '@/components/common/Reveal';
import Button from '@/components/common/Button';

export default function CTASection() {
  return (
    <section className="relative overflow-hidden py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        <Reveal variant="scale">
          <div className="relative overflow-hidden rounded-3xl bg-ink-950 px-6 py-20 text-center sm:px-12 sm:py-24">
            {/* Background effects */}
            <div className="absolute -left-1/4 top-0 h-[500px] w-[500px] rounded-full bg-brand-600/25 blur-[120px]" />
            <div className="absolute -right-1/4 bottom-0 h-[500px] w-[500px] rounded-full bg-accent-600/15 blur-[120px]" />
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
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-sm text-white/80 backdrop-blur-md">
                <Sparkles className="h-3.5 w-3.5 text-brand-300" />
                <span>Start your social journey today</span>
              </div>

              <h2 className="mx-auto mt-6 max-w-3xl text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
                Your social workflow, simplified.
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-lg text-white/60">
                Create, schedule, manage, and measure your social presence from one place.
              </p>

              <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button
                  to="/signup"
                  size="lg"
                  variant="secondary"
                  rightIcon={<ArrowRight className="h-4 w-4" />}
                >
                  Get Started Free
                </Button>
                <Button
                  to="/signin"
                  size="lg"
                  variant="outline"
                  className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:border-white/30"
                >
                  Explore Dashboard
                </Button>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
