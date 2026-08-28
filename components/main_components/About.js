// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/main_components/About.js
// The left pane of the cross: who keeps this journal.
//
// This is the about page. Not a link to one — the page itself, sitting where
// the card used to have to be turned over to reach. The flip is gone: a card
// with a front and a back meant the same object existed in two places and
// neither was the canonical one, and the pane it turned into is a place you
// can be, which the back of a sheet never was.
//
// The card leads and the writing follows it. That order is the whole argument
// for the pane: a card is a glance and prose is a sit-down, and on one screen
// you had to choose which of the two the page was for. Down the pane, the
// glance comes first and the sit-down is there for whoever wants it.
//
// The writing under the card is the whole of it, not a preview with a link to
// the rest. The long note used to be its own page behind a pill, which made
// the about page a summary of an about page — you read four lines and then
// pressed something to read the writing. Both columns print here now, the lede
// first, set identically, and a reader cannot tell where one ends.
//
// Nothing here is in this file. Every word comes off the settings row, so a
// journal installed this morning has no paragraph, no note and no rig, and the
// pane is exactly the card and nothing else — and because HomeNav decides
// whether to draw a down caret by measuring the pane rather than by being
// told, that copy also gets no arrow pointing at nothing.

'use client';
import Link from 'next/link';
import { ArrowSquareOut } from '@phosphor-icons/react';
import IdentityCard, { rigIcon } from './IdentityCard';
import { useBookplate } from './Bookplate';

// Where this copy's source lives. AGPL §13 is satisfied by offering the source
// of *the running program*, which for a modified copy is that copy's own
// repository and not this one — so an owner who has changed anything points
// this at their fork. Defaulted to upstream, because the honest answer for an
// unmodified copy is upstream and nobody should have to think about compliance
// to install a journal.
//
// TODO: this belongs in settings alongside about_intro, so it can be changed
// without a redeploy. An environment variable is the smaller half of the job
// and ships today; the column is a separate decision.
const SOURCE_URL =
  process.env.NEXT_PUBLIC_SOURCE_URL || 'https://github.com/miyelbrown/listening-notes';

// The one convention the stored prose uses, and no more: a blank line
// separates blocks, and a line starting with "## " is a heading. Enough
// structure for an essay, little enough that the owner is editing prose in a
// box rather than markup. The same parser /why has used since it was written —
// the writing moved, so the reading of it has to move identically or the same
// text renders two different ways on two pages.
//
// A single newline inside a block is somebody's line wrap and not a new
// thought, so it is left alone.
function blocks(text) {
  return String(text || '')
    .split(/\n\s*\n/)
    .map(block => block.trim())
    .filter(Boolean)
    .map(block => block.startsWith('## ')
      ? { type: 'heading', text: block.slice(3).trim() }
      : { type: 'paragraph', text: block });
}

export default function About({ stamps, authed = false, note = '' }) {
  const { about_intro, rig: rigRows, rig_icon } = useBookplate();

  // The lede and the essay, in that order and set identically — this is one
  // piece of writing that happens to live in two columns, and a reader should
  // not be able to tell where one ends and the other begins.
  //
  // has_note is not consulted any more. It existed to decide whether to draw a
  // link to a page that might not exist; the writing is on this pane now, and
  // an empty column simply renders no blocks. A fresh copy has neither, so the
  // pane is exactly the card — which is also what stops HomeNav drawing a down
  // caret at it.
  const prose = [...blocks(about_intro), ...blocks(note)];
  // Same filter the card applies, for the same reason: a row with no name is a
  // row somebody started and abandoned in the editor, and it should not print.
  const rigList = (Array.isArray(rigRows) ? rigRows : []).filter(r => r?.name?.trim());
  const rig = rigIcon(rig_icon);
  const RigMark = rig?.Icon;

  // One door out of this pane. The note used to be the other, and is not any
  // more — it is the pane. What is left is the key, which stays a route
  // because it is arrived at from elsewhere: it is the legend for every mark
  // in the journal, and a reader looking up what a diamond means has come from
  // an entry, not from here.
  const doors = (
    <div className="ab-doors">
      <Link href="/key" className="ln-pill">The key</Link>
    </div>
  );

  return (
    <div className="ab-pane">
      <div className="ab-card">
        <IdentityCard stamps={stamps} authed={authed} />
      </div>

      {/* A snap point, but a soft one. The top of this block is where the card
          ends and the reading starts, and that boundary is worth settling
          onto — it is the thing the old two-screen cover did that made it feel
          like pages rather than one long column. Soft because the writing
          below it is prose: proximity snapping (see .hn-pane in globals.css)
          catches you at the boundary and then leaves you alone, where
          mandatory would drag you back to it mid-paragraph. */}
      <div className="ab-below">
        {prose.length > 0 && (
          <section className="ab-block">
            <div className="ab-prose">
              {prose.map((block, i) => block.type === 'heading'
                ? <h2 key={i} className="ab-prose-head">{block.text}</h2>
                : <p key={i}>{block.text}</p>
              )}
            </div>
          </section>
        )}

        {rigList.length > 0 && (
          <section className="ab-block">
            {/* The rig used to come up from the bottom of the card in a
                drawer, which was the right answer while the card was the whole
                page and the wrong one the moment the page could scroll. A
                drawer is what you build when there is nowhere to put
                something. There is somewhere now.

                The rows and nothing else. There were once several hundred
                words under these about why any of it matters, and they are
                staying out: what is worth saying here is what the thing is
                and what it does, and the rest is the journal. Hardcoded they
                would also be one person's essay shipped inside everybody's
                copy — see the note on the rig column in schema.sql. */}
            <h2 className="ab-subhead">
              {RigMark && <RigMark size={15} weight="regular" aria-hidden="true" />}
              Rig setup
            </h2>
            <div className="ab-rig">
              {rigList.map((item, i) => (
                <div className="ab-rig-row" key={item.name + i}>
                  {item.href ? (
                    <a className="ab-rig-name" href={item.href} target="_blank" rel="noopener noreferrer">
                      {item.name}
                      <ArrowSquareOut size={13} weight="bold" aria-hidden="true" />
                    </a>
                  ) : (
                    <span className="ab-rig-name">{item.name}</span>
                  )}
                  <span className="ab-rig-role">{item.role}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {doors}

        {/* The smallest type on the site, at the foot of the pane nobody
            scrolls to by accident. AGPL §13 asks that anyone using the program
            over a network be offered its source; this is that offer, made once,
            in the one place on a journal where somebody wondering what the
            software is would think to look. No version number: a version is a
            thing to keep current, and a line that goes stale is worse than a
            line that is simply true. */}
        <a className="ab-source" href={SOURCE_URL} target="_blank" rel="noopener noreferrer">
          Source
        </a>
      </div>
    </div>
  );
}
