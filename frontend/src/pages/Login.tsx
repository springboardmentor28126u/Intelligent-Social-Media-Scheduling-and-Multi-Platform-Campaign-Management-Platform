import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { Zap, Lock, Mail, ArrowRight } from "lucide-react";
import { FcGoogle } from "react-icons/fc";

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, loginWithToken, roleChangeNotice, setRoleChangeNotice, showToast } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check for Google OAuth callback parameters
  useEffect(() => {
    const googleToken = searchParams.get("google_token");
    const refreshToken = searchParams.get("refresh_token") || undefined;
    const oauthError = searchParams.get("error");
    const errorDesc = searchParams.get("error_description");

    if (googleToken) {
      setLoading(true);
      loginWithToken(googleToken, refreshToken)
        .then(() => {
          navigate("/");
        })
        .catch((err: any) => {
          setError(err.message || "Failed to complete Google Sign In.");
        })
        .finally(() => {
          setLoading(false);
        });
    } else if (oauthError) {
      setError(errorDesc || `Authentication failed (${oauthError}).`);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError("Please enter both email and password.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await login(email, password);
      navigate("/");
    } catch (err: any) {
      setError(err.message || "Invalid credentials. Please verify your email and password.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError(null);
    try {
      const res = await api.auth.getGoogleUrl();
      if (res.auth_url) {
        window.location.href = res.auth_url;
      } else {
        setError(res.message || "Google OAuth is not configured on the server. Please set GOOGLE_CLIENT_ID in .env");
        showToast("Configuration Needed", "Google Client ID is not configured.", "warning");
      }
    } catch (err: any) {
      setError(err.message || "Failed to initialize Google Login.");
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-3">
        <div
          className="inline-flex items-center gap-3 cursor-pointer"
          onClick={() => navigate("/landing")}
        >
          <div className="w-11 h-11 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
            <Zap size={24} className="text-white fill-white" />
          </div>
          <span className="text-3xl font-black tracking-tight text-slate-900 font-display">
            Social<span className="text-blue-600">Pilot</span>
          </span>
        </div>

        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-display">
          Welcome back
        </h2>
        <p className="text-sm text-slate-500">
          Sign in to your account to continue.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md space-y-6">
        {/* Notice when redirected after role change or session expiry */}
        {roleChangeNotice && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm font-medium space-y-1 shadow-xs animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-800 flex items-center gap-1.5">
                ⚠️ Authentication Required
              </span>
              <button
                onClick={() => setRoleChangeNotice(null)}
                className="text-amber-600 hover:text-amber-800 font-bold"
              >
                ✕
              </button>
            </div>
            <p>{roleChangeNotice}</p>
          </div>
        )}

        {/* Standard Production Sign In Form */}
        <div className="bg-white py-8 px-6 sm:px-8 border border-slate-200 rounded-3xl shadow-sm space-y-6">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm font-semibold">
              {error}
            </div>
          )}

          {/* Google Login Button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={googleLoading || loading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold shadow-xs transition cursor-pointer text-sm disabled:opacity-60"
          >
            <FcGoogle size={20} />
            <span>{googleLoading ? "Connecting to Google..." : "Continue with Google"}</span>
          </button>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-200 w-full" />
            <span className="bg-white px-3 text-xs font-bold uppercase tracking-wider text-slate-400">
              or with email
            </span>
            <div className="border-t border-slate-200 w-full" />
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail size={17} className="absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                >
                  Forgot password?
                </Link>
              </div>

              <div className="relative">
                <Lock size={17} className="absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-md shadow-blue-600/25 transition cursor-pointer text-sm"
            >
              <span>{loading ? "Signing in..." : "Sign In"}</span>
              <ArrowRight size={16} />
            </button>
          </form>

          <div className="pt-4 border-t border-slate-100 text-center text-xs text-slate-500">
            Don't have an account?{" "}
            <Link to="/register" className="font-bold text-blue-600 hover:text-blue-700">
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
