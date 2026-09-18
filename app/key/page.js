// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';

// app/key/page.js
// What the marks mean.
//
// Was the Index tab of /about. It is the legend for the three marks this site
// invented the meaning of: the diamond, the heart and the fingerprint appear
// on entries all over the journal and a reader who has never seen one needs
// somewhere to look it up.
//
// It was the legend for the rating scale too, until 2026-09-17 — a paragraph
// each for 5.0 down to 1.0 and one for half stars. Miyel took them out and the
// reason is a good one to keep: stars are ubiquitous, "I should assume that".
// Explaining them was explaining something the reader learned elsewhere years
// ago, and six rows of it buried the three that genuinely need saying.
//
// The marks below are the real components, not drawings of them — the same
// chips the archive draws — so this reads as a key to those pages rather than
// a description of them. What each row *says* belongs to whoever keeps the
// journal and comes from their definitions, which is why the wording is
// fetched rather than written into this file.
//
// **Nothing links here.** The card's swatch used to and does not any more, so
// this page is reachable only by typing the address — which for a page whose
// whole job is teaching the vocabulary is most of the job undone. See NOTES.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Fingerprint, Heart, SketchLogo } from '@phosphor-icons/react';
import { fonts } from '../../library/sitewide_visuals';
import SiteNav from '../../components/main_components/SiteNav';
import Chip from '../../components/main_components/Slug_Page/Chip';
import { DEFAULT_DEFINITIONS } from '../../library/definitions';

// ── Three marks, from 2026-09-17 ──────────────────────────────────────────
// This page held the whole rating scale as well — a paragraph each for 5.0
// down to 1.0, and one for half stars. They went on Miyel's call: stars are
// ubiquitous and a site explaining what four of them means is explaining
// something its reader learned somewhere else years ago. It also buried the
// three that genuinely need saying under six rows that did not.
//
// The envelope went with them, which is the one I would argue about: it is the
// least guessable mark on the site — a heart and a gem can be guessed at, a
// faint envelope on a record cannot. One row brings it back.
//
// Each mark leads with itself and says its name in its own chip, because a
// page about what marks mean should be made of the marks.
const MARKS = [
  { key: 'masterpiece', tone: 'mp', Icon: SketchLogo, weight: 'fill' },
  { key: 'favorite', tone: 'fav', Icon: Heart, weight: 'fill' },
  { key: 'formative', tone: 'formative', Icon: Fingerprint, weight: 'bold' },
];

export default function KeyPage() {
  // Fetched rather than carried in the Bookplate context: this is a couple of
  // kilobytes of prose only this page renders, and anything put in that context
  // is serialised into the HTML of every page on the site. The shipped text
  // stands in until the request lands, so the page is never empty.
  const [definitions, setDefinitions] = useState(DEFAULT_DEFINITIONS);
  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(d => d?.settings?.definitions && setDefinitions(d.settings.definitions))
      .catch(() => {});
  }, []);

  return (
    <div className="pp-page" style={{ background: 'var(--bg)', minHeight: '100vh', color: 'var(--ink)', fontFamily: fonts.sans }}>

      <SiteNav />

      <main className="pp-main">
        <h1 className="pp-title">The key</h1>
        <p className="pp-kicker">What the marks mean</p>

        <div className="pp-block">
          <div>
            {MARKS.map(mark => {
              const def = definitions[mark.key];
              if (!def) return null;
              return (
                <div key={mark.key} className="pp-row">
                  <div className="pp-row-head">
                    <span className={`ln-mark ln-mark--${mark.tone}`}>
                      <mark.Icon size={15} weight={mark.weight} />
                    </span>
                    <span style={{ marginLeft: 'auto' }}><Chip tone={mark.tone}>{def.label}</Chip></span>
                  </div>
                  <p className="pp-row-body">{def.body}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="pp-foot">
          <Link href="/" className="ln-pill">← The card</Link>
          <Link href="/archive" className="ln-pill">Archive →</Link>
        </div>
      </main>
    </div>
  );
}
