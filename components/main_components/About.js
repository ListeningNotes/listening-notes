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
// The writing here is the short version. The long essay lived on this pane for
// a while and has gone to /get, which is the address every copy's pitch pane
// points at — the story of why somebody started keeping a listening journal is
// the answer to "how did you get this", and it was doing that job from the
// wrong page. What is left is a paragraph: who this is, in the space where a
// reader is still deciding whether to keep reading.
//
// Nothing here is in this file. Every word comes off the settings row, so a
// journal installed this morning has no paragraph and no rig, and the pane is
// exactly the card and nothing else — and because HomeNav decides whether to
// draw a down caret by measuring the pane rather than by being told, that copy
// also gets no arrow pointing at nothing.

'use client';
import Link from 'next/link';
import { useMemo } from 'react';
import { ArrowSquareOut, LinkSimple } from '@phosphor-icons/react';
import IdentityCard, { identify, readLink, rigIcon } from './IdentityCard';
import { useBookplate } from './Bookplate';

// Three, and the cap is the point. Somewhere to be found is not somewhere to
// list every account anybody has ever opened — a row of three marks reads at a
// glance and a row of nine reads as a footer.
const LINK_LIMIT = 3;

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
// structure for prose, little enough that the owner is editing writing in a
// box rather than markup. The same parser /get uses, so a paragraph reads the
// same wherever it is printed.
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

export default function About({ stamps, authed = false }) {
  const { about_intro, rig: rigRows, rig_icon, social_links, instagram_url } = useBookplate();

  // One column, not two. why_essay used to be concatenated on after this and
  // is at /get now. Blank renders nothing, which is what keeps a fresh copy's
  // pane down to the card alone.
  const prose = blocks(about_intro);
  // Same filter the card applies, for the same reason: a row with no name is a
  // row somebody started and abandoned in the editor, and it should not print.
  const rigList = (Array.isArray(rigRows) ? rigRows : []).filter(r => r?.name?.trim());
  const rig = rigIcon(rig_icon);
  const RigMark = rig?.Icon;

  // Where else this person can be found. They used to be marks in the row
  // beside "Send an album" on the card, which put "here is somebody's Instagram"
  // next to the one thing the card is actually for. At the foot of the reading
  // they answer the question the reading has just raised: having read about
  // somebody, you might want to go and find them.
  //
  // instagram_url predates the list and is folded in rather than made to move,
  // de-duplicated on the href so an owner who has it in both places gets one.
  const socials = useMemo(() => {
    const stored = Array.isArray(social_links) ? social_links.map(readLink) : [];
    const raw = instagram_url ? [{ url: instagram_url, icon: 'auto' }, ...stored] : stored;
    const seen = new Set();
    return raw
      .filter(l => l.url?.trim())
      .map(l => identify(l.url.trim(), l.icon))
      .filter(l => l && !seen.has(l.href) && seen.add(l.href))
      .slice(0, LINK_LIMIT);
  }, [social_links, instagram_url]);

  // One door out of this pane, and deliberately not two. The essay at /get is
  // not linked from here: /get does not exist on a copy that has not written
  // one, so a pill pointing at it would be a dead link on everybody else's
  // journal. The pitch pane is where that address is reached, and it reaches
  // the canonical one by its full address rather than by a path.
  //
  // The key stays a route because it is arrived at from elsewhere: it is the
  // legend for every mark in the journal, and a reader looking up what a
  // diamond means has come from an entry, not from here.
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

      {/* Where the card ends and the reading starts. This boundary was a snap
          point for a day — proximity snapping, to catch a reader settling onto
          it — and it came out because what it actually did was argue with the
          thumb, pulling back toward a line somebody had deliberately gone
          past. The entrance to a pane's lower half wants designing properly;
          until it is, this is just where one thing stops and the next
          begins. */}
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

        {socials.length > 0 && (
          <section className="ab-block">
            {/* Headed like the rig above it, because it is the same kind of
                thing: a short list of facts about somebody, at the end of the
                writing about them. Unheaded it was a row of marks floating
                between the rig and the pills with nothing saying what they
                were. */}
            <h2 className="ab-subhead">
              <LinkSimple size={15} weight="regular" aria-hidden="true" />
              Elsewhere
            </h2>
            <div className="ab-links">
              {socials.map(({ href, label, Icon }) => (
                <a
                  key={href}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ab-link"
                  aria-label={label}
                  title={label}
                >
                  <Icon size={20} weight="regular" aria-hidden="true" />
                </a>
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
