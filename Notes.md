# NOTES.MD

---

## Pending

**DEV**
- [ ] Connect domain listeningnotes.blog (currently pointing to Tumblr)
- [ ] Instagram + Reddit auto-distribution after posting
- [ ] Moderation inbox in /session (approve/reject comments + submissions)

**HOME**
- [ ] Brainstorm alternative to scrolling album strip for recent entries
- [ ] Connect navigation bar links to actual pages
- [ ] Jiggle animation on album tile hover
- [ ] Better live track logic (sticky state past Last.fm delay)
- [ ] Beacon centering fix when open

**MODAL**
- [ ] Album art loads fully before data appears (or click-to-reveal)
- [ ] Sticky collapse animation is glitchy — needs smoother transition
- [ ] Horizon track names only load for some albums
- [ ] Star display glitch (screenshot taken)
- [ ] Subtle background fade behind modal
- [ ] Link to full page (open in new tab)
- [ ] Favorite not showing — showing · instead
- [ ] Masterpiece logic: only if ALL tracks are 5 stars (not just the album rating)
- [ ] Horizon bars should all rise simultaneously, not staggered

**SLUG PAGE**
- [ ] Full redesign of the public entry/post page

**SESSION**
- [ ] Spotify data panel (monthly listeners, artist ranking)
- [ ] Discogs genre tags via Claude API
- [ ] Apple Music playback (requires MusicKit JS + Apple developer account)
- [ ] Session hub (/session) — styling needs a full pass
- [ ] Inbox (/session/inbox) — placeholder only, needs to be built out
- [ ] Future: randomize album art layout per visit (10+ layouts, more entries = more unlocked)

**SECURITY**
- [ ] API routes unprotected — POST /api/entries, /api/research, /api/format, /api/reflect open to anyone
- [ ] Fix: server-side session token approach (deferred until public launch)
- [ ] Upvote abuse prevention (IP or cookie check)

---

## Complete
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

---

### Pages — The Rooms
`/app` — Next.js pages. Each one assembles components into a full screen.

| File | URL | What it does |
|------|-----|-------------|
| `page.js` | `/` | Homepage — imports TopNav, Hero, AlbumStrip |
| `entries/[slug]/page.js` | `/entries/pet-sounds` | Fetches entry server-side, passes to FullPostPage |
| `entries/[slug]/FullPostPage.js` | — | Full public post page with comments |
| `session/page.js` | `/session` | Hub — password gate + 3 buttons (Listen, Entries, Inbox) |
| `session/listen/page.js` | `/session/listen` | Full listening session — 6-step flow, sidebar, frosted panel |
| `session/entries/page.js` | `/session/entries` | Private CMS — edit/delete all entries |
| `session/inbox/page.js` | `/session/inbox` | Inbox — placeholder, not yet built |

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
- `SESSION_SECRET` — saved in Vercel + .env.local (not yet wired to route protection)

## Git Workflow
- Commit after each verified working checkpoint
- `git restore <file>` to undo a single file
- `git add -A && git commit -m "message"`
