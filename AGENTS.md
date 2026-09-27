<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Read these first

- **[DECISIONS.md](DECISIONS.md)** — what is settled and why. Read it at the
  start of every session. If something in it comes up, the answer is already
  written down; do not re-propose anything listed as ruled out.
- **[docs/DECISIONS-ARCHIVE.md](docs/DECISIONS-ARCHIVE.md)** — the history
  behind settled decisions and the arguments behind reversed ones. Not read at
  session start; go there when DECISIONS.md points you there.
- **NOTES.local.md** — this copy's own notebook: what is pending, what is
  done, and the gotchas that cost real time. Not in the repo (`*.local.md` is
  gitignored), so a fresh copy starts without one; a copy that keeps one keeps
  it at the root under that name.
- **[docs/NOTES-ARCHIVE.md](docs/NOTES-ARCHIVE.md)** — what was done before
  September 2026. Not read at session start.
- **[README.md](README.md)** — what this is and how to run a copy. The front
  door, for strangers.
- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** — where everything lives and
  what to touch to change a given thing. Read this before hunting for a file.
- **[docs/OPERATIONS.md](docs/OPERATIONS.md)** — backups, restore, export, keys.

# Commands

The real ones, from `package.json`. There are no others.

| | |
|---|---|
| `npm run dev` | The dev server (`next dev`). |
| `npm run build` | `node scripts/prepare_database.mjs && next build` — brings the database up to date first, so the claim code reaches the build log, then builds. Reads `.env.local`, which on any keeper's machine names their live journal; with no `DATABASE_URL` it still builds and says so. |
| `npm start` | Serves the built site (`next start`). |
| `npm run lint` | `eslint`, configured in `eslint.config.mjs`. |
| `npm run backup` | Every table to `$BACKUP_DIR/<timestamp>/` (`scripts/backup.mjs`; see docs/OPERATIONS.md). |
| `npm run restore -- <path>` | Dry run of a restore; add `--yes` to write (`scripts/restore.mjs`). |

**Migrations have no command.** The files in `migrations/` apply themselves,
in filename order, on every server start (`instrumentation.js` →
`library/migrator.js`) and at the start of `npm run build`. A schema change is
a new numbered `.sql` file and nothing else; the ledger is the
`schema_migrations` table.

**Run the build before reporting anything as done**, and lint. Stop the dev
server first: `npm run build` while `next dev` is up leaves stylesheets and
route headers stale, silently (NOTES.local.md, Gotchas).

**Lint gates the commit through git, not through the shell.**
`.githooks/pre-commit` runs `npm run lint` and refuses the commit while it
reports an error, on any machine that has opted in once with
`git config core.hooksPath .githooks`. The setting lives in that clone's
`.git/config`, never in the repo, and reaches the clone's worktrees. Do not
bypass it with `--no-verify`. It is a hook because a shell chain can be
written wrongly, and was, 2026-09-26: under `set -e`, `npx eslint … && echo
"lint clean"` on one line and `git commit` on the next let a failing lint
through, since `set -e` ignores a failure on the left of `&&`. Where a chain
is typed by hand anyway, the check and the commit share one statement,
`npm run lint && git commit -s …`, so the commit is what a failure skips. The
build stays out of the hook: it cannot run beside the dev server, and a
commit should take seconds.

# Never

Hard constraints. Each one, broken, breaks a journal that is not this one — a
copy on a machine nobody here can reach. DECISIONS.md has the longer
reasoning; these are inline so nobody has to go looking.

- **The schema is additive only: never drop, rename, retype or repurpose a
  column or table.** Other people's copies run older code against the same
  migrations, and a migration that fails is somebody's journal that stops
  opening. A column nothing reads any more stays where it is.
- **No journal address is ever printed on a page.** A journal is shown by its
  keeper's name and face; the address lives in the link and in the QR code. A
  host is printed only when nothing else is known, never by choice.
- **No counts, badges, streaks or follower numbers anywhere.** Presence is
  outbound: a journal shows what its keeper is logging and never who is
  reading, who added whom, or how many. Gifts are not counted either.
- **Never write to another keeper's database.** The only things one copy may
  put into another are a send and a wave, each on a keeper's press, through
  that copy's own public route. Everything else about another journal is read
  from its public feed and routes.
- **No phone-home.** Nothing in a copy reports to the canonical copy or
  anywhere else: no analytics, no pushed banners or messages, no deploy
  redirect that would log installs, nothing that runs without a press. A copy
  learns of a new version by reading the public releases itself, at most once
  a day; a problem report leaves only when a keeper presses Send.
- **Never edit or rename a migration that has run, and never write a down
  migration.** The filename is the identity, so an edited or renamed file runs
  again on every copy. A change is a new numbered file, written with
  `IF NOT EXISTS` like the ones before it. A bad migration is a backup and a
  new file.
- **Nothing in a journal changes unless its keeper changes it.** No update or
  migration edits an entry, and nothing matches a send to an entry
  automatically — a wrong guess writes a credit onto somebody's page.
- **What crosses between copies has to survive a copy that is months old.**
  A new field is one an older copy can ignore; a stored value is never renamed
  (archived is still stored as `dismissed`); a reference to another journal's
  entry is its address and slug, never an id; a server-to-server send is
  counted against the journal it names, never the IP it arrived from.
- **Public reads are allow-lists.** The feed (`PUBLIC_FIELDS`) and the wall
  never carry the writing; a new column stays private until somebody decides
  otherwise; the chain fields leave only through `withoutChain`, and only on a
  Submission entry that was not marked quiet.
- **Secrets never reach a browser.** The `secrets` table is read by
  `library/secrets.js` and nothing else, and is never selected with
  `settings`; a page is told whether a key is set and its last four
  characters, never the value. Every writing route checks the wristband on the
  server, and owner controls are left out of the HTML rather than hidden.
- **No email anywhere on the site.** Nothing sends one and nothing asks for
  one; a journal address does every job an email might.
- **A copy is never called Listening Notes, and the software's name never
  becomes a setting.** Titles read `{keeper_name} · Listening Notes` on every
  copy; the pitch pane and its Source link ship on every copy and cannot be
  switched off; the canonical address and `REPORTS_URL` are constants, with an
  environment variable for a fork.
- **Nothing per entry that grows with the archive on a free tier.** Never
  base64 a picture into a row (a cover's code keeps only its dot); album art
  is a plain `<img>`, never the framework's metered image component; a query
  on a timer gets its own narrow reader and is never widened; `pull_settings`
  never selects the portrait blobs.
- **Nothing keeps a list of the tables.** Backup, export and restore ask the
  database which it has; a restore never writes `schema_migrations`.
- **Nothing a person typed is lost to a failure or a dismissal.** A failed
  send keeps the note and says what happened; a dismissed sheet puts the words
  back when it reopens.
- **No real names, emails, handles or journal addresses anywhere** — not in
  code, comments, docs, example data or fixtures. Use placeholders: `[name]`,
  `a beta tester`, `somebody@example.com`. They ship to every copy and every
  gifted journal, and a tester's real name in a comment is the natural thing
  to write while debugging, so the rule is what stops it growing back. The
  same goes for a person's pronouns: *they*. The one exception is
  the author's name on the copyright line, which is deliberate (DECISIONS,
  Licence and ownership).
- **Every source file opens with the two-line copyright and SPDX notice, every
  commit is `git commit -s`, and no tool is named in a commit.**

# Large changes

When a brief touches many places, build the shared piece first and show it
before migrating anything onto it. Don't do the whole job silently: one piece,
seen and agreed, then the rest.

# Where things live

The filenames are deliberate metaphors and are not changing. This index
exists so nobody has to open a file to find out what is in it. Every
`library/` line was written from reading the whole file; the other folders'
lines come from their files' own headers, which are thorough. Components,
pages and API routes are indexed in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## `library/` — the logic, no visuals

- `background_scale.js` — the factor that shrinks the dashboard screensavers'
  artwork on a phone so it stays background; exactly 1 on a desk.
- `bioprompt.js` — the nine sentence openings a keeper finishes on their card
  ("I can never skip —"), the limit of three, and the reader that turns stored
  key-and-answer pairs into printable lines and drops retired keys.
- `came_back_actions.js` — the `came_back` table: records this journal put
  somebody onto that they then logged, noticed by the feed and written down so
  the inbox can show them as arrivals.
- `card_links.js` — the marks a card can wear: the rig icons to choose from,
  and which logo a link gets from its hostname or the owner's override.
- `claim_notice.js` — the boxed lines printed in the build and runtime logs
  while a copy is unclaimed: the setup link with the claim code in it.
- `code_shape.js` — two numbers about a QR code's shape (quiet zone, least
  version), shared by the server press and the browser so they cannot drift.
- `comment_actions.js` — comments: a thread nested by track, saving, upvoting,
  moderation, and answering another copy's "which replies came from my
  journal".
- `cover_code.js` — an entry's cover pressed into the QR code for that entry's
  address, redrawn on every ask; the row keeps only the proved dot size.
- `cross_references.js` — display-time linking: a mention of an album or
  artist already in the archive becomes a link, `[[brackets]]` force one, and
  `COMMON_WORD_NAMES` is the hand-edited list of names too ordinary to
  auto-link.
- `database_actions.js` — entries: the wall's lean list, the public feed's
  allow-list, one entry, one record's folder, save/update/delete (with the
  derived Masterpiece and the edit stamps), slugs, the owner row, briefings and
  drafts.
- `database_connection.js` — the one Neon handle, opened on first use rather
  than on import, and `explainDatabaseError`, which says a database failure in
  a sentence for the owner.
- `definitions.js` — the shipped text for the three marks (Masterpiece,
  Favorite, Formative) and the merge of the owner's edits over it.
- `doorman.js` — rate limiting, in memory: the doors (login, comment, send,
  wave and so on), how many tries each allows, who is knocking, and the 429
  answer.
- `entry_formatter.js` — the shapes an entry is written in: the horizon bar
  from track ratings, `flawless` (what Masterpiece means), tracks to and from
  prose, `lookup_key` (the fold drafts and briefings are keyed on), the edit
  stamp, `entryTypeLabel`.
- `gold_burst.js` — the gold sparkle fired when a Masterpiece is marked.
- `handoff.js` — module variables the wall leaves for the entry layer: the
  tapped record's first-screen fields so the layer opens without a wait, the
  wall's order for swiping to neighbours, and how a layer arrived (by swipe,
  by going back, alone).
- `install_guide.js` — what `/get` needs: the deploy button's URL and the ten
  install steps with their screenshots and the rings drawn over them.
- `migrator.js` — brings the database up to date from `migrations/` on start
  and at build, under a session-level advisory lock, on the direct (unpooled)
  endpoint.
- `music_data_api.js` — Apple's catalogue: album art resizing
  (`sizedAlbumArt`), tracklists and album facts, the record search
  (`searchAlbums`), the song search (`searchSongs`), genre folding.
- `needle.js` — the beacon's reading half: the one `needle` row saying what
  is being logged now, lifting it, `sat_with` for listens whose post was
  deleted, and the recent listens drawn under the beacon.
- `outbox.js` — a send or a wave leaving this copy for another, server to
  server: posts to their `/api/submissions` or `/api/waves` and reports what
  came back in plain words.
- `people_actions.js` — the address book (`people`): list, file, pin (six at
  most), remove, and asking a journal its keeper's name.
- `portrait_code.js` — the press: the portrait made into the journal's QR
  code with a dot of ink per module, proved by decoding with jsQR on both page
  colours; `CODE_BUILD` is bumped whenever the drawing changes.
- `receipts.js` — the browser half of comment receipts: the signed stubs kept
  in localStorage so a writer sees their own comment while it waits.
- `report_actions.js` — the `reports` table: problems keepers wrote in from
  their desks, received by the canonical copy.
- `return_address.js` — a sender's name and journal kept in their own browser
  for the send and comment forms; `tidyAddress`, `tidyJournal` and
  `journalUrl`, the one spelling an address is kept in; and the `?from=` /
  `?as=` handling when a keeper arrives from their own copy.
- `secrets.js` — the vault: the `secrets` table's only reader. The session
  secret, password hashing, the claim code, the setup window, and what
  Settings may be told (set or not, last four characters).
- `session_timers.js` — `TrackLength`: seconds to m:ss.
- `settings_actions.js` — the one `settings` row: read (without the two
  portrait blobs), write through an allow-list with write-once fields,
  `coverName` and `titleName`, `isSetUp` (the gate that fails closed),
  `pull_keeper_name`.
- `sitewide_visuals.js` — colours and fonts as JS objects, for canvas and
  chart code that cannot read a CSS custom property. The stylesheets are the
  source; this mirrors them.
- `slug_generator.js` — `create_slug`: "Pet Sounds" becomes "pet-sounds".
- `submission_actions.js` — the `submissions` table: saving a send, listing
  sends with the entry each became, counting, the four outcomes, marking one
  logged, naming a sender later.
- `version.js` — this copy's version from `package.json`, the releases URL,
  and `REPORTS_URL`.
- `wave_actions.js` — the `waves` table: waves that arrived here, one row per
  journal, seen, removed.
- `whole_journal.mjs` — asks the database which tables it has and reads one
  table as Postgres writes it; shared by backup, export and restore so no list
  is kept. `.mjs` because the backup is plain Node.
- `wristband.js` — the login cookie: signed tokens issued and checked with the
  session secret, renewal, the route guard `requireWristband`,
  `wristbandOnHand` for pages, and the signing of comment receipts.

## `hooks/` — reusable browser logic

- `useEntryEditor.js` — the draft of an entry while its keeper corrects it in
  place; fetches the credit fields separately because public reads strip them.
- `useHoldStill.js` — locks every scrolling ancestor behind an open overlay so
  nothing under it moves.
- `useJournalHost.js` — the journal's host, used as the hidden username so a
  password manager files the password.
- `useListeningBeacon.js` — one shared poll of this journal's own beacon,
  subscribed to by every component that draws it.
- `useListeningSession.js` — all the state and API calls of a listen in
  progress; `SESSION_STEPS`.
- `usePress.js` — the share printer as a hook: make the picture, save or share
  it, copy the address.
- `useSessionDraft.js` — the listen's draft: the browser's copy plus the
  `drafts` row, autosave and restore.
- `useSpineWidth.js` — how wide the desk's left page (the spine) is, dragged
  and remembered per browser.

## `scripts/` — run by hand or by a machine, not by the site

- `backup.mjs` — every table to `$BACKUP_DIR/<timestamp>/` with `migrations/`
  beside it; 30 kept. Carries `secrets`.
- `prepare_database.mjs` — runs before `next build`: migrates and prints the
  claim notice; never fails the build.
- `restore.mjs` — puts a backup or an export back; a dry run without `--yes`.
- `update_copy.mjs` — what the update workflow does on a keeper's repository:
  graft, merge the latest release, push; fetched from upstream each run.

## Top-level files whose names are Next's, not ours

- `instrumentation.js` — the startup hook: migrates before the first request
  and prints the claim notice while unclaimed.
- `proxy.js` — Next's middleware under its new name: copies the pathname into
  a header for the layout and does nothing else.

## Components named by metaphor

The full component list is in docs/ARCHITECTURE.md; these are the names that
do not say what they hold.

- `Bookplate.js` — context holding the journal's own details (name, keeper,
  portrait), read once on the server and handed down.
- `CallingCard.js` — the keeper's face and name at the foot of the beacon for
  a visitor, with Send and Add.
- `Pitch.js` — the pane a visitor sees in place of the desk: what this is and
  where to get one.
- `KeeperTools.js` — the owner's ··· menu on an entry or the card.
- `Friends.js` — the address book as a grid of faces.
- `Footer.js` — the band at the foot of the phone's cross naming the panes.
- `EditingBar.js` — the Save and Cancel band at the foot of anything being
  corrected.
- `MarqueeTitle.js` — a title too long for the small beacon, scrolling one lap.
- `session_components/Trouble.js` — the site's own error dialogue for a failed
  save inside a listen.
- `Slug_Page/` — the pieces of an entry page (the slug is the entry's URL name).
- `session_components/steps/` — the screens of a listen.
- `session_components/backgrounds/` — ten canvas screensavers, parked; nothing
  mounts them.

## Elsewhere

- `.githooks/pre-commit` — the lint gate: git runs it before a commit on a
  machine that has pointed `core.hooksPath` at the folder, and refuses the
  commit on a lint error (Commands).
- `.agents/skills/neon-postgres/SKILL.md` — a vendor-written guide to Neon for
  coding agents. Not read for this index beyond its header.
- `migrations/` — numbered SQL, applied in order; each file's header says why
  it exists.

# End of session

Update the files, without being asked:

- Finished items move to **Complete** in NOTES.local.md, with the date.
- New items go to **Pending**.
- Any gotcha that cost real time goes under **Gotchas**.
- A decision goes in **DECISIONS.md** only if it passes one test: would a
  future session reopen it, or repeat a mistake, without the entry? If not, it
  is not recorded there. How something was done is a commit message; a lesson
  that cost time is a **Gotcha**; a small choice nobody will revisit is
  nothing. An entry is the rule and one reason, six lines at most. Record it
  when it is decided rather than when it is built.
