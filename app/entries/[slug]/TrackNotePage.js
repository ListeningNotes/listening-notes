// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// app/entries/[slug]/TrackNotePage.js
// A track note: a journal entry about one song rather than a record.
//
// ── What it is, 2026-09-24 ────────────────────────────────────────────────
// Sometimes the song is the event — a single, something a friend sent, one
// track played all week — and a beta tester wrote a long piece about one song
// and had nowhere to put it (Miyel's track-notes brief). So a song gets an
// entry of its own: its own date, address, stars, heart and note, and the
// record it belongs to (`album` and `artist`; the song is `song`, migration
// 025). It is not a shorter album entry and never a part of one, and it never
// grows what belongs to a sitting with a whole record — a tracklist, a
// horizon, an album rating, a Masterpiece. If a track note could do
// everything an album entry does, there would be one confusing object instead
// of two clear ones.
//
// ── One card ──────────────────────────────────────────────────────────────
// About a third the height of an album entry: the cover with its folded
// corner, and beside it the song, `album · artist`, the stars and the heart,
// all one block at the head. The note under it, with the comment glyph at its
// end. At the foot, for the keeper only, Listen to the whole record, which
// starts an ordinary listen of the album; the posted date under that. Send is
// not on the card — it is behind the ···, with Edit, Credit and Delete. There
// is no Share: the printer knows how to print a record and not a song.
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
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { Heart, VinylRecord } from '@phosphor-icons/react';
import { parseRating, editStamp } from '../../../library/entry_formatter';
import { kept_receipts } from '../../../library/receipts';
import { tidyAddress } from '../../../library/return_address';
import SiteNav from '../../../components/main_components/SiteNav';
import { useLayerHeaderSlot, useFolder } from '../../../components/main_components/LayerEntry';
import FolderDots from '../../../components/main_components/FolderDots';
import KeeperTools from '../../../components/main_components/KeeperTools';
import EditingBar from '../../../components/main_components/EditingBar';
import CodeSlot from '../../../components/main_components/CodeSlot';
import CommentBubble from '../../../components/main_components/Slug_Page/CommentBubble';
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
// the note is then a page of a folder (FolderDots, useFolder).
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
  const songKey = [entry.album, entry.artist, entry.song].map(v => String(v || '').trim().toLowerCase()).join('|');
  const [written, setWritten] = useState(() => {
    if (!writing || typeof window === 'undefined') return NOTHING_WRITTEN;
    try {
      const kept = JSON.parse(localStorage.getItem(TRACK_NOTE_WRITING) || '{}')[songKey];
      return kept ? { ...NOTHING_WRITTEN, ...kept } : NOTHING_WRITTEN;
    } catch { return NOTHING_WRITTEN; }
  });
  // Every change goes into the browser as it happens, and a note taken back
  // to nothing takes its place with it, so nothing is kept that is not there.
  useEffect(() => {
    if (!writing) return;
    try {
      const all = JSON.parse(localStorage.getItem(TRACK_NOTE_WRITING) || '{}');
      if (written.note.trim() || written.rating > 0 || written.favorite) all[songKey] = written;
      else delete all[songKey];
      localStorage.setItem(TRACK_NOTE_WRITING, JSON.stringify(all));
    } catch { /* a private window keeps it for as long as the sheet is up */ }
  }, [writing, songKey, written]);
  const [saving, setSaving] = useState(false);
  const [trouble, setTrouble] = useState(null);
  // Anything at all: stars, the heart or a word. A note with none of them is
  // an entry that says nothing, and the one thing Save waits for.
  const saysSomething = Boolean(written.note.trim() || written.rating > 0 || written.favorite);

  // ── The comments ────────────────────────────────────────────────────────
  // The same read the entry page makes: approved comments, and any still
  // held that this browser can prove it wrote. A track note's are all on the
  // note itself, which is the -1 bucket an album note's are in.
  const [comments, setComments] = useState({});
  const [askedFor, setAskedFor] = useState(0);
  useEffect(() => {
    if (writing || !entry.slug) return undefined;
    let cancelled = false;
    fetch('/api/comments/receipts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: entry.slug, receipts: kept_receipts() }),
    })
      .then(res => res.json())
      .then(data => { if (!cancelled) setComments(data.comments || {}); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [writing, entry.slug, askedFor]);

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
  const favorite = writing ? written.favorite
    : correcting ? !!edit.draft.favorite
    : entry.favorite === true || entry.favorite === 'true';
  const note = writing ? written.note : correcting ? edit.draft.notes : (entry.notes || '');
  const noteComments = comments['-1'] || [];
  const postedOn = entry.posted_at
    ? new Date(entry.posted_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';
  const editedOn = editStamp(entry.edited_at);

  // Edit, Credit, Send and Delete — Miyel, 2026-09-24. Relisten is the card's
  // own Listen to the whole record, and there is no Share (above).
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

  const nav = (
    <SiteNav
      tools={keeperTools}
      dots={!writing && folder?.length > 1 ? <FolderDots folder={folder} slug={entry.slug} onPick={turnTo} /> : null}
    />
  );

  return (
    <div className={'ln-entry tn' + (writing ? ' tn--writing' : '')}>
      {headerSlot ? createPortal(nav, headerSlot) : nav}

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
                  <>
                    <StarPicker
                      value={rating}
                      onChange={v => (writing ? setWritten(w => ({ ...w, rating: v })) : edit.set('rating', String(v)))}
                      size={22}
                    />
                    <button
                      type="button"
                      className={'ln-track-heart' + (favorite ? ' ln-track-heart--on' : '')}
                      onClick={() => (writing ? setWritten(w => ({ ...w, favorite: !w.favorite })) : edit.set('favorite', !edit.draft.favorite))}
                      aria-pressed={favorite}
                      aria-label="Favourite song"
                    >
                      <Heart size={17} weight={favorite ? 'fill' : 'regular'} />
                    </button>
                  </>
                ) : (
                  <>
                    {rating > 0 && <StarRating rating={rating} size={17} />}
                    {favorite && <span className="tn-heart" title="Favourite song"><Heart size={16} weight="fill" /></span>}
                  </>
                )}
              </div>
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
                {/* The glyph at the end of the note, not the word: the brief
                    draws a track note's way in the way a track's is drawn. */}
                <CommentBubble glyph slug={entry.slug} trackIndex={-1} comments={noteComments} onRefresh={() => setAskedFor(n => n + 1)} />
              </>
            )}
          </div>

          {!writing && (
            <div className="tn-foot">
              {/* An ordinary listen of the album, through the key every other
                  way into a listen uses — the song on the desk is put away
                  first, or the sheet would open on it. */}
              {authed && !correcting && (
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
                  <VinylRecord size={16} weight="regular" aria-hidden="true" />
                  <span>Listen to the whole record</span>
                </button>
              )}
              {postedOn && <p className="tn-posted">Posted {postedOn}</p>}
            </div>
          )}
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
                  favorite: written.favorite,
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
          }}
        />
      )}
    </div>
  );
}
