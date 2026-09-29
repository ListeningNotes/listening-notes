// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// app/entries/[slug]/TrackNotePage.js
// A track note: a journal entry about one song rather than a record.
//
// ── What it is, 2026-09-24 ────────────────────────────────────────────────
// Sometimes the song is the event — a single, something a friend sent, one
// track played all week — and a beta tester wrote a long piece about one song
// and had nowhere to put it (Miyel's track-notes brief). So a song gets an
// entry of its own: its own date, address, stars and note, and the record it
// belongs to (`album` and `artist`; the song is `song`, migration 025). It is not a shorter album entry and never a part of one, and it never
// grows what belongs to a sitting with a whole record — a tracklist, a
// horizon, an album rating, a Masterpiece. If a track note could do
// everything an album entry does, there would be one confusing object instead
// of two clear ones.
//
// ── One card ──────────────────────────────────────────────────────────────
// About a third the height of an album entry: the cover with its folded
// corner, and beside it the song, `album · artist`, the stars and the date,
// the pair on the middle of the page. No heart, from 2026-09-26 (Miyel): a
// song you wrote a note about is already the one you cared about. The
// `favorite` column is still saved, false, and read by nothing here — the
// way back is a button, not a migration. Under it, for the keeper
// only, Listen to the full album, which starts an ordinary listen of the
// album — plain words, underlined like the link it is, with a play mark;
// never a pill (Miyel does not like them). Then the note, read left to right
// as an album's notes are, with the way to write to the keeper under it
// (MessageForm.js). Send is not on the card —
// it is behind the ···, with Edit, Credit and Delete. There is no Share: the
// printer knows how to print a record and not a song.
//
// The date and the listen were at the foot until 2026-09-25, and Miyel moved
// them up: a long note buried the way into the album, and in a folder the
// date sat twice on the screen. It is said once now, at the top, where an
// album entry says its own. And the head stands on the middle of the page,
// the same day (Miyel): set against its left edge, with the right half of it
// empty, it read as pushed aside. The note under it stays left to right —
// the card is centred, the writing is not, as on an album entry.
//
// ── Three ways it is drawn ────────────────────────────────────────────────
// Read, at its own address or as a layer over the journal — page.js and the
// @layer route hand a row with a song here instead of to FullPostPage.
// Corrected, from the ···: the same card, with the stars, the heart and the
// note turned into their own controls in place, the rule every editor on this
// site keeps. And written for the first time, from the picker's Songs
// section, on the listen's sheet (app/session/page.js): the same card again,
// before it exists, with Save on the editing bar. What is written there is
// kept in the browser, per song, as it is typed — a sheet pulled down never
// eats a note (TRACK_NOTE_WRITING).

'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { Play, VinylRecord } from '@phosphor-icons/react';
import { parseRating, editStamp, lookup_key } from '../../../library/entry_formatter';
import { tidyAddress } from '../../../library/return_address';
import SiteNav from '../../../components/main_components/SiteNav';
import { useLayerHeaderSlot, useFolder } from '../../../components/main_components/LayerEntry';
import FolderFooter from '../../../components/main_components/FolderFooter';
import KeeperTools from '../../../components/main_components/KeeperTools';
import EditingBar from '../../../components/main_components/EditingBar';
import CodeSlot from '../../../components/main_components/CodeSlot';
import { MessageWayIn } from '../../../components/main_components/Slug_Page/MessageForm';
import SentBy, { creditOn, useTrail } from '../../../components/main_components/Slug_Page/SentBy';
import SenderTool from '../../../components/main_components/Slug_Page/SenderTool';
import SendSheet from '../../../components/main_components/SendSheet';
import StarRating from '../../../components/main_components/StarRating';
import StarPicker from '../../../components/session_components/StarRating';
import { useBookplate } from '../../../components/main_components/Bookplate';
import { useTheme } from '../../../components/main_components/Lightswitch';
import { useEntryEditor } from '../../../hooks/useEntryEditor';
import { PENDING_KEY, TRACK_NOTE_KEY, TRACK_NOTE_WRITING, saidSoAboutTheDesk } from '../../../hooks/useListeningSession';

const COVER_LABELS = { toCode: 'Show the code for this entry', toPicture: 'Show the cover' };
const NOTHING_WRITTEN = { rating: 0, favorite: false, note: '' };

// `entry` is the row, or — while `writing` — the song as the picker handed
// it over, shaped like one: song, album, artist, year, genre, album_art.
// `onSaved` hears the new row once a first write lands, and `onLeave` is the
// way off the sheet without saving; both are the session page's, which owns
// what happens to the sheet either way.
// `folder` is the record's entries, oldest first, when it has more than one:
// the note is then a page of a folder, with its tabs at the foot of the
// screen (FolderFooter, useFolder).
export default function TrackNotePage({ entry, authed = false, layered = false, writing = false, onSaved = null, onLeave = null, folder = null }) {
  const router = useRouter();
  const turnTo = useFolder(writing ? null : folder, entry.slug);
  const edit = useEntryEditor(entry, { layered });
  const correcting = edit.editing;
  const headerSlot = useLayerHeaderSlot();
  const { site_address, keeper_name } = useBookplate();
  const { theme } = useTheme();

  // ── A new one: what has been written, kept per song ─────────────────────
  // Read once, as the sheet opens — the session page is what decides a song
  // is being written, and it has already read the tab's copy of which one.
  // Keyed as the song's draft is keyed (lookup_key), 2026-09-26, so the
  // picker can throw the two away together.
  //
  // This browser's copy first: it is written on every keystroke, so on the
  // device the note was started on it is never behind. Then the draft the
  // picker handed over (`entry.written`), for a note started somewhere else.
  const songKey = lookup_key(entry.album, entry.artist || '', entry.song);
  const [written, setWritten] = useState(() => {
    if (!writing || typeof window === 'undefined') return NOTHING_WRITTEN;
    try {
      const kept = JSON.parse(localStorage.getItem(TRACK_NOTE_WRITING) || '{}')[songKey];
      if (kept) return { ...NOTHING_WRITTEN, ...kept };
    } catch { /* no browser copy; the draft, if there is one */ }
    return entry.written
      ? { ...NOTHING_WRITTEN, rating: Number(entry.written.rating) || 0, note: entry.written.note || '' }
      : NOTHING_WRITTEN;
  });
  // Every change goes into the browser as it happens, and a note taken back
  // to nothing takes its place with it, so nothing is kept that is not there.
  useEffect(() => {
    if (!writing) return;
    try {
      const all = JSON.parse(localStorage.getItem(TRACK_NOTE_WRITING) || '{}');
      if (written.note.trim() || written.rating > 0) all[songKey] = written;
      else delete all[songKey];
      localStorage.setItem(TRACK_NOTE_WRITING, JSON.stringify(all));
    } catch { /* a private window keeps it for as long as the sheet is up */ }
  }, [writing, songKey, written]);
  // ── And on the server, as a draft, 2026-09-26 ───────────────────────────
  // So a note walked away from waits in the picker's drafts beside the album
  // listens, on any device (Miyel). A beat after the typing stops, and once
  // more on the way out if the last change had not gone yet. A note taken
  // back to nothing is taken off the list by the same call (save_draft).
  // Nothing is sent for the sheet merely opening: only a change is a draft.
  // `inflight` is what Save waits on, so a draft cannot land after the note
  // it was a draft of and put itself back on the list.
  const draftBody = JSON.stringify({
    song: entry.song, album: entry.album, artist: entry.artist || '',
    year: entry.year || '', genre: entry.genre || '', album_art: entry.album_art || '',
    collection_id: entry.collection_id || '', rating: written.rating, notes: written.note,
  });
  const openedWith = useRef(draftBody);
  const unsent = useRef(null);
  const inflight = useRef(null);
  const finished = useRef(false);
  useEffect(() => {
    if (!writing || draftBody === openedWith.current) return undefined;
    unsent.current = draftBody;
    const id = setTimeout(() => {
      if (finished.current || unsent.current !== draftBody) return;
      unsent.current = null;
      inflight.current = fetch('/api/drafts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: draftBody }).catch(() => {});
    }, 700);
    return () => clearTimeout(id);
  }, [writing, draftBody]);
  // ── The beacon, while a note is being written, 2026-09-26 ───────────────
  // Miyel: a track should "show up on and stay on the beacon the same way
  // that album track listens do." So a note being written puts the needle
  // down the way a listen does (hooks/useListeningSession.js, the write
  // effect there): the record, and the song as the track, two seconds after
  // the sheet opens — the same two that stand between a mis-tap and a
  // broadcast — and again as the words change, which is what keeps it from
  // expiring under somebody who is still writing. The beacon says NOW
  // LOGGING with the song over the cover; when the sheet goes, the needle
  // ends and stands as the last listen, song and all, until the saved entry
  // takes over — which carries its song too (library/needle.js).
  //
  // `lit` is the same guard the listen keeps: React's development mode
  // mounts, tears down and remounts, and without it the rehearsal put the
  // beacon out before the write had landed.
  const lit = useRef(false);
  useEffect(() => {
    if (!writing) return undefined;
    const t = setTimeout(() => {
      fetch('/api/needle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          album: entry.album,
          artist: entry.artist || '',
          album_art: entry.album_art || '',
          track: entry.song || '',
        }),
      }).then(() => { lit.current = true; }).catch(() => { /* the beacon is not worth an alert */ });
    }, 2000);
    return () => clearTimeout(t);
  }, [writing, entry.album, entry.artist, entry.album_art, entry.song, draftBody]);
  // Leaving ends it — saved or pulled down, the sheet unmounts either way.
  useEffect(() => () => {
    if (lit.current) fetch('/api/needle', { method: 'DELETE' }).catch(() => {});
  }, []);

  // On the way out: the last change, if it had not gone yet, and then the
  // picker underneath is told, once the draft is on the server, to ask for its
  // list again. It stays mounted under this sheet and had no other way to
  // know — Miyel, 2026-09-26: the draft was saved and "didn't appear in draft
  // list." The same word a listen says when it is put down.
  useEffect(() => () => {
    if (finished.current) return;
    const last = unsent.current
      ? fetch('/api/drafts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: unsent.current, keepalive: true }).catch(() => {})
      : inflight.current;
    if (last) Promise.resolve(last).then(() => saidSoAboutTheDesk());
  }, []);

  const [saving, setSaving] = useState(false);
  const [trouble, setTrouble] = useState(null);
  // Anything at all: stars or a word. A note with neither is an entry that
  // says nothing, and the one thing Save waits for.
  const saysSomething = Boolean(written.note.trim() || written.rating > 0);

  // ── Who put you onto it, and sending the record ─────────────────────────
  // The album entry's own two tools, unchanged: Credit unfolds where its
  // answer prints, under the head of the card, and Send rises with the
  // record already in it. A song somebody sent is half the reason these exist.
  const credit = creditOn(entry);
  const trail = useTrail(writing ? null : entry);
  const [trailOpen, setTrailOpen] = useState(false);
  const [crediting, setCrediting] = useState(false);
  const [sending, setSending] = useState(false);
  const [barSlot, setBarSlot] = useState(null);

  // ── The cover as the code ───────────────────────────────────────────────
  // Every entry's art turns into the code for its address, for anyone, and
  // the address goes on the clipboard (DECISIONS, 2026-09-12) — it is the one
  // path to a link, and a track note needs one as much as a record does. The
  // fold comes off while the code shows: it would sit over a finder pattern.
  const host = tidyAddress(site_address);
  const entryUrl = host && entry.slug ? `https://${host}/entries/${entry.slug}` : '';
  const [coverCode, setCoverCode] = useState(false);
  const canTurnCover = Boolean(!writing && entryUrl && entry.album_art);

  // On the layer the nav row lives in the layer's own header slot, and the
  // band behind it is styled off the entry's class.
  useEffect(() => {
    if (headerSlot) headerSlot.setAttribute('class', 'lay-header ln-entry');
  }, [headerSlot]);

  const rating = writing ? written.rating : parseRating(correcting ? edit.draft.rating : entry.rating);
  const note = writing ? written.note : correcting ? edit.draft.notes : (entry.notes || '');
  const postedOn = entry.posted_at
    ? new Date(entry.posted_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';
  const editedOn = editStamp(entry.edited_at);

  // Edit, Credit, Send and Delete — Miyel, 2026-09-24. Relisten is the card's
  // own Listen to the full album, and there is no Share (above).
  const keeperTools = authed && !writing && !correcting && (
    <KeeperTools
      printable={false}
      onEdit={edit.begin}
      slug={entry.slug}
      onSender={() => setCrediting(true)}
      onSend={() => setSending(true)}
      onDelete={edit.remove}
    />
  );

  // The nav row, and a folder's tabs at the foot of the screen: both chrome,
  // so on the layer both go in its header slot, outside what turns with a
  // swipe. The tabs make way while a correction, the credit or the send
  // sheet has the foot of the screen.
  const chrome = (
    <>
      <SiteNav tools={keeperTools} />
      {!writing && folder?.length > 1 && (
        <FolderFooter folder={folder} slug={entry.slug} onPick={turnTo} away={correcting || crediting || sending} />
      )}
    </>
  );

  return (
    <div className={'ln-entry tn' + (writing ? ' tn--writing' : '')}>
      {headerSlot ? createPortal(chrome, headerSlot) : chrome}

      {/* The scroller the layer asks about before a pull closes it, the same
          class the entry page scrolls in. Written for the first time, the
          listen's sheet scrolls itself and this is plain. */}
      <div className={(writing ? 'tn-screens' : 'ln-screens tn-screens') + (correcting ? ' ln-editing' : '') + (crediting || sending ? ' ln-busy' : '')}>
        <article className="tn-card">
          <div className={'tn-head' + (coverCode ? ' tn-head--code' : '')}>
            {canTurnCover ? (
              <CodeSlot
                key={entry.slug}
                className={'tn-cover' + (coverCode ? ' tn-cover--code' : ' ln-fold')}
                picture={<img src={entry.album_art} alt={entry.album} decoding="sync" />}
                address={entryUrl}
                codeSrc={`/api/entries/${encodeURIComponent(entry.slug)}/code?theme=${theme === 'dark' ? 'dark' : 'light'}`}
                turned={coverCode}
                onTurn={setCoverCode}
                backGlyph={<VinylRecord size={12} weight="bold" />}
                labels={COVER_LABELS}
              >
                {/* The page's folded corner, in the album's colour — off
                    while the code shows, where it would cover a finder. */}
                {!coverCode && (
                  <span className="ln-fold-flap" aria-hidden="true"><img src={entry.album_art} alt="" /></span>
                )}
              </CodeSlot>
            ) : (
              <span className="tn-cover ln-fold">
                {entry.album_art ? <img src={entry.album_art} alt={entry.album} /> : null}
                <span className="ln-fold-flap" aria-hidden="true">
                  {entry.album_art && <img src={entry.album_art} alt="" />}
                </span>
              </span>
            )}
            <div className="tn-said">
              <h1 className="tn-song">{entry.song}</h1>
              <p className="tn-record">{[entry.album, entry.artist].filter(Boolean).join(' · ')}</p>
              <div className="tn-marks">
                {writing || correcting ? (
                  <StarPicker
                    value={rating}
                    onChange={v => (writing ? setWritten(w => ({ ...w, rating: v })) : edit.set('rating', String(v)))}
                    size={22}
                  />
                ) : (
                  rating > 0 && <StarRating rating={rating} size={17} />
                )}
              </div>
              {!writing && postedOn && <p className="tn-posted">Posted {postedOn}</p>}
            </div>
          </div>

          {/* Who put you onto it — the line, or the tool while it is open, in
              the one place its answer prints. */}
          {!writing && (crediting && authed
            ? <SenderTool key={`sender-${entry.slug}`} entry={entry} barSlot={barSlot} onDone={() => setCrediting(false)} />
            : credit && !correcting && (
              <SentBy
                key={`sent-${entry.slug}`}
                entry={entry}
                keeper={(keeper_name || '').trim()}
                mine={authed}
                trail={trail}
                open={trailOpen}
                onOpen={setTrailOpen}
              />
            ))}

          {/* An ordinary listen of the album, through the key every other
              way into a listen uses — the song on the desk is put away
              first, or the sheet would open on it. Up here rather than at
              the foot, where a long note buried it. */}
          {authed && !writing && !correcting && !crediting && (
            <button
              type="button"
              className="tn-whole"
              onClick={() => {
                try {
                  localStorage.setItem(PENDING_KEY, JSON.stringify({
                    album: entry.album,
                    artist: entry.artist || '',
                    year: entry.year || '',
                    artUrl: entry.album_art_source || entry.album_art || '',
                    collectionId: null,
                    genre: entry.genre || '',
                  }));
                  sessionStorage.removeItem(TRACK_NOTE_KEY);
                } catch { /* a private window still gets the picker, one tap further on */ }
                saidSoAboutTheDesk();
                router.push('/session');
              }}
            >
              <Play size={12} weight="fill" aria-hidden="true" />
              <span>Listen to the full album</span>
            </button>
          )}

          <div className="tn-body">
            {writing || correcting ? (
              <textarea
                className="ln-write tn-write"
                value={note}
                onChange={e => (writing ? setWritten(w => ({ ...w, note: e.target.value })) : edit.set('notes', e.target.value))}
                onInput={e => { e.currentTarget.style.height = 'auto'; e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`; }}
                ref={el => { if (el) { el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px`; } }}
                placeholder="Notes for this track…"
                aria-label={`Note on ${entry.song}`}
              />
            ) : (
              <>
                {note.trim() && <p className="tn-note">{note}</p>}
                {editedOn && <p className="ln-edited">Edited {editedOn}</p>}
                {/* The one way in, in words, under the note: what is written
                    goes to the keeper and is never drawn here (the messages
                    brief). Left out for the keeper on their own journal. */}
                {!authed && <MessageWayIn slug={entry.slug} keeper={(keeper_name || '').trim()} />}
              </>
            )}
          </div>
        </article>
      </div>

      {writing && (
        <EditingBar
          word="Writing"
          saving={saving}
          held={!saysSomething}
          onCancel={() => onLeave?.()}
          onSave={async () => {
            setSaving(true);
            setTrouble(null);
            // No more drafts of this one: the note is being saved, and the
            // save takes its draft off the list (save_new_entry).
            finished.current = true;
            unsent.current = null;
            await inflight.current;
            try {
              const res = await fetch('/api/entries', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  song: entry.song,
                  album: entry.album,
                  artist: entry.artist || '',
                  year: entry.year || '',
                  genre: entry.genre || '',
                  album_art: entry.album_art || '',
                  entry_type: 'Personal Library',
                  rating: written.rating ? `${written.rating} stars` : '',
                  // Always false: there is no heart to set, and a note
                  // half-written before it went must not bring one in.
                  favorite: false,
                  notes: written.note.trim(),
                }),
              });
              const data = await res.json();
              if (!res.ok || data.error || !data.entry) throw new Error(data.error || 'That didn’t save. Try again.');
              // Saved: the words have somewhere to live now, and the copy
              // kept against losing them goes.
              try {
                const all = JSON.parse(localStorage.getItem(TRACK_NOTE_WRITING) || '{}');
                delete all[songKey];
                localStorage.setItem(TRACK_NOTE_WRITING, JSON.stringify(all));
              } catch { /* nothing kept */ }
              onSaved?.(data.entry);
            } catch (err) {
              setTrouble(err.message);
              setSaving(false);
              // Not saved, so still a draft: keep filing it.
              finished.current = false;
            }
          }}
        />
      )}
      {correcting && <EditingBar onSave={edit.save} onCancel={edit.cancel} saving={edit.saving} />}
      {(trouble || edit.trouble) && <p className="ln-trouble">{trouble || edit.trouble}</p>}
      <div ref={setBarSlot} />

      {!writing && (
        <SendSheet
          open={sending}
          onClose={() => setSending(false)}
          record={{
            album: entry.album,
            artist: entry.artist,
            year: entry.year || '',
            album_art: entry.album_art || '',
            collection_id: entry.collection_id || '',
            slug: entry.slug,
            // The song, so the sheet draws it dog-eared and the send says
            // which track (migrations/026_track_sends.sql).
            song: entry.song || '',
          }}
        />
      )}
    </div>
  );
}
