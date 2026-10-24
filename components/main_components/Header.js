// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/main_components/Header.js
// The top row of the phone's cross: the keeper's face, the light switch, and
// Home · People · Inbox, with only the one you are on wearing its word.
//
// ── It replaced the band at the foot, 2026-10-22 ──────────────────────────
// Miyel's answers to the frame questions (the home-and-session brief, stage
// 3): the words go to the top, the face becomes the way in to a person, and
// the foot belongs to the Listen bar. Footer.js drew Card · Beacon · People ·
// Inbox along the bottom; this draws three of them along the top, and the
// card is reached by its face instead of by a word.
//
// ── Only the lit one wears its word ───────────────────────────────────────
// Three glyphs, and the word under the one you are on, underlined — the
// `.ln-word` logic, the People brief's rule, her pick over three glyphs with
// words and over words alone. Three bare glyphs is one guess too many; three
// glyphs and one word is none. The glyphs are the band's: a house, two
// people, the envelope the whole site already puts on what arrived (her
// pick over a tray).
//
// ── The same presses the band had ─────────────────────────────────────────
// A glyph moves the rail exactly as a swipe does (HomeNav, goTo). The one you
// are already on goes back to the top of the floor you are on, and twice to
// its first screen (goBack). Inbox wears one dot while something there is new
// — never a number (DECISIONS).
//
// ── A visitor's row ───────────────────────────────────────────────────────
// Their face and the light switch, and the LN. mark where a keeper's words
// would be, with no words at all: People moved to the commons, so there is
// nothing on it for a visitor to press (DECISIONS, the frame).
//
// ── And the keeper's has the mark too, 2026-10-23 ─────────────────────────
// In the middle of the row, small, its dot green while a listen is open and
// ink while not. The big mark left home on 2026-10-22 and took the only
// sign of a live listen with it (Miyel: "there's no type of indication that
// someone is live or listening … I do miss it"); her pick of three mockups
// puts it back here, where it costs the page no room and stands on every
// pane, the way the mark always said whether anything was playing.
//
// On a phone only. A desk keeps its two pages until she has seen this (her
// call, 2026-10-22), and draws none of it (nav.css).
'use client';

import { Envelope, House, User, Users } from '@phosphor-icons/react';
import { useBookplate } from './Bookplate';

export default function Header({
  pane, stops, goTo, onHere = null, onFace, cardOpen = false, fresh = false, lights = null, mark = null,
}) {
  const { portrait_url: portrait, keeper_name, cover_name } = useBookplate();
  const whose = keeper_name || cover_name;
  return (
    <div className="hdr">
      {/* The way in to the person: it opens the card over the page, and
          closes it again (HomeNav). */}
      <button
        type="button"
        className={'hdr-face' + (cardOpen ? ' hdr-face--open' : '')}
        onClick={onFace}
        aria-expanded={cardOpen}
        aria-label={`About ${whose}`}
        title={whose}
      >
        <User size={16} weight="regular" aria-hidden="true" />
        {portrait && <img src={portrait} alt="" />}
      </button>
      {lights}
      {stops.length > 0 && <span className="hdr-mark hdr-mark--middle" aria-hidden="true">{mark}</span>}
      {stops.length > 0 ? (
        <nav className="hdr-stops" aria-label="The journal">
          {stops.map(stop => {
            const here = pane === stop.at;
            const Icon = GLYPHS[stop.key];
            const lit = stop.key === 'inbox' && fresh;
            return (
              <button
                key={stop.key}
                type="button"
                className={'hdr-stop' + (here ? ' hdr-stop--here' : '')}
                onClick={() => (here && onHere ? onHere(stop.at) : goTo(stop.at))}
                aria-current={here ? 'true' : undefined}
                aria-label={lit ? `${stop.word}, something new` : stop.word}
              >
                <span className="hdr-glyph">
                  <Icon size={19} weight="regular" aria-hidden="true" />
                  {lit && <span className="hdr-dot" aria-hidden="true" />}
                </span>
                {here && <span className="hdr-word" aria-hidden="true">{stop.word}</span>}
              </button>
            );
          })}
        </nav>
      ) : (
        <span className="hdr-mark" aria-hidden="true">{mark}</span>
      )}
    </div>
  );
}

const GLYPHS = { home: House, people: Users, inbox: Envelope };
