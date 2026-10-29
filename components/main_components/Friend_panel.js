// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
// components/main_components/Friend_panel.js
// What waits on a friend's face, opened under the row on Friends.
//
// ── Three doors, 2026-10-29 ───────────────────────────────────────────────
// Miyel: "when you click on a friend, you still get options: visit,
// messages, sends … Because it's all just hodgepodge together." So every
// face opens the same three doors, a glyph over each word, whether or not
// anything waits — Visit, their page here; Messages; Sends — and Messages
// and Sends unroll under the row, what waits first with its answers, the
// door wearing New while something behind it has not been seen. The door
// with something waiting is open as the face opens. A wave is not a door:
// it is a hand after Sends, and pressing it lets it go (her answer, the same
// day: "Visit message sends then a wave just shows up as a dismissible
// icon").
//
// No head, and centred (her review, the same day: "this needs to be centered
// and we don't need a repeat of the person's profile photo and name because
// we already know who we're opening"). The face pressed is lit in the row
// above it; that says whose this is. A stranger keeps the one line that says
// what the row cannot — Not one of your friends — and Add stands where
// Visit would.
//
//   Messages   what they wrote: Reply · Keep (a message never has Dismiss:
//              nothing a person typed is destroyed; Keep closes it without
//              a reply, migrations/043), then All messages, their Words
//   Sends      what they sent you: Listen · Dismiss (her call, 2026-10-27);
//              and a record of yours they logged, which passes once seen
//   Moved      over the doors, with Update — it is about them, not a
//              message; no Dismiss, since their journal goes on saying it
//              moved and the friends round would only write it back
//
// It was a list of whatever was waiting from 2026-10-27, each thing naming
// itself — Wrote, Sent you, Waved, Arrived, Moved — and a face with nothing
// waiting went straight to their page.
//
// Every answer is the inbox's own route, and does what the inbox does with
// it — Listen keeps a listen already open with writing in it, as the
// inbox's Listen does.
//
// The faces hold what was sent you; what friends did is Headlines'. The
// brief's rule, and what stops this page becoming an inbox again.

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowBendUpLeft, BookmarkSimple, CaretRight, ChatsCircle, HandWaving, Headphones, House, Signpost, UserPlus, VinylRecord, X,
} from '@phosphor-icons/react';
import MessageForm from './Slug_Page/MessageForm';
import { since } from './Friends';
import { lookup_key } from '../../library/entry_formatter';
import { TRACK_NOTE_KEY } from '../../hooks/useListeningSession';
import { tidyJournal } from '../../library/return_address';
import { handOff } from '../../library/handoff';

const KIND_WORD = { wrote: 'Wrote', sent: 'Sent you', waved: 'Waved', arrived: 'Arrived', moved: 'Moved' };

// When, said short: the relative words while it is recent, the day after.
export function when(iso) {
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

// ── Strangers, 2026-10-27 ─────────────────────────────────────────────────
// Her Friends brief, step five: somebody not in your friends who sends you
// something stands in the row like anyone else, at the front, marked New —
// no requests folder, no holding pen. What they sent, wrote, or their wave,
// while it is unanswered and younger than thirty days ("Unhandled, it
// leaves on its own"); the doors keep them to one thing at a time
// (library/people_actions.js). Somebody with no journal still has a name:
// each thing of theirs is a stranger of its own, with a plain face.
export const STRANGER_DAYS = 30;
export function strangersIn(arrivals, book) {
  const from = Date.now() - STRANGER_DAYS * 24 * 60 * 60 * 1000;
  const fresh = at => (Date.parse(at || '') || 0) >= from;
  const by = new Map();
  const add = (address, idKey, name, item) => {
    const at = tidyJournal(address || '');
    if (at && book.has(at)) return;
    if (!fresh(item.at)) return;
    const key = at || `nobody-${idKey}`;
    let one = by.get(key);
    if (!one) { one = { address: key, journal: at, name: '', items: [] }; by.set(key, one); }
    if (!one.name && name) one.name = String(name).trim();
    one.items.push(item);
  };
  for (const m of arrivals?.messages || []) {
    if (m.admin || m.replied_at || m.kept_at) continue;
    add(m.from_journal, `m${m.id}`, m.from_name, { kind: 'wrote', key: `m${m.id}`, at: m.arrived_at || m.written_at, unseen: !m.seen_at, row: m });
  }
  for (const s2 of arrivals?.sends || []) {
    if (s2.status !== 'pending' && s2.status !== 'reviewed') continue;
    add(s2.sender_url, `s${s2.id}`, s2.submitter_name, { kind: 'sent', key: `s${s2.id}`, at: s2.created_at, unseen: s2.status === 'pending' && !s2.seen_at, row: s2 });
  }
  for (const w of arrivals?.waves || []) {
    add(w.address, `w${w.id}`, w.name, { kind: 'waved', key: `w${w.id}`, at: w.arrived_at, unseen: !w.seen_at, row: w });
  }
  return [...by.values()].map(one => ({
    ...one,
    items: one.items.sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0)),
  }));
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

// One answer: a glyph over its word, as the site's doors are.
function Door({ icon: Icon, word, onClick, href, disabled = false, open, label, isNew = false }) {
  const inner = (
    <>
      <span className="fp-door-glyph">
        <Icon size={20} weight="regular" aria-hidden="true" />
        {isNew && <span className="ln-new fp-door-new" aria-hidden="true">New</span>}
      </span>
      <span className="fp-door-word">{word}</span>
    </>
  );
  if (href) return <Link className="fp-door" href={href} aria-label={label}>{inner}</Link>;
  return (
    <button
      type="button"
      className={'fp-door' + (open ? ' fp-door--on' : '')}
      onClick={onClick}
      disabled={disabled}
      aria-expanded={open}
      aria-label={label}
    >
      {inner}
    </button>
  );
}

// `person` is the book's row and `name` what they are called; `items` is
// waitingFrom's list and `newHere` the keys that were new as the face
// opened, which keep New while it is open. `there` builds a link onto their
// journal; `onAnswered(kind, row, change)` tells the screen what to change
// in its lists, and `onMoved` that the book needs reading again.
//
// A stranger (step five) has no page and no book row: `person` is null,
// `journal` their address when they keep one, and `onAdd` files it. A line
// says so — Not one of your friends — Add is a door, and their answers are
// the closed doors' (the brief): read what they said without letting them
// into anything. Dismiss is Let it go, and the server closes the door
// behind it; a message let go is kept, never deleted.
export default function FriendPanel({
  person, name, items, newHere, there, onAnswered, onMoved,
  stranger = false, journal = '', onAdd = null, adding = false,
}) {
  const router = useRouter();
  const who = name || 'They';
  // One thing at a time is being answered: its key, and what it says back.
  const [busy, setBusy] = useState('');
  const [trouble, setTrouble] = useState({});
  const [writing, setWriting] = useState('');
  const [holding, setHolding] = useState(null);
  // Messages or Sends, pressed; 'none' once the open one is pressed shut.
  const [door, setDoor] = useState(null);
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
  const dismissSend = async (item) => {
    setBusy(item.key);
    const ok = await status(item.row, 'dismissed');
    setBusy('');
    if (!ok) { say(item.key, 'That could not be dismissed just now. Try again.'); return; }
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
  // A hand after the doors, and pressing it lets the wave go.
  const dismissWave = async (item) => {
    setBusy(item.key);
    const r = await fetch('/api/waves', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: item.row.id }),
    }).catch(() => null);
    setBusy('');
    if (!r?.ok) { say(item.key, 'That could not be dismissed just now. Try again.'); return; }
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

  const page = person ? `/dashboard/people/${person.id}` : '';
  const wave = items.find(i => i.kind === 'waved') || null;
  const moved = items.filter(i => i.kind === 'moved');
  const messages = items.filter(i => i.kind === 'wrote');
  const sends = items.filter(i => i.kind === 'sent' || i.kind === 'arrived');
  const fresh = list => list.some(i => i.unseen || newHere?.has(i.key));
  // The open door: the one pressed, or else whichever has something waiting.
  const showing = door === 'none' ? null : door || (messages.length ? 'messages' : sends.length ? 'sends' : null);
  const pick = which => setDoor(showing === which ? 'none' : which);

  const waveMark = wave && (
    <button
      type="button"
      className="fp-wave"
      onClick={() => dismissWave(wave)}
      disabled={busy === wave.key}
      aria-label={`${who} waved. Let it go`}
      title={`${who} waved`}
    >
      <HandWaving size={20} weight="regular" aria-hidden="true" />
      <span className="fp-wave-x" aria-hidden="true"><X size={8} weight="bold" /></span>
    </button>
  );

  const one = item => {
    const { kind, row, key } = item;
    const isNew = item.unseen || newHere?.has(key);
    const doing = busy === key;
    const art = kind === 'sent' || kind === 'arrived' ? row.album_art : kind === 'wrote' ? row.about_art : '';
    // Their entry, read inside this journal (2026-10-28).
    const link = kind === 'arrived' && row.slug && person ? `/dashboard/people/${person.id}/${encodeURIComponent(row.slug)}` : '';
    const cover = (
      <span className={'fp-art' + (kind === 'moved' ? ' fp-art--round' : '')} aria-hidden="true">
        {art ? <img src={art} alt="" loading="lazy" onError={e => { e.currentTarget.style.display = 'none'; }} />
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
    } else if (kind === 'arrived') {
      title = row.song || row.album;
      sub = [`${who} logged it`, when(row.posted_at || row.noticed_at)].filter(Boolean).join(' · ');
    } else {
      title = `${who} moved`;
      sub = 'Their journal lives somewhere new';
    }
    return (
      <div key={key} className="fp-one">
        {link ? <Link href={link} data-grows={link} onClick={() => handOff(row)} className="fp-art-link">{cover}</Link> : cover}
        <div className="fp-says">
          <span className="fp-kind">
            {isNew && <span className="ln-new">New</span>}
            {KIND_WORD[kind]}
          </span>
          {title && (link
            ? <Link href={link} onClick={() => handOff(row)} className="fp-title">{title}</Link>
            : <span className="fp-title">{title}</span>)}
          {kind === 'wrote' ? <p className="fp-said">{said}</p> : said ? <p className="fp-note">{said}</p> : null}
          {sub && <span className="fp-sub">{sub}</span>}

          {kind === 'wrote' && (
            <div className="fp-doors">
              {(!stranger || row.from_journal) && (
                <Door icon={ArrowBendUpLeft} word="Reply" open={writing === key} onClick={() => setWriting(w => (w === key ? '' : key))} label={`Reply to ${who}`} />
              )}
              {stranger
                ? <Door icon={X} word="Dismiss" onClick={() => keepOnly(item)} disabled={doing} label="Let it go — it is kept, and they can't write again until you add them" />
                : <Door icon={BookmarkSimple} word="Keep" onClick={() => keepOnly(item)} disabled={doing} label="Keep it without a reply" />}
            </div>
          )}
          {kind === 'sent' && (
            <div className="fp-doors">
              <Door icon={Headphones} word="Listen" onClick={() => startLog(item)} disabled={doing} label={`Listen to ${title}`} />
              <Door icon={X} word="Dismiss" onClick={() => dismissSend(item)} disabled={doing} />
            </div>
          )}
          {kind === 'moved' && (
            <div className="fp-doors">
              <Door icon={Signpost} word="Update" onClick={() => takeMove(item)} disabled={doing} label="Update their address" />
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
                send={words2 => writeBack(row, words2)}
                onSent={() => setWriting('')}
                onLeave={() => setWriting('')}
              />
            </div>
          )}
          {trouble[key] && <p className="fp-trouble" role="status">{trouble[key]}</p>}
        </div>
      </div>
    );
  };

  return (
    <div className="fp">
      {/* Nobody's face or name: the face pressed is lit in the row above. A
          stranger has the one line the row cannot say (step five). */}
      {stranger && <p className="fp-not">Not one of your friends</p>}
      {moved.map(one)}

      <div className="fp-doors fp-doors--three" role="group" aria-label={`You and ${who}`}>
        {page && <Door icon={House} word="Visit" href={page} label={`${who}’s journal`} />}
        {stranger && journal && onAdd && (
          <Door icon={UserPlus} word="Add" onClick={() => onAdd(journal)} disabled={adding} label={`Add ${who} to your friends`} />
        )}
        <Door icon={ChatsCircle} word="Messages" open={showing === 'messages'} onClick={() => pick('messages')} isNew={fresh(messages)} label={`Messages from ${who}`} />
        <Door icon={VinylRecord} word="Sends" open={showing === 'sends'} onClick={() => pick('sends')} isNew={fresh(sends)} label={`Sends from ${who}`} />
        {waveMark}
      </div>
      {wave && trouble[wave.key] && <p className="fp-trouble fp-trouble--wave" role="status">{trouble[wave.key]}</p>}

      {showing === 'messages' && (
        <div className="fp-under">
          {messages.map(one)}
          {messages.length === 0 && <p className="fp-none">Nothing from {who} waiting.</p>}
          {page && (
            <Link className="fp-all" href={`${page}/words`}>
              All messages with {who}
              <CaretRight size={10} weight="bold" aria-hidden="true" />
            </Link>
          )}
        </div>
      )}
      {showing === 'sends' && (
        <div className="fp-under">
          {sends.map(one)}
          {sends.length === 0 && <p className="fp-none">Nothing from {who} waiting.</p>}
        </div>
      )}
      {stranger && journal && <p className="fp-closed">Add to see their journal</p>}
    </div>
  );
}
