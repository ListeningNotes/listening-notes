// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
// The landing, 2026-11-25 (Miyel's brief, the wall as home; her word for it).
// What a visitor lands on, on a phone: the card is not a thing to open any
// more, it is the top of the page. Top to bottom —
//
//   who keeps the journal: the portrait, the name and the card's lines;
//   the lamp, only while a listen is open: the record, a green dot and
//     "Logging [album] · [artist]" — and nothing at all when none is, never
//     an empty slot (green stays live's alone);
//   the pinned albums, up to three, framed and large, each with the one line
//     of the keeper's own writing it was pinned with (library/pinned_actions.js),
//     then title · artist — none at all when nothing is pinned;
//   and the wall under it, as it always was (HomeNav).
//
// The pinned albums are read once when the page opens. They change only when
// the keeper pins, so nothing here asks again on a timer.
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { User } from '@phosphor-icons/react';
import { useBookplate } from './Bookplate';
import { readBioAnswers } from '../../library/bioprompt';
import { handOff } from '../../library/handoff';
import { sizedAlbumArt } from '../../library/music_data_api';

export default function Landing({ live = false, onAir = null }) {
  const { portrait_url: portrait, portrait_position, cover_name, bioanswers } = useBookplate();
  const lines = readBioAnswers(bioanswers);
  const [pinned, setPinned] = useState([]);
  useEffect(() => {
    let gone = false;
    fetch('/api/pinned')
      .then(r => (r.ok ? r.json() : null))
      .then(data => { if (!gone && Array.isArray(data?.pinned)) setPinned(data.pinned); })
      .catch(() => {});
    return () => { gone = true; };
  }, []);

  return (
    <section className="ld" aria-label={`${cover_name || 'This journal'}`}>
      <div className="ld-who">
        <span className="ld-face">
          {portrait
            ? <img src={portrait} alt="" style={{ objectPosition: portrait_position || '50% 50%' }} />
            : <User size={40} weight="light" aria-hidden="true" />}
        </span>
        <h1 className="ld-name">{cover_name}</h1>
        {lines.length > 0 && (
          <ul className="ld-lines">
            {lines.map(line => (
              <li key={line.key}><span className="ld-prompt">{line.text}</span> {line.answer}</li>
            ))}
          </ul>
        )}
      </div>

      {live && onAir?.album && (
        <p className="ld-lamp">
          {onAir.art ? <img src={sizedAlbumArt(onAir.art, 120)} alt="" /> : <span className="ld-lamp-art" />}
          <i className="ld-lamp-dot" aria-hidden="true" />
          <span className="ld-lamp-words">Logging <b>{onAir.album}</b>{onAir.artist ? ` · ${onAir.artist}` : ''}</span>
        </p>
      )}

      {pinned.length > 0 && (
        <div className="ld-pinned">
          {pinned.map(pin => (
            <Link
              key={pin.position}
              href={`/entries/${pin.slug}`}
              className="ld-frame"
              data-grows={`/entries/${pin.slug}`}
              onClick={() => handOff(pin)}
            >
              <span className="ld-mat">
                {pin.album_art
                  ? <img src={sizedAlbumArt(pin.album_art, 600)} alt="" />
                  : <span className="ld-mat-none" aria-hidden="true">♪</span>}
              </span>
              {pin.line && <span className="ld-said">{pin.line}</span>}
              <span className="ld-title"><b>{pin.album}</b>{pin.artist ? ` · ${pin.artist}` : ''}</span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
