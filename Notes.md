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
- [ ] MODAL — favorite not showing, showing \u00b7 ?
- [ ] MODAL — Masterpiece logic (only if it's all tracks 5 star, not just any 5 star album ex: as tall as lions)
- [ ] MODAL — Horizons should all raise at the same time, not across tracks

- [ ] SESSION — Entries button in session header too wide, needs shrinking
- [ ] SESSION — Accent color (#c8d47a) to be replaced across session app
- [ ] SESSION — Way to see Spotify information (monthly listeners, artist ranking)
- [ ] SESSION — Discogs genre tags (automatic via Claude API)
- [ ] SESSION — Apple Music playback controls (requires MusicKit JS + Apple developer account)

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
- [x] Session: artist-first album picker landing screen with iTunes live search
- [x] Session: full-screen frosted loading overlay during research (light theme)
- [x] Session: album art as full-bleed background with frosted glass widget panels
- [x] Session: draft auto-save to localStorage, restored on same album
- [x] Session: clean minimal header (back button + entries only)
- [x] Session: /session/entries — full entry management CMS (list, edit, delete)
- [x] Session tool not on public site (navigate directly to /session)


---

## Session Tool (app/session/page.js)
- Always light theme on picker/overlay; dark glass aesthetic on session view
- Password: listeningnotes (shared localStorage key with /session/entries)
- Three views: picker -> loading overlay -> session
- Picker: artist search with 600ms debounce, iTunes album grid, manual fallback
- Loading overlay: full-screen frosted, blurred album art bg, rotating phrases
- Session view: album art full-bleed background, two floating glass widget panels
- Panel style: rgba(0,0,0,0.45) + blur(10px) + rounded corners + white border
- Draft auto-saves to localStorage on every keystroke, restores on same album
- Draft cleared on successful save
- Header: back arrow (→ picker) + elapsed timer + Entries link only
- Album art: iTunes Search API, 25-result scored matching, 3000x3000
- Tracklist: MusicBrainz API
- Format & Done → /api/format → Save to Site → /api/entries POST

## /session/entries (app/session/entries/page.js)
- Same password gate, shared localStorage auth
- Table: art thumbnail, album, artist, year, rating, type, favorite/masterpiece flags
- Click row → edit modal with all fields + delete with confirm step
- Search + sort (newest/oldest/A-Z)
- View → link to public post page from edit modal
- Edit saves via PATCH /api/entries/[slug]
- Delete via DELETE /api/entries/[slug]
