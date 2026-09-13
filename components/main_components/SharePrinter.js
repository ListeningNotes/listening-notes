// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/main_components/SharePrinter.js
// The press.
//
// Somewhere on this site there is always a thing worth handing to somebody who
// is not here: the card saying whose journal this is, an album you have just
// finished writing about. Handing it over means a picture, because a picture
// is what travels — into a Story, into a message, onto a pinboard — and a web
// page is not one.
//
// The printer is the machine, not the picture. It knows about paper sizes,
// about finished looks you can turn through, and about the two things a person
// actually does with a print: keep it or send it. It knows nothing whatsoever
// about identity cards or albums. Those arrive as a PLATE — an object that can
// load whatever art it needs and then draw itself onto a canvas at whatever
// size the paper happens to be. Adding a printable thing to this site is
// writing a plate, not touching this file.
//
// ── Why you turn through prints instead of assembling one ─────────────────
//
// The first version had four rows of controls — size, backdrop, ink, and
// whatever the plate wanted — and between them they made a hundred and twenty
// combinations, nearly all of which nobody would ever choose. It was a control
// panel, and it ate the bottom third of a phone.
//
// So the backdrop and the ink are welded together into VARIANTS: finished
// looks with names, turned through one at a time. You swipe until you like one
// and press Save. What is left underneath is the two things that are genuinely
// a decision rather than a taste — how big the paper is, and which lines of
// the thing you are willing to print.
//
// ── Where it stands, 2026-09-12 ────────────────────────────────────────────
//
// Built for the identity card on 2026-08-25 and parked the same day; brought
// back for the record (EntryPlate.js), which is the print people will
// actually make. Its styles moved to app/styles/forms.css with the other
// owner's surfaces. `inline` renders it in place instead of portalled onto
// the body — the printer page rises on the same sheet the inbox does, and a
// portal would pop over that sheet instead of rising with it.
//
// Why canvas rather than an image route on the server: the same reason
// /dashboard/share gives. The site leans on blur and translucency, Satori
// (what next/og renders with) supports neither, and canvas runs in the browser
// for free.
//
// Why the screensavers run live behind the preview rather than being
// snapshotted into it: because then the preview IS the print. The wallpaper is
// moving while you look at it, and Save takes the frame that is on screen at
// the moment you press it — so choosing a look and choosing a moment are the
// same gesture, and nobody has to be told the export will differ from the
// preview. It won't.

'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { CaretLeft, CaretRight, Check, DownloadSimple, LinkSimple, ShareNetwork, X } from '@phosphor-icons/react';

// ── Paper ──────────────────────────────────────────────────────────────────
// Four shapes, because four different places want a picture and they disagree
// about what one is. The plate is handed the frame and lays itself out to fit;
// nothing here assumes a portrait.
export const FRAMES = {
  story:    { key: 'story',    w: 1080, h: 1920, label: '9:16', note: 'Stories' },
  portrait: { key: 'portrait', w: 1080, h: 1350, label: '4:5',  note: 'Feed — grid safe' },
  square:   { key: 'square',   w: 1080, h: 1080, label: '1:1',  note: 'Anywhere square' },
  spread:   { key: 'spread',   w: 1200, h: 630,  label: '1.91:1', note: 'Link previews' },
};
export const FRAME_ORDER = ['story', 'portrait', 'square', 'spread'];

// The page's own two colours, stated rather than read, because a print has to
// be the same colour on a phone set to dark as on a laptop set to light. These
// are --bg from globals.css.
export const PAPER = { day: '#eef0ec', night: '#0e0e0e' };

// ── The looks ──────────────────────────────────────────────────────────────
// A backdrop and an ink, decided together and given a name.
//
// ── On the wallpaper, which is not here yet ───────────────────────────────
//
// The first pass put the dashboard screensavers behind the print, and picked
// them by what canvas could photograph rather than by what anybody likes. That
// got the set exactly wrong: it led with Vinyl, which was not even wired into
// the dashboard any more and has since been deleted, and it left OUT the ones
// somebody would actually reach for — the albums floating up (Fizzy), the rain
// of covers (Rain), the bouncing sleeve (DVD), the two scrolling rows
// (SplitScreen). Those four are built out of DOM elements rather than a
// canvas, which is why a canvas could not photograph them, which is a fact
// about this implementation and not a reason to offer somebody Pong.
//
// So the wallpaper is parked and the card gets to be a card first. The machine
// still takes a backdrop — the stage below still mounts one and the export
// still composites it — so bringing them back is adding rows here and teaching
// the four DOM ones to draw themselves onto a canvas. Nothing else changes.
//
// Day and Night are not backdrops at all: they are the absence of one, the
// page's two colours, and what the thing looks like on the site in each.
// They were Paper and Ink until 2026-09-12; Miyel renamed them for what
// they are, and the file name carries the new word.
export const VARIANTS = [
  { key: 'day',   label: 'Day',   Background: null, dark: false },
  { key: 'night', label: 'Night', Background: null, dark: true  },
];

// ── Canvas tools, for plates to draw with ──────────────────────────────────
// Lifted wholesale from /dashboard/share, which worked all of this out for the
// Instagram slides and then had nowhere to put it. A second copy of a text
// wrapper is a second wrapper to fix.

// Canvas has no letter-spacing worth relying on, and the mono labels on this
// site are nothing without their tracking. So they are drawn a glyph at a time.
export function drawTracked(ctx, text, x, y, spacing, align = 'left') {
  // Positions are computed from a left origin, so the context's own textAlign
  // has to be neutralised — under 'center' every character would re-centre on
  // the point it was handed and the line would drift by half a glyph.
  const prevAlign = ctx.textAlign;
  ctx.textAlign = 'left';
  const chars = [...String(text)];
  let total = 0;
  for (const c of chars) total += ctx.measureText(c).width + spacing;
  total -= spacing;
  let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  for (const c of chars) {
    ctx.fillText(c, cx, y);
    cx += ctx.measureText(c).width + spacing;
  }
  ctx.textAlign = prevAlign;
  return total;
}

export function ellipsize(ctx, text, maxWidth) {
  let s = String(text);
  while (s.length > 1 && ctx.measureText(s).width > maxWidth) s = s.slice(0, -2) + '…';
  return s;
}

// Word wrapping with a line limit — WebkitLineClamp, which canvas has no
// equivalent for. maxLines of 0 or less means no limit.
export function wrapLines(ctx, text, maxWidth, maxLines = 0) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    const next = line ? line + ' ' + word : word;
    if (ctx.measureText(next).width <= maxWidth || !line) { line = next; continue; }
    lines.push(line);
    line = word;
    if (maxLines > 0 && lines.length === maxLines) { line = ''; break; }
  }
  if (line && (maxLines <= 0 || lines.length < maxLines)) lines.push(line);
  const used = lines.join(' ').split(/\s+/).filter(Boolean).length;
  if (used < words.length && lines.length) {
    lines[lines.length - 1] = ellipsize(ctx, lines[lines.length - 1] + '…', maxWidth);
  }
  return lines;
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Draw an SVG path defined in some viewBox at an arbitrary size and position.
export function drawPath(ctx, d, x, y, size, viewBox, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / viewBox, size / viewBox);
  ctx.fillStyle = color;
  ctx.fill(new Path2D(d));
  ctx.restore();
}

// ── The Ln. mark ───────────────────────────────────────────────────────────
// Loaded from the real asset rather than re-pasted as path data, so the mark
// on a print is the same object as the mark on every page. public/logo.svg is
// a 375-square with the mark sitting inside it and its ink hardcoded, so three
// string swaps make it usable: crop the viewBox down to the mark the way
// SiteNav does, size it to the box we want, recolour it. A data URL does not
// taint a canvas.
//
// The period is part of the artwork here, and on a print it is never lit. A
// still picture of a beacon that happened to be playing is a lie by the time
// anybody sees it.
export const MARK_ASPECT = 241 / 140;
const MARK_VIEWBOX = '76 96 241 140';
const markCache = new Map();

export function loadMark(color) {
  if (markCache.has(color)) return markCache.get(color);
  const p = fetch('/logo.svg')
    .then(r => r.text())
    .then(svg => new Promise((resolve, reject) => {
      const recoloured = svg
        .replace(/viewBox="[^"]*"/, `viewBox="${MARK_VIEWBOX}"`)
        .replace(/\swidth="\d+"/, ' width="241"')
        .replace(/\sheight="\d+"/, ' height="140"')
        .replace(/fill="#(?:222222|0a0a0a)"/g, `fill="${color}"`);
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(recoloured);
    }))
    .catch(() => null);   // a missing mark costs the print its mark, not the print
  markCache.set(color, p);
  return p;
}

// Any other picture a plate needs. Asked for anonymously first, exactly as the
// screensaver covers are and for the same reason — see backgrounds/cover.js.
// Resolves to null rather than rejecting: a plate should be able to carry on
// and leave a hole where a picture was, rather than failing to draw at all.
export function loadPicture(src) {
  if (!src) return Promise.resolve(null);
  const attempt = anonymous => new Promise((resolve, reject) => {
    const img = new Image();
    if (anonymous) img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
  return attempt(true).catch(() => attempt(false)).catch(() => null);
}

// How far a finger has to travel across the paper before it counts as turning
// to the next print rather than as a tap that missed.
const TURN = 42;

// What the press says when the address is on the clipboard — the cover's own
// words, from CodeSlot, so the two gestures read as one.
const COPIED = 'Copied — paste it anywhere';
const COPIED_MS = 2400;

// Two facts the server cannot know, read the way React wants facts about the
// client read: as a store whose server snapshot is one answer and whose
// client snapshot is the other. During hydration React takes the server's
// answer and re-renders with the client's, so nothing is mismatched and no
// effect has to set state to get there.
const never = () => () => {};
const onServer = () => false;
const onClient = () => true;
let canShareFiles = null;   // asked once per page; the answer does not change
function probeCanShare() {
  if (canShareFiles === null) {
    try {
      const probe = new File([new Blob([''], { type: 'image/png' })], 'probe.png', { type: 'image/png' });
      canShareFiles = Boolean(navigator.canShare && navigator.canShare({ files: [probe] }));
    } catch {
      canShareFiles = false;
    }
  }
  return canShareFiles;
}

// ── The press ──────────────────────────────────────────────────────────────

export default function SharePrinter({ open, onClose, plate, albums = [], link = null, inline = false }) {
  const [frameKey, setFrameKey] = useState('story');
  const [at, setAt] = useState(0);              // which look, by index
  const [nudge, setNudge] = useState(0);        // -1 / 1, for the length of a turn
  // Only the toggles that have actually been pressed. What the plate is told
  // is derived from these and its own defaults rather than copied into state
  // when the plate arrives: an effect doing the copying has to guess when NOT
  // to, and would undo a choice every time the card underneath re-rendered.
  const [pressed, setPressed] = useState({});
  const [art, setArt] = useState(null);
  const [status, setStatus] = useState('');
  const [copied, setCopied] = useState(false);
  const [z, setZ] = useState(0.2);
  // Portalled, nothing is drawn until the client is running (see the guard
  // below the callbacks); the effects that measure and draw wait for the same.
  const mounted = useSyncExternalStore(never, onClient, onServer);

  const viewRef = useRef(null);
  const backRef = useRef(null);
  const plateRef = useRef(null);
  const probeRef = useRef(null);
  const grabbed = useRef(null);

  const frame = FRAMES[frameKey];
  const look = VARIANTS[at];
  const isDark = look.dark;
  const toggles = useMemo(() => plate?.toggles || [], [plate]);

  const shown = useMemo(() => {
    const answer = {};
    for (const t of toggles) answer[t.key] = pressed[t.key] ?? t.on ?? true;
    return answer;
  }, [toggles, pressed]);

  const turn = useCallback(step => {
    setAt(i => (i + step + VARIANTS.length) % VARIANTS.length);
    setNudge(step);
    setTimeout(() => setNudge(0), 190);
  }, []);

  // Escape closes, the arrows turn, and the page is held still underneath — a
  // sheet this tall over a scrolling page means two things scroll and only one
  // of them was asked to.
  useEffect(() => {
    if (!open) return;
    const onKey = event => {
      if (event.key === 'Escape') onClose?.();
      if (event.key === 'ArrowLeft') turn(-1);
      if (event.key === 'ArrowRight') turn(1);
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose, turn]);

  // How much of the paper fits in the space left over. Measured rather than
  // guessed at, because the space left over is a phone in one hand and half a
  // laptop in the other.
  useLayoutEffect(() => {
    if (!open) return;
    const view = viewRef.current;
    if (!view) return;
    const measure = () => {
      const box = view.getBoundingClientRect();
      if (!box.width || !box.height) return;
      setZ(Math.min(box.width / frame.w, box.height / frame.h));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(view);
    return () => observer.disconnect();
  }, [open, frame, mounted]);   // mounted: portalled, the view exists only after the first paint

  // The art the plate needs, fetched whenever the answer would be different.
  //
  // Deliberately not cleared while the next set loads: the photograph stays on
  // the paper until the code is in hand, which is the right way round. The
  // alternative is the print going blank for as long as a picture takes.
  useEffect(() => {
    if (!open || !plate?.load) return;
    let cancelled = false;
    plate.load({ isDark, shown })
      .then(loaded => { if (!cancelled) { setArt(loaded); setStatus(''); } })
      // An empty set rather than nothing, so the printer stops saying it is
      // loading something that is never going to arrive.
      .catch(() => { if (!cancelled) { setArt({}); setStatus('Some of this would not load.'); } });
    return () => { cancelled = true; };
  }, [open, plate, isDark, shown]);

  // The ink. Redrawn on every change and then left alone: it is a still
  // picture over a moving one, so there is nothing here to animate.
  useEffect(() => {
    if (!open || !plate?.draw || !plateRef.current || !probeRef.current) return;
    let cancelled = false;
    const canvas = plateRef.current;

    const families = {
      sans: getComputedStyle(probeRef.current.querySelector('.shp-probe-sans')).fontFamily,
      mono: getComputedStyle(probeRef.current.querySelector('.shp-probe-mono')).fontFamily,
    };

    document.fonts.ready.then(() => {
      if (cancelled) return;
      canvas.width = frame.w;
      canvas.height = frame.h;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, frame.w, frame.h);
      plate.draw(ctx, frame, {
        art,
        shown,
        isDark,
        families,
        // Whether anything is moving behind the ink. It decides whether the
        // plate needs to lay a scrim before it writes: on plain paper the
        // thing sits on the page exactly as it does on the site, and a panel
        // drawn there would be a box around something that never had one.
        backdrop: look.Background ? look.key : null,
        paper: isDark ? PAPER.night : PAPER.day,
      });
    });

    return () => { cancelled = true; };
  }, [open, plate, frame, art, shown, isDark, look, mounted]);

  // ── Turning the paper ────────────────────────────────────────────────────
  const grab = event => { grabbed.current = { x: event.clientX, y: event.clientY }; };
  const release = event => {
    const from = grabbed.current;
    grabbed.current = null;
    if (!from) return;
    const dx = event.clientX - from.x;
    // Only a sideways gesture counts. A drag that went further up than across
    // was somebody scrolling, not somebody turning.
    if (Math.abs(dx) > TURN && Math.abs(dx) > Math.abs(event.clientY - from.y)) {
      turn(dx < 0 ? 1 : -1);
    }
  };

  // ── Off the press ────────────────────────────────────────────────────────
  // The paper colour, then whatever is moving on it, then the ink. Three
  // layers in the order they would go through a real one.
  const pull = useCallback(() => {
    const out = document.createElement('canvas');
    out.width = frame.w;
    out.height = frame.h;
    const ctx = out.getContext('2d');

    ctx.fillStyle = isDark ? PAPER.night : PAPER.day;
    ctx.fillRect(0, 0, frame.w, frame.h);

    const moving = backRef.current?.querySelector('canvas');
    if (moving && moving.width && moving.height) {
      ctx.drawImage(moving, 0, 0, frame.w, frame.h);
    }
    if (plateRef.current) ctx.drawImage(plateRef.current, 0, 0, frame.w, frame.h);
    return out;
  }, [frame, isDark]);

  // Flat colour and type wants PNG; a photograph of somebody's record shelf
  // wants JPEG and would be four megabytes as a PNG.
  const filetype = look.Background
    ? { mime: 'image/jpeg', quality: 0.94, ext: 'jpg' }
    : { mime: 'image/png', quality: undefined, ext: 'png' };

  const fileName = `${plate?.fileName || 'print'}-${look.key}-${frame.label.replace(':', 'x')}.${filetype.ext}`;

  const toBlob = useCallback(() => new Promise((resolve, reject) => {
    try {
      pull().toBlob(blob => (blob ? resolve(blob) : reject(new Error('empty'))), filetype.mime, filetype.quality);
    } catch (error) {
      // Nearly always the same thing: something on the canvas came from a host
      // that sends no CORS headers, and the pixels cannot be read back out.
      reject(error);
    }
  }), [pull, filetype.mime, filetype.quality]);

  // ── The address travels with the picture, 2026-09-12 ──────────────────
  // A print carries no code: a story is viewed on the phone that would have
  // to scan it. What carries a reader to the entry is the poster's link
  // sticker, so making a print puts the entry's address on the clipboard and
  // says so in the cover's words. Copied FIRST, before the picture is drawn:
  // Safari only writes the clipboard inside the tap that asked for it, and
  // composing the picture takes long enough to fall out of that.
  const copyTimer = useRef(null);
  const copyLink = useCallback(() => {
    if (!link || typeof navigator === 'undefined' || !navigator.clipboard) return Promise.resolve(false);
    return navigator.clipboard.writeText(link).then(() => true, () => false);
  }, [link]);
  const sayCopied = useCallback(() => {
    setStatus(COPIED);
    clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setStatus(s => (s === COPIED ? '' : s)), COPIED_MS);
  }, []);

  const save = useCallback(async () => {
    const pasted = copyLink();
    try {
      const blob = await toBlob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = fileName;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      if (await pasted) sayCopied(); else setStatus('');
    } catch {
      setStatus('A picture on this print is not CORS-enabled, so it cannot be saved.');
    }
  }, [toBlob, fileName, copyLink, sayCopied]);

  // The one that matters on a phone: hand the finished picture straight to the
  // share sheet, where Instagram and Messages are already waiting. Only
  // offered where the browser will actually take a file — phones will, most
  // desktops will not, and a Send button that silently does nothing is worse
  // than no Send button.
  // Rendered in place the printer is drawn on the server as well, where there
  // is no navigator, and a Send button the server did not draw would be a
  // hydration mismatch on every phone — so it is read as a client fact.
  const canSendFile = useSyncExternalStore(never, probeCanShare, onServer);

  const send = useCallback(async () => {
    const pasted = copyLink();
    try {
      const blob = await toBlob();
      const file = new File([blob], fileName, { type: filetype.mime });
      await navigator.share({ files: [file] });
      if (await pasted) sayCopied(); else setStatus('');
    } catch (error) {
      // Cancelling the share sheet rejects, and being told about it would be
      // an error message for changing your mind.
      if (error?.name === 'AbortError') return;
      setStatus('That could not be sent from here — save it instead.');
    }
  }, [toBlob, fileName, filetype.mime, copyLink, sayCopied]);

  // The address alone, without a picture.
  const copy = useCallback(async () => {
    if (!link) return;
    if (await copyLink()) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
      sayCopied();
    } else {
      // The clipboard needs a secure context and a real gesture. Showing the
      // address is still better than swallowing it.
      setStatus(link);
    }
  }, [link, copyLink, sayCopied]);

  if (!open) return null;
  // Portalled, the printer waits for the first paint: the server has no body
  // to portal into and renders nothing, and a client that portals during
  // hydration is a mismatch. In place it is ordinary markup and hydrates.
  if (!inline && !mounted) return null;

  const sheet = (
    <div className={'shp' + (inline ? ' shp--inline' : '')} role="dialog" aria-modal="true" aria-label="Print this">

      {/* Canvas cannot read CSS variables and the faces arrive from next/font,
          so the resolved names are read off these two rather than guessed. */}
      <div ref={probeRef} aria-hidden style={{ position: 'fixed', visibility: 'hidden', pointerEvents: 'none' }}>
        <span className="shp-probe-sans" style={{ fontFamily: 'var(--font-display)' }}>x</span>
        <span className="shp-probe-mono" style={{ fontFamily: 'var(--font-label)' }}>x</span>
      </div>

      <div className="shp-bar">
        <span className="shp-title">{plate?.title || 'Print'}</span>
      </div>

      <div className="shp-view" ref={viewRef}>
        <button type="button" className="shp-arrow" onClick={() => turn(-1)} aria-label="The print before this one">
          <CaretLeft size={16} weight="bold" aria-hidden="true" />
        </button>

        <div
          className={'shp-paper' + (nudge < 0 ? ' shp-paper--right' : nudge > 0 ? ' shp-paper--left' : '')}
          style={{ width: frame.w * z, height: frame.h * z, background: isDark ? PAPER.night : PAPER.day }}
          onPointerDown={grab}
          onPointerUp={release}
          onPointerCancel={() => { grabbed.current = null; }}
        >
          <div className="shp-stage" style={{ width: frame.w, height: frame.h, transform: `scale(${z})` }}>
            <div className="shp-back" ref={backRef}>
              {look.Background && (
                <look.Background key={look.key + frame.key} albums={albums} frameWidth={frame.w} />
              )}
            </div>
            <canvas className="shp-plate" ref={plateRef} />
          </div>
        </div>

        <button type="button" className="shp-arrow" onClick={() => turn(1)} aria-label="The next print">
          <CaretRight size={16} weight="bold" aria-hidden="true" />
        </button>
      </div>

      <div className="shp-turn">
        <span className="shp-look">{look.label}</span>
        <div className="shp-dots" role="tablist" aria-label="Prints">
          {VARIANTS.map((v, i) => (
            <button
              key={v.key}
              type="button"
              role="tab"
              aria-selected={i === at}
              aria-label={v.label}
              title={v.label}
              className={'shp-dot' + (i === at ? ' shp-dot--on' : '')}
              onClick={() => setAt(i)}
            />
          ))}
        </div>
      </div>

      <div className="shp-controls">
        <div className="shp-set">
          <span className="shp-set-label">Size</span>
          {FRAME_ORDER.map(key => (
            <button
              key={key}
              type="button"
              className={'shp-chip' + (frameKey === key ? ' shp-chip--on' : '')}
              onClick={() => setFrameKey(key)}
              title={FRAMES[key].note}
            >
              {FRAMES[key].label}
            </button>
          ))}
        </div>

        {toggles.length > 0 && (
          <div className="shp-set">
            <span className="shp-set-label">Show</span>
            {toggles.map(t => (
              <button
                key={t.key}
                type="button"
                aria-pressed={!!shown[t.key]}
                className={'shp-chip' + (shown[t.key] ? ' shp-chip--on' : '')}
                onClick={() => setPressed(p => {
                  const next = { ...p, [t.key]: !shown[t.key] };
                  // Toggles that share a `group` are a trade-off, one of a
                  // set: turning one on turns the others off, and turning the
                  // chosen one off leaves nothing chosen (Miyel, 2026-09-12).
                  if (t.group && !shown[t.key]) {
                    for (const other of toggles) {
                      if (other.group === t.group && other.key !== t.key) next[other.key] = false;
                    }
                  }
                  return next;
                })}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        <div className="shp-acts">
          {/* The way out, down here with the other two rather than pinned to
              the far corner of the screen. A printer that fills a phone puts
              its close button an inch further than a thumb reaches, and being
              unable to leave a thing you opened by mistake is the worst
              feeling a full-screen anything can give you. */}
          <button type="button" className="shp-act shp-act--quiet" onClick={onClose} aria-label="Close the printer">
            <X size={14} weight="bold" aria-hidden="true" />
          </button>
          {canSendFile && (
            <button type="button" className="shp-act shp-act--go" onClick={send}>
              <ShareNetwork size={14} weight="bold" aria-hidden="true" />
              Send
            </button>
          )}
          <button type="button" className={'shp-act' + (canSendFile ? '' : ' shp-act--go')} onClick={save}>
            <DownloadSimple size={14} weight="bold" aria-hidden="true" />
            Save
          </button>
          {link && (
            <button type="button" className="shp-act shp-act--quiet" onClick={copy} title={link}>
              {copied
                ? <Check size={14} weight="bold" aria-hidden="true" />
                : <LinkSimple size={14} weight="bold" aria-hidden="true" />}
              {copied ? 'Copied' : 'Link'}
            </button>
          )}
        </div>

        <div className="shp-said">{status || (art ? '' : 'Loading…')}</div>
      </div>
    </div>
  );

  // In place when the page is the printer's own sheet; see the note at the top.
  if (inline) return sheet;

  // Into the body, not into whatever opened it. The identity card lives inside
  // a container that rotates in 3D, and position: fixed inside a transformed
  // ancestor is positioned against the ancestor rather than the screen — the
  // rig sheet on that card has to undo the difference by hand. A portal has
  // nothing to undo.
  return createPortal(sheet, document.body);
}
