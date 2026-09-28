"use client";

import { useState, FormEvent } from "react";
import Navbar from "@/components/navbar/Navbar";
import Footer from "@/components/footer/Footer";
import { Mail, Phone, MapPin, Clock, Send, CheckCircle2, MessageSquare } from "lucide-react";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name || !email || !message) return;
    setSent(true);
    setName("");
    setEmail("");
    setSubject("");
    setMessage("");
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
      <Navbar />

      {/* Header */}
      <section className="pt-16 pb-12 bg-white border-b border-slate-200 text-center">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <span className="text-xs font-bold uppercase tracking-wider text-[#635BFF]">Support & Inquiries</span>
          <h1 className="mt-3 text-4xl font-extrabold text-slate-900 sm:text-5xl">
            Get in touch with us
          </h1>
          <p className="mt-4 text-base text-slate-600">
            Have questions about our multi-platform scheduler or enterprise plans? We're here to help.
          </p>
        </div>
      </section>

      {/* Main Contact Grid */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
            
            {/* Form */}
            <div className="rounded-3xl border border-slate-200 bg-white p-8 sm:p-10 shadow-xs">
              <h3 className="text-xl font-bold text-slate-900">Send us a message</h3>
              <p className="mt-1 text-xs text-slate-500">Fill out the form and our team will get back to you shortly.</p>

              {sent && (
                <div className="mt-6 rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-xs font-medium text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Thank you! Your message has been sent. We will respond within 2 business hours.</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Full Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Chandu Verma"
                    className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-xs text-slate-900 focus:border-[#635BFF] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">Work Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="chandu@company.com"
                    className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-xs text-slate-900 focus:border-[#635BFF] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">Subject</label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Question regarding multi-platform AI scheduling"
                    className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-xs text-slate-900 focus:border-[#635BFF] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">Message</label>
                  <textarea
                    rows={4}
                    required
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Tell us about your team's workflow and what you're looking to achieve..."
                    className="mt-1.5 w-full rounded-xl border border-slate-200 p-4 text-xs text-slate-900 focus:border-[#635BFF] focus:outline-none resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#635BFF] py-3 text-sm font-semibold text-white shadow-md shadow-[#635BFF]/25 hover:bg-[#5046E5] transition-all"
                >
                  <Send className="h-4 w-4" />
                  Send Message
                </button>
              </form>
            </div>

            {/* Direct Info */}
            <div className="space-y-8 flex flex-col justify-center">
              
              <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xs space-y-6">
                <h3 className="text-lg font-bold text-slate-900">Direct Contact Information</h3>
                
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-[#635BFF] shrink-0">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Email Inquiries</h4>
                    <p className="text-xs text-slate-600 mt-0.5">support@intellipost.com</p>
                    <p className="text-xs text-slate-600">sales@intellipost.com</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-[#7C3AED] shrink-0">
                    <Phone className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Phone Support</h4>
                    <p className="text-xs text-slate-600 mt-0.5">+91 98765 43210</p>
                    <p className="text-[10px] text-slate-400">Monday - Friday (9:00 AM - 6:00 PM IST)</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 text-[#06B6D4] shrink-0">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Headquarters</h4>
                    <p className="text-xs text-slate-600 mt-0.5">Bengaluru & Hyderabad, India</p>
                    <p className="text-[10px] text-slate-400">Global remote support available 24/7</p>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-purple-50 p-6">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-[#635BFF]" />
                  <h4 className="text-xs font-bold text-indigo-950">Fast Response Guarantee</h4>
                </div>
                <p className="mt-2 text-xs text-indigo-900/80 leading-relaxed">
                  Our dedicated product specialists respond to all questions and integration requests within 2 hours during active business hours.
                </p>
              </div>

            </div>

          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
