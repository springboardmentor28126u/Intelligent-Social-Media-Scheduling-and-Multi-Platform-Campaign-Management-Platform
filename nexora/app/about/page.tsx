import Navbar from "@/components/navbar/Navbar";
import Footer from "@/components/footer/Footer";
import { Sparkles, Target, Compass, Shield, Users, Lightbulb, Rocket, CheckCircle2 } from "lucide-react";

export default function AboutPage() {
  const values = [
    {
      title: "Innovation",
      desc: "Harnessing cutting-edge AI to eliminate repetitive manual scheduling and unlock creative potential.",
      icon: Lightbulb,
      color: "bg-purple-50 text-[#7C3AED]"
    },
    {
      title: "Simplicity",
      desc: "Building intuitive, clutter-free interfaces where complex multi-network campaigns feel effortless.",
      icon: Compass,
      color: "bg-indigo-50 text-[#635BFF]"
    },
    {
      title: "Security",
      desc: "Safeguarding client tokens, credentials, and business assets with enterprise-grade protection.",
      icon: Shield,
      color: "bg-emerald-50 text-[#10B981]"
    },
    {
      title: "Collaboration",
      desc: "Empowering creators, marketing leads, and stakeholders to coordinate seamlessly with granular RBAC.",
      icon: Users,
      color: "bg-cyan-50 text-[#06B6D4]"
    },
    {
      title: "Growth",
      desc: "Focusing strictly on data-driven metrics and real engagement rather than vanity statistics.",
      icon: Rocket,
      color: "bg-amber-50 text-[#F59E0B]"
    }
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
      <Navbar />

      {/* Hero */}
      <section className="pt-16 pb-16 bg-white border-b border-slate-200 text-center">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <span className="text-xs font-bold uppercase tracking-wider text-[#635BFF]">Our Story</span>
          <h1 className="mt-3 text-4xl font-extrabold text-slate-900 sm:text-5xl">
            About SocialPilot
          </h1>
          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
            SocialPilot is an intelligent social media management platform designed to simplify content planning, scheduling, publishing, and performance tracking across modern digital networks.
          </p>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            
            <div className="rounded-3xl border border-slate-200 bg-white p-8 sm:p-10 shadow-xs">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-[#635BFF] mb-6">
                <Target className="h-6 w-6" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Our Mission</h2>
              <p className="mt-4 text-sm text-slate-600 leading-relaxed">
                To empower creators, marketing teams, and enterprises with an intelligent co-pilot workspace that automates the friction of multi-platform distribution, so they can focus on authentic storytelling and genuine audience relationships.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-8 sm:p-10 shadow-xs">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-50 text-[#7C3AED] mb-6">
                <Compass className="h-6 w-6" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Our Vision</h2>
              <p className="mt-4 text-sm text-slate-600 leading-relaxed">
                To become the world's most trusted and intuitive AI-driven social media management ecosystem — bridging the gap between creative ideation, cross-platform execution, and quantifiable business revenue.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* Why We Built IntelliPost */}
      <section className="py-16 bg-white border-y border-slate-200">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <span className="text-xs font-bold uppercase tracking-wider text-[#635BFF]">The Genesis</span>
            <h2 className="mt-2 text-3xl font-extrabold text-slate-900">Why We Built SocialPilot</h2>
          </div>
          <div className="mt-8 space-y-4 text-sm text-slate-600 leading-relaxed">
            <p>
              Managing social media today shouldn't require logging into six separate tabs, guessing optimal posting times, or manually rewriting captions for character limits.
            </p>
            <p>
              We built SocialPilot to combine high-speed scheduling with platform-native AI adapters, interactive calendar controls, real-time analytics, and role-based team management into a single, clean workspace.
            </p>
          </div>
        </div>
      </section>

      {/* Core Values */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-[#635BFF]">Guiding Principles</span>
            <h2 className="mt-2 text-3xl font-extrabold text-slate-900">Our Core Values</h2>
          </div>

          <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {values.map((v, i) => {
              const Icon = v.icon;
              return (
                <div key={i} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs card-hover-effect">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${v.color} mb-4`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">{v.title}</h3>
                  <p className="mt-2 text-xs text-slate-600 leading-relaxed">{v.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}