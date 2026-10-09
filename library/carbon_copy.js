// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// library/carbon_copy.js
// The journal as pages anybody can read, kept beside the copy that puts it
// back.
//
// ── Why there are two copies in one file ──────────────────────────────────
// journal.json is every table as the database holds it, and it is what puts
// a journal back (scripts/restore.mjs). It is also only legible to this
// software: a keeper who opened it would find their writing as escaped
// strings between ids and column names. Owning your writing means being able
// to read it with nothing installed, on the day this software is gone — so
// Make a copy hands over one zip with both inside (Miyel, 2026-10-08): a page
// per entry, plain text that opens in Notes or Files or anything, and the
// journal.json that puts it all back. One thing to keep.
//
// ── A page says what the entry page says ──────────────────────────────────
// The same readers FullPostPage and TrackNotePage draw from
// (library/entry_formatter.js), the same words — Posted, First listen · 1 of
// 2, Put on by, Edited — and the same rule for a credit, so a page passed on
// never says more than the journal does. Markdown, because it is plain text
// that also reads well in any notes app that understands it.
//
// ── Made in the browser ───────────────────────────────────────────────────
// From the export the Settings page has already fetched
// (components/main_components/JournalCopy.js), so the server does nothing new
// and /api/export stays the JSON alone. Dates come out in the keeper's own
// zone, which is the zone the entry page shows them in.
//
// ── The zip is written by hand ────────────────────────────────────────────
// Stored, not squeezed. A journal is a few hundred kilobytes, every unzipper
// ever made reads a stored file, and writing one is a header, the bytes and
// a checksum — a library to compress text a phone sends in a second would be
// a dependency for nothing.

import { splitNotes, entryTracks, parseRating, editStamp } from './entry_formatter';

// ── The whole copy ────────────────────────────────────────────────────────
// `text` is the export exactly as it arrived, and goes in as journal.json
// byte for byte: the copy that puts a journal back is the one the server
// wrote, not one rewritten here. `journal` is that text read. Returns the
// zip's bytes.
export function carbon_copy(text, journal, made = new Date()) {
  const entries = [...(journal?.tables?.entries || [])].sort(by_posted);
  const listens = numbered(entries);
  const taken = new Set();
  const files = [
    { name: 'journal.json', text },
    { name: 'Read me.txt', text: read_me(journal, entries.length, made) },
  ];
  for (const entry of entries) {
    const listen = listens.get(entry);
    files.push({ name: `entries/${file_name(entry, listen, taken)}`, text: entry_page(entry, listen) });
  }
  return zip(files, made);
}

// What the folder says about itself, for whoever opens it without knowing
// what it is — which may be the keeper, years from now.
function read_me(journal, count, made) {
  const keeper = String(journal?.tables?.settings?.[0]?.keeper_name || '').trim();
  const whose = keeper ? `${keeper}’s journal` : 'Your journal';
  const many = count === 1 ? 'your one entry' : `each of your ${count} entries`;
  return [
    `${whose}, copied ${day(made)}.`,
    `The entries folder holds a page for ${many}, written out as plain text. Each one opens in Notes, TextEdit, Files or anything else that reads text, and needs nothing else to make sense.`,
    'journal.json is the whole journal the way its database holds it: the entries and the drafts, the card, the address book and the inbox. It is what puts the journal back into a copy of Listening Notes. Your password, and the key that signs you in, are never in it.',
  ].join('\n\n') + '\n';
}

// ── One page ──────────────────────────────────────────────────────────────
// `listen` is where this entry sits among the record's listens, from
// numbered() below; a track note has none.
export function entry_page(entry, listen) {
  return entry.song ? song_page(entry) : album_page(entry, listen);
}

function album_page(entry, listen) {
  const tracks = entryTracks(entry);
  const { albumNotes } = splitNotes(entry.notes);
  // The entry page's own test, word for word: flawless, or marked by hand
  // before the mark was derived.
  const masterpiece = (tracks.length > 0 && tracks.every(t => t.stars === 5)) || entry.rating === 'Masterpiece';
  const rating = parseRating(entry.rating) || (masterpiece ? 5 : 0);
  // Listen 1 says so in words, later ones carry the count, and a record
  // played once says nothing — the print chip's rule in FullPostPage.
  const which = listen?.total > 1
    ? (listen.number === 1 ? `First listen · 1 of ${listen.total}` : `Listen ${listen.number} of ${listen.total}`)
    : null;
  const credit = credit_line(entry);
  const posted = instant(entry.posted_at || entry.created_at);

  const byline = [entry.artist, entry.year, entry.genre].map(tidy).filter(Boolean).join(' · ');
  const facts = [
    [posted && `Posted ${day(posted)}`, which, sent_word(entry, credit)].filter(Boolean).join(' · '),
    [stars(rating), masterpiece && 'Masterpiece', truthy(entry.favorite) && 'Favorite', truthy(entry.formative) && 'Formative'].filter(Boolean).join(' · '),
    credit,
  ];
  const edited = albumNotes && editStamp(instant(entry.edited_at));
  return blocks([
    title(entry.album, byline),
    lines(facts),
    kept(albumNotes),
    edited && `Edited ${edited}`,
    tracks.length && '## Tracks',
    tracks.length && tracks.map(track_lines).join('\n\n'),
  ]);
}

// A note about one song: the song over the record it is off, as
// TrackNotePage draws it, and the note itself whole — never split the way an
// album's notes are, since a numbered line in it is the writing and not a
// tracklist.
function song_page(entry) {
  const credit = credit_line(entry);
  const posted = instant(entry.posted_at || entry.created_at);
  const note = String(entry.notes || '').trim();
  const edited = note && editStamp(instant(entry.edited_at));
  return blocks([
    title(entry.song, [entry.album, entry.artist].map(tidy).filter(Boolean).join(' · ')),
    lines([
      [posted && `Posted ${day(posted)}`, sent_word(entry, credit)].filter(Boolean).join(' · '),
      [stars(parseRating(entry.rating)), truthy(entry.favorite) && 'Favorite', truthy(entry.formative) && 'Formative'].filter(Boolean).join(' · '),
      credit,
    ]),
    kept(note),
    edited && `Edited ${edited}`,
  ]);
}

// One track: its number and name, its stars and heart, and its note under
// it, indented so a Markdown reader keeps the note inside the list. The
// indent is the number's own width — "10. " needs four spaces where "1. "
// needs three, or the note falls out of its track.
function track_lines(track, i) {
  const number = track.num ?? i + 1;
  const said = [stars(Number(track.stars)), track.favorite && '♥'].filter(Boolean).join(' ');
  const indent = ' '.repeat(String(number).length + 2);
  const note = String(track.note || '').trim();
  const edited = note && editStamp(instant(track.edited));
  const named = `${number}. ${track.name || 'Untitled'}${said ? ` — ${said}` : ''}`;
  if (!note) return named;
  const under = kept(note).split('\n').map(line => (line.trim() ? indent + line : '')).join('\n');
  return lines([named, under]) + (edited ? `\n\n${indent}Edited ${edited}` : '');
}

// ── Who put the keeper onto it ────────────────────────────────────────────
// On the entry page's terms (withoutChain in library/database_actions.js):
// only on a Submission, and never where the sender or the keeper asked for
// the credit to stay quiet. The export holds the name either way; the page
// says it only where the journal would.
function credit_line(entry) {
  if (entry.entry_type !== 'Submission' || entry.credit_private === true) return null;
  const name = tidy(entry.received_from);
  return name ? `Put on by ${name}` : null;
}

// The word the entry page prints for a sent record whose sender it cannot
// name. A credit added by hand was never sent (credit_by_hand), so it gets
// neither.
function sent_word(entry, credit) {
  return entry.entry_type === 'Submission' && entry.credit_by_hand !== true && !credit ? 'Submission' : null;
}

// ── Which listen each one was ─────────────────────────────────────────────
// Counted the way the journal counts them (WITH_LISTEN_NUMBERS in
// library/database_actions.js): album listens among album listens of the
// same record, oldest first, and a track note never numbered at all.
function numbered(entries) {
  const runs = new Map();
  for (const entry of entries) {
    if (entry.song) continue;
    const key = entry.album_key || `${entry.album}\u0000${entry.artist}`;
    if (!runs.has(key)) runs.set(key, []);
    runs.get(key).push(entry);
  }
  const listens = new Map();
  for (const run of runs.values()) {
    run.forEach((entry, i) => listens.set(entry, { number: i + 1, total: run.length }));
  }
  return listens;
}

function by_posted(a, b) {
  const at = e => instant(e.posted_at || e.created_at)?.getTime() ?? 0;
  return at(a) - at(b) || (a.id ?? 0) - (b.id ?? 0);
}

// ── What each page is called ──────────────────────────────────────────────
// The day it was posted first, so any folder lists the journal in the order
// it was written; then the record, or the song a note is about; then which
// listen, past the first. A character a disk refuses becomes a dash, and two
// pages that would share a name — two notes on one song in one day — are
// told apart by a number, compared without case because a Mac's disk does
// not see case either.
const REFUSED = /[/\\:*?"<>|\u0000-\u001f\u007f]/g;

function file_name(entry, listen, taken) {
  const posted = instant(entry.posted_at || entry.created_at);
  const title = Array.from(tidy(entry.song || entry.album).replace(REFUSED, '-'))
    .slice(0, 100).join('').replace(/^[\s.]+|[\s.]+$/g, '') || 'Untitled';
  const base = `${posted ? stamp(posted) : 'Undated'} ${title}${listen?.number > 1 ? `, listen ${listen.number}` : ''}`;
  let name = `${base}.md`;
  for (let n = 2; taken.has(name.toLowerCase()); n++) name = `${base} (${n}).md`;
  taken.add(name.toLowerCase());
  return name;
}

// ── Small pieces ──────────────────────────────────────────────────────────
// Stars as the track list's prose has always written them
// (serializeTracks): whole ones, then a half.
function stars(n) {
  if (!(n > 0)) return '';
  return '★'.repeat(Math.floor(n)) + (n % 1 >= 0.5 ? '½' : '');
}

// A time stored without a zone is UTC — edited_at is read AT TIME ZONE 'UTC'
// everywhere it is shown (DECISIONS, Migrations) — and the export writes it
// down bare, the way Postgres holds it. Handed to Date bare it would be read
// as local time, hours off, so the zone goes back on first.
function instant(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const text = String(value);
  const date = new Date(/(?:[zZ]|[+-]\d\d:?\d\d)$/.test(text) ? text : `${text}Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function day(date) {
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function stamp(date) {
  const p = n => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

function tidy(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

const truthy = v => v === true || v === 'true';

// The page's title, and the line under it. A heading ends at its own line
// break, so the two need nothing between them.
function title(name, under) {
  return [`# ${tidy(name) || 'Untitled'}`, under].filter(Boolean).join('\n');
}

// Lines that belong together, each on its own line in a Markdown reader as
// well as in plain text: two spaces at the end of a line are how Markdown
// is told to break there rather than run the lines into one.
function lines(list) {
  return list.filter(Boolean).join('  \n');
}

// Writing keeps its own line breaks the same way. A Markdown reader runs a
// single break into a space, so a note written as lines would arrive as one;
// a blank line between paragraphs already means a paragraph and is left be.
function kept(text) {
  return String(text || '').trim()
    .split('\n').map(line => line.replace(/\s+$/, '')).join('\n')
    .replace(/([^\n])\n(?=[^\n])/g, '$1  \n');
}

function blocks(list) {
  return list.filter(Boolean).join('\n\n') + '\n';
}

// ── Writing the zip ───────────────────────────────────────────────────────
// The format's own order: each file's header and its bytes, then the
// directory listing them all, then the record saying where that directory
// starts. Names are UTF-8 and say so (bit 11), or an accented title arrives
// garbled. Made on "MS-DOS", which every unzipper reads as "give these the
// usual permissions"; claiming a Unix host with no mode written would hand
// back files nobody can open.
export function zip(files, made = new Date()) {
  const encoder = new TextEncoder();
  const time = (made.getHours() << 11) | (made.getMinutes() << 5) | (made.getSeconds() >> 1);
  const date = ((made.getFullYear() - 1980) << 9) | ((made.getMonth() + 1) << 5) | made.getDate();
  const body = [];
  const directory = [];
  let offset = 0;

  for (const file of files) {
    const name = encoder.encode(file.name);
    const data = typeof file.text === 'string' ? encoder.encode(file.text) : file.text;
    const crc = crc32(data);

    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);  // a file starts here
    local.setUint16(4, 20, true);          // needs version 2.0 to read
    local.setUint16(6, 0x0800, true);      // the name is UTF-8
    local.setUint16(8, 0, true);           // stored
    local.setUint16(10, time, true);
    local.setUint16(12, date, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, data.length, true);
    local.setUint32(22, data.length, true);
    local.setUint16(26, name.length, true);
    body.push(new Uint8Array(local.buffer), name, data);

    const listed = new DataView(new ArrayBuffer(46));
    listed.setUint32(0, 0x02014b50, true); // a directory line
    listed.setUint16(4, 20, true);         // made by MS-DOS, version 2.0
    listed.setUint16(6, 20, true);
    listed.setUint16(8, 0x0800, true);
    listed.setUint16(12, time, true);
    listed.setUint16(14, date, true);
    listed.setUint32(16, crc, true);
    listed.setUint32(20, data.length, true);
    listed.setUint32(24, data.length, true);
    listed.setUint16(28, name.length, true);
    listed.setUint32(42, offset, true);    // where its file starts
    directory.push(new Uint8Array(listed.buffer), name);

    offset += 30 + name.length + data.length;
  }

  // The plain format counts files in 16 bits and bytes in 32. A journal is
  // nowhere near either, and a copy that quietly wrapped round would be worse
  // than one that says it could not be made.
  if (files.length > 0xffff || offset > 0xffffffff) throw new Error('This journal is too large to copy into one zip.');

  const size = directory.reduce((n, part) => n + part.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);      // the directory ends here
  end.setUint16(8, files.length, true);
  end.setUint16(10, files.length, true);
  end.setUint32(12, size, true);
  end.setUint32(16, offset, true);
  return join([...body, ...directory, new Uint8Array(end.buffer)]);
}

let table = null;

// The checksum every zip carries for each file, so an unzipper can tell a
// whole copy from a damaged one.
function crc32(bytes) {
  if (!table) {
    table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) crc = table[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function join(parts) {
  const out = new Uint8Array(parts.reduce((n, part) => n + part.length, 0));
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
}
