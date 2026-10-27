// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
// app/dashboard/people/[id]/page.js
// A friend's journal page, on your own copy.
//
// ── Their journal, drawn by yours, 2026-10-26 ─────────────────────────────
// Miyel's Friends answers: "the page is mine, the data is theirs." It was
// your page about them, a report — Compare's numbers and lists — and it is
// now their journal as your journal draws it: a strip with their face and
// their name, then their beacon, the line and the wall, the same components
// home uses handed their rows, so a web of sites reads as one app. Nothing
// is framed and nothing of theirs is drawn by them; the records come from
// their public feed and their beacon, the allow-listed reads every journal
// already answers, and the writing stays on their journal, where every
// record here opens.
//
// Read in the browser, as Compare and People always have been: their public
// feed and beacon from their journal, your own records and the sends from
// them from this copy. Nothing is stored and nobody learns they were looked
// at.
//
// ── Compare is a view here, not the page ──────────────────────────────────
// What this page was, opened in place under the strip and rolled up again:
// how many records you both have, where you agree and disagree hardest, what
// they have sent you and how it landed. It is still cumulative and still
// only yours, which is why it can hold what their journal never could.
// (What only they have heard was a list here too, and came off on Miyel's
// call, 2026-09-13: their journal is a tap away and says it better.)
//
// Rated alike allows for how each of you rates: a generous rater and a
// harsh one with the same taste should come out alike (DECISIONS, The
// journal), so their ratings are shifted by the average difference across
// what you both have before the gap is measured. Three records in common
// are the least that offset is trusted on.
//
// The strip carries Compare, Added and Wave (Miyel: "Wave once added"), and
// the foot of the wall carries what you have sent them that is still out —
// the inbox's Sent door, for one person — and Remove. Pin went, her call.

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { CaretLeft, Check, HandWaving, Printer, Shuffle, User, UserCheck } from '@phosphor-icons/react';
import SiteNav from '../../../../components/main_components/SiteNav';
import StarRating from '../../../../components/main_components/StarRating';
import Journal, { foldForSearch, gatherAlbums } from '../../../../components/main_components/Journal';
import { BeaconCard } from '../../../../components/main_components/ListeningBeacon';
import SentList from '../../../../components/main_components/SentList';
import { albumKey } from '../../../../hooks/useListeningBeacon';
import { carrySender, journalUrl, tidyJournal } from '../../../../library/return_address';
import { useBookplate } from '../../../../components/main_components/Bookplate';
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
// Their beacon is asked again on People's clock while the page is on screen.
const BEACON_MS = 60000;
// Where the wall's view is remembered, apart from home's and People's.
const VIEW_KEY = 'ln-person-view';

const num = v => (v === null || v === undefined || v === '' ? null : Number(v));
const newestFirst = rows => [...rows].sort((a, b) => new Date(b.posted_at) - new Date(a.posted_at));

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

// "Keeping since March", or "since March 2024" when it was not this year:
// their oldest entry, which for a journal that brought an archive in is the
// archive's start, and that is when they began keeping one.
function keepingSince(entries) {
  let first = null;
  for (const e of entries) {
    const at = new Date(e.posted_at);
    if (!Number.isNaN(at.getTime()) && (!first || at < first)) first = at;
  }
  if (!first) return '';
  return first.toLocaleDateString(undefined, first.getFullYear() === new Date().getFullYear()
    ? { month: 'long' }
    : { month: 'long', year: 'numeric' });
}

// The nearest box that scrolls: the layer's sheet when this arrives over the
// journal, nothing (the page itself) when it is opened on its own.
function scrollingBox(el) {
  for (let at = el?.parentElement; at; at = at.parentElement) {
    const y = getComputedStyle(at).overflowY;
    if (y === 'auto' || y === 'scroll') return at;
  }
  return null;
}

function Face({ address }) {
  return (
    <span className="pn-face" aria-hidden="true">
      <User size={22} weight="regular" />
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

// How many covers across in what they have sent you. Four, like the faces in
// the book — this page and that pane are the same two objects at two sizes,
// and a record is drawn the same square as a person here.
const SENT_ACROSS = 4;

// A flat list into rows. CSS grid has no way to say "after whichever row
// that item landed in", so the rows are real and the detail is a sibling of
// the one it belongs under.
function chunk(list, per) {
  const out = [];
  for (let i = 0; i < list.length; i += per) out.push(list.slice(i, i + per));
  return out;
}

export default function PersonPage({ layered = false }) {
  const { id } = useParams();
  const router = useRouter();
  // Who this copy belongs to, carried on every link out to another journal
  // so the form there knows who is sending. See carrySender.
  const { keeper_name: myName, site_address: myAddress } = useBookplate();
  const me = useMemo(() => ({ name: myName, address: myAddress }), [myName, myAddress]);
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
  // Their beacon as their journal answers it; null until it has.
  const [beacon, setBeacon] = useState(null);
  const [mine, setMine] = useState([]);
  const [sent, setSent] = useState([]);
  // Which sent record is showing its name and its note. Miyel, 2026-09-19:
  // "in the what ___ has sent you, show them as just album covers; when
  // clicked the actual name and note can open." Covers first because that is
  // how a shelf is read — you know the record by its face long before you
  // read its name — and because a column of rows for four sends was a table
  // where a handful of squares is a shelf.
  const [openSend, setOpenSend] = useState(null);
  const [comparing, setComparing] = useState(false);
  // 'idle' · 'waving' · 'waved' · 'failed', with what went wrong beside it.
  const [wave, setWave] = useState('idle');
  const [waveSaid, setWaveSaid] = useState('');
  const [sure, setSure] = useState(false);
  const [removing, setRemoving] = useState(false);

  const rootRef = useRef(null);
  // Handed to the wall, which draws more as its foot nears the edge of this.
  // Set in a layout effect so it is in place before the wall's own effects
  // first look at it.
  const scroller = useRef(null);
  useLayoutEffect(() => { scroller.current = scrollingBox(rootRef.current); });

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

  // Their beacon: asked on arrival and again each minute while the tab is
  // in view. A journal that does not answer keeps the last thing it said.
  const address = person ? person.address : '';
  useEffect(() => {
    if (!address) return undefined;
    let gone = false;
    const ask = () => {
      if (document.hidden) return;
      fetch(`${journalUrl(address)}/api/public/beacon`, { signal: AbortSignal.timeout(EACH_MS) })
        .then(r => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
        .then(b => {
          if (gone) return;
          setBeacon({
            state: b.state || 'nothing', album: b.album || '', artist: b.artist || '', art: b.art || '',
            track: b.track || '', isLive: b.state === 'logging',
          });
        })
        .catch(() => {});
    };
    ask();
    const timer = setInterval(ask, BEACON_MS);
    document.addEventListener('visibilitychange', ask);
    return () => { gone = true; clearInterval(timer); document.removeEventListener('visibilitychange', ask); };
  }, [address]);

  const name = theirs?.name || person?.name || 'them';
  const since = useMemo(() => keepingSince(theirs?.entries || []), [theirs]);
  const records = useMemo(() => gatherAlbums(theirs?.entries || []), [theirs]);

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
    // What they are credited on, 2026-09-14: entries whose sender resolves
    // to this address — a record logged from the old Tumblr and credited to
    // them later has no send row, only the name and journal on the entry.
    // One per record, and never a second copy of a send already counted. It
    // carries no send date on purpose (the brief: the entry's own date is
    // the ceiling), so it falls in with the others by the day it was logged.
    const theirAddress = tidyJournal(person?.address);
    const counted = new Set(sends.map(s => albumKey(s.album, s.artist)));
    if (theirAddress) {
      for (const e of newestFirst(mine)) {
        if (tidyJournal(e.received_from_url) !== theirAddress || counted.has(e.album_key)) continue;
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

    return { pairs, rated, offset, alike, agree, disagree, sends, loggedCount, hits };
  }, [mine, theirs, sent, person]);

  const there = address ? journalUrl(address) : '';
  // Every link to their journal carries who this copy belongs to.
  const theirEntry = useCallback(e => carrySender(`${there}/entries/${e.slug}`, me, { known: true }), [there, me]);

  // Their record, drawn the way People draws a friend's: the cover, opening
  // their entry on their journal, where the writing is.
  const tile = useCallback(album => {
    const face = album.face;
    const folded = album.listens.length === 0;
    return (
      <a
        href={theirEntry(face)}
        target="_blank"
        rel="noopener noreferrer"
        className={'ft' + (folded ? ' ft--page' : '')}
        data-tile-key={album.key}
        aria-label={face.album + (face.artist ? ` by ${face.artist}` : '')}
      >
        <div className="ft-inner">
          <div className={'ft-face ft-face--front' + (folded ? ' ln-fold' : '')}>
            {face.album_art
              ? <img src={face.album_art} alt="" className="ft-art" loading="lazy" draggable={false} />
              : <div className="ft-placeholder">{(face.album || '?')[0]}</div>}
            {folded && (
              <span className="ln-fold-flap" aria-hidden="true">
                {face.album_art && <img src={face.album_art} alt="" loading="lazy" draggable={false} />}
              </span>
            )}
            <div className="ft-hover">
              <div className="ft-hover-album">{face.album}</div>
              <div className="ft-hover-artist">{face.artist}</div>
            </div>
          </div>
        </div>
      </a>
    );
  }, [theirEntry]);

  const seek = useMemo(() => ({
    placeholder: 'Albums, artists or songs',
    label: `Search ${name}’s records`,
    matches: (album, q) => (foldForSearch(album.face.album).includes(q)
      || foldForSearch(album.face.artist).includes(q)
      || album.notes.some(n => foldForSearch(n.song).includes(q))),
  }), [name]);

  async function waveAt() {
    if (wave === 'waving' || wave === 'waved' || !person) return;
    setWave('waving');
    try {
      const r = await fetch('/api/outbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wave: true, person_id: person.id }),
      });
      const d = await r.json().catch(() => ({}));
      if (d.ok) { setWave('waved'); return; }
      setWaveSaid(d.error || 'The wave did not go.');
      setWave('failed');
    } catch {
      setWaveSaid('The wave did not go.');
      setWave('failed');
    }
  }

  async function remove() {
    if (!sure) { setSure(true); return; }
    setRemoving(true);
    const r = await fetch(`/api/people/${person.id}`, { method: 'DELETE' }).catch(() => null);
    if (r?.ok) { arrivingBack(); router.push('/dashboard/people'); return; }
    setRemoving(false);
    setSure(false);
  }

  if (checking) return <div style={{ minHeight: '100vh', background: 'var(--bg)' }} />;
  if (!authed) { if (typeof window !== 'undefined') window.location.replace('/login'); return null; }

  const loading = person === null || (person && theirs === null);
  const wall = person && (
    <Journal
      records={records}
      loading={loading}
      scroller={scroller}
      tile={tile}
      filters={false}
      viewKey={VIEW_KEY}
      seek={seek}
      empty={(
        <div className="arc-empty">
          {theirs?.failed
            ? <span className="arc-empty-said">{name}&rsquo;s journal isn&rsquo;t answering just now.</span>
            : <span className="arc-empty-said">Nothing logged yet.</span>}
        </div>
      )}
      foot={(
        <div className="pn-foot">
          <SentList journal={person.address} title={`Still out with ${name}`} />
          <p className="pn-quiet">
            <button
              type="button"
              className={'pn-quiet-act' + (sure ? ' pn-quiet-act--sure' : '')}
              onClick={remove}
              onBlur={() => setSure(false)}
              disabled={removing}
              aria-label={sure ? `Press again to take ${name} out of your book` : undefined}
            >
              {sure ? 'Remove?' : 'Remove'}
            </button>
          </p>
        </div>
      )}
    />
  );

  return (
    <div ref={rootRef} className={'own-screen' + (layered ? ' own-screen--layered' : '')}>
      {/* The header's left slot, where the owner's tools live on every page:
          the way back, and — while Compare is open — the printer's door, the
          press that prints the shape of the agreement and withholds the
          writing, naming both people (DECISIONS, The network). */}
      <SiteNav tools={(
        <>
          <button type="button" className="kt-tool" onClick={goBack} aria-label="Back" title="Back">
            <CaretLeft size={18} weight="regular" aria-hidden="true" />
          </button>
          {person && comparing && (
            <Link href={`/printer?person=${encodeURIComponent(id)}`} className="kt-tool" aria-label="Print the shape of the agreement" title="Print the shape of the agreement">
              <Printer size={18} weight="regular" aria-hidden="true" />
            </Link>
          )}
        </>
      )} />

      <div className="own-body pn-body">
        {person === false ? (
          <div className="own-empty">Nobody by that page. <Link href="/dashboard/people" className="own-link">Your friends</Link></div>
        ) : person === null ? (
          <div className="pn-strip"><div className="own-skeleton" style={{ width: 44, height: 44, borderRadius: '50%' }} /></div>
        ) : (
          <>
            {/* ── The strip ──────────────────────────────────────────────
                Their face, their name, a line under it, and what you can
                do from here, each a glyph over a word in the line's small
                capitals (Miyel's Friends answers). */}
            <header className="pn-strip">
              <Face address={person.address} />
              <h1 className="pn-name">{name}</h1>
              {/* Under the name and the doors both, so it has the width it
                  needs on a phone. */}
              <div className="pn-sub">{since ? `Keeping since ${since} · ` : ''}In your friends</div>
              <div className="pn-acts">
                <button
                  type="button"
                  className={'pn-act' + (comparing ? ' pn-act--on' : '')}
                  onClick={() => setComparing(c => !c)}
                  aria-expanded={comparing}
                >
                  <Shuffle size={20} weight="regular" aria-hidden="true" />
                  Compare
                </button>
                <span className="pn-act pn-act--still">
                  <UserCheck size={20} weight="regular" aria-hidden="true" />
                  Added
                </span>
                <button
                  type="button"
                  className={'pn-act' + (wave === 'waved' ? ' pn-act--on' : '')}
                  onClick={waveAt}
                  disabled={wave === 'waving'}
                  aria-label={wave === 'waved' ? `You waved at ${name}` : `Wave at ${name}`}
                >
                  {wave === 'waved'
                    ? <Check size={20} weight="regular" aria-hidden="true" />
                    : <HandWaving size={20} weight="regular" aria-hidden="true" />}
                  {wave === 'waved' ? 'Waved' : 'Wave'}
                </button>
              </div>
            </header>
            {wave === 'failed' && <p className="pn-said" role="status">{waveSaid}</p>}

            {/* ── Compare, opened in place ─────────────────────────────── */}
            <div className={'pn-compare' + (comparing ? ' pn-compare--open' : '')} aria-hidden={!comparing} inert={!comparing}>
              <div className="pn-compare-in">
                {theirs?.failed && (
                  <p className="pn-note">{name}&rsquo;s journal isn&rsquo;t answering just now, so only what they&rsquo;ve put you onto is here.</p>
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

                {/* ── What they have sent you ─────────────────────────────
                    Covers, and the name and the note behind a press. The
                    grid is chunked into rows so a record's detail can open
                    directly under the row it is in, which is the same thing
                    the friends pane does with a face and for the same
                    reason: a panel a row away from the thing that opened it
                    is a panel about nothing.

                    A cover that has not been logged is greyed, which is the
                    site's one way of saying a record is not in hand — the
                    beacon's idle art and the past listens beside it wear the
                    same filter. So the shelf answers "what did they send me
                    and what have I got to" before anything is pressed. */}
                <Section
                  title={`What ${name} has put you onto`}
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
              </div>
            </div>

            {/* ── Their beacon ─────────────────────────────────────────── */}
            {beacon && (
              <section className="pn-beacon" aria-label={`What ${name} is logging`}>
                <BeaconCard beacon={beacon} />
                {/* Home's beacon says it is live with the dot on the mark;
                    theirs has no mark here, so it says it under the record,
                    as People's line does. */}
                {beacon.isLive && (
                  <p className="pn-live"><span className="pn-live-dot" aria-hidden="true" />Logging</p>
                )}
              </section>
            )}
          </>
        )}
      </div>

      {/* ── Their wall ─────────────────────────────────────────────────
          Outside the narrow column, at the width home's wall is drawn. */}
      {wall && <div className="pn-wall hn-under">{wall}</div>}
    </div>
  );
}
