import { Link } from "react-router-dom";
import "./PasswordRecovery.css";

function PasswordRecovery({ reset = false }) {
  return <main className="recovery-page">
    <section className="recovery-panel">
      <Link className="recovery-brand" to="/">SocialPilot</Link>
      <p className="eyebrow">ACCOUNT SECURITY</p>
      <h1>{reset ? "Reset your password" : "Forgot your password?"}</h1>
      <p className="recovery-description">{reset ? "Password reset links are not available for this account yet." : "Password recovery is not configured for this SocialPilot installation yet."}</p>
      <div className="recovery-notice" role="status">Contact your workspace administrator for help restoring account access.</div>
      {reset ? <label className="recovery-label">New password<input type="password" disabled placeholder="Password reset is unavailable" /></label> : <label className="recovery-label">Email address<input type="email" disabled placeholder="Password recovery is unavailable" /></label>}
      <button className="recovery-submit" type="button" disabled>{reset ? "Reset unavailable" : "Send recovery link unavailable"}</button>
      <Link className="recovery-return" to="/login">Return to login</Link>
    </section>
  </main>;
}

export function ForgotPassword() { return <PasswordRecovery />; }
export function ResetPassword() { return <PasswordRecovery reset />; }