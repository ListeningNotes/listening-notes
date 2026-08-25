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
  DiscordLogo, FacebookLogo, GithubLogo, InstagramLogo,
  LinkSimple, LinkedinLogo, MediumLogo, QrCode, RedditLogo, SoundcloudLogo,
  Eye, EyeSlash, PencilSimple, Plus, SpotifyLogo, ThreadsLogo, TiktokLogo,
  TwitchLogo, UploadSimple, User, X, XLogo, YoutubeLogo,
} from '@phosphor-icons/react';
import QRCode from 'qrcode';
import { useIdentificationCardEditor } from './IdentificationCardEditor';
import { useListeningBeacon } from '../../hooks/useListeningBeacon';
import { useBookplate } from './Bookplate';

// ── The Ln. mark ──────────────────────────────────────────────────────────
// It sits at the top of the column, and it is the only mark on this side of the
// cover. It was knocked into the middle of the code for a while as well, which
// is a nice object and one mark too many for one card.
const MARK_BOX = { x: 76, y: 96, w: 241, h: 140 };
const MARK_GLYPHS = [
  { d: 'M 44.65625 0 C 37.46875 0 31.160156 -1.601562 25.734375 -4.8125 C 20.304688 -8.019531 16.097656 -12.28125 13.109375 -17.59375 C 10.128906 -22.90625 8.640625 -28.773438 8.640625 -35.203125 L 8.640625 -116.21875 L 36.53125 -116.21875 L 36.53125 -33.203125 C 36.53125 -30.546875 37.46875 -28.222656 39.34375 -26.234375 C 41.226562 -24.242188 43.550781 -23.25 46.3125 -23.25 L 77.03125 -23.25 L 77.03125 0 Z M 44.65625 0 ', transform: 'translate(73.734177, 220.794814)' },
  { d: 'M 91.96875 2 C 85 2 78.742188 0.476562 73.203125 -2.5625 C 67.671875 -5.613281 63.300781 -9.847656 60.09375 -15.265625 C 56.882812 -20.691406 55.28125 -26.835938 55.28125 -33.703125 L 55.28125 -84.5 C 55.28125 -86.269531 54.835938 -87.875 53.953125 -89.3125 C 53.066406 -90.75 51.90625 -91.910156 50.46875 -92.796875 C 49.03125 -93.679688 47.425781 -94.125 45.65625 -94.125 C 43.882812 -94.125 42.28125 -93.679688 40.84375 -92.796875 C 39.40625 -91.910156 38.269531 -90.75 37.4375 -89.3125 C 36.601562 -87.875 36.1875 -86.269531 36.1875 -84.5 L 36.1875 0 L 8.96875 0 L 8.96875 -82.515625 C 8.96875 -89.484375 10.539062 -95.625 13.6875 -100.9375 C 16.84375 -106.25 21.21875 -110.453125 26.8125 -113.546875 C 32.40625 -116.648438 38.6875 -118.203125 45.65625 -118.203125 C 52.738281 -118.203125 59.046875 -116.648438 64.578125 -113.546875 C 70.109375 -110.453125 74.476562 -106.25 77.6875 -100.9375 C 80.90625 -95.625 82.515625 -89.484375 82.515625 -82.515625 L 82.515625 -31.703125 C 82.515625 -29.929688 82.957031 -28.300781 83.84375 -26.8125 C 84.726562 -25.320312 85.859375 -24.160156 87.234375 -23.328125 C 88.617188 -22.492188 90.144531 -22.078125 91.8125 -22.078125 C 93.582031 -22.078125 95.210938 -22.492188 96.703125 -23.328125 C 98.203125 -24.160156 99.394531 -25.320312 100.28125 -26.8125 C 101.164062 -28.300781 101.609375 -29.929688 101.609375 -31.703125 L 101.609375 -116.21875 L 128.65625 -116.21875 L 128.65625 -33.703125 C 128.65625 -26.835938 127.050781 -20.691406 123.84375 -15.265625 C 120.632812 -9.847656 116.265625 -5.613281 110.734375 -2.5625 C 105.203125 0.476562 98.945312 2 91.96875 2 Z M 91.96875 2 ', transform: 'translate(153.915942, 220.794814)' },
];
// The period. It is the one part of the mark that carries a state: lit while
// something is playing.
const MARK_DOT = { cx: 297.0547, cy: 216.71875, r: 14.1328 };

// ── The code ──────────────────────────────────────────────────────────────
// A plain one. It carried the Ln. mark knocked out of the middle for a while,
// which is a nice object and the wrong one for this slot: the mark is already
// at the top of the column, printed larger, and a code has one job.
//
// Losing the mark changes the numbers underneath it. Version 10 at correction
// level H was not carrying the URL — an address this short needs a fraction of
// that — it was carrying the redundancy a hole punched in the middle costs. No
// hole, no need: the encoder picks the smallest version that fits at level M,
// which for an address of this length is a quarter as many modules across the
// same box. Each one ends up several times larger, and a larger module is the
// only thing that actually makes a code easier to read.
//
// Ink and paper stay fixed rather than theme-aware. A camera looks for dark on
// light, and inverting the code for a dark page asks every scanner in the world
// to be one of the ones that cope.
const CODE_QUIET = 4;      // modules of margin, on all four sides
const CODE_INK = '#191917';
const CODE_PAPER = '#f5f4ef';

// Built once per address, at module scope. The two cards on the landing page —
// the desktop markup and the mobile markup — are separate trees asking for the
// same code, and an address only changes if its owner moves house.
const CODE_CACHE = new Map();

function buildCode(url) {
  if (CODE_CACHE.has(url)) return CODE_CACHE.get(url);
  let built = null;
  try {
    const { modules } = QRCode.create(url, { errorCorrectionLevel: 'M' });
    // Whole cells, no inset and no radius: neighbouring modules meet and read
    // as one block, which is what a scanner is looking at. One path rather than
    // a few hundred rects — same picture, one node.
    let d = '';
    for (let row = 0; row < modules.size; row++) {
      for (let col = 0; col < modules.size; col++) {
        if (modules.data[row * modules.size + col]) d += `M${col} ${row}h1v1h-1z`;
      }
    }
    built = { d, size: modules.size };
  } catch {
    // A card with no code on it is still a card; a card that throws while
    // rendering is a blank page.
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

export function identify(url) {
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
// card. The matrix is computed here and the picture is ours.
function AddressCode({ text }) {
  const code = useMemo(() => buildCode(text), [text]);
  if (!code) return null;

  const span = code.size + CODE_QUIET * 2;
  return (
    <svg
      className="idc-qr"
      viewBox={`${-CODE_QUIET} ${-CODE_QUIET} ${span} ${span}`}
      shapeRendering="crispEdges"
      role="img"
      aria-label={`Scannable code for ${text}`}
    >
      {/* The quiet zone is part of the code, not padding around it — a scanner
          needs the clear margin to find the edges. Painting it here means the
          code carries its own margin wherever the box puts it. */}
      <rect x={-CODE_QUIET} y={-CODE_QUIET} width={span} height={span} fill={CODE_PAPER} />
      <path d={code.d} fill={CODE_INK} />
    </svg>
  );
}

export default function IdentityCard({ stamps, authed = false }) {
  const settings = useBookplate();
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
    hidden_fields,
    has_note: hasNote,
  } = settings;
  const { isLive } = useListeningBeacon();
  // Only ever true for the person who keeps the journal, and only the visible
  // half of that: the writing endpoints check the wristband for themselves.
  const edit = useIdentificationCardEditor(settings);
  const editing = edit.editing;

  const records = stamps?.records ?? null;

  // Rows the keeper would rather not publish. They can never be edited — these
  // are counted off the entries — but not everyone wants to say how new they
  // are or how few they have logged, and a number you cannot take off the card
  // is a number that stops people keeping one.
  const hiding = Array.isArray(hidden_fields) ? hidden_fields : [];

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

  // A textarea that grows instead of scrolling. Two lines of arithmetic, but
  // they have to run on mount as well as on every keystroke, or a bio that is
  // already three lines long opens showing one of them.
  const grow = event => {
    const el = event.currentTarget;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  };
  const growOnMount = el => {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  };

  // ── The slot ────────────────────────────────────────────────────────────
  // Built here rather than inline, because inline it was an immediately-called
  // function inside the JSX, and everything inside one of those counts as
  // render.
  //
  // Editing shows the photo side and nothing else: the code is not a thing
  // being changed, and a box that turns to a QR halfway through choosing a
  // picture is a box arguing with you.
  const showingCode = slotCode && !editing;
  const shownPortrait = editing ? edit.portrait : portrait_url;
  const slotFaces = (
    <>
      <span className={'idc-face-slot' + (showingCode ? '' : ' idc-face-slot--on')} aria-hidden={showingCode}>
        {shownPortrait
          ? <img src={shownPortrait} alt={keeper_name || 'The keeper'} />
          : <span className="idc-portrait-empty" />}
      </span>
      {address && (
        <span className={'idc-face-slot idc-face-slot--code' + (showingCode ? ' idc-face-slot--on' : '')} aria-hidden={!showingCode}>
          <AddressCode text={`https://${address}`} />
        </span>
      )}
    </>
  );

  let slot;
  if (editing) {
    // Same box, same size, same place. Only what pressing it does has changed.
    //
    // A label wrapping the file input, rather than a button reaching for one:
    // clicking a label opens its own input with no script and nothing to hold
    // a reference to, and the input stays in the tab order so the box is
    // reachable from a keyboard. image/* is what makes an iPhone offer the
    // camera and the photo library rather than a file browser — which is the
    // whole point, a picture of yourself being on your phone and not at an
    // address you can type.
    slot = (
      <div className="idc-portrait idc-portrait--turnable">
        {slotFaces}
        <label className="idc-portrait-hit">
          <input
            className="idc-file"
            type="file"
            accept="image/*"
            onChange={edit.choosePhoto}
            disabled={edit.busy}
          />
          <span className="idc-portrait-badge" aria-hidden="true">
            <UploadSimple size={12} weight="bold" />
          </span>
          <span className="idc-portrait-said">
            {edit.busy ? 'Working…' : edit.portrait ? 'Replace the photo' : 'Choose a photo'}
          </span>
        </label>
        {edit.portrait && (
          <button
            type="button"
            className="idc-portrait-badge idc-portrait-badge--drop"
            onClick={edit.removePhoto}
            disabled={edit.busy}
            aria-label="Remove the photo"
          >
            <X size={12} weight="bold" aria-hidden="true" />
          </button>
        )}
      </div>
    );
  } else if (!canTurnSlot) {
    slot = <div className="idc-portrait">{slotFaces}</div>;
  } else {
    slot = (
      <button
        type="button"
        className="idc-portrait idc-portrait--turnable"
        onClick={() => setSlotCode(v => !v)}
        aria-pressed={slotCode}
        aria-label={slotCode ? 'Show the portrait' : 'Show the code for this address'}
      >
        {slotFaces}
        <span className="idc-portrait-badge" aria-hidden="true">
          {slotCode ? <User size={12} weight="bold" /> : <QrCode size={12} weight="bold" />}
        </span>
      </button>
    );
  }


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
          /* The way back used to be a pill pinned to the bottom of this box,
             which meant reserving a band for it so it never came down on top of
             the code and took a bite out of a thing that has to be read whole.
             It lives in the page's corner now, on both sides of the cover, and
             the card gets that band back. */
          position: relative;
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
          width: 212px;
          margin: 0 auto;
          padding: 0;
          /* Square, because the code is square. A portrait box at 3:4 meant the
             code sat in the middle of it with a band of paper above and below,
             and the box changed what it looked like depending on which side of
             itself it was showing. One shape, two things in it. */
          aspect-ratio: 1 / 1;
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
        /* The owner's one extra line. Quiet enough to belong to the card
           rather than to sit on top of it. */
        .idc-edit { gap: 7px; padding: 8px 15px; font-size: 9px; letter-spacing: 0.11em; }
        .idc-edit svg { color: var(--ink-faint); transition: color 0.15s; }
        .idc-edit:hover svg { color: var(--ink); }
        .idc-edit-actions { display: flex; gap: 7px; justify-content: center; flex-wrap: wrap; }
        .idc-edit-actions .ln-pill:disabled { opacity: 0.5; cursor: default; }
        .idc-trouble {
          font-family: var(--font-label); font-size: 9px; letter-spacing: 0.08em;
          color: var(--fav); margin: 9px 0 0;
        }

        /* Editing does not swap the card for a form. Nothing moves, nothing is
           replaced, and the only thing this class does is stop the soft bottom
           edge — that edge means "there is more below", and fading the row you
           are typing into says something else. */
        .idc-inner--editing {
          mask-image: none;
          -webkit-mask-image: none;
        }

        /* ── A field, dressed as the line it will become ──────────────────
           Every value on this card already sits on a rule in mono at 12.5px.
           An input that inherits all of that, with its own border and box
           removed, is the same line with a caret in it — which is the whole
           point: you should not be able to tell the card changed, only that
           you can type. */
        .idc-field-input {
          width: 100%;
          border: 0;
          border-radius: 0;
          padding: 0;
          background: transparent;
          font-family: inherit;
          font-size: inherit;
          letter-spacing: inherit;
          color: var(--ink);
        }
        .idc-field-input:focus { outline: none; }
        .idc-field-input::placeholder { color: var(--ink-faint); }
        /* The one hint that a line is live: its rule firms up under the caret,
           in the same place the dots already were. */
        .idc-fields--editing .idc-field-value:focus-within,
        .idc-links .idc-field-input:focus {
          background-image: linear-gradient(to right, var(--ink-faint) 0 100%);
          background-size: 100% 1px;
        }
        /* min-width:0 on both, or the input's own content sets the floor and
           the row pushes out past the edge of the card — a flex item and a
           grid track both default to being at least as wide as what is in
           them, which for a text field is the whole line you typed. */
        .idc-field-value { display: flex; align-items: baseline; gap: 8px; min-width: 0; }
        .idc-field-input { min-width: 0; }

        /* Leaving a counted row off. It stays in place while you are editing,
           struck through rather than removed, so the way back is where the way
           out was. */
        .idc-field-value--off { color: var(--ink-faint); text-decoration: line-through; }
        .idc-field-eye {
          margin-left: auto; flex-shrink: 0;
          display: inline-flex; align-items: center; justify-content: center;
          width: 24px; height: 24px; border-radius: 7px;
          color: var(--ink-faint); background: transparent; border: 0;
          cursor: pointer; transition: color 0.15s, background 0.15s;
        }
        .idc-field-eye:hover { color: var(--ink); background: var(--bg-warm); }

        /* The bio, still the bio. Type, measure, leading and colour all come
           from .idc-bio; this only removes the chrome a textarea arrives with
           and lets it grow rather than scroll. */
        .idc-bio-input {
          display: block;
          width: 100%;
          border: 0;
          padding: 0;
          background: transparent;
          resize: none;
          overflow: hidden;
          font: inherit;
          letter-spacing: inherit;
        }
        .idc-bio-input:focus { outline: none; }
        .idc-bio-input::placeholder { color: var(--ink-faint); }

        /* The marks, opened out. Same icons in the same order in the same
           place; each one just gets the line it stands for beside it. */
        .idc-links { width: 100%; max-width: 292px; margin: 16px auto 0; text-align: left; }
        .idc-link-row {
          display: grid; grid-template-columns: 22px minmax(0, 1fr) 24px;
          gap: 8px; align-items: center;
        }
        .idc-link-row + .idc-link-row { margin-top: 10px; }
        .idc-link-mark { display: inline-flex; color: var(--ink-faint); }
        .idc-link-row .idc-field-input {
          font-family: var(--font-label); font-size: 11.5px;
          padding-bottom: 4px;
          background-image: linear-gradient(to right, var(--idc-rule) 0 2px, transparent 2px 5px);
          background-size: 5px 1px;
          background-position: left bottom;
          background-repeat: repeat-x;
        }
        .idc-link-drop, .idc-link-add {
          display: inline-flex; align-items: center; justify-content: center;
          height: 24px; border-radius: 7px;
          color: var(--ink-faint); background: transparent; border: 0;
          cursor: pointer; transition: color 0.15s, background 0.15s;
        }
        .idc-link-drop { width: 24px; }
        .idc-link-drop:hover, .idc-link-add:hover { color: var(--ink); background: var(--bg-warm); }
        .idc-link-add {
          gap: 5px; padding: 0 9px; margin-top: 11px;
          font-family: var(--font-label); font-size: 9px;
          letter-spacing: 0.11em; text-transform: uppercase;
        }

        /* The photo box while it is a way to choose one. Same box, same size,
           same place — only what pressing it does has changed. */
        .idc-portrait-hit {
          position: absolute; inset: 0;
          display: flex; align-items: flex-end; justify-content: center;
          padding-bottom: 10px;
          cursor: pointer;
        }
        /* Hidden from sight but not from the keyboard. The hidden attribute
           would take it out of the tab order and leave the box unreachable
           without a mouse; this keeps it focusable and lets the label do the
           rest. A backtick in here would end the stylesheet, which is a thing
           this file has now learned once. */
        .idc-file {
          position: absolute; width: 1px; height: 1px;
          opacity: 0; pointer-events: none;
        }
        .idc-file:focus-visible + .idc-portrait-badge {
          outline: 2px solid var(--ink-faint); outline-offset: 2px;
        }
        /* What the box is offering, said once, at the bottom of it. Only while
           editing, and only over a picture it will not obscure. */
        .idc-portrait-said {
          font-family: var(--font-label);
          font-size: 8.5px; letter-spacing: 0.1em; text-transform: uppercase;
          color: var(--ink-soft);
          background: var(--bg);
          border: 1px solid var(--idc-rule);
          border-radius: 999px;
          padding: 4px 10px;
        }
        .idc-portrait-hit:hover .idc-portrait-said { color: var(--ink); }
        .idc-portrait-badge--drop {
          right: auto; left: 6px;
          cursor: pointer;
        }

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

        /* ── Signature ── the address, and only ever in the form you point a
           phone at. It lives behind the portrait rather than at the foot of the
           column, where it cost a rule and a hundred pixels of height that the
           photo wanted. Nowhere on this card is it printed as text: a code is
           a door, a URL is a door with the hinges written on it, and half the
           copies of this software will be living at an address nobody chose.
           It reaches anyone who cannot see the code through its aria-label. */
        .idc-qr { display: block; margin: 0 auto; color: var(--ink); }

        /* A phone gets one pane and no document scroll, so the column is
           tuned to land inside one: same card, every measure a notch down. What
           does not fit scrolls under the fade rather than being cut. */
        /* A wide screen has the height to print the whole column without
           scrolling it, and the width to set the bio a line or two shorter. */
        @media (min-width: 769px) {
          .idc { max-width: 376px; }
          .idc-rule { margin: 12px 0; }
          .idc-portrait { width: 244px; }
        }

        @media (max-width: 480px) {
          .idc-mark { height: 36px; }
          .idc-rule { margin: 10px 0; }
          .idc-bio { font-size: 12px; line-height: 1.6; }
          .idc-portrait { width: 204px; }
          .idc-socials { margin-top: 10px; }
        }
      `}</style>

      <div ref={innerRef} className={'idc-inner' + (more ? ' idc-inner--more' : '') + (editing ? ' idc-inner--editing' : '')}>
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

        {slot}

        {/* The keeper's name, whichever side of the box is showing. It used to
            swap to the address when the code came up, which put a URL on the
            card — and a URL is the thing the code exists to avoid printing.
            This journal's happens to read nicely; a copy of this software
            parked on a hosting subdomain does not, and a card should not look
            worse because of where it is served from. The address still reaches
            anyone who cannot see the code, in its label.
            It is also one less thing moving: the caption holds its line
            instead of being replaced every time the box is pressed. */}
        {keeper_name && <p className="idc-keeper">{keeper_name}</p>}

        <div className="idc-rule" />

        {/* A form, filled in. The label sits outside the line and the answer
            sits on it, so a value nobody has supplied yet leaves a ruled blank
            rather than a missing row — which is the state every fresh copy of
            this software opens in, and it should look deliberate. */}
        {/* The same grid either way. Name is a line you write on, so editing
            puts a caret on it rather than a form field over it — the input
            inherits the row's type and the row's rule and is invisible until
            you touch it. The two counted rows are never writable; while
            editing they grow an eye instead, because a number you cannot take
            off the card is a number that stops someone keeping one. */}
        <dl className={'idc-fields' + (editing ? ' idc-fields--editing' : '')}>
          <dt className="idc-field-label">Name:</dt>
          <dd className="idc-field-value">
            {editing
              ? <input
                  className="idc-field-input"
                  type="text"
                  value={edit.name}
                  onChange={e => edit.setName(e.target.value)}
                  placeholder="Your name"
                  aria-label="Name"
                />
              : keeper_name}
          </dd>

          {(editing || !hiding.includes('since')) && (
            <>
              <dt className="idc-field-label">Keeping since:</dt>
              <dd className={'idc-field-value' + (editing && edit.hidden.has('since') ? ' idc-field-value--off' : '')}>
                {since}
                {editing && (
                  <button
                    type="button"
                    className="idc-field-eye"
                    onClick={() => edit.toggleHidden('since')}
                    aria-pressed={edit.hidden.has('since')}
                    aria-label={edit.hidden.has('since') ? 'Show this row on the card' : 'Leave this row off the card'}
                  >
                    {edit.hidden.has('since')
                      ? <EyeSlash size={13} weight="regular" aria-hidden="true" />
                      : <Eye size={13} weight="regular" aria-hidden="true" />}
                  </button>
                )}
              </dd>
            </>
          )}

          {(editing || !hiding.includes('albums')) && (
            <>
              <dt className="idc-field-label">Albums logged:</dt>
              <dd className={'idc-field-value' + (editing && edit.hidden.has('albums') ? ' idc-field-value--off' : '')}>
                {records == null ? null : records}
                {editing && (
                  <button
                    type="button"
                    className="idc-field-eye"
                    onClick={() => edit.toggleHidden('albums')}
                    aria-pressed={edit.hidden.has('albums')}
                    aria-label={edit.hidden.has('albums') ? 'Show this row on the card' : 'Leave this row off the card'}
                  >
                    {edit.hidden.has('albums')
                      ? <EyeSlash size={13} weight="regular" aria-hidden="true" />
                      : <Eye size={13} weight="regular" aria-hidden="true" />}
                  </button>
                )}
              </dd>
            </>
          )}
        </dl>

        {/* Same measure, same size, same leading, same colour. A textarea set
            in the paragraph's own type is the paragraph, with a caret in it. */}
        {editing ? (
          <>
            <div className="idc-rule" />
            <textarea
              className="idc-bio idc-bio-input"
              value={edit.bio}
              onChange={e => edit.setBio(e.target.value)}
              onInput={grow}
              ref={growOnMount}
              placeholder="A line or two about whoever keeps this."
              aria-label="Bio"
            />
          </>
        ) : blurb ? (
          <>
            <div className="idc-rule" />
            <p className="idc-bio">{blurb}</p>
          </>
        ) : null}

        <div className="idc-rule" />

        {/* Unchanged, and unclickable while editing: following one of these
            mid-sentence would navigate away from an unsaved card. */}
        <div className="idc-doors" inert={editing ? true : undefined}>
          {hasNote && <Link href="/why" className="ln-pill">The note</Link>}
          <Link href="/rig" className="ln-pill">The rig</Link>
          <Link href="/key" className="ln-pill">The key</Link>
          <Link href="/submit" className="ln-pill">Send an album</Link>
        </div>

        {/* The same list, in the same place. A row of marks is not something
            you can type into, so editing opens each one onto its own line —
            still the marks, with the address they stand for beside them. */}
        {editing ? (
          <div className="idc-links">
            {edit.links.map((link, index) => {
              const known = link.trim() ? identify(link.trim()) : null;
              const Icon = known ? known.Icon : LinkSimple;
              return (
                <div className="idc-link-row" key={index}>
                  <span className="idc-link-mark" aria-hidden="true">
                    <Icon size={17} weight="regular" />
                  </span>
                  <input
                    className="idc-field-input"
                    type="url"
                    inputMode="url"
                    value={link}
                    onChange={e => edit.setLink(index, e.target.value)}
                    placeholder="https://…"
                    aria-label={known ? known.label : `Link ${index + 1}`}
                  />
                  <button
                    type="button"
                    className="idc-link-drop"
                    onClick={() => edit.dropLink(index)}
                    aria-label={`Remove link ${index + 1}`}
                  >
                    <X size={12} weight="bold" aria-hidden="true" />
                  </button>
                </div>
              );
            })}
            <button type="button" className="idc-link-add" onClick={edit.addLink}>
              <Plus size={11} weight="bold" aria-hidden="true" />
              Add a link
            </button>
          </div>
        ) : socials.length > 0 ? (
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
        ) : null}

        {/* The owner's one extra line, in one place whichever state it is in.
            The cover has never had a way in on it — signed in it simply has a
            line more than it did, and signed out none of this is in the page. */}
        {authed && (
          <>
            <div className="idc-rule" />
            {editing ? (
              <div className="idc-edit-actions">
                <button type="button" className="ln-pill" onClick={edit.save} disabled={edit.saving || edit.busy}>
                  {edit.saving ? 'Saving…' : 'Save'}
                </button>
                <button type="button" className="ln-pill" onClick={edit.cancel} disabled={edit.saving}>
                  Cancel
                </button>
              </div>
            ) : (
              <button type="button" className="ln-pill idc-edit" onClick={edit.begin}>
                <PencilSimple size={12} weight="bold" aria-hidden="true" />
                Edit this card
              </button>
            )}
            {edit.trouble && <p className="idc-trouble">{edit.trouble}</p>}
          </>
        )}

      </div>
    </section>
  );
}
