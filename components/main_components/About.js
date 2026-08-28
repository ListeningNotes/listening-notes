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
// Everything below the card is blank on a fresh copy and therefore absent on
// one. A journal installed this morning has no paragraph, no rig and no note,
// so this pane is exactly the card and nothing else — and because HomeNav
// decides whether to draw a down caret by measuring the pane rather than by
// being told, that copy also gets no arrow pointing at nothing.

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

// A text column holding prose, drawn as paragraphs rather than one block with
// newlines in it. Blank lines separate; a single newline inside a paragraph is
// somebody's line wrap and not a new thought, so it is left alone.
function paragraphs(text) {
  return String(text || '')
    .split(/\n\s*\n/)
    .map(block => block.trim())
    .filter(Boolean);
}

export default function About({ stamps, authed = false }) {
  const { about_intro, rig: rigRows, rig_icon, has_note: hasNote } = useBookplate();

  const prose = paragraphs(about_intro);
  // Same filter the card applies, for the same reason: a row with no name is a
  // row somebody started and abandoned in the editor, and it should not print.
  const rigList = (Array.isArray(rigRows) ? rigRows : []).filter(r => r?.name?.trim());
  const rig = rigIcon(rig_icon);
  const RigMark = rig?.Icon;

  // Two doors out of this pane, both to writing too long to sit in it. They
  // are real routes rather than more of this scroll because they are arrived
  // at from elsewhere too — the key is the legend for every mark in the
  // journal, and a reader looking up what a diamond means has come from an
  // entry, not from here.
  const doors = (
    <div className="ab-doors">
      {hasNote && <Link href="/why" className="ln-pill">The note</Link>}
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
              {prose.map((para, i) => <p key={i}>{para}</p>)}
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
