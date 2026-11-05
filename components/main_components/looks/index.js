// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/main_components/looks/index.js
// The looks: a record's print, each one its own object rather than a filter
// over one poster (Miyel, 2026-11-04). Day and Night say "I logged this"; Halftone
// says "I love this one". Game, Mosaic, CRT, Paper and a two-ink Riso were tried
// and cut the same day (they are in git): a look has to earn its door.
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

import { DotsNine, Moon, Sun } from '@phosphor-icons/react';
import { INKS } from '../SharePrinter';
import { paperScene } from './day';
import { halftoneScene } from './halftone';

export const LOOKS = [
  { key: 'day', label: 'Day', Icon: Sun, ink: INKS.day.ink, scene: paperScene(false) },
  { key: 'night', label: 'Night', Icon: Moon, ink: INKS.night.ink, scene: paperScene(true) },
  { key: 'halftone', label: 'Halftone', Icon: DotsNine, ink: '#000000', scene: halftoneScene },
];

export const lookOf = key => LOOKS.find(look => look.key === key) || LOOKS[0];
