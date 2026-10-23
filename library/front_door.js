// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// library/front_door.js
// The front door: the address a deployment that hosts journals answers at
// itself, where somebody starts a journal or finds theirs (hosted journals,
// step 4; Miyel's name, 2026-10-20 — her roadmap's word for what
// listeningnotes.blog becomes).
//
// ── Starting a journal ────────────────────────────────────────────────────
// Choose an address, and the front door asks Neon for a database of its own,
// brings it up to date, writes the address onto it, and places it in the
// hosting directory — about twenty seconds, with no GitHub, no Vercel and no
// build log (the brief). Then it hands the new journal over: the browser goes
// to the journal's own address with its claim code in the part of a link
// that no server is sent, and the setup there opens with it. The key is made
// at the journal's own address (Face ID belongs to one address), so the
// front door holds nobody's way in, ever (Miyel, 2026-10-20: "keep the lock
// on each journal").
//
// ── Places ────────────────────────────────────────────────────────────────
// A hundred to start (HOSTED_JOURNALS_MOST raises it), because hosting is
// built never to grow past what its keeper can pay for (ROADMAP, the end
// goal). The places left are said while there are some — a count on the
// community, never on anybody — and "We're full for now" once there are
// none (her pick: "a mix of both").
//
// ── What keeps a place from being wasted ──────────────────────────────────
// Each place a request comes from can start a few journals an hour (the
// doorman's `start` door), and a journal the front door made that nobody set
// up, with nothing written in it, is cleared after a day — its database and
// its row — so abandoned starts never hold a place. Nothing else is ever
// cleared: a journal placed by hand, or set up, or written in, stays.

import { cache } from 'react';
import { neon } from '@neondatabase/serverless';
import { hosting, forwarding, tidyHost, journalAt, place_journal, count_journals, made_at_signup, unplace_journal } from './hosting_directory.js';
import { mintClaimCode } from './secrets.js';
import { inviterIn } from './return_address.js';
import { ask_journal_name } from './people_actions.js';
import { mayKnock, whoIsKnocking } from './doorman.js';
import { SEARCH_HEADER } from '../proxy.js';
import { ask_directory_read } from './outbox.js';
import { sizedAlbumArt } from './music_data_api.js';

// ── Who invited them, 2026-10-21 ──────────────────────────────────────────
// An invite link (InviteSheet.js) names the inviter's journal. The front
// door says who it is, over Choose your address, and hands the address on
// to the new journal's setup (app/api/front-door), which offers to add them
// and wave. The name is asked of their journal through the doorman's relay
// door, as /get asked it of a giver: this page makes this server fetch
// another. Once a request, shared by the page and its link preview. No
// name, no line — the address still goes on, and setup asks again.
export const inviterAtTheDoor = cache(async () => {
  const { headers } = await import('next/headers');
  const asked = await headers();
  const address = inviterIn(new URLSearchParams(asked.get(SEARCH_HEADER) || ''));
  if (!address) return null;
  const knock = await mayKnock('relay', whoIsKnocking({ headers: asked }));
  const name = knock.allowed ? await ask_journal_name(address, 2500) : null;
  return { address, name };
});

// ── The covers over the front door, 2026-10-22 ────────────────────────────
// What keepers on the Board have logged lately, asked of the Board's own list
// (DIRECTORY_URL, ?covers) — covers only, never who — for the record wall
// under the front door's masthead. Kept ten minutes, so a busy front door
// asks once; when the list cannot be read, the last covers stay, and with
// none the mark and the doors stand alone. Sized for the wall's widest
// cover, a hundred and fifty points, rather than for a phone's.
const COVERS_KEPT_MS = 10 * 60 * 1000;
let coversHeld = { at: 0, covers: [] };
export async function frontDoorCovers() {
  if (Date.now() - coversHeld.at < COVERS_KEPT_MS) return coversHeld.covers;
  const said = await ask_directory_read('covers');
  const covers = Array.isArray(said?.covers)
    ? said.covers.filter(art => typeof art === 'string' && /^https:\/\//.test(art)).map(art => sizedAlbumArt(art, 300))
    : null;
  // A failed ask is tried again in a minute rather than ten.
  coversHeld = covers
    ? { at: Date.now(), covers }
    : { at: Date.now() - COVERS_KEPT_MS + 60_000, covers: coversHeld.covers };
  return coversHeld.covers;
}

// What the front door's pages say about themselves (app/layout.js): the one
// place called Listening Notes and nothing else, since it is the software's
// own page, not a journal. An invite link's preview — what a message shows
// when the link is pasted — says who invited them, over their face, drawn by
// app/get/gift-preview here at the front door; only when their journal
// answered, so the picture and the page agree.
export async function frontDoorMetadata() {
  const plain = { title: 'Listening Notes', description: 'A listening journal of your own.' };
  const invite = await inviterAtTheDoor().catch(() => null);
  if (!invite?.name) return plain;
  const { headers } = await import('next/headers');
  const asked = await headers();
  const host = (asked.get('x-forwarded-host') || asked.get('host') || '').split(',')[0].trim();
  const proto = (asked.get('x-forwarded-proto') || '').split(',')[0].trim()
    || (/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host) ? 'http' : 'https');
  // Miyel's words, 2026-10-21, over "A gift from".
  const said = `Invited by ${invite.name}`;
  return {
    ...plain,
    openGraph: {
      title: said,
      siteName: 'Listening Notes',
      description: plain.description,
      type: 'website',
      images: [{
        url: `${proto}://${host}/get/gift-preview?invite=${encodeURIComponent(invite.address)}`,
        width: 1200,
        height: 630,
        alt: said,
      }],
    },
  };
}

// ── The front door's own address ──────────────────────────────────────────
// HOSTED_DOMAIN (her name): the domain the journals live under, whose bare
// name and www. are the front door. `localhost` on a dev server, so the front
// door is localhost and the journals are name.localhost.
export function hostedDomain() {
  return tidyHost(process.env.HOSTED_DOMAIN || '');
}

// Its www. too, unless a journal used to live there (FORWARDING_ADDRESS,
// library/hosting_directory.js): then www. is that journal's, and the edge
// sends the front door's two pages there on to the bare domain
// (next.config.mjs).
export function isFrontDoor(host) {
  const domain = hostedDomain();
  if (!hosting() || !domain) return false;
  const at = tidyHost(host);
  return at === domain || (at === `www.${domain}` && !forwarding());
}

// ── Addresses ─────────────────────────────────────────────────────────────
// Letters, numbers and dashes, three to thirty, starting and ending with a
// letter or a number, and never two dashes together (which is how a
// browser writes an address in another alphabet).
const NAME = /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$/;

// Names nobody may start a journal at: the ones that would look like the
// software's own, or like a door to somewhere else. Words, never anybody's
// name — a journal moving in is placed by hand before signup is open.
export const KEPT_NAMES = new Set([
  'www', 'api', 'app', 'admin', 'administrator', 'root', 'system', 'official',
  'mail', 'email', 'smtp', 'imap', 'pop', 'ftp', 'ns1', 'ns2', 'dns',
  'help', 'support', 'contact', 'info', 'about', 'faq', 'status', 'security',
  'abuse', 'postmaster', 'hostmaster', 'webmaster', 'noreply', 'no-reply',
  'login', 'logout', 'signin', 'signup', 'register', 'account', 'accounts',
  'auth', 'oauth', 'sso', 'password', 'settings', 'billing', 'pay', 'payments',
  'blog', 'news', 'press', 'legal', 'privacy', 'terms', 'policy', 'docs',
  'dev', 'test', 'testing', 'staging', 'sandbox', 'preview', 'beta', 'demo',
  'cdn', 'static', 'assets', 'media', 'images', 'img', 'files', 'download',
  'get', 'start', 'find', 'new', 'board', 'directory', 'people', 'keepers',
  'journal', 'journals', 'listening', 'notes', 'listeningnotes', 'ln',
  'team', 'staff', 'moderator', 'mod',
  // Miyel's, 2026-10-21: the names she wants held, and the ones a fake
  // journal could use to pass as her or as the publication — its issues,
  // the commons' candidate names, the donations and events she has planned.
  'founder', 'owner', 'creator', 'editor',
  'publication', 'issue', 'issues', 'question', 'monthly', 'annual',
  'commons', 'counter', 'listeningroom',
  'donate', 'donations', 'events', 'tickets',
  // Hers, 2026-10-22: where Listening Notes is made — the publication's own
  // journal (STUDIO_ADDRESS), shown to nobody.
  'studio',
]);

export function tidyName(value) {
  return String(value || '').trim().toLowerCase();
}

export function journalHostFor(name) {
  return `${tidyName(name)}.${hostedDomain()}`;
}

// 'free', 'taken', or 'unwritable' — a kept name is 'taken' on the page, so
// nobody learns the list by trying it.
export async function nameState(value) {
  const name = tidyName(value);
  if (!NAME.test(name) || name.includes('--')) return 'unwritable';
  if (KEPT_NAMES.has(name)) return 'taken';
  return (await journalAt(journalHostFor(name))) ? 'taken' : 'free';
}

// ── Places ────────────────────────────────────────────────────────────────
export function placesMost() {
  const set = Number.parseInt(process.env.HOSTED_JOURNALS_MOST || '', 10);
  return Number.isFinite(set) && set >= 0 ? set : 100;
}

export async function placesLeft() {
  return Math.max(0, placesMost() - (await count_journals()));
}

// ── Neon ──────────────────────────────────────────────────────────────────
// The one company asked for anything, on a keeper's press: a database. The
// key lives only in the deployment's settings (NEON_API_KEY), with the
// organisation it belongs to (NEON_ORG_ID) when Neon wants one named.
// NEON_API_URL points the asking somewhere else, for a test.
//
// Where it is made (NEON_REGION) belongs beside where the deployment's
// functions run, because a page asks its database many times and its reader
// once: the default sits beside Vercel's default, Washington (iad1), and a
// deployment whose functions run in Portland (pdx1) sets aws-us-west-2, as
// Miyel's does from 2026-10-20 ("most friends … chose oregon"). And on
// Postgres 17, the version every journal so far has run its migrations on;
// a newer one is a choice made on purpose, not Neon's default moving.
const NEON_API = () => process.env.NEON_API_URL || 'https://console.neon.tech/api/v2';

async function askNeon(method, path, body = null) {
  if (!process.env.NEON_API_KEY) throw new Error('This front door has no Neon key, so it cannot make a journal.');
  const answer = await fetch(`${NEON_API()}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.NEON_API_KEY}`,
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(30_000),
  });
  const said = await answer.json().catch(() => ({}));
  if (!answer.ok) throw new Error(said?.message || `Neon answered ${answer.status}.`);
  return said;
}

// The way in a new project hands back, as the pooled address the site asks
// through (the migrator strips the pooler off again for itself).
function pooledWay(made) {
  const uri = made?.connection_uris?.[0];
  if (!uri?.connection_uri) throw new Error('Neon made a database and did not say how to reach it.');
  const way = new URL(uri.connection_uri);
  const pooler = uri.connection_parameters?.pooler_host;
  if (pooler) way.hostname = pooler;
  return way.toString();
}

// A new database answers within a few seconds of being made; until it does,
// nothing else is asked of it.
async function untilItAnswers(way) {
  const sql = neon(way);
  let last = null;
  for (let i = 0; i < 20; i++) {
    try {
      await sql`SELECT 1`;
      return;
    } catch (error) {
      last = error;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  throw new Error(`The new database never answered (${last?.message || last}).`);
}

// ── Making a journal ──────────────────────────────────────────────────────
// Returns the journal's address and the claim code that opens its setup.
// A journal whose making fails part way is taken down again, so a failure
// never holds a place or a name.
//
// `onStep` is told each step as it really finishes — 'database', 'pages',
// 'address' — so the page can tick it off (Miyel's pick, 2026-10-20: "steps
// that tick off, as each really finishes").
export async function make_journal(value, { onStep = () => {} } = {}) {
  const name = tidyName(value);
  const host = journalHostFor(name);
  const made = await askNeon('POST', '/projects', {
    project: {
      name: `journal-${name}`,
      region_id: process.env.NEON_REGION || 'aws-us-east-1',
      pg_version: 17,
      ...(process.env.NEON_ORG_ID ? { org_id: process.env.NEON_ORG_ID } : {}),
    },
  });
  const project = made?.project?.id;
  if (!project) throw new Error('Neon did not make a database.');
  try {
    const way = pooledWay(made);
    await untilItAnswers(way);
    onStep('database');
    const { bringUpToDate } = await import('./migrator.js');
    await bringUpToDate({ url: way, log: said => console.log(`[migrations ${host}] ${said}`) });
    onStep('pages');
    const sql = neon(way);
    await sql`
      INSERT INTO settings (id, site_address, setup_complete) VALUES (1, ${host}, false)
      ON CONFLICT (id) DO UPDATE SET site_address = EXCLUDED.site_address`;
    const code = mintClaimCode();
    await sql`
      INSERT INTO secrets (id, claim_code) VALUES (1, ${code})
      ON CONFLICT (id) DO UPDATE SET claim_code = EXCLUDED.claim_code`;
    await place_journal(host, way, { project, fresh: true });
    onStep('address');
    return { host, code };
  } catch (error) {
    await askNeon('DELETE', `/projects/${encodeURIComponent(project)}`).catch(() => {});
    throw error;
  }
}

// ── Clearing what was never set up ────────────────────────────────────────
// Asked whenever somebody starts a journal, so it needs no timer. A journal
// is cleared only when the front door made it, a day has passed, nobody
// claimed it, and nothing was ever written in it; anything else stays.
const CLEARED_AFTER = '1 day';

export async function clear_never_set_up() {
  let candidates = [];
  try {
    candidates = await made_at_signup(CLEARED_AFTER);
  } catch {
    return;
  }
  for (const journal of candidates) {
    try {
      const sql = neon(journal.way);
      const [setting] = await sql`SELECT setup_complete FROM settings WHERE id = 1`;
      const [written] = await sql`SELECT EXISTS (SELECT 1 FROM entries) AS any`;
      if (setting?.setup_complete === true || written?.any === true) continue;
      await askNeon('DELETE', `/projects/${encodeURIComponent(journal.project)}`);
      await unplace_journal(journal.host);
      console.log(`[front door] cleared ${journal.host}, made a day ago and never set up`);
    } catch (error) {
      console.error(`[front door] could not clear ${journal.host}:`, error?.message || error);
    }
  }
}
