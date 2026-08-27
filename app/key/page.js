// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';

// app/key/page.js
// What the marks mean.
//
// Was the Index tab of /about. It is the legend for every score and every flag
// on the site, so it is the one part of that page that had to survive the move
// to a card: the diamond, the heart and the fingerprint appear on entries all
// over the journal and a reader who has never seen one needs somewhere to look
// it up. The swatch on the back of the card links straight here.
//
// The marks below are the real components, not drawings of them — the same
// StarRating every album is scored with and the same chips the archive draws —
// so this reads as a key to those pages rather than a description of them.
// What each row *says* belongs to whoever keeps the journal and comes from
// their definitions, which is why the wording is fetched rather than written
// into this file.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Fingerprint, Heart, SketchLogo } from '@phosphor-icons/react';
import { fonts } from '../../library/sitewide_visuals';
import DotNav from '../../components/main_components/DotNav';
import SiteNav from '../../components/main_components/SiteNav';
import Chip from '../../components/main_components/Slug_Page/Chip';
import StarRating from '../../components/main_components/StarRating';
import { DEFAULT_DEFINITIONS } from '../../library/definitions';

const STAR_ROWS = [
  { key: '5.0', rating: 5 },
  { key: '4.0', rating: 4 },
  { key: '3.0', rating: 3 },
  { key: '2.0', rating: 2 },
  { key: '1.0', rating: 1 },
  { key: 'half', rating: 0.5 },
  // Neither of these draws stars. A row of five in front of Masterpiece said
  // "this is a score", and the diamond is exactly the thing that isn't one —
  // same reason the heart leads the favourite row. A heart and a score answer
  // different questions, and the pair only makes sense once you know they can
  // disagree.
  { key: 'masterpiece', masterpiece: true },
  { key: 'favorite', favorite: true },
  { key: 'formative', formative: true },
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
      {/* Same sheet /rig uses. React hoists it once by href, so whichever of the
          two pages loads first is the one that pays for it. */}
      <style href="ln-paper-page" precedence="default">{`
        .pp-page { --pp-nav-bottom: calc(136px + var(--safe-top)); padding-top: var(--pp-nav-bottom); }
        .pp-main { max-width: 860px; margin: 0 auto; padding: 46px 48px 100px; }
        .pp-title {
          font-family: var(--font-display); font-weight: var(--font-display-weight);
          font-size: 30px; letter-spacing: -0.015em; color: var(--ink);
          margin: 0 0 8px;
        }
        .pp-kicker {
          font-family: var(--font-label); font-size: 10px;
          letter-spacing: 0.16em; text-transform: uppercase;
          color: var(--ink-faint); margin: 0 0 34px;
        }
        .pp-prose { font-size: 15px; line-height: 1.95; color: var(--ink); }
        .pp-prose p { margin: 0 0 22px; }
        .pp-prose p:last-child { margin-bottom: 0; }
        .pp-subhead {
          font-family: var(--font-display); font-weight: var(--font-display-weight);
          font-size: 20px; letter-spacing: -0.01em; color: var(--ink);
          margin: 0 0 12px;
        }
        .pp-block + .pp-block { margin-top: 48px; }
        .pp-row { border-bottom: 1px solid var(--border); padding: 14px 0; }
        .pp-row-head { display: flex; align-items: center; gap: 12px; min-height: 20px; }
        .pp-row-tail {
          margin-left: auto; flex-shrink: 0;
          font-family: var(--font-label); font-size: 10px;
          letter-spacing: 0.08em; color: var(--ink-faint);
        }
        .pp-row-body {
          font-size: 13px; line-height: 1.8; color: var(--ink-soft);
          margin: 8px 0 0;
        }
        .pp-name { font-size: 13px; color: var(--ink); }
        a.pp-name {
          display: inline-flex; align-items: center; gap: 6px;
          border-bottom: 1px solid var(--border); padding-bottom: 1px;
        }
        a.pp-name:hover { border-bottom-color: var(--ink-faint); }
        a.pp-name svg { color: var(--ink-faint); transition: color 0.15s; }
        a.pp-name:hover svg { color: var(--ink); }
        .pp-foot {
          margin-top: 48px; padding-top: 28px; border-top: 1px solid var(--border);
          display: flex; justify-content: center; align-items: center; gap: 12px; flex-wrap: wrap;
        }
        @media (max-width: 768px) {
          .pp-main { padding: 34px 24px 80px; }
          .pp-title { font-size: 25px; }
        }
      `}</style>

      <SiteNav />
      <DotNav />

      <main className="pp-main">
        <h1 className="pp-title">The key</h1>
        <p className="pp-kicker">What the marks mean</p>

        <div className="pp-block">
          <div>
            {STAR_ROWS.map(row => {
              const def = definitions[row.key];
              return (
                <div key={row.key} className="pp-row">
                  <div className="pp-row-head">
                    {row.masterpiece
                      ? <span className="ln-mark ln-mark--mp"><SketchLogo size={15} weight="fill" /></span>
                      : row.favorite
                        ? <span className="ln-mark ln-mark--fav"><Heart size={15} weight="fill" /></span>
                        : row.formative
                          ? <span className="ln-mark ln-mark--formative"><Fingerprint size={15} weight="bold" /></span>
                          : <StarRating rating={row.rating} size={14} />}
                    {row.masterpiece
                      ? <span style={{ marginLeft: 'auto' }}><Chip tone="mp">{def.label}</Chip></span>
                      : row.favorite
                        ? <span style={{ marginLeft: 'auto' }}><Chip tone="fav">{def.label}</Chip></span>
                        : row.formative
                          ? <span style={{ marginLeft: 'auto' }}><Chip tone="formative">{def.label}</Chip></span>
                          : <span className="pp-row-tail">{def.label}</span>}
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
