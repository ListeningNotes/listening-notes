# Listening Notes

A personal music journal. You listen, you write, it lives on the web.
Built to eventually become a place where other people can do the same thing.

**Website:** listeningnotes.blog
**Built with:** Next.js, Neon Postgres, Claude AI

---

## How to Think About This Codebase

Think of it like a house.

- The **library** is the systems behind the walls — plumbing, electrical, wifi. You don't see it but everything depends on it. All the real logic lives here.
- The **components** are the furniture — the things you can see and interact with. Each piece of furniture is its own file.
- The **pages** are the rooms — they just arrange the furniture. A page file should be short because it's just saying "put this piece of furniture here, and this one here."
- The **API routes** are the front doors — when the site needs data (like loading entries, or saving a new one), it knocks on a door. The door answers, goes to the library to get what's needed, and hands it back.

---

## The Two Sides of the Site

**Public side** — what anyone visiting the site can see:
- The homepage with the listening beacon and album strip
- Individual entry pages where people can read your notes and leave comments
- An archive, about page, submit page, compare page

**Private side** — only you can access this (password protected, never linked publicly):
- `/dashboard` — the hub with four buttons: Listen, Entries, Inbox, Share
- `/dashboard/echo` — album search powered by Echo's network animation
- `/dashboard/echo/session` — the note-taking tool (6-step flow)
- `/dashboard/entries` — edit and delete entries
- `/dashboard/submissions` — review submitted albums

---

## Where Everything Lives

The library — logic, no visuals
  library/
    database_connection.js     Opens the connection to the database
    database_actions.js        Everything to do with saving and loading entries
    comment_actions.js         Everything to do with comments
    slug_generator.js          Turns "Pet Sounds" into "pet-sounds" for the URL
    entry_formatter.js         Parses entry data so it can be displayed correctly
    sitewide_visuals.js        All colors and fonts — change here, changes everywhere
    session_styles.js          Style helpers scoped to the session panel (tx, bdr, lbl)
    ai_integration.js          The Claude AI calls: research, format, echo
    music_data_api.js          Fetches album art and tracklists from iTunes and MusicBrainz
    session_timers.js          Track length display, session timer, loading phrases
    wristband.js               Session auth — issues and checks the JWT cookie

The front doors — receive requests, hand them off, send back responses
  app/api/
    entries/route.js           Load all entries / save a new one
    entries/[slug]/route.js    Load, edit, or delete one specific entry
    comments/route.js          Load or submit comments
    comments/upvote/route.js   Upvote a comment
    research/route.js          Ask Claude to research an album
    format/route.js            Ask Claude to format your notes
    echo/route.js              Echo AI — research briefing, chat, reflection

The hooks — reusable logic shared across pages
  hooks/
    useListeningBeacon.js      Checks Last.fm every 15 seconds for what's playing
    useAlbumSelection.js       Artist search, EchoNetwork animation, album grid, card phases
    useListeningSession.js     All session state — research, notes, chat, formatting, saving

The furniture — visual pieces
  components/
    EchoNetwork.js             Canvas animation — floating nodes that become album art
    EchoOrb.js                 Compact orb, pulsing mood indicator during a session
    EchoChat.js                Floating chat panel for talking to Echo mid-session
    main_components/           Everything on the public side
      TopNav.js                The navigation bar
      ListeningBeacon.js       The big beacon section on the homepage
      AlbumStrip.js            The scrolling row of albums
      NavBeacon.js             The small beacon on non-homepage pages
      EntryModal.js            The popup when you click an album
      StarRating.js            The star display (read only)
      Lightswitch.js           Manages light and dark mode
      entry_modal/
        HorizonGenerator.js    The bar chart inside the modal
        StickyHeader.js        The compact info bar that appears when you scroll
      Slug_Page/
        CommentThread.js       A single comment and its replies
        NewCommentForm.js      The form to leave a comment
        TrackThread.js         A track row that expands to show notes and comments
        HorizonBar.js          The bar chart on the full entry page
        MetadataLabel.js       The small uppercase section labels
        MetadataLabelInline.js Same label but sits inline without a border
        Chip.js                The small pill tags (First Listen, Favorite, etc)
    session_components/        Everything in the private dashboard
      PasswordGate.js          The password screen
      SessionButton.js         Frosted pill button used throughout the session panel
      StarRating.js            The interactive stars you click to rate
      steps/
        PreListenQuestionnaire.js  Two questions before research fires (relationship + source)
        AlbumDebrief.js        Step 0 — Echo narrative + research sections
        TrackNotes.js          Step 1 — expandable track list with per-track notes
        AlbumNotes.js          Step 2 — star rating, Masterpiece/Favorite, free-text notes
        ReflectChat.js         Step 3 — Echo reflection chat with quick prompts
        TagsEditor.js          Step 4 — add and remove tags
        SessionPreview.js      Step 5 — formatted preview with save button
      backgrounds/             9 animated canvas scenes for the dashboard hub
        Rain.js / DVD.js / Gallery.js / Fizzy.js / SplitScreen.js
        Snake.js / Pong.js / Solitaire.js / Reel.js
        index.js               Exports all backgrounds as an array

The rooms — full pages assembled from furniture
  app/
    page.js                    Homepage
    layout.js                  Wraps every page (fonts, theme)
    globals.css                All the styling
    entries/[slug]/
      page.js                  Loads the entry, hands it to FullPostPage
      FullPostPage.js          The full public entry page with comments
    dashboard/
      page.js                  Hub — 4 buttons (Listen, Entries, Inbox, Share)
      echo/
        page.js                Album search — EchoNetwork + artist search + album grid
        session/page.js        The note-taking session — 6-step flow, sidebar, frosted panel
      entries/page.js          Private entry management (edit, delete)
      submissions/page.js      Submission inbox (pending / reviewed / dismissed)
      inbox/page.js            Placeholder — not yet built
      share/page.js            Placeholder — Reddit/Instagram to-do list

---

## When You Want to Change Something

| What you want to change | File to open |
|------------------------|-------------|
| The site's colors | library/sitewide_visuals.js |
| The site's fonts | library/sitewide_visuals.js |
| What Claude says during research | library/ai_integration.js, research_album |
| How Claude formats your notes | library/ai_integration.js, format_post |
| How Echo talks to you | library/ai_integration.js, ask_echo |
| The loading screen phrases | library/session_timers.js, LOADING_PHRASES |
| The navigation links | components/main_components/TopNav.js |
| The homepage listening beacon | components/main_components/ListeningBeacon.js |
| The scrolling album strip | components/main_components/AlbumStrip.js |
| The modal that pops up when you click an album | components/main_components/EntryModal.js |
| The full entry post page | app/entries/[slug]/FullPostPage.js |
| The album search page | app/dashboard/echo/page.js |
| The note-taking session | app/dashboard/echo/session/page.js |
| The session steps (debrief, tracks, notes etc.) | components/session_components/steps/ |
| The entries management page | app/dashboard/entries/page.js |

---

## When Something Breaks

| What went wrong | File to open |
|----------------|-------------|
| Entries not loading on the homepage | library/database_actions.js |
| Can't save a new entry | library/database_actions.js, look for save_new_entry |
| Album research not coming back | library/ai_integration.js, look for research_album |
| Notes not formatting correctly | library/ai_integration.js, look for format_post |
| Echo AI chat not responding | library/ai_integration.js, look for ask_echo |
| Album art not loading | library/music_data_api.js |
| Tracklist not showing | library/music_data_api.js, look for fetchTracklist |
| The modal looks broken | components/main_components/EntryModal.js |
| Stars not showing correctly | components/main_components/StarRating.js |
| The horizon bar is broken | components/main_components/entry_modal/HorizonGenerator.js |
| The full entry page is broken | app/entries/[slug]/FullPostPage.js |
| Comments not loading | library/comment_actions.js |
| The album search is broken | app/dashboard/echo/page.js + hooks/useAlbumSelection.js |
| The session tool is broken | app/dashboard/echo/session/page.js + hooks/useListeningSession.js |
| A specific session step is broken | components/session_components/steps/ |
| The listening beacon is broken | hooks/useListeningBeacon.js |
| Colors or fonts are wrong everywhere | library/sitewide_visuals.js |

---

## Colors and Fonts

All of these live in library/sitewide_visuals.js. Change them once, they update everywhere.

background    #0e0e0e   The main page background
panel         #161616   Cards and panels that sit on top of the background
text          #e8e4dc   All regular text
accent        #c8d47a   The green highlight color
border        #2a2a2a   All borders and dividers
gold          #E8B84B   Star ratings
secondary_text #555     Muted, less important text

serif   DM Serif Display   Headings and titles
mono    DM Mono            Labels, tags, all the small UI text
sans    DM Sans            Body text, paragraphs

---

## The Database

One database (Neon Postgres). One main table called entries.

Each entry has: album name, artist, year, type, relationship, rating, favorite flag, masterpiece flag, background text, notes, tags, horizon bar data, album art URL, slug, and the date it was created.

---

## Secret Keys

These are stored in a file called .env.local which is never shared or uploaded.

DATABASE_URL         the address of the database
ANTHROPIC_API_KEY    the key that lets the site talk to Claude
SESSION_SECRET       the signing key for the JWT auth cookie (never change after launch)
SESSION_PASSWORD     the password typed into the dashboard gate

---

## A Note on Writing Code in This Project

- Edit JavaScript files directly in VS Code
- For .env.local use the terminal, not VS Code (VS Code silently fails to save it)
- When writing Python scripts that contain JavaScript with backticks, write to a temp file first, never use heredoc
- Always commit after something is working and tested
- git restore filename will undo changes to a single file if something goes wrong. Think of it like a checkpoint.

---

## Licence

Listening Notes is free software, released under the **GNU Affero General Public
License, version 3**. The full text is in [LICENSE](LICENSE).

    Copyright (C) 2026 Miyel Brown

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published
    by the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.

**What this means in practice.** Anyone may run a copy, for anything, including
a business — a bar playing records off its own copy owes nothing and asks
nobody. Anyone may change it. The one condition is reciprocity: if you give
your modified version to other people *or run it as a service they can reach
over a network*, they are entitled to your source. That last clause is section
13, and it is the whole reason this licence rather than the plain GPL — a
journal is a website, so "distributing" it mostly means hosting it.

The practical effect is that a closed commercial fork is not possible. A copy
stays a copy.

**Warranty.** There is none. The software is provided as-is; see sections 15
through 17 of the licence. Nobody who runs a copy has any claim against whoever
wrote it if it loses their writing, and that protection is the second reason
this file exists.

**The name is not the code.** The licence covers the software. It does not
grant use of the Listening Notes name or mark to identify *your* journal — see
the note on copies in the docs. Every copy is named by whoever keeps it. The
mark travels with the software as a colophon, the way a press mark sits in the
back of a book, and that is the only use it has in a copy.
