// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';

// Two journals, side by side.
//
// This is the first thing that reaches across to another copy of Listening
// Notes. It asks a second journal for its public feed and lines the two up:
// where you agreed, where you didn't, and — the useful part — what each of you
// has heard that the other hasn't.
//
// There is nothing central involved. Every copy serves its entries at the same
// path, so an address is all you need. Your browser fetches both feeds and does
// the comparing; no server holds a list of who compares with whom, and neither
// journal learns it happened.
//
// Albums are matched on album_key, a column the database generates from album
// and artist — lowercased, accents flattened, & turned into "and", everything
// else collapsed to single spaces. Two people who typed "Beyoncé" and "Beyonce"
// still meet on it.

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { fonts } from '../../library/sitewide_visuals';
import SiteNav from '../../components/main_components/SiteNav';

// How far two ratings can sit apart and still count as agreement. Half a star
// is the smallest difference the site can record, so anything inside it is the
// same opinion typed slightly differently.
const AGREEMENT = 0.5;

// Someone will type "khalia.blog", and someone else will paste a whole entry
// URL with a path on the end. Both should work; only the origin matters.
function toOrigin(input) {
  const raw = String(input || '').trim();
  if (!raw) return null;
  try {
    return new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`).origin;
  } catch {
    return null;
  }
}

const num = v => (v === null || v === undefined || v === '' ? null : Number(v));

// The name the keeper's own address book has for a journal, for a feed that
// does not say whose it is — a copy from before the feed carried a name.
// Owner-only, so a visitor reading this page simply gets nothing back and
// the host stands in.
async function nameInBook(origin) {
  try {
    const host = origin.replace(/^https?:\/\//, '').toLowerCase();
    const r = await fetch('/api/people');
    if (!r.ok) return '';
    const { people } = await r.json();
    return String(people?.find(p => p.address === host)?.name || '').trim();
  } catch {
    return '';
  }
}

// The address this page arrived with, if any: ?with=<address>, put there by
// a row in the keeper's own address book (app/dashboard/people/page.js) —
// this is where a row opens until the page about a person exists, which is
// what this comparison will become. Read through useSyncExternalStore so the
// server renders an empty field and the browser fills it in without a
// hydration mismatch — the same shape the wall uses for ?q=.
const never = () => () => {};
const readArrivedWith = () => {
  try { return new URL(window.location.href).searchParams.get('with') || ''; } catch { return ''; }
};
const readNothing = () => '';

export default function ComparePage() {
  const arrivedWith = useSyncExternalStore(never, readArrivedWith, readNothing);
  // Null until somebody types: the field shows what the page arrived with
  // until then, and what was typed after.
  const [typed, setAddress] = useState(null);
  const address = typed ?? arrivedWith;
  const [state, setState] = useState('idle');   // idle | loading | done | error
  const [error, setError] = useState('');
  const [mine, setMine] = useState([]);
  const [theirs, setTheirs] = useState([]);
  const [origin, setOrigin] = useState('');
  // What to call them. The feed says whose it is (keeper_name, since
  // 2026-09-12); an older copy's does not, and then the only thing known
  // is the host — printed as a last resort, never by choice.
  const [theirName, setTheirName] = useState('');

  // `said` is the address to compare with. Always passed, so this never
  // closes over the field and the landing effect below can depend on it.
  const run = useCallback(async (said) => {
    const target = toOrigin(said);
    if (!target) { setState('error'); setError("That doesn't look like a web address."); return; }

    setState('loading');
    setError('');
    try {
      const [a, b] = await Promise.all([
        fetch('/api/public/entries').then(r => r.json()),
        // A journal that isn't running this software, or is running an older
        // copy without the feed, fails here rather than silently comparing
        // against nothing.
        fetch(`${target}/api/public/entries`).then(async r => {
          if (!r.ok) throw new Error(`That journal answered ${r.status}.`);
          return r.json();
        }),
      ]);
      setMine(a.entries || []);
      setTheirs(b.entries || []);
      setOrigin(target);
      setTheirName(String(b.keeper_name || '').trim() || await nameInBook(target));
      setState('done');
    } catch (e) {
      setState('error');
      // A cross-origin refusal arrives as a bare TypeError with nothing useful
      // in it, so say the two things it usually actually means.
      setError(
        e instanceof TypeError
          ? "Couldn't read that journal. It may not be a Listening Notes journal, or it may not allow other sites to read its feed."
          : e.message
      );
    }
  }, []);

  // Arrived knowing: the comparison should be on screen without a press. A
  // tick later rather than in the effect itself, so the first paint is the
  // field already filled and the reading starts from there as a callback —
  // which is also what keeps the compiler's rule about setting state inside
  // an effect satisfied without pretending this is not a fetch on mount.
  useEffect(() => {
    if (!arrivedWith) return undefined;
    const soon = setTimeout(() => run(arrivedWith), 0);
    return () => clearTimeout(soon);
  }, [arrivedWith, run]);

  const buckets = useMemo(() => {
    if (state !== 'done') return null;

    const theirsByKey = new Map(theirs.map(e => [e.album_key, e]));
    const mineByKey = new Map(mine.map(e => [e.album_key, e]));

    const agreed = [], differed = [], unrated = [];
    for (const m of mine) {
      const t = theirsByKey.get(m.album_key);
      if (!t) continue;
      const a = num(m.rating_value), b = num(t.rating_value);
      const pair = { mine: m, theirs: t, gap: a !== null && b !== null ? Math.abs(a - b) : null };
      if (pair.gap === null) unrated.push(pair);
      else if (pair.gap <= AGREEMENT) agreed.push(pair);
      else differed.push(pair);
    }
    differed.sort((x, y) => y.gap - x.gap);

    // No "only you have heard these": that list is this journal again,
    // scrolled, and the page is about the other one (2026-09-12).
    return {
      agreed,
      differed,
      unrated,
      onlyTheirs: theirs.filter(e => !mineByKey.has(e.album_key)),
    };
  }, [state, mine, theirs]);

  const them = theirName || origin.replace(/^https?:\/\//, '');

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', color: 'var(--ink)', fontFamily: fonts.sans }}>
      <SiteNav />

      <div className="cmp-wrap">
        <div style={{ textAlign: 'center', padding: '0 0 26px' }}>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontWeight: 'var(--font-display-weight)',
            fontSize: 'clamp(32px, 6vw, 52px)', margin: '0 0 10px', lineHeight: 1.05, letterSpacing: '-0.02em',
          }}>
            Compare
          </h1>
          <p style={{ fontSize: 15, lineHeight: 1.6, color: 'var(--ink-soft)', maxWidth: 460, margin: '0 auto 24px' }}>
            Put another listening journal beside this one and see where you met.
          </p>

          {/* Arrived knowing whom — from the address book — the page has
              nothing to ask, and the field would be the one place on it
              printing an address. The count line says who it is. */}
          {!arrivedWith && (
          <div className="cmp-form">
            <input
              className="cmp-input"
              value={address}
              onChange={e => setAddress(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && run(address)}
              placeholder="their journal's address"
              aria-label="The address of another listening journal"
              autoComplete="url"
              spellCheck={false}
            />
            <button className="ln-pill" onClick={() => run(address)} disabled={state === 'loading'}>
              {state === 'loading' ? 'Reading…' : 'Compare'}
            </button>
          </div>
          )}
          {arrivedWith && state === 'loading' && (
            <p className="cmp-label">Reading…</p>
          )}

          {state === 'error' && (
            <p style={{ color: 'var(--fav)', fontSize: 13, marginTop: 14, maxWidth: 420, marginInline: 'auto' }}>{error}</p>
          )}

          {state === 'done' && buckets && (
            <p className="cmp-label" style={{ marginTop: 18 }}>
              {mine.length} here · {theirs.length} with {them} ·{' '}
              {buckets.agreed.length + buckets.differed.length + buckets.unrated.length} in common
            </p>
          )}
        </div>

        {state === 'done' && buckets && (
          <>
            <Group
              title="Where you didn't agree"
              note="sorted by how far apart"
              rows={buckets.differed}
              empty="Nothing you both heard was rated more than half a star apart."
              render={p => <Pair p={p} />}
            />
            <Group
              title="Where you agreed"
              rows={buckets.agreed}
              empty="No overlap with matching ratings yet."
              render={p => <Pair p={p} />}
            />
            {buckets.unrated.length > 0 && (
              <Group
                title="You both heard it"
                note="one of you hasn't rated it"
                rows={buckets.unrated}
                render={p => <Pair p={p} />}
              />
            )}
            <Group
              title={`Only ${them} has heard these`}
              note="the interesting column"
              rows={buckets.onlyTheirs}
              empty="You've heard everything they have."
              render={e => <Solo e={e} href={`${origin}/entries/${e.slug}`} external />}
            />
          </>
        )}

        <div style={{ marginTop: 80, paddingTop: 32, borderTop: '1px solid var(--border)', textAlign: 'center' }}>
          <Link href="/" className="ln-pill">← Back home</Link>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function Group({ title, note, rows, empty, render }) {
  return (
    <section className="cmp-group">
      <div className="cmp-group-head">
        <span className="cmp-group-title">{title}</span>
        <span className="cmp-label">{note ? `${rows.length} · ${note}` : rows.length}</span>
      </div>
      {rows.length === 0
        ? <div className="cmp-empty">{empty}</div>
        : rows.map((r, i) => <div key={i}>{render(r)}</div>)}
    </section>
  );
}

// A record you both logged, with the two verdicts side by side.
function Pair({ p }) {
  const { mine, theirs, gap } = p;
  return (
    <a className="cmp-row" href={`/entries/${mine.slug}`}>
      {mine.album_art && <img className="cmp-art" src={mine.album_art} alt="" loading="lazy" />}
      <span className="cmp-meta">
        <span className="cmp-album">{mine.album}</span>
        <span className="cmp-artist">{mine.artist}</span>
      </span>
      <span className="cmp-scores">
        {mine.rating_value ?? '—'} · {theirs.rating_value ?? '—'}
        {gap !== null && gap > 0 && <><br /><span className="cmp-gap">{gap.toFixed(1)} APART</span></>}
      </span>
    </a>
  );
}

// A record only one of you has. Theirs link out to their journal, which is
// where the chain usually starts: you read it, you play it, you log it with
// them as the source.
function Solo({ e, href, external }) {
  return (
    <a
      className="cmp-row"
      href={href}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      {e.album_art && <img className="cmp-art" src={e.album_art} alt="" loading="lazy" />}
      <span className="cmp-meta">
        <span className="cmp-album">{e.album}</span>
        <span className="cmp-artist">{e.artist}{e.year ? ` · ${e.year}` : ''}</span>
      </span>
      <span className="cmp-scores">{e.rating_value ?? '—'}</span>
    </a>
  );
}
