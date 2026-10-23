#!/usr/bin/env node
// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// scripts/letterhead.mjs
// Seals an LN. Admin letter and posts it to the journals it concerns
// (library/letterhead.js; Miyel's name, 2026-10-20). Run by hand by the
// canonical keeper, on her Mac; nothing runs it on a timer, and nothing in a
// journal asks for it.
//
//   npm run letterhead -- keys
//       Makes the key the first time and keeps its private half in this
//       Mac's Keychain (the item "ln-letterhead"), then prints the public
//       half — the one that belongs in library/letterhead.js. The private
//       half is never printed and never leaves the Keychain except to seal.
//
//   npm run letterhead -- send <journal> [<journal> …] --said "Words."
//       Seals the words for each journal, named inside the seal so it opens
//       on that journal only, and posts them to its messages route. Says
//       for each whether it was kept, in the journal's own words when not.
//       --via <url> posts to another address while sealing for <journal>,
//       for a test server standing in for it.
//
//   npm run letterhead -- prompt <journal> [<journal> …] --said "…"
//       --month "November" --until YYYY-MM-DD
//       Seals the month's prompt for each journal and posts it to its
//       prompt route, pinned over the keeper's wall until it closes
//       (2026-10-22, the blog's first piece). --via as for send.
//
// Off a Mac — a fork's keeper — the private half can come from
// LETTERHEAD_PRIVATE_KEY instead, as base64 PKCS#8.

import { execFileSync } from 'node:child_process';
import { createPrivateKey, createPublicKey, generateKeyPairSync, randomUUID, sign } from 'node:crypto';
import { userInfo } from 'node:os';

const ITEM = 'ln-letterhead';
const ACCOUNT = userInfo().username;

// The same bytes library/letterhead.js checks: a line naming what this is,
// then the four things a letter says, in this order.
function sealed(letter) {
  return Buffer.from(
    `ln-letterhead-1\n${JSON.stringify([letter.to, letter.said, letter.sent_at, letter.id])}`,
    'utf8',
  );
}

function fromKeychain() {
  try {
    return execFileSync('security', ['find-generic-password', '-s', ITEM, '-a', ACCOUNT, '-w'], {
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
}

function privateKey() {
  const kept = process.env.LETTERHEAD_PRIVATE_KEY || fromKeychain();
  if (!kept) return null;
  return createPrivateKey({ key: Buffer.from(kept, 'base64'), format: 'der', type: 'pkcs8' });
}

const publicHalf = key => createPublicKey(key).export({ format: 'jwk' }).x;

// The host a journal is reached at, the way the journal itself is named.
function hostOf(journal) {
  const value = String(journal || '').trim();
  try { return new URL(value.includes('://') ? value : `https://${value}`).host.toLowerCase(); } catch { return ''; }
}

function keys() {
  let key = privateKey();
  if (!key) {
    if (process.platform !== 'darwin') {
      console.error('No key. Off a Mac, make one and put its private half in LETTERHEAD_PRIVATE_KEY.');
      process.exit(1);
    }
    const made = generateKeyPairSync('ed25519');
    const der = made.privateKey.export({ format: 'der', type: 'pkcs8' }).toString('base64');
    execFileSync('security', ['add-generic-password', '-s', ITEM, '-a', ACCOUNT, '-l', 'LN. Admin letterhead', '-w', der], {
      stdio: 'ignore',
    });
    key = made.privateKey;
    console.log(`Made a key and kept its private half in this Mac's Keychain, as "${ITEM}".`);
  } else {
    console.log('A key is already kept here.');
  }
  console.log(`\nIts public half, for library/letterhead.js:\n\n  ${publicHalf(key)}\n`);
}

async function send(args) {
  const at = args.indexOf('--said');
  const said = at >= 0 ? String(args[at + 1] || '').trim() : '';
  const viaAt = args.indexOf('--via');
  const via = viaAt >= 0 ? String(args[viaAt + 1] || '').replace(/\/+$/, '') : '';
  const skip = new Set([at, at + 1, viaAt, viaAt + 1].filter(i => i >= 0));
  const journals = args.filter((_, i) => !skip.has(i)).map(hostOf).filter(Boolean);
  if (!said || !journals.length) {
    console.error('npm run letterhead -- send <journal> [<journal> …] --said "Words."');
    process.exit(1);
  }
  const key = privateKey();
  if (!key) {
    console.error('There is no key here yet: npm run letterhead -- keys');
    process.exit(1);
  }
  let failed = 0;
  for (const to of journals) {
    const letter = { to, said, sent_at: new Date().toISOString(), id: randomUUID() };
    const seal = sign(null, sealed(letter), key).toString('base64url');
    const door = `${via || `https://${to}`}/api/messages`;
    try {
      const r = await fetch(door, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ letterhead: letter, seal }),
      });
      const answer = await r.json().catch(() => ({}));
      if (r.ok) console.log(`${to}: kept`);
      else { failed++; console.log(`${to}: not kept — ${answer.error || r.status}`); }
    } catch (error) {
      failed++;
      console.log(`${to}: could not be reached — ${error?.cause?.code || error?.message || error}`);
    }
  }
  process.exit(failed ? 1 : 0);
}

// ── The month's prompt, 2026-10-22 ────────────────────────────────────────
// The same bytes library/letterhead.js checks (sealed_prompt): a line naming
// what this is, then what a prompt says, in this order.
function sealedPrompt(prompt) {
  return Buffer.from(
    `ln-prompt-1\n${JSON.stringify([prompt.to, prompt.said, prompt.month, prompt.ends_at, prompt.sent_at, prompt.id])}`,
    'utf8',
  );
}

// Seals the month's prompt for each journal and posts it to its prompt
// route, where it is pinned over the keeper's wall until it closes:
//   npm run letterhead -- prompt <journal> [<journal> …] --said "What was the
//     first record you ever owned?" --month "November" --until 2026-11-30
// --until is the last day records are taken, through the end of that day
// (UTC); --via as for send. One id for the whole round, so the publication
// can tell which prompt each record was sent for.
async function prompt(args) {
  const read = flag => {
    const at = args.indexOf(flag);
    return at >= 0 ? String(args[at + 1] || '').trim() : '';
  };
  const said = read('--said');
  const month = read('--month');
  const until = read('--until');
  const via = read('--via').replace(/\/+$/, '');
  const flags = new Set(['--said', '--month', '--until', '--via']);
  const skip = new Set();
  args.forEach((a, i) => { if (flags.has(a)) { skip.add(i); skip.add(i + 1); } });
  const journals = args.filter((_, i) => !skip.has(i)).map(hostOf).filter(Boolean);
  const ends = /^\d{4}-\d{2}-\d{2}$/.test(until) ? new Date(`${until}T23:59:59.999Z`) : null;
  if (!said || !month || !ends || !journals.length) {
    console.error('npm run letterhead -- prompt <journal> [<journal> …] --said "The prompt." --month "November" --until YYYY-MM-DD');
    process.exit(1);
  }
  if (ends.getTime() <= Date.now()) {
    console.error(`--until ${until} has already passed.`);
    process.exit(1);
  }
  const key = privateKey();
  if (!key) {
    console.error('There is no key here yet: npm run letterhead -- keys');
    process.exit(1);
  }
  const id = randomUUID();
  let failed = 0;
  for (const to of journals) {
    const sent = { to, said, month, ends_at: ends.toISOString(), sent_at: new Date().toISOString(), id };
    const seal = sign(null, sealedPrompt(sent), key).toString('base64url');
    const door = `${via || `https://${to}`}/api/prompt`;
    try {
      const r = await fetch(door, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: sent, seal }),
      });
      const answer = await r.json().catch(() => ({}));
      if (r.ok) console.log(`${to}: pinned`);
      else if (r.status === 404 && !answer.error) { failed++; console.log(`${to}: not pinned — its copy is too old to take a prompt`); }
      else { failed++; console.log(`${to}: not pinned — ${answer.error || r.status}`); }
    } catch (error) {
      failed++;
      console.log(`${to}: could not be reached — ${error?.cause?.code || error?.message || error}`);
    }
  }
  process.exit(failed ? 1 : 0);
}

const [what, ...rest] = process.argv.slice(2);
if (what === 'keys') keys();
else if (what === 'send') await send(rest);
else if (what === 'prompt') await prompt(rest);
else {
  console.log('npm run letterhead -- keys');
  console.log('npm run letterhead -- send <journal> [<journal> …] --said "Words."');
  console.log('npm run letterhead -- prompt <journal> [<journal> …] --said "The prompt." --month "November" --until YYYY-MM-DD');
}
