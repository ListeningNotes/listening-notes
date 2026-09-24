// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// library/install_guide.js
// What /get needs: the deploy address, and the ten steps.
//
// The deploy button is the same URL the README carries. Neon's own
// marketplace template uses this `products` parameter rather than
// `integration-ids`: it attaches a Neon database to the new project and sets
// DATABASE_URL, so the deploy asks for nothing.
//
// The steps are here and not in the component that draws them because the
// page checks on the server which screenshots exist, and reads the list to
// do it. Plain data in a plain module.

export const DEPLOY_URL =
  'https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FListeningNotes%2Flistening-notes&products=%5B%7B%22type%22%3A%22integration%22%2C%22integrationSlug%22%3A%22neon%22%2C%22productSlug%22%3A%22neon%22%2C%22protocol%22%3A%22storage%22%7D%5D';

// `shot` is the filename in public/install/, minus the .png. The number is
// the step number, so the folder reads in order.
//
// One set of steps and one set of pictures, taken on a phone, 2026-09-22.
// There was a phone/laptop switch with a set of each; the people handed this
// page are holding a phone, and apart from the pictures the steps read the
// same on a laptop — the last one included, because the last screen of setup
// shows whichever device it is on.
//
// Ten since 2026-09-23: the accounts come first. A new account's sign-up —
// GitHub's, or Vercel's through GitHub — ends on that site's own home page
// and never back on the deploy link, so somebody making one inside the flow
// was dropped out of it and had to find their way back to press the button
// again; Miyel walked every beta tester through exactly that. No free host
// avoids it (every one needs an account somewhere to keep the code), so the
// accounts are made first, each in a tab of its own, and the flow after them
// goes straight through. Step three stays for whoever arrives signed out.
//
// Nine, not seven, before that. The brief listed seven and skipped the Neon panel, which
// the fresh-account run of 2026-09-02 says does appear — with an "Auth"
// toggle on by default that has to go off. These steps are written from that
// run, from the README's first-run notes and from DECISIONS, not from the
// brief's summary of them. Detailed on purpose: the person reading is alone
// at a screen nobody here can see.
//
// The second says where the button is, because it is at the foot of the page
// rather than beside the step (see app/get/page.js). `links` are a step's own
// doors, each opened in a new tab so this page stays put.
//
// `rings` are where to press, drawn over the picture by the page: left, top,
// width and height, as percentages of it. The pictures are cropped from
// Miyel's install of 2026-09-23, and the rings were measured on them — move
// one only against the picture it sits on.
export const STEPS = [
  { shot: '01-accounts', head: 'Make two free accounts',
    text: 'GitHub keeps your journal’s code, and Vercel runs it. Make GitHub first, then sign up to Vercel with Continue with GitHub. Already have both? Go on to step 2.',
    links: [
      { label: 'GitHub', href: 'https://github.com/signup' },
      { label: 'Vercel', href: 'https://vercel.com/signup' },
    ],
    rings: [[5.4, 42.8, 88.5, 7.7]] },
  { shot: '02-button', head: 'Press the button at the foot of this page',
    text: 'It opens Vercel in a new tab, and this page stays open behind it.' },
  { shot: '03-github', head: 'Continue with GitHub',
    text: 'Only if Vercel asks you to sign in — use the account you just made.' },
  { shot: '04-connect', head: 'Let Vercel connect',
    text: 'The permissions look serious. It needs them to build your site and nothing else.' },
  { shot: '05-name', head: 'Name it',
    text: '“Git Scope” is your GitHub account. “Private Repository Name” is any name you like — it becomes the first guess at your web address.',
    rings: [[4.9, 59.1, 90.3, 8.1], [4.9, 90.5, 90.3, 7.8]] },
  { shot: '06-neon', head: 'Add the database',
    text: 'Press Add on the Neon row. Pick the region nearest you, switch Auth off, keep Free, then Create. No card needed. Then press Deploy.',
    rings: [[76.4, 17.6, 14.7, 12.3], [12.2, 74.5, 12, 10.2]] },
  { shot: '07-build', head: 'Wait for it to build',
    text: 'Nothing to paste. When Vercel says Congratulations, press the picture of your site.',
    rings: [[4.9, 30.4, 90.2, 67.7]] },
  { shot: '08-holding', head: 'Press “Set it up”',
    text: 'It works for half an hour after the build. Came back later? Press Redeploy in Vercel and try again.' },
  { shot: '09-setup', head: 'Claim it',
    text: 'Your name, then a password. Everything in between you can skip and fill in later.' },
  { shot: '10-homescreen', head: 'Add it to your home screen',
    text: 'This is the part that makes it feel like an app. The last screen during setup will show you how.' },
];
