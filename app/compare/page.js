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

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { fonts } from '../../library/sitewide_visuals';
import DotNav from '../../components/main_components/DotNav';
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

export default function ComparePage() {
  const [address, setAddress] = useState('');
  const [state, setState] = useState('idle');   // idle | loading | done | error
  const [error, setError] = useState('');
  const [mine, setMine] = useState([]);
  const [theirs, setTheirs] = useState([]);
  const [origin, setOrigin] = useState('');

  const run = useCallback(async () => {
    const target = toOrigin(address);
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
  }, [address]);

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

    return {
      agreed,
      differed,
      unrated,
      onlyTheirs: theirs.filter(e => !mineByKey.has(e.album_key)),
      onlyMine: mine.filter(e => !theirsByKey.has(e.album_key)),
    };
  }, [state, mine, theirs]);

  const host = origin.replace(/^https?:\/\//, '');

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', color: 'var(--ink)', fontFamily: fonts.sans }}>
      <SiteNav />
      <DotNav />

      <style>{`
        /* The nav is fixed and ends on 136px everywhere; About and Submit
           both clear it by the same 44px, so this page keeps their rhythm
           rather than inventing a number by eye. */
        .cmp-wrap {
          --cmp-nav-bottom: calc(136px + var(--safe-top));
          max-width: 860px; margin: 0 auto;
          padding: calc(var(--cmp-nav-bottom) + 44px) 48px 120px;
        }
        @media (max-width: 640px) {
          .cmp-wrap { padding: calc(var(--cmp-nav-bottom) + 24px) 24px 100px; }
        }
        .cmp-form { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; margin-bottom: 8px; }
        .cmp-input {
          flex: 1; min-width: 240px; max-width: 420px;
          padding: 11px 18px; border-radius: 999px;
          border: 1px solid var(--border); background: var(--panel);
          color: var(--ink); font-family: var(--font-mono); font-size: 12px;
          outline: none; text-align: center;
        }
        .cmp-input:focus { border-color: var(--ink-faint); }
        .cmp-label {
          font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.14em;
          text-transform: uppercase; color: var(--ink-faint);
        }
        .cmp-group { margin-top: 42px; }
        .cmp-group-head {
          display: flex; align-items: baseline; gap: 10px;
          padding-bottom: 10px; border-bottom: 1px solid var(--border); margin-bottom: 6px;
        }
        .cmp-group-title { font-family: var(--font-display); font-weight: var(--font-display-weight); font-size: 19px; }
        .cmp-row {
          display: flex; align-items: center; gap: 14px;
          padding: 10px 4px; border-bottom: 1px solid var(--border);
          text-decoration: none; color: inherit;
        }
        .cmp-row:last-child { border-bottom: none; }
        .cmp-art { width: 42px; height: 42px; border-radius: 6px; object-fit: cover; flex-shrink: 0; display: block; }
        /* These are spans inside a span, so they need telling to stack —
           left inline, the album title and the artist run together on one
           line with no space between them. */
        .cmp-meta { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
        .cmp-album { display: block; font-weight: 700; font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .cmp-artist { display: block; font-size: 12px; color: var(--ink-soft); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .cmp-scores {
          font-family: var(--font-mono); font-size: 12px; color: var(--ink-soft);
          flex-shrink: 0; font-variant-numeric: tabular-nums; text-align: right;
        }
        .cmp-gap { color: var(--ink-faint); font-size: 10px; letter-spacing: 0.08em; }
        .cmp-empty { color: var(--ink-faint); font-size: 13px; padding: 10px 4px; }
      `}</style>

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

          <div className="cmp-form">
            <input
              className="cmp-input"
              value={address}
              onChange={e => setAddress(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && run()}
              placeholder="their journal's address"
              aria-label="The address of another listening journal"
              autoComplete="url"
              spellCheck={false}
            />
            <button className="ln-pill" onClick={run} disabled={state === 'loading'}>
              {state === 'loading' ? 'Reading…' : 'Compare'}
            </button>
          </div>

          {state === 'error' && (
            <p style={{ color: 'var(--fav)', fontSize: 13, marginTop: 14, maxWidth: 420, marginInline: 'auto' }}>{error}</p>
          )}

          {state === 'done' && buckets && (
            <p className="cmp-label" style={{ marginTop: 18 }}>
              {mine.length} here · {theirs.length} at {host} ·{' '}
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
              render={p => <Pair p={p} host={host} origin={origin} />}
            />
            <Group
              title="Where you agreed"
              rows={buckets.agreed}
              empty="No overlap with matching ratings yet."
              render={p => <Pair p={p} host={host} origin={origin} />}
            />
            {buckets.unrated.length > 0 && (
              <Group
                title="You both heard it"
                note="one of you hasn't rated it"
                rows={buckets.unrated}
                render={p => <Pair p={p} host={host} origin={origin} />}
              />
            )}
            <Group
              title={`Only ${host} has heard these`}
              note="the interesting column"
              rows={buckets.onlyTheirs}
              empty="You've heard everything they have."
              render={e => <Solo e={e} href={`${origin}/entries/${e.slug}`} external />}
            />
            <Group
              title="Only you have heard these"
              rows={buckets.onlyMine}
              empty="They've heard everything you have."
              render={e => <Solo e={e} href={`/entries/${e.slug}`} />}
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
function Pair({ p, host, origin }) {
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
