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

**SHIPPING A COPY** — the gap between "it runs here" and "someone else can run it"
- [ ] **Migration runner** — nothing executes `schema.sql`. A fresh copy has no tables and no way to make them without opening Neon's SQL editor by hand. `schema.sql` has also never actually been run against an empty database; every statement is guarded, but "reads correctly" and "builds a working journal from nothing" are different claims and only the first is checked.
- [ ] **Welcome screen** — first run should ask who this copy belongs to and write the owner row plus the settings row. `setup_complete` exists as a column and nothing sets it. Until this lands, `keeper_name`, `founded_at` and `serial` can only be set in the database.
- [ ] **Deploy button** — the README has one, but it lands on a copy with no schema. Blocked on the migration runner.
- [ ] **`/api/export`** — a copy should be able to hand its owner their own data back.

**STRUCTURE** — see DECISIONS.md before starting any of these
- [ ] **Cross navigation** — beacon is home; down to the journal, left to About, right to actions or the pitch pane. Replaces the card flip, which is dead.
- [ ] **Source link** — one faint line at the foot of the About pane. Satisfies AGPL §13 for modified copies. Must be a config value defaulting to upstream, because a modified copy owes *its own* source, not this repo's.
- [ ] **Pitch pane** — logged out, right swipe: three sentences and a button to `/get`. Ships on every copy.
- [ ] **Listen numbering** — an album has many listens, numbered, computed from `album_key` and never chosen.
- [ ] **The feed as a network** — `/feed.xml` publishes, but nothing reads anyone else's. Two views, submissions first. A shelf, not a river.
- [ ] **Relationship field removal** — every value has dissolved into something else. Legacy data stays; the picker goes.

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
  advance, because it looks exactly like being locked out. This softens the
  "never change after launch" line in `.env.example` and the README: the real
  cost is typing the password once.

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
fixed elements. Watch for it on the archive.

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
