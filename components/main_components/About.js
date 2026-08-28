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
// Two things left this pane and are worth knowing where they went. The key —
// the legend for every mark in the journal — belongs on the entries where
// those marks are actually printed, so a reader meets a definition at the
// moment they meet the thing it defines rather than by remembering there is a
// page about it. And the source line moved to the pitch pane, which is the
// public page about the software rather than the public page about a person;
// see the note there, because that line is a licence obligation and not
// decoration.
//
// The writing here is three finished sentences rather than a paragraph. The
// long essay went to /get, which is the address every copy's pitch pane points
// at, and the free-text bio went with it: a blank box asking somebody to
// describe themselves gets a paragraph about the project, where an opening
// like "I can never skip —" gets two words worth reading. See
// library/bioprompt.js for the nine and why they are fixed.
//
// Nothing anybody reads here is in this file. The prompts ship in code and the
// answers come off the settings row, so a journal installed this morning has
// no answers and no rig, and the pane is exactly the card and nothing else —
// and because HomeNav decides whether to draw a down caret by measuring the
// pane rather than by being told, that copy also gets no arrow pointing at
// nothing.

'use client';
import { useEffect, useMemo, useState } from 'react';
import { ArrowSquareOut, CaretDown, Check, LinkSimple } from '@phosphor-icons/react';
import IdentityCard, { identify, readLink, rigIcon } from './IdentityCard';
import { useIdentificationCardEditor } from './IdentificationCardEditor';
import { useBookplate } from './Bookplate';
import { BIO_PROMPTS, CARD_PROMPT, readBioAnswers } from '../../library/bioprompt';

// Three, and the cap is the point. Somewhere to be found is not somewhere to
// list every account anybody has ever opened — a row of three marks reads at a
// glance and a row of nine reads as a footer.
const LINK_LIMIT = 3;

export default function About({ stamps, authed = false }) {
  const settings = useBookplate();
  const { bioanswers, rig: rigRows, rig_icon, social_links, instagram_url } = settings;

  // One edit session for the pane, owned here and handed to the card. The card
  // used to make its own, which was fine while everything editable was printed
  // on it; the prompts print below it now, and two instances of the hook would
  // be two drafts of the same page with one save button between them.
  const edit = useIdentificationCardEditor(settings);

  // Which slot has its list of openings open, if any. One at a time, the same
  // way the card's mark chooser works — two lists of nine sentences open at
  // once is most of the pane.
  const [picking, setPicking] = useState(null);
  // Escape closes it, because anything that opens over the page has to have a
  // way out that is not aiming at a particular pixel. Leaving edit mode closes
  // it too: the list belongs to an edit, not to the pane.
  useEffect(() => {
    if (picking === null) return;
    const onKey = event => { if (event.key === 'Escape') setPicking(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [picking]);
  // Derived rather than reset in an effect: the list only means anything
  // inside an edit, so it is read through that instead of being cleared when
  // the edit ends. An effect that only calls setState is a render asking to
  // happen twice.
  const openSlot = edit.editing ? picking : null;

  // Three finished openings, which is what a bio is here. The one the card may
  // print is dropped from this list rather than repeated — it sits above the
  // Send button a screen up, and the same sentence twice on one pane reads as
  // a mistake rather than as emphasis.
  const answered = readBioAnswers(bioanswers).filter(row => row.key !== CARD_PROMPT);
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

  return (
    <div className="ab-pane">
      <div className="ab-card">
        <IdentityCard stamps={stamps} authed={authed} edit={edit} />
      </div>

      {/* Where the card ends and the reading starts. This boundary was a snap
          point for a day — proximity snapping, to catch a reader settling onto
          it — and it came out because what it actually did was argue with the
          thumb, pulling back toward a line somebody had deliberately gone
          past. The entrance to a pane's lower half wants designing properly;
          until it is, this is just where one thing stops and the next
          begins. */}
      <div className="ab-below">
        {/* The prompts. Prompt and answer on one line, because they are one
            sentence: "I can never skip — Voodoo, side two" is a thought, and
            the same words as a label over a value are two things stacked. The
            opening carries its own em dash for the same reason — it is grammar
            rather than layout. */}
        {edit.editing ? (
          <section className="ab-block ab-block--prompts">
            {/* Three slots, always three. A list that grows as you answer makes
                "how many am I supposed to write" a question the interface asks
                instead of answers.

                A native select, not a grid of choices: nine full sentences do
                not fit as marks, and on a phone the system picker is a better
                list than anything drawn here. Openings already taken elsewhere
                are still offered — picking one swaps the two rather than
                refusing, so nothing has to be cleared to make a move somebody
                has already decided on. */}
            {edit.bio.map((row, index) => {
              const chosen = BIO_PROMPTS.find(p => p.key === row.key) || null;
              const open = openSlot === index;
              return (
                <div className="ab-prompt-edit" key={index}>
                  {/* The opening, as the thing you press to change it. A native
                      select would draw the system's own grey control, which is
                      the only bevelled thing on a site made of rules and type —
                      so this is the card's mark chooser in words: press the
                      line, the list opens under it, press a line to take it. */}
                  <button
                    type="button"
                    className={'ab-prompt-pick' + (open ? ' ab-prompt-pick--on' : '')}
                    onClick={() => setPicking(open ? null : index)}
                    aria-expanded={open}
                    aria-label={`Opening ${index + 1}`}
                  >
                    <span className={chosen ? 'ab-prompt-ask' : 'ab-prompt-none'}>
                      {chosen ? chosen.text : 'Choose an opening'}
                    </span>
                    <CaretDown size={11} weight="bold" aria-hidden="true" />
                  </button>

                  {open && (
                    <div className="ab-prompt-menu" role="group" aria-label="Openings">
                      {BIO_PROMPTS.map(prompt => {
                        const on = prompt.key === row.key;
                        // Openings already used in another slot stay on the
                        // list. Picking one swaps the two rather than refusing,
                        // so nothing has to be cleared to make a move somebody
                        // has already decided on — but it is marked, because a
                        // swap you did not expect reads as a bug.
                        const elsewhere = !on && edit.bio.some((r, i) => i !== index && r.key === prompt.key);
                        return (
                          <button
                            key={prompt.key}
                            type="button"
                            className={'ab-prompt-opt' + (on ? ' ab-prompt-opt--on' : '') + (elsewhere ? ' ab-prompt-opt--taken' : '')}
                            onClick={() => { edit.setBioKey(index, prompt.key); setPicking(null); }}
                            aria-pressed={on}
                          >
                            <span>{prompt.text}</span>
                            {on && <Check size={12} weight="bold" aria-hidden="true" />}
                            {elsewhere && <span className="ab-prompt-taken" aria-hidden="true">in use</span>}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <input
                    className="ab-prompt-input"
                    type="text"
                    value={row.answer}
                    onChange={e => edit.setBioAnswer(index, e.target.value)}
                    placeholder={row.key ? 'Finish the sentence' : ''}
                    disabled={!row.key}
                    aria-label={chosen ? chosen.text : `Answer ${index + 1}`}
                  />
                </div>
              );
            })}
          </section>
        ) : answered.length > 0 && (
          <section className="ab-block ab-block--prompts">
            {answered.map(row => (
              <p className="ab-prompt" key={row.key}>
                <span className="ab-prompt-ask">{row.text}</span>{' '}
                <span className="ab-prompt-said">{row.answer}</span>
              </p>
            ))}
          </section>
        )}

        {/* The free-text bio used to print here and does not. A blank box is a
            hard question badly phrased: asked to describe yourself you write a
            paragraph about the project, asked what you can never skip you
            write two words worth reading. The column still holds whatever was
            written in it — see about_intro in app/layout.js — and an optional
            free-text field alongside the prompts is a later decision, because
            it is much easier to add one than to take one away once people have
            filled it in. */}

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
              Find me
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

      </div>
    </div>
  );
}
