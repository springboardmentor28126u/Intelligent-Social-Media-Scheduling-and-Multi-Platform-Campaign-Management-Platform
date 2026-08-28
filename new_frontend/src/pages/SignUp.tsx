import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Eye, EyeOff, ArrowRight, Loader2, Shield, PenTool } from 'lucide-react';
import AuthLayout from '@/components/auth/AuthLayout';
import Button from '@/components/common/Button';
import { useAuth } from '@/contexts/AuthContext';
import type { UserRole } from '@/lib/supabase';

export default function SignUp() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('creator');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error } = await signUp(email, password, fullName, role);
    setSubmitting(false);
    if (error) {
      setError(error);
    } else {
      navigate('/app');
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start managing your social presence today."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/signin" className="font-semibold text-brand-600 hover:text-brand-700">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-xl border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700">
            {error}
          </div>
        )}

        {/* Role selector */}
        <div>
          <label className="text-xs font-medium text-ink-500">I want to</label>
          <div className="mt-1.5 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setRole('creator')}
              className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition-all ${
                role === 'creator'
                  ? 'border-brand-300 bg-brand-50/50 ring-2 ring-brand-500/10'
                  : 'border-ink-100 hover:border-ink-200 hover:bg-ink-50/50'
              }`}
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${role === 'creator' ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-500'}`}>
                <PenTool className="h-5 w-5" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-ink-900">Content Creator</p>
                <p className="mt-0.5 text-xs text-ink-400">Create & schedule posts</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setRole('admin')}
              className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition-all ${
                role === 'admin'
                  ? 'border-brand-300 bg-brand-50/50 ring-2 ring-brand-500/10'
                  : 'border-ink-100 hover:border-ink-200 hover:bg-ink-50/50'
              }`}
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${role === 'admin' ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-500'}`}>
                <Shield className="h-5 w-5" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-ink-900">Admin</p>
                <p className="mt-0.5 text-xs text-ink-400">Manage users & overview</p>
              </div>
            </button>
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-ink-500">Full name</label>
          <div className="relative mt-1.5">
            <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your name"
              className="w-full rounded-xl border border-ink-100 bg-ink-50/30 py-2.5 pl-10 pr-4 text-sm text-ink-800 placeholder:text-ink-400 transition-all focus:border-brand-300 focus:bg-white focus:ring-2 focus:ring-brand-500/10"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-ink-500">Email</label>
          <div className="relative mt-1.5">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-xl border border-ink-100 bg-ink-50/30 py-2.5 pl-10 pr-4 text-sm text-ink-800 placeholder:text-ink-400 transition-all focus:border-brand-300 focus:bg-white focus:ring-2 focus:ring-brand-500/10"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-ink-500">Password</label>
          <div className="relative mt-1.5">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
              type={showPassword ? 'text' : 'password'}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              className="w-full rounded-xl border border-ink-100 bg-ink-50/30 py-2.5 pl-10 pr-10 text-sm text-ink-800 placeholder:text-ink-400 transition-all focus:border-brand-300 focus:bg-white focus:ring-2 focus:ring-brand-500/10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <Button type="submit" variant="primary" size="lg" fullWidth disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating account...
            </>
          ) : (
            <>
              Get Started Free
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>

        <p className="text-center text-xs text-ink-400">
          By signing up, you agree to our Terms and Privacy Policy.
        </p>
      </form>
    </AuthLayout>
  );
}
