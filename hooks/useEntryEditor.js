// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// hooks/useEntryEditor.js
// The draft of an entry while its keeper is correcting it.
//
// This is the same shape useIdentificationCardEditor has, for the same reason:
// the hook holds the draft and the page draws the fields, so every field sits
// exactly where the thing it edits is printed. The album title becomes an
// input in the place the album title was; a track's note becomes a textarea
// under that track. Nothing opens, nothing covers the page, and there is no
// second copy of the layout to keep in step with the first.
//
// ── What this is for ────────────────────────────────────────────────────────
// Typos, second thoughts soon after writing, and genuine mistakes. Not
// revising a listen — a relisten is a new entry, because the journal is a
// record of encounters and rewriting an old one falsifies the encounter rather
// than adding to it.
//
// That is what makes the edit stamps cheap rather than fussy: if editing is
// only ever small, a mark saying it happened costs nothing. update_entry sets
// them, one per piece of writing, and they print next to what changed.
//
// ── What it deliberately cannot reach ───────────────────────────────────────
// The discovery chain — source_entry_id, received_from, received_date. Those
// are stripped from the entry before it reaches the page (see
// pull_entry_by_slug), so they are not in the draft and cannot be saved from
// here: a field seeded from a value the page was never given would save a blank
// over whatever is stored. They stay in the dashboard until there is an
// owner-only read to seed them from.

'use client';
import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';

// Everything the page can edit, taken off the entry it was handed.
//
// album_art_source, not album_art. The list and the page are both served a
// resized URL and the original travels alongside — seeding from the sized one
// would save it back over the master, and every later edit would size it down
// again from there.
function draftFrom(entry) {
  return {
    album: entry.album || '',
    artist: entry.artist || '',
    year: entry.year || '',
    rating: entry.rating ?? '',
    genre: entry.genre || '',
    entry_type: entry.entry_type || '',
    favorite: entry.favorite === true || entry.favorite === 'true',
    masterpiece: entry.masterpiece === true,
    formative: entry.formative === true,
    notes: entry.notes || '',
    album_art: entry.album_art_source ?? entry.album_art ?? '',
    tracks: Array.isArray(entry.tracks) ? entry.tracks.map(t => ({ ...t })) : [],
  };
}

export function useEntryEditor(entry) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [trouble, setTrouble] = useState(null);
  const [draft, setDraft] = useState(() => draftFrom(entry));
  // Whether the delete has been asked for once. It is not a modal and not a
  // browser confirm: the first press opens the warning in place, under the
  // button, and the second one does it. A dialog would be dismissed by
  // reflex — this has to be read to be got past.
  const [asking, setAsking] = useState(false);
  const [removing, setRemoving] = useState(false);

  // Seeded on open rather than held permanently, so a draft abandoned an hour
  // ago is not what the fields come back showing.
  const begin = useCallback(() => {
    setDraft(draftFrom(entry));
    setTrouble(null);
    setEditing(true);
  }, [entry]);

  const cancel = useCallback(() => {
    setEditing(false);
    setAsking(false);
    setTrouble(null);
  }, []);

  const ask = useCallback(() => setAsking(true), []);
  const unask = useCallback(() => setAsking(false), []);

  // There is no undo. delete_entry is a hard DELETE, and the only copies are
  // the nightly backup and whatever Neon's six hours still hold — so the
  // warning that stands in front of this says exactly that, and says what else
  // goes with it.
  const remove = useCallback(async () => {
    setRemoving(true);
    setTrouble(null);
    try {
      const res = await fetch(`/api/entries/${entry.slug}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'That didn’t delete. Try again.');
      // Home rather than back: back is this entry, and it is gone.
      router.push('/');
    } catch (err) {
      setTrouble(err.message);
      setRemoving(false);
    }
  }, [entry.slug, router]);

  const set = useCallback((key, value) => {
    setDraft(d => ({ ...d, [key]: value }));
  }, []);

  const setTrack = useCallback((index, key, value) => {
    setDraft(d => ({
      ...d,
      tracks: d.tracks.map((t, i) => (i === index ? { ...t, [key]: value } : t)),
    }));
  }, []);

  const save = useCallback(async () => {
    setSaving(true);
    setTrouble(null);
    try {
      const res = await fetch(`/api/entries/${entry.slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'That didn’t save. Try again.');
      setEditing(false);
      // The page is a server component and the stamps are written by the
      // database, so the only way to see what was actually recorded — rather
      // than what was sent — is to ask the server to render it again.
      router.refresh();
    } catch (err) {
      setTrouble(err.message);
    } finally {
      setSaving(false);
    }
  }, [draft, entry.slug, router]);

  return {
    editing, saving, trouble, draft, begin, cancel, set, setTrack, save,
    asking, ask, unask, removing, remove,
  };
}
