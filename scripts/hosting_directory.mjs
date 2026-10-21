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
//   npm run hosting-directory -- move <address> [--yes]
//       Brings a journal that already has a database onto this deployment,
//       at a new address — Miyel's first, from www.listeningnotes.blog to
//       her own name under the domain (her name for the command,
//       2026-10-20). The way in is read off the clipboard, as for place. Without --yes it says what
//       it found and what it would do, and changes nothing. With --yes it
//       places the journal, writes its new address into it, moves its
//       listing on the Board with it when it keeps the Board itself, and
//       clears its card's code, which the card presses again for the new
//       address the first time its keeper opens it. It refuses a journal
//       that would have no way back in at the new address: a password kept
//       in the deployment's settings is never read by one that hosts
//       journals, and Face ID belongs to the old address.
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

// What a journal holds that a move has to know about. Reads, never writes.
async function lookAt(way) {
  const sql = neon(way);
  const maybe = async (query, fallback) => { try { return await query; } catch { return fallback; } };
  const [settings] = await sql`
    SELECT keeper_name, site_address, setup_complete, listing_code IS NOT NULL AS listed
    FROM settings WHERE id = 1`;
  const [vault] = await maybe(sql`
    SELECT password_hash IS NOT NULL AS password, spare_key_hash IS NOT NULL AS spare,
           anthropic_key IS NOT NULL AS ai_key
    FROM secrets WHERE id = 1`, []);
  const keys = await maybe(sql`SELECT made_for FROM keyring`, []);
  const [entries] = await sql`SELECT count(*)::int AS n FROM entries`;
  const [board] = await sql`SELECT to_regclass('public.directory') IS NOT NULL AS kept`;
  return { settings: settings || {}, vault: vault || {}, keys, entries: entries.n, keepsTheBoard: board.kept };
}

// The same database, whichever of its two doors a way in names.
const sameDatabase = (a, b) => {
  const door = way => { const u = new URL(way); u.hostname = u.hostname.replace('-pooler.', '.'); u.search = ''; return u.toString(); };
  try { return door(a) === door(b); } catch { return false; }
};

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
} else if (what === 'move') {
  if (!address) fail('Where to? npm run hosting-directory -- move name.listeningnotes.blog');
  const yes = process.argv.includes('--yes');
  readyTheDirectory();
  const way = clipboard();
  if (!looksLikeAWayIn(way)) fail('The clipboard does not hold a connection string. Copy the journal\'s from Neon first.');
  const { tidyHost, journalAt, place_journal } = await import('../library/hosting_directory.js');
  const { tidyJournal } = await import('../library/return_address.js');
  const to = tidyHost(address);

  let found;
  try {
    found = await lookAt(way);
  } catch (error) {
    fail(`That way in does not open a journal (${error?.message || error}). Nothing changed.`);
  }
  const { settings, vault, keys, entries, keepsTheBoard } = found;
  const from = tidyJournal(settings.site_address);
  const whose = settings.keeper_name ? `${settings.keeper_name}'s journal` : 'A journal nobody has named';
  if (settings.setup_complete !== true) fail(`${whose} was never set up, so there is nothing to move. Nothing changed.`);
  const already = await journalAt(to);
  if (already && !sameDatabase(already.way, way)) fail(`Another journal is already at ${to}. Nothing changed.`);
  if (from === to && already) {
    console.log(`${whose} is already at ${to}. Nothing changed.`);
    process.exit(0);
  }
  if (!vault.password && !vault.spare) {
    fail([
      `${whose} keeps no password and no spare key of its own, so nobody could sign in at ${to}:`,
      'a password in the deployment\'s settings is never read by one that hosts journals.',
      'Choose a password in Settings → Your keys, or make a spare key there, then move it. Nothing changed.',
    ].join('\n'));
  }

  const oldKeys = keys.filter(key => tidyHost(key.made_for) !== to).length;
  const listed = keepsTheBoard && from
    ? (await neon(way)`SELECT 1 FROM directory WHERE address = ${from}`).length > 0
    : false;
  console.log(`${whose}, ${entries} ${entries === 1 ? 'entry' : 'entries'}, at ${from || 'no address yet'}.`);
  console.log(`Moving it to ${to}:`);
  console.log(`  - It opens there with its ${vault.password ? 'password' : 'spare key'}.`);
  if (oldKeys) console.log(`  - Its ${oldKeys} Face ID ${oldKeys === 1 ? 'key belongs' : 'keys belong'} to the old address; add one again in Settings → Your keys once signed in.`);
  if (!vault.ai_key) console.log('  - It keeps no AI key of its own. If it used one from the deployment\'s settings, type it into Settings after the move.');
  if (listed) console.log('  - Its listing on the Board moves with it.');
  else if (settings.listed) console.log('  - It lists itself on the Board again, at the new address, the next time its keeper opens it.');
  console.log('  - Its card\'s code is pressed again for the new address the first time its keeper opens it.');
  if (from && from !== to) console.log(`  - Links to ${from} go on working while something there sends them on. FORWARDING_ADDRESS does, for the front door's www.: every page but its home and /get, which are the front door's.`);
  if (!yes) {
    console.log(`\nNothing has changed. To move it: npm run hosting-directory -- move ${to} --yes`);
    process.exit(0);
  }

  // The directory first: until the journal calls itself by its new address,
  // nothing anybody reads has changed, and a move stopped halfway is begun
  // again by running it again.
  try {
    if (!already) await place_journal(to, way, { fresh: true });
  } catch (error) {
    fail(`${error?.message || error} Nothing changed.`);
  }
  const sql = neon(way);
  await sql.transaction([
    sql`UPDATE settings SET site_address = ${to}, portrait_code = '', portrait_code_url = '' WHERE id = 1`,
    ...(listed ? [
      sql`DELETE FROM directory_records WHERE address = ${to}`,
      sql`DELETE FROM directory WHERE address = ${to}`,
      sql`UPDATE directory_records SET address = ${to} WHERE address = ${from}`,
      sql`UPDATE directory SET address = ${to} WHERE address = ${from}`,
    ] : settings.listed ? [sql`UPDATE settings SET listing_code = NULL WHERE id = 1`] : []),
  ]);
  console.log(`\nMoved. ${whose} is at ${to}, and calls itself that.`);
  console.log(`Sign in at https://${to}/login once this deployment hosts journals.`);
} else {
  console.log('key | remember | place <address> | list | check <address> | move <address> [--yes]');
}
