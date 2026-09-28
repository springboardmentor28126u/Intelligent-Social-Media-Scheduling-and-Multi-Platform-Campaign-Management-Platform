import Link from "next/link";
import { Layers, Sparkles, ArrowRight, Globe } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-950 text-slate-400">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        
        {/* Top grid */}
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-5">
          
          {/* Brand Col */}
          <div className="lg:col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-tr from-[#635BFF] to-[#7C3AED] text-white shadow-md shadow-[#635BFF]/30">
                <Layers className="h-5 w-5" />
              </div>
              <span className="text-xl font-bold tracking-tight text-white">
                SocialPilot
              </span>
            </Link>
            <p className="text-sm text-slate-400 max-w-sm leading-relaxed">
              Plan smarter. Post better. Grow faster. SocialPilot is your complete intelligent workspace for multi-platform social media scheduling, AI generation, and performance analytics.
            </p>

            <div className="flex items-center gap-3 pt-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-slate-300 text-xs font-bold hover:bg-[#635BFF] hover:text-white transition-colors cursor-pointer">
                IG
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-slate-300 text-xs font-bold hover:bg-[#635BFF] hover:text-white transition-colors cursor-pointer">
                FB
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-slate-300 text-xs font-bold hover:bg-[#635BFF] hover:text-white transition-colors cursor-pointer">
                in
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-slate-300 text-xs font-bold hover:bg-[#635BFF] hover:text-white transition-colors cursor-pointer">
                𝕏
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-slate-300 text-xs font-bold hover:bg-[#635BFF] hover:text-white transition-colors cursor-pointer">
                YT
              </span>
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">Product</h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li><Link href="/features" className="hover:text-white transition-colors">Multi-Platform Scheduling</Link></li>
              <li><Link href="/features" className="hover:text-white transition-colors">AI Content Co-Pilot</Link></li>
              <li><Link href="/dashboard/calendar" className="hover:text-white transition-colors">Visual Content Calendar</Link></li>
              <li><Link href="/dashboard/campaigns" className="hover:text-white transition-colors">Campaign Management</Link></li>
              <li><Link href="/dashboard/analytics" className="hover:text-white transition-colors">Analytics & Reports</Link></li>
              <li><Link href="/pricing" className="hover:text-white transition-colors">Pricing Plans</Link></li>
            </ul>
          </div>

          {/* Solutions Links */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">Solutions</h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li><Link href="/features" className="hover:text-white transition-colors">For Marketing Agencies</Link></li>
              <li><Link href="/features" className="hover:text-white transition-colors">For Content Creators</Link></li>
              <li><Link href="/features" className="hover:text-white transition-colors">For Startups & SMBs</Link></li>
              <li><Link href="/features" className="hover:text-white transition-colors">For Enterprises</Link></li>
              <li><Link href="/dashboard/calendar" className="hover:text-white transition-colors">Interactive Calendar</Link></li>
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">Company</h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li><Link href="/about" className="hover:text-white transition-colors">About Us</Link></li>
              <li><Link href="/about" className="hover:text-white transition-colors">Mission & Values</Link></li>
              <li><Link href="/contact" className="hover:text-white transition-colors">Contact Support</Link></li>
              <li><Link href="/login" className="hover:text-white transition-colors">Login / Sign In</Link></li>
              <li><Link href="/login" className="hover:text-white transition-colors">Launch App</Link></li>
            </ul>
          </div>

        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-center justify-between border-t border-slate-800 pt-8 sm:flex-row text-xs text-slate-500">
          <p>© {new Date().getFullYear()} SocialPilot Technologies Inc. All rights reserved. Plan. Post. Perform.</p>
          <div className="mt-4 flex gap-6 sm:mt-0">
            <a href="#" className="hover:text-slate-400">Privacy Policy</a>
            <a href="#" className="hover:text-slate-400">Terms of Service</a>
            <a href="#" className="hover:text-slate-400">Security & Compliance</a>
            <a href="#" className="hover:text-slate-400">Status</a>
          </div>
        </div>

      </div>
    </footer>
  );
}
