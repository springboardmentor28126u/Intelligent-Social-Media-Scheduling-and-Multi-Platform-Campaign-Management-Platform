import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Eye, EyeOff, ArrowRight, Loader2, Shield } from 'lucide-react';
import AuthLayout from '@/components/auth/AuthLayout';
import Button from '@/components/common/Button';
import { useAuth } from '@/contexts/AuthContext';
import {
  SIGNUP_ROLES,
  ROLE_CONFIGS,
  type SignupRoleName,
} from '@/lib/permissions';

export default function SignUp() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<SignupRoleName>('Content Creator');
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
      title="Claim Your Spot!"
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

        {/* Role-Based Sign Up Selector */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wider text-ink-500">
              Select Your Role of Access
            </label>
            <span className="text-[11px] font-medium text-brand-600">
              Workspace role
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {SIGNUP_ROLES.map((r) => {
              const config = ROLE_CONFIGS[r];
              const Icon = config.icon;
              const isSelected = role === r;

              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`flex flex-col items-start rounded-xl border p-3 text-left transition-all relative ${
                    isSelected
                      ? 'border-brand-500 bg-brand-50/50 ring-2 ring-brand-500/20 shadow-sm'
                      : 'border-ink-100 bg-white hover:border-ink-200 hover:bg-ink-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                        isSelected
                          ? 'bg-brand-600 text-white'
                          : 'bg-ink-100 text-ink-500'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    {isSelected && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-white text-[10px] font-bold">
                        ✓
                      </span>
                    )}
                  </div>

                  <p className="text-xs font-semibold text-ink-900">{config.label}</p>
                  <p className="mt-1 text-[11px] text-ink-500 leading-snug">
                                    
                  </p>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1.5 pt-1 text-[11px] text-ink-400">
            <Shield className="h-3.5 w-3.5 text-ink-400 shrink-0" />
            <span>Administrator access requires an invite from an existing team admin.</span>
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
              Creating account as {role}...
            </>
          ) : (
            <>
              Get Started as {role}
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
