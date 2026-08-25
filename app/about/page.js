'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowSquareOut, Heart, SketchLogo } from '@phosphor-icons/react';
import { fonts } from '../../library/sitewide_visuals';
import DotNav from '../../components/main_components/DotNav';
import SiteNav from '../../components/main_components/SiteNav';
import Chip from '../../components/main_components/Slug_Page/Chip';
import StarRating from '../../components/main_components/StarRating';
import { useBookplate } from '../../components/main_components/Bookplate';
import { DEFAULT_DEFINITIONS } from '../../library/definitions';

const SECTIONS = [
  { id: 'about',  label: 'About'  },
  { id: 'specs',  label: 'Specs'  },
  { id: 'index',  label: 'Index'  },
];

// The rig, as rows rather than a bulleted list — same shape as a tracklist,
// where the thing's name reads left and what it is reads right.
const RIG = [
  { name: 'Sennheiser HD 600',  role: 'Headphones', href: 'https://us.sennheiser-hearing.com/products/hd-600' },
  { name: 'iFi Zen DAC 3',      role: 'DAC + Amp',  href: 'https://ifi-audio.com/products/zen-dac-3' },
  { name: 'Apple Music Lossless', role: 'Source' },
];

// Index rows carry the real mark, not a typed-out one: `rating` is handed to
// the same StarRating every album and every track on the site is scored with,
// so this page reads as a legend for those pages rather than a description of
// them. `note` is the short form that sits opposite, where a track row keeps
// its stars.
// Structure only. What each row draws — a rating, a diamond, a heart — is a
// property of the page; what it *says* belongs to whoever keeps the journal and
// comes from their definitions. Shipped wording lives in library/definitions.js
// and is editable from settings, so this page reads as a legend for the marks
// rather than as one person's opinions compiled into everybody's software.
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
];

const RELATIONSHIP_ROWS = ['first_listen', 'revisit', 'formative', 'study', 'submission'];

export default function AboutPage() {
  const { about_intro, has_note: hasNote } = useBookplate();

  // Fetched here rather than carried in the Bookplate context: this is a couple
  // of kilobytes of prose that only the Index tab renders, and anything put in
  // that context is serialised into the HTML of every page on the site. The
  // shipped text stands in until the request lands, so the tab is never empty.
  const [definitions, setDefinitions] = useState(DEFAULT_DEFINITIONS);
  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(d => d?.settings?.definitions && setDefinitions(d.settings.definitions))
      .catch(() => {});
  }, []);

  // One section on screen at a time. This used to be all three stacked into a
  // single scroll with the marks jumping between them, which is the thing that
  // read as a wall: every other screen on the site is one group of one kind of
  // thing — an album's metadata, then its notes; the beacon, then the recent
  // listens — and this page was three groups deep in a single column. The
  // marks pick which page you're on now rather than how far down it you land.
  const [section, setSection] = useState('about');

  function show(id) {
    setSection(id);
    // Back to the top of the new page. Without this you arrive at whatever
    // depth the previous section had been scrolled to, which reads as the
    // page having jumped rather than changed.
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  return (
    <div className="ab-page" style={{ background: 'var(--bg)', minHeight: '100vh', color: 'var(--ink)', fontFamily: fonts.sans }}>
      <style>{`
        /* The fixed nav (SiteNav + the labelled dot row under it) ends at 136px
           on every breakpoint — the same constant the archive parks its filter
           bar on. --safe-top is 0 in a browser tab and pushes the whole stack
           down when the site is running from a home screen. */
        .ab-page { --ab-nav-bottom: calc(136px + var(--safe-top)); padding-top: var(--ab-nav-bottom); }

        /* ── The marks ── three names on a rule: which page you're on, and the
           way to the other two. They pin at the nav's bottom edge, with 34px of
           page above them so they aren't crowded against the dot labels.

           Opaque --bg rather than glass. The wrap shares the main column's box,
           so the fill covers precisely the width the writing occupies, which is
           all the masking a pinned bar on this page needs. */
        .ab-bar-wrap {
          position: sticky;
          top: var(--ab-nav-bottom);
          z-index: 101;
          max-width: 860px; margin: 0 auto;
          padding: 46px 48px 30px;
          background: var(--bg);
        }
        .ab-bar { display: flex; gap: 30px; border-bottom: 1px solid var(--border); }
        .ab-jump {
          font-family: var(--font-label); font-size: 11px;
          letter-spacing: 0.12em; text-transform: uppercase;
          padding: 0 0 11px; cursor: pointer;
          background: none; border: none;
          border-bottom: 2px solid transparent;
          /* Overlaps the row's own hairline, so the active mark replaces it
             rather than stacking a second line under it. */
          margin-bottom: -1px;
          color: var(--ink-faint);
          transition: color 0.18s, border-color 0.18s;
        }
        .ab-jump:hover { color: var(--ink-soft); }
        .ab-jump--on { color: var(--ink); border-bottom-color: var(--ink); }

        .ab-main { max-width: 860px; margin: 0 auto; padding: 0 48px 100px; }

        /* Arriving on a page, rather than scrolling to a part of one. Short and
           only on opacity + a few pixels — anything longer and switching marks
           feels like waiting. */
        @keyframes ab-arrive {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: none; }
        }
        .ab-panel { animation: ab-arrive 0.22s ease-out; }
        @media (prefers-reduced-motion: reduce) {
          .ab-panel { animation: none; }
        }

        /* Body copy, matched to an entry's album notes: same size, same
           leading, same full-strength ink. */
        .ab-prose { font-size: 15px; line-height: 1.95; color: var(--ink); }
        .ab-prose p { margin: 0 0 22px; }
        .ab-prose p:last-child { margin-bottom: 0; }

        /* The opening paragraph of the About page, set a step up — it says what
           the whole thing is, and with no page title over it something has to
           be the way in. */
        .ab-lede {
          font-size: 17px; line-height: 1.75; color: var(--ink);
          margin: 0 0 34px;
        }

        .ab-subhead {
          font-family: var(--font-display); font-weight: var(--font-display-weight);
          font-size: 20px; letter-spacing: -0.01em; color: var(--ink);
          margin: 0 0 12px;
        }
        /* Every heading on this page now sits at the top of an .ab-block, so
           the space between headings is the space between blocks. */
        .ab-block + .ab-block { margin-top: 48px; }

        /* ── Rows ── the tracklist rhythm: a head line that carries the mark,
           the writing underneath it, one hairline closing each one off. */
        .ab-row { border-bottom: 1px solid var(--border); padding: 14px 0; }
        .ab-row-head { display: flex; align-items: center; gap: 12px; min-height: 20px; }
        .ab-row-tail {
          margin-left: auto; flex-shrink: 0;
          font-family: ${fonts.mono}; font-size: 10px;
          letter-spacing: 0.08em; color: var(--ink-faint);
        }
        .ab-row-body {
          font-size: 13px; line-height: 1.8; color: var(--ink-soft);
          margin: 8px 0 0;
        }
        .ab-rig-name { font-size: 13px; color: var(--ink); }
        a.ab-rig-name {
          display: inline-flex; align-items: center; gap: 6px;
          border-bottom: 1px solid var(--border); padding-bottom: 1px;
        }
        a.ab-rig-name:hover { border-bottom-color: var(--ink-faint); }
        a.ab-rig-name svg { color: var(--ink-faint); transition: color 0.15s; }
        a.ab-rig-name:hover svg { color: var(--ink); }

        /* Relationship rows: term in a fixed column, definition in the next.
           Run in on one line the chips are all different widths, so every
           definition started at a different place and the block had no left
           edge to read down. 90px is the widest chip ("Submission", 78px) plus
           a little slack. */
        .ab-rel {
          display: grid; grid-template-columns: 90px 1fr; gap: 18px;
          align-items: baseline;
          margin: 0; font-size: 13px; line-height: 1.8; color: var(--ink-soft);
        }
        .ab-rel-term { justify-self: start; }

        /* An inline link out to another page of this one, quiet enough to sit
           inside a sentence without reading as a button. */
        .ab-inline {
          background: none; border: none; padding: 0; font: inherit; cursor: pointer;
          color: var(--ink); border-bottom: 1px solid var(--ink-faint);
        }

        /* Every page of this one ends the same way, because each is now a page
           in its own right rather than a stop on a longer scroll. */
        .ab-foot {
          margin-top: 48px; padding-top: 28px; border-top: 1px solid var(--border);
          display: flex; justify-content: center; align-items: center; gap: 12px; flex-wrap: wrap;
        }

        /* The masterpiece glow keyframes used to live here, for the row of
           five that led the Masterpiece entry. That row draws the diamond
           now, so nothing on this page asks StarRating to glow and the
           animation went with it. The entry page and the modal keep their
           own copies — this was never the shared definition. */

        @media (max-width: 768px) {
          /* Same 24px gutter as the writing below it, so the rule under the
             marks runs the exact width of the prose. */
          .ab-bar-wrap { padding: 34px 24px 26px; }
          /* Thirds apiece — on a phone these are thumb targets first, and a tap
             area the width of the word alone is too small to aim at. */
          .ab-jump { flex: 1; padding: 2px 0 11px; font-size: 10px; letter-spacing: 0.08em; }
          .ab-main { padding: 0 24px 80px; }
          .ab-lede { font-size: 16px; }
          /* The definition column can't give up 90px to the term at this width
             and still hold a readable line, so the term sits above its own
             definition — tight enough to read as its heading. */
          .ab-rel { grid-template-columns: 1fr; gap: 7px; }
        }
      `}</style>

      <SiteNav />
      <DotNav />

      <div className="ab-bar-wrap">
        <div className="ab-bar">
          {SECTIONS.map(s => (
            <button
              key={s.id}
              type="button"
              className={'ab-jump' + (section === s.id ? ' ab-jump--on' : '')}
              aria-current={section === s.id ? 'page' : undefined}
              onClick={() => show(s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Keyed on the section so React rebuilds the panel rather than patching
          it — which is what re-runs the arrival animation on every switch. */}
      <main className="ab-main">
        <div className="ab-panel" key={section}>

          {/* Three principles, two paragraphs apiece, after the lede. Every
              heading here is lifted out of the paragraph it sits over rather
              than written for it — a heading in a different voice than the
              writing underneath reads as an editor's, not the author's. */}
          {section === 'about' && (
            <>
              {/* The opening paragraph and the note behind it both come from
                  the journal's own details rather than from this file. A copy
                  of this software arrives with the page and without the
                  writing: no paragraph, no link, and /why does not exist until
                  its owner has written one. */}
              {about_intro && <p className="ab-lede">{about_intro}</p>}

              {hasNote && (
                <div className="ab-block">
                  <Link href="/why" className="ln-pill">Read the full note →</Link>
                </div>
              )}
            </>
          )}

          {section === 'specs' && (
            <>
              <div className="ab-block">
                <h2 className="ab-subhead">Current listening setup</h2>
                <div>
                  {RIG.map(item => (
                    <div key={item.name} className="ab-row">
                      <div className="ab-row-head">
                        {item.href ? (
                          <a className="ab-rig-name" href={item.href} target="_blank" rel="noopener noreferrer">
                            {item.name}
                            {/* Phosphor's own mark for a link that leaves the
                                site, drawn in the line's colour at the line's
                                weight — the ↗ that used to sit here was a text
                                arrow the emoji font kept claiming. */}
                            <ArrowSquareOut size={13} weight="bold" aria-hidden="true" />
                          </a>
                        ) : (
                          <span className="ab-rig-name">{item.name}</span>
                        )}
                        <span className="ab-row-tail">{item.role}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="ab-block">
                <h2 className="ab-subhead">Why it matters</h2>
                <div className="ab-prose">
                  <p>
                    The HD 600s were chosen for one reason: neutrality. They don&rsquo;t exaggerate bass, widen space artificially, or smooth over rough edges. They&rsquo;re open-back, which means sound isn&rsquo;t sealed inside the earcup&mdash;it breathes. That design trades isolation for realism. Space feels very natural through these headphones. If a mix has depth, you hear it. If it doesn&rsquo;t, that&rsquo;s revealed too.
                  </p>
                  <p>
                    The iFi Zen DAC serves two roles at once. As a DAC, it converts digital audio&mdash;numbers&mdash;into a continuous electrical signal. As an amplifier, it supplies that signal with enough voltage and current to properly move the headphone drivers. This matters more than volume to me. Proper amplification stabilizes timing, dynamics, and control. The sound stops straining and quiet details hold steady instead of flickering.
                  </p>
                  <p>
                    What changed my understanding completely was learning what&rsquo;s actually happening here. These headphones don&rsquo;t &ldquo;play back&rdquo; music the way a screen plays video. They recreate it physically. The electrical signal coming from the amp causes the drivers to move air&mdash;microscopically, precisely&mdash;right in front of my ears. That&rsquo;s also when I noticed that wired headphones don&rsquo;t need to be charged. They aren&rsquo;t computers, they&rsquo;re more like instruments. Power comes from the amplifier, timing comes from the signal, and the performance happens in real time. In that sense, every listening session is a small live performance built from scratch, moment by moment. This is different from the headphones I used before. Wireless headphones compress the signal, process it digitally, and rely on tiny internal amplifiers powered by batteries. With the wired setup, everything is separated: conversion, amplification, and transduction each have room to do their job properly.
                  </p>
                  <p>
                    The result isn&rsquo;t &ldquo;better&rdquo; sound in a flashy way. It&rsquo;s more stable sound and much more legible. Music stops floating vaguely and starts occupying space with intention. That stability is what makes active listening possible.
                  </p>
                </div>
              </div>
            </>
          )}

          {/* The legend for the marks every entry is scored with, so the stars
              and chips here are the real components, not a drawing of them. */}
          {section === 'index' && (
            <>
              <div className="ab-block">
                <h2 className="ab-subhead">Star Notes</h2>
                <div>
                  {STAR_ROWS.map(row => {
                    const def = definitions[row.key];
                    return (
                    <div key={row.key} className="ab-row">
                      <div className="ab-row-head">
                        {/* The two mark rows lead with their own mark, not
                            with stars. A row of five in front of Masterpiece
                            said "this is a score", and the diamond is exactly
                            the thing that isn't one — same reason the heart
                            leads the favourite row. Both are the marks the
                            archive actually draws, so this reads as a legend
                            for them rather than a picture of one. */}
                        {row.masterpiece
                          ? <span className="ln-mark ln-mark--mp"><SketchLogo size={15} weight="fill" /></span>
                          : row.favorite
                            ? <span className="ln-mark ln-mark--fav"><Heart size={15} weight="fill" /></span>
                            : <StarRating rating={row.rating} size={14} />}
                        {row.masterpiece
                          ? <span style={{ marginLeft: 'auto' }}><Chip tone="mp">{def.label}</Chip></span>
                          : row.favorite
                            ? <span style={{ marginLeft: 'auto' }}><Chip tone="fav">{def.label}</Chip></span>
                            : <span className="ab-row-tail">{def.label}</span>}
                      </div>
                      <p className="ab-row-body">{def.body}</p>
                    </div>
                    );
                  })}
                </div>
              </div>

              <div className="ab-block">
                <h2 className="ab-subhead">Relationship Notes</h2>
                <div>
                  {RELATIONSHIP_ROWS.map(key => (
                    <div key={key} className="ab-row">
                      <div className="ab-rel">
                        <span className="ab-rel-term"><Chip>{definitions[key].label}</Chip></span>
                        <p style={{ margin: 0 }}>{definitions[key].body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          <div className="ab-foot">
            <Link href="/" className="ln-pill">← Back home</Link>
            <Link href="/archive" className="ln-pill">Archive →</Link>
          </div>

        </div>
      </main>
    </div>
  );
}
