#!/usr/bin/env node
// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// scripts/hosting_directory.mjs
// The hosting directory, by hand (library/hosting_directory.js; Miyel's
// name, 2026-10-20 — the library and its hand tool share one, like the
// letterhead). Run on the canonical keeper's Mac until signup places
// journals itself (step 4); nothing runs it on a timer.
//
//   npm run hosting-directory -- key
//       Makes the directory's key, once, keeps it in this Mac's Keychain
//       ("ln-hosting-directory-key") and copies it to the clipboard, to be
//       pasted into the deployment's settings as HOSTING_DIRECTORY_KEY.
//       Never printed.
//
//   npm run hosting-directory -- remember
//       Keeps the directory's own way in — copied from Neon first — in the
//       Keychain ("ln-hosting-directory-url"), read off the clipboard, so it
//       is never typed into a terminal or kept in its history.
//
//   npm run hosting-directory -- place <address>
//       Puts a journal at an address. The way into its database is read off
//       the clipboard (copy it from Neon first), checked that it opens, and
//       sealed before it is written. Never printed.
//
//   npm run hosting-directory -- list
//       Every address in the directory and when it arrived. No ways in.
//
//   npm run hosting-directory -- check <address>
//       Opens the journal at an address and says whose it is.
//
// Off a Mac — a fork's keeper — the three come from HOSTING_DIRECTORY_URL,
// HOSTING_DIRECTORY_KEY and, for place, JOURNAL_DATABASE_URL.

import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { userInfo } from 'node:os';
import { neon } from '@neondatabase/serverless';

const URL_ITEM = 'ln-hosting-directory-url';
const KEY_ITEM = 'ln-hosting-directory-key';
const ACCOUNT = userInfo().username;
const mac = process.platform === 'darwin';

function fromKeychain(item) {
  if (!mac) return '';
  try {
    return execFileSync('security', ['find-generic-password', '-s', item, '-a', ACCOUNT, '-w'], {
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
}

function intoKeychain(item, label, value) {
  // -U replaces an item already there rather than failing on it.
  execFileSync('security', ['add-generic-password', '-U', '-s', item, '-a', ACCOUNT, '-l', label, '-w', value], { stdio: 'ignore' });
}

function clipboard() {
  if (process.env.JOURNAL_DATABASE_URL) return process.env.JOURNAL_DATABASE_URL.trim();
  if (!mac) return '';
  return execFileSync('pbpaste', { encoding: 'utf8' }).trim();
}

function toClipboard(value) {
  execFileSync('pbcopy', { input: value });
}

const looksLikeAWayIn = value => /^postgres(ql)?:\/\/\S+$/.test(value);

function fail(said) {
  console.error(said);
  process.exit(1);
}

// The directory's own two, from the environment first and then the
// Keychain, put where library/hosting_directory.js reads them.
function readyTheDirectory() {
  process.env.HOSTING_DIRECTORY_URL ||= fromKeychain(URL_ITEM);
  process.env.HOSTING_DIRECTORY_KEY ||= fromKeychain(KEY_ITEM);
  if (!process.env.HOSTING_DIRECTORY_URL) fail('No way into the directory. Copy its connection string from Neon and run: npm run hosting-directory -- remember');
  if (!process.env.HOSTING_DIRECTORY_KEY) fail('No directory key. Run: npm run hosting-directory -- key');
}

// What is at the end of a way in: whose journal, or nobody's yet.
async function whoseIs(way) {
  const sql = neon(way);
  await sql`SELECT 1`;
  try {
    const [row] = await sql`SELECT keeper_name FROM settings WHERE id = 1`;
    return row?.keeper_name ? `${row.keeper_name}'s journal` : 'a journal nobody has named yet';
  } catch {
    return 'an empty database — a journal not set up yet';
  }
}

const [, , what, address] = process.argv;

if (what === 'key') {
  if (!mac) fail('Off a Mac, make 32 random bytes in base64 and set HOSTING_DIRECTORY_KEY to them.');
  let key = fromKeychain(KEY_ITEM);
  if (!key) {
    key = randomBytes(32).toString('base64');
    intoKeychain(KEY_ITEM, 'Listening Notes hosting directory key', key);
    console.log(`Made the directory's key and kept it in this Mac's Keychain, as "${KEY_ITEM}".`);
  } else {
    console.log(`The directory's key is already in this Mac's Keychain, as "${KEY_ITEM}".`);
  }
  toClipboard(key);
  console.log('It is on the clipboard now. Paste it into the deployment\'s settings as HOSTING_DIRECTORY_KEY.');
} else if (what === 'remember') {
  if (!mac) fail('Off a Mac, set HOSTING_DIRECTORY_URL instead.');
  const way = clipboard();
  if (!looksLikeAWayIn(way)) fail('The clipboard does not hold a connection string. Copy the directory\'s from Neon first.');
  await neon(way)`SELECT 1`;
  intoKeychain(URL_ITEM, 'Listening Notes hosting directory', way);
  console.log(`It opens, and it is kept in this Mac's Keychain, as "${URL_ITEM}".`);
} else if (what === 'place') {
  if (!address) fail('Which address? npm run hosting-directory -- place name.listeningnotes.blog');
  readyTheDirectory();
  const way = clipboard();
  if (!looksLikeAWayIn(way)) fail('The clipboard does not hold a connection string. Copy the journal\'s from Neon first.');
  let whose;
  try {
    whose = await whoseIs(way);
  } catch (error) {
    fail(`That way in does not open (${error?.message || error}). Nothing was placed.`);
  }
  const { place_journal } = await import('../library/hosting_directory.js');
  try {
    console.log(`Placed ${whose} at ${await place_journal(address, way)}.`);
  } catch (error) {
    fail(`${error?.message || error} Nothing was placed.`);
  }
} else if (what === 'list') {
  readyTheDirectory();
  const { list_journals } = await import('../library/hosting_directory.js');
  const rows = await list_journals();
  if (!rows.length) console.log('Nobody is in the directory yet.');
  for (const row of rows) console.log(`  ${row.host}   since ${new Date(row.placed_at).toISOString().slice(0, 10)}`);
} else if (what === 'check') {
  if (!address) fail('Which address?');
  readyTheDirectory();
  const { journalAt } = await import('../library/hosting_directory.js');
  const journal = await journalAt(address);
  if (!journal) fail(`Nobody is at ${address}.`);
  console.log(`${journal.host} opens ${await whoseIs(journal.way)}.`);
} else {
  console.log('key | remember | place <address> | list | check <address>');
}
