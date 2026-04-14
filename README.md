# Listening Notes

A personal music journal. You listen, you write, it lives on the web.
Built to eventually become a place where other people can do the same thing.

**Website:** listeningnotes.blog
**Built with:** Next.js, Neon Postgres, Tailwind CSS, Claude AI

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
- Eventually: an archive, an about page, a submit page, a compare page

**Private side** — only you can access this (password protected, never linked publicly):
- The session tool where you write your notes and create entries
- A management page where you can edit or delete entries
- Eventually: an inbox for approving comments and submissions, and a tool to post to Instagram and Reddit automatically

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
    ai_integration.js          The three Claude AI calls: research, format, echo
    music_data_api.js          Fetches album art and tracklists from iTunes and MusicBrainz
    session_timers.js          Track length display, session timer, loading phrases

The front doors — receive requests, hand them off, send back responses
  app/api/
    entries/route.js           Load all entries / save a new one
    entries/[slug]/route.js    Load, edit, or delete one specific entry
    comments/route.js          Load or submit comments
    comments/upvote/route.js   Upvote a comment
    research/route.js          Ask Claude to research an album
    format/route.js            Ask Claude to format your notes
    reflect/route.js           Chat with Echo

The furniture — visual pieces
  components/
    main_components/           Everything on the public side
      TopNav.js                The navigation bar
      Hero.js                  The big beacon section on the homepage
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
    session_components/        Everything in the private session tool
      PasswordGate.js          The password screen
      AlbumSelection.js        The artist search and album grid
      LoadingResearch.js       The full-screen loading overlay
      StarRating.js            The interactive stars you click to rate

The rooms — full pages assembled from furniture
  app/
    page.js                    Homepage
    layout.js                  Wraps every page (fonts, theme)
    globals.css                All the styling
    entries/[slug]/
      page.js                  Loads the entry, hands it to FullPostPage
      FullPostPage.js          The full public entry page with comments
    session/
      page.js                  The private note-taking and posting tool
      entries/page.js          The private entry management page

The live data hook
  hooks/
    useListeningBeacon.js      Checks Last.fm every 15 seconds for what's playing

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
| The homepage hero and beacon | components/main_components/Hero.js |
| The scrolling album strip | components/main_components/AlbumStrip.js |
| The modal that pops up when you click an album | components/main_components/EntryModal.js |
| The full entry post page | app/entries/[slug]/FullPostPage.js |
| The session note-taking tool | app/session/page.js |
| The entries management page | app/session/entries/page.js |

---

## When Something Breaks

Find the symptom, open the file.

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
| The session tool is broken | app/session/page.js |
| The album picker is broken | components/session_components/AlbumSelection.js |
| The loading screen is broken | components/session_components/LoadingResearch.js |
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
SESSION_SECRET       a security key (not yet fully wired up)

---

## A Note on Writing Code in This Project

- Edit JavaScript files directly in VS Code
- For .env.local use the terminal, not VS Code (VS Code silently fails to save it)
- When writing Python scripts that contain JavaScript with backticks, write to a temp file first, never use heredoc
- Always commit after something is working and tested
- git restore filename will undo changes to a single file if something goes wrong. Think of it like a checkpoint.
