// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';

// Homepage "Pulse" dashboard — at-a-glance listening stats.
// Reads the same entries array the homepage already fetches and computes
// everything client-side via library/pulse_stats.js.

import { useState, useMemo } from 'react';
import { computePulse } from '../../library/pulse_stats';

const PERIODS = [
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
  { value: 'year', label: 'This year' },
  { value: 'all', label: 'All time' },
  { value: 'custom', label: 'Custom range' },
];

// Muted palette assigned to listen-type segments in order of size.
const PIE_PALETTE = ['#1a1a1a', '#c9a24b', '#7d8a99', '#a98b6f', '#8a8f7a', '#b5b2ab'];

const lbl = {
  fontFamily: 'var(--font-label)',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
};

function StatTile({ value, label, sub }) {
  return (
    <div style={{ flex: 1, textAlign: 'center', minWidth: 0 }}>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 'var(--font-display-weight)', fontSize: '26px', lineHeight: 1, color: 'var(--ink)' }}>{value}</div>
      <div style={{ ...lbl, fontSize: '8px', color: 'var(--ink-soft)', marginTop: '6px' }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-label)', fontSize: '8.5px', color: 'var(--ink-faint)', marginTop: '3px' }}>{sub}</div>
    </div>
  );
}

function Histogram({ data }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '56px' }}>
      {data.map((d) => (
        <div key={d.star} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
          <div style={{ fontFamily: 'var(--font-label)', fontSize: '8.5px', color: 'var(--ink-faint)', marginBottom: '3px', height: '11px' }}>{d.count || ''}</div>
          <div style={{ width: '100%', height: Math.max(d.count ? 4 : 2, (d.count / max) * 100) + '%', background: d.count ? 'var(--gold)' : 'var(--border)', borderRadius: '3px 3px 0 0', transition: 'height 0.3s' }} />
          <div style={{ fontFamily: 'var(--font-label)', fontSize: '9px', color: 'var(--gold)', marginTop: '6px' }}>{d.star}</div>
        </div>
      ))}
    </div>
  );
}

// Arc start offsets for the donut. Kept outside the component so the running
// total isn't a render-scope binding being reassigned mid-render.
function arcOffsets(data, total, C) {
  let offset = 0;
  return data.map(d => {
    const len = (d.count / total) * C;
    const start = offset;
    offset += len;
    return { len, start };
  });
}

function RelationshipDonut({ data }) {
  const total = data.reduce((a, b) => a + b.count, 0) || 1;
  const R = 30;
  const C = 2 * Math.PI * R;
  const arcs = arcOffsets(data, total, C);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
      <svg width="76" height="76" viewBox="0 0 80 80" style={{ flexShrink: 0 }}>
        <g transform="rotate(-90 40 40)">
          {data.map((d, i) => (
            <circle
              key={i}
              cx="40" cy="40" r={R} fill="none"
              stroke={PIE_PALETTE[i % PIE_PALETTE.length]}
              strokeWidth="11"
              strokeDasharray={`${arcs[i].len} ${C - arcs[i].len}`}
              strokeDashoffset={-arcs[i].start}
            />
          ))}
        </g>
        <text x="40" y="39" textAnchor="middle" style={{ fontFamily: 'var(--font-display)', fontWeight: 'var(--font-display-weight)', fontSize: '16px', fill: 'var(--ink)' }}>{total}</text>
        <text x="40" y="50" textAnchor="middle" style={{ fontFamily: 'var(--font-label)', fontSize: '5.5px', letterSpacing: '0.14em', fill: 'var(--ink-faint)' }}>LISTENS</text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
        {data.map((d, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-label)', fontSize: '9px' }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '2px', background: PIE_PALETTE[i % PIE_PALETTE.length], flexShrink: 0 }} />
            <span style={{ color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.label}</span>
            <span style={{ color: 'var(--ink-faint)', marginLeft: 'auto' }}>{d.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DecadeBars({ data, top }) {
  if (!data.length) return <div style={{ fontFamily: 'var(--font-label)', fontSize: '9px', color: 'var(--ink-faint)' }}>No releases in range</div>;
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '5px', height: '56px' }}>
        {data.map((d) => (
          <div key={d.decade} title={`${d.decade}s · ${d.count}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
            <div style={{ width: '100%', height: Math.max(3, (d.count / max) * 100) + '%', background: top && d.decade === top.decade ? 'var(--ink)' : 'var(--accent)', borderRadius: '3px 3px 0 0', transition: 'height 0.3s' }} />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px', fontFamily: 'var(--font-label)', fontSize: '8px', color: 'var(--ink-faint)' }}>
        <span>{data[0].decade}s</span>
        <span>{data[data.length - 1].decade}s</span>
      </div>
    </div>
  );
}

function Card({ label, children }) {
  return (
    <div>
      <div style={{ ...lbl, fontSize: '8.5px', color: 'var(--ink-faint)', marginBottom: '9px' }}>{label}</div>
      {children}
    </div>
  );
}

export default function PulsePanel({ entries = [] }) {
  const [period, setPeriod] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const stats = useMemo(() => {
    let p = period;
    if (period === 'custom') {
      p = {
        from: from ? new Date(from).getTime() : null,
        to: to ? new Date(to + 'T23:59:59').getTime() : null,
      };
    }
    return computePulse(entries, p);
  }, [entries, period, from, to]);

  const periodLabel = PERIODS.find((p) => p.value === period)?.label || '';
  const avg = stats.avgRating ? stats.avgRating.toFixed(1) : '—';

  return (
    <section className="pulse">
      <style>{`
        .pulse-select {
          font-family: var(--font-label); font-size: 10px; letter-spacing: 0.06em;
          color: var(--ink-soft); background: var(--bg-warm); border: 1px solid var(--border);
          border-radius: 999px; padding: 6px 28px 6px 14px; cursor: pointer; appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%236b6b6b' stroke-width='2.5'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right 12px center;
        }
        .pulse-charts { display: grid; grid-template-columns: 1fr 1fr 1.15fr; gap: 20px; align-items: start; }
        @media (max-width: 820px) { .pulse-charts { grid-template-columns: 1fr 1fr; gap: 16px; } }
        .pulse-date {
          font-family: var(--font-label); font-size: 10px; color: var(--ink-soft);
          background: var(--bg-warm); border: 1px solid var(--border); border-radius: 8px; padding: 5px 8px;
        }
      `}</style>

      <header style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '12px', marginBottom: '14px' }}>
        <span style={{ ...lbl, fontSize: '9px', letterSpacing: '0.08em', color: 'var(--ink-faint)' }}>
          {stats.periodCount} album{stats.periodCount === 1 ? '' : 's'} · {periodLabel.toLowerCase()}
        </span>
        <select className="pulse-select" value={period} onChange={(e) => setPeriod(e.target.value)} aria-label="Time range">
          {PERIODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
      </header>

      {period === 'custom' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
          <input type="date" className="pulse-date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From" />
          <span style={{ color: 'var(--ink-faint)', fontSize: '11px' }}>→</span>
          <input type="date" className="pulse-date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="To" />
        </div>
      )}

      <div style={{ display: 'flex', gap: '12px', paddingBottom: '14px', borderBottom: '1px solid var(--border)', marginBottom: '14px' }}>
        <StatTile value={stats.total} label="Albums logged" sub={`+${stats.newThisWeek} wk · +${stats.newThisMonth} mo`} />
        <StatTile value={avg} label="Avg rating" sub={`of ${stats.ratedCount} rated`} />
        <StatTile value={stats.streakCurrent + 'd'} label="Day streak" sub={`longest ${stats.streakLongest}d`} />
      </div>

      <div className="pulse-charts">
        <Card label="Ratings">
          <Histogram data={stats.histogram} />
        </Card>
        <Card label={stats.topDecade ? `Eras · ${stats.topDecade.decade}s` : 'Eras'}>
          <DecadeBars data={stats.decades} top={stats.topDecade} />
        </Card>
        <Card label="Listen types">
          <RelationshipDonut data={stats.relationship} />
        </Card>
      </div>
    </section>
  );
}
