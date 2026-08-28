// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
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
  CassetteTape, Check, DeviceMobileSpeaker, Equalizer, Eye, EyeSlash,
  GlobeSimple, Guitar, Headphones, MastodonLogo, PencilSimple, PinterestLogo,
  Plus, Radio, SnapchatLogo, SpeakerHifi, SpotifyLogo, TelegramLogo,
  ThreadsLogo, TiktokLogo, TwitchLogo, UploadSimple, User, VinylRecord,
  WhatsappLogo, X, XLogo, YoutubeLogo,
} from '@phosphor-icons/react';
import QRCode from 'qrcode';
import { useListeningBeacon } from '../../hooks/useListeningBeacon';
import { useBookplate } from './Bookplate';
import { CARD_PROMPT, readBioAnswers } from '../../library/bioprompt';

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
// ── Marks you can choose ────────────────────────────────────────────────
// The rig, as a set rather than a picture. Everybody listens on something and
// almost nobody listens on the same thing, so the software offers the shapes
// and the owner says which one is theirs — a pair of headphones printed on the
// card of somebody who plays records is worse than no mark at all.
//
// 'none' is a real answer and the first one for a reason: plenty of people
// listening on whatever came with the phone would rather not describe it, and
// this is a journal about the listening, not the equipment.
export const RIG_ICONS = [
  { name: 'none',       label: 'No rig button', Icon: null },
  { name: 'headphones', label: 'Headphones',    Icon: Headphones },
  { name: 'speakers',   label: 'Speakers',      Icon: SpeakerHifi },
  { name: 'turntable',  label: 'Turntable',     Icon: VinylRecord },
  { name: 'radio',      label: 'Radio',         Icon: Radio },
  { name: 'cassette',   label: 'Tape',          Icon: CassetteTape },
  { name: 'phone',      label: 'Phone',         Icon: DeviceMobileSpeaker },
  { name: 'guitar',     label: 'Instrument',    Icon: Guitar },
  { name: 'equalizer',  label: 'Equalizer',     Icon: Equalizer },
];
export const DEFAULT_RIG_ICON = 'headphones';

export function rigIcon(name) {
  const hit = RIG_ICONS.find(r => r.name === (name || DEFAULT_RIG_ICON));
  return hit ?? RIG_ICONS.find(r => r.name === DEFAULT_RIG_ICON);
}

// The marks a link can wear. The hostname picks one on its own — see identify()
// below, which gets it right for every service anybody names — and this is the
// override for when it does not: a personal site, a service nobody thought of,
// or simply an owner who would rather show something else.
export const LINK_ICONS = [
  { name: 'auto',      label: 'From the address', Icon: null },
  { name: 'instagram', label: 'Instagram', Icon: InstagramLogo },
  { name: 'facebook',  label: 'Facebook',  Icon: FacebookLogo },
  { name: 'x',         label: 'X',         Icon: XLogo },
  { name: 'snapchat',  label: 'Snapchat',  Icon: SnapchatLogo },
  { name: 'tiktok',    label: 'TikTok',    Icon: TiktokLogo },
  { name: 'threads',   label: 'Threads',   Icon: ThreadsLogo },
  { name: 'youtube',   label: 'YouTube',   Icon: YoutubeLogo },
  { name: 'reddit',    label: 'Reddit',    Icon: RedditLogo },
  { name: 'pinterest', label: 'Pinterest', Icon: PinterestLogo },
  { name: 'discord',   label: 'Discord',   Icon: DiscordLogo },
  { name: 'twitch',    label: 'Twitch',    Icon: TwitchLogo },
  { name: 'telegram',  label: 'Telegram',  Icon: TelegramLogo },
  { name: 'whatsapp',  label: 'WhatsApp',  Icon: WhatsappLogo },
  { name: 'mastodon',  label: 'Mastodon',  Icon: MastodonLogo },
  { name: 'soundcloud', label: 'SoundCloud', Icon: SoundcloudLogo },
  { name: 'spotify',   label: 'Spotify',   Icon: SpotifyLogo },
  { name: 'medium',    label: 'Medium',    Icon: MediumLogo },
  { name: 'github',    label: 'GitHub',    Icon: GithubLogo },
  { name: 'linkedin',  label: 'LinkedIn',  Icon: LinkedinLogo },
  { name: 'website',   label: 'Website',   Icon: GlobeSimple },
  { name: 'link',      label: 'Plain link', Icon: LinkSimple },
];

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
  [/(^|\.)snapchat\.com$/,    'Snapchat',   SnapchatLogo],
  [/(^|\.)pinterest\.(com|co\.uk)$/, 'Pinterest', PinterestLogo],
  [/(^|\.)(wa\.me|whatsapp\.com)$/, 'WhatsApp', WhatsappLogo],
  [/(^|\.)(t\.me|telegram\.me)$/, 'Telegram', TelegramLogo],
  [/(^|\.)(mastodon\.social|mas\.to)$/, 'Mastodon', MastodonLogo],
];

export function identify(url, chosen) {
  let host;
  try {
    host = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).hostname.toLowerCase();
  } catch {
    return null; // not a URL at all — better to drop it than render a dead mark
  }
  const hit = SERVICES.find(([pattern]) => pattern.test(host));
  // A mark the owner picked wins over the one the hostname suggests. The
  // hostname is right almost always and the override is for the almost.
  const picked = chosen && chosen !== 'auto'
    ? LINK_ICONS.find(i => i.name === chosen)
    : null;
  return {
    href: /^https?:\/\//i.test(url) ? url : `https://${url}`,
    label: picked ? picked.label : (hit ? hit[1] : host.replace(/^www\./, '')),
    Icon: picked?.Icon || (hit ? hit[2] : LinkSimple),
  };
}

// social_links holds plain strings from before icons could be chosen and
// { url, icon } since. Read through this so neither shape reaches the drawing.
export function readLink(entry) {
  if (typeof entry === 'string') return { url: entry, icon: 'auto' };
  return { url: entry?.url || '', icon: entry?.icon || 'auto' };
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

// `edit` is handed in rather than made here. The prompts print on the About
// pane below this card and are edited there, and one edit session cannot be
// two instances of the hook — so the pane owns it and the card is given it.
export default function IdentityCard({ stamps, authed = false, edit }) {
  const settings = useBookplate();
  const {
    cover_name,
    keeper_name,
    portrait_url,
    portrait_position,
    site_address,
    founded_at,
    hidden_fields,
    bioanswers,
    rig_icon,
    portrait_code_url,
  } = settings;
  const { isLive } = useListeningBeacon();

  // Only ever true for the person who keeps the journal, and only the visible
  // half of that: the writing endpoints check the wristband for themselves.
  const editing = edit.editing;

  const records = stamps?.records ?? null;
  const genres = stamps?.genres ?? [];

  // Rows the keeper would rather not publish. Counted off the entries and never
  // editable — but not everyone wants to say how new they are or how few they
  // have logged, and a number you cannot take off is a number that stops people
  // keeping a card at all.
  const hiding = Array.isArray(hidden_fields) ? hidden_fields : [];
  const showing = key => editing || !hiding.includes(key);

  // Founded date if the keeper set one, otherwise the day the first record was
  // logged. The second is the more honest answer anyway: a listening journal
  // starts when someone writes in it, not when the database row was created.
  const since = monthAndYear(founded_at) || monthAndYear(stamps?.first_listen);

  // The one prompt this card may print, if its keeper answered it.
  const cardAsk = readBioAnswers(bioanswers).find(row => row.key === CARD_PROMPT) || null;


  // What the editor is currently showing, which is the draft rather than what

  // Escape closes it, because anything that covers the page has to have a way
  // out that is not hunting for the button that opened it.

  const address = site_address ? site_address.replace(/^https?:\/\//, '') : null;

  const canTurnSlot = Boolean(portrait_url && address);
  const [slotCode, setSlotCode] = useState(!portrait_url && Boolean(address));

  // ── Framing the picture ─────────────────────────────────────────────────
  // The slot is square and a photograph almost never is, so the browser crops
  // whatever is not in the middle — which for a photograph of a person is
  // frequently their head. This drags the picture inside its box.
  //
  // The arithmetic is real rather than a guessed sensitivity. Under
  // object-fit: cover the image is scaled until its shorter side fills the box,
  // and object-position runs 0% to 100% across exactly the overflow that
  // leaves. So a drag of forty pixels is worth forty pixels of overflow, and at
  // the ends the picture stops instead of sliding on under a finger.
  const dragFrom = useRef(null);
  const innerRef = useRef(null);
  // Which mark is being chosen, if any: 'rig', or the index of a link. One at a
  // time, so opening a second palette closes the first and the card never has

  function frameStart(event) {
    const img = event.currentTarget.querySelector('img');
    if (!img?.naturalWidth) return;
    const box = event.currentTarget.getBoundingClientRect();
    const cover = Math.max(box.width / img.naturalWidth, box.height / img.naturalHeight);
    dragFrom.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      overX: Math.max(0, img.naturalWidth * cover - box.width),
      overY: Math.max(0, img.naturalHeight * cover - box.height),
      fromX: edit.posX,
      fromY: edit.posY,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function frameMove(event) {
    const from = dragFrom.current;
    if (!from) return;
    const clamp = v => Math.min(100, Math.max(0, v));
    // Dragging the picture down reveals what is above it, so the percentage
    // moves against the finger.
    if (from.overX) edit.setPosX(clamp(from.fromX - ((event.clientX - from.pointerX) / from.overX) * 100));
    if (from.overY) edit.setPosY(clamp(from.fromY - ((event.clientY - from.pointerY) / from.overY) * 100));
  }

  function frameEnd() {
    dragFrom.current = null;
  }

  // ── The slot ────────────────────────────────────────────────────────────
  // Built here rather than inline, because inline it was an immediately-called
  // function inside the JSX and everything in one of those counts as render.
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
          ? <img
              src={shownPortrait}
              alt={keeper_name || 'The keeper'}
              draggable={false}
              style={{ objectPosition: editing ? edit.position : (portrait_position || '50% 50%') }}
            />
          : <span className="idc-portrait-empty" />}
      </span>
      {address && (
        <span
          className={'idc-face-slot idc-face-slot--code'
            + (portrait_code_url ? ' idc-face-slot--photo' : '')
            + (showingCode ? ' idc-face-slot--on' : '')}
          aria-hidden={!showingCode}
        >
          {/* The portrait made into the code, when there is one: the photograph
              fills the dark modules and the page shows through the rest, so
              there is no plate behind it and no frame around it — the ragged
              silhouette is the picture. Rendered with hard pixels, because the
              modules have to stay square at any size. Where no such picture
              could be built, the plain code stands in: a worse picture and a
              working one. */}
          {portrait_code_url
            ? <img className="idc-qr idc-qr--photo" src={portrait_code_url} alt={`Scannable code for ${address}`} />
            : <AddressCode text={`https://${address}`} />}
        </span>
      )}
    </>
  );

  // Showing the code made out of the portrait, the box stops being a box. No
  // stock behind it, no shadow under it and no rounded corner clipping it: the
  // page is the background, which is the whole point of the transparency, and a
  // radius on the clip would take a bite out of the quiet zone.
  const bareSlot = showingCode && Boolean(portrait_code_url);

  let slot;
  if (editing) {
    const framing = Boolean(edit.portrait);
    // Same box, same size, same place. Only what pressing it does has changed.
    //
    // With no picture the whole box is the way to choose one; with a picture
    // the box is for moving it, so the label shrinks to its own pill and
    // leaves the rest free to drag. A label around the file input rather than
    // a button reaching for one: clicking a label opens its own input with no
    // script and nothing to hold a reference to, and the input stays in the
    // tab order so the box is reachable from a keyboard. image/* is what makes
    // an iPhone offer the camera and the photo library rather than a file
    // browser, which is the whole point — a picture of yourself is on your
    // phone, not at an address you can type.
    slot = (
      <div
        className={'idc-portrait idc-portrait--turnable' + (framing ? ' idc-portrait--framing' : '')}
        onPointerDown={framing ? frameStart : undefined}
        onPointerMove={framing ? frameMove : undefined}
        onPointerUp={framing ? frameEnd : undefined}
        onPointerCancel={framing ? frameEnd : undefined}
      >
        {slotFaces}
        {framing && <span className="idc-portrait-hint" aria-hidden="true">Drag to reframe</span>}
        <label className={'idc-portrait-hit' + (framing ? ' idc-portrait-hit--pill' : '')}>
          <input
            className="idc-file"
            type="file"
            accept="image/*"
            onChange={edit.choosePhoto}
            disabled={edit.busy}
          />
          {!framing && (
            <span className="idc-portrait-badge" aria-hidden="true">
              <UploadSimple size={12} weight="bold" />
            </span>
          )}
          <span className="idc-portrait-said">
            {edit.busy ? 'Working…' : framing ? 'Replace' : 'Choose a photo'}
          </span>
        </label>
        {framing && (
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
    slot = <div className={'idc-portrait' + (bareSlot ? ' idc-portrait--bare' : '')}>{slotFaces}</div>;
  } else {
    slot = (
      <button
        type="button"
        className={'idc-portrait idc-portrait--turnable' + (bareSlot ? ' idc-portrait--bare' : '')}
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

  // An eye, for a line that is counted and therefore cannot be written but can
  // be left off. Drawn only while editing.
  const eyeFor = key => editing && (
    <button
      type="button"
      className="idc-eye"
      onClick={() => edit.toggleHidden(key)}
      aria-pressed={edit.hidden.has(key)}
      aria-label={edit.hidden.has(key) ? 'Show this on the card' : 'Leave this off the card'}
    >
      {edit.hidden.has(key)
        ? <EyeSlash size={12} weight="regular" aria-hidden="true" />
        : <Eye size={12} weight="regular" aria-hidden="true" />}
    </button>
  );

  const off = key => (editing && edit.hidden.has(key) ? ' idc-off' : '');

  // Whether the counted line under the name has anything left on it.
  const showAlbums = records != null && showing('albums');
  const showSince = Boolean(since) && showing('since');

  // The photograph used to be lifted down the column by a measured spacer, to
  // land on exactly the same line as the beacon's album art on the other face
  // of the cover. There is no other face — the flip is gone — and the two
  // squares line up now by construction rather than by arithmetic: every pane
  // of the cross opens with the same mark at the same height, and the square
  // is the first thing under it. So the measurement, its ResizeObserver and
  // the spacer it fed all came out. See HomeNav.js for the crown that replaced
  // them.

  // Whether the soft bottom edge is telling the truth — see the note by the
  // measurement below.
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
    // The counted rows arrive after the first paint and change how tall the
    // column is, so the measurement has to be taken again when they land.
  }, [stamps, records, since, editing]);

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
             beacon on the page's own colour, and this is the same page. */
          background: none;
          position: relative;
        }
        /* Everything inside scrolls, the column itself does not. On a phone the
           landing page is a fixed pair of snapped panes with no document scroll
           of its own, so anything taller than the pane has to carry its own
           scroller or its bottom is unreachable. */
        .idc-inner {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          text-align: center;
          padding: 0 4px 24px;
        }
        /* Only while something is genuinely still below. The edge means "there
           is more"; drawn when there is not, it fades the last line for no
           reason — and the last line used to be a QR code. */
        .idc-inner--more {
          mask-image: linear-gradient(to bottom, #000 calc(100% - 20px), transparent);
          -webkit-mask-image: linear-gradient(to bottom, #000 calc(100% - 20px), transparent);
        }
        .idc-inner { scrollbar-width: none; }
        .idc-inner::-webkit-scrollbar { display: none; }

        /* ── The head ── the mark in one corner and the way in at the other,
           which is where a card keeps the things that are about the card
           rather than on it. Nothing between them: the name is the first thing
           you read and it wants the middle of the column, not a slot beside a
           logo. */
        .idc-head {
          display: flex; align-items: center; justify-content: space-between;
          gap: 12px; min-height: 30px; margin-bottom: 14px;
        }
        /* 28px, which is what .sitenav-logo-mark and .hp-logo-mark are set to
           in globals.css. The mark is the one thing that appears on every
           surface of this site, so it is the one thing that has to be the same
           size on all of them — a card whose logo is a few pixels off reads as
           a different product rather than as another page. */
        .idc-mark { display: block; height: 28px; width: auto; }
        .idc-mark path { fill: var(--ink); }
        /* The dot on the period. globals.css states these two inside a
           max-width:768px block for the cover's own logo, so on a wide screen
           the circle would fall back to an SVG default of black and vanish in
           the dark. The card states them for itself. */
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

        /* The air that puts the photograph where the beacon's art was. It sits
           under the header rather than over the photograph: the same number of
           pixels either way, but above the photograph it is a hole in the
           middle of a block of writing, and here it is the card's contents
           simply starting further down the page. The header is corner
           furniture; space under it reads as air. */
        .idc-tools { display: flex; align-items: center; gap: 2px; }
        .idc-tool {
          display: inline-flex; align-items: center; justify-content: center;
          width: 30px; height: 30px; border-radius: 9px;
          color: var(--ink-faint); background: transparent; border: 0;
          cursor: pointer; transition: color 0.15s, background 0.15s;
        }
        .idc-tool:hover { color: var(--ink); background: var(--bg-warm); }
        .idc-tool:disabled { opacity: 0.4; cursor: default; }
        /* Saving is the one of these that commits something, so it carries
           full ink where the others are quiet. */
        .idc-tool--keep { color: var(--ink); }

        /* ── The name ── the beacon's own title face, set a step above the
           size it uses. They started matched, which was tidy and wrong: the
           track title on the front is one of four things in a stack and this
           is the first thing you read on a card that is about a person. It
           should arrive before the photograph does.
           Balanced wrapping, because a long name breaking one word onto a
           second line is the worst of the available shapes. */
        .idc-name {
          font-family: var(--font-display);
          font-weight: var(--font-display-weight);
          font-size: 36px; line-height: 1.1; letter-spacing: -0.018em;
          text-wrap: balance;
          color: var(--ink);
          /* The name used to lead the column and needed nothing above it. It
             reads under the photograph now — the mark took the top of the pane
             — and a name set flush against the bottom edge of a picture of the
             person it names looks like a caption that slipped. An ornamented
             name makes it worse: the decorative glyphs reach above the cap
             height and touch the frame. */
          margin: 20px 0 0;
        }
        /* ── Fields that are the same size as the writing they replace ────
           globals.css forces every input on a phone to 16px, with !important,
           to stop iOS zooming the page in on focus. That is the right rule and
           it wrecked this card: the name dropped from 31px to 16 the moment you
           pressed edit, the bio and the two lines jumped up to meet it, and
           everything below reflowed. Which is the disorientation — not the
           editing, the whole card resizing around it.
           So the sizes are stated here, on both sides. Above 16px a field can
           simply match its own text. At or below it cannot, because that is
           where the zoom starts — so on a phone the writing comes up to 16
           instead and the field stops moving. Desktop is untouched by the
           global rule and keeps the smaller type the card was drawn with. */
        .idc-name-input {
          width: 100%; border: 0; padding: 0; background: transparent;
          font: inherit; letter-spacing: inherit; color: var(--ink);
          text-align: center;
        }
        .idc-name-input:focus { outline: none; }
        .idc-name-input::placeholder { color: var(--ink-faint); }

        .idc-off { opacity: 0.45; text-decoration: line-through; }
        .idc-eye {
          display: inline-flex; align-items: center; justify-content: center;
          width: 22px; height: 22px; border-radius: 6px;
          color: var(--ink-faint); background: transparent; border: 0;
          cursor: pointer; transition: color 0.15s, background 0.15s;
        }
        .idc-eye:hover { color: var(--ink); background: var(--bg-warm); }

        /* ── The photograph ── the same box the beacon draws album art in, to
           the pixel: 180 square, an 18px radius and that shadow. The front of
           this cover shows a record at that size in that frame; the back shows
           a person. Matching them is what makes the two sides read as one
           object turned over rather than as two designs. */
        .idc-portrait {
          display: block;
          position: relative;
          width: 180px; height: 180px;
          margin: 20px auto 0;
          padding: 0;
          border: 0;
          border-radius: 18px;
          overflow: hidden;
          background: var(--bg-warm);
          box-shadow: 0 18px 44px rgba(0,0,0,0.16);
        }
        .idc-portrait--bare {
          background: none;
          box-shadow: none;
          border-radius: 0;
          overflow: visible;
        }
        .idc-portrait--turnable { cursor: pointer; }
        .idc-portrait--turnable:focus-visible { outline: 2px solid var(--ink-faint); outline-offset: 3px; }
        .idc-portrait img { width: 100%; height: 100%; object-fit: cover; display: block; }

        /* The two sides, stacked and cross-faded. Not a rotation: this box
           already lives inside the sheet that turns the whole cover over, and
           nesting one 3D transform in another is where browsers disagree. */
        .idc-face-slot {
          position: absolute; inset: 0;
          display: flex; align-items: center; justify-content: center;
          opacity: 0; transition: opacity 0.26s ease; pointer-events: none;
        }
        .idc-face-slot--on { opacity: 1; }
        .idc-face-slot--code { background: ${CODE_PAPER}; }
        /* No plate under the photograph version — the page is the background,
           which is the whole point of the alpha. A class rather than :has(),
           because the build drops :has() rules without saying so. */
        .idc-face-slot--photo { background: none; }
        /* The mark that turns it back, kept legible against whatever the code
           happens to be over — there is no plate under it any more to sit on. */
        .idc-portrait--bare .idc-portrait-badge {
          left: -6px; bottom: -6px;
          background: var(--bg);
        }
        /* Sized so the code itself fills the photograph's square, not so the
           file does. The file is 41 modules across and only 33 of those are
           code — the rest is the quiet zone, which is empty and has to stay
           that way. Fitting the file to the box therefore drew the code at
           four-fifths the size of the picture it replaced, and it is supposed
           to take the picture's place exactly. So it is drawn 41/33 oversize
           and the quiet zone hangs off the edges, where it is page anyway.
           image-rendering keeps the module edges hard rather than resampled. */
        .idc-face-slot .idc-qr { width: 100%; height: auto; display: block; }

        /* After the rule above, deliberately. They have the same specificity,
           so source order decides, and written before it this lost every time
           and the code drew at four-fifths the size of the picture it replaces.
           (No backticks in this stylesheet — it is a template literal and one
           of those ends it mid-file. Twice today.) */
        .idc-face-slot .idc-qr--photo {
          width: calc(100% * 41 / 33);
          height: auto;
          display: block;
          /* A flex item in a box narrower than it wants to be shrinks back to
             the box, which undoes the oversize entirely. */
          flex-shrink: 0;
          max-width: none;
          image-rendering: pixelated;
        }

        /* No portrait set. Registration corners rather than a grey box with a
           person-shaped icon in it — a frame waiting for a photo should look
           like one. */
        .idc-portrait-empty { position: absolute; inset: 0; }
        .idc-portrait-empty::before,
        .idc-portrait-empty::after {
          content: ''; position: absolute; width: 13px; height: 13px;
          border: 1px solid var(--idc-rule);
        }
        .idc-portrait-empty::before { top: 10px; left: 10px; border-right: 0; border-bottom: 0; }
        .idc-portrait-empty::after  { bottom: 10px; right: 10px; border-left: 0; border-top: 0; }

        /* Bottom-left. It sat bottom-right, which on a portrait is usually
           somebody's shoulder and often their chin — the eye goes to a face
           and the chip was landing on it. The left corner of a photograph of a
           person is nearly always the quietest part of the frame. */
        .idc-portrait-badge {
          position: absolute; left: 7px; bottom: 7px;
          display: flex; align-items: center; justify-content: center;
          width: 21px; height: 21px; border-radius: 7px;
          background: var(--bg);
          border: 1px solid var(--idc-rule);
          color: var(--ink-faint);
          transition: color 0.15s;
        }
        .idc-portrait--turnable:hover .idc-portrait-badge { color: var(--ink); }
        .idc-portrait-badge--drop { left: auto; right: 7px; cursor: pointer; }

        .idc-portrait-hit {
          position: absolute; inset: 0;
          display: flex; align-items: flex-end; justify-content: center;
          padding-bottom: 10px;
          cursor: pointer;
        }
        /* Hidden from sight but not from the keyboard. The hidden attribute
           would take it out of the tab order and leave the box unreachable
           without a mouse; this keeps it focusable and lets the label do the
           rest. A backtick in this comment would end the stylesheet, which is
           a thing this file has learned once already. */
        .idc-file { position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none; }
        .idc-file:focus-visible + .idc-portrait-badge { outline: 2px solid var(--ink-faint); outline-offset: 2px; }
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

        /* Once there is a picture the box is a thing you move rather than a
           thing you press, so the label shrinks to its own pill and the rest
           takes the drag. pointer-events has to come off the strip or it would
           swallow the drag it is sitting on. */
        .idc-portrait-hit--pill { inset: auto 0 10px 0; pointer-events: none; }
        .idc-portrait-hit--pill .idc-portrait-said { pointer-events: auto; }
        .idc-portrait--framing { cursor: grab; touch-action: none; }
        .idc-portrait--framing:active { cursor: grabbing; }
        .idc-portrait--framing img { user-select: none; -webkit-user-drag: none; }
        /* One line, always. Wrapped it was a two-line placard across the top of
           the photograph, which on a portrait is squarely over the face — and
           seeing the face is the entire point of the control. */
        .idc-portrait-hint {
          position: absolute; top: 8px; left: 50%; transform: translateX(-50%);
          font-family: var(--font-label);
          font-size: 7.5px; letter-spacing: 0.1em; text-transform: uppercase;
          white-space: nowrap;
          color: var(--ink-soft);
          background: var(--bg);
          border: 1px solid var(--idc-rule);
          border-radius: 999px;
          padding: 3px 8px;
          pointer-events: none;
        }

        /* ── The two lines above the button ──────────────────────────────
           What the journal actually listens to, counted and never chosen, and
           what its keeper is asking to be sent. They are only interesting next
           to each other — the two disagreeing is the point — so they are built
           to the same shape: a label, then the answer, ranged left in a block
           the width of the writing above them.

           The ask is the last of them, because it is the last thing you read
           before the button for acting on it. Anything put between the two
           weakens that, which is why the genres sit above rather than below. */
        .idc-line {
          margin: 16px auto 0; max-width: 300px;
          font-size: 13px; line-height: 1.6; color: var(--ink);
          display: flex; align-items: baseline; gap: 9px;
          text-align: left;
        }
        .idc-line-label {
          flex-shrink: 0;
          /* A fixed column, so the two answers start at the same place and the
             pair reads as one small table rather than two stray sentences.
             Wide enough for the longer of the two labels to stay on one line —
             a two-line label beside a one-line answer reads as a wrapping
             accident, not as a heading. */
          width: 84px;
          white-space: nowrap;
          font-family: var(--font-label);
          font-size: 8.5px; letter-spacing: 0.1em; text-transform: uppercase;
          color: var(--ink-faint);
        }
        /* One colour for both answers. They were set a step apart — the
           genres soft, the request full — which read as one of the two being
           less finished than the other rather than as a deliberate hierarchy.
           The labels beside them are already doing the quietening; the answers
           are the content and they weigh the same. */
        .idc-line-value { min-width: 0; color: var(--ink); }
        /* Not a row of the table above it. The four counted facts are labels
           and values; this is a sentence, and a sentence indented into a value
           column reads as a fifth fact that lost its label. Centred and full
           width, directly over the button it explains. */
        .idc-ask {
          margin: 16px auto 0; max-width: 300px;
          font-size: 14px; line-height: 1.55; color: var(--ink);
          text-wrap: pretty;
        }
        .idc-ask-said { color: var(--ink-faint); }

        /* The one control that is an action rather than a door, and the reason
           the ask is written directly above it. Weighted by ink rather than by
           fill, so it leads without inventing a second kind of button. */
        .idc-send {
          margin-top: 20px;
          color: var(--ink);
          border-color: var(--ink-faint);
          padding: 10px 22px;
          font-size: 9.5px;
        }
        .idc-send:hover { border-color: var(--ink); }

        /* ── Below the line ── everywhere else the keeper can be found, and the
           one page the card still carries. Quiet, and after the point. */
        .idc-rule {
          width: 100%; height: 1px; margin: 22px 0 16px;
          background-image: linear-gradient(to right, var(--idc-rule) 0 4px, transparent 4px 9px);
          background-size: 9px 1px; background-repeat: repeat-x;
        }
        /* One line: the action, then every other door as a mark beside it. */
        /* Closer to the block above it than it was. The row used to carry the
           rig and the links as well and needed the air to read as its own
           band; it is one button now, and twenty-two pixels under a table of
           four short rows was reading as a gap where something had been
           removed — which it was. */
        .idc-row {
          display: flex; align-items: center; justify-content: center;
          gap: 6px; flex-wrap: wrap;
          margin-top: 14px;
        }
        .idc-mark-btn {
          display: inline-flex; align-items: center; justify-content: center;
          width: 36px; height: 36px; border-radius: 999px;
          color: var(--ink-faint);
          border: 1px solid transparent;
          transition: color 0.15s, background 0.15s, border-color 0.15s;
        }
        .idc-mark-btn:hover {
          color: var(--ink);
          background: var(--bg-warm);
          border-color: var(--idc-rule);
        }

        /* ── The links, opened ── the same marks in the same place, each with
           the address it stands for beside it. */
        .idc-links { width: 100%; max-width: 300px; margin: 12px auto 0; text-align: left; }
        .idc-link-row {
          display: grid; grid-template-columns: 26px minmax(0, 1fr) 24px;
          gap: 8px; align-items: center;
        }
        .idc-link-row + .idc-link-row { margin-top: 10px; }
        /* The mark, which is also the way to change it. */
        .idc-link-mark {
          display: inline-flex; align-items: center; justify-content: center;
          width: 26px; height: 26px; border-radius: 8px;
          color: var(--ink-faint);
          background: transparent; border: 1px solid transparent;
          cursor: pointer;
          transition: color 0.15s, background 0.15s, border-color 0.15s;
        }
        .idc-link-mark:hover { color: var(--ink); background: var(--bg-warm); }
        .idc-link-mark--on {
          color: var(--ink);
          background: var(--bg-warm);
          border-color: var(--idc-rule);
        }

        /* ── The marks themselves ── pictures, not a list of their names. A
           dropdown asked you to read "Snapchat" to choose a picture of
           Snapchat, which is the wrong way round: you already know the one you
           want by sight. It opens in the flow underneath the row rather than
           floating over it, because this card is a scroller and anything
           floating in a scroller has to be told where to go when it scrolls. */
        .idc-marks {
          grid-column: 1 / -1;
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(34px, 1fr));
          gap: 3px;
          margin-top: 9px; padding: 8px;
          border: 1px solid var(--idc-rule);
          border-radius: 10px;
          background: var(--bg-warm);
        }
        .idc-mark-opt {
          display: inline-flex; align-items: center; justify-content: center;
          height: 34px; border-radius: 8px;
          color: var(--ink-faint);
          background: transparent; border: 1px solid transparent;
          cursor: pointer;
          transition: color 0.15s, background 0.15s, border-color 0.15s;
        }
        .idc-mark-opt:hover { color: var(--ink); background: var(--bg); }
        .idc-mark-opt--on {
          color: var(--ink);
          background: var(--bg);
          border-color: var(--ink-faint);
        }
        /* The one option that is not a picture: let the address decide. */
        .idc-mark-auto {
          font-family: var(--font-label);
          font-size: 11px; letter-spacing: 0.04em;
        }

        .idc-link-row--rig { margin-top: 14px; }
        .idc-gear { margin-top: 4px; }
        .idc-gear-row {
          display: grid; grid-template-columns: minmax(0, 1fr) 92px 24px;
          gap: 8px; align-items: center;
          margin-top: 10px;
        }
        .idc-gear-role {
          font-family: var(--font-label);
          font-size: 10px !important; letter-spacing: 0.08em; text-transform: uppercase;
        }
        .idc-rig-said {
          font-family: var(--font-label);
          font-size: 9px; letter-spacing: 0.09em; text-transform: uppercase;
          color: var(--ink-faint);
          align-self: center;
        }
        .idc-link-input {
          min-width: 0; width: 100%;
          border: 0; padding: 0 0 3px; background: transparent;
          font-size: 12px; color: var(--ink); font-family: inherit;
          border-bottom: 1px solid var(--idc-rule);
        }
        .idc-link-input:focus { outline: none; border-bottom-color: var(--ink-faint); }
        .idc-link-input::placeholder { color: var(--ink-faint); }
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

        .idc-trouble {
          font-family: var(--font-label); font-size: 9px; letter-spacing: 0.08em;
          color: var(--fav); margin: 10px 0 0;
        }

        /* Every field takes the size of the writing it stands in for, on a
           phone as well — globals.css pushes fields up to 16px there to stop
           iOS zooming, and the editor holds the page still for the length of an
           edit instead, so this card can keep its own type. See holdZoom in
           IdentificationCardEditor.js. */
        @media (max-width: 768px) {
          /* inherit works for these, whose fields sit inside the element that
             carries the size. Stated outright anyway, because the one field
             where inherit did not work — the bio's textarea, which *was* the
             element carrying the size — is the reason this block exists. */
          .idc-name-input { font-size: 36px !important; }
          .idc-link-input { font-size: 12px !important; }
        }
        @media (max-width: 480px) {
          .idc-name-input { font-size: 31px !important; }
        }

        @media (max-width: 480px) {
          .idc-name { font-size: 31px; }
        }
      `}</style>

      <div
        ref={innerRef}
        className={'idc-inner' + (more ? ' idc-inner--more' : '')}
      >
        <div className="idc-head">
          {/* The site's own mark, small and in the corner. The dot on its
              period is lit while something is playing — the same fact the
              front of the cover carries, and the only thing on this side
              that moves. */}
          <svg
            viewBox={`${MARK_BOX.x} ${MARK_BOX.y} ${MARK_BOX.w} ${MARK_BOX.h}`}
            className="idc-mark"
            role="img"
            aria-label={cover_name}
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

          {/* Signed in, the card has this and nothing else it did not have
              before. Signed out it is not in the page at all, and the writing
              endpoints check the wristband regardless of what is drawn here. */}
          {authed && (
            <div className="idc-tools">
              {editing ? (
                <>
                  <button
                    type="button"
                    className="idc-tool idc-tool--keep"
                    onClick={edit.save}
                    disabled={edit.saving || edit.busy}
                    aria-label="Save this card"
                    title="Save"
                  >
                    <Check size={16} weight="bold" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="idc-tool"
                    onClick={edit.cancel}
                    disabled={edit.saving}
                    aria-label="Stop editing without saving"
                    title="Cancel"
                  >
                    <X size={16} weight="bold" aria-hidden="true" />
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="idc-tool"
                  onClick={edit.begin}
                  aria-label="Edit this card"
                  title="Edit this card"
                >
                  <PencilSimple size={15} weight="bold" aria-hidden="true" />
                </button>
              )}
            </div>
          )}
        </div>

        {slot}

        {/* cover_name, not keeper_name: this is the one place a person is
            reading the name, so it is allowed to be the ornamented one. The
            input beside it still edits keeper_name — see the note in
            IdentificationCardEditor. */}
        {(editing || cover_name) && (
          <h1 className="idc-name">
            {editing
              ? <input
                  className="idc-name-input"
                  type="text"
                  value={edit.name}
                  onChange={e => edit.setName(e.target.value)}
                  placeholder="Your name"
                  aria-label="Name"
                />
              : cover_name}
          </h1>
        )}

        {/* The four facts, in one table. These two used to be a single small
            centred line under the name — "39 albums logged · Logging since
            March 2026" — set differently from the genres and the ask
            underneath them, which made four facts about one person read as two
            kinds of thing. They are the same kind of thing: a label and an
            answer. Now they are laid out like it, and the card is a glance at
            somebody before the reading starts below it. */}
        {showAlbums && (
          <p className={'idc-line' + off('albums')}>
            <span className="idc-line-label">Albums logged</span>
            <span className="idc-line-value">{records}</span>
            {eyeFor('albums')}
          </p>
        )}

        {showSince && (
          <p className={'idc-line' + off('since')}>
            <span className="idc-line-label">Logging since</span>
            <span className="idc-line-value">{since}</span>
            {eyeFor('since')}
          </p>
        )}


        {/* The bio used to sit here and does not any more. It was a paragraph
            about the keeper printed two hundred pixels above a longer, better
            paragraph about the keeper — the about writing runs directly under
            this card now, so the card was introducing what the next screen was
            about to say, in the keeper's own words, twice.
            What is left is a glance: a face, a name, four facts and the ways
            to reach them. The reading is below. */}

        {/* Labelled, and shaped like the ask directly under it. Unlabelled it
            was three words floating between the bio and the request with
            nothing saying what they were — a reader could as easily have taken
            them for the genres being asked for as the genres being played,
            which is precisely the distinction the pair exists to draw. */}
        {genres.length > 0 && showing('genres') && (
          <p className={'idc-line' + off('genres')}>
            <span className="idc-line-label">Top genres</span>
            <span className="idc-line-value">{genres.join(' · ')}</span>
            {eyeFor('genres')}
          </p>
        )}

        {/* ── The one opening the card prints ──────────────────────────────
            "Looking for" used to be a labelled field here, and it is a prompt
            now like the others — the difference is that this one is addressed
            to the reader rather than about the keeper, and it is the reason
            the button underneath it exists: you read what somebody is asking
            for, then you send it. So of the nine it is the one promoted onto
            the card, and only if its keeper chose it.

            The pane below drops this row from its own list rather than
            printing it twice. */}
        {cardAsk && (
          <p className="idc-ask">
            <span className="idc-ask-said">{cardAsk.text}</span>{' '}
            {cardAsk.answer}
          </p>
        )}

        {/* ── The one thing to do ──────────────────────────────────────────
            The rig's mark and the keeper's links used to stand in a row beside
            this button. Both have somewhere better to be: the rig is a section
            of the About pane a screen below, and the links sit at the foot of
            that same reading, where somebody who has just read about a person
            might want to go and find them. What is left here is the single
            action the card is for, which is why it can have the row to
            itself. */}
        <div className="idc-row" inert={editing ? true : undefined}>
          <Link href="/submit" className="ln-pill idc-send">Send an album</Link>
        </div>

        {/* The link rows and the rig rows used to be here, under the button,
            while the card was the only surface an owner could edit. They are
            edited on the pane below now, inside the sections they actually
            print in — a field for something you cannot see while you type into
            it is a field you fill in blind. See About.js. */}
        {edit.trouble && <p className="idc-trouble">{edit.trouble}</p>}
      </div>

      {/* The rig used to come up from the bottom over this card, and does not
          any more: it is a section of the About pane a screen below, under its
          own heading, in the reading. A drawer over a card is what you build
          when the only surface you have is the card. */}
    </section>
  );
}
