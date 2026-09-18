// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
// components/main_components/Slug_Page/SenderTool.js
// Saying who gave you a record, on its own.
//
// ── Why it left the correction, 2026-09-16 ────────────────────────────────
// It was a field among fifteen, which filed the one thing on an entry that is
// about somebody else under fixing your own typos — and it meant the whole
// page had to become a form to answer a question with one answer. It is its
// own tool on the ··· now, and this is what that tool opens.
//
// ── And why it unfolds here rather than over the page ─────────────────────
// A form is about the thing next to it (DECISIONS, 2026-08-31), and this one
// goes exactly where its answer prints: in the Sent by slot under the chips,
// whether or not there is a line there yet. That is the difference between
// this and the send sheet, which is a screenful of controls with nowhere in
// the flow to live. Here there is somewhere.
//
// ── It saves itself ───────────────────────────────────────────────────────
// Rather than borrowing the entry editor's draft, which would put the whole
// page into correction mode to change one field. The route takes a partial
// patch — it has always decided what to write by what it was handed — so
// three fields go up and nothing else is touched. The read is the owner's
// one, which is the only read that carries the credit at all.
//
// No date is asked for and none defaults to today (DECISIONS, 2026-09-14):
// the entry's own date is the ceiling, and a confident wrong date corrupts
// every statistic after it. `received_date` belongs to the send flow, where
// the moment is exact.

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Check, User, X } from '@phosphor-icons/react';
import MiniAddressBook from '../MiniAddressBook';
import { journalUrl, tidyJournal } from '../../../library/return_address';

export default function SenderTool({ entry, barSlot = null, onDone }) {
  const router = useRouter();
  // ── Seeded from what the page already has ─────────────────────────────
  // The panel used to open blank, decide from that blankness that there was no
  // credit, draw the picker, and change its mind when the fetch landed — a
  // split second of the wrong screen on every already-credited album (Miyel,
  // 2026-09-17). It was doing the work twice and showing its working.
  //
  // It never had to guess. `withoutChain` puts `received_from` and
  // `received_from_url` on the public entry whenever the credit is public, so
  // the common case is answered before a request is made. The fetch still runs
  // — it is the only read that carries `credit_private`, and a quiet credit is
  // withheld from the public row entirely — but it now confirms rather than
  // decides.
  const [name, setName] = useState(entry.received_from || '');
  const [url, setUrl] = useState(entry.received_from_url || '');
  const [quiet, setQuiet] = useState(false);
  const [book, setBook] = useState([]);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [trouble, setTrouble] = useState('');
  // Whether the picker is showing. An entry that already names somebody opens
  // on the one question worth asking about it — whether to show their name —
  // and does not put a field and a row of faces on screen to answer it
  // (Miyel, 2026-09-17, on the first real try: "it loads my address book and
  // then pops to a new screen"). Changing who is a second press, which is the
  // right way round for the rarer thing.
  const [changing, setChanging] = useState(false);
  // Whether the name in the field was typed here, just now. The faces narrow
  // to what has been typed, which is right while somebody is searching and
  // wrong the moment the picker opens on a name that is already there: it
  // would show the one person already chosen and hide the book you opened it
  // to browse. So the strip narrows on typing and never on what it was
  // handed.
  const [typed, setTyped] = useState(false);
  // The bar is portalled into a slot the entry page holds open, and both
  // halves of that matter. It cannot render *here*, because this panel lives
  // inside .ln-screens — the phone's scroll container — and a fixed element
  // inside one measures itself against that box rather than the window. And it
  // cannot go to document.body either, which is where it went first: z-index
  // is per stacking context, and a bar at 140 sitting outside the layer
  // competes with the layer's own 200 and draws underneath it. The slot is a
  // sibling of .ln-screens, inside the layer, which is the one place that is
  // neither.

  // The credit is only on the owner's read of an entry, so this is fetched
  // rather than taken from what the page was rendered with. Until it lands
  // the fields stay disabled: a field drawn before then shows empty and would
  // save empty over what is stored.
  useEffect(() => {
    let gone = false;
    fetch(`/api/entries/${entry.slug}`)
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        const row = data?.entry;
        if (gone || !row || !('source_entry_id' in row)) return;
        setName(row.received_from ?? '');
        setUrl(row.received_from_url ?? '');
        setQuiet(row.credit_private === true);
        setReady(true);
      })
      .catch(() => {});
    fetch('/api/people')
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (!gone && d) setBook(Array.isArray(d.people) ? d.people : []); })
      .catch(() => {});
    return () => { gone = true; };
  }, [entry.slug]);

  const linked = tidyJournal(url || '');
  // And the third case, which the seed alone cannot cover: a credit the keeper
  // asked to keep quiet is stripped from the public row, so the name is not
  // there to seed with. Naming a sender always makes an entry a Submission, so
  // the *type* still says a sender exists even when the name does not travel.
  // That is enough to hold the credited shape while the name is fetched,
  // instead of flashing a picker at somebody who has already credited it.
  const surelyCredited = entry.entry_type === 'Submission';

  // Tapping a face links that journal; tapping the lit one unlinks it and
  // leaves the name. Typing never unlinks — their journal calls him
  // Zachin_Off and the entry can still say from Zach.
  const pick = p => {
    if (p.address === linked) { setUrl(''); return; }
    setName(p.name || p.address);
    setUrl(p.address);
    setTyped(false);
  };

  async function save() {
    setSaving(true);
    setTrouble('');
    try {
      const said = name.trim();
      const res = await fetch(`/api/entries/${entry.slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          received_from: said,
          // Emptying the name takes the link with it: a journal with nobody's
          // name on it is a link to somebody the entry does not name.
          received_from_url: said ? url : '',
          credit_private: said ? quiet : false,
          // ── The shelf follows the name, 2026-09-17 ────────────────────
          // The editor's Library / Submission buttons are gone and this is
          // where that fact is decided now, because it was always decided
          // here in practice: an entry is a submission exactly when somebody
          // sent it. Naming a sender makes it one; clearing the name puts it
          // back in the library, which the old arrangement never did — you
          // could clear the name and leave an entry claiming to be a
          // submission from nobody.
          entry_type: said ? 'Submission' : 'Personal Library',
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || data?.error) throw new Error(data?.error || 'That didn’t save. Try again.');
      router.refresh();
      onDone();
    } catch (err) {
      // Nothing is lost on a failure: the panel stays open with what was
      // typed still in it, which is the rule everywhere else here.
      setTrouble(err.message);
    } finally {
      setSaving(false);
    }
  }

  const named = Boolean(name.trim()) || (surelyCredited && !ready);
  const picking = changing || !named;

  return (
    <div className="ln-sender ln-sender--tool">
      {picking ? (
        <>
          <label className="ln-sender-row">
            <span className="ln-sender-label">Sent by</span>
            <input
              className="ln-field ln-field--sender"
              value={name}
              onChange={e => { setName(e.target.value); setTyped(true); }}
              placeholder={ready ? 'Start typing a name' : 'Reading…'}
              disabled={!ready}
              autoComplete="off"
              aria-label="Sent by"
            />
          </label>
          {/* Free text stays for somebody who sent a record and keeps no copy;
              the faces are for everybody who does. This row scrolls sideways,
              which is why the layer under it is frozen while this is open —
              see .ln-busy in LayerEntry. */}
          <MiniAddressBook people={book} linked={linked} narrow={typed ? name : ''} onPick={pick} />
        </>
      ) : (
        <>
          {/* A fact, not a form (Miyel, 2026-09-17). Somebody sent you this
              record; the panel says who, at the size a name is said at, and
              asks the one thing that is still open. The name was set in 19px
              bold for a day and read as a headline on somebody else's page.
              A face and a name, the way the feed and the address book say a
              person — this is the same person in the same journal. */}
          <p className="ln-sender-who">
            <span className="ln-sender-portrait" aria-hidden="true">
              <User size={16} weight="regular" />
              {linked && (
                <img
                  src={`${journalUrl(linked)}/api/portrait`}
                  alt=""
                  loading="lazy"
                  onError={e => { e.currentTarget.style.display = 'none'; }}
                />
              )}
            </span>
            {/* <strong> rather than the strip's .ln-sender-name, which is an
                8.5px uppercase label: reusing it turned Zach into ZACH. */}
            <strong>{name}</strong>
          </p>
          {/* Read the way round somebody thinks about it. The column is
              `credit_private` and the default is public, so the stored value is
              the negative one; the question on screen is not.
              
              **Why a keeper gets this at all** (DECISIONS, 2026-09-15): quiet
              is the *sender's* choice, and the send form asks them. This is
              for what that form cannot reach — a credit added by hand names
              somebody who was never asked, and this tool's main job is exactly
              those. Somebody who told you about a record in a kitchen never
              chose to be on your public page; this is how a no said out loud
              is honoured. */}
          <label className="ln-sender-toggle">
            <span>Show credit?</span>
            <input
              type="checkbox"
              role="switch"
              className="ln-switch"
              checked={!quiet}
              onChange={e => setQuiet(!e.target.checked)}
            />
          </label>
          {/* Pressable without being a pill. It was label-sized small caps
              first and did not read as a control at all; then a pill, which
              gave a rare, quiet action the same weight as Save. An underlined
              word is what is left, and it is what this site already uses for
              text that leads somewhere (.own-link). Rare on purpose: if
              somebody sent it to you, they sent it to you, and this is here
              for the credit added by hand and added wrong. */}
          <button type="button" className="ln-sender-change" onClick={() => setChanging(true)}>
            Edit sender
          </button>
        </>
      )}
      {trouble && <p className="ln-sender-trouble">{trouble}</p>}

      {/* Done and undone go at the foot of the screen, in the same bar a
          correction uses, saying Crediting where that one says Editing
          (Miyel, 2026-09-17). Two reasons, and the second is the better one.
          A panel that carries its own pair of buttons is a form inside a page
          that already has somewhere to put them; and a site with one editing
          chrome teaches it once. The pills went with the change — they gave a
          rare quiet action the same weight as Save, and Save is what this bar
          exists to make unmistakable. */}
      {barSlot && createPortal(
        <div className="ln-editing-bar">
          <span className="ln-editing-label">Crediting</span>
          <button type="button" className="ln-pin ln-pin--on" onClick={save} disabled={saving || !ready}>
            <Check size={13} weight="bold" aria-hidden="true" />
            <span>{saving ? 'Saving' : 'Save'}</span>
          </button>
          <button type="button" className="ln-pin" onClick={onDone} disabled={saving}>
            <X size={13} weight="bold" aria-hidden="true" />
            <span>Cancel</span>
          </button>
        </div>,
        barSlot,
      )}
    </div>
  );
}
