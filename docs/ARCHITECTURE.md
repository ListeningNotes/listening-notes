# Architecture

How this codebase is put together, and where to look when you want to change
something. If you are here to run a copy rather than work on one, the
[README](../README.md) is the whole of what you need.

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
- The homepage: three panes of one cross — the identity card, the listening
  beacon and the album strip, and either the desk or the pitch
- Individual entry pages where people can read your notes and leave comments
- `/archive` — every entry, searchable and filterable
- `/key` — what the stars and the three marks mean
- `/submit` — send the keeper an album
- `/compare` — read another journal's feed and compare taste
- `/shuffle` — redirect to a random entry
- `/feed.xml` — the journal as a feed another copy can read
- `/get` — the long note about why somebody keeps a listening journal, and
  under it the way to get one: the button, the steps, the screenshots, where
  to say it did not work. Only on the canonical copy; blank on a fresh one,
  and blank means it does not render

There is no `/about` route of its own. The identity card on the landing page
*is* the about page; `/about` and `/rig` stay only as redirects, so old links
land somewhere.

**Private side** — only you can access this (password protected, never linked
publicly):
- `/dashboard` — the hub: Listen, Inbox, Share
- `/session` — find the album, log the listen. The picker and the note-taking
  tool at one address: a search field and a grid of covers, then four screens
  under a small persistent header — the album, the tracks one at a time, the
  score and note, the preview. Identical on a phone and a desk. From the desk
  it opens as a layer, the way an entry does, and a swipe puts you back
- `/dashboard/inbox` — sent albums and comments awaiting moderation
- `/dashboard/share` — the album exporter
- `/dashboard/submissions` — a redirect into the inbox, kept for old links
- `/settings` — the machinery: address, Last.fm, the keys, the password,
  the home-screen step, and Sign out. Reached from the Settings door on
  the desk. The card's own fields are
  edited on the card, behind its pencil

Editing an entry happens on the entry itself, not in a list. There used to be a
`/dashboard/entries` table and it was retired: two interfaces for one job means
neither is canonical.

**Getting in.** The right pane. Signed out it is the pitch, with a "Sign in"
line at its foot; signed in it is the desk, with a Settings door. Both go to
`/settings`, which asks for the password when you are not wearing a
wristband and is the machinery when you are. Nothing on the mark opens
anything. `/login` is the same door at an address, for when a link will not
do. `/setup` runs once, on a copy nobody has claimed yet — one screen at a
time, opened with the claim code printed in the build log, and it is where
the password is chosen.

---

## Where Everything Lives

The library — logic, no visuals
  library/
    database_connection.js     Opens the connection to the database, on first use; and says a database failure in a sentence
    database_actions.js        Everything to do with saving and loading entries
    comment_actions.js         Everything to do with comments
    slug_generator.js          Turns "Pet Sounds" into "pet-sounds" for the URL
    entry_formatter.js         Parses entry data so it can be displayed correctly
    sitewide_visuals.js        All colors and fonts — change here, changes everywhere
    ai_integration.js          The Claude AI calls: research, and the local assembly of a post
    music_data_api.js          Fetches album art and tracklists from iTunes
    session_timers.js          Track length display, session timer
    wristband.js               Session auth — issues and checks the JWT cookie
    secrets.js                 The vault: the keys, the password hash, the session secret, the claim code. Database first, environment second
    claim_notice.js            The box printed in the build log while a copy is unclaimed
    settings_actions.js        The settings row: read, write, the name, the beacon's narrow reader
    migrator.js                Brings the database up to date — from instrumentation.js on start, and from scripts/prepare_database.mjs at build

The front doors — receive requests, hand them off, send back responses
  app/api/
    entries/route.js           Load all entries / save a new one
    entries/[slug]/route.js    Load, edit, or delete one specific entry
    comments/route.js          Load or submit comments
    comments/upvote/route.js   Upvote a comment
    research/route.js          Ask Claude to research an album
    format/route.js            Assemble your notes into a post (local, no model)
    ask/route.js               A question, answered with the album and your notes in context
    settings/route.js          The settings row — public to read, owner-only to write
    secrets/route.js           The vault — owner-only both ways; says what is set, never the value
    setup/route.js             GET: is this copy claimed. POST: the one write that claims it
    auth/login/route.js        The password, the deploy-time variable, or — unclaimed — the claim code

The hooks — reusable logic shared across pages
  hooks/
    useListeningBeacon.js      Checks Last.fm every 15 seconds for what's playing
    useListeningSession.js     All session state — the record, tracks, notes, score, preview, saving; research on request

The furniture — visual pieces
  components/
    main_components/           Everything on the public side
      HomeNav.js               The cross itself — three panes, the mark, the carets
      About.js                 The left pane: the card, then the writing under it
      IdentityCard.js          The identity card — this is the About page
      IdentificationCardEditor.js  Editing the card in place
      ListeningBeacon.js       The beacon — what is playing, or last played
      AlbumStrip.js            The scrolling row of albums
      Journal.js               The wall of covers, with its search, filters and sort
      AlbumTile.js             One cover on that wall
      Dashboard.js             The right pane, for the owner — Listen, Inbox, Share, Settings
      Pitch.js                 The right pane, for everybody else
      KeeperTools.js           The owner's pencil and printer
      WritingAccess.js         The sign-in line at the foot of the pitch pane; it goes to Settings
      ComingSoon.js            What a held copy shows instead of a site — unclaimed, no database, or database unreachable
      AddToHomeScreen.js       The one step the software cannot do: the last screen of setup, and a Settings section
      AlbumFinder.js           Type, see covers, pick one — the send flow's search
      LayerEntry.js            The sheet a page arrives on over the journal — from the side for forms, expanding from the cover for an entry, with swipes to the neighbours
      LayerWaiting.js          What stands in while that entry loads
      EdgeCaret.js             The chevrons that say there is more that way
      SiteNav.js               The nav row on pages that are not the cross
      Bookplate.js             Context holding the journal's own details
      StarRating.js            The star display (read only)
      HorizonChart.js          The listening-shape bar chart
      GridDensity.js           Archive tile sizing
      Lightswitch.js           Manages light and dark mode
      Slug_Page/
        MiniCard.js            The record, kept at the head of the notes
        CommentThread.js       A single comment and its replies
        CommentBubble.js       One comment, drawn
        NewCommentForm.js      The form to leave a comment
        TrackThread.js         A track row that expands to show notes and comments
        HorizonBar.js          The bar chart on the full entry page
        MetadataLabel.js       The small uppercase section labels
        Chip.js                The small pill tags (Favorite, Masterpiece, etc)
    session_components/        Everything in the private dashboard
      PasswordGate.js          The password screen
      AlbumPicker.js           Type, see a grid of covers, tap one — the screen before a listen
      SessionHeader.js         The title line, the glowing question mark and the theme switch, and the four steps
      AskSheet.js              The reference — a bottom sheet on a phone, a column beside the writing on a desk
      StarRating.js            The interactive stars you click to rate
      steps/
        AlbumScreen.js         Step 0 — the cover, large; Start or Resume session; Research as a button
        TrackNotes.js          Step 1 — one track per screen, under a strip of every track's bar, dot and title
        AlbumNotes.js          Step 2 — the horizon so far, the score, the three marks, then the album note
        SessionPreview.js      Step 3 — the real entry page (FullPostPage in preview mode) on its own sheet, with Return to session and Save to journal at its foot
      backgrounds/             10 animated canvas scenes for the dashboard hub
        Rain.js / DVD.js / Gallery.js / Fizzy.js / SplitScreen.js
        Snake.js / Pong.js / Solitaire.js / Reel.js
        EchoNetwork.js         The network of floating covers that used to open every listen
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
      FullPostPage.js          The full public entry page with comments — and, in preview mode, the session's preview
    archive/page.js            Every entry — search, sort, filters
    key/page.js                What the stars and the three marks mean
    submit/page.js             Send the keeper an album
    compare/page.js            Read another journal's feed, compare taste
    shuffle/page.js            Redirect to a random entry
    get/page.js                The keeper's long note. 404s when unwritten
    about/page.js              Redirect to / — the identity card is the about page
    rig/page.js                Redirect to / — the rig lives on the card
    session/page.js            The listen — picker, then four screens under one header
    setup/page.js              Claiming a copy: the code, the name, five skippable screens, the password
    settings/page.js           The machinery, owner-only
    @layer/(.)session/page.js  The same listen, opened as a layer over the desk
    dashboard/
      page.js                  Hub — 3 buttons (Listen, Inbox, Share)
      submissions/page.js      Redirect into the inbox — kept for old links
      inbox/page.js            Comments and submissions in one place
      share/page.js            Album exporter — slides for sharing an entry

---

## When You Want to Change Something

| What you want to change | File to open |
|------------------------|-------------|
| The site's colors | library/sitewide_visuals.js |
| The site's fonts | library/sitewide_visuals.js |
| What Claude says during research | library/ai_integration.js, research_album |
| How your notes are assembled into a post | library/ai_integration.js, format_post |
| The nav row | components/main_components/SiteNav.js, and HomeNav.js on the cross |
| The listening beacon | components/main_components/ListeningBeacon.js |
| The row of recent covers under the beacon | components/main_components/HomeNav.js, recentRow |
| The entry that opens over the wall, and swiping between entries | components/main_components/LayerEntry.js, library/handoff.js and app/@layer/ |
| The full entry post page | app/entries/[slug]/FullPostPage.js |
| The album picker | components/session_components/AlbumPicker.js |
| The note-taking session, and its styles | app/session/page.js |
| The header above every session screen | components/session_components/SessionHeader.js |
| The question mark's sheet, and what it is told | components/session_components/AskSheet.js and app/api/ask/route.js |
| The session screens (album, tracks, notes, preview) | components/session_components/steps/ |
| Editing an entry | hooks/useEntryEditor.js, drawn into app/entries/[slug]/FullPostPage.js |

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

One database (Neon Postgres). [`migrations/`](../migrations) is the whole of it and
is generated from a live catalogue, so it describes what actually exists rather
than what anyone remembers building.

| Table | What it holds |
|---|---|
| `entries` | The journal. One row per listen — an album listened to twice is two entries, never an overwrite. |
| `settings` | Everything that makes a copy someone's own: the keeper, the portrait, the links, the rig, the starting theme. Exactly one row, forced by a check on `id`. |
| `secrets` | What must never reach a visitor: the session secret, the password hash, the claim code, the two API keys. One row; read only by `library/secrets.js`. |
| `users` | The owner. One row, written at setup. |
| `comments` | Replies on entries and on individual tracks, with a moderation queue. |
| `submissions` | Albums other people have sent you. |
| `drafts` | A listening session in progress, so closing the tab does not lose it. |
| `briefings` | Cached album research, keyed by album, so the same record is not paid for twice. |
| `conversations` | Defined and unused — the session chat lives in the browser and ends with it. |
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
