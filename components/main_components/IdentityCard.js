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

import { useMemo } from 'react';
import Link from 'next/link';
import {
  DiscordLogo, FacebookLogo, FlipHorizontal, GithubLogo, InstagramLogo,
  LinkSimple, LinkedinLogo, MediumLogo, RedditLogo, SoundcloudLogo,
  SpotifyLogo, ThreadsLogo, TiktokLogo, TwitchLogo, XLogo, YoutubeLogo,
} from '@phosphor-icons/react';
import qrcode from 'qrcode-generator';
import { useListeningBeacon } from '../../hooks/useListeningBeacon';
import { useBookplate } from './Bookplate';

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
// Drawn as one <path> of black squares rather than a grid of rects: a 29-module
// code is 841 elements, and at this size the browser spends longer laying them
// out than it does drawing them. currentColor rather than black, so the code
// inverts with the rest of the page and stays scannable in the dark — readers
// scan for contrast, not for colour.
function QrCode({ text, size = 96 }) {
  const path = useMemo(() => {
    try {
      const qr = qrcode(0, 'M');
      qr.addData(text);
      qr.make();
      const n = qr.getModuleCount();
      let d = '';
      for (let row = 0; row < n; row++) {
        for (let col = 0; col < n; col++) {
          if (qr.isDark(row, col)) d += `M${col} ${row}h1v1h-1z`;
        }
      }
      return { d, n };
    } catch {
      return null; // too much data for the version chosen — draw nothing
    }
  }, [text]);

  if (!path) return null;
  return (
    <svg
      className="idc-qr"
      width={size}
      height={size}
      viewBox={`-2 -2 ${path.n + 4} ${path.n + 4}`}
      shapeRendering="crispEdges"
      role="img"
      aria-label={`QR code for ${text}`}
    >
      <path d={path.d} fill="currentColor" />
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
             hold still while the column moves under it. */
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
          /* 58px of floor against a 26px fade and the turn control below it, so
             at rest the fade lands in the padding and is invisible, and it only
             starts eating ink once there is ink scrolling under it. */
          padding: 2px 4px 58px;
          mask-image: linear-gradient(to bottom, #000 calc(100% - 26px), transparent);
          -webkit-mask-image: linear-gradient(to bottom, #000 calc(100% - 26px), transparent);
        }
        /* Firefox still wants the prefix-free scrollbar hidden separately; the
           fade is the affordance here, a 6px grey bar down the side of a card
           is not. */
        .idc-inner { scrollbar-width: none; }
        .idc-inner::-webkit-scrollbar { display: none; }

        /* ── Header ── the mark, then the name under it. The dot on the period
           is lit while something is playing, which is the same fact the front
           of the cover carries and the only thing on this side that moves. */
        .idc-mark { display: block; height: 34px; width: auto; margin: 0 auto; }
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
        .idc-name {
          font-family: var(--font-anton), var(--font-display), sans-serif;
          font-weight: 400;
          font-size: 25px;
          line-height: 1.02;
          letter-spacing: 0.012em;
          text-transform: uppercase;
          color: var(--ink);
          margin: 11px 0 0;
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

        /* ── Portrait ── centred and above its name, rather than beside a
           column of fields. This is the change that made the card fit a phone:
           a photo and a form side by side needs width the screen hasn't got. */
        .idc-portrait {
          width: 102px;
          margin: 0 auto;
          aspect-ratio: 3 / 4;
          background: var(--bg-warm);
          border: 1px solid var(--idc-rule);
          overflow: hidden;
          position: relative;
        }
        .idc-portrait img { width: 100%; height: 100%; object-fit: cover; display: block; }
        /* No portrait set. Registration corners rather than a grey box with a
           person-shaped icon in it — this is a frame waiting for a photo and it
           should look like one. */
        .idc-portrait--empty::before,
        .idc-portrait--empty::after {
          content: ''; position: absolute; width: 11px; height: 11px;
          border: 1px solid var(--idc-rule);
        }
        .idc-portrait--empty::before { top: 6px; left: 6px; border-right: 0; border-bottom: 0; }
        .idc-portrait--empty::after  { bottom: 6px; right: 6px; border-left: 0; border-top: 0; }

        .idc-keeper {
          font-family: var(--font-label);
          font-size: 12px; letter-spacing: 0.14em; text-transform: uppercase;
          color: var(--ink);
          margin: 12px 0 0;
        }

        /* ── The two numbers ── label over value, side by side. The only place
           on the card where anything sits next to anything else. */
        .idc-counts { display: flex; gap: 34px; justify-content: center; }
        .idc-count-label {
          display: block;
          font-family: var(--font-label);
          font-size: 8.5px; letter-spacing: 0.15em; text-transform: uppercase;
          color: var(--ink-faint);
          margin-bottom: 6px;
        }
        .idc-count-value {
          font-family: var(--font-label);
          font-size: 13px; letter-spacing: 0.02em; color: var(--ink);
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
           at. It used to be printed underneath as well, which is a line of type
           telling a reader the address of the page they are already on; the
           code is for getting off this screen and onto another one, and it
           carries the address in its aria-label for anyone not looking. */
        /* A block element ignores the column's text-align, so it centres
           itself or it sits hard against the left edge. */
        .idc-qr { display: block; margin: 0 auto; color: var(--ink); }

        /* ── The way back ── pinned rather than sitting at the end of the
           column. A way back you have to scroll to find is not one. */
        .idc-turn {
          position: absolute;
          left: 50%; bottom: 0;
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
          .idc-rule { margin: 16px 0; }
        }

        @media (max-width: 480px) {
          .idc-name { font-size: 23px; }
          .idc-rule { margin: 13px 0; }
          .idc-bio { font-size: 12px; line-height: 1.6; }
          .idc-portrait { width: 96px; }
          .idc-socials { margin-top: 12px; }
          .idc-qr { width: 78px; height: 78px; }
        }
      `}</style>

      <div className="idc-inner">
        {/* The site's own mark, with the live dot on its period — the same SVG
            and the same class the cover uses, so the two sides of the page
            report the same thing rather than each deciding for themselves. */}
        <svg viewBox="76 96 241 140" className="idc-mark" xmlns="http://www.w3.org/2000/svg" role="img" aria-label={journal_name}>
          <path d="M 44.65625 0 C 37.46875 0 31.160156 -1.601562 25.734375 -4.8125 C 20.304688 -8.019531 16.097656 -12.28125 13.109375 -17.59375 C 10.128906 -22.90625 8.640625 -28.773438 8.640625 -35.203125 L 8.640625 -116.21875 L 36.53125 -116.21875 L 36.53125 -33.203125 C 36.53125 -30.546875 37.46875 -28.222656 39.34375 -26.234375 C 41.226562 -24.242188 43.550781 -23.25 46.3125 -23.25 L 77.03125 -23.25 L 77.03125 0 Z M 44.65625 0 " transform="translate(73.734177, 220.794814)" />
          <path d="M 91.96875 2 C 85 2 78.742188 0.476562 73.203125 -2.5625 C 67.671875 -5.613281 63.300781 -9.847656 60.09375 -15.265625 C 56.882812 -20.691406 55.28125 -26.835938 55.28125 -33.703125 L 55.28125 -84.5 C 55.28125 -86.269531 54.835938 -87.875 53.953125 -89.3125 C 53.066406 -90.75 51.90625 -91.910156 50.46875 -92.796875 C 49.03125 -93.679688 47.425781 -94.125 45.65625 -94.125 C 43.882812 -94.125 42.28125 -93.679688 40.84375 -92.796875 C 39.40625 -91.910156 38.269531 -90.75 37.4375 -89.3125 C 36.601562 -87.875 36.1875 -86.269531 36.1875 -84.5 L 36.1875 0 L 8.96875 0 L 8.96875 -82.515625 C 8.96875 -89.484375 10.539062 -95.625 13.6875 -100.9375 C 16.84375 -106.25 21.21875 -110.453125 26.8125 -113.546875 C 32.40625 -116.648438 38.6875 -118.203125 45.65625 -118.203125 C 52.738281 -118.203125 59.046875 -116.648438 64.578125 -113.546875 C 70.109375 -110.453125 74.476562 -106.25 77.6875 -100.9375 C 80.90625 -95.625 82.515625 -89.484375 82.515625 -82.515625 L 82.515625 -31.703125 C 82.515625 -29.929688 82.957031 -28.300781 83.84375 -26.8125 C 84.726562 -25.320312 85.859375 -24.160156 87.234375 -23.328125 C 88.617188 -22.492188 90.144531 -22.078125 91.8125 -22.078125 C 93.582031 -22.078125 95.210938 -22.492188 96.703125 -23.328125 C 98.203125 -24.160156 99.394531 -25.320312 100.28125 -26.8125 C 101.164062 -28.300781 101.609375 -29.929688 101.609375 -31.703125 L 101.609375 -116.21875 L 128.65625 -116.21875 L 128.65625 -33.703125 C 128.65625 -26.835938 127.050781 -20.691406 123.84375 -15.265625 C 120.632812 -9.847656 116.265625 -5.613281 110.734375 -2.5625 C 105.203125 0.476562 98.945312 2 91.96875 2 Z M 91.96875 2 " transform="translate(153.915942, 220.794814)" />
          <circle cx="297.0547" cy="216.71875" r="14.1328" className={'hp-logo-mark-dot' + (isLive ? ' hp-logo-mark-dot--live' : '')} />
        </svg>

        <h1 className="idc-name">{journal_name}</h1>

        <div className="idc-rule" />

        <div className={'idc-portrait' + (portrait_url ? '' : ' idc-portrait--empty')}>
          {portrait_url && <img src={portrait_url} alt={keeper_name || 'The keeper'} />}
        </div>
        {keeper_name && <p className="idc-keeper">{keeper_name}</p>}

        <div className="idc-rule" />

        <div className="idc-counts">
          {since && (
            <span>
              <span className="idc-count-label">Keeping since</span>
              <span className="idc-count-value">{since}</span>
            </span>
          )}
          {records != null && (
            <span>
              <span className="idc-count-label">Albums logged</span>
              <span className="idc-count-value">{records}</span>
            </span>
          )}
        </div>

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

        {address && (
          <>
            <div className="idc-rule" />
            <QrCode text={`https://${address}`} />
          </>
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
