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

export default function IdentityCard({ stamps, authed = false }) {
  const settings = useBookplate();
  const {
    journal_name,
    keeper_name,
    bio,
    portrait_url,
    portrait_position,
    instagram_url,
    site_address,
    founded_at,
    about_intro,
    social_links,
    hidden_fields,
    send_me,
    rig_icon,
    rig: rigRows,
    portrait_code_url,
  } = settings;
  const { isLive } = useListeningBeacon();

  // Only ever true for the person who keeps the journal, and only the visible
  // half of that: the writing endpoints check the wristband for themselves.
  const edit = useIdentificationCardEditor(settings);
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

  // The keeper's own line if they have written one, otherwise the journal's.
  const blurb = bio || about_intro;

  // instagram_url predates this list and is folded in rather than made to move.
  // De-duplicated on the href, so an owner who has it in both places gets one.
  const socials = useMemo(() => {
    const stored = Array.isArray(social_links) ? social_links.map(readLink) : [];
    const raw = instagram_url ? [{ url: instagram_url, icon: 'auto' }, ...stored] : stored;
    const seen = new Set();
    return raw
      .filter(l => l.url.trim())
      .map(l => identify(l.url, l.icon))
      .filter(Boolean)
      .filter(l => !seen.has(l.href) && seen.add(l.href));
  }, [instagram_url, social_links]);

  // The mark this journal listens through, or nothing if its keeper would
  // rather not say. See RIG_ICONS.
  const rig = rigIcon(rig_icon);
  // What the editor is currently showing, which is the draft rather than what
  // is saved — the row underneath has to change the moment a mark is pressed.
  const chosenRig = rigIcon(edit.rig);
  // The setup itself. A sheet rather than a page: it is four short rows about
  // the room you are already standing in, and sending somebody to another
  // address to read four rows and then find their way back is a lot of
  // ceremony for a list of equipment.
  const rigList = (Array.isArray(rigRows) ? rigRows : []).filter(r => r?.name?.trim());
  const [rigOpen, setRigOpen] = useState(false);

  // Escape closes it, because anything that covers the page has to have a way
  // out that is not hunting for the button that opened it.
  useEffect(() => {
    if (!rigOpen) return;
    const onKey = event => { if (event.key === 'Escape') setRigOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [rigOpen]);

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
  // Declared up here rather than beside the effect that fills them: the slot is
  // built further down this function and hands photoRef to whichever of its
  // three shapes it returns, so the binding has to exist by then.
  const photoRef = useRef(null);
  const innerRef = useRef(null);
  const liftRef = useRef(null);
  const [lift, setLift] = useState(null);
  // Which mark is being chosen, if any: 'rig', or the index of a link. One at a
  // time, so opening a second palette closes the first and the card never has
  // two grids of icons on it at once.
  const [choosing, setChoosing] = useState(null);

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

  // A textarea that grows instead of scrolling. It has to run on mount as well
  // as on every keystroke, or a bio already three lines long opens showing one.
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
        ref={photoRef}
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
    slot = <div ref={photoRef} className={'idc-portrait' + (bareSlot ? ' idc-portrait--bare' : '')}>{slotFaces}</div>;
  } else {
    slot = (
      <button
        type="button"
        ref={photoRef}
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

  // ── Lining the photograph up with the beacon ────────────────────────────
  // The two sides of this cover show the same square in the same frame: a
  // record on the front, a person on the back. Which only reads as one object
  // being turned over if the square does not jump when it turns — and left to
  // flow, the card's is a hundred and forty pixels higher up the pane than the
  // beacon's, because the two columns have different things stacked above them.
  //
  // It cannot be a constant. The front face is centred in the pane, so where
  // its art lands depends on how tall the pane is; and the card's own header
  // grows and shrinks with whether there is a name on it. So the gap is
  // measured — both boxes against the scene that holds them both, which is
  // stable while the card scrolls — and the difference is handed back as the
  // photograph's top margin.
  //
  // A hidden face still has layout, so this works whichever way up the cover
  // currently is.
  useEffect(() => {
    const photo = photoRef.current;
    const inner = innerRef.current;
    const scene = inner?.closest('.idc-scene');
    const art = scene?.querySelector('.beacon-art-wrap');
    if (!photo || !inner || !art) return;

    const measure = () => {
      const sceneTop = scene.getBoundingClientRect().top;
      const innerTop = inner.getBoundingClientRect().top - sceneTop;
      const artTop = art.getBoundingClientRect().top - sceneTop;
      // What is on the card right now, read off the card. Keeping the last
      // value in a ref instead looked equivalent and was not: the ref is
      // written the moment a new lift is worked out, the spacer only when React
      // commits it, and a measurement taken between the two subtracts a lift
      // that is not there yet. It settled sixty pixels short every time.
      const applied = liftRef.current?.getBoundingClientRect().height ?? 0;
      // Where the photograph would sit with no lift on it at all.
      const resting =
        photo.getBoundingClientRect().top - sceneTop - innerTop + inner.scrollTop - applied;
      const next = Math.max(0, Math.round(artTop - innerTop - resting));
      if (Math.abs(next - applied) < 1) return;
      setLift(next);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(scene);
    observer.observe(inner);
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
    // Everything that changes how tall the column above the photograph is.
  }, [editing, keeper_name, records, since, stamps]);

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
    // stamps and the bio arrive after the first paint and both change how tall
    // the column is, so the measurement has to be taken again when they land.
  }, [stamps, blurb, editing]);

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
        .idc-lift { height: var(--idc-photo-lift, 0px); flex-shrink: 0; }

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
          margin: 0;
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

        /* ── The counted line ── how many, and how long, on one line under the
           name. Two facts that are only interesting next to each other, so
           they are set as a sentence rather than as two rows of a form. */
        .idc-meta {
          font-size: 12px; line-height: 1.5; color: var(--ink-faint);
          margin: 7px 0 0;
          display: flex; align-items: center; justify-content: center;
          gap: 7px; flex-wrap: wrap;
        }
        .idc-meta-part { display: inline-flex; align-items: center; gap: 3px; }
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
          right: -6px; bottom: -6px;
          background: var(--bg);
        }
        .idc-qr--photo {
          width: 100%; height: auto; display: block;
          /* Hard module edges at every size. Without this the browser smooths a
             41px picture up to 180 and the modules stop being squares. */
          image-rendering: pixelated;
        }
        .idc-face-slot .idc-qr { width: 100%; height: auto; display: block; }

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

        .idc-portrait-badge {
          position: absolute; right: 7px; bottom: 7px;
          display: flex; align-items: center; justify-content: center;
          width: 21px; height: 21px; border-radius: 7px;
          background: var(--bg);
          border: 1px solid var(--idc-rule);
          color: var(--ink-faint);
          transition: color 0.15s;
        }
        .idc-portrait--turnable:hover .idc-portrait-badge { color: var(--ink); }
        .idc-portrait-badge--drop { right: auto; left: 7px; cursor: pointer; }

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

        /* ── The writing ── ranged left inside a centred block. Everything else
           on the card is a phrase and centres happily; this is the one run of
           real prose, and centred prose is a ragged left edge to read down. */
        .idc-bio {
          font-size: 13px; line-height: 1.7; color: var(--ink-soft);
          /* Stated on the element the field inherits from, so the two agree. */
          margin: 20px auto 0; max-width: 300px; text-align: left;
        }
        .idc-bio-input {
          display: block; width: 100%;
          border: 0; padding: 0; background: transparent;
          resize: none; overflow: hidden;
          font: inherit; letter-spacing: inherit; color: var(--ink-soft);
        }
        .idc-bio-input:focus { outline: none; }
        .idc-bio-input::placeholder { color: var(--ink-faint); }

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
        .idc-ask-input {
          flex: 1; min-width: 0;
          border: 0; padding: 0 0 3px; background: transparent;
          font: inherit; color: var(--ink);
          border-bottom: 1px solid var(--idc-rule);
        }
        .idc-ask-input:focus { outline: none; border-bottom-color: var(--ink-faint); }
        .idc-ask-input::placeholder { color: var(--ink-faint); }

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
        .idc-row {
          display: flex; align-items: center; justify-content: center;
          gap: 6px; flex-wrap: wrap;
          margin-top: 22px;
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

        /* ── The rig sheet ───────────────────────────────────────────────── */
        /* Fixed, not absolute. Absolute meant "the card", and the card is a
           340px column in the middle of the screen — so the sheet came up
           inside it with a strip of page showing either side, like a drawer
           opening in the middle of a room. Fixed hands both of these to the
           scene instead, which spans the pane, and they sit flush to its
           edges. (The scene carries a perspective for the flip, which is what
           makes it the containing block here rather than the viewport — and
           also what lets these escape the card's own clipping.) */
        /* --idc-gutter is the margin the pane holds the card off its edges by,
           set by the phone layout and inherited down. Read with a fallback of
           zero rather than declared here with one: declared, it would shadow
           the value coming down from the pane and the sheet would go on
           stopping short of the screen. */
        .idc-scrim {
          position: fixed;
          top: 0;
          bottom: calc(-1 * var(--idc-floor, 0px));
          left: calc(-1 * var(--idc-gutter, 0px)); right: calc(-1 * var(--idc-gutter, 0px));
          z-index: 3;
          border: 0; padding: 0;
          background: color-mix(in srgb, var(--bg) 70%, transparent);
          backdrop-filter: blur(2px);
          -webkit-backdrop-filter: blur(2px);
          opacity: 0; pointer-events: none;
          /* And taken out of the compositing entirely between uses. A
             backdrop-filter left on an invisible element is a blur the browser
             may still decide to do work for. */
          visibility: hidden;
          transition: opacity 0.32s ease, visibility 0s linear 0.32s;
          cursor: pointer;
        }
        .idc-scrim--on {
          opacity: 1; pointer-events: auto;
          visibility: visible;
          transition: opacity 0.32s ease, visibility 0s;
        }

        .idc-sheet {
          position: fixed;
          /* Down to the floor of the pane as well as out to its edges. The card
             stops short of the bottom to leave room for the row of controls
             underneath it, and a bottom sheet that stops where the card stops
             is a sheet floating an inch above the bottom of the screen. */
          bottom: calc(-1 * var(--idc-floor, 0px));
          /* Out over the pane's gutter, so it meets the edges of the screen
             rather than the edges of the card. Fixed is positioned against the
             sheet that turns, which sits inside that gutter — so reaching flush
             means reaching back out by exactly the amount the pane pulled in. */
          left: calc(-1 * var(--idc-gutter, 0px)); right: calc(-1 * var(--idc-gutter, 0px));
          z-index: 4;
          display: flex; flex-direction: column; align-items: center;
          /* The extra floor goes back on as padding, so the writing sits where
             it did and only the stock underneath it reaches further down. */
          padding: 12px 22px calc(26px + var(--idc-floor, 0px));
          background: var(--bg);
          border-top: 1px solid var(--idc-rule);
          border-radius: 18px 18px 0 0;
          transform: translateY(101%);
          /* Nothing clips it now that it is fixed, so being off the bottom is
             not enough on its own to keep it out of the way. */
          visibility: hidden;
          /* No shadow while it waits. Parked below the card it still cast one
             upward, and the card clips to its own box — so the shadow was
             inside the clip while the sheet was outside it, and the bottom
             forty pixels of the card carried a grey band belonging to
             something nobody could see. It arrives with the sheet instead. */
          box-shadow: none;
          transition:
            transform 0.42s cubic-bezier(0.22, 0.61, 0.36, 1),
            box-shadow 0.42s ease,
            visibility 0s linear 0.42s;
        }
        .idc-sheet--up {
          transform: none;
          visibility: visible;
          box-shadow: 0 -14px 40px rgba(0,0,0,0.14);
          transition:
            transform 0.42s cubic-bezier(0.22, 0.61, 0.36, 1),
            box-shadow 0.42s ease,
            visibility 0s;
        }
        @media (prefers-reduced-motion: reduce) {
          .idc-sheet { transition: none; }
          .idc-scrim { transition: none; }
        }
        /* The handle every sheet on a phone has. It does not drag — it says
           which edge this came from, which is the part that matters. */
        .idc-sheet-grip {
          width: 34px; height: 4px; border-radius: 999px;
          background: var(--idc-rule);
          margin-bottom: 16px;
        }
        .idc-sheet-title {
          font-family: var(--font-label);
          font-size: 9px; letter-spacing: 0.16em; text-transform: uppercase;
          color: var(--ink-faint);
          margin: 0 0 14px;
        }
        /* The sheet runs edge to edge; what is written on it keeps the
           column's measure, so the rows line up with the card above them
           rather than stretching across a wide screen. */
        .idc-sheet-list { width: 100%; max-width: 300px; margin: 0; }
        /* The tracklist rhythm the rest of the site reads in: what the thing is
           on the left, what it does on the right, one hairline under each. */
        .idc-sheet-row {
          display: flex; align-items: baseline; justify-content: space-between;
          gap: 14px;
          padding: 11px 0;
          border-bottom: 1px solid var(--idc-rule);
        }
        .idc-sheet-row:last-child { border-bottom: 0; }
        .idc-sheet-name { font-size: 13px; color: var(--ink); }
        .idc-sheet-role {
          margin: 0; flex-shrink: 0;
          font-family: var(--font-label);
          font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase;
          color: var(--ink-faint);
        }
        .idc-sheet-shut {
          margin-top: 18px;
          padding: 9px 20px; font-size: 9px; letter-spacing: 0.11em;
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
          /* inherit works for the name and the ask, whose fields sit inside the
             element that carries the size. It does not for the bio: there the
             textarea *is* the .idc-bio element, so inherit reaches past it to
             the column and picks up whatever that is — 24px, as it turned out.
             Stated outright, all four. */
          .idc-name-input { font-size: 36px !important; }
          .idc-bio-input  { font-size: 13px !important; }
          .idc-ask-input  { font-size: 13px !important; }
          .idc-link-input { font-size: 12px !important; }
        }
        @media (max-width: 480px) {
          .idc-name-input { font-size: 31px !important; }
          .idc-bio-input  { font-size: 12.5px !important; }
        }

        @media (max-width: 480px) {
          .idc-name { font-size: 31px; }
          /* The box does not shrink on a phone, because the beacon's does not.
             They are the same square seen from either side of the cover, and a
             square that changes size when you turn the card over is two
             squares. */
          .idc-bio { margin-top: 17px; font-size: 12.5px; }
        }
      `}</style>

      <div
        ref={innerRef}
        className={'idc-inner' + (more ? ' idc-inner--more' : '')}
        style={lift == null ? undefined : { '--idc-photo-lift': `${lift}px` }}
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

        <div className="idc-lift" aria-hidden="true" ref={liftRef} />

        {(editing || keeper_name) && (
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
              : keeper_name}
          </h1>
        )}

        {(showAlbums || showSince) && (
          <p className="idc-meta">
            {showAlbums && (
              <span className={'idc-meta-part' + off('albums')}>
                {records} albums logged
                {eyeFor('albums')}
              </span>
            )}
            {showAlbums && showSince && <span aria-hidden="true">·</span>}
            {showSince && (
              <span className={'idc-meta-part' + off('since')}>
                Logging since {since}
                {eyeFor('since')}
              </span>
            )}
          </p>
        )}

        {slot}

        {/* Same measure, same size, same leading, same colour. A textarea set
            in the paragraph's own type is the paragraph, with a caret in it. */}
        {editing ? (
          <textarea
            className="idc-bio idc-bio-input"
            value={edit.bio}
            onChange={e => edit.setBio(e.target.value)}
            onInput={grow}
            ref={growOnMount}
            placeholder="A line or two about whoever keeps this."
            aria-label="Bio"
          />
        ) : blurb ? (
          <p className="idc-bio">{blurb}</p>
        ) : null}

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

        {(editing || send_me) && (
          <p className="idc-line idc-ask">
            <span className="idc-line-label">Looking for</span>
            {editing
              ? <input
                  className="idc-ask-input"
                  type="text"
                  value={edit.sendMe}
                  onChange={e => edit.setSendMe(e.target.value)}
                  /* The placeholder is the feature. Told what good looks like
                     people write something worth reading; asked "what would
                     you like?" they write nothing, or "anything". */
                  placeholder="something loud, or anything with a saxophone in it"
                  aria-label="Looking for"
                />
              : <span className="idc-line-value">{send_me}</span>}
          </p>
        )}

        {/* ── One row ──────────────────────────────────────────────────────
            The thing to do, and every other door on the card as a mark beside
            it. This was three stacked bands — the button, then a rule and the
            rig, then the links — for four controls that between them are one
            action and a handful of addresses. Stacked they read as three
            sections; in a line they read as a row of buttons, which is what
            they are, and the card gets a hundred pixels back.

            The rig wears whichever mark its keeper chose, or none at all. */}
        <div className="idc-row" inert={editing ? true : undefined}>
          <Link href="/submit" className="ln-pill idc-send">Send an album</Link>
          {rig.Icon && rigList.length > 0 && (
            <button
              type="button"
              className="idc-mark-btn"
              onClick={() => setRigOpen(true)}
              aria-expanded={rigOpen}
              aria-label={`The rig — ${rig.label.toLowerCase()}`}
              title="The rig"
            >
              <rig.Icon size={19} weight="regular" aria-hidden="true" />
            </button>
          )}
          {!editing && socials.map(({ href, label, Icon }) => (
            <a
              key={href}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="idc-mark-btn"
              aria-label={label}
              title={label}
            >
              <Icon size={19} weight="regular" aria-hidden="true" />
            </a>
          ))}
        </div>

        {editing ? (
          <div className="idc-links">
            {edit.links.map((link, index) => {
              const known = link.url.trim() ? identify(link.url.trim(), link.icon) : null;
              const Icon = known ? known.Icon : LinkSimple;
              return (
                <div className="idc-link-row" key={index}>
                  {/* The mark opens the marks. A dropdown made you read a list
                      of names to pick a picture, which is the wrong way round
                      — you know the one you want by sight. */}
                  <button
                    type="button"
                    className={'idc-link-mark' + (choosing === index ? ' idc-link-mark--on' : '')}
                    onClick={() => setChoosing(choosing === index ? null : index)}
                    aria-expanded={choosing === index}
                    aria-label={`Choose a mark for link ${index + 1}`}
                    title="Choose a mark"
                  >
                    <Icon size={17} weight="regular" aria-hidden="true" />
                  </button>
                  <input
                    className="idc-link-input"
                    type="url"
                    inputMode="url"
                    value={link.url}
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
                  {choosing === index && (
                    <div className="idc-marks" role="group" aria-label="Marks">
                      {LINK_ICONS.map(option => {
                        const Mark = option.Icon || GlobeSimple;
                        const on = (link.icon || 'auto') === option.name;
                        return (
                          <button
                            key={option.name}
                            type="button"
                            className={'idc-mark-opt' + (on ? ' idc-mark-opt--on' : '')}
                            onClick={() => { edit.setLinkIcon(index, option.name); setChoosing(null); }}
                            aria-pressed={on}
                            aria-label={option.label}
                            title={option.label}
                          >
                            {option.Icon
                              ? <Mark size={17} weight="regular" aria-hidden="true" />
                              : <span className="idc-mark-auto" aria-hidden="true">A</span>}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
            {/* The rig, chosen the same way. It sits with the links because it
                is the same kind of thing: a mark on the row under the button,
                standing for somewhere else to go. */}
            <div className="idc-link-row idc-link-row--rig">
              <button
                type="button"
                className={'idc-link-mark' + (choosing === 'rig' ? ' idc-link-mark--on' : '')}
                onClick={() => setChoosing(choosing === 'rig' ? null : 'rig')}
                aria-expanded={choosing === 'rig'}
                aria-label="Choose a mark for your rig"
                title="Choose a mark for your rig"
              >
                {chosenRig.Icon
                  ? <chosenRig.Icon size={17} weight="regular" aria-hidden="true" />
                  : <X size={15} weight="bold" aria-hidden="true" />}
              </button>
              <span className="idc-rig-said">
                {chosenRig.Icon ? `The rig — ${chosenRig.label.toLowerCase()}` : 'No rig button'}
              </span>
              {choosing === 'rig' && (
                <div className="idc-marks" role="group" aria-label="Marks for the rig">
                  {RIG_ICONS.map(option => {
                    const on = (edit.rig || DEFAULT_RIG_ICON) === option.name;
                    return (
                      <button
                        key={option.name}
                        type="button"
                        className={'idc-mark-opt' + (on ? ' idc-mark-opt--on' : '')}
                        onClick={() => { edit.setRig(option.name); setChoosing(null); }}
                        aria-pressed={on}
                        aria-label={option.label}
                        title={option.label}
                      >
                        {option.Icon
                          ? <option.Icon size={17} weight="regular" aria-hidden="true" />
                          : <X size={15} weight="bold" aria-hidden="true" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <button type="button" className="idc-link-add" onClick={edit.addLink}>
              <Plus size={11} weight="bold" aria-hidden="true" />
              Add a link
            </button>

            {/* What is in the sheet. Nothing about why it matters — that is
                what the journal is for — just what each thing is and what it
                does, which is the shape a tracklist reads in. */}
            {chosenRig.Icon && (
              <div className="idc-gear">
                {edit.gear.map((item, index) => (
                  <div className="idc-gear-row" key={index}>
                    <input
                      className="idc-link-input"
                      type="text"
                      value={item.name}
                      onChange={e => edit.setGearField(index, 'name', e.target.value)}
                      placeholder="Sennheiser HD 600"
                      aria-label={`Equipment ${index + 1}`}
                    />
                    <input
                      className="idc-link-input idc-gear-role"
                      type="text"
                      value={item.role}
                      onChange={e => edit.setGearField(index, 'role', e.target.value)}
                      placeholder="Headphones"
                      aria-label={`What equipment ${index + 1} does`}
                    />
                    <button
                      type="button"
                      className="idc-link-drop"
                      onClick={() => edit.dropGear(index)}
                      aria-label={`Remove equipment ${index + 1}`}
                    >
                      <X size={12} weight="bold" aria-hidden="true" />
                    </button>
                  </div>
                ))}
                <button type="button" className="idc-link-add" onClick={edit.addGear}>
                  <Plus size={11} weight="bold" aria-hidden="true" />
                  Add a piece
                </button>
              </div>
            )}
          </div>
        ) : null}

        {edit.trouble && <p className="idc-trouble">{edit.trouble}</p>}
      </div>

      {/* ── The rig ──────────────────────────────────────────────────────────
          Comes up from the bottom over the card rather than replacing it. It
          used to be a page, and a page meant leaving the card, reading four
          rows and finding your way back — plus several hundred words about why
          any of it matters, which is one person's essay shipped inside
          everybody's software. What survives is what each thing is and what it
          does. */}
      {rigList.length > 0 && (
        <>
          <button
            type="button"
            className={'idc-scrim' + (rigOpen ? ' idc-scrim--on' : '')}
            onClick={() => setRigOpen(false)}
            tabIndex={rigOpen ? 0 : -1}
            aria-label="Close the rig"
          />
          <section
            className={'idc-sheet' + (rigOpen ? ' idc-sheet--up' : '')}
            aria-label="Listening rig"
            inert={rigOpen ? undefined : true}
          >
            <span className="idc-sheet-grip" aria-hidden="true" />
            <h2 className="idc-sheet-title">Listening rig</h2>
            <dl className="idc-sheet-list">
              {rigList.map((item, index) => (
                <div className="idc-sheet-row" key={`${item.name}-${index}`}>
                  <dt className="idc-sheet-name">{item.name}</dt>
                  <dd className="idc-sheet-role">{item.role}</dd>
                </div>
              ))}
            </dl>
            <button type="button" className="ln-pill idc-sheet-shut" onClick={() => setRigOpen(false)}>
              Close
            </button>
          </section>
        </>
      )}
    </section>
  );
}
