// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// app/get/gift-preview/route.js
// What a gift link looks like when it is pasted into a message.
//
// Give's code and link carry `?gift=<the giver's journal>` to /get, and /get
// shows "A gift from" them on a card under the mark. This draws that card for
// the preview a message makes of the link — the face, A GIFT FROM, the name,
// the present — so the link says whose gift it is before anybody opens it
// (Miyel, 2026-09-23: make the texting card look like the header). The card
// is the whole picture, edge to edge, so the preview reads as the card
// itself: the first cut floated it small, under the mark and over GET YOUR
// COPY, and in Messages it was a card inside a card (Miyel: much larger, the
// text is the button itself). The message prints the title and the address
// under it, so the picture needs neither. /get's metadata points here only
// when the giver's journal answered, so the picture and the page agree.
//
// A plain route and not the framework's opengraph-image file, because that
// file is handed the route's params and never its query, and the gift is the
// query. /get names this address in its own metadata instead.
//
// The name and the face are asked of the giver's journal through the
// doorman's relay door, as /get asks: this is a public address that makes
// this server fetch another. A gift from this journal itself is answered from
// its own settings. Anything that does not answer is a 404, never a card with
// a hole in it — a message then shows the plain title, which is honest.
//
// Fonts as the entry's preview fetches them (app/entries/[slug]/
// opengraph-image.js): once per process, from Google Fonts, and the picture
// still draws in the renderer's own face if that fails.
//
// The present and the plain face are Phosphor's own shapes, copied in as
// paths (regular weight, a 256 box): the renderer draws elements, and the
// icon components are wrapped in a way it cannot read.

import { ImageResponse } from 'next/og';
import { pull_settings } from '../../../library/settings_actions';
import { ask_journal_name } from '../../../library/people_actions';
import { tidyJournal, journalUrl } from '../../../library/return_address';
import { mayKnock, whoIsKnocking } from '../../../library/doorman';

// Asked per request: a journal can change its name or its face, and a preview
// is drawn rarely — once per paste, by the app the link is pasted into.
export const dynamic = 'force-dynamic';

// The tokens base.css sets, by value — a renderer has no custom properties.
// The panel is the tile's white-over-paper, flattened.
const BG = '#eef0ec';
const PANEL = '#f6f7f4';
const INK = '#1a1a1a';
const FAINT = '#a8a8a8';

// family:weight → the font file, for the life of the process.
const FONTS = new Map();
const WANTED = [['Nunito', 700], ['DM Mono', 400]];

const GIFT = 'M216,72H180.92c.39-.33.79-.65,1.17-1A29.53,29.53,0,0,0,192,49.57,32.62,32.62,0,0,0,158.44,16,29.53,29.53,0,0,0,137,25.91a54.94,54.94,0,0,0-9,14.48,54.94,54.94,0,0,0-9-14.48A29.53,29.53,0,0,0,97.56,16,32.62,32.62,0,0,0,64,49.57,29.53,29.53,0,0,0,73.91,71c.38.33.78.65,1.17,1H40A16,16,0,0,0,24,88v32a16,16,0,0,0,16,16v64a16,16,0,0,0,16,16H200a16,16,0,0,0,16-16V136a16,16,0,0,0,16-16V88A16,16,0,0,0,216,72ZM149,36.51a13.69,13.69,0,0,1,10-4.5h.49A16.62,16.62,0,0,1,176,49.08a13.69,13.69,0,0,1-4.5,10c-9.49,8.4-25.24,11.36-35,12.4C137.7,60.89,141,45.5,149,36.51Zm-64.09.36A16.63,16.63,0,0,1,96.59,32h.49a13.69,13.69,0,0,1,10,4.5c8.39,9.48,11.35,25.2,12.39,34.92-9.72-1-25.44-4-34.92-12.39a13.69,13.69,0,0,1-4.5-10A16.6,16.6,0,0,1,84.87,36.87ZM40,88h80v32H40Zm16,48h64v64H56Zm144,64H136V136h64Zm16-80H136V88h80v32Z';
const USER = 'M230.92,212c-15.23-26.33-38.7-45.21-66.09-54.16a72,72,0,1,0-73.66,0C63.78,166.78,40.31,185.66,25.08,212a8,8,0,1,0,13.85,8c18.84-32.56,52.14-52,89.07-52s70.23,19.44,89.07,52a8,8,0,1,0,13.85-8ZM72,96a56,56,0,1,1,56,56A56.06,56.06,0,0,1,72,96Z';

export async function GET(request) {
  const settings = await pull_settings();
  // /get's own drawer rule: a copy with no essay has no /get, and so no gift.
  if (!settings.why_essay?.trim()) return new Response('Not found', { status: 404 });

  const giver = tidyJournal(request.nextUrl.searchParams.get('gift') || '');
  const own = Boolean(giver) && giver === tidyJournal(settings.site_address);
  if (!giver || (!own && !mayKnock('relay', whoIsKnocking(request)).allowed)) {
    return new Response('Not found', { status: 404 });
  }

  const [name, face] = await Promise.all([
    own ? (String(settings.keeper_name || '').trim() || null) : ask_journal_name(giver, 2500),
    // The face as a data address, so the renderer never goes looking for it;
    // a journal with no portrait answers 404, and the plain mark stands in.
    fetch(`${journalUrl(giver)}/api/portrait`, { signal: AbortSignal.timeout(2500) })
      .then(async answer => {
        const type = answer.headers.get('content-type') || '';
        if (!answer.ok || !/^image\/(jpeg|png)/.test(type)) return null;
        return `data:${type};base64,${Buffer.from(await answer.arrayBuffer()).toString('base64')}`;
      })
      .catch(() => null),
  ]);
  if (!name) return new Response('Not found', { status: 404 });

  const loaded = await Promise.allSettled(WANTED.map(([family, weight]) => {
    const key = `${family}:${weight}`;
    if (!FONTS.has(key)) {
      FONTS.set(key, fetch(`https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}`, {
        // Old enough a browser that Google hands back a file the renderer reads.
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; rv:5.0) Gecko/20100101 Firefox/5.0' },
      })
        .then(answer => answer.text())
        .then(css => {
          const url = css.match(/src:\s*url\(([^)]+\.(?:ttf|otf|woff))\)/)?.[1];
          if (!url) throw new Error('no usable font file for ' + key);
          return fetch(url).then(answer => answer.arrayBuffer());
        })
        .catch(error => { FONTS.delete(key); throw error; }));
    }
    return FONTS.get(key);
  }));
  const fonts = loaded.flatMap((result, i) => result.status === 'fulfilled'
    ? [{ name: WANTED[i][0], data: result.value, weight: WANTED[i][1], style: 'normal' }]
    : []);

  // The name as large as its length allows on one line: the words have about
  // 430 of the 1200, and Nunito's bold runs near 0.56 of its size a letter.
  const nameSize = Math.max(64, Math.min(140, Math.floor(430 / (Math.max(name.length, 1) * 0.56))));

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', padding: '0 80px', background: PANEL }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, width: 380, height: 380, borderRadius: 84, overflow: 'hidden', background: BG }}>
          {face
            ? <img src={face} alt="" width={380} height={380} style={{ width: 380, height: 380, objectFit: 'cover', borderRadius: 84 }} />
            : <svg width="160" height="160" viewBox="0 0 256 256"><path fill={FAINT} d={USER} /></svg>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, marginLeft: 64 }}>
          <div style={{ display: 'flex', fontFamily: 'DM Mono', fontSize: 40, letterSpacing: '0.2em', color: FAINT }}>A GIFT FROM</div>
          <div style={{ display: 'flex', fontFamily: 'Nunito', fontWeight: 700, fontSize: nameSize, lineHeight: 1.05, color: INK, marginTop: 14 }}>{name}</div>
        </div>
        <svg width="120" height="120" viewBox="0 0 256 256" style={{ flexShrink: 0, marginLeft: 40 }}>
          <path fill={INK} d={GIFT} />
        </svg>
      </div>
    ),
    { width: 1200, height: 630, fonts },
  );
}
