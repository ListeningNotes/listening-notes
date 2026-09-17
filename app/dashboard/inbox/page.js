// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Archive, ArrowUpRight, Check, PencilSimple, Plus, User } from '@phosphor-icons/react';
import Link from 'next/link';
import SiteNav from '../../../components/main_components/SiteNav';
import MiniAddressBook from '../../../components/main_components/MiniAddressBook';
import { carrySender, journalUrl, tidyJournal } from '../../../library/return_address';
import { useBookplate } from '../../../components/main_components/Bookplate';
import { albumKey } from '../../../hooks/useListeningBeacon';
import { lookup_key } from '../../../library/entry_formatter';

// ── What became of a send ──────────────────────────────────────────────────
// Four outcomes in the database: pending, reviewed (a listen was started
// from the row, before any entry exists), logged (a record exists and the
// send points at it), and the one the inbox calls archived.
//
// Archived is stored as 'dismissed', 2026-09-15. The word on screen changed
// — a send you put aside has been filed, not rejected, and it comes back
// with one press — and the stored value did not, because renaming a value
// means rewriting rows on every copy to say the same thing differently.
// The constant is what the code reads; the string is what the column holds.
//
// Two views over them, 2026-09-15. From the inbox's side a send is either
// new or opened, and started, logged and archived are all opened — so
// which of them it is becomes a word in the row's subtitle rather than a
// tab you have to be standing on to see it. Four tabs asked somebody to
// know the vocabulary before they could find anything.
//
// And they are not views you stand on, 2026-09-15. New was never a place —
// it is a property of a row, the way unread is in mail, and nobody keeps a
// read tab and an unread tab. Splitting them meant a send in progress had no
// actions at all, which is how an album Jr sent had nowhere to record that
// he has a journal now. One list, newest first, a dot for what is new, and
// the state as a word in the row's own subtitle.
const UNOPENED = 'pending';
const ARCHIVED = 'dismissed';

// What the subtitle says on an opened row. A date only where there is one
// worth printing: a logged send carries its record's own posted date, and
// the other two have nothing better than the day the send arrived, which is
// already the row above it.
function became(sent) {
  if (sent.status === 'logged') {
    const when = sent.entry_posted_at
      ? ` ${new Date(sent.entry_posted_at).toLocaleDateString(undefined, { day: 'numeric', month: 'long' }).toLowerCase()}`
      : '';
    return `logged${when}`;
  }
  if (sent.status === 'reviewed') return 'in progress';
  if (sent.status === ARCHIVED) return 'archived';
  // Anything else is waiting on you, including a status nothing here knows
  // about. The fallback used to be 'archived', which is how every new send
  // in the inbox came up saying it had been put away (Miyel, 2026-09-15) —
  // a fallthrough that names the rarest state is a fallthrough that lies
  // about the commonest one.
  return 'new';
}
// A folder tab that connects to the open panel when active. Module scope so
// it keeps a stable identity across renders.
function FolderTab({ id, tab, onSelect, children }) {
  return (
    <button onClick={() => onSelect(id)} className={'ib-tab' + (tab === id ? ' ib-tab--on' : '')}>
      {children}
    </button>
  );
}

// NoteModal is gone. It existed because the submissions view was a table with
// no room in it for a paragraph, so the one part of a send that mattered — why
// somebody sent it — was hidden behind a button marked "Note". The view is a
// shelf now and the message is on the front of every item, which is what it
// was always for.

export default function Inbox({ layered = false }) {
  const router = useRouter();
  // Who this copy belongs to, carried on every link out to another journal
  // so the form there knows who is sending. See carrySender.
  const { keeper_name: myName, site_address: myAddress } = useBookplate();
  const me = { name: myName, address: myAddress };

  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [tab, setTab] = useState('submissions');

  const [submissions, setSubmissions] = useState([]);
  const [subLoading, setSubLoading] = useState(true);
  // Which row is open. One at a time — an open row is a decision being made,
  // and two of them is a list of controls again.
  const [openRow, setOpenRow] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  // Unfinished listens, read once the first row opens: a row needs to know
  // whether there is a draft behind it to offer, and most visits to the
  // inbox never open anything.
  const [drafts, setDrafts] = useState(null);

  const [comments, setComments] = useState([]);
  const [comLoading, setComLoading] = useState(true);

  // Problems keepers wrote in from their desks (library/report_actions.js).
  // Only the copy the software comes from ever receives any; on every other
  // copy the tab shows nothing and says so.
  const [reports, setReports] = useState([]);
  const [repLoading, setRepLoading] = useState(true);

  // Who is already in the address book, so a send that carried a journal
  // offers to file it only once. A send is one of the ways an address gets
  // in (app/dashboard/people/page.js); this is that way.
  const [people, setPeople] = useState([]);
  const filed = new Set(people.map(p => p.address));

  // ── Saying a send was already logged ─────────────────────────────────────
  // Which row has its picker open, and what has been typed into it. The
  // journal is fetched once, the first time anybody presses the button: most
  // visits to the inbox never do, and a list of every record on every load
  // is the cost the wall was taught not to pay (DECISIONS, What a read
  // costs — this is the same lean list).
  const [naming, setNaming] = useState(null);
  const [look, setLook] = useState('');
  const [mine, setMine] = useState(null);
  // Which row is picking a sender out of the address book. A send that
  // arrived before its sender kept a journal carries a name and no address;
  // this is where that gets closed, by hand, one row at a time.
  const [whose, setWhose] = useState(null);
  // Which row is waiting on an answer about the listen already open, and what
  // is open. See startListen: a row pressed with a record in hand asks before
  // it replaces it. `keeping` is the moment between pressing Save it first and
  // the session opening, which is a write to the drafts table and a page.
  const [holding, setHolding] = useState(null);
  const [keeping, setKeeping] = useState(false);

  useEffect(() => {
    fetch('/api/auth/check').then(r => r.json()).then(d => setAuthed(!!d.authed)).catch(() => {}).finally(() => setChecking(false));
  }, []);

  useEffect(() => {
    if (!authed) return;
    fetch('/api/submissions').then(r => r.json()).then(d => { setSubmissions(d.submissions || []); setSubLoading(false); }).catch(() => setSubLoading(false));
    fetch('/api/comments/pending').then(r => r.json()).then(d => { setComments(d.comments || []); setComLoading(false); }).catch(() => setComLoading(false));
    fetch('/api/people').then(r => r.json()).then(d => setPeople(d.people || [])).catch(() => {});
    fetch('/api/reports').then(r => r.json()).then(d => { setReports(d.reports || []); setRepLoading(false); }).catch(() => setRepLoading(false));
  }, [authed]);

  async function settleReport(id, status) {
    await fetch(`/api/reports/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
    setReports(prev => prev.map(r => r.id === id ? { ...r, status } : r));
  }

  // Files a sender's journal in the address book. The server reads the name
  // off the journal; nothing here is typed.
  async function file(address) {
    const r = await fetch('/api/people', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address }),
    });
    const d = await r.json().catch(() => ({}));
    if (r.ok && d.person) setPeople(prev => [...prev.filter(p => p.id !== d.person.id), d.person]);
  }

  async function updateStatus(id, status) {
    await fetch(`/api/submissions/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
    setSubmissions(prev => prev.map(s => s.id === id ? { ...s, status } : s));
    // Archiving or putting back changes which part of the list a row belongs
    // to, so the open one closes rather than following it there.
    setOpenRow(null);
  }

  // Opens the picker on one row, and fetches the journal the first time.
  // The likely record is offered first — same album and artist, folded the
  // way two journals recognise one record — and everything else is behind
  // the field, because a send whose album is not in the journal under that
  // name is exactly the case a search is for.
  // The menu's two panels are one at a time, like the menu itself. They ask
  // different questions about the same send — which record it became, and
  // who sent it — and both open at once is the stack of controls the
  // redesign took off this row.
  // Opens one row and shuts whatever the last one had unfolded, and fetches
  // the drafts the first time anybody opens anything.
  function openSend(sent) {
    setOpenRow(o => (o === sent.id ? null : sent.id));
    setNaming(null);
    setWhose(null);
    setLook('');
    if (drafts === null) {
      setDrafts([]);
      fetch('/api/drafts')
        .then(r => (r.ok ? r.json() : null))
        .then(d => setDrafts(d?.drafts || []))
        .catch(() => setDrafts([]));
    }
  }

  function openNaming(sent) {
    setNaming(n => (n === sent.id ? null : sent.id));
    setWhose(null);
    setLook('');
    if (mine === null) {
      setMine([]);
      fetch('/api/entries').then(r => r.json()).then(d => setMine(d.entries || [])).catch(() => setMine([]));
    }
  }

  // The press itself. Two writes on the server — the send is marked logged
  // and pointed at the record, and the record is credited to the sender —
  // and the answer carries the whole shelf back, because the entry it names
  // has to arrive with it or the row would link to a slug it does not have.
  async function alreadyLogged(sent, entry) {
    const r = await fetch(`/api/submissions/${sent.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entry_id: entry.id }),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) return;
    setNaming(null);
    setLook('');
    setOpenRow(null);
    if (d.submissions) setSubmissions(d.submissions);
  }

  // ── Picking a listen back up ─────────────────────────────────────────────
  // A send that is in progress and the draft it left behind are two things
  // describing one listen, joined by nothing but the album and the artist:
  // `submissions.status` says a listen was started, and `drafts` is its own
  // table keyed on a fold of album + artist (library/database_actions.js,
  // lookup_key). So this has to *find* the draft and hand it over.
  //
  // Starting a fresh session instead would look like it worked — the album
  // screen would open on the right record — and then the first autosave
  // would write over the draft, because save_draft is an upsert on that same
  // key. Everything written into the paused listen would be gone.
  //
  // The session already knows how to be handed one: `beginListen` takes a
  // `draft` on the record it is given, which is how the picker's Resume
  // works. This is that path, reached from the inbox instead.
  async function resumeListen(sent, known = null) {
    let draft = known;
    if (!draft) {
      try {
        const d = await fetch('/api/drafts').then(r => (r.ok ? r.json() : null));
        // Against the column the draft was stored under, not a recomputation
        // of it, so a row written by an older fold still matches itself.
        const key = lookup_key(sent.album, sent.artist || '');
        draft = (d?.drafts || []).find(row => (row.lookup_key || lookup_key(row.album, row.artist || '')) === key) || null;
      } catch { /* the listen still opens; see below */ }
    }
    // With no draft found this is the same as Start a listen, which is the
    // honest answer: there is nothing to resume, because nothing was saved.
    localStorage.setItem('ln_pending_session', JSON.stringify({
      album: draft?.album || sent.album,
      artist: draft?.artist || sent.artist || '',
      year: draft?.year || sent.year || '',
      artUrl: draft?.album_art || sent.album_art || '',
      collectionId: draft?.collection_id || sent.collection_id || null,
      genre: draft?.genre || '',
      entryType: draft?.entry_type || 'Submission',
      receivedFrom: draft?.received_from || sent.submitter_name || '',
      receivedFromUrl: sent.sender_url || '',
      receivedDate: draft?.received_date
        ? String(draft.received_date).slice(0, 10)
        : (sent.created_at ? String(sent.created_at).slice(0, 10) : ''),
      creditPrivate: draft ? draft.credit_private === true : sent.quiet === true,
      // Which send this is, so posting the entry settles it rather than
      // leaving it in the inbox offering to resume a listen that is finished
      // (migrations/015). The draft's own answer first, for a listen that was
      // started from here once already.
      submissionId: draft?.submission_id ?? sent.id,
      draft,
    }));
    router.push('/session');
  }

  // Who sent it, once they have a copy. The name on the send stays as they
  // typed it — that is what they signed — and their journal is written
  // beside it, so the row's name becomes a link from here on.
  async function nameSender(sent, person) {
    const r = await fetch(`/api/submissions/${sent.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sender_url: person ? person.address : '' }),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok || !d.submission) return;
    setWhose(null);
    setSubmissions(prev => prev.map(s => (s.id === sent.id ? { ...s, sender_url: d.submission.sender_url } : s)));
  }
  // Takes a sent album into a listen. Everything the session would otherwise
  // ask for is already known here, which is the whole point of the send flow:
  //
  //   the record   — the sender picked it off a shelf of covers, so this opens
  //                  on their pressing rather than searching for it again
  //   where it's from — the session's one remaining question is "Where's it
  //                  from?", and an album that arrived in the inbox answers it
  //                  by having arrived in the inbox
  //   who sent it  — received_from used to be typed in from memory a week
  //                  later. It fills itself in from the row now, along with
  //                  the date the send is stamped with.
  //
  // So this goes straight to the session rather than through the Listen page,
  // the same way resuming a saved draft does, and for the same reason: there
  // is nothing left to ask.
  //
  // Marked reviewed before leaving, and awaited — a fetch left in flight while
  // the router navigates is a fetch that may never land, and the row would
  // still be sitting in Pending when the listen was finished.
  // ── Starting a listen while one is already open ──────────────────────────
  // On a desk the session is the right page and this is a sheet over the left
  // one, so both are on screen at once and pressing Start a listen on a row
  // is an easy thing to do with a record already in hand. Replacing it
  // silently would look like it worked and then quietly eat what had been
  // written: the browser holds one draft at a time (ln_session_draft), and the
  // first autosave on the new record writes over it.
  //
  // So it asks, which is the care the resume path already takes — that one
  // finds the draft and hands it over rather than starting fresh on top of it.
  // Only when there is something to lose: the local draft is written only once
  // a word has been typed, so its absence, or its being about a different
  // record than the one in hand, means nothing has been written and there is
  // nothing to ask about.
  function openListen() {
    try {
      const held = JSON.parse(localStorage.getItem('ln_pending_session'));
      if (!held?.album) return null;
      const written = JSON.parse(localStorage.getItem('ln_session_draft'));
      if (!written || written.album !== held.album) return null;
      return { ...held, written };
    } catch { return null; }
  }

  // What is on screen in the open listen, written to the drafts table. The
  // same shape useSessionDraft.save posts, built from the browser's two keys
  // instead of from React's state — the session is not mounted here. The row
  // is an upsert on album + artist, so doing this when the automatic save has
  // already run costs one write and changes nothing.
  async function keepOpenListen(held) {
    const w = held.written;
    const rows = (Array.isArray(w.tracks) ? w.tracks : []).map((t, i) => ({
      number: t.number || i + 1,
      title: t.title,
      duration: t.duration ?? null,
      rating: (w.trackRatings || {})[i] || 0,
      favorite: !!(w.trackFavorites || {})[i],
      note: ((w.trackNotes || {})[i] || '').trim(),
    }));
    await fetch('/api/drafts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        album: w.album,
        artist: w.artist || held.artist || '',
        year: w.year || held.year || '',
        genre: held.genre || '',
        entry_type: w.entryType || held.entryType || 'Album',
        album_art: w.albumArt || held.artUrl || '',
        collection_id: held.collectionId || null,
        step: w.step || 0,
        elapsed: 0,
        rating: w.rating || 0,
        masterpiece: !!w.Masterpiece,
        favorite: !!w.Favorite,
        formative: !!w.Formative,
        notes: w.overallNotes || '',
        tracks: rows,
        received_from: held.receivedFrom || '',
        received_date: held.receivedDate || '',
        received_from_url: held.receivedFromUrl || '',
        credit_private: held.creditPrivate === true,
        submission_id: held.submissionId ?? null,
      }),
    });
    // The browser's copy goes with it. Left behind, the new record's session
    // would find a draft under somebody else's album at the next reload.
    try { localStorage.removeItem('ln_session_draft'); } catch { /* storage off */ }
  }

  // Ask first, when there is a different record in hand with writing on it.
  async function startListen(sent) {
    const held = openListen();
    if (held && held.album !== sent.album) { setHolding({ id: sent.id, held }); return; }
    await beginListen(sent);
  }

  // Save what is open, then start the new one.
  async function keepThenStart(sent, held) {
    setKeeping(true);
    try { await keepOpenListen(held); } catch { /* the ask stays up; see below */ }
    setKeeping(false);
    setHolding(null);
    await beginListen(sent);
  }

  async function beginListen(sent) {
    localStorage.setItem('ln_pending_session', JSON.stringify({
      album: sent.album,
      artist: sent.artist || '',
      year: sent.year || '',
      artUrl: sent.album_art || '',
      collectionId: sent.collection_id || null,
      genre: '',
      entryType: 'Submission',
      receivedFrom: sent.submitter_name || '',
      // Their journal, so the credit on the entry can name it exactly
      // (migrations/008_received_from_url.sql).
      receivedFromUrl: sent.sender_url || '',
      receivedDate: sent.created_at ? String(sent.created_at).slice(0, 10) : '',
      // Whether they asked not to be credited, carried the whole way so the
      // entry is written with the answer already in it.
      creditPrivate: sent.quiet === true,
      // And which send it is, so posting the entry settles this row instead of
      // leaving it pending (migrations/015).
      submissionId: sent.id,
    }));
    await updateStatus(sent.id, 'reviewed');
    router.push('/session');
  }

  async function approveComment(id) {
    await fetch(`/api/comments/${id}`, { method: 'PATCH' });
    setComments(prev => prev.filter(c => c.id !== id));
  }
  async function dismissComment(id) {
    await fetch(`/api/comments/${id}`, { method: 'DELETE' });
    setComments(prev => prev.filter(c => c.id !== id));
  }

  const unopened = s => s.status === UNOPENED;
  // One list, newest first — which is how the rows arrive. Archived come out
  // of it and sit behind a line at the foot; opened, they go on the end
  // rather than back into the order, so nothing a keeper has put away
  // reappears in the middle of what has not been dealt with.
  const live = submissions.filter(s => s.status !== ARCHIVED);
  const archivedRows = submissions.filter(s => s.status === ARCHIVED);
  const archivedCount = archivedRows.length;
  const shown = showArchived ? [...live, ...archivedRows] : live;
  const counts = { new: submissions.filter(unopened).length };
  // The folder tab still counts what is waiting, which is the number worth
  // interrupting anybody with.
  const subCounts = { pending: counts.new };

  // The draft behind a send, if there is one. Matched on the fold that keys
  // the drafts table — see resumeListen for why it has to be that one.
  function draftFor(sent) {
    if (!drafts || drafts.length === 0) return null;
    const key = lookup_key(sent.album, sent.artist || '');
    return drafts.find(row => (row.lookup_key || lookup_key(row.album, row.artist || '')) === key) || null;
  }

  // What the picker offers on the open row: the likely record first, then
  // whatever is typed. albumKey is the same fold two journals use to
  // recognise one record through different punctuation, so a send for
  // "Beyoncé — Lemonade" finds the entry however either was typed.
  function candidates(sent) {
    const all = mine || [];
    const typed = look.trim().toLowerCase();
    if (typed) {
      return all
        .filter(e => `${e.album} ${e.artist}`.toLowerCase().includes(typed))
        .slice(0, 8);
    }
    const key = albumKey(sent.album, sent.artist);
    return all.filter(e => e.album_key === key).slice(0, 8);
  }

  if (checking) return <div style={{ minHeight: '100vh', background: 'var(--bg)' }} />;
  if (!authed) { if (typeof window !== 'undefined') window.location.replace('/login'); return null; }


  return (
    <div className={'own-screen' + (layered ? ' own-screen--layered' : '')}>
      <SiteNav />

      <div className="own-body ib-body">
        <div className="ib-tabs">
          <FolderTab id="submissions" tab={tab} onSelect={setTab}>Submissions{subCounts.pending > 0 ? ` (${subCounts.pending})` : ''}</FolderTab>
          <FolderTab id="comments" tab={tab} onSelect={setTab}>Comments{comments.length > 0 ? ` (${comments.length})` : ''}</FolderTab>
          {(() => { const open = reports.filter(r => r.status === 'pending').length; return (
            <FolderTab id="reports" tab={tab} onSelect={setTab}>Reports{open > 0 ? ` (${open})` : ''}</FolderTab>
          ); })()}
        </div>

        {/* The open folder */}
        <div className="own-panel ib-panel">
          <div className="ib-scroll">

            {/* ── SUBMISSIONS ── */}
            {tab === 'submissions' && (
              <>
                {subLoading ? (
                  <div className="ib-list" style={{ gap: 10 }}>
                    {[...Array(4)].map((_, i) => <div key={i} className="own-skeleton" style={{ height: 46 }} />)}
                  </div>
                ) : submissions.length === 0 ? (
                  <div className="own-empty">Nothing has been sent to you yet.</div>
                ) : (
                  <>
                    <div className="ib-count">
                      {counts.new > 0 && <>{counts.new} new &middot; </>}
                      {submissions.length} in all
                    </div>

                    <div className="ib-list">
                      {shown.map(sent => {
                        const archived = sent.status === ARCHIVED;
                        const open = openRow === sent.id;
                        const host = tidyJournal(sent.sender_url);
                        const who = sent.submitter_name || 'someone';
                        const draft = draftFor(sent);
                        return (
                          <div key={sent.id} className={'ib-r' + (archived ? ' ib-r--arch' : '') + (open ? ' ib-r--open' : '')}>
                            {/* Closed, a row is the cover, the album, what
                                state it is in, and whose face it came from.
                                Pressing it opens it where it sits — it does
                                not take you into a listen, which is the
                                thing this replaced. */}
                            <button
                              className="ib-rhead"
                              onClick={() => openSend(sent)}
                              aria-expanded={open}
                            >
                              {/* New is a property of the row, the way unread
                                  is in mail. A dot, not a tab. */}
                              <span className={'ib-newdot' + (unopened(sent) ? '' : ' ib-newdot--off')} aria-hidden="true" />
                              <span className="ib-rart">
                                {sent.album_art
                                  ? <img src={sent.album_art} alt="" loading="lazy" />
                                  : <span className="ib-nocover" aria-hidden="true">&#9834;</span>}
                              </span>
                              <span className="ib-rsaid">
                                <span className="ib-rttl">{sent.album}</span>
                                {/* Open, the state is the actions below, so
                                    the line goes back to being about the
                                    record. */}
                                <span className="ib-rsub">
                                  {sent.artist}
                                  {open
                                    ? (sent.year ? ` · ${sent.year}` : '')
                                    : ` · ${became(sent)}`}
                                </span>
                              </span>
                              <span className="ib-rface" aria-hidden="true">
                                <User size={13} weight="regular" />
                                {host && <img src={`${journalUrl(host)}/api/portrait`} alt="" loading="lazy" onError={e => { e.currentTarget.style.display = 'none'; }} />}
                              </span>
                            </button>

                            {open && (
                              <div className="ib-open">
                                <div className="ib-from">
                                  <span className="ib-from-face" aria-hidden="true">
                                    <User size={12} weight="regular" />
                                    {host && <img src={`${journalUrl(host)}/api/portrait`} alt="" loading="lazy" onError={e => { e.currentTarget.style.display = 'none'; }} />}
                                  </span>
                                  <span className="ib-from-nm">
                                    From{' '}
                                    {host
                                      ? <a href={carrySender(journalUrl(host), me, { known: filed.has(host) })} target="_blank" rel="noopener noreferrer">{who}</a>
                                      : <span>{who}</span>}
                                  </span>
                                  <span className="ib-from-dt">{new Date(sent.created_at).toLocaleDateString()}</span>
                                </div>

                                {/* The message is here and only here. It is
                                    what you read in order to decide, so it
                                    is out while you are deciding and folded
                                    away when you are not. */}
                                {sent.note && <p className="ib-msg">{sent.note}</p>}

                                {/* One primary, chosen by the state the send
                                    is in. An archived row's is the way back,
                                    which is why archiving needs no undo
                                    control of its own. */}
                                {archived ? (
                                  <button className="ib-primary" onClick={() => updateStatus(sent.id, UNOPENED)}>
                                    Put back
                                  </button>
                                ) : sent.status === 'logged' && sent.entry_slug ? (
                                  <Link className="ib-primary" href={`/entries/${sent.entry_slug}`}>
                                    Open the entry &#8594;
                                  </Link>
                                ) : sent.status === 'reviewed' ? (
                                  <button className="ib-primary" onClick={() => resumeListen(sent, draft)}>
                                    Resume the listen &#8594;
                                  </button>
                                ) : (
                                  <button className="ib-primary" onClick={() => startListen(sent)}>
                                    Start a listen &#8594;
                                  </button>
                                )}

                                {/* The quiet ones, as rows rather than
                                    buttons. The sender's is here whatever
                                    state the send is in — an album
                                    half-listened-to whose sender has since
                                    made a journal had nowhere to say so,
                                    which is what this whole change is for. */}
                                <div className="ib-acts">
                                  {/* Where they sent it from, when they sent
                                      it from a record's own page on their own
                                      copy (migrations/016_sender_entry.sql).
                                      Their journal plus their slug is a URL,
                                      which is the only kind of reference that
                                      means the same thing in two databases —
                                      and it is the one thing on this row that
                                      is about what THEY thought of it, so it
                                      leads out rather than doing anything
                                      here. Absent for every send off the
                                      visitor form, which is most of them. */}
                                  {host && sent.sender_entry && (
                                    <a
                                      className="ib-act"
                                      href={`${journalUrl(host)}/entries/${sent.sender_entry}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      <span className="ib-act-ic" aria-hidden="true"><ArrowUpRight size={13} weight="bold" /></span>
                                      Read {who}&rsquo;s listen
                                    </a>
                                  )}

                                  {unopened(sent) && (
                                    <button className="ib-act" onClick={() => openNaming(sent)}>
                                      <span className="ib-act-ic" aria-hidden="true"><Check size={13} weight="bold" /></span>
                                      {naming === sent.id ? 'Never mind' : 'I’ve already logged this'}
                                    </button>
                                  )}

                                  {host
                                    ? !filed.has(host) && (
                                      <button className="ib-act" onClick={() => file(sent.sender_url)}>
                                        <span className="ib-act-ic" aria-hidden="true"><Plus size={13} weight="bold" /></span>
                                        Add {who} to your address book
                                      </button>
                                    )
                                    : people.length > 0 && (
                                      <button className="ib-act" onClick={() => { setWhose(w => (w === sent.id ? null : sent.id)); setNaming(null); }}>
                                        <span className="ib-act-ic" aria-hidden="true"><ArrowUpRight size={13} weight="bold" /></span>
                                        {whose === sent.id ? 'Never mind' : `Link ${who}’s journal`}
                                      </button>
                                    )}

                                  {/* Only where it is not the primary already:
                                      resuming a listen *is* opening its draft,
                                      and two rows doing one thing is what this
                                      redesign takes off every other row. */}
                                  {draft && sent.status !== 'reviewed' && (
                                    <button className="ib-act" onClick={() => resumeListen(sent, draft)}>
                                      <span className="ib-act-ic" aria-hidden="true"><PencilSimple size={13} weight="bold" /></span>
                                      Open the draft
                                    </button>
                                  )}

                                  {!archived && (
                                    <button className="ib-act ib-act--warn" onClick={() => updateStatus(sent.id, ARCHIVED)}>
                                      <span className="ib-act-ic" aria-hidden="true"><Archive size={13} weight="bold" /></span>
                                      Archive
                                    </button>
                                  )}
                                </div>

                                {whose === sent.id && (
                                  <MiniAddressBook
                                    tight
                                    people={people}
                                    linked={tidyJournal(sent.sender_url)}
                                    onPick={person => nameSender(sent, person)}
                                    label={`Who sent ${sent.album}`}
                                  />
                                )}

                                {/* ── The listen already open ──────────────
                                    Not a dialog. The row asked the question,
                                    so the row holds the answer, in the place
                                    the other two panels on this row open.
                                    Saving it first is the one offered as the
                                    press, because it is the one that loses
                                    nothing. */}
                                {holding?.id === sent.id && (
                                  <div className="own-panel ib-holding">
                                    <p className="ib-holding-said">
                                      You have <strong>{holding.held.album}</strong> open, with writing in it.
                                    </p>
                                    <div className="ib-holding-acts">
                                      <button
                                        className="ib-primary"
                                        disabled={keeping}
                                        onClick={() => keepThenStart(sent, holding.held)}
                                      >
                                        {keeping ? 'Saving the draft\u2026' : 'Save it as a draft, then start'}
                                      </button>
                                      <button className="ib-act" onClick={() => setHolding(null)}>
                                        Never mind
                                      </button>
                                    </div>
                                  </div>
                                )}

                                {naming === sent.id && (
                                  <div className="ib-which">
                                    {mine === null ? (
                                      <div className="ib-which-none">Reading your journal&#8230;</div>
                                    ) : (
                                      <>
                                        {candidates(sent).map(entry => (
                                          <button key={entry.id} className="ib-which-one" onClick={() => alreadyLogged(sent, entry)}>
                                            <span className="ib-which-art">
                                              {entry.album_art && <img src={entry.album_art} alt="" loading="lazy" />}
                                            </span>
                                            <span className="ib-which-said">
                                              <span className="ib-which-album">{entry.album}</span>
                                              <span className="ib-which-artist">
                                                {entry.listen_total > 1
                                                  ? `Listen ${entry.listen_number} of ${entry.listen_total}`
                                                  : entry.artist}
                                                {entry.posted_at ? ` · ${new Date(entry.posted_at).toLocaleDateString()}` : ''}
                                              </span>
                                            </span>
                                          </button>
                                        ))}
                                        {candidates(sent).length === 0 && (
                                          <div className="ib-which-none">
                                            {look.trim() ? 'Nothing under that name.' : 'Nothing in your journal for this album.'}
                                          </div>
                                        )}
                                        <input
                                          className="ib-which-field"
                                          value={look}
                                          onChange={e => setLook(e.target.value)}
                                          placeholder={candidates(sent).length > 0 ? 'Logged under another name?' : 'Search your journal'}
                                          aria-label="Find the record in your journal"
                                        />
                                      </>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Archived sits behind one line at the foot rather than
                        on a screen somebody has to remember to visit. */}
                    {archivedCount > 0 && (
                      <button className="ib-showarch" onClick={() => setShowArchived(v => !v)}>
                        {showArchived ? 'Hide' : 'Show'} {archivedCount} archived
                      </button>
                    )}
                  </>
                )}
              </>
            )}

            {/* ── REPORTS ── */}
            {tab === 'reports' && (
              <>
                {repLoading ? (
                  <div className="ib-list" style={{ gap: 14 }}>
                    {[...Array(2)].map((_, i) => <div key={i} className="own-skeleton" style={{ height: 70 }} />)}
                  </div>
                ) : reports.filter(r => r.status !== 'dismissed').length === 0 ? (
                  <div className="own-empty">No problems reported.</div>
                ) : (
                  <div>
                    {reports.filter(r => r.status !== 'dismissed').map(r => (
                      <div key={r.id} className={'ib-comment' + (r.status === 'read' ? ' ib-report--read' : '')}>
                        <div className="ib-comment-head">
                          <span className="ib-comment-who">{r.keeper_name || 'Someone'}</span>
                          {r.journal && (
                            <a href={carrySender(journalUrl(r.journal), me, { known: filed.has(tidyJournal(r.journal)) })} target="_blank" rel="noopener noreferrer" className="own-link ib-comment-where">
                              their journal &#8599;
                            </a>
                          )}
                          <span className="ib-comment-when">{new Date(r.created_at).toLocaleDateString()}</span>
                        </div>
                        <p className="ib-comment-text">{r.said}</p>
                        <p className="ib-report-meta">{r.version ? `Version ${r.version}` : ''}{r.agent ? ` · ${r.agent}` : ''}</p>
                        <div className="ib-comment-row">
                          {r.status === 'pending' && (
                            <button onClick={() => settleReport(r.id, 'read')} className="own-act own-act--solid">Read</button>
                          )}
                          <button onClick={() => settleReport(r.id, 'dismissed')} className="own-act own-act--danger">Dismiss</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* ── COMMENTS ── */}
            {tab === 'comments' && (
              <>
                {comLoading ? (
                  <div className="ib-list" style={{ gap: 14 }}>
                    {[...Array(3)].map((_, i) => <div key={i} className="own-skeleton" style={{ height: 70 }} />)}
                  </div>
                ) : comments.length === 0 ? (
                  <div className="own-empty">No comments awaiting moderation.</div>
                ) : (
                  <div>
                    {comments.map(c => (
                      <div key={c.id} className="ib-comment">
                        <div className="ib-comment-head">
                          <span className="ib-comment-who">{c.author_name}</span>
                          <a href={`/entries/${c.entry_slug}`} target="_blank" rel="noopener noreferrer" className="own-link ib-comment-where">
                            on {c.entry_slug}{c.track_index >= 0 ? ` · track ${c.track_index + 1}` : ''} ↗
                          </a>
                          <span className="ib-comment-when">{new Date(c.created_at).toLocaleDateString()}</span>
                        </div>
                        <p className="ib-comment-text">{c.content}</p>
                        <div className="ib-comment-row">
                          <button onClick={() => approveComment(c.id)} className="own-act own-act--solid">Approve</button>
                          <button onClick={() => dismissComment(c.id)} className="own-act own-act--danger">Dismiss</button>
                          {c.author_url && tidyJournal(c.author_url) && (
                            filed.has(tidyJournal(c.author_url))
                              ? <span className="own-label ib-filed">In your address book</span>
                              : <button onClick={() => file(c.author_url)} className="own-act">Add to address book</button>
                          )}
                          {c.author_url && (
                            <a href={carrySender(journalUrl(c.author_url), me, { known: filed.has(tidyJournal(c.author_url)) })} target="_blank" rel="noopener noreferrer" className="own-link">
                              their journal &#8599;
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
