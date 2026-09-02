import { useEffect, useRef, useState } from 'react';
import { ArrowRight, ChevronDown, Sparkles, Calendar, Zap } from 'lucide-react';
import Button from '@/components/common/Button';
import LandingNav from '@/components/landing/LandingNav';
import PlatformSection from '@/components/landing/PlatformSection';
import FeaturesSection from '@/components/landing/FeaturesSection';
import ProductExperience from '@/components/landing/ProductExperience';
import HowItWorks from '@/components/landing/HowItWorks';
import CampaignSection from '@/components/landing/CampaignSection';
import CalendarSection from '@/components/landing/CalendarSection';
import AnalyticsSection from '@/components/landing/AnalyticsSection';
import AccountConnectionSection from '@/components/landing/AccountConnectionSection';
import CTASection from '@/components/landing/CTASection';
import Footer from '@/components/landing/Footer';
export const HERO_POSTER_IMAGE = '/hero-poster.jpg';
export const HERO_VIDEO_SOURCES = [
  { src: '/hero-bg.mp4', type: 'video/mp4' },
  { src: '/videos/hero-bg.mp4', type: 'video/mp4' },
];
function HeroVideoBackground() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);

  // Background fallback particle animation (runs seamlessly underneath or when video is loading/unavailable)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let w = 0;
    let h = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    // Floating cyber nodes representing social campaigns & data flow
    const particles = Array.from({ length: 45 }).map(() => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 2 + 0.8,
      a: Math.random() * 0.4 + 0.15,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(129, 140, 248, ${p.a})`;
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  // Ensure autoplay triggers properly even on aggressive browser power-saving modes
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {
        // Autoplay policy prevented playback, graceful fallback to poster image
      });
    }
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden bg-ink-950 pointer-events-none">
      {/* 1. Static poster image fallback layer (ensures immediate visual with zero blank flash) */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-1000"
        style={{
          backgroundImage: `url(${HERO_POSTER_IMAGE})`,
          opacity: videoLoaded && !videoError ? 0.45 : 0.85,
        }}
      />

      {/* 2. Ambient animated glowing blobs */}
      <div className="absolute -left-1/4 top-0 h-[600px] w-[600px] rounded-full bg-brand-600/20 blur-[130px] animate-pulse-soft" />
      <div
        className="absolute -right-1/4 top-1/4 h-[500px] w-[500px] rounded-full bg-accent-600/15 blur-[120px] animate-pulse-soft"
        style={{ animationDelay: '1s' }}
      />
      <div
        className="absolute bottom-0 left-1/3 h-[500px] w-[500px] rounded-full bg-brand-500/10 blur-[110px] animate-pulse-soft"
        style={{ animationDelay: '2s' }}
      />

      {/* 3. HTML5 Full-bleed Looping Background Video */}
      {!videoError && (
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          poster={HERO_POSTER_IMAGE}
          onLoadedData={() => setVideoLoaded(true)}
          onError={() => setVideoError(true)}
          className={`absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-1000 ${videoLoaded ? 'opacity-60' : 'opacity-0'
            }`}
        >
          {HERO_VIDEO_SOURCES.map((source, idx) => (
            <source key={idx} src={source.src} type={source.type} />
          ))}
          Your browser does not support HTML5 background video.
        </video>
      )}

      {/* 4. Canvas particle network overlay for high-tech SaaS ambiance */}
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full opacity-60" />

      {/* 5. Precision grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
          maskImage: 'radial-gradient(ellipse 75% 75% at 50% 40%, black 30%, transparent 85%)',
          WebkitMaskImage: 'radial-gradient(ellipse 75% 75% at 50% 40%, black 30%, transparent 85%)',
        }}
      />

      {/* 6. Multi-layer dark semi-transparent contrast overlays to guarantee text legibility */}
      <div className="absolute inset-0 bg-gradient-to-b from-ink-950/85 via-ink-950/65 to-ink-950/95" />
      <div className="absolute inset-0 bg-gradient-to-r from-ink-950/80 via-transparent to-ink-950/80" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,rgba(8,10,13,0.75)_100%)]" />
    </div>
  );
}

/** Hero Section with Full-Bleed Video Background & Parallax Floating Content */
function HeroSection() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden">
      {/* Background Video Layer */}
      <HeroVideoBackground />

      {/* Content Container */}
      <div
        className="relative z-10 mx-auto max-w-5xl px-5 text-center sm:px-6 lg:px-8 pt-20 pb-16"
        style={{ transform: `translateY(${scrollY * 0.25}px)`, opacity: Math.max(0, 1 - scrollY / 600) }}
      >
        <div className="animate-fade-down inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-sm text-white/80 backdrop-blur-md">
          <Sparkles className="h-3.5 w-3.5 text-brand-300" />
          <span>The intelligent social media workspace</span>
        </div>

        <h1 className="animate-fade-up mt-7 text-5xl font-bold tracking-tight text-white sm:text-6xl lg:text-7xl">
          Plan once.
          <br />
          <span className="bg-gradient-to-r from-brand-300 via-white to-accent-300 bg-clip-text text-transparent">
            Publish everywhere.
          </span>
        </h1>

        <p
          className="animate-fade-up mx-auto mt-6 max-w-2xl text-lg text-white/70 sm:text-xl"
          style={{ animationDelay: '0.1s' }}
        >
          SocialPilot helps you plan, schedule, and manage social media campaigns across every
          platform — from one intelligent workspace.
        </p>

        <div
          className="animate-fade-up mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
          style={{ animationDelay: '0.2s' }}
        >
          <Button to="/signup" size="lg" variant="secondary" rightIcon={<ArrowRight className="h-4 w-4" />}>
            Get Started Free
          </Button>
          <Button
            to="/signin"
            size="lg"
            variant="outline"
            className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:border-white/30"
            leftIcon={<Sparkles className="h-4 w-4" />}
          >
            Explore Platform
          </Button>
        </div>

        {/* Floating UI preview cards */}
        <div
          className="animate-fade-up mt-16 flex items-center justify-center gap-4"
          style={{ animationDelay: '0.35s' }}
        >
          <div className="hidden items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/60 backdrop-blur-md sm:flex">
            <Calendar className="h-4 w-4 text-brand-300" />
            <span>Visual calendar</span>
          </div>
          <div className="hidden items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/60 backdrop-blur-md sm:flex">
            <Zap className="h-4 w-4 text-accent-300" />
            <span>Auto-scheduling</span>
          </div>
          <div className="hidden items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/60 backdrop-blur-md sm:flex">
            <Sparkles className="h-4 w-4 text-brand-300" />
            <span>5 platforms</span>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div
        className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2"
        style={{ opacity: Math.max(0, 1 - scrollY / 300) }}
      >
        <div className="flex flex-col items-center gap-2 text-white/50">
          <span className="text-xs font-medium tracking-wider uppercase">Scroll to explore</span>
          <ChevronDown className="h-4 w-4 animate-bounce-subtle" />
        </div>
      </div>
    </section>
  );
}

export default function Landing() {
  return (
    <div className="min-h-screen bg-ink-50">
      <LandingNav />
      <main>
        <HeroSection />
        <PlatformSection />
        <FeaturesSection />
        <ProductExperience />
        <HowItWorks />
        <CampaignSection />
        <CalendarSection />
        <AnalyticsSection />
        <AccountConnectionSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
