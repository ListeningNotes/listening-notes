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
- Individual entry pages where people can read your notes and write to you about them
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
- `/dashboard/inbox` — everything that has arrived, in one list: records sent
  to you, messages, waves, records that came back, and problems keepers
  wrote in
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
the password is chosen. Its first screen asks whether this is a new journal
or one being brought in from a copy made in Settings.

---

## Where Everything Lives

The library — logic, no visuals
  library/
    background_scale.js        The factor that shrinks the screensavers' artwork on a phone so it stays background; exactly 1 on a desk
    bioprompt.js               The nine sentence openings a keeper finishes on the card, the limit of three, and the reader that prints stored key-and-answer pairs
    came_back_actions.js       What came back: records this journal put somebody onto, logged on theirs — noticed by the feed, kept for the inbox
    carbon_copy.js             The journal as pages anybody can read: a Markdown page per entry, saying what the entry page says, zipped beside journal.json — made in the browser by Back up your journal
    card_links.js              The marks a card can wear — which shape stands for the rig, which logo a link gets
    claim_notice.js            The box printed in the build log while a copy is unclaimed
    code_shape.js              Two numbers about a code's shape — the quiet zone and the least version — read by the press and by the browser that sizes its picture
    cover_code.js              The same press for an entry's cover: the code for that entry's address, redrawn from the art on each ask, with only the proved dot kept on the row
    cross_references.js        Display-time linking: a mention of an album or artist in the archive becomes a link; [[brackets]] force one; COMMON_WORD_NAMES is the hand-edited blocklist
    database_actions.js        Everything to do with saving and loading entries — the wall's lean list, the public feed's allow-list, one entry, a record's folder, save/update/delete, drafts, briefings
    database_connection.js     Opens the connection to the database, on first use — on a deployment that hosts journals, the database of the journal the request is for, brought up to date the first time it is opened; and says a database failure in a sentence
    definitions.js             The shipped text for the three marks, and the merge of the owner's edits over it
    doorman.js                 Rate limiting, in memory: the doors, how many tries each allows, who is knocking, and the 429 answer — every count filed under its journal
    entry_formatter.js         The shapes an entry is written in: the horizon from track ratings, flawless (what Masterpiece means), tracks to and from prose, lookup_key, the edit stamp
    gold_burst.js              The gold sparkle fired when a Masterpiece is marked
    handoff.js                 What the wall leaves for the entry layer: the tapped record's first screen, the wall's order for swiping to neighbours, and how a layer arrived
    front_door.js              The front door: whether an address is free, the places left, making a journal through Neon's API, and clearing one nobody set up
    hosting_directory.js       On a deployment that hosts many journals: which journal lives at which address, the way into each one's database sealed, the journal a request is for, and the old address a journal moved off (FORWARDING_ADDRESS)
    install_guide.js           What /get needs: the deploy button's URL and the ten steps with their screenshots
    letterhead.js              LN. Admin letters: the canonical keeper's public key, checking a letter's seal, that it is for this journal and newer than the last, and pinning it as the one letter in messages; and the letter a journal writes itself asking for a copy (ask_for_copy), the one with a door
    keyring.js                 The passkeys: a row per device's key, the public half only; making a key and opening the door with one (@simplewebauthn/server); a key belongs to the exact address it was made at
    message_actions.js         Messages: somebody's words to the keeper — kept, listed for the inbox, opened, marked replied to, and dismissed, which deletes
    migrator.js                Brings the database up to date — from instrumentation.js on start, and from scripts/prepare_database.mjs at build
    music_data_api.js          Fetches album art and tracklists from iTunes, and the searches: records (searchAlbums) and songs (searchSongs)
    needle.js                  The beacon's reading half: the one row saying what is being logged now, lifting it, sat_with for deleted listens, and the recent listens under the beacon
    outbox.js                  Handing a record, or a song, to somebody in the book from this copy — this server to theirs, never the browser — and a wave, and a reply to a message
    people_actions.js          The address book: the people table, pinning, and asking a journal its keeper's name
    portrait_code.js           The press: the portrait made into the journal's QR code on the server — a dot of ink in every photo module, proved by the strictest reader on both page colours
    report_actions.js          Problems keepers wrote in from their desks — the reports table, and whether this journal receives them
    return_address.js          The back of the envelope — a sender's name and journal kept in their own browser — the one spelling an address is kept in, and addressFrom, what a copy calls itself from the request that reached it
    secrets.js                 The vault: the session secret, the password hash, the spare key's hash, the claim code, the setup window, and two retired key columns. Database first, environment second; seal_claim writes the claim inside a restore's own transaction; the spare key is made, described and spent here
    sent_actions.js            The `sent` table: a send that landed, written down; what is still out, read against came_back; a row removed
    session_timers.js          Track length display (m:ss)
    settings_actions.js        The settings row: read (never the portrait blobs), write through an allow-list, the name, isSetUp, and the one-column keeper-name reader the feed uses
    sitewide_visuals.js        Colours and fonts as JS, for canvas and chart code that cannot read a custom property; the stylesheets are the source
    slug_generator.js          Turns "Pet Sounds" into "pet-sounds" for the URL
    submission_actions.js      Albums other people sent you: saving one, its four outcomes, the record a send became, and naming its sender once they have a copy
    unpacking.mjs              Putting a journal back: reading its file (a zip or journal.json), the plan — order from the foreign keys, refusals, what is left alone — and one transaction; shared by scripts/restore.mjs and /api/restore, so the terminal and setup restore alike
    updater_link.js            The pre-filled GitHub new-file page that installs the updater, on the copy's own branch — read by api/update and by /updates/go
    version.js                 Which version this copy is running (from package.json), where its release notes are, and where a report goes — read by the pitch pane, the desk and the report sheet; and SANDBOX, whether this build is a preview nothing may leave (docs/OPERATIONS.md)
    wave_actions.js            The waves that arrived here: one row per waving journal, replaced not stacked, deleted when left
    whole_journal.mjs          Which tables the journal has, asked of the database, and one table's rows as Postgres writes them — shared by the nightly backup and the export, so neither keeps a list; and when a copy was last made (copy_begins)
    wristband.js               Session auth — issues and checks the JWT cookie (__Host-ln_session in production, locked to its address), renews it, guards routes and pages, and reads a band only from the journal's own pages

The update button
  .github/workflows/update.yml   Ships in every copy: Actions → Update this copy → Run workflow, and once an hour on its own
  scripts/update_copy.mjs        What the button does — fetched from upstream each run: graft, merge the latest release, push, or stop and say which files clash

The other scripts — run by hand or by a machine, never by the site
  scripts/backup.mjs             Every table to $BACKUP_DIR/<timestamp>/ with migrations/ beside it; 30 kept; carries secrets; counts as a copy (docs/OPERATIONS.md)
  scripts/letterhead.mjs         The canonical keeper's, on her Mac: makes the LN. Admin key (its private half in the Keychain) and seals and posts a letter to the journals it concerns
  scripts/hosting_directory.mjs  The hosting directory by hand: its key and way in kept in the Keychain, a journal placed at an address (way in off the clipboard), the addresses listed and checked, a journal moved in at a new address
  scripts/restore.mjs            Puts a backup or an export back — a folder, the zip from Make a copy, or a bare journal.json; a dry run without --yes; empties only the tables the file holds. The restore itself is library/unpacking.mjs
  scripts/prepare_database.mjs   Runs before next build: migrates and prints the claim notice; never fails the build

The lint gate — git runs it, on a machine that has opted in
  .githooks/pre-commit           Runs npm run lint before every commit and refuses the commit on an error; on only after git config core.hooksPath .githooks, once per clone (AGENTS.md, Commands)

Before the first request — two files whose names are Next's, not ours
  instrumentation.js             The startup hook: migrates before the first request and prints the claim notice while the copy is unclaimed
  proxy.js                       Next's middleware under its new name: copies the pathname into a header for the layout, and sends every page's content security policy (only scripts stamped for this request run)

The front doors — receive requests, hand them off, send back responses
  app/api/
    entries/route.js           Load all entries / save a new one
    entries/[slug]/route.js    Load, edit, or delete one specific entry
    entries/[slug]/code/route.js  GET: the entry's code, pressed out of its cover — public, rate-limited, cached a day
    entries/[slug]/color/route.js GET: the entry's cover color for By color, read on the server only for a cover a page may not read (Bandcamp, Discogs) — the saved cover only, public, rate-limited, cached a day
    drafts/route.js            Unfinished listens — owner-only both ways, the read included
    drafts/[id]/route.js       DELETE one draft
    format/route.js            Assemble your notes into a post (local, no model)
    messages/route.js          Messages — POST is public: from a person on an entry here, from another copy's server replying, or an LN. Admin letter, kept only with a good seal (library/letterhead.js); GET, PATCH and DELETE are the keeper's
    submissions/route.js       POST: a send arrives — from the visitor form or from another copy's server; GET for the owner
    submissions/[id]/route.js  One send: settling it, saying it was already logged, naming who it came from; owner-only
    settings/route.js          The settings row — public to read, owner-only to write
    people/route.js            The address book — owner-only: the list, and filing an address
    outbox/route.js            Where a send leaves from — owner-only: the person resolved out of the address book, the record (or the song) handed to library/outbox.js, which posts to their copy's /api/submissions, and a send that landed written to `sent`; a wave goes the same road, and so does a reply, whose recipient is read off the message it answers
    came-back/route.js         What came back — owner-only: the inbox's list, what the feed noticed, a row opened, and a row dismissed
    sent/route.js              What this journal sent that has not come back — owner-only: the inbox's Sent list, and a row removed; written only by outbox/route.js
    waves/route.js             Waves — POST is public, from another copy's server: a journal and a name, nothing else, checked and counted; GET, PATCH and DELETE are the keeper's
    people/[id]/route.js       One person: reading them, crossing them out
    reports/route.js           A problem written in — POST from any copy (rate-limited, cross-origin), GET for the owner
    reports/[id]/route.js      Marking one read or dismissed
    secrets/route.js           The vault — owner-only both ways; says what is set, never the value
    setup/route.js             GET: is this copy claimed. POST: the one write that claims it — with a password, or with the key just made and none; the ring keeps only the keys the claim names
    restore/route.js           Bring your journal — POST, behind setup's wristband and only on a copy nobody has claimed: the journal from Make a copy and a password or the key just made; restored with library/unpacking.mjs, never the vault or the keyring, and claimed in the same transaction (the password if any, the keys the claim names and no others, this copy's address, the Board's old code gone)
    auth/login/route.js        The password, the deploy-time variable, the spare key (once, and spent by it), or — unclaimed — the claim code
    auth/check/route.js        Am I still wearing a valid wristband; renews an ageing one on the way
    auth/logout/route.js       Cuts the wristband off
    auth/passkey/route.js      Opening the door with a passkey: GET hands the device a challenge and says whether there are keys; POST is its signed answer, counted by the login door, and leaves wearing the wristband the password gives
    keyring/route.js           Your keys — owner-only: the list with the spare key's state and where the password comes from, making a key on this device, making a spare key (shown once), taking a key off; never the last way in
    waiting/route.js           How many sends are waiting on the keeper — the desk's number; messages are never counted; whether anything is new (the dot on Inbox); and where the journal asks for a copy of itself
    needle/route.js            Where a listen says what it is on — owner-only, write only; the read is public/beacon
    portrait/route.js          The keeper's picture: uploaded into a column, served back from it, removed
    portrait/code/route.js     POST: press the journal's code out of the stored portrait — owner-only, no body
    export/route.js            The whole journal as one JSON file — owner-only; leaves secrets out. Settings zips it beside a readable page per entry. Written down as a copy, which takes the letter asking for one away
    update/route.js            Is there a newer Listening Notes — the latest public release against package.json, at most once an hour, owner-only
    public/beacon/route.js     What the keeper is listening to — anyone may ask; cached at the edge
    public/entries/route.js    The public feed another copy reads — PUBLIC_FIELDS only, with keeper_name beside them
    public/stamps/route.js     The card's counted facts — records, songs, first entry, top genres, the two flag counts
    public/listing/route.js    The code the directory issued this journal, as plain text, or 404 — how the registry proves the address
    public/people/route.js     The people this journal's keeper added who are on the Board themselves — a name and an address each; never anybody kept private, nothing while the keeper is off the Board; checked against the directory with hashes; kept a minute. What makes "a friend away"
    front-door/route.js        The front door only: GET the places left or whether an address is free; POST makes a journal and says where its setup is (the claim code after #)
    friends/beacons/route.js   Everyone in the address book's beacon, through one door — owner-only; each journal's public beacon in parallel, a round kept a minute, a journal that fails asked less often, thirty on the timer — and each friend's /api/public/people on the same round, which makes `away`, the Board's friends of friends (two rings only)
    listing/route.js           On the Board — owner-only: GET says whether this journal is listed and on the Board, and lists it if it is meant to be and is not yet (on by default, 2026-10-08); POST is the switch in Settings, through library/outbox.js
    board/route.js             Everything the Board reads, through one door on this journal (Miyel: keep the fan-out behind a single route): the first screen, a search, the keeper's own records matched (behind the wristband), and lines of keepers' own writing read from their journals by this server — 2.5 s each, kept ten minutes, back-off, only journals on the Board, counted per asker. The Board component talks to this and nothing else
    directory/route.js         The registry's list — public, read across origins: `?board` is the Board's first screen (everybody logging right now, a shuffled dozen of everybody else, the last day's records, and the community's two counts); `?q=` looks up a name or a record; `?among=` which of some hashed addresses are on the Board; `?alike=` who else logged some hashed records; plain, thirty journals and a cursor. Read from the tables, never from the journals; after answering, one round of the refresh (`gather`, only the journals due) — how the Board stays current since 2026-10-17
    directory/listings/route.js  A journal asking to be listed (POST: issue the code, read it back, keep the row) or to leave (DELETE: the code, and the journal having forgotten it)
    directory/gather/route.js  One round of the refresh on a schedule, behind CRON_SECRET — optional since 2026-10-17, when a look at the Board started setting off the same round; kept for an outside schedule and for hosting

The hooks — reusable logic shared across pages
  hooks/
    useEntryEditor.js          The draft of an entry while its keeper corrects it in place; fetches the credit fields separately, since public reads strip them
    useHoldStill.js            Locks every scrolling ancestor behind an open overlay so nothing under it moves
    useJournalHost.js          The journal's host; usePasswordName, the keeper's name as the hidden username a password manager files the password under
    useFriendsBeacons.js       Asks /api/friends/beacons once a minute while the Friends room is on screen — one poll shared by every caller — and keeps a journal's last word through a failure
    useListeningBeacon.js      Asks this journal's own beacon every 15 seconds — one poll shared by every component that draws it — logging or last logged
    useListeningSession.js     All session state — the record, tracks, notes, score, preview, saving; SESSION_STEPS
    usePress.js                The share printer as a hook: make the picture at a size, save or share it, copy the address
    useSessionDraft.js         The listen's draft — the browser's copy and the row in drafts — autosave, restore, cleanup
    useSpineWidth.js           The spine — the left page of the open book on a desk: how wide, remembered per browser, clamped, dragged by the fold

The furniture — visual pieces
  components/
    main_components/           Everything on the public side
      HomeNav.js               The cross itself — on a phone a rail of panes with the band at the foot (Card, Beacon, People, Inbox for the keeper; Card, Beacon, People for a visitor where there is a directory). People is the book's pane with two words in the bar, Friends · Board, each with its count: the faces and the feed under one, the directory's list under the other; on a desk an open book — the spine on the left, the journal on the right, the fold, and a control in the spine's header to turn between its two pages
      About.js                 One face of the turning pane: the card, then the writing under it, in one scroll
      IdentityCard.js          The ID: the portrait full width and square — the same object an entry's album art is — then the name, four counts — albums, songs, and the two flags in their colours — and the pinned record or song. Send and Add left it on 2026-09-19, and left the beacon too on 2026-09-27; a visitor sees the keeper here and nowhere else. This is the About page
      IdentificationCardEditor.js  Editing the card in place
      ListeningBeacon.js       The beacon — what is playing, or last played
      ListenBar.js             The way into a listen: a bar at the foot of home, the session closed — Start a listen at rest; with a listen lowered, its cover, the lit track and the live dot. Both raise /session as a sheet; the one thing shaped like a button
      Journal.js               The wall of covers, with its search, filters and views (In order, A–Z, by month, era, genre, rating; then time of day, shape, color, Shuffle; grouped views draw band headings, By color reads each cover in the browser)
      JournalFilters.js        The filters, dropping from the wall's line on a phone and a desk alike — kind (albums or tracks), genre, the year range and the marks; it takes records away, the views rearrange them
      AlbumTile.js             One record on that wall — a card for a record with a listen behind it, a page with its corner folded for a record known only by its track notes; the folder shape went on 2026-10-13 (Journal.js gathers entries into records, by title, artist and year)
      FolderFooter.js          A folder's tabs at the foot of the screen — Listen 1, Listen 2 or the song, the one you are on in ink — the one piece of chrome a folder adds; useFolder in LayerEntry.js does the flipping
      CodeSlot.js              A square that holds a picture and turns into that picture's code — the card's portrait and an entry's cover: the two faces, the copy and its pill, the corner mark, the wait
      AddressCode.js           A plain code for an address, drawn in the browser — what CodeSlot shows when no pressed picture can be had
      CodeScanner.js           The camera pointed at a code — the address book's way in for a card's or a cover's code
      GiveSheet.js             Give: a code to listeningnotes.blog/get?gift=<this journal>, for a friend who has no copy — the gift at the left of the address book's header, opposite Add
      WaveSheet.js             Just added somebody: "[name] is in your address book", Wave to [name] or Not now — the one moment a wave is offered
      Dashboard.js             The desk, for the owner — Start a listen as a band, then Inbox, Feed, Address book and Settings as rows; the header holds the mark alone. On a desk only since 2026-09-19, as the spine's second page
      Friends.js               The address book as a grid of faces, pinned first; a face opens its three doors in place under its own row. Friends, under People, and /dashboard/people
      Feed.js                  What the people in the address book logged, read off their public feeds; Submissions and Recent; Compare on a row you also have. Its own page at /dashboard/feed since 2026-09-15
      Header.js                The phone's top row — the keeper's face (to the card), the light switch, and Home · People · Inbox with only the lit one wearing its word; a visitor's has the mark instead of words. It replaced the band at the foot (Footer.js), 2026-10-22
      PullDown.js              Pull down to refresh: at the top of a scroller, the mark and a line in the gap the page opens, then asking — on the People pane first, Friends and Everyone alike
      EditingBar.js            The band at the foot of anything being corrected — what you are in the middle of, and Save and Cancel as words
      UpdateSwitch.js          Switching on the updater — a screen in setup, a section in Settings: hands the keeper a pre-filled GitHub link for the workflow file, then watches for the rebuild
      InstallSteps.js          /get's ten steps as tiles, plain HTML, with a ring over what to press where a picture exists
      MarqueeTitle.js          A title too long for the small beacon scrolls one lap and holds
      KeeperTools.js           The owner's ··· — top right on both, Edit/Print/Delete on an entry and Edit/Print on the ID pane; the door stays put and the tools file out of it
      SharePrinter.js          The press's toolbox, not the press: the paper sizes (FRAMES), the page's two colours, and the canvas tools a plate draws with. The press itself has been hooks/usePress.js since 2026-09-13
      EntryPlate.js            A record cut as a plate — the entry page's first screen on the record's blurred colour: mark, keeper, cover, album, artist and year, stars, chips, date, horizon; no code, the press copies the address
      WritingAccess.js         The lock at the foot of the card for a visitor, the glyph over Unlock — shut, open while the door it opens in place; on a device that has unlocked with a key before, one press goes straight to Face ID
      ComingSoon.js            What a held copy shows instead of a site — unclaimed, no database, database unreachable, or no journal at the address
      FrontDoor.js             The front door's pages, drawn by the layout in place of a journal: Start a journal and Find my journal at /, Choose your address at /get
      AddToHomeScreen.js       The one step the software cannot do: the last screen of setup, and a Settings section
      Keyring.js               Your keys, in Settings: each device's key, + Add this device (Face ID or its like), a key off in two presses; then the password (changed in place) and the spare key (made, and shown once). Also the browser's half of keys — whether it can hold one, whether it has unlocked with one — KeyOffer, Use Face ID next time?, drawn after the password and at the card's foot, and KeeperFoot, the foot's one question a visit: Face ID, then the spare key
      JournalCopy.js           Back up your journal, in Settings: Make a copy fetches the export and holds it as a zip — journal.json, Read me.txt and a page per entry (library/carbon_copy.js) — then Save (the share sheet on a phone, Downloads on a computer)
      AlbumFinder.js           Type, see covers, pick one — the stranger's send form's search (/submit)
      MiniAddressBook.js       The address book as a strip of faces, for picking one person — the entry editor's Sent by, the inbox's send whose sender has since got a copy, and the send sheet's book, as a grid
      SentList.js              The inbox's Sent page, behind the door at its top: what this journal sent that has not come back, each row opening on what was said with it, Visit and Remove
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
        MessageForm.js         The form a message is written in, and MessageWayIn: "Message" and the keeper's name under an entry's album note
        TrackThread.js         A track row, with its note under it when it has one
        HorizonBar.js          The bar chart on the full entry page
        MetadataLabel.js       The small uppercase section labels
        Chip.js                The small pill tags (Favorite, Masterpiece, etc)
        SentBy.js              One line under the chips: who sent this record, and the trail behind them where it travelled. Replaced Chain.js, which is gone
        SenderTool.js          Saying who gave you a record — the ··· tool's Credit, unfolding in the Sent by slot
        TrackDial.js           One track, full screen, while you decide what it is worth; unfolds in the row, never over it
        PrintBar.js            The bar at the foot of the entry while it is being printed: the ground, the paper size, Save and Done
    session_components/        Everything in the private dashboard
      PasswordGate.js          The door: Only [keeper] can write here., Unlock and use your password where the journal has keys; the password in a soft well where it has none; the claim code on a copy nobody has claimed; and, after the password, the offer to use Face ID next time
      AlbumPicker.js           Type, see a grid of covers with songs under them, tap one — the screen before a listen, or before a track note
      StarRating.js            The interactive stars you click to rate
      TrackRow.js              One track in the session's list — number or the live dot, the name, stars and heart set in place; on the track being logged, *Any notes?* or the note, and the field under the row when it is open, with the envelope at its foot
      Trouble.js               Something in a listen went wrong, said in the site's own voice — two sentences, and whether the writing is safe
      steps/
        AlbumNotes.js          The top of the session — cover, title, artist and year, the album's stars and marks, the album note behind *Any notes?*
        TrackNotes.js          The tracks — the label, the horizon, every track as a row (TrackRow.js)
        SessionPreview.js      The second step — the real entry page (FullPostPage in preview mode) on its own sheet, with Return to session and Save to journal at its foot
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
      entry.css                The layer, the stand-in, the entry page, the way to write to its keeper, corrections, the printer's bar and grounds
      idcard.css               The identity card, its editor, the About pane writing
      session.css              The listen: picker, header, four screens, the reference
      get.css                  /get — the steps and the button, and the story
      forms.css                Send, setup, settings, the password gate, compare, key
    manifest.js                PWA manifest — force-dynamic, so the name is not baked in
    feed.xml/route.js          The journal as an RSS feed
    updates/go/route.js        Owner-only redirect to the updater's GitHub page — tapped on the journal, not on github.com, so a phone's GitHub app never swallows it
    entries/[slug]/
      page.js                  Loads the entry, hands it to FullPostPage
      FullPostPage.js          The full public entry page — and, in preview mode, the session's preview
      TrackNotePage.js         A track note — an entry about one song: its card, read, corrected, and written for the first time on the listen's sheet
      opengraph-image.js       The picture an entry's link unfurls into — cover, title, score, marks — drawn on the server per request
    archive/page.js            Every entry — search, views, filters
    key/page.js                What the stars and the three marks mean
    submit/page.js             Send the keeper an album
    shuffle/page.js            Redirect to a random entry
    get/page.js                Get your copy: ten steps, then the deploy button. 404s while the long note is unwritten
    get/gift-preview/route.js  The picture a gift link (/get?gift=) unfurls into — /get's "A gift from" card — when the giver's journal answers
    get/story/page.js          The keeper's long note. 404s when unwritten. Linked from nowhere for now
    about/page.js              Redirect to / — the identity card is the about page
    session/page.js            The listen — picker, then four screens under one header
    printer/page.js            The share printer — the press on a record for the keeper (?entry=slug); the sentence for everyone else and for the card, whose plate is still to come
    setup/page.js              Claiming a copy, one screen at a time: the code, then two ways — Start a new journal (name, photo, prompts, rig, the way back in — Face ID first, or a password — the spare key when there is no password, updates, who gave it (GIFT_FROM, or a scan), the home screen) or Bring your journal (the zip from Make a copy, read and said back in the browser, then the same way back in, updates and the home screen)
    settings/page.js           The machinery, owner-only — the address, On the board (the one switch off the Board), the password, the backup, updates, the home screen
    directory/page.js          The Board at its own address, on every copy, absent where DIRECTORY_URL is empty. directory/Directory.js holds `Everyone` (the Board on screen) and the one shared reading of it, `readEveryone`, all of it read through /api/board: for the keeper the one note until dismissed, then for everybody the search by name, logging right now (the Friends room's band, community-wide) and further out (a shuffled dozen); a check on people in the book and Visit · Add on a press for the keeper — drawn here and under People on the cross
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
      inbox/page.js            Everything that arrives, in one list: each row carries the mark of its kind and opens where it sits to its doors — plain, on the tokens, and a sheet over the desk; an LN. Admin letter pinned above it, the LN. mark for a face, Dismiss its only door
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
| The Listen bar at the foot of home | components/main_components/ListenBar.js, styles under .lb in app/styles/nav.css |
| The session as a sheet, and lowering it without ending | LayerEntry.js `sheet` (.lay--sheet in app/styles/entry.css); the before-leaving hook and keepInHand in app/session/page.js; putDown in hooks/useListeningSession.js |
| The album picker | components/session_components/AlbumPicker.js |
| The note-taking session | app/session/page.js, styles in app/styles/session.css |
| The session's one screen and its preview | components/session_components/steps/ |
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
| `entries` | The journal. One row per listen — an album listened to twice is two entries, never an overwrite. `posted_at` is when, with its zone; `created_at` is the older naive stamp, kept and unread. `cover_code` is the dot that carried the cover into its code, stamped on the first tap — never the picture. `song` makes a row a track note, about that one song off the record in `album`; it is empty on every album listen, and nothing that numbers, counts or compares albums counts a row that has one; the card's Songs counts exactly those rows. |
| `settings` | Everything that makes a copy someone's own: the keeper, the portrait, the links, the rig, the starting theme. Exactly one row, forced by a check on `id`. |
| `secrets` | What must never reach a visitor: the session secret, the password hash, the claim code, the setup window, and two API key columns nothing reads any more (Last.fm, retired 2026-09-16; Anthropic, retired 2026-09-18). One row; read only by `library/secrets.js`. |
| `users` | The owner. One row, written at setup. |
| `comments` | What was said under entries until 2026-09-29, when comments became messages. Nothing reads it; the rows stay, less any whose message was dismissed or whose entry was deleted. |
| `messages` | Somebody's words to the keeper, drawn in the inbox and nowhere else. Who it is from, what was said, the entry it is about as a journal and a slug with the record as it was, the line it answers when it is a reply, `seen_at` for the dot, `replied_at`, and `comment_id` with `was_comment` for one that used to be a comment. Dismissing deletes the row. |
| `submissions` | Albums other people have sent you. `status` is pending, reviewed (a listen was started from the row), logged, or dismissed; `entry_id` is the record a send points at, set by hand on the row (*I've already logged this*) and never by matching; that press writes nothing on the record. `song` makes a send a track rather than a record, with the record it is off still in `album` and `artist`; empty is an album send, which every send before migration 026 is. |
| `waves` | Somebody added this journal and said so: one row per waving address, the name their journal gave when asked, when it arrived, and `seen_at`. No message column, now or later; Leave it deletes the row. |
| `came_back` | Records this journal put somebody onto, logged on their journal: one row per entry, keyed by their journal and slug, with what their feed said about it, `seen_at` for the inbox's dot and `dismissed_at` for one put away — kept, so the feed does not bring it back. Written by the keeper's own browser, from the feed's match. |
| `sent` | Records this journal sent from its own copy, written once the other journal took them (from 2026-10-15; nothing before was kept): their address, the name the book gave them, the record or song, the cover and the note. Waiting until a `came_back` row from the same journal names the same record, matched when the list is read, or until the keeper removes it, which deletes the row. |
| `people` | The address book: one row per journal address, the name that journal gave when it was filed, and `pinned_at` for the pinned row. The face is never stored. |
| `reports` | Problems keepers wrote in from their desks. Every copy has the table; only the one in `REPORTS_URL` is written to. |
| `needle` | What is on the desk right now, for the beacon. One row; it lifts itself when nothing has touched it for twenty minutes. |
| `sat_with` | A listen whose post was deleted: the record and when it was on, and nothing written. |
| `drafts` | A listening session in progress, so closing the tab does not lose it. |
| `briefings` | Cached album research. Nothing reads or writes it since 2026-09-18 — the research came out of the software and the schema is additive-only, so the table stays with whatever is in it. |
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
