// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
// components/main_components/PinnedLetter.js
// An LN. Admin letter, pinned over the keeper's own wall.
//
// It stood at the top of the inbox (2026-10-20). The inbox retires with
// Miyel's Friends brief (step six), and her answers of 2026-10-26 give the
// letter its home: "LN. Admin letters and the month's prompt → pinned on my
// own Home wall." The prompt was already there (MonthPrompt.js); this puts
// the letter beside it, as the inbox drew it — the LN. mark where a face
// would be, the name, the words, the line no letter can leave off (the
// software never asks for a secret), and its own X, one press. There is
// only ever one (library/letterhead.js), nobody to reply to, and nothing
// about it goes back. On screen is read, so it is marked seen as it is
// drawn. Its own brief is still to come; this is the inbox's card, moved.
//
// The letter a journal writes itself, asking for a copy, carries the one
// door a letter has: Make a copy, to Back up your journal in Settings.
// `again` changes whenever the journal has asked what is waiting
// (/api/waiting), which is when that letter is written.

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Files, X } from '@phosphor-icons/react';
import { LnMark } from './SiteNav';
import { COPY_MADE } from './JournalCopy';

export default function PinnedLetter({ authed = false, again = null }) {
  const [letter, setLetter] = useState(null);
  const [going, setGoing] = useState(false);
  const room = useRef(null);

  useEffect(() => {
    if (!authed) return undefined;
    let gone = false;
    fetch('/api/messages?letter=1', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (!gone && d) setLetter(d.letter || null); })
      .catch(() => {});
    return () => { gone = true; };
  }, [authed, again]);

  // A copy made in Settings takes the letter asking for one with it on the
  // server (library/whole_journal.mjs); this takes it off the screen too.
  useEffect(() => {
    const made = () => setLetter(l => (l?.door === 'copy' ? null : l));
    window.addEventListener(COPY_MADE, made);
    return () => window.removeEventListener(COPY_MADE, made);
  }, []);

  // Read once it is drawn.
  const unseen = letter && !letter.seen_at ? letter.id : null;
  useEffect(() => {
    if (!unseen) return;
    fetch('/api/messages', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: unseen }),
    }).catch(() => {});
  }, [unseen]);

  // Put away: it rises and is gone, the space under it closing as it goes
  // (Miyel, 2026-10-20: "disappearing up not to the right"). Deleted on the
  // server as it goes; a delete that fails brings it back.
  async function putAway() {
    if (going || !letter) return;
    const box = room.current;
    if (box) {
      box.style.maxHeight = `${box.offsetHeight}px`;
      box.getBoundingClientRect();
    }
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    setGoing(true);
    const gone = fetch('/api/messages', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: letter.id }),
    }).then(r => r.ok).catch(() => false);
    await new Promise(r => setTimeout(r, still ? 0 : 680));
    if (await gone) setLetter(null);
    else if (box) box.style.maxHeight = '';
    setGoing(false);
  }

  if (!letter) return null;
  return (
    <div ref={room} className={'ib-letter-room pl-room' + (going ? ' ib-letter-room--up' : '')}>
      <section className={'ib-letter' + (going ? ' ib-letter--up' : '')} aria-label="A letter from LN. Admin">
        <button type="button" className="ib-letter-x" onClick={putAway} aria-label="Dismiss this letter" title="Dismiss">
          <X size={18} weight="regular" aria-hidden="true" />
        </button>
        <div className="ib-letter-head">
          <span className="ib-letter-face" aria-hidden="true"><LnMark /></span>
          <span className="ib-letter-from">LN. Admin</span>
        </div>
        <p className="ib-letter-said">{letter.said}</p>
        <p className="ib-letter-safe">LN. Admin never asks for your password or your spare key.</p>
        {letter.door === 'copy' && (
          <div className="ib-doors fr-doors-row">
            <Link className="fr-door" href="/settings#back-up">
              <Files size={22} weight="regular" aria-hidden="true" />
              Make a copy
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
