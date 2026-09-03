// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// library/install_guide.js
// What the /get pages share: the two addresses, and the seven steps.
//
// The deploy button is the same URL the README carries. Neon's own
// marketplace template uses this `products` parameter rather than
// `integration-ids`: it attaches a Neon database to the new project and sets
// DATABASE_URL, so the deploy asks for nothing.
//
// The source is where "It didn't work" goes — the issues live beside the
// code. It is an environment variable and never a setting; see DECISIONS.
//
// The steps are here and not in the component that draws them because the
// install page needs them on the server, to check which screenshots exist,
// and a 'use client' file hands a server component references rather than
// values. Plain data in a plain module, read from both sides.

export const DEPLOY_URL =
  'https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FListeningNotes%2Flistening-notes&products=%5B%7B%22type%22%3A%22integration%22%2C%22integrationSlug%22%3A%22neon%22%2C%22productSlug%22%3A%22neon%22%2C%22protocol%22%3A%22storage%22%7D%5D';

export const SOURCE_URL =
  process.env.NEXT_PUBLIC_SOURCE_URL || 'https://github.com/ListeningNotes/listening-notes';

export const DEVICES = ['phone', 'laptop'];

// `shot` is the filename, minus the device folder and the .png. The number is
// the step number, so the folder reads in order. Where a step reads
// differently on a phone than on a laptop the text is keyed by device; where
// it does not, there is one line for both.
//
// Nine, not seven. The brief listed seven and skipped the Neon panel, which
// the fresh-account run of 2026-09-02 says does appear — with an "Auth"
// toggle on by default that has to go off. These steps are written from that
// run, from the README's first-run notes and from DECISIONS, not from the
// brief's summary of them. Detailed on purpose: the person reading is alone
// at a screen nobody here can see.
export const STEPS = [
  { shot: '01-button', head: 'Press the button', time: 'a few seconds',
    text: 'It opens Vercel, which is what will run your journal.' },
  { shot: '02-github', head: 'Continue with GitHub', time: 'two minutes',
    text: 'Make an account if you don’t have one. This is where your copy of the code lives.' },
  { shot: '03-connect', head: 'Let Vercel connect',
    text: 'The permissions look serious. It needs them to build your site and nothing else.' },
  { shot: '04-name', head: 'Name it',
    text: '“Git Scope” is your GitHub account. “Private Repository Name” is any name you like — it becomes the first guess at your web address.' },
  { shot: '05-neon', head: 'Add the database', time: 'a minute',
    text: 'Press Add on the Neon row. Pick the region nearest you, switch Auth off, keep Free, then Create. No card needed. Then press Deploy.' },
  { shot: '06-build', head: 'Wait for it to build', time: 'about two minutes',
    text: 'Nothing to paste. When Vercel says Congratulations, press the picture of your site.' },
  { shot: '07-holding', head: 'Press “Set it up”',
    text: 'It works for half an hour after the build. Came back later? Press Redeploy in Vercel and try again.' },
  { shot: '08-setup', head: 'Claim it', time: 'as long as you like',
    text: 'Your name, then a password. Everything in between you can skip and edit in Settings later.' },
  { shot: '09-homescreen', head: 'Add it to your home screen',
    text: {
      phone: 'This is the part that makes it feel like an app. The last screen during setup will show you how.',
      laptop: 'This is the part that makes it feel like an app. Open your journal on your phone and the last screen during setup will show you how.',
    } },
];
