// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
// app/dashboard/people/[id]/page.js
// Your page about one person in the address book.
//
// Compare is not a destination; it is what this page is. Everything
// cumulative about a person lives here — how many records you both have,
// where you agree hardest and disagree hardest, what they have sent you and
// how you rated it, their hit rate with you — and it lives on your copy,
// (What only they have heard was a list here too, and came off on Miyel's
// call, 2026-09-13: their journal is a tap away and says it better.)
// which is why it can hold what their journal never could: what they sent,
// how it landed, how often they are right about you.
//
// Read in the browser: their public feed from their journal, your own
// records and the sends from them from this copy. Nothing is stored and
// nobody learns they were looked at. Their writing stays on their journal,
// where every row here can take you.
//
// Rated alike allows for how each of you rates: a generous rater and a
// harsh one with the same taste should come out alike (DECISIONS, The
// journal), so their ratings are shifted by the average difference across
// what you both have before the gap is measured. Three records in common
// are the least that offset is trusted on.

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { CaretLeft, Printer, User } from '@phosphor-icons/react';
import SiteNav from '../../../../components/main_components/SiteNav';
import StarRating from '../../../../components/main_components/StarRating';
import { albumKey } from '../../../../hooks/useListeningBeacon';
import { journalUrl, tidyJournal } from '../../../../library/return_address';
import { arrivingBack } from '../../../../library/handoff';

// Half a star, after the offset, is the same opinion typed slightly
// differently. Four stars or better is a hit: something they sent that you
// went on to log and rate well. Three records is the least the offset is
// trusted on; fewer, and raw stars are compared.
const ALIKE = 0.5;
const HIT = 4;
const OFFSET_NEEDS = 3;
const HARDEST = 3;
const EACH_MS = 8000;

const num = v => (v === null || v === undefined || v === '' ? null : Number(v));
const newestFirst = rows => [...rows].sort((a, b) => new Date(b.posted_at) - new Date(a.posted_at));

// One entry per record, the most recent (DECISIONS: never average across
// listens).
function latestPerKey(entries) {
  const latest = new Map();
  for (const e of newestFirst(entries)) if (e.album_key && !latest.has(e.album_key)) latest.set(e.album_key, e);
  return latest;
}

function Face({ address }) {
  return (
    <span className="pn-face" aria-hidden="true">
      <User size={40} weight="regular" />
      <img src={`${journalUrl(address)}/api/portrait`} alt="" onError={e => { e.currentTarget.style.display = 'none'; }} />
    </span>
  );
}

function Section({ title, note, rows, empty, children }) {
  return (
    <section className="pn-section">
      <div className="pn-section-head">
        <span className="pn-section-title">{title}</span>
        {note && <span className="pn-section-note">{note}</span>}
      </div>
      {rows.length === 0 ? <div className="pn-empty">{empty}</div> : rows.map(children)}
    </section>
  );
}

export default function PersonPage({ layered = false }) {
  const { id } = useParams();
  const router = useRouter();
  // The way back, in the header's left slot: to the book or the feed this
  // opened from, or to the book when there is nothing behind it. The pull
  // down and Escape still work; this is the one that can be seen.
  const goBack = () => {
    // The book this closes onto is returned to, not arrived at: it draws
    // at rest rather than rising again (handoff.js, arrivingBack).
    arrivingBack();
    if (typeof window !== 'undefined' && window.history.length > 1) router.back();
    else router.push('/dashboard/people');
  };
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  // null until asked; false when nobody has that id.
  const [person, setPerson] = useState(null);
  // Their feed: null until asked, { entries, name } when it answered,
  // { failed: true } when it did not.
  const [theirs, setTheirs] = useState(null);
  const [mine, setMine] = useState([]);
  const [sent, setSent] = useState([]);

  useEffect(() => {
    fetch('/api/auth/check').then(r => r.json()).then(d => setAuthed(!!d.authed)).catch(() => {}).finally(() => setChecking(false));
  }, []);

  useEffect(() => {
    if (!authed || !id) return undefined;
    let gone = false;
    fetch(`/api/people/${id}`)
      .then(r => (r.ok ? r.json() : { person: false }))
      .then(d => {
        if (gone) return;
        const p = d.person || false;
        setPerson(p);
        if (!p) return;
        fetch(`${journalUrl(p.address)}/api/public/entries`, { signal: AbortSignal.timeout(EACH_MS) })
          .then(r => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
          .then(j => { if (!gone) setTheirs({ entries: j.entries || [], name: String(j.keeper_name || '').trim() || p.name || '' }); })
          .catch(() => { if (!gone) setTheirs({ failed: true, entries: [], name: p.name || '' }); });
        fetch('/api/entries').then(r => r.json()).then(d2 => { if (!gone) setMine(d2.entries || []); }).catch(() => {});
        // Every send this copy has, narrowed to theirs by the address the
        // send carried — the same spelling the book keeps.
        fetch('/api/submissions').then(r => r.json()).then(d3 => {
          if (gone) return;
          const theirsOnly = (d3.submissions || []).filter(s => tidyJournal(s.sender_url) === tidyJournal(p.address));
          setSent(theirsOnly);
        }).catch(() => {});
      })
      .catch(() => { if (!gone) setPerson(false); });
    return () => { gone = true; };
  }, [authed, id]);

  const name = theirs?.name || person?.name || 'them';

  const facts = useMemo(() => {
    const mineLatest = latestPerKey(mine);
    const theirLatest = latestPerKey(theirs?.entries || []);

    const pairs = [];
    for (const [key, m] of mineLatest) {
      const t = theirLatest.get(key);
      if (t) pairs.push({ mine: m, theirs: t });
    }
    const rated = pairs.filter(p => num(p.mine.rating_value) !== null && num(p.theirs.rating_value) !== null);
    const offset = rated.length >= OFFSET_NEEDS
      ? rated.reduce((sum, p) => sum + (num(p.theirs.rating_value) - num(p.mine.rating_value)), 0) / rated.length
      : 0;
    for (const p of rated) p.gap = Math.abs((num(p.theirs.rating_value) - offset) - num(p.mine.rating_value));
    const alike = rated.filter(p => p.gap <= ALIKE);
    const warmth = p => num(p.mine.rating_value) + num(p.theirs.rating_value);
    const agree = [...alike].sort((a, b) => a.gap - b.gap || warmth(b) - warmth(a)).slice(0, HARDEST);
    const disagree = rated.filter(p => p.gap > ALIKE).sort((a, b) => b.gap - a.gap).slice(0, HARDEST);

    const sends = sent.map(s => {
      const logged = mineLatest.get(albumKey(s.album, s.artist)) || null;
      const rating = logged ? num(logged.rating_value) : null;
      return { ...s, logged, rating, hit: rating !== null && rating >= HIT };
    });
    const loggedCount = sends.filter(s => s.logged).length;
    const hits = sends.filter(s => s.hit).length;

    return { pairs, rated, offset, alike, agree, disagree, sends, loggedCount, hits };
  }, [mine, theirs, sent]);

  if (checking) return <div style={{ minHeight: '100vh', background: 'var(--bg)' }} />;
  if (!authed) { if (typeof window !== 'undefined') window.location.replace('/login'); return null; }

  const there = person ? journalUrl(person.address) : '';
  const theirEntry = e => `${there}/entries/${e.slug}`;

  return (
    <div className={'own-screen' + (layered ? ' own-screen--layered' : '')}>
      {/* The header's left slot, where the owner's tools live on every page:
          the way back, and the printer's door — the press that prints the
          shape of the agreement and withholds the writing, naming both
          people (DECISIONS, The network) — the same glyph at the same size
          the entry and the card wear it. */}
      <SiteNav tools={(
        <>
          <button type="button" className="kt-tool" onClick={goBack} aria-label="Back" title="Back">
            <CaretLeft size={18} weight="regular" aria-hidden="true" />
          </button>
          {person && (
            <Link href={`/printer?person=${encodeURIComponent(id)}`} className="kt-tool" aria-label="Print the shape of the agreement" title="Print the shape of the agreement">
              <Printer size={18} weight="regular" aria-hidden="true" />
            </Link>
          )}
        </>
      )} />

      <div className="own-body pn-body">
        {person === false ? (
          <div className="own-empty">Nobody by that page. <Link href="/dashboard/people" className="own-link">The address book</Link></div>
        ) : person === null ? (
          <div className="pn-head"><div className="own-skeleton" style={{ width: 108, height: 108, borderRadius: 24 }} /></div>
        ) : (
          <>
            <header className="pn-head">
              <Face address={person.address} />
              <h1 className="pn-name">{name}</h1>
              <div className="pn-row">
                <a href={there} target="_blank" rel="noopener noreferrer" className="own-act">Visit their journal &#8599;</a>
              </div>
            </header>

            <div className="own-panel pn-panel">
              <div className="pn-scroll">
                {theirs?.failed && (
                  <p className="pn-note">{name}&rsquo;s journal isn&rsquo;t answering just now, so only what they sent you is here.</p>
                )}

                <dl className="pn-facts">
                  <div className="pn-fact"><dt>Records you both have</dt><dd>{theirs?.entries ? facts.pairs.length : '—'}</dd></div>
                  <div className="pn-fact"><dt>Rated alike</dt><dd>{facts.rated.length ? <>{facts.alike.length}<small>of {facts.rated.length}</small></> : '—'}</dd></div>
                  <div className="pn-fact"><dt>Sent you</dt><dd>{facts.sends.length}{facts.sends.length > 0 && <small>{facts.loggedCount} logged</small>}</dd></div>
                  <div className="pn-fact"><dt>Hit rate with you</dt><dd>{facts.sends.length ? <>{facts.hits}<small>of {facts.sends.length}</small></> : '—'}</dd></div>
                </dl>
                {facts.offset !== 0 && (
                  <p className="pn-note">
                    {name} rates about {Math.abs(facts.offset).toFixed(1)} {facts.offset > 0 ? 'higher' : 'lower'} than you across what you both have. That is allowed for before anything above is counted.
                  </p>
                )}

                <Section title="Where you agree hardest" rows={facts.agree} empty={facts.rated.length ? 'Nowhere yet, allowing for how each of you rates.' : 'Nothing you both have yet.'}>
                  {p => (
                    <div key={p.mine.slug} className="pn-item">
                      <Link href={`/entries/${p.mine.slug}`} className="pn-item-art">{p.mine.album_art && <img src={p.mine.album_art} alt="" loading="lazy" />}</Link>
                      <div className="pn-item-said">
                        <Link href={`/entries/${p.mine.slug}`} className="pn-item-album">{p.mine.album}</Link>
                        <div className="pn-item-artist">{p.mine.artist}</div>
                      </div>
                      <div className="pn-item-tail">
                        <span>You <b>{p.mine.rating_value}</b> &middot; {name} <b>{p.theirs.rating_value}</b></span>
                        <a href={theirEntry(p.theirs)} target="_blank" rel="noopener noreferrer">theirs &#8599;</a>
                      </div>
                    </div>
                  )}
                </Section>

                <Section title="Where you disagree hardest" rows={facts.disagree} empty={facts.rated.length ? 'Nowhere, allowing for how each of you rates.' : 'Nothing you both have yet.'}>
                  {p => (
                    <div key={p.mine.slug} className="pn-item">
                      <Link href={`/entries/${p.mine.slug}`} className="pn-item-art">{p.mine.album_art && <img src={p.mine.album_art} alt="" loading="lazy" />}</Link>
                      <div className="pn-item-said">
                        <Link href={`/entries/${p.mine.slug}`} className="pn-item-album">{p.mine.album}</Link>
                        <div className="pn-item-artist">{p.mine.artist}</div>
                      </div>
                      <div className="pn-item-tail">
                        <span>You <b>{p.mine.rating_value}</b> &middot; {name} <b>{p.theirs.rating_value}</b> <span className="pn-gap">&middot; {p.gap.toFixed(1)} apart</span></span>
                        <a href={theirEntry(p.theirs)} target="_blank" rel="noopener noreferrer">theirs &#8599;</a>
                      </div>
                    </div>
                  )}
                </Section>

                <Section title={`What ${name} has sent you`} rows={facts.sends} empty={`${name} hasn't sent you anything yet.`}>
                  {s => (
                    <div key={s.id} className="pn-item">
                      {s.logged
                        ? <Link href={`/entries/${s.logged.slug}`} className="pn-item-art">{s.album_art && <img src={s.album_art} alt="" loading="lazy" />}</Link>
                        : <span className="pn-item-art">{s.album_art && <img src={s.album_art} alt="" loading="lazy" />}</span>}
                      <div className="pn-item-said">
                        {s.logged
                          ? <Link href={`/entries/${s.logged.slug}`} className="pn-item-album">{s.album}</Link>
                          : <span className="pn-item-album">{s.album}</span>}
                        <div className="pn-item-artist">{s.artist}{s.year ? ` · ${s.year}` : ''} &middot; {new Date(s.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                        {s.note && <p className="pn-item-note">{s.note.length > 140 ? s.note.slice(0, 140).trim() + '…' : s.note}</p>}
                      </div>
                      <div className="pn-item-tail">
                        {s.logged
                          ? (s.rating !== null ? <StarRating rating={s.rating} size={12} /> : <span>Logged</span>)
                          : <span className="pn-gap">Not logged yet</span>}
                      </div>
                    </div>
                  )}
                </Section>

              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
