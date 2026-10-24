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
// ── A shape, then the numbers, 2026-10-23 ─────────────────────────────────
// Her brief, "compare becomes a shape": the page was a report — four facts in
// a table and three lists — and the last screen still built that way. It
// opens on a picture now: your stars across, theirs up, a cover for every
// record you both rated, and a dotted line corner to corner where you agree.
// Three numbers under it and nothing else; the other facts are captions on
// the sections they belong to. The arguments come before the agreements,
// because agreement is what the shape already showed. What they sent you is
// covers with green where you logged it, the one thing their journal can
// never say.
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
// are the least that offset is trusted on. The shape plots raw stars; the
// ring and the arguments use the offset.

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
// A rating as it is said: 4.5, 5, 1.5 — never 5.0.
const said = v => { const n = num(v); return n === null ? '' : String(Math.round(n * 100) / 100); };

// One entry per record, the most recent (DECISIONS: never average across
// listens). Album listens only, 2026-09-24: a track note rates one song, and
// set against somebody's whole-record score it would be a comparison of two
// different things. An older copy sends no `song`, and its notes cannot be
// told apart — which only happens once they have one.
function latestPerKey(entries) {
  const latest = new Map();
  for (const e of newestFirst(entries)) if (e.album_key && !e.song && !latest.has(e.album_key)) latest.set(e.album_key, e);
  return latest;
}

function Face({ address }) {
  return (
    <span className="pn-face" aria-hidden="true">
      <User size={26} weight="regular" />
      <img src={`${journalUrl(address)}/api/portrait`} alt="" onError={e => { e.currentTarget.style.display = 'none'; }} />
    </span>
  );
}

// `all` is for a section that is not a list of rows — the sends, which are a
// grid of covers and have to be laid out as a whole. Everything else still
// hands over a row renderer.
function Section({ title, note, rows, empty, children, all = null }) {
  return (
    <section className="pn-section">
      <div className="pn-section-head">
        <span className="pn-section-title">{title}</span>
        {note && <span className="pn-section-note">{note}</span>}
      </div>
      {rows.length === 0 ? <div className="pn-empty">{empty}</div> : (all || rows.map(children))}
    </section>
  );
}

// ── The shape ─────────────────────────────────────────────────────────────
// The axes run one to five, not zero: real ratings bunch at the top, and a
// plot where everything huddles in a corner reads as broken. The plot is a
// grid of square slots, nine across at the least — one per half star, so a
// rating lands exactly on a slot — and more as the records you share grow,
// so four hundred covers shrink rather than pile up. Each cover takes the
// free slot nearest its own two ratings: a record that lands where another
// already is nudges to the next square over instead of hiding it. The
// arguments are placed first, so the three the page is about sit where they
// really are; then the rest, furthest from the line first, since the cloud
// along the line is where the crowding happens and the least is lost there.
const SLOTS_LEAST = 9;
const ROOM_EACH = 2.5;

function placeCovers(pairs, rings) {
  const n = Math.max(SLOTS_LEAST, Math.ceil(Math.sqrt(pairs.length * ROOM_EACH)));
  // In slots, from the left and from the foot: a one sits in the first
  // slot's middle, a five in the last one's.
  const at = r => 0.5 + ((Math.min(5, Math.max(1, num(r))) - 1) / 4) * (n - 1);
  const order = [...pairs].sort((a, b) =>
    (rings.has(b.mine.slug) - rings.has(a.mine.slug)) || (b.gap - a.gap) || String(a.mine.slug).localeCompare(String(b.mine.slug)));
  const taken = new Set();
  const placed = [];
  for (const pair of order) {
    const x = at(pair.mine.rating_value);
    const y = at(pair.theirs.rating_value);
    let best = null;
    let bestDistance = Infinity;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (taken.has(i * n + j)) continue;
        const distance = (i + 0.5 - x) ** 2 + (j + 0.5 - y) ** 2;
        if (distance < bestDistance) { bestDistance = distance; best = [i, j]; }
      }
    }
    if (!best) break;
    taken.add(best[0] * n + best[1]);
    placed.push({ pair, left: best[0] / n, bottom: best[1] / n, ring: rings.has(pair.mine.slug) });
  }
  return { n, placed };
}

function Shape({ pairs, rings, name, empty }) {
  const { n, placed } = useMemo(() => placeCovers(pairs, rings), [pairs, rings]);
  // The line runs from a one-and-one to a five-and-five, corner slot to
  // corner slot, in hundredths of the plot.
  const end = (0.5 / n) * 100;
  return (
    <figure className="pn-shape">
      <div className="pn-shape-plot" role="img" aria-label={`Your stars across, ${name}'s up, a cover for every record you both rated.`}>
        <svg className="pn-shape-line" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <line x1={end} y1={100 - end} x2={100 - end} y2={end} />
        </svg>
        {placed.map(({ pair, left, bottom, ring }) => (
          <Link
            key={pair.mine.slug}
            href={`/entries/${pair.mine.slug}`}
            className={'pn-plot' + (ring ? ' pn-plot--ring' : '')}
            style={{ left: `${left * 100}%`, bottom: `${bottom * 100}%`, width: `${100 / n}%` }}
            title={`${pair.mine.album} — you ${said(pair.mine.rating_value)}, ${name} ${said(pair.theirs.rating_value)}`}
          >
            {pair.mine.album_art
              ? <img src={pair.mine.album_art} alt="" loading="lazy" />
              : <span className="pn-plot-none" aria-hidden="true">♪</span>}
          </Link>
        ))}
        {empty && <div className="pn-shape-empty">{empty}</div>}
      </div>
      <span className="pn-shape-y" aria-hidden="true">{name} &rarr;</span>
      <figcaption className="pn-shape-x" aria-hidden="true">You &middot; one to five &rarr;</figcaption>
    </figure>
  );
}

// One record you both rated: its cover and name, then the two ratings —
// yours in ink, theirs faint, so whose is whose needs no label — and how far
// apart, allowing for how each of you rates.
function Pair({ pair, near }) {
  const same = num(pair.mine.rating_value) === num(pair.theirs.rating_value);
  const apart = same
    ? (num(pair.mine.rating_value) === 5 ? 'Both five' : 'Dead on')
    : `${pair.gap.toFixed(1)} apart`;
  return (
    <div className="pn-pair">
      <Link href={`/entries/${pair.mine.slug}`} className="pn-item-art">{pair.mine.album_art && <img src={pair.mine.album_art} alt="" loading="lazy" />}</Link>
      <div className="pn-item-said">
        <Link href={`/entries/${pair.mine.slug}`} className="pn-item-album">{pair.mine.album}</Link>
        <div className="pn-item-artist">{pair.mine.artist}{pair.mine.year ? ` · ${pair.mine.year}` : ''}</div>
      </div>
      <div className="pn-pair-score">
        <span className="pn-pair-stars">{said(pair.mine.rating_value)}<span>{said(pair.theirs.rating_value)}</span></span>
        <span className={'pn-pair-apart' + (near ? ' pn-pair-apart--near' : '')}>{apart}</span>
      </div>
    </div>
  );
}

// How many covers across in what they have sent you. Five, as her mockup
// draws the shelf (2026-10-20); it was four, the faces in the book, until
// the page became a picture.
const SENT_ACROSS = 5;

// A flat list into rows. CSS grid has no way to say "after whichever row
// that item landed in", so the rows are real and the detail is a sibling of
// the one it belongs under.
function chunk(list, per) {
  const out = [];
  for (let i = 0; i < list.length; i += per) out.push(list.slice(i, i + per));
  return out;
}

const ARGUMENT_WORDS = ['No arguments', 'One argument', 'Two arguments', 'Three arguments'];

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
  // What you have sent them that they have not logged yet (the inbox's
  // Sent list, library/sent_actions.js), narrowed to them. No age and no
  // count on it, as there is none on that list.
  const [out, setOut] = useState([]);
  // Which sent record is showing its name and its note. Miyel, 2026-09-19:
  // "in the what ___ has sent you, show them as just album covers; when
  // clicked the actual name and note can open." Covers first because that is
  // how a shelf is read — you know the record by its face long before you
  // read its name — and because a column of rows for four sends was a table
  // where a handful of squares is a shelf.
  const [openSend, setOpenSend] = useState(null);

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
        fetch('/api/sent').then(r => (r.ok ? r.json() : { sent: [] })).then(d4 => {
          if (!gone) setOut((d4.sent || []).filter(s => tidyJournal(s.journal) === tidyJournal(p.address)));
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
    const rings = new Set(disagree.map(p => p.mine.slug));

    const sends = sent.map(s => {
      const logged = mineLatest.get(albumKey(s.album, s.artist)) || null;
      const rating = logged ? num(logged.rating_value) : null;
      return { ...s, logged, rating, hit: rating !== null && rating >= HIT };
    });
    // What they are credited on, 2026-09-14: entries whose sender resolves
    // to this address — a record logged from the old Tumblr and credited to
    // them later has no send row, only the name and journal on the entry.
    // One per record, and never a second copy of a send already counted. It
    // carries no send date on purpose (the brief: the entry's own date is
    // the ceiling), so it falls in with the others by the day it was logged.
    const address = tidyJournal(person?.address);
    const counted = new Set(sends.map(s => albumKey(s.album, s.artist)));
    if (address) {
      for (const e of newestFirst(mine)) {
        if (tidyJournal(e.received_from_url) !== address || counted.has(e.album_key)) continue;
        counted.add(e.album_key);
        const logged = mineLatest.get(e.album_key) || e;
        const rating = num(logged.rating_value);
        sends.push({
          id: `credited-${e.id}`, album: e.album, artist: e.artist, year: e.year, album_art: e.album_art,
          created_at: null, note: null, logged, rating, hit: rating !== null && rating >= HIT,
        });
      }
    }
    const when = s => new Date(s.created_at || s.logged?.posted_at || 0);
    sends.sort((a, b) => when(b) - when(a));
    const loggedCount = sends.filter(s => s.logged).length;
    const hits = sends.filter(s => s.hit).length;
    // The hit rate is of what you logged, as her mockup counts it ("5 of 7,
    // you rated four or more"): a record you have not got to yet is not a
    // miss. The average is of the ones you rated.
    const ratedSends = sends.filter(s => s.rating !== null);
    const average = ratedSends.length ? ratedSends.reduce((sum, s) => sum + s.rating, 0) / ratedSends.length : null;

    return { pairs, rated, offset, alike, agree, disagree, rings, sends, loggedCount, hits, average };
  }, [mine, theirs, sent, person]);

  if (checking) return <div style={{ minHeight: '100vh', background: 'var(--bg)' }} />;
  if (!authed) { if (typeof window !== 'undefined') window.location.replace('/login'); return null; }

  // The offset, the third number: which way their stars sit from yours and
  // how far, once three records in common make it worth saying.
  const trusted = facts.rated.length >= OFFSET_NEEDS;
  const leaning = Math.round(facts.offset * 10) / 10;
  const offsetSaid = !trusted ? '—' : leaning === 0 ? '0' : `${leaning > 0 ? '+' : '−'}${Math.abs(leaning).toFixed(1)}`;
  const offsetCaption = !trusted ? 'How they rate' : leaning > 0 ? 'They rate higher' : leaning < 0 ? 'They rate lower' : 'You rate alike';

  const shapeEmpty = !theirs
    ? null
    : facts.rated.length === 0
      ? (facts.pairs.length ? 'Nothing you have both rated yet.' : 'Nothing you both have yet.')
      : null;

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
          <div className="pn-head"><div className="own-skeleton" style={{ width: 56, height: 56, borderRadius: '50%' }} /></div>
        ) : (
          <>
            <header className="pn-head">
              <Face address={person.address} />
              <div className="pn-head-said">
                <h1 className="pn-name">{name}</h1>
                <span className="pn-kicker">Your page about them</span>
              </div>
              {/* "Visit their journal" stood here until 2026-09-22. Miyel: "we
                  can remove the link to their journal on the compare page
                  because you can just simply go to their journal from the
                  actual friends page." One way there, from the faces. */}
            </header>

            <div className="pn-sheet">
              {theirs?.failed && (
                <p className="pn-note">{name}&rsquo;s journal isn&rsquo;t answering just now, so only what they&rsquo;ve put you onto is here.</p>
              )}

              {!theirs?.failed && (
                <>
                  {theirs
                    ? <Shape pairs={facts.rated} rings={facts.rings} name={name} empty={shapeEmpty} />
                    : <div className="own-skeleton pn-shape-waiting" />}

                  <div className="pn-numbers">
                    <div className="pn-number"><b>{theirs ? facts.pairs.length : '—'}</b><span>Both have</span></div>
                    <div className="pn-number"><b>{facts.rated.length ? <>{facts.alike.length}<small>of {facts.rated.length}</small></> : '—'}</b><span>Rated alike</span></div>
                    <div className="pn-number"><b>{offsetSaid}</b><span>{offsetCaption}</span></div>
                  </div>

                  <Section
                    title={ARGUMENT_WORDS[facts.disagree.length]}
                    note={facts.disagree.length ? 'Allowing for how each rates' : null}
                    rows={facts.disagree}
                    empty={facts.rated.length ? 'Nowhere, allowing for how each of you rates.' : 'Nothing you both have yet.'}
                  >
                    {p => <Pair key={p.mine.slug} pair={p} />}
                  </Section>

                  <Section
                    title="Where you agree hardest"
                    rows={facts.agree}
                    empty={facts.rated.length ? 'Nowhere yet, allowing for how each of you rates.' : 'Nothing you both have yet.'}
                  >
                    {p => <Pair key={p.mine.slug} pair={p} near />}
                  </Section>
                </>
              )}

              {/* ── What they have put you onto ────────────────────────────
                  The part only this copy knows: their journal can show their
                  records and their ratings, never what they sent you and
                  whether it landed. Their hit rate as two numbers, then the
                  sends as covers with green where you logged it.

                  The grid is chunked into rows so a record's detail can open
                  directly under the row it is in, which is the same thing
                  the friends pane does with a face and for the same reason:
                  a panel a row away from the thing that opened it is a panel
                  about nothing.

                  A cover that has not been logged is greyed, which is the
                  site's one way of saying a record is not in hand — the
                  beacon's idle art and the past listens beside it wear the
                  same filter. So the shelf answers "what did they send me
                  and what have I got to" before anything is pressed. */}
              {facts.sends.length > 0 && (
                <section className="pn-section">
                  <div className="pn-section-head"><span className="pn-section-title">Their hit rate with you</span></div>
                  <div className="pn-numbers pn-numbers--two">
                    <div className="pn-number"><b>{facts.loggedCount ? <>{facts.hits}<small>of {facts.loggedCount}</small></> : '—'}</b><span>You rated four or more</span></div>
                    <div className="pn-number"><b>{facts.average === null ? '—' : facts.average.toFixed(1)}</b><span>Average when you did</span></div>
                  </div>
                </section>
              )}
              <Section
                title={facts.sends.length === 1 ? 'One send' : facts.sends.length ? `${facts.sends.length} sends` : `What ${name} has put you onto`}
                note={facts.loggedCount ? 'Green means you logged it' : null}
                rows={facts.sends}
                empty={`${name} hasn't put you onto anything yet.`}
                all={chunk(facts.sends, SENT_ACROSS).map((row, i) => {
                  const here = row.find(x => x.id === openSend) || null;
                  return (
                    <div key={i} className={'pn-sent-row' + (here ? ' pn-sent-row--open' : '')}>
                      <div className="pn-sent-grid">
                        {row.map(x => (
                          <button
                            key={x.id}
                            type="button"
                            className={'pn-sent' + (here?.id === x.id ? ' pn-sent--open' : '')}
                            onClick={() => setOpenSend(o => (o === x.id ? null : x.id))}
                            aria-expanded={here?.id === x.id}
                            title={`${x.album} — ${x.artist}`}
                          >
                            <span className={'pn-sent-art' + (x.logged ? '' : ' pn-sent-art--unlogged')}>
                              {x.album_art
                                ? <img src={x.album_art} alt="" loading="lazy" />
                                : <span className="pn-sent-none" aria-hidden="true">♪</span>}
                            </span>
                            {x.logged && <span className="pn-sent-dot" aria-label="Logged" />}
                          </button>
                        ))}
                      </div>
                      {here && (
                        <div className="pn-sent-said">
                          {here.logged
                            ? <Link href={`/entries/${here.logged.slug}`} className="pn-item-album">{here.album}</Link>
                            : <span className="pn-item-album">{here.album}</span>}
                          <div className="pn-item-artist">
                            {here.artist}{here.year ? ` · ${here.year}` : ''}
                            {here.created_at && <> &middot; {new Date(here.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</>}
                          </div>
                          {here.note && <p className="pn-item-note">{here.note}</p>}
                          <div className="pn-sent-tail">
                            {here.logged
                              ? (here.rating !== null ? <StarRating rating={here.rating} size={12} /> : <span className="pn-gap">Logged</span>)
                              : <span className="pn-gap">Not logged yet</span>}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              >
                {() => null}
              </Section>

              {/* What you have sent them that has not come back. The record
                  and that you sent it: no age and no reminder, the inbox's
                  Sent list's rule (library/sent_actions.js). */}
              {out.length > 0 && (
                <section className="pn-section">
                  <div className="pn-section-head"><span className="pn-section-title">Still out</span></div>
                  {out.map(s => (
                    <div key={s.id} className="pn-pair">
                      <span className="pn-item-art">{s.album_art && <img src={s.album_art} alt="" loading="lazy" />}</span>
                      <div className="pn-item-said">
                        <span className="pn-item-album">{s.song || s.album}</span>
                        <div className="pn-item-artist">You sent it</div>
                      </div>
                    </div>
                  ))}
                </section>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
