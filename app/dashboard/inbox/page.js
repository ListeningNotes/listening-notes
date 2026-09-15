// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '@phosphor-icons/react';
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
// send points at it), dismissed.
//
// Two views over them, 2026-09-15. From the inbox's side a send is either
// new or opened, and started, logged and dismissed are all opened — so
// which of them it is becomes a word in the row's subtitle rather than a
// tab you have to be standing on to see it. Four tabs asked somebody to
// know the vocabulary before they could find anything.
//
// And they are top-level tabs beside Comments and Reports rather than a
// second row of filters inside a folder: four places at one level, in the
// order they get dealt with, so finding something is never a question of
// which of two rows you are standing on.
const TABS = [
  { value: 'new', label: 'new' },
  { value: 'opened', label: 'opened' },
  { value: 'comments', label: 'comments' },
  { value: 'reports', label: 'reports' },
];
const UNOPENED = 'pending';

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
  return 'dismissed';
}
// Who a send came from: a face and a name, 2026-09-15. Their name is the
// link to their journal where the send carried one, which is the whole of
// what the "IN YOUR ADDRESS BOOK" label used to say and says it without a
// second line of type. Where it carried none the name is plain text and
// nothing is missing — joining them up is an admin job and lives in the ···
// menu, not in the middle of somebody's message.
function Sender({ sent, me, filed }) {
  const host = tidyJournal(sent.sender_url);
  const name = sent.submitter_name || 'someone';
  return (
    <span className="ib-who">
      <span className="ib-who-face" aria-hidden="true">
        <User size={14} weight="regular" />
        {host && <img src={`${journalUrl(host)}/api/portrait`} alt="" loading="lazy" onError={e => { e.currentTarget.style.display = 'none'; }} />}
      </span>
      {host
        ? <a href={carrySender(journalUrl(host), me, { known: filed.has(host) })} target="_blank" rel="noopener noreferrer" className="own-link">{name}</a>
        : <span>{name}</span>}
    </span>
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
  const [tab, setTab] = useState('new');

  const [submissions, setSubmissions] = useState([]);
  const [subLoading, setSubLoading] = useState(true);
  // Which new row has its ··· open. One at a time: the menu is the rare
  // half of a decision, and two of them open at once is a list of controls
  // again, which is what this redesign took away.
  const [menuFor, setMenuFor] = useState(null);

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
  async function resumeListen(sent) {
    let draft = null;
    try {
      const d = await fetch('/api/drafts').then(r => (r.ok ? r.json() : null));
      // Against the column the draft was stored under, not a recomputation
      // of it, so a row written by an older fold still matches itself.
      const key = lookup_key(sent.album, sent.artist || '');
      draft = (d?.drafts || []).find(row => (row.lookup_key || lookup_key(row.album, row.artist || '')) === key) || null;
    } catch { /* the listen still opens; see below */ }
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
  async function startListen(sent) {
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
  const filtered = submissions.filter(s => (tab === 'new' ? unopened(s) : !unopened(s)));
  // What each tab carries, and only shown where there is something to say.
  // Reports counts the ones nobody has read; comments, the ones waiting.
  const counts = {
    new: submissions.filter(unopened).length,
    opened: submissions.filter(s => !unopened(s)).length,
    comments: comments.length,
    reports: reports.filter(r => r.status === 'pending').length,
  };

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
        <div className="own-panel ib-panel">
          {/* One row of tabs, 2026-09-15. The two views over sends used to be
              a second row of filters inside a folder, which made finding
              anything a question of which of two rows you were standing on.
              New, Opened, Comments and Reports are four places, all at the
              same level, in the order they are dealt with. */}
          <div className="ib-head">
            <h1 className="ib-title">Inbox</h1>
            <div className="ib-tabs">
              {TABS.map(t => (
                <button
                  key={t.value}
                  onClick={() => { setTab(t.value); setMenuFor(null); setNaming(null); setWhose(null); }}
                  className={'ib-tab' + (tab === t.value ? ' ib-tab--on' : '')}
                >
                  {t.label}
                  {counts[t.value] > 0 && <span className="ib-tab-n">&#183; {counts[t.value]}</span>}
                </button>
              ))}
            </div>
          </div>

          <div className="ib-scroll">

            {/* ── SENDS ── */}
            {(tab === 'new' || tab === 'opened') && (
              <>
                {subLoading ? (
                  <div className="ib-list" style={{ gap: 10 }}>
                    {[...Array(4)].map((_, i) => <div key={i} className="own-skeleton" style={{ height: 46 }} />)}
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="own-empty">
                    {tab === 'new' ? 'Nothing new.' : 'Nothing opened yet.'}
                  </div>
                ) : tab === 'new' ? (
                  // A shelf, not a spreadsheet. The cover is the first thing
                  // because a cover is what was handed over; the message is
                  // the body because it is the part doing the work; the name
                  // sits under it the way a signature does.
                  //
                  // One decision per row: Start a listen, which is what
                  // happens to nearly every send. The three rare actions are
                  // behind the ···, which opens in the row rather than over
                  // a darkened page (DECISIONS: a control opens where it
                  // belongs).
                  <div className="ib-list">
                    {filtered.map(sent => (
                      <div key={sent.id} className="ib-sent">
                        <div className="ib-sent-art">
                          {sent.album_art
                            ? <img src={sent.album_art} alt="" />
                            : <span className="ib-sent-none" aria-hidden="true">&#9834;</span>}
                        </div>

                        <div className="ib-sent-said">
                          <div className="ib-sent-album">{sent.album}</div>
                          <div className="ib-sent-artist">
                            {sent.artist}{sent.year ? ' · ' + sent.year : ''}
                          </div>

                          {/* The message, and only here. It is what you decide
                              on; once the deciding is done it belongs on the
                              entry, not in a list. */}
                          <p className="ib-sent-note">{sent.note}</p>

                          <div className="ib-sent-from">
                            <Sender sent={sent} me={me} filed={filed} />
                            <span className="ib-sent-when">
                              {new Date(sent.created_at).toLocaleDateString()}
                            </span>
                          </div>

                          <div className="ib-sent-row">
                            <button onClick={() => startListen(sent)} className="own-act own-act--solid">
                              Start a listen &#8594;
                            </button>
                            <button
                              onClick={() => { setMenuFor(m => (m === sent.id ? null : sent.id)); setNaming(null); setWhose(null); }}
                              className={'ib-more' + (menuFor === sent.id ? ' ib-more--on' : '')}
                              aria-expanded={menuFor === sent.id}
                              aria-label={`More for ${sent.album}`}
                            >
                              &#183;&#183;&#183;
                            </button>
                          </div>

                          {menuFor === sent.id && (
                            <div className="ib-menu">
                              <button className="ib-menu-act" onClick={() => openNaming(sent)}>
                                {naming === sent.id ? 'Never mind' : 'I’ve already logged this'}
                              </button>
                              {/* The two sender actions are opposite halves of
                                  one question and never both apply: a send
                                  that carried a journal can be filed, and one
                                  that carried none can be joined to somebody
                                  already in the book. Filing from the inbox is
                                  a documented way in (DECISIONS, The network),
                                  which is why it is here and not dropped. */}
                              {sent.sender_url && tidyJournal(sent.sender_url) && !filed.has(tidyJournal(sent.sender_url)) && (
                                <button className="ib-menu-act" onClick={() => { file(sent.sender_url); setMenuFor(null); }}>
                                  Add to address book
                                </button>
                              )}
                              {!sent.sender_url && people.length > 0 && (
                                <button className="ib-menu-act" onClick={() => { setWhose(w => (w === sent.id ? null : sent.id)); setNaming(null); }}>
                                  {whose === sent.id ? 'Never mind' : 'Link their journal'}
                                </button>
                              )}
                              <button className="ib-menu-act ib-menu-act--danger" onClick={() => { updateStatus(sent.id, 'dismissed'); setMenuFor(null); }}>
                                Dismiss
                              </button>

                          {/* Both panels open inside the menu, under the line
                              that opened them, so the menu grows rather than
                              a second box appearing below it unattached — the
                              same reason the menu opens in the row at all. */}
                          {whose === sent.id && (
                            <MiniAddressBook
                              tight
                              people={people}
                              linked={tidyJournal(sent.sender_url)}
                              onPick={person => { nameSender(sent, person); setMenuFor(null); }}
                              label={`Who sent ${sent.album}`}
                            />
                          )}

                          {/* Which record it became. The likely one is already
                              here — same album and artist — so the usual
                              press is two taps and the field is for the
                              case where it was logged under another name. */}
                          {naming === sent.id && (
                            <div className="ib-which">
                              {mine === null ? (
                                <div className="ib-which-none">Reading your journal&#8230;</div>
                              ) : (
                                <>
                                  {/* The scan first, and the field under it.
                                      It was the other way round and read as
                                      a search box you had to type into
                                      (Miyel, 2026-09-15) — which is what
                                      every send in the inbox showed, because
                                      not one of them had a record yet, so
                                      the empty state was the only state
                                      anybody ever saw. Every listen of the
                                      album is offered, not the newest, since
                                      picking *which* one is the whole
                                      question when there is more than one. */}
                                  {candidates(sent).map(entry => (
                                    <button key={entry.id} className="ib-which-one" onClick={() => { alreadyLogged(sent, entry); setMenuFor(null); }}>
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
                      </div>
                    ))}
                  </div>
                ) : (
                  // Opened: a record of what happened, not a queue. No
                  // buttons — the row itself is the one tap target, and it
                  // does the obvious thing for the state it is in.
                  <div className="ib-list">
                    {filtered.map(sent => {
                      const gone = sent.status === 'dismissed';
                      const host = tidyJournal(sent.sender_url);
                      const inside = (
                        <>
                          <span className="ib-done-art">
                            {sent.album_art
                              ? <img src={sent.album_art} alt="" loading="lazy" />
                              : <span className="ib-sent-none" aria-hidden="true">&#9834;</span>}
                          </span>
                          <span className="ib-done-said">
                            <span className="ib-done-album">{sent.album}</span>
                            {/* The artist, then what became of it. Who sent it
                                is the face at the end of the row rather than a
                                third clause of type. */}
                            <span className="ib-done-state">
                              {sent.artist ? `${sent.artist} \u00b7 ` : ''}{became(sent)}
                            </span>
                          </span>
                          <span className="ib-done-face" title={sent.submitter_name || 'someone'} aria-hidden="true">
                            <User size={15} weight="regular" />
                            {host && <img src={`${journalUrl(host)}/api/portrait`} alt="" loading="lazy" onError={e => { e.currentTarget.style.display = 'none'; }} />}
                          </span>
                        </>
                      );
                      // Logged opens the record. In progress resumes the
                      // listen from the draft it left behind — found here
                      // rather than started fresh, because a submission and
                      // a draft are two things describing one listen and a
                      // fresh session would save over the notes.
                      if (sent.status === 'logged' && sent.entry_slug) {
                        return (
                          <Link key={sent.id} href={`/entries/${sent.entry_slug}`} className="ib-done">
                            {inside}
                          </Link>
                        );
                      }
                      if (sent.status === 'reviewed') {
                        return (
                          <button key={sent.id} className="ib-done" onClick={() => resumeListen(sent)}>
                            {inside}
                          </button>
                        );
                      }
                      // Dismissed, and the one way back, 2026-09-15. Opened
                      // has no buttons by design, and this is the exception
                      // the design made necessary: dismissing was a one-way
                      // door, and a send dismissed by mistake could not be
                      // recovered from anywhere. It is as quiet as it can be
                      // and still be reachable — the row's own faded ink, at
                      // the far end, coming up only when you go for it — and
                      // it is not a confirmation, because putting a send back
                      // is not destructive and the worst case is dismissing
                      // it again.
                      return (
                        <div key={sent.id} className={'ib-done' + (gone ? ' ib-done--gone' : '')}>
                          {inside}
                          {gone && (
                            <button
                              className="ib-back"
                              onClick={() => updateStatus(sent.id, UNOPENED)}
                              aria-label={`Put ${sent.album} back`}
                            >
                              put back
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
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
