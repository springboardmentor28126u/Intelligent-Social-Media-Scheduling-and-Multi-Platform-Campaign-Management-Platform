import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  ShieldCheck,
  Zap,
  Lock,
  Eye,
  Server,
  Trash2,
  FileText,
  Share2,
  RefreshCw,
  Globe,
  Mail,
  ArrowLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Printer,
  Sparkles,
} from "lucide-react";
import { FaFacebook, FaInstagram, FaLinkedin, FaTwitter, FaYoutube } from "react-icons/fa";

export default function PrivacyPolicy() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<string>("introduction");

  const lastUpdated = "October 2, 2026";
  const effectiveDate = "October 2, 2026";

  const sections = [
    { id: "introduction", title: "1. Introduction & Scope" },
    { id: "information-collected", title: "2. Information We Collect" },
    { id: "how-we-use", title: "3. How We Use Your Information" },
    { id: "social-account-data", title: "4. Social Media Account Data" },
    { id: "meta-data-usage", title: "5. Facebook & Meta Data Usage" },
    { id: "linkedin-instagram", title: "6. LinkedIn & Instagram Data" },
    { id: "data-storage-security", title: "7. Data Storage & Security" },
    { id: "data-sharing", title: "8. Data Sharing & Disclosure" },
    { id: "user-rights", title: "9. Your Rights & Choices" },
    { id: "data-deletion", title: "10. Data Deletion Instructions" },
    { id: "cookies-storage", title: "11. Cookies & Local Storage" },
    { id: "policy-changes", title: "12. Changes to This Policy" },
    { id: "contact-us", title: "13. Contact Information" },
  ];

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 160;
      for (const section of sections) {
        const el = document.getElementById(section.id);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPosition >= top && scrollPosition < top + height) {
            setActiveSection(section.id);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [sections]);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const yOffset = -90;
      const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: "smooth" });
      setActiveSection(id);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-[#070A12] text-slate-100 selection:bg-blue-500 selection:text-white font-sans relative">
      {/* Ambient background decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-25 pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[400px] bg-gradient-to-b from-blue-600/15 via-indigo-600/5 to-transparent blur-[140px] pointer-events-none -z-10" />

      {/* Header / Navbar */}
      <header className="sticky top-0 z-50 bg-[#070A12]/85 backdrop-blur-xl border-b border-white/10 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          {/* Logo Area */}
          <div
            onClick={() => navigate("/landing")}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-cyan-400 p-[1px] shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40 transition duration-300">
              <div className="w-full h-full bg-[#0B0F1D] rounded-xl flex items-center justify-center">
                <Zap size={20} className="text-blue-400 fill-blue-400 group-hover:scale-110 transition duration-300" />
              </div>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1">
                <span className="text-xl font-black tracking-tight text-white font-display">
                  Social<span className="bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">Pilot</span>
                </span>
                <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded-md bg-blue-500/20 text-blue-300 border border-blue-400/30 ml-1">
                  Legal
                </span>
              </div>
              <span className="text-[9px] font-semibold uppercase tracking-widest text-slate-400">
                Privacy & Data Protection
              </span>
            </div>
          </div>

          {/* Navigation Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="hidden sm:inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 transition cursor-pointer"
              title="Print Privacy Policy"
            >
              <Printer size={14} />
              <span>Print</span>
            </button>
            <Link
              to="/landing"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/10 transition"
            >
              <ArrowLeft size={14} />
              <span>Home</span>
            </Link>
            <button
              onClick={() => navigate("/login")}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-600/20 transition cursor-pointer"
            >
              Sign In
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        {/* Hero Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-400/20 text-xs font-semibold text-blue-300 backdrop-blur-md">
            <ShieldCheck size={14} className="text-blue-400" />
            <span>Developer Platform & Meta Graph API Compliant</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white font-display">
            Privacy Policy
          </h1>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            Your privacy and data security are fundamental to our mission. This policy outlines how SocialPilot collects, handles, stores, and protects your information across all supported social channels.
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <strong>Effective Date:</strong> {effectiveDate}
            </span>
            <span>•</span>
            <span className="inline-flex items-center gap-1.5">
              <strong>Last Updated:</strong> {lastUpdated}
            </span>
          </div>
        </div>

        {/* Content Layout: Sticky TOC + Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Table of Contents (Desktop Sidebar) */}
          <aside className="hidden lg:block lg:col-span-4 sticky top-28 bg-[#0B0F1E]/90 border border-white/10 rounded-2xl p-5 backdrop-blur-xl shadow-xl space-y-3">
            <div className="flex items-center gap-2 pb-3 border-b border-white/10 text-xs font-bold uppercase tracking-wider text-slate-300">
              <FileText size={15} className="text-blue-400" />
              <span>Table of Contents</span>
            </div>
            <nav className="space-y-1 max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
              {sections.map((sec) => (
                <button
                  key={sec.id}
                  onClick={() => scrollToSection(sec.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs font-medium transition cursor-pointer ${
                    activeSection === sec.id
                      ? "bg-blue-600 text-white font-semibold shadow-xs"
                      : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                  }`}
                >
                  <span className="truncate">{sec.title}</span>
                  <ChevronRight size={13} className={activeSection === sec.id ? "text-white" : "text-slate-500"} />
                </button>
              ))}
            </nav>

            <div className="pt-3 border-t border-white/10">
              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[11px] text-slate-300 space-y-1.5">
                <p className="font-bold text-blue-300 flex items-center gap-1">
                  <Sparkles size={12} /> Data Privacy Office
                </p>
                <p className="text-slate-400">
                  Questions regarding this policy or Meta user data? Email our privacy team at{" "}
                  <span className="font-mono text-blue-300 select-all">privacy@socialpilot.example.com</span>.
                </p>
              </div>
            </div>
          </aside>

          {/* Main Legal Content */}
          <div className="lg:col-span-8 space-y-8">
            {/* Quick Summary Highlights Banner */}
            <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-purple-950/30 border border-blue-500/20 space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-blue-300 flex items-center gap-2">
                <CheckCircle2 size={16} className="text-blue-400" />
                Key Privacy Commitments
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-300">
                <div className="flex items-start gap-2 bg-white/5 p-2.5 rounded-xl border border-white/5">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span><strong>Zero Data Selling:</strong> We never sell, rent, or trade your personal or social account data.</span>
                </div>
                <div className="flex items-start gap-2 bg-white/5 p-2.5 rounded-xl border border-white/5">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span><strong>Secure OAuth 2.0:</strong> We never see or store your raw social account passwords.</span>
                </div>
                <div className="flex items-start gap-2 bg-white/5 p-2.5 rounded-xl border border-white/5">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span><strong>Full Data Control:</strong> You can disconnect accounts and request complete data deletion at any time.</span>
                </div>
                <div className="flex items-start gap-2 bg-white/5 p-2.5 rounded-xl border border-white/5">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span><strong>Enterprise Security:</strong> All data is encrypted in transit (TLS 1.3) and at rest (AES-256).</span>
                </div>
              </div>
            </div>

            {/* Section 1 */}
            <section id="introduction" className="p-6 sm:p-8 rounded-2xl bg-[#0B0F1E] border border-white/10 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-sm">
                  1
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white font-display">
                  Introduction & Scope
                </h2>
              </div>
              <div className="space-y-3 text-xs sm:text-sm text-slate-300 leading-relaxed">
                <p>
                  Welcome to <strong>SocialPilot</strong> (&ldquo;SocialPilot&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;). We provide a unified social media management, autonomous scheduling, campaign orchestration, and engagement analytics platform (the &ldquo;Service&rdquo;).
                </p>
                <p>
                  This Privacy Policy explains how we collect, process, store, and safeguard your personal information and social media platform data when you access our web application, register an account, or link third-party social accounts (such as Facebook, Instagram, LinkedIn, X/Twitter, and YouTube).
                </p>
                <p>
                  By registering for an account, accessing our platform, or linking any social account, you acknowledge that you have read and understood this Privacy Policy and agree to our processing of your information in accordance with these terms.
                </p>
              </div>
            </section>

            {/* Section 2 */}
            <section id="information-collected" className="p-6 sm:p-8 rounded-2xl bg-[#0B0F1E] border border-white/10 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-sm">
                  2
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white font-display">
                  Information We Collect
                </h2>
              </div>
              <div className="space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed">
                <p>We collect information that you directly provide to us, as well as data automatically generated when you interact with our platform:</p>
                
                <div className="space-y-3">
                  <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-1">
                    <h3 className="font-bold text-white text-sm">A. User Account & Profile Information</h3>
                    <p className="text-slate-300 text-xs">
                      When registering or configuring your workspace, we collect your name, email address, password hash (securely hashed with bcrypt), organization/company name, assigned role tier (Administrator, Marketing Lead, Business User, or Content Creator), job title, and optional profile avatar.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-1">
                    <h3 className="font-bold text-white text-sm">B. Content, Campaigns & Publishing Data</h3>
                    <p className="text-slate-300 text-xs">
                      We store post captions, hashtags, scheduled publishing dates/times, target platforms, campaign labels, and uploaded media attachments (images, videos) that you compose or upload through the SocialPilot Composer or Queue.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-1">
                    <h3 className="font-bold text-white text-sm">C. Technical & Log Data</h3>
                    <p className="text-slate-300 text-xs">
                      When accessing our workspace, our servers automatically log standard diagnostic information, including your IP address, browser user-agent, operating system, timestamped audit log events (such as logins, role modifications, and post dispatches), and session tokens.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 3 */}
            <section id="how-we-use" className="p-6 sm:p-8 rounded-2xl bg-[#0B0F1E] border border-white/10 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-sm">
                  3
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white font-display">
                  How We Use Your Information
                </h2>
              </div>
              <div className="space-y-3 text-xs sm:text-sm text-slate-300 leading-relaxed">
                <p>We process collected information strictly for legitimate operational purposes, including:</p>
                <ul className="space-y-2 pl-4 list-disc text-slate-300">
                  <li><strong>Executing Scheduled Publications:</strong> Disagreeing and delivering your scheduled posts, photos, and video media to your connected social channels at your designated times.</li>
                  <li><strong>Workspace Management & RBAC:</strong> Authenticating user accounts, enforcing role-based permissions, and managing collaborative team workflows.</li>
                  <li><strong>Performance Analytics & Reports:</strong> Retrieving public engagement data (likes, comments, reach, impressions) via official platform APIs to generate audience growth charts and executive reports.</li>
                  <li><strong>Security, Auditing & Troubleshooting:</strong> Detecting fraudulent or unauthorized access, maintaining immutable system audit logs, and ensuring infrastructure reliability.</li>
                  <li><strong>Service Communications:</strong> Sending essential system notifications, password reset links, and scheduled post status alerts.</li>
                </ul>
              </div>
            </section>

            {/* Section 4 */}
            <section id="social-account-data" className="p-6 sm:p-8 rounded-2xl bg-[#0B0F1E] border border-white/10 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-sm">
                  4
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white font-display">
                  Social Media Account Data & OAuth Authorization
                </h2>
              </div>
              <div className="space-y-3 text-xs sm:text-sm text-slate-300 leading-relaxed">
                <p>
                  To enable multi-platform publishing and analytics, SocialPilot connects to third-party social media platforms exclusively via standard <strong>OAuth 2.0 authorization flows</strong>.
                </p>
                <div className="p-4 rounded-xl bg-blue-950/30 border border-blue-500/20 text-xs text-slate-300 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-blue-300">
                    <Lock size={15} /> OAuth Security Principles
                  </div>
                  <ul className="list-disc pl-4 space-y-1 text-slate-300">
                    <li>We <strong>never</strong> request, receive, or store your social network login passwords.</li>
                    <li>Authorization tokens are received directly from the platform provider (Meta, LinkedIn, Google) through official OAuth callbacks.</li>
                    <li>Tokens are encrypted and stored in restricted databases with access limited solely to publishing workers.</li>
                    <li>You can disconnect any social channel at any moment from the <em>Accounts</em> dashboard.</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Section 5 - META & FACEBOOK SPECIFIC SECTION */}
            <section id="meta-data-usage" className="p-6 sm:p-8 rounded-2xl bg-[#0B0F1E] border border-blue-500/30 space-y-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 rounded-full blur-2xl pointer-events-none" />
              
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
                  <FaFacebook size={16} />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-white font-display">
                    Facebook & Meta Platform Data Usage
                  </h2>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">
                    Meta Platform Terms & Developer Policy Compliance
                  </span>
                </div>
              </div>

              <div className="space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed pt-2">
                <p>
                  SocialPilot complies strictly with the <strong>Meta Platform Terms</strong> and <strong>Developer Policies</strong>. When you connect a Facebook Page or Instagram Business Account via Meta Login / Facebook Graph API, we adhere to the following strict guidelines:
                </p>

                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl bg-white/5 border border-white/5">
                    <h3 className="font-bold text-white text-xs sm:text-sm mb-1 text-blue-300">
                      1. Permissions Requested & Specific Purposes
                    </h3>
                    <p className="text-xs text-slate-300 mb-2">
                      SocialPilot requests only the minimum permissions necessary to deliver social management features:
                    </p>
                    <ul className="list-disc pl-4 space-y-1 text-xs text-slate-300">
                      <li><code>pages_show_list</code>: To list and display the Facebook Pages you manage so you can choose which Page to connect to your workspace.</li>
                      <li><code>pages_read_engagement</code>: To retrieve Page follower counts, engagement stats, and post reactions for analytics reports.</li>
                      <li><code>pages_manage_posts</code>: To publish, schedule, or update content on your authorized Facebook Pages upon your explicit command.</li>
                      <li><code>read_insights</code>: To calculate aggregate Page impressions, reach trends, and performance over time.</li>
                      <li><code>instagram_basic</code> & <code>instagram_content_publish</code>: To manage and publish posts/reels to connected Instagram Professional profiles.</li>
                    </ul>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white/5 border border-white/5">
                    <h3 className="font-bold text-white text-xs sm:text-sm mb-1 text-blue-300">
                      2. Non-Transfer & Non-Sale of Meta User Data
                    </h3>
                    <p className="text-xs text-slate-300">
                      We explicitly do <strong>NOT</strong> sell, license, purchase, or exchange Meta user data or platform data. We do not transfer Meta user data to data brokers, ad networks, or credit agencies. Meta user data is never used for surveillance, background checks, or discriminatory decision-making.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white/5 border border-white/5">
                    <h3 className="font-bold text-white text-xs sm:text-sm mb-1 text-blue-300">
                      3. Token Storage & De-authorization Handling
                    </h3>
                    <p className="text-xs text-slate-300">
                      Page access tokens are stored securely in encrypted databases. If you de-authorize our app or disconnect your Page, access tokens are immediately purged, and no further API calls to Meta Graph endpoints are initiated.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 6 */}
            <section id="linkedin-instagram" className="p-6 sm:p-8 rounded-2xl bg-[#0B0F1E] border border-white/10 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-sm">
                  6
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white font-display">
                  LinkedIn & Instagram Data Handling
                </h2>
              </div>
              <div className="space-y-3 text-xs sm:text-sm text-slate-300 leading-relaxed">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-2">
                    <div className="flex items-center gap-2 text-sky-400 font-bold text-sm">
                      <FaLinkedin size={16} /> LinkedIn Marketing APIs
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      We utilize LinkedIn OAuth scopes (<code>w_member_social</code>, <code>r_organization_social</code>, <code>w_organization_social</code>) to publish text, links, and media to personal profiles and LinkedIn Company Pages. We only fetch public follower counts and engagement data to render your analytics dashboard.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-2">
                    <div className="flex items-center gap-2 text-pink-400 font-bold text-sm">
                      <FaInstagram size={16} /> Instagram Graph API
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      For connected Instagram Professional/Creator accounts, SocialPilot utilizes Meta&apos;s Content Publishing API to schedule single-image, carousel, and video posts. All interactions respect Instagram community standards and rate limits.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 7 */}
            <section id="data-storage-security" className="p-6 sm:p-8 rounded-2xl bg-[#0B0F1E] border border-white/10 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-sm">
                  7
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white font-display">
                  Data Storage, Security & Retention
                </h2>
              </div>
              <div className="space-y-3 text-xs sm:text-sm text-slate-300 leading-relaxed">
                <p>We deploy robust administrative, technical, and physical safeguards to preserve data integrity and prevent unauthorized access:</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 space-y-1">
                    <Server size={18} className="text-blue-400" />
                    <h4 className="font-bold text-white text-xs">Encryption in Transit</h4>
                    <p className="text-[11px] text-slate-400">All data transmitted between your browser and our servers uses TLS 1.3 encryption.</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 space-y-1">
                    <Lock size={18} className="text-indigo-400" />
                    <h4 className="font-bold text-white text-xs">Encryption at Rest</h4>
                    <p className="text-[11px] text-slate-400">Tokens, database records, and media files are encrypted at rest with AES-256 standard.</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 space-y-1">
                    <Eye size={18} className="text-cyan-400" />
                    <h4 className="font-bold text-white text-xs">Least-Privilege RBAC</h4>
                    <p className="text-[11px] text-slate-400">Internal database access is restricted via role boundaries and multi-factor authentication.</p>
                  </div>
                </div>
                <p className="text-xs text-slate-400 pt-2">
                  <strong>Data Retention Period:</strong> We retain account data as long as your workspace is active. When you delete a post, disconnect an account, or close your workspace, related records and tokens are permanently purged within 30 days.
                </p>
              </div>
            </section>

            {/* Section 8 */}
            <section id="data-sharing" className="p-6 sm:p-8 rounded-2xl bg-[#0B0F1E] border border-white/10 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-sm">
                  8
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white font-display">
                  Data Sharing & Third-Party Disclosures
                </h2>
              </div>
              <div className="space-y-3 text-xs sm:text-sm text-slate-300 leading-relaxed">
                <p>We do not share your personal information except in the following limited situations:</p>
                <ul className="space-y-2 pl-4 list-disc text-slate-300">
                  <li><strong>Target Social Networks:</strong> When you schedule a post, we transmit the text and media directly to the designated platform APIs (Meta, LinkedIn, X, etc.) per your instructions.</li>
                  <li><strong>Essential Cloud Infrastructure:</strong> Trusted hosting providers (e.g. database hosting, CDN, compute servers) bound by strict confidentiality and data protection agreements.</li>
                  <li><strong>Legal Requirements:</strong> If compelled by lawful court orders, subpoenas, or applicable regulatory bodies, we may disclose minimal necessary data.</li>
                </ul>
              </div>
            </section>

            {/* Section 9 */}
            <section id="user-rights" className="p-6 sm:p-8 rounded-2xl bg-[#0B0F1E] border border-white/10 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-sm">
                  9
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white font-display">
                  Your Privacy Rights (GDPR / CCPA / Global)
                </h2>
              </div>
              <div className="space-y-3 text-xs sm:text-sm text-slate-300 leading-relaxed">
                <p>Regardless of your geographic location, SocialPilot guarantees the following core privacy rights:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-1">
                    <p className="font-bold text-white text-xs">Right to Access & Portability</p>
                    <p className="text-[11px] text-slate-400">Request a complete copy of personal records and post logs stored in your account.</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-1">
                    <p className="font-bold text-white text-xs">Right to Rectification</p>
                    <p className="text-[11px] text-slate-400">Update or correct inaccurate profile details directly inside Settings.</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-1">
                    <p className="font-bold text-white text-xs">Right to Erasure (&ldquo;Forget Me&rdquo;)</p>
                    <p className="text-[11px] text-slate-400">Request permanent deletion of your workspace data and connected channel tokens.</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-1">
                    <p className="font-bold text-white text-xs">Right to Revoke Consent</p>
                    <p className="text-[11px] text-slate-400">Revoke social network permissions at any time without terminating your account.</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 10 - DATA DELETION GUIDE (META APP REVIEW COMPLIANT) */}
            <section id="data-deletion" className="p-6 sm:p-8 rounded-2xl bg-[#0B0F1E] border border-blue-500/30 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-rose-600/20 border border-rose-500/30 flex items-center justify-center text-rose-400 font-bold text-sm">
                  <Trash2 size={16} />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-white font-display">
                    User Data Deletion & Revocation Instructions
                  </h2>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">
                    Meta Data Deletion Callback & Step-by-Step Procedure
                  </span>
                </div>
              </div>

              <div className="space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed pt-2">
                <p>
                  In compliance with Meta Platform Policies and international privacy regulations, SocialPilot provides clear, straightforward methods for users to request or execute complete data deletion:
                </p>

                {/* Option 1: In-App Instant Disconnection */}
                <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-2">
                  <h3 className="font-bold text-white text-sm flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">1</span>
                    Method 1: Direct In-App Channel Disconnection
                  </h3>
                  <ol className="list-decimal pl-5 space-y-1 text-xs text-slate-300">
                    <li>Sign in to your SocialPilot workspace and navigate to <strong>Accounts</strong>.</li>
                    <li>Locate the connected social profile (Facebook Page, Instagram, LinkedIn, etc.).</li>
                    <li>Click the <strong>Disconnect (Trash)</strong> button and confirm the prompt.</li>
                    <li>The access token and associated channel sync records will be deleted immediately from our active database.</li>
                  </ol>
                </div>

                {/* Option 2: Revoking via Facebook Settings */}
                <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-2">
                  <h3 className="font-bold text-white text-sm flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">2</span>
                    Method 2: Revoke Access Directly on Facebook / Meta
                  </h3>
                  <ol className="list-decimal pl-5 space-y-1 text-xs text-slate-300">
                    <li>Log in to your Facebook account and go to <strong>Settings &amp; Privacy &gt; Settings</strong>.</li>
                    <li>Select <strong>Apps and Websites</strong> from the left sidebar navigation.</li>
                    <li>Find <strong>SocialPilot</strong> in your active authorized apps list.</li>
                    <li>Click <strong>Remove</strong>. You can optionally check the box to delete all posts published by SocialPilot.</li>
                    <li>Facebook will issue a deauthorization notice, and all tokens will be invalidated immediately.</li>
                  </ol>
                </div>

                {/* Option 3: Formal Data Deletion Request via Email */}
                <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-2">
                  <h3 className="font-bold text-white text-sm flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">3</span>
                    Method 3: Submit a Formal Data Deletion Request
                  </h3>
                  <p className="text-xs text-slate-300">
                    To request the complete deletion of your user account, workspace records, uploaded media files, and audit logs, submit an email request to our Data Protection Office:
                  </p>
                  <div className="p-3 rounded-lg bg-[#070A14] border border-white/10 font-mono text-xs space-y-1">
                    <p className="text-slate-400">To: <span className="text-blue-300">privacy@socialpilot.example.com</span></p>
                    <p className="text-slate-400">Subject: <span className="text-slate-200">Data Deletion Request - [Your Registered Email]</span></p>
                    <p className="text-slate-400">Body: <span className="text-slate-300">Please permanently delete my SocialPilot account, connected social tokens, and all associated workspace data.</span></p>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Requests are confirmed within 48 hours and completed within 30 days. You will receive a final confirmation email containing a verification code upon completion.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 11 */}
            <section id="cookies-storage" className="p-6 sm:p-8 rounded-2xl bg-[#0B0F1E] border border-white/10 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-sm">
                  11
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white font-display">
                  Cookies & Browser Local Storage
                </h2>
              </div>
              <div className="space-y-3 text-xs sm:text-sm text-slate-300 leading-relaxed">
                <p>
                  SocialPilot utilizes browser local storage and essential session cookies strictly required for core application operations:
                </p>
                <div className="space-y-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-white/5 border border-white/5 flex items-center justify-between">
                    <div>
                      <span className="font-mono font-bold text-blue-300">socialpilot_token</span>
                      <p className="text-slate-400 text-[11px]">Stores your encrypted JWT authentication session token.</p>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/30">Essential</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white/5 border border-white/5 flex items-center justify-between">
                    <div>
                      <span className="font-mono font-bold text-blue-300">socialpilot_user</span>
                      <p className="text-slate-400 text-[11px]">Caches non-sensitive profile parameters (name, role, avatar) for responsive UI rendering.</p>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/30">Functional</span>
                  </div>
                </div>
                <p className="text-xs text-slate-400">
                  We do not use invasive third-party tracking pixels or sell cross-site advertising cookies.
                </p>
              </div>
            </section>

            {/* Section 12 */}
            <section id="policy-changes" className="p-6 sm:p-8 rounded-2xl bg-[#0B0F1E] border border-white/10 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-sm">
                  12
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white font-display">
                  Changes to This Privacy Policy
                </h2>
              </div>
              <div className="space-y-3 text-xs sm:text-sm text-slate-300 leading-relaxed">
                <p>
                  We may periodically update this Privacy Policy to reflect changes in our technical architecture, product features, or evolving platform policies (including Meta Developer Policies).
                </p>
                <p>
                  When material modifications occur, we will update the &ldquo;Last Updated&rdquo; date at the top of this page and notify active workspace administrators via an in-app banner or registered email notification.
                </p>
              </div>
            </section>

            {/* Section 13 - CONTACT INFORMATION */}
            <section id="contact-us" className="p-6 sm:p-8 rounded-2xl bg-[#0B0F1E] border border-white/10 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-sm">
                  13
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white font-display">
                  Contact Information & Inquiries
                </h2>
              </div>
              <div className="space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed">
                <p>
                  If you have questions, feedback, or requests regarding this Privacy Policy or our compliance with Meta Platform Policies, please contact our dedicated teams:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-blue-400 font-bold text-xs">
                      <Mail size={15} /> Privacy Office
                    </div>
                    <p className="text-[11px] text-slate-400">For GDPR, CCPA, and data deletion requests</p>
                    <p className="font-mono text-xs text-slate-200 select-all font-semibold">privacy@socialpilot.example.com</p>
                  </div>

                  <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs">
                      <ShieldCheck size={15} /> Security & DPO
                    </div>
                    <p className="text-[11px] text-slate-400">Data Protection Officer & vulnerability reports</p>
                    <p className="font-mono text-xs text-slate-200 select-all font-semibold">security@socialpilot.example.com</p>
                  </div>

                  <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-indigo-400 font-bold text-xs">
                      <Zap size={15} /> Support Desk
                    </div>
                    <p className="text-[11px] text-slate-400">Workspace settings and account assistance</p>
                    <p className="font-mono text-xs text-slate-200 select-all font-semibold">support@socialpilot.example.com</p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900 border border-white/5 text-xs text-slate-400 flex items-center justify-between">
                  <span>SocialPilot Technologies • Automated Social Media & Multi-Platform Publishing OS</span>
                  <button
                    onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                    className="text-blue-400 hover:text-blue-300 font-semibold cursor-pointer"
                  >
                    Back to Top ↑
                  </button>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* Sleek Minimal Footer */}
      <footer className="border-t border-white/5 bg-[#05070D] py-10 px-6 text-xs text-slate-500 mt-16">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
              <Zap size={14} className="text-blue-400 fill-blue-400" />
            </div>
            <span className="font-bold text-slate-300 font-display">SocialPilot</span>
            <span>– Enterprise Social Media Operations Platform</span>
          </div>

          <div className="flex items-center gap-6">
            <Link to="/privacy-policy" className="text-blue-400 font-semibold hover:underline">
              Privacy Policy
            </Link>
            <Link to="/landing" className="hover:text-slate-300 transition">
              Home
            </Link>
            <Link to="/login" className="hover:text-slate-300 transition">
              Sign In
            </Link>
            <p>© 2026 SocialPilot Technologies. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
