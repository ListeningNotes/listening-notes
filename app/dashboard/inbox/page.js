// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import SiteNav from '../../../components/main_components/SiteNav';
import { carrySender, journalUrl, tidyJournal } from '../../../library/return_address';
import { useBookplate } from '../../../components/main_components/Bookplate';
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
  const subCounts = {
    pending: submissions.filter(s => s.status === 'pending').length,
    reviewed: submissions.filter(s => s.status === 'reviewed').length,
    dismissed: submissions.filter(s => s.status === 'dismissed').length,
  };

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
                  {['pending', 'reviewed', 'dismissed'].map(f => (
                    <button key={f} onClick={() => setFilter(f)} className={'ib-filter' + (filter === f ? ' ib-filter--on' : '')}>
                      {f}{subCounts[f] > 0 ? ` ${subCounts[f]}` : ''}
                    </button>
                  ))}
                </div>

                {subLoading ? (
                  <div className="ib-list" style={{ gap: 10 }}>
                    {[...Array(4)].map((_, i) => <div key={i} className="own-skeleton" style={{ height: 46 }} />)}
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="own-empty">No {filter} submissions.</div>
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
                            {sent.sender_url && (
                              <a
                                href={carrySender(journalUrl(sent.sender_url), me, { known: filed.has(tidyJournal(sent.sender_url)) })}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="own-link"
                              >their journal &#8599;</a>
                            )}
                            <span className="ib-sent-when">
                              {new Date(sent.created_at).toLocaleDateString()}
                            </span>
                          </div>

                          <div className="ib-sent-row">
                            <button onClick={() => startListen(sent)} className="own-act own-act--solid">
                              Start a listen &#8594;
                            </button>
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
