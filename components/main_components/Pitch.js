// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/main_components/Pitch.js
// The far face of the cross's turning pane, seen by everyone who is not the
// owner. Where the desk is for the keeper, this is for everybody else.
//
// This is the growth mechanic and it is deliberately the quietest thing on the
// site. Somebody is holding the phone asking how you got this; the owner
// swipes right and hands it back. That is the whole mechanism — no banner, no
// footer link on every page, no interstitial. One pane, arrived at on purpose.
//
// It ships on every copy and cannot be turned off, which is the one thing here
// that is not the owner's choice. The reason is that a copy is free and the
// only thing asked in return is that the next person can find out where it
// came from. It is also why the address below is fixed rather than read from
// settings: there is exactly one Listening Notes at one address, and a copy
// that could point this button somewhere else is a copy that could quietly
// substitute itself for the original.
//
// ── For strangers, 2026-09-22 ───────────────────────────────────────────────
// The small mark, three lines, six tiles and GET ONE (Miyel's brief, About,
// /get and Give, §1). The reader here has no one to show them and needs the
// pitch; a keeper never sees this pane — they give through a sheet instead.
// It replaces three sentences and a pill. A tile is one line and a glyph,
// never a heading over a description: one line is the whole of it. The
// three social lines sit in the middle and ownership comes last, so the page
// ends on the promise right above the link.
//
// It scrolls on a short phone, as any pane does — the caret is measured on
// the beacon only, so nothing promises a second screen here either way.
//
// ── The source line ─────────────────────────────────────────────────────────
// It sat at the foot of the About pane and belongs here instead: that pane is
// the public page about a person and this is the public page about the
// software, and an offer of source is about the software.
//
// It has to stay on a *public* pane, though, and that is not a preference.
// AGPL §13 obliges a copy modified and run over a network to offer its source
// to the people using it — visitors, not the owner. Behind the wristband, on a
// settings page only its keeper can reach, the offer is not made to anyone it
// is owed to. So it lives here, in the smallest type on the site, on the one
// pane a stranger arrives at asking what this software is.

'use client';

const HOME = 'https://www.listeningnotes.blog/get';

import { ArrowRight, BookOpen, Broadcast, Disc, HardDrives, PaperPlaneTilt, Shuffle } from '@phosphor-icons/react';
import WritingAccess from './WritingAccess';
// The version this copy is running, beside the source line. A version used
// to be ruled out here as a line that goes stale; releases keep it true now
// (see the update button, DECISIONS), and it is the one number a keeper
// needs when asking whether their copy has something. It links to what
// that version contains. The desk prints the same number for the owner.
import { VERSION, RELEASE_URL } from '../../library/version';

// Where this copy's source lives. §13 asks for the source of *the running
// program*, which for a modified copy is that copy's own repository and not
// this one — so an owner who has changed anything points this at their fork
// with NEXT_PUBLIC_SOURCE_URL. Defaulted to upstream, because the honest
// answer for an unmodified copy is upstream and nobody should have to think
// about compliance to install a journal.
//
// An environment variable and nothing else. This wanted a settings column
// once, and the answer is no: almost nobody modifies the code, anybody who
// does is already comfortable with environment variables, and a developer
// section in the settings would advertise a capability most owners neither
// need nor should have to think about. The settings page is about the journal,
// not about the software.
//
// The fallback was pointing at a repository that does not exist, which is the
// §13 offer being attempted and missed — worse than a link that is merely
// broken, because it looks discharged.
const SOURCE_URL =
  process.env.NEXT_PUBLIC_SOURCE_URL || 'https://github.com/ListeningNotes/listening-notes';

export default function Pitch({ onSignedIn }) {
  return (
    <div className="pt-pane">
      <div className="pt-body">
        {/* What it is, in one breath: free, theirs, and the writing does not
            go anywhere. The mark above says whose software this is. */}
        <p className="pt-blurb">
          A music journal you own. The software is free, you run your own copy,
          and what you write stays in your database.
        </p>

        {/* Six things it does, as the tile the rest of the site uses, made
            flat: these say what the software does and open nothing, and a
            tile that lifts under a finger is a door. Every glyph is the one
            the site already uses for that thing — the beacon's, the send's,
            Compare's shuffle — so none has to be learned twice. Hosting is
            HardDrives rather than the mock's key, because the key under GET
            ONE is the way in, and two keys on one pane would mean two things. */}
        <ul className="pt-tiles">
          <li className="ln-tile pt-tile"><Broadcast size={25} aria-hidden="true" />Show what you have on</li>
          <li className="ln-tile pt-tile"><Disc size={25} aria-hidden="true" />Rate every track, not just the album</li>
          <li className="ln-tile pt-tile"><PaperPlaneTilt size={25} aria-hidden="true" />Send music to friends</li>
          <li className="ln-tile pt-tile"><Shuffle size={25} aria-hidden="true" />Compare ratings side by side</li>
          <li className="ln-tile pt-tile"><BookOpen size={25} aria-hidden="true" />Look back on every listen</li>
          <li className="ln-tile pt-tile"><HardDrives size={25} aria-hidden="true" />Host it yourself, for free</li>
        </ul>

        {/* The foot, pushed to the bottom of a tall screen and following the
            tiles on a short one. GET ONE is a word and an arrow in the
            caption face, not a pill (2026-09-22) — the rest of the site has
            been taking its pills away. Under it the lock, because it is the
            one the keeper is looking for, and the source line last, smallest,
            where a colophon goes. The lock is a key, 2026-09-10, and the
            field opens under it in place — see WritingAccess. */}
        <div className="pt-foot">
          <a className="pt-get" href={HOME} target="_blank" rel="noopener noreferrer">
            Get one
            <ArrowRight size={17} aria-hidden="true" />
          </a>
          <WritingAccess onSignedIn={onSignedIn} />
          {/* The colophon: where the code is, and which version this is.
              Smallest type on the site, one line. */}
          <p className="pt-colophon">
            <a className="pt-source" href={SOURCE_URL} target="_blank" rel="noopener noreferrer">
              Source
            </a>
            <span className="pt-colophon-dot" aria-hidden="true">·</span>
            <a className="pt-source" href={RELEASE_URL} target="_blank" rel="noopener noreferrer" title="What this version contains">
              {VERSION}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
