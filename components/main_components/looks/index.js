// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/main_components/looks/index.js
// The looks: a record's print, each one its own object rather than a filter
// over one poster (Miyel, 2026-11-04). The card says "I logged this"; Poster says
// "I love this one". Each comes in day or night (2026-11-06), so a look is a layout
// and a mode. It is always the album's real cover, in a different layout. Game, Mosaic, CRT, Paper, a two-ink Riso and a dotted Halftone were tried
// and cut (they are in git): a look has to earn its door.
//
// ── What keeps them a set ────────────────────────────────────────────────
// Every look draws exactly the same things and no others: the cover, the stars,
// the marks, the title with the artist and year, the horizon, and the mark. How
// each is drawn and where it goes is the look's own. One that wants to show a
// fact the others cannot is not a look. The writing never travels and no address
// is printed, in any of them.
//
// A look is `scene(record, frame, { art, families, still })`, returning
// `step(dt)` and `paint(ctx)`. It is told the time rather than reading it, and
// the same scene is the preview, the video and, still, the picture, so what you
// see is what saves.
'use client';

import { Article, CirclesThree, CircleHalf, Equalizer, ImageSquare, Moon, Planet, Sun, Television } from '@phosphor-icons/react';
import { INKS } from '../SharePrinter';
import { paperScene } from './day';
import { driftGround, levelsGround, orbsGround, reflectGround } from './grounds';
import { posterScene } from './poster';
import { tvScene } from './tv';

export const LOOKS = [
  { key: 'day', layout: 'card', night: false, label: 'Day', ink: INKS.day.ink, scene: paperScene(false) },
  { key: 'night', layout: 'card', night: true, label: 'Night', ink: INKS.night.ink, scene: paperScene(true) },
  ...[['orbs', 'Orbs', orbsGround], ['levels', 'Levels', levelsGround], ['reflect', 'Reflect', reflectGround], ['drift', 'Drift', driftGround]].flatMap(([key, label, ground]) => [
    { key, layout: key, night: false, label, ink: INKS.day.ink, scene: paperScene(false, ground) },
    { key: `${key}-night`, layout: key, night: true, label, ink: INKS.night.ink, scene: paperScene(true, ground) },
  ]),
  { key: 'poster', layout: 'poster', night: false, label: 'Poster', ink: '#000000', scene: posterScene(false) },
  { key: 'poster-night', layout: 'poster', night: true, label: 'Poster', ink: '#ffffff', scene: posterScene(true) },
  { key: 'tv', layout: 'tv', night: false, label: 'TV', ink: '#000000', scene: tvScene(false) },
  { key: 'tv-night', layout: 'tv', night: true, label: 'TV', ink: '#ffffff', scene: tvScene(true) },
];

// The doors: which layout, and which mode.
const ALL_LAYOUTS = [
  { key: 'card', label: 'Card', Icon: Article },
  { key: 'orbs', label: 'Orbs', Icon: CirclesThree },
  { key: 'levels', label: 'Levels', Icon: Equalizer },
  { key: 'reflect', label: 'Reflect', Icon: CircleHalf },
  { key: 'drift', label: 'Drift', Icon: Planet },
  { key: 'poster', label: 'Poster', Icon: ImageSquare },
  { key: 'tv', label: 'TV', Icon: Television },
];
export const MODES = [
  { night: false, label: 'Day', Icon: Sun },
  { night: true, label: 'Night', Icon: Moon },
];

// The doors for now: the card by day, by night, or on its own blurred cover (Miyel,
// 2026-11-07). The other layouts stay built, one word from coming back. A choice remembered
// from one of them falls back to the card.
export const GROUNDS = [
  { key: 'day', label: 'Day', Icon: Sun },
  { key: 'night', label: 'Night', Icon: Moon },
  { key: 'reflect-night', label: 'Reflect', Icon: CircleHalf },
];

export const lookOf = key => LOOKS.find(look => look.key === key && GROUNDS.some(g => g.key === look.key)) || LOOKS[0];
