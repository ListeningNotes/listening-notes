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
- The homepage: two panes of one cross — the beacon with the journal under it,
  and beside it a pane that turns between the identity card and the desk (or,
  signed out, the colophon). Sideways is you, down is the records: only the
  beacon has a cover, so only it has two floors and a down caret. On a desk
  the same two are an open book — the turning pane is the spine, a quarter of
  the window; the journal takes the rest
- Individual entry pages where people can read your notes and leave comments
- `/archive` — every entry, searchable and filterable
- `/key` — what the stars and the three marks mean
- `/submit` — send the keeper an album
- `/shuffle` — redirect to a random entry
- `/feed.xml` — the journal as a feed another copy can read
- `/get` — the way to get a copy: nine steps with their screenshots, and the
  button after the ninth. `/get/story` is the long note about why somebody
  keeps a listening journal. Only on the canonical copy; blank on a fresh
  one, and blank means neither renders

There is no `/about` route of its own. The identity card on the landing page
*is* the about page; `/about` stays only as a redirect, so old links land
somewhere. `/rig` was a redirect too and is gone: it was live for three days
and nobody else had the address.

**Private side** — only you can access this (password protected, never linked
publicly):
- `/dashboard` — forwards home; the desk is a face of the cross's turning pane
- `/session` — find the album, log the listen. The picker and the note-taking
  tool at one address: a search field and a grid of covers, then four screens
  under a small persistent header — the album, the tracks one at a time, the
  score and note, the preview. Identical on a phone and a desk. From the desk
  it opens as a layer, the way an entry does, and a swipe puts you back — on a
  desk that layer is the right page, so the spine stays beside it
- `/dashboard/inbox` — sent albums, comments awaiting moderation, and problems
  keepers wrote in
- `/dashboard/report` — report a problem: one box, sent to the copy the
  software comes from
- `/dashboard/feed` — what the journals in the address book have logged.
  Ran on down the desk's own scroll until 2026-09-15
- `/dashboard/people` — the address book: the journals you read, by address,
  and the ways one gets in — a paste, a scanned code, a send that carried one
- `/dashboard/people/[id]` — your page about one person: what you both have,
  where you agree and disagree hardest, what they sent you and how it landed
- `/dashboard/submissions` — a redirect into the inbox, kept for old links
- `/settings` — the machinery: address, the beacon's on/quiet switch, the
  the password, the home-screen step, and Sign out. Reached from the Settings door on
  the desk. The card's own fields are
  edited on the card, behind its pencil

Editing an entry happens on the entry itself, not in a list. There used to be a
`/dashboard/entries` table and it was retired: two interfaces for one job means
neither is canonical.

**Getting in.** The turning pane's far face. Signed out it is the pitch, with a small key
at its foot that opens the password field in place; signed in it is the desk,
with a Settings door to `/settings`, which asks for the password when you are
not wearing a wristband and is the machinery when you are. Nothing on the
mark opens anything. `/login` is the same door at an address, for when a link will not
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
    music_data_api.js          Fetches album art and tracklists from iTunes
    card_links.js              The marks a card can wear — which shape stands for the rig, which logo a link gets
    portrait_code.js           The press: the portrait made into the journal's QR code on the server — a dot of ink in every photo module, proved by the strictest reader on both page colours
    cover_code.js              The same press for an entry's cover: the code for that entry's address, redrawn from the art on each ask, with only the proved dot kept on the row
    code_shape.js              Two numbers about a code's shape — the quiet zone and the least version — read by the press and by the browser that sizes its picture
    session_timers.js          Track length display (m:ss)
    wristband.js               Session auth — issues and checks the JWT cookie
    secrets.js                 The vault: the keys, the password hash, the session secret, the claim code. Database first, environment second
    claim_notice.js            The box printed in the build log while a copy is unclaimed
    settings_actions.js        The settings row: read, write, the name, the beacon's narrow reader
    people_actions.js          The address book: the people table, and asking a journal its keeper's name
    came_back_actions.js       What came back: records this journal put somebody onto, logged on theirs — noticed by the feed, kept for the inbox
    report_actions.js          Problems keepers wrote in from their desks — the reports table
    submission_actions.js      Albums other people sent you: saving one, its four outcomes, the record a send became, and naming its sender once they have a copy
    return_address.js          The back of the envelope — a sender's name and journal kept in their own browser — and the one spelling an address is kept in
    migrator.js                Brings the database up to date — from instrumentation.js on start, and from scripts/prepare_database.mjs at build
    version.js                 Which version this copy is running (from package.json), where its release notes are, and where a report goes — read by the pitch pane, the desk and the report sheet

The update button
  .github/workflows/update.yml   Ships in every copy: Actions → Update this copy → Run workflow
  scripts/update_copy.mjs        What the button does — fetched from upstream each run: graft, merge, push, or stop and say which files clash

The front doors — receive requests, hand them off, send back responses
  app/api/
    entries/route.js           Load all entries / save a new one
    entries/[slug]/route.js    Load, edit, or delete one specific entry
    entries/[slug]/code/route.js  GET: the entry's code, pressed out of its cover — public, rate-limited, cached a day
    comments/route.js          Load or submit comments
    comments/upvote/route.js   Upvote a comment
    format/route.js            Assemble your notes into a post (local, no model)
    settings/route.js          The settings row — public to read, owner-only to write
    people/route.js            The address book — owner-only: the list, and filing an address
    came-back/route.js         What came back — owner-only: the inbox's list, what the feed noticed, and a row opened
    people/[id]/route.js       One person: reading them, crossing them out
    reports/route.js           A problem written in — POST from any copy (rate-limited, cross-origin), GET for the owner
    reports/[id]/route.js      Marking one read or dismissed
    secrets/route.js           The vault — owner-only both ways; says what is set, never the value
    setup/route.js             GET: is this copy claimed. POST: the one write that claims it
    auth/login/route.js        The password, the deploy-time variable, or — unclaimed — the claim code
    portrait/code/route.js     POST: press the journal's code out of the stored portrait — owner-only, no body
    update/route.js            Is there a newer Listening Notes — the latest public release against package.json, once a day, owner-only

The hooks — reusable logic shared across pages
  hooks/
    useListeningBeacon.js      Asks this journal's own beacon every 15 seconds — logging, listening or last logged
    useListeningSession.js     All session state — the record, tracks, notes, score, preview, saving
    useSessionDraft.js         The listen's draft — the browser's copy and the row in drafts — autosave, restore, cleanup
    useSpineWidth.js           The spine — the left page of the open book on a desk: how wide, remembered per browser, clamped, dragged by the fold

The furniture — visual pieces
  components/
    main_components/           Everything on the public side
      HomeNav.js               The cross itself — three panes on a phone (ID, beacon, desk) with the band at the foot; on a desk an open book — the spine on the left, the journal on the right, the fold, and a control in the spine's header to turn between its two pages
      About.js                 One face of the turning pane: the card, then the writing under it, in one scroll
      IdentityCard.js          The ID: the portrait full width and square — the same object an entry's album art is — then the name with Send and Add, three counts in the flags' colours, and the pinned record. This is the About page
      IdentificationCardEditor.js  Editing the card in place
      ListeningBeacon.js       The beacon — what is playing, or last played
      Journal.js               The wall of covers, with its search, filters and sort
      JournalFilters.js        The filter sheet — a popover on a desk, a pull-down sheet on a phone — and the year range
      AlbumTile.js             One cover on that wall
      CodeSlot.js              A square that holds a picture and turns into that picture's code — the card's portrait and an entry's cover: the two faces, the copy and its pill, the corner mark, the wait
      AddressCode.js           A plain code for an address, drawn in the browser — what CodeSlot shows when no pressed picture can be had
      CodeScanner.js           The camera pointed at a code — the address book's way in for a card's or a cover's code
      GiveSheet.js             Give: a code to listeningnotes.blog/get?gift=<this journal>, for a friend who has no copy — the gift at the left of the address book's header, opposite Add
      Dashboard.js             The desk, for the owner — Start a listen as a band, then Inbox, Feed, Address book and Settings as rows; the header holds the mark alone
      Feed.js                  What the people in the address book logged, read off their public feeds; Submissions and Recent; Compare on a row you also have. Its own page at /dashboard/feed since 2026-09-15
      Pitch.js                 The other face, for everybody else — the colophon
      Footer.js                The band at the foot of the phone's cross — Card, Beacon, Desk, the one you are on in ink; presses move the rail exactly as a swipe does
      KeeperTools.js           The owner's ··· — top right on both, Edit/Print/Delete on an entry and Edit/Print on the ID pane; the door stays put and the tools file out of it
      SharePrinter.js          The share printer — paper sizes, the looks you turn through, Save and Send; knows nothing about journals, prints whatever plate it is handed
      EntryPlate.js            A record cut as a plate — the entry page's first screen on the record's blurred colour: mark, keeper, cover, album, artist and year, stars, chips, date, horizon; no code, the press copies the address
      WritingAccess.js         The lock at the foot of the pitch pane — a key, and the password field it opens in place
      ComingSoon.js            What a held copy shows instead of a site — unclaimed, no database, or database unreachable
      AddToHomeScreen.js       The one step the software cannot do: the last screen of setup, and a Settings section
      AlbumFinder.js           Type, see covers, pick one — the send flow's search
      MiniAddressBook.js       The address book as a strip of faces, for picking one person — the entry editor's Sent by, and the inbox's send whose sender has since got a copy
      LayerEntry.js            The sheet a page arrives on over the journal — from the side for forms, expanding from the cover for an entry, with swipes to the neighbours; on a desk it is either the right page (an entry, a listen) or a sheet on the spine (the owner's rooms), with a back caret
      LayerWaiting.js          What stands in while that entry loads
      EdgeCaret.js             The chevrons that say there is more that way
      SiteNav.js               The nav row on pages that are not the cross
      Bookplate.js             Context holding the journal's own details
      StarRating.js            The star display (read only)
      HorizonChart.js          The listening-shape bar chart
      GridDensity.js           Archive tile sizing
      Lightswitch.js           Manages light and dark mode — the one switch that calls it is the beacon's, top right
      Slug_Page/
        MiniCard.js            The record, kept at the head of the notes
        CommentThread.js       A single comment and its replies
        CommentBubble.js       One comment, drawn
        NewCommentForm.js      The form to leave a comment
        TrackThread.js         A track row that expands to show notes and comments
        HorizonBar.js          The bar chart on the full entry page
        MetadataLabel.js       The small uppercase section labels
        Chip.js                The small pill tags (Favorite, Masterpiece, etc)
        Chain.js               What the Submission chip opens — who sent the record, whether they logged it, the chain behind them, read off their journals on the press
    session_components/        Everything in the private dashboard
      PasswordGate.js          The password screen
      AlbumPicker.js           Type, see a grid of covers, tap one — the screen before a listen
      SessionHeader.js         The title line, the glowing question mark and the theme switch, and the four steps
      StarRating.js            The interactive stars you click to rate
      steps/
        AlbumScreen.js         Step 0 — the cover, large; Start or Resume session
        TrackNotes.js          Step 1 — one track per screen, under a strip of every track's bar, dot and title
        AlbumNotes.js          Step 2 — the horizon so far, the score, the three marks, then the album note
        SessionPreview.js      Step 3 — the real entry page (FullPostPage in preview mode) on its own sheet, with Return to session and Save to journal at its foot
      backgrounds/             10 animated canvas scenes — parked 2026-09-06, nothing mounts them; wanted back as plates for the share printer
        Rain.js / DVD.js / Gallery.js / Fizzy.js / SplitScreen.js
        Snake.js / Pong.js / Solitaire.js / Reel.js
        EchoNetwork.js         The network of floating covers that used to open every listen
        index.js               Exports all backgrounds as an array

The rooms — full pages assembled from furniture
  app/
    page.js                    Homepage
    layout.js                  Wraps every page (fonts, theme)
    styles/                    The stylesheets, one per surface — see below
      base.css                 Palette, both themes, the two typefaces, resets, the pill
      nav.css                  The cross: panes, crown, carets, beacon, pitch, desk, and the nav row on other pages
      journal.css              The wall of covers and its bar
      entry.css                The layer, the stand-in, the entry page, comments, corrections
      idcard.css               The identity card, its editor, the About pane writing
      session.css              The listen: picker, header, four screens, the reference
      get.css                  /get — the steps and the button, and the story
      forms.css                Send, setup, settings, the password gate, compare, key
    manifest.js                PWA manifest — force-dynamic, so the name is not baked in
    feed.xml/route.js          The journal as an RSS feed
    entries/[slug]/
      page.js                  Loads the entry, hands it to FullPostPage
      FullPostPage.js          The full public entry page with comments — and, in preview mode, the session's preview
      opengraph-image.js       The picture an entry's link unfurls into — cover, title, score, marks — drawn on the server per request
    archive/page.js            Every entry — search, sort, filters
    key/page.js                What the stars and the three marks mean
    submit/page.js             Send the keeper an album
    shuffle/page.js            Redirect to a random entry
    get/page.js                Get your copy: ten steps, then the deploy button. 404s while the long note is unwritten
    get/gift-preview/route.js  The picture a gift link (/get?gift=) unfurls into — /get's "A gift from" card — when the giver's journal answers
    get/story/page.js          The keeper's long note. 404s when unwritten. Linked from nowhere for now
    about/page.js              Redirect to / — the identity card is the about page
    session/page.js            The listen — picker, then four screens under one header
    printer/page.js            The share printer — the press on a record for the keeper (?entry=slug); the sentence for everyone else and for the card, whose plate is still to come
    setup/page.js              Claiming a copy: the code, the name, three skippable screens, the password
    settings/page.js           The machinery, owner-only
    @layer/(.)archive/page.js  The wall, opened as a layer over whatever you were on — what the ID card's counts press into, growing from the number pressed
    @layer/(.)session/page.js  The same listen, opened as a layer over the desk
    @layer/(.)dashboard/inbox/page.js  The inbox, opened as a sheet over the desk
    @layer/(.)dashboard/feed/page.js  The feed, on the same sheet
    @layer/(.)dashboard/people/page.js  The address book, on the same sheet
    @layer/(.)dashboard/people/[id]/page.js  The page about a person, on the same sheet
    @layer/(.)dashboard/report/page.js  Report a problem, on the same sheet
    @layer/(.)printer/page.js  The printer, as a sheet over the entry or the card
    dashboard/
      page.js                  Redirect to / — the desk is a face of the cross's turning pane
      inbox/page.js            Comments and submissions in one place — plain, on the tokens, and a sheet over the desk
      people/page.js           The address book — the list, the field, the scanner
      people/[id]/page.js      Your page about one person — the whole-journal compare, and what they sent you
      report/page.js           Report a problem — one box, Send

---

## When You Want to Change Something

| What you want to change | File to open |
|------------------------|-------------|
| The site's colors | library/sitewide_visuals.js |
| The site's fonts | library/sitewide_visuals.js |
| How your notes are assembled into a post | library/entry_formatter.js, format_post |
| The nav row | components/main_components/SiteNav.js, and HomeNav.js on the cross |
| The listening beacon | components/main_components/ListeningBeacon.js |
| The row of recent covers under the beacon | components/main_components/HomeNav.js, recentRow |
| The entry that opens over the wall, and swiping between entries | components/main_components/LayerEntry.js, library/handoff.js and app/@layer/ |
| The full entry post page | app/entries/[slug]/FullPostPage.js |
| A picture turning into its code (the portrait, a cover) | components/main_components/CodeSlot.js, styles under .ln-slot in app/styles/base.css |
| Printing a record (the share printer) | components/main_components/EntryPlate.js draws it, SharePrinter.js is the press, styles under .shp in app/styles/forms.css, app/printer/page.js opens it |
| The album picker | components/session_components/AlbumPicker.js |
| The note-taking session | app/session/page.js, styles in app/styles/session.css |
| The header above every session screen | components/session_components/SessionHeader.js |
| The session screens (album, tracks, notes, preview) | components/session_components/steps/ |
| Editing an entry | hooks/useEntryEditor.js, drawn into app/entries/[slug]/FullPostPage.js |

---

## Colors and Fonts

Two files, and they are the source — no list is kept here, because the list
that used to be here spent months claiming the accent was green and the
headings were set in a serif, and neither had been true for a long time.

- **`app/styles/base.css`** — the palette as custom properties (`--bg`, `--ink`,
  `--accent`, `--panel`), both themes, which is what components read.
- **`library/sitewide_visuals.js`** — the `fonts` object, and a `colors`
  object a few canvas and chart pieces still read because a canvas cannot
  read a custom property.

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
| `entries` | The journal. One row per listen — an album listened to twice is two entries, never an overwrite. `posted_at` is when, with its zone; `created_at` is the older naive stamp, kept and unread. `cover_code` is the dot that carried the cover into its code, stamped on the first tap — never the picture. |
| `settings` | Everything that makes a copy someone's own: the keeper, the portrait, the links, the rig, the starting theme. Exactly one row, forced by a check on `id`. |
| `secrets` | What must never reach a visitor: the session secret, the password hash, the claim code, the two API keys. One row; read only by `library/secrets.js`. |
| `users` | The owner. One row, written at setup. |
| `comments` | Replies on entries and on individual tracks, with a moderation queue. |
| `submissions` | Albums other people have sent you. `status` is pending, reviewed (a listen was started from the row), logged, or dismissed; `entry_id` is the record a send became, set by hand on the row and never by matching. |
| `came_back` | Records this journal put somebody onto, logged on their journal: one row per entry, keyed by their journal and slug, with what their feed said about it and `seen_at` for the inbox's dot. Written by the keeper's own browser, from the feed's match. |
| `drafts` | A listening session in progress, so closing the tab does not lose it. |
| `briefings` | Cached album research. Nothing reads or writes it since 2026-09-18 — the research came out of the software and the schema is additive-only, so the table stays with whatever is in it (docs/RETIRED-PROMPTS.md). |

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
