'use client';

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
// about what can sit behind the ink, about day and night, and about the two
// things a person actually does with a finished print: keep it or send it. It
// knows nothing whatsoever about identity cards or albums. Those arrive as a
// PLATE — an object that can load whatever art it needs and then draw itself
// onto a canvas at whatever size the paper happens to be. Adding a printable
// thing to this site is writing a plate, not touching this file.
//
// Why canvas rather than an image route on the server: the same reason
// /dashboard/share gives. The site leans on blur and translucency, Satori
// (what next/og renders with) supports neither, and canvas runs in the browser
// for free.
//
// Why the screensavers run live behind the preview rather than being
// snapshotted into it: because then the preview IS the print. The wallpaper
// is moving while you look at it, and Save takes the frame that is on screen
// at the moment you press it — so choosing a backdrop and choosing a moment
// are the same gesture, and nobody has to be told that the export will look
// slightly different from the preview. It won't.

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, DownloadSimple, LinkSimple, ShareNetwork, X } from '@phosphor-icons/react';
import Gallery from '../session_components/backgrounds/Gallery';
import Pong from '../session_components/backgrounds/Pong';
import Reel from '../session_components/backgrounds/Reel';
import Snake from '../session_components/backgrounds/Snake';
import Solitaire from '../session_components/backgrounds/Solitaire';
import Vinyl from '../session_components/backgrounds/Vinyl';

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

// ── What can sit behind the ink ────────────────────────────────────────────
// The dashboard screensavers, running on the journal's own covers. They are
// already the house wallpaper — the room you are in while you write — so a
// print made on one is recognisably from here without a single new asset
// file, and the covers on it are yours rather than a stock texture's.
//
// Only the canvas-drawn ones. Rain, DVD, Fizzy and SplitScreen are built out
// of DOM elements, which a canvas cannot photograph without dragging in a
// screenshot library; they are still perfectly good screensavers and they are
// simply not printable. Six is more than the three or four this needed.
//
// Paper is first and is not a backdrop at all — it is the absence of one, the
// page's own colour, and what the thing looks like on the site.
export const BACKDROPS = [
  { key: 'paper',     label: 'Paper',     Background: null },
  { key: 'gallery',   label: 'Gallery',   Background: Gallery },
  { key: 'vinyl',     label: 'Shelf',     Background: Vinyl },
  { key: 'reel',      label: 'Reel',      Background: Reel },
  { key: 'solitaire', label: 'Solitaire', Background: Solitaire },
  { key: 'snake',     label: 'Snake',     Background: Snake },
  { key: 'pong',      label: 'Pong',      Background: Pong },
];

// The page's own two colours, stated rather than read, because the print has
// to be the same colour on a phone set to dark as on a laptop set to light —
// the choice on screen is Day or Night, not whatever the viewer's system
// happens to think. These are --bg from globals.css.
export const PAPER = { day: '#eef0ec', night: '#0e0e0e' };

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
// a 375-square with the mark inside it and its ink hardcoded, so three string
// swaps make it usable: crop the viewBox down to the mark the way SiteNav does,
// size it to the box we want, recolour it. A data URL does not taint a canvas.
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

// ── The press ──────────────────────────────────────────────────────────────

export default function SharePrinter({ open, onClose, plate, albums = [], link = null }) {
  const [frameKey, setFrameKey] = useState('story');
  const [backdropKey, setBackdropKey] = useState('paper');
  const [isDark, setIsDark] = useState(false);
  // Whatever extra choices this plate wanted, keyed by choice — but only the
  // ones that have actually been pressed. The answer handed to the plate is
  // derived from those and the plate's own first option, rather than copied
  // into state when the plate arrives: an effect doing the copying has to
  // guess when NOT to, and would overwrite a choice every time the card
  // underneath it re-rendered.
  const [pressed, setPressed] = useState({});
  const [art, setArt] = useState(null);
  const [status, setStatus] = useState('');
  const [copied, setCopied] = useState(false);
  const [z, setZ] = useState(0.2);

  const viewRef = useRef(null);
  const backRef = useRef(null);
  const plateRef = useRef(null);
  const probeRef = useRef(null);

  const frame = FRAMES[frameKey];
  const backdrop = BACKDROPS.find(b => b.key === backdropKey) || BACKDROPS[0];
  const choices = useMemo(() => plate?.choices || [], [plate]);

  const picks = useMemo(() => {
    const answer = {};
    for (const c of choices) answer[c.key] = pressed[c.key] ?? c.options[0]?.value;
    return answer;
  }, [choices, pressed]);

  // Escape, and the page held still underneath. A sheet this tall over a
  // scrolling page means two things scroll and only one of them was asked to.
  useEffect(() => {
    if (!open) return;
    const onKey = event => { if (event.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

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
  }, [open, frame]);

  // The art the plate needs, fetched whenever the answer would be different.
  useEffect(() => {
    if (!open || !plate?.load) return;
    let cancelled = false;
    plate.load({ isDark, picks })
      .then(loaded => { if (!cancelled) { setArt(loaded); setStatus(''); } })
      // An empty set rather than nothing, so the printer stops saying it is
      // loading something that is never going to arrive.
      .catch(() => { if (!cancelled) { setArt({}); setStatus('Some of this would not load.'); } });
    return () => { cancelled = true; };
  }, [open, plate, isDark, picks]);

  // Deliberately NOT cleared when the choices change. A press on Code leaves
  // the photograph on the paper until the code is in hand — which is the
  // right way round, because the alternative is the print going blank for as
  // long as a picture takes to arrive.

  // The ink. Redrawn on every change and then left alone — it is a still
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
        picks,
        isDark,
        families,
        // Whether anything is moving behind the ink. It decides whether the
        // plate needs to lay a scrim before it writes: on paper the thing sits
        // on the page exactly as it does on the site, and a panel drawn there
        // would be a box around something that has never had one.
        backdrop: backdrop.key === 'paper' ? null : backdrop.key,
        paper: isDark ? PAPER.night : PAPER.day,
      });
    });

    return () => { cancelled = true; };
  }, [open, plate, frame, art, picks, isDark, backdrop]);

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
  const filetype = backdrop.key === 'paper'
    ? { mime: 'image/png', quality: undefined, ext: 'png' }
    : { mime: 'image/jpeg', quality: 0.94, ext: 'jpg' };

  const fileName = `${plate?.fileName || 'print'}-${frame.label.replace(':', 'x')}.${filetype.ext}`;

  const toBlob = useCallback(() => new Promise((resolve, reject) => {
    try {
      pull().toBlob(blob => (blob ? resolve(blob) : reject(new Error('empty'))), filetype.mime, filetype.quality);
    } catch (error) {
      // Nearly always the same thing: something on the canvas came from a host
      // that sends no CORS headers, and the pixels cannot be read back out.
      reject(error);
    }
  }), [pull, filetype.mime, filetype.quality]);

  const save = useCallback(async () => {
    try {
      const blob = await toBlob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = fileName;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      setStatus('');
    } catch {
      setStatus('A picture on this print is not CORS-enabled, so it cannot be saved.');
    }
  }, [toBlob, fileName]);

  // The one that matters on a phone: hand the finished picture straight to the
  // share sheet, where Instagram and Messages are already waiting. Only offered
  // where the browser will actually take a file — Safari and Chrome on a phone
  // will, most desktops will not, and a Share button that silently does nothing
  // is worse than no Share button.
  const [canSendFile] = useState(() => {
    if (typeof navigator === 'undefined' || !navigator.canShare) return false;
    try {
      const probe = new File([new Blob([''], { type: 'image/png' })], 'probe.png', { type: 'image/png' });
      return navigator.canShare({ files: [probe] });
    } catch { return false; }
  });

  const send = useCallback(async () => {
    try {
      const blob = await toBlob();
      const file = new File([blob], fileName, { type: filetype.mime });
      await navigator.share({ files: [file] });
      setStatus('');
    } catch (error) {
      // Cancelling the share sheet rejects, and being told about it would be
      // an error message for changing your mind.
      if (error?.name === 'AbortError') return;
      setStatus('That could not be sent from here — save it instead.');
    }
  }, [toBlob, fileName, filetype.mime]);

  const copy = useCallback(async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // The clipboard needs a secure context and a real gesture. Showing the
      // address is still better than swallowing it.
      setStatus(link);
    }
  }, [link]);

  if (!open || typeof document === 'undefined') return null;

  const sheet = (
    <div className="shp" role="dialog" aria-modal="true" aria-label="Print this">
      <style href="ln-share-printer" precedence="default">{`
        .shp {
          position: fixed; inset: 0;
          /* Above everything with a number on it. The landing page's turning
             cover sits at 91 and the sidebar's hamburger at 300, and a printer
             is a room you are in rather than a panel on the page — it covers
             the thing it is printing, including the thing's own furniture. */
          z-index: 400;
          display: flex; flex-direction: column;
          background: var(--bg);
          font-family: var(--font-display);
        }

        /* ── the bar ── what this is, and the way out, which is the only
           control on a printer that has to be findable without looking. */
        .shp-bar {
          position: relative; z-index: 1; flex-shrink: 0;
          display: flex; align-items: center; justify-content: space-between;
          gap: 12px; padding: 14px 18px calc(6px);
        }
        .shp-title {
          font-family: var(--font-label);
          font-size: 9px; letter-spacing: 0.18em; text-transform: uppercase;
          color: var(--ink-faint);
        }
        .shp-close {
          display: inline-flex; align-items: center; justify-content: center;
          width: 32px; height: 32px; border-radius: 10px;
          border: 0; background: transparent; color: var(--ink-faint);
          cursor: pointer; transition: color 0.15s, background 0.15s;
        }
        .shp-close:hover { color: var(--ink); background: var(--bg-warm); }

        /* ── the paper ── everything left over after the bar and the controls,
           with the print scaled to fit whatever that turned out to be. */
        .shp-view {
          position: relative; z-index: 1;
          flex: 1; min-height: 0;
          display: flex; align-items: center; justify-content: center;
          padding: 8px 18px;
        }
        .shp-paper {
          position: relative;
          overflow: hidden;
          border-radius: 10px;
          box-shadow: 0 18px 50px rgba(0,0,0,0.22);
        }
        .shp-stage { position: relative; transform-origin: top left; }
        .shp-back { position: absolute; inset: 0; overflow: hidden; }
        .shp-plate { position: absolute; inset: 0; width: 100%; height: 100%; }

        /* ── the controls ── rows of pills, scrolling sideways rather than
           wrapping. A wrapping row changes height when you pick something,
           which moves the print you were looking at. */
        .shp-controls {
          position: relative; z-index: 1; flex-shrink: 0;
          padding: 4px 0 calc(16px + env(safe-area-inset-bottom, 0px));
          display: flex; flex-direction: column; gap: 9px;
        }
        .shp-set {
          display: flex; align-items: center; gap: 6px;
          padding: 0 18px;
          overflow-x: auto;
          scrollbar-width: none;
        }
        .shp-set::-webkit-scrollbar { display: none; }
        .shp-set-label {
          flex-shrink: 0;
          font-family: var(--font-label);
          font-size: 8.5px; letter-spacing: 0.14em; text-transform: uppercase;
          color: var(--ink-faint);
          width: 52px;
        }
        .shp-chip {
          flex-shrink: 0;
          font-family: var(--font-label);
          font-size: 9.5px; letter-spacing: 0.1em; text-transform: uppercase;
          padding: 8px 13px; border-radius: 999px;
          border: 1px solid var(--border);
          background: transparent; color: var(--ink-soft);
          cursor: pointer; white-space: nowrap;
          transition: color 0.15s, border-color 0.15s, background 0.15s;
        }
        .shp-chip:hover { color: var(--ink); border-color: var(--ink-faint); }
        .shp-chip--on {
          color: var(--bg); background: var(--ink); border-color: var(--ink);
        }

        /* ── the two things you do with a print ── */
        .shp-acts {
          display: flex; align-items: center; gap: 8px;
          padding: 5px 18px 0;
        }
        .shp-act {
          display: inline-flex; align-items: center; justify-content: center; gap: 7px;
          flex: 1;
          font-family: var(--font-label);
          font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase;
          padding: 13px 16px; border-radius: 999px;
          border: 1px solid var(--ink-faint); background: transparent; color: var(--ink);
          cursor: pointer; white-space: nowrap;
          transition: color 0.15s, border-color 0.15s, background 0.15s;
        }
        .shp-act:hover { border-color: var(--ink); }
        .shp-act--go { background: var(--ink); color: var(--bg); border-color: var(--ink); }
        .shp-act--quiet { flex: 0 0 auto; border-color: var(--border); color: var(--ink-soft); }
        .shp-said {
          padding: 0 18px;
          font-family: var(--font-label);
          font-size: 9px; letter-spacing: 0.08em;
          color: var(--ink-faint);
          min-height: 12px;
          overflow-wrap: anywhere;
        }

        /* Wide enough for a room, and the printer stops being a full screen and
           becomes what it is: a press on a bench with its controls beside it. */
        @media (min-width: 900px) {
          .shp { padding: 0; }
          .shp-bar { padding: 18px 26px 8px; }
          .shp-view { padding: 8px 26px 14px; }
          .shp-set, .shp-acts, .shp-said { padding-left: 26px; padding-right: 26px; }
          .shp-controls { max-width: 620px; width: 100%; align-self: center; }
        }
      `}</style>

      {/* Canvas cannot read CSS variables and the faces arrive from next/font,
          so the resolved names are read off these two rather than guessed. */}
      <div ref={probeRef} aria-hidden style={{ position: 'fixed', visibility: 'hidden', pointerEvents: 'none' }}>
        <span className="shp-probe-sans" style={{ fontFamily: 'var(--font-display)' }}>x</span>
        <span className="shp-probe-mono" style={{ fontFamily: 'var(--font-label)' }}>x</span>
      </div>

      <div className="shp-bar">
        <span className="shp-title">{plate?.title || 'Print'}</span>
        <button type="button" className="shp-close" onClick={onClose} aria-label="Close the printer">
          <X size={16} weight="bold" aria-hidden="true" />
        </button>
      </div>

      <div className="shp-view" ref={viewRef}>
        <div className="shp-paper" style={{ width: frame.w * z, height: frame.h * z, background: isDark ? PAPER.night : PAPER.day }}>
          <div
            className="shp-stage"
            style={{ width: frame.w, height: frame.h, transform: `scale(${z})` }}
          >
            <div className="shp-back" ref={backRef}>
              {backdrop.Background && (
                <backdrop.Background
                  key={backdrop.key + frame.key}
                  albums={albums}
                  frameWidth={frame.w}
                />
              )}
            </div>
            <canvas className="shp-plate" ref={plateRef} />
          </div>
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

        <div className="shp-set">
          <span className="shp-set-label">Behind</span>
          {BACKDROPS.map(b => (
            <button
              key={b.key}
              type="button"
              className={'shp-chip' + (backdropKey === b.key ? ' shp-chip--on' : '')}
              onClick={() => setBackdropKey(b.key)}
            >
              {b.label}
            </button>
          ))}
        </div>

        <div className="shp-set">
          <span className="shp-set-label">Ink</span>
          <button type="button" className={'shp-chip' + (!isDark ? ' shp-chip--on' : '')} onClick={() => setIsDark(false)}>Day</button>
          <button type="button" className={'shp-chip' + (isDark ? ' shp-chip--on' : '')} onClick={() => setIsDark(true)}>Night</button>
        </div>

        {choices.map(choice => (
          <div className="shp-set" key={choice.key}>
            <span className="shp-set-label">{choice.label}</span>
            {choice.options.map(option => (
              <button
                key={option.value}
                type="button"
                className={'shp-chip' + (picks[choice.key] === option.value ? ' shp-chip--on' : '')}
                onClick={() => setPressed(p => ({ ...p, [choice.key]: option.value }))}
              >
                {option.label}
              </button>
            ))}
          </div>
        ))}

        <div className="shp-acts">
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

  // Into the body, not into whatever opened it. The identity card lives inside
  // a container that rotates in 3D, and position: fixed inside a transformed
  // ancestor is positioned against the ancestor rather than the screen — the
  // rig sheet on that card has to undo the difference by hand. A portal has
  // nothing to undo.
  return createPortal(sheet, document.body);
}
