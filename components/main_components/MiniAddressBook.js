// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
// components/main_components/MiniAddressBook.js
// The address book as a strip of faces, for picking one person.
//
// Two places ask the same question — *who sent this* — and they should not
// answer it in two different shapes. The entry editor asks it under Sent by
// while a record is being corrected; the inbox asks it on a send that
// arrived before its sender kept a journal. This is the answer both draw.
//
// ── Why faces and not names ───────────────────────────────────────────────
// It was a row of name pills for an afternoon on 2026-09-14 and came off the
// same day (Miyel): a pill saying Kai is not how anybody recognises Kailea,
// and a book of forty friends drawn as pills is a wall of words on a screen
// that has other things to say. A face is what a person is known by. The
// portrait is the one each journal serves at its own address, in an <img>,
// never stored here — the same way the feed and the address book draw it.
//
// ── Why a strip ───────────────────────────────────────────────────────────
// One row that scrolls sideways, so the shape does not change as the book
// grows: three people and forty look the same, and the difference is how far
// it scrolls. Centred while the faces fit, scrollable from the first face
// when they do not, which is what the auto margins on the ends do — a row
// that overflows with justify-content: center pushes its first faces off the
// left edge with no way back to them.
//
// Styles are in base.css with the other shared pieces rather than in either
// surface's sheet, because it now belongs to both.

import { User } from '@phosphor-icons/react';
import { journalUrl } from '../../library/return_address';

// `people` is the address book as /api/people returns it. `linked` is the
// address currently chosen, or nothing. `narrow` is what has been typed
// where there is a field to type in — the entry editor has one, the inbox
// does not — and it hides nobody when it is empty. The linked person is
// always shown, whatever has been typed, or the one face that says what the
// current answer is would vanish as soon as somebody edited the name.
export default function MiniAddressBook({ people = [], linked = '', narrow = '', onPick, label = 'From your address book' }) {
  const typed = String(narrow || '').trim().toLowerCase();
  const shown = people.filter(person => {
    if (person.address === linked) return true;
    if (!typed) return true;
    return String(person.name || '').toLowerCase().includes(typed) || person.address.includes(typed);
  });
  if (shown.length === 0) return null;

  return (
    <span className="ln-sender-book" aria-label={label}>
      {shown.map(person => {
        const on = person.address === linked;
        return (
          <button
            key={person.id}
            type="button"
            className={'ln-sender-face' + (on ? ' ln-sender-face--on' : '')}
            onClick={() => onPick(person)}
            aria-pressed={on}
            title={on ? 'Linked to their journal — tap to unlink' : 'Link to their journal'}
          >
            {/* The plain mark behind the picture, for a journal with none or
                one that is out — the feed's Face, the address book's. */}
            <span className="ln-sender-portrait" aria-hidden="true">
              <User size={20} weight="regular" />
              <img
                src={`${journalUrl(person.address)}/api/portrait`}
                alt=""
                loading="lazy"
                onError={e => { e.currentTarget.style.display = 'none'; }}
              />
            </span>
            <span className="ln-sender-name">{person.name || person.address}</span>
          </button>
        );
      })}
    </span>
  );
}
