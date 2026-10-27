// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
// components/main_components/Friend_panel.js
// What waits on a friend's face, opened under the row on Friends.
//
// Miyel's Friends brief, 2026-10-27 (step two of her build order): anything
// from a person waits on that person's face, and pressing the face opens it
// in place. Each thing names itself — Wrote, Sent you, Waved, Arrived,
// Moved — beside New while it has not been seen, and carries only its own
// answers:
//
//   Wrote      Write back · Keep only      (a message never has Let it go:
//                                           nothing a person typed is
//                                           destroyed; Keep only closes it
//                                           without a reply, migrations/043)
//   Sent you   Log it · Already have · Let it go
//   Waved      Wave back · Let it go
//   Arrived    nothing — it passes once it has been seen
//   Moved      Update the address
//
// The brief's Open the chain is Words (step four); until then a message is
// answered as the inbox answers it. Moved has no Let it go: their journal
// goes on saying it moved, so the friends round would only write it back.
//
// Every answer is the inbox's own route, and does what the inbox does with
// it, so the two agree until the inbox retires (the last step) — Log it
// keeps a listen already open with writing in it, as the inbox's Listen
// does, and Already have is offered only where this journal already holds
// that record, which it points the send at.
//
// The faces hold what was sent you; what friends did is the line's, and will
// be Headlines' (step three). The brief's rule, and what stops this page
// becoming an inbox again.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { HandWaving, Signpost } from '@phosphor-icons/react';
import MessageForm from './Slug_Page/MessageForm';
import { since } from './Friends';
import { foldForSearch } from './Journal';
import { lookup_key } from '../../library/entry_formatter';
import { TRACK_NOTE_KEY } from '../../hooks/useListeningSession';
import { tidyJournal } from '../../library/return_address';

const KIND_WORD = { wrote: 'Wrote', sent: 'Sent you', waved: 'Waved', arrived: 'Arrived', moved: 'Moved' };

// When, said short: the relative words while it is recent, the day after.
function when(iso) {
  if (!iso) return '';
  const near = since(iso);
  if (near) return near;
  const day = new Date(iso);
  if (Number.isNaN(day.getTime())) return '';
  const sameYear = day.getFullYear() === new Date().getFullYear();
  return day.toLocaleDateString(undefined, sameYear ? { month: 'short', day: 'numeric' } : { month: 'short', day: 'numeric', year: 'numeric' });
}

// ── What waits from one person ────────────────────────────────────────────
// From the inbox's four lists and the book's row, newest first: what they
// wrote and nobody has answered or kept; what they sent that is still to
// be logged (or a listen of it is under way); their wave; a record of yours
// they logged, while it is unseen — or `held`, seen as this face opened, so
// it stays until the face closes; and their journal's move. `unseen` is what
// wears New.
export function waitingFrom(person, arrivals, held = null) {
  if (!person) return [];
  const at = tidyJournal(person.address);
  const theirs = address => Boolean(at) && tidyJournal(address || '') === at;
  const items = [];
  for (const m of arrivals?.messages || []) {
    if (m.admin || !theirs(m.from_journal) || m.replied_at || m.kept_at) continue;
    items.push({ kind: 'wrote', key: `m${m.id}`, at: m.arrived_at || m.written_at, unseen: !m.seen_at, row: m });
  }
  for (const s of arrivals?.sends || []) {
    if (!theirs(s.sender_url) || (s.status !== 'pending' && s.status !== 'reviewed')) continue;
    items.push({ kind: 'sent', key: `s${s.id}`, at: s.created_at, unseen: s.status === 'pending' && !s.seen_at, row: s });
  }
  for (const w of arrivals?.waves || []) {
    if (!theirs(w.address)) continue;
    items.push({ kind: 'waved', key: `w${w.id}`, at: w.arrived_at, unseen: !w.seen_at, row: w });
  }
  for (const c of arrivals?.back || []) {
    const key = `c${c.id}`;
    if (!theirs(c.journal) || (c.seen_at && !held?.has(key))) continue;
    items.push({ kind: 'arrived', key, at: c.posted_at || c.noticed_at, unseen: !c.seen_at, row: c });
  }
  if (person.moved_to) items.push({ kind: 'moved', key: `v${person.id}`, at: '', unseen: true, row: person });
  return items.sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0));
}

// Told the server that each of these has been seen — the inbox's own marks,
// written here and sent nowhere else.
export function seeAll(items) {
  const patch = (url, body) => fetch(url, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  }).catch(() => null);
  for (const { kind, row } of items) {
    if (kind === 'wrote') patch('/api/messages', { id: row.id });
    else if (kind === 'sent') patch(`/api/submissions/${row.id}`, { seen: true });
    else if (kind === 'waved') patch('/api/waves', { id: row.id });
    else if (kind === 'arrived') patch('/api/came-back', { id: row.id });
  }
}

// A listen open in this browser with writing in it, as the inbox reads it:
// the record in hand and the words typed into it, or null.
function openListen() {
  try {
    const held = JSON.parse(localStorage.getItem('ln_pending_session'));
    if (!held?.album) return null;
    const written = JSON.parse(localStorage.getItem('ln_session_draft'));
    if (!written || written.album !== held.album) return null;
    return { ...held, written };
  } catch { return null; }
}

// What is on screen in that listen, written to the drafts table — the inbox's
// keepOpenListen, so it waits in the picker rather than being written over.
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
  const r = await fetch('/api/drafts', {
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
  if (!r.ok) throw new Error('not kept');
  try { localStorage.removeItem('ln_session_draft'); } catch { /* storage off */ }
}

// `person` is the book's row and `name` what they are called; `items` is
// waitingFrom's list and `newHere` the keys that were new as the face
// opened, which keep New while it is open. `entries` are this journal's own
// records, for Already have; `there` builds a link onto their journal;
// `onAnswered(kind, row, change)` tells the screen what to change in its
// lists, and `onMoved` that the book needs reading again.
export default function FriendPanel({ person, name, items, newHere, entries = [], there, onAnswered, onMoved }) {
  const router = useRouter();
  const who = name || 'They';
  // One thing at a time is being answered: its key, and what it says back.
  const [busy, setBusy] = useState('');
  const [trouble, setTrouble] = useState({});
  const [writing, setWriting] = useState('');
  const [holding, setHolding] = useState(null);
  const say = (key, words) => setTrouble(t => ({ ...t, [key]: words }));

  // ── Sent you ────────────────────────────────────────────────────────────
  const status = async (row, value) => {
    const r = await fetch(`/api/submissions/${row.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: value }),
    }).catch(() => null);
    return Boolean(r?.ok);
  };
  // Into a listen, carrying who sent it, as the inbox's Listen and Resume do:
  // a song becomes the note for that song, and a listen already begun from
  // it picks up its draft rather than starting over it.
  const logIt = async (row, started = false) => {
    let draft = null;
    if (started) {
      try {
        const d = await fetch('/api/drafts').then(r => (r.ok ? r.json() : null));
        const key = lookup_key(row.album, row.artist || '', row.song || '');
        draft = (d?.drafts || []).find(x => (x.lookup_key || lookup_key(x.album, x.artist || '', x.song || '')) === key) || null;
      } catch { /* the listen still opens */ }
    }
    const from = {
      receivedFrom: draft?.received_from || row.submitter_name || '',
      receivedFromUrl: row.sender_url || '',
      receivedDate: draft?.received_date ? String(draft.received_date).slice(0, 10) : (row.created_at ? String(row.created_at).slice(0, 10) : ''),
      creditPrivate: draft ? draft.credit_private === true : row.quiet === true,
      submissionId: draft?.submission_id ?? row.id,
    };
    try {
      if (row.song) {
        sessionStorage.setItem(TRACK_NOTE_KEY, JSON.stringify({
          song: row.song,
          album: draft?.album || row.album,
          artist: draft?.artist || row.artist || '',
          year: draft?.year || row.year || '',
          artUrl: draft?.album_art || row.album_art || '',
          collectionId: draft?.collection_id || row.collection_id || null,
          genre: draft?.genre || '',
          written: draft ? { rating: draft.rating, note: draft.notes || '', favorite: draft.favorite === true, formative: draft.formative === true } : null,
          entryType: 'Submission',
          ...from,
        }));
      } else {
        localStorage.setItem('ln_pending_session', JSON.stringify({
          album: draft?.album || row.album,
          artist: draft?.artist || row.artist || '',
          year: draft?.year || row.year || '',
          artUrl: draft?.album_art || row.album_art || '',
          collectionId: draft?.collection_id || row.collection_id || null,
          genre: draft?.genre || '',
          entryType: draft?.entry_type || 'Submission',
          ...from,
          ...(draft ? { draft } : {}),
        }));
      }
    } catch { /* a private window: the session opens on its picker instead */ }
    if (row.status !== 'reviewed') await status(row, 'reviewed');
    router.push('/session');
  };
  const startLog = async (item) => {
    const { row } = item;
    if (!row.song && row.status !== 'reviewed') {
      const held = openListen();
      if (held && held.album !== row.album) { setHolding({ key: item.key, held }); return; }
    }
    setBusy(item.key);
    await logIt(row, row.status === 'reviewed');
    setBusy('');
  };
  const keepThenLog = async (item) => {
    setBusy(item.key);
    try {
      await keepOpenListen(holding.held);
    } catch {
      setBusy('');
      say(item.key, 'Your open listen could not be saved, so nothing was started. It is still open.');
      return;
    }
    setHolding(null);
    await logIt(item.row);
    setBusy('');
  };
  // This journal's own record of what was sent, by its key or its name.
  const alreadyHere = row => {
    if (row.song) return null;
    const key = foldForSearch(`${row.album}|${row.artist || ''}`);
    return entries.find(e => !e.song && e.id && foldForSearch(`${e.album}|${e.artist || ''}`) === key) || null;
  };
  const alreadyHave = async (item, entry) => {
    setBusy(item.key);
    const r = await fetch(`/api/submissions/${item.row.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ entry_id: entry.id }),
    }).catch(() => null);
    setBusy('');
    if (!r?.ok) { say(item.key, 'That could not be marked just now. Try again.'); return; }
    onAnswered('sent', item.row, { status: 'logged' });
  };
  const letSendGo = async (item) => {
    setBusy(item.key);
    const ok = await status(item.row, 'dismissed');
    setBusy('');
    if (!ok) { say(item.key, 'That could not be let go just now. Try again.'); return; }
    onAnswered('sent', item.row, { status: 'dismissed' });
  };

  // ── Wrote ───────────────────────────────────────────────────────────────
  const writeBack = async (row, said) => {
    const r = await fetch('/api/outbox', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: true, reply_to: row.id, said }),
    }).catch(() => null);
    const d = await r?.json().catch(() => null);
    if (!r?.ok || !d?.ok) {
      return { ok: false, error: d?.error || 'Something went wrong. Nothing was sent, and your words are still here.' };
    }
    onAnswered('wrote', row, { replied_at: d.replied_at || new Date().toISOString() });
    return { ok: true };
  };
  const keepOnly = async (item) => {
    setBusy(item.key);
    const r = await fetch('/api/messages', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: item.row.id, kept: true }),
    }).catch(() => null);
    setBusy('');
    if (!r?.ok) { say(item.key, 'That could not be kept just now. Try again.'); return; }
    const d = await r.json().catch(() => ({}));
    onAnswered('wrote', item.row, { kept_at: d.kept_at || new Date().toISOString() });
  };

  // ── Waved ───────────────────────────────────────────────────────────────
  // Wave back leaves through the outbox, which lets their wave here go once
  // it has landed (waved_back); a copy too old to take one says so.
  const waveBack = async (item) => {
    setBusy(item.key);
    const r = await fetch('/api/outbox', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ wave: true, person_id: person.id }),
    }).catch(() => null);
    const d = await r?.json().catch(() => null);
    setBusy('');
    if (!r?.ok || !d?.ok) { say(item.key, d?.error || 'The wave did not reach them. Try again.'); return; }
    onAnswered('waved', item.row, null);
  };
  const letWaveGo = async (item) => {
    setBusy(item.key);
    const r = await fetch('/api/waves', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: item.row.id }),
    }).catch(() => null);
    setBusy('');
    if (!r?.ok) { say(item.key, 'That could not be let go just now. Try again.'); return; }
    onAnswered('waved', item.row, null);
  };

  // ── Moved ───────────────────────────────────────────────────────────────
  const takeMove = async (item) => {
    setBusy(item.key);
    const r = await fetch(`/api/people/${person.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ moved: true }),
    }).catch(() => null);
    setBusy('');
    if (!r?.ok) { say(item.key, 'The address could not be updated just now. Try again.'); return; }
    onMoved();
  };

  if (items.length === 0) return null;

  return (
    <div className="fp">
      {items.map(item => {
        const { kind, row, key } = item;
        const isNew = item.unseen || newHere?.has(key);
        const doing = busy === key;
        const art = kind === 'sent' || kind === 'arrived' ? row.album_art : kind === 'wrote' ? row.about_art : '';
        const link = kind === 'arrived' && row.slug ? there(person.address, `/entries/${encodeURIComponent(row.slug)}`) : '';
        const cover = (
          <span className={'fp-art' + (kind === 'waved' || kind === 'moved' ? ' fp-art--round' : '')} aria-hidden="true">
            {art ? <img src={art} alt="" loading="lazy" onError={e => { e.currentTarget.style.display = 'none'; }} />
              : kind === 'waved' ? <HandWaving size={24} weight="regular" />
                : kind === 'moved' ? <Signpost size={24} weight="regular" />
                  : <span>&#9834;</span>}
          </span>
        );
        let title;
        let sub = '';
        let said = '';
        if (kind === 'wrote') {
          said = row.said;
          sub = [row.about_album && `About ${row.about_song || row.about_album}`, when(row.arrived_at || row.written_at)].filter(Boolean).join(' · ');
        } else if (kind === 'sent') {
          title = row.song || row.album;
          sub = [row.song ? row.album : row.artist, row.song ? '' : row.year, row.status === 'reviewed' ? 'Started' : when(row.created_at)].filter(Boolean).join(' · ');
          said = row.note || '';
        } else if (kind === 'waved') {
          title = `${who} waved`;
          sub = when(row.arrived_at);
        } else if (kind === 'arrived') {
          title = row.song || row.album;
          sub = [`${who} logged it`, when(row.posted_at || row.noticed_at)].filter(Boolean).join(' · ');
        } else {
          title = `${who} moved`;
          sub = 'Their journal lives somewhere new';
        }
        const match = kind === 'sent' ? alreadyHere(row) : null;
        return (
          <div key={key} className="fp-one">
            {link ? <a href={link} target="_blank" rel="noopener noreferrer" className="fp-art-link">{cover}</a> : cover}
            <div className="fp-says">
              <span className="fp-kind">
                {isNew && <span className="ln-new">New</span>}
                {KIND_WORD[kind]}
              </span>
              {title && (link
                ? <a href={link} target="_blank" rel="noopener noreferrer" className="fp-title">{title}</a>
                : <span className="fp-title">{title}</span>)}
              {kind === 'wrote' ? <p className="fp-said">{said}</p> : said ? <p className="fp-note">{said}</p> : null}
              {sub && <span className="fp-sub">{sub}</span>}

              {kind === 'wrote' && (
                <div className="fp-acts">
                  <button type="button" className="fp-act fp-act--first" onClick={() => setWriting(w => (w === key ? '' : key))} aria-expanded={writing === key}>Write back</button>
                  <button type="button" className="fp-act" onClick={() => keepOnly(item)} disabled={doing}>Keep only</button>
                </div>
              )}
              {kind === 'sent' && (
                <div className="fp-acts">
                  <button type="button" className="fp-act fp-act--first" onClick={() => startLog(item)} disabled={doing}>Log it</button>
                  {match && <button type="button" className="fp-act" onClick={() => alreadyHave(item, match)} disabled={doing}>Already have</button>}
                  <button type="button" className="fp-act" onClick={() => letSendGo(item)} disabled={doing}>Let it go</button>
                </div>
              )}
              {kind === 'waved' && (
                <div className="fp-acts">
                  <button type="button" className="fp-act fp-act--first" onClick={() => waveBack(item)} disabled={doing}>Wave back</button>
                  <button type="button" className="fp-act" onClick={() => letWaveGo(item)} disabled={doing}>Let it go</button>
                </div>
              )}
              {kind === 'moved' && (
                <div className="fp-acts">
                  <button type="button" className="fp-act fp-act--first" onClick={() => takeMove(item)} disabled={doing}>Update the address</button>
                </div>
              )}

              {holding?.key === key && (
                <div className="fp-holding">
                  <p className="fp-holding-said">You have <strong>{holding.held.album}</strong> open, with writing in it.</p>
                  <div className="fp-acts">
                    <button type="button" className="fp-act fp-act--first" onClick={() => keepThenLog(item)} disabled={doing}>
                      {doing ? 'Saving the draft…' : 'Save it as a draft, then start'}
                    </button>
                    <button type="button" className="fp-act" onClick={() => setHolding(null)}>Never mind</button>
                  </div>
                </div>
              )}
              {writing === key && (
                <div className="fp-form">
                  <MessageForm
                    draftKey={`reply-${row.id}`}
                    label={`Your reply to ${who}`}
                    placeholder={`Reply to ${who}`}
                    send={words => writeBack(row, words)}
                    onSent={() => setWriting('')}
                    onLeave={() => setWriting('')}
                  />
                </div>
              )}
              {trouble[key] && <p className="fp-trouble" role="status">{trouble[key]}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
