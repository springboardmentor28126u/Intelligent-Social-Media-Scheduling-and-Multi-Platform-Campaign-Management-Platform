import "./UI.css";

export function PageHeader({ eyebrow, title, description, actions, className = "" }) {
  return <header className={`page-heading shared-page-header ${className}`}>
    <div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1>{description && <p>{description}</p>}</div>
    {actions && <div className="shared-page-header-actions">{actions}</div>}
  </header>;
}

export function StatusBadge({ value }) {
  const normalized = String(value || "unknown").toLowerCase().replace(/[^a-z0-9-]/g, "-");
  return <span className={`status-pill status-${normalized}`}>{value || "Unknown"}</span>;
}

export function EmptyState({ title, description, className = "" }) {
  return <div className={`shared-empty-state ${className}`}>
    <span aria-hidden="true">—</span>
    <strong>{title}</strong>
    {description && <p>{description}</p>}
  </div>;
}