# Listening Notes

A personal music journal. You listen to a record, you write about it, and it
lives at your own address on the web.

You run your own copy. There is no account here, no subscription, and nothing
of yours is stored on anybody else's server — the journal is yours, the
database is yours, and it is named after you rather than after this software.

**Built with:** Next.js, Neon Postgres, Claude AI (optional)
**Licence:** [AGPL-3.0-or-later](LICENSE) — free to run, including for a business

---

## Run your own copy

**What you need.** Three free accounts, none of which need a card:

| | |
|---|---|
| [GitHub](https://github.com) | Holds your copy of the code |
| [Vercel](https://vercel.com) | Runs the site |
| [Neon](https://neon.tech) | The Postgres database your writing lives in |

Optionally, an [Anthropic API key](https://console.anthropic.com) if you want
the album research and the listening companion. You pay your own usage; without
it the journal works and those features are simply absent.

**Deploy.**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FListeningNotes%2Flistening-notes&env=DATABASE_URL,SESSION_SECRET,SESSION_PASSWORD&envDescription=Required%20variables%20%E2%80%94%20see%20.env.example&envLink=https%3A%2F%2Fgithub.com%2FListeningNotes%2Flistening-notes%2Fblob%2Fmain%2F.env.example)

**First run.**

1. Create a Neon project. Copy its connection string.
2. Set the environment variables — see [`.env.example`](.env.example) for the
   list and what each one is for. `SESSION_PASSWORD` is what you will type to
   reach the writing side of your own journal.
3. Deploy. The tables build themselves on first start — see
   [`migrations/`](migrations). You do not need to open a SQL editor.

> **There is no welcome screen yet**, so a fresh copy has its tables but no
> owner row and no settings until you write in it. That one is still on the
> Pending list in [NOTES.md](NOTES.md).

**Naming your copy.** Every copy is named after whoever keeps it, so yours is
not called Listening Notes and should not be. The name comes from `keeper_name`
in the `settings` table; the mark stays as a colophon, the way a press mark sits
in the back of a book.

---

## How to Think About This Codebase

Think of it like a house.

- The **library** is the systems behind the walls — plumbing, electrical, wifi. You don't see it but everything depends on it. All the real logic lives here.
- The **components** are the furniture — the things you can see and interact with. Each piece of furniture is its own file.
- The **pages** are the rooms — they just arrange the furniture. A page file should be short because it's just saying "put this piece of furniture here, and this one here."
- The **API routes** are the front doors — when the site needs data (like loading entries, or saving a new one), it knocks on a door. The door answers, goes to the library to get what's needed, and hands it back.

---

## The Two Sides of the Site

**Public side** — what anyone visiting the site can see:
- The homepage with the listening beacon and album strip
- Individual entry pages where people can read your notes and leave comments
- `/archive` — every entry, searchable and filterable
- `/key` — what the stars and the three marks mean
- `/submit` — send the keeper an album
- `/compare` — read another journal's feed and compare taste
- `/shuffle` — redirect to a random entry

There is no `/about` route. The identity card on the landing page *is* the
about page; `/about` and `/rig` stay only as redirects, so old links land
somewhere.

**Private side** — only you can access this (password protected, never linked publicly):
- `/dashboard` — the hub with four buttons: Listen, Entries, Inbox, Share
- `/dashboard/echo` — album search powered by Echo's network animation
- `/dashboard/echo/session` — the note-taking tool (6-step flow)
- `/dashboard/entries` — edit and delete entries
- `/dashboard/submissions` — review submitted albums

---

## Where Everything Lives

The library — logic, no visuals
  library/
    database_connection.js     Opens the connection to the database
    database_actions.js        Everything to do with saving and loading entries
    comment_actions.js         Everything to do with comments
    slug_generator.js          Turns "Pet Sounds" into "pet-sounds" for the URL
    entry_formatter.js         Parses entry data so it can be displayed correctly
    sitewide_visuals.js        All colors and fonts — change here, changes everywhere
    session_styles.js          Style helpers scoped to the session panel (tx, bdr, lbl)
    ai_integration.js          The Claude AI calls: research, format, echo
    music_data_api.js          Fetches album art and tracklists from iTunes and MusicBrainz
    session_timers.js          Track length display, session timer, loading phrases
    wristband.js               Session auth — issues and checks the JWT cookie

The front doors — receive requests, hand them off, send back responses
  app/api/
    entries/route.js           Load all entries / save a new one
    entries/[slug]/route.js    Load, edit, or delete one specific entry
    comments/route.js          Load or submit comments
    comments/upvote/route.js   Upvote a comment
    research/route.js          Ask Claude to research an album
    format/route.js            Ask Claude to format your notes
    echo/route.js              Echo AI — research briefing, chat, reflection

The hooks — reusable logic shared across pages
  hooks/
    useListeningBeacon.js      Checks Last.fm every 15 seconds for what's playing
    useAlbumSelection.js       Artist search, EchoNetwork animation, album grid, card phases
    useListeningSession.js     All session state — research, notes, chat, formatting, saving

The furniture — visual pieces
  components/
    EchoNetwork.js             Canvas animation — floating nodes that become album art
    EchoOrb.js                 Compact orb, pulsing mood indicator during a session
    main_components/           Everything on the public side
      SiteNav.js               The navigation row — logo, links, live dot
      DotNav.js                The dot row of section links
      ListeningBeacon.js       The big beacon section on the homepage
      AlbumStrip.js            The scrolling row of albums
      AlbumPreview.js          A single album tile in the strip
      IdentityCard.js          The identity card — this is the About page
      IdentificationCardEditor.js  Editing the card in place
      FlipTile.js              The two-faced tile the cover turns over on
      Bookplate.js             Context holding the journal's own details
      EntryModal.js            The popup when you click an album
      StarRating.js            The star display (read only)
      HorizonChart.js          The listening-shape bar chart
      GridDensity.js           Archive tile sizing
      Lightswitch.js           Manages light and dark mode
      entry_modal/
        HorizonGenerator.js    The bar chart inside the modal
        StickyHeader.js        The compact info bar that appears when you scroll
      Slug_Page/
        CommentThread.js       A single comment and its replies
        CommentBubble.js       One comment, drawn
        NewCommentForm.js      The form to leave a comment
        TrackThread.js         A track row that expands to show notes and comments
        HorizonBar.js          The bar chart on the full entry page
        MetadataLabel.js       The small uppercase section labels
        Chip.js                The small pill tags (Favorite, Masterpiece, etc)
    session_components/        Everything in the private dashboard
      PasswordGate.js          The password screen
      SessionButton.js         Frosted pill button used throughout the session panel
      StarRating.js            The interactive stars you click to rate
      steps/
        PreListenQuestionnaire.js  Two questions before research fires (relationship + source)
        AlbumDebrief.js        Step 0 — Echo narrative + research sections
        TrackNotes.js          Step 1 — expandable track list with per-track notes
        AlbumNotes.js          Step 2 — star rating, Masterpiece/Favorite, free-text notes
        ReflectChat.js         Step 3 — Echo reflection chat with quick prompts
        ScoreScreen.js         Step 4 — the score, once the notes are in
        SessionPreview.js      Step 5 — formatted preview with save button
      backgrounds/             9 animated canvas scenes for the dashboard hub
        Rain.js / DVD.js / Gallery.js / Fizzy.js / SplitScreen.js
        Snake.js / Pong.js / Solitaire.js / Reel.js
        index.js               Exports all backgrounds as an array

The rooms — full pages assembled from furniture
  app/
    page.js                    Homepage
    layout.js                  Wraps every page (fonts, theme)
    globals.css                All the styling
    manifest.js                PWA manifest — force-dynamic, so the name is not baked in
    feed.xml/route.js          The journal as an RSS feed
    entries/[slug]/
      page.js                  Loads the entry, hands it to FullPostPage
      FullPostPage.js          The full public entry page with comments
    archive/page.js            Every entry — search, sort, filters
    key/page.js                What the stars and the three marks mean
    submit/page.js             Send the keeper an album
    compare/page.js            Read another journal's feed, compare taste
    shuffle/page.js            Redirect to a random entry
    why/page.js                The keeper's long note. 404s when unwritten
    about/page.js              Redirect to / — the identity card is the about page
    rig/page.js                Redirect to / — the rig lives on the card
    dashboard/
      page.js                  Hub — 4 buttons (Listen, Entries, Inbox, Share)
      echo/
        page.js                Album search — EchoNetwork + artist search + album grid
        session/page.js        The note-taking session — 6-step flow, sidebar, frosted panel
      entries/page.js          Private entry management (edit, delete)
      submissions/page.js      Submission inbox (pending / reviewed / dismissed)
      inbox/page.js            Comments and submissions in one place
      share/page.js            Album exporter — slides for sharing an entry

---

## When You Want to Change Something

| What you want to change | File to open |
|------------------------|-------------|
| The site's colors | library/sitewide_visuals.js |
| The site's fonts | library/sitewide_visuals.js |
| What Claude says during research | library/ai_integration.js, research_album |
| How Claude formats your notes | library/ai_integration.js, format_post |
| How Echo talks to you | library/ai_integration.js, ask_echo |
| The loading screen phrases | library/session_timers.js, LOADING_PHRASES |
| The navigation links | components/main_components/SiteNav.js and DotNav.js |
| The homepage listening beacon | components/main_components/ListeningBeacon.js |
| The scrolling album strip | components/main_components/AlbumStrip.js |
| The modal that pops up when you click an album | components/main_components/EntryModal.js |
| The full entry post page | app/entries/[slug]/FullPostPage.js |
| The album search page | app/dashboard/echo/page.js |
| The note-taking session | app/dashboard/echo/session/page.js |
| The session steps (debrief, tracks, notes etc.) | components/session_components/steps/ |
| The entries management page | app/dashboard/entries/page.js |

---

## When Something Breaks

| What went wrong | File to open |
|----------------|-------------|
| Entries not loading on the homepage | library/database_actions.js |
| Can't save a new entry | library/database_actions.js, look for save_new_entry |
| Album research not coming back | library/ai_integration.js, look for research_album |
| Notes not formatting correctly | library/ai_integration.js, look for format_post |
| Echo AI chat not responding | library/ai_integration.js, look for ask_echo |
| Album art not loading | library/music_data_api.js |
| Tracklist not showing | library/music_data_api.js, look for fetchTracklist |
| The modal looks broken | components/main_components/EntryModal.js |
| Stars not showing correctly | components/main_components/StarRating.js |
| The horizon bar is broken | components/main_components/entry_modal/HorizonGenerator.js |
| The full entry page is broken | app/entries/[slug]/FullPostPage.js |
| Comments not loading | library/comment_actions.js |
| The album search is broken | app/dashboard/echo/page.js + hooks/useAlbumSelection.js |
| The session tool is broken | app/dashboard/echo/session/page.js + hooks/useListeningSession.js |
| A specific session step is broken | components/session_components/steps/ |
| The listening beacon is broken | hooks/useListeningBeacon.js |
| Colors or fonts are wrong everywhere | library/sitewide_visuals.js |

---

## Colors and Fonts

Two files, and they are the source — no list is kept here, because the list
that used to be here spent months claiming the accent was green and the
headings were set in a serif, and neither had been true for a long time.

- **`library/sitewide_visuals.js`** — `colors_light` and `colors_dark`, plus
  the `fonts` object. Both themes are defined in full, side by side.
- **`app/globals.css`** — the same palette as custom properties (`--bg`,
  `--ink`, `--accent`, `--panel`), which is what most components actually read.

Change a value in both and it updates everywhere.

**Two typefaces, deliberately.** Nunito does the body text *and* the titles —
titles are Nunito bold via `--font-display`, not a display face — and DM Mono
sets labels and small caps. A serif was the title face for a while and was
removed; do not reintroduce one.

---

## The Database

One database (Neon Postgres). [`migrations/`](migrations) is the whole of it and
is generated from a live catalogue, so it describes what actually exists rather
than what anyone remembers building.

| Table | What it holds |
|---|---|
| `entries` | The journal. One row per listen — an album listened to twice is two entries, never an overwrite. |
| `settings` | Everything that makes a copy someone's own: the keeper, the portrait, the links, the rig. Exactly one row, forced by a check on `id`. |
| `users` | The owner. One row, written at setup. |
| `comments` | Replies on entries and on individual tracks, with a moderation queue. |
| `submissions` | Albums other people have sent you. |
| `drafts` | A listening session in progress, so closing the tab does not lose it. |
| `briefings` | Cached album research, keyed by album, so the same record is not paid for twice. |
| `conversations` | Session chat history with the listening companion. |
| `echo_memory` | Long-term companion memory. Defined, not yet used by anything. |

Two columns on `entries` are computed by Postgres and cannot be written to:
`rating_value` (the numeric score, so sorting works) and `album_key` (a
normalised album+artist string, which is how two journals recognise the same
record through different punctuation).

**Migrations are additive only, once anyone else is running a copy** — add
columns and tables, never rename or drop one. Copies of this software are
databases on machines nobody here can reach, and a migration that fails is
somebody's journal that stops opening.

Until that first install, the database is a draft owned by one person and
cleanup is fine. The repo being public does not start the clock; somebody
installing from it does.

---

## Keeping a copy of your journal

Two ways, because they answer different questions.

**A button — `/api/export`.** Signed in on the writing side, this downloads
your whole journal as one JSON file: every entry, every note, the settings, the
comments. No setup, nothing to configure, works on any copy of this software.
It is owner-only — it hands over unpublished drafts, comments still in
moderation, and the email addresses people left with submissions.

**A schedule, if you want one.** The repo ships two scripts:

```bash
npm run backup
```

Writes every table to `$BACKUP_DIR/<timestamp>/` with a copy of `migrations/`
beside it, keeps the last 30 and prunes the rest. `BACKUP_DIR` defaults to
`~/listening-notes-backups`; point it at a synced folder — an iCloud Drive
directory, say — and your backups stop living on the same machine as the thing
they protect. See [`.env.example`](.env.example).

To run it nightly, put it behind whatever your system uses for scheduled jobs:
a `launchd` agent on macOS, a cron entry or systemd timer on Linux. Be aware
that a laptop asleep at the scheduled hour runs the job on its next wake, so
"nightly" really means "once per day the machine is awake."

```bash
npm run restore -- <path-to-a-backup>
```

Prints what it would do and changes nothing. Add `--yes` to actually restore,
which **empties every table first** — it is a restore, not a merge. It reads a
downloaded export file just as happily as a backup folder.

Practise on a Neon branch before you ever need it for real. Branches are free
and instant, and a restore you have never run is a hope rather than a plan:

```bash
DATABASE_URL='postgres://...branch...' npm run restore -- <backup> --yes
```

> **Neon's own history is short** — six hours on the free plan. That covers the
> mistake you notice straight away and nothing else. Take your own snapshot
> before you touch the schema.

---

## Secret Keys

**[`.env.example`](.env.example) is the list**, with what each variable is for
and where to get it. Copy it to `.env.local` and fill it in; `.env.local` is
gitignored and never leaves your machine. On Vercel the same values go in
Project → Settings → Environment Variables.

It is deliberately the only place these are written down. A second copy of the
list in this file is a second copy to keep current, and the one that went stale
first was this one.

Two worth knowing without opening the file:

- `SESSION_SECRET` — it signs the login cookie, so changing it signs you out of
  your own journal on every device and you log in again with the same password.
  Disruptive, not dangerous. Don't rotate it casually; do rotate it if you think
  it leaked.
- `ANTHROPIC_API_KEY` — bills to your Console **API credit balance**, which is
  a separate pool from a Claude.ai subscription. See the gotchas in
  [NOTES.md](NOTES.md).

---

## A Note on Writing Code in This Project

- Edit JavaScript files directly in VS Code
- For .env.local use the terminal, not VS Code (VS Code silently fails to save it)
- When writing Python scripts that contain JavaScript with backticks, write to a temp file first, never use heredoc
- Always commit after something is working and tested
- git restore filename will undo changes to a single file if something goes wrong. Think of it like a checkpoint.

---

## Licence

Listening Notes is free software, released under the **GNU Affero General Public
License, version 3 or later**. The full text is in [LICENSE](LICENSE), and every
source file opens with two lines:

```js
// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
```

Who holds the copyright, and what the licence is. Both, because a file copied
out of this repo has to still say both — the SPDX line alone would say what
somebody may do with it and not who they would be doing it to.

The notice below is the one the licence's own "How to Apply These Terms"
appendix asks to be attached to the program. Putting it in a README is
convention rather than what the appendix says — the appendix asks for it at the
start of each source file, which is what the SPDX line stands in for here.

    Copyright (C) 2026 Miyel Brown

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published
    by the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.

**What this means in practice.** Anyone may run a copy, for anything, including
a business — a bar playing records off its own copy owes nothing and asks
nobody. Anyone may change it. The one condition is reciprocity: if you give
your modified version to other people *or run it as a service they can reach
over a network*, they are entitled to your source. That last clause is section
13, and it is the whole reason this licence rather than the plain GPL — a
journal is a website, so "distributing" it mostly means hosting it.

The practical effect is that a closed commercial fork is not possible. A copy
stays a copy.

**Warranty.** There is none. The software is provided as-is; see sections 15
through 17 of the licence. Nobody who runs a copy has any claim against whoever
wrote it if it loses their writing, and that protection is the second reason
this file exists.

**Contributing.** See [CONTRIBUTING.md](CONTRIBUTING.md). Changes are signed off
under the [Developer Certificate of Origin](DCO) — one `git commit -s` per
commit. This matters more than it looks: a contributor owns the copyright in
their own lines, so from the first merged change onward the licence can no
longer be changed by one person deciding to change it. The sign-off records the
chain while it is still cheap to record.

**The name is not the code.** The licence covers the software. It does not
grant use of the Listening Notes name or mark to identify *your* journal — see
the note on copies in the docs. Every copy is named by whoever keeps it. The
mark travels with the software as a colophon, the way a press mark sits in the
back of a book, and that is the only use it has in a copy.
