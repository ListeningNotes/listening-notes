# NOTES archive

What was finished before September 2026, moved out of [NOTES.md](../NOTES.md)
so the file read at the start of a session holds only what is pending, the
gotchas that still bite, and the last few weeks of what got done. Nothing here
is deleted, and nothing here is current: it is the record of how the site got
to where NOTES.md picks up. The twin of [DECISIONS-ARCHIVE.md](DECISIONS-ARCHIVE.md),
and not read at session start for the same reason.

Newest first. Each block was the end-of-session note written at the time.

---

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
- [x] **`scripts/backup.mjs`** — every table to `<BACKUP_DIR>/<timestamp>/`, with `migrations/` copied in and a manifest. Keeps 30, prunes the rest, exits non-zero if a table fails so a silent half-backup can't pass as a good one. `npm run backup`.
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
