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
  journal_name: 'A listening journal',
  keeper_name: null,
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
  // Whether a long note exists, rather than the note itself. Anything put in
  // this context is serialised into the HTML of every page that renders — the
  // essay is 3.5KB of prose the archive has no use for. Pages that actually
  // show the writing read it on the server instead.
  has_note: false,
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
