import { useState } from 'react'
import {
  Compass,
  CheckCircle,
  ArrowRight,
  Lock,
  Mail,
  User,
  Eye,
  EyeOff,
  Sparkles,
  Shield,
  Zap,
} from 'lucide-react'

export const Auth = ({
  email,
  setEmail,
  name,
  setName,
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  isRegister,
  setIsRegister,
  onSubmit,
  isLoading = false,
  errorMessage = '',
}) => {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className="auth-container-fullscreen">
      {/* Left Column: SaaS Product Showcase */}
      <div className="auth-hero-panel">
        <div className="hero-brand">
          <div className="brand-icon-large">
            <Compass size={28} />
          </div>
          <span className="brand-name-large">SocialPilot</span>
        </div>

        <div className="hero-content">
          <div className="hero-badge">
            <Sparkles size={14} />
            <span>Next-Gen Social Media Management</span>
          </div>

          <h1 className="hero-headline">
            Plan content clearly. <br />
            <span className="hero-gradient-text">Grow effortlessly.</span>
          </h1>

          <p className="hero-description">
            The unified social management workspace designed for Creators, Marketing Teams, and Businesses to orchestrate campaigns across Instagram, Facebook, LinkedIn, and X with precision.
          </p>

          <div className="hero-features-list">
            <div className="feature-item">
              <div className="feature-icon">
                <CheckCircle size={18} />
              </div>
              <div className="feature-text">
                <strong>Multi-Network Scheduling:</strong> Craft once, preview, and schedule across all your connected channels.
              </div>
            </div>

            <div className="feature-item">
              <div className="feature-icon">
                <Shield size={18} />
              </div>
              <div className="feature-text">
                <strong>Role-Based Workspaces:</strong> Dedicated interfaces for Creators, Marketing Managers, and Administrators.
              </div>
            </div>

            <div className="feature-item">
              <div className="feature-icon">
                <Zap size={18} />
              </div>
              <div className="feature-text">
                <strong>Workspace Analytics & Calendar:</strong> Visual timelines and campaign insights based on current workspace data.
              </div>
            </div>
          </div>
        </div>

        <div className="hero-footer">
          <div className="social-proof-chip">
            <div className="avatar-group">
              <span className="avatar-pill">JD</span>
              <span className="avatar-pill bg-emerald">SK</span>
              <span className="avatar-pill bg-sky">AR</span>
            </div>
            <span>Trusted by creators & marketing teams worldwide</span>
          </div>
        </div>
      </div>

      {/* Right Column: Modern Authentication Form */}
      <div className="auth-form-panel">
        <div className="auth-card-modern">
          <div className="auth-header">
            <h2 className="auth-title">
              {isRegister ? 'Create your account' : 'Welcome back'}
            </h2>
            <p className="auth-subtitle">
              {isRegister
                ? 'Join SocialPilot to start managing your campaigns.'
                : 'Enter your credentials to access your workspace.'}
            </p>
          </div>

          {errorMessage && (
            <div className="auth-alert error">
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={onSubmit} className="auth-form">
            {isRegister && (
              <div className="form-group-modern">
                <label className="form-label">Full Name</label>
                <div className="input-with-icon">
                  <User size={18} className="input-icon" />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Alex Morgan"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required={isRegister}
                  />
                </div>
              </div>
            )}

            <div className="form-group-modern">
              <label className="form-label">Work Email</label>
              <div className="input-with-icon">
                <Mail size={18} className="input-icon" />
                <input
                  type="email"
                  className="form-input"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group-modern">
              <div className="label-row">
                <label className="form-label">Password</label>
              </div>
              <div className="input-with-icon">
                <Lock size={18} className="input-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="btn-toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {isRegister && (
              <div className="form-group-modern">
                <label className="form-label">Confirm Password</label>
                <div className="input-with-icon">
                  <Lock size={18} className="input-icon" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="form-input"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required={isRegister}
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary btn-block btn-auth-submit mt-4"
              disabled={isLoading}
            >
              <span>{isLoading ? 'Processing...' : isRegister ? 'Create Account' : 'Sign In'}</span>
              <ArrowRight size={18} />
            </button>
          </form>

          <div className="auth-footer-toggle">
            <p>
              {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button
                type="button"
                className="btn-link"
                onClick={() => {
                  setIsRegister(!isRegister)
                  setPassword('')
                  setConfirmPassword('')
                }}
              >
                {isRegister ? 'Sign In' : 'Create an account'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Auth
