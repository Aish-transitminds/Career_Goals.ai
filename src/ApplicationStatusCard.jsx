import React from "react";

const ICONS = {
  changed: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3 2 21h20z" /><path d="M12 10v5M12 18h.01" />
    </svg>
  ),
  verified: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m5 12 5 5L20 7" />
    </svg>
  ),
  progress: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
    </svg>
  ),
};

const LABELS = { changed: "Changed", verified: "Verified", progress: "In progress" };

/**
 * items: [{ id, university, programme, status: "changed" | "verified" | "progress" }]
 * auditorActive: boolean (omit/false to hide the line)
 * provenance: string, e.g. "100% Provenance" (omit to hide the line)
 */
export default function ApplicationStatusCard({
  items = [],
  cycle = new Date().getFullYear(),
  auditorActive = false,
  provenance,
}) {
  return (
    <section className="atlas-card" aria-label="Your applications">
      <header className="atlas-card__head">
        <div className="atlas-card__title">
          <span className="atlas-dot" aria-hidden="true" />
          <h2>Your Applications</h2>
        </div>
        <span className="atlas-chip">CYCLE {cycle}</span>
      </header>

      {items.length === 0 ? (
        <p className="atlas-empty">No applications yet. Add a match to start tracking.</p>
      ) : (
        <ul className="atlas-list">
          {items.slice(0, 3).map((it) => (
            <li className="atlas-row" key={it.id}>
              <div>
                <h3>{it.university}</h3>
                <p>{it.programme}</p>
              </div>
              <span className={`atlas-badge atlas-badge--${it.status}`}>
                {ICONS[it.status]}
                {LABELS[it.status]}
              </span>
            </li>
          ))}
        </ul>
      )}

      {(auditorActive || provenance) && (
        <footer className="atlas-card__foot">
          {auditorActive && (
            <span>Automatic Change Auditor: <strong>Active</strong></span>
          )}
          {provenance && (
            <span className="atlas-prov">{ICONS.verified}{provenance}</span>
          )}
        </footer>
      )}
    </section>
  );
}
