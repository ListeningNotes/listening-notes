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
- [ ] **Migration runner** — nothing executes `schema.sql`. A fresh copy has no tables and no way to make them without opening Neon's SQL editor by hand. `schema.sql` has also never actually been run against an empty database; every statement is guarded, but "reads correctly" and "builds a working journal from nothing" are different claims and only the first is checked.
- [ ] **Welcome screen** — first run should ask who this copy belongs to and write the owner row plus the settings row. `setup_complete` exists as a column and nothing sets it. Until this lands, `keeper_name`, `founded_at` and `serial` can only be set in the database.
- [ ] **Deploy button** — the README has one, but it lands on a copy with no schema. Blocked on the migration runner.
- [ ] **`/api/export`** — a copy should be able to hand its owner their own data back.

**STRUCTURE** — see DECISIONS.md before starting any of these

The cross itself is built and on the branch `cross-nav`. What is left of it:

- [ ] **Journal** — the wall of covers extracted out of `app/archive/page.js` into one component, mounted by the centre pane *and* by `/archive`. The centre pane still shows the old 8-tile strip until this lands.
- [ ] **`usePlaceKeeper`** — pane index and per-pane scroll offset, kept across a route change. Swiping between panes already remembers itself (they stay mounted); going out to an entry and back does not, because browsers do not restore nested scroll containers.
- [ ] **`useShake` + `firework()`** — shake the phone, a firework goes up, then `/shuffle`. The Surprise pill stays where it is.
- [ ] **Re-home DotNav's four destinations.** Archive becomes the centre pane's lower half, Compare and Surprise are pills at the foot of the journal, Submit is a visitor door. The dot row has nothing left to point at once Journal lands.
- [ ] **Delete the dead `.hp-*` homepage CSS.** `.hp-mobile-screens`, `.hp-screen--one`, `.hp-screen--two` and everything under them — nothing renders those class names any more. Four rules inside them did real work and are already restated against `.hn`; the rest is roughly 300 lines that can go. Left in place deliberately so the restructure could be reviewed without a find-and-replace on the beacon.
- [ ] **A QR on the pitch pane.** DECISIONS already settles that the right pane produces a fixed code to `/get`, the same on every copy. Not built, and the "logo made of the QR" idea is unresolved.
- [ ] **`settings.bio` now has no reader and no writer.** Deliberate — see DECISIONS. The value is still in the database. Decide at the welcome screen whether the column gets a job or gets dropped, while the schema is still a draft.
- [ ] **`/rig` is still a forwarding stub**, and by the same argument that deleted `/why` it may not have earned one: three days live, linked from a card, on a site nobody else runs. `/about` genuinely did earn its stub. Worth one decision rather than two defaults.
- [ ] **`/get` is half a page.** It renders the essay and nothing else. The other half of what that address owes a stranger — what the software is, that it is free, and the way to install a copy — is unwritten, so somebody arriving from another copy's pitch pane reads the why and finds no door. Its tab still reads `Why · …` too.
- [ ] **Source link wants a settings column.** It ships today as `NEXT_PUBLIC_SOURCE_URL` defaulting to upstream, which is the smaller half of the job — a modified copy owes *its own* source and should not need a redeploy to say so.
- [ ] **Listen numbering** — an album has many listens, numbered, computed from `album_key` and never chosen.
- [ ] **The feed as a network** — `/feed.xml` publishes, but nothing reads anyone else's. Two views, submissions first. A shelf, not a river.
- [ ] **Relationship field removal** — every value has dissolved into something else. Legacy data stays; the picker goes.

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
- [ ] `entries.relationship` — DECISIONS.md records the field as removed and
      the picker gone, but the column and its legacy values remain.
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

- [ ] Upvote abuse prevention (IP or cookie check)

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
- [ ] Inbox (`/dashboard/inbox`) — built; still wants the Comments + Submissions tabs finished
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
