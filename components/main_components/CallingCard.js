// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';

// components/main_components/CallingCard.js
// Whose journal this is, at the foot of the beacon, for somebody who is not
// its keeper.
//
// ── The card's stub ───────────────────────────────────────────────────────
// This is not a new set of controls. The identity card already carries the
// face, the name and these two words beside it (IdentityCard.js, the
// `.idc-ident` row), and it has since the card was built. What is here is that
// row at the size the beacon floor can afford — the same move the beacon
// itself made on 2026-09-18, one object at two sizes, rather than a second
// object that happens to do the same job. Press the face or the name and you
// are on the card, which is one pane left, which is where the rest of it is.
//
// ── Why it stands where the way in stands ─────────────────────────────────
// The slot under the record is the floor's one question: what now. Signed in,
// the answer is START A LISTEN. Not signed in, there was nothing there at all
// — a quarter of the screen of nothing, measured on 2026-09-18 — because the
// only thing that ever stood in it belonged to the owner. So the slot holds
// whichever answer fits whoever is looking, and neither of them ever sees the
// other's.
//
// ── The floor's voice, not the card's ─────────────────────────────────────
// The name is set in the captions' type and not the card's display face. On
// the card the name is the largest thing on the pane and should be; here the
// record is, and a keeper's name in 30px under a cover would be arguing with
// it. Everything else on this floor — LAST LOGGED, BEFORE THAT, START A
// LISTEN — is a small mono line, and so is this.

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useBookplate } from './Bookplate';
import { PaperPlaneTilt, Plus } from '@phosphor-icons/react';
import { journalUrl, knownHere, recallSender, subscribeSender } from '../../library/return_address';

// useSyncExternalStore wants a server snapshot, and the server cannot know
// whether the reader keeps a journal — so on the server nobody does, and the
// Add pill appears on the client if it is wanted. Module-level so the store
// reads a stable function.
const readNothing = () => false;
const readNothingSaid = () => '';
const readHome = () => recallSender().address || '';

export default function CallingCard({ onOpenCard }) {
  const { cover_name, portrait_url, portrait_position, site_address } = useBookplate();

  // ── Add ─────────────────────────────────────────────────────────────────
  // The same press the card makes, and the same small print: a journal cannot
  // write into somebody else's address book, because that book lives on their
  // copy and this one can never see it. What it can do is hand over the one
  // address it is certain of — its own, the page on screen — and say it has.
  // Everything social lives on the visitor's copy (DECISIONS, The network).
  //
  // Never for the owner: this whole piece is drawn only for a visitor, so
  // there is nobody here with nothing to add themselves to.
  const address = site_address ? site_address.replace(/^https?:\/\//, '') : null;

  // Hidden from a visitor whose own copy said, arriving, that this journal is
  // already in their book. Cold, it shows — the journal has no way to know and
  // does not go looking.
  const known = useSyncExternalStore(subscribeSender, knownHere, readNothing);
  // ── Where this reader keeps their own journal, if this one has been told ──
  // A journal never learns who is reading it — but a keeper arriving from
  // their own address book, feed, inbox or person's page comes through a link
  // their copy wrote, and that link carries their name and address. Sending a
  // record from this browser leaves the same thing behind. Either way it is
  // held here, at this origin, by the reader's own browser (return_address).
  //
  // Read through the store rather than off localStorage during render: the
  // server cannot know it, and a component that renders one thing on the
  // server and another in the browser is a hydration mismatch.
  const home = useSyncExternalStore(subscribeSender, readHome, readNothingSaid);
  const [added, setAdded] = useState(false);
  const addedTimer = useRef(null);
  useEffect(() => () => clearTimeout(addedTimer.current), []);
  function pressAdd() {
    if (!address || !navigator.clipboard?.writeText) return;
    navigator.clipboard.writeText(address).then(() => {
      setAdded(true);
      clearTimeout(addedTimer.current);
      addedTimer.current = setTimeout(() => setAdded(false), 2600);
    }).catch(() => {});
  }

  return (
    <div className="calling">
      {/* The face and the name are one target. A copy with no portrait draws
          no bubble at all rather than a grey stand-in head — an empty circle
          where a face goes reads as a picture that failed to load, and the
          name on its own is still the whole of what this line has to say. The
          card falls back to its address code there, which is a fine object at
          260px and unreadable at 34. */}
      {/* ── The face is the circle, 2026-09-20 ──────────────────────────
          Miyel, on the signed-out beacon: "let's have it match the new beacon
          design — the round photo is the pfp replacing log listen, and the
          add and send can take left and right sides of the circle."

          Which is the same move this file has always made, one step further:
          the slot under the record holds whichever answer fits whoever is
          looking, and the keeper's answer became a circle on the rule an hour
          ago. A visitor's is the keeper's face in that circle, with the two
          things a reader can do about it either side.

          The name is on the label rather than in the row now. There is
          nowhere in a circle to put it and nowhere beside one that does not
          make a third thing on a line that has three already — and it is the
          first line of the card, which is one pane left and is what pressing
          this opens. */}
      <button
        type="button"
        className="calling-who"
        onClick={onOpenCard}
        aria-label={cover_name ? `About ${cover_name}` : 'About this journal'}
        title={cover_name || 'About this journal'}
      >
        {portrait_url && (
          <img
            src={portrait_url}
            alt=""
            aria-hidden="true"
            className="calling-face"
            /* Framed the way its keeper framed it. The card lets the portrait
               be dragged inside its box and keeps where it was left; a face
               centred here and off-centre there would be two pictures. */
            style={{ objectPosition: portrait_position || '50% 50%' }}
          />
        )}
      </button>
      {/* ── One line, words ───────────────────────────────────────────────
          Miyel's mock-up, 2026-09-19, and the end of a day of trying boxes:
          the card's filled pill, two bare mono lines, the entry editor's round
          flag, the entry's squared tag. Her note under the drawing settles why
          none of them was it — "the owner's start line has the same shape: one
          row at the foot, caption face, no boxes." The way in is a glyph and a
          word with nothing round it, and a visitor's two controls stand in the
          same slot, so they are a glyph and a word with nothing round them.
          Every box tried today was a box in a room that has none.

          ADD before SEND, and one word each. The mock-up puts them in that
          order and it is the right one: taking somebody's address is the small
          thing you can do in a second, sending them a record is the errand you
          came back for, and the eye lands on the last one.

          One word each because the row is wide (Miyel, 2026-09-19: "since it's
          longer it's fine to just say add and send"). The taller mock-up spelt
          the second one SEND A RECORD, which it had the room for and this does
          not — and beside a record, under a record's name, SEND is not
          ambiguous about what would be sent.

          Smaller than the way in, and smaller than they were: the owner's
          START A LISTEN is the only thing on its version of this floor and can
          be the size of one, where these two stand at the end of a row that
          already has a face and a name in it. A hairline stood between them
          for half an hour and came out with the same edit — at this size the
          space does the dividing.

          `.ln-onward` is the way in's own class — which is what it has always
          been, the quiet control of this screen rather than one particular
          control. */}
      {/* ── Add ────────────────────────────────────────────────────────
            Two presses wearing one word, because there are two things a
            journal can do for a reader's address book and which one depends
            on something it may not know.

            Knowing where the reader keeps their own journal, it hands them
            back to it with this address in the link, and their copy files it
            — the only place the writing can happen, since nothing at this
            address may write to theirs. Miyel, 2026-09-19, on the trade of
            leaving this page to do it: "I think it's fair, because it lands
            you exactly where you need to be to easily get back."

            Not knowing — a reader who arrived from a text, a code or a search
            — it copies the address and says so, which is what it has always
            done and all it can honestly do. It does not ask, and it does not
            guess: a journal that started requesting the reader's address
            would be a journal learning who reads it.

            A plain <a> and not a Link: the destination is somebody else's
            copy at another address, which is not this app's router's to
            prefetch or own. */}
        {address && !known && (home ? (
          <a
            className="ln-onward"
            href={`${journalUrl(home)}/dashboard/people?add=${encodeURIComponent(address)}`}
            title={`Add this journal to your book on ${home}`}
          >
            <Plus size={14} weight="regular" aria-hidden="true" />
            Add
          </a>
        ) : (
          <button
            type="button"
            className="ln-onward"
            onClick={pressAdd}
            aria-live="polite"
            title="Copy this journal's address for your address book"
          >
            <Plus size={14} weight="regular" aria-hidden="true" />
            {added ? 'Copied' : 'Add'}
          </button>
        ))}
      <Link href="/submit" className="ln-onward">
        <PaperPlaneTilt size={14} weight="regular" aria-hidden="true" />
        Send
      </Link>
    </div>
  );
}
