'use client';

// components/main_components/IdentityCard.js
// The back of the cover.
//
// The landing page used to be one-sided, and everything a visitor might want
// to know about whose journal this is lived on a separate /about page nobody
// went to. This is that page, turned into an object: the card you'd be handed
// at the door.
//
// It is a column, not a form. An earlier version laid it out like a real ID —
// photo left, filled-in fields right, a swatch, a serial, fine print — and it
// was too much: eight dashed rules and a dozen small facts competing on one
// screen, and unreadable on a phone, where a card has to be tall rather than
// wide. What survived is the short list of things somebody actually wants:
// whose journal, how long, how many, why, and where else to find them.
//
// It carries no background of its own. The front of the cover is the beacon on
// the page's own colour, and turning something over should not change the
// colour of the room.

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  DiscordLogo, FacebookLogo, FlipHorizontal, GithubLogo, InstagramLogo,
  LinkSimple, LinkedinLogo, MediumLogo, QrCode, RedditLogo, SoundcloudLogo,
  SpotifyLogo, ThreadsLogo, TiktokLogo, TwitchLogo, User, XLogo, YoutubeLogo,
} from '@phosphor-icons/react';
import QRCode from 'qrcode';
import { useListeningBeacon } from '../../hooks/useListeningBeacon';
import { useBookplate } from './Bookplate';

// ── The Ln. mark ──────────────────────────────────────────────────────────
// Drawn once, used twice: at the top of the column, and knocked into the middle
// of the code. Both need the same glyphs at different sizes and in different
// colours, and a mark that drifts between the two places is a mark nobody
// trusts.
const MARK_BOX = { x: 76, y: 96, w: 241, h: 140 };
const MARK_GLYPHS = [
  { d: 'M 44.65625 0 C 37.46875 0 31.160156 -1.601562 25.734375 -4.8125 C 20.304688 -8.019531 16.097656 -12.28125 13.109375 -17.59375 C 10.128906 -22.90625 8.640625 -28.773438 8.640625 -35.203125 L 8.640625 -116.21875 L 36.53125 -116.21875 L 36.53125 -33.203125 C 36.53125 -30.546875 37.46875 -28.222656 39.34375 -26.234375 C 41.226562 -24.242188 43.550781 -23.25 46.3125 -23.25 L 77.03125 -23.25 L 77.03125 0 Z M 44.65625 0 ', transform: 'translate(73.734177, 220.794814)' },
  { d: 'M 91.96875 2 C 85 2 78.742188 0.476562 73.203125 -2.5625 C 67.671875 -5.613281 63.300781 -9.847656 60.09375 -15.265625 C 56.882812 -20.691406 55.28125 -26.835938 55.28125 -33.703125 L 55.28125 -84.5 C 55.28125 -86.269531 54.835938 -87.875 53.953125 -89.3125 C 53.066406 -90.75 51.90625 -91.910156 50.46875 -92.796875 C 49.03125 -93.679688 47.425781 -94.125 45.65625 -94.125 C 43.882812 -94.125 42.28125 -93.679688 40.84375 -92.796875 C 39.40625 -91.910156 38.269531 -90.75 37.4375 -89.3125 C 36.601562 -87.875 36.1875 -86.269531 36.1875 -84.5 L 36.1875 0 L 8.96875 0 L 8.96875 -82.515625 C 8.96875 -89.484375 10.539062 -95.625 13.6875 -100.9375 C 16.84375 -106.25 21.21875 -110.453125 26.8125 -113.546875 C 32.40625 -116.648438 38.6875 -118.203125 45.65625 -118.203125 C 52.738281 -118.203125 59.046875 -116.648438 64.578125 -113.546875 C 70.109375 -110.453125 74.476562 -106.25 77.6875 -100.9375 C 80.90625 -95.625 82.515625 -89.484375 82.515625 -82.515625 L 82.515625 -31.703125 C 82.515625 -29.929688 82.957031 -28.300781 83.84375 -26.8125 C 84.726562 -25.320312 85.859375 -24.160156 87.234375 -23.328125 C 88.617188 -22.492188 90.144531 -22.078125 91.8125 -22.078125 C 93.582031 -22.078125 95.210938 -22.492188 96.703125 -23.328125 C 98.203125 -24.160156 99.394531 -25.320312 100.28125 -26.8125 C 101.164062 -28.300781 101.609375 -29.929688 101.609375 -31.703125 L 101.609375 -116.21875 L 128.65625 -116.21875 L 128.65625 -33.703125 C 128.65625 -26.835938 127.050781 -20.691406 123.84375 -15.265625 C 120.632812 -9.847656 116.265625 -5.613281 110.734375 -2.5625 C 105.203125 0.476562 98.945312 2 91.96875 2 Z M 91.96875 2 ', transform: 'translate(153.915942, 220.794814)' },
];
// The period. It is the one part of the mark that carries a state — lit while
// something is playing — everywhere except inside the code, which is printed in
// one ink and has to stay that way to decode.
const MARK_DOT = { cx: 297.0547, cy: 216.71875, r: 14.1328 };

// ── The code ──────────────────────────────────────────────────────────────
// Every number here was arrived at by scanning the thing rather than by looking
// at it, and none of them should move without scanning it again.
//
// Version 10 is far larger than this much text needs. It is not carrying the
// URL, it is carrying the redundancy: correction level H, plus a hole punched
// in the middle for the mark, costs about a fifth of the code, and a smaller
// version has nowhere near that much to give away.
const CODE_VERSION = 10;
const CODE_SIZE = 57;      // modules across, fixed by the version
const CODE_QUIET = 4;      // modules of margin, on all four sides
const MODULE = 0.94;       // a module is drawn slightly under its own cell
const MODULE_R = 0.34;
// Fixed, and deliberately not theme-aware. A camera looks for dark on light,
// and inverting the code for a dark page asks every scanner in the world to be
// one of the ones that cope. The plate stays paper-coloured on both themes.
const CODE_INK = '#191917';
const CODE_PAPER = '#f5f4ef';

// The hole for the mark: a share of the code's area at the mark's own
// proportions, rounded onto the module grid so it takes whole modules rather
// than clipping the edge of a row.
const KNOCK_H = Math.round(Math.sqrt((0.18 * CODE_SIZE * CODE_SIZE) / 1.78));
const KNOCK_W = Math.round(KNOCK_H * 1.78);
const KNOCK_X = Math.round((CODE_SIZE - KNOCK_W) / 2);
const KNOCK_Y = Math.round((CODE_SIZE - KNOCK_H) / 2);

// The mark, scaled to sit inside that hole with a little air around it.
const MARK_SCALE = (KNOCK_W - 1.2) / MARK_BOX.w;
const MARK_TRANSFORM = [
  `translate(${KNOCK_X + (KNOCK_W - MARK_BOX.w * MARK_SCALE) / 2} ${KNOCK_Y + (KNOCK_H - MARK_BOX.h * MARK_SCALE) / 2})`,
  `scale(${MARK_SCALE})`,
  `translate(${-MARK_BOX.x} ${-MARK_BOX.y})`,
].join(' ');

// The three corner squares. A scanner finds these before it decodes anything,
// so unlike every other module they are drawn hard-edged: rounding them does
// not soften the look, it stops the code being found at all.
const FINDERS = [[0, 0], [CODE_SIZE - 7, 0], [0, CODE_SIZE - 7]];

// One rounded module, as a path fragment. Everything after the opening move is
// identical for all of them, so it is built once rather than formatted a couple
// of thousand times — the string adds up.
const MODULE_TAIL = (() => {
  const straight = (MODULE - 2 * MODULE_R).toFixed(2);
  const r = MODULE_R;
  const arc = (dx, dy) => `a${r} ${r} 0 0 1 ${dx} ${dy}`;
  return `h${straight}${arc(r, r)}v${straight}${arc(-r, r)}h-${straight}${arc(-r, -r)}v-${straight}${arc(r, -r)}z`;
})();

// Built once per address, at module scope. The two cards on the landing page —
// the desktop markup and the mobile markup — are separate trees asking for the
// same code, and an address only changes if its owner moves house.
const CODE_CACHE = new Map();

function buildCode(url) {
  if (CODE_CACHE.has(url)) return CODE_CACHE.get(url);
  let built = null;
  try {
    const { modules } = QRCode.create(url, { errorCorrectionLevel: 'H', version: CODE_VERSION });
    const inFinder = (col, row) =>
      FINDERS.some(([fx, fy]) => col >= fx && col < fx + 7 && row >= fy && row < fy + 7);
    const inKnockout = (col, row) =>
      col >= KNOCK_X && col < KNOCK_X + KNOCK_W && row >= KNOCK_Y && row < KNOCK_Y + KNOCK_H;

    const inset = (1 - MODULE) / 2;
    let d = '';
    for (let row = 0; row < modules.size; row++) {
      for (let col = 0; col < modules.size; col++) {
        if (!modules.data[row * modules.size + col]) continue;
        if (inFinder(col, row) || inKnockout(col, row)) continue;
        d += `M${col + inset + MODULE_R} ${row + inset}${MODULE_TAIL}`;
      }
    }
    built = d;
  } catch {
    // Longer than version 10 will hold, most likely. A card with no code on it
    // is still a card; a card that throws while rendering is a blank page.
    built = null;
  }
  CODE_CACHE.set(url, built);
  return built;
}

// A month and a year, never a day. The card says how long the journal has been
// kept, and a precise date invites arithmetic that isn't the point. UTC because
// created_at is a naive column read through a driver that shifts it by the
// reader's own offset — a month is coarse enough that no plausible offset can
// move it, which is the whole reason to print one.
function monthAndYear(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', timeZone: 'UTC' });
}

// Which mark to draw for a link, decided by where it points. The alternative
// was a column per service, which makes this software the authority on which
// services exist — a copy whose owner is on something nobody here thought of
// would have to wait for a migration to link to it. Anything unrecognised gets
// the plain link mark and works exactly as well.
const SERVICES = [
  [/(^|\.)instagram\.com$/,   'Instagram',  InstagramLogo],
  [/(^|\.)facebook\.com$/,    'Facebook',   FacebookLogo],
  [/(^|\.)reddit\.com$/,      'Reddit',     RedditLogo],
  [/(^|\.)(x|twitter)\.com$/, 'X',          XLogo],
  [/(^|\.)threads\.(net|com)$/, 'Threads',  ThreadsLogo],
  [/(^|\.)tiktok\.com$/,      'TikTok',     TiktokLogo],
  [/(^|\.)youtube\.com$/,     'YouTube',    YoutubeLogo],
  [/(^|\.)github\.com$/,      'GitHub',     GithubLogo],
  [/(^|\.)linkedin\.com$/,    'LinkedIn',   LinkedinLogo],
  [/(^|\.)discord\.(gg|com)$/, 'Discord',   DiscordLogo],
  [/(^|\.)soundcloud\.com$/,  'SoundCloud', SoundcloudLogo],
  [/(^|\.)(open\.)?spotify\.com$/, 'Spotify', SpotifyLogo],
  [/(^|\.)twitch\.tv$/,       'Twitch',     TwitchLogo],
  [/(^|\.)medium\.com$/,      'Medium',     MediumLogo],
];

function identify(url) {
  let host;
  try {
    host = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).hostname.toLowerCase();
  } catch {
    return null; // not a URL at all — better to drop it than render a dead mark
  }
  const hit = SERVICES.find(([pattern]) => pattern.test(host));
  return {
    href: /^https?:\/\//i.test(url) ? url : `https://${url}`,
    label: hit ? hit[1] : host.replace(/^www\./, ''),
    Icon: hit ? hit[2] : LinkSimple,
  };
}

// The address, as the thing you point a phone at.
//
// Drawn by hand from the module matrix rather than handed to a hosted code
// service: a service would mean every journal running this software quietly
// telling a third party what its address is, every time somebody opened the
// card. The matrix is computed here and the shape of it is ours.
function AddressCode({ text }) {
  const modules = useMemo(() => buildCode(text), [text]);
  if (!modules) return null;

  const span = CODE_SIZE + CODE_QUIET * 2;
  return (
    <svg
      className="idc-qr"
      viewBox={`${-CODE_QUIET} ${-CODE_QUIET} ${span} ${span}`}
      role="img"
      aria-label={`Scannable code for ${text}`}
    >
      {/* The quiet zone is part of the code, not padding around it — a scanner
          needs the clear margin to find the edges. Painting it here means the
          code carries its own margin wherever the box puts it. */}
      <rect x={-CODE_QUIET} y={-CODE_QUIET} width={span} height={span} fill={CODE_PAPER} />
      <g fill={CODE_INK}>
        <path d={modules} />
        {FINDERS.map(([fx, fy]) => (
          <g key={`${fx}-${fy}`}>
            {/* A ring, cut as one path with the even-odd rule, and a solid
                centre. Both hard-edged — see the note on FINDERS. */}
            <path d={`M${fx} ${fy}h7v7h-7z M${fx + 1} ${fy + 1}v5h5v-5z`} fillRule="evenodd" />
            <rect x={fx + 2} y={fy + 2} width="3" height="3" rx="0.6" />
          </g>
        ))}
        {/* The mark, in the hole those modules were skipped for. One ink, and
            the period is not lit here: a code is read for contrast, and a green
            dot in the middle of it is a hole a scanner has to correct around. */}
        <g transform={MARK_TRANSFORM}>
          {MARK_GLYPHS.map(glyph => (
            <path key={glyph.transform} d={glyph.d} transform={glyph.transform} />
          ))}
          <circle cx={MARK_DOT.cx} cy={MARK_DOT.cy} r={MARK_DOT.r} />
        </g>
      </g>
    </svg>
  );
}

export default function IdentityCard({ stamps, onFlipBack }) {
  const {
    journal_name,
    keeper_name,
    bio,
    portrait_url,
    instagram_url,
    site_address,
    founded_at,
    about_intro,
    social_links,
    has_note: hasNote,
  } = useBookplate();
  const { isLive } = useListeningBeacon();

  const records = stamps?.records ?? null;

  // Founded date if the keeper set one, otherwise the day the first record was
  // logged. The second is the more honest answer anyway: a listening journal
  // starts when someone writes in it, not when the database row was created.
  const since = monthAndYear(founded_at) || monthAndYear(stamps?.first_listen);

  // The keeper's own line if they have written one, otherwise the journal's.
  // Two paragraphs here was one of the things that made the old card a wall,
  // and of the two this is the one with a face above it.
  const blurb = bio || about_intro;

  // instagram_url predates this list and still feeds the icon in the corner of
  // the front, so it is folded in here rather than made to move. De-duplicated
  // on the href, so an owner who lists it in both places gets one mark.
  const socials = useMemo(() => {
    const raw = [instagram_url, ...(Array.isArray(social_links) ? social_links : [])];
    const seen = new Set();
    return raw
      .filter(u => typeof u === 'string' && u.trim())
      .map(identify)
      .filter(Boolean)
      .filter(s => !seen.has(s.href) && seen.add(s.href));
  }, [instagram_url, social_links]);

  const address = site_address ? site_address.replace(/^https?:\/\//, '') : null;

  // The photo box holds two things and shows one. A portrait and a code are
  // the same shape of object — a square you look at — and the card only has
  // room to do one of them properly, so they share the slot and the box is
  // the switch. That is what let the photo get big: the code used to sit at
  // the bottom of the column taking a hundred pixels of its own.
  //
  // It opens on whichever side has something on it. A journal with no portrait
  // set showing an empty frame, with the code hidden behind it, would be a card
  // that starts on its blank side for no reason.
  const canTurnSlot = Boolean(portrait_url && address);
  const [slotCode, setSlotCode] = useState(!portrait_url && Boolean(address));

  // Whether the column has anything left below the fold.
  //
  // The soft edge at the bottom exists to say "there is more" — but it is a
  // position on the box, not on the writing, so it went on softening whatever
  // happened to be down there even once you had scrolled to the end. What was
  // down there is the QR code, and a QR code with its bottom rows faded out is
  // a QR code that does not scan. So the fade is only drawn while it is telling
  // the truth: something is still hidden.
  const innerRef = useRef(null);
  const [more, setMore] = useState(false);
  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const check = () => setMore(el.scrollHeight - el.clientHeight - el.scrollTop > 2);
    check();
    el.addEventListener('scroll', check, { passive: true });
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => {
      el.removeEventListener('scroll', check);
      observer.disconnect();
    };
    // stamps and the bio arrive after the first paint and both change how tall
    // the column is, so the measurement has to be taken again when they land.
  }, [stamps, blurb]);

  return (
    <section className="idc" aria-label="About this journal">
      {/* href + precedence lets React hoist this once into the head rather than
          inline it per instance — the landing page mounts a card in both its
          desktop and its mobile markup, and without this the same stylesheet
          would be in the document twice. */}
      <style href="ln-identity-card" precedence="default">{`
        .idc {
          --idc-rule: color-mix(in srgb, var(--ink) 15%, transparent);
          width: 100%;
          max-width: 340px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          /* No stock, no border, no shadow. The front of the cover is the
             beacon on the page's own colour and this is the same page. */
          background: none;
          /* The turn control anchors to this, not to the scroller — it has to
             hold still while the column moves under it. The padding is the band
             it sits in: floating it over the scroller instead meant that as
             soon as the column was one line too long for the screen, the pill
             came down on top of the QR code and took a bite out of it. A code
             with a bite out of it does not scan. */
          position: relative;
          padding-bottom: 48px;
        }
        /* Everything inside scrolls, the column itself does not. On a phone the
           landing page is a fixed pair of snapped panes with no document scroll
           of its own, so anything taller than the pane has to carry its own
           scroller or its bottom is simply unreachable. */
        /* Block flow, not a flex column. As a flex column every child was a
           flex item free to shrink, and on a phone — where this sits in a pane
           of fixed height — they all did: the portrait lost its 3:4 shape and
           squashed into a letterbox, and the two counts stretched apart from
           their own labels. Nothing here needs flex; it is a stack of things
           centred on a page. */
        .idc-inner {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          text-align: center;
          /* 24px of floor against a 20px fade, so at rest the fade lands in the
             padding and is invisible, and only starts eating ink once there is
             ink scrolling under it. */
          padding: 2px 4px 24px;
        }
        /* Only while something is genuinely still below — see the note beside
           the measurement in the component. */
        .idc-inner--more {
          mask-image: linear-gradient(to bottom, #000 calc(100% - 20px), transparent);
          -webkit-mask-image: linear-gradient(to bottom, #000 calc(100% - 20px), transparent);
        }
        /* The fade is the affordance here; a 6px grey bar down the side of a
           card is not. */
        .idc-inner { scrollbar-width: none; }
        .idc-inner::-webkit-scrollbar { display: none; }

        /* ── Header ── the mark, on its own. The journal's name was set under
           it in condensed caps and said the same thing twice: every copy of
           this software is a listening journal, so printing the words is a
           label on a label. The mark keeps the name in its aria-label, which
           is where a reader who cannot see it still needs it.
           The dot on the period is lit while something is playing — the same
           fact the front of the cover carries, and the only thing on this side
           that moves. */
        .idc-mark { display: block; height: 46px; width: auto; margin: 4px auto 0; }
        .idc-mark path { fill: var(--ink); }
        /* The dot on the period. globals.css defines these two classes inside
           a max-width:768px block for the cover's own logo, so on a wide screen
           the circle would fall back to an SVG default fill of black and vanish
           in the dark. The card states them for itself. */
        .idc-mark .hp-logo-mark-dot { fill: var(--ink); }
        .idc-mark .hp-logo-mark-dot--live {
          fill: var(--live);
          animation: idc-dot-pulse 2.5s ease-in-out infinite;
        }
        @keyframes idc-dot-pulse {
          0%, 100% { opacity: 1; }
          50%      { opacity: 0.55; }
        }
        @media (prefers-reduced-motion: reduce) {
          .idc-mark .hp-logo-mark-dot--live { animation: none; }
        }
        /* ── Rules ── the dashed lines that divide a form up, drawn as a
           background gradient rather than a dashed border: a CSS dashed border
           picks its own dash length and picks wrong at this weight. */
        .idc-rule {
          width: 100%;
          height: 1px;
          margin: 20px 0;
          background-image: linear-gradient(to right, var(--idc-rule) 0 4px, transparent 4px 9px);
          background-size: 9px 1px;
          background-repeat: repeat-x;
        }

        /* ── The slot ── centred and above its caption, rather than beside a
           column of fields. This is the change that made the card fit a phone:
           a photo and a form side by side needs width the screen hasn't got.
           It holds two things and shows one — the portrait and the code for
           the address — which is what paid for the photo being this size. */
        .idc-portrait {
          display: block;
          width: 168px;
          margin: 0 auto;
          padding: 0;
          aspect-ratio: 3 / 4;
          background: var(--bg-warm);
          border: 1px solid var(--idc-rule);
          overflow: hidden;
          position: relative;
        }
        .idc-portrait--turnable { cursor: pointer; }
        .idc-portrait--turnable:focus-visible {
          outline: 2px solid var(--ink-faint);
          outline-offset: 3px;
        }
        .idc-portrait img { width: 100%; height: 100%; object-fit: cover; display: block; }

        /* The two sides, stacked and cross-faded. Not a rotation: this box
           already lives inside the sheet that turns the whole cover over, and
           nesting one 3D transform inside another is where browsers start
           disagreeing with each other. */
        .idc-face-slot {
          position: absolute; inset: 0;
          display: flex; align-items: center; justify-content: center;
          opacity: 0;
          transition: opacity 0.26s ease;
          pointer-events: none;
        }
        .idc-face-slot--on { opacity: 1; }
        /* The code paints its own quiet zone, so it wants the whole width of
           the box rather than padding around it, and the box behind it takes
           the code's own paper colour so the two read as one plate. */
        .idc-face-slot--code { background: ${CODE_PAPER}; }
        .idc-face-slot .idc-qr { width: 100%; height: auto; display: block; }

        /* No portrait set. Registration corners rather than a grey box with a
           person-shaped icon in it — this is a frame waiting for a photo and it
           should look like one. */
        .idc-portrait-empty { position: absolute; inset: 0; }
        .idc-portrait-empty::before,
        .idc-portrait-empty::after {
          content: ''; position: absolute; width: 13px; height: 13px;
          border: 1px solid var(--idc-rule);
        }
        .idc-portrait-empty::before { top: 8px; left: 8px; border-right: 0; border-bottom: 0; }
        .idc-portrait-empty::after  { bottom: 8px; right: 8px; border-left: 0; border-top: 0; }

        /* The only sign that the box does anything. Quiet enough to read as a
           mark printed in the corner of a card, loud enough that somebody
           looking for something to press finds it. */
        .idc-portrait-badge {
          position: absolute; right: 6px; bottom: 6px;
          display: flex; align-items: center; justify-content: center;
          width: 21px; height: 21px; border-radius: 6px;
          background: var(--bg);
          border: 1px solid var(--idc-rule);
          color: var(--ink-faint);
          transition: color 0.15s;
        }
        .idc-portrait--turnable:hover .idc-portrait-badge { color: var(--ink); }

        @media (prefers-reduced-motion: reduce) {
          .idc-face-slot { transition: none; }
        }

        .idc-keeper {
          font-family: var(--font-label);
          font-size: 12px; letter-spacing: 0.14em; text-transform: uppercase;
          color: var(--ink);
          margin: 12px 0 0;
        }

        /* ── The filled-in rows ── one grid rather than three, so every answer
           starts at the same place down the card no matter how long its label
           is. Left-ranged as a block and the block centred: a form reads down
           its own left edge, and centring the rows individually would give it
           three of them. */
        .idc-fields {
          display: grid;
          grid-template-columns: auto 1fr;
          column-gap: 12px;
          row-gap: 11px;
          align-items: baseline;
          width: 100%;
          max-width: 292px;
          margin: 0 auto;
          text-align: left;
        }
        .idc-field-label {
          font-family: var(--font-label);
          font-size: 9px; letter-spacing: 0.11em; text-transform: uppercase;
          color: var(--ink-faint);
          white-space: nowrap;
        }
        /* The answer sits on its own rule, which is drawn whether or not there
           is an answer on it yet. Dotted rather than solid, at the same rhythm
           as the dividers between blocks. */
        .idc-field-value {
          margin: 0;
          min-height: 15px;
          padding-bottom: 4px;
          font-family: var(--font-label);
          font-size: 12.5px; letter-spacing: 0.02em; color: var(--ink);
          word-break: break-word;
          background-image: linear-gradient(to right, var(--idc-rule) 0 2px, transparent 2px 5px);
          background-size: 5px 1px;
          background-position: left bottom;
          background-repeat: repeat-x;
        }

        /* Left-ranged inside a centred block. Everything else on the card is
           one or two words and centres happily; this is the one run of real
           prose, and six centred lines is a ragged left edge to read down. */
        .idc-bio {
          font-size: 13px; line-height: 1.75; color: var(--ink-soft);
          margin: 0 auto; max-width: 300px; text-align: left;
          font-size: 12.5px; line-height: 1.62;
        }

        /* ── Doors ── the pages this card is the way to. /why only exists once
           its owner has written it, which is why it is conditional. */
        .idc-doors { display: flex; flex-wrap: wrap; gap: 7px; justify-content: center; }
        .idc-doors .ln-pill { padding: 8px 15px; font-size: 9px; letter-spacing: 0.11em; }

        /* ── Elsewhere ── wherever else the keeper is, as marks rather than as
           written-out addresses. Absent entirely when they have listed none,
           which is a supported answer and not a gap. */
        .idc-socials { display: flex; gap: 4px; justify-content: center; margin-top: 16px; }
        .idc-social {
          display: flex; align-items: center; justify-content: center;
          width: 34px; height: 34px; border-radius: 10px;
          color: var(--ink-faint);
          transition: color 0.15s, background 0.15s;
        }
        .idc-social:hover { color: var(--ink); background: var(--bg-warm); }

        /* ── Signature ── the address, and only in the form you point a phone
           at. It lives behind the portrait rather than at the foot of the
           column, where it cost a rule and a hundred pixels of height that the
           photo wanted. It carries the address in its aria-label for anyone not
           looking at it. */
        .idc-qr { display: block; margin: 0 auto; color: var(--ink); }

        /* ── The way back ── pinned rather than sitting at the end of the
           column. A way back you have to scroll to find is not one. */
        .idc-turn {
          position: absolute;
          left: 50%; bottom: 2px;
          transform: translateX(-50%);
          z-index: 2;
          gap: 7px;
          background: var(--bg);
        }
        .idc-turn svg { color: var(--ink-faint); transition: color 0.15s; }
        .idc-turn:hover svg { color: var(--ink); }

        /* A phone gets one pane and no document scroll, so the column is
           tuned to land inside one: same card, every measure a notch down. What
           does not fit scrolls under the fade rather than being cut. */
        /* A wide screen has the height to print the whole column without
           scrolling it, and the width to set the bio a line or two shorter. */
        @media (min-width: 769px) {
          .idc { max-width: 376px; }
          .idc-rule { margin: 12px 0; }
          .idc-portrait { width: 186px; }
        }

        @media (max-width: 480px) {
          .idc-mark { height: 36px; }
          .idc-rule { margin: 10px 0; }
          .idc-bio { font-size: 12px; line-height: 1.6; }
          .idc-portrait { width: 156px; }
          .idc-socials { margin-top: 10px; }
        }
      `}</style>

      <div ref={innerRef} className={'idc-inner' + (more ? ' idc-inner--more' : '')}>
        {/* The site's own mark, with the live dot on its period — the same SVG
            and the same class the cover uses, so the two sides of the page
            report the same thing rather than each deciding for themselves. */}
        <svg
          viewBox={`${MARK_BOX.x} ${MARK_BOX.y} ${MARK_BOX.w} ${MARK_BOX.h}`}
          className="idc-mark"
          role="img"
          aria-label={journal_name}
        >
          {MARK_GLYPHS.map(glyph => (
            <path key={glyph.transform} d={glyph.d} transform={glyph.transform} />
          ))}
          <circle
            cx={MARK_DOT.cx}
            cy={MARK_DOT.cy}
            r={MARK_DOT.r}
            className={'hp-logo-mark-dot' + (isLive ? ' hp-logo-mark-dot--live' : '')}
          />
        </svg>

        <div className="idc-rule" />

        {(() => {
          const faces = (
            <>
              <span className={'idc-face-slot' + (slotCode ? '' : ' idc-face-slot--on')} aria-hidden={slotCode}>
                {portrait_url
                  ? <img src={portrait_url} alt={keeper_name || 'The keeper'} />
                  : <span className="idc-portrait-empty" />}
              </span>
              {address && (
                <span className={'idc-face-slot idc-face-slot--code' + (slotCode ? ' idc-face-slot--on' : '')} aria-hidden={!slotCode}>
                  <AddressCode text={`https://${address}`} />
                </span>
              )}
            </>
          );
          if (!canTurnSlot) return <div className="idc-portrait">{faces}</div>;
          return (
            <button
              type="button"
              className="idc-portrait idc-portrait--turnable"
              onClick={() => setSlotCode(v => !v)}
              aria-pressed={slotCode}
              aria-label={slotCode ? 'Show the portrait' : 'Show the code for this address'}
            >
              {faces}
              <span className="idc-portrait-badge" aria-hidden="true">
                {slotCode ? <User size={12} weight="bold" /> : <QrCode size={12} weight="bold" />}
              </span>
            </button>
          );
        })()}

        {/* The caption belongs to whichever side is showing: a face has a name
            under it, a code has the address it points at. */}
        {(slotCode ? address : keeper_name) && (
          <p className="idc-keeper">{slotCode ? address : keeper_name}</p>
        )}

        <div className="idc-rule" />

        {/* A form, filled in. The label sits outside the line and the answer
            sits on it, so a value nobody has supplied yet leaves a ruled blank
            rather than a missing row — which is the state every fresh copy of
            this software opens in, and it should look deliberate. */}
        <dl className="idc-fields">
          <dt className="idc-field-label">Name:</dt>
          <dd className="idc-field-value">{keeper_name}</dd>

          <dt className="idc-field-label">Est:</dt>
          <dd className="idc-field-value">{since}</dd>

          <dt className="idc-field-label">Albums logged:</dt>
          <dd className="idc-field-value">{records == null ? null : records}</dd>
        </dl>

        {blurb && (
          <>
            <div className="idc-rule" />
            <p className="idc-bio">{blurb}</p>
          </>
        )}

        <div className="idc-rule" />

        <div className="idc-doors">
          {hasNote && <Link href="/why" className="ln-pill">The note</Link>}
          <Link href="/rig" className="ln-pill">The rig</Link>
          <Link href="/key" className="ln-pill">The key</Link>
          <Link href="/submit" className="ln-pill">Send an album</Link>
        </div>

        {socials.length > 0 && (
          <div className="idc-socials">
            {socials.map(({ href, label, Icon }) => (
              <a
                key={href}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="idc-social"
                aria-label={label}
              >
                <Icon size={19} weight="regular" aria-hidden="true" />
              </a>
            ))}
          </div>
        )}

      </div>

      {onFlipBack && (
        <button type="button" className="ln-pill idc-turn" onClick={onFlipBack}>
          <FlipHorizontal size={14} weight="bold" aria-hidden="true" />
          Turn back
        </button>
      )}
    </section>
  );
}
