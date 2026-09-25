// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// app/albums/[record]/AlbumPage.js
// A record's own page: every listen of it and every track note on it.
//
// ── Why there is one, 2026-09-24 ──────────────────────────────────────────
// The wall holds one tile per record (gatherAlbums in Journal.js), so a record
// with more than one thing behind it — two listens, or a listen and a song,
// or songs and no listen yet — needs somewhere to set them out. This is it:
// the cover, the record, a line saying what is here, and the rows, newest
// first, each with its own date and rating (the track-notes brief). A row
// opens its entry, growing out of the row, with no left and right: you browse
// on the wall and nowhere else (DECISIONS).
//
// A record known only by its songs says so — "3 songs · no listen yet" —
// with its cover a page, the corner folded over, and the keeper gets the
// same line the track note's card has: Listen to the whole record. A wall of
// pages is a legitimate journal; the fold is only a standing invitation.
//
// `entries` is the record's rows as the wall has them (pull_album), newest
// first.

'use client';
import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { VinylRecord } from '@phosphor-icons/react';
import { parseRating } from '../../../library/entry_formatter';
import { handOff, arrivingAlone } from '../../../library/handoff';
import SiteNav from '../../../components/main_components/SiteNav';
import StarRating from '../../../components/main_components/StarRating';
import { useLayerHeaderSlot } from '../../../components/main_components/LayerEntry';
import { PENDING_KEY, TRACK_NOTE_KEY, saidSoAboutTheDesk } from '../../../hooks/useListeningSession';

export default function AlbumPage({ entries, authed = false }) {
  const router = useRouter();
  const headerSlot = useLayerHeaderSlot();
  useEffect(() => {
    if (headerSlot) headerSlot.setAttribute('class', 'lay-header ln-entry');
  }, [headerSlot]);

  const listens = entries.filter(e => !e.song);
  const notes = entries.filter(e => e.song);
  // The record is drawn from its newest listen, or its newest note before it
  // has one — the tile's own face.
  const face = listens[0] || notes[0];
  const songsOnly = listens.length === 0;
  // What is here, and never what is missing — except the one thing the brief
  // asks this line to say, which is that a songs-only record has not been
  // listened to whole. Numbers stay numbers.
  const listensSaid = listens.length === 1 ? '1 listen' : `${listens.length} listens`;
  const songsSaid = notes.length === 1 ? '1 song' : `${notes.length} songs`;
  const summary = songsOnly ? `${songsSaid} · no listen yet`
    : notes.length ? `${listensSaid} · ${songsSaid}`
    : listensSaid;

  const nav = <SiteNav />;

  return (
    <div className="ln-entry alb">
      {headerSlot ? createPortal(nav, headerSlot) : nav}
      <div className="ln-screens alb-screens">
        <article className="alb-card">
          <header className="alb-head">
            <span className={'alb-cover' + (songsOnly ? ' ln-fold' : '')}>
              {face.album_art ? <img src={face.album_art} alt={face.album} /> : null}
              {/* A record known only by its songs is a page: its corner
                  folded over, in the album's own colour (base.css). */}
              {songsOnly && (
                <span className="ln-fold-flap" aria-hidden="true">
                  {face.album_art && <img src={face.album_art} alt="" />}
                </span>
              )}
            </span>
            <h1 className="alb-title">{face.album}</h1>
            <p className="alb-by">{[face.artist, face.year].filter(Boolean).join(' · ')}</p>
            <p className="alb-sum">{summary}</p>
            {/* The keeper's way to the whole record, as on a track note's
                card: an ordinary listen, through the key every way into a
                listen uses, with any song on the desk put away first. */}
            {authed && (
              <button
                type="button"
                className="tn-whole alb-whole"
                onClick={() => {
                  try {
                    localStorage.setItem(PENDING_KEY, JSON.stringify({
                      album: face.album,
                      artist: face.artist || '',
                      year: face.year || '',
                      artUrl: face.album_art_source || face.album_art || '',
                      collectionId: null,
                      genre: face.genre || '',
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
          </header>

          <div className="alb-rows">
            {entries.map(e => {
              const rating = e.masterpiece === true ? 5 : parseRating(e.rating);
              const href = `/entries/${e.slug}`;
              return (
                <Link
                  key={e.slug}
                  href={href}
                  className="alb-row"
                  /* The entry grows out of this row rather than out of the
                     wall's tile behind the page, and arrives with nothing
                     either side of it. */
                  data-grows={href}
                  onClick={() => { arrivingAlone(); handOff(e); }}
                >
                  <span className="alb-row-art">{e.album_art ? <img src={e.album_art} alt="" loading="lazy" /> : null}</span>
                  <span className="alb-row-said">
                    {/* A song is titled by its song, a listen by its number —
                        the one it carries on its own page (Miyel, 2026-09-24). */}
                    <span className="alb-row-title">{e.song || `Listen ${e.listen_number || 1}`}</span>
                    <span className="alb-row-when">
                      {e.posted_at ? new Date(e.posted_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : ''}
                    </span>
                  </span>
                  {rating > 0 && <StarRating rating={rating} size={12} />}
                </Link>
              );
            })}
          </div>
        </article>
      </div>
    </div>
  );
}
