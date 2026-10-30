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
}; 0


const FLAGS = {
  germany: (
    <svg className="flag-icon" viewBox="0 0 640 480" width="15" height="10" style={{ borderRadius: '2px', verticalAlign: 'middle', display: 'inline-block', flexShrink: 0 }}>
      <path fill="#000" d="M0 0h640v160H0z"/>
      <path fill="#D00" d="M0 160h640v160H0z"/>
      <path fill="#FFCE00" d="M0 320h640v160H0z"/>
    </svg>
  ),
  ireland: (
    <svg className="flag-icon" viewBox="0 0 640 480" width="15" height="10" style={{ borderRadius: '2px', verticalAlign: 'middle', display: 'inline-block', flexShrink: 0 }}>
      <path fill="#169B62" d="M0 0h213.3v480H0z"/>
      <path fill="#FFF" d="M213.3 0h213.4v480H213.3z"/>
      <path fill="#FF883E" d="M426.7 0H640v480H426.7z"/>
    </svg>
  ),
  uk: (
    <svg className="flag-icon" viewBox="0 0 640 480" width="15" height="10" style={{ borderRadius: '2px', verticalAlign: 'middle', display: 'inline-block', flexShrink: 0 }}>
      <path fill="#012169" d="M0 0v480h640V0z"/>
      <path stroke="#FFF" strokeWidth="60" d="m0 0 640 480m0-480L0 480"/>
      <path stroke="#C8102E" strokeWidth="40" d="m0 0 640 480m0-480L0 480"/>
      <path stroke="#FFF" strokeWidth="100" d="M320 0v480M0 240h640"/>
      <path stroke="#C8102E" strokeWidth="60" d="M320 0v480M0 240h640"/>
    </svg>
  ),
};

const LABELS = { changed: "Changed", verified: "Verified", progress: "In progress" };

const RECENT_CHANGES_FEED = [
  {
    id: "manchester-change",
    countryId: "uk",
    university: "University of Manchester",
    programme: "MSc Advanced Computer Science · Deadline updated, 2 days ago",
    status: "verified",
  },
  {
    id: "tum-change",
    countryId: "germany",
    university: "Technical University of Munich",
    programme: "M.Sc. Informatics · Non-EU tuition policy updated, 3 days ago",
    status: "changed",
  },
  {
    id: "tcd-change",
    countryId: "ireland",
    university: "Trinity College Dublin",
    programme: "M.Sc. Computer Science · IELTS 6.5 cutoff re-verified, 5 days ago",
    status: "verified",
  },
];

export default function ApplicationStatusCard({
  items = [],
  cycle = new Date().getFullYear(),
  auditorActive = true,
  provenance,
}) {
  const displayItems = items.length > 0 ? items.slice(0, 3) : RECENT_CHANGES_FEED;
  const isFeed = items.length === 0;

  return (
    <section className="atlas-card" aria-label="Recent verified changes">
      <header className="atlas-card__head">
        <div className="atlas-card__title">
          <span className="atlas-dot" aria-hidden="true" />
          <h2>{isFeed ? "Recent Verified Changes" : "Your Applications"}</h2>
        </div>
        <span className="atlas-chip">{isFeed ? "LIVE AUDITOR FEED" : `CYCLE ${cycle}`}</span>
      </header>

      <ul className="atlas-list">
        {displayItems.map((it) => (
          <li className="atlas-row" key={it.id}>
            <div>
              <h3 style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                {FLAGS[it.countryId]}
                <span>{it.university}</span>
              </h3>
              <p>{it.programme}</p>
            </div>
            <span className={`atlas-badge atlas-badge--${it.status}`}>
              {ICONS[it.status]}
              {LABELS[it.status]}
            </span>
          </li>
        ))}
      </ul>

      <footer className="atlas-card__foot">
        <span>Automatic Change Auditor: <strong>Active</strong></span>
        <span className="atlas-prov" style={{ color: "var(--status-success, #16a34a)", display: "inline-flex", alignItems: "center", gap: "4px" }}>
          {ICONS.verified}
          <span>Every fact links to its official source</span>
        </span>
      </footer>
    </section>
  );
}
