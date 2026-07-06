# NOTES.MD

---

## Working With Claude

**Naming new code — always ask first.** Before creating ANY new function, page (route), or JavaScript file, Claude must pause and let me name it — propose options, then I pick or override. This applies to NEW things only (editing/renaming existing code follows the normal flow) and to every session. Reason: I want to be able to read and understand my own code later, even without a tool to explain it — names I chose are names I'll recognize.

---

## Pending

**DEV**
- [x] Domain live — `www.listeningnotes.blog` points to Vercel (HTTPS, working)
- [ ] Bare apex `listeningnotes.blog` still can't reach Vercel — Tumblr locks its apex A record, so this needs a later move to Cloudflare DNS (www works today)
- [ ] Instagram + Reddit auto-distribution (placeholder lives at `/dashboard/share`; real implementation pending — see to-do list on that page)

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
- [ ] `/about` — visual pass (typography, hero, section transitions)
- [ ] `/archive` — visual pass (tile sizing, filter bar, hover states)
- [ ] `/compare` — design + build (currently coming-soon placeholder)
- [ ] Slug page (`/entries/[slug]`) — full redesign

**DASHBOARD**
- [ ] Spotify data panel (monthly listeners, artist ranking)
- [ ] Discogs genre tags via Claude API
- [ ] Apple Music playback (requires MusicKit JS + Apple developer account)
- [ ] Inbox (`/dashboard/inbox`) — build out with Comments + Submissions tabs
- [ ] Share (`/dashboard/share`) — wire Reddit + Instagram backends (currently placeholder)

**SECURITY**
- [ ] Upvote abuse prevention (IP or cookie check)

**LIVE STATUS (as of 2026-06-24)**

The site is live at `www.listeningnotes.blog` (Vercel, HTTPS). Session is protected by a JWT "wristband" cookie (`library/wristband.js`). Env vars set in Vercel: `SESSION_PASSWORD`, `SESSION_SECRET` (never change after launch), `DATABASE_URL`, `ANTHROPIC_API_KEY`.

**Billing gotcha (learned the hard way):** the `ANTHROPIC_API_KEY` bills from the **Developer/API credit balance** in the Claude Console — a *separate pool* from the Claude.ai subscription "usage credits." Same account (Miyel), two banks. If the site returns `credit balance too low`, top up the **API** balance (Console → Billing) and turn on **auto-reload** so it never stalls. Web search (~5¢/album) draws from this too.

**Rollback:** Vercel → Deployments → last good deploy → "Promote to Production" is instant.

---

## Complete

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
- [x] Public `/about` page — unified About + Specs + Index with sticky jump nav, star + relationship index reference
- [x] Public `/archive` page — album-tile grid with search, 5 sort modes, relationship + type filters, favorites/masterpiece toggles
- [x] Public `/compare` placeholder route
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
- [x] Accent color changed to dreamy LED blue-white (#c8dfff / #ddeeff)
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

## Architecture — The House

Think of the codebase as a house. Every piece has a room.

### Library — Systems Behind the Walls
`/library` holds all the logic that powers the site. Nothing visual lives here. If something breaks or you want to change how something works, start here.

| File | What it does |
|------|-------------|
| `database_connection.js` | Opens the connection to Neon Postgres. Every DB query imports from here. |
| `database_actions.js` | All entry DB functions: `pull_all_entries`, `pull_entry_by_slug`, `save_new_entry`, `update_entry`, `delete_entry` |
| `comment_actions.js` | Comment DB functions: `nest_comments`, `save_comment`, `upvote_comment` |
| `slug_generator.js` | `create_slug` — turns "Pet Sounds" into "pet-sounds" |
| `entry_formatter.js` | Parses entry data for display: `parseHorizon`, `parseTracksFromNotes`, `splitNotes`, `parseRating` |
| `sitewide_visuals.js` | Design tokens: all colors and fonts. Change here = changes everywhere. |
| `session_styles.js` | Style helpers scoped to the session panel: `tx()`, `bdr()`, `dk()`, `lbl` |
| `ai_integration.js` | Claude API calls: `research_album` (web-searched, returns cited-prose `sections` + numbered `sources`), `format_post` (notes-only now — no AI background), `ask_echo` |
| `music_data_api.js` | External music APIs (all iTunes/Apple Music): `fetchTracklist` (collection lookup via exact `collectionId`, complete + ordered), `fetchAlbumArtUrl`, `searchArtistAlbums` (now also returns `collectionId`) |
| `session_timers.js` | `TrackLength`, `SessionDuration`, `LOADING_PHRASES` |
| `wristband.js` | Session auth: `issueWristband`, `checkWristband`, `requireWristband`, `WRISTBAND_COOKIE` |

---

### API Routes — The Front Door
`/app/api` — these are the doors people and the app knock on. Each route is thin — it receives a request, calls the library, and sends back a response. No logic lives here.

| Route | What it does |
|-------|-------------|
| `GET /api/entries` | Returns all entries (homepage) |
| `POST /api/entries` | Saves a new entry (session tool) |
| `GET /api/entries/[slug]` | Returns one entry by slug (post page, modal) |
| `PATCH /api/entries/[slug]` | Updates an entry (session CMS) |
| `DELETE /api/entries/[slug]` | Deletes an entry (session CMS) |
| `GET /api/comments?slug=` | Returns approved comments for an entry |
| `POST /api/comments` | Submits a new comment (pending approval) |
| `POST /api/comments/upvote` | Upvotes a comment |
| `POST /api/research` | Calls Claude (with web search) to research an album — returns cited sections + numbered sources |
| `POST /api/format` | Calls Claude to format raw notes into a post |
| `POST /api/echo` | Echo AI — Reflect-step chat only (the research-briefing debrief + floating chat panel were removed) |
| `POST /api/auth/login` | Checks password, issues wristband cookie |
| `POST /api/auth/logout` | Clears wristband cookie |
| `GET /api/auth/check` | Returns `{authed: true/false}` based on wristband cookie |

Protected routes (require wristband cookie): `POST /api/entries`, `PATCH/DELETE /api/entries/[slug]`, `POST /api/research`, `POST /api/format`, `POST /api/echo`. Public routes stay public: all GETs, `/api/comments`, `/api/submissions`.

---

### Components — The Furniture
`/components` holds all visual UI pieces. Two rooms:

**`main_components/`** — public-facing UI
| File | What it does |
|------|-------------|
| `TopNav.js` | Floating pill navigation (homepage) |
| `ListeningBeacon.js` | Full-bleed beacon section (homepage) |
| `AlbumStrip.js` | Auto-scrolling album tiles (homepage) |
| `NavBeacon.js` | Compact listening beacon (all pages except homepage) |
| `EntryModal.js` | Album overlay modal (homepage click) |
| `StarRating.js` | Read-only star display (modal + post page) |
| `Lightswitch.js` | Light/dark mode provider (wraps entire app) |
| `entry_modal/HorizonGenerator.js` | Bar chart inside the modal |
| `entry_modal/StickyHeader.js` | Compact metadata bar on modal scroll |
| `Slug_Page/CommentThread.js` | Single comment + replies |
| `Slug_Page/NewCommentForm.js` | Comment submission form |
| `Slug_Page/TrackThread.js` | Expandable track row with comments |
| `Slug_Page/HorizonBar.js` | Bar chart on post page (click to scroll) |
| `Slug_Page/MetadataLabel.js` | Section label (uppercase, with border) |
| `Slug_Page/MetadataLabelInline.js` | Section label (no border, inline) |
| `Slug_Page/Chip.js` | Pill tag (relationship, type, favorite) |

**`session_components/`** — private dashboard UI
| File | What it does |
|------|-------------|
| `PasswordGate.js` | Password screen |
| `SessionButton.js` | Frosted pill button — accent=true gives yellow-green highlight |
| `StarRating.js` | Interactive star input (click to rate) |
| `steps/AlbumDebrief.js` | Step 0 — web-grounded research as cited prose with `[n]` footnote links + numbered Sources list (Echo narrative removed) |
| `steps/TrackNotes.js` | Step 1 — expandable track list with per-track notes and ratings |
| `steps/AlbumNotes.js` | Step 2 — star rating, Masterpiece/Favorite flags, free-text notes |
| `steps/ReflectChat.js` | Step 3 — Echo-powered reflection chat with quick-prompt shortcuts |
| `steps/TagsEditor.js` | Step 4 — add/remove/review tags before preview |
| `steps/SessionPreview.js` | Step 5 — formatted entry preview with save action |
| `steps/PreListenQuestionnaire.js` | Two questions before research fires (relationship + source) |
| `backgrounds/Rain.js` | Album art tiles falling in sparse lanes |
| `backgrounds/DVD.js` | Single album bouncing wall-to-wall DVD-style |
| `backgrounds/Gallery.js` | Slow-drifting full-bleed album panorama |
| `backgrounds/Fizzy.js` | Floating bubbles of album art |
| `backgrounds/SplitScreen.js` | Screen split into panels, each cycling albums |
| `backgrounds/Snake.js` | Snake game played with album tiles |
| `backgrounds/Pong.js` | Pong — album art as the ball |
| `backgrounds/Solitaire.js` | Album cards tossed from random positions |
| `backgrounds/Reel.js` | Album carousel spinning on a 3D reel |
| `backgrounds/index.js` | Exports all backgrounds as a named array |

**Top-level components**
| File | What it does |
|------|-------------|
| `EchoNetwork.js` | Canvas animation — floating nodes → album art (search backdrop + session puzzle-load screen) |

*(EchoOrb.js and EchoChat.js were removed — the bottom-right orb + click-to-chat popup are gone.)*

---

### Hooks
| File | What it does |
|------|-------------|
| `hooks/useListeningBeacon.js` | Polls Last.fm every 15s for current track. Used by ListeningBeacon and NavBeacon. |
| `hooks/useAlbumSelection.js` | Owns the full album search and selection flow: artist search, EchoNetwork animation, card phases, grid pagination, fly-to-center animation, manual entry |
| `hooks/useListeningSession.js` | Owns every API call and piece of state for an active session: research, notes, tracks, ratings, tags, Reflect chat, formatting, saving (Echo debrief/orb/chat state removed) |

---

### Pages — The Rooms
`/app` — Next.js pages. Each one assembles components into a full screen.

| File | URL | What it does |
|------|-----|-------------|
| `page.js` | `/` | Homepage — imports DotNav, AlbumStrip, ListeningBeacon |
| `about/page.js` | `/about` | Unified About / Specs / Index with sticky jump nav |
| `archive/page.js` | `/archive` | Sortable + filterable album-tile grid of every entry |
| `compare/page.js` | `/compare` | Coming-soon placeholder |
| `shuffle/page.js` | `/shuffle` | Server-side: picks random entry, redirects to its slug |
| `submit/page.js` | `/submit` | Public album submission form |
| `entries/[slug]/page.js` | `/entries/pet-sounds` | Fetches entry server-side, passes to FullPostPage |
| `entries/[slug]/FullPostPage.js` | — | Full public post page with comments |
| `dashboard/page.js` | `/dashboard` | Hub — password gate + 4 buttons (Listen, Entries, Inbox, Share) |
| `dashboard/echo/page.js` | `/dashboard/echo` | Album search — EchoNetwork, artist search, album grid, PreListenQuestionnaire |
| `dashboard/echo/session/page.js` | `/dashboard/echo/session` | Full listening session — 6-step flow, sidebar, frosted panel |
| `dashboard/entries/page.js` | `/dashboard/entries` | Private CMS — edit/delete all entries |
| `dashboard/submissions/page.js` | `/dashboard/submissions` | Submission inbox — pending/reviewed/dismissed tabs |
| `dashboard/inbox/page.js` | `/dashboard/inbox` | Inbox — placeholder, not yet built |
| `dashboard/share/page.js` | `/dashboard/share` | Share placeholder — Reddit/Instagram integration to-do list |
| `dashboard/bg-test/page.js` | `/dashboard/bg-test` | Dev tool — preview all 9 canvas backgrounds |

---

## Design Tokens
All colors and fonts live in `library/sitewide_visuals.js`. Change them there and they update everywhere.

```js
colors.background    #0e0e0e   — page background
colors.panel         #161616   — cards, panels
colors.text          #e8e4dc   — primary text
colors.accent        #c8d47a   — green accent
colors.border        #2a2a2a   — borders
colors.gold          #E8B84B   — star ratings
colors.secondary_text #555     — muted text

fonts.serif   DM Serif Display
fonts.mono    DM Mono
fonts.sans    DM Sans
```

---

## File Write Rules
- JS files — edit directly in VS Code
- `.env.local` — use Python from terminal (VS Code silently fails)
- Never use heredoc with backticks in JSX — write to `/tmp/file.py` first
- Verify env writes with: `cat .env.local`

## Environment Variables
- `DATABASE_URL` — Neon Postgres connection string
- `ANTHROPIC_API_KEY` — Claude API key
- `SESSION_SECRET` — JWT signing key (don't change after launch — invalidates every session)
- `SESSION_PASSWORD` — the password typed into the session gate

## Git Workflow
- Commit after each verified working checkpoint
- `git restore <file>` to undo a single file
- `git add -A && git commit -m "message"`
