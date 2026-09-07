# NOTES.md

What is pending, what is done, and what cost real time. This file is for Miyel.

**Three files, three jobs.** Keeping one of them out of the other two is the
only reason all three stay current.

| File | Holds | For |
|---|---|---|
| [README.md](README.md) | What this is and how to run a copy | Strangers |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Where everything lives, what to change | Anyone working on it |
| [docs/OPERATIONS.md](docs/OPERATIONS.md) | Backups, restore, export, keys | Whoever keeps a copy running |
| [docs/LICENCE-NOTES.md](docs/LICENCE-NOTES.md) | The appendix notice, §13, the DCO | Anyone who asks |
| [docs/NOTES-ARCHIVE.md](docs/NOTES-ARCHIVE.md) | Complete, before September 2026 | Nobody, unless they are digging |
| **NOTES.md** | Pending, Complete, gotchas | Miyel |
| [DECISIONS.md](DECISIONS.md) | What is settled, and why | Read every session |

---

## End of session — update these files

**Standing instruction. Do this without being asked, every session.**

Before wrapping up:

- Move finished items to **Complete**, with the date.
- Add anything new to **Pending**.
- Record any gotcha that cost real time under **Gotchas**.
- A decision goes in **DECISIONS.md** only if a future session would reopen
  it, or repeat a mistake, without the entry. The rule and one reason, six
  lines at most. Everything else is a commit message or a Gotcha.

**Read [DECISIONS.md](DECISIONS.md) at the start of every session.** If
something in it comes up, the answer is already written down. Do not
re-propose anything listed as ruled out.

---

## Writing code in this project

Miyel's own working rules. These lived in the README until 2026-08-31, where
they were three audiences deep in a file a stranger reads to decide whether to
deploy a copy — and none of it is anything they need.

- Edit JavaScript files directly in VS Code
- For .env.local use the terminal, not VS Code (VS Code silently fails to save it)
- When writing Python scripts that contain JavaScript with backticks, write to a temp file first, never use heredoc
- Always commit after something is working and tested
- git restore filename will undo changes to a single file if something goes wrong. Think of it like a checkpoint.

---

## Working With Claude

**Naming new code — always ask first.** Before creating ANY new function, page (route), or JavaScript file, Claude must pause and let me name it — propose options, then I pick or override. This applies to NEW things only (editing/renaming existing code follows the normal flow) and to every session. Reason: I want to be able to read and understand my own code later, even without a tool to explain it — names I chose are names I'll recognize.

---

## Pending

- [x] **The stray database `ep-old-sea-am0rc38b`** — it was the `dev` branch; deleted in the Neon console 2026-09-06. What it was: A copy of the live one,
      written to from localhost for four days. Find it in the Neon console —
      likely a branch or a second project — and delete it once nothing there
      is wanted. It holds the September 2 essay draft and possibly `secrets`
      rows from a rehearsal. The live database has zero `secrets` rows, so
      the live site still signs in with the environment's `SESSION_PASSWORD`.

**Fresh-account test passed 2026-09-02** — see DECISIONS. What is left of
this list is what to keep an eye on rather than what to prove:

Everything below it was built blind against one claimed database. Watch for:
- the deploy button: does `products=` attach a Neon database and set
  `DATABASE_URL` after the sign-in redirect? If not, the bare
  `?repository-url=` form plus the "no database yet" page is the path.
- the build log: is the claim code box visible on the deploy screen?
- `/setup`: claim code at the gate, then seven screens, Skip on each, password
  with confirm; does Safari offer to save the password?
- the landing: no Last.fm → the wall of covers under the crown, saying
  "Nothing logged yet."
- Settings: the Last.fm key pasted there reaches the beacon; the Anthropic
  key pasted there turns the Research button on (`research_available` reads
  `has_anthropic_key`).

**`/setup?rehearse`** — shows the setup screens on a claimed copy, owner
only, writing nothing (added 2026-09-02 to look at the screens without a
fresh database). Next moves on without saving; the photo previews locally.
The header says so. On a real first run the flag does nothing.

**Screenshots for `/get/install`** — nine per device, drawn only when
present, so the page reads fine until they exist. Two sets, because the page
has a phone/laptop toggle: `public/install/phone/` and
`public/install/laptop/`, same nine names in each: `01-button.png` (Vercel's
clone screen), `02-github.png` (Vercel's sign-in with Continue with GitHub),
`03-connect.png` (GitHub's permission screen), `04-name.png` (Git Scope and
Private Repository Name), `05-neon.png` (the Neon panel with the Auth toggle),
`06-build.png` (the build log or the Congratulations screen),
`07-holding.png` (the "isn't ready yet" page with Set it up), `08-setup.png`
(the name screen), `09-homescreen.png` (the last setup screen on a phone; the
browser's add-to-Dock on a laptop).

**Names to confirm** — chosen without asking, because the session was
autonomous. Rename freely: `secrets` (table), `library/secrets.js`,
`library/claim_notice.js`, `scripts/prepare_database.mjs`, `/api/secrets`,
`beacon_available`, `/?edit=card`, `.st-*` and the setup page's `.su-*`.

**Names to confirm, 2026-09-03** — the `/get` rebuild, also autonomous:
`components/main_components/InstallSteps.js` (the steps and the toggle),
`library/install_guide.js` (the deploy and source URLs plus the step text,
read by both server and client), `app/get/layout.js`, the `?on=phone|laptop`
query key, the `.get-*` classes, and branch `get-rebuild`.

**Settings may want the photo, prompts, links and rig outright.** The brief
said so; what shipped lists them as doors to the card, on the
edited-where-it-prints rule. Miyel's call — see DECISIONS.

**DO THIS FIRST — the send flow's columns are not on the live database**

Five statements. Until they have been run, **the inbox shows no submissions at
all** — `pull_submissions` selects three columns that do not exist yet, so
`/api/submissions` answers 500 and the page's `.catch` renders "No pending
submissions" rather than an error. It looks like an empty inbox and it is a
broken read. Sending is blocked the same way, and fails loudly.

```sql
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS album_art text;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS collection_id text;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS sender_url text;
ALTER TABLE drafts ADD COLUMN IF NOT EXISTS received_from text;
ALTER TABLE drafts ADD COLUMN IF NOT EXISTS received_date date;
```

All five are additive and nullable, so nothing existing changes and no row is
rewritten. Run them in Neon's SQL editor. Take a backup first (`npm run
backup`); this is the production database and there is no other one.

**DO THIS FIRST — the prompts column is not on the live database**

`migrations/001_initial.sql` has it, the runner applies it, and the card's save writes it.
Until this statement has been run, pressing save on the card fails:

```sql
ALTER TABLE settings ADD COLUMN IF NOT EXISTS bioanswers jsonb;
```

Reads are safe either way — `pull_settings` does `SELECT *` and a missing
column just comes back as null — so the site renders fine right now. It is
only the write that breaks. Run it in Neon's SQL editor. Take a backup first
(`npm run backup`); this is the production database and there is no other one.

**SHIPPING A COPY** — the gap between "it runs here" and "someone else can run it"

The four below, plus SCALING further down, are what stands between this and
somebody else installing it. Two are structural and unbuilt — there is no
migration runner and no welcome screen — and until both exist a fresh account
cannot be tested end to end.
- [x] **Migration runner** — done 2026-08-31. `library/migrator.js`, run from
      `instrumentation.js` on server start, ledger in `schema_migrations`,
      files in `migrations/`. A fresh copy builds its own tables and nobody
      opens a SQL editor. `schema.sql` is retired; `migrations/001_initial.sql`
      is the whole schema and the thing backups now carry.

      Both claims are checked, and the second one caught a bug: rehearsed
      against an empty schema, 001 produced nine tables, eighteen indexes and
      **zero foreign keys**, because the DO blocks matched constraint names
      without scoping to a table. Scoped by `conrelid` now, and the rehearsal
      gives 9 / 18 / 3.
- [x] **Welcome screen** — done 2026-08-31. `/setup` → `WelcomeScreen`, writing
      through `POST /api/setup`. Four fields: name, address, logging-since,
      Last.fm. The password comes first, as `PasswordGate bare`.

      An unclaimed copy holds its whole site behind `ComingSoon` rather than
      redirecting — a stranger should not land on somebody's setup form even
      though it is behind the same password as everything else. `proxy.js`
      carries the pathname so the layout can exempt `/setup`; it does no
      database work, because a read there would be a read per request.

      `isSetUp()` is a separate reader that does NOT catch. `pull_settings`
      swallows errors and returns `setup_complete: false`, so a gate built on
      it would read a database outage as an unclaimed journal and hold a live
      site. It caches once true, since the latch never goes back.

      Not re-enterable: it redirects home once claimed. **That leaves
      `keeper_name` with no editor** once a `display_name` is set — the card
      editor writes `display_name` instead. Real gap, see below.
- [x] **Deploy button** — done, and no longer lands on a copy with no schema: the migration runner builds the tables and the welcome screen asks who it belongs to.
- [ ] **`/api/export`** — a copy should be able to hand its owner their own data back.

**STRUCTURE** — see DECISIONS.md before starting any of these

The cross is built and merged. What is left of it:

- [x] **`usePlaceKeeper` is not needed and will not be built.** It was going to remember the pane index and the per-pane scroll offset across a route change, because browsers do not restore nested scroll containers. Going out to an entry and back is the only thing that lost them, and an entry is a layer now — the cross never unmounts, so both survive on their own. Verified: pane scroll 991 before and after, and the rail still on the beacon pane.
- [ ] **The journal's own address has no preview picture.** An entry's does
      now; the root should unfurl as the card. That is the printer's plate,
      so it waits for the printer rather than growing a second card.
- [ ] **`useShake` + `firework()`** — shake the phone, a firework goes up, then `/shuffle`. The route stays (kept on purpose 2026-09-06); the shake is the only way in that is still meant to exist, since the pill came off the foot of the wall.
- [ ] **The share page's lint fix is unverified in the browser.** `chosen` is
      now derived from the fetched record rather than set in an effect, and the
      "Drawing…" line is written from a frame callback. Build and lint pass;
      the page needs a signed-in look at `/dashboard/share` to confirm both
      slides still draw and the status line settles to blank.
- [ ] **A QR on the pitch pane.** DECISIONS already settles that the right pane produces a fixed code to `/get`, the same on every copy. Not built, and the "logo made of the QR" idea is unresolved.
- [ ] **DECISIONS.md is 1,888 lines and read at every session start.** The
      2026-09-06 entries were cut first (23 → 14, none over six lines; three
      to the archive, two lessons to Gotchas, the rest shortened or dropped).
      The older 250 entries are next, by the same test, on Miyel's go.
- [ ] **PARKED until Junior has a copy — Compare wants two homes** — one on an individual album, for comparing that record against another, and one on the About pane for comparing the collection overall. It is reachable from neither today; the route works if you type it.
- [ ] **PARKED until Junior has a copy — Surprise (`/shuffle`) has no way in.** Work in progress by decision — the shake is the intended gesture and is not built. See DECISIONS.

**THE CROSS'S TWO OPEN PROBLEMS** — attempted 2026-08-29 and reverted whole

Both are real and neither is built. Read the ruled-out list in DECISIONS before
starting: three approaches were tried in one session and every one of them left
the cross worse than not touching it.

- [ ] **Down should feel like arriving, not scrolling.** The album page has the
      shape — a card that holds still, then a screen of writing that scrolls
      inside itself — and Beacon and About are one long scroll instead. The
      structure was built and reverted: it is right, and it cannot go on top of
      the gesture problem below. Do that one first.
- [ ] **You should not slide sideways out of a pane's lower half.** The carets
      already hide down there; the swipe does not.

The thing under both: a pane is a vertical scroller inside a horizontally
snapping rail, so every gesture is negotiated between two axes. `main`'s
behaviour is the baseline to beat — it scrolls smoothly and it sticks slightly
at the top of a pane. Anything that scrolls worse than that is worse, however
much else it fixes.

**PARKED** — decided, deliberately not being built yet

- [ ] **Theme and the key's wording in Settings.** Both editors were built on
      2026-09-01 and taken off the page the same day. `settings.theme` exists
      and the layout honours it if set; `definitions` exists and nothing
      writes it. Put either back by restoring its Section in
      `app/settings/page.js` (git has the version).

- [ ] **Tap-to-QR on album art.** Tapping the art swaps it for a QR of that entry's URL and silently copies the link. It needs a brief "link copied" line: a clipboard write with no feedback reads as broken.

      The previous attempt worked and was sluggish, because verification ran on mount. Three things fix it when it comes back:
      - Build on tap, not on mount.
      - Cache the winning QR version and tonal band on the entry, so later builds skip decoding entirely.
      - Do it server-side. iTunes sends no CORS headers, so a browser canvas cannot read album art pixels at all.

**STILL WANTED ON THE CROSS** — asked for 2026-08-29, not started

- [ ] **A roof on the journal.** The same header the album page has — mark
      centred, one control each side — instead of the band that fades out at
      the top, which is disliked. The mark doubles as back-to-top. The printer
      goes on the right, for sharing the journal at large rather than one
      album; it can point at /dashboard/share until there is something better
      behind it.
- [ ] **The bottom row as one nav bar on every screen.** The entry's back
      control should sit where the beacon's carets sit, with whichever
      direction is irrelevant turned off, so the row means the same thing
      wherever you are.

**THE HEADER** — briefed 2026-08-28, mostly built on branch `one-header`. See DECISIONS for the shape.

- [ ] **One header everywhere**: mark centred, one control each side, the same
      arrangement the About card uses. Today the header changes shape between
      the panes and an entry, and every screen should read the same.
- [ ] **The nav beacon goes** from every page but the beacon pane. It is a
      status bar for something the visitor has already been told, and it
      competes with the writing.

      Not for the polling, though — that is already fixed. `useListeningBeacon`
      runs one module-level timer for however many components subscribe, and
      `/api/public/beacon` caches the upstream answer for ten seconds. Five
      callers cost one request every fifteen seconds, not five. What the dev
      log actually shows is that each of those requests takes 1.4–1.9s of
      application time, which is a different problem and stays after this one
      is gone.
- [ ] **Owner tools, top left, server-checked**: pencil to the editor, printer
      to the export flow. Not hidden with CSS — the entry page currently asks
      the browser whether you are signed in and hides what it finds, which
      means the buttons are in the HTML either way. No `DotsThree`; if a fourth
      tool appears the pencil becomes a menu and nothing else moves.
- [ ] **The Edit and Pin bubbles come out of the chip row.** Admin controls
      should not sit in the reading flow.
- [ ] **The pin moves to the card**, with a search over the owner's own entries
      in a bottom sheet, and the entry editor loses its pin entirely. See
      DECISIONS for the trade this accepts.
- [ ] **Copy link / QR at the foot of an entry**, for anyone — the other half
      of the split that puts the printer in the header.

Per-track stamps need no column: they ride inside the `tracks` jsonb, which
already exists.
- [x] **What a delete actually does** — established and handled; the cleanup is in `delete_entry`. Left here for the record: `delete_entry` is a hard `DELETE FROM entries WHERE slug = …` — no soft delete, no undo beyond the nightly backup and Neon's six hours. And "permanent" understates it: `comments.entry_slug` is plain text with no foreign key, so an entry's comments stay in the table forever, orphaned and unreachable; `entries.source_entry_id` has an index but no key either, so deleting an album somebody else's entry was received from silently breaks that chain. Only `settings.pinned_entry_id` cleans itself up, because it is the one with `ON DELETE SET NULL`. Either the warning says all of this or the delete tidies up after itself first.
- [x] **Source link** — settled 2026-08-31, and the answer is that it does not
      want a settings column. `NEXT_PUBLIC_SOURCE_URL` and nothing else; see
      DECISIONS. The fallback was pointing at a repository that does not exist
      and now points at this one, and the deploy button asks for the variable
      so a fork can set it at install.
- [ ] **Listen numbering** — an album has many listens, numbered, computed from `album_key` and never chosen.
- [ ] **The feed as a network** — `/feed.xml` publishes, but nothing reads anyone else's. Two views, submissions first. A shelf, not a river.
- [ ] **Relationship field removal** — every value has dissolved into something else. Legacy data stays; the picker goes.

**SCALING — BLOCKER. The archive loads every record on every page view**

Moved onto the blocker list 2026-08-31, and the reason is that it is not a
problem with this journal. It is a problem every copy inherits: the code pulls
the whole archive to draw a grid of covers, so a keeper's journal gets harder
to read the longer they keep it. Junior would hit it in year two, with no idea
why, exactly as his writing got good. A ceiling that arrives with success is
not a later item.

The target is a page view that costs the same whether the journal holds fifty
records or five thousand: roughly **160,000 views a month, flat, forever**.
The 2026-08-30 work got the cost down by 92% but left it proportional to the
archive, so it still degrades as the journal grows.

Measured 2026-08-30, 663 bytes per entry over the wire:

| entries | per page view | views/month on 5 GB |
|---------|---------------|---------------------|
| 39      | 26 kB         | ~207,000            |
| 250     | 166 kB        | ~32,000             |
| 500     | 332 kB        | ~16,000             |
| 1000    | 664 kB        | ~8,000              |

Paginated at 50 in the database it is ~33 kB and ~160,000 a month at *any*
size. That is the number to aim at.

- [ ] **Move the archive's paging into the query.** `components/main_components/Journal.js`
      fetches every entry and paginates in the browser — `PER_PAGE = 50`, but
      it downloads the lot first. The blocker is that everything else in that
      file runs client-side over the full set and would have to move with it:
      - search over album and artist (`foldForSearch`, accent-folded — the SQL
        needs the same folding or Beyonce stops finding Beyoncé)
      - the genre filter, the three flag filters, the year range
      - five sort modes, two of which (`rating`, `year`) parse text in JS
        (`parseRating`, `releaseYear`) rather than sorting a column —
        `rating_value` exists and is generated; release year does not and may
        want one
      - the genre list itself and its counts, and the year bounds, which are
        derived from the whole set and want their own small cached queries
      - the filtered **count**, which the page prints
- [ ] **Untangle who owns the entries.** `Journal` takes `entries` as an
      optional prop: at `/archive` it fetches its own, in the cross the
      homepage hands over what it already loaded. Server-side paging means the
      component owns its own fetching in both places, and the homepage keeps
      whatever it still needs separately.
- [ ] **The homepage strip wants about ten records, not all of them.**
      `HomeNav` reads `.album`, `.id` and `.slug` for the recent row and the
      counts. A count is `SELECT count(*)`, not a list.
- [ ] **`/dashboard` and `/dashboard/inbox` pull every entry for a decorative
      background** of shuffled covers. They want album art URLs and nothing
      else, and probably only twenty of them.

**How to measure any of this.** Do not guess from the query — the one that
nearly bankrupted the allowance was fast. Measure what the row weighs:

```sql
SELECT pg_size_pretty(sum(pg_column_size(entries.*))::bigint) FROM entries;
SELECT pg_column_size(settings.*) FROM settings;
```

and for the wire, `curl -s http://localhost:3000/api/entries | wc -c`.

**THE LOCK — what is left after the doorman**

- [ ] **Retire `/dashboard`.** It is no longer the login route — the pages
      behind it now send a signed-out visitor to `/login` — and the plan is to
      delete it outright once the owner's tools live where the work does.
      Deleting it means finding new homes for what it still holds.
- [ ] **The three-tap gesture only works where the mark does not navigate.** On
      the homepage the crown swallows its own click to re-centre the cross, so
      counting taps there is free. On every other page `SiteNav`'s mark is a
      real link home, and taking that away to count taps would break the one
      thing it is for — so the first tap goes home and the gesture works there.
      Acceptable, and worth revisiting if a better idea turns up. The visible
      fallback is the Sign in line on the pitch pane.
- [ ] **`/api/comments/receipts` has no doorman.** It is a read that verifies
      signed receipts, so a flood costs a query rather than a row, but it is
      the one public POST still uncounted.
- [ ] **Rate limiting is per instance on serverless.** Exact on a copy running
      as one process. If the canonical instance ever needs the strict version,
      the seam is `library/doorman.js` — swap the Map for a store and nothing
      that calls it changes.

- [x] **A copy with no Anthropic key half-works, and says it fully works.**
      Settled 2026-09-01 by the session overhaul. Research is a button and the
      button is absent on a keyless copy (`research_available`, worked out in
      the layout from the env and carried down with the bookplate); the route
      answers plainly if asked anyway. Formatting stopped reaching a model some
      time ago and the companion is gone, so a keyless copy completes a listen.
- [ ] **`keeper_name` has no editor.** `IdentificationCardEditor` writes
      `display_name` once one exists, and setup does not reopen. Belongs in the
      card editor, which is where things are edited.
- [ ] **Fresh-copy surfaces are still wrong once the hold lifts**, all found
      while designing the welcome screen and all separate from it: the beacon
      draws a grey ♪ and an em-dash forever with no `lastfm_user` (its own
      route's comment promises the client draws nothing); `Journal.js` has no
      `entries.length === 0` branch so an empty journal says "No entries match
      these filters"; `/api/public/stamps` returns `0` from its catch so a
      database outage prints "Albums logged 0"; and `IdentificationCardEditor`
      seeds `lastCodeUrl` from the current address rather than the one the
      stored code was built for, so changing the address never rebuilds the QR
      — now live, because setup can write an address.
- [ ] **`doorman.js` trusts the first `X-Forwarded-For` entry.** True of
      Vercel, backwards for nginx, ALB, Traefik and Cloudflare, which append.
      On a bare Node deploy the login bucket key is attacker-chosen and the
      5/minute limit never fires.

**SCHEMA — the last drop before additive-only**

Decided 2026-09-06, on branch `last-cleanup`: the draft window closes with
this. Everything below was already removed from the code, the settings lists
and `migrations/001_initial.sql` (so a fresh copy never builds any of it).
The live database still has all of it, because the code on `main` still
selects the settings columns and inserts into the entry ones — dropping them
before that deploy would break saving an entry on the live site.

- [x] **Run 2026-09-06, after the deploy** — backup `2026-09-06-1829` taken
      first, host checked, all ten statements applied, the site answered
      200 before and after. The schema is additive-only from here. What was
      run, for the record. Backup first
      (`npm run backup`; the 2026-09-06-1226 backup already holds every row
      of every one of these). Check the host is `ep-patient-morning` before
      running anything. What is lost, deliberately: 32 model-written
      background paragraphs, 28 old Tumblr post links, the free-text bio
      and `about_intro` (the same paragraph twice), "Your best masterpieces!" from
      `send_me`, the title "Listening Notes" from `journal_name`, and Neon's
      sample table of ten random numbers.

      ```sql
      ALTER TABLE entries  DROP COLUMN IF EXISTS background;
      ALTER TABLE entries  DROP COLUMN IF EXISTS post_link;
      ALTER TABLE settings DROP COLUMN IF EXISTS journal_name;
      ALTER TABLE settings DROP COLUMN IF EXISTS bio;
      ALTER TABLE settings DROP COLUMN IF EXISTS about_intro;
      ALTER TABLE settings DROP COLUMN IF EXISTS instagram_url;
      ALTER TABLE settings DROP COLUMN IF EXISTS send_me;
      DROP TABLE IF EXISTS conversations;
      DROP TABLE IF EXISTS echo_memory;
      DROP TABLE IF EXISTS playing_with_neon;
      ```

- [x] `settings.about_intro` — decided 2026-09-06: the same paragraph as
      `bio` under a second name, dropped with it. Added to the block above.
- [x] `entries.relationship`, `comments.author_email`,
      `submissions.submitter_email`, `entries.tags` — all already gone from
      the live database, confirmed 2026-09-06 against the catalogue. The two
      "run this" blocks that used to sit at the top of Pending were done.

**BACKUPS**
- [ ] **A stale-backup badge on the writing side.** Not urgent, and not
      optional either: **the failure mode is silent.** iCloud signed out, a
      full drive, a laptop shut for a fortnight, a `node` that moved after an
      nvm upgrade — every one of those leaves the backup quietly not happening
      while everything on screen looks exactly as it did. Nobody discovers it
      until the day they need a restore, which is the one day the answer has to
      already be yes. A line somewhere on the writing side reading *last backup
      3 days ago*, going amber past a week, turns believing you are covered
      into being covered. Read it from the newest directory name under
      `BACKUP_DIR`; no new state to keep.
- [ ] Nothing checks that iCloud actually *uploaded*. The local write succeeds
      either way, so the log always says success. Glance at the folder in
      Finder occasionally — a cloud icon beside a snapshot means it has not
      gone up yet.

**SECURITY**
- [ ] **Rotate `DATABASE_URL` and `SESSION_PASSWORD` into Vercel Secrets.**
  Vercel currently holds both as plain config values, which means anyone with
  dashboard access can read them.

  1. Neon → reset password
  2. Copy the new connection string
  3. Vercel → edit the variable, paste, **mark as Secret**
  4. Update local `.env.local` (from a terminal — VS Code will not save it)
  5. Redeploy
  6. Confirm entries still load

  **A daylight task.** A wrong edit takes the live site down: with a bad
  connection string the site cannot reach its database, and every page that
  reads entries fails at once. Rollback is Vercel → Deployments → last good
  deploy → Promote to Production, but that restores the old *code*, not the old
  variable — the variable has to be fixed by hand.

  Note on `SESSION_SECRET`: rotating it signs you out and you will have to log
  in again. **That is expected, not a bug** — it signs the login cookie, so a
  new secret retires every cookie issued under the old one. Worth knowing in
  advance, because it looks exactly like being locked out. `.env.example` and
  the README used to call this a thing never to do after launch; they now say
  what it actually costs, which is typing the password once.

- [x] Upvote abuse prevention — done 2026-08-30. One vote per comment per
      address per twelve hours, via library/doorman.js.

**BUGS**
- [ ] **Slug fix** — `create_slug` collapses spaces to hyphens and then calls `.trim()`, which only strips whitespace. A title that starts or ends with punctuation keeps a stray hyphen: `— Blue` becomes `-blue`. Numbering for repeat listens is handled separately in `database_actions.js` and is fine.
- [ ] `created_at` is a naive UTC column and the driver shifts it by the reader's local offset. Never compare it to `Date.now()`.

**DEV**
- [ ] Bare apex `listeningnotes.blog` still can't reach Vercel — Tumblr refused to point their domain externally, so registration is moving to Vercel. `www` works today.
- [ ] Instagram + Reddit auto-distribution (placeholder to-do list lives on `/dashboard/share`)

**HOME**
- [ ] Brainstorm alternative to scrolling album strip for recent entries
- [ ] Jiggle animation on album tile hover
- [ ] Better live track logic (sticky state past Last.fm delay)
- [ ] Beacon centering fix when open

**MODAL**
- [ ] Album art loads fully before data appears (or click-to-reveal)
- [ ] Sticky collapse animation is glitchy — needs smoother transition
- [ ] Horizon track names only load for some albums (may be improved now that tracklists use the iTunes collection lookup — verify)
- [ ] Subtle background fade behind modal
- [ ] Link to full page (open in new tab)
- [ ] The AI "background" right-column was removed from the modal (posts are notes-only now) — glance at the header proportions since it's one column shorter

**PUBLIC PAGES — VISUAL POLISH**
- [ ] `/archive` — visual pass (tile sizing, filter bar, hover states)
- [ ] `/compare` — visual pass (it is built and working, not a placeholder)
- [ ] Slug page (`/entries/[slug]`) — full redesign

**DASHBOARD**
- [ ] Spotify data panel (monthly listeners, artist ranking)
- [ ] Discogs genre tags via Claude API
- [ ] Inbox (`/dashboard/inbox`) — the Submissions tab is rebuilt as a shelf
      and done; the Comments tab is still the moderation list it always was.
      Two things left on the sent side, neither urgent: a sender who gave a
      journal URL is a name and an address and nothing collects them (the
      `people` table is still parked), and Dismiss is one press with no undo,
      unlike every other destructive control on the site.
- [ ] Share (`/dashboard/share`) — wire Reddit + Instagram backends

**LIVE STATUS**

Live at `www.listeningnotes.blog` (Vercel, HTTPS). The writing side is protected
by a JWT "wristband" cookie (`library/wristband.js`). Environment variables are
listed in [`.env.example`](.env.example) and set in Vercel under
Project → Settings → Environment Variables.

**Rollback:** Vercel → Deployments → last good deploy → "Promote to Production" is instant.

---

## Gotchas

**The link-preview renderer cannot read the site's CSS or fonts, and has no
star glyph.** `ImageResponse` needs font files: the two faces are fetched
from Google Fonts on the server with an old browser's User-Agent, which
returns a `.woff` the renderer accepts (asking for `.ttf` alone finds
nothing and the image fails with "No fonts are loaded"). Neither typeface
carries ★, and a glyph the font lacks renders as a box — stars are SVG
shapes. See `app/entries/[slug]/opengraph-image.js`.

**`ADD COLUMN … DEFAULT now()` dates every existing row today.** Postgres
fills the new column with the default as the ALTER runs, so an UPDATE that
then fills "where the column is null" finds nothing and every old row keeps
the migration's own time. Add the column empty, fill it, then set the
default. Caught on `posted_at` by counting rows that agreed with the old
column — zero of 39 — before it shipped; the count is the check, not the
migration log saying "applied".

**A grep for callers in other files calls a function dead when its only
caller is in its own file.** `foldGenre` came up with no external caller and
was deleted; it is called thirty lines further down the same file. Count
mentions inside the file too, and treat "definition + one more" as a call
before treating it as dead.

**`git add` on a path already staged as deleted fails the whole `add`, and
the commit that follows sweeps up whatever *was* staged.** After `git rm`,
the deletions are already in the index; naming them again in a later `git add`
alongside modified files aborts that add, and the commit then contains the
earlier deletions under the wrong message. Either commit straight after the
`git rm`, or leave the removed paths out of the later `add`.

**Two databases with the same entries and different settings rows.** From
about 2026-08-30 to 2026-09-03, `.env.local` pointed at a stray copy of the
database (`ep-old-sea-am0rc38b`) rather than the one Vercel reads
(`ep-patient-morning-amam2qx0`). Both held the same 39 entries, so nothing
looked wrong: an essay written through localhost went into the copy, and
every nightly backup in that window backed up the copy. The live journal had
only Neon's six hours for those days. Before any write from localhost, and
before saying anything about backups, print the host:
`node --env-file=.env.local -e "console.log(new URL(process.env.DATABASE_URL).host)"`.
Also: VS Code did not save the first edit to `.env.local`; check the mtime.

**GitHub's Contributors sidebar counts co-author trailers; its contributors
API does not.** Checking the API and concluding a co-author is not listed is
wrong. Look at the repository page itself.

- **The dev server on :3000 does not pick up globals.css edits.** Already
  written down; bitten again on 2026-09-02 twice. Check
  `document.styleSheets` for the new selector before concluding a rule is
  wrong, and prove stylesheet changes in `npm run build` instead.
- **A `<Link>` inside something the root layout renders is dead.** Root
  layouts do not re-render on client navigation, so `ComingSoon`'s link to
  `/setup` changed the URL and left the hold on screen. Anything the layout
  draws *instead of* the page has to navigate with a plain `<a>`.
- **`@next/env` is CommonJS.** `import { loadEnvConfig } from '@next/env'`
  fails in an `.mjs` script; import the default and destructure it.
- **`next dev` refuses a second server in the same folder** (Next 16). A
  second session cannot start its own preview; it has to use the one on :3000,
  which serves the same working tree anyway.
- **`RETURNING *` on the settings row returned the portrait bytes** to the
  browser on every card save. `save_settings` now returns the same column
  list a read uses. Anything that writes to a row with a blob in it should
  never return the whole row.
- **Password managers ignore hidden and read-only username fields.** The
  hidden 1px `readOnly` username input never got Safari to offer a save. The
  field has to be visible and writable; see PasswordGate's `.pg-who`.
- **A close inside a page turn froze the site** (2026-09-03, intermittent
  on the phone). The turn changes the address on a 240ms timer; a close in
  that window went back to the wall, then the timer replaced the wall's
  history entry with the next record, after which back had nowhere to go
  and the faded-out sheet sat invisibly over everything, swallowing every
  touch. Now a close cancels a pending turn, and a layer still mounted half
  a second after its close forces `router.replace('/')`. Anything faded to
  nothing that can intercept touches needs a way out that does not depend
  on history.
- **`beforeinstallprompt` is not a promise.** Chrome fires it only when it
  has decided the site is installable, and its own automatic prompt still
  wants a service worker with a fetch handler, which this site does not
  ship. `AddToHomeScreen` shows the real button only if the event arrived and
  the menu steps otherwise; do not "fix" a missing button by adding an empty
  service worker.
- **A subquery in `SETTINGS_SELECT` needs the table to exist.** Migrations
  run before the first request, so this is safe in practice — but on a
  database where 003 has not run, `pull_settings` throws, catches, and the
  whole site reads as blank. If a copy ever looks unconfigured after a deploy,
  check `schema_migrations` first.

**A fixed sheet inside the layer is not fixed to the screen.** `.lay` is a
containing block for its fixed descendants (see the note on `.sitenav-row`),
so a second `position: fixed; inset: 0` sheet rendered inside the session's
layer measures against the outer sheet — on a phone that put the preview's
entry a scroll's worth too low. Anything that needs the real viewport from
inside a layer goes through `createPortal(…, document.body)`.

**Focus events do not fire in the Browser pane.** Its document is never the
focused one (`document.hasFocus()` is false), so `el.focus()` sets
activeElement without dispatching `focusin`/`focusout`, and anything keyed on
them looks broken. Dispatch `new FocusEvent('focusin', { bubbles: true })` to
exercise the handler, and test the real thing on a device.

**`react-hooks/set-state-in-effect` is an error here, not a warning.** Any
`setState` called synchronously in an effect body fails lint. The shapes that
pass, all in use in the codebase: a browser-only value (the URL, localStorage,
a media query) read through `useSyncExternalStore` with a server snapshot, so
it needs no effect at all; a value derived from other state rather than seeded
into its own (`typed ?? fallback`, with null meaning untouched); state set from
the event that caused the change; a DOM write in a `useLayoutEffect` instead of
a measurement stored in state; and, where "a frame later" is the actual intent,
`requestAnimationFrame` with the frame cancelled in the cleanup. Lint was clean
on 2026-09-03. Seven of the nine errors fixed that day had been added while
lint was already red — which is the reason to keep it at zero.

**A comment is enough to make a class look used.** A grep for a class name
hits code comments and CSS-in-JS as readily as a `className`, so a dead rule
whose name a comment still mentions survives a naive scan. Check for
`className=` or `classList` before calling a class live. The reverse trap too:
`EdgeCaret` builds `edge-caret--` + direction, so the composed name never
appears whole anywhere.

**Cutting a `@keyframes` block by regex needs three closing braces.** Two
frames inside, one around them. A pattern that stops at the second leaves the
third behind, and PostCSS then refuses the whole stylesheet with
`Unexpected }` — which reaches the browser as every page blank. A brace-depth
scan of the file (comments stripped) finds the line in a second.

Things that cost real time. Each one is here because it was not obvious and
will not be obvious again in six months.

**A rule scoped to `.lay` hits every layer, and the two layers are not alike.**
`.lay .sitenav-row { position: relative }` was written for the send sheet,
which scrolls itself and therefore cannot hold a fixed child still. An entry is
the other kind of layer: it does its own scrolling in `.ln-screens` and leaves
the sheet still, so its header was right as it was. The rule put that header
into the flow, pushed `.ln-screens` 80px down a sheet it is sized to exactly
fill, and cut the bottom 80px off screen two — shipped, and not noticed for a
day, because the send sheet was the only layer looked at after the change.

The distinction is `.lay--scrolls`, and it is the one that actually matters:
`.lay` sets a containing block for fixed descendants either way (it animates a
transform on the way in), but pinning to a sheet that is fixed at inset 0 and
never moves is the same as pinning to the window. It only goes wrong once the
sheet scrolls. **When a layer gains a second tenant, check the first one.**

**Never `SET search_path` on a pooled connection.** Neon's `-pooler` endpoint
is PgBouncer, and a session-level `SET` leaks into the pool: the next client to
be handed that backend inherits it. Setting `search_path` to a temporary schema
while rehearsing a migration, then dropping that schema, left roughly one
connection in eight pointing at a schema that no longer existed — so `SELECT
count(*) FROM entries` failed on a database where `entries` was perfectly fine.

It reads as data loss and is not. `SHOW search_path` on a fresh connection
tells you immediately. Fixing it means `SET search_path TO "$user", public` on
enough connections to sweep the poisoned ones out, and `ALTER DATABASE ... SET
search_path` so recycled backends come back right.

Better: rehearse a fresh install in its own **database**, not its own schema.
The schema trick also gives a false negative on foreign keys, because a `DO`
block matching a constraint name without scoping it finds the real one in
`public` and skips.

**A cheap query can still be the expensive one.** The Neon transfer allowance
hit 95% with healthy compute, no long-running query and no runaway poll —
every signal said nothing was wrong. The cause was `pull_settings` doing
`SELECT *` on a row holding two base64 images, 307 kB of 310, read twice per
page render and every fifteen seconds by the beacon. One tab open for a working
day moved 580 MB.

Monitoring measures how hard a query *works*. It does not measure what the
query *carries*. When transfer is high and compute is fine, stop reading the
query plan and weigh the row:

```sql
SELECT pg_column_size(settings.*) FROM settings;
SELECT column_name FROM information_schema.columns WHERE table_name='settings';
```

then size each column and look for the outlier. It took about four minutes once
pointed the right way, and no amount of staring at the dashboard would have
found it.

**Neon's free allowances are per project, so a dev branch does not reduce
transfer.** It is still worth having — it stops local development writing to
the live journal — but it isolates *data*, not usage. Both branches spend the
same 5 GB.

**`allowedDevOrigins` fails silently and looks like a broken site.** Next
refuses dev requests from any origin not on that list, and the refusal is
invisible in the worst way: the page still server-renders, so it appears to
load, and then nothing on it works — empty beacon, no entries, blank card. It
reads as the app being broken, so the instinct is to blame whatever you changed
last. It is in `next.config.mjs` and now uses wildcards for the private ranges
plus `*.local`, so a changed LAN IP cannot cause it again. The laptop's mDNS
name (`Miyels-Laptop.local:3000`) is the address that survives changing
networks; `ipconfig getifaddr en0` gives the current IP.

**A text field under 16px makes iOS Safari zoom, and it does not zoom back.**
Safari zooms the page in whenever it focuses an input whose type is smaller
than 16px, and on blur it frequently leaves the page scaled and offset instead
of restoring it. What you see is the layout going wrong *after* leaving a
field, worst near the bottom of a page where there is nothing below to scroll
back to — so it looks like a scroll or layout bug and it is a font-size bug.
16px on the field is the entire fix; scope it to `@media (pointer: coarse)` to
keep smaller type where there is a mouse. `maximum-scale=1` on the viewport
also stops it and is the wrong answer — it takes pinch-zoom away from everyone
who needs it. The rest of the site's inputs are still 13–15px and have not been
looked at.

**The clipboard cannot be tested in the Browser pane, and the failure looks
like a bug in your code.** `navigator.clipboard.writeText` rejects with
`NotAllowedError: Write permission denied` whenever the document is hidden, and
the pane reports `document.visibilityState === 'hidden'` almost all the time —
the same fact already recorded above about IntersectionObserver. A real trusted
click does not help, and neither does forcing a frame with a screenshot; the
write is refused and, since the handler catches its own rejection, absolutely
nothing happens on screen. It reads exactly like a handler that never ran.

Check `document.visibilityState` before believing it. What can be verified is
the logic: replace `navigator.clipboard` with a stub whose `writeText` records
its argument and resolves, then press the control and assert on what it was
handed and what appeared. That covers everything except the browser's own
permission, which is the one part that was never broken.

**`overflow: visible` on the layer is right for an entry and wrong for
everything else.** `.lay` gives up being a scroll container on a phone, for a
good reason written at length in globals.css — the entry's own layout does the
scrolling and a third container breaks the other two. Put anything else on that
sheet and the reason evaporates while the rule stays: a form is one ordinary
column, it overflows the fixed box, and the bottom of it simply cannot be
reached. There is no scrollbar and no error, so it looks like a layout that
ends early rather than content that is unreachable. `.lay--scrolls` is the
opt-in.

**A `SELECT` naming a column that does not exist takes out the whole page
quietly.** Adding three columns to `pull_submissions` before running the
migration made `/api/submissions` answer 500, and the inbox's `.catch` turned
that into "No pending submissions" — an empty shelf where there were real rows.
The read was broken and the page said everything was fine. Worth remembering
that a fetch with a `.catch` that sets an empty state cannot tell you apart
from a genuinely empty table.

**CSS is not "last rule wins."** Specificity decides first and source order
only breaks ties — `.card` beats `div`, `#hero` beats `.card`, and an inline
style beats both. This is why deleting a rule sometimes changes something
nowhere near it: the rule was not winning on order, and taking it away promoted
a different one.

Three signs a stylesheet wants a pass, all of them the same sign: reaching for
`!important`, writing a more specific selector to beat one written last month,
or being afraid to delete a rule because you cannot tell what it holds up.

**Grep is the wrong test for whether a database column is in use.** A column
can hold real data that nothing currently reads — unread is not unused. This is
already written down in DECISIONS and is repeated here because the guardrail
existed and got walked past once anyway. `git rm` on a file is recoverable from
history; `DROP COLUMN` is not recoverable from anything but a backup. Read the
values before deciding, and take a backup either way.

**Changing a scroller's overflow in the middle of a scroll stops the scroll.**
A class that toggled `overflow-x` on the cross's rail whenever a pane passed
eight pixels meant that overflow flipped every time you crossed that line near
the top of a pane — and the vertical scroll died each time. It looked like a
snap problem and it was a layout-state problem. If a fix has to change a scroll
container's own properties while it is being used, it is the wrong fix.

**A hand-rolled drag loses to native scrolling, every time.** An edge-strip
gesture that set `scrollLeft` frame by frame — with the snap switched off for
the duration, which is the correct technique — still read as glitchy beside the
browser's own momentum and snapping. Reimplementing scroll physics is a last
resort, not a tool to reach for when a CSS answer is proving awkward.

**`overflow: hidden` still creates a scroll container.** It takes the scrollbar
away and stops the user scrolling it; it does not take the element out of the
scroll chain. So a box wrapped around a scrolling layout, set to `hidden` and
carrying `overscroll-behavior: contain`, still catches every gesture that
reaches the end of an inner scroller and refuses to pass it on — the scroll
dies there. Half the symptom disappears (the second scrollbar) and the worse
half stays (the freeze), which makes it look like the fix worked and the
problem was something else.

`overflow: visible` is the only value that means "not a scroll container".
Cost an entire wrong fix on the entry layer.

**`touch-action: pan-y` does not arbitrate a diagonal gesture — it runs both
halves of it.** It was meant to settle who owns a swipe: vertical to the
browser, horizontal to the drag handler. What it actually means is that the
browser will start panning on the *vertical component* of any gesture, at once,
while the handler is still watching the horizontal one. So a back-swipe that
drifts slightly downward scrolls the page **and** drags the layer. On the entry
layer that landed you in the notes instead of back on the journal, and being
stricter about what counted as horizontal only traded it for swipes that did
nothing.

There is no ratio that fixes this, because the browser has already acted before
the ratio is known. The fix is to remove the ambiguity somewhere small:
`touch-action: none` on a narrow edge strip, with the gesture only recognised
there. Inside the strip the browser does not pan at all, so the gesture can only
be the one thing; outside it scrolling is untouched. That is also what iOS does
with its own back gesture, so it is the gesture people already reach for.

**`scroll-behavior: smooth` makes scroll tests lie.** It is set on `<html>`
sitewide, and it applies to `element.scrollTop = n` as well as to
`scrollIntoView` — so setting a scroll position and reading it back gets a
number from somewhere in the middle of an animation. Three runs of a
scroll-preservation test read 4, 37 and 48 out of a requested 1600 and looked
like a broken feature. `window.scrollTo({top, behavior: 'instant'})` overrides
it and is what a test should use.

**Touching rectangles count as intersecting.** A pane parked by scroll snapping
sits exactly edge to edge — `left: -444, right: 0` against a viewport starting
at 0 — and an IntersectionObserver reports that as `isIntersecting: true` with
`intersectionRatio: 0`. It reports the same booleans on screen and off, so
`threshold: 0` sees no crossing and the callback fires **once, on open, and
never again**. Use a small positive threshold (`0.02`) so there is a real
crossing to notice. Cost two wrong fixes in About.js, and it would have worked
by accident on any layout that did not land on a whole pixel.

**A hidden page does not run IntersectionObserver.** The Browser pane in this
setup reports `document.visibilityState === 'hidden'` most of the time, and
Chrome delivers no intersection callbacks to a hidden page — so an observer
test that is really working comes back looking broken. Take a `screenshot`
between the steps of the script: it forces a frame, and the callbacks land.
Check `document.visibilityState` in the result before believing a negative.

**Anthropic billing is two separate banks.** `ANTHROPIC_API_KEY` draws on the
**Developer/API credit balance** in the Claude Console, which is a *different
pool* from the Claude.ai subscription's "usage credits" — same account, two
banks. A `credit balance too low` error means top up the **API** balance
(Console → Billing), and turn on auto-reload so it never stalls. Web search
(~5¢ an album) comes out of the same pool.

**VS Code will not save `.env.local`.** It fails silently — no error, no
warning, the file simply does not change. Edit it from a terminal and confirm
with `cat .env.local`.

**Never use a heredoc containing backticks to write JSX.** The backticks end
the heredoc early and mangle the file. Write to a temp file first.

**`:has()` is silently dropped by the build.** The rule vanishes with no error.
Scope the style another way.

**Stale `globals.css` survives a plain dev-server restart.** Stop the server,
`rm -rf .next`, then start it again. Restarting alone does nothing.

**`perspective` promotes tiles into their own layers**, which then paint over
fixed elements. Watch for it on the archive. The band behind a fixed top row
(`.sitenav-row::before`, `.hn-bar::before`) needs `transform: translateZ(0)` of
its own or the tiles paint straight over it, whatever its z-index says.

**A caret pinned to the window will land in the middle of a sentence.** Pane
content pays `--hn-gutter` for exactly this reason. It is not obvious until you
read a paragraph with a chevron sitting in it.

**Nested scroll containers are not restored by the browser.** The panes keep
their own scroll while they stay mounted, which is why swiping away and back
remembers your place for free — and why leaving for an entry and coming back
will not, until `usePlaceKeeper` exists.

**A screenshot can beat React's commit.** Driving a scroll from the console and
grabbing the frame in the same batch shows the old state — the carets look
stuck and the band looks missing. Read `className` off the live DOM before
believing a screenshot about anything that state controls.

**`overscroll-behavior-x: contain` is load-bearing on the rail.** Without it a
swipe that reaches the left end keeps going into Safari's back gesture, so
reaching for the card takes you off the site.

**Linux is case-sensitive and macOS is not.** An import path with the wrong
case works locally and fails the Vercel build. When a build dies on "Module not
found", check the case against `git ls-files`.

**The old Last.fm key is in public git history, and that is fine.** It was
hardcoded in the source from 2026-05-15 until 2026-08-27, and the repo is
public, so it is in history permanently. It has been rotated, so the exposed
one is inert — and it was read-only anyway, reading nothing but public scrobble
data. Not worth rewriting history over: that breaks every existing clone in
order to retire a key nobody can use. Do not be alarmed by it again.

**Secrets have only ever lived in `.env.local`, which is the whole reason the
audit came back clean.** All 370 commits were searched for each value on
2026-08-27: `DATABASE_URL`, `ANTHROPIC_API_KEY`, `SESSION_SECRET` and
`SESSION_PASSWORD` appear in no commit, on no branch, ever. A pattern sweep for
Anthropic keys, Postgres credentials, GitHub tokens, AWS keys and JWTs came
back empty too. **Keep it that way** — the migration runner and the welcome
screen are the next things that will want to write configuration somewhere, and
a real secret belongs in the environment, never in the settings table and never
in a file that gets committed. `.env.example` holds names and never values.

**`pg_dump` is not installed and cannot easily be** — no Homebrew, no
Postgres.app, nothing to run it with. Don't plan around one. What exists
instead is `npm run backup` / `npm run restore`; see [docs/OPERATIONS.md](docs/OPERATIONS.md).

**Neon keeps six hours of history on this plan.** That covers the mistake you
notice immediately and nothing else. It is not the safety net — the nightly
snapshots are. Take one by hand before touching the schema.

**The neon driver refuses a plain string.** `sql('SELECT ...')` throws — it
only takes a tagged template, and a table name cannot be a bound parameter
anyway. Dynamic SQL has to go through `sql.query('SELECT ...', [params])`. This
cost a backup run that wrote nine empty files and reported success, which is
worse than no backup at all.

**The LaunchAgent holds an absolute path to `node`, and nvm moves it.** The
plist points at `~/.nvm/versions/node/v24.14.0/bin/node`. Upgrade node and that
path stops existing, the nightly backup silently stops running, and nothing
says so. Re-point the plist after any node upgrade — this is exactly the silent
failure the stale badge in Pending is meant to catch.

**`.gitignore` has `.env*`, which swallows `.env.example` too.** It needs the
explicit `!.env.example` line below it, or the one file that is meant to be
committed silently is not.

**`CREATE TABLE IF NOT EXISTS` does nothing to a table that already exists.**
So a column added to `settings` has to be added twice in the migration: once in
the CREATE for a database being built from nothing, and once as
`ALTER TABLE ... ADD COLUMN IF NOT EXISTS` for one built last month. Miss the
second and the column exists only on fresh copies.

**`localhost` writes to the production database.** There is no separate dev
database. A destructive query typed here is typed there.

---

## Where the rest lives

Not repeated here, because two copies of the same thing means neither stays
current.

- **Architecture** — what every file and route does: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
- **Design tokens** — colours and fonts: the custom properties at the top of
  `app/styles/base.css`, and the `fonts` object in `library/sitewide_visuals.js`.
  Those files are the source; anything written down elsewhere goes stale.
- **Environment variables** — [`.env.example`](.env.example).
- **Settled decisions and their reasoning** — [DECISIONS.md](DECISIONS.md).

---

## Git Workflow

- Commit after each verified working checkpoint
- Sign off every commit: `git commit -s` (see [CONTRIBUTING.md](CONTRIBUTING.md))
- `git restore <file>` to undo a single file
- Branch per feature; review on the dev server before merging to `main`

---

## Complete

**2026-09-06 session — the last cleanup before additive-only** (branch `last-cleanup`)
- [x] **Deleted, each with its reason in the commit:** `AlbumPreview.js`,
      `AlbumStrip.js` and `library/dog_ear.js` (no reader, and their
      stylesheet rules with them); five create-next-app SVGs and
      `Logo.png` from `public/`; `first-listen-undo.sql`; the `/rig` and
      `/dashboard/submissions` stubs; `pull_all_entries`,
      `delete_draft_for_album`, `forgetSender` and the one-shot
      `research_album`.
- [x] **`/dashboard` forwards home.** It was still drawing the old hub — a
      screensaver background, the logo image, a "Syne" font nothing loaded —
      while the desk is the right pane of the cross. Inbox and Share go back
      to `/` now.
- [x] **The tab icon is the mark.** `app/favicon.ico` was the framework's
      triangle from the first day; `app/icon.png` is the LN. mark at 64px.
- [x] **Six columns and three tables out of the code and the schema file** —
      see SCHEMA under Pending for the drop that runs after deploy. The
      settings lists in `settings_actions.js`, `layout.js` and `Bookplate.js`,
      the card editor's Instagram fold, and the entry save no longer name them.
- [x] **Audited and kept, on purpose:** `/archive` (three things link to it and
      only it takes `?q=`), `/about`, `/shuffle`, `Dashboard.js` (the pane, not
      the route), `LayerEntry` and `LayerWaiting`, `foldGenre` (called inside
      its own file), the `users` table, `about_intro` (see SCHEMA).
- [x] Verified: lint clean, `next build` clean, `/`, `/archive`, `/key`,
      `/dashboard` → `/` and the icon on the dev server; no console errors.
- [x] **The stylesheet is eight files by surface, in `app/styles/`:** base,
      nav, journal, entry, idcard, session, get, forms — named by Miyel,
      imported in that order from `layout.js`. `globals.css` (2,454 lines)
      was cut by section, every line landing once, and the inline `<style>`
      blocks came out of IdentityCard (556 lines), Journal, FullPostPage,
      AlbumFinder (the whole `FinderStyles` function), Submit, Setup,
      Settings, Compare, Key, PasswordGate and AddToHomeScreen, plus the
      `SESSION_CSS` constant out of `session/page.js`. The four `${…}`
      interpolations became `var(--font-sans)` and one literal. Left inline
      on purpose: ComingSoon (must stand alone when the site cannot),
      the inbox and share pages (owner tools on the old palette; the inbox
      block repaints `html, body`), and the canvas backgrounds.
- [x] Verified after the split: lint clean, `next build` clean, `/`,
      `/archive`, an entry, `/submit`, `/key`, `/get` and `/login` on the dev
      server at desktop and 375px, no console errors.
- [x] **The four refactors, each a new file named by Miyel:**
      `library/card_links.js` (the rig and link marks out of IdentityCard,
      which is 108 lines shorter and imports seven icons instead of forty);
      `components/main_components/JournalFilters.js` (the sheet, the year
      range and the sort table out of Journal, 730 → 468 lines; mounted only
      while open, so no drag offset to reset); `library/portrait_code.js`
      (the QR builder out of IdentificationCardEditor, 686 → 415);
      `hooks/useSessionDraft.js` (autosave, restore and cleanup out of
      useListeningSession, 606 → 453). Lint and build clean; the wall's
      filters checked open and closed on desk and phone. **The session itself
      was not exercised** — it sits behind the password — so a signed-in
      listen with a draft resumed and an entry saved is the check still owed.
- [x] **The inbox and the share page follow the theme and arrive as sheets**
      (branch `owner-tools`). Off the old palette and the unloaded DM Sans,
      onto the tokens through one `.own-*` family in `styles/forms.css`;
      plain, to match the desk; and both intercepted at
      `app/@layer/(.)dashboard/` so they come up from the foot of the screen
      over the desk like the send form does. The ten screensavers lost their
      last readers and are parked, not deleted — see DECISIONS, Parked.
      **Not seen signed in by Claude** — the pages are behind the password —
      so Miyel's look on the dev server is the check.
- [x] **The Share door, `/dashboard/share` and the entry's printer glyph are
      gone** — see DECISIONS. The desk is three things that do what they say.
- [x] **`/printer` — the share printer's door, before the printer** (branch
      `printer-door`). Printer glyph beside the pencil on an entry and on the
      card; the page rises from the foot of the screen and says coming soon.
- [x] **`posted_at`** (branch `posted-at`) — the timezone fix, additively:
      migration 005 adds the zoned column, fills it from `created_at` read
      as UTC, and every entry reader switches to it. Applied to the live
      journal, 39 of 39 rows agree with the old column, Cathedral reads
      "August 22" on a New York screen where it read the 23rd. See the
      gotcha it produced on the way.
- [x] **Entry links unfurl into a picture** (branch `link-previews`) —
      `app/entries/[slug]/opengraph-image.js`, plus the entry page's
      metadata now carrying a description and the large-image card hint.
      Checked on the dev server: Donuts and Cathedral both draw with cover,
      stars and pills; a missing slug draws the keeper's name alone.
- [x] **`edited_at` reads as the UTC it is** — no new column: the stamp was
      already stored correctly and only the read shifted it, so the window
      every entry read goes through re-reads it `AT TIME ZONE 'UTC'` under
      its own name. Miyel kept the name; additive-only kept the schema.
- [x] **Settings comes up as a sheet** (branch `settings-sheet`) — the door
      on the desk and the Sign in line both rise from the foot of the screen
      now, so there is a way back that is not the browser.
- [x] **An artist link lands on the wall, filtered** (branch
      `artist-lands-on-the-wall`) — `/?q=name` instead of `/archive?q=`;
      the cross lands on the centre pane one screen down with the search
      showing the name. Checked at phone and desk width. The printer page is
      down to "Coming soon."
- [x] **The header is a flush bar, not a fade** (branch `flush-bar`) — on
      the cross once a pane has scrolled, and on every other page's nav row:
      page colour, one hairline, and on the cross the small mark centred in
      it, which is also back-to-top. The wall starts under the bar's height
      so `/?q=name` lands with the first row clear of it.
- [x] **The card's pencil and printer show only on the card's pane on a
      phone.** They are pinned to the window, so they had been floating over
      the wall and the desk too; the cross now says which pane is on screen
      and the tools draw only while it is the card's.

**2026-09-03 session — the audit cleanup** (branch `cleanup-audit`)
- [x] **Lint at zero.** Nine `set-state-in-effect` errors across Journal, the
      share page, AlbumFinder and AlbumStrip fixed in the shapes the codebase
      already used (see Gotchas); the six dependency warnings were each
      deliberate and now say so in a disable comment with the reason; the 35
      `<img>` warnings were one decision, recorded in DECISIONS and switched
      off in `eslint.config.mjs`.
- [x] **DECISIONS.md split.** Five decisions sat beside the ones that reversed
      them (the pin, how an entry arrives, where the door is, the first shape
      of setup, schema.sql); each is now one entry stating the current rule,
      and the superseded argument moved to `docs/DECISIONS-ARCHIVE.md` with
      the licence reasoning. AGENTS.md points there and says not to read it at
      session start. The live file went from 1,781 lines to 1,736 — the rest
      is 250-odd decisions at six lines each, which is the format, not drift.
- [x] **The CSS cleanup pass** that was waiting on the cross settling. Three
      families, each deleted, looked at on the dev server, and committed on its
      own: the old homepage (`.hp-*` two-screen layout, dot nav, beacon box
      and its recent panel, scroll button), the pre-cross layout (sidebar,
      hero, tile overlays and labels, page headings, skeleton grid), and the
      old beacon stage with the recent-tracks panel — plus eight keyframes no
      animation named. `globals.css` 3,886 → 2,476 lines. Every rule went
      only after its class names were checked against `className=` in every
      JS file, not just against a grep.
- [x] `SessionDuration` had no caller and is gone; `AlbumFinder`'s header
      described a hook deleted with Echo and now describes `AlbumPicker`.
- [x] Audited and left alone, on purpose: `EchoNetwork` (a dashboard
      background), the `/rig` and `/about` redirect stubs (both earn their keep
      under the forwarding-stub rule in DECISIONS), `research_album` and
      `format_post`, the `tags` column.
- [x] Verified: `npm run build` clean (26 pages), lint clean, `/`, `/archive`,
      an entry, `/session` and `/submit` matched their before-screenshots on
      desktop and at 375px after each family.

**2026-09-02/03 — the entry grows from its tile, and swipes to the next**

Branch `expand-and-swipe`, merged to `main` 2026-09-03 after each gesture was
tested by thumb. See DECISIONS, *The cross*, for the reasoning.
- [x] `LayerEntry` has two arrivals: `side` (unchanged, the session and the
      send page) and `source` (the entry). Source flies a copy of the cover
      from the tile to the first screen with the Web Animations API, fades
      the sheet in under it, and flies it back on the way out when the tile
      is on screen.
- [x] `browse`: sideways swipe or arrow keys go to the neighbour on the wall;
      carets at the sheet's edges for a pointer; stop at the ends; the
      neighbour's first screen is handed over before `router.replace` so it
      draws at once; both routes prefetched.
- [x] Closing: pull down from the top of screen one, press outside the sheet
      on a wide screen (the sheet is a 1100px column over a scrim at
      ≥1024px), Escape, back.
- [x] `library/handoff.js` carries the wall's current order (`handOffOrder`,
      `neighboursOf`) and finds a cover's box on screen (`coverBoxOf`).
- [x] Verified in the desktop pane: open, arrow to next in wall order, Escape
      back to the wall with nothing moved, no console errors. The production
      build carries the new rules.

- [x] The flight verified in the pane at phone and wide widths, both ways,
      after three fixes: the cover comes from the tile (the sheet holds
      nothing at that moment), the wait for its landing spot is up to 1.5s
      (on a wide window the spot is on the entry itself), and the spot is
      `.ln-hero-row .ln-cover` there, not the phone's first screen. The
      column-and-scrim on a wide window and the send layer's side arrival
      also checked.

**Backed out to a baseline the same evening.** On a real phone the swipe was
glitchy, so the layer is back to `main`'s version with one change: it fades
in instead of sliding from the right. The expand-and-swipe work is intact in
this branch's history (commits "The entry expands from its cover" and "The
flight lands"); `git revert` of the baseline commit brings it back. Next
step is to judge the baseline on the phone, then decide whether the glitch
was the gestures or the layer itself.
- [x] **The blink when the entry lands** (2026-09-02, and "it has always
      done this"): the real page replayed the star-fill flourish, which
      starts every star empty for a beat, and mounted a fresh cover image
      that decoded a frame late. Now `FullPostPage` skips the flourish when
      the wait state already drew the score (`alreadyShown`, read off the
      handoff once), and the first-screen cover is `decoding="sync"`.
- [x] **The entry grows out of the tile** (2026-09-03): `LayerEntry` reads
      the pressed tile's box (`tileBoxOf` in handoff.js) before paint and
      runs the sheet from that exact square to the full screen with the Web
      Animations API, origin at the tile's corner; the stylesheet's fade is
      the fallback for a form or an off-wall tile. Measured in the pane: the
      sheet is the tile at the first frame and fills the screen at ~420ms,
      no stray frames. Closing (Escape, edge pull): the cover lifts off the
      page as a fixed copy and flies into the tile while the sheet fades
      under it in 200ms — only the art goes back, not the writing. Measured:
      cover from its place on the entry to the tile's exact square, sheet
      opacity to zero alongside, no copy left behind. The browser's back
      button just removes the sheet.
- [x] **Pull down to close** (2026-09-03): the whole sheet listens; the first
      move decides — mostly downward, from the top of the first screen, is
      the pull, and the sheet follows the finger; past a fifth of the screen
      or a flick it closes the same way as Escape. Anything else goes to the
      browser. Verified with synthetic touches in the pane, and by Miyel's
      thumb on the phone the same day.
- [x] **Left and right go to the neighbours** (2026-09-03): the wall hands
      over its current order (`handOffOrder` / `neighboursOf` in
      handoff.js); the content follows the finger sideways and stiffens at
      an end; a release past a fifth of the width or a flick goes to the
      neighbour by `router.replace`, its first screen handed over first so
      it draws at once; arrow keys and edge carets for a pointer; both
      routes prefetched. The edge pull is retired — sideways cannot mean
      both next and leave. Verified in the pane at both widths: key, swipe,
      order, neighbours, and closing afterwards.
- [x] **A neighbour just appears.** A new address is a new layer, so the
      first version grew from the tile again on every swipe and read as the
      journal reopening. The swipe now says so on its way out
      (`arrivingBySwipe` / `tookASwipe` in handoff.js) and the next layer
      does nothing on arrival — no growth, no fade, no slide. Verified: the
      swiped-to layer carries `lay--swiped` and does not grow or fade.
- [x] **Then a page turn, the same evening.** "Just appears" felt choppy on
      the phone: the page snapped back and the next one popped. Now the
      record on screen keeps going the way it was pushed, off the edge
      (`TURN_MS`, 240ms, the settling transition run to a full width), and
      only then does the address change; the new layer's content enters
      from the other side (`lay-content--from-right/left`, the direction
      travels in the handoff). Measured: old 0 → −1280 over ~240ms, then
      new +1280 → 0 over ~260ms. The address has to change *after* the
      exit — prefetched, the neighbour arrives so fast that changed
      together it replaced the layer before the exit moved a pixel.
- [x] **The header holds still.** The mark, the pencil and printer, and the
      lights used to be inside the content and turned with the page. The
      layer now makes a header slot outside the content (`LayerHeaderSlot`
      context in LayerEntry.js); `FullPostPage` portals its `SiteNav` into
      it, and so does `LayerWaiting` — with the keeper's tools inert — so
      the row is there for the length of the fetch too. The slot wears the
      entry's `ln-entry` / `ln-entry--scrolled` classes so the band behind
      the row keeps working. Measured: the row at the same place through the
      whole exit and entrance.
- [x] **The send page, after the merge** (2026-09-03): it arrives from the
      bottom (`arrives="bottom"`, `lay--rises`) and sinks back on the pull
      down; the layer claims sideways only where there are neighbours
      (`browses`), so scrolling rows work again everywhere else. The
      finder's shelf was rows for an hour and went back to covers the same
      day — and then became a wall (2026-09-03): the field first, a grid of
      large covers under it (`.af-wall`), newest first, 24 at most, and the
      rest of the form gated behind a pick in `app/submit/page.js`. The
      search folds accents in `norm` so "bjork" finds Björk. Then, the same
      day, the landing came back — sleeve, field and the whole form — and
      the wall became a chooser that opens over the page when the field is
      focused (`.af-chooser`); a picked cover flies down into the sleeve
      before the held state appears. The message box grows with its text.
      A misspelling
      ("micheal") still finds nothing — Apple's search is exact on the
      artist's name. The session rises from the bottom too.
- [x] **A close never waits forever on an animation.** A hidden tab freezes
      every animation and their finish never comes; `leave()` now also runs
      a timer a beat longer than the flight, and whichever comes first goes
      back. Found because the pane was hidden while testing.

**2026-09-01 — setup expanded, Settings, and the password out of deploy**

Two briefs in one session, on branch `setup-and-settings`, merged to `main`
on 2026-09-02 after the fresh-account run passed. See DECISIONS, *Setting a
copy up*, for what was decided; this is what was built.

- [x] **`/settings`** — `app/settings/page.js`, owner-only, reached from a
      gear beside the card's pencil. Address, Last.fm username and key,
      Anthropic key, password. The card's fields are listed at the foot as
      doors to `/?edit=card`. Theme and the key's wording were built and
      removed the same day (see Parked).
- [x] **The vault** — `migrations/003_secrets_and_theme.sql` adds a `secrets`
      table and `settings.theme`. `library/secrets.js` is its only reader:
      key resolution (database, then environment), scrypt password hashing,
      the self-minting session secret, the claim code. `/api/secrets` is the
      owner-only door; GET returns whether each thing is set and its last four
      characters, never a value. Applied to production 2026-09-01.
- [x] **Setup, one screen at a time** — `app/setup/page.js` rewritten. Name,
      then photo / prompts / Last.fm / links / rig each with Skip, then a
      password with a confirm. Address derived from the request host, founding
      date from the day. `POST /api/setup` takes name and password; `GET
      /api/setup` says whether the copy is claimed and whether a password
      exists. The gate asks for the claim code on a copy with no password.
- [x] **Claim code** — minted on the first migration run of an unclaimed copy,
      printed by `scripts/prepare_database.mjs` (now the first half of `npm
      run build`) and by `instrumentation.js` on every start, accepted by
      `/api/auth/login` in place of a password while unclaimed, cleared at
      claiming.
- [x] **Boots without `SESSION_PASSWORD` or `SESSION_SECRET`.** Login reads
      the hash from the vault, then the variable; the wristband's key comes
      from `sessionSecret()`.
- [x] **Lazy database connection** — `library/database_connection.js` opens
      on first use; the two entry pages use it instead of their own `neon()`.
      A copy with no `DATABASE_URL` builds, starts, and holds on a page that
      names the variable. Verified with `DATABASE_URL= npm run build` and a
      `next start` of that build.
- [x] **Four empty states** — no Last.fm: the journal is the centre pane's
      first screen (`beacon_available`, decided in the layout); a beacon with
      no track prints one quiet line; zero entries says "Nothing logged yet"
      instead of the filter message; a card with no portrait and no address
      draws no square. The pin row already printed nothing outside editing —
      the "empty pinned square" in the brief was the portrait slot.
- [x] **Holding page button** — a plain `<a>`; see Gotchas.
- [x] **Deploy button** — bare repository URL plus Neon's `products`
      parameter; `env` parameters dropped. README rewritten around the claim
      code, with the Git Scope / Private Repository Name note.

- [x] **Installation without Miyel present (third brief, same day)** — the
      button carries Neon's `products` parameter (their button has no
      `integration-ids`; see DECISIONS); the migrator prefers
      `DATABASE_URL_UNPOOLED`; `AddToHomeScreen` is the last setup screen
      and a Settings section; database failures become a sentence
      (`explainDatabaseError`) on a third holding page, in the build log and
      in the runtime log; every holding page and `/get` link to the issues;
      `/get` has the seven steps under the essay with screenshot slots.

- [x] **`/get` rebuilt as three routes, 2026-09-03**, on branch `get-rebuild`,
      unmerged and unreviewed. `/get` is one screen — hero line, the button,
      "Free, no subscription, about ten minutes", and a three-row table of
      contents. `/get/install` is the seven steps with a phone/laptop toggle
      whose choice goes into the address (`?on=laptop`) so the link can be
      texted; screenshot slots read from `public/install/{phone,laptop}/`.
      `/get/story` is the essay. "It didn't work" goes to the repository's
      issues from the door and from the foot of the steps. The README's link
      moved from `/get#install` to `/get/install`. Verified in the pane at
      375px and at desktop; the toggle was exercised by script because the
      pane's touch emulation hangs on a real click. Not yet tried on a phone.

- [x] **The steps rewritten from the notes, 2026-09-03** — nine now. The
      brief's seven skipped the Neon panel, where the Auth toggle is on by
      default and has to go off, and lost some of what the run found. A
      long version was tried and cut back the same day: each step is one or
      two sentences again, but Git Scope and the repository name, the Neon
      panel with Auth off, the half-hour window and Redeploy, and what Skip
      means are all named. Screenshot names renumbered to nine.

- [x] **Review pass on `/get` and the pitch pane, 2026-09-03** — a "← Get
      one" link above the heading on `/get/install` and `/get/story`; the
      door's button and caption centred, the "Free software" kicker gone,
      the paragraph opening "A free software that allows you to…" and the
      caption "About ten minute set up". The pitch pane: title "What is
      this?", third sentence "You host your own…", button "Get one" and
      centred, Sign in and Source stacked below it. A fourth sentence was
      tried and removed the same day (see DECISIONS).

- [x] **Claude removed from the contributors list, 2026-09-03** — the
      repository page's Contributors sidebar counts `Co-Authored-By`
      trailers (the contributors API does not, which is what made the first
      check wrong). All 16 branches on GitHub were rewritten with
      `git filter-branch --msg-filter` to drop only that line, trees and
      sign-offs verified identical, and force-pushed. Nobody else had a
      clone yet, so nothing broke. A mirror and a bundle from before the
      rewrite are in `~/listening-notes-backups/repo-before-rewrite-*`.
      Going forward the trailer is off in Claude Code's global settings.

- [x] **The essay reached the live database, 2026-09-03** — the first swap
      had gone into the stray copy (see Gotchas). `.env.local` now carries
      the live connection string; the essay was written again there, the
      August 25 version kept aside, the live page verified, and
      `npm run backup` run so the iCloud backups cover the live journal from
      today.

- [x] **The steps and the story open as a layer over the door, 2026-09-03**
      — `app/@layer/(.)get/install` and `(.)get/story` intercept the two
      routes the way `(.)submit` does: LayerEntry with `arrives="bottom"`
      and `scrolls`, so they rise from the foot of the screen and a pull
      down closes them. Cold loads of the same addresses still get the
      standalone pages with the nav row. The `.get-*` rules moved from
      app/get/layout.js into globals.css, because a layer never passes
      through that layout. "It didn't work" stays a plain link: it goes to
      GitHub, and another site opens in the browser, not on the sheet.

- [x] **The essay replaced, 2026-09-03** — the final version, five sections
      under `## ` headings, written straight into `settings.why_essay` with
      `why_date` set to the day. The previous text (1,787 characters, dated
      2026-09-02) is in the nightly backup from before the swap; Neon's six
      hours have passed. Its title line, "Listening Notes Story", was not
      stored: the page's heading is "Our story", per the brief.

- [x] **Fresh-account run, 2026-09-02** — the `products` parameter survived
      Vercel's sign-in redirect: a Neon database was attached and deploy
      asked for nothing. The claim code showed in the build log. Confusing,
      so the log prints a link with the code in it — and then, because the
      log is hidden behind Vercel's Congratulations screen and people press
      the picture instead, setup is simply open for half an hour after each
      build (`secrets.setup_open_until`, migration 004, applied to production
      2026-09-02). The code and the link are the fallback (see DECISIONS).

**Not verified here, and needs the fresh-account test again:** the whole
first-run flow end to end (there is no local Postgres and only the one live
database, which is claimed), whether `products` survives Vercel's sign-in
redirect, whether the claim code shows in the deploy screen's build log, and
setup's password step against a real password manager.

**2026-09-01 — the session, mobile-first**

Briefed as "the mobile version is not a reduced version." See DECISIONS, *The
session*, for what was decided; this is what was built, on branch
`session-overhaul`.

- [x] **`/session`** — one route replaces `/dashboard/echo` and
      `/dashboard/echo/session`. `app/session/page.js` holds the picker-or-
      listen switch, the landing animation and the session's styles (in the
      page, the way AlbumFinder keeps its own). Dashboard, hub and inbox point
      at it. No forwarding stub, per the retired-route rule.
- [x] **`AlbumPicker`** — a field, a grid of every cover the search found,
      the type-it-in fallback, and the Unfinished drafts under the field until
      you start typing. `useAlbumSelection`, the card phases, the fly-to-centre
      and `PreListenQuestionnaire` are deleted.
- [x] **`SessionHeader`** — 44px cover, title, artist · year, the four steps as
      a row, Save draft, and a back caret to the picker. Sticky, frosted, safe-
      area aware.
- [x] **`AlbumScreen`** (was `AlbumDebrief`) — the record, Start listening,
      and *Research this album* as a button. The briefing streams in below if
      asked; hidden entirely on a copy with no key.
- [x] **`TrackNotes`** — one track per screen. Dots for every track (filled
      once covered), stars, heart, an auto-growing note, Prev/Next, swipe on
      touch, Continue on the last track and a quiet *Album notes →* before it.
      Focuses the note only on a fine pointer, so a phone's keyboard stays down
      between swipes.
- [x] **`AlbumNotes`** — the horizon, the note, then the score and three marks.
      `ScoreScreen` is merged in and deleted.
- [x] **`SessionPreview`** — assembles itself on arrival (format_post is local)
      and re-assembles every time the Preview opens, so edits on the way back
      through Notes always show. Read it → / Log another / ← Dashboard after
      the save.
- [x] **`useListeningSession`** — `beginListen(record)` opens a record and
      returns the step to land on; `doResearch()` only researches, on demand,
      and reads the NDJSON stream itself (`library/baton.js` deleted — there is
      no route jump left to carry a request across). The browser draft now
      carries the tracklist and a timestamp; the newer of it and the `drafts`
      row wins. `save_draft` now actually receives `received_from` /
      `received_date` — the API accepted them and the hook never sent them.
- [x] **Echo, removed:** `ReflectChat`, `/api/echo`, `/api/reflect`,
      `ask_echo`, `SessionButton`, `session_styles.js`, `LOADING_PHRASES`.
      **Kept:** `EchoNetwork`, moved into `backgrounds/` and registered as the
      tenth scene; its canvas is `absolute` now like its siblings.
- [x] **Drafts' `step` column** — old rows counted five steps, new ones count
      four. Read clamped to the new range; a draft left on the old Score step
      reopens on Preview, which is one tap from where it was.

**Second pass, same day — the feedback round.** The session opens as a layer
from the desk (`app/@layer/(.)session/page.js`), Escape/swipe lands back on
the desk pane. Dashboard buttons gone from the picker and the saved screen;
the picker carries `SiteNav` (mark + theme switch), and the session header
carries the theme switch at the end of the steps row. Album screen centred on
the art with the horizon once ratings exist; notes screen reordered score →
horizon → note. `TrackNotes` dots replaced by the strip: bar, dot, rotated
title per track, `--dense` past 18 tracks. The reference is back without a
name: `/api/ask` (inline Anthropic call, plain-text answers, ~80 words),
`AskSheet` (bottom sheet with visualViewport keyboard lift and a head-drag to
dismiss; a 380px column past 900px with the writing moved over), a `?` badge
on the header cover, absent on a keyless copy. Verified in the pane: the
layer both ways, the sheet on a phone width, one real question answered with
the album in context. **Not driven:** the head-drag dismiss, the keyboard lift
and the cursor hand-back need a real phone. The wide column was checked at
1280px.

**Third pass, same day.** Header loses the cover and the Save draft button;
the question mark (glowing) and the theme switch sit top right. Drafts save
themselves (3s debounce in the hook, in-flight write awaited by doSave).
Landing flies to the album screen's big cover, and that screen fades rather
than slides while it does. Swipes turn steps on every screen; TrackNotes hands
over at either end (`onPrev`). Small round carets replace Prev/Next. Notes
screen: horizon → centred stars → small marks in their own colours → note.
"Start session" / "Resume session". Preview rebuilt on `FullPostPage` with a
`preview` prop (no fetch, no CommentBubble, no footer; `TrackThread` takes
`preview` too), standing on a `.lay` sheet with a save bar; every step is
tappable at any time. "Unfinished" → "Drafts". A favourited track wears a
heart above its bar in the strip, in ink rather than red. **Tried and
reverted the same evening:** folding the strip / horizon while a note had
focus and pinning the header to `visualViewport.offsetTop`, meant to give iOS
less to pan when the keyboard opens. On the device it hid the field entirely
("now I can't see anything"); the plain behaviour was better. The keyboard
pan is iOS's and is left alone. **Preview on a phone:** the sheet was drawn
inside the session's own `.lay--scrolls`, so `position: fixed` measured
against that sheet and the entry sat a scroll's worth too low with its foot
cut off. `SessionPreview` now portals to `document.body`, where a real entry
layer lives; the foot is two quiet links over a fade rather than a bar —
*← Return to session* and *Save to journal →* — and `.ln-content` gets room
under it. Every forward move in the listen is now
the same quiet centred link (Start/Resume session, Album notes →, which stays
on the last track too, Preview →). The band under the bar in Safari is Safari's own collapsed
toolbar strip, not the page; the installed app has none. All verified in the pane at
375×812; the test draft the autosave created was discarded afterwards.

**Verified:** `next build` passes; ESLint is clean on every file touched (the
two `set-state-in-effect` errors left are in the untouched share page and were
there before). Walked through in the Browser pane at 375×812: picker → grid
(three across) → album screen → tracks one at a time with a star, a heart and
a note → the note screen with the horizon → the preview, assembled and
correct; a reload reopened the same listen on the Preview step with everything
intact; the back caret filed it under Unfinished; discard removed it. The
research button was exercised from a second browser and answered in 38s.
**Not driven from here:** the swipe between tracks and the landing animation
(the pane's clicks time out on this site, so every tap was scripted). Try both
on a real phone, plus the keyboard over the note field and resuming a draft
after locking the screen.

**Before September 2026** — every earlier session, from the first research
overhaul to the transfer emergency, is in [docs/NOTES-ARCHIVE.md](docs/NOTES-ARCHIVE.md).
Nothing there is pending; it is how the site got here.
