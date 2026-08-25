'use client';

// app/rig/page.js
// What the listening is done on.
//
// Was the Specs tab of /about. When the cover became two-sided the about page
// stopped existing as a destination — the card is the about page now — but the
// rig writeup is several hundred words and a card cannot hold it, so it keeps
// its own address and the card links here.

import Link from 'next/link';
import { ArrowSquareOut } from '@phosphor-icons/react';
import { fonts } from '../../library/sitewide_visuals';
import DotNav from '../../components/main_components/DotNav';
import SiteNav from '../../components/main_components/SiteNav';

// The rig, as rows rather than a bulleted list — same shape as a tracklist,
// where the thing's name reads left and what it is reads right.
const RIG = [
  { name: 'Sennheiser HD 600',  role: 'Headphones', href: 'https://us.sennheiser-hearing.com/products/hd-600' },
  { name: 'iFi Zen DAC 3',      role: 'DAC + Amp',  href: 'https://ifi-audio.com/products/zen-dac-3' },
  { name: 'Apple Music Lossless', role: 'Source' },
];

export default function RigPage() {
  return (
    <div className="pp-page" style={{ background: 'var(--bg)', minHeight: '100vh', color: 'var(--ink)', fontFamily: fonts.sans }}>
      <style href="ln-paper-page" precedence="default">{`
        /* The fixed nav (SiteNav + the labelled dot row under it) ends at 136px
           on every breakpoint — the same constant the archive parks its filter
           bar on. --safe-top is 0 in a browser tab and pushes the whole stack
           down when the site is running from a home screen. */
        .pp-page { --pp-nav-bottom: calc(136px + var(--safe-top)); padding-top: var(--pp-nav-bottom); }

        .pp-main { max-width: 860px; margin: 0 auto; padding: 46px 48px 100px; }

        /* The page's own name, where /about used to put a row of tabs. These
           are destinations now rather than sections of one page, so each says
           what it is at the top instead of highlighting a mark in a row. */
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

        /* Body copy, matched to an entry's album notes: same size, same
           leading, same full-strength ink. */
        .pp-prose { font-size: 15px; line-height: 1.95; color: var(--ink); }
        .pp-prose p { margin: 0 0 22px; }
        .pp-prose p:last-child { margin-bottom: 0; }

        .pp-subhead {
          font-family: var(--font-display); font-weight: var(--font-display-weight);
          font-size: 20px; letter-spacing: -0.01em; color: var(--ink);
          margin: 0 0 12px;
        }
        .pp-block + .pp-block { margin-top: 48px; }

        /* ── Rows ── the tracklist rhythm: a head line that carries the mark,
           the writing underneath it, one hairline closing each one off. */
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
        <h1 className="pp-title">The rig</h1>
        <p className="pp-kicker">Current listening setup</p>

        <div className="pp-block">
          <div>
            {RIG.map(item => (
              <div key={item.name} className="pp-row">
                <div className="pp-row-head">
                  {item.href ? (
                    <a className="pp-name" href={item.href} target="_blank" rel="noopener noreferrer">
                      {item.name}
                      {/* Phosphor's own mark for a link that leaves the site,
                          drawn in the line's colour at the line's weight — the ↗
                          that used to sit here was a text arrow the emoji font
                          kept claiming. */}
                      <ArrowSquareOut size={13} weight="bold" aria-hidden="true" />
                    </a>
                  ) : (
                    <span className="pp-name">{item.name}</span>
                  )}
                  <span className="pp-row-tail">{item.role}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pp-block">
          <h2 className="pp-subhead">Why it matters</h2>
          <div className="pp-prose">
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

        <div className="pp-foot">
          <Link href="/" className="ln-pill">← The card</Link>
          <Link href="/key" className="ln-pill">The key →</Link>
        </div>
      </main>
    </div>
  );
}
