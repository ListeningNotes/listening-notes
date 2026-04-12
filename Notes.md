NOTES.MD

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

---

## Session Tool (app/session/page.js)
- Always light theme on picker/overlay; dark glass aesthetic on session view
- Password: listeningnotes (shared localStorage key with /session/entries)
- Three views: picker -> loading overlay -> session
- Picker: artist search with 600ms debounce, iTunes album grid, manual fallback
- Loading overlay: full-screen frosted, blurred album art bg, rotating phrases, fill animation + expand-to-fill transition
- Session view: album art full-bleed background, two floating glass widget panels
- Panel style: rgba(0,0,0,0.45) + blur(10px) + rounded corners + white border
- Draft auto-saves to localStorage on every keystroke, restores on same album
- Draft cleared on successful save
- Header: back arrow (→ picker) + elapsed timer + Entries link only
- Album art: iTunes Search API, 25-result scored matching, 3000x3000
- Tracklist: MusicBrainz API
- Format & Done → /api/format → Save to Site → /api/entries POST
- AI reflect: /api/reflect → chat drawer in notes panel

## AlbumPicker — new design (NOT YET WRITTEN TO FILE, restore from git 8b8ab71)
- Home screen with three frosted glass buttons: Start Listening / Edit View Entries / Submissions
- mode state: 'home' shows buttons, 'session' shows artist search + album grid
- Floating album art injected via useEffect, DOM-driven (not React state)
- 12 albums, hand-placed irregular positions, CSS drift animations (f1-f5 keyframes)
- Spring-scale swap: every 4-8s, 1-2 random albums scale to 0.05 → swap src → spring back
- No duplicates in visible set
- Cleanup on unmount: clearTimeout + remove DOM els
- AlbumPicker occupies lines 218-546 in page.js
- Python write issue: backticks in JSX break PYEOF heredoc — use cat > /tmp/file.py approach next time

## /session/entries (app/session/entries/page.js)
- Same password gate, shared localStorage auth
- Table: art thumbnail, album, artist, year, rating, type, favorite/masterpiece flags
- Click row → edit modal with all fields + delete with confirm step
- Search + sort (newest/oldest/A-Z)
- View → link to public post page from edit modal
- Edit saves via PATCH /api/entries/[slug]
- Delete via DELETE /api/entries/[slug]
