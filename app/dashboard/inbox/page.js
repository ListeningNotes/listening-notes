// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Archive, ArrowCounterClockwise, ArrowUUpLeft, Article, BookOpen, Broadcast, Check, Envelope, HandWaving, LinkSimple, MusicNoteSimple, PencilSimple, PencilSimpleLine, Plus, Shuffle, User, VinylRecord, X } from '@phosphor-icons/react';
import Link from 'next/link';
import SiteNav from '../../../components/main_components/SiteNav';
import MiniAddressBook from '../../../components/main_components/MiniAddressBook';
import WaveSheet from '../../../components/main_components/WaveSheet';
import MessageForm from '../../../components/main_components/Slug_Page/MessageForm';
import { Compared } from '../../../components/main_components/Feed';
import { carrySender, journalUrl, tidyJournal } from '../../../library/return_address';
import { useBookplate } from '../../../components/main_components/Bookplate';
import { albumKey } from '../../../hooks/useListeningBeacon';
import { lookup_key, splitNotes } from '../../../library/entry_formatter';
import { TRACK_NOTE_KEY } from '../../../hooks/useListeningSession';
import { REPORTS_URL } from '../../../library/version';

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
// actions at all, which is how an album a tester sent had nowhere to record
// that they have a journal now. One list, newest first, a dot for what is new, and
// the state as a word in the row's own subtitle.
const UNOPENED = 'pending';
const ARCHIVED = 'dismissed';

// A score said in words, for what came back: "Came back · four and a half
// stars". Words rather than drawn stars because the line under an inbox
// row's title is the caption face, and the mock-up says it this way.
const STARS_SAID = {
  0: 'no stars', 0.5: 'half a star', 1: 'one star', 1.5: 'one and a half stars',
  2: 'two stars', 2.5: 'two and a half stars', 3: 'three stars', 3.5: 'three and a half stars',
  4: 'four stars', 4.5: 'four and a half stars', 5: 'five stars',
};

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
// ── What kind of thing a row is, 2026-09-28 ────────────────────────────────
// Miyel: "each thing in the inbox should hold an icon" — sends, waves,
// messages, what came back. Four kinds of arrival share one list, and a
// cover or a face says what a row is about, not what it is. So every row
// carries its kind in a column of its own, before the cover, where the eye
// can run down it (her pick over a badge on the cover's corner and a glyph
// in the small line).
//
// Which mark, 2026-09-29, in her words: "message or any writing the mail
// envelope, submissions (album should be disk, track should be a music note
// or something that implies it's smaller), someone logged is fine as return
// button." The disc and the note are the two a folder's tabs already wear
// for a listen and a song (FolderFooter.js), and the hand is the Wave
// button's.
const KIND = {
  message: Envelope,
  album: VinylRecord,
  song: MusicNoteSimple,
  wave: HandWaving,
  back: ArrowUUpLeft,
};

function Kind({ of }) {
  const Mark = KIND[of];
  return (
    <span className="ib-kind" aria-hidden="true">
      <Mark size={17} weight="regular" />
    </span>
  );
}

// ── An open row's doors, 2026-09-28 ────────────────────────────────────────
// Miyel, on seeing a message open as a line of who it was from, a black
// button and a column of sentences: "too bulky ... not the clean design that
// I really like. I would like it to match more on the friends page when you
// click on a friend and there's visit compare send and pin ... I'm not a fan
// of this vertical list, too wordy."
//
// So an open row is what was said and then its doors, in the Friends pane's
// own pattern and its own classes (.fr-doors-row, .fr-door): a glyph over
// one word, spread evenly across the row. Open, Visit, Add, Dismiss — her
// words. A door that has nothing behind it is not drawn: no Add for somebody
// already in the book, no Open when the entry has gone. Nothing is said
// twice, so the line naming who it is from went; the row's own title says
// it, and the day joins the small line under it.
//
// A day, said short for that line: "Sep 28", with the year once it is not
// this one.
function shortDay(value) {
  const day = new Date(value);
  if (Number.isNaN(day.getTime())) return '';
  const sameYear = day.getFullYear() === new Date().getFullYear();
  return day.toLocaleDateString(undefined, sameYear
    ? { month: 'short', day: 'numeric' }
    : { month: 'short', day: 'numeric', year: 'numeric' });
}

// ── What a message answers, 2026-09-29 ─────────────────────────────────────
// Miyel: a message "needs to show what they are commenting or messaging
// about because right now it could be a track or an album review ... almost
// like a message chain", and the shape she liked is the one replies were
// drawn in — "You said: what they said, greyed out, then the response."
//
// So over a message stands the line it answers. For one about an entry of
// this journal's own that is the keeper's note: the song's, when it was
// written from a track, and the album's otherwise — read off the entry when
// the row opens, since the writing stays out of lists. The first three
// lines, with a way to see all of it (her pick).
function noteOn(entry, song) {
  if (!entry) return '';
  // A note on one song is the whole of its entry's writing.
  if (entry.song) return String(entry.notes || '').trim();
  if (song && Array.isArray(entry.tracks)) {
    const want = lookup_key(song, '');
    const track = entry.tracks.find(t => lookup_key(t?.title || '', '') === want);
    const note = String(track?.note || '').trim();
    if (note) return note;
    // A song named, and nothing written on it any more: the line says
    // nothing sooner than put the album's note under a song's name.
    return '';
  }
  return splitNotes(entry.notes).albumNotes;
}

// Whether a line runs past three on a phone, near enough. Not measured: a
// measurement is a second draw, and being a line out either way costs a word
// that was not needed or three lines that were all there was.
const runsLong = words => words.length > 150 || (words.match(/\n/g) || []).length >= 3;

// The first line of a message, for the small line under a row that is about
// no entry: the words are all it has to say what it is.
const opening = said => String(said || '').trim().split(/\n/)[0];

// NoteModal is gone. It existed because the submissions view was a table with
// no room in it for a paragraph, so the one part of a send that mattered — why
// somebody sent it — was hidden behind a button marked "Note". The view is a
// shelf now and the message is on the front of every item, which is what it
// was always for.

// `inPane` is the third way this page is drawn, from 2026-09-19: as a pane of
// the cross rather than a screen of its own. The band at the foot made the
// inbox one of four places you can be, so the whole page mounts inside the
// rail — which means no SiteNav (the cross has its own bar above every pane)
// and no redirect when the check says no, because the cross has already asked
// the same question and would not be drawing this if the answer were no. The
// standalone address stays exactly as it was; a bookmark is a promise.
export default function Inbox({ layered = false, inPane = false }) {
  const router = useRouter();
  // Who this copy belongs to, carried on every link out to another journal
  // so the form there knows who is sending. See carrySender.
  const { keeper_name: myName, site_address: myAddress } = useBookplate();
  const me = { name: myName, address: myAddress };

  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);

  const [submissions, setSubmissions] = useState([]);
  const [subLoading, setSubLoading] = useState(true);
  // ── What came back, 2026-09-22 ─────────────────────────────────────────
  // Records this journal put somebody onto, logged on theirs: the friends
  // brief's third item, "a returned send is an arrival". The feed notices
  // them and this copy keeps them (library/came_back_actions.js); here they
  // sit among the sends by date, with the dot until opened and no count on
  // the folder — nothing about them is waiting on you.
  const [cameBack, setCameBack] = useState([]);
  // ── Waves, 2026-09-23 ──────────────────────────────────────────────────
  // Somebody added this journal and said so (the waves brief). A wave sits
  // among the sends by when it arrived, opens where it sits like any row,
  // and offers their journal, Add when they are not in the book, and Leave
  // it — which deletes it. Nothing is ever sent back: not whether it was
  // read, not whether they were added. `wavingTo` is the other direction:
  // somebody just added from here, and the offer to wave at them.
  const [waves, setWaves] = useState([]);
  const [openWave, setOpenWave] = useState(null);
  const [wavingTo, setWavingTo] = useState(null);
  // ── Messages, 2026-09-28 ───────────────────────────────────────────────
  // Somebody's words, addressed to this journal's keeper: written from an
  // entry here, or from another keeper's copy (the messages brief). A
  // message sits among the sends by when it arrived and opens where it sits
  // like any row. It is never drawn on a page, and there is no thread: one
  // row is one arrival. Dismissing deletes it, in two presses — `sureOf` is
  // the row whose Dismiss has been pressed once and is asking.
  const [messages, setMessages] = useState([]);
  const [openMessage, setOpenMessage] = useState(null);
  const [sureOf, setSureOf] = useState(null);
  // What a message about an entry here answers: the entry, read when its
  // row first opens, by slug. `wholeLine` is the row showing all of it.
  const [notes, setNotes] = useState({});
  const [wholeLine, setWholeLine] = useState(null);
  // Replying: the row whose form is open, and the row whose reply has just
  // left, which says so for a moment.
  const [replying, setReplying] = useState(null);
  const [onItsWay, setOnItsWay] = useState(null);
  // A record that came back opens where it sits too, from 2026-09-29.
  const [openBack, setOpenBack] = useState(null);
  // ── What the people writing have on their own shelves ───────────────────
  // Two doors depend on it: Compare, on a message or a record that came
  // back, when they have logged the record too; and Read in place of Visit
  // on a send, when they have it posted (Miyel, 2026-09-29). Their public
  // feed says, and it is read here in the browser the way the feed pane
  // reads it — once per journal, never stored, and a journal that does not
  // answer is an empty shelf.
  const [shelves, setShelves] = useState({});
  const asked = useRef(new Set());
  // The comparison that is open, and the one on its way out — the shape the
  // feed keeps, so it closes rather than vanishing.
  const [comparing, setComparing] = useState(null);
  const [shutting, setShutting] = useState(null);
  const shutTimer = useRef(null);
  const askedMine = useRef(false);
  // Which row is open. One at a time — an open row is a decision being made,
  // and two of them is a list of controls again.
  const [openRow, setOpenRow] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  // Problem reports sit behind a line at the foot of the sends, the way the
  // archived ones do, on the one copy that receives any (takesReports).
  const [showReports, setShowReports] = useState(false);
  // Unfinished listens, read once the first row opens: a row needs to know
  // whether there is a draft behind it to offer, and most visits to the
  // inbox never open anything.
  const [drafts, setDrafts] = useState(null);

  // Problems keepers wrote in from their desks (library/report_actions.js).
  // Only the copy the software comes from ever receives any, so only that
  // copy has the tab — on every other one it was a folder that could never
  // hold anything (Miyel, 2026-09-22). Known by whether this copy's own
  // address is where REPORTS_URL points, www or not.
  const bare = value => (value || '').replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '').toLowerCase();
  const takesReports = !!myAddress && bare(myAddress) === bare(REPORTS_URL);
  const [reports, setReports] = useState([]);
  const [repLoading, setRepLoading] = useState(true);

  // Who is already in the address book, so a send that carried a journal
  // offers to file it only once. A send is one of the ways an address gets
  // in (app/dashboard/people/page.js); this is that way.
  const [people, setPeople] = useState([]);
  const filed = new Set(people.map(p => p.address));

  const myJournal = tidyJournal(myAddress);

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
    fetch('/api/came-back').then(r => (r.ok ? r.json() : { cameBack: [] })).then(d => setCameBack(d.cameBack || [])).catch(() => {});
    fetch('/api/waves').then(r => (r.ok ? r.json() : { waves: [] })).then(d => setWaves(d.waves || [])).catch(() => {});
    fetch('/api/messages').then(r => (r.ok ? r.json() : { messages: [] })).then(d => setMessages(d.messages || [])).catch(() => {});
    fetch('/api/people').then(r => r.json()).then(d => setPeople(d.people || [])).catch(() => {});
  }, [authed]);

  // Their shelves, asked for as the rows arrive.
  useEffect(() => {
    if (!authed) return;
    const own = String(myJournal || '').replace(/^www\./, '');
    const hosts = new Set();
    for (const s of submissions) hosts.add(tidyJournal(s.sender_url));
    for (const m of messages) hosts.add(tidyJournal(m.from_journal));
    for (const b of cameBack) hosts.add(tidyJournal(b.journal));
    for (const host of hosts) {
      if (!host || host.replace(/^www\./, '') === own || asked.current.has(host)) continue;
      asked.current.add(host);
      fetch(`${journalUrl(host)}/api/public/entries`, { signal: AbortSignal.timeout(8000) })
        .then(r => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
        .then(j => setShelves(prev => ({ ...prev, [host]: Array.isArray(j) ? j : (j.entries || []) })))
        .catch(() => setShelves(prev => ({ ...prev, [host]: [] })));
    }
  }, [authed, myJournal, submissions, messages, cameBack]);

  useEffect(() => () => clearTimeout(shutTimer.current), []);

  // A Dismiss that has been pressed once is put back by a press anywhere
  // else — the shape Remove has in the address book and Delete has on an
  // entry. Listening only while one is asking.
  useEffect(() => {
    if (sureOf === null) return undefined;
    const away = event => { if (!event.target.closest?.('[data-sure]')) setSureOf(null); };
    document.addEventListener('pointerdown', away);
    return () => document.removeEventListener('pointerdown', away);
  }, [sureOf]);

  useEffect(() => {
    if (!authed || !takesReports) return;
    fetch('/api/reports').then(r => r.json()).then(d => { setReports(d.reports || []); setRepLoading(false); }).catch(() => setRepLoading(false));
  }, [authed, takesReports]);

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
    // Somebody new to the book — from a send's row or from their wave — so
    // the wave is offered, which is also how a wave is answered (2026-09-23).
    if (r.ok && d.person && d.fresh) setWavingTo(d.person);
  }

  // This journal's own records, as the wall lists them: read once, the
  // first time anything needs them. Compare wants your listen to set
  // against theirs, a record that came back wants to know whether you have
  // it, and the picker behind Logged chooses from them.
  function readMine() {
    if (askedMine.current) return;
    askedMine.current = true;
    fetch('/api/entries')
      .then(r => r.json())
      .then(d => setMine(Array.isArray(d) ? d : (d.entries || [])))
      .catch(() => setMine([]));
  }

  // Your listen of a record: the most recent, and a listen rather than a
  // note on one song (DECISIONS: never average across listens).
  const myListen = key => (mine || []).find(e => e.album_key === key && !e.song) || null;

  // Theirs, off their shelf. For a song, their note on that song when they
  // wrote one; otherwise their listen of the record.
  function theirListen(host, key, song = '') {
    const shelf = shelves[tidyJournal(host)] || [];
    if (song) {
      const want = lookup_key(song, '');
      const note = shelf.find(e => e.album_key === key && e.song && lookup_key(e.song, '') === want);
      if (note) return note;
    }
    return shelf.find(e => e.album_key === key && !e.song) || null;
  }

  function toggleCompare(key) {
    clearTimeout(shutTimer.current);
    if (comparing === key) {
      setShutting(key);
      setComparing(null);
      shutTimer.current = setTimeout(() => setShutting(null), 340);
      return;
    }
    setShutting(null);
    setComparing(key);
  }

  // Opens a message where it sits, which is also what puts its dot out.
  // Nothing is sent back: whoever wrote it never learns it was read. The
  // entry it is about is read now, for the line it answers.
  function openWords(message) {
    shutOthers('message');
    setOpenMessage(o => (o === message.id ? null : message.id));
    setReplying(null);
    readMine();
    const slug = message.about_slug;
    if (slug && !message.about_journal && message.entry_here && notes[slug] === undefined) {
      setNotes(prev => ({ ...prev, [slug]: null }));
      fetch(`/api/entries/${encodeURIComponent(slug)}`)
        .then(r => (r.ok ? r.json() : null))
        .then(d => setNotes(prev => ({ ...prev, [slug]: d?.entry || null })))
        .catch(() => {});
    }
    if (message.seen_at) return;
    fetch('/api/messages', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: message.id }) }).catch(() => {});
    setMessages(prev => prev.map(m => (m.id === message.id ? { ...m, seen_at: new Date().toISOString() } : m)));
  }

  // What stands greyed over a message: the words it answers, and whose.
  function saidFirst(message) {
    if (message.answering) {
      const theirs = String(message.answering_name || '').trim();
      const you = !theirs || (Boolean(myName) && theirs.toLowerCase() === String(myName).trim().toLowerCase());
      return { who: you ? 'You' : theirs, words: message.answering };
    }
    if (!message.about_slug || message.about_journal) return null;
    const words = noteOn(notes[message.about_slug], message.about_song);
    return words ? { who: 'You', words } : null;
  }

  // Dismissing is how a message ends, and it deletes it: there is no archive
  // (the messages brief). Two presses, so a thumb cannot lose somebody's
  // words by brushing past — the first asks, the second does it. The row
  // leaves the list only once the server has said it is gone.
  async function dismiss(message) {
    const key = `message-${message.id}`;
    if (sureOf !== key) { setSureOf(key); return; }
    const r = await fetch('/api/messages', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: message.id }) }).catch(() => null);
    setSureOf(null);
    if (!r?.ok) return;
    setMessages(prev => prev.filter(m => m.id !== message.id));
    setOpenMessage(null);
  }

  // A reply leaves through this copy's own outbox, which reads who it goes
  // to off the message's row. What comes back is whether it landed, in the
  // other copy's words when it did not; the form keeps what was written.
  async function reply(message, said) {
    const r = await fetch('/api/outbox', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: true, reply_to: message.id, said }),
    }).catch(() => null);
    const d = await r?.json().catch(() => null);
    if (!r?.ok || !d?.ok) {
      return { ok: false, error: d?.error || 'Something went wrong. Nothing was sent, and your words are still here.' };
    }
    // The row says it was answered from here on (migrations/029).
    const when = d.replied_at || new Date().toISOString();
    setMessages(prev => prev.map(m => (m.id === message.id ? { ...m, replied_at: when } : m)));
    return { ok: true };
  }

  // A record that came back, opened: the dot goes out, as it did when the
  // row was a link.
  function openReturned(row) {
    shutOthers('back');
    setOpenBack(o => (o === row.id ? null : row.id));
    readMine();
    if (row.seen_at) return;
    fetch('/api/came-back', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: row.id }) }).catch(() => {});
    setCameBack(prev => prev.map(r => (r.id === row.id ? { ...r, seen_at: new Date().toISOString() } : r)));
  }

  // And dismissed: put away on this copy and kept, so the feed that noticed
  // it does not bring it back (migrations/028). The same two presses as a
  // message, because the same word should do the same thing.
  async function dismissReturned(row) {
    const key = `back-${row.id}`;
    if (sureOf !== key) { setSureOf(key); return; }
    const r = await fetch('/api/came-back', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: row.id }) }).catch(() => null);
    setSureOf(null);
    if (!r?.ok) return;
    setCameBack(prev => prev.filter(x => x.id !== row.id));
    setOpenBack(null);
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
  // One row open at a time, whatever kind it is: an open row is a decision
  // being made, and two of them is a list of controls again. Each kind keeps
  // its own state, so opening one shuts the other three.
  function shutOthers(kind) {
    if (kind !== 'send') setOpenRow(null);
    if (kind !== 'message') { setOpenMessage(null); setReplying(null); }
    if (kind !== 'wave') setOpenWave(null);
    if (kind !== 'back') setOpenBack(null);
    setSureOf(null);
    setComparing(null);
    setShutting(null);
  }

  function openSend(sent) {
    shutOthers('send');
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
    readMine();
  }

  // The press itself. One write on the server — the send is marked logged
  // and pointed at the record, and nothing is written on the record, because
  // the press says it was here before the send (DECISIONS, The network) —
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
        // of it, so a row written by an older fold still matches itself. A
        // song send's draft is the note's, keyed with the song after a bar.
        const key = lookup_key(sent.album, sent.artist || '', sent.song || '');
        draft = (d?.drafts || []).find(row => (row.lookup_key || lookup_key(row.album, row.artist || '', row.song || '')) === key) || null;
      } catch { /* the listen still opens; see below */ }
    }
    if (sent.song) return beginNote(sent, draft);
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

  // ── A song send opens a track note, 2026-10-06 ──────────────────────────
  // Not the record: the note for that song, carrying the sender the way a
  // listen does, and settling this row when it is saved (DECISIONS: a song
  // send is logged as a track note). It waits in the tab the way the
  // picker's songs do (TRACK_NOTE_KEY), so the session page opens it as the
  // card being written. Nothing is asked first — a note sits over whatever
  // listen is on the desk and takes nothing from it. With a draft, the note
  // opens where it was left; the browser's own copy of the words comes
  // first, as it does from the picker (TrackNotePage).
  async function beginNote(sent, draft = null) {
    try {
      sessionStorage.setItem(TRACK_NOTE_KEY, JSON.stringify({
        song: sent.song,
        album: draft?.album || sent.album,
        artist: draft?.artist || sent.artist || '',
        year: draft?.year || sent.year || '',
        artUrl: draft?.album_art || sent.album_art || '',
        collectionId: draft?.collection_id || sent.collection_id || null,
        genre: draft?.genre || '',
        written: draft ? { rating: draft.rating, note: draft.notes || '', favorite: draft.favorite === true, formative: draft.formative === true } : null,
        entryType: 'Submission',
        receivedFrom: sent.submitter_name || '',
        receivedFromUrl: sent.sender_url || '',
        receivedDate: sent.created_at ? String(sent.created_at).slice(0, 10) : '',
        creditPrivate: sent.quiet === true,
        submissionId: sent.id,
      }));
    } catch { /* a private window: the session opens on its picker instead */ }
    if (sent.status !== 'reviewed') await updateStatus(sent.id, 'reviewed');
    router.push('/session');
  }

  // Ask first, when there is a different record in hand with writing on it.
  async function startListen(sent) {
    if (sent.song) return beginNote(sent);
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

  const unopened = s => s.status === UNOPENED;
  // One list, newest first — which is how the rows arrive. Archived come out
  // of it and sit behind a line at the foot; opened, they go on the end
  // rather than back into the order, so nothing a keeper has put away
  // reappears in the middle of what has not been dealt with.
  const live = submissions.filter(s => s.status !== ARCHIVED);
  const archivedRows = submissions.filter(s => s.status === ARCHIVED);
  const archivedCount = archivedRows.length;
  // What came back goes in among the live sends, newest first: a send by
  // when it arrived, a return by when they logged it. `backed` is how the
  // list below tells the two apart.
  const liveWithReturns = [
    ...live.map(s => ({ ...s, at: s.created_at })),
    ...cameBack.map(row => ({ ...row, backed: true, at: row.posted_at || row.noticed_at })),
    ...waves.map(w => ({ ...w, waved: true, at: w.arrived_at })),
    ...messages.map(m => ({ ...m, wrote: true, at: m.arrived_at })),
  ].sort((a, b) => new Date(b.at) - new Date(a.at));
  const shown = showArchived ? [...liveWithReturns, ...archivedRows] : liveWithReturns;

  // The draft behind a send, if there is one. Matched on the fold that keys
  // the drafts table — see resumeListen for why it has to be that one.
  function draftFor(sent) {
    if (!drafts || drafts.length === 0) return null;
    // A song send's draft is the note's, keyed with the song after a bar.
    const key = lookup_key(sent.album, sent.artist || '', sent.song || '');
    return drafts.find(row => (row.lookup_key || lookup_key(row.album, row.artist || '', row.song || '')) === key) || null;
  }

  // What the picker offers on the open row: the likely record first, then
  // whatever is typed. albumKey is the same fold two journals use to
  // recognise one record through different punctuation, so a send for
  // "Beyoncé — Lemonade" finds the entry however either was typed.
  function candidates(sent) {
    // A record send became a record's listen or nothing, and a note on one
    // song off it is not the record they sent (2026-09-24). A song send
    // (2026-10-06) is logged as a track note, so for one the note on that
    // song is exactly what they sent and is offered first; a listen of the
    // record still counts — you had sat with it — and other songs' notes do
    // not.
    const key = albumKey(sent.album, sent.artist);
    const songKey = sent.song ? lookup_key(sent.song, '') : '';
    const all = (mine || []).filter(e => !e.song || (songKey && e.album_key === key && lookup_key(e.song, '') === songKey));
    const typed = look.trim().toLowerCase();
    if (typed) {
      return all
        .filter(e => `${e.song || ''} ${e.album} ${e.artist}`.toLowerCase().includes(typed))
        .slice(0, 8);
    }
    return all
      .filter(e => e.album_key === key)
      .sort((a, b) => (b.song ? 1 : 0) - (a.song ? 1 : 0))
      .slice(0, 8);
  }

  if (checking) return <div style={{ minHeight: '100vh', background: 'var(--bg)' }} />;
  if (!authed) { if (!inPane && typeof window !== 'undefined') window.location.replace('/login'); return null; }


  return (
    <div className={'own-screen' + (layered ? ' own-screen--layered' : '') + (inPane ? ' own-screen--pane' : '')}>
      {!inPane && <SiteNav />}

      {/* ── One list, and no tabs, 2026-09-29 ─────────────────────────────
          There were three folders: Submissions, Comments waiting to be
          approved, and Replies to what the keeper had said on other
          journals. Comments became messages and nothing waits to be
          approved; a reply is a message too, and arrives like one (the
          messages brief). So everything that arrives is a row in the one
          list, told apart by the mark it carries, and the row of tabs went
          with the two folders that had nothing left in them. The count over
          the list went too: it counted sends, in a list that is no longer
          only sends, and a row that is new says so with its dot. */}
      <div className="own-body ib-body">
        <div className="own-panel ib-panel">
          <div className="ib-scroll">

              <>
                {subLoading ? (
                  <div className="ib-list" style={{ gap: 10 }}>
                    {[...Array(4)].map((_, i) => <div key={i} className="own-skeleton" style={{ height: 46 }} />)}
                  </div>
                ) : submissions.length === 0 && cameBack.length === 0 && waves.length === 0 && messages.length === 0 ? (
                  <div className="own-empty">Nothing has been sent to you yet.</div>
                ) : (
                  <>
                    <div className="ib-list">
                      {shown.map(sent => {
                        // ── A record that came back ──────────────────────
                        // "[name] logged MAGDALENE", then "Came back" and how
                        // they rated it. Opening it is what puts the dot out.
                        // ── A wave ──────────────────────────────────────
                        // "Omar waved", and whether they are in the book.
                        // Add sits on the row itself when they are not —
                        // beside the row's own button rather than inside
                        // it, since a button cannot hold a button — and
                        // pressing the row opens it where it sits, which is
                        // also what puts its dot out.
                        if (sent.waved) {
                          const w = sent;
                          const inBook = filed.has(w.address);
                          const isOpen = openWave === w.id;
                          const who = w.name || tidyJournal(w.address);
                          return (
                            <div key={`wave-${w.id}`} className={'ib-r ib-r--wave' + (isOpen ? ' ib-r--open' : '')}>
                              <div className="ib-rline">
                                <button
                                  className="ib-rhead"
                                  aria-expanded={isOpen}
                                  onClick={() => {
                                    shutOthers('wave');
                                    setOpenWave(isOpen ? null : w.id);
                                    if (w.seen_at) return;
                                    fetch('/api/waves', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: w.id }) }).catch(() => {});
                                    setWaves(prev => prev.map(x => (x.id === w.id ? { ...x, seen_at: new Date().toISOString() } : x)));
                                  }}
                                >
                                  <span className={'ib-newdot' + (w.seen_at ? ' ib-newdot--off' : '')} aria-hidden="true" />
                                  <Kind of="wave" />
                                  <span className="ib-rart ib-rart--face" aria-hidden="true">
                                    <User size={18} weight="regular" />
                                    <img src={`${journalUrl(w.address)}/api/portrait`} alt="" loading="lazy" onError={e => { e.currentTarget.style.display = 'none'; }} />
                                  </span>
                                  <span className="ib-rsaid">
                                    <span className="ib-rttl">{who} waved</span>
                                    <span className="ib-rsub">{inBook ? 'Already in your book' : 'Not in your book'}</span>
                                  </span>
                                </button>
                                {/* On the row while it is shut; once it is
                                    open, Add is one of its doors, and the
                                    same word twice is one too many. */}
                                {!inBook && !isOpen && (
                                  <button className="ib-radd" onClick={() => file(w.address)}>Add</button>
                                )}
                              </div>
                              {isOpen && (
                                <div className="ib-open ib-open--doors">
                                  <div className="ib-doors fr-doors-row">
                                    <a
                                      className="fr-door"
                                      href={carrySender(journalUrl(w.address), me, { known: inBook })}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      <BookOpen size={22} weight="regular" aria-hidden="true" />
                                      Visit
                                    </a>
                                    {!inBook && (
                                      <button type="button" className="fr-door" onClick={() => file(w.address)}>
                                        <Plus size={22} weight="regular" aria-hidden="true" />
                                        Add
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      className="fr-door"
                                      onClick={() => {
                                        fetch('/api/waves', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: w.id }) }).catch(() => {});
                                        setWaves(prev => prev.filter(x => x.id !== w.id));
                                        setOpenWave(null);
                                      }}
                                    >
                                      <X size={22} weight="regular" aria-hidden="true" />
                                      Leave it
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        }
                        // ── A message ───────────────────────────────────
                        // "[name] wrote", and what about: the entry it was
                        // written from, the song when it was written from a
                        // track's note, or the opening of the words when it
                        // is about nothing. One that used to be a comment on
                        // an entry says so. The cover when it is about a
                        // record, the writer's face when it is not.
                        //
                        // Open, it is the line it answers, greyed; what they
                        // said; and the doors — Reply, Compare when they
                        // have logged the record too, Add for somebody who
                        // is not in the book, Dismiss (Miyel, 2026-09-29).
                        // The keeper's own replies came across with the
                        // comments they answered, and read "You wrote".
                        if (sent.wrote) {
                          const m = sent;
                          const host = tidyJournal(m.from_journal);
                          // The keeper's own words, brought across with
                          // the comments they answered. Known by this
                          // journal's address — or, for a comment from
                          // before the address was stamped on, by the
                          // keeper's name, which is how replies knew them
                          // too. By name only on a row that was a comment:
                          // anybody can type a name into a form.
                          const own = host
                            ? bare(host) === bare(myJournal)
                            : Boolean(m.written_at) && Boolean(myName)
                              && String(m.from_name || '').trim().toLowerCase() === String(myName).trim().toLowerCase();
                          const who = own ? 'You' : (m.from_name || 'Someone');
                          const isOpen = openMessage === m.id;
                          const key = `message-${m.id}`;
                          const sure = sureOf === key;
                          const about = m.about_song || m.about_album || '';
                          const under = m.was_comment
                            ? `Was a comment${about ? ` · ${about}` : ''}`
                            : about ? `About ${about}` : opening(m.said);
                          const face = host && (
                            <img src={`${journalUrl(host)}/api/portrait`} alt="" loading="lazy" onError={e => { e.currentTarget.style.display = 'none'; }} />
                          );
                          const first = isOpen ? saidFirst(m) : null;
                          const whole = wholeLine === m.id;
                          // The two listens a comparison sets side by side:
                          // yours of the record this is about, and theirs.
                          const record = m.about_album ? albumKey(m.about_album, m.about_artist) : '';
                          const yours = isOpen && record && !m.about_journal ? myListen(record) : null;
                          const theirs = isOpen && record && host && !own ? theirListen(host, record) : null;
                          return (
                            <div key={key} className={'ib-r ib-r--message' + (isOpen ? ' ib-r--open' : '')}>
                              <button className="ib-rhead" aria-expanded={isOpen} onClick={() => openWords(m)}>
                                <span className={'ib-newdot' + (m.seen_at ? ' ib-newdot--off' : '')} aria-hidden="true" />
                                <Kind of="message" />
                                {m.about_slug ? (
                                  <span className={'ib-rart' + (m.about_song && m.about_art ? ' ln-fold' : '')}>
                                    {m.about_art
                                      ? <img src={m.about_art} alt="" loading="lazy" />
                                      : <span className="ib-nocover" aria-hidden="true">&#9834;</span>}
                                    {m.about_song && m.about_art && (
                                      <span className="ln-fold-flap" aria-hidden="true"><img src={m.about_art} alt="" /></span>
                                    )}
                                  </span>
                                ) : (
                                  <span className="ib-rart ib-rart--face" aria-hidden="true">
                                    <User size={18} weight="regular" />
                                    {face}
                                  </span>
                                )}
                                <span className="ib-rsaid">
                                  <span className="ib-rttl">{who} wrote</span>
                                  {/* Whether it has been answered, what it
                                      is about, and the day once it is open.
                                      Replied leads the line: the line is cut
                                      short on a phone, and what is cut
                                      should be the song's name sooner than
                                      the one word that says where things
                                      stand. */}
                                  <span className="ib-rsub">
                                    {m.replied_at ? 'Replied · ' : ''}
                                    {under}
                                    {isOpen && shortDay(m.written_at || m.arrived_at) ? ` · ${shortDay(m.written_at || m.arrived_at)}` : ''}
                                  </span>
                                </span>
                                {m.about_slug && (
                                  <span className="ib-rface" aria-hidden="true">
                                    <User size={13} weight="regular" />
                                    {face}
                                  </span>
                                )}
                              </button>

                              {isOpen && (
                                <div className="ib-open ib-open--doors">
                                  {/* What it answers, greyed, the way replies
                                      were drawn: three lines of it, and all
                                      of it on a press. */}
                                  {first && (
                                    <p className={'ib-answering' + (whole || !runsLong(first.words) ? '' : ' ib-answering--short')}>
                                      {first.who} said: {first.words}
                                    </p>
                                  )}
                                  {first && runsLong(first.words) && (
                                    <button
                                      type="button"
                                      className="ib-seeall"
                                      aria-expanded={whole}
                                      onClick={() => setWholeLine(w => (w === m.id ? null : m.id))}
                                    >
                                      {whole ? 'See less' : 'See all'}
                                    </button>
                                  )}

                                  <p className="ib-msg">{m.said}</p>

                                  <div className="ib-doors fr-doors-row">
                                    {host && !own && (
                                      <button
                                        type="button"
                                        className="fr-door"
                                        aria-expanded={replying === m.id}
                                        onClick={() => { setOnItsWay(null); setReplying(r => (r === m.id ? null : m.id)); }}
                                      >
                                        <PencilSimpleLine size={22} weight="regular" aria-hidden="true" />
                                        Reply
                                      </button>
                                    )}
                                    {yours && theirs && (
                                      <button
                                        type="button"
                                        className="fr-door"
                                        aria-expanded={comparing === key}
                                        onClick={() => toggleCompare(key)}
                                      >
                                        <Shuffle size={22} weight="regular" aria-hidden="true" />
                                        Compare
                                      </button>
                                    )}
                                    {host && !own && !filed.has(host) && (
                                      <button type="button" className="fr-door" onClick={() => file(m.from_journal)}>
                                        <Plus size={22} weight="regular" aria-hidden="true" />
                                        Add
                                      </button>
                                    )}
                                    {/* Last, and red only once it has been
                                        asked: the first press asks, the
                                        second deletes, a press anywhere else
                                        puts it back. */}
                                    <button
                                      type="button"
                                      data-sure
                                      className={'fr-door' + (sure ? ' ib-door--sure' : '')}
                                      onClick={() => dismiss(m)}
                                      title={sure ? 'Press again to delete this message for good' : 'Delete this message'}
                                    >
                                      <X size={22} weight="regular" aria-hidden="true" />
                                      {sure ? 'Dismiss?' : 'Dismiss'}
                                    </button>
                                  </div>

                                  {/* The reply unfolds under the doors, where
                                      it was asked for. What is typed is kept
                                      by the form until it has landed. */}
                                  {replying === m.id && (
                                    <div className="ib-reply">
                                      <MessageForm
                                        draftKey={`reply-${m.id}`}
                                        label={`Your reply to ${who}`}
                                        placeholder={`Reply to ${who}`}
                                        send={said => reply(m, said)}
                                        onSent={() => {
                                          setReplying(null);
                                          setOnItsWay(m.id);
                                          setTimeout(() => setOnItsWay(w => (w === m.id ? null : w)), 2600);
                                        }}
                                        onLeave={() => setReplying(null)}
                                      />
                                    </div>
                                  )}
                                  {onItsWay === m.id && (
                                    <p className="ib-said-by ib-onitsway" role="status">On its way to {who}</p>
                                  )}

                                  {yours && theirs && (comparing === key || shutting === key) && (
                                    <Compared mine={yours} theirs={theirs} name={who} closing={shutting === key} theirStars />
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        }
                        if (sent.backed) {
                          const row = sent;
                          const who = row.name || tidyJournal(row.journal);
                          const rated = row.rating === null || row.rating === undefined ? null : STARS_SAID[Number(row.rating)];
                          const isOpen = openBack === row.id;
                          const key = `back-${row.id}`;
                          const sure = sureOf === key;
                          const record = albumKey(row.album, row.artist);
                          const yours = isOpen ? myListen(record) : null;
                          // Theirs by its own address when their shelf
                          // holds it, since that is the entry the row is.
                          const theirs = isOpen
                            ? (shelves[tidyJournal(row.journal)] || []).find(e => e.slug === row.slug) || null
                            : null;
                          return (
                            <div key={key} className={'ib-r ib-r--back' + (isOpen ? ' ib-r--open' : '')}>
                              <button className="ib-rhead" aria-expanded={isOpen} onClick={() => openReturned(row)}>
                                <span className={'ib-newdot' + (row.seen_at ? ' ib-newdot--off' : '')} aria-hidden="true" />
                                <Kind of="back" />
                                {/* No envelope in the cover's corner, from
                                    2026-09-29 (Miyel: it "must go"). In this
                                    list the envelope is anything written,
                                    and the arrow before the cover already
                                    says what the row is. */}
                                <span className={'ib-rart' + (row.song && row.album_art ? ' ln-fold' : '')}>
                                  {row.album_art
                                    ? <img src={row.album_art} alt="" loading="lazy" />
                                    : <span className="ib-nocover" aria-hidden="true">&#9834;</span>}
                                  {row.song && row.album_art && (
                                    <span className="ln-fold-flap" aria-hidden="true"><img src={row.album_art} alt="" /></span>
                                  )}
                                </span>
                                <span className="ib-rsaid">
                                  {/* A note that came back is named by its song
                                      (migration 030); the record is the row's
                                      own, under Compare and the rest. */}
                                  <span className="ib-rttl">{who} logged {row.song || row.album}</span>
                                  <span className="ib-rsub">
                                    Came back
                                    {rated ? ` · ${rated}` : ''}
                                    {row.masterpiece ? ', and a masterpiece' : ''}
                                  </span>
                                </span>
                                <span className="ib-rface" aria-hidden="true">
                                  <User size={13} weight="regular" />
                                  <img src={`${journalUrl(row.journal)}/api/portrait`} alt="" loading="lazy" onError={e => { e.currentTarget.style.display = 'none'; }} />
                                </span>
                              </button>

                              {/* It opened their entry on a press until
                                  2026-09-29. It opens where it sits now,
                                  like every other row, and their entry is
                                  the first of its doors. Read, Compare,
                                  Dismiss, in her order — and nothing that
                                  leads to the keeper's own entry, which is
                                  on their own wall and not what arrived. */}
                              {isOpen && (
                                <div className="ib-open ib-open--doors">
                                  <div className="ib-doors fr-doors-row">
                                    <a
                                      className="fr-door"
                                      href={carrySender(`${journalUrl(row.journal)}/entries/${row.slug}`, me, { known: filed.has(row.journal) })}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      <Article size={22} weight="regular" aria-hidden="true" />
                                      Read
                                    </a>
                                    {yours && theirs && (
                                      <button
                                        type="button"
                                        className="fr-door"
                                        aria-expanded={comparing === key}
                                        onClick={() => toggleCompare(key)}
                                      >
                                        <Shuffle size={22} weight="regular" aria-hidden="true" />
                                        Compare
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      data-sure
                                      className={'fr-door' + (sure ? ' ib-door--sure' : '')}
                                      onClick={() => dismissReturned(row)}
                                      title={sure ? 'Press again to take this out of your inbox' : 'Take this out of your inbox'}
                                    >
                                      <X size={22} weight="regular" aria-hidden="true" />
                                      {sure ? 'Dismiss?' : 'Dismiss'}
                                    </button>
                                  </div>
                                  {yours && theirs && (comparing === key || shutting === key) && (
                                    <Compared mine={yours} theirs={theirs} name={who} closing={shutting === key} theirStars />
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        }
                        const archived = sent.status === ARCHIVED;
                        const open = openRow === sent.id;
                        const host = tidyJournal(sent.sender_url);
                        const who = sent.submitter_name || 'someone';
                        const draft = draftFor(sent);
                        // Where the sender has it posted: the entry they
                        // sent it from, when the send carried one, or the
                        // one on their shelf for this record. Read leads
                        // there, and Visit stands in only when there is
                        // nothing of theirs to read (Miyel, 2026-09-29).
                        const posted = !host ? ''
                          : sent.sender_entry
                            || theirListen(host, albumKey(sent.album, sent.artist), sent.song || '')?.slug
                            || '';
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
                              <Kind of={sent.song ? 'song' : 'album'} />
                              {/* A song send (migrations/026) wears the folded
                                  corner a track note wears on the wall, and
                                  is named by the song, with the record it is
                                  off on the line under. Start a listen still
                                  starts the record. */}
                              <span className={'ib-rart' + (sent.song && sent.album_art ? ' ln-fold' : '')}>
                                {sent.album_art
                                  ? <img src={sent.album_art} alt="" loading="lazy" />
                                  : <span className="ib-nocover" aria-hidden="true">&#9834;</span>}
                                {sent.song && sent.album_art && (
                                  <span className="ln-fold-flap" aria-hidden="true"><img src={sent.album_art} alt="" /></span>
                                )}
                              </span>
                              <span className="ib-rsaid">
                                <span className="ib-rttl">{sent.song || sent.album}</span>
                                {/* Open, the state is the actions below, so
                                    the line goes back to being about the
                                    record. */}
                                <span className="ib-rsub">
                                  {sent.song ? `${sent.album} · ${sent.artist}` : sent.artist}
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
                              <div className="ib-open ib-open--doors">
                                {/* Who sent it and when, in the caption face.
                                    A send's title is the record, so this is
                                    the one place the sender is named; their
                                    journal is a door below. */}
                                <p className="ib-said-by">From {who} &middot; {shortDay(sent.created_at)}</p>

                                {/* The message is here and only here. It is
                                    what you read in order to decide, so it
                                    is out while you are deciding and folded
                                    away when you are not. */}
                                {sent.note && <p className="ib-msg">{sent.note}</p>}

                                {/* ── The doors, 2026-09-28 ─────────────────
                                    Miyel's words for them: Listen, Logged,
                                    Read, and the rare two only when there is
                                    something behind them. The first is
                                    chosen by the state the send is in — an
                                    archived row's is the way back, which is
                                    why archiving needs no undo of its own.
                                    The sender's are here whatever state the
                                    send is in. Six is the most a phone's row
                                    holds, so it is Read or Visit and never
                                    both: both lead to their journal. */}
                                <div className="ib-doors fr-doors-row">
                                  {archived ? (
                                    <button type="button" className="fr-door" onClick={() => updateStatus(sent.id, UNOPENED)}>
                                      <ArrowCounterClockwise size={22} weight="regular" aria-hidden="true" />
                                      Put back
                                    </button>
                                  ) : sent.status === 'logged' && sent.entry_slug ? (
                                    <Link className="fr-door" href={`/entries/${sent.entry_slug}`}>
                                      <VinylRecord size={22} weight="regular" aria-hidden="true" />
                                      Open
                                    </Link>
                                  ) : sent.status === 'reviewed' ? (
                                    <button type="button" className="fr-door" onClick={() => resumeListen(sent, draft)}>
                                      <Broadcast size={22} weight="regular" aria-hidden="true" />
                                      Resume
                                    </button>
                                  ) : (
                                    <button type="button" className="fr-door" onClick={() => startListen(sent)}>
                                      <Broadcast size={22} weight="regular" aria-hidden="true" />
                                      Listen
                                    </button>
                                  )}

                                  {/* What they wrote about it, on their
                                      journal. Their journal plus their slug
                                      is a URL, which is the only kind of
                                      reference that means the same thing in
                                      two databases (migrations/016) — and
                                      it is the one door on this row that is
                                      about what THEY thought of it, so it
                                      leads out. */}
                                  {posted && (
                                    <a
                                      className="fr-door"
                                      href={carrySender(`${journalUrl(host)}/entries/${posted}`, me, { known: filed.has(host) })}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      <Article size={22} weight="regular" aria-hidden="true" />
                                      Read
                                    </a>
                                  )}

                                  {/* The record was here before they sent it
                                      (DECISIONS, The network). Pressed again,
                                      the picker it opened shuts. */}
                                  {unopened(sent) && (
                                    <button type="button" className="fr-door" aria-expanded={naming === sent.id} onClick={() => openNaming(sent)}>
                                      <Check size={22} weight="regular" aria-hidden="true" />
                                      Logged
                                    </button>
                                  )}

                                  {host && !posted && (
                                    <a
                                      className="fr-door"
                                      href={carrySender(journalUrl(host), me, { known: filed.has(host) })}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      <BookOpen size={22} weight="regular" aria-hidden="true" />
                                      Visit
                                    </a>
                                  )}

                                  {host
                                    ? !filed.has(host) && (
                                      <button type="button" className="fr-door" onClick={() => file(sent.sender_url)}>
                                        <Plus size={22} weight="regular" aria-hidden="true" />
                                        Add
                                      </button>
                                    )
                                    : people.length > 0 && (
                                      <button type="button" className="fr-door" aria-expanded={whose === sent.id} onClick={() => { setWhose(w => (w === sent.id ? null : sent.id)); setNaming(null); }}>
                                        <LinkSimple size={22} weight="regular" aria-hidden="true" />
                                        Link
                                      </button>
                                    )}

                                  {/* Only where it is not the first door
                                      already: resuming a listen *is* opening
                                      its draft. */}
                                  {draft && sent.status !== 'reviewed' && (
                                    <button type="button" className="fr-door" onClick={() => resumeListen(sent, draft)}>
                                      <PencilSimple size={22} weight="regular" aria-hidden="true" />
                                      Draft
                                    </button>
                                  )}

                                  {!archived && (
                                    <button type="button" className="fr-door" onClick={() => updateStatus(sent.id, ARCHIVED)}>
                                      <Archive size={22} weight="regular" aria-hidden="true" />
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
                                            <span className={'ib-which-art' + (entry.song && entry.album_art ? ' ln-fold' : '')}>
                                              {entry.album_art && <img src={entry.album_art} alt="" loading="lazy" />}
                                              {entry.song && entry.album_art && (
                                                <span className="ln-fold-flap" aria-hidden="true"><img src={entry.album_art} alt="" /></span>
                                              )}
                                            </span>
                                            <span className="ib-which-said">
                                              {/* A note is named by its song, with the record under it. */}
                                              <span className="ib-which-album">{entry.song || entry.album}</span>
                                              <span className="ib-which-artist">
                                                {entry.song
                                                  ? `${entry.album} · ${entry.artist}`
                                                  : entry.listen_total > 1
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

            {/* ── REPORTS, 2026-09-22 ──────────────────────────────────
                A tab of their own until Replies arrived and four tabs would
                not fit a phone. Miyel: "most people won't have a reports
                tab. maybe my reports tab can go somewhere else" — so they
                are a line at the foot of the sends, the archived rows'
                shape, and only on the copy they are sent to. */}
            {takesReports && !repLoading && (() => {
              const kept = reports.filter(r => r.status !== 'dismissed');
              const fresh = kept.filter(r => r.status === 'pending').length;
              if (kept.length === 0) return null;
              return (
              <>
                <button className="ib-showarch" onClick={() => setShowReports(v => !v)}>
                  {showReports ? 'Hide' : 'Show'} {kept.length} problem {kept.length === 1 ? 'report' : 'reports'}{fresh > 0 ? ` · ${fresh} new` : ''}
                </button>
                {showReports && (
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
              );
            })()}

          </div>
        </div>
      </div>

      {/* Somebody just added from here — a send's sender, somebody who
          wrote, or somebody who waved — and the offer to wave at them. */}
      <WaveSheet person={wavingTo} onClose={() => setWavingTo(null)} />
    </div>
  );
}
