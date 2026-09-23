// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// library/install_guide.js
// What /get needs: the deploy address, and the nine steps.
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
// Nine, not seven. The brief listed seven and skipped the Neon panel, which
// the fresh-account run of 2026-09-02 says does appear — with an "Auth"
// toggle on by default that has to go off. These steps are written from that
// run, from the README's first-run notes and from DECISIONS, not from the
// brief's summary of them. Detailed on purpose: the person reading is alone
// at a screen nobody here can see.
//
// The first says where the button is, because it is at the foot of the page
// rather than beside the step (see app/get/page.js).
export const STEPS = [
  { shot: '01-button', head: 'Press the button at the foot of this page',
    text: 'It opens Vercel, which is what will run your journal.' },
  { shot: '02-github', head: 'Continue with GitHub',
    text: 'Make an account if you don’t have one. This is where your copy of the code lives.' },
  { shot: '03-connect', head: 'Let Vercel connect',
    text: 'The permissions look serious. It needs them to build your site and nothing else.' },
  { shot: '04-name', head: 'Name it',
    text: '“Git Scope” is your GitHub account. “Private Repository Name” is any name you like — it becomes the first guess at your web address.' },
  { shot: '05-neon', head: 'Add the database',
    text: 'Press Add on the Neon row. Pick the region nearest you, switch Auth off, keep Free, then Create. No card needed. Then press Deploy.' },
  { shot: '06-build', head: 'Wait for it to build',
    text: 'Nothing to paste. When Vercel says Congratulations, press the picture of your site.' },
  { shot: '07-holding', head: 'Press “Set it up”',
    text: 'It works for half an hour after the build. Came back later? Press Redeploy in Vercel and try again.' },
  { shot: '08-setup', head: 'Claim it',
    text: 'Your name, then a password. Everything in between you can skip and fill in later.' },
  { shot: '09-homescreen', head: 'Add it to your home screen',
    text: 'This is the part that makes it feel like an app. The last screen during setup will show you how.' },
];
