// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// app/entries/[slug]/opengraph-image.js
// What an entry's address looks like when it is pasted somewhere else.
//
// An entry link is the most-shared address on the whole site — it is what
// goes into a message — and until now it unfurled as a title and nothing.
// This draws the card the message shows: the cover, the album, the artist and
// year, the score, the marks, and whose journal it is. Drawn on the server
// when a link is unfurled, by the framework's convention for this file name;
// nothing on the page changes, and the picture is never stored.
//
// ── Why not the share printer ─────────────────────────────────────────────
// The printer makes things the owner hands out: a card, a picture, a code.
// This is the other half of sharing, the half that belongs to everybody — a
// visitor pastes the address and the preview is what they get. It is drawn
// from the same row the page is, so it can never disagree with the page.
//
// ── Fonts ─────────────────────────────────────────────────────────────────
// The image is rasterised on the server, which cannot read the page's CSS or
// the fonts next/font hands the browser. The two faces the site uses are
// fetched once from Google Fonts (a woff, which the renderer reads) and kept for the life of the process;
// if that fetch fails the picture still draws, in the renderer's own face,
// which is worse than Nunito and better than no preview.

import { ImageResponse } from 'next/og';
import { pull_entry_by_slug } from '@/library/database_actions';
import { pull_settings, titleName } from '@/library/settings_actions';
import { parseRating } from '@/library/entry_formatter';

// Drawn per request rather than at build: an entry can be corrected, and a
// preview that showed last week's score would be the page disagreeing with
// itself.
export const dynamic = 'force-dynamic';

export const alt = 'A record from a listening journal';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// The same tokens base.css sets, by value — a renderer has no custom properties.
const BG = '#eef0ec';
const INK = '#1a1a1a';
const SOFT = '#6b6b6b';
const FAINT = '#a8a8a8';
const GOLD = '#E8B84B';
const MARKS = { masterpiece: ['Masterpiece', '#4a9bf0'], favorite: ['Favorite', '#f0484f'], formative: ['Formative', '#3fa96b'] };

// Google Fonts hands back TTF to a browser old enough not to take woff2. One
// request for the stylesheet, one per face, then never again.
const fontCache = new Map();
async function font(family, weight) {
  const key = `${family}:${weight}`;
  if (fontCache.has(key)) return fontCache.get(key);
  const load = (async () => {
    const css = await fetch(`https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; rv:5.0) Gecko/20100101 Firefox/5.0' },
    }).then(r => r.text());
    const url = css.match(/src:\s*url\(([^)]+\.(?:ttf|otf|woff))\)/)?.[1];
    if (!url) throw new Error('no usable font file for ' + key);
    return fetch(url).then(r => r.arrayBuffer());
  })();
  fontCache.set(key, load);
  try { return await load; } catch (e) { fontCache.delete(key); throw e; }
}

async function fonts() {
  const wanted = [['Nunito', 700, 'Nunito'], ['Nunito', 400, 'Nunito'], ['DM Mono', 500, 'DM Mono']];
  const loaded = await Promise.allSettled(wanted.map(([family, weight]) => font(family, weight)));
  return loaded.flatMap((r, i) => r.status === 'fulfilled'
    ? [{ name: wanted[i][2], data: r.value, weight: wanted[i][1], style: 'normal' }]
    : []);
}

// A star as a shape, not a character: neither typeface carries one, and a
// glyph the font lacks renders as a box.
function Star({ lit }) {
  return (
    <svg width="38" height="38" viewBox="0 0 24 24" style={{ marginRight: 4 }}>
      <path d="M12 2.5l2.95 6.3 6.9.8-5.1 4.7 1.35 6.85L12 17.75l-6.1 3.4 1.35-6.85-5.1-4.7 6.9-.8z" fill={lit ? GOLD : '#d6d3cc'} />
    </svg>
  );
}

export default async function Image({ params }) {
  const { slug } = await params;
  const [entry, settings, faces] = await Promise.all([pull_entry_by_slug(slug), pull_settings(), fonts()]);
  const keeper = titleName(settings);

  if (!entry) {
    return new ImageResponse(
      <div style={{ width: '100%', height: '100%', background: BG, color: FAINT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Mono', fontSize: 28, letterSpacing: 4 }}>
        {keeper.toUpperCase()}
      </div>,
      { ...size, ...(faces.length ? { fonts: faces } : {}) },
    );
  }

  const score = parseRating(entry.rating);
  const isMasterpiece = entry.masterpiece === true || entry.rating === 'Masterpiece';
  const stars = isMasterpiece ? 5 : score;
  const marks = Object.entries(MARKS).filter(([key]) => key === 'masterpiece' ? isMasterpiece : entry[key] === true || entry[key] === 'true');
  const listen = entry.listen_total > 1 ? `Listen ${entry.listen_number}` : null;
  const line = [entry.artist, entry.year].filter(Boolean).join('  ·  ');

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', background: BG, color: INK, display: 'flex', fontFamily: 'Nunito' }}>
        {/* The cover, full height, square. It is the thing the message is about. */}
        <div style={{ width: 630, height: 630, display: 'flex', background: '#e6e4de', flexShrink: 0 }}>
          {entry.album_art && (
            <img src={entry.album_art} width={630} height={630} style={{ objectFit: 'cover' }} alt="" />
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '56px 60px 56px 56px', flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'DM Mono', fontSize: 20, letterSpacing: 3, color: FAINT, textTransform: 'uppercase', display: 'flex' }}>
            {keeper}
          </div>
          <div style={{ fontSize: entry.album.length > 28 ? 46 : 60, fontWeight: 700, lineHeight: 1.05, marginTop: 18, display: 'flex', letterSpacing: -1 }}>
            {entry.album}
          </div>
          <div style={{ fontSize: 28, color: SOFT, marginTop: 14, display: 'flex' }}>
            {line}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', marginTop: 34, gap: 6 }}>
            {[1, 2, 3, 4, 5].map(n => <Star key={n} lit={n <= Math.round(stars)} />)}
            {score > 0 && !Number.isInteger(score) && !isMasterpiece && (
              <div style={{ display: 'flex', fontFamily: 'DM Mono', fontSize: 22, color: SOFT, marginLeft: 10 }}>{score}</div>
            )}
          </div>

          {(marks.length > 0 || listen) && (
            <div style={{ display: 'flex', gap: 10, marginTop: 30, flexWrap: 'wrap' }}>
              {marks.map(([key, [label, colour]]) => (
                <div key={key} style={{ display: 'flex', fontFamily: 'DM Mono', fontSize: 18, letterSpacing: 2, textTransform: 'uppercase', color: colour, border: `2px solid ${colour}`, borderRadius: 999, padding: '8px 18px' }}>
                  {label}
                </div>
              ))}
              {listen && (
                <div style={{ display: 'flex', fontFamily: 'DM Mono', fontSize: 18, letterSpacing: 2, textTransform: 'uppercase', color: SOFT, border: `2px solid #d6d3cc`, borderRadius: 999, padding: '8px 18px' }}>
                  {listen}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    ),
    { ...size, ...(faces.length ? { fonts: faces } : {}) },
  );
}
