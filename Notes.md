# NOTES.MD

Personal Checklist:

PENDING

- [ ] DEV — Connect domain listeningnotes.blog
- [ ] DEV — Instagram + Reddit distribution
- [ ] DEV — Ability for people to comment on post URL page

- [ ] SLUG — Redesign actual post page

- [ ] MODAL — album art fully shows, then data loads in. Or CLICK to show album art and everything leaves screen
- [ ] MODAL — Scroll sticky collapse needs to be MUCH smoother and not take to a new spot. Feels so glitchy
- [ ] MODAL — Horizon track names only loads for some albums
- [ ] MODAL — weird glitch with stars, (took screenshot)
- [ ] MODAL — Maybe I do want background of website to fade just a tiny bit.
- [ ] MODAL — link to full page open in new tab
- [ ] MODAL — favorite not showing, showing · ?
- [ ] MODAL — Masterpiece logic (only if it's all tracks 5 star, not just any 5 star album ex: as tall as lions)
- [ ] MODAL — Horizons should all raise at the same time, not across tracks

- [ ] SESSION — Way to see Spotify information (monthly listeners, artist ranking)
- [ ] SESSION — Discogs genre tags (automatic via Claude API)
- [ ] SESSION — Apple Music playback controls (requires MusicKit JS + Apple developer account)

- [ ] SESSION PICKER — Rewrite AlbumPicker with new home screen design (three buttons + floating albums + spring swap). Python write kept failing due to heredoc/backtick conflicts. Next session: write to a .py file first, then run it. End line of AlbumPicker is 546 (one before export default at 547). New design: mode state ('home'|'session'), three frosted glass buttons (Start Listening / Edit View Entries / Submissions), floating album art via useEffect DOM injection with CSS drift animations, spring-scale swap every 4-8s replacing 1-2 random albums without duplicates.
- [ ] SESSION PICKER — Future idea: randomize background layout per visit (10+ different ways to show album art — floating, grid+flip, vinyl dial, rain, full bleed). More entries = more layouts unlocked. Gamify the archive.
- [ ] SESSION PICKER — Submissions page (/session/submissions) needs to be created (placeholder for now)

- [ ] HOME — recent entries (brainstorm other looks than scrolling bar)
- [ ] HOME — Connect navigation bar to pages
- [ ] HOME — Little jiggle animation on hover
- [ ] HOME — Better logic for live track timing (sticky logic past last.fm)

- [ ] SECURITY — API routes currently unprotected (POST /api/entries, /api/research, /api/format, /api/reflect). Proxy/middleware approach was attempted but Next.js 16 proxy can't distinguish your requests from strangers. Correct fix deferred: need server-side session token approach. Not urgent until public launch.

- [ ] COMMENTS — Moderation inbox needs to be built in /session to approve/reject pending comments
- [ ] COMMENTS — Upvote abuse prevention (IP or cookie check) before going fully public

COMPLETE
- [x] Individual post pages — each entry gets its own URL
- [x] Fix Horizon logic
- [x] Notes box expands as typing or paste
- [x] Night and day mode button not working
- [x] Fix the session app to post directly to your database instead of copy/paste
- [x] Password protect the session page so only you can access it
- [x] Get the session app into your website first — that's your core workflow tool
- [x] Add the full track notes field to entries
- [x] Album art — either upload or pull from Apple Music automatically
- [x] Lightbox instead of post page? (View/leave comment takes to URL? Need to decide)
- [x] Session: artist-first album picker landing screen with iTunes live search
- [x] Session: full-screen frosted loading overlay during research (light theme)
- [x] Session: album art as full-bleed background with frosted glass widget panels
- [x] Session: draft auto-save to localStorage, restored on same album
- [x] Session: clean minimal header (back button + entries only)
- [x] Session: /session/entries — full entry management CMS (list, edit, delete)
- [x] Session tool not on public site (navigate directly to /session)
- [x] Session: loading overlay with fill animation + expand-to-fill transition
- [x] Session: AI chat panel (reflect feature)
- [x] Session: better album picker via iTunes artist ID lookup
- [x] All API routes, components, hooks, and pages labeled with plain-English comments
- [x] comments POST set to pending = true (moderation queue)
- [x] format route rewritten — editor not writer, preserves voice, background from brief
- [x] Sidebar.js deleted (replaced by TopNav in page.js)
- [x] PATCH route restored to /api/entries/[slug] (used by /session/entries edit modal)

---

## Architecture notes

**File write rules:**
- Code files (.js, .css) — edit directly in VS Code, works fine
- Config/dotfiles (.env.local) — use Python or echo >> from terminal; VS Code silently fails on these
- Never use PYEOF heredoc with backticks in JSX — use cat > /tmp/file.py approach instead
- Always verify .env.local writes with: `cat /path/to/.env.local`

**Environment variables:**
- DATABASE_URL — Neon Postgres connection string
- ANTHROPIC_API_KEY — Claude API key
- SESSION_SECRET — generated with `openssl rand -hex 32`, saved in Vercel (sensitive) + .env.local
- SESSION_SECRET is not yet wired to API route protection (deferred — see SECURITY above)

**Git workflow:**

## Site Structure
Two branches: public (/) and private (/session), both reading/writing the same Neon Postgres DB.
Public pages: / (homepage), /about (about + specs + index), /archive, /submit, /compare, /entries/[slug] (entry + comments), surprise (random entry redirect)
Private pages: /session (note-taking tool → research + format APIs), /session/entries (CMS), /session/inbox (comments + submissions moderation), /session/distribution (Instagram + Reddit auto-post — not yet built)
Shared DB: all entries, comments, submissions flow through the same entries table + future comments and submissions tables.
Distribution layer sits inside /session — after saving a post, one click auto-posts to Instagram and relevant subreddits.