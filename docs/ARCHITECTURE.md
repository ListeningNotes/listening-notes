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
- The homepage: the cross. On a phone it is a rail of panes with a band at
  the foot naming them — Card, Beacon, About for a visitor; Card, Beacon,
  Friends, Inbox for the keeper (the desk left the phone on 2026-09-19).
  Sideways is you, down is the records: only the beacon has a cover, so only
  it has two floors and a down caret. On a desk it is an open book — the
  spine on the left turns between the card and the desk (or, signed out, the
  colophon) and is a quarter of the window; the journal takes the rest
- Individual entry pages where people can read your notes and leave comments
- `/archive` — every entry, searchable and filterable
- `/key` — what the stars and the three marks mean
- `/submit` — send the keeper an album
- `/shuffle` — redirect to a random entry
- `/feed.xml` — the journal as a feed another copy can read
- `/get` — the way to get a copy: ten steps with their screenshots, and the
  button after the tenth. `/get/story` is the long note about why somebody
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
  under a small persistent header — the record's contents, the tracks one at
  a time, the score and note, the preview. Identical on a phone and a desk. From the desk
  it opens as a layer, the way an entry does, and a swipe puts you back — on a
  desk that layer is the right page, so the spine stays beside it
- `/dashboard/inbox` — sent albums, comments awaiting moderation, and problems
  keepers wrote in
- `/dashboard/report` — report a problem: one box, sent to the copy the
  software comes from
- `/dashboard/feed` — what the journals in the address book have logged.
  Ran on down the desk's own scroll until 2026-09-15
- `/dashboard/people` — the address book as a grid of faces (Friends), with
  the ways one gets in — a paste, a scanned code, a send that carried one —
  and Give and Add in its header. The Friends stop on the phone's band
- `/dashboard/people/[id]` — your page about one person: what you both have,
  where you agree and disagree hardest, what they sent you and how it landed
- `/settings` — the machinery: address, the password, Back up your journal,
  keeping up to date, the home-screen step, and Sign out. Reached from the
  card's ··· and, on a desk, from the desk's Settings row. The card's own
  fields are edited on the card, behind its pencil

Editing an entry happens on the entry itself, not in a list. There used to be a
`/dashboard/entries` table and it was retired: two interfaces for one job means
neither is canonical.

**Getting in.** Signed out, the About stop on a phone and the spine's far face
on a desk are the pitch, with a small key at its foot that opens the password
field in place; signed in, `/settings` asks for the password when you are not
wearing a wristband and is the machinery when you are. Nothing on the
mark opens anything. `/login` is the same door at an address, for when a link will not
do. `/setup` runs once, on a copy nobody has claimed yet — one screen at a
time, opened with the claim code printed in the build log, and it is where
the password is chosen.

---

## Where Everything Lives

The library — logic, no visuals
  library/
    background_scale.js        The factor that shrinks the screensavers' artwork on a phone so it stays background; exactly 1 on a desk
    bioprompt.js               The nine sentence openings a keeper finishes on the card, the limit of three, and the reader that prints stored key-and-answer pairs
    came_back_actions.js       What came back: records this journal put somebody onto, logged on theirs — noticed by the feed, kept for the inbox
    card_links.js              The marks a card can wear — which shape stands for the rig, which logo a link gets
    claim_notice.js            The box printed in the build log while a copy is unclaimed
    code_shape.js              Two numbers about a code's shape — the quiet zone and the least version — read by the press and by the browser that sizes its picture
    comment_actions.js         Everything to do with comments: the thread nested by track, saving, upvoting, moderation, and which replies came from a given journal
    cover_code.js              The same press for an entry's cover: the code for that entry's address, redrawn from the art on each ask, with only the proved dot kept on the row
    cross_references.js        Display-time linking: a mention of an album or artist in the archive becomes a link; [[brackets]] force one; COMMON_WORD_NAMES is the hand-edited blocklist
    database_actions.js        Everything to do with saving and loading entries — the wall's lean list, the public feed's allow-list, one entry, a record's folder, save/update/delete, drafts, briefings
    database_connection.js     Opens the connection to the database, on first use; and says a database failure in a sentence
    definitions.js             The shipped text for the three marks, and the merge of the owner's edits over it
    doorman.js                 Rate limiting, in memory: the doors, how many tries each allows, who is knocking, and the 429 answer
    entry_formatter.js         The shapes an entry is written in: the horizon from track ratings, flawless (what Masterpiece means), tracks to and from prose, lookup_key, the edit stamp
    gold_burst.js              The gold sparkle fired when a Masterpiece is marked
    handoff.js                 What the wall leaves for the entry layer: the tapped record's first screen, the wall's order for swiping to neighbours, and how a layer arrived
    install_guide.js           What /get needs: the deploy button's URL and the ten steps with their screenshots
    migrator.js                Brings the database up to date — from instrumentation.js on start, and from scripts/prepare_database.mjs at build
    music_data_api.js          Fetches album art and tracklists from iTunes, and the searches: records (searchAlbums) and songs (searchSongs)
    needle.js                  The beacon's reading half: the one row saying what is being logged now, lifting it, sat_with for deleted listens, and the recent listens under the beacon
    outbox.js                  Handing a record, or a song, to somebody in the book from this copy — this server to theirs, never the browser — and a wave
    people_actions.js          The address book: the people table, pinning, and asking a journal its keeper's name
    portrait_code.js           The press: the portrait made into the journal's QR code on the server — a dot of ink in every photo module, proved by the strictest reader on both page colours
    receipts.js                The browser half of comment receipts: the signed stubs kept in localStorage
    report_actions.js          Problems keepers wrote in from their desks — the reports table
    return_address.js          The back of the envelope — a sender's name and journal kept in their own browser — and the one spelling an address is kept in
    secrets.js                 The vault: the session secret, the password hash, the claim code, the setup window, and two retired key columns. Database first, environment second
    session_timers.js          Track length display (m:ss)
    settings_actions.js        The settings row: read (never the portrait blobs), write through an allow-list, the name, isSetUp, and the one-column keeper-name reader the feed uses
    sitewide_visuals.js        Colours and fonts as JS, for canvas and chart code that cannot read a custom property; the stylesheets are the source
    slug_generator.js          Turns "Pet Sounds" into "pet-sounds" for the URL
    submission_actions.js      Albums other people sent you: saving one, its four outcomes, the record a send became, and naming its sender once they have a copy
    version.js                 Which version this copy is running (from package.json), where its release notes are, and where a report goes — read by the pitch pane, the desk and the report sheet
    wave_actions.js            The waves that arrived here: one row per waving journal, replaced not stacked, deleted when left
    whole_journal.mjs          Which tables the journal has, asked of the database, and one table's rows as Postgres writes them — shared by the nightly backup and the export, so neither keeps a list
    wristband.js               Session auth — issues and checks the JWT cookie, renews it, guards routes and pages, and signs comment receipts

The update button
  .github/workflows/update.yml   Ships in every copy: Actions → Update this copy → Run workflow, and once an hour on its own
  scripts/update_copy.mjs        What the button does — fetched from upstream each run: graft, merge the latest release, push, or stop and say which files clash

The other scripts — run by hand or by a machine, never by the site
  scripts/backup.mjs             Every table to $BACKUP_DIR/<timestamp>/ with migrations/ beside it; 30 kept; carries secrets (docs/OPERATIONS.md)
  scripts/restore.mjs            Puts a backup or an export back — a dry run without --yes; empties only the tables the file holds
  scripts/prepare_database.mjs   Runs before next build: migrates and prints the claim notice; never fails the build

The lint gate — git runs it, on a machine that has opted in
  .githooks/pre-commit           Runs npm run lint before every commit and refuses the commit on an error; on only after git config core.hooksPath .githooks, once per clone (AGENTS.md, Commands)

Before the first request — two files whose names are Next's, not ours
  instrumentation.js             The startup hook: migrates before the first request and prints the claim notice while the copy is unclaimed
  proxy.js                       Next's middleware under its new name: copies the pathname into a header for the layout and does nothing else

The front doors — receive requests, hand them off, send back responses
  app/api/
    entries/route.js           Load all entries / save a new one
    entries/[slug]/route.js    Load, edit, or delete one specific entry
    entries/[slug]/code/route.js  GET: the entry's code, pressed out of its cover — public, rate-limited, cached a day
    drafts/route.js            Unfinished listens — owner-only both ways, the read included
    drafts/[id]/route.js       DELETE one draft
    format/route.js            Assemble your notes into a post (local, no model)
    comments/route.js          Load or submit comments
    comments/[id]/route.js     Moderation — PATCH approves, DELETE dismisses; owner-only
    comments/pending/route.js  Every comment awaiting moderation, for the inbox; owner-only
    comments/receipts/route.js POST: the thread plus any held comments the caller's receipts prove they wrote
    comments/upvote/route.js   Upvote a comment
    submissions/route.js       POST: a send arrives — from the visitor form or from another copy's server; GET for the owner
    submissions/[id]/route.js  One send: settling it, saying it was already logged, naming who it came from; owner-only
    settings/route.js          The settings row — public to read, owner-only to write
    people/route.js            The address book — owner-only: the list, and filing an address
    outbox/route.js            Where a send leaves from — owner-only: the person resolved out of the address book, the record (or the song) handed to library/outbox.js, which posts to their copy's /api/submissions; a wave goes the same road
    came-back/route.js         What came back — owner-only: the inbox's list, what the feed noticed, and a row opened
    waves/route.js             Waves — POST is public, from another copy's server: a journal and a name, nothing else, checked and counted; GET, PATCH and DELETE are the keeper's
    people/[id]/route.js       One person: reading them, crossing them out
    reports/route.js           A problem written in — POST from any copy (rate-limited, cross-origin), GET for the owner
    reports/[id]/route.js      Marking one read or dismissed
    secrets/route.js           The vault — owner-only both ways; says what is set, never the value
    setup/route.js             GET: is this copy claimed. POST: the one write that claims it
    auth/login/route.js        The password, the deploy-time variable, or — unclaimed — the claim code
    auth/check/route.js        Am I still wearing a valid wristband; renews an ageing one on the way
    auth/logout/route.js       Cuts the wristband off
    waiting/route.js           How much has arrived and not been looked at — the inbox's number
    needle/route.js            Where a listen says what it is on — owner-only, write only; the read is public/beacon
    portrait/route.js          The keeper's picture: uploaded into a column, served back from it, removed
    portrait/code/route.js     POST: press the journal's code out of the stored portrait — owner-only, no body
    export/route.js            The whole journal as one file — owner-only; leaves secrets out
    update/route.js            Is there a newer Listening Notes — the latest public release against package.json, at most once an hour, owner-only
    public/beacon/route.js     What the keeper is listening to — anyone may ask; cached at the edge
    public/entries/route.js    The public feed another copy reads — PUBLIC_FIELDS only, with keeper_name beside them
    public/replies/route.js    Replies to comments left here from a given journal (?to=), for that journal's inbox
    public/stamps/route.js     The card's counted facts — records, first entry, top genres, the two flag counts

The hooks — reusable logic shared across pages
  hooks/
    useEntryEditor.js          The draft of an entry while its keeper corrects it in place; fetches the credit fields separately, since public reads strip them
    useHoldStill.js            Locks every scrolling ancestor behind an open overlay so nothing under it moves
    useJournalHost.js          The journal's host, as the hidden username a password manager files the password under
    useListeningBeacon.js      Asks this journal's own beacon every 15 seconds — one poll shared by every component that draws it — logging or last logged
    useListeningSession.js     All session state — the record, tracks, notes, score, preview, saving; SESSION_STEPS
    usePress.js                The share printer as a hook: make the picture at a size, save or share it, copy the address
    useSessionDraft.js         The listen's draft — the browser's copy and the row in drafts — autosave, restore, cleanup
    useSpineWidth.js           The spine — the left page of the open book on a desk: how wide, remembered per browser, clamped, dragged by the fold

The furniture — visual pieces
  components/
    main_components/           Everything on the public side
      HomeNav.js               The cross itself — on a phone a rail of panes with the band at the foot (Card, Beacon, Friends, Inbox for the keeper; Card, Beacon, About for a visitor); on a desk an open book — the spine on the left, the journal on the right, the fold, and a control in the spine's header to turn between its two pages
      About.js                 One face of the turning pane: the card, then the writing under it, in one scroll
      IdentityCard.js          The ID: the portrait full width and square — the same object an entry's album art is — then the name, three counts in the flags' colours, and the pinned record. Send and Add left it on 2026-09-19, and left the beacon too on 2026-09-27; a visitor sees the keeper here and nowhere else. This is the About page
      IdentificationCardEditor.js  Editing the card in place
      ListeningBeacon.js       The beacon — what is playing, or last played
      Journal.js               The wall of covers, with its search, filters and sort
      JournalFilters.js        The filter sheet — a popover on a desk, a pull-down sheet on a phone — and the year range
      AlbumTile.js             One record on that wall — a card for one listen, a page with its corner folded for one track note, a folder for more than one entry (Journal.js gathers entries into records)
      FolderFooter.js          A folder's tabs at the foot of the screen — Listen 1, Listen 2 or the song, the one you are on in ink — the one piece of chrome a folder adds; useFolder in LayerEntry.js does the flipping
      CodeSlot.js              A square that holds a picture and turns into that picture's code — the card's portrait and an entry's cover: the two faces, the copy and its pill, the corner mark, the wait
      AddressCode.js           A plain code for an address, drawn in the browser — what CodeSlot shows when no pressed picture can be had
      CodeScanner.js           The camera pointed at a code — the address book's way in for a card's or a cover's code
      GiveSheet.js             Give: a code to listeningnotes.blog/get?gift=<this journal>, for a friend who has no copy — the gift at the left of the address book's header, opposite Add
      WaveSheet.js             Just added somebody: "[name] is in your address book", Wave to [name] or Not now — the one moment a wave is offered
      Dashboard.js             The desk, for the owner — Start a listen as a band, then Inbox, Feed, Address book and Settings as rows; the header holds the mark alone. On a desk only since 2026-09-19, as the spine's second page
      Friends.js               The address book as a grid of faces, pinned first; a face opens its three doors in place under its own row. The Friends stop, and /dashboard/people
      Feed.js                  What the people in the address book logged, read off their public feeds; Submissions and Recent; Compare on a row you also have. Its own page at /dashboard/feed since 2026-09-15
      Footer.js                The band at the foot of the phone's cross — Card, Beacon, Friends, Inbox (Card, Beacon, About for a visitor), the one you are on in ink; presses move the rail exactly as a swipe does
      EditingBar.js            The band at the foot of anything being corrected — what you are in the middle of, and Save and Cancel as words
      UpdateSwitch.js          Switching on the updater — a screen in setup, a section in Settings: hands the keeper a pre-filled GitHub link for the workflow file, then watches for the rebuild
      InstallSteps.js          /get's ten steps as tiles, plain HTML, with a ring over what to press where a picture exists
      MarqueeTitle.js          A title too long for the small beacon scrolls one lap and holds
      KeeperTools.js           The owner's ··· — top right on both, Edit/Print/Delete on an entry and Edit/Print on the ID pane; the door stays put and the tools file out of it
      SharePrinter.js          The press's toolbox, not the press: the paper sizes (FRAMES), the page's two colours, and the canvas tools a plate draws with. The press itself has been hooks/usePress.js since 2026-09-13
      EntryPlate.js            A record cut as a plate — the entry page's first screen on the record's blurred colour: mark, keeper, cover, album, artist and year, stars, chips, date, horizon; no code, the press copies the address
      WritingAccess.js         The lock at the foot of the card for a visitor — shut, open while the password field it opens in place
      ComingSoon.js            What a held copy shows instead of a site — unclaimed, no database, or database unreachable
      AddToHomeScreen.js       The one step the software cannot do: the last screen of setup, and a Settings section
      JournalCopy.js           Back up your journal, in Settings: Make a copy fetches the export and holds it, then Share (a phone) or Download (a computer)
      AlbumFinder.js           Type, see covers, pick one — the stranger's send form's search (/submit)
      MiniAddressBook.js       The address book as a strip of faces, for picking one person — the entry editor's Sent by, the inbox's send whose sender has since got a copy, and the send sheet's book, as a grid
      SendSheet.js             The one send sheet: a thing, an arrow, a person, centred over the screen — from an entry's tools, a track row mid-listen, or a person in the book; the session's picker and the book as its shelf; and the letter it becomes when Send is pressed
      LayerEntry.js            The sheet a page arrives on over the journal — from the side for forms, expanding from the cover for an entry, with swipes to the neighbours; on a desk it is either the right page (an entry, a listen) or a sheet on the spine (the owner's rooms), with a back caret
      LayerWaiting.js          What stands in while that entry loads
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
        SentBy.js              One line under the chips: who sent this record, and the trail behind them where it travelled. Replaced Chain.js, which is gone
        SenderTool.js          Saying who gave you a record — the ··· tool's Credit, unfolding in the Sent by slot
        TrackDial.js           One track, full screen, while you decide what it is worth; unfolds in the row, never over it
        PrintBar.js            The bar at the foot of the entry while it is being printed: the ground, the paper size, Save and Done
    session_components/        Everything in the private dashboard
      PasswordGate.js          The password screen
      AlbumPicker.js           Type, see a grid of covers with songs under them, tap one — the screen before a listen, or before a track note
      SessionHeader.js         The title line, the glowing question mark and the theme switch, and the four steps
      StarRating.js            The interactive stars you click to rate
      Trouble.js               Something in a listen went wrong, said in the site's own voice — two sentences, and whether the writing is safe
      steps/
        RecordContents.js      Overview — the strip, the record's facts and the tracklist; tapping a track starts there
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
      entry.css                The layer, the stand-in, the entry page, comments, corrections, the printer's bar and grounds
      idcard.css               The identity card, its editor, the About pane writing
      session.css              The listen: picker, header, four screens, the reference
      get.css                  /get — the steps and the button, and the story
      forms.css                Send, setup, settings, the password gate, compare, key
    manifest.js                PWA manifest — force-dynamic, so the name is not baked in
    feed.xml/route.js          The journal as an RSS feed
    entries/[slug]/
      page.js                  Loads the entry, hands it to FullPostPage
      FullPostPage.js          The full public entry page with comments — and, in preview mode, the session's preview
      TrackNotePage.js         A track note — an entry about one song: its card, read, corrected, and written for the first time on the listen's sheet
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
    setup/page.js              Claiming a copy, one screen at a time: the code, then name, photo, prompts, rig, updates, password, who gave it (GIFT_FROM, or a scan), and the home screen
    settings/page.js           The machinery, owner-only
    login/page.js              The door at an address — the same password form, for when a link will not do
    get/layout.js              The frame /get and /get/story share: the nav row, the measure, the type
    @layer/default.js          What the layer slot draws when nothing is open: nothing. The framework requires the file
    @layer/(.)entries/[slug]/page.js  An entry, opened as a layer over the journal instead of in place of it
    @layer/(.)submit/page.js   The send form, opened over whatever you were looking at
    @layer/(.)settings/page.js Settings, opened over the desk — the password gate when signed out
    @layer/(.)get/story/page.js  The long note, opened over /get
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
      feed/page.js             What the journals in the address book have logged
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
| Printing a record (the share printer) | components/main_components/EntryPlate.js draws the plate, hooks/usePress.js makes and saves the picture, Slug_Page/PrintBar.js is the bar, styles under .ln-print in app/styles/entry.css, app/printer/page.js opens it |
| The album picker | components/session_components/AlbumPicker.js |
| The note-taking session | app/session/page.js, styles in app/styles/session.css |
| The header above every session screen | components/session_components/SessionHeader.js |
| The session screens (overview, tracks, album, preview) | components/session_components/steps/ |
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
| `entries` | The journal. One row per listen — an album listened to twice is two entries, never an overwrite. `posted_at` is when, with its zone; `created_at` is the older naive stamp, kept and unread. `cover_code` is the dot that carried the cover into its code, stamped on the first tap — never the picture. `song` makes a row a track note, about that one song off the record in `album`; it is empty on every album listen, and nothing that numbers, counts or compares albums counts a row that has one. |
| `settings` | Everything that makes a copy someone's own: the keeper, the portrait, the links, the rig, the starting theme. Exactly one row, forced by a check on `id`. |
| `secrets` | What must never reach a visitor: the session secret, the password hash, the claim code, the setup window, and two API key columns nothing reads any more (Last.fm, retired 2026-09-16; Anthropic, retired 2026-09-18). One row; read only by `library/secrets.js`. |
| `users` | The owner. One row, written at setup. |
| `comments` | Replies on entries and on individual tracks, with a moderation queue. |
| `submissions` | Albums other people have sent you. `status` is pending, reviewed (a listen was started from the row), logged, or dismissed; `entry_id` is the record a send points at, set by hand on the row (*I've already logged this*) and never by matching; that press writes nothing on the record. `song` makes a send a track rather than a record, with the record it is off still in `album` and `artist`; empty is an album send, which every send before migration 026 is. |
| `waves` | Somebody added this journal and said so: one row per waving address, the name their journal gave when asked, when it arrived, and `seen_at`. No message column, now or later; Leave it deletes the row. |
| `came_back` | Records this journal put somebody onto, logged on their journal: one row per entry, keyed by their journal and slug, with what their feed said about it and `seen_at` for the inbox's dot. Written by the keeper's own browser, from the feed's match. |
| `people` | The address book: one row per journal address, the name that journal gave when it was filed, and `pinned_at` for the pinned row. The face is never stored. |
| `reports` | Problems keepers wrote in from their desks. Every copy has the table; only the one in `REPORTS_URL` is written to. |
| `needle` | What is on the desk right now, for the beacon. One row; it lifts itself when nothing has touched it for twenty minutes. |
| `sat_with` | A listen whose post was deleted: the record and when it was on, and nothing written. |
| `drafts` | A listening session in progress, so closing the tab does not lose it. |
| `briefings` | Cached album research. Nothing reads or writes it since 2026-09-18 — the research came out of the software and the schema is additive-only, so the table stays with whatever is in it (docs/RETIRED-PROMPTS.md). |
| `schema_migrations` | The migration runner's ledger: which files in `migrations/` have built this database. Backed up and exported, and never written back by a restore — it describes this database's shape, not the journal. |

Nothing keeps a list of these tables. The backup, the export and the restore
ask the database which it has (`library/whole_journal.mjs`), so a table a
migration adds is in the next backup without anyone adding it anywhere.

Two columns on `entries` are computed by Postgres and cannot be written to:
`rating_value` (the numeric score, so sorting works) and `album_key` (a
normalised album+artist string, which is how two journals recognise the same
record through different punctuation).

**Migrations are additive only** — add columns and tables, never rename or
drop one. The rule has been in force since 2026-09-06, and other people have
run copies since 2026-09-09: those are databases on machines nobody here can
reach, and a migration that fails is somebody's journal that stops opening. A
column nothing reads any more stays where it is.
