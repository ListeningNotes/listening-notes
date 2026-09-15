// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/main_components/Feed.js
// The desk's second floor: what the people in the address book logged.
//
// Entries, not people. Each row is a record somebody in the book wrote up —
// a small face and a name on an entry-shaped row — read straight off their
// journal's public feed from this browser, the way the page about a person
// reads one.
// Nothing central, nobody learns they were read, and nothing here is stored:
// the book says whose feeds to ask and the feeds say the rest.
//
// Two views. Submissions is the default: who logged what you sent them, and
// how they rated it — the entries whose credit names this journal. Smaller
// and warmer, and it cannot become a scroll, because it only ever holds what
// came back. Recent is everyone in the book, newest first, and capped: a
// shelf, not a river. No counts, no badges, no unread state.
//
// A row offers Compare only when it is a record you also have: this album,
// their rating against yours and the shape of the two listens, track by
// track. Compare arrives because something happened, not as a place you go.
// The whole-journal compare is the page about a person, which a face or a
// name opens (app/dashboard/people/[id]/page.js).
//
// A row opens their entry in a new window, which on a home screen is a sheet
// inside the app (DECISIONS, The model). Their writing stays on their
// journal: the feed carries none of it, and that is the reason to visit.
//
// Each row is the record, large and centred, with the words under it — the
// shape an entry's first screen has, one after another down the floor — and
// not a cover-thumbnail-and-title list. A list is a table of what exists; a
// feed is records going past. No box around it: the pieces under the art
// are simply large, because the feed holds little and can afford to be
// (Miyel, 2026-09-13). The Compare panel opens under the item.
'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Envelope, Fingerprint, Heart, SketchLogo, User } from '@phosphor-icons/react';
import { useBookplate } from './Bookplate';
import StarRating from './StarRating';
import { parseHorizon } from '../../library/entry_formatter';
import { carrySender, journalUrl, tidyJournal } from '../../library/return_address';

// How much of a river a shelf may hold. Recent from everyone in the book
// could be endless; forty is a look, not a scroll. Submissions is bounded
// by what came back and the cap is a backstop.
const RECENT_MOST = 40;
const SUBMISSIONS_MOST = 30;
// How long one journal gets to answer before its rows are simply absent.
const EACH_MS = 8000;

function timeAgo(when) {
  const t = new Date(when).getTime();
  if (!t) return '';
  const m = Math.max(0, Math.round((Date.now() - t) / 60000));
  if (m < 60) return m <= 1 ? 'just now' : `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return d === 1 ? 'yesterday' : `${d}d ago`;
  const w = Math.round(d / 7);
  if (w < 8) return `${w}w ago`;
  return new Date(when).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

// The marks an entry wears, beside its stars, as marks and not words — the
// strip at the head of an entry draws the three flags this way (MiniCard),
// and a row is a glance (Miyel, 2026-09-13: the icon, not the tag's name).
// Sent gets an envelope in faint ink, the inbox's own mark.
function Marks({ entry, size = 12 }) {
  const fav = entry.favorite === true || entry.favorite === 'true';
  const mp = entry.masterpiece === true || entry.masterpiece === 'true';
  const formative = entry.formative === true || entry.formative === 'true';
  const sent = entry.entry_type === 'Submission';
  if (!fav && !mp && !formative && !sent) return null;
  return (
    <span className="ln-mini-flags fd-marks">
      {sent && (
        <span className="ln-mini-flag" style={{ color: 'var(--ink-faint)' }} role="img" aria-label="Submission" title="Submission">
          <Envelope size={size} weight="regular" />
        </span>
      )}
      {fav && (
        <span className="ln-mini-flag" style={{ color: 'var(--fav, #f0484f)' }} role="img" aria-label="Favorite" title="Favorite">
          <Heart size={size} weight="fill" />
        </span>
      )}
      {mp && (
        <span className="ln-mini-flag" style={{ color: 'var(--mp, #4a9bf0)' }} role="img" aria-label="Masterpiece" title="Masterpiece">
          <SketchLogo size={size} weight="fill" />
        </span>
      )}
      {formative && (
        <span className="ln-mini-flag" style={{ color: 'var(--formative, #3fa96b)' }} role="img" aria-label="Formative" title="Formative">
          <Fingerprint size={size} weight="bold" />
        </span>
      )}
    </span>
  );
}

// Their journal's own portrait, read straight off it; the plain mark when
// there is none.
function Face({ address }) {
  return (
    <span className="fd-face" aria-hidden="true">
      <User size={18} weight="regular" />
      <img src={`${journalUrl(address)}/api/portrait`} alt="" loading="lazy" onError={e => { e.currentTarget.style.display = 'none'; }} />
    </span>
  );
}

// The narrow compare: one album, two verdicts, and the shape of each listen.
// The track notes are writing and the feed carries none, so they stay where
// they are and the panel points at both entries.
function Compared({ mine, theirs, name, there }) {
  const a = parseHorizon(mine.horizon);
  const b = parseHorizon(theirs.horizon);
  const x = Number(mine.rating_value), y = Number(theirs.rating_value);
  const gap = Number.isFinite(x) && Number.isFinite(y) && mine.rating_value !== null && theirs.rating_value !== null ? Math.abs(x - y) : null;
  return (
    <div className="fd-panel">
      <div className="fd-panel-scores">
        <span>You <b>{mine.rating_value ?? '—'}</b></span>
        <span>{name} <b>{theirs.rating_value ?? '—'}</b></span>
        {gap !== null && <span className="fd-panel-gap">{gap === 0 ? 'the same' : `${gap.toFixed(1)} apart`}</span>}
      </div>
      {(a.length > 0 || b.length > 0) && (
        <div className="fd-horizons">
          <span className="fd-horizon-label">Track by track — you, then {name}</span>
          <div className="fd-horizon fd-horizon--mine" aria-hidden="true">
            {a.map((v, i) => <span key={i} style={{ height: `${Math.max(8, v * 100)}%` }} />)}
          </div>
          <div className="fd-horizon" aria-hidden="true">
            {b.map((v, i) => <span key={i} style={{ height: `${Math.max(8, v * 100)}%` }} />)}
          </div>
        </div>
      )}
      <p className="fd-panel-note">
        The notes stay on the journals: <a href={there} target="_blank" rel="noopener noreferrer">read theirs &#8599;</a>
        {' · '}<Link href={`/entries/${mine.slug}`}>yours</Link>
      </p>
    </div>
  );
}

export default function Feed({ entries = [] }) {
  const { keeper_name, site_address } = useBookplate();
  // null until the book has answered, so an empty book and a book not yet
  // read draw differently.
  const [people, setPeople] = useState(null);
  // address → { entries, name, failed }. Filled as each journal answers, so
  // the first rows are on screen before the slowest journal has spoken.
  const [journals, setJournals] = useState({});
  const [view, setView] = useState('submissions');
  const [open, setOpen] = useState(null);

  useEffect(() => {
    let gone = false;
    fetch('/api/people')
      .then(r => (r.ok ? r.json() : { people: [] }))
      .then(d => {
        if (gone) return;
        const had = d.people || [];
        setPeople(had);
        for (const p of had) {
          fetch(`${journalUrl(p.address)}/api/public/entries`, { signal: AbortSignal.timeout(EACH_MS) })
            .then(r => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
            .then(j => {
              if (gone) return;
              const name = String(j.keeper_name || '').trim() || p.name || '';
              setJournals(prev => ({ ...prev, [p.address]: { entries: j.entries || [], name } }));
            })
            .catch(() => {
              if (gone) return;
              setJournals(prev => ({ ...prev, [p.address]: { entries: [], name: p.name || '', failed: true } }));
            });
        }
      })
      .catch(() => { if (!gone) setPeople([]); });
    return () => { gone = true; };
  }, []);

  const me = tidyJournal(site_address);
  const myName = String(keeper_name || '').trim().toLowerCase();
  const mineByKey = useMemo(() => new Map(entries.map(e => [e.album_key, e])), [entries]);

  const rows = useMemo(() => {
    if (!people) return [];
    const all = [];
    for (const p of people) {
      const j = journals[p.address];
      if (!j) continue;
      for (const entry of j.entries) all.push({ person: { ...p, name: j.name || p.name || '' }, entry });
    }
    all.sort((a, b) => new Date(b.entry.posted_at) - new Date(a.entry.posted_at));
    return all;
  }, [people, journals]);

  // What came back: their Submission entries whose credit names this
  // journal — by address when the credit carries one, by the name the send
  // carried when it does not (an entry from before the address travelled).
  const submissions = useMemo(() => rows.filter(({ entry }) => {
    if (entry.entry_type !== 'Submission') return false;
    const url = tidyJournal(entry.received_from_url);
    if (url) return url === me;
    const name = String(entry.received_from || '').trim().toLowerCase();
    return Boolean(name) && name === myName;
  }).slice(0, SUBMISSIONS_MOST), [rows, me, myName]);

  const recent = useMemo(() => rows.slice(0, RECENT_MOST), [rows]);
  const shown = view === 'submissions' ? submissions : recent;
  const stillAsking = Boolean(people?.some(p => !journals[p.address]));

  let body;
  if (people === null || (stillAsking && shown.length === 0)) {
    body = (
      <div className="fd-list">
        {[...Array(2)].map((_, i) => <div key={i} className="own-skeleton fd-art" style={{ margin: '0 auto 24px' }} />)}
      </div>
    );
  } else if (people.length === 0) {
    body = (
      <div className="fd-empty">
        Nobody in your address book yet.<br />
        <Link href="/dashboard/people">Add someone</Link> and what they log shows up here.
      </div>
    );
  } else if (shown.length === 0) {
    body = (
      <div className="fd-empty">
        {view === 'submissions'
          ? 'Nothing you sent has come back yet.'
          : 'Nobody in your address book has logged anything yet.'}
      </div>
    );
  } else {
    body = (
      <div className="fd-list">
        {shown.map(({ person, entry }) => {
          const key = `${person.address}/${entry.slug}`;
          const mine = mineByKey.get(entry.album_key);
          // Carrying who this copy belongs to — see carrySender.
          const there = carrySender(`${journalUrl(person.address)}/entries/${entry.slug}`, { name: keeper_name, address: site_address });
          const rated = entry.rating_value !== null && entry.rating_value !== undefined && entry.rating_value !== '';
          return (
            <div key={key}>
              <article className="fd-item">
                <a className="fd-art" href={there} target="_blank" rel="noopener noreferrer" aria-label={`${entry.album} on ${person.name || 'their'} journal`}>
                  {entry.album_art && <img src={entry.album_art} alt="" loading="lazy" />}
                </a>
                <a className="fd-album" href={there} target="_blank" rel="noopener noreferrer">{entry.album}</a>
                <div className="fd-artist">{entry.artist}{entry.year ? ` · ${entry.year}` : ''}</div>
                <div className="fd-stars">
                  {rated && <StarRating rating={Number(entry.rating_value)} size={20} />}
                  <Marks entry={entry} size={20} />
                </div>
                <div className="fd-who">
                  <Link href={`/dashboard/people/${person.id}`} title={`Your page about ${person.name || 'them'}`} data-grows={`/dashboard/people/${person.id}`}>
                    <Face address={person.address} />
                    {person.name || 'Someone'}
                  </Link>
                  <span className="fd-when">&middot; {timeAgo(entry.posted_at)}</span>
                  {view === 'submissions' && <span className="fd-when">&middot; from you</span>}
                </div>
                {mine && (
                  <button
                    type="button"
                    className={'own-act fd-compare' + (open === key ? ' own-act--solid' : '')}
                    onClick={() => setOpen(open === key ? null : key)}
                    aria-expanded={open === key}
                  >
                    Compare
                  </button>
                )}
                {open === key && mine && <Compared mine={mine} theirs={entry} name={person.name || 'them'} there={there} />}
              </article>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="fd-wrap">
      <div className="fd-views" role="tablist" aria-label="What to show">
        <button type="button" role="tab" aria-selected={view === 'submissions'} className={'fd-view' + (view === 'submissions' ? ' fd-view--on' : '')} onClick={() => setView('submissions')}>
          Submissions
        </button>
        <button type="button" role="tab" aria-selected={view === 'recent'} className={'fd-view' + (view === 'recent' ? ' fd-view--on' : '')} onClick={() => setView('recent')}>
          Recent
        </button>
      </div>
      {body}
    </div>
  );
}
