NOTES.MD

Personal Checklist: 

PENDING
- [ ] DEV — Connect domain listeningnotes.blog
- [ ] DEV — Instagram + Reddit distribution
- [ ] DEV — Ability for people to comment on post URL page

- [ ] SLUG — Redesign actual post page
- [ ] SLUG — Wordmark font weight rendering heavier in Safari (Fraunces variable font / optical sizing issue — font-variation-settings not applying correctly)
- [ ] SLUG — Nav beacon pill missing on post page (removed during failed nav refactor, needs re-adding cleanly)
- [ ] SLUG — Instagram + theme toggle need permanent home (removed from nav bar, floating bubble approach attempted and failed)
- [ ] SLUG — Beacon shows last three tracks and they bubble to the right
- [ ] SLUG — Album art should look like the main Home Screen big and colorize the whole page

- [ ] MODAL — album art fully shows, then data loads in. Or CLICK to show album art and everything leaves screen
- [ ] MODAL — Scroll sticky collapse needs to be MUCH smoother and not take to a new spot. Feels so glitchy
- [ ] MODAL — Horizon track names only loads for some albums
- [ ] MODAL — weird glitch with stars, (took screenshot)
- [ ] MODAL — Maybe I do want background of website to fade just a tiny bit. 
- [ ] MODAL — link to full page open in new tab
- [ ] MODAL — favorite not showing, showing \u00b7 ?
- [ ] MODAL — Masterpiece logic (only if it's all tracks 5 star, not just any 5 star album ex: as tall as lions)
- [ ] MODAL — Horizons should all raise at the same time, not across tracks

- [ ] SESSION — entry screen more intentional "What do you want to listen to?" Centered in middle with albums rolladex of like random trending albums (Apple Music?), connect to saved or pinned albums? Then session grows from there. 
- [ ] SESSION — artist first then albums show up then you can either type in album or choose. I want it to feel like you're choosing an album. Maybe option to save?
- [ ] SESSION — edit page should be behind the session app. like there's live session, then theres entries and i can edit from there all backed behind one password protected session and get editing features out of the public facing blog
- [ ] SESSION — Way to see Spotify information (monthly listeners, artist ranking)
- [ ] SESSION — Discogs Genres tags (automatic? Maybe generated through claude api)

- [ ] HOME — recent entries (brainstorm other looks than scrolling bar. Maybe it needs a delay or needs to be overhauled all together)
- [ ] HOME — Connect navigation bar to pages
- [ ] HOME — Little jiggle animation when open page to know there is something back there on hover it tilts to side or something too. 
- [ ] HOME — Better logic for the timing of live track (Album doesnt show off for a long time then when finally stops it shows an old track. Going to need some sticky logic or some of it's own logic past last.fm to make ti work seamlessly)

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
- [x] Fix track star ratings per track (track.rating is already unicode stars — was incorrectly run through starsFromRating which expected a number)
- [x] Fix globals.css duplicate @import (moved Google Fonts to layout.js link tags)
- [x] Fix hydration mismatch on track note <p> (added suppressHydrationWarning)


Claude Generated:

- No "Album Notes" / "Track Notes" headers needed
- splitNotes() finds first `1. ` or `Track N —` line as split point
- Horizon bars + tooltips generate automatically from track star ratings
- Tags: comma-separated, no #, stored as Postgres array

---

## Homepage
- Full-bleed hero, blurred album art bg (changes with Last.fm track)
- Floating pill nav: Fraunces wordmark, Listen/Explore dropdowns, Submit, Surprise
- Beacon: live track art 340px, click expands to show 3 recent tracks with echo fade
- Album strip: auto-scrolls, left/right arrows, fade edges
- Known issue: beacon centering slightly off when open (PARKED)
- Known issue: live/idle timing — art gap + stale track on stop (needs own session)

---

## EntryModal (components/EntryModal.js)

### Structure
- Full-bleed album art background, rgba(6,4,12,0.18) tint
- Frosted glass info box inset 44px all sides
- Top section: metadata left (270px) + background right, collapses on scroll
- Sticky bar replaces top section when scrolled >40px (grid-template-rows animation)
- Scrollable notes: album notes → horizon divider → track notes → tags
- Footer: tags left, full page link right

### Key implementation details
- Stars component is inline in EntryModal (not StarRating.js) — uses GOLD/#E8B84B
- masterpiece = entry?.masterpiece === true (NOT rating === 5)
- Masterpiece: stars breathe continuously at 2.8s, shine label every 30s
- Empty stars: width:0 on gold layer (not conditional render) — fixes stacking bug
- Sticky collapse: grid-template-rows 0fr/1fr transition (not max-height)
- Horizon: parseTracksFromNotes regex matches `1. Name — ★★` format
- splitNotes: splits on Track Notes header OR \n\n1. OR \n\nTrack N —
- Tags: strips # prefix, splits on comma or \n
- Full page link: plain <a> tag (not Next Link) — avoids pushState race on close

### URL behavior
- Tile click → pushState to /entries/slug
- Close → pushState back to /
- Direct visit → Next.js serves PostClient standalone

---

## Session Tool (app/session/page.js)
- Always light theme
- Password: listeningnotes
- Blurred album art bg at 25% opacity after research
- ALL styles inline (Tailwind v4 doesn't compile arbitrary values for this page)
- Album art: iTunes Search API, 25-result scored matching, 3000x3000
- Tracklist: MusicBrainz API
- Format & Done → /api/format → Save to Site → /api/entries POST

---

## Post Page (app/entries/[slug]/PostClient.js) — REBUILT

### What's done
- Full-bleed blurred hero with album art thumbnail + metadata overlay
- Sticky nav with Fraunces wordmark + nav beacon pill (live Last.fm, dropdown with art + recents)
- Body forced dark theme on mount (document.body.style.background + data-theme attr)
- Background → Notes → Horizon → Tracks → Tags → Footer
- parseTracksFromNotes: extracts title, rating, AND per-track note prose
- Track notes always visible; click ▶ / comment badge to expand comment thread
- HorizonBar: hover tooltip (track name + rating + comment count dot), click scrolls to track
- Reddit-style nested comment threads: collapse/expand via gutter line, upvotes, reply form
- NewCommentForm: name + email (private) + content, posts to /api/comments
- CommentThread: recursive, collapsible, upvote, reply
- Track star ratings: use track.rating directly (already unicode ★ string from parseTracksFromNotes)

### Comments infrastructure
- Neon table: comments(id, entry_slug, track_index, parent_id, author_name, author_email, content, upvotes, pending, created_at)
- track_index = -1 for album-level (pending), 0-N for track threads
- GET /api/comments?slug= returns nested tree grouped by track_index
- POST /api/comments inserts new comment
- POST /api/comments/upvote increments upvotes by id
- pending column exists, always false for now (moderation ready when needed)

### Known issues / next refinements
- Nav beacon missing — needs to be re-added to PostClient nav (was removed during failed nav refactor)
- Instagram + theme toggle removed from nav — need permanent placement
- Wordmark font weight looks heavier in Safari than Chrome (Fraunces variable font opsz axis issue)
- Album-level discussion section not yet built (planned: below notes, above horizon)
- Comment form needs name/email persistence (localStorage) so repeat visitors don't retype

---

## API Notes
- PATCH /api/entries/[slug]: converts tags string to array before save
- POST /api/entries/route.js: includes masterpiece field
- Both routes include masterpiece in COALESCE update

---

## Architecture Decision (pending)
- Edit/delete should live in session tool, not public post page
- Post page should be fully public read-only
- Session tool becomes: live session + entry management (list, edit, delete)

---

## File Writing Rules
- NEVER use cat >> to append
- ALWAYS use python3 - << 'PYEOF' heredoc inline in terminal
- Verify with grep -n before editing
- Commit after every working change
- VS Code silent save failures: always verify after writing
- Always use quoted paths for files with brackets: "app/entries/[slug]/PostClient.js"
- git show HASH:"app/entries/[slug]/PostClient.js" > "app/entries/[slug]/PostClient.js" to restore from git

---

## Terminal Setup
- zsh + nvm (Node v24.14.0)
- source ~/.nvm/nvm.sh each new terminal session
- Tab 1: npm run dev / Tab 2: git + file writes
- Chrome for dev (Claude extension), Safari primary
- Always git push origin main after committing — local commits don't sync automatically

---

## To Build (priority order)
1. Re-add nav beacon to post page cleanly
2. Instagram + theme toggle — permanent floating placement
3. Fix wordmark font weight in Safari (Fraunces opsz axis)
4. Live track timing fix — sticky/predictive beacon logic beyond Last.fm
5. Connect nav links to actual pages
6. Move edit/delete into session tool, make post page read-only
7. Archive/gallery view (dense tile wall, filters)
8. Post page visual redesign (inspiration: frosted glass, clean, editorial)
9. Page jiggle animation on load (hint at background)
10. Modal background dim (subtle fade behind modal)
11. Modal art-first load sequence
12. Domain flip: listeningnotes.blog → Vercel
13. Giscus comments on post pages
14. Session tool redesign — album picker flow, artist-first
15. Instagram + Reddit distribution
16. Multi-user platform (long term)
