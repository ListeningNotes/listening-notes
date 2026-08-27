// SPDX-License-Identifier: AGPL-3.0-or-later
// library/pulse_stats.js
// Computes the homepage "Pulse" dashboard stats from the entries list.
// Pure functions — no DB or network. Feed it the same entries array the
// homepage already fetches from /api/entries.

import { parseRating } from './entry_formatter';

// Normalize an entry's rating to a 0–5 number. A Masterpiece counts as 5.
// Returns null for unrated entries so they're excluded from averages.
function ratingValue(entry) {
  const isMasterpiece =
    entry.masterpiece === true ||
    entry.masterpiece === 'true' ||
    String(entry.rating).toLowerCase() === 'masterpiece';
  if (isMasterpiece) return 5;
  const n = parseRating(entry.rating);
  return n > 0 ? n : null;
}

function decadeOf(year) {
  const y = parseInt(year, 10);
  if (!y) return null;
  return Math.floor(y / 10) * 10;
}

function dayKey(date) {
  return date.getFullYear() + '-' + date.getMonth() + '-' + date.getDate();
}

// period: 'week' | 'month' | 'year' | 'all' | { from, to } (ms timestamps)
function inPeriod(date, period, now) {
  if (!period || period === 'all') return true;
  if (typeof period === 'object') {
    const t = date.getTime();
    return (!period.from || t >= period.from) && (!period.to || t <= period.to);
  }
  const cutoff = new Date(now);
  if (period === 'week') cutoff.setDate(cutoff.getDate() - 7);
  else if (period === 'month') cutoff.setMonth(cutoff.getMonth() - 1);
  else if (period === 'year') cutoff.setFullYear(cutoff.getFullYear() - 1);
  else return true;
  return date >= cutoff;
}

// Consecutive-day streaks from entry dates.
// `current` is the run ending on the most recent logged day, but only counts
// as "current" if that day is today or yesterday — otherwise the streak is broken.
function computeStreaks(entries, now) {
  const keys = [...new Set(entries.map((e) => dayKey(new Date(e.created_at))))];
  const days = keys
    .map((k) => {
      const [y, m, d] = k.split('-').map(Number);
      return new Date(y, m, d).getTime();
    })
    .sort((a, b) => a - b);
  if (!days.length) return { current: 0, longest: 0 };

  const DAY = 86400000;
  let longest = 1;
  let run = 1;
  for (let i = 1; i < days.length; i++) {
    if (Math.round((days[i] - days[i - 1]) / DAY) === 1) run += 1;
    else run = 1;
    if (run > longest) longest = run;
  }

  // Current streak: walk back from the most recent logged day.
  let current = 1;
  for (let i = days.length - 1; i > 0; i--) {
    if (Math.round((days[i] - days[i - 1]) / DAY) === 1) current += 1;
    else break;
  }
  const today = new Date(now);
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const lastDay = days[days.length - 1];
  const gapFromToday = Math.round((todayStart - lastDay) / DAY);
  if (gapFromToday > 1) current = 0; // last entry is older than yesterday

  return { current, longest };
}

export function computePulse(entries, period = 'all', now = Date.now()) {
  const all = Array.isArray(entries) ? entries : [];

  // --- Absolute (all-time) figures, independent of the period selector ---
  const total = all.length;
  const newThisWeek = all.filter((e) => inPeriod(new Date(e.created_at), 'week', now)).length;
  const newThisMonth = all.filter((e) => inPeriod(new Date(e.created_at), 'month', now)).length;
  const { current: streakCurrent, longest: streakLongest } = computeStreaks(all, now);

  // --- Period-scoped subset ---
  const scoped = all.filter((e) => inPeriod(new Date(e.created_at), period, now));

  const rated = scoped.map(ratingValue).filter((v) => v != null);
  const avgRating = rated.length ? rated.reduce((a, b) => a + b, 0) / rated.length : 0;

  // 5 whole-star buckets (half-stars round to nearest)
  const histogram = [1, 2, 3, 4, 5].map((star) => ({
    star,
    count: rated.filter((v) => Math.round(v) === star).length,
  }));

  // Relationship (listen-type) breakdown, biggest first
  const relMap = {};
  scoped.forEach((e) => {
    const r = e.relationship || 'Unlabeled';
    relMap[r] = (relMap[r] || 0) + 1;
  });
  const relationship = Object.entries(relMap)
    .map(([label, count]) => ({ label, count, pct: scoped.length ? count / scoped.length : 0 }))
    .sort((a, b) => b.count - a.count);

  // Decade (era) breakdown by album release year
  const decMap = {};
  scoped.forEach((e) => {
    const d = decadeOf(e.year);
    if (d != null) decMap[d] = (decMap[d] || 0) + 1;
  });
  const decades = Object.entries(decMap)
    .map(([d, count]) => ({ decade: Number(d), count }))
    .sort((a, b) => a.decade - b.decade);
  const topDecade = decades.length
    ? decades.slice().sort((a, b) => b.count - a.count)[0]
    : null;

  return {
    total,
    newThisWeek,
    newThisMonth,
    streakCurrent,
    streakLongest,
    periodCount: scoped.length,
    avgRating,
    ratedCount: rated.length,
    histogram,
    relationship,
    decades,
    topDecade,
  };
}
