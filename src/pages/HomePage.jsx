import "./Homepage.css";
import { Link } from "react-router-dom";

export default function HomePage() {
  const stats = [
    { label: "CHANNELS", value: "5" },
    { label: "POSTS / MONTH", value: "200" },
    { label: "AVG ENGAGEMENT", value: "4.8%" },
    { label: "PUBLISH ACCURACY", value: "99.4%" },
  ];

  const features = [
    {
      title: "Scheduling",
      text: "Queue posts, recurring slots and drafts on a single publishing calendar across every connected channel.",
    },
    {
      title: "Multi-platform publishing",
      text: "Automatic cross-posting with status tracking, publishing logs and retry on failed deliveries.",
    },
    {
      title: "Campaigns & analytics",
      text: "Group content into campaigns, track budget and engagement, and export reports for the whole team.",
    },
  ];

  return (
    <div className="home">
      <header className="navbar">
        <div className="brand">
          <div className="logo">S</div>
          <span>SocialPilot</span>
        </div>

        <nav>
          <Link to="/login" className="signin">
            Sign in
          </Link>

          <Link to="/register" className="create-btn">
            Create account
          </Link>
        </nav>
      </header>

      <main className="container">
        <section className="hero">
          <p className="eyebrow">SOCIAL MEDIA COMMAND CENTER</p>

          <h1>
            Plan, publish and measure every channel from one control dashboard.
          </h1>

          <p className="hero-text">
            SocialPilot brings scheduling, multi-platform publishing, campaign
            tracking and engagement analytics together so creators and marketing
            teams stop juggling tabs.
          </p>

          <div className="hero-actions">
            <Link to="/register" className="primary">
              Get started
            </Link>

            <Link to="/login" className="secondary">
              View the dashboard
            </Link>
          </div>
        </section>

        <section className="stats">
          {stats.map((item) => (
            <div className="stat-card" key={item.label}>
              <span>{item.label}</span>
              <h2>{item.value}</h2>
            </div>
          ))}
        </section>

        <section className="features">
          {features.map((feature) => (
            <div className="feature-card" key={feature.title}>
              <h3>{feature.title}</h3>
              <p>{feature.text}</p>
            </div>
          ))}
        </section>

        <section className="insight">
          <h3>Pulse Insight</h3>

          <p>
            Post performance is 22% higher when publishing between 9:00 AM and
            10:30 AM EST on Tuesdays.
          </p>

          <button>Start scheduling</button>
        </section>
      </main>

      <footer className="footer">
        <p>© 2026 SocialPilot</p>

        <Link to="/login">Sign in</Link>
      </footer>
    </div>
  );
}