// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import SiteNav from '../../../components/main_components/SiteNav';
import MiniAddressBook from '../../../components/main_components/MiniAddressBook';
import { carrySender, journalUrl, tidyJournal } from '../../../library/return_address';
import { useBookplate } from '../../../components/main_components/Bookplate';
import { albumKey } from '../../../hooks/useListeningBeacon';

// ── What became of a send ──────────────────────────────────────────────────
// Four outcomes, and the third is new on 2026-09-15. A send was pending or
// dismissed, and there was no way to say the thing that actually happens
// most: the album was listened to and logged, but the listen started
// somewhere other than this row's own Start a listen, so the send sat in
// Pending looking ignored.
//
// 'reviewed' is older and keeps its own meaning rather than being folded in.
// It is set the moment Start a listen is pressed, before any entry exists —
// so it is a claim about an intention, and Started is what it should have
// been called. 'logged' is a claim about a record, and carries the record.
const OUTCOMES = [
  { value: 'pending', label: 'pending' },
  { value: 'reviewed', label: 'started' },
  { value: 'logged', label: 'logged' },
  { value: 'dismissed', label: 'dismissed' },
];
// A folder tab that connects to the open panel when active. Module scope so it
// keeps a stable identity across renders.
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
  const [filter, setFilter] = useState('pending');

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
  function openNaming(sent) {
    setNaming(n => (n === sent.id ? null : sent.id));
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

  const filtered = submissions.filter(s => s.status === filter);
  const subCounts = Object.fromEntries(
    OUTCOMES.map(o => [o.value, submissions.filter(s => s.status === o.value).length])
  );

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
                <div className="ib-filters">
                  {OUTCOMES.map(o => (
                    <button key={o.value} onClick={() => setFilter(o.value)} className={'ib-filter' + (filter === o.value ? ' ib-filter--on' : '')}>
                      {o.label}{subCounts[o.value] > 0 ? ` ${subCounts[o.value]}` : ''}
                    </button>
                  ))}
                </div>

                {subLoading ? (
                  <div className="ib-list" style={{ gap: 10 }}>
                    {[...Array(4)].map((_, i) => <div key={i} className="own-skeleton" style={{ height: 46 }} />)}
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="own-empty">No {OUTCOMES.find(o => o.value === filter)?.label} submissions.</div>
                ) : (
                  // A shelf, not a spreadsheet. The cover is the first thing
                  // because a cover is what was handed over; the message is
                  // the body because it is the part doing the work; the name
                  // sits under it the way a signature does. The five-column
                  // table this replaced reported the same facts in the shape
                  // of a database row, which is the shape of the thing rather
                  // than the shape of what happened.
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
                            {sent.artist}{sent.year ? ' \u00b7 ' + sent.year : ''}
                          </div>

                          <p className="ib-sent-note">{sent.note}</p>

                          <div className="ib-sent-from">
                            <span>from {sent.submitter_name || 'someone'}</span>
                            {/* Stored without a scheme on purpose - see the
                                note in the submissions route - so the one
                                journalUrl puts back is the only one there
                                can be. The link carries who this copy
                                belongs to, so their send form knows who is
                                sending back (carrySender). */}
                            {sent.sender_url ? (
                              <a
                                href={carrySender(journalUrl(sent.sender_url), me, { known: filed.has(tidyJournal(sent.sender_url)) })}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="own-link"
                              >their journal &#8599;</a>
                            ) : people.length > 0 && (
                              /* Sends arrive before people have copies, and
                                 that is the normal case rather than an edge
                                 one: everybody who sent an album this week
                                 had no journal then and has one now. So a
                                 name with no address is not a dead end —
                                 it is a person in the address book who has
                                 not been joined up yet. */
                              <button onClick={() => setWhose(w => (w === sent.id ? null : sent.id))} className="own-act">
                                {whose === sent.id ? 'Never mind' : 'Link their journal'}
                              </button>
                            )}
                            <span className="ib-sent-when">
                              {new Date(sent.created_at).toLocaleDateString()}
                            </span>
                          </div>

                          {whose === sent.id && (
                            <MiniAddressBook
                              people={people}
                              linked={tidyJournal(sent.sender_url)}
                              onPick={person => nameSender(sent, person)}
                              label={`Who sent ${sent.album}`}
                            />
                          )}

                          {/* The record it became. A send that was logged
                              says which one and goes there; the foreign key
                              nulls itself if that record is ever deleted,
                              so this simply stops being drawn rather than
                              pointing at nothing. */}
                          {sent.entry_slug && (
                            <div className="ib-sent-from">
                              <Link href={`/entries/${sent.entry_slug}`} className="own-link">
                                Logged as {sent.entry_album || sent.album} &#8594;
                              </Link>
                            </div>
                          )}

                          <div className="ib-sent-row">
                            <button onClick={() => startListen(sent)} className="own-act own-act--solid">
                              Start a listen &#8594;
                            </button>
                            {/* The third outcome, on the row it belongs to.
                                Not a reconciliation screen and not a sweep
                                of the archive: one button, on a send that
                                has not been settled, that says the thing
                                the keeper already knows. */}
                            {sent.status !== 'logged' && (
                              <button onClick={() => openNaming(sent)} className="own-act">
                                {naming === sent.id ? 'Never mind' : 'I’ve already logged this'}
                              </button>
                            )}
                            {sent.status !== 'dismissed' && (
                              <button onClick={() => updateStatus(sent.id, 'dismissed')} className="own-act own-act--danger">
                                Dismiss
                              </button>
                            )}
                            {/* A send that carried a journal is one of the
                                ways into the address book. Once filed, the
                                row says so and offers nothing. */}
                            {sent.sender_url && tidyJournal(sent.sender_url) && (
                              filed.has(tidyJournal(sent.sender_url))
                                ? <span className="own-label ib-filed">In your address book</span>
                                : <button onClick={() => file(sent.sender_url)} className="own-act">Add to address book</button>
                            )}
                          </div>

                          {/* Which record it was. The likely one is already
                              here — same album and artist — so the usual
                              press is two taps and the field is for the
                              case where it was logged under another name. */}
                          {naming === sent.id && (
                            <div className="ib-which">
                              <input
                                className="ib-which-field"
                                value={look}
                                onChange={e => setLook(e.target.value)}
                                placeholder="Which record was it?"
                                aria-label="Find the record in your journal"
                              />
                              {mine === null || (mine.length === 0)
                                ? <div className="ib-which-none">Reading your journal…</div>
                                : candidates(sent).length === 0
                                  ? <div className="ib-which-none">{look.trim() ? 'Nothing under that name.' : 'No record for this album yet — search for it.'}</div>
                                  : candidates(sent).map(entry => (
                                    <button key={entry.id} className="ib-which-one" onClick={() => alreadyLogged(sent, entry)}>
                                      <span className="ib-which-art">
                                        {entry.album_art && <img src={entry.album_art} alt="" loading="lazy" />}
                                      </span>
                                      <span className="ib-which-said">
                                        <span className="ib-which-album">{entry.album}</span>
                                        <span className="ib-which-artist">
                                          {entry.artist}
                                          {entry.posted_at ? ` · ${new Date(entry.posted_at).toLocaleDateString()}` : ''}
                                        </span>
                                      </span>
                                    </button>
                                  ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
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
