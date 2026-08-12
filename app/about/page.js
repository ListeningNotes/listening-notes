'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowSquareOut } from '@phosphor-icons/react';
import { fonts } from '../../library/sitewide_visuals';
import DotNav from '../../components/main_components/DotNav';
import SiteNav from '../../components/main_components/SiteNav';
import Chip from '../../components/main_components/Slug_Page/Chip';
import StarRating from '../../components/main_components/StarRating';

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
const STAR_NOTES = [
  { rating: 5, note: '5.0', body: 'A full-body yes. An album or track that feels complete and emotionally alive. I return to it willingly and often. Nothing pulls me out of the experience; even its rough edges feel necessary. These are the tracks and albums that stay with me and sometimes shape how I listen to music altogether.' },
  { rating: 4, note: '4.0', body: 'Strong, memorable, and successful. The core vision lands, even if there are a few moments that don’t fully click for me. I might not love every second, but the highs are real and meaningful. Albums and tracks at this level earn repeat listens and attention.' },
  { rating: 3, note: '3.0', body: 'Interesting, but uneven. I appreciate the ideas more than the execution, or the experience more than the replay value. These albums or tracks might matter to me more conceptually or contextually, but don’t quite pull me in emotionally.' },
  { rating: 2, note: '2.0', body: 'Respect more than attachment. I’m glad it exists and I’m glad I listened, but I don’t feel drawn back. Albums or tracks at this level might have some compelling moments, yet the immersion breaks too often. My attention drifts, the balance feels off, or the piece just doesn’t quite land for me.' },
  { rating: 1, note: '1.0', body: 'Not for me. Either actively uncomfortable to listen to, or lacking the elements I need to stay engaged. Sometimes I hear intention, but the execution just doesn’t hold me. These ratings never mean “bad” — just disconnected from my listening habits.' },
  { rating: 0.5, note: 'Half', body: 'Half-stars appear when I’m genuinely pulled in two directions — simply too strong to place lower, but not fully aligned enough to place higher. I’ve actively wrestled with these albums or tracks and ultimately decided to meet in the middle.' },
  { rating: 5, masterpiece: true, body: 'Entire 5-star track list. Flawless.' },
];

const RELATIONSHIP_NOTES = [
  { label: 'First listen', body: 'My first time listening to an album front to back with intention. I may already know a handful of tracks, but this is the first time I’m hearing the full album as a complete work.' },
  { label: 'Revisit',      body: 'An album I’ve lived with before and am returning to with fresh attention, often in a new listening setup or emotional context.' },
  { label: 'Formative',    body: 'An album that shaped my relationship with music or how I listen, regardless of when I first heard it. These tend to be albums I’ve spent a significant portion of my life with.' },
  { label: 'Study',        body: 'A listen rooted in history, influence, or research. Usually the album matters culturally or technologically, even if it’s not built for repeat listening.' },
  { label: 'Submission',   body: 'An album recommended to me by someone else and listened to as a response or exchange.' },
];

export default function AboutPage() {
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
           bar on. */
        .ab-page { --ab-nav-bottom: 136px; padding-top: var(--ab-nav-bottom); }

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

        /* The masterpiece glow lives with whoever asks StarRating for it — the
           keyframes are defined per page, the same way the entry page does it. */
        @keyframes ab-star-glow {
          0%,100% { filter: brightness(1.15) drop-shadow(0 0 3px rgba(255,210,60,0.5)); }
          50%     { filter: brightness(1.45) drop-shadow(0 0 6px rgba(255,210,60,0.9)); }
        }
        .ln-star-glow { animation: ab-star-glow 2.8s ease-in-out infinite; }
        .ln-star-glow:nth-child(2) { animation-delay: .18s; }
        .ln-star-glow:nth-child(3) { animation-delay: .36s; }
        .ln-star-glow:nth-child(4) { animation-delay: .54s; }
        .ln-star-glow:nth-child(5) { animation-delay: .72s; }
        @media (prefers-reduced-motion: reduce) { .ln-star-glow { animation: none; } }

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
              <p className="ab-lede">
                Listening Notes started as an answer to a question about my favorite albums and it grew into a practice of documenting intentional listening. Now it is becoming a larger system for mapping taste, preserving musical encounters, and creating space for shared reflection around sound.
              </p>

              {/* "Music has always meant too much to me to throw into a quick
                  list" — the question, and the thing built to answer it. */}
              <div className="ab-block">
                <h2 className="ab-subhead">More than a list</h2>
                <div className="ab-prose">
                  <p>
                    Back in 2020, a close friend asked me to send them a list of my favorite albums, and I never finished it&mdash;actually I never even started. For years I thought I&rsquo;d get around to it one day, but I just kept putting it off. I always thought I was just procrastinating, but now I think I was resisting the format of what was being asked of me. Music has always meant too much to me to throw into a quick list in my notes app and call it done. I did not just want to name the albums, I wanted to capture my feelings around them and why they mattered to me.
                  </p>
                  <p>
                    Finally, in December 2025, I started Listening Notes. It was my way of finally addressing that question: what are my favorite albums? But somewhere along the way, it stopped being just about answering that. It became a way to document my relationship with music entirely, and in real time. That shift changed the whole project for me. What started as a Tumblr blog became something much more alive and closer to an archive of my listening habits than just a collection of reviews.
                  </p>
                </div>
              </div>

              {/* "asking what kind of listener I am" — what the entries are,
                  and how the listening behind them is done. */}
              <div className="ab-block">
                <h2 className="ab-subhead">What kind of listener I am</h2>
                <div className="ab-prose">
                  <p>
                    At its core is the idea that listening is worth documenting. I have always been someone who likes to record things, preserve things, and leave a trace of who I am in this world. That is why I do not really think of these entries as judgments. They are more like evidence of an encounter. They show what stood out to me, what confused me, what moved me, and what stays with me even after the album has ended. Over time entries start to reveal patterns not only in my musical taste, but also patterns in how I listen. That is part of what this project has grown into for me. It is not only about asking what my favorite music is. It is also about asking what kind of listener I am and how my taste takes shape over time.
                  </p>
                  <p>
                    A major turning point in how I listened came in 2024 when I visited the Art of Noise exhibition at SFMOMA and experienced Devon Turnbull&rsquo;s high-fidelity listening room installation. That experience genuinely changed something in me. It was not about volume or spectacle. It was about precision and the feeling that recorded sound could be presented with a kind of care that made its full shape more visible. Since then I have been much more conscious of listening as an intentional practice. Right now that means listening with my own Hi-Fi headphone setup while I slowly work towards building a dedicated listening room of my own. The setup used for listening can be explored more <button type="button" className="ab-inline" onClick={() => show('specs')}>here</button>.
                  </p>
                </div>
              </div>

              {/* "this project was never meant to stay private" — and it closes
                  on the same list the first principle opens with. */}
              <div className="ab-block">
                <h2 className="ab-subhead">Never meant to stay private</h2>
                <div className="ab-prose">
                  <p>
                    I also know this project was never meant to stay private. Part of what has always fascinated me about music is how differently people can hear the same exact album. I have spent so much time reading other people&rsquo;s thoughts by looking up reddit threads or interpretations on Genius just to understand how a piece landed for someone else. I do not want Listening Notes to just be a private diary hidden away. I want it to be a place where exposure can happen, music can be shared, and opinions are openly discussed.
                  </p>
                  <p>
                    Listening Notes is no longer just a blog where I post album thoughts. It has grown into something much bigger. What I am building now is not simply a place to store opinions, but a system for documenting taste, noticing patterns in what moves someone, and treating a relationship to sound as something worth preserving with real care. If someone asked me today for a list of my favorite albums I would point them here because this says much more fully what music actually means to me.
                  </p>
                </div>
              </div>
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
                  {STAR_NOTES.map(s => (
                    <div key={s.masterpiece ? 'masterpiece' : s.note} className="ab-row">
                      <div className="ab-row-head">
                        <StarRating rating={s.rating} size={14} glow={s.masterpiece} />
                        {s.masterpiece
                          ? <span style={{ marginLeft: 'auto' }}><Chip accent>Masterpiece</Chip></span>
                          : <span className="ab-row-tail">{s.note}</span>}
                      </div>
                      <p className="ab-row-body">{s.body}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="ab-block">
                <h2 className="ab-subhead">Relationship Notes</h2>
                <div>
                  {RELATIONSHIP_NOTES.map(r => (
                    <div key={r.label} className="ab-row">
                      <div className="ab-rel">
                        <span className="ab-rel-term"><Chip>{r.label}</Chip></span>
                        <p style={{ margin: 0 }}>{r.body}</p>
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
