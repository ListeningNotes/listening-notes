# NOTES.md

What is pending, what is done, and what cost real time. This file is for Miyel.

**Three files, three jobs.** Keeping one of them out of the other two is the
only reason all three stay current.

| File | Holds | For |
|---|---|---|
| [README.md](README.md) | What this is, how to run it, where things live | Strangers |
| **NOTES.md** | Pending, Complete, gotchas | Miyel |
| [DECISIONS.md](DECISIONS.md) | What is settled, and why | Read every session |

---

## End of session — update these files

**Standing instruction. Do this without being asked, every session.**

Before wrapping up:

- Move finished items to **Complete**, with the date.
- Add anything new to **Pending**.
- Record any gotcha that cost real time under **Gotchas**.
- If a decision was made — something chosen, rejected, or ruled out — write it
  into **DECISIONS.md** with its reason. Decisions go there when they are made,
  not when they are built.

**Read [DECISIONS.md](DECISIONS.md) at the start of every session.** If
something in it comes up, the answer is already written down. Do not
re-propose anything listed as ruled out.

---

## Working With Claude

**Naming new code — always ask first.** Before creating ANY new function, page (route), or JavaScript file, Claude must pause and let me name it — propose options, then I pick or override. This applies to NEW things only (editing/renaming existing code follows the normal flow) and to every session. Reason: I want to be able to read and understand my own code later, even without a tool to explain it — names I chose are names I'll recognize.

---

## Pending

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

`schema.sql` has it, nothing runs `schema.sql`, and the card's save writes it.
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
- [ ] **Migration runner** — nothing executes `schema.sql`. A fresh copy has no tables and no way to make them without opening Neon's SQL editor by hand. `schema.sql` has also never actually been run against an empty database; every statement is guarded, but "reads correctly" and "builds a working journal from nothing" are different claims and only the first is checked.
- [ ] **Welcome screen** — first run should ask who this copy belongs to and write the owner row plus the settings row. `setup_complete` exists as a column and nothing sets it. Until this lands, `keeper_name`, `founded_at` and `serial` can only be set in the database.
- [ ] **Deploy button** — the README has one, but it lands on a copy with no schema. Blocked on the migration runner.
- [ ] **`/api/export`** — a copy should be able to hand its owner their own data back.

**STRUCTURE** — see DECISIONS.md before starting any of these

The cross is built and merged. What is left of it:

- [x] **`usePlaceKeeper` is not needed and will not be built.** It was going to remember the pane index and the per-pane scroll offset across a route change, because browsers do not restore nested scroll containers. Going out to an entry and back is the only thing that lost them, and an entry is a layer now — the cross never unmounts, so both survive on their own. Verified: pane scroll 991 before and after, and the rail still on the beacon pane.
- [ ] **RUN THIS — no email anywhere, once this code is deployed.** Nothing
      selects either column any more. Already applied to the `dev` branch and
      tested there; production is outstanding.

      ```sql
      ALTER TABLE comments    ADD COLUMN IF NOT EXISTS author_url text;
      ALTER TABLE comments    DROP COLUMN IF EXISTS author_email;
      ALTER TABLE submissions DROP COLUMN IF EXISTS submitter_email;
      ```

      Add before dropping, and run after deploy — the live code still selects
      `author_email` until then. Backup first. What is lost: one real person's
      address on a submission, and a `test@test.com` on a comment.
- [ ] **RUN THIS LAST — drop `relationship`, once the code below is deployed.**
      The Formative migration is already done (nine rows, verified). Nothing in
      the code reads or writes this column any more, so the drop is safe the
      moment that code is live — and only then. Dropping it against the old
      code breaks saving an entry, because `save_new_entry` still inserts into
      it there.

      ```sql
      ALTER TABLE entries DROP COLUMN IF EXISTS relationship;
      ALTER TABLE drafts  DROP COLUMN IF EXISTS relationship;
      ```

      Backup first (`npm run backup`). This one is genuinely irreversible: it
      takes seven Revisit rows and two Study rows with it, deliberately. See
      DECISIONS.
- [ ] **`useShake` + `firework()`** — shake the phone, a firework goes up, then `/shuffle`. The Surprise pill stays where it is.
- [ ] **`AlbumPreview.js` has no reader.** 175 lines, and the only thing that mounted it was the tile flip. The share printer redraws the same card independently rather than importing it, so nothing broke when the flip went. Its `.ln-marks` CSS is dead with it. Left on disk rather than deleted in passing — it is a designed piece and the deletion is somebody's call, not a side effect.
- [ ] **A CSS cleanup pass, once the cross has shipped and settled.** Not a rewrite — one section at a time: delete, look at the site, commit. The reason to wait is that each of these removals makes the next lot of dead rules obvious, and doing it all at once means not knowing which deletion broke what.

      What is already known to be dead or nearly dead:
      - `.hp-mobile-screens`, `.hp-screen--one`, `.hp-screen--two` and everything under them — roughly 300 lines, nothing renders those names. Four rules inside them did real work and are already restated against `.hn`.
      - Whatever the card flip left behind.
      - Whatever the two duplicate homepage trees left behind.
      - The mini beacon's remains are already gone, taken out with it on 2026-08-29 — `.beacon-mini-*`, `.marquee-*` and `.beacon-track-clip`, about seventy lines.
- [ ] **A QR on the pitch pane.** DECISIONS already settles that the right pane produces a fixed code to `/get`, the same on every copy. Not built, and the "logo made of the QR" idea is unresolved.
- [ ] **`settings.bio` now has no reader and no writer.** Deliberate — see DECISIONS. The value is still in the database. Decide at the welcome screen whether the column gets a job or gets dropped, while the schema is still a draft.
- [ ] **`/rig` is still a forwarding stub**, and by the same argument that deleted `/why` it may not have earned one: three days live, linked from a card, on a site nobody else runs. `/about` genuinely did earn its stub. Worth one decision rather than two defaults.
- [ ] **Compare wants two homes** — one on an individual album, for comparing that record against another, and one on the About pane for comparing the collection overall. It is reachable from neither today; the route works if you type it.
- [ ] **Surprise (`/shuffle`) has no way in.** Work in progress by decision — the shake is the intended gesture and is not built. See DECISIONS.

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
- [ ] **`/get` is half a page.** It renders the essay and nothing else. The other half of what that address owes a stranger — what the software is, that it is free, and the way to install a copy — is unwritten, so somebody arriving from another copy's pitch pane reads the why and finds no door. Its tab still reads `Why · …` too.
- [ ] **Source link wants a settings column.** It ships today as `NEXT_PUBLIC_SOURCE_URL` defaulting to upstream, which is the smaller half of the job — a modified copy owes *its own* source and should not need a redeploy to say so.
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

**SCHEMA — the draft window is still open**

Additive-only migrations start the day somebody else is running a copy. Nobody
is yet, so the schema is still a draft and cleanup is free: a column dropped
today costs nothing, and the same column dropped after Junior installs is a
migration that can break his journal.

Worth deciding before the first install, while it is still cheap:

- [ ] `settings.journal_name` — dead. Nothing reads it; `coverName()` answers
      the question now. Holds `Listening Notes` on the live database.
- [ ] `settings.instagram_url` — legacy. Every link lives in `social_links`,
      and the card editor already blanks this on every save.
- [x] `entries.relationship` — settled 2026-08-30. Code stripped, Formative
      migrated onto its flag, the drop written into schema.sql and waiting to
      be run against the live database once the code is deployed. `drafts` had
      the same column and goes with it.
- [ ] `echo_memory` and `conversations` — **zero code references between them.**
      Two tables every fresh copy builds and nothing ever touches.

None of these are urgent and none are obviously wrong to keep. The point is
that "keep it" should be a decision made while it is reversible, rather than
the default that arrives by missing the deadline.

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
instead is `npm run backup` / `npm run restore`; see the README.

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
So a column added to `settings` has to be added twice in `schema.sql`: once in
the CREATE for a database being built from nothing, and once as
`ALTER TABLE ... ADD COLUMN IF NOT EXISTS` for one built last month. Miss the
second and the column exists only on fresh copies.

**`localhost` writes to the production database.** There is no separate dev
database. A destructive query typed here is typed there.

---

## Where the rest lives

Not repeated here, because two copies of the same thing means neither stays
current.

- **Architecture** — what every file and route does: [README.md](README.md).
- **Design tokens** — colours and fonts: `library/sitewide_visuals.js` and the
  custom properties at the top of `app/globals.css`. Those files are the
  source; anything written down elsewhere goes stale.
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

**2026-08-30 — the transfer emergency, and what a read costs**

Neon's transfer allowance was at 95% and climbing. Compute was healthy, no
query ran long, no poll ran away — which is why it had gone unexplained. Two
causes, both about how much a read *carries* rather than how hard it works.

- [x] **`pull_settings` stopped reading two base64 images.** `portrait_data`
      and `portrait_code` are 307 kB of a 310 kB row, and that row is read
      twice per page render and every fifteen seconds by the beacon. One open
      tab moved 580 MB a day; a month is 17 GB against a 5 GB allowance.
      **310.7 kB → 5.1 kB.** Explicit column list, because `to_jsonb` and
      subtract silently turns `founded_at`, `why_date` and `updated_at` into
      strings, and keying off `EMPTY` drops `why_essay`, which `/get` reads.
- [x] **`pull_wall_entries`** — the eighteen fields a list actually uses. A
      full row is 8.5 kB and those are 0.3 kB, so 97% of every archive load was
      writing nobody drew. **`/api/entries` 330 kB → 25.9 kB.**
- [x] **The public feed names its columns** instead of `SELECT *` then dropping
      them in JS. **330 kB → 20.6 kB.**
- [x] **`pull_beacon_settings`** — one column for the query that runs every
      fifteen seconds. ~100 bytes.
- [x] **`pull_random_slug`** — `/shuffle` read the whole journal to pick one at
      random in JS.
- [x] **`/dashboard/share` fetches the full record only for the one being
      exported**, because `isMasterpiece` reads `track_notes`. Lean list to
      choose from, full record for the chosen one.
- [x] **A dev branch in Neon**, so local work stops writing to the live
      journal. Does not reduce transfer — same project, same allowance — but
      it was overdue on its own merits.

Verified after: the wall still draws 39, the Formative filter still returns 9,
an entry still opens instantly with its cover and title before its writing
arrives, and `/`, `/archive`, `/get`, `/shuffle`, `/entries/[slug]`, `/feed.xml`
and the beacon all answer 200.

Net effect at today's size: **~15,900 → ~207,000 page views a month.** The
remaining wall — that cost still scales with the archive — is written up under
SCALING in Pending, with the target and the specific blockers.

**2026-08-29 — the send flow**

Sending somebody an album is a gift, not a form submission. See DECISIONS for
the reasoning; this is what was built.

- [x] **`AlbumFinder`** (`components/main_components/AlbumFinder.js`) — type,
      see covers, pick one. Wraps `searchAlbums()` from `music_data_api.js`,
      which is the good half of the session flow's search — two searches
      merged, pressings collapsed, editions scored. Deliberately not
      `useAlbumSelection`: that wraps the same lookup in the Echo ceremony,
      which is the owner's opening ritual and not something to make a stranger
      watch on the way into a form. Keeps a plain type-it-in fallback for
      records Apple has never heard of, offered from the start rather than only
      after a search comes back empty.
- [x] **The send page rebuilt** (`app/submit/page.js`) — cover, message, name,
      journal URL. No email. The route is unchanged and the title is now "Send
      an album".
- [x] **It opens as a layer** (`app/@layer/(.)submit/page.js`) — over whatever
      you were looking at, in practice the About pane, since the button is on
      the card. Renders synchronously and awaits nothing, so it starts arriving
      on the first frame; there is nothing to load, so unlike the entry there
      is no Suspense boundary and no waiting state.
- [x] **`LayerEntry` generalised** — takes `label` and `scrolls`. It was
      written knowing nothing about entries and had `aria-label="Entry"`
      hardcoded anyway.
- [x] **`.lay--scrolls`** — the sheet scrolls itself again. `.lay` drops to
      `overflow: visible` on a phone because an entry's layout is already two
      scroll containers deep; a form is one ordinary column and needs the sheet
      to scroll it. Measured: 973px of form in an 812px viewport, so without
      this the Send button is genuinely unreachable on a phone.
- [x] **`library/return_address.js`** — the sender's own journal URL, kept in
      their browser and prefilled on every send after the first. Written only
      once a send has actually gone through.
- [x] **Three columns on `submissions`** — `album_art`, `collection_id`,
      `sender_url`. `sender_url` is normalised to a bare host on the server as
      well as in the browser.
- [x] **The inbox is a shelf** — cover, message, sender, and their journal if
      they gave one. `NoteModal` deleted with the table that needed it.
- [x] **Start a listen closes the loop** — the inbox writes the existing
      `ln_pending_session` and goes straight to the session, entry type
      `Submission`, with `received_from` and `received_date` off the row.
      Plumbed through `useListeningSession` into `create_entry`, and through
      `save_draft` as well so pausing a listen does not lose who sent it.
- [x] **Turning the card to its code copies the address** and says *Copied —
      paste it anywhere*.
- [x] **One screen, no scrolling.** Subtitle gone, Back/Archive pills gone, the
      name and journal fields side by side wherever there is width, and every
      vertical measurement clamped against dvh so they give way together on a
      short window. Measured fitting exactly at 375×812 (phone, layer and
      standalone), 1280×860 and 1280×700. It fits by layout, not by clipping —
      min-height and the scrollbar stay, because a form that fits by clipping
      has an unreachable Send button.
- [x] **16px fields on touch**, which is the whole fix for Safari zooming in on
      focus and not zooming back out. See Gotchas.
- [x] **One square, three states.** An empty sleeve waits where the record will
      go, the results fill the same square as a sideways-scrolling shelf, and
      the chosen record replaces them. Nothing moves between the three, and the
      whole page still fits a viewport while a search is open — measured at
      375×812 with twelve results on the shelf.
- [x] **A circled ✕ on the cover's corner** clears the choice, replacing the
      "Choose a different one" line under it.
- [x] **The title is one small line under the mark, standalone only.** The
      layer gets none — you pressed the button to get there.

Verified in the browser: search returns TANGK first for "idles tangk"; the
picked state draws the cover centred at the beacon's proportions; a full reload
restores the album, message and name; the layer opens at the real `/submit`
with one nav row whose mark lands on the same line as the standalone's (37px on
both) and Escape returns to `/` with the scroll lock released; the whole page
fits a viewport at three sizes on both surfaces. The clipboard write could only
be verified with the API stubbed — see Gotchas.

**Known limit:** below roughly 700px of viewport height the page scrolls rather
than fitting, which is deliberate — see DECISIONS. An iPhone SE will scroll.

**Not done, and deliberately:** nothing was run against the live database. The
five statements are at the top of Pending.

**2026-08-29 — an entry is a layer over the journal**

Tapping a cover slides the entry in over the wall; dismissing slides it back.
Built with an intercepting route, so the URL is real either way — tap from the
journal and it opens as a layer, open the same address from a QR or a shared
link and you get the standalone page, server-rendered.

- [x] **`app/@layer/(.)entries/[slug]`** — a parallel slot intercepting the real
      entry route, plus `default.js` returning null for every other page.
- [x] **`LayerEntry`** — the sliding surface, 460ms on a decelerating curve, with
      the back-pull in a 36px edge strip. No close button; see DECISIONS.
- [x] **The open is seamless.** `library/handoff.js` carries what the journal
      already knew — cover, title, artist, year, rating, flags, shelf, listen
      number, date — and `LayerWaiting` draws the whole first screen from it.
      Measured: cover on screen 69ms after the tap on a warm route, and the
      grey skeleton never shown. artShift 0 and titleShift 0 across the swap.
- [x] **`EntryModal` and `FlipTile` deleted**, with the two `entry_modal`
      pieces. A tile is `AlbumTile`, a cover and a link, and one tap.
- [x] **`usePlaceKeeper` struck off rather than built** — the journal never
      unmounts now, so pane index and scroll survive on their own. Verified:
      pane scroll 991 before and after, rail still on the beacon pane.
- [x] **The two-screen CSS moved from FullPostPage's `<style>` block into
      globals.css.** A stylesheet that only exists once its own component has
      rendered is no use to the thing standing in for that component — that was
      the 270px jump. It is also the groundwork the panes will need.

**The cross was attempted and reverted whole.** HomeNav.js and About.js are
byte-identical to what they were. See the two open problems above and the
ruled-out list in DECISIONS.


**2026-08-28 — entry editing, finished, and the CMS retired**

Editing an entry now happens on the entry. `/dashboard/entries` is deleted —
468 lines and the last CMS-shaped thing on the site.

- [x] **The header fields**: album, artist, year, genre, rating and the three
      flags, each drawn in the place of the line it replaces, in both mounts.
- [x] **Press the cover to replace it.** While a correction is open the art is
      a button; pressing it opens the address underneath, with **Find it
      again** (asks Apple with whatever album and artist are in the draft),
      **Clear**, and **Done**. The draft's art is what the page draws, so a
      replacement is visible — including in the blurred wash behind the hero —
      before anything is saved.
- [x] **Which shelf it came off**: Library or Submission, as a select on the
      flags row. The other legacy field on the old form, `relationship`, is
      deliberately not here — DECISIONS retired it, and deleting that route is
      what finally took the last picker off the site.
- [x] **`/dashboard/entries` deleted**, and its door removed from both the hub
      and the desk pane. `SessionPreview`'s "Edit in entries" link went with
      it; "View the post →" already went where editing now lives.
- [x] Delete, at the foot of edit mode, behind a second confirmation, with the
      cleanup. **Still never actually run** — the only honest test destroys a
      real entry.
- [x] The discovery-chain fields, with lineage written once.

**Verified on the running page, not just in a build:** both mounts render the
fields; the Apple lookup returned the identical URL already stored; a save
round-tripped without flattening `album_art_source` — the 3000px master is
still the master and the served copy is still sized; `edited_at` stayed null on
a metadata-only save, which is the stamp rule working. Build clean, lint
unchanged apart from two more `<img>` warnings on the entry page, which is the
same warning twice more because each cover now has a reading branch and an
editing branch.

**2026-08-28 — the pinned album**
- [x] **A pin in the chip row of every entry**, owner only, reading `Pin` or `Pinned`. Writes `settings.pinned_entry_id`, which was already a writable column with a foreign key — no schema change, nothing to run.
- [x] **The card draws it** as a labelled row under Top genres: the art at the 48px the beacon gives its recent listens, with the album and artist to its right.
- [x] **The last prompt came off the card** — all three now sit on the pane below.
- [x] No picker and no new endpoint: the cross already holds every entry for the wall, so the card resolves the pin in memory.
- [x] Three pins were built and reverted the same afternoon — see DECISIONS. The `pinned_entries` column never reached the live database, so nothing needs undoing there.

**2026-08-28 — the cross, merged to main**

Twenty commits. The homepage is three panes on a rail: the card and the writing
on the left, the beacon with the whole archive under it in the centre, the desk
or the pitch on the right.

- [x] **`HomeNav`, `EdgeCaret`, `About`, `Dashboard`, `Pitch`, `Journal`** — six new components, and one homepage instead of two markup trees.
- [x] **The card flip is gone**, as DECISIONS had said it should be, and with it the measured photo-lift, the rig drawer, and both duplicate homepage trees.
- [x] **Prompts replace the free-text bio** — nine openings in `library/bioprompt.js`, three answered, stored as key and answer in `settings.bioanswers`. **That column had to be added to the live database by hand; it is done.**
- [x] **The dot row is deleted** and the nav band it needed came down from 136px to 80.
- [x] **The long essay moved to `/get`** and `/why` was deleted rather than forwarded.
- [x] **`/archive` is 38 lines** and mounts the same wall the centre pane does.
- [x] Verified before merging: production build clean, every public route 200 including the redirects and an entry page, lint unchanged from where it started at 47 problems / 9 errors.

**Not exercised anywhere in this work:** the card's edit mode. It only renders
behind a wristband and the dev browser has none, so the prompt chooser, the
link rows, the rig rows and the save button were checked by measuring computed
styles and never by pressing them. That is the first thing to try on the live
site.

**2026-08-28 — Journal**
- [x] **`components/main_components/Journal.js`** — the whole of the old `app/archive/page.js` minus the page. Search, filters, sort, density, grid, modal and phone sheet, mounted by the centre pane of the cross *and* by `/archive`.
- [x] **The route is 38 lines.** It carries the nav, the dot row, the offset that clears them, and the way home.
- [x] **The scroller is a prop.** The one real difference between the two mounts: on the route the document scrolls, in the cross a pane does. Three things cared — the filter bar sticks to it, the desktop popover closes on it, and the phone sheet has to lock it — so it is handed in rather than assumed, defaulting to the window.
- [x] **The wall is handed the entries the cross already fetched**, so the homepage does not ask `/api/entries` twice.
- [x] Compare, Submit and Surprise are pills at the foot of the wall — what is left of the dot row's destinations. Surprise keeps its gold burst.
- [x] Verified: `/` and `/archive` both 200 and both draw 39 tiles; sticky bar at 136px on the route and 44px in the pane; repo-wide lint unchanged at 47 problems / 9 errors (the six in Journal moved with the code from `archive/page.js`).

**2026-08-27 session — the cross**
- [x] **`HomeNav`** — three panes on one horizontal rail, landing on centre before first paint, three columns above 769px. One structure; the desktop tree and the phone tree of snapped screens are both gone.
- [x] **The card flip is gone**, as DECISIONS said it should be. Left *is* the about page.
- [x] **`EdgeCaret`** — left, right and down out of one component. The down caret is drawn by measuring the pane, so a blank copy gets no arrow pointing at nothing.
- [x] **`About`** — the card, then `about_intro`, then the rig rows inline, then the note and the key, then the source line.
- [x] **`Dashboard` / `Pitch`** — the right pane both ways, chosen by the wristband.
- [x] **The crown** — the mark large and centred at the head of every pane, so the portrait and the album art land on the same line. Verified to the pixel at 375 wide: both at y=172.
- [x] **The card's measured photo-lift deleted** — a ResizeObserver, a spacer and forty lines of arithmetic, dead since `.idc-scene` stopped existing with the flip, and made unnecessary by a fixed crown.
- [x] **The card reordered** — photograph first, name and counted line under it, head moved out of the flow into the corner.
- [x] Verified: production build clean, no new lint errors, every pane renders, both squares aligned, the wall scrolls under a fading band rather than through the mark.

**Not exercised:** no caret press and no real swipe were ever driven from here — the browser tool's click timed out on every attempt while the page stayed responsive. Rendering and scroll positions were verified programmatically. Try the gesture on a real phone before merging.


**2026-08-27 session — backups, properly**
- [x] **`scripts/backup.mjs`** — every table to `<BACKUP_DIR>/<timestamp>/`, with `schema.sql` copied in and a manifest. Keeps 30, prunes the rest, exits non-zero if a table fails so a silent half-backup can't pass as a good one. `npm run backup`.
- [x] **`scripts/restore.mjs`** — the half that makes the other half a backup. Skips `GENERATED ALWAYS` columns read from the catalogue rather than hardcoded, inserts in foreign-key order with comments sorted by id, and resets every sequence past its highest id. Dry run by default; `--yes` to write.
- [x] **Restore rehearsed, not assumed** — replayed all 39 entries into a scratch table cloned from `entries`. Generated columns correctly skipped and recomputed, 39 distinct `album_key`s, `tracks` JSONB round-tripped identical. Scratch table dropped.
- [x] **Daily LaunchAgent** at `~/Library/LaunchAgents/blog.listeningnotes.backup.plist`, 03:00, logging to `~/Library/Logs/listening-notes-backup.log`. Forced a run to confirm: exit code 0.
- [x] **`BACKUP_DIR` is configurable** — point it at an iCloud Drive folder and backups stop living only on this laptop.
- [x] **`/api/export`** — owner-only, streams every table as one downloadable file. Verified 401 without a wristband and 978KB with one. This is the version that ships to copies; the schedule never does.
- [x] `restore.mjs` reads **either** shape — the folder or the exported file. Tested against both, including a real download from the running route.

**Known gaps, on purpose:**
- The LaunchAgent does not run while the laptop is closed. launchd fires it on the next wake, so "daily" means "once per day the laptop is opened." A week away is a week without a snapshot — run `npm run backup` before going.
- **Backups live in iCloud Drive** as of 2026-08-27 — `BACKUP_DIR` points at `~/Library/Mobile Documents/com~apple~CloudDocs/listening-notes-backups`, set in the plist for the scheduled run and in `.env.local` for manual ones. Four existing snapshots were moved across and verified byte-for-byte first. They no longer live only on this laptop.
- Nothing warns when the newest backup is stale — now its own Pending item, because the failure mode is silent.
- Neon's own history is **6 hours** on this plan. It is not the safety net; these are.

**2026-08-27 session — entries.tags dropped**
- [x] **`entries.tags` dropped from the production database.** Autogenerated by the model in the old format call, never written by hand, never used to find anything. Of 401 values, 54% restated a column the table already had and the rest were generic descriptors — one of them was literally `music`.
- [x] Removed from the insert, the update SET line and the comma-splitting helper in `database_actions.js`; code pushed and deployed **before** the column was dropped, so nothing was ever writing to a column that did not exist.
- [x] Backed up first — all 37 rows and 401 values are in `~/listening-notes-backups/2026-08-27-2046/entries.json`.
- [x] Verified after: every public page 200, 39 entries returned, genre intact on all 39.
- [ ] **Not yet exercised: saving a new entry.** The insert was changed and builds clean, but the write path has not been run — doing so would put a real album in the journal. Worth a glance the next time an album is logged; if the save fails, `save_new_entry` in `database_actions.js` is where to look.

**2026-08-27 session — dead code removed**
- [x] **1,132 lines of unreachable components deleted**, each verified by grep as having zero importers: `PulsePanel`, `PulseCard`, `EchoPaint`, `EchoPuzzle`, the `Vinyl` background (never in the backgrounds index), `MetadataLabelInline`, and `library/pulse_stats.js` (orphaned by the two Pulse deletions).
- [x] **`TopNav` and `NavBeacon` deleted.** `TopNav` was replaced by `DotNav`/`SiteNav` and nothing imported it; `NavBeacon` was imported only by `TopNav`, so it was dead transitively. Neither had rendered for some time.
- [x] **176 lines of `.topnav-*` CSS removed** from `globals.css` — dead once the component was. `.beacon-*` was checked first and kept: it belongs to `ListeningBeacon`, not the deleted nav.
- [x] **`dotenv` and `pg` removed** from dependencies. Neither appeared in any source file or npm script; the driver is `@neondatabase/serverless`.
- [x] **`/dashboard/bg-test` and `/dashboard/echo/loading-test` deleted** — scratch harnesses that shipped in every build.
- [x] README's component tree corrected — it still listed `EchoChat` (long gone), `TopNav`, `NavBeacon` and `MetadataLabelInline`, and omitted `SiteNav`, `DotNav`, `IdentityCard`, `Bookplate` and `FlipTile`.
- [x] Verified after: every public page 200, homepage and archive render unchanged, 39 albums load, zero console errors.

**2026-08-27 session — merged and shipped**
- [x] Everything below merged to `main` and deployed. Verified live: tab title, PWA manifest and RSS channel all read `Miyel · Listening Notes`; the beacon returns tracks, so `LASTFM_KEY` is set in Vercel; zero direct Last.fm calls from the page and no old key in the shipped HTML.
- [x] **Last.fm key rotated.** The old one stays in public history and is inert — see Gotchas.
- [x] **Secret audit** — all 370 commits searched; no env file was ever committed and no secret value appears anywhere in history.

**2026-08-27 session — Last.fm key to env, and one poll instead of six**
- [x] **`LASTFM_KEY` moved to the environment** and read only on the server, by the new `/api/public/beacon`. The key was hardcoded in two files, so every copy of this software queried Last.fm as the same application and shared one rate limit.
- [x] **Polling deduplicated** — `useListeningBeacon` is called by five components and each used to run its own 15-second timer; four mount on the landing page together, so one visitor made ~16 requests a minute, plus a sixth timer inside NavBeacon. One shared poll now, via `useSyncExternalStore`, started on the first subscriber and stopped on the last.
- [x] **Upstream answer cached 10s** on the server, so a hundred readers cost one Last.fm request rather than sixteen hundred.
- [x] NavBeacon's separate "recently played" fetch removed — it comes off the same poll.

**2026-08-27 session — documentation restructure**
- [x] `DECISIONS.md` added and tracked — what is settled, and why
- [x] `NOTES.md` trimmed — Architecture tables cut (they duplicated the README line for line), stale entries fixed, standing end-of-session instruction added
- [x] README given an opening for strangers — what it is, what you need, deploy button, first-run steps
- [x] `.env.example` added as the single list of required variables; `.gitignore` updated to let it through
- [x] `Notes.md` renamed to `NOTES.md` to match the other docs

**2026-08-25/26 session — config values, licence, naming**
- [x] **AGPL-3.0-or-later** — `LICENSE` (verbatim FSF text), notice and plain-English summary in the README
- [x] **DCO sign-off** — `DCO` (Linux Foundation 1.1) plus `CONTRIBUTING.md`
- [x] **Per-file notices** — copyright line + SPDX identifier at the top of all 128 source files
- [x] **Hardcode pass** — nothing in the code names Miyel any more; verified by rendering eight pages with settings forced blank
- [x] **`coverName()` / `titleName()`** — one name for people, one for machines; titles read `{keeper_name} · Listening Notes` everywhere
- [x] **`display_name`** added; the decorated name moved off `keeper_name`
- [x] **`serial`, `setup_complete`** added, write-once where it matters
- [x] Instagram button removed from the nav; links live on the card
- [x] Owner row found by being oldest rather than by a hardcoded handle
- [x] `manifest.js` made `force-dynamic` — it is a cached route handler, so the journal's name was otherwise baked in at build time

**2026-06-24 session — research overhaul + journal direction**
- [x] Domain live — `www.listeningnotes.blog` on Vercel (apex still on Tumblr, needs Cloudflare later)
- [x] Fixed retired model id → `claude-sonnet-4-6` (old `claude-sonnet-4-20250514` 404'd, broke all AI)
- [x] **Web-searched cited research** — `research_album` uses the Anthropic `web_search` tool to verify facts, writes cited prose, and AlbumDebrief renders Wikipedia-style `[n]` footnote markers + a numbered Sources list (real, clickable links)
- [x] **Tracklist fix** — pulls the full ordered list via iTunes *collection lookup* (threads exact `collectionId` from the picker) instead of a partial song-search
- [x] **Journal direction** — removed the AI-written `background` from posts (post page, modal, preview, CMS); posts are now the user's own notes only
- [x] Removed the Echo interpretive **debrief** from the session; removed **EchoOrb + EchoChat** (bottom-right orb + chat popup)
- [x] Removed the global white **header fade** (`.hp-headerbar`)
- [x] Readability pass on the session debrief (dark scrim, upright body, contrast); Echo prompt now sentence-cased
- [x] Fixed the loading-screen **freeze** (gate the panel reveal on research finishing, since web search is slower)

**Earlier**
- [x] Public `/about` page — unified About + Specs + Index with sticky jump nav, star + relationship index reference — *superseded; `/about` and `/rig` now redirect home, the identity card is the About page, and the marks live at `/key`*
- [x] Public `/archive` page — album-tile grid with search, 5 sort modes, relationship + type filters, favorites/masterpiece toggles
- [x] Public `/compare` placeholder route — *superseded; `/compare` is built and working*
- [x] Public `/shuffle` route — server-side random redirect to a random entry
- [x] TopNav flattened — About · Archive · Compare · Submit · Surprise (no dropdowns)
- [x] Session hub — fourth card added (Share) with placeholder route at `/dashboard/share`
- [x] Phase 1 display fixes — favorite indicator, masterpiece logic (all-tracks-5★ rule), simultaneous horizon bar animation, star display glitch, track_notes wiring across modal + slug page
- [x] Session auth — real JWT cookie protection (wristband system) on all session API routes
- [x] Public /submit page — album, artist, year, note, optional name/email
- [x] Submissions DB table + API routes (POST, GET, PATCH status)
- [x] Session submissions inbox (/dashboard/submissions) — tabs, note preview, listen/dismiss
- [x] Session hub redesigned — three horizontal app-icon cards
- [x] Ln. logo in TopNav, inverts for dark mode
- [x] NavBeacon added to TopNav on all pages, hidden on homepage
- [x] NavBeacon updated to CSS variables (respects light/dark mode)
- [x] Accent color changed to dreamy LED blue-white (#c8dfff / #ddeeff) — *superseded; the accent is a warm grey now, see `library/sitewide_visuals.js`*
- [x] Live beacon dot restored to green (#7cff9b)
- [x] Codebase refactor — library/, main_components/, session_components/ structure
- [x] Individual post pages with their own URL
- [x] Horizon bar logic
- [x] Notes box auto-expands while typing
- [x] Light/dark mode toggle
- [x] Session posts directly to database
- [x] Password protected session
- [x] Track notes field
- [x] Album art via iTunes API
- [x] Session: artist-first album picker with iTunes search
- [x] Session: frosted loading overlay with fill animation
- [x] Session: album art full-bleed background with glass panels
- [x] Session: draft auto-save to localStorage
- [x] Session: /dashboard/entries CMS
- [x] Session: AI chat companion (Echo)
- [x] Comments pending moderation queue
- [x] Format route preserves writer voice
- [x] PATCH route for /api/entries/[slug]
- [x] Session: full 6-step flow (Debrief, Tracks, Notes, Reflect, Tags, Preview) — sidebar layout, frosted glass panel, blurred art background, grayscale-to-color fill animation
- [x] Session: rating + Masterpiece/Favorite merged into Album Notes step
- [x] Session: animated canvas backgrounds (9 unique scenes — Rain, DVD, Gallery, Fizzy, SplitScreen, Snake, Pong, Solitaire, Reel) — randomly assigned on load, each uses album art from listening history
- [x] Echo album discovery — artist search → EchoNetwork canvas animation → album cards reel in from nodes → flying album pick animation → PreListenQuestionnaire (Q1: relationship, Q2: source)
- [x] URL restructure — `/session` → `/dashboard`, listening experience split into `/dashboard/echo` (album search) + `/dashboard/echo/session` (note-taking)
- [x] 1,362-line monolith refactored into hooks + step components: `useAlbumSelection`, `useListeningSession`, `SessionButton`, six step components in `steps/`, shared styles in `library/session_styles.js`

---
