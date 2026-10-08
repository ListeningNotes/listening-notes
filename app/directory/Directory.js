// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';

// app/directory/Directory.js
// Everyone: the journals that chose to be findable, as a page of people.
//
// From Miyel's directory instructions, 2026-10-07, in the look she settled
// the same evening ("lets make it feel more like a true page, pfp"). It makes
// one request to DIRECTORY_URL and draws what comes back; it never asks any
// journal for its beacon itself — the registry keeps the last beacon it saw
// from each, so a reader never waits on a fetch. If the registry cannot be
// reached it says so in one line, and nothing else in the journal is
// touched.
//
// ── Two places, one list, 2026-10-07 ───────────────────────────────────────
// The same evening the list moved into the People tab (Miyel: "people is all
// the users (directory style) and friends are also there"), as the second of
// the tab's two words: Friends · Everyone. `Everyone` is that list, drawn on
// the cross for the keeper and for anybody visiting, and drawn again at this
// page's own address for a stranger who was handed the link.
//
// For the keeper it carries what only a keeper can do: being findable, which
// sits at the top of the list rather than in Settings ("joining can be on
// this screen instead of burried in settings"), and adding somebody to the
// address book — a press on a row opens its doors, Visit and Add, the way a
// face in Friends opens its own ("I like a plus idea besides people maybe
// when you click them"). Somebody already in the book wears a check instead
// of the plus. A visitor gets the list and nothing of the keeper's: no
// switch, no checks — which would say who the keeper added (AGENTS, Never) —
// and a row is simply the way to that journal.
//
// A row is a name and a beacon — the keeper's face in a circle, lit as the
// book lights it when they are logging, their name, what they are on or last
// logged, and the record's cover — and never a number beside a person. The
// only numbers are the community's: how many journals are listed and how
// many are logging right now (AGENTS, Never). No journal's address is printed;
// it lives in the link, as everywhere else, and this is exactly the page
// where printing it is tempting.
//
// Searching by album — who else has written about this — is a second phase,
// and not here.

import { useCallback, useEffect, useRef, useState } from 'react';
import { BookOpen, Check, Plus, User } from '@phosphor-icons/react';
import SiteNav from '../../components/main_components/SiteNav';
import WaveSheet from '../../components/main_components/WaveSheet';
import { useBookplate } from '../../components/main_components/Bookplate';
import { DIRECTORY_URL } from '../../library/version';
import { carrySender, journalUrl, tidyJournal } from '../../library/return_address';

// The mock-up's words for a journal whose keeper has not said their name.
const NO_NAME = 'A journal with no name yet';

const journalsWord = n => `${n} ${n === 1 ? 'journal' : 'journals'}`;

// Where the software is got from: /get on the copy the registry lives on,
// which a stranger without a gift link meets as the handed-out page.
const GET_URL = (() => {
  try { return `${new URL(DIRECTORY_URL).origin}/get`; } catch { return ''; }
})();

// Said by the switch: the directory's own host, without the www.
const WHERE = tidyJournal(DIRECTORY_URL).replace(/^www\./, '');

// Their journal's own portrait, read straight off it and never kept here,
// in a circle; the plain mark when there is none. Lit as the book lights a
// face whose beacon says logging (forms.css, .fr-one--live).
function Face({ journal }) {
  const live = journal.state === 'logging';
  return (
    <span className={'dir-face' + (live ? ' dir-face--live' : '')} aria-hidden="true">
      <span className="dir-face-in">
        <User size={20} weight="regular" />
        <img
          src={`${journalUrl(journal.address)}/api/portrait`}
          alt=""
          loading="lazy"
          onError={e => { e.currentTarget.style.display = 'none'; }}
        />
      </span>
    </span>
  );
}

function Cover({ art }) {
  return (
    <span className="dir-cover" aria-hidden="true">
      {art
        ? <img src={art} alt="" loading="lazy" onError={e => { e.currentTarget.style.display = 'none'; }} />
        : <span>&#9834;</span>}
    </span>
  );
}

// What every row says, whoever is reading: the face, the name, the beacon,
// the cover — and, for the keeper, one mark at the very end: a check for
// somebody already in the book, YOU on their own row.
function Inside({ journal, mark = null }) {
  const live = journal.state === 'logging';
  const said = journal.state === 'logging' || journal.state === 'logged';
  return (
    <>
      <Face journal={journal} />
      <span className="dir-who">
        <span className={'dir-name' + (journal.name ? '' : ' dir-name--none')}>{journal.name || NO_NAME}</span>
        {said ? (
          <>
            <span className={'dir-state' + (live ? ' dir-state--live' : '')}>{live ? 'Now logging' : 'Last logged'}</span>
            <span className="dir-rec-title">{journal.album}</span>
            {journal.artist && <span className="dir-rec-by">{journal.artist}</span>}
          </>
        ) : (
          <span className="dir-state">Nothing logged yet</span>
        )}
      </span>
      <span className="dir-end">
        {said && <Cover art={journal.art} />}
        {mark === 'book' && (
          <span className="dir-mark" title="In your address book">
            <Check size={17} weight="bold" aria-label="In your address book" />
          </span>
        )}
        {mark === 'you' && <span className="dir-mark dir-mark--you">You</span>}
      </span>
    </>
  );
}

// ── Being findable ──────────────────────────────────────────────────────────
// The keeper's switch, at the head of the list it puts them in. What it means
// is said before the press (her instructions: "say the consequence before the
// press, not after"); pressing it lists or delists through /api/listing, and
// `onChange` asks for the list again so the keeper's own row arrives or goes.
function Findable({ onChange }) {
  const [listed, setListed] = useState(null);   // null until asked
  const [busy, setBusy] = useState(false);
  const [trouble, setTrouble] = useState('');

  useEffect(() => {
    fetch('/api/listing')
      .then(r => (r.ok ? r.json() : null))
      .then(d => setListed(Boolean(d?.listed)))
      .catch(() => setListed(false));
  }, []);

  async function flip(next) {
    setBusy(true);
    setTrouble('');
    try {
      const res = await fetch('/api/listing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listed: next }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || d.error) throw new Error(d.error || 'That did not work. Nothing changed.');
      setListed(Boolean(d.listed));
      onChange?.();
    } catch (e) {
      setTrouble(e.message);
    }
    setBusy(false);
  }

  return (
    <div className="dir-join">
      <p className="dir-join-said">
        {listed
          ? <>You&rsquo;re in the list below. Anyone can see your name, your face and what you&rsquo;re listening to. Your entries stay where they are.</>
          : <>Anyone can see your name, your face and what you&rsquo;re listening to, here and at {WHERE}. Your entries stay where they are.</>}
      </p>
      <label className="dir-join-line">
        <span>Be findable</span>
        <input
          type="checkbox"
          role="switch"
          className="ln-switch"
          checked={Boolean(listed)}
          disabled={busy || listed === null}
          onChange={e => flip(e.target.checked)}
        />
      </label>
      {(busy || trouble) && (
        <p className="dir-join-foot">
          {busy && <span role="status">{listed ? 'Taking it off…' : 'Listing…'}</span>}
          {trouble && <span className="dir-join-trouble" role="alert">{trouble}</span>}
        </p>
      )}
    </div>
  );
}

// ── The list ────────────────────────────────────────────────────────────────
// `keeper` is whether the person looking keeps this journal (the cross's lock
// has said so). `refreshRef`, when given, is handed the way to ask again, for
// the pull at the top of the pane.
export function Everyone({ keeper = false, refreshRef = null }) {
  const { keeper_name: myName, site_address: myAddress } = useBookplate();
  const me = { name: myName, address: myAddress };
  const mine = tidyJournal(myAddress);

  // null until the registry has answered; `down` once it could not and there
  // is nothing older to keep showing.
  const [page, setPage] = useState(null);
  const [down, setDown] = useState(false);
  const [asking, setAsking] = useState(false);
  const had = useRef(false);

  // The keeper's book, by address, for the checks; the row whose doors are
  // open; the one being filed; what filing it said; the wave it offers.
  const [book, setBook] = useState(() => new Map());
  const [open, setOpen] = useState('');
  const [adding, setAdding] = useState('');
  const [said, setSaid] = useState('');
  const [wavingTo, setWavingTo] = useState(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch(DIRECTORY_URL, { cache: 'no-store' });
      if (!r.ok) throw new Error(String(r.status));
      const d = await r.json();
      had.current = true;
      setDown(false);
      setPage({
        listed: Number(d?.listed) || 0,
        logging: Number(d?.logging) || 0,
        journals: Array.isArray(d?.journals) ? d.journals : [],
        next: d?.next || null,
      });
    } catch {
      // A list already on the screen stays there: a failed ask again is not
      // a reason to take away what was read a minute ago.
      if (!had.current) setDown(true);
    }
  }, []);

  const readBook = useCallback(async () => {
    if (!keeper) return;
    try {
      const r = await fetch('/api/people');
      const d = r.ok ? await r.json() : null;
      if (Array.isArray(d?.people)) setBook(new Map(d.people.map(p => [p.address, p])));
    } catch { /* no checks is the honest fallback */ }
  }, [keeper]);

  // Read once, when the list is first drawn.
  useEffect(() => { load(); }, [load]);
  useEffect(() => { readBook(); }, [readBook]);

  // The pull asks for both again.
  useEffect(() => {
    if (!refreshRef) return undefined;
    refreshRef.current = () => Promise.all([load(), readBook()]);
    return () => { refreshRef.current = null; };
  }, [refreshRef, load, readBook]);

  // The next thirty, on a press. What failed to come is simply not added.
  async function more() {
    if (!page?.next || asking) return;
    setAsking(true);
    try {
      const r = await fetch(`${DIRECTORY_URL}?after=${encodeURIComponent(page.next)}`, { cache: 'no-store' });
      const d = r.ok ? await r.json() : null;
      if (d) {
        setPage(was => ({
          ...was,
          journals: [...was.journals, ...(Array.isArray(d.journals) ? d.journals : [])],
          next: d.next || null,
        }));
      }
    } catch { /* the press can be made again */ }
    setAsking(false);
  }

  // Files somebody in the book, the same write the + in Friends makes. The
  // book on the Friends side hears of it (Friends.js listens for
  // `ln-book-filed`), and somebody new is offered a wave, as adding anybody
  // anywhere offers one (2026-09-23).
  async function add(journal) {
    setAdding(journal.address);
    setSaid('');
    try {
      const r = await fetch('/api/people', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: journal.address }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.person) { setSaid(d.error || 'That could not be added.'); return; }
      setBook(was => new Map(was).set(d.person.address, d.person));
      window.dispatchEvent(new CustomEvent('ln-book-filed', { detail: d.person }));
      if (d.fresh) setWavingTo(d.person);
    } catch {
      setSaid('That could not be added.');
    } finally {
      setAdding('');
    }
  }

  function row(journal) {
    // A visitor's row is the way to that journal and nothing else.
    if (!keeper) {
      return (
        <a key={journal.address} className="dir-row" href={journalUrl(journal.address)} target="_blank" rel="noopener noreferrer">
          <Inside journal={journal} />
        </a>
      );
    }
    // The keeper's own row: there is nowhere to go and nobody to add.
    if (mine && journal.address === mine) {
      return (
        <div key={journal.address} className="dir-row dir-row--own">
          <Inside journal={journal} mark="you" />
        </div>
      );
    }
    const inBook = book.has(journal.address);
    const isOpen = open === journal.address;
    return (
      <div key={journal.address} className={'dir-item' + (isOpen ? ' dir-item--open' : '')}>
        <button
          type="button"
          className="dir-row"
          onClick={() => { setSaid(''); setOpen(isOpen ? '' : journal.address); }}
          aria-expanded={isOpen}
        >
          <Inside journal={journal} mark={inBook ? 'book' : null} />
        </button>
        {isOpen && (
          <div className="dir-doors">
            <div className="fr-doors-row">
              <a
                className="fr-door"
                href={carrySender(journalUrl(journal.address), me, { known: inBook })}
                target="_blank"
                rel="noopener noreferrer"
              >
                <BookOpen size={22} weight="regular" aria-hidden="true" />
                Visit
              </a>
              {!inBook && (
                <button type="button" className="fr-door" onClick={() => add(journal)} disabled={adding === journal.address}>
                  <Plus size={22} weight="regular" aria-hidden="true" />
                  {adding === journal.address ? 'Adding…' : 'Add'}
                </button>
              )}
            </div>
            {said && <p className="dir-said" role="status">{said}</p>}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="dir-everyone">
      {keeper && <Findable onChange={load} />}
      {down ? (
        <p className="dir-quiet">The list can&rsquo;t be reached right now.</p>
      ) : page === null ? (
        <p className="dir-quiet">Asking who&rsquo;s listed&hellip;</p>
      ) : page.journals.length === 0 ? (
        <p className="dir-quiet">Nobody is listed yet.</p>
      ) : (
        <section className="dir-list" aria-label="Listed journals">
          <h2 className="dir-head">
            <span>Listed</span>
            <span className="dir-count">
              {journalsWord(page.listed)}
              {page.logging > 0 && ` · ${page.logging} logging right now`}
            </span>
          </h2>
          {page.journals.map(row)}
          {page.next && (
            <button type="button" className="dir-more" onClick={more} disabled={asking}>
              {asking ? 'Asking…' : 'More'}
            </button>
          )}
        </section>
      )}
      {!keeper && (
        <>
          <p className="dir-keeps">
            <b>What this page keeps:</b> an address, the day it was listed, a code for taking it off again,
            and what each journal was last seen logging. No entries, no accounts. Delisting is one press and
            leaves nothing behind.
          </p>
          {GET_URL && (
            <a className="dir-get" href={GET_URL}>Get your copy &rarr;</a>
          )}
        </>
      )}
      {keeper && <WaveSheet person={wavingTo} onClose={() => setWavingTo(null)} />}
    </div>
  );
}

// ── The list at its own address ─────────────────────────────────────────────
// For a stranger who was handed the link: the list as a visitor sees it, under
// the mark and a line saying what it is.
export default function Directory() {
  return (
    <div className="dir-screen">
      <SiteNav />
      <main className="dir-wrap">
        <h1 className="dir-title">Everyone</h1>
        <p className="dir-lede">
          Journals that chose to be listed. Press one to read it &mdash; it lives at its own address, not here.
        </p>
        <Everyone />
      </main>
    </div>
  );
}
