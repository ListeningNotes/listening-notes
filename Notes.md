# NOTES.MD

---

## Pending

**DEV**
- [ ] Connect domain listeningnotes.blog (currently pointing to Tumblr)
- [ ] Instagram + Reddit auto-distribution (placeholder lives at `/session/share`; real implementation pending — see to-do list on that page)

**HOME**
- [ ] Brainstorm alternative to scrolling album strip for recent entries
- [ ] Jiggle animation on album tile hover
- [ ] Better live track logic (sticky state past Last.fm delay)
- [ ] Beacon centering fix when open

**MODAL**
- [ ] Album art loads fully before data appears (or click-to-reveal)
- [ ] Sticky collapse animation is glitchy — needs smoother transition
- [ ] Horizon track names only load for some albums
- [ ] Subtle background fade behind modal
- [ ] Link to full page (open in new tab)

**PUBLIC PAGES — VISUAL POLISH**
- [ ] `/about` — visual pass (typography, hero, section transitions)
- [ ] `/archive` — visual pass (tile sizing, filter bar, hover states)
- [ ] `/compare` — design + build (currently coming-soon placeholder)
- [ ] Slug page (`/entries/[slug]`) — full redesign

**SESSION**
- [ ] Spotify data panel (monthly listeners, artist ranking)
- [ ] Discogs genre tags via Claude API
- [ ] Apple Music playback (requires MusicKit JS + Apple developer account)
- [ ] Inbox (/session/inbox) — build out with Comments + Submissions tabs
- [ ] Share (/session/share) — wire Reddit + Instagram backends (currently placeholder)

**SECURITY**
- [ ] Upvote abuse prevention (IP or cookie check)

**BEFORE GOING LIVE — DEPLOYMENT CHECKLIST**

The session is now protected by a JWT "wristband" cookie (see `library/wristband.js`). Two env vars control it:
- `SESSION_PASSWORD` — the password typed into the gate
- `SESSION_SECRET` — the signing key for the JWT (never share, never change after launch or it logs everyone out)

**Step 1 — Strengthen the password (local):**
1. Pick a strong password (something longer/random — `listeningnotes` is fine for dev only)
2. Update `.env.local`: `SESSION_PASSWORD=<new strong password>`
3. Restart `npm run dev` (env vars only load at boot)
4. Test: log out, log back in with the new password

**Step 2 — Set Vercel env vars:**
In Vercel dashboard → Project → Settings → Environment Variables, confirm/add:
- `SESSION_PASSWORD` = <same strong password>
- `SESSION_SECRET` = <same as .env.local>
- `DATABASE_URL` (already there)
- `ANTHROPIC_API_KEY` (already there)

**Step 3 — Merge `session-redesign` → `main`:**
```
git checkout main
git merge session-redesign     # fast-forward, no conflicts expected
git push origin main           # this triggers Vercel deploy
```

**Step 4 — Smoke-test prod:**
- `/` (homepage)
- `/about`, `/archive`, `/shuffle`, `/compare`
- `/session` — log in with new password
- Run a real listen session end-to-end

**Step 5 — If anything breaks:**
Vercel dashboard → Deployments → click last good deploy → "Promote to Production" rolls back instantly.

---

## Complete
- [x] Public `/about` page — unified About + Specs + Index with sticky jump nav, star + relationship index reference
- [x] Public `/archive` page — album-tile grid with search, 5 sort modes, relationship + type filters, favorites/masterpiece toggles
- [x] Public `/compare` placeholder route
- [x] Public `/shuffle` route — server-side random redirect to a random entry
- [x] TopNav flattened — About · Archive · Compare · Submit · Surprise (no dropdowns)
- [x] Session hub — fourth card added (Share) with placeholder route at `/session/share`
- [x] Phase 1 display fixes — favorite indicator, masterpiece logic (all-tracks-5★ rule), simultaneous horizon bar animation, star display glitch, track_notes wiring across modal + slug page
- [x] Session auth — real JWT cookie protection (wristband system) on all session API routes
- [x] Public /submit page — album, artist, year, note, optional name/email
- [x] Submissions DB table + API routes (POST, GET, PATCH status)
- [x] Session submissions inbox (/session/submissions) — tabs, note preview, listen/dismiss
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
- [x] Session: /session/entries CMS
- [x] Session: AI chat companion (Echo)
- [x] Comments pending moderation queue
- [x] Format route preserves writer voice
- [x] PATCH route for /api/entries/[slug]
- [x] Session: full redesign at /session/listen — sidebar layout, 6-step flow (Debrief, Tracks, Notes, Reflect, Tags, Preview)
- [x] Session: frosted glass panel with blurred art background
- [x] Session: grayscale-to-color fill-in on loading background (B&W art revealed by color sweep)
- [x] Session: rating + Masterpiece/Favorite merged into Album Notes step
- [x] Session: hub page at /session — clean 3-button layout (Listen, Entries, Inbox)
- [x] Session: /session/inbox placeholder route
- [x] Session: animated canvas backgrounds (9 unique scenes — Rain, DVD, Gallery, Fizzy, SplitScreen, Snake, Pong, Solitaire, Reel) — randomly assigned on load, each uses album art from listening history

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
| `ai_integration.js` | Claude API calls: `research_album`, `format_post`, `ask_echo` |
| `music_data_api.js` | External music APIs: `fetchTracklist` (MusicBrainz), `fetchAlbumArtUrl` (iTunes), `searchArtistAlbums` (iTunes) |
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
| `POST /api/research` | Calls Claude to research an album |
| `POST /api/format` | Calls Claude to format raw notes into a post |
| `POST /api/reflect` | Calls Claude as listening companion (Echo) |
| `POST /api/auth/login` | Checks password, issues wristband cookie |
| `POST /api/auth/logout` | Clears wristband cookie |
| `GET /api/auth/check` | Returns `{authed: true/false}` based on wristband cookie |

Protected routes (require wristband cookie): `POST /api/entries`, `PATCH/DELETE /api/entries/[slug]`, `POST /api/research`, `POST /api/format`, `POST /api/reflect`. Public routes stay public: all GETs, `/api/comments`, `/api/submissions`.

---

### Components — The Furniture
`/components` holds all visual UI pieces. Two rooms:

**`main_components/`** — public-facing UI
| File | What it does |
|------|-------------|
| `TopNav.js` | Floating pill navigation (homepage) |
| `Hero.js` | Full-bleed beacon section (homepage) |
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

**`session_components/`** — private session tool UI
| File | What it does |
|------|-------------|
| `PasswordGate.js` | Password screen |
| `AlbumSelection.js` | Artist search + album grid picker |
| `LoadingResearch.js` | Full-screen loading overlay during research |
| `StarRating.js` | Interactive star input (click to rate) |
| `backgrounds/Rain.js` | Album art tiles falling in sparse lanes at varying sizes/speeds |
| `backgrounds/DVD.js` | Single album bouncing wall-to-wall DVD-style |
| `backgrounds/Gallery.js` | Slow-drifting full-bleed album panorama |
| `backgrounds/Fizzy.js` | Floating bubbles of album art |
| `backgrounds/SplitScreen.js` | Screen split into panels, each cycling albums |
| `backgrounds/Snake.js` | Snake game played with album tiles |
| `backgrounds/Pong.js` | Pong — album art as the ball, diagonal physics |
| `backgrounds/Solitaire.js` | Album cards tossed from random positions, leaving ghost trails |
| `backgrounds/Reel.js` | Album carousel spinning on a 3D reel, starts spinning on load |
| `backgrounds/index.js` | Exports all backgrounds as a named array |

---

### Pages — The Rooms
`/app` — Next.js pages. Each one assembles components into a full screen.

| File | URL | What it does |
|------|-----|-------------|
| `page.js` | `/` | Homepage — imports TopNav, Hero, AlbumStrip |
| `about/page.js` | `/about` | Unified About / Specs / Index with sticky jump nav |
| `archive/page.js` | `/archive` | Sortable + filterable album-tile grid of every entry |
| `compare/page.js` | `/compare` | Coming-soon placeholder |
| `shuffle/page.js` | `/shuffle` | Server-side: picks random entry, redirects to its slug |
| `submit/page.js` | `/submit` | Public album submission form |
| `entries/[slug]/page.js` | `/entries/pet-sounds` | Fetches entry server-side, passes to FullPostPage |
| `entries/[slug]/FullPostPage.js` | — | Full public post page with comments |
| `session/page.js` | `/session` | Hub — password gate + 4 buttons (Listen, Entries, Inbox, Share) |
| `session/listen/page.js` | `/session/listen` | Full listening session — 6-step flow, sidebar, frosted panel |
| `session/entries/page.js` | `/session/entries` | Private CMS — edit/delete all entries |
| `session/submissions/page.js` | `/session/submissions` | Submission inbox — pending/reviewed/dismissed tabs |
| `session/inbox/page.js` | `/session/inbox` | Inbox — placeholder, not yet built |
| `session/share/page.js` | `/session/share` | Share placeholder — Reddit/Instagram integration to-do list |

---

### Hooks
`/hooks/useListeningBeacon.js` — polls Last.fm every 15s for current track. Used by Hero and NavBeacon.

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
