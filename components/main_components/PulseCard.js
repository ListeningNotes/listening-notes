'use client';

import { parseRating } from '../../library/entry_formatter';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function titleCase(str) {
  return str.replace(/\b\w/g, c => c.toUpperCase());
}

export default function PulseCard({ entries = [] }) {
  const weekAgo = Date.now() - WEEK_MS;

  const thisWeek = entries.filter(e => {
    const t = new Date(e.created_at).getTime();
    return !isNaN(t) && t >= weekAgo;
  });

  const weekCount = thisWeek.length;
  const firstListens = thisWeek.filter(
    e => (e.relationship || '').toLowerCase() === 'first listen'
  ).length;

  const rated = thisWeek.map(e => parseRating(e.rating)).filter(r => r > 0);
  const avgRating = rated.length
    ? (rated.reduce((a, b) => a + b, 0) / rated.length).toFixed(1)
    : '—';

  const tagCounts = {};
  for (const e of entries) {
    const tags = Array.isArray(e.tags) ? e.tags : [];
    for (const tag of tags) {
      if (!tag) continue;
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    }
  }
  const topEntry = Object.entries(tagCounts).sort((a, b) => b[1] - a[1])[0];
  const topTag = topEntry ? titleCase(topEntry[0]) : '—';

  return (
    <div className="hp-pulse-card" style={{ backdropFilter: 'blur(48px)', WebkitBackdropFilter: 'blur(48px)' }}>
      <div className="hp-pulse-label">This week</div>
      <div className="hp-pulse-stats">
        <div className="hp-stat">
          <div className="hp-stat-num">{weekCount}</div>
          <div className="hp-stat-label">Albums logged</div>
        </div>
        <div className="hp-stat">
          <div className="hp-stat-num">{firstListens}</div>
          <div className="hp-stat-label">First listens</div>
        </div>
        <div className="hp-stat">
          <div className="hp-stat-num">★ {avgRating}</div>
          <div className="hp-stat-label">Avg rating</div>
        </div>
        <div className="hp-stat">
          <div className="hp-stat-num hp-stat-num--text">{topTag}</div>
          <div className="hp-stat-label">Top tag</div>
        </div>
      </div>
    </div>
  );
}
