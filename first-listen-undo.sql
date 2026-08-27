-- Copyright (C) 2026 Miyel Brown
-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Undo for clearing relationship = 'First Listen' on 2026-08-25.
-- Run this to put every one of them back exactly as it was.
UPDATE entries SET relationship = 'First Listen' WHERE slug IN (
  'absolutely',
  'anti-deluxe',
  'as-tall-as-lions',
  'blonde',
  'coastal-grooves',
  'donuts',
  'fantasma-remastered',
  'fetch-the-bolt-cutters',
  'girl-with-fish',
  'green-twins',
  'im-in-your-mind-fuzz',
  'mayhem',
  'oligarchy-sucks',
  'salvation-laughs-in-the-face-of-a-grieving-mother',
  'shoals',
  'silent-machine',
  'slugger',
  'tangk',
  'the-meaning-of-8',
  'the-velvet-underground-nico-45th-anniversary-edition',
  'two-star-the-dream-police'
);
