import React, { useState } from 'react';
import { Mail, Lock, User, Shield, ArrowRight, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { jwtDecode } from 'jwt-decode';
const Auth = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('Content Creator');

  const API_BASE = 'http://localhost:8000';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        // Log in
        const response = await fetch(`${API_BASE}/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.detail || 'Failed to sign in. Please check your credentials.');
        }

        // Save token and notify parent
        localStorage.setItem('token', data.access_token);
        onAuthSuccess(data.access_token);
      } else {
        // Register
        const response = await fetch(`${API_BASE}/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name, email, password, role }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.detail || 'Registration failed. Try a different email.');
        }

        // Successfully registered! Let's auto-log them in
        const loginResponse = await fetch(`${API_BASE}/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
        });

        const loginData = await loginResponse.json();

        if (!loginResponse.ok) {
          throw new Error('Account created, but automatic sign in failed. Please log in manually.');
        }

        localStorage.setItem('token', loginData.access_token);
        onAuthSuccess(loginData.access_token);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center relative overflow-hidden px-4 select-none font-sans">
      {/* Decorative Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-200/40 rounded-full blur-3xl" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-violet-200/40 rounded-full blur-3xl" />
      
      {/* Floating Sparkle Card Decoration */}
      <div className="absolute top-1/4 right-1/4 w-12 h-12 bg-white/20 border border-white/40 rounded-2xl rotate-12 backdrop-blur-xs hidden md:block" />
      <div className="absolute bottom-1/4 left-1/4 w-8 h-8 bg-white/20 border border-white/40 rounded-xl -rotate-12 backdrop-blur-xs hidden md:block" />

      {/* Auth Card */}
      <div className="w-full max-w-md bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-2xl shadow-xl p-8 relative z-10 transition-all duration-300">
        
        {/* Logo/Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <span className="text-white font-extrabold text-xl tracking-tighter">SP</span>
          </div>
        </div>

        {/* Form Title */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            {isLogin ? 'Welcome back!' : 'Create your account'}
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            {isLogin ? 'Access your unified social media dashboard.' : 'Start scheduling and analyzing today.'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-100/80 p-1 rounded-xl mb-6">
          <button
            onClick={() => { setIsLogin(true); setError(''); }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              isLogin ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setIsLogin(false); setError(''); }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              !isLogin ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Register
          </button>
        </div>

        {/* Error State */}
        {error && (
          <div className="flex items-start gap-2 bg-rose-50 border border-rose-200/80 text-rose-700 text-xs font-medium p-3 rounded-xl mb-6">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Name Field (Sign Up Only) */}
          {!isLogin && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600">Full Name</label>
              <div className="relative flex items-center">
                <User className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                <input
                  type="text"
                  required={!isLogin}
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-xs text-slate-800 pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none focus:ring-3 focus:ring-indigo-500/10 transition-all"
                />
              </div>
            </div>
          )}

          {/* Email Field */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600">Email Address</label>
            <div className="relative flex items-center">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full text-xs text-slate-800 pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none focus:ring-3 focus:ring-indigo-500/10 transition-all"
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600">Password</label>
            <div className="relative flex items-center">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full text-xs text-slate-800 pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none focus:ring-3 focus:ring-indigo-500/10 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 text-slate-400 hover:text-slate-600 focus:outline-none"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Role Selection Field (Sign Up Only) */}
          {!isLogin && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600">Account Role</label>
              <div className="relative flex items-center">
                <Shield className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full text-xs text-slate-800 pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none focus:ring-3 focus:ring-indigo-500/10 transition-all appearance-none"
                >
                  <option value="Content Creator">Content Creator</option>
                  <option value="Administrator">Administrator</option>
                </select>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white text-xs font-semibold py-2.5 rounded-xl shadow-md shadow-indigo-600/10 transition-all duration-150 disabled:opacity-75 disabled:pointer-events-none"
          >
            {loading ? (
              <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <>
                <span>{isLogin ? 'Sign In' : 'Create Account'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer Toggle Text */}
        <p className="text-center text-[11px] text-slate-500 mt-6">
          {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
          <button
            onClick={() => { setIsLogin(!isLogin); setError(''); }}
            className="font-bold text-indigo-600 hover:text-indigo-800 transition-colors bg-transparent border-0 p-0 cursor-pointer"
          >
            {isLogin ? 'Sign up free' : 'Sign in here'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default Auth;
