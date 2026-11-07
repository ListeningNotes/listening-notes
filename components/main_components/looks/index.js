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

import { Article, Cards, ChartBarHorizontal, ImageSquare, Moon, PaintBucket, Sun, TextAa } from '@phosphor-icons/react';
import { INKS } from '../SharePrinter';
import { paperScene } from './day';
import { posterScene } from './poster';
import { floodScene } from './flood';
import { solitaireScene } from './solitaire';
import { sidewaysScene } from './sideways';
import { headlineScene } from './headline';

export const LOOKS = [
  { key: 'day', layout: 'card', night: false, label: 'Day', ink: INKS.day.ink, scene: paperScene(false) },
  { key: 'night', layout: 'card', night: true, label: 'Night', ink: INKS.night.ink, scene: paperScene(true) },
  { key: 'poster', layout: 'poster', night: false, label: 'Poster', ink: '#000000', scene: posterScene(false) },
  { key: 'poster-night', layout: 'poster', night: true, label: 'Poster', ink: '#ffffff', scene: posterScene(true) },
  { key: 'flood', layout: 'flood', night: false, label: 'Flood', ink: '#000000', scene: floodScene(false) },
  { key: 'flood-night', layout: 'flood', night: true, label: 'Flood', ink: '#ffffff', scene: floodScene(true) },
  { key: 'solitaire', layout: 'solitaire', night: false, label: 'Solitaire', ink: '#000000', scene: solitaireScene(false) },
  { key: 'solitaire-night', layout: 'solitaire', night: true, label: 'Solitaire', ink: '#ffffff', scene: solitaireScene(true) },
  { key: 'sideways', layout: 'sideways', night: false, label: 'Sideways', ink: '#000000', scene: sidewaysScene(false) },
  { key: 'sideways-night', layout: 'sideways', night: true, label: 'Sideways', ink: '#ffffff', scene: sidewaysScene(true) },
  { key: 'headline', layout: 'headline', night: false, label: 'Headline', ink: '#000000', scene: headlineScene(false) },
  { key: 'headline-night', layout: 'headline', night: true, label: 'Headline', ink: '#ffffff', scene: headlineScene(true) },
];

// The doors: which layout, and which mode.
export const LAYOUTS = [
  { key: 'card', label: 'Card', Icon: Article },
  { key: 'poster', label: 'Poster', Icon: ImageSquare },
  { key: 'flood', label: 'Flood', Icon: PaintBucket },
  { key: 'solitaire', label: 'Solitaire', Icon: Cards },
  { key: 'sideways', label: 'Sideways', Icon: ChartBarHorizontal },
  { key: 'headline', label: 'Headline', Icon: TextAa },
];
export const MODES = [
  { night: false, label: 'Day', Icon: Sun },
  { night: true, label: 'Night', Icon: Moon },
];

export const lookOf = key => LOOKS.find(look => look.key === key) || LOOKS[0];
export const lookFor = (layout, night) => LOOKS.find(look => look.layout === layout && look.night === night);
