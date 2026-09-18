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
// ── Who sent it ─────────────────────────────────────────────────────────────
// The credit — received_from and received_from_url — is public on a
// Submission entry and stripped from everything else (withoutChain). So it
// cannot be seeded from the entry the page was handed: a field filled from
// a value the page was never given would save a blank over what is stored.
//
// It is fetched on open instead, from GET /api/entries/[slug], which
// includes the whole row when the caller has a wristband. Until it arrives
// the fields are simply absent from the draft, and update_entry only writes
// one when its key is actually present — so a save that lands before the
// fetch does leaves them alone rather than clearing them.
//
// received_date is deliberately not here, 2026-09-14. The send flow stamps
// it, where the moment is exact; a keeper crediting an old entry from memory
// is not asked for one and nothing defaults it to today, because a confident
// wrong date corrupts every statistic after it and a missing one costs
// nothing — the entry's own date is the ceiling, and ordering and hit rates
// both work from that. Left out of the draft, it is left alone on save.
//
// source_entry_id is not here either, and as of 2026-09-15 it is not
// anywhere: the column is parked and nothing writes it, because an
// `entries.id` means nothing in another copy's database and a send has no
// way to carry one anyway. The reasoning is kept in one place, above the
// slugs in `library/database_actions.js`.
//
// It is still what tells this hook whose read came back. `withoutChain`
// strips it from every public read, so a row that *has* the key — null or
// not — is the keeper's own read and safe to seed the credit from. A row
// without it is the visitor's, and seeding from that would save a blank
// over what is stored.
//
// The sender is picked off the address book where possible (`book`, below),
// so the credit resolves to a journal and not only a spelling; free text
// stays for anyone who sent something and keeps no copy.

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

// `layered` is whether this entry is open as a sheet over the journal rather
// than as a page of its own. It only matters to `remove` — see the note
// there — and it defaults to the standalone case, which is the safe one.
// An entry has just been deleted, and the wall is still on screen underneath.
// Miyel named this on 2026-09-18: DeleteEntry. It carries the slug, which is
// all the journal needs — the tiles are keyed by it and each one writes it on
// itself as data-tile-slug. Sits beside SAVED_EVENT in useListeningSession,
// which is the same idea in the other direction: a listen telling the wall to
// make room rather than to close a gap.
export const DELETE_ENTRY = 'ln-delete-entry';

export function useEntryEditor(entry, { layered = false } = {}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [trouble, setTrouble] = useState(null);
  const [draft, setDraft] = useState(() => draftFrom(entry));
  // `asking` lived here until 2026-09-18 — whether the delete had been pressed
  // once, which raised a warning at the foot of the correction. The two
  // presses are on the ··· itself now and never open a correction at all, so
  // nothing sets this and nothing read it. See the note on the tool in
  // KeeperTools.js.
  const [removing, setRemoving] = useState(false);
  // The address book — the people a sender can be picked from. Owner-only
  // on the server, which the editor is anyway; empty until it arrives, and
  // empty means the field is plain text.
  const [book, setBook] = useState([]);

  // Seeded on open rather than held permanently, so a draft abandoned an hour
  // ago is not what the fields come back showing.
  const begin = useCallback(() => {
    setDraft(draftFrom(entry));
    setTrouble(null);
    setEditing(true);

    // The credit and the address book. Both fetched rather than waited for:
    // the fields that do not need them are usable immediately. A row with
    // the private column on it is the keeper's read; anything else is the
    // public one and must not seed the field.
    fetch(`/api/entries/${entry.slug}`)
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        const row = data?.entry;
        if (!row || !('source_entry_id' in row)) return;
        setDraft(d => ({
          ...d,
          received_from: row.received_from ?? '',
          received_from_url: row.received_from_url ?? '',
          credit_private: row.credit_private === true,
        }));
      })
      .catch(() => {});

    fetch('/api/people')
      .then(r => (r.ok ? r.json() : null))
      .then(data => setBook(data?.people || []))
      .catch(() => {});
  }, [entry]);

  const cancel = useCallback(() => {
    setEditing(false);
    setTrouble(null);
  }, []);

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

      // ── Leaving, and why it is not a push ───────────────────────────────
      // This was always `router.push('/')`, on the reasoning that back is this
      // entry and this entry is gone. True on a page of its own. Over the
      // journal it froze the app — Miyel, 2026-09-18, "deleting froze my app,
      // I had to reset."
      //
      // The layer is a parallel route (app/@layer) and it is open because the
      // address says so. A soft push to `/` does not match anything in that
      // slot, and a slot with nothing to match holds the last thing it drew —
      // so the sheet stayed up over the homepage with a deleted entry inside
      // it, and the document stayed `ln-locked`, which is the class the layer
      // puts on the root to stop the journal scrolling behind it. Locked with
      // nothing left to unlock it: the effect that removes the class runs when
      // the layer unmounts, and it never unmounted.
      //
      // So a layer closes the way a layer closes, which is back — and back is
      // the journal, which is where somebody who has just deleted a record
      // wants to be anyway.
      // The wall hears it before the sheet is off, and waits out the sheet
      // itself — see closeTheGap in Journal.js. Announced rather than left to
      // a refetch, because a refetch would make the tile blink out of
      // existence and the point is to watch the others close over it.
      window.dispatchEvent(new CustomEvent(DELETE_ENTRY, { detail: { slug: entry.slug } }));

      if (layered) router.back();
      else router.push('/');
    } catch (err) {
      setTrouble(err.message);
      setRemoving(false);
    }
  }, [entry.slug, router, layered]);

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
    removing, remove, book,
  };
}
