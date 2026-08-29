// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/main_components/Bookplate.js
// The label pasted inside the front of a book saying whose it is.
//
// Holds the journal's own details — its name, its keeper, the portrait, the
// links — and hands them to any component that asks. These used to be
// constants scattered through the source, which meant a copy of this software
// opened wearing this journal's name and pointing at its Instagram.
//
// Read once on the server in app/layout.js and passed down, rather than each
// component fetching for itself: one query per page instead of three, and no
// flash of an icon appearing a moment after everything else.

'use client';

import { createContext, useContext } from 'react';

// The same blanks library/settings_actions.js falls back to. A component that
// renders before the provider exists — a test, a stray import — should see an
// unconfigured journal rather than undefined.
const EMPTY = {
  // What this journal is called, worked out on the server by coverName() and
  // handed down. It is the keeper's name, or this generic stand-in when they
  // have not given one — and the stand-in is the reason this is the one field
  // here that is not null: every other blank means "draw nothing", while a
  // site with no name at all in its tab is just broken.
  cover_name: 'A listening journal',
  keeper_name: null,
  // The ornamented name, or null when the plain one is the only one. Read by
  // the card's editor to decide which column a name edit belongs in.
  display_name: null,
  bio: null,
  portrait_url: null,
  instagram_url: null,
  lastfm_user: null,
  site_address: null,
  founded_at: null,
  pinned_entry_id: null,
  about_intro: null,
  social_links: null,
  hidden_fields: null,
  send_me: null,
  portrait_position: null,
  portrait_code_url: null,
  rig_icon: null,
  rig: null,
  // Three finished openings; see library/bioprompt.js. Short by design —
  // three one-line answers, which is a few hundred bytes and belongs in the
  // context the way the rig rows do.
  bioanswers: null,
  // Up to three entry ids; see schema.sql. Three integers.
  pinned_entries: null,
};

const BookplateContext = createContext(EMPTY);

// useBookplate — how a component reads the journal's details.
//   const { instagram_url } = useBookplate();
//
// Every value can be null, and null means the owner said no. Components are
// expected to render nothing at all rather than an empty link or a broken
// image: "no Instagram" is an answer, not a gap.
export function useBookplate() {
  return useContext(BookplateContext);
}

export function Bookplate({ settings, children }) {
  const value = { ...EMPTY, ...(settings || {}) };
  return (
    <BookplateContext.Provider value={value}>
      {children}
    </BookplateContext.Provider>
  );
}
