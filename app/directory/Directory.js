// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';

// app/directory/Directory.js
// The directory's screen: journals that chose to be findable, as a page of
// people.
//
// From Miyel's directory instructions, 2026-10-07, in the look she settled
// the same evening ("lets make it feel more like a true page, pfp"). It makes
// one request to DIRECTORY_URL and draws what comes back; it never asks any
// journal for its beacon itself — the registry keeps the last beacon it saw
// from each, so a reader never waits on a fetch. If the registry cannot be
// reached it says so in one line, and nothing else in the journal is
// touched.
//
// Public, with no wristband: everything on it is already public, and a
// stranger finding this page, seeing real people listening, and pressing
// through to /get is the point.
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

import { useEffect, useState } from 'react';
import { User } from '@phosphor-icons/react';
import SiteNav from '../../components/main_components/SiteNav';
import { DIRECTORY_URL } from '../../library/version';
import { journalUrl } from '../../library/return_address';

// The mock-up's words for a journal whose keeper has not said their name.
const NO_NAME = 'A journal with no name yet';
const journalsWord = n => `${n} ${n === 1 ? 'journal' : 'journals'}`;

// Where the software is got from: /get on the copy the registry lives on,
// which a stranger without a gift link meets as the handed-out page.
const GET_URL = (() => {
  try { return `${new URL(DIRECTORY_URL).origin}/get`; } catch { return ''; }
})();

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

// A listed journal: their face, their name, their beacon, and the record
// they are on as its cover at the end of the row. Pressing opens their
// journal at its own address, as a visitor.
function JournalRow({ journal }) {
  const live = journal.state === 'logging';
  const said = journal.state === 'logging' || journal.state === 'logged';
  return (
    <a className="dir-row" href={journalUrl(journal.address)} target="_blank" rel="noopener noreferrer">
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
      {said && <Cover art={journal.art} />}
    </a>
  );
}

export default function Directory() {
  // null until the registry has answered; `down` once it could not.
  const [page, setPage] = useState(null);
  const [down, setDown] = useState(false);
  const [asking, setAsking] = useState(false);

  useEffect(() => {
    let gone = false;
    fetch(DIRECTORY_URL, { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then(d => {
        if (gone) return;
        setPage({
          listed: Number(d?.listed) || 0,
          logging: Number(d?.logging) || 0,
          journals: Array.isArray(d?.journals) ? d.journals : [],
          next: d?.next || null,
        });
      })
      .catch(() => { if (!gone) setDown(true); });
    return () => { gone = true; };
  }, []);

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

  return (
    <div className="dir-screen">
      <SiteNav />
      <main className="dir-wrap">
        <h1 className="dir-title">Directory</h1>
        <p className="dir-lede">
          Journals that chose to be listed. Press one to read it &mdash; it lives at its own address, not here.
        </p>

        {down ? (
          <p className="dir-quiet">The directory can&rsquo;t be reached right now.</p>
        ) : page === null ? (
          <p className="dir-quiet">Asking the directory&hellip;</p>
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
            {page.journals.map(j => <JournalRow key={j.address} journal={j} />)}
            {page.next && (
              <button type="button" className="dir-more" onClick={more} disabled={asking}>
                {asking ? 'Asking…' : 'More'}
              </button>
            )}
          </section>
        )}

        <p className="dir-keeps">
          <b>What this page keeps:</b> an address, the day it was listed, a code for taking it off again,
          and what each journal was last seen logging. No entries, no accounts. Delisting is one press and
          leaves nothing behind.
        </p>
        {GET_URL && (
          <a className="dir-get" href={GET_URL}>Get your copy &rarr;</a>
        )}
      </main>
    </div>
  );
}
