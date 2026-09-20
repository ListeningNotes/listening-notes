# NOTES.md

What is pending, what is done, and what cost real time. This file is for Miyel.

**Three files, three jobs.** Keeping one of them out of the other two is the
only reason all three stay current.

| File | Holds | For |
|---|---|---|
| [README.md](README.md) | What this is and how to run a copy | Strangers |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Where everything lives, what to change | Anyone working on it |
| [docs/OPERATIONS.md](docs/OPERATIONS.md) | Backups, restore, export, keys | Whoever keeps a copy running |
| [docs/LICENCE-NOTES.md](docs/LICENCE-NOTES.md) | The appendix notice, §13, the DCO | Anyone who asks |
| [docs/NOTES-ARCHIVE.md](docs/NOTES-ARCHIVE.md) | Complete, before September 2026 | Nobody, unless they are digging |
| **NOTES.md** | Pending, Complete, gotchas | Miyel |
| [DECISIONS.md](DECISIONS.md) | What is settled, and why | Read every session |

---

## End of session — update these files

**Standing instruction. Do this without being asked, every session.**

Before wrapping up:

- Move finished items to **Complete**, with the date.
- Add anything new to **Pending**.
- Record any gotcha that cost real time under **Gotchas**.
- A decision goes in **DECISIONS.md** only if a future session would reopen
  it, or repeat a mistake, without the entry. The rule and one reason, six
  lines at most. Everything else is a commit message or a Gotcha.

**Read [DECISIONS.md](DECISIONS.md) at the start of every session.** If
something in it comes up, the answer is already written down. Do not
re-propose anything listed as ruled out.

---

## Writing code in this project

Miyel's own working rules. These lived in the README until 2026-08-31, where
they were three audiences deep in a file a stranger reads to decide whether to
deploy a copy — and none of it is anything they need.

- Edit JavaScript files directly in VS Code
- For .env.local use the terminal, not VS Code (VS Code silently fails to save it)
- When writing Python scripts that contain JavaScript with backticks, write to a temp file first, never use heredoc
- Always commit after something is working and tested
- git restore filename will undo changes to a single file if something goes wrong. Think of it like a checkpoint.

---

## Working With Claude

**Naming new code — always ask first.** Before creating ANY new function, page (route), or JavaScript file, Claude must pause and let me name it — propose options, then I pick or override. This applies to NEW things only (editing/renaming existing code follows the normal flow) and to every session. Reason: I want to be able to read and understand my own code later, even without a tool to explain it — names I chose are names I'll recognize.

---

## Pending

**MANUAL ENTRY — pinned 2026-09-18, and the door is shut.** Miyel, having
looked at what is built: "we will have to return to working out manual entry —
I don't think it works the way I envision, but it's not crucial right now."
And then: "let's remove the manual entry button from the session, juuuust until
I build it correctly — I don't want people using it messed up. We'll keep it to
what currently works."

So the button is gone from the picker and everything behind it is untouched.
`BY_HAND_OFFERED` in AlbumPicker is the whole of the switch: turn it on and the
form is back, unchanged. **What it costs while it is off, plainly: there is no
way to log a record Apple Music does not have.** That is the trade, made
knowingly, for not shipping a way in that does the wrong thing.

What is on disk is a form (album, artist, year, album art URL) that hands the
record straight to a listen, and a listen that finds no tracklist offers a
textarea, one title a line. It works end to end — the typed URL becomes the
cover, and the tracklist screen is the one the form promises. It is not wrong,
it is just not hers, and **nobody has said what hers is**. Do not guess at it
and do not polish this in the meantime: ask.

What it is *for* is settled and worth keeping: records nowhere has. Small
presses, Bandcamp releases, tapes — "smaller indie projects, or maybe albums
not on iTunes".

**THE HEADER IS THE BEACON — briefed 2026-09-18.** One surface, three
states. Not an animation job: an evening of animation work proved that.

### The problem

The beacon and the session are two separate surfaces, each carrying its own
copy of the same idea — a record, its name, a mark. Every transition between
them is a hand-over between two objects, and every animation built on
2026-09-18 was a way of disguising that hand-over. Miyel felt it every time,
because it is real:

- *"it's redundant the way it is now"* — two beacons
- *"the session beacon still doubles itself"*
- *"I need it to not feel like it's just another layer on top"* — and it
  literally is one; `/session` is a `@layer` route that mounts a second
  header over the first
- *"the session is a new state"*
- *"I don't have anything that just appears"*
- *"there's no way to close it"*

Each of those was answered on the day and the feeling did not change, which
is the evidence that no curve fixes it.

### The rule

**The header belongs to the page, not to the listen.** One object lives at the
top of the screen permanently and changes what it is doing. It never leaves,
never re-arrives, and is never two.

  resting     the last record sat down with, greyed — Last logged
  choosing    the mark, because nothing has been chosen yet
  listening   this record, live, with the song and the × beside it

The body underneath is what changes: beacon screen → drafts → the listen.
Three states of one page.

### The motion grammar, which already exists

Miyel's own words: *"things slide in from a direction most times, or appear
from the point of being clicked."* Nothing fades, nothing dissolves, nothing
appears. The two moves this site already owns are the only two needed:

- a thing travels from where it was pressed to where it is going (the
  flight; the wall's tiles; the drop)
- a surface grows out of the thing that was pressed (LayerEntry, an entry
  growing from its tile)

### What has to move

- `SessionHeader` comes out of `app/session/page.js`. The header is the
  page's, so it is rendered once, above whatever state the body is in.
- `/session` stops being a `@layer` route, or keeps the address and stops
  mounting a header. The listen is a body state, not a sheet.
- The cross's bar and the session's header become the same component. They
  already carry the same three things in nearly the same place; they are two
  copies of one idea and that is the whole bug.
- The picker is a body state too — it is where a session starts, and the ×
  in a listen returns to it (settled 2026-09-18 and still right).

### What this deletes

Everything on the cross that exists to disguise the hand-over:
`.hn-bar-beacon` and its cover, `.hn--choosing`'s collapse of the beacon
card, the flight's `into` targets, and the session's own `landing`. Two
copies become one and the machinery between them has nothing left to do.

### What NOT to try again

All of these were built on 2026-09-18, shipped, looked at, and rejected. Each
took a round; together they took an evening. **They are rejected for the same
reason — they animate a hand-over instead of removing it.**

- a cross-fade between the pane and the session
- a settle (the session arriving at scale 1.04 and easing to rest)
- the session growing out of the beacon's artwork
- an eyelid (scaleY) on the beacon, closing and reopening on the new record
- an aperture (a circle closing to a point) — twice, once per element and
  once as a single circle centred on the record
- a horizontal erase down and a draw back up, timed to the sheet's rise
- the whole screen leaving by the floor and the session coming back up
- pinning both text columns to one width so the two covers line up (this one
  also put the beacon off centre, which she saw at once)

### Two things that came out of the evening and should survive

- **Drafts and search results are the same square.** A grid of album art with
  the name and one line under it; a draft says how long ago where a record
  says the year; the discard sits on the art so the footprint matches. This
  is what made the picker one thing instead of two, and it is the half of the
  fix that is already right.
- **The session's surfaces are the site's.** The header is `--bg`, not an
  86%-white panel; the search is a box. A transition into a place that looks
  like a different application will read as a jump whatever it does.

### Names to settle before building

The shared header component, and whatever the three states are called in the
code. Miyel names them.

**The album's own stars are hidden until a track is rated, 2026-09-18.** Found
in passing and raised three times without an answer, so it is written down
rather than lost: on the Album screen the star row sits inside the same
conditional as the horizon chart (`list.length > 0 && hasRatings`). Log a
record, rate no tracks, and there is no way to give the album a score at all.
One line to pull the stars out of that block; the question is whether the
horizon should keep its own gate.

**Branch `four-tabs` is unmerged.** ID · Beacon · Friends · Inbox, Miyel's
names, with the address book at the head of the Friends pane. Her verdict:
*"now it's not good. I need it to be more of a page then the feed under"* —
she is writing the brief for it herself.

**Pinned for later, 2026-09-18:** merging `SiteNav` and `.idc-head` into one
header, so the LN mark disappears the way it does on an entry. Miyel: *"is this
a header that can replace site navigation? ok put a pin in it for later."*

**Fresh-account test passed 2026-09-02** — see DECISIONS. What is left of
this list is what to keep an eye on rather than what to prove:

Everything below it was built blind against one claimed database. Watch for:
- the deploy button: does `products=` attach a Neon database and set
  `DATABASE_URL` after the sign-in redirect? If not, the bare
  `?repository-url=` form plus the "no database yet" page is the path.
- the build log: is the claim code box visible on the deploy screen?
- `/setup`: claim code at the gate, then five screens, Skip on each, password
  with confirm and an eye; does Safari offer to save the password?
- the landing: nothing logged AND no Last.fm → the wall of covers under the
  crown. The first saved listen gives that copy a beacon on its own
- Settings: the Last.fm key pasted there reaches the beacon; the Anthropic
  key pasted there turns the Research button on (`research_available` reads
  `has_anthropic_key`).

**`/setup?rehearse`** — shows the setup screens on a claimed copy, owner
only, writing nothing (added 2026-09-02 to look at the screens without a
fresh database). Next moves on without saving; the photo previews locally.
The header says so. On a real first run the flag does nothing.

**Screenshots for `/get/install`** — nine per device, drawn only when
present, so the page reads fine until they exist. Two sets, because the page
has a phone/laptop toggle: `public/install/phone/` and
`public/install/laptop/`, same nine names in each: `01-button.png` (Vercel's
clone screen), `02-github.png` (Vercel's sign-in with Continue with GitHub),
`03-connect.png` (GitHub's permission screen), `04-name.png` (Git Scope and
Private Repository Name), `05-neon.png` (the Neon panel with the Auth toggle),
`06-build.png` (the build log or the Congratulations screen),
`07-holding.png` (the "isn't ready yet" page with Set it up), `08-setup.png`
(the name screen), `09-homescreen.png` (the last setup screen on a phone; the
browser's add-to-Dock on a laptop).

**A copy with no updater is a copy whose keeper did not grant one permission —
diagnosed 2026-09-17, and it replaces the date rule written here on
2026-09-16.** That entry said copies made before 09-11 were frozen because they
predate the updater. That is wrong, and the evidence is three copies:

| copy | made | version | updater |
|------|------|---------|---------|
| June | 09-09, the oldest | 1.21.0 | yes — added by hand, a `Create update.yml` commit through GitHub's web editor |
| Zach | 09-15 | 1.21.0 | yes, from the day it was made |
| Blue | 09-14 | **1.10.1** | **none, and no `.github` at all** |

The oldest copy is current and a newer one is frozen, so it was never a date.
**What it is:** Vercel makes a keeper's repository for them, through GitHub, on
the permissions that keeper granted when they authorised it. Writing anything
under `.github/workflows/` needs the `workflow` permission specifically, because
a workflow is code that runs on GitHub's machines. Without it GitHub refuses
that one file — and `.github/` holds nothing else in this repository, so the
whole folder silently disappears. Everything else copies, the journal works
perfectly, and it can simply never update itself. Blue's repository is exactly
that shape: not a fork, one `Initial commit`, no `.github`, frozen at the
version he deployed.

**This has not aged out. Any install today can land this way**, which is the
part that matters and the reason the old entry was worse than nothing: it
described a legacy problem that would fix itself, and this one will not.

**Two candidates the old entry named are now ruled out.** A read-only Actions
token cannot be it — the workflow declares `permissions: contents: write`,
which overrides a repository's default. And "a scheduled workflow only runs on
the default branch" is not it either: these copies have no workflow to run.

**The fix for one copy is the fix June got:** put
`.github/workflows/update.yml` in by hand and it self-heals from the next hour
on. It cannot arrive any other way, because arriving is the thing that copy
cannot do.

**Still wanted, and now clearly worth it:**
- A line where a keeper will find it — `/get/install`, or the README — saying
  to check for the Actions tab after deploying, and what to do if it is not
  there.
- A second file in `.github/` would keep the folder alive when the workflow is
  refused, which turns a silent disappearance into a visible gap. It does not
  fix the copy, but it makes the failure legible.
- Worth asking whether the deploy flow can request the permission outright.

**A day on the numbers, charted — Miyel's, 2026-09-16.** What a copy costs at
scale, drawn rather than argued, so a ceiling is visible before it is hit. What
one afternoon's measuring already found, as a starting point: a beacon poll is
884 bytes, one Vercel invocation and two Postgres queries; the poll keeps Neon
awake, and Neon Free sleeps only after five idle minutes and allows about 400
awake-hours a month against a month's 730 — **so the wall is hours of
somebody-having-the-journal-open, not the poll rate**. Vercel Hobby's million
invocations then allow roughly ten people watching at once at the current
fifteen seconds, or three and a half at five. Unverified and worth charting:
Vercel's four CPU-hours, since the 180–600ms a poll takes is nearly all waiting
on the database and is not billed as active CPU. Bandwidth is a non-issue — a
million polls is 1.2GB of 100, because the covers come from Apple's CDN.

**The before-and-after for `quiet-beacon` is Miyel's to read.** The brief asked
for Neon's transfer figure noted before the change and a day after, and Neon's
dashboard is not reachable from here. Note the figure on the day the branch
merges and again the day after. What to expect: the edge cache takes many
watchers down to about one read every ten seconds between them, and the hidden
tabs stop asking at all, so the figure should fall and then stop tracking how
many people had the journal open. **Awake-hours will not move**, and that is
the honest half — the wall is Neon Free's ~400 awake-hours against a month's
730, and one person with the journal open still keeps the database awake
however cheaply they ask.

**If the beacon ever comes back stale on the phone, the missing event is
`pageshow`.** Waking is hung on `visibilitychange`, which is what fires when
you switch apps or tabs. A page restored from Safari's back-forward cache —
coming back from another journal's sheet, say — is the one case that might not
fire it. Not seen; written down so nobody debugs it twice.

**FOUR TABS, SENDING FROM HOME, THE ENTRY'S TOOLS — briefed 2026-09-16.**
Four features, one branch each, each tested by thumb on a real phone and merged
before the next starts. Item 1, the quieter beacon, is in Complete. What is
left: **4. Four tabs**, the biggest change, which is why it is last. Items 1
and 2 are merged (main is 1.23.0); item 3 is in Complete on branch
`entry-tools`. Phone layout only (`max-width: 768px`); desktop is untouched. Four of
the decisions it makes amend or reverse 2026-09-15 entries and are recorded as
each one merges, not before.

**Scope changed the same day, 2026-09-16.** The brief listed *Removing
Last.fm* under Out of scope; Miyel reversed that a few hours later, on the
grounds that the in-house scrobbler is more true to the product and works the
same — "ironically more accuracy for what the product is". It became branch
`one-beacon`, out of order and before item 2, because the argument for going
then was that nobody had one connected yet. The rest of the order stands.

*Item 2's three "check before building" questions, answered 2026-09-16 while
item 1 was being built, so nobody has to look twice:*

- **Does `POST /api/submissions` refuse a send with no browser Origin or
  Referer? No.** There is no Origin or Referer check in the route or anywhere
  above it — `proxy.js` decides nothing and the route's only gate is the
  doorman. A server-to-server send is accepted today, as written.
- **How does `library/doorman.js` key its limit? On the caller's IP**, via
  `whoIsKnocking()`, which reads the front of `x-forwarded-for`. So the brief's
  fear is real and specific: sends from home all leave from Vercel's shared
  addresses, land in one bucket, and the `submission` door is 5 tries per 10
  minutes — the sixth keeper to send inside ten minutes would be turned away by
  the first five. Server sends need keying on the **sender's journal** instead,
  confirmed against `/api/settings` the way filing an address already is.
- **Will an older copy still accept the send? Yes.** The route destructures the
  keys it knows off the JSON body and anything else falls on the floor, so new
  fields cost an old copy nothing. What it loses is the carried entry — the
  send lands, the credit lands, and the cross-copy reference is simply absent
  rather than broken.

**The send from home has never actually been sent, 2026-09-16.** Everything
around it is proved — the routes answer, the owner check turns a stranger away,
migration 016 applied, the sheet was rendered and looked at, the build is clean
— but a send needs a wristband and two journals, and neither is available from
here. **What to try, in this order:** open `/dashboard/people` on the phone,
press the send glyph on a row, pick a record, write a line, send it to June, and
then look in her inbox. Watch for: the faces drawing (they are read off each
journal, so one that is asleep shows the plain mark), the Send button naming the
right person, and — the one worth being deliberate about — **pull the sheet away
mid-sentence and open it again**, because keeping what was typed is a rule here
and this is a new place it has to hold.

**Settings' beacon switch has not been LOOKED at, 2026-09-15, still true
2026-09-16.** It was a two-beacon picker and is now the on/quiet switch — same
`.st-choice` / `.st-pick` shape, same two rows, different words. Written, lints
and builds, and the column it writes round-trips, but `/settings` is behind the
password and could not be opened from here. **Check on a phone:** the two rows
draw, the chosen one takes the border and the darker panel, Save sticks after a
reload — and then actually switch it to Quiet and look at the journal. The
quiet path is the one thing on `one-beacon` that could not be exercised from
here at all, because localhost writes to the production database and testing it
would have meant taking the live beacon down and putting it back. What to
expect: the beacon screen still there, the record and the line gone, "Nothing
logged yet." in their place, and the dot on the mark unlit.

**A listen that wrote nothing survives only until the next one, 2026-09-15.**
The needle is one row, so closing a record you sat through keeps it on the
beacon until another record goes on the desk — then it is gone, because there
is nowhere to keep it. A log of every cover ever opened is a different thing
from a journal showing its work, so this is the cost being accepted rather
than a bug. If it wants fixing, the fix is a second table, not a second row.

**Names to confirm, 2026-09-15** — the session beacon. Miyel named `needle`,
`library/needle.js`, `/api/needle` and `set_needle` / `pull_needle` /
`lift_needle`, `beacon_source`, and the "Now logging / Now listening" wording
on the Settings picker. The rest were chosen without asking and rename freely:
`pull_recent_listens`, `sameRecord`, `fromLastfm`, `beforeThat`, `liftNeedle`
in the session hook, the `state` field and its five values (`logging` /
`logged` / `listening` / `played` / `none`), the `before` field,
`has_listens`, `needle.ended_at`, `migrations/014_beacon_source.sql`, and
`.st-choice` / `.st-pick` in forms.css.

The one word chosen outright rather than offered: **"Last played"** for the
Last.fm beacon's quiet state. It read "Not currently listening" before, and
the new one is parallel with "Last logged" and is what the old stamp across
the idle cover said. Say if the old one was better.

**Names to confirm** — chosen without asking, because the session was
autonomous. Rename freely: `secrets` (table), `library/secrets.js`,
`library/claim_notice.js`, `scripts/prepare_database.mjs`, `/api/secrets`,
`beacon_available`, `/?edit=card`, `.st-*` and the setup page's `.su-*`.

**Names to confirm, 2026-09-13** — the setup fixes, autonomous: branch
`setup-fixes`, and `.su-peek` / `.su-eye` (the password field's show/hide
switch) in forms.css.

**Names to confirm, 2026-09-03** — the `/get` rebuild, also autonomous:
`components/main_components/InstallSteps.js` (the steps and the toggle),
`library/install_guide.js` (the deploy and source URLs plus the step text,
read by both server and client), `app/get/layout.js`, the `?on=phone|laptop`
query key, the `.get-*` classes, and branch `get-rebuild`.

**Settings may want the photo, prompts, links and rig outright.** The brief
said so; what shipped lists them as doors to the card, on the
edited-where-it-prints rule. Miyel's call — see DECISIONS.

**DO THIS FIRST — the send flow's columns are not on the live database**

Five statements. Until they have been run, **the inbox shows no submissions at
all** — `pull_submissions` selects three columns that do not exist yet, so
`/api/submissions` answers 500 and the page's `.catch` renders "No pending
submissions" rather than an error. It looks like an empty inbox and it is a
broken read. Sending is blocked the same way, and fails loudly.

```sql
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS album_art text;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS collection_id text;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS sender_url text;
ALTER TABLE drafts ADD COLUMN IF NOT EXISTS received_from text;
ALTER TABLE drafts ADD COLUMN IF NOT EXISTS received_date date;
```

All five are additive and nullable, so nothing existing changes and no row is
rewritten. Run them in Neon's SQL editor. Take a backup first (`npm run
backup`); this is the production database and there is no other one.

**DO THIS FIRST — the prompts column is not on the live database**

`migrations/001_initial.sql` has it, the runner applies it, and the card's save writes it.
Until this statement has been run, pressing save on the card fails:

```sql
ALTER TABLE settings ADD COLUMN IF NOT EXISTS bioanswers jsonb;
```

Reads are safe either way — `pull_settings` does `SELECT *` and a missing
column just comes back as null — so the site renders fine right now. It is
only the write that breaks. Run it in Neon's SQL editor. Take a backup first
(`npm run backup`); this is the production database and there is no other one.

**SHIPPING A COPY** — the gap between "it runs here" and "someone else can run it"

The four below, plus SCALING further down, are what stands between this and
somebody else installing it. Two are structural and unbuilt — there is no
migration runner and no welcome screen — and until both exist a fresh account
cannot be tested end to end.
- [x] **Migration runner** — done 2026-08-31. `library/migrator.js`, run from
      `instrumentation.js` on server start, ledger in `schema_migrations`,
      files in `migrations/`. A fresh copy builds its own tables and nobody
      opens a SQL editor. `schema.sql` is retired; `migrations/001_initial.sql`
      is the whole schema and the thing backups now carry.

      Both claims are checked, and the second one caught a bug: rehearsed
      against an empty schema, 001 produced nine tables, eighteen indexes and
      **zero foreign keys**, because the DO blocks matched constraint names
      without scoping to a table. Scoped by `conrelid` now, and the rehearsal
      gives 9 / 18 / 3.
- [x] **Welcome screen** — done 2026-08-31. `/setup` → `WelcomeScreen`, writing
      through `POST /api/setup`. Four fields: name, address, logging-since,
      Last.fm. The password comes first, as `PasswordGate bare`.

      An unclaimed copy holds its whole site behind `ComingSoon` rather than
      redirecting — a stranger should not land on somebody's setup form even
      though it is behind the same password as everything else. `proxy.js`
      carries the pathname so the layout can exempt `/setup`; it does no
      database work, because a read there would be a read per request.

      `isSetUp()` is a separate reader that does NOT catch. `pull_settings`
      swallows errors and returns `setup_complete: false`, so a gate built on
      it would read a database outage as an unclaimed journal and hold a live
      site. It caches once true, since the latch never goes back.

      Not re-enterable: it redirects home once claimed. **That leaves
      `keeper_name` with no editor** once a `display_name` is set — the card
      editor writes `display_name` instead. Real gap, see below.
- [x] **Deploy button** — done, and no longer lands on a copy with no schema: the migration runner builds the tables and the welcome screen asks who it belongs to.
- [ ] **`/api/export`** — a copy should be able to hand its owner their own data back.

**FROM JUNE'S INSTALL, 2026-09-10** — see Complete for what shipped.

- [ ] **The inline lock on a real phone.** Safari's password manager against
      the field that opens under the key on the pitch pane: does it offer to
      save at setup and fill here? The markup is the one PasswordGate has
      always had; only the container changed.
- [x] **The entry QR for album covers is now buildable.** Built 2026-09-12
      on branch `cover-code` — see Complete.
- [x] **The press on Vercel is untested.** Proved 2026-09-12 by the first
      deploy of 1.2.0: the public cover route answered a minute after the
      push — the light page's file in 1.2 s cold, the dark page's in 1.1 s,
      144 and 156 kB, 490 px — and the dark file decoded on a Mac with jsQR
      to the entry's address. So sharp ships with the function and a cold
      press is about a second. Still owed: the portrait's own re-press on
      Miyel's next signed-in visit (below).
- [ ] **Miyel's old picture is in the 2026-09-10-0315 backup** (iCloud,
      `settings.json`, framed 36.6%, the photograph carrying the code alone,
      built by Apple's reader). Superseded by the dot style on her call;
      kept there if it is ever wanted. The stash "server-side portrait code:
      dots…" on `junior-install` is the first draft of what shipped and can
      be dropped.
- [ ] **The address book on a real phone, 2026-09-12.** Built in the
      Claude browser; the sheet, June's row and the compare were seen
      signed in on the Mac. **Scan a code works on the phone, on the live
      site (2026-09-13): June's card's photo code read off the camera and
      filed onto his existing row.** Still owed: a cover's code the same
      way; the Add press on somebody else's card landing in the field.
      **The camera and the clipboard both want https**, so the phone over
      `http://<the Mac's address>:3000` gets "needs a secure address" for
      one and no Copied pill for the other. The way round, before the
      branch ships: `npm run dev -- --experimental-https` (Next makes a
      local certificate in `certificates/`, gitignored; `ln-dev-https` in
      .claude/launch.json is the same), then open
      `https://<the Mac's address>:3000` on the phone and go past Safari's
      certificate warning once. Or test on the live site after the merge.
- [ ] **Names to confirm, 2026-09-12** — autonomous session, rename freely:
      branch `address-book`; `library/people_actions.js` with `pull_people`,
      `save_person`, `remove_person` and `ask_journal_name`; `tidyJournal`
      and `journalUrl` in `library/return_address.js`; `/dashboard/people`
      and the door's label Address book; `CodeScanner`; the `.bk-` prefix in
      forms.css; the pill's words, Add to your address book and Copied —
      paste it in your address book; `reached` in the POST answer;
      `pull_keeper_name` in settings_actions, `nameInBook` on the compare
      page, and the row's Not answering yet.

**THE ID PANE AND THE DESK, 2026-09-15** — branch `card-and-desk` (Complete).
Left over:

- [ ] **The desk is the same job and has not been done.** Miyel's brief says
      so in as many words: the objects have to be objects, and the desk is
      still four buttons floating rather than an object over the feed. The ID
      is the pattern to follow.
- [ ] **The printer has no home.** It came off the card's header with the
      light switch — the header is one control now — and its placement was
      left unresolved on purpose. So `/printer` for the card is currently
      unreachable from the card. It says "coming soon" for a profile anyway,
      but this is a door that exists with nothing opening it.
- [ ] **A visitor cannot change the theme on the cross any more.** The switch
      is in Settings, which is behind the password. The nav row on an entry
      page still has one, so a visitor is not stuck — but the homepage, which
      is where most of them land, no longer offers it. Worth a look at whether
      SiteNav's switch should follow it into Settings or stay as the public
      one.
- [x] **The swipe at the wall was tried on a real phone and removed,
      2026-09-15.** It lost to the rail at the first thumb. See the entry in
      Complete and the four ruled-out approaches in DECISIONS.
- [ ] **The visitor's Send and Add under a centred name.** The row changed
      shape when the head was centred and was only seen signed in, where the
      line is the name alone. It is a centred flex column, so it will centre;
      what is unseen is whether two pills under the date want more air than 14px.
- [ ] **The rig's chosen mark now prints nowhere.** The glyph came off the
      Rig setup heading (Miyel: no glyphs there) and that heading was the only
      place `settings.rig_icon` was drawn in read mode. The chooser is still
      in the card's editor — "The rig — headphones" with nine marks to pick
      from — so it is a setting that writes a value nothing shows. Left
      offered rather than quietly removed, because taking a setting away is
      her call and this was a note about a glyph. Either it goes, or the mark
      finds somewhere else to print.
- [ ] **The counts on a fresh copy.** A journal with no masterpieces and
      nothing formative prints one count where there are normally three, and
      one number spread across the whole row may want a different treatment.
      Not seen.
- [ ] **The source line at the foot of the ID pane.** Miyel's brief lists it
      last in the reading; it is not built, because DECISIONS moved it off
      this pane to the colophon on purpose — §13 is owed to visitors and the
      colophon is the public page about the software. Both faces are public,
      so a second one here breaks nothing; it is left out pending her call
      rather than added against a written decision.

**TWO PANES AND DOWN MEANS A COVER, 2026-09-15** — branch `card-and-desk`
(Complete), on top of `open-book`. Still to look at:

- [ ] **The desk and the card on a real phone.** Everything was seen at
      375×812 in the browser pane, which is not a thumb. The switch at the
      foot, the band, and whether the card's row wants the portrait bigger
      than 118px are all eye-and-thumb questions.
- [x] **The drafts row is gone, 2026-09-15** (Miyel: drafts show when you
      start a listen). Checked against a real draft before removing it — one
      row in the table, and the picker printing *In Rainbows · Radiohead ·
      Tracks · 30m ago* with its discard beside it. The count went with the
      row: it was a `COUNT` over the drafts table on every poll of
      `/api/waiting`, answering a door that no longer exists.
- [ ] **A tall phone and a short one.** The card is a page now and its first
      screen is no longer a fixed floor, so what falls above the fold varies
      with the device in a way it did not before. Worth a look at 667 and at
      926.
- [ ] **The ··· against a thumb, and against the layer's drag.** The menu
      opens in the row on an entry's sheet, which is listening for a sideways
      drag for the next record and a downward one for closing. A tap on a 36px
      box should never read as either, and the browser pane cannot tell us
      that. Worth checking the conveyor's speed on a real screen too: 320ms
      out, 300ms back, judged on a desk.
- [x] **The entry's ··· seen in its own header, 2026-09-15.** It had only been
      measured with markup injected into the row, because the session had no
      wristband; the dev server handed one out later the same evening. Real
      numbers: the door at 311 and Correct, Print and Delete filing out to 273,
      235 and 197, `data-tooling` going on and off the row with the menu, and
      the mark at opacity 0 while it is open and 1 again after. The
      `closest('.sitenav-row')` effect does what it was written to do.
- [ ] **Nobody outside the cross can change light or dark now.** A visitor
      reading an entry finds the switch by going to the beacon. That is what
      the brief asks for and it is worth a look on a real device before it
      counts as settled — a visitor who arrives on a shared entry link in the
      wrong theme has one more step than they used to.
- [ ] **Should the spine's photograph step down on a narrow page?** It was
      meant to — 88px, the size the band's art is on a desk — and the rule that
      said so never worked, so the question has never actually been looked at.
      At 180px in a 300px spine the photograph is most of the column's width;
      at 520 it is a third of it. Her call, and it is one number.
- [ ] **Three panes on a real phone, and this is the whole test of it.** The
      shape was measured at 375x812 in a browser pane, which is not a thumb.
      What to feel: whether the band reads as navigation or as furniture, and
      whether swiping between three panes is looser than two was — the rail's
      snap is the same and the panes are the same width, but two is a toggle
      and three is a place you can be in the middle of.
- [x] **The band rested a status bar above the bottom edge in the installed
      app, and the readout said why** (Miyel, 2026-09-15). Two guesses missed
      before a temporary green box on the phone printed the numbers, which is
      the lesson as much as the bug: the browser pane reads 812 across the
      board and cannot show this at all.

      On load, standalone: **screen 874, innerHeight 812, dvh 812, lvh 874,
      safe-area top 62**. 874 − 812 = 62 = the top inset exactly. iOS paints a
      home-screen app over the whole screen — that is what `viewport-fit=cover`
      buys — and then reports a viewport one status bar shorter and anchors
      `position: fixed` to *that*. So `bottom: 0` was 62px up. Nothing about the
      band was wrong; it was obeying a viewport that was lying. After any
      interaction the same readout says innerHeight 874 and dvh 874, which is
      why a drag fixed it and a reload did not.

      **The first fix pushed the band past the reported bottom** with a
      negative `bottom`, and it went where it was told and was then clipped:
      the glyphs showed and the words under them did not. Which is the useful
      finding, and it is why the second fix is shaped the way it is — **iOS
      will paint document content below the reported viewport but not a fixed
      box.** The page's own background was already down there, so the room
      exists; a `position: fixed` element simply may not use it.

      **So the frame takes the real height and the band belongs to the frame.**
      `--hn-h` on `.hn` is what every screen-height on the cross reads now, and
      it is `100dvh` in a browser exactly as before and `100lvh` in standalone
      — the largest the viewport can be, which in an installed app is the
      screen and nothing else, because there are no toolbars for it to be
      dynamic about. The band and the caret row go `position: absolute` inside
      `.hn`, which is `position: relative; overflow: hidden`, so they land on
      its bottom edge and are clipped to it. And `.hn` carries
      `margin-bottom: calc(100dvh - 100lvh)` — −62 — so the taller frame does
      not make the document scrollable: it paints 874 and measures 812, which
      is the arrangement iOS is already drawing. Both numbers are 0 the moment
      iOS re-measures, so nothing moves between the two states.

      It also fixes the settle: the crown and the square's offset read `--hn-h`
      too, so the beacon screen is laid out against the real height from the
      first frame rather than spreading a beat later. Confirmed on the phone
      (Miyel: it looks great) and the readout is out.

      **The readout is the part to remember.** The browser pane reads 812
      everywhere and could not show any of this; two fixes were guessed at and
      missed before a temporary green box on the phone printed `screen`,
      `innerHeight`, all four viewport units, both insets and the band's own
      box. It took one screenshot to end an argument that had already cost two
      wrong commits. **When a phone does something a desktop browser cannot
      reproduce, print the numbers on the phone before changing anything.**
- [ ] **`display: contents` on the two spine wrappers is load-bearing now.**
      It is what lets one markup be a rail on a phone and a book on a desk. It
      is well supported and the accessibility bugs it used to have were on
      elements with semantics; these are a plain div and a div that was a
      section until this brief. Worth knowing it is there if the phone ever
      lays out strangely — that is the first thing to look at.
- [ ] **Names to confirm, 2026-09-15 (two panes)** — rename freely: branch
      `card-and-desk`; `count_drafts` in database_actions and `drafts` on
      `/api/waiting`; `paneFaces` in HomeNav; `.hn-pane--turn`, `.hn-face`
      (kept), `.idc-top`, `.idc-said`, `.db-head`, `.db-mark-svg`,
      `.db-tool`. From the turn:
      `.hn-leaf`, `TURN_MS`, the `hn-turn-arrive`/`hn-turn-leave` keyframes the
      reduced-motion cross-fade uses, and `opens` on a face beside `word` — the
      strip's names went with the strip and the flip's keyframes went with the
      flip. And
      from the ···:
      `.kt-tools`, `.kt-tool--door`, `.kt-tool--out`, `.kt-door`, the
      `kt-file-out` keyframes, `--kt-dir`/`--kt-i`/`--kt-d`, `PACKING_UP`,
      and the `what` prop on KeeperTools.

**THE DESKTOP IS AN OPEN BOOK, 2026-09-15** — built on branch `open-book`,
merged as 1.17.0 (Complete). Replaced the three columns of 1.10.0 outright.
Still to look at:

- [ ] **A real mouse on the grip, and the arrow keys on it.** The browser
      tool's drag DID land on it this time (360 → 506 → clamped at 300 and
      520, remembered across a reload), which is the thing that never worked
      with the two 9px grips of `desktop-columns` — the fold sits at 25vw
      now, where a coordinate lands squarely. A real pointer should simply
      work. The arrow keys on a focused grip are untried.
- [ ] **The draft guard on an inbox row is unverified against real sends.**
      Pressing Start a listen with a different record in hand offers to save
      it as a draft first (`openListen`, `keepOpenListen`, `keepThenStart`
      in app/dashboard/inbox/page.js). The file compiles and the panel is
      styled, but the inbox had nothing in it to press — this wants one
      pass with a real submission and a half-written listen, checking that
      the draft is in `drafts` afterwards and that the new record opens
      clean.
- [ ] **Settings and the address book on the spine, with real content.**
      Geometry is right — all four owner pages open at the spine's width
      with nothing overflowing — but they were seen empty behind a 401.
      Their phone rules are viewport queries that do not fire in a wide
      window; the inbox's three tabs needed their own `.lay--over-spine`
      rule in forms.css and others may too. That class, not a container
      query, is the pattern: `container-type` would make the sheet a
      containing block for every fixed and absolute descendant.
- [ ] **The session on the right page, with a record actually picked.** The
      picker opens there and the spine stays put; the four screens under it
      were not seen. The note field's desktop floor is 168px and the track
      strip already flexes to one line — both want an eye.
- [ ] **The correction bar and the print bar with a real edit open.** Their
      inset rule was dead from 1.10.0 until today (see Gotchas) and is now at
      the foot of entry.css where it can win. By script it is right in both
      cases — pinned to the right page with the cross under it (300/0, and
      the trouble line at 316/16), full width on an entry opened cold at its
      own address. Neither was seen with a bar actually on screen.
- [ ] **A window under 900px.** At 820 the spine is at its floor (300) and
      the journal at its own (520), and the wall's bar now wraps to two rows
      rather than crushing the search field to nothing. Seen by script and
      in one screenshot; not lived in.
- [ ] **Names to confirm, 2026-09-15 (the open book)** — Miyel named the
      spine and the hook; the rest came out of the build and can be renamed
      freely: branch `open-book`; `hooks/useSpineWidth.js` with
      `useSpineWidth`, `fit` and `restWidth`; the keys `ln-spine` and
      `ln-spine-face`; `--spine-w`, `--hn-turn-h`; `.hn-face`,
      `.hn-face--card`, `.hn-face--desk`, `.hn-face--colophon`,
      `.hn--face-card` / `.hn--face-desk`, `.hn-turn-row`, `.hn-turn`,
      `.hn-turn-say`, `.hn-dots`/`.hn-dot`, `.hn-grip` (kept); the
      `?mark=` parameter on the wall, `arrivingAlone`/`cameAlone` in
      handoff.js, `.ab-count-*` for the window, and `.idc-object`/`.idc-photo`/
      `.idc-ident`/`.idc-keeping`/`.idc-acts`/`.idc-counts`/`.idc-pinned`
      on the card;
      LayerEntry's `over` values `"journal"` and `"spine"`,
      `.lay--over-journal` / `.lay--over-spine`; `.db-hero--lit` and
      `.db-hero-record`; the inbox's `.ib-holding`. The grip's label is
      "Resize the spine".
- [ ] **What turns the spine is a two-sided switch, and it took five passes
      on 2026-09-15 to get there.** The brief asked for a line at the spine's
      foot; Miyel asked for a Phosphor mark on it rather than words, naming
      "destination with caret" up front as the fallback. The mark on a line at
      the foot was "not the right idea" — the foot should just read — so it
      went to the top right, on the bar's line, where it pairs with the lights
      over the journal. The mark alone there was "too subtle". A word and a
      caret in `.ln-pill` was pressable but "I just don't like it, not sure if
      this is it", which is the one worth listening to: every version so far
      said *press this and something happens* and none of them said what the
      thing IS. **A switch says it by being a switch** — both sides in one
      control on the density switcher's recipe (`.gd`), the one you are on
      lit, the lit one not pressable. **Card / Desk**, and Card / About signed
      out; the pane's full name stays on the hover and `paneMarks` is
      untouched, because those are read out on a swipe where a sentence is
      right. Bio was tried for an hour and dropped — it also names the
      free-text field the prompts replaced, which DECISIONS says may come
      back. **Centred over the spine, sixth pass** (Miyel: "maybe it can be
      centered") — on the column's own axis, directly over the portrait,
      which is why it settles; the mark over the journal is centred on its
      page the same way, and the lights stay at the far right of the window.
      Still to see: the switch signed in, where the right-hand side reads
      DESK.

- [ ] **Where a record came from wants one pass of refinement, 2026-09-15.**
      Miyel's call at the end of the credit and inbox work, and it is
      fair. Eight columns now answer one question — `entries`:
      `source_entry_id`, `received_from`, `received_date`,
      `received_from_url`; `submissions`: `submitter_name`, `sender_url`,
      `status`, `entry_id` — and three surfaces set one: the send form,
      the entry editor, the inbox. Before redesigning any of it, the
      honest accounting:
      - **`source_entry_id` had no writer at all — settled 2026-09-15**,
        on branch `park-lineage`: the machinery is retired and the column
        parked. It was briefed as *wire the send flow to set it*, which
        turned out not to be buildable — an `entries.id` is local to one
        database, and a send is a visitor on this copy's form with their
        journal at an origin their browser cannot read. Both reasons, and
        what a revival would take, are in that branch's entry at the top
        of Complete. Nothing else on the chain is waiting on this.
      - **The credit being on the entry as well as on the send is not
        waste.** `submissions.entry_id` is the inbox's; the entry's
        `received_from`/`received_from_url` is what the public feed
        publishes and what another copy matches on, and the feed reads
        entries and must never read submissions. Two records of one fact,
        both load-bearing. What is missing is anything that notices when
        they disagree.
      - **Two outcomes that sound alike.** `reviewed`/started and
        `logged`. Kept apart deliberately (DECISIONS) because one is an
        intention and one is a record — but if the session attached the
        entry on save, started could go and there would be one word.
        That is the simplification available, and it is a session's work,
        not a tidy-up.
      - **Three places name a sender** because they name it on three
        different objects at three different moments. Worth one look at
        whether the inbox's *Link their journal* and the editor's *Sent
        by* should be the same press on the same object.

**THE ADDRESS BOOK, THE FEED, AND WHERE COMPARE LIVES** — briefed
2026-09-12. The address book merged to main that day, the feed and the
person's page the next (Complete). Left: the printer, and the chain.

- [x] **The chain says a quiet credit was lost, 2026-09-15.** Fixed the
      same day by the `sent-by` rebuild, and not the way this asked. The
      answer is not a better sentence: a withheld credit now draws nothing
      at all and the Submission chip stands in, because saying a name was
      withheld would leak the fact of the withholding — which is the thing
      being asked for. See Complete.
- [ ] **Names to confirm, 2026-09-15 (Sent by)** — rename freely. Miyel
      picked `SentBy.js` and `Trail` and the `.ln-sent-` prefix; the rest
      were chosen while building: `creditOn` (the one reading of a credit,
      which decides both the line and the chip), `useTrail` (the walk, held
      by the page so it runs once for two copies of the card), `walkBack`,
      `firstHop`, `readJournal`, `Hop`, `Said`, `Face`, `Tick`; the props
      `keeper`, `mine`, `open`/`onOpen`; the classes `.ln-sent`,
      `.ln-sent-line`, `-lbl`, `-face`, `-face--bare`, `-name`, `-more`,
      `-more--open`, `-caret`, `-trail`, `-rail`, `-rail--more`, `-step`,
      `-hop`, `-hop--here`, `-hop--end`, `-who`, `-said`, `-tick`,
      `-desk`, and `.ln-sent-open` on the screens; and the words on screen —
      *Sent by*, *found it*, *the origin*, *logged 15 aug*, *no answer*,
      *no journal*, *not logged*.

- [ ] **The edit screen should collapse once a sender is picked,
      2026-09-15.** Miyel's, on seeing the finished line: *when sent by is
      chosen it should just show Sent by and the picture of the user*. The
      editor still draws the whole strip — the label, a text field holding
      the name, and `MiniAddressBook` with every face in it, lit one among
      them — whether or not anybody has been chosen. Once one has, it should
      read the way the entry reads: *Sent by*, their face, their name. The
      strip is for choosing, and choosing is over. Presumably a press on the
      collapsed row opens it again to change or clear it, and free text still
      has to reach somebody who keeps no copy. Her call on the shape; she
      said it can wait for its own session.

- [ ] **The trail against a real chain, 2026-09-15.** It has only been
      seen against a fixture: no chain exists to walk, because Zach's and
      Kai's journals both publish zero entries, so every real credit ends
      at *their journal answered and does not have it* and no pill is
      drawn. What is still unseen with real data: the `+2` arriving, the
      band, a hop whose journal does not answer, and how long the walk
      takes over a phone connection. It will start working on its own as
      soon as one of them logs a record.

- [ ] **Sending from the address book, 2026-09-15.** Miyel's, raised while
      sending Junior an album: with somebody already in the book it is a
      long way round to open their journal and find the send page. A send
      could start from their row. Connects to the parked *send from your
      own entry* idea (DECISIONS, `source_entry_id`) — both start a send
      on your copy rather than on somebody's page, and a send that starts
      here is the only shape that could ever carry which record of yours
      it came from.
- [ ] **The send form never explains whose choice is whose,
      2026-09-15.** *Don't credit me publicly* is the sender's, but the
      form is served by the recipient — so your own copy can never show
      you the option for a send *you* are making, and Miyel went looking
      for it on Junior's page and found his copy had not updated yet. The
      asymmetry is right; it is just invisible. A line on the form, or
      nothing, but decide rather than leave it to be rediscovered.
- [ ] **The feed's remaining loose end, 2026-09-13.** Track notes on
      a row's Compare: the feed carries no writing, so the panel shows the
      two verdicts and the two horizons and links to both entries. Their
      track notes need their copy to serve an entry across origins — CORS
      on `GET /api/entries/[slug]`, additive, every copy gets it on update.
- [ ] **The Submissions view fills in as copies update.** An entry's
      credit is matched by `received_from_url`, which only entries logged
      from the inbox after 1.4.0 carry; older ones match by the typed name
      against `keeper_name`, and Miyel's own 18 Submission entries mostly
      carry no name at all (they predate the inbox filling it in). June's
      and Peyton's copies publish no `keeper_name` and no credit until they
      press Update. **Since 2026-09-14 the old ones can be backfilled by
      hand:** open the entry, correct, tap the sender's pill under Sent by
      — the address travels with the name, so the match is exact.
- [ ] **The printer on the person's page — next.** The shape of the
      agreement without the writing — you and June agree on 34 records;
      you disagree hardest on these three — naming both people. The notes
      stay on the journals and the card is a reason to visit both. Its
      door is on the page already: the glyph beside Visit opens
      `/printer?person=<id>`, which says coming soon.
- [ ] **The printer — what is left after the record's plate, 2026-09-12.**
      Built on branch `printer` (see Complete): the press back from
      `share-printer`, `EntryPlate.js`, and `/printer?entry=slug` opening it
      for the keeper. Left:
      - **The card's plate** — `IdentityCardPlate.js` on `share-printer`,
        reworked to the 2026-08-25 brief (one toggle for records + since, no
        address) — and **the comparison's**, for `/printer?person=<id>`.
        Both doors still say coming soon.
      - **A real phone.** Miyel looked on 2026-09-13 and four things
        changed (see Complete). Still to see: whether the installed copy
        now fills its screen (the standalone rule, and a force-quit to
        shed a stale stylesheet), Send to the share sheet, Save into the
        camera roll, a story with the sticker in the space.
      - **The moving card.** Recording is proved (below); Instagram is not —
        the test clip went to Miyel to post. Then two animations that mean
        something and no screensavers: covers arriving, the rating filling.
      - **The nine backgrounds as looks**, if the moving card earns them; the
        four DOM-built ones (Fizzy, Rain, DVD, SplitScreen) have to be taught
        to draw onto a canvas first.
      What the session proved, so the build started from numbers:
      - **A browser records its own canvas into an H.264 MP4 with no
        server.** WebCodecs (`VideoEncoder`, `avc1.640028`) plus the
        `mp4-muxer` library made 4 s of 1080×1920 in 1.0 s; `mdimport`
        reads it as H.264, 4 s, and `avconvert` converts it. `MediaRecorder`
        also says `video/mp4` but writes a file Apple reads as 0.05 s — see
        Gotchas. AAC is available for a silent track if Instagram wants
        audio. Unproved: iPhone Safari (WebCodecs since iOS 16.4, secure
        context only) and Instagram itself.
      - **If a printed flyer ever wants a code (a toggle, off by default):
        the small code on a story is the plain code, not the pressed
        photo.** At the 0.3× floor the press used before, on a 1080-wide
        story: plain at EC M (v4, 33 modules) reads from 200 px; plain at
        EC H (v6 — an entry address at H needs v6, 41 modules) from 240 px;
        the photo code needs 400 px and only at 0.5×. 200 px is 18% of the
        width, about 1.2 cm on a phone screen. Cut from the print the same
        day (see Complete) — the argument is in the DECISIONS archive.
- [ ] **Names to confirm, 2026-09-13 (the person's page)** — autonomous
      session, rename freely: branch `person-page`; `/dashboard/people/
      [id]` and `PersonPage`; `pull_person` and `GET /api/people/[id]`;
      the `.pn-` prefix in forms.css; the sheet's label "A person"; the
      facts' words — Records you both have, Rated alike, Sent you, Hit
      rate with you — and what a hit is (logged and rated four or better);
      `ALIKE`, `HIT`, `OFFSET_NEEDS`; the section titles, and "the
      interesting column" kept from the old compare.
- [x] **The chain.** Tapping the Submission chip on an entry opens the
      lineage upward. Backward only (DECISIONS). Built 2026-09-14 on
      branch `credit` as `Chain.js` — see Complete.
- [ ] **The cover's code on a real phone, 2026-09-12.** Built in the
      Claude browser. On the phone: tap a cover, scan the code with the
      camera from the light and the dark page, paste what was copied into
      Notes, tap again to turn it back, and swipe to the next record to see
      it arrive on its cover. On a desk: the thumbnail grows to 220px and
      the title moves over. **The Copied pill needs https or localhost:**
      a browser refuses the clipboard on plain http, so on the phone over
      the network address (`http://192.168…:3000`) neither the cover nor
      the card copies anything — the live site does.
- [ ] **The portrait re-presses itself on the next signed-in visit**, build
      6 (ten pixels a module, adaptive PNG): the stored code goes from
      180 kB to about 96 kB, which is the settings row shrinking by half
      of what the 310 kB scare was about. Nothing to do; read the
      `[portrait code]` line in the log once.
- [ ] **Names to confirm, 2026-09-12** — autonomous session, rename freely
      (`CodeSlot` itself was Miyel's pick): branch `cover-code`; the column
      `entries.cover_code` and its stamp
      `b=<build>&d=<dot>&a=<fingerprint>` (migration 006); `GET
      /api/entries/[slug]/code?theme=`; `pressCoverCode` and `entryAddress`
      in `library/cover_code.js`; `library/code_shape.js` (`CODE_QUIET`,
      `LEAST_VERSION`); `components/main_components/AddressCode.js` (moved
      out of the card); the `cover` door in `doorman.js`; `.ln-copied` in
      base.css (was `.idc-copied`); in FullPostPage `turnCover`, `coverCode`,
      `codeFor` (which record the state belongs to), `coverSlot`,
      `COVER_LABELS`, `artMark`, `HERO_COVER_CODE`; in CodeSlot `picture`,
      `codeSrc`, `turned`/`onTurn`, `turnable`, `backGlyph`, `labels`,
      `codeState` ('pressing' | 'pressed' | 'plain'), `asked`, `spanOf`,
      `COPIED_MS`; `.ln-slot`, `.ln-slot--turnable`, `.ln-slot--bare`,
      `.ln-slot-picture(--off, --pressing)`, `.ln-slot-code`,
      `.ln-slot-plain`, `.ln-slot-pressed` and `.ln-turn-badge` in base.css
      (the last was the card's `.idc-portrait-badge`); `AddressCode`'s
      `level`, `least`, `ink` and `paper` props;
      in entry.css `.ln-cover--turnable`, `.ln-cover--bare`,
      the `--ln-code-span` property; the `dot` argument to
      `buildPortraitCode` and `codeFor` in the press.
- [ ] **Names to confirm, 2026-09-11** — the press: `POST /api/portrait/code`;
      `pressStoredPortraitCode`, `buildPortraitCode({ url, portrait,
      position })`, `flipInk`, `darkPageCode` and `isCurrentCode` in
      `library/portrait_code.js`; the `d` (dot) parameter and `b` (build)
      stamp on `portrait_code_url`; `?theme=dark` on `/api/portrait`;
      `portrait_code_stale` in the Bookplate.
- [ ] **Names to confirm, 2026-09-10** — autonomous session, rename freely:
      branch `junior-install`; the query key `?with=` on `/compare`
      (`carryFrom`, `noteArrival`, `subscribeSender` and `?from=` went on
      2026-09-12); `letIn` and `askWaiting` in HomeNav; `.pt-lock`,
      `.pt-key` and `.pt-lock-field` in nav.css; PasswordGate's `autoFocus`
      prop.

- [ ] **The scratch copy `ListeningNotes/listening-notes-copy-test` is
      safe to delete.** Private, made 2026-09-12 to run the button; a
      snapshot of 9b11b75 with the workflow pasted in, updated four times
      since (twice by Miyel herself). Keep it if a change to the button
      wants a rehearsal.
- [x] **The "left as they were" path, seen on a real run 2026-09-13.**
      Miyel pressed the button on the scratch copy from the Claude
      browser: eleven seconds, "Updated to Listening Notes 1.7.2 (was
      1.1.0)", the 1.7.0 and 1.6.0 notes in the summary, and "Left as they
      were, because GitHub does not let a workflow change workflow files:
      .github/workflows/update.yml" — the copy keeps `checkout@v4` while
      main has v5, and GitHub warns that v4 targets Node 20 and is forced
      onto 24, but runs it. A copy's pasted workflow file only ever changes
      by hand; the logic it fetches from upstream is what moves.
- [ ] **The version moves with the merge; a release announces it, by hand,
      when there is something to tell a keeper.** Semantic versions from
      2026-09-12, on Miyel's call (DECISIONS): a fix bumps the last number
      (1.1.1), something new the middle (1.2.0), a change that asks
      something of keepers the first (2.0.0) — in the same merge as the
      change, so two copies made a day apart cannot share a number and
      differ. Docs and the updater's own script need no bump. The desk's
      line compares the latest public release with `package.json`, so
      nothing reaches a keeper until `gh release create vX.Y.Z --target
      main --title X.Y.Z --notes "…"` — notes written for keepers: new,
      fixed, moved. Several versions can pass between releases; a high
      middle number is a beta being built. The pitch pane's number links
      to the releases list, never to a tag that may not exist yet. (An
      earlier version of this item was lost in a NOTES edit on 2026-09-12
      and rewritten.)
- [x] **June's copy updated by the button, 2026-09-14 — and Vercel built
      from the bot's push, the last unproved step.** He created the workflow
      file himself in GitHub's web editor (commit "Create update.yml",
      identical to main's) but could not find it on the Actions tab from
      his phone; he added `ListeningNotes` as a collaborator on
      `josejunior770-spec/userone` (private) and the button was pressed from
      here with `gh workflow run update.yml -R josejunior770-spec/userone`.
      0.1.0 → 1.10.1 in one run, merge pushed by `github-actions[bot]`, the
      summary listing the release notes 1.6.0–1.10.1; his site answered the
      new routes about four minutes later. Nothing about the mechanism is
      unproved now. He can remove the collaborator whenever he likes.
- [ ] **The install page (`/get/install`) says nothing about updating.**
      The README does; the page is Miyel's copy's and can carry the same
      paragraph when the screenshots land.
- [ ] **Names to confirm, 2026-09-11 (update)** — branch
      `one-button-update`; `.github/workflows/update.yml` and its name
      "Update this copy"; `scripts/update_copy.mjs`; `GET /api/update`;
      `.db-update`.

- [ ] **The sender's line on a real phone.** The brief's question: does
      `?from=`/`?as=` survive the sheet the address book opens on an
      installed copy? The parameters are in the address, so the sheet has
      them whatever it does with storage; the write and the send form's
      read happen inside the same sheet. Unproved on an iPhone until Blue
      or June updates and tries it — both their copy and Miyel's must be at
      the version that writes and reads the link.
- [ ] **The comment form still asks for a journal.** Same two shapes wanted
      there: a keeper who arrived from their own copy is known; anyone
      else is asked for a name only. Not in the brief; a small change in
      `NewCommentForm.js` once the send form's shape has been seen on a
      phone.

**STRUCTURE** — see DECISIONS.md before starting any of these

The cross is built and merged. What is left of it:

- [x] **`usePlaceKeeper` is not needed and will not be built.** It was going to remember the pane index and the per-pane scroll offset across a route change, because browsers do not restore nested scroll containers. Going out to an entry and back is the only thing that lost them, and an entry is a layer now — the cross never unmounts, so both survive on their own. Verified: pane scroll 991 before and after, and the rail still on the beacon pane.
- [ ] **The journal's own address has no preview picture.** An entry's does
      now; the root should unfurl as the card. That is the printer's plate,
      so it waits for the printer rather than growing a second card.
- [ ] **`useShake` + `firework()`** — shake the phone, a firework goes up, then `/shuffle`. The route stays (kept on purpose 2026-09-06); the shake is the only way in that is still meant to exist, since the pill came off the foot of the wall.
- [ ] **The share page's lint fix is unverified in the browser.** `chosen` is
      now derived from the fetched record rather than set in an effect, and the
      "Drawing…" line is written from a frame callback. Build and lint pass;
      the page needs a signed-in look at `/dashboard/share` to confirm both
      slides still draw and the status line settles to blank.
- [ ] **A QR on the pitch pane.** DECISIONS already settles that the right pane produces a fixed code to `/get`, the same on every copy. Not built, and the "logo made of the QR" idea is unresolved.
- [ ] **PARKED until Junior has a copy — Surprise (`/shuffle`) has no way in.** Work in progress by decision — the shake is the intended gesture and is not built. See DECISIONS.

**TWO FLOORS ON THE CROSS** — briefed 2026-09-07. Replaces "the cross's two
open problems" (2026-08-29). Read the ruled-out list in DECISIONS first.

**Built the same day on branch `two-floors`.** First pass: the centre pane's
two floors (the static test page in step 1 was skipped), the beacon's status
line and the "Before that" header, the desk's Start a listen as the third
180px square, the name at 30px/27px, `touch-action: none` on both scrims.
**Phone test passed on the centre pane** — the structure works on iOS Safari.
Second pass, from that test: the bar on floor two now has the entry header's
geometry (80px band, row at 22px, `--hn-bar-h` on `.hn`) so the mark clears
the notch; the wall's bar is the page colour and square, flush on the bottom
edge; About has its floors (crown + card, then the writing in
`.hn-floor-scroll`, `crown` passed in as a prop); "Albums logged" and
"Logging since" are one row, `39 · since March 2026`; Inbox and Settings are
two tiles side by side under the square. A floor is `min-height: 100dvh`, so
on a phone too short for the card the floor grows and scrolls that overrun
natively before the snap, rather than clipping the Send button; the scroller
in floor two is a stated 100dvh, because a flex basis against a minimum
resolves to the content. Third pass, from the second phone look: the desk's doors stack under the
square, each 180 wide; the counted row's value is in the label face; Send an
album is the same tile as the desk's, with a paper plane. The tile is defined
once as `.ln-tile` in base.css (panel, hairline, 18px radius, shadow, label
face) and the desk hero, the doors and Send carry it with their own sizes.
Also: a Last.fm cover that fails to load (their image host answers per URL,
and per client — one 404s from curl and loads in Safari) falls back to the
note placeholder on the beacon, and to the journal's own cover or a blank
tile in the recent row, instead of Safari's broken-picture mark.

- [x] **About.** Floor one: the card as it stands — portrait, name, the
      counted rows, the pinned album, Send an album. Floor two: the prompt
      answers and the rig, which already sit under the card in `.ab-below`.
      Two fit problems first, because floor one has to be exactly one screen
      or the snap has nothing to land on. (1) The name is fixed at 36px
      (31px under 480px wide) with no clamp — smaller, so Send an album sits
      clear of the caret row; today the button lands about 24px above the
      carets on a tall phone and under them on a short one. (2) The 180px
      square is a duplicated literal in `idcard.css` and `nav.css`; it wants
      to be one token clamped by height (`min(180px, 22dvh)` or Miyel's
      number) so the whole card fits a 667pt phone with every row on. Floor
      two is rendered only when there is reading or an edit is open, so a
      fresh copy gets no caret into an empty room.
- [x] **Beacon.** Floor one: the mark, the art, a status line under it —
      "Now listening" while something plays, "Not currently listening" when
      not — then the recent row with a header over it. Reverses
      the 2026-08-28 caption decision; recorded in DECISIONS. The row is not
      the last three plays: it is up to three distinct recent albums from
      Last.fm, skipping the one on the beacon (`RECENT_ALBUMS` in
      `hooks/useListeningBeacon.js`), so the header should say that — "Before
      that", "Also lately", or Miyel's words. With the line saying "Not
      currently listening", the "LAST PLAYED" scrim on the greyed art says the
      same thing twice; keep or drop is her call. Floor two: the journal wall,
      inside the inner scroller. A copy without Last.fm keeps the wall as its
      first screen, one floor, no snap.
- [x] **Desk.** (floor one built; floor two waits for the feed) Floor one: Start a listen as a 180px square on the same line
      as the portrait and the album art (the desk is vertically centred today
      and never reads `--hn-square-top`; the hero is a full-width panel, not a
      square), with Inbox and Settings as the doors under it. Floor two: the
      feed. Not built — nothing reads another copy yet; `/compare` fetches
      `/api/public/entries` and the inbox is the shelf shape to copy. Until it
      exists the desk is one floor and measures not deep, so no down caret.
      The pitch (signed out) is one floor either way. **Open:** Miyel listed
      "share" among the desk's buttons; the Share door came off the desk on
      2026-09-06 and sharing is the printer glyph. If a door is wanted it is
      one line in `DOORS` pointing at `/printer`, and a DECISIONS amendment.
- [x] **Settings.** (left without Source, Miyel's call) Sign out stays at the foot. **Source under it is optional,
      not owed:** AGPL §13 is owed to visitors, and the only Source line on the
      cross is on the pitch pane, which a signed-in owner never sees. The
      licence is satisfied as it stands. My pick is to leave Settings without
      it — the pitch already carries the line for the people it is for, and
      she said off is fine — but it is one faint anchor if she wants it.
- [x] **The header and the small mark on floor two.** The fixed bar already
      turns into a flush line with the small mark and back-to-top once a pane
      is scrolled; with floors it flips at the floor boundary, so the crown and
      the small mark are never on screen together by construction. A proper
      roof in floor two — tools left, mark centre, lights right, the entry's
      header — comes after the snap is proven, and absorbs "A roof on the
      journal" below.

**How the entry does it, and why the cross could not.** The entry is a sheet
laid over everything, and inside the sheet exactly one thing scrolls up and
down: `.ln-screens`, one viewport tall, with two viewport-tall children and
`scroll-snap-type: y mandatory`, `scroll-snap-stop: always`. The reading lives
in a third element inside screen two with its own scroller, so the snapper has
only ever two stops — that is what keeps screen one still. Nothing under the
finger scrolls sideways natively, which is why the sideways swipe could be a
hand gesture. The cross is the opposite: three panes in a rail that scrolls
sideways natively, each pane a native vertical scroller. Two native scrollers
under one finger is the whole axis fight.

**The 2026-08-29 test did not test this.** Commit 81e84cb copied a two-screen
pane and was reverted in four minutes, and the write-down concluded the
structure has to wait for the axis problem. Three things about that run:
it used `y proximity` on the pane, not the entry's `mandatory`; it softened the
rail to `x proximity` at the same time (which is what "stopped landing on a
pane at all"); and the tree it ran in still carried `.hn-rail--held`, the
overflow-x lock that toggled at eight pixels of pane scroll — the rule the
next commit (0a119ee) found had "stopped the scroll dead". So "would not go
down or come back up" was three changes and a known-bad lock, never the entry's
shape alone. Today's `main` has none of the ruled-out things in it. The
structure has still never been tried clean.

**The recommended approach**, chosen from three drafted and scored
independently: the pane becomes the snap container. Rail untouched. No JavaScript
gesture handling at all. Inside `@media (max-width: 768px)` the pane gains
`scroll-snap-type: y mandatory`; each pane's content is wrapped in two floors
(`height: 100dvh; scroll-snap-align: start; scroll-snap-stop: always;
overflow: clip` — not `hidden`, which is still a scroll container); floor two
is a flex column holding one inner scroller (`flex: 1; min-height: 0;
overflow-y: auto; overscroll-behavior-y: auto` — auto, not contain, or the
pull back up to floor one never chains). Journal is handed the inner scroller
as its `scroller`. Why this one: it is the entry's vertical chain with the rail
around it instead of a non-scrolling sheet; it adds no listener in front of the
native sideways swipe (the property the rejected approaches all lost); and
snapping is applied by WebKit when a gesture ends, never during recognition, so
which scroller takes a diagonal thumb is unchanged from `main`. The other two:
turning the rail into a hand-driven page-turn (collides in letter with the
ruled-out hand-rolled drag and deletes `x mandatory`), and floor two as a fixed
sheet raised by JS (kills sideways on floor two against "the swipe itself is
untouched", and confines the filter sheet under the bar).

**The prototype, in order.** Names below are placeholders; Miyel names them
before they exist.
1. Twenty minutes, no React: one static HTML file in `public/`, served by the
   dev server on :3000 over the LAN to the real phone — Safari and the
   home-screen app, never the Claude browser. An `x mandatory` rail of three
   `y mandatory` panes, each two 100dvh floors, floor two with an inner
   scroller of two hundred lines; make one floor one 130dvh to see whether
   mandatory fights inside a tall snap area. Tests: up-swipe lands on floor
   two every time; a pull at the top of the reading snaps back; flick down,
   swipe sideways mid-snap, swipe back — is a pane parked between floors, does
   it self-correct; any rail jitter while a pane settles.
2. A branch, centre pane only, about forty lines: the CSS above in `nav.css`,
   the two wrappers in `HomeNav.js`, `scroller` handed the inner scroller.
   The fixed bar stays the header; no roof, no About, no fit pass.
   **Measure `main` first**, same phone, same session: twenty up-swipes from
   the top of the centre pane counting sticks, twenty sideways from the beacon,
   twenty from deep in the wall. Then the branch, same counts. Pass is no
   worse. Then the shape: a slow half-screen drag falls back; a flick commits
   with the wall's first row under the bar; a pull at the wall's top returns
   to floor one; a pull mid-wall scrolls the wall with no snap fight; the down
   caret and the bar's mark land exactly on a floor; `/?q=name` lands on floor
   two; open an entry from a tile, swipe to its neighbour, pull down to close,
   and the grow and the flyer still aim at the tile; the filter sheet locks the
   wall and its scrim does not move the floors.
3. Kill criteria: a pane left between floors that does not self-correct; more
   sticks than `main`; a drop that fails to commit either way. If killed, the
   DECISIONS line "a two-screen pane needs the axis problem solved first" gains
   its reason — the structure alone this time. If it passes, amend that line
   in the same commit, then: the fit pass on the card, About's floors, the
   roof, the desk's square, the beacon's status line and row header, and the
   `scroller` resolver for desktop (Journal walks to the nearest overflowing
   ancestor, as `MetadataLabel.js` already does, or `toPage` stops working
   above 768px). Each by thumb before the next, the way the layer was rebuilt
   on 2026-09-02/03.

**Small things that ride along.** `--hn-bar-h` is declared on `.hn-bar` and
never read (the wall restates the calc); lift it to `.hn` so floor two pads
with it, the entry's `--ln-band` pattern. `touch-action: none` on `.arc-scrim`
and `.ab-pin-scrim` so a drag on an open sheet cannot pan the floors behind it.
Do not reuse the `.ln-screens` / `.ln-screen-two` class names on a pane:
`LayerEntry.js` and `FullPostPage.js` find them with `querySelector` as
singletons and would hit the pane first. `deep` must stay measured, and About's
floor two exists only with something in it.

**What this leaves alone.** The second open problem — you can still slide
sideways out of floor two — is unchanged, on purpose: every lever that would
stop it is one of the four ruled-out things, and the carets already hide down
there. Whether that still wants solving once floor two has a roof is a
question for the phone.

- [ ] **You should not slide sideways out of a pane's lower half.** The carets
      already hide down there; the swipe does not. Untouched by the floors.

**PARKED** — decided, deliberately not being built yet

- [ ] **The pill with a light going round it.** Tried on Send an album on
      2026-09-07: a frosted pill inside a thin ring, one bright arc of the
      ring travelling round it, one lap every six seconds. Liked, and taken
      off the same hour because it felt out of place on the card. Parked for
      a button that wants to be noticed — the pitch's "Get one", perhaps.
      Nothing was committed, so the recipe is here rather than in git: on the
      button, `position: relative; isolation: isolate; overflow: hidden;
      border: 0; border-radius: 999px; background: transparent`. A `::before`
      at `z-index: -2`, centred, `width: 240%; aspect-ratio: 1`,
      `background-color: var(--border)` under `conic-gradient(from 0deg,
      transparent 0 74%, color-mix(in srgb, var(--ink) 90%, transparent) 91%,
      transparent 100%)`, animated `translate(-50%, -50%) rotate(0 → 360deg)`
      over 6s linear. A `::after` at `z-index: -1; inset: 1.5px;
      border-radius: inherit; background: var(--panel-strong)` with the card
      blur. Animation off under `prefers-reduced-motion`. A turning box, not
      an animated gradient angle, so it needs no `@property`.

- [ ] **Theme and the key's wording in Settings.** Both editors were built on
      2026-09-01 and taken off the page the same day. `settings.theme` exists
      and the layout honours it if set; `definitions` exists and nothing
      writes it. Put either back by restoring its Section in
      `app/settings/page.js` (git has the version).

- [x] **Tap-to-QR on album art.** Built 2026-09-12 on branch `cover-code`,
      all three fixes as listed: on tap, the dot cached on the row, pressed
      on the server. See Complete.

**STILL WANTED ON THE CROSS** — asked for 2026-08-29, not started

- [ ] **A roof on the journal.** Folded into the two-floor brief above: it is
      floor two's header — mark centred, one control each side, the mark
      doubling as back-to-top. The 2026-09-06 flush bar delivers the mark and
      the back-to-top; the printer on the right is not built, and
      `/dashboard/share` no longer exists to point it at — it points at
      `/printer`.
- [ ] **The bottom row as one nav bar on every screen.** The entry's back
      control should sit where the beacon's carets sit, with whichever
      direction is irrelevant turned off, so the row means the same thing
      wherever you are.

**THE HEADER** — briefed 2026-08-28, mostly built on branch `one-header`. See DECISIONS for the shape.

- [x] **One header everywhere** — recorded settled in DECISIONS (2026-08-28); ticked 2026-09-07. Mark centred, one control each side, the same
      arrangement the About card uses. Today the header changes shape between
      the panes and an entry, and every screen should read the same.
- [x] **The nav beacon goes** from every page but the beacon pane — recorded settled in DECISIONS; ticked 2026-09-07. It is a
      status bar for something the visitor has already been told, and it
      competes with the writing.

      Not for the polling, though — that is already fixed. `useListeningBeacon`
      runs one module-level timer for however many components subscribe, and
      `/api/public/beacon` caches the upstream answer for ten seconds. Five
      callers cost one request every fifteen seconds, not five. What the dev
      log actually shows is that each of those requests takes 1.4–1.9s of
      application time, which is a different problem and stays after this one
      is gone.
- [x] **Owner tools, top left, server-checked** — recorded settled in DECISIONS; ticked 2026-09-07. Pencil to the editor, printer
      to the export flow. Not hidden with CSS — the entry page currently asks
      the browser whether you are signed in and hides what it finds, which
      means the buttons are in the HTML either way. No `DotsThree`; if a fourth
      tool appears the pencil becomes a menu and nothing else moves.
- [x] **The Edit and Pin bubbles come out of the chip row.** Recorded settled in DECISIONS (admin controls do not sit in the reading flow); ticked 2026-09-07. Admin controls
      should not sit in the reading flow.
- [x] **The pin moves to the card** — recorded settled in DECISIONS (2026-08-28); ticked 2026-09-07. A search over the owner's own entries
      in a bottom sheet, and the entry editor loses its pin entirely. See
      DECISIONS for the trade this accepts.
- [x] **Copy link / QR at the foot of an entry**, for anyone — the other half
      of the split that puts the printer in the header. Landed on the cover
      rather than the foot, 2026-09-12: the tap is both. See Complete.

Per-track stamps need no column: they ride inside the `tracks` jsonb, which
already exists.
- [x] **What a delete actually does** — established and handled; the cleanup is in `delete_entry`. Left here for the record: `delete_entry` is a hard `DELETE FROM entries WHERE slug = …` — no soft delete, no undo beyond the nightly backup and Neon's six hours. And "permanent" understates it: `comments.entry_slug` is plain text with no foreign key, so an entry's comments stay in the table forever, orphaned and unreachable; `entries.source_entry_id` has an index but no key either, so deleting an album somebody else's entry was received from silently breaks that chain. Only `settings.pinned_entry_id` cleans itself up, because it is the one with `ON DELETE SET NULL`. Either the warning says all of this or the delete tidies up after itself first.
- [x] **Source link** — settled 2026-08-31, and the answer is that it does not
      want a settings column. `NEXT_PUBLIC_SOURCE_URL` and nothing else; see
      DECISIONS. The fallback was pointing at a repository that does not exist
      and now points at this one, and the deploy button asks for the variable
      so a fork can set it at install.
- [x] **Listen numbering** — built and confirmed 2026-09-14: `WITH_LISTEN_NUMBERS` in `database_actions.js` counts from `album_key` at read time, every listen has its own address (`in-rainbows`, then `in-rainbows-2`), and the chip says Listen 2 of 3. Was left ticked off here by nobody.
- [ ] **Relationship field removal** — every value has dissolved into something else. Legacy data stays; the picker goes.

**SCALING — BLOCKER. The archive loads every record on every page view**

Moved onto the blocker list 2026-08-31, and the reason is that it is not a
problem with this journal. It is a problem every copy inherits: the code pulls
the whole archive to draw a grid of covers, so a keeper's journal gets harder
to read the longer they keep it. Junior would hit it in year two, with no idea
why, exactly as his writing got good. A ceiling that arrives with success is
not a later item.

The target is a page view that costs the same whether the journal holds fifty
records or five thousand: roughly **160,000 views a month, flat, forever**.
The 2026-08-30 work got the cost down by 92% but left it proportional to the
archive, so it still degrades as the journal grows.

Measured 2026-08-30, 663 bytes per entry over the wire:

| entries | per page view | views/month on 5 GB |
|---------|---------------|---------------------|
| 39      | 26 kB         | ~207,000            |
| 250     | 166 kB        | ~32,000             |
| 500     | 332 kB        | ~16,000             |
| 1000    | 664 kB        | ~8,000              |

Paginated at 50 in the database it is ~33 kB and ~160,000 a month at *any*
size. That is the number to aim at.

- [ ] **Move the archive's paging into the query.** `components/main_components/Journal.js`
      fetches every entry and paginates in the browser — `PER_PAGE = 50`, but
      it downloads the lot first. The blocker is that everything else in that
      file runs client-side over the full set and would have to move with it:
      - search over album and artist (`foldForSearch`, accent-folded — the SQL
        needs the same folding or Beyonce stops finding Beyoncé)
      - the genre filter, the three flag filters, the year range
      - five sort modes, two of which (`rating`, `year`) parse text in JS
        (`parseRating`, `releaseYear`) rather than sorting a column —
        `rating_value` exists and is generated; release year does not and may
        want one
      - the genre list itself and its counts, and the year bounds, which are
        derived from the whole set and want their own small cached queries
      - the filtered **count**, which the page prints
- [ ] **Untangle who owns the entries.** `Journal` takes `entries` as an
      optional prop: at `/archive` it fetches its own, in the cross the
      homepage hands over what it already loaded. Server-side paging means the
      component owns its own fetching in both places, and the homepage keeps
      whatever it still needs separately.
- [ ] **The homepage strip wants about ten records, not all of them.**
      `HomeNav` reads `.album`, `.id` and `.slug` for the recent row and the
      counts. A count is `SELECT count(*)`, not a list.
- [ ] **`/dashboard` and `/dashboard/inbox` pull every entry for a decorative
      background** of shuffled covers. They want album art URLs and nothing
      else, and probably only twenty of them.

**How to measure any of this.** Do not guess from the query — the one that
nearly bankrupted the allowance was fast. Measure what the row weighs:

```sql
SELECT pg_size_pretty(sum(pg_column_size(entries.*))::bigint) FROM entries;
SELECT pg_column_size(settings.*) FROM settings;
```

and for the wire, `curl -s http://localhost:3000/api/entries | wc -c`.

**THE LOCK — what is left after the doorman**

- [ ] **Retire `/dashboard`.** It is no longer the login route — the pages
      behind it now send a signed-out visitor to `/login` — and the plan is to
      delete it outright once the owner's tools live where the work does.
      Deleting it means finding new homes for what it still holds.
- [ ] **The three-tap gesture only works where the mark does not navigate.** On
      the homepage the crown swallows its own click to re-centre the cross, so
      counting taps there is free. On every other page `SiteNav`'s mark is a
      real link home, and taking that away to count taps would break the one
      thing it is for — so the first tap goes home and the gesture works there.
      Acceptable, and worth revisiting if a better idea turns up. The visible
      fallback is the Sign in line on the pitch pane.
- [ ] **`/api/comments/receipts` has no doorman.** It is a read that verifies
      signed receipts, so a flood costs a query rather than a row, but it is
      the one public POST still uncounted.
- [ ] **Rate limiting is per instance on serverless.** Exact on a copy running
      as one process. If the canonical instance ever needs the strict version,
      the seam is `library/doorman.js` — swap the Map for a store and nothing
      that calls it changes.

- [x] **A copy with no Anthropic key half-works, and says it fully works.**
      Settled 2026-09-01 by the session overhaul. Research is a button and the
      button is absent on a keyless copy (`research_available`, worked out in
      the layout from the env and carried down with the bookplate); the route
      answers plainly if asked anyway. Formatting stopped reaching a model some
      time ago and the companion is gone, so a keyless copy completes a listen.
- [ ] **`keeper_name` has no editor.** `IdentificationCardEditor` writes
      `display_name` once one exists, and setup does not reopen. Belongs in the
      card editor, which is where things are edited.
- [ ] **Fresh-copy surfaces are still wrong once the hold lifts**, all found
      while designing the welcome screen and all separate from it: the beacon
      draws a grey ♪ and an em-dash forever with no `lastfm_user` (its own
      route's comment promises the client draws nothing); `Journal.js` has no
      `entries.length === 0` branch so an empty journal says "No entries match
      these filters"; `/api/public/stamps` returns `0` from its catch so a
      database outage prints "Albums logged 0"; and `IdentificationCardEditor`
      seeds `lastCodeUrl` from the current address rather than the one the
      stored code was built for, so changing the address never rebuilds the QR
      — now live, because setup can write an address.
- [ ] **`doorman.js` trusts the first `X-Forwarded-For` entry.** True of
      Vercel, backwards for nginx, ALB, Traefik and Cloudflare, which append.
      On a bare Node deploy the login bucket key is attacker-chosen and the
      5/minute limit never fires.

**SCHEMA — the last drop before additive-only**

Decided 2026-09-06, on branch `last-cleanup`: the draft window closes with
this. Everything below was already removed from the code, the settings lists
and `migrations/001_initial.sql` (so a fresh copy never builds any of it).
The live database still has all of it, because the code on `main` still
selects the settings columns and inserts into the entry ones — dropping them
before that deploy would break saving an entry on the live site.

- [x] **Run 2026-09-06, after the deploy** — backup `2026-09-06-1829` taken
      first, host checked, all ten statements applied, the site answered
      200 before and after. The schema is additive-only from here. What was
      run, for the record. Backup first
      (`npm run backup`; the 2026-09-06-1226 backup already holds every row
      of every one of these). Check the host is `ep-patient-morning` before
      running anything. What is lost, deliberately: 32 model-written
      background paragraphs, 28 old Tumblr post links, the free-text bio
      and `about_intro` (the same paragraph twice), "Your best masterpieces!" from
      `send_me`, the title "Listening Notes" from `journal_name`, and Neon's
      sample table of ten random numbers.

      ```sql
      ALTER TABLE entries  DROP COLUMN IF EXISTS background;
      ALTER TABLE entries  DROP COLUMN IF EXISTS post_link;
      ALTER TABLE settings DROP COLUMN IF EXISTS journal_name;
      ALTER TABLE settings DROP COLUMN IF EXISTS bio;
      ALTER TABLE settings DROP COLUMN IF EXISTS about_intro;
      ALTER TABLE settings DROP COLUMN IF EXISTS instagram_url;
      ALTER TABLE settings DROP COLUMN IF EXISTS send_me;
      DROP TABLE IF EXISTS conversations;
      DROP TABLE IF EXISTS echo_memory;
      DROP TABLE IF EXISTS playing_with_neon;
      ```

- [x] `settings.about_intro` — decided 2026-09-06: the same paragraph as
      `bio` under a second name, dropped with it. Added to the block above.
- [x] `entries.relationship`, `comments.author_email`,
      `submissions.submitter_email`, `entries.tags` — all already gone from
      the live database, confirmed 2026-09-06 against the catalogue. The two
      "run this" blocks that used to sit at the top of Pending were done.

**BACKUPS**
- [ ] **A stale-backup badge on the writing side.** Not urgent, and not
      optional either: **the failure mode is silent.** iCloud signed out, a
      full drive, a laptop shut for a fortnight, a `node` that moved after an
      nvm upgrade — every one of those leaves the backup quietly not happening
      while everything on screen looks exactly as it did. Nobody discovers it
      until the day they need a restore, which is the one day the answer has to
      already be yes. A line somewhere on the writing side reading *last backup
      3 days ago*, going amber past a week, turns believing you are covered
      into being covered. Read it from the newest directory name under
      `BACKUP_DIR`; no new state to keep.
- [ ] Nothing checks that iCloud actually *uploaded*. The local write succeeds
      either way, so the log always says success. Glance at the folder in
      Finder occasionally — a cloud icon beside a snapshot means it has not
      gone up yet.

**SECURITY**
- [ ] **Rotate `DATABASE_URL` and `SESSION_PASSWORD` into Vercel Secrets.**
  Vercel currently holds both as plain config values, which means anyone with
  dashboard access can read them.

  1. Neon → reset password
  2. Copy the new connection string
  3. Vercel → edit the variable, paste, **mark as Secret**
  4. Update local `.env.local` (from a terminal — VS Code will not save it)
  5. Redeploy
  6. Confirm entries still load

  **A daylight task.** A wrong edit takes the live site down: with a bad
  connection string the site cannot reach its database, and every page that
  reads entries fails at once. Rollback is Vercel → Deployments → last good
  deploy → Promote to Production, but that restores the old *code*, not the old
  variable — the variable has to be fixed by hand.

  Note on `SESSION_SECRET`: rotating it signs you out and you will have to log
  in again. **That is expected, not a bug** — it signs the login cookie, so a
  new secret retires every cookie issued under the old one. Worth knowing in
  advance, because it looks exactly like being locked out. `.env.example` and
  the README used to call this a thing never to do after launch; they now say
  what it actually costs, which is typing the password once.

- [x] Upvote abuse prevention — done 2026-08-30. One vote per comment per
      address per twelve hours, via library/doorman.js.

**BUGS**
- [ ] **Slug fix** — `create_slug` collapses spaces to hyphens and then calls `.trim()`, which only strips whitespace. A title that starts or ends with punctuation keeps a stray hyphen: `— Blue` becomes `-blue`. Numbering for repeat listens is handled separately in `database_actions.js` and is fine.
- [ ] `created_at` is a naive UTC column and the driver shifts it by the reader's local offset. Never compare it to `Date.now()`.

**DEV**
- [ ] Bare apex `listeningnotes.blog` still can't reach Vercel — Tumblr refused to point their domain externally, so registration is moving to Vercel. `www` works today.
- [ ] Instagram + Reddit auto-distribution (placeholder to-do list lives on `/dashboard/share`)

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
- [ ] `/archive` — visual pass (tile sizing, filter bar, hover states)
- [ ] `/compare` — visual pass (it is built and working, not a placeholder)
- [ ] Slug page (`/entries/[slug]`) — full redesign

**DASHBOARD**
- [ ] Spotify data panel (monthly listeners, artist ranking)
- [ ] Discogs genre tags via Claude API
- [ ] Inbox (`/dashboard/inbox`) — the Submissions tab is rebuilt as a shelf
      and done; the Comments tab is still the moderation list it always was.
      Two things left on the sent side, neither urgent: a sender who gave a
      journal URL can be filed in the address book from the row
      (2026-09-12), and Dismiss is one press with no undo, unlike every
      other destructive control on the site.
- [ ] Share (`/dashboard/share`) — wire Reddit + Instagram backends

**LIVE STATUS**

Live at `www.listeningnotes.blog` (Vercel, HTTPS). The writing side is protected
by a JWT "wristband" cookie (`library/wristband.js`). Environment variables are
listed in [`.env.example`](.env.example) and set in Vercel under
Project → Settings → Environment Variables.

**Rollback:** Vercel → Deployments → last good deploy → "Promote to Production" is instant.

---

## Gotchas

**Keyframe animations do not advance while the browser pane is not painting,
2026-09-20.** Half an hour went on a close animation that looked dead: the
element had the right class, `getAnimations()` reported the right names and
`playState: "running"` — and `currentTime` stayed at 0 however long the script
waited. The document was not being rendered, so its animation timeline was
frozen; each forced screenshot advanced it by about one frame. **Sample an
animation by interleaving screenshots, not by `setTimeout` alone**, and read
`currentTime` rather than trusting a height that is not moving. A CSS
transition looks like it is working in the same conditions, which is what
makes this confusing: a few forced frames are enough to see a 320ms rotation
move and not enough to see a 300ms height.

**Two goes at a vertical snap, and the phone was right both times,
2026-09-20.** `mandatory` on the cross's two-floor panes cost nothing while a
second floor was one screen tall with its own scroller in it — two stops,
nothing between them. The peek took the inner scroller out (a sliver of one is
a scroller you can reach before arriving at it), the pane's own scroll went
five screens deep, and mandatory spent all of it pulling back to the top of
the feed. `proximity` was the obvious remedy and caught on a real phone
exactly as it had in August. **There is no vertical snap on the cross now**,
and `scroll-margin-top` on the second floors stayed: it is what `goDown` reads
to know where the press should stop, so it is load-bearing with no snap left
to serve. Do not delete it as dead.

**A box with `overflow: auto` is a scroll container whether or not it
overflows, 2026-09-20.** The shelf of faces carried `overflow-y: auto` all the
time, on the reasoning that the rows always fit so there would be nothing to
scroll. True, and not the point: on a phone that box still takes the first
part of every drag that begins inside it before deciding it has nowhere to go,
and the faces fill most of the floor — so that was most of the drags anybody
makes on that pane. You pull down over somebody's face and the pane does not
move. **Give a box `auto` only while it has something to scroll**, and flip it
on a press rather than during a scroll.

**A mandatory snap over a floor taller than the screen is a scroll that
fights you, 2026-09-20.** The cross's two-floor panes snapped `mandatory` for
a week and it cost nothing, because a second floor was exactly one screen tall
with its own scroller inside it: two stops, nothing between them, and "must
rest on a stop" was always already true. Giving those floors a peek meant
taking the inner scroller out — a sliver of an inner scroller is one you can
scroll before you have arrived at it — and the moment the pane's own scroll
ran five screens deep, `mandatory` started pulling back toward the top of the
feed on every throw. Miyel, from a phone: "scrolling feed doesn't scroll
freely, it's sticky." **`proximity` snaps when you finish near a boundary and
leaves you alone everywhere else**, which is the only strictness that suits a
pane with one boundary and a long way past it.

**And a press has to do for itself what the snap used to do for it.** `goDown`
scrolled to the second floor's own top and let `mandatory` correct the last
80px, which is `scroll-margin-top` on that floor. Proximity does not correct,
so the number has to be right when it is asked for — read off the floor's
computed `scrollMarginTop`, not off `--hn-bar-h`, because a custom property
comes back as the `calc()` it was written as and `parseFloat` quietly takes
the first number in it.

**A sliver of a nested scroller is a scroller you can reach, 2026-09-19.**
The book's second floor was built the way the journal's is — a screen-tall
floor with its own scroller inside it — and it worked exactly as badly as that
sounds. The journal's floor is never visible until you arrive at it; this one
shows 150px of itself at rest, and a wheel over that sliver scrolled the feed
*inside its box* while the pane sat still on the faces, sliding records up
behind a heading that stayed put. **If any part of an inner scroller is
visible before you have arrived at it, it must not be an inner scroller.** The
floor is a snap area taller than the screen instead, which the snap spec
allows to rest anywhere once it covers the port: it catches you on the way in
and then gets out of the way.

**A flex child cannot measure the room it is in if the parent sizes to it,
2026-09-19.** The shelf asks how tall it is and divides by a row. It was
answering with the height of the faces already in it — perfectly stable,
completely wrong — because every box above it in the chain was `min-height`
and grew to its contents. The floor is `height` now, not `min-height`, which
is the one place on this site that is right: what would overflow is a
scroller, and the thing below it is a sliver that must not be pushed off the
screen. **A measured layout needs one box in the chain whose height does not
come from its contents.**

**An undefined custom property throws away the whole declaration,
2026-09-19.** `padding: 24px var(--page-gutter) 40px` with no `--page-gutter`
in scope is not "24px 0 40px" — it is invalid at computed-value time, and the
element gets no padding at all. The feed's wrapper had been running with zero
side padding on every phone since it was written, and nothing showed it,
because the only thing in it that touched the edges was a row of tabs centred
in the middle of the page. **Write the fallback: `var(--x, 24px)`.** The
failure is silent, it is total rather than partial, and it surfaces the day
somebody puts something at the edge.

**A callback with no dependencies holds the first render's world,
2026-09-19.** The cross's `measure` listed nothing and closed over the list of
panes, which was fine for as long as that list was fixed. It stopped being
fixed the moment the rail had a different shape for a keeper than for a
visitor — and the first render of a keeper's cross is always the visitor shape,
because the lock has not answered yet. So the callback was measuring a rail
that no longer existed, forever. **When a value that a memo or a callback
closes over starts depending on state, every one of them has to list it**, and
an `eslint-disable-next-line react-hooks/exhaustive-deps` is exactly where that
will not be noticed. Two in the same file had it; both were wrong the moment
the list moved.

**A stale stylesheet outlives the dev server, 2026-09-19.** The note already
below says a restart may be needed after editing a global sheet. It is worse
than that: a restart is sometimes *not enough*. Half an afternoon went on a
switch that would not change size — the file on disk said 38px, the browser
said 46px, and stopping and starting the dev server changed nothing, because
Turbopack handed back the same cached build. **The tell is the stylesheet's
filename hash: if the `<link>` still points at the same file after an edit,
nothing you are looking at came from the edit.** The only fix that worked was
`rm -rf .next` with the server *down*, then start it again. Doing it while the
server is up leaves it rebuilding into a directory that has just been pulled
out from under it.

**`display: contents` takes away the box a collapse needs, 2026-09-19.** It
makes an element generate no box at all, which is the point — its children
become items of the grid above it. It also means `max-height`, `overflow`,
`opacity` and every other thing written on that element quietly stop doing
anything. The card's collapse when the picker opens had been dead for a day
before anybody saw it, because what it left behind looked like a slot somebody
had added rather than one that had failed to close. **If a flattened element
was carrying a rule, the rule has to move to whatever kept a box.**

**`auto` is not a value anything can ease from, 2026-09-19.** Animating a
height from `auto` to `0` does not animate: it jumps in one frame. The fix on
the beacon's cover was to animate the *width* and leave the height to
`aspect-ratio`, which follows it down. The same trap with `display`: turning a
box on and collapsing it in the same frame gives you the collapsed box and no
movement, because `display` cannot be transitioned either.

**Measure by offsets when the target has an entrance of its own, 2026-09-19.**
`passing` aimed a flying cover at a tile that plays `hp-recent-arrive` —
`translateX(-14px) scale(0.85)` to nothing — so a `getBoundingClientRect()`
taken at that moment described a box the tile was passing *through*. The
record landed 10px left and 9px small and sat there while the tile crept out
from under it. `offsetLeft` and `offsetWidth` are layout and a transform is
not, so they answer where a thing is however it is being drawn. Related to the
scroll version of this already below, and a second reason to reach for offsets.

**A widened press must be on the thing that is pressed, 2026-09-19.** A 24px
tag was given an invisible `::after` reaching past its edges so a thumb could
find it — put on the wrapper round the control rather than on the control.
A real click eight pixels above the tag registered *zero* handlers: the box
belonged to a span with nothing bound to it. Measured, not guessed, and only
because the test used real pointer input; `element.click()` would have passed,
the same way it did for the dead × in the picker.

**`min-width: 0` down the whole chain, or a name does not fold, 2026-09-19.**
A flex item's default `min-width: auto` means "never narrower than my
contents", so a long keeper's name grew the calling card's row to 537px inside
a 375px phone and ran off the right edge — the ellipsis never reached the
screen. Every ancestor between the text and the box that has a width needs the
zero, not just the text. Miyel's name is short; the other copies each have
their own, which is how this kind of thing ships unseen.

**Every `closest()` in the repo, audited 2026-09-18.** After the one below bit,
all five were checked and the other four resolve correctly today:
`slot.closest('.lay')` (HomeNav) asks the *target* whether it is in a sheet,
which is a question about itself; `railRef.closest('.hn')` climbs from a
component's own ref to its own root; `mine.closest('.sitenav-row')` in
KeeperTools is deliberately optional and says so; `closest('section')` in
MetadataLabel was verified against a live entry — both sticky labels resolve.
The last two are the *same shape* as the bug and would fail the same silent
way, but both degrade to doing nothing rather than losing something you would
watch for.

**Moving a control breaks whatever was measuring from it, 2026-09-18.** The
beacon's shrink-into-the-bar stopped happening the moment the way-in moved out
from under the artist, because the flight found the cover by walking *up* from
the press — `event.currentTarget.closest('.beacon-card')`. Out of the beacon,
`closest` returns null, `box` is undefined, the guard returns, and the whole
animation goes without an error, a warning or a line in the console. Miyel
noticed it as "the animation seemed smoother before"; nothing else could have.

The lesson is the pattern, not the bug: a handler that finds something by
climbing its own ancestors is quietly coupled to where it is rendered, and
moving it is a refactor of both. Query the thing itself — scoped — and moving
the control is just moving the control. Worth grepping for `closest(` after any
change that moves a button.



**`.click()` does not prove a control works, 2026-09-18.** The picker's × was
dead on arrival — an invisible positioned box (`.ses-shut-slot`) sat exactly on
top of it and swallowed every press — and every test said it was fine, because
the tests called `element.click()`. A programmatic click is dispatched straight
at the element and skips hit-testing altogether, so it cannot see anything
sitting over the thing it is pressing. Neither can `dispatchEvent`. What finds
it: `document.elementFromPoint(x, y)` at the control's own centre, and driving
the real pointer at those coordinates rather than the node. Anything absolutely
positioned near a control wants `pointer-events: none` unless it is meant to be
pressed, and a child that wants presses can still claim them with
`pointer-events: auto`.



**Comments rot faster than code, 2026-09-18.** A day of reversals left four
files describing versions of themselves that no longer existed: a session
header narrating a × that had moved to another file, a `?` that was deleted and
a swipe that had come to mean the opposite; three stacked section headers in
HomeNav each explaining a different superseded version of one transition; a
comment block orphaned by a deleted constant, sitting above the next one;
`@keyframes laySettle` unused; and cross-references to `hnLeaveDown` and
`hnBlink`, neither of which existed any more. None of it broke anything, and
that is the point — nothing fails, so nothing tells you. Worth a sweep after a
day of changing the same few things: grep the comments for the names of things
you removed, and check that every "see X" still resolves.



**The automated browser pane does not deliver focus events, 2026-09-18.** A
blur-reset could not be verified there: moving focus with `.focus()` changes
`document.activeElement` but fires no `blur`/`focusout` at all, not even to a
native listener, because the pane does not hold document focus. Same family as
the two already known — it reports `visibilityState: 'hidden'` however it is
fronted, so the beacon never polls and `requestAnimationFrame` never fires.
Anything that depends on focus, page visibility or animation frames has to be
reasoned about or tried on a real device; measuring it in the pane produces a
confident wrong answer.



**`router.push` out of an open layer freezes the app — 2026-09-18.** Deleting
an entry ended in `router.push('/')`, which is right on a page of its own and
froze Miyel's phone over the journal; she had to reset it. The layer is a
parallel route (`app/@layer`) and it is open because the address says so. A
soft push to `/` matches nothing in that slot, and **a parallel-route slot with
nothing to match holds the last thing it drew** — so the sheet stayed up with a
deleted entry inside it, and the root kept the `ln-locked` class the layer adds
to stop the journal scrolling behind it. Locked with nothing left to unlock it:
the effect that removes the class runs on unmount, and it never unmounted.

**The rule: a layer closes with `back()`, never a push.** Anything that
navigates from inside one has to know whether it is in one. `FullPostPage`
already had `layered` as a prop; it goes into `useEntryEditor` now for exactly
this.

**A poll already in flight lands after the thing it contradicts —
2026-09-18.** The beacon "came back (beacon) but then went right back off"
after a save. Nothing was wrong with the needle — the log shows the save's
DELETE and the session's DELETE and no write after either. A poll *sent* before
the save takes three to seven hundred milliseconds and comes back carrying the
world as it was, straight over the top of what `announce` had just published.
In production it is worse: the answer may be served from the edge for ten
seconds after the needle is down.

**The rule: publishing locally is not enough — it has to hold.** `announce`
now outranks the server for twelve seconds and drops any answer that disagrees
with what the owner just did, releasing the moment the server agrees. Twelve is
a ceiling, not a duration: it is what stops a hold wedging if the server
genuinely disagrees, because the journal is open on another phone.

**A quiet save that fails is invisible twice over — 2026-09-18.** Every
`POST /api/drafts` 500'd for a whole real listen. The cause was
`drafts.rating` being an `integer` while the album score has been settable in
halves for far longer than anybody noticed — proved against the live database
rather than guessed at:

```
4   -> { rating: 4 }
4.5 -> THROWS: invalid input syntax for type integer: "4.5"
```

Whole stars saved fine, which is what hid it: the failure starts mid-listen, at
the moment a half is chosen. Nothing was lost — the browser keeps its own copy
and that is what the entry is built from — but for that listen the only copy of
an afternoon's writing was on one phone.

**Two rules out of it.** A route that is *allowed* to fail quietly on screen
has to be **loud in the log**, or there is nowhere left for it to be seen:
`/api/drafts` caught the error, turned it into a response, and printed nothing,
so the console was silent through sixty failures. And when widening a column
for a JavaScript client, **`real` beats `numeric`** — the driver hands a
numeric back as the *string* `"4.5"`, so every copy in the wild would need a
code change to read its own rows, which is a migration that breaks a journal
until its code catches up. A `real` comes back as a number and nothing else has
to move. Halves are exact in binary.

**A CSS grid cannot be transitioned — 2026-09-18.** Removing a tile reflows
the wall instantly and no stylesheet can animate that, so every tile after the
gap simply appears in its new place. The only way it looks like anything is to
measure: record where every tile is, take one out, let the grid reflow, put
them all back where they just were with a `transform`, then let the transform
go. One frame has to pass between setting and clearing it or the browser
coalesces both into a single paint and nothing moves. See `closeTheGap` in
`Journal.js`.

**`.focus()` from the console fires no focus events in the Claude browser
pane — 2026-09-18.** The pane's document is not the focused document, so
calling `focus()` sets `document.activeElement` and dispatches nothing: not
`focus`, not `focusin`, not even to a listener added a line earlier. A whole
round of "the focus handler is broken" came out of that, and the handler was
fine.

**To test one:** set the focus, then dispatch the event yourself.

```js
el.focus();
document.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
```

`document.activeElement` itself is reliable in the pane, which is why a guard
that *reads* the focus at the moment it needs it — the layer's pull-to-close —
can be checked here and one that *listens* for it cannot.


**Nothing in this project catches a reference to a name that is not there —
2026-09-18.** Not the build, and not the lint. Deleting a function and leaving
its name in the object a hook returns passed `npm run build` clean and passed
`npx eslint` clean, and turned up as a red overlay on Miyel's phone the moment
the session opened: `Can't find variable: doResearch`.

Proved rather than assumed — a file containing nothing but
`const x = thisNameDoesNotExistAnywhere` lints without a word. `no-undef` is
off in the Next config, which is the ordinary setting for it because the
config assumes TypeScript is doing that job. This project is plain JavaScript,
so nobody is.

**So after removing anything, grep for its name before saying it is done.**
The build only proves the imports resolve; a bare identifier inside a
component or a returned object is never checked by anything until it runs.

**It bit twice in twenty minutes.** The first was `doResearch` in the hook's
return, which broke the session outright and was obvious. The second was
`setChatMessages([])` and `setChatInput('')` left inside `beginListen`, which
was worse: `beginListen` threw *after* clearing the old record and *before*
setting the new one, so a listen opened with no cover, no tracklist — "No
tracklist found for this record" — and an empty note where a draft's writing
should have been. Miyel reasonably read that as her draft having been wiped.
It had not been: every character was in the row the whole time, and the sweep
below is what found it.

```bash
for n in <every name you removed>; do grep -rn "\b$n\b" app components hooks library; done
```

A removal is not finished until that prints nothing.


**Picking a record on localhost broadcasts on the live journal — 2026-09-18.**
Localhost writes to the production database, and a listen is not a local
thing: two seconds after the session opens, `useListeningSession` POSTs
`/api/needle`, and that row *is* the public beacon. Testing the flight this
way put a record Miyel never listened to on the live site.

**Lifting the needle is not enough to undo it.** `DELETE /api/needle` sets
`ended_at`; it does not remove the row, and `pull_recent_listens` counts an
ended needle from the last `LIFTS_AFTER_MINUTES` as a real listen. So the
beacon goes from "Now logging" to "Last logged" and still names the wrong
record. What puts it back is deleting the row — it is a single upserted
`id = 1` (`INSERT … ON CONFLICT (id) DO UPDATE`), so the next listen recreates
it and nothing else is touched.

**How to test a pick without broadcasting:** swallow the one request, in the
page, before you start — the flight and the navigation are both client-side,
so a patched `fetch` survives into the session:

```js
const real = window.fetch;
window.fetch = function (u, o) {
  const url = String(typeof u === 'string' ? u : u?.url || '');
  if (url.includes('/api/needle') && (o?.method || 'GET') !== 'GET') {
    return Promise.resolve(new Response('{}', { status: 200 }));
  }
  return real.apply(this, arguments);
};
```

Everything else behaves exactly as it does for real.

**A page load defeats it, and that is how it got through twice on
2026-09-18.** The patch lives in the page; reloading throws it away and the
session writes its needle two seconds later, before anything can be
reinstalled. Both times it put a record Miyel had not listened to on the live
beacon, and the second time it also wrote a test sentence into one of her
drafts — the draft autosave matched an existing row by `lookup_key`, so
picking a record she already had a draft for edited *that* draft rather than
making a new one.

**So: snapshot before, restore after.** `SELECT * FROM needle` and
`SELECT id, album, step, notes FROM drafts` before touching a listen, and the
same afterwards. The needle is a single upserted `id = 1`, so restoring it is
an UPDATE with the values that were there; a draft has no history at all, and
whatever a test writes over is gone.

**The safest version is not to run the save flow here.** Everything up to the
point a needle is written can be checked freely; the listen itself is Miyel's
to test on her phone, against her own journal.

**And never open `/session` directly.** A cold load has no block in it and
writes a needle two seconds later — that is the third time it got through on
2026-09-18, and the one that cannot be defended against from inside the page.
Reach a listen the way a person does: load `/`, install the block, then press
through. If the beacon has to be put back afterwards, deleting the row is the
restore when what was there had already ended, and an UPDATE with the old
values when it had not.


**The Claude browser pane reports `visibilityState: 'hidden'`, so the beacon
never loads in it — 2026-09-17.** Since the quieter-beacon work,
`hooks/useListeningBeacon.js` skips its poll on a hidden tab. The preview pane
is always hidden by that measure (`document.hidden === true`,
`hasFocus() === false`), so every beacon there sits on "Nothing logged yet."
for ever, whatever the database says. It is not a bug and it is not the
stale-stylesheet trap: `/api/public/beacon` answers correctly the whole time.

**To see the beacon in the pane**, lie to the page and knock:

```js
Object.defineProperty(document, 'visibilityState', { get: () => 'visible', configurable: true });
Object.defineProperty(document, 'hidden', { get: () => false, configurable: true });
document.dispatchEvent(new Event('visibilitychange'));
```

`wake()` polls immediately on that event and the beacon fills in. Real phones
and real Safari are unaffected — a tab somebody is looking at is visible.


**Claude cannot run the session, so nothing about it ships unverified again,
2026-09-16.** `/session` is behind the password and there is no way in from
this side — the reading half of the beacon could be proved by calling the route
directly, but anything that needs a listen open cannot be. Arrow keys through a
listen were written on reasoning alone, looked right, and were dead on Miyel's
first try; they came straight back out. **Anything that only happens inside a
listen is hers to test before it is called done** — say so when handing it over
rather than describing it as built.

**A `.next` can rot, and it looks like your routes vanished, 2026-09-16.**
After a few rounds of `npm run build` and `next dev` alternating in one
session, every route but `/` started answering 404 — `/archive` and
`/api/entries` included, neither of which had been touched. No error in the
log, nothing missing from git, the files all on disk. `rm -rf .next` and a
restart fixed it whole. **Before believing you deleted something, check `git
status` and `ls` the folder**; and when a 404 appears on a route nobody edited,
suspect the cache rather than the code.

**Locking one scroller is not locking the page, 2026-09-15.** An overlay's
scrim is fixed, so a touch on it cannot scroll the scrim — the scroll goes to
the nearest scrollable ancestor instead, and inside the cross there are three
stacked: the wall's floor, the pane, the rail. The filter sheet locked the
innermost and the other two carried on underneath it. **And the page itself is
invisible to the obvious test:** the root scrolls at `overflow: visible`, so
asking it the same question every other element is asked answers no, which is
why `/archive` locked nothing at all on the first attempt. `useHoldStill` asks
the root by whether it has anywhere to go instead.

**`touch-action: none` on a scrim is not a lock.** It was on `.arc-scrim`, with
a comment saying it stopped the floors panning, and the page went on moving
anyway. Keep it — it stops a pan being started — but the thing that actually
holds is `overflow: hidden` on whatever scrolls.

**Measure a lock with a real wheel, not with JavaScript.** `el.scrollTop = 0`
moves an `overflow: hidden` element quite happily, so a scripted check says the
lock failed when it is working. Only a real gesture answers the question.

**Two things claiming the bottom of the screen, 2026-09-15.** The band at the
foot of the cross is absolute on `.hn`; the wall's search-and-filter bar is
sticky at `bottom: 0` inside the pane. They landed on the same 54 pixels, and
because the bar is `z-index: 101` against the band's `96` it did not overlap
the band so much as cover it — from the journal there was no way to the card or
the desk at all. The band already published `--hn-foot-h` for exactly this
("every scroller inside has to end above the band"); nothing was reading it.
**When something is added at the foot of the cross, grep for `bottom: 0`
before believing it is alone down there.**

**A dev server can stop recompiling and go on answering, 2026-09-15.** The one
on :3000 served a version of `library/needle.js` from half an hour earlier, for
every request, with no error in the log and no warning anywhere — so a fix that
was already correct looked broken three times running. The tell was a field the
new code adds being absent from the JSON. If a change is not showing up, check
for something only the new version can emit *before* touching the logic, and
restart the server.


**A rule inside a media query is not heavier for being in one, 2026-09-15.**
`@media (min-width: 769px) { .idc-photo { width: 88px } }` never once applied:
`.ab-card .idc-photo` at the top of the same file is one class heavier, and a
media query adds nothing to specificity. So the spine's photograph was supposed
to step down to 88px and has been showing the card's own size since the day the
spine was drawn — no error, no warning, a deliberate design decision that
silently did nothing for a week. This is the source-order trap's cousin and it
reads even more like it should work, because the narrower rule *feels* more
specific. Two habits: when a media query is meant to override a base rule,
match or beat the base's selector (`.ab-card .idc-photo`, not `.idc-photo`);
and when a responsive rule seems not to be doing anything, measure the element
before assuming the sheet is stale.

**A CSS animation only restarts when its NAME changes, 2026-09-15.** The ···
opens by filing its tools out and shuts by filing them back in, and the
closing half was first written as the same keyframes with
`animation-direction: reverse` and a shorter duration. It did not play. An
animation that has already finished is still the same animation; changing its
direction, duration or delay updates it in place, and its elapsed time is
already past the new duration, so it jumps straight to the end — the tools
vanished instead of retracting. Nothing errors and the computed styles all
read correctly, which is what makes it hard to see. A second `@keyframes`
block under its own name (`kt-file-in`) is a fresh animation and plays.
Measured to confirm: 36px → 9px over four frames, into the door, nearest
first.

**Never replace a region of a file by two `index()` markers without bounding
it, 2026-09-15.** Rewriting the card's styles, the start marker matched near
the top of idcard.css and the end marker — `.idc-portrait {` — matched a base
rule six hundred lines below it. The replacement ate 626 lines: the mark, the
header, the name, the pin, the editor fields, the prompts, most of the sheet.
Nothing errored. The braces still balanced, the file still parsed, eslint was
clean, and the page simply rendered with half its stylesheet missing, which
looked exactly like the stale-bundle gotcha and cost a dev-server restart
before the real cause turned up in `git diff --stat`: *103 insertions, 635
deletions*. Two habits from it. Assert the region's size before replacing it
(`assert j - i < 3000`), and read `git diff --stat` after any scripted edit —
a line count is the cheapest possible check that a change is the size it was
meant to be.

**A smooth `scrollTo` in the browser pane outlives the `await` after it, and
scripted `scrollLeft` fires no scroll event at all, 2026-09-15.** Half an hour
went on a phantom bug: the rail was read at 375 after pressing the caret that
scrolls it to 0, `data-pane` did not follow, and it looked as if the cross had
stopped tracking which pane it was on. It had not — the read simply landed
mid-animation, and a second read a moment later had it right. The other half
is real and worth knowing: setting `scrollLeft` from `javascript_tool` moved
the rail but fired no `scroll` event, even to a listener added in the same
script, so anything that reacts to scrolling looks dead. Drive the real
control and read twice, or read the scroll position rather than the state it
is supposed to produce.

**A rule that has to beat a later one has to come after it, 2026-09-15.** Twice
in one evening, in two different ways. The first is below. The second was the
card's page rules — a new block near the top of idcard.css setting `.ab-card`'s
padding and `.idc`'s and `.ab-below`'s measures, each of which was already set
further down the same file at the same specificity. Everything read correctly
and the page kept its old insets, which looked like the new rules had not been
written at all. When a value already has a home in the file, change it there:
a second statement of the same property somewhere else is a coin toss decided
by line number, and the loser is invisible. The third time was across files:
nav.css's desktop block tried to hide the card's mark and lost to idcard.css's
base rule, because layout.js loads idcard after nav and a media query buys no
specificity. A rule about the card belongs in the card's sheet.

The
correction bar, its trouble line and the print bar were told to inset
themselves to the journal's column on a desk — in the layer block near the top
of entry.css, where the rest of that work lives. Each of those three also sets
`left` and `right` in its own base rule several hundred lines further down, at
the same specificity, so source order handed it to the base every time and the
rule did nothing at all from 2026-09-13 until it was found today. It read
correctly, it was in the right neighbourhood, and it had never once applied.
Two things: a desktop override of a component belongs after that component's
own rules, not with the layout work it belongs to conceptually; and when NOTES
says a thing was "not seen by eye", that is the list to work through — this
was on it.

**`container-type: inline-size` makes the element a containing block for
every `position: fixed` and `absolute` descendant, 2026-09-15.** It was the
obvious tool for the owner's pages opening on the spine — they were written
for a phone and their tight rules are viewport queries, which never fire in a
wide window — and it would have quietly re-parented the entry's print bar,
the correction bar and anything else pinned to the window from inside a
sheet. A plain `.lay--over-spine` descendant rule does the same job with no
side effect, because that sheet is never wide: it is 300 to 520px by the
clamp. Reach for a container query when the width is genuinely unknown, not
when it is merely not the viewport's.

**A control left in the markup with nothing switching it off is still there,
2026-09-15.** The spine's turn line is a `<button>` drawn only above 769px.
With the desktop rule giving it `display: flex` and no base rule, a phone
rendered it as an ordinary inline-block at the end of the page — invisible
under `overflow: hidden`, and still in the tab order and still read out. The
two other desk-only things beside it (`.hn-grip`, `.hn-band-ground`) were
already stated off at the base; that is the pattern, and "you cannot see it"
is not the same as "it is not there".

**To see the owner's half without signing in, answer `/api/auth/check` in the
browser and change a hook, 2026-09-15.** The cross decides between the desk
and the colophon on that one request, so patching `window.fetch` to answer it
`{authed:true}` draws the whole owner-side layout with no cookie, no secret
and nothing written — but the patch is lost on a reload, and the check only
runs on mount. Next's Fast Refresh preserves state through an edit unless the
*hooks change*, so adding or removing one throwaway `useState` in HomeNav is
what actually remounts it inside the patched fetch. A whitespace touch does
nothing. Everything behind the wristband still 401s, so this shows layout and
never data.

**There are two album folds and they disagree on accents, 2026-09-15.**
`lookup_key` (now in `library/entry_formatter.js`) keys `drafts` and
`briefings`; `foldKey`/`albumKey` in `hooks/useListeningBeacon.js` keys
everything that compares two journals. The second strips diacritics and the
first does not, so *Beyoncé* folds to `beyonc` under one and `beyonce` under
the other. Reaching for the wrong one to find a draft does not throw — it
finds nothing, the session starts empty, and the first autosave upserts over
the saved notes on that same key. Match a draft with `lookup_key`, and
compare against the row's stored `lookup_key` column rather than
recomputing it, so a row written by an older fold still matches itself.

**`base.css` goes stale on the dev server, and it will cost somebody a bug
report, 2026-09-15.** Rules added to base.css do not reach the served
stylesheet. The other seven sheets recompile on their own the whole time;
this is base.css only, and it bit three times in one day. The third time it
reached Miyel: the address-book strip rendered as full-width stacked
portraits with 24px names, she reported the picker as illegible, and the
CSS was correct on disk the entire time.

- **The fix is a no-op write, not a restart.** `printf '\n/* touch */\n' >>
  app/styles/base.css`, and the rule is served a second later; delete the
  comment again and it stays. An older note said only stop → `rm -rf .next`
  → start recovers it. It does not need that, which matters when somebody
  else's dev server owns the folder.
- **How to tell staleness from your own bad CSS.** Never trust the page.
  Fetch the sheet it links and grep it:
  `curl -s localhost:3000/archive | grep -o '/_next/static/[^"]*\.css'`,
  then curl that. On disk plus absent from the sheet is staleness every
  time.
- **Better: do not put a new rule in base.css while iterating.** Only what
  genuinely belongs to every surface goes there. A variant used by one
  surface — MiniAddressBook's `--tight`, which only the inbox asks for —
  goes in that surface's sheet, which is the rule anyway (DECISIONS,
  Structure) and sidesteps this entirely.
- **Suspected trigger: running `npm run build` while the dev server is up.**
  Both share `.next`, and base.css is the first sheet imported in
  layout.js. Unproven, but every occurrence followed a build.
- **It is not base.css only — entry.css does it too, 2026-09-15.** New
  `.ln-sent-*` rules were on disk and absent from the served sheet, so the
  markup rendered against nothing and half an hour went on chasing a layout
  bug that did not exist. The build-while-running trigger above is now
  three for three: every occurrence today followed an `npm run build`
  against a live dev server. **So do not build while the preview is up** —
  stop it, build, then start it again — and when a rule you just wrote
  seems not to apply, check the sheet before you believe the page.
- **How to check from the page itself**, which is quicker than curl:
  ```js
  [...document.styleSheets].some(s => { try { return [...s.cssRules]
    .some(r => (r.cssText||'').includes('your-class')); } catch { return false; } })
  ```
  False while the class is on the element and on disk is staleness.
- **It is not stylesheets only — a route handler's HEADERS go stale the same
  way, 2026-09-16.** `/api/public/beacon` was rewritten whole and the dev
  server went on serving the *right body with no `Cache-Control` on it* —
  which is the worst shape this can take, because the thing you are testing
  looks like it is working. It followed the same trigger: `npm run build` had
  been run, `.next` held a production build, and `next dev` was started over
  it. **The fix that works when stopping and restarting is not enough is
  `rm -rf .next`**, and it is cheap. Suspect it whenever a whole file has been
  replaced rather than edited. Check with
  `curl -s -D - -o /dev/null localhost:3000/api/... | grep -i cache-control`.

**`display: contents` makes `> *` miss everything, 2026-09-15.** The entry's
first screen is a flex column, but its rows are wrapped in `.ln-print-stack`
and `.ln-print-card`, which are `display: contents` until something is being
printed. So the rows really are the flex items — and
`.ln-screen-one > * { flex-shrink: 0 }` matches only the wrapper and changes
nothing at all, silently. Name the rows, or check what the children actually
are before reaching for a child selector on that section.

**Flex only shrinks a child when the box has a height to stay inside,
2026-09-15.** Spent a pass on the opposite: to stop the first screen growing
past the viewport with the trail open, `height: auto` looked like the way to
let it adapt — and it removed the only constraint making the art give up
room, so the art stayed full size and the band went 76px below the fold. The
fixed `height: 100dvh` is what does the shrinking. Leave it alone and let
`flex-shrink` on the art do the work.

**A `MediaRecorder` MP4 is fragmented, and Apple reads it as a 0.05-second
video, 2026-09-12.** Chromium's recorder says `video/mp4;codecs=avc1` and
the file plays in a browser, but it is `moof`/`mdat` fragments, and
`mdimport -t -d2` (the parser Photos uses) reports the first fragment's
duration only. For the export, encode with WebCodecs and mux a plain
`moov`-first MP4; that one reads as 4 s and `avconvert` round-trips it.

**The Claude app's browser pane refuses the camera, always, 2026-09-12.**
`getUserMedia` answers NotAllowedError with the permission already `denied`
and nothing to click; the site is a secure context and the camera is there.
So Scan a code cannot be tried in that pane, the way a deploy cannot: test
it in Safari on the Mac (localhost counts as secure) or on the phone on the
live site. The scanner now says which of the three failures it hit.

**A migrator session that dies holding the lock hangs every start after
it, 2026-09-12 and again 2026-09-13.** First the dev server, restarted while
the Mac changed networks; then Vercel's own build container after the 1.4.0
deploy. Each migrator took `pg_advisory_lock` and its connection died under
it; Neon kept the session idle, still holding the lock, for ten minutes or
more, and every start in that window queued behind it — the dev server said
Ready and never answered, a local build sat in `prepare_database.mjs` for
seven minutes, and a production cold start would have done the same. Fixed
the second night: the migrator's session sets `idle_session_timeout` to two
minutes, so Postgres ends a ghost itself, and `lock_timeout` to three, so a
waiter gives up — safely when nothing is pending, loudly when something is.
To see it: `SELECT pid, granted, state FROM pg_locks JOIN pg_stat_activity
USING (pid) WHERE locktype = 'advisory'` — an `idle` holder whose last query
was the lock is a dead one. A server that says Ready and never compiles is
this, not Turbopack.

**jsQR alone refuses light-page photo codes that every real reader accepts.**
Measured 2026-09-10 on June's portrait, in his page: `BarcodeDetector` passed
seven bands and the final check; jsQR passed none of thirty-five on the light
page and every one on the dark. The textured finder patterns are what it
cannot find — painted solid, jsQR read the light page at once, and lost the
dark one, since one solid colour cannot serve both themes. Safari has no
`BarcodeDetector`, so on an iPhone the verifier is jsQR alone and the photo
code is refused every time. ZXing and zbar were worse than jsQR; blur and
smoothing before decoding changed nothing. OpenCV's classic decoder sits
between jsQR and a phone: it reads this style, but it does not try the
inverted image, so a dark page fails unless the picture is inverted before
asking — which is what the press does. The readers, most to least
tolerant: Apple's, OpenCV both ways, jsQR, ZXing, zbar.

**A real copy's first commit never matches an upstream commit exactly.**
The keeper pasted the workflow file in by hand, or touched a line, so a
matcher that wants an identical tree finds nothing and the update stops.
The local rehearsal passed because it skipped the paste. Match the nearest
commit — fewest differing files — and let the difference be the keeper's
own change; the first run on GitHub was the one that caught it.

**A row that scrolls sideways forces its ancestors open, 2026-09-14.**
`overflow-x: auto` stops the row itself from growing, but the row still
reports its content's width upward, so any wrapper with no width of its
own — a flex item with the default `min-width: auto`, a shrink-to-fit
column — is opened to the faces' full width and the row lands centred
with its first faces off the left edge and no way to scroll to them.
`contain: inline-size` on the row is the fix (`.ln-sender-book`): the row
asks nothing of its content, so `width: 100%` means the parent's width.
Seen with the Sent by faces stood into a plain `div`; the real markup was
one wrapper away from it.

**Next's loader wraps a package that exports a promise of itself into a
module namespace whose `then` is not a promise's.** `@techstark/opencv-js`
did exactly that, and `await import(...)` inside a route handler died with
"Promise.prototype.then called on incompatible receiver [object Module]"
after passing every test in plain Node. Require such a package at run time
through `createRequire` from the project root, and name its file in
`outputFileTracingIncludes` so the deployed function still has it. (OpenCV
was the judge for one afternoon and is gone; the lesson stays.) And a press
that faults must write nothing: the first one through the site cleared a
good code on its way down.

**`react-hooks/set-state-in-effect` traces into the functions an effect
calls.** A fetch-on-mount that sets `loading` synchronously fails it even
when the setState is a call away. Read browser-only values through
`useSyncExternalStore` (the wall's `?q=`, the card's Compare offer), and
start a landing-time fetch from a `setTimeout` callback rather than the
effect body (`/compare?with=`).

**The link-preview renderer cannot read the site's CSS or fonts, and has no
star glyph.** `ImageResponse` needs font files: the two faces are fetched
from Google Fonts on the server with an old browser's User-Agent, which
returns a `.woff` the renderer accepts (asking for `.ttf` alone finds
nothing and the image fails with "No fonts are loaded"). Neither typeface
carries ★, and a glyph the font lacks renders as a box — stars are SVG
shapes. See `app/entries/[slug]/opengraph-image.js`.

**A flex basis against a `min-height` resolves to the content.** `flex: 1`
is `flex: 1 1 0%`, and a percentage basis in a column whose height is only a
minimum is indefinite, so the item takes its content's height instead of
the leftover. The wall's scroller in floor two grew to the whole wall that
way and stopped scrolling, taking its sticky bar off the screen. Give the
scroller a stated height (`100dvh`) when its parent's height is a minimum.

**A hidden browser tab fires no scroll events and runs no smooth scroll.**
While the Claude browser pane is hidden (`document.hidden` is true), a
programmatic `scrollTo` moves the element but the `scroll` event never
dispatches, so anything React derives from scrolling — the flush bar, the
carets, `down[pane]` — reads as unchanged, and `behavior: 'smooth'` never
starts. Two rounds were spent on 2026-09-07 reading a working cross as
broken. Dispatch `new Event('scroll')` by hand after a programmatic scroll
when checking state this way, and use `behavior: 'auto'`; or verify with the
pane showing.

**`ADD COLUMN … DEFAULT now()` dates every existing row today.** Postgres
fills the new column with the default as the ALTER runs, so an UPDATE that
then fills "where the column is null" finds nothing and every old row keeps
the migration's own time. Add the column empty, fill it, then set the
default. Caught on `posted_at` by counting rows that agreed with the old
column — zero of 39 — before it shipped; the count is the check, not the
migration log saying "applied".

**A grep for callers in other files calls a function dead when its only
caller is in its own file.** `foldGenre` came up with no external caller and
was deleted; it is called thirty lines further down the same file. Count
mentions inside the file too, and treat "definition + one more" as a call
before treating it as dead.

**`git add` on a path already staged as deleted fails the whole `add`, and
the commit that follows sweeps up whatever *was* staged.** After `git rm`,
the deletions are already in the index; naming them again in a later `git add`
alongside modified files aborts that add, and the commit then contains the
earlier deletions under the wrong message. Either commit straight after the
`git rm`, or leave the removed paths out of the later `add`.

**Two databases with the same entries and different settings rows.** From
about 2026-08-30 to 2026-09-03, `.env.local` pointed at a stray copy of the
database (`ep-old-sea-am0rc38b`) rather than the one Vercel reads
(`ep-patient-morning-amam2qx0`). Both held the same 39 entries, so nothing
looked wrong: an essay written through localhost went into the copy, and
every nightly backup in that window backed up the copy. The live journal had
only Neon's six hours for those days. Before any write from localhost, and
before saying anything about backups, print the host:
`node --env-file=.env.local -e "console.log(new URL(process.env.DATABASE_URL).host)"`.
Also: VS Code did not save the first edit to `.env.local`; check the mtime.

**GitHub's Contributors sidebar counts co-author trailers; its contributors
API does not.** Checking the API and concluding a co-author is not listed is
wrong. Look at the repository page itself. And after a history rewrite the
sidebar is a cache that lags for days: on 2026-09-06, three days after the
force push, the API and the Insights graph were clean and the sidebar still
showed the old name. Nothing in the repository fixes that; it is GitHub's
cache, and the only lever short of waiting is a support ticket.

- **The dev server on :3000 does not pick up globals.css edits.** Already
  written down; bitten again on 2026-09-02 twice. Check
  `document.styleSheets` for the new selector before concluding a rule is
  wrong, and prove stylesheet changes in `npm run build` instead.
- **A `<Link>` inside something the root layout renders is dead.** Root
  layouts do not re-render on client navigation, so `ComingSoon`'s link to
  `/setup` changed the URL and left the hold on screen. Anything the layout
  draws *instead of* the page has to navigate with a plain `<a>`.
- **`@next/env` is CommonJS.** `import { loadEnvConfig } from '@next/env'`
  fails in an `.mjs` script; import the default and destructure it.
- **`next dev` refuses a second server in the same folder** (Next 16). A
  second session cannot start its own preview; it has to use the one on :3000,
  which serves the same working tree anyway.
- **`RETURNING *` on the settings row returned the portrait bytes** to the
  browser on every card save. `save_settings` now returns the same column
  list a read uses. Anything that writes to a row with a blob in it should
  never return the whole row.
- **Password managers ignore hidden and read-only username fields.** The
  hidden 1px `readOnly` username input never got Safari to offer a save. The
  field has to be visible and writable; see PasswordGate's `.pg-who`.
- **A close inside a page turn froze the site** (2026-09-03, intermittent
  on the phone). The turn changes the address on a 240ms timer; a close in
  that window went back to the wall, then the timer replaced the wall's
  history entry with the next record, after which back had nowhere to go
  and the faded-out sheet sat invisibly over everything, swallowing every
  touch. Now a close cancels a pending turn, and a layer still mounted half
  a second after its close forces `router.replace('/')`. Anything faded to
  nothing that can intercept touches needs a way out that does not depend
  on history.
- **`beforeinstallprompt` is not a promise.** Chrome fires it only when it
  has decided the site is installable, and its own automatic prompt still
  wants a service worker with a fetch handler, which this site does not
  ship. `AddToHomeScreen` shows the real button only if the event arrived and
  the menu steps otherwise; do not "fix" a missing button by adding an empty
  service worker.
- **A subquery in `SETTINGS_SELECT` needs the table to exist.** Migrations
  run before the first request, so this is safe in practice — but on a
  database where 003 has not run, `pull_settings` throws, catches, and the
  whole site reads as blank. If a copy ever looks unconfigured after a deploy,
  check `schema_migrations` first.

**A fixed sheet inside the layer is not fixed to the screen.** `.lay` is a
containing block for its fixed descendants (see the note on `.sitenav-row`),
so a second `position: fixed; inset: 0` sheet rendered inside the session's
layer measures against the outer sheet — on a phone that put the preview's
entry a scroll's worth too low. Anything that needs the real viewport from
inside a layer goes through `createPortal(…, document.body)`.

**Focus events do not fire in the Browser pane.** Its document is never the
focused one (`document.hasFocus()` is false), so `el.focus()` sets
activeElement without dispatching `focusin`/`focusout`, and anything keyed on
them looks broken. Dispatch `new FocusEvent('focusin', { bubbles: true })` to
exercise the handler, and test the real thing on a device.

**`react-hooks/set-state-in-effect` is an error here, not a warning.** Any
`setState` called synchronously in an effect body fails lint. The shapes that
pass, all in use in the codebase: a browser-only value (the URL, localStorage,
a media query) read through `useSyncExternalStore` with a server snapshot, so
it needs no effect at all; a value derived from other state rather than seeded
into its own (`typed ?? fallback`, with null meaning untouched); state set from
the event that caused the change; a DOM write in a `useLayoutEffect` instead of
a measurement stored in state; and, where "a frame later" is the actual intent,
`requestAnimationFrame` with the frame cancelled in the cleanup. Lint was clean
on 2026-09-03. Seven of the nine errors fixed that day had been added while
lint was already red — which is the reason to keep it at zero.

**A comment is enough to make a class look used.** A grep for a class name
hits code comments and CSS-in-JS as readily as a `className`, so a dead rule
whose name a comment still mentions survives a naive scan. Check for
`className=` or `classList` before calling a class live. The reverse trap too:
`EdgeCaret` builds `edge-caret--` + direction, so the composed name never
appears whole anywhere.

**Cutting a `@keyframes` block by regex needs three closing braces.** Two
frames inside, one around them. A pattern that stops at the second leaves the
third behind, and PostCSS then refuses the whole stylesheet with
`Unexpected }` — which reaches the browser as every page blank. A brace-depth
scan of the file (comments stripped) finds the line in a second.

Things that cost real time. Each one is here because it was not obvious and
will not be obvious again in six months.

**A rule scoped to `.lay` hits every layer, and the two layers are not alike.**
`.lay .sitenav-row { position: relative }` was written for the send sheet,
which scrolls itself and therefore cannot hold a fixed child still. An entry is
the other kind of layer: it does its own scrolling in `.ln-screens` and leaves
the sheet still, so its header was right as it was. The rule put that header
into the flow, pushed `.ln-screens` 80px down a sheet it is sized to exactly
fill, and cut the bottom 80px off screen two — shipped, and not noticed for a
day, because the send sheet was the only layer looked at after the change.

The distinction is `.lay--scrolls`, and it is the one that actually matters:
`.lay` sets a containing block for fixed descendants either way (it animates a
transform on the way in), but pinning to a sheet that is fixed at inset 0 and
never moves is the same as pinning to the window. It only goes wrong once the
sheet scrolls. **When a layer gains a second tenant, check the first one.**

**Never `SET search_path` on a pooled connection.** Neon's `-pooler` endpoint
is PgBouncer, and a session-level `SET` leaks into the pool: the next client to
be handed that backend inherits it. Setting `search_path` to a temporary schema
while rehearsing a migration, then dropping that schema, left roughly one
connection in eight pointing at a schema that no longer existed — so `SELECT
count(*) FROM entries` failed on a database where `entries` was perfectly fine.

It reads as data loss and is not. `SHOW search_path` on a fresh connection
tells you immediately. Fixing it means `SET search_path TO "$user", public` on
enough connections to sweep the poisoned ones out, and `ALTER DATABASE ... SET
search_path` so recycled backends come back right.

Better: rehearse a fresh install in its own **database**, not its own schema.
The schema trick also gives a false negative on foreign keys, because a `DO`
block matching a constraint name without scoping it finds the real one in
`public` and skips.

**A cheap query can still be the expensive one.** The Neon transfer allowance
hit 95% with healthy compute, no long-running query and no runaway poll —
every signal said nothing was wrong. The cause was `pull_settings` doing
`SELECT *` on a row holding two base64 images, 307 kB of 310, read twice per
page render and every fifteen seconds by the beacon. One tab open for a working
day moved 580 MB.

Monitoring measures how hard a query *works*. It does not measure what the
query *carries*. When transfer is high and compute is fine, stop reading the
query plan and weigh the row:

```sql
SELECT pg_column_size(settings.*) FROM settings;
SELECT column_name FROM information_schema.columns WHERE table_name='settings';
```

then size each column and look for the outlier. It took about four minutes once
pointed the right way, and no amount of staring at the dashboard would have
found it.

**Neon's free allowances are per project, so a dev branch does not reduce
transfer.** It is still worth having — it stops local development writing to
the live journal — but it isolates *data*, not usage. Both branches spend the
same 5 GB.

**`allowedDevOrigins` fails silently and looks like a broken site.** Next
refuses dev requests from any origin not on that list, and the refusal is
invisible in the worst way: the page still server-renders, so it appears to
load, and then nothing on it works — empty beacon, no entries, blank card. It
reads as the app being broken, so the instinct is to blame whatever you changed
last. It is in `next.config.mjs` and now uses wildcards for the private ranges
plus `*.local`, so a changed LAN IP cannot cause it again. The laptop's mDNS
name (`Miyels-Laptop.local:3000`) is the address that survives changing
networks; `ipconfig getifaddr en0` gives the current IP.

**A text field under 16px makes iOS Safari zoom, and it does not zoom back.**
Safari zooms the page in whenever it focuses an input whose type is smaller
than 16px, and on blur it frequently leaves the page scaled and offset instead
of restoring it. What you see is the layout going wrong *after* leaving a
field, worst near the bottom of a page where there is nothing below to scroll
back to — so it looks like a scroll or layout bug and it is a font-size bug.
16px on the field is the entire fix; scope it to `@media (pointer: coarse)` to
keep smaller type where there is a mouse. `maximum-scale=1` on the viewport
also stops it and is the wrong answer — it takes pinch-zoom away from everyone
who needs it. The rest of the site's inputs are still 13–15px and have not been
looked at.

**The clipboard cannot be tested in the Browser pane, and the failure looks
like a bug in your code.** `navigator.clipboard.writeText` rejects with
`NotAllowedError: Write permission denied` whenever the document is hidden, and
the pane reports `document.visibilityState === 'hidden'` almost all the time —
the same fact already recorded above about IntersectionObserver. A real trusted
click does not help, and neither does forcing a frame with a screenshot; the
write is refused and, since the handler catches its own rejection, absolutely
nothing happens on screen. It reads exactly like a handler that never ran.

Check `document.visibilityState` before believing it. What can be verified is
the logic: replace `navigator.clipboard` with a stub whose `writeText` records
its argument and resolves, then press the control and assert on what it was
handed and what appeared. That covers everything except the browser's own
permission, which is the one part that was never broken.

**`overflow: visible` on the layer is right for an entry and wrong for
everything else.** `.lay` gives up being a scroll container on a phone, for a
good reason written at length in globals.css — the entry's own layout does the
scrolling and a third container breaks the other two. Put anything else on that
sheet and the reason evaporates while the rule stays: a form is one ordinary
column, it overflows the fixed box, and the bottom of it simply cannot be
reached. There is no scrollbar and no error, so it looks like a layout that
ends early rather than content that is unreachable. `.lay--scrolls` is the
opt-in.

**A `SELECT` naming a column that does not exist takes out the whole page
quietly.** Adding three columns to `pull_submissions` before running the
migration made `/api/submissions` answer 500, and the inbox's `.catch` turned
that into "No pending submissions" — an empty shelf where there were real rows.
The read was broken and the page said everything was fine. Worth remembering
that a fetch with a `.catch` that sets an empty state cannot tell you apart
from a genuinely empty table.

**CSS is not "last rule wins."** Specificity decides first and source order
only breaks ties — `.card` beats `div`, `#hero` beats `.card`, and an inline
style beats both. This is why deleting a rule sometimes changes something
nowhere near it: the rule was not winning on order, and taking it away promoted
a different one.

Three signs a stylesheet wants a pass, all of them the same sign: reaching for
`!important`, writing a more specific selector to beat one written last month,
or being afraid to delete a rule because you cannot tell what it holds up.

**Grep is the wrong test for whether a database column is in use.** A column
can hold real data that nothing currently reads — unread is not unused. This is
already written down in DECISIONS and is repeated here because the guardrail
existed and got walked past once anyway. `git rm` on a file is recoverable from
history; `DROP COLUMN` is not recoverable from anything but a backup. Read the
values before deciding, and take a backup either way.

**Changing a scroller's overflow in the middle of a scroll stops the scroll.**
A class that toggled `overflow-x` on the cross's rail whenever a pane passed
eight pixels meant that overflow flipped every time you crossed that line near
the top of a pane — and the vertical scroll died each time. It looked like a
snap problem and it was a layout-state problem. If a fix has to change a scroll
container's own properties while it is being used, it is the wrong fix.

**A hand-rolled drag loses to native scrolling, every time.** An edge-strip
gesture that set `scrollLeft` frame by frame — with the snap switched off for
the duration, which is the correct technique — still read as glitchy beside the
browser's own momentum and snapping. Reimplementing scroll physics is a last
resort, not a tool to reach for when a CSS answer is proving awkward.

**`overflow: hidden` still creates a scroll container.** It takes the scrollbar
away and stops the user scrolling it; it does not take the element out of the
scroll chain. So a box wrapped around a scrolling layout, set to `hidden` and
carrying `overscroll-behavior: contain`, still catches every gesture that
reaches the end of an inner scroller and refuses to pass it on — the scroll
dies there. Half the symptom disappears (the second scrollbar) and the worse
half stays (the freeze), which makes it look like the fix worked and the
problem was something else.

`overflow: visible` is the only value that means "not a scroll container".
Cost an entire wrong fix on the entry layer.

**`touch-action: pan-y` does not arbitrate a diagonal gesture — it runs both
halves of it.** It was meant to settle who owns a swipe: vertical to the
browser, horizontal to the drag handler. What it actually means is that the
browser will start panning on the *vertical component* of any gesture, at once,
while the handler is still watching the horizontal one. So a back-swipe that
drifts slightly downward scrolls the page **and** drags the layer. On the entry
layer that landed you in the notes instead of back on the journal, and being
stricter about what counted as horizontal only traded it for swipes that did
nothing.

There is no ratio that fixes this, because the browser has already acted before
the ratio is known. The fix is to remove the ambiguity somewhere small:
`touch-action: none` on a narrow edge strip, with the gesture only recognised
there. Inside the strip the browser does not pan at all, so the gesture can only
be the one thing; outside it scrolling is untouched. That is also what iOS does
with its own back gesture, so it is the gesture people already reach for.

**`scroll-behavior: smooth` makes scroll tests lie.** It is set on `<html>`
sitewide, and it applies to `element.scrollTop = n` as well as to
`scrollIntoView` — so setting a scroll position and reading it back gets a
number from somewhere in the middle of an animation. Three runs of a
scroll-preservation test read 4, 37 and 48 out of a requested 1600 and looked
like a broken feature. `window.scrollTo({top, behavior: 'instant'})` overrides
it and is what a test should use.

**Touching rectangles count as intersecting.** A pane parked by scroll snapping
sits exactly edge to edge — `left: -444, right: 0` against a viewport starting
at 0 — and an IntersectionObserver reports that as `isIntersecting: true` with
`intersectionRatio: 0`. It reports the same booleans on screen and off, so
`threshold: 0` sees no crossing and the callback fires **once, on open, and
never again**. Use a small positive threshold (`0.02`) so there is a real
crossing to notice. Cost two wrong fixes in About.js, and it would have worked
by accident on any layout that did not land on a whole pixel.

**A hidden page does not run IntersectionObserver.** The Browser pane in this
setup reports `document.visibilityState === 'hidden'` most of the time, and
Chrome delivers no intersection callbacks to a hidden page — so an observer
test that is really working comes back looking broken. Take a `screenshot`
between the steps of the script: it forces a frame, and the callbacks land.
Check `document.visibilityState` in the result before believing a negative.

**Anthropic billing is two separate banks.** `ANTHROPIC_API_KEY` draws on the
**Developer/API credit balance** in the Claude Console, which is a *different
pool* from the Claude.ai subscription's "usage credits" — same account, two
banks. A `credit balance too low` error means top up the **API** balance
(Console → Billing), and turn on auto-reload so it never stalls. Web search
(~5¢ an album) comes out of the same pool.

**VS Code will not save `.env.local`.** It fails silently — no error, no
warning, the file simply does not change. Edit it from a terminal and confirm
with `cat .env.local`.

**Never use a heredoc containing backticks to write JSX.** The backticks end
the heredoc early and mangle the file. Write to a temp file first.

**`:has()` is silently dropped by the build.** The rule vanishes with no error.
Scope the style another way.

**Stale `globals.css` survives a plain dev-server restart.** Stop the server,
`rm -rf .next`, then start it again. Restarting alone does nothing. **Still
true of `base.css` in 2026-09**: three times in one day a rule added to it
was in the file and not in the page, while edits to `entry.css` in the
same minute went through. A selector you cannot find in
`document.styleSheets` after an edit is this, not a typo.

**sharp's png `effort` quietly makes a palette PNG.** It reads as a
compression knob and is a quantiser: at `effort: 10` a 200 kB pressed
picture came back at 65 kB with its pixels moved, which breaks the ink
flip that makes the dark page's file. `compressionLevel: 9` with
`adaptiveFiltering: true` is the lossless setting, and a fifth off is all
lossless buys. Measured 2026-09-12; the round-trip check is in the press.

**Safari gives an inline SVG the 150px default height when only its width
is set.** Chrome derives the height from the viewBox; Safari does not, so a
code sized by width alone drew small and centred on the phone and full
size in the preview. Set the height too. 2026-09-12.

**`perspective` promotes tiles into their own layers**, which then paint over
fixed elements. Watch for it on the archive. The band behind a fixed top row
(`.sitenav-row::before`, `.hn-bar::before`) needs `transform: translateZ(0)` of
its own or the tiles paint straight over it, whatever its z-index says.

**A caret pinned to the window will land in the middle of a sentence.** Pane
content pays `--hn-gutter` for exactly this reason. It is not obvious until you
read a paragraph with a chevron sitting in it.

**Nested scroll containers are not restored by the browser.** The panes keep
their own scroll while they stay mounted, which is why swiping away and back
remembers your place for free — and why leaving for an entry and coming back
will not, until `usePlaceKeeper` exists.

**A screenshot can beat React's commit.** Driving a scroll from the console and
grabbing the frame in the same batch shows the old state — the carets look
stuck and the band looks missing. Read `className` off the live DOM before
believing a screenshot about anything that state controls.

**`overscroll-behavior-x: contain` is load-bearing on the rail.** Without it a
swipe that reaches the left end keeps going into Safari's back gesture, so
reaching for the card takes you off the site.

**Linux is case-sensitive and macOS is not.** An import path with the wrong
case works locally and fails the Vercel build. When a build dies on "Module not
found", check the case against `git ls-files`.

**The old Last.fm key is in public git history, and that is fine.** It was
hardcoded in the source from 2026-05-15 until 2026-08-27, and the repo is
public, so it is in history permanently. It has been rotated, so the exposed
one is inert — and it was read-only anyway, reading nothing but public scrobble
data. Not worth rewriting history over: that breaks every existing clone in
order to retire a key nobody can use. Do not be alarmed by it again.

**Secrets have only ever lived in `.env.local`, which is the whole reason the
audit came back clean.** All 370 commits were searched for each value on
2026-08-27: `DATABASE_URL`, `ANTHROPIC_API_KEY`, `SESSION_SECRET` and
`SESSION_PASSWORD` appear in no commit, on no branch, ever. A pattern sweep for
Anthropic keys, Postgres credentials, GitHub tokens, AWS keys and JWTs came
back empty too. **Keep it that way** — the migration runner and the welcome
screen are the next things that will want to write configuration somewhere, and
a real secret belongs in the environment, never in the settings table and never
in a file that gets committed. `.env.example` holds names and never values.

**`pg_dump` is not installed and cannot easily be** — no Homebrew, no
Postgres.app, nothing to run it with. Don't plan around one. What exists
instead is `npm run backup` / `npm run restore`; see [docs/OPERATIONS.md](docs/OPERATIONS.md).

**Neon keeps six hours of history on this plan.** That covers the mistake you
notice immediately and nothing else. It is not the safety net — the nightly
snapshots are. Take one by hand before touching the schema.

**The neon driver refuses a plain string.** `sql('SELECT ...')` throws — it
only takes a tagged template, and a table name cannot be a bound parameter
anyway. Dynamic SQL has to go through `sql.query('SELECT ...', [params])`. This
cost a backup run that wrote nine empty files and reported success, which is
worse than no backup at all.

**The LaunchAgent holds an absolute path to `node`, and nvm moves it.** The
plist points at `~/.nvm/versions/node/v24.14.0/bin/node`. Upgrade node and that
path stops existing, the nightly backup silently stops running, and nothing
says so. Re-point the plist after any node upgrade — this is exactly the silent
failure the stale badge in Pending is meant to catch.

**`.gitignore` has `.env*`, which swallows `.env.example` too.** It needs the
explicit `!.env.example` line below it, or the one file that is meant to be
committed silently is not.

**`CREATE TABLE IF NOT EXISTS` does nothing to a table that already exists.**
So a column added to `settings` has to be added twice in the migration: once in
the CREATE for a database being built from nothing, and once as
`ALTER TABLE ... ADD COLUMN IF NOT EXISTS` for one built last month. Miss the
second and the column exists only on fresh copies.

**`localhost` writes to the production database.** There is no separate dev
database. A destructive query typed here is typed there.

---

## Where the rest lives

Not repeated here, because two copies of the same thing means neither stays
current.

- **Architecture** — what every file and route does: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
- **Design tokens** — colours and fonts: the custom properties at the top of
  `app/styles/base.css`, and the `fonts` object in `library/sitewide_visuals.js`.
  Those files are the source; anything written down elsewhere goes stale.
- **Environment variables** — [`.env.example`](.env.example).
- **Settled decisions and their reasoning** — [DECISIONS.md](DECISIONS.md).

---

## Git Workflow

- Commit after each verified working checkpoint
- Sign off every commit: `git commit -s` (see [CONTRIBUTING.md](CONTRIBUTING.md))
- `git restore <file>` to undo a single file
- Branch per feature; review on the dev server before merging to `main`

---

## Complete

**2026-09-20 — The feed at two densities.** Her brief: "one toggle, two
states, nothing in between."

- [x] **A two-bar glyph at the top right of the feed's header**, and the glyph
      is the shape it makes — the rule the archive's density control already
      keeps. Which state you are in is said by the ink, not by swapping the
      mark: a control that changes its own picture is two controls. Remembered
      between visits (`ln-feed-density`), because a density you chose is a
      preference and re-picking it every visit is the page forgetting.
- [x] **The header went from one word centred to a name and a control at the
      two ends of a line.** On the feed's own address it says *Feed*; on the
      cross it does not, because the name is at the foot of the floor above
      with the caret under it — there it is the toggle alone, and the row
      gives up its rule and its air, which the peek needs back.
- [x] **Rows: 56px art, the title, then artist · who · when in the caption
      face**, cut with an ellipsis rather than wrapped. Stars at 11 and the
      marks at 14 on the right, a hairline between, about eight to a screen.
- [x] **The marks survive the squeeze**, which is the point: the envelope and
      the compare are the two reasons to stop on a row.
- [x] **The short time in rows** — `6h` where the tall version says `6h ago`.
      A row gives its meta about 140px, and "ago" is 26 of them said three
      times over; the artist and the name are the part that cannot be guessed.
      Her own mock-up writes it that way.
- [x] **A gold ring: on the cover in full, round the whole row in list.**
      Miyel, 2026-09-20: "in list view that amber highlight can be the whole
      box not just the art." A 56px thumbnail is too small a thing to hang the
      one at-a-glance fact on, and a ring round it reads as something about
      the picture where round the row it is about the record. The row gives up
      its own hairline while it wears one — two rules two pixels apart, one
      faint and one gold, is a box with a smudge under it — and every row
      carries the 10px of side padding the ring needs, or the shared ones
      would sit inset from the rest and the list would be ragged down an edge.
- [x] **Why a ring at all, in either density.** The one thing in a
      feed you can act on that is worth spotting without reading — and reading
      is what scrolling past eight rows a screen does not leave time for. An
      `outline` rather than a border, so it takes nothing off the art and
      moves nothing beside it.
- [x] **The compare mark stands with the marks, in both densities.** That is
      what her brief says — "Compare, in both modes" — and what her reference
      draws, and I read it as rows-only for half a day. It had a word under it
      from the version where it stood alone; a mark in a row of marks does not
      get a caption, the envelope beside it never had one, and the ring round
      the cover has already said the thing before you read anything.
- [x] **And closing one is the same two movements read backwards.** It
      vanished — Miyel: "it just disappears the way it is now." A comparison
      that is closing has to still be in the page to close in, so the key is
      held for 600ms and let go after, the shape the book's doors already use.
      The bars sink and the panel folds after them, quicker down than up,
      because a thing arriving can take its time and a thing leaving should
      not keep you waiting.
- [x] **Opening one scrolls it into view**, by as much as it takes and never
      when it was already in view. A control that reports its result somewhere
      you cannot see has not reported anything. It waits for the panel to
      finish opening, so the scroll and the bars rising arrive together.
- [x] **And nothing under the stars.** *Theirs* went first (it is linked from
      the cover above); *Your copy* followed — "it's understandable without".
      The lower horizon is yours because the stars under it are yours, and a
      label naming the thing you are looking at is a caption on a photograph
      of your own house.

**What the header cost the peek, and it is a choice:** the feed floor now
starts with a 39px row, so the sliver of record showing under the caret went
from about 50px to about 22. Getting it back is one number — the book pane's
`--hn-peek` — and it costs the shelf a row of faces on a phone this size. Left
as it is until Miyel says which she would rather have.

**2026-09-20 — The compare is a mark, and opens as two listens stacked.**
From Miyel's reference.

- [x] **The control is the shuffle and nothing else.** "when a compare is
      available i just want it to be the symbol." The word was doing two jobs
      — saying a comparison exists, and being the thing you press — and the
      first is the mark's. It is only ever drawn on a record you also have, so
      its being there is the whole announcement. Under the entry, where the
      word was: her reference drew it as a badge on the album art and she took
      it off again, because the art is the record and not a place to hang
      controls.
- [x] **Theirs on top, the distance on the line, yours below, your stars under
      yours.** Theirs carries no stars of its own — they are on the entry four
      lines up, which this opens underneath, and printing them twice on one
      screen is the same fact twice.
- [x] **The two horizons are not mirrored.** "don't mirror beacons they should
      be one above the other." A pair growing away from a shared line is a
      difference chart and this is not one: two listens of the same record,
      each with its own shape, drawn the same way up.
- [x] **No panel around it.** It opens under a record on a page that has no
      boxes on it, and a card would make the comparison a separate object from
      the thing being compared.

**And then, the same evening:**

- [x] **Hearted tracks show on both horizons.** They were not in the data at
      all: `horizon` carries heights and nothing else, and `tracks` — where the
      hearts live — is deliberately kept out of every list because it is
      writing. So a small string is derived in the query, a '1' or a '0' per
      track (`HEARTS_FIELD`), and nothing is stored: `tracks` stays the source
      of truth and there is no second copy to keep in step. Derived in SQL and
      not in JS on purpose, or reading the hearts back would pull every word
      of every note across the wire on a page that draws none of them.
      **NAME: `hearts` is a placeholder.**
- [x] **Theirs is not linked again.** The cover and the title above already
      go there. Only *Your copy* is left, centred under your stars.
- [x] **The mark turns a quarter, not a half.** Open, the arrows point down at
      what has opened; half a turn only sent them the other way along the same
      line, which says nothing.
- [x] **The word COMPARE sits under the mark until it is used.** It is there
      to teach what the mark is and has nothing to say once the thing it names
      is open.
- [x] **The panel opens, and then the bars rise.** Two movements in order,
      not one on top of the other: the compare unfolds and pushes the feed
      below it down, and only once it has stopped moving do the bars leave the
      baseline. Bars growing inside a box that is itself still growing is two
      things moving the same way at once and neither reads. Measured: the
      unfold lands at 250ms, the bars start at 340 and take 720 over it.
- [x] **The bars rise** out of their own baseline, **all at once.** They were
      a frame apart, left to right, on the argument that it was the shape of a
      listen arriving in the order it happened — and Miyel is right that it is
      not: a horizon is one thing you look at whole, and dealing it out left to
      right makes it a list being read to you. One listen, one movement.

**What another copy sends, and when.** The hearts cross between journals, so
a friend's horizon stays bare until their copy is updated — theirs simply
answers without the field and the bars draw as they always did. Nothing breaks
and nothing waits.

**One deviation from the reference:** it says READ BOTH on a single line. One
press cannot open two pages, and theirs is linked above, so the line is
*Your copy* alone.

**2026-09-20 — The mark is the beacon's alone, on a phone.** Miyel: "remove
the LN logo from header of all pages except beacon." It had shown on the inbox
and the book since the evening before, on the argument that every page here
says what it belongs to — and the answer is that the mark belongs to the
*journal*, which is the beacon, and repeating it over the rooms behind it says
nothing except that this is still the same website. The card gave up its own
in the same breath. The beacon keeps the crown, and the bar's small one still
takes over there once the crown has scrolled away.

The two panes got their forty pixels back: they clear the status bar again
rather than the whole bar, which on a tall phone is most of another row of
faces. **A desk is untouched** — no band, one page at a time, and the bar's
mark is the only one it has.

**And then the standalone addresses too, except entries** (Miyel, same
evening: "all standalone pages except entries"). SiteNav reads the address
rather than taking a prop, because it is a fact about where you are and not a
decision each page should get to make differently. The one standalone page
that is *of* the journal — a listen, at an address you can send somebody — is
the entry, and it keeps the mark. Settings, the archive, a report and the rest
are rooms in the back of the house.

**What that costs, and it is worth knowing:** on those pages the mark was the
only way home. Every one of them opens as a layer over the cross in normal use
and closes back onto it, so this only bites on a cold open — a bookmark, or a
hard reload. The left slot of that row is empty and is where a way back would
go if it turns out to be wanted.

**2026-09-20 — The beacon gets the book's way down, and three fixes.**

- [x] **The beacon's floor stops short and names what is under it.** Miyel:
      "the beacon should have the same effect... LN. logo must become smaller,
      everything lives higher, then caret has journal and peek at journal." So
      it is the book's shape exactly — a word and a chevron at the foot of the
      first floor, the snap stopping a bar's-worth short, and the top of the
      wall showing underneath. The mark went from 0.23 of the screen to 0.17
      and from 82px to 62.
- [x] **And the 92px under the record paid for nearly all of it.** That was
      the room the caret kept while it floated above the band. The caret is a
      row in the flow now and brings its own air, so the number went back to
      the screen. Phone only — on a desk there is no band, no caret and no
      peek, and 92 is just the space under a record.
- [x] **The floating caret is gone.** It said "there is more that way" on
      whichever pane had a second floor. Both panes say it themselves now,
      with a word and the top of the thing below showing under it, which is
      the same sentence with a subject in it.
- [x] **The wall stops being a scroller of its own on a phone**, for the same
      reason the feed's floor did an hour before: a sliver of an inner
      scroller is a scroller you can reach before you have arrived at it.
- [x] **Opening somebody in the bottom row is no longer cut off.** The shelf
      could always scroll to the doors; nothing said so. It goes to them once
      they have opened, by as much as it takes, and not at all for the rows
      that were already in view.
- [x] **The way down sits lower, against the thing it points at.** The feed's
      floor cleared the bar with padding, which put 80px of nothing between
      the caret and the first cover at rest. `scroll-margin-top` moves the
      snap position instead of the content, so the cover starts immediately
      under the caret and still lands clear of the mark when snapped.

**SETTLED, 2026-09-20: the beacon's peek is covers, and the fifty pixels came
out of the mark and the gaps.** Asked where to take it from, Miyel's answer was
the mark and the air above the record rather than the record itself. So the
mark went 0.17 → 0.13 of the screen and 62px → 52, `--hn-square-top` is capped
at 34 on a phone rather than 80, and the beacon's peek is 190 where the book's
is 140 — deeper because the wall holds its first 96px whatever is drawn in
them.

**And the wall's search bar is faded out while you are upstairs.** It is
`position: sticky` against the bottom of the scrollport, which is exactly
where the sliver of covers is, so left alone it *was* the peek: a search box
for a page you are not on, sitting over the records it would be showing.
Faded rather than removed, because it keeps its 96px of flow either way and
nothing may move when you arrive and it comes back.

**2026-09-19 — The band goes Card, Beacon, Friends, Inbox.** Miyel's reason,
and it is about the shape of the rail rather than what the rooms are for:
"two double levels two not sandwiched." Two of the four panes have a second
floor — the beacon with the journal under it, the book with the feed — and two
are a single page. With the inbox third, a flat pane sat between the two deep
ones and down meant something different on every second stop. The rail reads
flat, deep, deep, flat now.

**The two lists that have to agree:** `paneRefs` in HomeNav and the `order`
rules in nav.css are the same order said twice, and the band counts against
the first. Change one without the other and the third word walks you to the
fourth pane.

**2026-09-19 — Add and Scan sit under the field, not under the page.** Miyel:
"centering feels off when search bar is open." It was, and the arithmetic is
plain once you measure it: the head is a field and a +, so the field gives up
the +'s 40px and the 8px between them, all of it off its right-hand end, and
lands 24px left of centre. Everything else on the floor is centred on the pane
— the mark, the faces, and that row of buttons — so two controls that plainly
belong to the box above them sat 24px to the right of it. The row takes the
+'s width as right padding now, which puts its middle on the field's middle.

**What is left, and it is a choice not an oversight:** the field is still 24px
left of the mark above it. Closing that means letting the field span the full
width and floating the + over its right-hand end, which buys one centre line
for the whole screen and puts the × on top of the thing it cancels — a tap
near the end of a typed address would throw the address away. Not worth it
unless Miyel says so.

**2026-09-19, later still — the mark was missing from the two new panes.**
Every page on this site says what it belongs to: the card and the desk draw
their own small mark at the top of themselves, and the beacon has the crown.
The inbox and the book drew nothing, so the top of the friends floor was a +
and some faces (Miyel: "we need LN. header i just noticed"). The bar's own
mark is shown on those two panes from the start now — the same mark in the
same place, and pressing it does what it does everywhere, which is go back to
the top. Their content starts at `--hn-bar-h` rather than 36px so nothing runs
through it. Keyed on `.hn--keeper`, because signed out pane 2 is the colophon
and the colophon keeps the crown.

**2026-09-19, later — four small ones off a real phone.**

- [x] **Came back is gone.** The corner filter lasted one evening. What came
      back from a send is on its way to the inbox as an arrival (brief 1's
      third item), and a filter nobody asked for is a control to read past on
      every visit. The match that found them is kept and commented, because
      the brief's instruction for that third item is to reuse it.
- [x] **The feed says its name above the caret, not above itself.** Her
      mock-up drew it that way and it took a week to arrive there: down at the
      foot of the book it labels the way down, which is a thing you are
      deciding whether to do. At the top of the list it would be naming a
      place you had already arrived at. On the feed's own address it still
      says its name at the top, centred, because nothing else there would.
- [x] **The + no longer opens the keyboard.** Miyel, off a real phone: "this
      can open not in typing mode. most people will scan." Two reasons and
      both good: the camera is the way in and typing is the fallback, and on
      iOS a focused field near the top of a pane makes the system scroll the
      page to clear the keyboard — which lifted the whole floor up behind the
      status bar. Her "the placement is off" was that scroll.
- [x] **The shelf was measuring a face where it should have measured a row.**
      Each row is its own grid with 18px of air above and below it, so the sum
      lost 36px a row and the fourth came back cut in half at five across.
      Measured off `.fr-row` now, and the air is part of what a row costs.

**2026-09-19 — The book is a shelf, and the feed is a floor under it.** Her
brief, tightening the pane she had just been given.

- [x] **As many faces as fit on one screen, then See all N.** The floor is a
      shelf and not the library — her words, and the reason is the feed: it
      has to be exactly one scroll away whether the book holds six people or a
      hundred. Measured rather than counted out, off a box of settled height,
      so a phone with a notch and a phone without get different answers and
      both are right. Whole rows only.
- [x] **The line opens the whole book as its own view.** A link, not a state,
      so it is the address the book already has — the cross catches it and it
      arrives as a layer with the search at the top and everybody in it.
      Closing it puts you back on the shelf where you were.
- [x] **The search field lives in the full view.** On the floor it appears
      only past about a dozen, which is the brief's original rule reinstated:
      a field over eight faces you can already see is a box asking you to type
      the name of somebody you are looking at. Never over an empty book.
- [x] **The feed is a floor and the pane snaps to it**, the way the journal
      does under the beacon. It could not snap while the first floor was as
      tall as there were people in it, which is what the shelf is for. The
      floor stops short of the screen by --hn-peek so the top of the feed
      shows under the caret: the heading, and the first covers beginning.
- [x] **Remove left the door row.** Miyel, changing her own earlier call: "it
      undoes the relationship and shouldn't be one mis-tap from Send." A quiet
      mono line under the three, red on the second press, put back by a press
      anywhere else. Journal, Compare and Send stay as glyph over word.
- [x] **Nobody filed is its own screen**: what the page is for, both ways in,
      the +, and **no caret and no second floor**. A caret pointing down at a
      feed of nobody's records is a promise the page cannot keep. The cross
      learns the size of the book from the book (`onCount`) and draws one
      floor until it has.
- [x] **The book's field is the shape of the beacon's album search** — 10px
      corner, 12px inset, "a bit more square". One box to type in on this
      site, one shape for it. The shutter's `clip-path` corner had to follow,
      or the field grows a straight end on its way through the slot.

**Two of the three empty states.** She named "no one filed" and "people filed,
nothing logged" — both built, the second already being the feed's own line.
The third was not named and is not guessed at; ask.

**Still not built, and deliberately: pinned people.** The shelf draws them
first the day they exist; there is nothing to draw yet (Miyel, 2026-09-19:
"let's not add pinning friends yet").

**2026-09-19 — Four doors at the foot, and the desk is gone.** The second half
of brief 1: the band that names the panes goes from three words to four, and
the two rooms that were behind the desk become places you can be.

- [x] **Card · Beacon · Inbox · Friends.** The band drew Card · Beacon · Desk
      and the desk was a page of doors — a corridor, with the two rooms worth
      standing in behind it. They are stops of their own now, which is the
      whole shape of the brief's own mock-up. Signed out it is still three:
      Card · Beacon · About, because there is no inbox and nobody to read.
- [x] **The rail is four panes wide for a keeper.** Both new ones mount with
      the cross and stay mounted — the rail's bargain, and what lets the inbox
      go on counting while you are looking at the card. The inbox is its own
      page drawn without its bar (`inPane`); the book is `Friends`, which is
      a component and not a route precisely so that it could be hung here.
- [x] **And Compare opens over the cross.** A door in the book now lands on
      `/dashboard/people/[id]` from `/`, which the `(.)` interception catches
      — so a person opens as a layer with the book still underneath, and
      closing it puts you back on the pane where you were. It used to be a
      navigation out of the cross. Nothing was written to make that happen.
- [x] **Settings, the version and Report a problem moved to the foot of the
      card**, below everything a visitor reads, behind a rule. The card is the
      page about this journal and Settings is where the journal's own facts
      are kept. It wears the desk's own row and the desk's own colophon line
      rather than a new shape for the same door.
- [x] **The feed is the book's second floor.** It was a row for an hour;
      Miyel: "feed should just start not be a button." So it does — the faces,
      then the feed's own heading on a rule, then the records, one continuous
      scroll. No snap between the floors, unlike the beacon: that pane's first
      floor is exactly one screen tall so a snap has one place to land, and a
      grid of faces is as tall as there are people.
- [x] **And one feed, which had to come with it.** Two centred tabs under a
      grid of faces would read as a control somebody left there. So Recent is
      the feed and Submissions is a word in the corner that narrows it —
      brief 1's second item, arrived at because the first one needed it.
      NAME: *Came back* is the word her own mock-up put in that corner.
- [x] **The rooms are built on arrival, not on load.** Both new panes fetch
      when they mount — the inbox asks for submissions, comments, reports and
      the book; the feed asks every journal in that book, one cross-origin
      request each. Mounting them with the cross meant paying all of it on
      every visit to the front door, including visits that never leave the
      beacon and every visit on a desktop, where neither is drawn. They build
      the first time you arrive and are never taken down, which keeps the
      rail's actual promise — come back and it is where you left it.
- [x] **`.fd-wrap` had no side padding on a phone and never had.** Its gutter
      is `var(--page-gutter)`, which is set on the cross's own faces and
      nowhere else, so on the feed's standalone address the whole shorthand
      was invalid and resolved to zero. A centred row of tabs hid it for
      months; a heading that reaches for both edges showed it in one frame.
      Fallback added, and the 320px cover has not moved.
- [x] **Desktop is untouched, deliberately.** Above 769px there is no band, so
      there is nothing to reach a pane with: the book keeps its spine, the
      desk keeps its four doors, and the two new panes are not drawn at all.
      The card's foot and the feed row are phone-only for the same reason —
      the desk is still there to hold them, and the same door twice one turn
      apart is worse than either.

**Left alone, and named here so it is a choice:** the desk still mounts on a
phone, hidden, so `Dashboard` still asks `/api/update` once beside the card's
own ask. Two GETs to your own server, to an endpoint that asks GitHub at most
once an hour. Not worth a media query in JavaScript and the hydration question
that comes with it; worth fixing when the desk goes for good.

**2026-09-19 — The book is faces, and sending is two screens.** Brief 1 of the
friends brief (2026-09-17), and everything the brief's own send sheet turned
out to need once it was used.

- [x] **The address book is a pane of faces.** `Friends.js`, a component and
      not a page, because the brief's next step hangs the same thing off the
      cross with the feed on its second floor — a route that was also a design
      would have to be taken apart to get there. Four across up to twelve
      people, five beyond, and `/dashboard/people` is now a lock and a frame
      around it. **No card:** Miyel, "no card around this, make it live
      directly on the page." A grid of faces has edges of its own, and the
      panel colour was showing through behind squares that are meant to be
      the only ground on the screen.
- [x] **A person opens in place, under their own row.** Four doors — Journal,
      Compare, Send, Remove — sliding down from the face that was pressed,
      inside the row it is in, so the faces below step aside rather than being
      covered. 340ms, and a switch across rows holds the leaving id long
      enough for both to animate. Clicking away closes it, Miyel's ask. The
      face that is open grows; the rest dim, **on the same frame it is pressed**
      ("make the other users dim the same time a user is clicked"), and the
      chosen one wears no outline ("i don't like the black border").
- [x] **Squares, not circles, where faces sit alone.** Her call: "circle is
      fine when the pfp and album share a screen but here squares work" — the
      rounded square is the beacon's and the entry's shape, and a screen of
      nothing but people is a screen of records' worth of squares.
- [x] **Remove is the fourth door, not a footnote.** "remove can be the same
      as all the other glyphs on the row not a separate entity." Trash, and
      the two-press *Remove?* the entry editor already uses, so the shape of
      taking something out is one shape everywhere.
- [x] **The search bar shrinks and the address field opens out of the +.**
      Not a dissolve — "i want it to look more like the search bar shrinks and
      the new one opens," "every animation fluid and moves not just appears."
      A shutter: `clip-path` with a rounded inset, the two fields tiling
      across each other rather than fading through. The + turns 45° into the
      × rather than being swapped for one, because a plus turned 45° **is** a
      cross. *Enter journal address*, and *Add* and *Scan a code* centred
      under it.
- [x] **What somebody has sent you is a shelf of covers.** Four across, the
      name and the note opening when one is pressed. It was a stack of rows
      carrying a name that was already at the top of the page.

**And the send sheet, which took the rest of the evening.** It is reached from
a person now, which is a different thing from sending cold off a stranger's
journal, and it was still wearing the cold version's clothes.

- [x] **No To, no From.** "i dont even think to is needed. it already says
      send to june and we literally chose him" — and the from line is the
      keeper's own journal, which the keeper knows. The sender's name and face
      travel with the send; the address does not need printing at either end.
- [x] **Quiet always starts untoggled**, and is never what a draft remembers.
      A saved draft that comes back already quiet is a decision made on
      somebody's behalf and not noticed.
- [x] **Two screens.** "the whole screen should be the album list and then you
      choose one and then the message." Step one is the sheet at nearly full
      height holding only the finder, cursor already in the field. Choosing a
      record shrinks the sheet to the message: a 62px row with the cover, the
      title and a quiet *Change*, then *A message for June* — her wording, and
      the name is the person's.
- [x] **It cannot reach into the status bar.** The ceiling subtracts the
      safe-area inset, so a full list of covers stops below the clock instead
      of running under it.
- [x] **Scrolling the list does not close the sheet.** This was mine, from an
      hour earlier: the invisible grab strip was 48px and reached over the
      search field and the first row of covers, so a scroll that started there
      read as a pull. 26px, on the sheet's own edge — an edge is not something
      you scroll.
- [x] **No ×.** "i don't think we need an X button to close this. i think just
      a simple up and down swipe is fine." The pull, the dimmed ground and
      Escape.
- [x] **The keyboard stops throwing the screen around.** The sheet is pinned
      to `visualViewport` rather than the layout viewport, always, with no
      threshold — "it's also doing that thing where when the keyboard opens
      and closes the screen moves all over."
- [x] **And the finder lost its empty box.** Her note, in full: a 400px
      placeholder with a music note was the largest thing on screen before you
      had done anything. Search first, record only once it exists. The
      full-screen takeover it used to open went with it, the grid of covers is
      tighter, the title smaller, and the fields are hairlines rather than
      three different roundings.
- [x] **The switch is 38 by 22**, down from 46 by 28, and everywhere rather
      than only here: one control answering one question on three surfaces,
      and a switch that is two sizes is two switches.

**Names still open, and shipped as placeholders:** the file `Friends.js` and
the branch `friends-pane`. Flagged in the code where each one lives.

**The Compare glyph is settled: Phosphor `Shuffle`** (Miyel, 2026-09-20). It
was `ArrowsDownUp` for a day — my stand-in for the two arrows her mock-up left
hand-drawn — and two arrows running past each other is a sort order, which is
the one thing that door is not. Shuffle is two paths that cross and come out
the other side, which is what comparing two shelves looks like: the same
records, taken in a different order, by somebody else. Still not
`ArrowsLeftRight`; this site uses that for turning the spine.

**Not built, and deliberately: pinning.** Miyel, 2026-09-19: "let's not add
pinning friends yet, mostly just beta testers, we don't need it yet." The
brief asks for it; the book is nine people.

**2026-09-19 — Add goes home, and the slot gets a rule with a note in it.**

- [x] **Add files for real, where the journal knows where home is.** It copied
      an address and said "Copied", which Miyel's look at it settled: "all I
      saw on click was Copied." The journal being read cannot write to the
      reader's book — different origin, different database — but it is often
      told where that book lives: every link out of a copy carries its
      keeper's name and address, and so does sending a record from that
      browser (`recallSender`). Knowing, Add is a link home with this address
      in it and the reader's own copy does the filing. Not knowing — a text, a
      code, a search — it copies, as before. It never asks and never guesses:
      a journal that collected the reader's address would be a journal
      learning who reads it.
- [x] **And the book takes an address from a link.** `/dashboard/people?add=`,
      read after mount, taken straight back off the address bar so a reload
      cannot ask twice. **Offered, not filed** (Miyel: "confirm before
      filing") — a link that writes the moment it opens is a link anybody
      could send you, and the book's one promise is that a person is written
      down by the keeper and nobody else. NAME: `?add=` is a placeholder for
      Miyel to overrule.
- [x] **A hairline over the slot, with ♪ in the middle of it.** From her own
      f6 mock-up of 2026-09-17, which the row had independently arrived at two
      days later without the rule. Both versions wear it — the keeper's way in
      and a visitor's calling card are one shape at two contents — and the
      line lands on the same pixel either way (measured, y=594 on an 812
      phone), running the record's left edge to the right edge of the past
      column. The note is not a gap cut in the border: it sits on the line on
      a patch of `--bg`, which works because everything from the cross down to
      that row is transparent. ♪ because the empty beacon and an unanswering
      tile already wear it.
- [x] **And the glyph came off the way in.** Miyel: "no glyph for now." The
      arrow went on the 18th and the glyph took over saying *this is a thing
      you press*; a rule above the line says it harder, and both was twice.
      The superseded `.hn-pane--home .ln-onward` block — positioning measured
      from a BEFORE THAT row that has been a column since the 18th — went with
      it; its declarations are restated beside the calling card they align to.

**Known and left alone: the book's rows wrap a name one letter to a line on a
phone.** At 375 the row gives 40 to the envelope, 83 to VISIT and 48 to
REMOVE, leaving 54 for a face and a name, and `.bk-name` carries
`overflow-wrap: anywhere` so it shrinks to one character rather than pushing
back. Pre-existing, not from this work. Not fixed on purpose: the friends
brief replaces those rows with a grid of faces, so the fix would be thrown
away (Miyel, 2026-09-19: "don't need to fix if the list goes").

**2026-09-19 — `passing`, and two things the calling card's layout broke.**
The side-by-side floor that shipped this morning put the record and its past
in two grid columns, and flattened the wrappers between the screen and the
record with `display: contents` so the title could centre on the screen rather
than under the art. Both were right and both had a cost that only showed when
somebody used the screen.

- [x] **The picker gets the whole screen back.** Pressing *Start a listen* put
      the search in the 76px column the three small covers had been using — a
      sliver on the right reading "Sear…" beside a 235px empty square. The
      rules for the choosing screen were all still there and all still correct;
      they were written when it was one column and every one of them was losing
      on source order to a `.hn-pane--home` rule of equal weight further down
      nav.css. Restated with the pane in front of them, at the end of that
      block, with a note saying to change `.hn--choosing` and let this inherit.
- [x] **The phantom box is gone, and its collapse animates again.** The card's
      collapse when the picker opens — max-height, opacity, the screen's
      clock — had nothing left to act on, because `display: contents` means no
      box. What stood on screen was the slot it should have been closing.
      Miyel: "this phantom box doesn't belong and wasn't a part of the last
      session." It didn't; it was a rule that had stopped applying. The
      collapse is asked of the grid items now, where the height lives.
- [x] **`passing` — the record being put down, watched.** Miyel's brief and her
      name for it. Out of the big slot, into the top of the column, shrinking
      and losing its colour; the two tiles under it step down; the oldest falls
      out of the bottom and fades; the new record comes up in the slot it left.
      700ms, the floor's own number. The data had always reshuffled this way
      between two paints — this is only the watching.
      It is a FLIP, done to the DOM rather than through state: the boxes are
      measured either side of the commit and the difference handed to the
      browser, because asking React to put three tiles back where they were so
      they can travel forward again is a second render of a layout that is
      already right. Web Animations rather than a class, for MarqueeTitle's
      reason — every distance is different and a stylesheet cannot hold a
      number only known at the moment it is needed — and because `element.
      animate()` does not need a frame to be scheduled. Skipped on another
      pane, in an unpainted tab, and under reduced motion.
      Tested by stubbing the beacon's own poll in the browser to hand back the
      state a real save produces. The flier lands within one pixel of the tile;
      afterwards no copies are left, no tile is holding a transform, and the
      column reads in the right order.

**2026-09-19 — the calling card. Branch `beacon-shapes`.** A visitor landed on
the beacon floor and found a quarter of the screen empty: the only thing that
ever stood under the record was the owner's way in. Measured at 189px of 812.
That slot is the floor's one question — what now — and it now holds whichever
answer fits whoever is looking.

- [x] **`CallingCard.js`, at the foot of the beacon, visitors only.** The face,
      the name, `+ ADD` and `✈ SEND`, on one line, in the way in's own
      `.ln-onward` class a size down. It draws from `useBookplate()`, so no new
      fetch, no route and no column. Pressing the face or the name goes to the
      card, through the same `goTo(0)` the Card door uses.
- [x] **It lines up with the composition above it.** The face sits on the
      record's left edge and Send on the right edge of the past column, because
      the row is a grid item of the same grid. Measured, both exact.
- [x] **Send and Add are off the identity card.** Its name line is the name and
      *Keeping since*; `.idc-acts`, `.idc-act` and `.idc-act--send` are gone.
      One pair of controls, in the place a stranger actually lands.
- [x] **The public send page asks about credit with the shared switch.**
      `.ln-switch`, the one the send sheet and the entry already use. base.css
      has said since that switch was drawn that the surfaces asking a yes/no
      about somebody's name must not answer it in two shapes, and it named two
      — this page was the third, and the only one a stranger sees.
- [x] **Send it on that page is the entry's squared tag.** `Chip` took a `type`
      so a form can own one; every caller that passes none draws as before.
      **Open:** the beacon no longer has a tag on it, so that button is now
      matching something that moved. Walk the path before deciding.

**What was tried and is not there.** Four box shapes in a day, in order: the
card's filled pill, two bare mono lines, the entry editor's round `.ln-flag`,
the entry's squared `Chip`, and a hairline divider between the two words. All
out. See DECISIONS — nothing on that floor is a box. The `.ln-flag` promotion
to base.css was reverted with them; it is an entry's again.

**Also tried and out:** the taller centred signature — face over name over
words. Better-looking and it does not fit: 143px against the row's 44, and on
a 375x667 phone both words fall 55px below the screen.

**2026-09-18 — one beacon, two sizes. Branch `nothing-required`.** The first
half of the header brief below, taken on its own because it needed no
restructure: the three drawings of the beacon were made into one.

- [x] **The small beacon is the session's, drawn in the nav bar.** Not a
      lookalike. The bar renders `.ses-head-beacon` in the session's own
      classes, so there is one set of styles and the two cannot drift. The
      `.hn-bar-cover / -said / -album / -artist` set is gone; what is left in
      nav.css is where it stands.
- [x] **All three say the same four things.** Cover, caption, record, artist.
      The bar had no caption and the session had no artist, so a record
      crossing between them lost a line each way.
- [x] **No caption on the large beacon while it is live.** "There doesn't need
      to be a Now logging line. The green dot and the coloured album is enough."
      It is: full-colour art, deeper shadow, the lit dot on the mark. Idle, it
      keeps its words on the cover where they always were.
- [x] **`Logging`, not `Now logging`.** One word beside a dot that already
      means now.
- [x] **The small beacon carries its own dot**, because it has no mark beside
      it to light: a green breathing dot and one word, `LOGGING`, centred over
      the record. Two dead ends first — the words at 4px on the mini's cover
      ("that's gotta go"), and a green hairline under the header, which she
      read exactly right: "I don't like the line, it's not instantly
      recognisable." A line at the edge of a band is a border until somebody
      tells you otherwise; a green dot here is one thing only.
- [x] **Idle, the small beacon shows nothing but the greyed cover.** No dot,
      no words. It says the listen is over before you have read anything.

### The way into a listen, rebuilt

- [x] **The button moves out from under the artist and becomes a mono line
      under the recents.** Miyel's brief, 2026-09-18: "every other control on
      this screen is either an icon or a mono caption. A bold sans button with
      an arrow is the only thing in a different voice, and it sits where the
      artwork needs to travel upward."

      A PlayCircle glyph at 17px, then the words, in DM Mono 12px uppercase at
      0.22em — the caption face. What separates it from LAST LOGGED and BEFORE
      THAT is not its shape but full ink where they are muted, which is what
      makes it read as the one pressable thing rather than a third label. 44px
      of thumb out of padding, no border, no pill, no background. The arrow is
      gone; the glyph does that job. Hover and press go to `--lift`, a new
      token that is white in the dark and black in the light — everything else
      on this screen dims on hover and this one is already the loudest thing
      on it, so it had nowhere to go but brighter.

      **Both states moved**, not just one: a record in hand and it is the way
      back to it, nothing in hand and it opens the picker. They are one control
      and leaving one under the artist in bold would be two sets of clothes for
      one job.

      **And it does not fit a 667px phone on the gaps alone.** Measured — the
      control ran 594→638 against carets at 590 and a footer at 613, and
      closing the gaps above BEFORE THAT (the brief's own instruction) got it
      off the footer but left its ink at 591 sitting *on* a caret at 590. The
      last 20px comes from the crown, at `max-height: 700px` only: 0.24 of the
      height instead of 0.28, which is a logo 20px smaller on an SE and no
      change at all on anything taller. **The art is untouched at 180px**,
      which is what the brief asked to protect. Clears by 25px now.
- [x] **The bar's beacon is tighter, and END? is smaller.** The boxes were not
      actually overlapping — 12px of clearance, measured — but it read as a
      collision anyway, because the title in that slot is usually *mid-marquee*
      and a word cut off at both ends looks like text running into whatever is
      beside it whether or not it is. What a clipped word needs is not a
      hairline of clearance but visibly empty space to be clipped against.
      **One width, not two.** The first fix narrowed the beacon only while the
      word was up, and that made it *condense on itself* the moment the × was
      pressed — the one thing this row must not do. So the room for the word is
      always there whether the word is or not: `100% - 190px`, which is the
      word's 76 plus a 19px gap, doubled because the beacon is centred on the
      screen and pays for its widest corner on both sides. The widest corner
      was never the mark; it is the word the mark turns into, which is what the
      original 150 never accounted for. Measured at 375px: the beacon is
      `[95, 280]` resting and `[95, 280]` armed — identical, cover and all.
      **A still row is worth more than a still title.**

      The word is `END`, 15px, no question mark. It read `END?` at 17px for an
      hour; dropping the mark was Miyel's own answer to the scrolling — "drop
      the ? so it scrolls less" — and it is ten pixels off the corner, twenty
      off the doubling, and twenty onto the title's slot: 129px of room at
      375px rather than 109. A long title still marquees, with a shorter lap
      and a longer hold, and it now shows from its beginning rather than
      sitting mid-scroll — which was most of what made it look like a collision
      in the first place.
- [x] **`ListeningBeacon` lost its `children`.** That was how the control got
      under the artist; nothing passes it now, so the prop and the two places
      it was drawn are gone. The component draws a record and nothing else.

### The save is a cutaway

- [x] **Saving takes the screen down to the journal, files the record in, and
      comes back.** Miyel, 2026-09-18: "have the screen show the journal during
      the save process and just show the album file into the grid, then the
      screen returns to the session drafts. It's like a cutaway but not fully
      leaving."

      The cover used to fall out of the beacon toward the wall — and the wall
      is floor two, which while a record is being chosen is where the *picker*
      is standing. So it fell at a target that was `display: none` and what
      there was to see was a cover dropping off the bottom of the screen.
      Going to the wall answers it and is less machinery, not more: the wall
      does not have to be found or aimed at, because it is what you are
      looking at. `wallLanding`, `dropStyle` and `FALL_MS` are gone.

      **The order had to be measured.** Asking for the wall at the moment of
      the save — the first try — meant the record filed itself in while the
      pane was still travelling: the scroll takes about a second and the filing
      was over by 1.5s. So the wall is asked for when the pane *arrives*, and
      the pane says when that is (polled, capped by `ARRIVE_MAX_MS`) rather
      than a timer guessing at a smooth scroll's duration.

      **Slowed on purpose, 2026-09-18:** "sloooow it all down, it should feel
      intentional." The scroll is run here rather than handed to
      `behavior: 'smooth'`, whose duration belongs to the browser and depends
      on how far it is going — about a second on a phone-sized pane and a blink
      on a desk, so there was no number to slow and the same save felt like two
      different things on two screens. `DOWN_MS` and `UP_MS` are 1200 each,
      `WATCH_MS` 1300 after the record lands.

      **The snap had to stand down for any of it to work.** This pane snaps to
      a floor, and a snapping scroller does not hold an in-between position:
      every frame the slide set was pulled to the nearest floor, so what looked
      like a slide was the pane sitting at 0 and jumping to the wall as the
      halfway point went past. Measured — asked for 221, got 0; asked for 514,
      got 987.

      **The hold starts when the record lands, not when the pane does.** Asking
      for the wall is a fetch and took about a second, so a watch begun on the
      scroll's own end spent itself waiting for a tile that had not arrived and
      left half a second after it did.

      Measured end to end: sheet gone by 400, down the wall 600→1700 (`7, 96,
      374, 775, 950, 987` — slow out, quick through, slow in), the record files
      in 2800→3600, back up 4400→5200. The picker is there the whole way,
      search and all.
- [x] **The wall arrives clear.** The filter bar stands down for the length of
      the cutaway, on the same clock and in the same way the footer and the
      carets already do while a record is being chosen — opacity, because
      `display` cannot be transitioned and the wall must not jump as it opens.
      "It should all be clear since there's no footer either."
- [x] **One speed for the wall rearranging**, whichever way it goes: `FILE_MS`
      is 700 and the tile's own shrink and grow are 520 and 620. "Match the
      file-in speed of deleting" — they were one number already, so slowing the
      arrival slowed the deletion with it, which is the point of it being one
      number.
- [x] **The wall is asked for at the save, not on arrival.** It is a fetch and
      took about a second, so the pane reached the journal and then sat there
      waiting — a stall in the middle of a cutaway, which is the one place
      there is nothing else to look at. `fetchEntries` is now separate from
      `askEntries`: the answer is held in a ref from the moment of the save and
      applied when the pane gets there. Measured: the record is on the wall and
      landing the frame the pane arrives, at 1700ms instead of 2800.
- [x] **The wall goes back to its own top first.** Floor two has a scroller of
      its own and the newest record is the first tile in it, so a wall left
      scrolled down meant arriving in the middle of the journal with the record
      filing itself in above the fold. Measured at all three densities — the
      first tile is off-screen at every one of them if the wall was left down,
      and at `top: 96` after the reset. It bit hardest on the two-column view
      because that is where the wall is tallest: the same wall is 1464px at
      four columns and **5928 at two**, so that is the one you are likeliest to
      have scrolled. `goUp` already did this by hand on the way back from the
      wall; the cutaway did not.
- [x] **Choosing a record clears the picker.** The search that found it, the
      results under it, and any armed discard all go the moment it is taken —
      so whatever happens next, posting it or pulling out of the listen, you
      come back to the blank screen the picker is supposed to be. Miyel,
      2026-09-18: "coming back should act as a new choice… it could even be
      cleared when a listen is selected, not just on post."

      On selection rather than on the return, because that covers both ways
      back with one rule. It has to be said out loud at all because **nothing
      ever unmounts the picker**: the session is a sheet over it and the
      cutaway is a scroll past it, so the picker you come back to is the same
      picker with everything you left on it. Backing out of the picker without
      choosing still keeps your search, which is right — that is not a new
      choice, it is the same one interrupted.
- [x] **The picker hears about a posted listen.** Publishing deletes the draft
      — both copies, `finish()` in useSessionDraft — but it shouts `SAVED_EVENT`
      and the picker only listened for `PENDING_EVENT`, so the record you had
      just posted was still sitting under Unfinished when the cutaway put you
      back. It was gone from the server the whole time; the list had not been
      told.
- [x] **Journal files an arrival the way it closes a deletion.** Same
      machinery, run backwards: every tile measured before the new list lands,
      put back where it was, let go. The newcomer grows in on a 210ms delay,
      into a gap that is still opening.
- [x] **`positions()` measures from the grid, not the viewport.** It used
      `getBoundingClientRect`, which is viewport-relative — and the cutaway
      scrolls a whole pane between the record being saved and the record
      arriving, so every tile would have read as having moved by the scroll.
      `offsetLeft`/`offsetTop` do not care. The delete path was always within
      one frame and is unaffected either way.

### One way of asking, everywhere

- [x] **The entry toolbar's Delete says `Delete?`**, not `Sure?`, and a press
      anywhere else takes the question back. Miyel, 2026-09-18: "have it say
      the same as drafts — it changes to Delete?, a double check. But a click
      away anywhere should unclick delete."

      That is now the site's one shape for an irreversible press, in three
      places built a few hours apart: the draft's long-press (trash over
      `DELETE` on the cover), the picker's × (turns into `END?`), and this. All
      three arm on a press, say what they will do rather than asking whether
      you are sure, and disarm on a press anywhere else — captured at the
      document, with the control itself excepted because a press there is the
      yes.

      Here the exception is the **button**, not the whole row: pressing another
      tool is a reasonable thing to do with the tools open, and it should take
      the question back rather than put everything away.

### Sliding through a record

- [x] **The strip is slid along, not only tapped.** Press it and drag, and the
      track under your finger is the one on screen — note, stars and heart
      following. Miyel, 2026-09-18: "smooth scrolling across the track horizon
      builder, to scroll through tracks the same way you can lock and scroll
      through stars, without switching screens." It is the answer to long
      tracklists as well: at fourteen tracks a column is a few pixels wide and
      a finger is not, so sliding beats aiming.
- [x] **The same guard the stars have.** A drag that begins on the strip is the
      strip's: it must not also turn the page or pull the sheet down. The stars
      say that with `role="slider"`; a tablist cannot claim to be one, so the
      strip says it with `data-slide`, and both guards — the session's swipe
      and the layer's pull — now honour either.
- [x] **The card does not play its turn while a finger is moving.** It is keyed
      on the track, so sliding remounts it once per column, and a dozen 300ms
      slides milliseconds apart is a strobe rather than a movement.
      `.ses-turn--still` for the length of the drag.
- [x] **Overshooting either end stays on the record.** Past the last column is
      the last track, not the album notes. Leaving the list is what the carets
      and the swipe are for; a gesture that overshoots is not a decision.
- [x] **Columns are measured at the press**, not worked out from the geometry —
      the strip has a 26px indent, a 3px gap and `flex: 1` columns, and the
      arithmetic would be three numbers kept in step with a stylesheet by hand.
      Rects give the gaps for free: a finger between two columns is inside
      neither, and whatever was open stays open rather than flickering.

### One cross, on the picker and nowhere else

- [x] **Manual entry takes a cover, and says what it will cost.** A record
      typed in by hand is one nowhere has — a small press, a Bandcamp release,
      a tape — so nothing can be looked up for it, and it is the only record on
      the site that has to be told where its cover lives. Not required: a
      listen has had no requirements since this morning, and a beacon with no
      cover draws its own quiet square. But it is asked for on the form rather
      than discovered as a blank square afterwards, and the form says outright
      that the tracklist will have to be typed in. That screen already existed
      ("No tracklist found for this record" → *Type them in*); what was missing
      was knowing before you started.
- [x] **The long-press delete is the toolbar's trash over DELETE**, on a red
      field over the cover and nothing else, with the name and the artist left
      alone underneath. `SURE?` → `DELETE DRAFT?` → `DELETE` in one afternoon:
      the middle one for being unambiguous and the last for being short, and
      the glyph above is what lets it be both — it says what, so the word only
      has to confirm it. `.ses-tile-art` was not a positioning context, so
      the field had been reaching past the cover onto the text — 174×214 over a
      174×174 cover. Wraps to two lines at 96px, which is a phone's three-across
      grid.
- [x] **A press anywhere is the no.** Pressing another tile already answered
      no; the rest of the screen was dead, and a question you can only answer
      by finding one of two right places to press has taken the screen hostage.
      Captured at the document, so the state is clear before the press reaches
      whatever it landed on — with the armed tile itself excepted, since a
      press there is the yes.
- [x] **The picker's × turns into the word and goes.** Press the mark: it
      turns ninety degrees, shrinks away, and leaves **End** standing exactly
      where it stood, at 17px — the size the × was drawn at. A press anywhere
      else turns it back into a plain ×.

      It was a *pair* for a day — the × staying put with the word budding out
      of its right-hand side into the gap before the beacon — and that is what
      kept the word at 10px, because 68px of gap was all it had. Miyel: "have
      the × turn into the End button… it can move out and leave the End as the
      only button. That allows End to be bigger font, should match × size."
      One control at a time, in one place, so the word gets the whole corner.

      Measured at 375px: the × box is 28→64, End runs 28→78, and the beacon's
      cover starts at 134, so 56px of clearance. The beacon does not move.
      **The word's slot is `pointer-events: none`** — it is a positioned box
      sitting on the mark, and without that it swallowed every press meant for
      the ×, which did nothing at all. See the Gotcha.

      **The face is the first edition's**, said outright rather than inherited:
      DM Mono, uppercase, 0.1em — the site's label face, which is what this was
      at 10px in the gap beside the mark. Only the size changed. It rendered
      sentence case for ten minutes because browsers reset `text-transform` on
      form controls in their own stylesheet, so the row's `uppercase` reached
      it or did not depending on the browser. The word is `--ink-soft`, the
      mark's own colour — full ink at 17px is a heavy thing to put in the
      corner of a screen you are choosing a record on.
- [x] **The beacon gives the corner up while the word is showing.** `END?` is
      92px wide against the mark's 64, and the bar's beacon is centred on the
      screen with a `100% - 150px` cap — so at 375px a record with a long name
      put its cover at x=75, under a word ending at 92, with the beacon
      painting over it because it is the positioned one. While `--sure` the cap
      is `100% - 208px`, which is the word's 92 plus a 12px gap, doubled
      because it is centred. Costs nothing the rest of the time and only moves
      a record already at the cap. Measured: cover at 104 armed, 75 idle.
      **The word is sentence case on purpose** (`text-transform: none`, set
      explicitly): browsers reset text-transform on form controls in their own
      stylesheet, so it was inheriting the row's `uppercase` or not depending
      on the browser — and END at 17px is a shout where the × was a mark.
- [x] **The listen closes on the pull; the picker keeps its ×.** Both crosses
      came off first — "I don't have them anywhere else on the site, and
      swiping down is intuitive since the screen comes up" — and one went
      straight back: "from beacon to session the swipe down feels too easy to
      close, we should keep it gated behind an ×… I meant the × on the actual
      picker screen and NOT on the notetaking screen."

      The dividing line is what a stray pull costs. On the listen it costs
      nothing to speak of: it is notetaking, it saves as it goes, and the draft
      is written on the way out. On the picker it throws away a half-typed
      search and puts you back on the beacon you just left. So the picker is
      the one screen on the site with a close button, and the listen has none.

      **Built backwards first**, on a misreading of "the session" as the listen
      rather than as the screen you enter from the beacon — the × went on the
      listen and the picker got a pull. Reverted whole (`git revert`), which is
      why `byHand` on LayerEntry exists in the history and not on disk.
- [x] **`useBeforeLeaving`, in LayerEntry.** The pull could not close a listen
      safely on its own — a listen has to write its draft to the server first,
      and a write that fails has to leave the sheet exactly where it is, which
      is what the × guaranteed. A page now registers what has to happen first;
      a false answer stops the sheet. Nothing that does not register one is
      affected. Every way out goes through it: the pull, Escape, the back
      caret on a desk.
- [x] **The standalone /session page keeps a way out.** Opened cold there is
      no layer and so no pull, and the listen has no × — without this there
      would be no way out at all. Its own downward swipe from the top calls the
      same `leave`, which writes the draft the same way. `useBeforeLeaving`
      returns whether there is a layer, which is how the page knows not to do
      the job twice.
- [x] **The picker does not close on a pull**, deliberately. It had one for an
      hour and that is exactly what was wrong with it.
- [x] **The drafts file across and the new one grows in.** "A new draft files
      all drafts across the screen and the new draft appears." A FLIP, because
      a CSS grid cannot be transitioned — every tile is measured before and
      after, put back where it was and let go over 420ms. The newcomer is the
      one tile with no previous box; it grows in on a 280ms delay, into the
      slot the others are still clearing. Measured: tiles held at
      `translate(-184px, 0px)` — exactly one column — then `transform 420ms
      cubic-bezier(0.22, 0.61, 0.36, 1)`.
- [x] **The picker asks for its drafts again when a listen is put down.** It
      fetched once on mount, which was right while it was a page you arrived
      at and wrong now that it stays mounted underneath the listen for the
      whole listen: the draft a session left behind never reached the grid,
      because nothing re-ran. It listens to `PENDING_EVENT`, the same shout the
      desk has listened to since 2026-09-16 and for the same reason.
- [x] **Long titles scroll again.** `MarqueeTitle` is back — restored from
      before 2026-08-28, not rebuilt — on the small beacon's title line, in a
      190px slot (the old compact beacon's own cap). Seven seconds on the first
      character, then one lap of the title plus a 48px gap at 18px/s, at which
      point the second copy is standing exactly where the first started, so the
      cycle restarts on an identical frame and there is no return journey to
      watch. Measured on a 407px title: 7.0s hold, 455px lap, 32.3s cycle,
      identical in the bar and the session. The large beacon still wraps to two
      lines and always should — it has a whole screen to be tall in.
- [x] **There is no transition, because nobody can see one.** The end of two
      days of trying to hand one record over to another in front of somebody.
      Miyel: "it might be as simple as this — when you choose an album from the
      selector it simply comes up over the screen without the old beacon
      changing; on dragging down it basically leaves the new one behind." And
      then the three words that settle it: **"you don't see the transition."**

      The sheet covers the whole screen. Everything tried since 2026-09-17 —
      the record flying up from the tile, the aperture closing on one cover and
      opening on another, the cross-fade, the two beacons measured to a tenth
      of a pixel so the seam would not show — was staging for an audience
      behind a curtain. The sheet goes up over a bar that has not moved; the
      bar becomes the new record at `BEHIND_THE_SHEET_MS` (460ms, the layer's
      420ms rise plus margin); pulling down reveals it. Which is also what
      putting a record down means.

      **On a clock for an hour, and the clock was wrong.** Miyel: "let the
      selection screen delay the change, I shouldn't see it change at all — it
      will have to change after the notetaking session has opened all the way."
      The sheet exists in the DOM the instant it is pushed and then spends half
      a second climbing, and it climbs from the floor — so the bar, at the top
      of the screen, is the *last* thing it covers. Measured, the sheet's top
      edge: 841 → 635 → 414 → 259 → 178 → 103 → 54 → 30 → 10 → 1 → 0, reaching
      the top at ~780ms. A timer set to the layer's 420ms would have swapped
      the record while the top hundred pixels were still open.

      So the sheet says when: its own `animationend`. Exact on either layout
      and at either duration (420ms `layRise` on a phone, 620ms `layRiseTall`
      on a desk), with no number to get wrong. `BEHIND_THE_SHEET_MS` is now
      only a backstop for a sheet that animates not at all — reduced motion.
      Measured again: the bar holds last night's record for the whole climb and
      turns over on the frame the sheet lands.

      On the way out the sheet goes at 320ms with the bar unchanged the whole
      way — nothing to see at either end. `announce()` is untouched and still
      fires at the press: that is the *public* beacon, and it should be true
      the moment it is true.
- [x] **A dull record stays dull in the air**, on the one flight that is left
      — the card shrinking into the bar. The flier is its own `<img>`, neither
      of the two covers, so it drew in full colour between a greyed card and a
      greyed slot: pressing *Start a listen* made last night's record flare
      and go out again. Measured across the whole 620ms, grey on every sample.
- [x] **CAPTION lives in `hooks/useListeningBeacon.js`**, with the states it
      names, rather than in one of the three components that draws them.
- [x] **The artist scales instead of changing voice.** DM Mono 10px in the
      small beacon and Nunito 13.6 on the card; now Nunito 8.5, which is the
      card's 0.625. The caption above it does not scale — a label is DM Mono
      at 9–10px everywhere on this site, and five eighths of that is 6px.
- [x] **The handoff is exact.** Measured with both on screen: cover
      `[229.8, 14.4, 44, 44]` in the bar and `[229.8, 14.4, 44, 44]` in the
      session, same caption, same record, same artist. It was two pixels out
      vertically because the bar hard-coded the 12px inset that
      `.ses-head-in` only uses on a desk — it is 10 on a phone.

Still open from the evening: the words do not yet travel with the cover into
the session (deferred — "it's fine for now, we can figure that out later"),
and the restructure below.

**2026-09-18 — the beacon becomes the listen. Branch `beacon-listen`, 48
commits.** Miyel's beacon brief, built from her phone against the dev server
over one long session, plus everything the testing turned up. Version 1.25.0.

### The brief's four items

- [x] **The quiet line.** The beacon out of session is the last record sat
      down with, greyed, with `LAST LOGGED` over the art rather than above it.
      One state, not two.
- [x] **Choosing on the pane.** A record flies out of the picker into the
      beacon slot, lights, and the session opens over the top of it. The
      deciding happens in the picker, so by the time a record is in hand the
      choice is made — which reverses "a record with no track chosen yet is
      not a beacon" (DECISIONS, 2026-09-15), as the brief said it would.
- [x] **The live strip.** Every record in hand is a beacon now; the album
      screen's needle gate is gone.
- [x] **The drop.** Saving closes the layer, the cover falls out of the beacon
      slot into the wall, and the slot refills captioned `LAST LOGGED`. Run
      for real on 2026-09-18 and it worked first time: "the closing animation
      was great! it said last logged perfectly."

### Then the session itself

- [x] **A × at the top left that becomes Save draft.** The second press says
      what it will do rather than asking whether you are sure.
- [x] **The stars are a drag, not an aim.** One row, slide along it, half
      steps. Replaces five stars each split down the middle, where the real
      target was seven pixels against the forty a fingertip covers. The
      revealed average draws *into* the row — an unrounded ghost fill and an
      exact tick — so a 4.89 reads as very nearly five instead of dwindling
      to 4.5, which is the one reading that would have changed her mind.
- [x] **A drag that begins on the stars belongs to the stars.** Both the
      track swipe and the step swipe are locked while a rating is being set.
      The row says what it is with `role="slider"`, so nothing has to know
      where the stars are.
- [x] **The keyboard stops throwing the screen about.** Insets applied
      unconditionally rather than against a threshold Safari holds still and
      a PWA does not, and the pull-to-close guarded on `document.activeElement`
      so a swipe down to dismiss the keyboard no longer closes the listen.
- [x] **The marks are a glyph over a word, not a pill.** Four times the mark
      they were, and it is the thing itself that grew rather than a box around
      it. Formative is `weight="bold"` — Phosphor's filled Fingerprint is a
      solid pad with the ridges knocked *out*, so filling it painted the
      background and left the print as gaps.
- [x] **The foot of a step screen is bare.** The forward-arrow links went, the
      carets came out of their pills, and the preview's two ways out became
      the entry's own editing bar: `PREVIEWING · Go back · Save to journal`,
      the same numbers, the same pins, no glyphs.
- [x] **Trouble**, Miyel's name, replacing three `window.alert()` calls.
- [x] **The track title shares its line with its marks**, title left and stars
      right, the way every other page of the site lists a track.

### And the entry page, from the same testing

- [x] **Delete asks on the button.** First press turns it into `Sure?`, second
      deletes. It used to open a correction with the warning at the foot of a
      page-long form.
- [x] **Deleting no longer freezes the app.**
- [x] **A deleted record is watched off the wall** — the tile shrinks where it
      stands and the rest file across.
- [x] **The listen outlives the post** (`sat_with`, migration 020).
- [x] **Masterpiece only shows when it is earned** — every track rated, every
      rating five.

### Migrations

017 and 018 (`drafts.step`, down and back up), 019 (`drafts.rating` → `real`),
020 (`sat_with`). All four applied here and verified.

**The contents screen — built 2026-09-18 from Miyel's brief.** Tracks opens on
the record's contents now: the strip, the facts, the tracklist. The Overview
is gone with it, so the steps are **Tracks · Album · Preview**.

Names, hers: no heading on the screen; the foot reads `Start with <first
track> →`; the file is `steps/RecordContents.js`.

**Where the facts come from.** One iTunes lookup already carried both the
songs and the album row; the album row is read now instead of thrown away.
Released, genre and label come off it. The count and the runtime do *not* —
they are the tracklist said another way, and a number kept in two places can
disagree with itself. The label is parsed out of the `copyright` string, which
is messier than it looks: King Krule's real one is `℗ 2011 King Krule under
exclusive license to True Panther Sounds`, so everything before the licensing
clause is the rights holder and the label is what follows. Checked against
eight real strings; an unparseable one returns empty and the row is dropped.

**Two deviations from the brief, both deliberate:**
- The list does not scroll inside its own box. The strip and the facts are
  `position: sticky` instead. A box that scrolls inside a sheet that scrolls
  is two answers to one drag, which this session already has a scar from (the
  rail lock note in nav.css).
- The picked cover's flight lands in the header's mini beacon rather than a
  cover on this screen, because the brief says there is no cover on this
  screen and the old destination went with the Overview.

**Overview went back to being a step an hour later**, and the reason is worth
keeping because it is not about the shape: *"I do miss scrolling horizontally
through tracks and between steps."* Folded into Tracks it was a face, and a
face is not a step — a swipe cannot reach it, and a screen you can only get to
by pressing its name is not on the same footing as the ones either side of it.

**And the strip came off it.** The brief opened the screen with every track as
an empty slot at full height; on the screen that read as a horizon chart with
no data in it. Miyel: *"remove fake horizon from overview."* A horizon is a
picture of what you thought of a record, and its empty frame drawn before you
have heard a note is a chart pretending. The strip is back in TrackNotes with
one caller.

**Two migrations about the same number, and both belong.** `drafts.step` is an
index into SESSION_STEPS; the count went four → three → four in two hours, so
017 shifts every draft down and 018 shifts it back. A copy that receives both
in one update nets out at no change, which is correct — nothing happened to
those drafts. This copy got them an hour apart, which is also correct.

**Still owed:** the arrival animation has not been seen — it plays once per
record per session and every draft here had already arrived. Worth watching on
a record picked fresh.


**The research and the question mark are retired, 2026-09-18.** Miyel's call:
*"I really like the research feature and asking questions while I listen, but
I also just have a phone, and I guess I can just do that on my own."* Both
prompts are in **docs/RETIRED-PROMPTS.md** with the reason — that file is the
point of the retirement, because the prompts were the work.

What went: `AskSheet`, the `?`, the briefing on the album screen and its
typing reveal, `/api/ask`, `/api/research`, `library/ai_integration.js`, the
research and chat state in `useListeningSession`, `research_available` on the
bookplate, the Anthropic row in Settings, and the `@anthropic-ai/sdk`
dependency.

What stayed, and why: the `briefings` table and `secrets.anthropic_key`,
because the schema is additive-only; `library/secrets.js` still resolves the
key, which is what a retirement is — the plumbing stays and nothing is
connected to it.

**One trap in the way.** `format_post` lived in `ai_integration.js` and is not
an AI call at all — it is the local assembly of an entry, and deleting the
file took `/api/format` with it. It is in `library/entry_formatter.js` now,
which is where it belonged: that file is the shapes an entry is written in.
A build caught it; lint did not.


- [x] **The stray database `ep-old-sea-am0rc38b`** — it was the `dev` branch; deleted in the Neon console 2026-09-06. What it was: A copy of the live one,
      written to from localhost for four days. Find it in the Neon console —
      likely a branch or a second project — and delete it once nothing there
      is wanted. It holds the September 2 essay draft and possibly `secrets`
      rows from a rehearsal. The live database has zero `secrets` rows, so
      the live site still signs in with the environment's `SESSION_PASSWORD`.


**2026-09-17 — the entry's six tools. Branch `entry-tools`.** Item 3 of the
four-tabs brief, plus a sixth tool and four renames Miyel added while looking
at it. The ··· carried Edit, Print and Delete; it carries **Share · Edit ·
Credit · Send · Relisten · Delete** now, each a glyph over a word, Share
nearest the door.

- [x] **Six tools**, filing out nearest-first, the conveyor untouched. A menu over the page stays ruled
      out (DECISIONS, 2026-09-15) — the row becomes the menu, as it already
      did at three.
- [x] **Words appear at four tools, not on a particular surface.** Driven off
      the count, so it cannot drift: the card's two stay glyphs, because a
      pencil and a printer in a corner are learned in one press. Five cannot
      be, so five say what they are — the same glyph-over-a-word the band at
      the foot uses, so nobody learns a second vocabulary.
- [x] **Measured at every step, which is what the brief asked for, and it
      caught two things reasoning would not have.** Five tools at 54px came to
      318px of a 375px row; a sixth would have been 374px against 355px of
      room, so the boxes went to 46px (40px under 360px) and six now span
      326px with 10px clear, 290px with 10px clear on a 320px phone. Three
      things had to move: the mark's column **collapses** rather than merely
      fading, since it was still holding a logo's width; the row's 28px side
      padding drops to 10px while the tools are out; and **the grid's two
      column gaps had to go with it** — 0 + 10 + 0 + 10 + 290 is ten pixels
      more than a 320px phone's content box, which put the row flush against
      the edge of the screen. That one only ever showed at 320.
- [x] **And the words were checked, not assumed.** *Log again* measured 44px
      inside a 46px box — two pixels across both sides, which never wrapped
      but would have touched its neighbours on a device rendering Nunito a
      hair wider. *Relisten* is 36.7px, so the slack came back.
- [x] **The travel distance is a variable now.** `--kt-box`, because the
      keyframes had 38px written into them — right for a 36px square and wrong
      for a labelled tool, which would have made the tools stop appearing to
      come out from behind the mark.
- [x] **The packing-up clock is worked out from the count.** It was a flat
      320ms, right for three and silently wrong for five: the furthest of five
      finishes at 422ms, so the last two would have blinked out mid-stride.
      Derived from the same rule the animation uses, so a sixth cannot break
      it quietly.
- [x] **Relisten is new**, and it is the one tool here that makes something
      rather than changing it: an album has many listens, numbered from the
      entries that exist, and this starts another rather than editing this one
      (DECISIONS). It writes the record to `ln_pending_session` and opens the
      listen, the same key and the same way the inbox picks a send up. It
      deliberately carries the art, year, genre and collection id but **not**
      the type or the credit — where a record is from is decided by how the
      listen started, and this one started in the library. The glyph is a page
      with a plus on it (Miyel): a repeat arrow would say the record is going
      round again, and a new page says what is actually being made.
- [x] **Four renames, Miyel's, all on 2026-09-17.** *Correct* → **Edit**, now
      that Relisten gives revising its own door and Edit stops inviting the
      thing DECISIONS guards against. *Print* → **Share**, with the phone's own
      share glyph, because Print described the mechanism and nobody prints
      anything — recorded in DECISIONS as softening the 2026-08-28 split rather
      than undoing it. *Sent by* → **Credit**, a verb among verbs and already
      this site's word. And the new one went *Log again* → *Revisit* → *Relog*
      → **Relisten**, which is the word DECISIONS already used for it.
- [x] **The glyphs went up to 22px**, the ··· 's own size, once Relisten's
      shorter word gave the room back. Miyel asked for the bigger marks.
- [x] **Send's paper plane became an envelope**, and that was the real fix for
      Miyel's worry that Send and Share would be confused — "how do people
      know it means the album and not the album review?". The word was never
      the problem: a paper plane is what every chat app uses for *transmit
      this*, so beside the share glyph both tools read as the same verb with
      no way to tell which object each meant. A gift is a thing given to one
      person, which sharing is not — and it is already the mark this site puts
      on a record that arrived that way (DECISIONS, 2026-09-13: a sent record
      wears an envelope), so pressing it is what makes one appear on their
      journal. `EnvelopeSimple` rather than the `Envelope` those marks use,
      because Envelope is also the Inbox door and a tool that sends should not
      wear the mark of the room things arrive in. A gift was tried first, on
      the strength of "a send is a gift, not a form" (2026-08-29), and Miyel
      picked the envelope. The same glyph goes on the sheet's own button and on
      the address book's rows, because it is one act in three places.
      **And the honest part of the answer:** people learn it from the sheet,
      not from the row. Press Send and the screen is the album, faces, and
      "What should they listen for?" — nothing about your writing. Guessing
      wrong costs one dismissable tap, because the sheet does nothing until a
      person is chosen and a button with their name on it is pressed.
- [x] **Credit left the correction** and is `SenderTool.js`. It unfolds in
      the slot its answer prints in, under the chips — DECISIONS says a form
      belongs next to its subject, and that slot is the subject. It takes the
      slot whether or not there is a line there yet, because an entry with no
      sender is exactly when somebody reaches for it. It saves itself with a
      partial patch rather than borrowing the editor's draft, which would have
      put the whole page into correction mode to change one field. No date is
      asked for (DECISIONS, 2026-09-14) and free text stays for somebody
      without a copy.
- [x] **Send opens the sheet `send-from-home` built**, with this record
      already in it. The two ways in differ only in which half is answered
      before the sheet arrives. Mounted at the foot of the page rather than
      inside the tools, which file themselves away the moment one is pressed.
- [x] **Delete still opens the correction's own confirmation** rather than
      acting, unchanged.

**Four things off Miyel's first real look at Credit, 2026-09-17, all fixed the
same day:**

- [x] **The layer was still browsing to the next record while Credit was
      open** — "I can't scroll through my friends because it moves to the new
      album". A real bug and the brief's own warning: the row of faces scrolls
      sideways and the sheet under it took the drag. The guard already existed
      and its comment already described this exact case, written for the row of
      faces on 2026-09-14 — taking Credit out of the correction took it out
      from behind `.ln-editing` and so out from behind the guard. `.ln-busy`
      now covers it and the send sheet, and the lesson went into the comment:
      that list is not about *editing*, it is about anything of this entry's
      own being open over it.
- [x] **The box is gone, and so is the motion.** "It doesn't need the box, and
      the screen moves a lot when I click this" — one complaint, not two. A
      bordered card is a second object arriving where a line used to be, and
      the taller it is the further it shoves the reading below it; the arrival
      animation was adding six pixels of travel on top of that.
- [x] **An entry that already names somebody opens on the one question worth
      asking about it** — a real checkbox reading *Show their name on this
      entry* — rather than loading the book and putting a field and a row of
      faces on screen to answer it. Changing who is a second press. That is
      most of the height gone as well, which is most of the movement.
      Note the toggle reads the way somebody thinks about it: the column is
      `credit_private` and the stored value is the negative one, and the
      question on screen is not.
- [x] **The book stays open while you change who.** The faces narrow to what
      has been typed, which was right while searching and wrong the moment the
      picker opened on a name already there — it showed the one person already
      chosen and hid the book you opened it to browse. It narrows on typing
      now and never on what it was handed.

**A track opens on its own screen to be rated — the dial, 2026-09-17.**
Growing the hit areas (below) fixed the *missing* and left the other half of
what Miyel named: "it's still really easy to mis-click a half star and not
really see it." **A target you can hit is not a value you can see** — at 14px,
three and a half stars and four are the same picture at arm's length, and the
only way to check your own answer is to lean in.

So the row stopped being the control. Pressing the stars **or the heart** opens
`TrackDial.js` under that track: 44px stars where half of one is obvious, the
number spelled out, and the heart above it as its own pill — a different
question, and not one to answer on the way past. Both controls are doors now;
one row used to hold two different promises about what a press does.

**It unfolds in the row. It was a centred sheet over a dimmed page for about an
hour** — Miyel: "is there an option that feels more seamless and built in other
than a pop up modal?" — and DECISIONS had already answered it twice, the second
time about this exact place: *"a control opens where it belongs, not floating
in the middle of a darkened screen — twice in a week a popup was built and
taken back out, so it is a rule"*, and *"pushing content down is not the
problem to avoid. **A form unfolding in the tracklist shoves everything below
it down.** That is what leaving room for something looks like."*

The unfold is also simply less machinery: no scrim, no fixed position, no
stacking context to fight. **Everything the modal needed to work around went
with the modal** — the portal out of the scroll container, the z-index against
the layer, the rendering beside `.ln-screens`. Only `.ln-busy` stayed, because
a drag across stars is still a horizontal gesture. Measured: opening one row
took it 145px → 352px and left its neighbours alone.

**Nothing reaches the row until it is accepted.** Dragging used to rewrite the
track live, which meant opening one to *look* at it was already editing it —
Miyel: "I'm not actually trying to edit these, I'm trying to make sure I don't
change anything." So two values sit on screen at once: what the track is, still
up in its row, and what it would become, four times the size underneath. A
tick and a cross, top right, settle it. Proved: dragged to 4.5 and unloved with
the row still reading 3♥; the cross left it at 3♥; the tick wrote 4.5.

**The tick is not Save, and must never read as one** — it settles this track's
stars into the correction being written, and the entry is still saved by the
bar at the foot like every other field. That is why the pair are small and
quiet rather than a second Save competing with the real one.

**It is the row magnified, not a new arrangement.** Heart, stars, and the two
that settle it — all on one line, in the order they sit upstairs, with the
cross and the tick pushed right and 14px apart because they do opposite things
and a thumb should not be able to mean one and hit the other. No caption under
the heart: "it's intuitive that clearly you click this to mark it". The heart
is **red, not grey** — a grey heart reads as off *and* disabled — so it is
always the favourite colour and fills when set, the two states that mark has
everywhere else.

**The star never filled its own box.** It read as smaller than the heart beside
it and the cause was arithmetic: the glyph was `min(40px, 9vw)` — 33.75px
inside a 39px square on a 375px phone — so a fifth of every star's space was
empty. A star's ink is about seven tenths of its font size, so the two only
match when the box is full. Settled at `min(41px, 9.8vw)` against a 32px heart.

**The words under the stars are gone.** They printed "3 stars" beneath three
lit stars, which is the same answer twice. The slider keeps them in
`aria-valuetext`, where they are the only way a screen reader gets it at all.

**And nothing wears a pill.** Miyel: "I generally don't like the look of
pills", which is now a rule in DECISIONS — a control is the mark, not a mark in
a container. Every target here earns its 44px from padding with a matching
negative margin instead of from a box, so a thumb gets its room and the eye
sees only the mark. Measured: 0px between the three vertical centres, targets
44–47px, nothing overflowing a 375px row.

**Dragging and pressing are the same gesture.** The row is one surface and the
value is read off where the finger is, so a press is a drag of no distance —
land anywhere, see what you got, slide until it says what you meant. The
leftmost sliver reads zero, because taking a rating off should be as easy as
putting one on. Checked: press at 22% → 1 star, drag to 88% → 4.5, far left →
Not rated, and the draft follows live.

**The trap that survived the rewrite: a drag across stars is a horizontal
gesture**, which the layer reads as "next record". The page marks itself
`.ln-busy` while a row is open, or rating a song would fling you to another
album mid-drag. The other two traps — the layer's stacking context and the
phone's scroll container — only ever existed because the thing floated.

**Read-mode track stars went 12px → 14px** with it: Miyel on seeing the bigger
row, "the new size looks better period, even for the actual entry."

**Two lines between tracks while editing, and the comment saying otherwise had
been wrong for a while.** `TrackThread` says "the note carries no border of its
own — the row's own bottom border already closes the track off, and having both
drew two lines a few pixels apart", and `.ln-write` has carried a
`border-bottom` the whole time. So the fix was documented and never made, which
is the worse of the two failures: a comment that describes an intention reads
exactly like one that describes the code. Cleared on `.ln-write--track`; the
album note keeps its rule, because nothing else underlines that one.

**The foot of an entry is empty while reading, 2026-09-17.** It carried a Back
to the journal caret and an up-to-the-top arrow; both came off on Miyel's call,
and DECISIONS had the argument twice already — "nothing sits at the foot of the
wall... three links to elsewhere is the site asking them to leave", and the
phone gave up a close control on the layer for the same reason, leaving the
pull down, Escape and back. A reader who reaches the end of a listen has
reached the end of it.

**They are still there while a correction is open**, which is what was asked
for ("outside edit mode") — but worth a look: that block's own comment says its
editing job was Delete, and Delete moved to the ··· yesterday. A Back to the
journal that only appears while you are editing is probably the wrong way
round, and it is one condition to take off.

**A track's stars and heart are pressable now, 2026-09-17.** "They are small
for reading and visitors, but for editing they need to be easier to press."
Measured, and it was worse than it looked: the picker splits each star down the
middle so half ratings can be chosen, so the real target was **7 × 14px** — a
seventh of a fingertip — and the heart was a bare 13px glyph with no padding at
all, the smallest thing on the site anybody was expected to hit.

**The glyphs did not grow**, because a tracklist of bigger marks is a column of
controls. The hit areas did: each half now reaches well above and below its own
star and a little into the gap beside it, and the heart carries a 43px box.
Both on `padding` with a matching negative `margin`, and the star halves are
absolutely positioned anyway, so **the row keeps exactly the height it had**.

| | was | now |
|---|-----|-----|
| heart | 13 × 13 | 43 × 43 |
| half star | 7 × 14 | 10 × 44 and 17 × 44 |
| the star itself | 14 × 14 | 14 × 14 |

Proved by tapping 20px above the glyph and watching the rating change. `roomy`
is opt-in on the picker, so the session's own stars are untouched.

**The edit screen, four things off Miyel's first real look, 2026-09-17.**

- [x] **The fonts stop changing.** "The page should pretty much stay the same
      as the entry page, just editable fields." Measured rather than guessed:
      the title read at 25.6px and edited at 16px, the artist at 11px uppercase
      grey and edited at 16px sentence-case ink. **The cause is a decision, not
      a bug** — `base.css` forces every field on a phone to 16px `!important`,
      because Safari zooms the page when you focus anything smaller and does
      not reliably zoom back.
      Which only protects fields *under* sixteen. So the title now takes
      `max(16px, 1em)`: the size of the thing it stands in, never below the
      floor — it matches the heading exactly. The artist cannot (11px would
      zoom), but small caps, DM Mono and the soft ink are most of what that
      line *is*, and those it can have. Verified: no field anywhere is below
      16px afterwards.
- [x] **A chosen flag is lit, not filled.** It took the ink as a background and
      printed in the page colour, which read as three buttons in two states
      rather than three marks on or off.
- [x] **The foot's *Delete this entry* is gone**, the warning kept. It stopped
      being the way in when Delete became a tool on the ···; two doors to one
      destructive act, one of them at the foot of a form. The tool still opens
      the correction with the confirmation already asking, so DECISIONS' rule
      is intact.
- [ ] **King Gizzard's stars are empty in the editor, and it is one row of bad
      data.** `I'm In Your Mind Fuzz` has `rating = "Masterpiece"` — the literal
      word — which is the exact historical bug `database_actions.js` warns
      about above the slugs: the session used to write the word into `rating`
      instead of setting the boolean, and `parseFloat('Masterpiece')` is NaN.
      The entry page hides it because the masterpiece override draws five; the
      editor has no override, so the truth shows. The other four masterpieces
      are `"5"`, `"5"`, `"5 stars"`, `"5 stars"`.
      **It matters more now that the mark is computed:** correct a track on
      that entry and the mark goes, and the entry falls to *zero* stars rather
      than the five Miyel expects. One statement fixes it and it is Miyel's to
      run — it writes to the production database:
      ```sql
      UPDATE entries SET rating = '5 stars' WHERE rating = 'Masterpiece';
      ```

**base.css went stale a third time in one day**, and the pattern is worth
stating plainly: **it is always base.css**, the first sheet `layout.js`
imports. In the same pass, a rule added to `entry.css` applied and a rule added
to `base.css` was absent from the served sheet entirely. The tell is not that
the rule loses a specificity fight — it is that the rule **is not in the sheet
at all**, which the recorded check finds in seconds.

**`/key` is three marks now, 2026-09-17.** It held the whole rating scale — a
paragraph each for 5.0 down to 1.0, plus half stars — and they went on Miyel's
call: stars are ubiquitous, "I should assume that". Explaining them was
explaining something a reader learned elsewhere years ago, and six rows of it
buried the three that genuinely need saying. First listen, Revisit and Study
went with them: they were values of `relationship`, and **that column is
dropped** — the comment in `definitions.js` claiming entries still carried
those words had outlived the data by months. `mergeDefinitions` already ignores
a stored key that is not in the defaults, so a copy that had edited the old
wording loses the row rather than growing a stray one.

**The envelope went too, and it is the one worth arguing about.** It is the
least guessable mark on the site — a heart and a gem can be guessed at, a faint
envelope on a record cannot. One row in `MARKS` brings it back.

**And the finding that matters more than the trim: nothing links to `/key`.**
Not the card, not an entry, not the archive. It is reachable only by typing the
address, which for the page whose whole job is teaching the vocabulary is most
of that job undone — and it is the real answer to "maybe there can be some kind
of guide somewhere", which was asked on the same day about a guide that already
existed. **Worth deciding where its door is**, now that Masterpiece is computed
and a reader may well wonder why a mark appeared or vanished.

**The edit screen, 2026-09-17, and the Masterpiece question inside it.**

- [x] **Library / Submission left the editor.** Miyel asked me to confirm they
      were redundant and they are: **an entry never prints "Library" anywhere**
      — the only shelf word a reader sees is *Submission*, and only where no
      credit line is naming the sender instead. The shelf follows the credit
      now, in SenderTool: naming a sender makes it a Submission, clearing the
      name puts it back in the library. The old pair could disagree — you could
      clear the name and leave an entry claiming to be a submission from
      nobody.
- [x] **The flags wear their own marks** — Heart in `--fav`, SketchLogo in
      `--mp`, Fingerprint in `--formative`, the three restated wherever a record
      is drawn. The place you *set* a flag was the only place on the site that
      did not show the thing being set.
- [x] **Masterpiece is computed and nobody presses it.** Miyel's call after
      asking for a second opinion, and it is the better answer than either of
      mine: not the software refusing you a label, but a fact about your
      ratings. Every track rated, every rating five. See DECISIONS.
- [x] **And it is not in the editor at all until it is true** (Miyel, later the
      same day). Unpressable was not enough: greyed out it still read as a
      control somebody had disabled, a thing you would press if only you could.
      It appears when the tracklist earns it and vanishes when a correction
      takes it away — the same behaviour a session already had.

**What the check found, before any of it was built.** `masterpiece` was a plain
boolean nobody validated — the definition on `/key` has always said "an entire
five-star tracklist" and nothing enforced it, and marking it also silently
forced `rating_value` to five, so a three-star album marked Masterpiece
*displayed* as five. But Miyel had kept it honest by hand: 5 of 5 were genuine
full five-star tracklists and nothing qualified that was not marked. **Verified
again after building: the new rule agrees with all 40 stored values, nothing
gained, nothing lost.**

**Two traps in the way, both worth knowing:**
- **It cannot be a generated column**, which is where it belongs on paper and
  where `album_key` and `rating_value` live. `rating_value` is already
  generated and already reads `masterpiece`, and Postgres will not let one
  generated column depend on another. So it is derived one layer up, in the
  writer, and nothing else may set it — `update_entry` deletes the key rather
  than trusting a caller who sends it.
- **Removing the setter from the session hook left two live callers** in
  `useSessionDraft`, restoring a saved draft. They would have thrown on the
  first resumed listen. They are gone: the ratings are restored two lines
  above and already say it.

**A second look at Credit, same day, and it settled what the panel is.** Miyel:
"if somebody sent it to you, they sent it to you... I think this should really
be mostly a feature for albums that don't have a credit." That is the shape —
**two situations, not one**, and the fix was to stop making them look alike:

- **No credit yet** is the tool's real job, and it was already right. The
  placeholder lost its joke (*Nobody — I found it*) for an instruction:
  *Start typing a name*.
- **A credit already there** is a fact, so it reads like one: the face their
  journal serves, their name at 15px beside it, and the one question still open
  — *Show credit?* — on the shared switch, the question and its answer centred
  together rather than pushed to opposite ends of the panel. The name was 19px bold for a day and
  read as a headline about somebody else on your own page.
- **Done and undone moved to the foot, in the site's own editing bar**, saying
  *Crediting* where a correction says *Editing* (Miyel, 2026-09-17). Two
  reasons and the second is the better one: a panel carrying its own pair of
  buttons is a form inside a page that already has somewhere to put them, and
  a site with one editing chrome teaches it once. The pills went with it — "I
  actually am not a fan of pills... not when they're overdone" — and they had
  been giving a rare, quiet action the same weight as Save, which is the one
  thing that bar exists to make unmistakable.

  **It is portalled into a slot the entry page holds open**, and getting that
  wrong is worth writing down because it failed silently. It cannot render
  where the panel sits: the panel is inside `.ln-screens`, the phone's scroll
  container, and a fixed element inside one measures itself against that box
  rather than the window — the nesting trap already in this file. So it went to
  `document.body`, which looked right on a probe page and **was invisible on a
  real entry**: z-index is per stacking context, the layer is fixed at 200 and
  the bar is 140, so a bar outside the layer competes with the layer and draws
  underneath it. Miyel: "not seeing that footer."

  The slot is an empty div beside `.ln-screens`, inside the layer — the one
  place that is neither inside the scroller nor outside the layer, and exactly
  where the correction's own bar has always been. **Proved rather than
  reasoned:** with the bar in the slot, a hit-test at its centre lands inside
  the bar; with the same markup on the body, it lands on something else.
  `.ln-crediting` gives the scroller the same 96px of room under it; The panel lives
  inside `.ln-screens`, which on a phone is the scroll container, and a fixed
  element inside one measures itself against that box rather than the window —
  deliberately not `.ln-busy`,
  which also covers the send sheet, where padding would move the page at the
  moment a sheet opens over it.
- **The panel no longer flashes the wrong screen.** Opening Credit on an
  already-credited album showed the address book for a split second and then
  changed its mind (Miyel, 2026-09-17). It opened blank, read its own
  blankness as "no credit yet", drew the picker, and corrected itself when the
  fetch landed — doing the work twice and showing its working.

  **It never had to guess, and the page already had the answer.** Three cases,
  all knowable before a request: `withoutChain` puts `received_from` on the
  public entry whenever the credit is public, so the common one is seeded and
  correct in the first frame. A *quiet* credit is stripped from the public row
  entirely, so the name cannot be seeded — but naming a sender always makes an
  entry a Submission, so the type still says a sender exists, which is enough
  to hold the credited shape while the name arrives. Neither present means
  genuinely uncredited, and the picker draws at once with no wait.

  The fetch still runs — it is the only read carrying `credit_private` — but it
  confirms rather than decides. **Checked against a deliberately slowed fetch**
  so any flash would be obvious: at first paint the public credit already says
  Zach, the quiet one shows the credited shape with the name still coming, the
  uncredited one shows the picker, and after the fetch the quiet one arrives
  with *Show credit* correctly off.
- **Edit sender went through three shapes** before landing: label-sized small
  caps, which Miyel did not read as pressable at all; a pill, which gave a
  rare quiet action the same weight as Save; and finally an underlined word,
  which is what this site already gives text that leads somewhere. It stays,
  because a credit can be added by hand from the address book and so can be
  added *wrong*, and because a sender's name can change — locking it would make
  deleting the entry the only fix.

**Miyel asked whether the toggle is needed at all, and the answer is in
DECISIONS.** Quiet is the sender's choice and the send form asks them; the
keeper's version exists "for what the form cannot reach — a credit added by
hand from the address book names somebody who was never asked". That is exactly
what this tool makes: its main job is albums with no credit, which are the
credits nobody was ever asked about. Somebody who told you about a record in a
kitchen never chose to be named on your public page, and this is how a no said
out loud is honoured. **The picker and the toggle justify each other.**

The odd case is the other one: when a credit arrived through a send, the keeper
flipping that switch overrides what the *sender* chose about their own name (DECISIONS, 2026-09-15: quiet is the
sender's choice, because the credit puts their name on somebody else's public
journal). Nothing on the entry distinguishes a sent credit from a hand-added
one, so there is one behaviour, which is what "one flag, two ways in, honoured
in one place" already says.

**A small trap on the way:** the name was given `.ln-sender-name`, which is the
faces strip's 8.5px uppercase label — so Zach came out as ZACH. A class that
reads like a general name is not one; it belonged to a strip.

**And four off the same look at the send sheet, 2026-09-17:**

- [x] **A way to narrow the book.** "The mechanism for finding friends is
      wonky and will get painful as you have more and more friends" — and the
      sheet was the worse of the two, because Credit's name field doubles as a
      filter and the sheet had nothing at all: one row that scrolls sideways,
      so forty friends is forty friends of scrolling. A *Find someone* field
      appears once there are more faces than the strip shows at once, so a copy
      with three friends is not handed a search box for three friends.
- [x] **The close moved to the corner.** Centred, it read as part of the
      sheet's own content and sat over the record you came to look at.
- [x] **The record is centred, art over its name**, and the art is larger. It
      is the object being handed across; a cover in the left corner with its
      name beside it reads as a row in a list.
- [x] **The quiet control is a switch, and it says *credit*, not *name*** —
      crediting is what the flag controls and the word the rest of the site
      uses for it. The switch is `.ln-switch` in base.css rather than either
      surface's sheet, because the entry's *Show their name* asks the same
      yes/no and the two should not answer it in two shapes. Drawn out of a
      real checkbox with `role="switch"`, so the label and the keyboard still
      work and a screen reader hears on/off rather than ticked.

**The base.css staleness caught it again, and the recorded check paid for
itself.** `.ln-switch` went in and the switches drew 13px square — `appearance:
none` applying and nothing else. Rather than hunting the CSS, the served sheet
was checked first (Gotchas): `.ln-switch` absent from it, `.sn-shut` and
`.sn-find` present from the same pass on a different file. `rm -rf .next` and a
restart. **The diagnostic is worth more than the fix** — it turned what looks
like a cascade bug into a thirty-second answer.

**Seen, not reasoned about:** the five-tool row and the Sender panel were both
rendered on a throwaway page, looked at, measured, and the page deleted. The
screenshot matches the mockup — Delete in red, then Send, Sent by, Print,
Correct, then the ×.

**Not tested, and all three need a phone:** pressing Credit, Send or Relisten
on a real entry
(the tools are owner-only and the password cannot be reached from here), and
the brief's own test — **a tap on a tool must never read as the layer's
sideways or downward drag.** That one is open in NOTES already and is the
reason five tools in a row on a sheet that claims both axes is worth a careful
thumb.

Names chosen without asking, rename freely:
`components/main_components/Slug_Page/SenderTool.js`, the `.kt-word`,
`.kt-tool--said` and `.ln-sender--tool` classes, and `--kt-box`. Miyel named
the branch and every word in the row: **Edit, Share, Credit, Send, Relisten,
Delete**.

**2026-09-16 — a send can start at home. Branch `send-from-home`.** Item 2 of
the four-tabs brief. A keeper picks somebody out of their own address book and
hands them a record, instead of walking to that person's card and filling in a
form that asks for a name and a journal their own copy already knows. The
visitor form is untouched and is still the way in for everybody without a copy,
which is most people.

- [x] **`/api/outbox` and `send_record()`** (Miyel's names). The sheet posts to
      the owner-only route on *this* copy; `library/outbox.js` posts
      server-to-server to `https://<their address>/api/submissions` — the same
      door the visitor form goes through. A browser could never do this: it is
      a cross-origin write, and their route has never said it may be read
      across origins. Servers do not keep CORS, so nothing had to change at
      their end.
- [x] **The rate limit is keyed on the sending journal, not the address it came
      from.** This was the brief's real find and it is confirmed: every copy on
      Vercel leaves from the same few machines, so `submission` keyed on IP
      would have counted every keeper in the world as one sender and refused
      the sixth send to arrive in ten minutes whoever it was from. Two new
      doors — `send`, five per ten minutes per journal, the same generosity a
      person filling the form gets; and `relay`, sixty a minute per address,
      which is not pacing anybody and exists only so one machine cannot make
      this copy fetch a thousand made-up journals.
- [x] **The recipient asks whether the journal is real** before believing it,
      with `ask_journal_name` — the same question, of the same public route,
      that filing an address in the book already asks. A server send is spotted
      by having no Origin and no Referer, which is a hint and does not need to
      be a proof: claiming to be one buys nothing but being counted against the
      journal you claim to be.
- [x] **`submissions.sender_entry`** (migration 016, Miyel's name) — one
      column, not several, because `sender_url` has carried the sender's
      journal since migration 011 and a journal plus a slug is a URL. That is
      the cross-copy reference the `source_entry_id` note asked for, and it is
      why that column stays parked: an `entries.id` is local to one database
      and a slug at an address is not.
- [x] **It has a place it shows**, which is the difference between a column and
      the Formative mistake: an opened inbox row whose send came from a
      record's own page offers *Read their listen*, out to their journal.
      Absent for every send off the visitor form, which is most of them.
- [x] **The sheet** (`SendSheet.js`) — the record, To as a strip of faces, a
      note, the quiet toggle, a line saying who it is from, and a Send button
      that names the person. No name or journal fields: this copy knows both.
      `AlbumFinder` and `MiniAddressBook` did the two hard halves already and
      both took the right props; MiniAddressBook gained one optional `verb`, so
      a face's tooltip can say *Send it to them* where the entry editor's says
      *Link to their journal*.
- [x] **Nothing typed is lost.** The message is kept in the browser under
      `ln-outbox-draft` and put back when the sheet opens again; a send that
      fails keeps everything and says plainly what happened, naming their copy
      rather than a status code. Nothing is confirmed on the way out.
- [x] **A send glyph on every row of the address book**, between the row's own
      offer and Visit.

**Seen, not reasoned about.** The sheet lives behind the password and could not
be opened from here, which is the trap this file already records — the arrow
keys shipped on reasoning alone and died on the first try. So it was rendered on
a throwaway page instead, looked at on a 375px phone in both themes, and the
page deleted: the layout matches the mockup's order, and dark mode is right.
What a throwaway page cannot show is the send actually going, because that needs
two journals and a wristband.

**Not in the mockup, and deliberately:** the People rows in the sketch print
each person's address under their name. No address is ever printed on a page
(DECISIONS, 2026-09-12), so the rows stay a face and a name.

Names chosen without asking, rename freely: `library/outbox.js`,
`components/main_components/SendSheet.js`, the `.sn-*` and `.bk-send` classes,
the `ln-outbox-draft` key, the `send` and `relay` doors, MiniAddressBook's
`verb` prop, and the wordings *Send quietly — their entry won't name you*,
*What should they listen for?* and *Read {name}'s listen*. Miyel named
`/api/outbox`, `send_record()`, `submissions.sender_entry` and the branch.
**2026-09-16 — Last.fm came out, and the beacon is always on screen. Branch
`one-beacon`.** Not in the brief — Miyel's call a few hours after it was
written, reversing its own Out of scope line. The journal broadcasts what is
going into it and nothing else now. It went at the one moment it was free: no
copy in the wild had a scrobbler connected, so this asked nothing of any
keeper and is the middle number rather than a major.

- [x] **The Last.fm beacon, its key, its username and its settings section are
      gone.** `fromLastfm()`, `HISTORY`, `UPSTREAM_TTL`, `NO_ART`, `art()`,
      `lastfmKey()`, `has_lastfm_key`, `LASTFM_KEY` in `.env.example`, both
      Settings fields and the whole *Optional: Last.fm* section. `CAPTION` and
      `STAMP` in ListeningBeacon lost the two states that were its.
- [x] **The eight-second flicker patch went with it.** It existed only because
      Last.fm leaves a gap between one track stopping and the next starting.
      A listen does not flicker — the needle stands until it is ended or goes
      twenty minutes untouched — so nothing replaced it.
- [x] **`pull_beacon_settings` is one column again.** It was three columns
      joined across two tables on the most-repeated query in the app; it is
      `SELECT beacon_source` now, about 30 bytes. Still three reads per poll,
      not two as first estimated — the beacon has to ask whether it is quiet —
      but the join is gone.
- [x] **The switch: Now logging / Quiet.** Same `.st-choice` shape the
      two-beacon picker had, so the top row is still the line the cover prints
      (Miyel's 2026-09-15 rule). Stored in `beacon_source`, which the
      additive-only schema would not let us drop and which now carries the
      switch rather than sitting dead. Anything that is not `quiet` is on, so a
      copy holding the retired `session` or `lastfm` needs no backfill.
- [x] **There is always a beacon screen (Miyel).** "A beacon showing a last log
      from a long time ago — that's the signal", and a brand new journal gets a
      blank one standing in. The pane used to drop both floors when nothing had
      been logged and put the wall straight under the crown. Reversed, and
      recorded in DECISIONS.
- [x] **`has_listens` came off the most-read query with it** — two `EXISTS`
      subqueries over entries and drafts, on every page render, existing only
      to answer whether the beacon floor drew. Nothing asks now.
- [x] **`beacon_available` → `beacon_on`.** It no longer means "is there a
      beacon screen" (there always is); it means "does this journal broadcast",
      and it is what stops the hook subscribing at all on a quiet copy. Default
      true, unlike `research_available`, because the default here is on.

**What could not go, and is not a bug:** `settings.lastfm_user`,
`secrets.lastfm_key` and migrations 001, 003 and 014. The schema is
additive-only and a migration that has run is never edited. A copy that had a
Last.fm key still holds it, unread and now unwritable — clearing it is one
statement in a SQL console and nothing needs it done.

**Not verified from here:** the quiet path, end to end. `/settings` is behind
the password, and localhost writes to the production database, so proving it
would have meant taking the live beacon down and putting it back. Everything
around it was proved — the column takes any text (no CHECK in migration 014),
`beacon_source` is in `WRITABLE` and in the read list, `beacon_on` reaches the
browser as `true` in the served HTML, and the build is clean. See Pending.

Names chosen without asking — Miyel was offered them twice and declined to
pick, so these follow the house pattern and rename freely: **`quiet`** as the
stored value and **Quiet** as the switch's second row, `beacon_on`, the
`aria-label` "The beacon and the journal", and branch `one-beacon` (that one
she picked).

**2026-09-16 — the beacon got quieter. Branch `quiet-beacon`.** Item 1 of the
four-tabs brief, done first because it is small, independent, and it protects
every copy already out there rather than only this one. Every open tab asked
the database every fifteen seconds whether anybody was looking or not: ten
visitors cost forty reads a minute, and a laptop with six journals open in six
tabs cost six polls a quarter-minute for one beacon actually on screen. Three
changes, and none of them is visible while you are looking at the thing.

- [x] **The answer is cached in front of the building for ten seconds.**
      `app/api/public/beacon/route.js` sends `public, s-maxage=10,
      stale-while-revalidate=20`, so Vercel answers the repeat asks and however
      many people are watching cost about one read every ten seconds between
      them. It is safe because the beacon says the same thing to everybody —
      no cookie is read, there is no owner's half of the answer — and writes
      are untouched, since the needle goes in through `/api/needle`, which is
      nobody's cache. The empty answer in the `catch` carries the header too,
      deliberately: a database having a bad minute is the minute you least want
      every open tab asking it again. **Proved against a real production build
      and not only the dev server** — Next leaves an explicitly set
      `Cache-Control` alone on a route handler, which is what
      `/api/entries/[slug]/code` and `/api/portrait` were already relying on.
      The accepted cost: turning to a new track can take a few seconds longer
      than the fifteen it already took to reach somebody's screen.
- [x] **A hidden tab asks nothing.** `poll()` in `hooks/useListeningBeacon.js`
      returns early on `document.visibilityState === 'hidden'`, and `wake()`
      asks once the moment the tab comes back — then restarts the clock, so the
      next ask is a full fifteen seconds after that one rather than whenever
      the old schedule happened to have landed. The listener goes on and off
      with the timer, for the same reason the timer goes on and off with the
      last subscriber. Measured in the browser: 0 asks in 32 seconds hidden,
      1 on waking, 1 more at fifteen seconds, and the beacon drew *Last logged*
      correctly on the way back.
- [x] **`/api` came off the proxy's list.** `proxy.js` runs on every request to
      copy the pathname into a header, and the only thing that reads it is
      `app/layout.js` — which a route handler never draws, and which returns
      early for `/api/` in `holdTheDoor()` anyway. So the busiest path on the
      site was waking a function to hand an address to nobody. `api/` goes in
      the matcher's lookahead *with* its trailing slash, so `/apiary` still
      matches; the regex was tested against thirteen paths rather than reasoned
      about.
- [x] **Nothing polls the inbox, so there was nothing to fix there.** The brief
      asked for the same treatment for anything counting it. `/api/waiting` is
      fetched once on mount and once when the lock opens
      (`components/main_components/HomeNav.js`), never on a timer — and the
      drafts `COUNT` that used to ride along went with the desk's drafts row.
      Written down because the next person to look will look in the same place.

Names chosen without asking, rename freely: `EDGE_TTL`, `EDGE_STALE` and
`CACHED` in the beacon route, and `wake()` in `hooks/useListeningBeacon.js`.

**2026-09-16 — the first real listen, and what it found. Branch
`listen-fixes`.** Six notes off a session Miyel actually ran, then two more
rounds on the beacon as she used it.

- [x] **The session stopped re-rendering itself once a second.** `elapsed`
      counted into state and nothing on any screen has ever shown it — it is
      written into the draft row and read back on a resume, and that is all. As
      state it re-rendered the record, the tracklist and the textarea being
      typed into, sixty times a minute for the length of a listen. A ref now.
      Most of the answer to "typing lags" and "the laptop is hot".
- [x] **The research type-out is paced by frames**, not a 16ms interval that
      went on running with the tab in the background. Time-based, so it types at
      the same speed on a machine dropping frames — the old one typed *slower*
      when busy, which is when it was most in the way.
- [x] **The draft's browser copy is held back 300ms** instead of serialising the
      whole listen to disk on every keystroke, synchronously, on the thread
      drawing the letter.
- [x] **The wall stops reconciling on every track turn.** The cross subscribes
      to the beacon for the dot on its mark, and a listen is a layer *over* the
      cross — so once the beacon followed the session, every track turn
      re-rendered forty covers nobody was looking at. `Journal` is memoised.
- [x] **Posting returns to the picker** after a beat on the tick.
- [x] **OUT OF SESSION stamped over the idle art.** The stamp came off on
      09-15 for repeating the caption; it says a different thing now — the
      caption names the record, the stamp names the state.
- [x] **Twenty minutes, not three hours**, and **leaving the screen ends the
      listen.** Only posting and the picker put the needle down before, so a
      listen swiped away went on claiming the beacon; Miyel watched hers do it
      for six minutes. The guard on that cleanup is for development mode, which
      rehearses mount/unmount and would otherwise blank the beacon for two
      seconds every time a listen opened — on the dev server only, which is
      exactly where it would have been believed.
- [x] **The desk's door is the beacon's.** Green follows the beacon rather than
      "a record is on the desk", so it reads as *you are broadcasting*; the
      words still follow the record, because pressing it is the way back. The
      mark is Broadcast, not Headphones. And the desk can hear itself now: a
      `storage` event fires in every tab but the one that wrote the key, and the
      desk and the listen are always the same tab — which is why picking a draft
      lit nothing until you clicked elsewhere.
- [x] **A resumed draft lights the beacon.** It can reopen on its album screen
      and the gate was "past the album screen". The gate asks the honest
      question now, and a listen whose tracklist has not arrived names the
      record instead of going dark.
- [x] **Arrow keys through a listen — written, dead, removed.** See Gotchas:
      `/session` is behind the password and cannot be run from Claude's side, so
      it shipped on reasoning alone and failed on Miyel's first try.

- [x] **Posting a listen settles the send it came from** (migration 015,
      `drafts.submission_id`). Starting a listen from the inbox marked the send
      `reviewed`, meaning started, and nothing ever moved it on — so a record
      somebody sent could be written up and published while their send sat in
      the inbox still offering to resume a listen that had become an entry. The
      thread is on the draft row and not only in the browser, for the reason
      `received_from` is: a listen paused overnight must not come back having
      forgotten. It presses the same route the by-hand "already logged" button
      does, which settles the send AND credits the entry, and it is not awaited
      — a send deleted while the listen was open answers 404, and that is not a
      reason to tell somebody their listen failed.
- [x] **The feed's head holds still and its title is gone.** Everything passes
      under the mark and under RECENT · SUBMISSIONS — two stacked sticky bands,
      because the two belong to different components. In a layer the mark's row
      is in the flow, so it is stuck at the top and takes the notch as padding
      rather than margin, which keeps the whole 80px band put and the mark out
      from under a dynamic island. The tabs stick at `--hn-bar-h`, the right
      number in both shapes, which is most of why that was worth putting on
      `:root`. The word FEED went with it: three lines of small caps to name
      one page, over a row that labels itself.
- [x] **The feed opens on Recent**, and Recent is the first tab. Submissions
      was the default while the feed was mostly empty; with a populated address
      book it is the narrower view.
- [x] **Every page clears the real bar.** `--hn-bar-h` was declared on `.hn`
      alone, so the feed at its own address fell through to a hardcoded 104px
      fallback — 24px taller than the bar actually is, and knowing nothing
      about a notch. It is on `:root` now and there are no bogus fallbacks
      left.

Names chosen without asking, rename freely: `saidSoAboutTheDesk` and
`PENDING_EVENT` (hooks/useListeningSession.js), `TYPE_PER_SECOND`, `litRef`,
`elapsedRef`, `drafts.submission_id`, and branch `listen-fixes`.

**2026-09-16 — three dead branches deleted, `share-printer` kept.** They were
local-only and had never been pushed, so this is the last word on them:
`album-exporter` (6b27774), `album-qr` (c50dafe) and `junior-install-old`
(23a2a95). Checked before deleting rather than after: the slide drawing
DECISIONS promises survives because `app/dashboard/share/page.js` is on
`share-printer` too; `album-qr`'s idea shipped by another route as `cover-code`
(1.2.0); `junior-install-old` is the earlier draft of `junior-install`, which
merged. `share-printer` stays for `IdentityCardPlate.js` alone — the one plate
the press on main has never been given. It is still the only unmerged branch
and still exists nowhere but this laptop.

**2026-09-15 — nothing behind an open overlay moves** (1.20.2, on main, from
Miyel finding it on a phone). `hooks/useHoldStill.js`, her name: walks up from
the scrim and stops every ancestor that is a scroller right now, plus the page
itself. Shared by the archive's filter sheet and the card's Masterpieces /
Formative window, which had no lock at all. A pull down over the scrim now puts
either of them away, on the same handlers the grip already used — with the page
held still that gesture had nothing left to do. Checked with real wheel
gestures in all three shapes (cross floor, card pane, standalone `/archive`):
nothing moves, nothing jumps on open or close, and the rail and pane come back
exactly where they were, which was the one thing that could have made this
unusable.

**MERGED to main and pushed, 2026-09-15, as 1.20.0 — released as v1.20.0,
which also carries 1.17.0, 1.18.0 and 1.19.0, none of which were ever cut.
Built clean with the dev server stopped. Merged ahead of a real session test
because somebody is getting a copy and will not have Last.fm; the writing half
is still to be walked through (Pending).**

**2026-09-15 — the session beacon. Branch `session-beacon`, from Miyel's
brief. The beacon's default source becomes the listen you are writing;
Last.fm becomes the other of two you pick between.**

- [x] **Three states, decided on the server** (`app/api/public/beacon/route.js`).
      *Now logging* from the open listen, *Now listening* from Last.fm, *Last
      logged* from the most recent listen. The session wins when both are live.
      A visitor's browser cannot know whether a listen is open, so the order is
      resolved server-side and the client is handed one answer.
- [x] **`needle` — one row, always id 1** (migration 013, `library/needle.js`,
      `/api/needle`, all Miyel's names). Album, artist, cover, track, and the
      moment it was last touched. Deliberately not the drafts row: a draft is
      written once something has been *typed*, and the first four minutes of a
      listen are a record picked and not a word yet, which is exactly when the
      beacon should be lit. Writing empty drafts instead would have put phantom
      listens in the resume picker.
- [x] **The expiry lives in the read, not in a cleanup job.** Three hours since
      the last touch, enforced by the `WHERE` clause, so a closed tab or a flat
      battery expires with nothing having to run. The clock is *interaction* —
      picking a record, turning to a track, writing a line — and never a
      heartbeat, because a timer that pinged while the page merely sat open
      would claim a listen all weekend, which is the loophole the brief named.
- [x] **No track, no beacon.** `step > 0` gates it. `openTrack` is 0 from the
      moment a record lands on the desk, so asking the tracklist alone would
      have lit the beacon while somebody was still on the album screen deciding
      whether to start. Past the tracks screen it keeps naming the last song
      reached rather than going blank on Notes and Preview.
- [x] **The dot lights for a session as well as for playback** — Miyel
      overruled the brief mid-build, which had said green should mean playback
      alone. `isLive` is now "the beacon is live", and the three marks that
      read it (`HomeNav`, `SiteNav`, `IdentityCard`) needed no change.
- [x] **"Before that" is this journal's own listens**, finished or not — also
      Miyel's call, twice: first that drafts count, then that the beacon's own
      third state counts them too. Entries and drafts in one time-ordered
      union, deduped by album title, a draft borrowing an older entry's slug so
      its tile still opens something. That deleted the `foldKey` matching in
      `HomeNav` whose only job was guessing which entry a scrobble was about,
      and dropped the Last.fm read from 25 rows to 5.
- [x] **`beacon_available` now means "anything listened to here, or a
      scrobbler"** rather than "Last.fm is set up", so every copy has a beacon
      from its first listen. One seam left, noted in `app/layout.js`: the very
      first listen on an empty journal lights nothing, and resolves as soon as
      a line is typed.
- [x] **You run one beacon, not both** (migration 014, `settings.beacon_source`,
      Miyel's name, and the picker under "Your beacon" in Settings). *Now
      logging → Last logged* or *Now listening → Last played*. The two choices
      on the form are the two lines the cover prints, so picking one is seeing
      what your journal will say. A copy set to Last.fm with no key quietly
      falls back to the session beacon. Replaces "the session wins when both
      are live", which was the brief's rule and lasted an hour — Miyel's call
      after testing it: you do not get both.
- [x] **Closing a record keeps that listen** (migration 014, `needle.ended_at`).
      The bug Miyel found on the first real run: clicking through an album and
      shutting it erased the listen and the beacon fell back past it to what
      was logged before. `lift_needle` now stamps the row instead of deleting
      it, so the beacon keeps the track that was open and the older record
      drops into "Before that" — which is what she expected to see. A record
      closed without a single track opened is still deleted: browsing is not
      listening.
- [x] **Settings' Last.fm section is "Optional: Last.fm"** and says outright
      that a copy without it is complete, naming the case it is optional for.
      The LAST PLAYED stamp across the idle cover went with all this — the
      caption below says which state this is, and the stamp was that sentence
      twice, in the wrong tense.

Proved against the live database by calling the route's own `GET` directly:
nothing open → Last logged; a needle with a track → Now logging, beating the
scrobbler; a needle with no track → Last logged; touched 2h59m ago → still
logging; 3h01m → lifted. Then in the browser at 375 and at 1280, no console
errors.

**MERGED to main and pushed, 2026-09-15** (`6b1a868`), with `turn-and-swipe`
under it. Built clean with the dev server stopped. Version stays at 1.19.0 and
no release cut — the number is Miyel's to move when she is ready.

**2026-09-15 — three panes, with a named band at the foot. Branch
`three-panes` — from Miyel's brief. Not a return to the original three: every
decision made since stays, and the two things that made three fail the first
time are both answered.**

- [x] **ID, beacon, desk, landing on the beacon.** Three failed before because
      the panes were the same shape and nothing said where you were. Neither
      was the count. Each pane is a different kind of thing now — a portrait
      over writing, a record over the journal, a hero over rows — and the band
      names all three all the time.
- [x] **One markup for two structures, and the desk is untouched** (Miyel:
      don't touch desktop, this all fits perfectly the way it is). The two
      boxes that make a spine a spine — `.hn-pane--turn` and `.hn-leaf` — go
      `display: contents` under 769px. Their boxes stop existing without their
      children leaving the markup, so the ID and the desk become rail panes in
      their own right, and because they are then siblings of the beacon,
      `order` can put the beacon between them. Measured: card at 0, beacon at
      375, desk at 750, all three visible, all three scrollers. At 1280 the
      spine is 0..320 and the journal 320..1280 with the faces still absolute,
      one hidden, and the turn control still reading OPEN CARD — the desk is
      the same page it was.
- [x] **The band: Card · Beacon · Desk** (`Footer.js`, Miyel's name). A glyph
      over a word, the pane you are on in ink at full opacity and the other two
      pale. Pressing a name calls the same `scrollTo` a swipe ends in —
      verified by spying on it: Card asks for left 0, Desk for left 750 — so it
      is the visible version of the gesture rather than a second way in.
- [x] **It does not fade while things move, where the row it replaces did.**
      That row was three glyphs parked on somebody's album art and getting out
      of the way was the kindest thing it could do. A band along the edge with
      a ground of its own does not have to apologise for being there, and a
      navigation that vanishes when you scroll is one you cannot trust. A
      26px dissolve above it stops the page being cut off by a hard line.
- [x] **The glyphs, and the one that was open.** Broadcast and the
      identification card were already in use and mean what they draw. The
      desk's is `Rows` — a stack of lines, which is what a desk of rows looks
      like from above. An open book was the obvious one and is wrong: the book
      is the journal and the journal is *down* from the beacon, not sideways.
      The feed's row then had to move off `Rows` and on to `Cards`, because two
      rows of a pane cannot wear the pane's own mark.
- [x] **Down survives on the beacon and nowhere else.** Measured: opacity 0 on
      the ID and the desk, 1 on the beacon. It is the one pane with a cover —
      the one place something is cut off at a fold rather than running on.
      Everything else scrolls and the edge is its own cue. It sits 12px above
      the band; it used to hang 18px *below* its row, which was clearance for
      dots that no longer exist.
- [x] **The feed is a row and a page: `/dashboard/feed`** (Miyel's address).
      It ran on down the desk's own scroll, which is what stopped the desk
      being a hero and its rows and nothing else. Filed with the inbox, the
      address book and report because it is the same kind of thing — behind the
      wristband, about this journal's business. It has the sheet the others
      have (`@layer/(.)dashboard/feed`), `over="spine"`, because a sheet that
      covered the journal to show a feed would be taking away the thing the
      feed sends you to.
- [x] **Gone with it:** the turn control on a phone, the leaf's slide, the
      dots, both side carets and `paneMarks`. The slide's own CSS stays for the
      spine, which still turns.
- [x] **Kept from the removed work, both deliberately:** 0.4s on
      `cubic-bezier(0.22, 0.61, 0.36, 1)`, which is the entry layer's arrival
      curve and now the rail's, and `will-change: transform` on the three fixed
      rows — `translateZ(0)` there would beat `.hn-controls--busy` on source
      order and silently stop the bottom row hiding on scroll, which is the
      sixth time for that trap in this file.

**2026-09-15 — drafts leave the desk.** The picker lists them the moment you
start a listen, with a resume and a discard, so the row pointed at a place you
pass through on the way (Miyel). Verified against a real draft first: one row
in the table, the picker printing *In Rainbows · Radiohead · Tracks · 30m ago*
with its discard beside it. The desk is Start a listen, Inbox, Address book and
Settings. `count_drafts()` and the `drafts` field on `/api/waiting` went with
the row rather than being left running — a `COUNT` over a table on every poll,
answering a door that no longer exists. Nothing else read either of them;
`/api/drafts`, which the picker and the inbox's guard use, is untouched.

**2026-09-15 — the turn, its animation, and the swipe. Branch `turn-and-swipe`,
on top of a merged `card-and-desk` — from Miyel's brief, which set the order:
the animation first and completely, then the gesture, so nothing shipped
depends on the gesture working.**

- [x] ~~**A page turning, not a cross-fade**~~ — **a flip first, then a slide,
      the same day.** The flip is in git and the reasons it went are in
      DECISIONS; the first of them is the only one that needed saying, which is
      that a flip means two faces of one object and a desk is not the back of
      your card. Everything below about the curve, the fixed rows and the
      journal holding still survived the change. What follows is the flip as
      built, kept because it is where the reasoning came from.

      **The slide, 2026-09-15.** The card sits at the leaf's left edge and the
      desk at its right, each a full pane wide; the leaf translates one pane
      and the pane clips. One transform, both pages moving together, which is
      how pages move on a rail. A transition and not keyframes, for two
      reasons: it is the right tool for a two-state toggle, and it reverses
      from wherever it has got to — so the flip's one rough edge, a double
      press settling flat before turning back, is gone. Proved: stopped at
      x-277 mid-slide, pressed again, and the new transition's own frame 0 is
      x-277. Measured at 375: card 0 → -375 and desk 375 → 0 across the 400ms,
      journal Δ0/0 at every sample. At 1280 the leaf travels the spine's own
      320 and the journal is Δ0/0 there too.

      **And all the 3D went with it** — no perspective, no preserve-3d, no
      backface, and none of the flat-at-rest care that existed only to stop a
      3D subtree with two scrollers being flattened into one rasterised layer.
      That was the most delicate thing in the file. `will-change` on the fixed
      rows stays: it is about promotion of any kind, not about perspective.

      **The control says Open** — *Open desk*, *Open card*, *Open about* — and
      its glyph is two arrows side by side rather than one going round. Small
      caps is what lets OPEN ABOUT read as a page's name rather than a sentence
      with a word missing.

- [x] **The flip, as built and reverted.** The two faces went into one box,
      `.hn-leaf`, which was the thing that turned — a horizontal rotation with
      perspective, the outgoing face leaving as the incoming one arrives, on
      `cubic-bezier(0.22, 0.61, 0.36, 1)` at 0.4s. Both stated from the entry
      layer rather than picked: it arrives on that curve at 0.42s, and a pane
      that turns faster than a record arrives is a different piece of software.
      `TURN_MS` in HomeNav and the keyframes in nav.css have to agree.
- [x] **One animation, both triggers.** The control and the pull run the same
      turn between the same two angles — 0 for the card, -180 for the desk —
      and the only difference is that the control plays keyframes and the pull
      is written from the finger. Negative, so the right edge comes toward you
      and the leaf turns leftwards, which is the direction the swipe means.
- [x] **Flat at rest, and that is the safety of the whole thing.**
      `preserve-3d` around two scrollers is a subtree the browser may rasterise
      and scrolling inside one is the class of failure this file has reverted
      twice at this boundary. So the 3D lasts 400ms: at rest the leaf is a
      plain absolutely-positioned box and the face is still chosen by
      `visibility`. Same reason the perspective is a transform *function* on
      the leaf rather than the `perspective` property on the pane — the
      property would make `.hn-pane--turn` a containing block for every fixed
      descendant for good, and the card has one, the sheet the counts open.
- [x] **The fixed rows were promoted before they were covered.** A turning
      leaf is a composited layer and a composited layer paints over fixed
      elements that are not — the archive's gotcha, found once already.
      `will-change: transform` and **not** `transform: translateZ(0)`: the row
      at the foot animates its own transform when it hides while something
      scrolls, and a translateZ stated later in the file would have beaten
      `.hn-controls--busy` on source order and stopped it moving. That is the
      source-order trap, and it was nearly the sixth time.
- [x] **Measured, because the pane it was tested in is hidden and hidden panes
      freeze animation clocks** — which read as an animation that would not
      run until `getAnimations()[0].currentTime` was stuck at 0 twice in a row.
      Scrubbed instead: -180, -73, -23, -4, 0 across the 400ms, with the curve
      plainly front-loaded. The journal's box does not move by a pixel at any
      point of the turn on a desk. The turn's own control survives it.
- [x] ~~**The swipe: a 36px strip at the pane's left edge**~~ — **built and
      reverted the same day.** On a real device a left pull at the edge went to
      the beacon instead of turning the leaf: the rail took the drag and did
      what a horizontal rail does with a leftward one, which is go to the pane
      on the right. `touch-action: none` on the strip alone did not take the
      axis away from it. That is the fourth ruled-out approach at this boundary
      and it is in DECISIONS with the other three, along with the line they all
      add up to — the left edge belongs to the rail and a trigger cannot live
      there.

      What it cost and what it bought: about 160 lines, one evening, and the
      end of a question that had been deferred twice. The brief put the
      animation first and said plainly that nothing shipped should depend on
      the gesture, which is why the revert was the strip and nothing else — the
      control and the turn are untouched and were never wired through it. Two
      pieces went with it because they only ever served it: the layout effect
      that cleared the leaf's inline transform before paint, and the shared
      timer that stopped a pressed turn and a pulled one cancelling each
      other's clean-up.

      Worth knowing if it is ever reopened: it passed every synthesised test.
      A press that goes nowhere left no trace, the leaf followed the finger
      1:1, past a third of the reach it turned and remembered, a slow short
      pull sprang back, a flick went through, and a right drag took the rail
      0 → 375. Synthesised pointer events prove arithmetic and prove nothing
      about a thumb. The code is in git on `turn-and-swipe`.
- [x] **The portrait is the beacon's album art, 2026-09-15** (Miyel: make it
      smaller, the same size as the beacon album art). 180px square with an
      18px corner, which is `.beacon-art-wrap` exactly. It went full-measure
      first on the argument that it should be the size an *entry's* album art
      is, then seven-tenths of the page, and this is the answer both of those
      were reaching for: the record playing is the object on the beacon and
      the keeper is the object here, so they are the same object at the same
      size. It costs nothing in standing — nothing else on the pane is a square
      of anything — and it buys the fold: the portrait, the name, the counts,
      the genres, the pinned record and the first prompt are all above it now.
      No shadow, where the beacon's art has one, and that is not an oversight:
      the beacon's card is lifted off the page and this is printed on it.
- [x] **Two dead rules for the spine's photograph deleted, not repaired.**
      Matching the corner on a desk turned up a rule that had never applied —
      see the new entry at the top of Gotchas. What the spine has actually been
      showing all along is the card's own photograph, which is what has been
      looked at and approved, so the rules went and the rendering did not. One
      knock-on, worth knowing: the spine's portrait was a percentage and grew
      when the fold was dragged wider; it is a fixed 180 now, the same as the
      beacon's, and widening the spine gives the room to the type instead.
- [x] **The turn's own verification still stands:** the leaf reads -180, -73,
      -23, -4, 0 across the 400ms; it is `transform: none` and `transform-style:
      flat` at rest; the journal's box does not move by a pixel at any point of
      it on a desk; and the turn's control survives the turn. Measured again
      after the strip came out.

**MERGED to main and pushed, 2026-09-15** (`da39bff`). Built clean with the
dev server stopped. No release cut — Miyel has more for this before one.

**2026-09-15 — the ID pane: the portrait is the object. Branch
`card-and-desk`, version 1.19.0 — from Miyel's second brief for this pane. The
first one built it as a licence of typeset fields; that is in git and the
lesson is in the entry below.**

- [x] **The pattern the brief opens with is the part to keep.** Every pane is
      an object over its writing: the beacon is the record playing over the
      journal, the entry is the record over the notes, the desk is your tools
      over the feed, and the ID is who keeps this over their words. The panes
      read as disjointed because the objects were not equally object-like —
      two of them were squares and this one was a column of facts.
- [x] **The object is the portrait, square and seven-tenths of the page.** It
      was the full measure first, on the argument that it should be the size
      an entry's album art is; at that size it was a lot of screen for a
      photograph of somebody (Miyel, the same evening) and it came down to
      70%. Still the object — nothing else on the pane comes near it — and now
      the prompts start above the fold as well. Both 4:3 crops lost against
      the real photograph: the clouds around the shoulders do real work and a
      shallower crop takes them. The code stays in its corner, a little larger
      now it has a photograph to sit on.
- [x] **The mark is centred, 28px, and does not move.** Measured at three
      moments — the card's header, the desk's header, and the bar's mark that
      fades in once a face is scrolled — all three now land at the same size
      on the same centre on the same line (28px, cx 215, cy 51 on a 430
      phone). The bar's was 22px and the page's 28, which is why scrolling the
      pane read as a header resizing itself rather than a mark that stays put
      (Miyel). 28 is what every other mark on the site measures, so the bar's
      was the odd one; raising it was going back to the standard, not away
      from it. Both page marks are pinned 15px down rather than centred on
      their row, because a row's height is whatever the pencil or the gear
      happens to be and three pixels of drift is exactly what makes a mark
      look like it jumped.
- [x] **The head of the pane is one centred column** (Miyel: centre the
      photograph, the name and the keeping line). Mark, photograph, name,
      date, then the two actions — all on one axis, measured at the screen's
      centre. The actions moved *under* the name rather than beside it: they
      were opposite it on one line, and a centred name with two buttons
      hanging off the right edge is not a composition. They are still *Send*
      and *Add* and not "Send an album" and "+ Add" — that shortening is what
      keeps them one short row rather than two long pills. Send is filled,
      because it is what the pane is for. Both are the visitor's; signed in it
      is the name alone (Miyel, 2026-09-14: there is nobody for the owner to
      send to but themselves). Only the pinned record is ranged left, because
      it is a record and records are left-aligned everywhere on this site.
- [x] **Three counts in the three flags' colours.** Albums in ink,
      masterpieces in `--mp`, formative in `--formative` — the first work those
      tokens have had away from a mark on a record. Between two hairlines,
      number large and word small. Typeset, not stamped: stamps were built an
      hour earlier and the answer is that with a photograph that size above
      them the photo is already the flourish. `/api/public/stamps` counts the
      marks, which it used to before a swatch came off the card. A zero is
      left off.
- [x] **The two flag counts open a window of covers; Albums does not.** A
      sheet from the foot with nothing in it but covers, three across, the
      name and the number in its header so nothing needs a label, and the
      height of what is in it — nine covers is three rows and opens at 467px
      where four opens at 337, measured, because a fixed sheet with space
      under nine albums reads as something failing to load. Pull the grip,
      press the scrim or press Escape to close; the number it came from is
      underlined while it is open. `.ab-count-*` in About, which owns it for
      the same reason it owns the pin's search: the sheet covers the pane.
      The window filters on the same two tests the wall does, so it and the
      archive's filter can never disagree about what counts.
- [x] **Nothing on the ID pane browses — and that was a bug, not a new rule.**
      DECISIONS already said the layer takes a sideways drag only on an entry
      with a record beside it on the wall. The pinned record was opening with
      the wall's order behind it and letting you swipe through the journal:
      the pane passing an order it has nothing to do with. `arrivingAlone()` /
      `cameAlone()` in handoff.js, a one-shot in the same family as
      `arrivingBySwipe`/`tookASwipe` — **not** a clear of the wall's order,
      which would have taken the wall's own neighbours away for good, because
      the wall only says the order when what it shows changes and would not
      say it again. Measured after: the pinned record and a window's cover
      open with zero neighbour carets, and a tile on the wall still opens
      with one.
- [x] **A cover closes its window before the entry opens.** One layer at a
      time — an entry arriving over an open sheet is the nesting problem in
      Gotchas, where a fixed panel inside a layer measures itself against the
      sheet rather than the window.
- [x] **`app/@layer/(.)archive` is gone.** It existed for the hour the counts
      navigated to a filtered archive. Nothing links there from inside the app
      now except `/key`'s Archive button, which wants the real page — an
      interception left lying about changes what an ordinary link does.
      `?mark=` stays on the archive: it costs eight lines and makes a filter
      an address somebody can send.
- [x] ~~**And the counts are presses into the journal, filtered**~~ (Miyel,
      2026-09-15: the way the pinned record takes you to that entry). Albums
      goes to `/archive`; masterpieces and formative go to
      `/archive?mark=masterpiece` and `?mark=formative`. `/archive` is the
      wall's own address and mounts the same component the cross's centre pane
      does, so the filter arrives with the page rather than having to be
      reached across two panes — a link from the card to the wall inside the
      cross would be a same-route navigation the cross never remounts for.
      Journal reads `?mark=` exactly as it reads `?q=`: through
      `useSyncExternalStore`, derived as typed-or-linked, so the link's filter
      holds until somebody changes it in the sheet. One parameter and not
      three, because the three are one question. The card's count and the
      wall's filtered count agree by construction — 4 of 39 and 9 of 39 —
      because both read the same two columns.
- [x] **And the wall arrives on the sheet, growing from the number you
      pressed** (Miyel: it should move the way the pinned record does — you
      feel it pull up from where the journal would be, and a swipe down puts
      it away and leaves you on the card). `app/@layer/(.)archive/page.js`
      intercepts the address, so the cross never unmounts and closing returns
      to the card face with its scroll intact; `over="journal"` puts it on the
      right page on a desk. `arrives` is left at its default rather than
      `bottom`, because rising from the foot of the screen loses the
      connection to the number. It grows from `data-grows` (handoff.js,
      `growBoxOf`), which is stamped on the pressed count at the moment of the
      press and taken off the other two — stamped in the markup all three
      would answer to the same path and the first would always win, which is a
      wall growing out of the wrong number. The standalone `/archive` still
      answers a bookmark or a shared filter, which is why the filter lives in
      the address rather than in a hand-off.
- [x] **Then the pinned record: centred, smaller, and a pin instead of the
      word.** It was ranged left for an hour on the argument that a record is
      left-aligned everywhere else on this site; on a pane whose whole head is
      one centred column it was the only thing off the axis. The group is
      centred with `width: fit-content` and automatic margins rather than
      `justify-content: center` on a full-width row — that would centre it too
      and then let a long album title drag it off centre as it grew. The art
      is 50px and a mirrored `PushPin` sits beside it where the word PINNED
      was: it leans into the record it is pinning, because Phosphor draws it
      leaning the other way and it pointed off the edge of the row. The word
      survives in the row's label for anybody who cannot see the pin.
- [x] **Below the fold, in the same scroll:** the three prompts, then top
      genres as one line rather than a three-row fact block, then the rig.
      About reads the genres off `stamps` itself now; they are computed, not
      written, and they belong with the reading. A quiet *In Miyel's own
      words* stood over the prompts for an hour and came off — a question in
      one voice with an answer in another already says which of the two you
      are reading.
- [x] **Each prompt is a card, and the two halves are in two faces.** A card
      in `--panel` with no border: the box exists and does not announce
      itself, so three in a row do not read as three rectangles, and they are
      separated by tone the way the counts and the pinned record above them
      are. Three hairlines would have competed with the row directly above.
      The answer is indented behind a 2px rule, like a pull quote — it is
      being quoted into the question's card, not continuing its sentence.
- [x] **The two halves are set the way an album and its artist are** (Miyel,
      after seeing the first attempt: use the setup we already have). That
      pair is the site's one settled answer for a two-part thing — the label
      face small and in caps for the part that names it, the display face for
      the part that *is* it. An entry does it as a title over an artist; the
      pinned record directly above these cards does it as PINNED over an
      album. A prompt is the same shape, so the question is the small line and
      the answer is the large one — at the display size but **not** the display
      weight (Miyel): three or four lines of bold is a headline rather than
      something somebody wrote, and the size already says which half matters.
      - It went the other way first — a sentence-length question in mono over
        a light answer — and a paragraph of monospace is a thing to decode
        rather than read. Inverting it also put the emphasis where it belongs:
        the question ships with the software and is identical on every copy,
        the answer is the only part anybody wrote.
      - **MuseoModerno was asked for and does not exist here.** The mark is
        drawn as SVG paths rather than set as type, so the face has never been
        loaded; what made it look available was a `museo` key in
        `library/sitewide_visuals.js` that said MuseoModerno and resolved to
        Nunito. Nothing read it. Deleted — a font table naming a face the site
        does not have is how that reasoning came to be written.
      - Nunito 300 was added for the light answer and removed again when the
        answer became display weight. A weight nothing uses is the Anton waste
        at a smaller scale (app/layout.js has the note).
- [x] **Top genres is on the card, between the counts and the pinned record.**
      It went from the card, to below the prompts, to above them, to here, and
      here is right: it is the last of the counted things — the numbers say
      how somebody listens and this says to what — so it belongs with them and
      on their axis rather than down in the writing. Measured, it centres where
      the counts and the pinned record do.
- [x] **The counts keep their two hairlines, and they are the only ones**
      (Miyel: keep the horizontal lines, just have them only there). The
      genres row carried one and another was drawn above the writing — four
      rules on a page whose argument is that things separate by tone. Those
      two went; the band's stayed. Verticals *between* the three counts were
      tried in between and are not it: the line goes round the set, not
      between its parts, and the band needs a top and a bottom to read as a
      row rather than as three stray numbers. Everything else on the page is
      separated by space.
- [x] **The em dash is gone from the printed question.** It was separating the
      opening from the answer on one line; on two lines in two faces it
      separates things that separate themselves. Stripped at the render rather
      than out of the nine strings in `bioprompt.js` — it is the typography
      that made it redundant, and the typography is the thing most likely to
      change again.
- [x] **A hint that there is more.** The fold is where the object stops by
      design, so a faint chevron sits above the band and scrolls one screen;
      it goes the moment the page has moved. Down is still not a gesture here
      — this says the writing exists, it does not arrive anywhere.
- [x] **The turn's band says where it goes.** On a phone it is a whole line
      across the foot — *Turn to the desk*, *Turn to the card*, *Turn to the
      software* — which needs no learning at all. The CARD/DESK switch is the
      desk's shape and stays at the top of the spine, where a narrow column
      has no room for a sentence.
- [x] ~~**One control in the header: the pencil**~~ — then no control at all
      for an hour, then the ··· that is there now. See the three entries at
      the end of this block.
- [x] **The empty band closed.** Roughly 140px of nothing between the pinned
      record and the writing; 26px now.
- [x] **Verified at 430×932 and 1280×860, signed in and signed out:** the
      portrait full width and square (386 and 284), the name row with Send
      filled and Add outlined and both beside the name, the three counts in
      their colours, the pinned record on the left edge, the band at the foot
      with the page's last line above it, and the desktop spine carrying the
      same object at its own width with the switch at the top.
- [x] **Headers hold nothing loose, and an owner's tools live in two places:**
      a row on the desk, or behind a ··· on the thing itself (Miyel's brief).
      So *Your card* and *Settings* are desk rows beside Start a listen, Inbox,
      Address book and Drafts — Settings after an hour as a gear in a header,
      which is the shape the brief was written against. The entry's pencil and
      printer became one ··· holding Edit, Print and Delete, opening in the row
      rather than as a panel: an entry's sheet already claims sideways for the
      next record and down for closing, and a floating menu would be a third
      surface on it. Delete opens the correction's own confirmation rather
      than acting.
- [x] **And then the ID pane got one too, at the top right** (Miyel: the three
      dots are perfect, they need to be on the ID page as well). Edit and
      Print, no Delete — you cannot delete the card, it is the journal. The
      same component draws both surfaces, with one prop for the wording and
      one CSS variable for which way it opens. Which means the pane is no
      longer identical for a keeper and a visitor; that was worth saying for
      the hour it was true, and a single mark that opens is a door rather than
      a toolbar, which is the distinction the header rule was actually after.
      The quiet *Edit your card* at the foot went with it — two doors to one
      mode, a screen apart, on a page that is mostly writing. The desk row
      stays: that is the one you use when you are not already on the card.
- [x] **The tools file out of the ··· rather than appearing** (Miyel: can they
      come out on a conveyor, like it comes from inside the button). The door
      does not move — the mark stays in its corner and turns into the ×, and
      the tools start scaled down on top of it and slide to their slots. The
      one that ends up furthest away leaves first and the rest stop short
      behind it, the way a line of people through a door fills a room from the
      back; going in, the nearest goes first, because it is the one in the
      doorway. Everything travels at one speed, so distance is duration —
      `--kt-i` is how many 38px boxes a tool is from the door and it sets both.
      The first version put the × at the far end of the group instead, so the
      button you had just pressed jumped across the row before you let go.
- [x] **The light switch is the beacon's and nowhere else** (Miyel: for now it
      just lives on the beacon screen ONLY). It came off the entry pages' nav
      row — the column stays, empty, or the mark stops being centred — and out
      of Settings, where it had been for an hour. And it is a sun and a moon
      again: it was redrawn as a switch on a wall on the grounds that the
      component is called Lightswitch, and a file name is not an argument.
- [x] **Then the entry's ··· moved to the top right as well** (Miyel: so it is
      unified across the site). It was at the left for a day, which was the
      turn's corner on the cross rather than anything the nav row had a reason
      for. `SiteNav`'s `tools` now go in the right slot and the left one is the
      empty spacer; both columns stay or the mark stops being centred. Which
      means every ··· on the site opens leftwards, so the reverse and
      `--kt-dir: -1` moved onto `.kt-tools` itself and the two per-surface
      overrides are gone — one rule, one behaviour, and the variable is still
      the knob if a left-hand corner ever wants one.
- [x] **An open ··· takes the nav row's mark, and this one was measured, not
      felt.** The sitewide row is 28px of padding either side of a centred
      mark; three tools and a door reach 197px back from the right on a 375px
      phone and the mark ends at 212, so Delete landed *on* the N. Even at
      430 it clears by three pixels. So the row is told when the menu is open
      and its mark goes for as long as it is out. A DOM write from
      KeeperTools (`closest('.sitenav-row')`) rather than a boolean threaded
      through FullPostPage and SiteNav to hide one logo — and it is a no-op on
      the card, which has two tools, 29px of clearance and no such row over it.
- [x] **And *Your card* came off the desk** (Miyel). The card is corrected from
      the card now, which is the rule the rest of this repo already keeps:
      everything editable is edited where it prints. `/?edit=card` still works
      and still lands on the card with the correction open — an address now
      rather than a door. The desk is Start a listen, Inbox, Address book,
      Drafts and Settings: places you go, not tools.
- [x] **Verified after: every ··· opens leftwards out of a door that does not
      move** — 38px steps, measured at x=317 on the phone's card, x=284 on the
      spine, x=311 in the entry's nav row; the mark fades to 0 and back to 1
      with the menu and does not move; the desk has four rows and no *Your
      card*; the entry's row has no switch and its mark is still centred to
      the pixel; the beacon's sun flips the page to dark. The entry's own ···
      is behind the wristband and was read through the same CSS with the real
      markup injected into the row, not through the real header.
- [x] **And it files back in rather than disappearing** (Miyel, who asked
      before seeing it — it would have disappeared). The close was the same
      keyframes played backwards, which does not restart an animation; see the
      new entry at the top of Gotchas. Measured after the fix: 36px to 9px
      into the door over four frames, nearest tool first.

**2026-09-15 — two panes, and down means a cover. Branch `card-and-desk`,
version 1.18.0 — from Miyel's brief, the one whose rule came first and whose
layout fell out of it.**

- [x] **The rule.** Down is cover-then-contents, and exactly two things have
      that shape: the beacon, which is the journal's cover, and an entry's
      card, which is the entry's. The card and the desk are not covers of
      anything. Everything below is that sentence applied.
- [x] **Two panes, not three.** The cross is the turning pane and home.
      Sideways is you; down is the records. Three made sideways mean two
      different things — left about you, right your tools, both you, in
      opposite directions. The turning pane holds both faces at once, each
      its own scroller (`.hn-face`, absolute, `visibility` never `display`),
      so a face keeps where it was scrolled to and the feed and the inbox go
      on working behind the card. `paneMarks` returns two now and names the
      turning pane for the face it is showing.
- [x] **No floors, no arrival, no down caret on the turning pane.** `measure`
      answers false for anything but home, About's two `.hn-floor` wrappers
      are gone, and the desk's are too — the feed follows the doors straight
      down the same scroll. The phone's vertical snap moved from `.hn-pane` to
      `.hn-pane--home`. That is most of the axis problem gone, and it went by
      deciding what down *means* rather than by tuning a scroller.
- [x] **The turn is the same switch the desktop has.** `.hn-turn` moved out of
      the desktop block to the base and now rides in the row at the foot of
      the cross on a phone — where a thumb reaches — and at the top of the
      spine on a desk, where a pointer is. It is always in the markup and the
      stylesheet hides it on home (`[data-pane="1"]`), because on a desk
      `pane` never leaves its initial value: the rail is a grid with nothing
      to scroll, so a JS test would have taken the switch off every desk.
- [x] **The foot row, per pane.** What is permanently absent now leaves the
      row instead of sitting in it at opacity 0 — that opacity is for a
      control coming back, and a caret that cannot exist on this pane is a
      hole that pushed the switch a third of the way across the screen. On
      the turning pane the switch is centred on the screen and the one caret
      is pinned to the edge, which is the bar's arrangement. The right caret
      does not hide when the card is scrolled: that rule is for being inside
      something, and a page that has merely been scrolled is not.
- [x] **The crown shrinks.** The beacon keeps the large mark; the card and the
      desk carry a small one in their own header, beside the pencil or the
      gear. The card's header came out of `position: fixed` and into the flow
      — both reasons for fixing it were the crown's, and there is no crown.
      Header and lights share one line at 51px, measured, with the header
      stopping 52px short so the tools do not sit under the moon. On a desk
      the header's mark is hidden: the bar over the journal has it, and two
      marks on screen is two marks whether or not they are seen together.
- [x] **The card is a row, on one measure.** Portrait left, the counted facts
      beside it (`.idc-top` / `.idc-said`), which puts all three prompts and
      the pinned record on the first screen — the portrait alone was taking
      half of it. `.idc-inner` stopped being a scroller: the face is the
      scroller and a second one inside it meant the card could move while the
      page under it stayed put. On a desk the portrait takes a share (38%,
      96–168px) rather than a fixed square, because the spine is draggable.
- [x] **And then it was rebuilt on one left edge, after Miyel's phone look:
      "balance. waaay off."** She was right and the cause was three measures
      stacked on one page — the card object was a 340px column centred in the
      pane, the label-and-answer lines were a 300px column centred inside
      *that*, and the writing below was a 480px column centred in the pane.
      Nothing lined up with anything. The gutter belongs to the page now
      (`.ab-pane`, 22px, not the cross's 34 — that one was sized for the
      beacon's big centred square) and nothing inside sets its own; measured,
      every element on the page starts at the same pixel. Two more from the
      same look: the name went **above** the row and across the whole width,
      because an ornamented name in a 178px column broke into three ragged
      lines with its diacritics floating off the ends; and each label-and-
      answer became an unbreakable `.idc-pair`, because the wrap had been
      falling between a label and the thing it labels — "ALBUMS LOGGED 39
      SINCE / March 2026".
- [x] **The glance ran to the edges for an hour and came back in.** "The card
      should be edge to edge" put the portrait flush left; seen on the phone it
      read as cropped rather than bled, so it is back on the page's gutter with
      its radius and its shadow. What the hour was worth: the page is on one
      measure now and the bleed is gone from everything but the header.
- [x] **And then the glance became an identification card** (Miyel: "almost
      like an ID card, with the name above the text not the photo"). The
      photograph is a third of the width on the left, and everything written
      about the person is in one column beside it — the name at the head of
      it, then the counted facts, then the genres, then the pinned record,
      which used to be a full-width block underneath. Four facts set tight as
      rows rather than four loose paragraphs. The name is 21px in the column
      rather than 28 across the page: the size a name is on a card.
- [x] **The header is three slots: a tool, the mark, a tool.** The pencil on
      the left, the mark centred *on the window*, the printer on the right,
      and the window's light switch beyond it with 74px left for it. The row
      bleeds to the window to do that — centring on the page's measure would
      put the mark a dozen pixels off the one over the journal. Editing swaps
      the pair for Save and Cancel on the same two sides. The desk's header is
      the same geometry for the same reason: the mark has to hold still when
      the page turns, or the turn reads as a jump. Measured, both at the
      window's centre.
- [x] **Four measures went, not one.** `.idc`'s 320, `.ab-below`'s 480,
      `.db-body`'s 380 and `.fd-wrap`'s 480 were each a centred column inside
      a page that already had a gutter. The 380 was the instructive one: it
      centred the desk three pixels inside the card's edge, which is invisible
      on its own and not invisible at all when you turn between them and
      everything shifts by three. Both faces share one `--page-gutter` now,
      declared on `.hn-face`.
- [x] **The owner's card stopped carrying an empty row.** Both controls in
      `.idc-row` are the visitor's, so the row is the visitor's — gated once
      rather than twice, because an empty row still takes its margin.
- [x] **Three rules had to be edited where they already lived, not
      overridden.** `.ab-card`'s padding, `.idc`'s 320px measure and
      `.ab-below`'s 480px measure were each stated further down the file than
      the new page rules, so the new ones lost and the page kept insets it was
      supposed to have given up. Twice in one evening; see Gotchas.
- [x] **The desk is a band and three rows.** Start a listen is 92px of the
      width rather than a 180px square — it was the third square of a cross
      whose other two were a portrait and an album, and that cross is gone.
      Inbox, Address book and Drafts are rows with their counts at the far
      end. Settings is the gear in the header. The feed follows on the same
      scroll.
- [x] ~~**Drafts, with a count**~~ — **the row lasted a day and is gone**
      (see the newest entry in Complete). What it was: `count_drafts()` in
      database_actions and a
      fourth number on `/api/waiting` — its own query, not `pull_drafts()
      .length`, because that is a `SELECT *` over rows carrying a whole
      tracklist each. Not in `total`: that number is the Inbox's. The row
      goes to the picker, which already lists them (Miyel's call), and it is
      absent when there are none or when a record is already in hand — with
      one in hand `/session` resumes *that* listen rather than showing the
      list, so the row would not do what it says.
- [x] **Verified in the Claude browser at 375×812 and at desktop:** landing on
      home with the rail at 375; one screen down to the wall; sideways to the
      turning pane and the switch turning it, remembered; the card with the
      glance as a row and the prompts following in the same scroll; the desk
      with the band, three rows, counts of 3 and 2, the gear, and the feed
      below; the colophon with its crown; no horizontal overflow at either
      size; and the desktop spine still right, with the card's row
      re-proportioned for it. The owner's half was seen by stubbing the
      answer to `/api/auth/check` in the browser — no cookie, no secret,
      nothing written.

**2026-09-15 — the desktop is an open book, branch `open-book`, MERGED to
main as 1.17.0 and pushed (merge a0dece3), built clean before the merge — from
Miyel's brief. Replaces the three columns of 1.10.0 outright. No release cut
yet, so no copy's desk will offer the update until one is.**

- [x] **Two pages, not three panes.** `.hn-rail` is a two-column grid on a
      desk: the spine at `clamp(300px, 25vw, 420px)` and the journal taking
      the rest. The card pane and the desk pane sit in the *same* grid cell
      with the stylesheet showing one, so this is still the cross's own three
      panes and not a second markup tree — the thing DECISIONS has warned
      about since the two homepage trees drifted apart. `visibility: hidden`
      on the face that is not showing, never `display: none`: the hidden one
      keeps its scroll position, stays out of the tab order, and goes on
      running, which is what lets the feed update and the inbox count behind
      the card. Content starts at the top of both pages.
- [x] **The spine turns, and which face it was left on is remembered.**
      `hn--face-card` / `hn--face-desk` on the cross; the key is
      `ln-spine-face`, put back in a layout effect so the first render still
      matches the server's and nothing flashes through the wrong face. The
      journal does not move when it turns — measured, 300 before and after.
      Signed out the far face is the colophon, which is the same side of the
      same leaf, so one remembered answer covers both.
- [x] **What turns the spine (`.hn-turn` / `.hn-turn-side`, in
      `.hn-turn-row`).** A two-sided switch — CARD and DESK, or CARD and
      ABOUT signed out — on the archive density switcher's recipe (`.gd`),
      the side you are on lit and not pressable. **Centred over the spine**,
      on the bar's own geometry (22px down, the same 58px row), so it and the
      mark over the journal sit on one line, each centred on its own page's
      measure, with the lights at the far right of the window: measured, the
      switch at 150 of 300 and everything on the row at 51px. Five passes to get there and the reasoning is in Pending; the
      short version is that a single press can only say *something happens
      here*, and what needed saying is that the left page has two sides. The
      row takes no clicks and the buttons take their own back, the way the
      bar over the journal does, so there is no dead band across the top of
      the card. Stated `display: none` at the base so the phone never draws
      it, which a button in the markup otherwise is, in the tab order and
      read out, whether or not it can be seen.
- [x] **The colophon is the one thing centred.** `.hn-face--colophon`, a
      flex column with `justify-content: safe center` (safe, so a short
      window scrolls from the top instead of clipping the mark off it), and
      the only face that keeps its crown — a colophon without the mark on it
      is a paragraph. The key stays: it is the only way in, and the brief was
      describing what is on the face, not auditing the lock off it.
- [x] **The fold is one grip, and the width is remembered.**
      `hooks/useSpineWidth.js` — one number where `useColumnWidths` held two,
      the key `ln-spine`, clamped 300–520 with the journal never under 520,
      fitted to a narrower window without overwriting the preference, written
      onto the root as `--spine-w`. The rest width is a *proportion*, and the
      `clamp()` in nav.css is the same arithmetic as `restWidth()` so the
      server's first paint and the hook agree to the pixel. The floor rose
      from 240 to 300 because the spine now holds the inbox.
- [x] **The right page is what you are reading or writing.** An entry was
      already `over="journal"`; a listen is now too, so starting one turns
      the journal into the session and the spine stays exactly where it is —
      the feed still updating, the inbox still counting, the doors still
      there to press. `.lay--over-journal` is `left: var(--spine-w); right:
      0`, and so are the entry's header row, its neighbour carets, the
      correction bar and the print bar.
- [x] **The owner's rooms open on the spine.** `over="desk"` became
      `over="spine"` for the inbox, the address book, a person, a report and
      Settings: `left: 0`, the spine's width, in from the left and out the
      same way (`layFromLeft`, which already existed for the swipe). A
      shallow stack with the back caret as the way out; the sheet covers the
      turn line while it is open, which is right — you go back, you do not
      turn a page that is not there.
- [x] **Start a listen becomes Listening now, lit.** `.db-hero--lit` with
      the record's name under the words, because "Listening now" on its own
      is a light with no subject. Read as an external store
      (`useSyncExternalStore`, snapshot cached against the raw string) with
      `usePathname()` as the re-read — the address moving is every moment the
      answer can change, and the desk never unmounts so there is nothing else
      to hang it on. Written first as `setState` in an effect, which the
      project's lint rule refused; this is the shape that rule wants.
- [x] **Pressing Start a listen on an inbox row with a record already in
      hand now asks.** The browser holds one draft at a time, so replacing
      the record silently would look like it worked and then eat what had
      been written at the next autosave. `openListen` only asks when there is
      something to lose — the local draft exists and is about the record in
      hand — and `keepOpenListen` posts it to `drafts` in the shape
      useSessionDraft posts, from the browser's two keys rather than from
      React state, then clears the local copy. The same care the resume path
      already took. Unverified against real sends; see Pending.
- [x] **The band, at 88px, on the page colour.** The beacon stays at the top
      of the journal with the last three small at the right; 118px was the
      top of a column, this is a header on a wide page. The brief asked for
      the art blurred to the page's edges and it was built that way; Miyel
      took it out the same day — "it feels disjointed" — and that is right:
      a panel of the record's colour across the top read as something stuck
      on the page, and the wall under it already carries every colour this
      journal has. The markup went with it (`hn-band-ground`, and `track`
      out of the beacon's destructure), because a ground nothing draws is
      still an image the browser fetches, including on the phone, where it
      was never shown. See DECISIONS — it is the same call as the session's
      dark glass over a blurred cover.
- [x] **The card and the desk at the spine's measure.** The portrait to
      208px and the name to 26px (196px of rail was a reduction of the card,
      300–420 is the card); Start a listen is a wide tile with a floor of
      128px rather than a square, which at the spine's width would be a third
      of the page given to one door; the doors stay rows and the feed follows
      on the same scroll.
- [x] **The wall's bar wraps instead of crushing its search field.** On the
      right page at its own minimum — 520px, which is what an 820px window
      gives — everything in that row at once does not fit, and the thing that
      gave way was the search box, shrinking to the magnifier and nothing.
      `flex-wrap` on `.arc-bar` and a `min-width` on `.arc-search`; costs
      nothing at any width where the row already fitted, and helps `/archive`
      the same way.
- [x] **The note is a real field on a desk** — a 168px floor on
      `.ses-textarea`, which still grows as you type. The width is the same
      reading measure either way; height is the thing a phone cannot give
      you, and it is most of why a listen gets written up on a laptop.
- [x] **Verified in the Claude browser, signed out at 1440×900, 1024×800,
      820×800 and 375×812:** geometry by script (360/1080, 300/724, 300/520,
      three 375px panes); the grip dragged with the tool's own pointer and
      clamped at both ends, remembered across a reload; both faces and the
      journal not moving between them; light and dark; an entry opening on
      the right page with its carets inside it; no hydration warnings; the
      phone unchanged — crown, 180px art, "Before that", three carets, no
      grip, no turn line, no band. **The owner's half was seen by stubbing
      only the answer to `/api/auth/check` in the browser** — no cookie, no
      secret, nothing written — which drew the desk face, the lit hero, and
      the inbox, the address book, a report and Settings all opening on the
      spine with nothing overflowing. What that could not reach is in
      Pending.

**2026-09-15 — Sent by is a line on the entry, not a panel behind the chip,
on main as 1.16.0, released as
[v1.16.0](https://github.com/ListeningNotes/listening-notes/releases/tag/v1.16.0)**

- [x] **The panel of the night before is gone.** It was a bordered, shadowed
      card holding a SENT BY label, a 48px face, a name and a status line —
      the least important fact on a page where nothing else is boxed, behind
      a press, on a card whose whole job is the record. `Chain.js` is
      deleted and `SentBy.js` replaces it.
- [x] **One quiet line, always visible**, directly under the chips: a 21px
      round face, the name, a link to their journal. No caret, no border, no
      label, nothing to press to find it. The face is read off their journal
      the way the inbox, the feed and the address book already read it.
- [x] **No link to their entry, and nothing about what they thought.** That
      was the panel's second state and it comes out: a second opinion, and
      second opinions belong on their page in the address book, where the
      sends, the overlap and the hit rate already live. *Not on their
      journal.* is gone with it — it read as an error and answered a
      question nobody had asked.
- [x] **The Submission chip stands down where a name is printed.** Miyel's
      call: *Sent by Zach* already says the record was sent, so the chip
      would be a third pill saying worse what the line below says. It stays
      on the entries the line cannot draw — a credit the sender asked to
      keep quiet, and the 18 old Submissions with no name on them. One
      reading of the credit (`creditOn`) decides both, so the chip and the
      line can never both show, or both go missing.
- [x] **The trail is the one thing behind a press.** A `+2` at the end of
      the line means two people carried the record before the sender; it
      opens a horizontal band, right to left, newest first, with this
      journal at the left because it is where the record ended up. Each hop
      is a face, a name linking to their journal, and their rating — the
      ratings are why it belongs on the entry rather than in the address
      book: it is the record's history, not somebody's opinion of it. The
      last stop reads *found it* rather than naming nobody. Vertical would
      have grown the card by a row a hop and pushed the record off screen.
- [x] **No trail, no pill, which is most entries** — and that is what moved
      the walk from the press to the open. Knowing there is nothing behind
      somebody means having looked. One fetch of one public feed per hop, in
      the reader's browser, as before; the sender's server sees a hit and
      never learns who, and nothing is stored. The pill is drawn only once
      the walk has settled, so no number counts upward beside the reading.
- [x] **Walked once, not twice.** The entry draws its card twice — the
      phone's first screen and the desk's hero — and hides one at each
      width, so two copies of the line meant two walks, and the sender's
      journal and every journal behind it fetched twice for one reading.
      The panel had the same fault and nobody noticed, because it only
      walked on a press. `useTrail` is called once by the page and handed to
      both, the way the open-or-closed state already was. Confirmed in the
      browser: two lines in the DOM, one read of Zach's feed.
- [x] **The credit rides the hand-off**, so the stand-in that holds the
      first screen while an entry lands draws the same line. Measured: the
      name is on screen 729ms before the entry arrives and never goes
      missing, so the row does not change shape underneath the eye — the
      thing the rating and the flags were already on that list for.
- [x] **Nothing at all where a name was withheld.** A quiet credit reaches
      the page as no name, so the line does not draw and the chip stands in.
      That closes the open thread from the day before: the chain used to say
      *Somebody — the name wasn't kept*, which read as data lost rather than
      as somebody's choice. Nothing now says a name was withheld, because
      saying so would leak the fact of it.

      **Seen in the browser** (light and dark, phone and desk) on
      `im-in-your-mind-fuzz` and `lemonade` for the line, `donuts` for the
      chip, and a fixture for the trail — no real chain exists yet, because
      Zach's and Kai's journals both publish zero entries. **Miyel checked
      it signed in** before the merge and it was good.

      **Confirmed on the live site after the deploy:** the record from Zach
      serves the line and no chip, `donuts` serves the chip and no line —
      twice each, which is the card drawn for both widths as it always is.
      **`listeningnotes.blog` answers 308 to `www.`**, so a curl check of
      the live site wants `-L` or it reads a 15-byte redirect body as a
      page that has not deployed yet.

**2026-09-15 — the credit is published in the feed, and the sender decides
whether there is one, on main as 1.15.0, released as
[v1.15.0](https://github.com/ListeningNotes/listening-notes/releases/tag/v1.15.0)**

- [x] **Confirmed first, then fixed.** `feed.xml` already received the
      credit — it calls `pull_public_entries` — and dropped it, so a reader
      saw *(Submission)* where another copy saw a name. An item now reads
      *Beyoncé · 2016 — 4 (from Kai)*: the name and never the address, since
      a journal is shown by its keeper's name, and *from Kai* replaces the
      shelf it came off because it is the same fact and more of it.
- [x] **The sender decides, which was Miyel's question and the better
      answer.** The credit puts *their* name on somebody else's public
      journal, and until now they had no way to decline while the keeper
      could already clear the field. The send form asks — *Don't credit me
      publicly*, off by default — and the answer rides all the way: the
      send holds it (`submissions.quiet`), a paused listen holds it
      (`drafts.credit_private`, the same reason `received_from` is there),
      and the entry holds it (`entries.credit_private`), because losing it
      at any hop would publish a name somebody asked to keep off.
      Migration 012; all three ship false, which is what every existing row
      already is.
- [x] **And the keeper can set it, for what the form cannot reach.** A
      credit added by hand from the address book names somebody who was
      never asked — Kai's Lemonade is exactly that — and somebody may have
      said so in person. A pill in the flags row, *Don't credit them*,
      drawn only once a sender is named.
- [x] **One rule, one place.** `withoutChain` withholds it, so the entry's
      own read, the wall's and the feed's cannot disagree; the flag itself
      is never published, because whether something was withheld is not a
      reader's business.
- [x] **Verified end to end.** The rule tested directly — quiet withholds
      both fields, a Library entry never publishes a name, the flag never
      leaks — and then on the live row: flipped to quiet, the feed fell
      back to *(Submission)* and both reads dropped the name together, then
      restored. Nothing was left changed.
- [ ] **Names to confirm, 2026-09-15** — rename freely: `credit_private`
      and `submissions.quiet` (Miyel's), `CREDIT_GUARD`, `creditPrivate`;
      the words *Don't credit me publicly* (the form) and *Don't credit
      them* (the entry); `.sb-quiet` in forms.css.

**2026-09-15 — the lineage machinery retired, branch `park-lineage`,
merged to main and pushed as 1.14.1 — nothing a keeper sees, so the last
number, and no release: a release is cut when there is something to tell a
keeper (DECISIONS)**

- [x] **`source_entry_id` is parked and its guards are gone.** Briefed as
      *wire the send flow to set it*, and that turned out not to be
      buildable, so Miyel's call was to retire instead. Removed:
      `wouldFormCycle` and its recursive query, the write-once rule, the
      lookup and the same-`album_key` check, and the column from
      `save_new_entry`'s insert and `update_entry`'s set — about seventy
      lines out of `database_actions.js`. The column stays (additive-only)
      and `withoutChain` still strips it, so a revival starts private.
- [x] **Why the brief could not be built, kept because it will be asked
      again.** Two independent reasons. **An `entries.id` is local to one
      database** — June's 39 is not this journal's 39 — so a sender's id
      arriving here is rejected by the album check nearly always, and in
      the case where a local entry shares both the number and the album it
      is stored pointing at *this* journal's own listen, a lineage record
      claiming you got the record from yourself. **And a send has nothing
      to carry it from:** the send form is served by the *recipient's*
      copy, the album comes out of Apple's catalogue, and the sender is a
      visitor whose own journal is at an origin their browser cannot read
      from that page. Their copy contributes only the name and address it
      wrote into the link (`carrySender`). Reviving this needs a reference
      that means something in both places — their journal plus their
      entry's slug — and a send that starts on the sender's own entry.
      That is a feature, not a wiring job.
- [x] **Nothing was lost.** `Chain.js` already walks lineage across copies
      by following `received_from_url` and matching `album_key` in that
      journal's public feed. An exact pointer would only have said *which*
      listen, when somebody has more than one.
- [x] **The delete sweep is kept** (`UPDATE entries SET source_entry_id =
      NULL WHERE source_entry_id = …`). It can no longer match anything;
      it costs one statement on the rarest action on the site and is the
      difference between the column being revivable and its revival
      carrying a silent bug.
- [x] **The editor's sentinel still works.** `useEntryEditor` tells the
      keeper's read from a visitor's by whether `source_entry_id` is a key
      on the row at all, which `withoutChain` still decides. Left as it
      is, and now said out loud in the comment, because it is not obvious
      that a parked column is doing a job.

**2026-09-15 — the inbox, branch `inbox-logged`, merged to main and pushed
as 1.14.0 (something new: the middle number), released the same day as
[v1.14.0](https://github.com/ListeningNotes/listening-notes/releases/tag/v1.14.0)**

- [x] **New was never a place.** It is a property of a row, the way unread
      is in mail, and nobody keeps a read tab and an unread tab. So the two
      views are gone: one list newest first, a dot for what is new, and the
      state as a word in the subtitle — *new*, *in progress*, *logged 4
      august*, *archived*. Archived comes out of the order and sits behind
      *Show N archived* at the foot; opened, it goes on the end rather than
      back into the middle of what has not been dealt with. The folder tabs
      are untouched: sends one place, comments another, reports a third.
- [x] **Pressing a row opens it, it does not navigate.** That was the real
      complaint — pressing Submarine went straight into a listening session
      with no choice. It opens where it sits now (DECISIONS: a control opens
      where it belongs) and the session is one of the things you can pick.
      Open, the subtitle goes back to *artist · year*, because the state is
      the actions underneath.
- [x] **One primary, chosen by state.** New gets *Start a listen*, in
      progress *Resume the listen* (which finds the draft and hands it
      over — unchanged, and see Gotchas for the fold that makes it work),
      logged *Open the entry*, archived *Put back*. An archived row's
      primary being the way back is what lets archiving need no undo
      control of its own, so the `put back` at the end of a row is gone.
- [x] **The quiet actions are always there, whatever state a send is in.**
      That is the whole point of the change and the Jr case exactly: an
      album half-listened-to whose sender has since made a journal had
      nowhere to record it, because in-progress rows had no actions at all.
      They are plain rows under the primary rather than behind a second
      press, so the ··· menu is gone with its styles, and so is `Sender` —
      the open row writes its own *From* line, with the word in it.
- [x] **Archive is red again and last** (the brief's call, reversing the
      not-red of an hour earlier). It is still reversible; the colour is
      marking the one action that takes a row out of the list.
- [x] **Open the draft stays only where it is not the primary** (Miyel
      confirmed). On an in-progress row *Resume the listen* is already that
      act; the quiet row is for a new or logged send carrying a stray draft.
- [x] **Every new send said *archived*.** `became` fell through to the
      archived word for anything that was not logged or in progress, and
      pending is everything else — so the commonest state in the inbox was
      named after the rarest. Pending is *new* now and archived is matched
      by its own value. A fallthrough that names the rare case is a
      fallthrough that lies about the common one.
- [x] **The new dot is plain ink.** The live green was tried the same day
      and taken back out on Miyel's call: `--live` means something is
      playing *now*, and an unopened send is not an event — it is the
      unread dot mail has had for forty years. It keeps its room when
      absent so titles line up down the list.
- [x] **Verified:** the build passes and every row state was stood into a
      page to check the CSS. Nothing is defined in the sheet that the page
      no longer uses, and nothing used is undefined. **Not driven by hand**,
      as ever: the inbox is behind the password.

**2026-09-15 — the two-view redesign it replaced, same branch**

- [x] **The check the brief asked for first: an in-progress send and a
      draft are two things, not one.** `submissions.status = 'reviewed'`
      says a listen was started; `drafts` is its own table keyed on a fold
      of album + artist, with nothing joining the two. The inbox's Start a
      listen never handed the session a draft, so resuming that way would
      have opened on the right record, looked fine, and then written over
      the saved notes on the first autosave (`save_draft` upserts on that
      key). So Opened's *in progress* row finds the draft and hands it
      over, which is the path the picker's Resume already uses
      (`beginListen` takes `draft` on the record). With no draft found it
      falls through to a fresh listen, which is honest: nothing was saved.
      The fold moved to `entry_formatter.js` so the browser and the data
      layer share one copy — see Gotchas for why the *other* fold would
      have failed silently.
- [x] **Two views, not four.** New and Opened; started, logged and
      dismissed are one thing from the inbox's side. What state a send is
      in is a word in its subtitle (`became`) — *in progress*, *logged 4
      august*, *dismissed* — rather than a tab you have to be standing on.
      Comments and Reports keep their own folder tabs, untouched.
- [x] **New has one button.** Start a listen. The rare actions moved
      behind a ··· that opens in the row (DECISIONS: a control opens where
      it belongs): *I've already logged this*, the sender action, and
      *Dismiss*, which is the only destructive one and the only one in a
      colour.
- [x] **The sender is a face and a name.** The "IN YOUR ADDRESS BOOK"
      label and the row's *Link their journal* are gone. Their name is the
      link when the send carried a journal, which is what the label was
      saying with a second line of type; plain text when it did not.
- [x] **Opened is a record, not a queue.** Cover, album, what became of
      it, who sent it, no buttons, and no message — the note is for
      deciding and belongs on the entry afterwards. Dismissed rows at
      reduced opacity. One tap target: logged opens the record, in
      progress resumes the listen.
- [x] **One departure from the brief, deliberate.** **Add to address book
      stayed**, as a fourth menu item — DECISIONS names the inbox's Add
      button as one of the documented ways an address gets into the book,
      and dropping it would close that door. It and *Link their journal*
      are opposite halves of one question and never both apply, so at
      most three items show at once.
- [x] **Dismiss is Archive, and a dismissed row is an archived one**
      (Miyel, 2026-09-15). A send you put aside has been filed, not
      rejected, and it comes back with one press — so the menu says
      Archive and the row's state reads *archived* — **and it is not red
      any more** (same call, a moment later): red on this site means the
      delete at the foot of an entry, which really is permanent, and
      spending it on something reversible is how it stops meaning
      anything. The three menu items are one voice now. **The stored value is
      still `dismissed`:** renaming it means rewriting rows on every copy
      to say the same thing differently, and the column is not what
      anybody reads. `ARCHIVED` is the constant the code uses, with the
      string in one place. Reports and Comments keep their own Dismiss —
      a comment's deletes it, which is a different act — and were left
      alone rather than swept along.
- [x] **An archived row can be put back, very quietly** (Miyel, after the
      redesign, closing the one-way door it had opened). Opened has no
      buttons by design and this is the exception that design made
      necessary: dismissing was unrecoverable from anywhere. *put back*
      sits at the far end of the row in the row's own faded ink, in the
      same small type the state is set in, and comes up when a pointer is
      over it — 45px of target on 9.5px of type, taken in padding, so the
      row grows by three pixels and the words stay quiet. It returns the
      send to New. No confirmation: putting one back destroys nothing,
      and the worst case is dismissing it again.
- [x] **The menu's two panels open inside it, and the picker is tightened**
      (Miyel on her phone: the dropdown is not legible, *I've already logged
      this* is a little stiff). Most of the illegibility was base.css going
      stale — see Gotchas — and the strip was correct on disk throughout.
      What was genuinely wrong, once it rendered: the strip was drawn for
      the entry's Sent by, which has a phone's full width and is centred
      under a centred field, and an inbox row gives it 243px beside the
      cover, where three faces fit, centred, inside a list ranged left. So
      `MiniAddressBook` took a `tight` variant — 52px faces, 40px
      portraits, the name up to 9px, started at the left edge, four fitting
      — and it is still the same component the entry uses, which was the
      point of pulling it out. Both it and the record picker now render
      *inside* `.ib-menu` under a hairline, so the menu grows rather than a
      second box arriving below it unattached; `.ib-which` lost its own
      border and box for the same reason, which is what read as stiff.
      **The `--tight` rules live in forms.css**, not beside the strip in
      base.css: one surface asks for them, and it dodges the staleness.
- [x] **The scan comes first, the field second** (Miyel: can't the button
      find the entry and let you click it, rather than typing). It always
      did — `candidates` matches on `album_key` with nothing typed, and
      offers *every* listen of that album, which is the whole point when
      there is more than one. Nobody could tell, because the field was the
      first thing in the panel and **not one of the six sends in New has a
      record in the journal**, so the empty state was the only state ever
      seen. Matches now render above the field; the field's placeholder
      says what it is for (*Logged under another name?* when there are
      matches, *Search your journal* when there are none); and a row for an
      album with several listens reads *Listen 2 of 3 · date* instead of
      repeating the artist on every line, since which listen is the
      question being asked. Nothing about the matching changed.
- [x] **The menu's two panels are one at a time** (Miyel). Opening the
      record picker closes the address book and the other way round, so the
      menu never grows two panels asking different questions about the same
      send — which is the stack of controls this redesign took off the row.
      Every way in and out clears both now: the two openers, the ··· toggle,
      and switching view. The last was invisible rather than harmless — the
      menu is closed by then so nothing draws — but leaving one set means
      the next menu opened on that row comes up with a panel already open.
- [x] **The ··· is a mark, not a second button** (Miyel). It wore a pill
      beside Start a listen, and two pills side by side read as two equal
      choices — the opposite of the row's whole point. No border, no
      ground, pushed to the far right edge, so what sits between it and
      the button is room rather than an eight-pixel gap. Start a listen
      keeps the left edge. Still a thumb's target, taken in padding
      weighted left so the mark lands on the edge and not the padding;
      full ink while the menu is open.
      **And it is Phosphor's `DotsThree` now**, not three middle-dot
      characters: the label face set those unevenly, at a size that read
      as punctuation somebody had left behind. An icon is one shape, drawn
      the way every other mark on the site is. Safe here where it was not
      on the entry's first screen — the inbox has no stand-in rendering
      the same row a beat earlier, so nothing can shift when it arrives.
- [x] **Built to Miyel's two mockups, 2026-09-15.** She drew the inbox and
      said follow the look, with one correction: the album art square, not
      the tall rectangles the drawing had. What changed:
      - **The folders are unchanged, and that was a mistake I made and
        undid.** Following the drawing, I flattened the three folder tabs
        and the two views into one row of four and added an *Inbox*
        heading. Miyel had asked for what was *inside* New and Opened to
        change, not the box holding it: sends are one place, comments
        another, reports a third, and the two views belong inside the
        first. Put back the same day — `FolderTab`, the `filter` state,
        `.ib-filters` and the folder-tab styles are all as they were, and
        the heading is gone. **Only the contents of a row are new.** When
        a drawing implies a structural change that was not asked for,
        take the look off it and leave the structure alone.
      - **New rows are three rows and a button** (Miyel, over two passes).
        *From:* then a round face, the sender's name carrying the link's
        underline, and the date, all across the top — a send is somebody
        handing you something, so who comes before what. The record is its
        own row under that, which is what puts the cover in line with the
        album's name instead of with somebody's face; square at 84px, 68
        on a phone. Then the message, full width. Then Start a listen.
        The ··· left the button's line for the row's top right corner:
        extra, and out of the way of everything that reads left to right.
      - **Opened rows:** square art at 56px, the album at 17px, the
        subtitle now *artist · what became of it* rather than the state
        and the sender's name, and the sender is a round face at the end
        of the row. Dismissed still dimmed, with *put back* before the
        face.
      - **Square is enforced with `aspect-ratio`, not a matching height**,
        on both — a fixed height is the one thing that could argue with it
        and is exactly what made the drawing's art tall.
      **The mockups said WAITING and HANDLED**; they are NEW and OPENED,
      which is the rename she asked for after drawing them. The look was
      the instruction, not the words.
- [ ] **Names to confirm, 2026-09-15 (the redesign)** — rename freely:
      `VIEWS`, `UNOPENED`, `unopened`, `became`, `Sender`, `resumeListen`,
      `menuFor`;
      the words *new*, *opened* (Miyel's, replacing waiting/handled),
      *in progress*, *logged 4 august*, *dismissed*, *Nothing new.*,
      *Nothing opened yet.*; the
      `.ib-who*`, `.ib-more`, `.ib-menu*`, `.ib-done*`, `.ib-back`,
      `.ib-sent-head`, `.ib-sent-label`, `.ib-sent-body`; the word *From:*
      classes in forms.css; the words *put back*; and `lookup_key`
      keeping its name where it moved to.
- [x] **Verified:** the build passes, the draft lookup was run against the
      five real drafts and found each one by album and artist (and the
      wrong fold shown to miss), and both views were stood into a page to
      check the CSS on a phone. **Not driven by hand:** the inbox is
      behind the password, so the ···, the resume and the two views are
      Miyel's review. Nothing was written to any real row.

**2026-09-15 — the inbox needs a third outcome, the first half of that
branch**

- [x] **A send can say it was already logged.** Migration 010 adds
      `submissions.entry_id` (integer, `ON DELETE SET NULL` — the
      `settings.pinned_entry_id` shape, deliberately not the
      `comments.entry_slug` one) and `log_submission` in
      `submission_actions.js` writes it with status `logged`. On a row,
      *I've already logged this* opens a picker in place: the likely
      record first, matched on `albumKey` so a send finds its entry
      through either spelling, and a field for a record logged under
      another name. One press does two writes — the send is marked and
      pointed at the record, and that record gets `entry_type =
      Submission` and the sender's name and journal — so the connection
      exists in the data and not only in Miyel's head. The journal is
      fetched the first time anybody presses, never on load.
      **The credit is not overwritten** where the entry already carries
      one: a button on another screen should not quietly replace what she
      typed by hand.
- [x] **A fourth tab, and `reviewed` keeps its own meaning.** The premise
      of the brief was that the inbox had two outcomes; it had three —
      `reviewed` was already being set, by Start a listen, and shown as a
      tab. It is a claim about an intention (a listen was *started*,
      before any entry exists) and `logged` is a claim about a record, so
      they are not folded together. Tabs now read pending / started /
      logged / dismissed, labels in `OUTCOMES` and the raw values
      untouched, so no row is rewritten.
- [x] **A send's sender resolves to the address book.** Sends arrive
      before people have copies — that is the normal case, not an edge
      one — so a row with a name and no address offers *Link their
      journal*, and the same strip of faces the entry editor uses fills
      in `sender_url`. The name they signed stays as they typed it.
- [x] **The picker became its own file.** `MiniAddressBook.js` (Miyel's
      name) in main_components, with its strip styles moved out of
      entry.css into base.css, since two surfaces draw it now. The entry
      editor renders it instead of its own copy.
- [x] **Verified** without a wristband: migration applied to the live
      database (column and foreign key both present), the new
      `pull_submissions` join run read-only against the nine real rows,
      all three owner routes answering 401, the build passing, and the
      row's markup stood into a page to check the CSS on a phone.
      **And both controls are confirmed on the dev server**, by Miyel the
      same day, on the one real case there was — the Kailea send (#3),
      which is the case the brief was written about. It carries
      `wizkailea.vercel.app` where it had nothing, and it is `logged`
      and attached to entry 39, `lemonade`, which reads as a Submission
      credited to Kai at her address. The **don't overwrite** rule
      showed its work: the entry already carried that credit from an
      earlier correction, so the press set the status and the link and
      left the writing alone. Nothing I ran wrote to any real row.
      **No backlog behind it:** the other five open sends have no entry
      in the journal under any spelling, so Pending is telling the truth
      about every one of them, and the button is for the next send that
      gets listened to outside the flow rather than for a queue.
- [x] **Three sends carried an email in `sender_url`, fixed the same
      day.** Submissions 4, 5 and 7 held `josejunior770@gmail.com`, from
      before the email field was retired, and `tidyAddress` read it as a
      host — something, a dot, something is the whole test — so each row
      drew a *their journal* link to `https://josejunior770@gmail.com`,
      which goes nowhere. Two halves: `LOOKS_LIKE_A_HOST` in
      `return_address.js` now disqualifies an `@` (checked against every
      real address in the book and in settings: only the two email cases
      change, and `localhost:3000` was already rejected for having no
      dot), and migration 011 clears the ones already stored. **Cleared
      rather than converted** — the host after an `@` is a mail provider,
      and filing somebody under gmail.com is worse than not knowing — and
      the name on the send is untouched, so those rows now offer *Link
      their journal* and the address book answers it. `people`,
      `entries.received_from_url` and `comments.author_url` were checked
      and held none. Jr is almost certainly June (the same account owns
      `userone`, which is `userone-silk.vercel.app`), but that is an
      identity call to make with one tap, not a guess to write into a row.
- [ ] **Names to confirm, 2026-09-15** — autonomous session, rename
      freely: branch `inbox-logged`; the words *I've already logged this*
      (the brief's), *Link their journal*, *Which record was it?*, *Logged
      as …*, and the tab word *started* for `reviewed`; `OUTCOMES`,
      `openNaming`, `alreadyLogged`, `nameSender`, `candidates`, `naming`,
      `whose`, `look`, `mine` in the inbox; `name_submission_sender` in
      `submission_actions.js`; the `.ib-which*` classes in forms.css.

**2026-09-14 — credit the person who sent it, branch `credit`, merged to
main and pushed 2026-09-15 as 1.13.0 (something new: the middle number),
released the same day as
[v1.13.0](https://github.com/ListeningNotes/listening-notes/releases/tag/v1.13.0)
— so every copy brings it in within the hour and every desk says so.**

- [x] **Sent by is picked off the address book, sits at the head, and
      shows on the entry.** The three changes of the brief. In edit mode
      the Sent by field moved from the foot (where a heading called it
      private) up under the flags on the first screen; the address book's
      people are faces beneath it — the portrait their journal serves in
      the book's rounded square, the name under it — in one row that
      scrolls sideways once there are more than fit (Miyel's call after
      the first cut, which was name pills: "I had a hard time knowing Kai
      was Kai", and forty friends as pills would be a wall). Typing
      narrows the row; tapping a face fills the name and links the entry
      to their journal (`received_from_url` — the editor now sends it, and
      no longer sends `received_date` at all: no date on a backfill,
      DECISIONS). Typing does not unlink, so his journal can say Zachin_Off
      and the entry say from Zach; tapping the lit face unlinks and keeps
      the name; emptying the name drops both; naming a sender turns the
      Submission shelf on. The layer's sideways swipe stands down while a
      correction is open (`.ln-editing`, beside `.ln-printing` in
      LayerEntry), so thumbing the faces cannot land on the next record.
      **The edit stack fits the first screen on a phone** (Miyel, second
      round: the faces were just under the fold): while correcting, the
      crown's margin comes down to 108px and the art steps back to
      `min(24dvh, 50vw)` — it is a button to replace the cover in that
      mode — and the screen grows past one viewport only if it still has
      to; the desk's hero grows too (`height: auto` off its 390px band,
      the pad in flow). Measured with the whole stack stood in: the faces
      end 172px above the foot of an 812-tall phone, 54px on a 667.
      One rule for what leaves the building, `withoutChain`: the two
      credit fields on a Submission row on every read (entry, wall, feed);
      `source_entry_id` and `received_date` private always. **The lineage
      picker is gone from the editor** (Miyel, same day): `source_entry_id`
      is write-once and undone only in SQL, was hand-editable only because
      nothing set it yet, and with three copies had nothing to point at.
      The column stays, `update_entry` keeps its write-once rule, and a
      send flow can set it when both people have copies. The `kin` fetch
      that fed the picker went with it.
- [x] **The sender opens, it doesn't display — Miyel's amendment, the
      same day.** The chip says *Submission* and wears a small caret;
      pressing it unfolds `Chain.js` under the chips on a phone (the
      screen grows, as while correcting) and under the hero on a desk (in
      `.ln-cover-hero`, where the cover's address field already goes): who
      sent it, with their face and a link to their journal when the credit
      carries one; whether they logged it, read off their public feed on
      the press and never on load; and the chain behind them, each hop
      from the previous entry's own credit, up to eight, stopping in a
      sentence — *Not on their journal*, *Their journal isn't answering*,
      *No journal to read*, *The name wasn't kept*, *Their own find*. The
      first cut printed *from Kailea* on every sent entry: somebody else's
      name on the page by default, decoration rather than the network. This
      absorbs the View chain control. Verified signed out on a desk and a
      phone against Kai's live journal (Not on their journal) and with
      stand-in feeds for Kai's and Zach's (Logged it too · Before that ·
      Their own find). Chip is a button through `Chip`'s new `onClick`.
      **No envelope in the chip, and the caret is CSS** (Miyel, later the
      same day): the first screen's chips are words, alike, and the marks
      are the strip's on screen two. What she saw as icons loading late
      and shifting the page was the layer: `LayerWaiting` drew a plain
      Submission chip and the entry landed with the envelope and an icon
      caret inside it — and, measured, the larger part of the drop was
      the stars: the real page wrapped them in a box that sat on a 38px
      text line, the stand-in drew them bare at 24px, so the chips and
      the date landed 15px lower. The wrapper is `display: flex` now, the
      stand-in draws the identical inert button with the CSS chevron, and
      the two screens measure the same line for line.
- [x] **The person's page counts what they are credited on.** A record
      credited to their address with no row in `submissions` — a Tumblr-era
      listen backfilled by hand — is one more send in Sent you and the hit
      rate, undated, falling in by the day it was logged. The brief's point:
      Zach's page has a real record the moment he is on the entries.
- [x] **Verified** in the Claude browser, signed out: the entry page (desk
      and phone), `/api/entries`, `/api/public/entries` and
      `/api/entries/lemonade` all carry the credit on Submission rows only,
      with the date and the pointer absent. **Not yet driven by hand:** edit
      mode (the pills, the save) and the person's page, both behind the
      wristband — Miyel's review on the dev server. Nothing was written to
      the live database.
- [ ] **Names to confirm, 2026-09-14** — autonomous session, rename
      freely: branch `credit`; `CREDIT_FIELDS` and `credited` in
      `database_actions.js`; `book` on `useEntryEditor`; `senderField`,
      `senderChoices`, `sendBy`, `writeSender`, `sentChip`, `chainOpen`,
      `chainPanel` in `FullPostPage.js`; `Chain.js` (Miyel's pick) and
      inside it `Hop`, `Face`, `firstHop`, `readJournal`, `MOST_HOPS`,
      `EACH_MS`, the hop states `asking / logged / unlogged / silent /
      nowhere` and `origin`; the `.ln-chain-*` classes for the panel
      (`-caret`, `-head`, `-hop`, `-face`, `-who`, `-name`, `-said`,
      `-open` on the screens); the
      `.ln-sender*` classes in entry.css (`-row`, `-label`, `-book` for
      the strip, `-face` for one person, `-portrait`, `-name`); the words
      *Sent by*, *Before that*, *Logged it too*, *Their own find*, *Not on
      their journal*, *Their journal isn't answering*, *No journal to
      read*, *The name wasn't kept*, *Where this record came from* (the
      chip's label), *Nobody — I found it*,
      *Lineage · only you see this*; `credited-<id>` as the synthetic id on
      the person's page.

**2026-09-15 — copies update themselves, 1.12.0, on main**

- [x] **Copies take the latest release, not main, 2026-09-15 (Miyel).**
      The script lists upstream's `v*` tags (`git ls-remote`, no API to be
      rate-limited), picks the newest by version, fetches that tag and
      merges it; main is the fallback only for an upstream with no
      releases. The button does the same. Tested locally: a copy at 1.10.1
      with main a commit past v1.12.0 lands on v1.12.0's commit. No file
      change for copies — the script is fetched from main on every run.
- [x] **The workflow runs hourly as well as on its button.** `schedule:
      '17 * * * *'` in `update.yml`. On a scheduled run the script refuses
      to cross a major version (says so on the summary, exits clean) and
      turns a clash into a quiet summary rather than a failure, so GitHub
      does not email the keeper every hour; the button, pressed by a
      person, still fails properly with the files named. Tested locally
      (a copy at 0.9.0 refused 1.11.1 on schedule and took it by hand).
      **Existing copies paste the file once more** — the button cannot
      change workflow files — through the pencil on the file this time;
      new copies have it. June's link for that:
      `https://github.com/josejunior770-spec/userone/edit/main/.github/workflows/update.yml`.
      GitHub switches schedules off after 60 days without commits (the
      file says so; one press turns it back on). The update check moved
      to hourly in 1.11.1 the same evening, after June's desk showed
      nothing for a release cut minutes before.

**2026-09-14 — the send form knows who is sending, branch `sending-as`,
not merged**

- [x] **Links out carry the sender; the form has two shapes.** Blue
      arrived at Miyel's journal from his own address book and was asked
      for his name and his journal in two empty fields. Now every link out
      of a copy to another journal — the address book's visit link, the
      person's page's links, the feed's, the inbox's — carries `?from=` (the
      keeper's journal) and `?as=` (their name), built by `carrySender` in
      `library/return_address.js`; `Bookplate`, the one client component on
      every page, reads them on landing with `noteArrival`, keeps them as
      the return address, and takes them off the bar. The send form then
      shows "Sending as Blue · blue-journal.vercel.app" with a Change button
      that opens both fields filled; a visitor who arrived cold is asked
      for a name only, and the journal field exists nowhere else. Tested on
      the dev server both ways. **Both copies have to be at this version**:
      the sender's writes the link, the recipient's reads it. Names to
      confirm: `carrySender`, `noteArrival`, `?from=`/`?as=`, `.sb-sender`,
      `.sb-change`.
- [x] **Two small things from Miyel, same day.** Nobody sends themselves
      an album: the card's Send pill is not drawn for the owner, and
      `/submit` reached by address says "This is your journal" instead of
      the form. And no "Add Miyel" pill for a visitor whose own copy said
      on the way in that this journal is already in their book: the
      address book's, the feed's and the person's page's links carry
      `?known=1`, the inbox's carries it when the sender is filed, and the
      card hides the pill on the flag (`knownHere`, `subscribeSender`).
      Arriving cold the pill shows — the journal cannot know. Verified on
      the dev server signed out; the owner's two (no Send pill, the
      /submit line) are behind the password and unseen.

**2026-09-13 — setup fixes from the Peyton install, branch `setup-fixes`,
MERGED to main as 1.10.1, pushed, release v1.10.1 cut** — from Miyel's brief: three
things from watching somebody else go through setup, one from the Last.fm
decision.

- [x] **An eye on the password.** One switch inside the first field; the
      confirm follows it. Shown, both fields are plain text with autocorrect
      and capitals off, so a phone does not rewrite a password it can now
      see. The real form, the submit, `autocomplete="new-password"`, the
      visible username line and the 16px rule are untouched. `.su-peek` /
      `.su-eye` in forms.css. Setup only — the Settings password section has
      the same two fields and no eye yet.
- [x] **The name field's placeholder was Miyel's name.** Gone; the label
      says Your name. Swept the rest: the card editor's rig placeholder was
      her actual headphones (Sennheiser HD 600 / Headphones) and shows the
      setup screen's neutral pair now (KEF LS50 / Speakers). Nothing else
      instance-specific outside the two fixed addresses (Get one, reports).
- [x] **Last.fm and the Anthropic key out of setup.** Both screens removed;
      STEPS is name, photo, prompts, rig, password, home screen. Both live
      in Settings, unchanged. README: the AI paragraph and "Claude AI
      (optional)" gone from the top, step 3 rewritten. ARCHITECTURE,
      DECISIONS and the install guide's step-eight sentence updated.

**2026-09-13 — the desktop layout, branch `desktop-columns`, MERGED to main as 1.10.0, pushed, release v1.10.0 cut the same evening (Miyel: quick, refine later):
three columns at three widths, the beacon as a band, layers that share the
screen** — from Miyel's brief, and three notes she sent while it was built.

- [x] **Unequal columns.** The card about 196px, the desk about 186px, the
      centre the rest; content from the top of every column; no crown on a
      desk — the mark sits in the bar over the centre, the way every other
      page's row carries it, and the bar earns its ground when the wall
      scrolls. `hooks/useColumnWidths.js` keeps the two widths in
      localStorage (`ln-columns`), clamps them (150–380 each, the centre
      never under 480), fits them to a narrower window without overwriting
      the preference, and writes them onto the document root as `--hn-left`
      and `--hn-right`. The grips are the two dividers (`.hn-grip`): dragged
      with a pointer, or nudged 16px with the arrow keys once focused.
- [x] **The band.** `.hn-band` / `.hn-band-ground` in nav.css: the record
      blurred 32px under a 52% wash of page colour, bled to the column's
      edges; the cover at 118 with a soft shadow, the label, the title at
      22px, the artist; the three recent covers at 28px at the far right on
      the cover's baseline, with no line over them. The same ListeningBeacon
      and recent row as the phone, restyled above 769px.
- [x] **The card, the desk, the colophon and the feed at rail width** —
      desktop blocks at the foot of nav.css and idcard.css. The desk's three
      doors become rows; the pinned record takes the row under its label.
- [x] **Layers share the screen on a desk (Miyel, mid-build).** `over` on
      LayerEntry: `"journal"` for an entry, which covers the centre column
      and leaves the card and the desk beside it; `"desk"` for the inbox,
      the address book, a person, a report and Settings — a panel at the
      right edge, `max(the rail, 520px)`, in from the right and out the same
      way. A listen, the send form, /get's pages and the printer door stay
      whole-screen. Everything the entry pins to the window (its header row
      and band, the neighbour carets, the correction bar, the print bar) is
      pinned to the column instead; the grow-from-the-tile animation
      measures from the sheet's own corner now, so a person's page grows from
      a feed face into the panel.
- [x] **A back caret on every layer, desktop only (Miyel, mid-build).**
      `.lay-back`, in a sticky slot of no height at the top of the sheet, so
      it stays at the sheet's own corner whatever the sheet is and moves
      with it while it grows. The owner's tools on an entry move 40px right
      for it. The phone is untouched.
- [x] **Verified in the Claude browser at 1280×800, signed in:** geometry by
      script (196 / 898 / 186, grips astride both dividers, bar and mark
      over the centre, both rails starting on one line at 68px); the inbox
      panel opening at 520 and closing on its caret; an entry over the
      journal with its header, carets and caret inside the column, closing
      on Escape; a dragged width surviving a reload; dark mode (the band on
      the dark wash, the wall on dark ground); the phone at 375 unchanged
      (crown, 180 art, "Before that", carets; no band, grips or bar mark);
      the signed-out colophon on 127.0.0.1 (server-rendered — that origin's
      scripts do not load in the pane). See Pending for what is not yet seen.

**2026-09-13 — the printer becomes a mode of the entry page, branch
`printer-fit`, merged to main as 1.9.0 the same day (a new shape for the
mode and two new files: the middle number), pushed, release v1.9.0 cut with
the keeper's update steps (1.8.0 was never pushed on its own; v1.9.0 carries
both) — Miyel's
redirection after seeing the press on her phone: "the printer is the door
into the app"**

- [x] **The entry's first screen is the flyer.** `printing` state in
      FullPostPage, the way `edit.editing` is: the notes, the cue and the
      date step aside, the keeper's name appears under the mark, the horizon
      (HorizonChart, no labels, ink at half) under the chips, and a ground
      sits behind the card — the record blurred across the screen (CSS blur
      on the cover, a wash of `--bg` at 62%), plain day, plain night; the
      two plain grounds set the page's tokens on the container so plain
      night is night whatever the theme. Tap a line to leave it off (`.ln-off`
      at 18%), tap again to bring it back; the marks cycle chips → the
      feed's symbols (Phosphor Heart / SketchLogo / Fingerprint at 34) →
      gone; a sideways touch swipe on the screen turns the ground, and
      LayerEntry stands its own gestures down while `.ln-printing` is on
      the sheet. The art is inert and its code badge hidden.
- [x] **`hooks/usePress.js`** (Miyel's name) makes the picture: the plate
      drawn at the chosen paper with the page's choices and `ground`, then
      Save (download), Send (share sheet) or Link (clipboard), the address
      copied first and said in the cover's words. **`PrintBar`** (hers too,
      in Slug_Page) wears the correction bar's clothes: three ground dots,
      a row of the four sizes, and Send / Save / Link / Done. Sizes were
      offered after Save at first; after her phone look she wanted them
      seen, so the screen is now a PAPER of the picked size — fitted between
      the nav and the bar (`height: min(100%, width / ratio)` with
      `aspect-ratio`), the ground inside it, and the card scaled to fit by a
      ResizeObserver setting `--print-scale` (`.ln-print-stack` /
      `.ln-print-card` are `display: contents` until printing). The wide
      paper lays the card as a grid, cover left. Blur 11px and a 46% wash on
      screen, the plate at 0.03 of the width and the same wash — her call:
      the art has to come through; the earlier offset image left a bar down
      one side of her phone, so the image is scaled from its centre instead.
      Later the same day, from her phone: the card scales against the room
      inside the paper's padding (against the paper it spilled both ends);
      the paper's top clears the phone's inset; the bar reaches the screen's
      foot on the home screen (the press's rule, moved); the plain grounds
      set their tokens on the mode's box only — from the root they turned
      the whole site — and the card carries its own copy of the mark at the
      head, so the nav's stays the site's; a hint sits under the bar until
      the first tap ever on that browser (`localStorage` `ln-printing-learned`);
      the print's artist line wraps to two lines like the screen; the wide
      paper keeps the cover LEFT (she preferred it, after an hour on the
      right), as large as the paper allows, the writing beside it, on
      screen (grid, writing zoomed to 0.55) and in the plate. Then, from
      her first real export: the plate's hidden story margins (13% top and
      bottom, 24% sticker room) came out; the print fits the paper's 7%
      padding like the screen, with the screen's proportions (art 78% of
      the card, gaps of 12, horizon 52) — recorded in DECISIONS. And Save
      on a phone is the share sheet (`navigator.share` with the file —
      Save Image is on it), a download elsewhere; the Send button went.
      **A dev copy on plain http gets no share sheet** (iOS gives it to
      https only), which is why Miyel's phone showed the download preview
      instead: so a phone without the sheet now gets the finished picture
      ON the paper (`press.picture`, `.ln-print-out`) — hold it and iOS
      offers Add to Photos, tap it to come back. The live site is https and
      will get the sheet.
      Then: the hint shows on every opening until that opening's first tap
      (once-ever was too little); the mark cannot be left off but a tap
      lights its dot in the site's green (`liveDot`, drawn over the mark in
      the plate at the dot's own place in the 76 96 241 140 box); the title
      and the artist line are tappable lines too.
      Then: the hint is "Tap an element to remove or add it." (the long one
      was cut off); the bar's "Printing" label went; Copy link says what it
      does and copies the old way (a selected hidden field, execCommand)
      when the clipboard API is missing, as it is on http; and while the
      final picture is up the bar is only "Back to the card" with the
      hold-to-save line — nothing else can be changed from there.
      Then: Copy link went (the cover on the entry page copies the address,
      and Save copies it too); the plate's numbers were set to the screen's
      so the saved picture is the preview (mark 44, HorizonChart's 52 over
      13 of headroom, hearts of 10 lifted 4, bar corners 3, a gap by track
      count, the keeper line's padding) — compared side by side; the bar is
      PORTALLED onto the body at z 400 so it keeps the site's colours while
      the paper sets its own (a night paper turned the buttons dark, which
      Miyel called wrong), and it names the ground above the dots: Reflect
      (her word for the cover blurred behind the card), Day, Night.
      Then: the bar's line moved to the TOP of the bar and darkened — on the
      home screen a last line hung below the viewport unseen — and the
      "reach the screen's foot" rule came out: the band below the installed
      app's viewport cannot be painted by a page (a bar stretched into it
      lost its own foot, "cut off at the bottom"), so the bar stays inside
      the viewport and the band, showing the page's --bg, reads as its foot.
      The same is true of the old press's rule; that one is gone with it.

**2026-09-13, after the release, on main (Miyel's call: edit main directly)**

- [x] **Save in two taps.** On the live site (https) the share sheet came
      up straight from Save and skipped the look at the finished picture.
      Now the first tap makes the picture and shows it on the paper with
      the address copied ("This is your print, and its address is copied");
      the second, Save in the final bar, hands it over — `navigator.share`
      with the file on a phone, a download on a desktop (`press.deliver`,
      `canDeliver` = share or no touch). A phone with no sheet has no second
      tap: it holds the picture. The dev server was stopped by the app
      between turns and started again.
      The header (the nav row: mark and light switch) stands down while
      printing — `html[data-printing] .sitenav-row` — and the paper takes
      its room; the card carries its own mark (Miyel, same day).
- [x] **What went.** The press as a sheet: `SharePrinter.js` is now only the
      toolbox (FRAMES, PAPER, the canvas tools); its sheet, the ghosts on a
      canvas and the tap targets are in git before 2026-09-13 (the plate's
      `preview` ghosts and `targets` are still in EntryPlate.js, unused).
      The `.shp` rules are out of forms.css. `/printer?entry=` redirects to
      the entry; `/printer` bare is still the card's sentence.
- [x] **Desktop.** The mode shows the same first screen at width; the hero
      is hidden while printing.

**Earlier the same day — the printer on a real phone, 1.8.1: what Miyel
saw and what changed (superseded above, kept for the lessons)**

- [x] **The press opens in place over the entry.** On a phone the entry is
      a sheet over the journal, and the layer slot holds one page: the
      printer route replaced the entry underneath and closing it rebuilt the
      entry with the journal flashing through. KeeperTools' printer is a
      button when the page hands it `onPrint`; FullPostPage keeps a
      `printing` state and renders `EntryPlate` with `onClose`. Close is
      instant, the page untouched (checked: the layer, and a marker set on
      the window, both survive). `/printer?entry=` still works cold, as a
      link elsewhere. Recorded in DECISIONS.
- [x] **The press rises when portalled** (`.shp--rises`, entry.css's
      layRise), so opening in place still comes up from the foot.
- [x] **Under the phone's bar, not behind it.** `.shp-bar` pads by
      `env(safe-area-inset-top)`.
- [x] **The option rows wrap instead of scrolling sideways.** Six chips in a
      sideways scroll felt long and unnatural; a row's chips are fixed by the
      plate, so wrapping never moves the print. Chips a shade smaller.
- [x] **No bar.** "The record" across the top said nothing the paper did
      not; the plate's title names the dialog for a screen reader instead.
      The paper takes everything above the look's name, the controls sit at
      the foot, and the press fills the screen edge to edge (checked at
      375×812: the press is the viewport, the controls end at its foot).
- [x] **Tap the card (Miyel's brief, 2026-09-13).** The Show row is gone.
      Every switchable line — keeper, stars, marks, horizon — is tapped on
      the preview to leave it off and stays as a ghost (the line at 18% of
      its ink) to be tapped back; the marks cycle chips → symbols → gone;
      the sticker's room is a dashed pill in its band, a fainter one in the
      foot margin when off. The plate's `draw` takes `preview` (ghosts only
      then) and returns the boxes it laid each line in; the press hit-tests
      a tap (a finger that moved under 8px) against them, scaled by the
      paper's size on screen measured at the tap — not the remembered `z`,
      which lagged a resize by one step and put every tap a line off — with
      every box at least 44px tall on screen. The print is drawn again
      without ghosts at Save. Choices persist for the session under
      `sessionStorage` `ln-press:<plate title>`. A one-line hint sits
      under the buttons until the first tap. `canvas.__targets` is set for
      the pane's tests. Named looks stay the fallback if taps feel fiddly.
- [x] **Escape closed the press and the entry together.** Both listened on
      the window; the press now hears keys in the capture phase and stops
      them. Miyel reported the entry not closing after backing out of the
      printer; not reproduced in the pane (a simulated pull-down and Escape
      both close it after the printer), so watch for it on the phone.
- [x] **The home-screen app's short viewport.** A readout on the press
      (temporary, removed) showed Miyel's installed copy hands the page a
      viewport one status bar shorter than the screen — 812 of 874, inset
      top 62, bottom 34, standalone true — pinned to the top under the
      clock. So a press at the viewport's foot stopped 62 above the screen's
      and the home-indicator inset stacked on that: the dead band she saw.
      Under `@media (display-mode: standalone)` the press now reaches down
      by the top inset and its controls stand off by the larger inset, so
      the last row stays inside the page whichever way the phone paints.
      Not proved on the phone at the time of writing — see Pending.

**2026-09-12 — the printer prints the record, branch `printer`, merged to
main as 1.8.0 the same day (a route's behaviour and two files: the middle
number); superseded by 1.9.0 the next day and pushed with it**

- [x] **`SharePrinter.js` brought back from `share-printer`.** Styles moved
      to forms.css under `.shp`; an `inline` mode so the press rises on the
      layer sheet with the page instead of popping over it; portalled, it
      mounts after the first paint (the server has no body to portal into,
      and the measure and draw effects wait for the same mount — the paper
      stayed at its starting fifth scale until they did).
- [x] **`EntryPlate.js`.** The entry page's first screen, on the record's
      own colour — Miyel's call after the first cut (a cover on plain cream
      with the facts ranged under it) looked like every other app's share
      card. The mark centred at the head at the statement pages' size (a
      fifth of the width, Miyel's call — the nav's 28 read as a colophon)
      with the keeper under it; the cover
      at the screen's radius, hairline and lift; the album; artist · year in
      mono caps; the stars as StarRating draws them; the post's chips
      (Listen n of N, Favorite, Masterpiece, Formative) in Chip.js's tones;
      the horizon as bars with a heart over a favourite (the posted date was
      there and came off, and the keeper's name grew to 13 units — Miyel's
      calls). The
      ground is the cover blurred across the paper under a light wash (Day)
      or a dark one (Night; they were Paper and Ink until Miyel renamed them
      the same day). Labels are soft
      rather than faint and the bars ink rather than accent, because both
      sank into a photograph. Opened out beside the cover on link-preview
      paper. Toggles: Keeper, Stars, Chips, Horizon.
- [x] **The code came off the print, same day, on Miyel's brief.** A story
      is viewed on the phone that would have to scan it, so a code on a print
      does no work in the case the print is for. Save and Send copy the
      entry's address instead, with the cover's own Copied line — copied
      before the picture is drawn, since Safari writes the clipboard only
      inside the tap that asked — and the Link button stays for the address
      alone. In person the entry's art already turns into its photo code. A
      physically printed flyer would earn a toggle; the sizes it would need
      are under Pending. The plain code drawn on a print, and its stock,
      live in git at 0712d7d.
- [x] **Sticker space, and a story's furniture (Miyel's ask, same day).** A
      fifth toggle, on by default, keeps the bottom 24% of a 9:16 print clear
      for the link sticker the poster adds — the sticker is how a story links
      now. Independently, on 9:16 the print keeps out of the top and bottom
      eighth, where Instagram draws the progress bars, the name and the reply
      bar; the earlier layout ran the mark under the name. Other papers are
      untouched by both. The numbers (13% / 13% / 24%) are Instagram's usual
      safe zones, not measured on a phone yet — check the first real story.
- [x] **Symbols (Miyel's ask, same day).** A toggle, off to begin with,
      that draws the marks as the feed's own symbols — Phosphor's Heart,
      SketchLogo and Fingerprint, their path data copied into the plate —
      at 34 units, about three chips tall, in the marks' colours. Chips and
      Symbols are a trade-off: the press learned a `group` on a toggle —
      turning one on turns the others in its group off, turning the chosen
      one off leaves nothing chosen (Miyel's call). A listen count has no
      symbol and stays a chip under the symbols. Posted date came off, the
      keeper's name grew, and the chips grew a third (13 on 10×4) the same
      afternoon: at the post's size they could not be read inside a story.
      Then the stars a quarter up (30 on a 4 gap) and the ground's blur a
      fifth softer (0.048 of the width, was 0.06) — both Miyel's eye.
- [x] **`/printer?entry=slug` prints for the keeper, server-checked.**
      Visitors, a missing record and the card's door still get the sentence.
      The layer page forwards the query. Decoded at 1×, 0.5× and 0.3× on
      Day and Night (then Paper and Ink) at 9:16, 4:5 and 1:1: 24 of 24; 1.91:1 reads at 1× only,
      by design. Apple's art sends CORS headers, so the cover does not taint
      the print (the "cannot be read in a browser" note in cover_code.js is
      about sharp, not canvas).

**2026-09-13 — reports, branch `reports`, merged to main and pushed the
same day as 1.7.0 (a table, a route, a sheet: the middle number); release
v1.7.0 cut with the update steps written for a keeper who has never opened
GitHub**

- [x] **Report a problem is a box, not a link.** The GitHub issue of 1.6.0
      lasted an hour, on Miyel's call: the people testing are not GitHub
      people. Now the desk's line opens a sheet over it — one box, Send, a
      line saying it goes to Listening Notes with the version and browser
      attached and the journal's address so there is a way to find them —
      and the report lands in the canonical copy's inbox under a Reports
      tab (Read, Dismiss), counted with the sends and comments on the desk's
      door. `reports` (migration 009), `library/report_actions.js`,
      `POST /api/reports` (public, cross-origin, three a ten-minute window),
      `GET /api/reports` and `PATCH /api/reports/[id]` (owner), `REPORTS_URL`
      in version.js (`NEXT_PUBLIC_REPORTS_URL` for a fork). Names to confirm:
      all of those, `.rp-`, and the sheet's words.
- [x] **Seen on the dev server:** the sheet from the desk, Send failing
      the honest way against a live site that does not have the route yet,
      the Reports tab with a rehearsal report (name, their journal, date,
      the words, version · browser, Read, Dismiss — left for Miyel to
      dismiss), the desk's Inbox count including it, and the three tabs
      fitting a phone by giving up side padding. The cross-origin path is
      proved by the preflight's headers, not by another copy — none is on
      1.7 yet.
- [ ] **A copy on 1.6.x still shows the GitHub link** until it updates. The
      1.6.0 release notes describe 1.6.0 truthfully; the 1.7.0 notes say the
      box replaced it.

**2026-09-13 — the bug button, on main as 1.6.0 (something new: the middle
number), pushed, and release v1.6.0 cut the same night — the first since
1.0.0, with notes for keepers covering everything since — so June's and
Peyton's desks say a newer version is available**

- [x] **Report a problem**, on the desk's colophon beside the version: a
      new issue on the one repository (`ISSUES_URL` and `reportUrl` in
      library/version.js), prefilled with What I did / What happened /
      What I expected and a footer carrying the version and the browser.
      A link, because every keeper has a GitHub account by construction and
      DECISIONS already sends "it didn't work" to the issues; nothing phones
      home. Names to confirm: `reportUrl`, the words Report a problem.
- [x] **The card's Add pill says the keeper's name** — "Add Miyel", then
      "Copied" for a moment — instead of "Add to your address book", on
      Miyel's call (she suggested "Add user"; the site has no users). 1.6.1.

**2026-09-13 — the person's page, branch `person-page`, merged to main
and pushed the same day as 1.5.0 (a route and a page: the middle number).
Miyel's call: it stays on her copy; no door to it on the other journal's
right pane (DECISIONS, The network)**

- [x] **`/dashboard/people/[id]`**, owner-only, a sheet over the desk like
      the book (and the standalone address for a bookmark). From a face or
      a name in the feed, or a row in the book. Their face large, their
      name, Visit their journal, and the printer's door
      (`/printer?person=<id>`, coming soon). Then a panel: four counted
      facts in the card's label-and-answer shape — Records you both have,
      Rated alike (n of the rated overlap), Sent you (with how many you
      logged), Hit rate with you (hits of sent; a hit is a send you logged
      and rated four or better) — and four lists: where you agree hardest
      (three), where you disagree hardest (three, with the gap), what they
      sent you (every submission from their address, with your stars if
      you logged it, else Not logged yet), and Only they have heard these
      (eight, the interesting column, linking out). Reads their public
      feed, `/api/entries` and `/api/submissions` in the browser; stores
      nothing. One entry per record, the most recent.
- [x] **Two cuts the same night, on Miyel's call, as 1.5.1:** the "Only
      June has heard these" list came off — their journal is a tap away
      and says it better — and the sends section reads "What June has sent
      you" ("June hasn't sent you anything yet" when empty).
- [x] **It opens like an entry, on Miyel's call the same night:** the
      sheet grows out of the row in the book or the face in the feed that
      was pressed — `data-grows` on the element names the address it
      opens, and `growBoxOf` in handoff.js is the general lookup beside the
      entry's own — and the header's left slot carries a back caret
      (history when there is one, else the book), with the printer's door
      beside it at the tools' size, the same glyph and place the entry and
      the card give it (it began as a round button beside Visit; Miyel
      moved it). The pull down and Escape still work.
- [x] **Going back is not arriving.** Closing the person's page onto the
      book used to remount the book's sheet and rise it from the foot of
      the screen again. Now whoever closes a layer says so first —
      `arrivingBack` in handoff.js, from the back caret, the pull down,
      Escape, and the browser's own back via popstate — and the next sheet
      to mount draws at rest (`lay--still`). Good for a moment only, so a
      way back that leads to the desk never silences the next door.
- [x] **Rated alike allows for how each of you rates.** Their ratings are
      shifted by the average difference across the overlap before the gap
      is measured (three records in common at least, else raw), alike is
      within half a star after that, and the page says the offset in one
      line. DECISIONS, The journal, has the rule this applies.
- [x] **The migrator's session ends itself** (`idle_session_timeout` 2min,
      `lock_timeout` 3min) after the second ghost lock of the night, this
      one left by Vercel's build. Gotchas has the story; DECISIONS,
      Migrations, the rule. Run once: database up to date.
- [x] **`/compare` is gone**, page and styles: a public page comparing this
      journal against a typed address has no place once everything social
      is on the visitor's own copy, and nobody had the URL. Its buckets
      live on in the person's page. `albumKey` is exported from
      useListeningBeacon so a send (no key of its own) can be matched
      against the keeper's entries.

**2026-09-13 — the feed, branch `feed`, merged to main the same day as
1.4.0 (a migration and a floor: the middle number); not pushed at the
merge**

- [x] **The desk has two floors.** Floor one is the crown and the desk;
      floor two is the feed, in a scroller of its own, the two-floor shape
      the beacon and the card already have (`hn-floor` in HomeNav), so the
      pane measures deep and the down caret draws itself. Signed out the
      pitch is one floor as before.
- [x] **The feed** (`components/main_components/Feed.js`, `.fd-` in
      nav.css). Reads `/api/people`, then every person's
      `/api/public/entries` from the browser with an eight-second limit
      each, rows landing as journals answer; nothing stored. Entry-shaped
      rows: cover, album, artist · year, their stars, a small face and
      name (opening `/compare?with=` until the person's page exists), how
      long ago; the cover and the title open their entry in a new window.
      Two views by a word: Submissions (default) and Recent (forty at
      most). Empty lines: nobody in the book yet, with a link; nothing
      you sent has come back yet; nobody has logged anything yet.
      **Reshaped the same evening on Miyel's call:** the record large and
      centred (320px, the tile's radius and the square's shadow), no box
      around it, and under it the title at 24px, the artist in caps,
      stars at 20 with the marks beside them at 20, a 38px face and the
      name at 13, Compare last with its panel under the item — the
      pieces simply large, because a feed item holds little and can
      afford to be, rather than a cover-and-title list. (A boxed card was
      tried between the two and came off the same hour.) The marks are
      marks, not words (heart, diamond, fingerprint), and a sent record
      wears an envelope in faint ink. Miyel's note: Compare will mostly
      happen in Submissions, where two people holding the same record is
      the normal case.
- [x] **The envelope is the fourth mark, site-wide.** MiniCard's strip,
      the key page (a Submission row, from the shipped definitions), and
      the entry's Submission chip, which now carries the envelope before
      its word; `.ln-mark--sent` in journal.css. Chip is inline-flex and
      nowrap so a mark and its word never fold apart. DECISIONS, Structure.
- [x] **Compare on a row you also have:** a panel under the row — You 4 ·
      June 3.5 · 0.5 apart — and the two horizons as bars, yours in ink,
      theirs faint, with a line pointing at both entries for the notes.
      Verified against this journal filed as `127.0.0.1:3000` for a minute
      (39 rows, every one with Compare) and removed after.
- [x] **The credit travels.** Migration 008 adds `received_from_url` to
      entries and drafts; the inbox's Start a listen carries
      `sender_url` into it, the session and the draft keep it, the entry
      and draft writers store it (host only, `tidyJournal`), and the entry
      editor leaves it alone. `pull_public_entries` publishes
      `received_from` and `received_from_url` on Submission entries only —
      DECISIONS' "public credit is the default", built; the entry's own
      read still strips the chain. The Submissions view matches by address,
      then by the typed name against `keeper_name`.

**2026-09-12 — the address book, branch `address-book`, merged to main the
same day as 1.3.0 (a table, a route, a door: the middle number), pushed,
and live on Vercel at 01:51 UTC on the 13th; no release cut. From the
brief: the address book, the feed, and where compare lives**

- [x] **The `?from=` link is retired.** The inbox's links out are plain
      again, the card no longer offers Compare with mine, and
      `return_address.js` belongs to the send form and the comment form
      only — `carryFrom`, `noteArrival` and `subscribeSender` are gone, and
      the argument they stood on is in docs/DECISIONS-ARCHIVE.md. It only
      worked for somebody arriving from a link their own copy had written;
      a text, a code or a card carry none. `/compare?with=` stays, because
      it is where an address-book row opens for now.
- [x] **The Add press.** On the card, for visitors only, where Compare with
      mine was: Add to your address book. It copies this journal's address
      and the pill reads Copied — paste it in your address book for 2.6 s —
      all a journal can do for a copy it cannot see, and it never learns
      whether the visitor keeps one. Seen in the Claude browser on
      localhost: the pill under Send an album, and the state turning (the
      clipboard itself is denied in that browser, so the write was stubbed
      to watch it).
- [x] **The address book.** `people` — migration 007: id, address (unique;
      no scheme, host only), name, added_at — `library/people_actions.js`,
      `GET`/`POST /api/people` and `DELETE /api/people/[id]` (owner-only;
      all three answer 401 without the wristband), a fourth door on the
      desk between Inbox and Settings — and the three doors went into one
      row under the square, wider than it, on Miyel's call the same
      evening: stacked at the square's width the third made a tower with
      the weight at the bottom (nav.css has the shapes tried before) —
      and `/dashboard/people`, the same sheet over the desk the inbox is. Filing an address asks the journal
      its keeper's name from the server (`/api/settings`, six seconds) and
      files it either way; the answer says whether it was reached. The
      face is `<their address>/api/portrait` in an `<img>`, never stored;
      a journal with none keeps the plain mark. Re-adding is not an error.
      A row: face, name, address, a visit arrow, Remove; the row opens
      `/compare?with=`. Migration 007 applied to the live database when
      the dev server started (the lock story is under Gotchas).
- [x] **Ways in.** The field (a paste, or an address read aloud); Scan a
      code, which opens the camera in the panel and reads with jsQR (both
      inks, frames no wider than 640px, every 150 ms), taking a card's or
      a cover's code down to its host — proved on Miyel's phone on the live
      site the next day, June's card read off the camera; Add to address book on any inbox
      submission or comment that carried a journal, reading In your
      address book once it is. `tidyJournal` and `journalUrl` in
      `return_address.js` are the one spelling and the one place the
      scheme goes back on — checked against an entry link, a capitalised
      host with a slash, a `?from=` leftover, `127.0.0.1:3000` and a bare
      word. `localhost:3000` has no dot and is refused, as it always was.
- [x] **Seen signed in, the same evening.** Miyel signed in on the Claude
      browser: the door, the sheet, June filed by paste (his face and name
      read off his journal), the row's compare running on arrival — 39
      here, 0 there. The inbox's buttons and the scanner are still unseen.
- [x] **No address on any page, on Miyel's call the same evening.** The
      row is a face and a name (a journal that did not answer says Not
      answering yet, and is asked again each time the book opens); the
      inbox's sender links read "their journal"; the compare says "with
      June" and "Only June has heard these". The public feed now carries
      `keeper_name` (`pull_keeper_name`, one column) so a copy reading it
      has a name to print; for a copy from before that — June's, until he
      presses Update — the compare asks the address book instead
      (`nameInBook`), and a visitor with no book gets the host, as a last
      resort, and the address field is not drawn when the page arrived
      knowing whom. The "Only you have heard these" group is gone: it was
      this journal again, scrolled. The face is a rounded square, the
      card's shape, not a circle; the inbox's pill rows wrap now that a
      third pill can be there. On a row Visit is the pill and remove a
      faint word, red only under the pointer — a red pill beside every
      name read as the row's main offer.

**2026-09-12 — tap a cover for its code, branch `cover-code`, merged to
main the same day as 1.2.0 (a new route and a migration: the middle
number); not yet pushed or released**

- [x] **The gesture.** On an entry, outside a correction, the art is a
      button: press it and it turns into the code for that entry's address,
      the address goes on the clipboard, and the Copied pill says so — only
      on the way to the code, never on the way back. For anyone. The same
      cross-fade the card uses, the same dot treatment, the frame coming off
      the box so the quiet zone hangs onto the page. On a desk the thumbnail
      grows to 220px while the code shows (a 110px code is too fine to point
      a phone at) and sits on a plate of page colour over the blurred hero.
      The session preview has no address and no tap; a correction keeps the
      cover as its own control.
- [x] **Where the portrait's code lives, and why the cover's does not.** The
      brief's first question: the portrait's code is a row —
      `settings.portrait_code`, base64, ~150 kB, served by `/api/portrait`.
      The cover's is never stored: `GET /api/entries/[slug]/code` fetches
      the art from Apple (the browser cannot read it), presses it, proves it
      by jsQR on both pages at three sizes, and answers a PNG cached for a
      day. The row keeps `cover_code` — `b=5&d=0.3&a=9801c63c`, the build,
      the dot, and a fingerprint of the address and art — so every press
      after the first composes at the proved dot and skips the judging.
- [x] **Measured.** Full press on a real cover: fetch 200–300 ms, press and
      judge 210–270 ms, PNG 207–360 kB. With the stamp: "Redrawn … (0.0s)".
      `pg_column_size` on the Cathedral row: 5,288 bytes before the first
      tap, 5,309 after — the 21-byte stamp; journal total 321,040 → 321,061.
      All 39 covers passed the dot press at the smallest dot on 2026-09-11.
- [x] **The wait, and the file, second pass the same day.** The first tap
      on an entry felt like nothing happened: the cover stayed put for the
      half second the press took. Now the plain code is drawn in the
      browser the instant the cover is pressed — on the press's own grid
      (level H, floor 4, `AddressCode` takes `level` and `least`), bare, in
      the page's ink — and the pressed picture fades in over it, so the
      photograph develops inside the modules — and Miyel chose the other
      answer the same evening: the art pulses until the picture lands, and
      the plain code is kept only for a press that cannot be had (its
      first showing on her phone was too small: Safari gave the inline SVG
      its 150px default height, fixed with an explicit height). The switch
      that held both is gone; DECISIONS has the call. The corner badge
      from the card (code glyph, then a record glyph) says the cover
      turns. The file: swept every cover at 8, 10 and 12 pixels a module —
      at 8 two covers failed and seven needed larger dots; at 10 all 39 read
      at the smallest dot — and four PNG settings: the adaptive filter is
      lossless and takes a fifth off; sharp's `effort` quietly makes a
      palette PNG that halves the file and moves the pixels, ruled out.
      Ten a module plus the filter: covers average 118 kB (was 185), the
      largest 269 (was 404), the portrait 96 (was 180). Build 6.
- [x] **The press picks its version.** It was fixed at version 4, whose
      34-byte capacity holds a journal's address and not an entry's (49 to
      93 characters on this journal: versions 6 to 10). The version now
      follows the data with 4 as the floor, and the alignment targets come
      from the encoder's own table (`qrcode/lib/core/alignment-pattern`) —
      six of them from version 7. The portrait's picture is unchanged, so
      the build stamp stayed at 5.
- [x] **Shared pieces.** The plain code moved out of the card into
      `AddressCode.js` and stands in on the entry when the press cannot be
      had (proved by breaking the picture's address: the plain code drew,
      framed). The Copied pill is `.ln-copied` in base.css, one definition
      for the card and the cover. The two numbers both sides size a code by
      are in `library/code_shape.js`.
- [x] **CodeSlot, on Miyel's call the same evening.** The turn was written
      twice — three times with the entry's desk-sized hero — and the copies
      had already drifted (two hold times for the pill). One component now:
      `components/main_components/CodeSlot.js` owns the two faces and their
      fade, the copy and its pill, the corner mark, the frame coming off,
      and the wait (the picture breathes until the pressed one lands; a
      plain code stands in when none can be had). The card and the cover
      hand it a picture, an address, the pressed picture's source and
      which face is up, and keep their own — the card its editor, the
      cover its growing desk box. Styles are `.ln-slot-*` in base.css;
      `.idc-face-slot`, `.idc-qr` and `.idc-portrait--bare` are gone from
      idcard.css and the `.ln-cover-*` slot rules from entry.css. One
      visible consequence: the card's plain code (no portrait yet, or a
      press that failed) is now drawn the cover's way — bare, in the page's
      ink, on the press's grid — where it had a beige plate and a frame.
- [x] **Lint clean, build passes.** Migration 006 applied against the shared
      database from the dev server.

**2026-09-11 — one button to update a copy, branch `one-button-update`,
not merged**

- [x] **The button.** `.github/workflows/update.yml` ships in every copy:
      Actions → Update this copy → Run workflow. It fetches
      `scripts/update_copy.mjs` from upstream and runs it: finds the upstream
      commit the copy was made from (the deploy button makes a one-commit
      snapshot, not a fork — no common history, so the copy's first commit
      is grafted onto its origin), merges upstream main, pushes with the
      workflow's own token (`permissions: contents: write`), and writes what
      changed on the run's summary page. A clash aborts the merge, names the
      files, fails the run, and touches nothing. Upstream changes to
      workflow files are left out of the merge and said so, because GitHub
      refuses a workflow's push that alters workflow files. Tested locally
      with plain git; on GitHub still owed — see Pending.
- [x] **The line.** `GET /api/update` (owner-only) reads the canonical
      repository's latest public release at most once a day and compares it
      with `package.json`'s version; the desk shows "A newer version is
      available" linking to the copy's own Actions page (Vercel names the
      repository at build time) or, elsewhere, to the release. Nothing is
      sent but a request for a public page.
- [x] **Two brand decisions recorded** — the website over a desktop app,
      and the QR as the answer to the URL — from the brief, verbatim in
      spirit.
- [x] **The workflow checks out with `actions/checkout@v5`, 2026-09-12.**
      Every run warned that the v4 action's Node 20 runtime is being
      retired. Copies that pasted the file before this keep their own line
      (a workflow's token may not change workflow files; the update leaves
      them and says so) and keep seeing the warning, which is only a
      warning; the one-time fix is editing that line on GitHub.
- [x] **The update's summary page speaks in release notes, 2026-09-12.**
      Miyel pressed the button on the scratch copy herself and it merged
      eight commits — and listed them as commit titles, merges and
      notes-to-self included. The summary now says "Updated to 1.1.0 (was
      0.1.0)" and prints the notes of every release between the two, read
      from GitHub's public releases; only between releases does it fall back
      to commit titles, with merges, version bumps and NOTES/DECISIONS
      commits left out. Release notes are written for keepers: new, fixed,
      moved.
- [x] **And on the desk, 2026-09-12** (branch `desk-version`): the same
      number at the foot of the desk for the owner, with the "newer version"
      line beside it when there is one; no Source there, since §13 is owed
      to visitors. Both read `library/version.js` (name to confirm), which
      reads `package.json`.
- [x] **The version is on the pitch pane, 2026-09-12** (branch
      `pitch-version`): "Source · 1.0.0" at the foot, the number linking
      to that version's release notes. Read from `package.json`, so it is
      whatever the copy is running. The old "no version number" note in
      Pitch.js is gone — releases keep it true now. Names to confirm:
      `.pt-colophon`, `.pt-colophon-dot`.
- [x] **Run on GitHub, 2026-09-12.** `gh` installed at `~/.local/bin`
      (no Homebrew on this Mac; the release binary, on the PATH in
      `.zshrc`), signed in as ListeningNotes with `repo` and `workflow`. A
      private scratch copy, snapshot of 9b11b75 with the workflow pasted in
      the way June would: the first press stopped, because the pasted file
      meant no upstream commit matched byte for byte (Gotchas); the matcher
      now takes the nearest commit, and the second press merged three
      commits and pushed as `github-actions[bot]` — so `permissions:
      contents: write` in the workflow is enough on a new personal
      repository, no setting to flip, one button. A third press said
      already up to date. First release cut: `v2026.9.11`.

**2026-09-10 — three findings from June's install, branch `junior-install`,
not merged**

June's copy (`userone-silk.vercel.app`) is the first that is not Miyel's.
Reviewed on the dev server at desktop width; not yet on a phone.

- [x] **The photo QR: which it was, and the press.** It ran and was
      refused. Reproduced against his actual portrait, in his page:
      Chromium's own reader passes seven bands and the final check at floor
      115, cap 255; jsQR alone — all Safari has — refuses all thirty-five
      bands on the light page at full size. He edits from an iPhone, so the
      build ran, every band failed the light-page check, and the card fell
      back to the plain code without a word. Fixed, 2026-09-11, in two passes
      the same day. First, from Miyel's brief: the press moved to the server
      (`library/portrait_code.js`, sharp, `POST /api/portrait/code`) with
      her sweep — floors 0–220, then bands — judged by OpenCV both ways up.
      It worked (her card at band 100–190) and it was flatter than the
      picture she had, and still not for everyone: jsQR refused every
      setting and 18 of 39 covers failed. Second, on her call after seeing
      it: the dot style. The photograph fills the dark modules as before,
      with a dot of ink at the centre of each and the finders and the
      alignment target solid; tones kept at 20–235; judged by jsQR, the
      strictest reader, on both pages at three sizes; the dark page's file
      made from the light one at request time by flipping the pure ink
      (`?theme=dark`). No new columns; the dot rides on `portrait_code_url`
      as `d`, the build as `b`. Measured: both portraits and all 39 covers
      pass at the smallest dot. Pressed by the editor when the photo or
      framing moves, by Settings after the address, by setup after the
      photo, and by the card when the owner opens a journal whose code is
      missing or older than this build. One dependency added: `sharp`
      (already Next's own). Exercised on the dev server; Vercel owed — see
      Pending.
- [x] **"Copied" is a pill over the code, 2026-09-11.** Turning the card to
      its code copies the address (DECISIONS); the line that said so sat
      under the slot in faint caps and was not noticed. It is now a pill
      that rises over the middle of the code and fades after 2.6s
      (`.idc-copied` in idcard.css, absolute inside the slot, so the name
      never moves). The words are still added and removed rather than
      faded, so `role="status"` reads them out. Seen on the dev server by
      forcing the class: a real press in the automated browser turns the
      card but the clipboard write is refused there, so the pill itself
      wants one tap on a phone.
- [x] **Sign in is a lock, not a page.** A key (Phosphor `Key`) where the
      Sign in line sat; pressing it opens `PasswordGate bare` under it, in
      place — no route change, no heading, no address over the box, the pane
      still behind; Escape closes it; on success HomeNav turns the pane into
      the desk without a reload (`letIn`). The password-manager markup is
      untouched and checked in the browser: a real form, a submit, `current-
      password`, the host in a visible writable field. The box under the key
      is smaller and quieter than the gate's (150px, no panel, a faint
      Enter, the address line lowercase at 60%), 2026-09-11 on Miyel's
      call; on a phone the type is still 16px, base.css's zoom rule.
      `/login` and `/settings` are unchanged. A real-phone test is owed
      (Pending).
- [x] **Compare, offered to a keeper who arrived from their own copy.** The
      brief's fix — a signed-in copy writing its own address into
      `return_address` — cannot work: localStorage is per origin like the
      cookie, so a value written at one address is read by nothing at
      another. What works is the link: the inbox's links out to a sender's
      journal carry `?from=<this address>` (`carryFrom`), the journal landed
      on reads it once on the card, keeps it as the return address and takes
      it off the bar (`noteArrival`), and the card offers "Compare with mine"
      beside Send an album — visitors only, never for this journal's own
      address — linking to *their* copy's `/compare?with=<this address>`,
      which now runs on landing. Verified: `/?from=UserOne-Silk.vercel.app/`
      stores `userone-silk.vercel.app`, the bar reads `/`, the pill links to
      `https://userone-silk.vercel.app/compare?with=www.listeningnotes.blog`;
      `/compare?with=userone-silk.vercel.app` compares on arrival (39 here,
      0 there — he has not logged anything yet). The inbox links are lint-
      and build-checked, not seen (owner-only).

**2026-09-07 — two floors on the cross, branch `two-floors`, merged to `main`**

The entry's shape on the landing panes, on a phone: a card that holds still,
a swipe up into the reading, left and right still turning the cross. Tested
on Miyel's iPhone across three rounds the same day.

- [x] **The centre pane and About have two floors** — the pane is the snap
      container (`y mandatory`), each floor a screen, the wall and the
      writing in `.hn-floor-scroll`. Rail untouched; no gesture code. The
      no-Last.fm copy keeps one long scroll. `secondFloorTop` finds the
      second floor for the caret and `/?q=`.
- [x] **The bar on floor two has the entry header's geometry** — 80px band,
      row at 22px, `--hn-bar-h` on `.hn`, so the mark clears the notch.
- [x] **The wall's bar is the floor of the wall** — page colour, square,
      one hairline, flush on the bottom edge.
- [x] **The beacon captions itself again** — "Now listening" / "Not currently
      listening" under the art, above the title (it sat in the gap above the
      art for an hour first); "Before that" over the recent row. A cover that fails to load falls back (placeholder on
      the beacon, the journal's cover or a blank tile in the row).
- [x] **The desk is three tiles** — Start a listen as the third 180px square
      on the shared line, Inbox and Settings stacked under it, all `.ln-tile`
      (base.css). Its second floor waits for the feed.
- [x] **The card fits its floor** — the name at 30px/27px; "Albums logged"
      and "since" as two pairs on one line; Send an album stays a pill (a
      tile and a travelling-light pill were both tried and taken off).
- [x] **Gotchas found on the way** — a hidden browser tab fires no scroll
      events; a flex basis against a `min-height` resolves to the content;
      base.css needs the cache cleared to reload. All three recorded.

**2026-09-06 session — the last cleanup before additive-only** (branch `last-cleanup`)
- [x] **Deleted, each with its reason in the commit:** `AlbumPreview.js`,
      `AlbumStrip.js` and `library/dog_ear.js` (no reader, and their
      stylesheet rules with them); five create-next-app SVGs and
      `Logo.png` from `public/`; `first-listen-undo.sql`; the `/rig` and
      `/dashboard/submissions` stubs; `pull_all_entries`,
      `delete_draft_for_album`, `forgetSender` and the one-shot
      `research_album`.
- [x] **`/dashboard` forwards home.** It was still drawing the old hub — a
      screensaver background, the logo image, a "Syne" font nothing loaded —
      while the desk is the right pane of the cross. Inbox and Share go back
      to `/` now.
- [x] **The tab icon is the mark.** `app/favicon.ico` was the framework's
      triangle from the first day; `app/icon.png` is the LN. mark at 64px.
- [x] **Six columns and three tables out of the code and the schema file** —
      see SCHEMA under Pending for the drop that runs after deploy. The
      settings lists in `settings_actions.js`, `layout.js` and `Bookplate.js`,
      the card editor's Instagram fold, and the entry save no longer name them.
- [x] **Audited and kept, on purpose:** `/archive` (three things link to it and
      only it takes `?q=`), `/about`, `/shuffle`, `Dashboard.js` (the pane, not
      the route), `LayerEntry` and `LayerWaiting`, `foldGenre` (called inside
      its own file), the `users` table, `about_intro` (see SCHEMA).
- [x] Verified: lint clean, `next build` clean, `/`, `/archive`, `/key`,
      `/dashboard` → `/` and the icon on the dev server; no console errors.
- [x] **The stylesheet is eight files by surface, in `app/styles/`:** base,
      nav, journal, entry, idcard, session, get, forms — named by Miyel,
      imported in that order from `layout.js`. `globals.css` (2,454 lines)
      was cut by section, every line landing once, and the inline `<style>`
      blocks came out of IdentityCard (556 lines), Journal, FullPostPage,
      AlbumFinder (the whole `FinderStyles` function), Submit, Setup,
      Settings, Compare, Key, PasswordGate and AddToHomeScreen, plus the
      `SESSION_CSS` constant out of `session/page.js`. The four `${…}`
      interpolations became `var(--font-sans)` and one literal. Left inline
      on purpose: ComingSoon (must stand alone when the site cannot),
      the inbox and share pages (owner tools on the old palette; the inbox
      block repaints `html, body`), and the canvas backgrounds.
- [x] Verified after the split: lint clean, `next build` clean, `/`,
      `/archive`, an entry, `/submit`, `/key`, `/get` and `/login` on the dev
      server at desktop and 375px, no console errors.
- [x] **The four refactors, each a new file named by Miyel:**
      `library/card_links.js` (the rig and link marks out of IdentityCard,
      which is 108 lines shorter and imports seven icons instead of forty);
      `components/main_components/JournalFilters.js` (the sheet, the year
      range and the sort table out of Journal, 730 → 468 lines; mounted only
      while open, so no drag offset to reset); `library/portrait_code.js`
      (the QR builder out of IdentificationCardEditor, 686 → 415);
      `hooks/useSessionDraft.js` (autosave, restore and cleanup out of
      useListeningSession, 606 → 453). Lint and build clean; the wall's
      filters checked open and closed on desk and phone. **The session itself
      was not exercised** — it sits behind the password — so a signed-in
      listen with a draft resumed and an entry saved is the check still owed.
- [x] **The inbox and the share page follow the theme and arrive as sheets**
      (branch `owner-tools`). Off the old palette and the unloaded DM Sans,
      onto the tokens through one `.own-*` family in `styles/forms.css`;
      plain, to match the desk; and both intercepted at
      `app/@layer/(.)dashboard/` so they come up from the foot of the screen
      over the desk like the send form does. The ten screensavers lost their
      last readers and are parked, not deleted — see DECISIONS, Parked.
      **Not seen signed in by Claude** — the pages are behind the password —
      so Miyel's look on the dev server is the check.
- [x] **The Share door, `/dashboard/share` and the entry's printer glyph are
      gone** — see DECISIONS. The desk is three things that do what they say.
- [x] **`/printer` — the share printer's door, before the printer** (branch
      `printer-door`). Printer glyph beside the pencil on an entry and on the
      card; the page rises from the foot of the screen and says coming soon.
- [x] **`posted_at`** (branch `posted-at`) — the timezone fix, additively:
      migration 005 adds the zoned column, fills it from `created_at` read
      as UTC, and every entry reader switches to it. Applied to the live
      journal, 39 of 39 rows agree with the old column, Cathedral reads
      "August 22" on a New York screen where it read the 23rd. See the
      gotcha it produced on the way.
- [x] **Entry links unfurl into a picture** (branch `link-previews`) —
      `app/entries/[slug]/opengraph-image.js`, plus the entry page's
      metadata now carrying a description and the large-image card hint.
      Checked on the dev server: Donuts and Cathedral both draw with cover,
      stars and pills; a missing slug draws the keeper's name alone.
- [x] **`edited_at` reads as the UTC it is** — no new column: the stamp was
      already stored correctly and only the read shifted it, so the window
      every entry read goes through re-reads it `AT TIME ZONE 'UTC'` under
      its own name. Miyel kept the name; additive-only kept the schema.
- [x] **Settings comes up as a sheet** (branch `settings-sheet`) — the door
      on the desk and the Sign in line both rise from the foot of the screen
      now, so there is a way back that is not the browser.
- [x] **An artist link lands on the wall, filtered** (branch
      `artist-lands-on-the-wall`) — `/?q=name` instead of `/archive?q=`;
      the cross lands on the centre pane one screen down with the search
      showing the name. Checked at phone and desk width. The printer page is
      down to "Coming soon."
- [x] **DECISIONS.md cut by the test, end to end** — 1,887 → 1,018 lines,
      265 → 195 entries, none over six lines. Everything removed went to
      `docs/DECISIONS-ARCHIVE.md` (182 → 407 lines) under dated headings,
      nothing deleted. What stayed is the rule and one reason.
- [x] **The header is a flush bar, not a fade** (branch `flush-bar`) — on
      the cross once a pane has scrolled, and on every other page's nav row:
      page colour, one hairline, and on the cross the small mark centred in
      it, which is also back-to-top. The wall starts under the bar's height
      so `/?q=name` lands with the first row clear of it.
- [x] **The card's pencil and printer show only on the card's pane on a
      phone.** They are pinned to the window, so they had been floating over
      the wall and the desk too; the cross now says which pane is on screen
      and the tools draw only while it is the card's.

**2026-09-03 session — the audit cleanup** (branch `cleanup-audit`)
- [x] **Lint at zero.** Nine `set-state-in-effect` errors across Journal, the
      share page, AlbumFinder and AlbumStrip fixed in the shapes the codebase
      already used (see Gotchas); the six dependency warnings were each
      deliberate and now say so in a disable comment with the reason; the 35
      `<img>` warnings were one decision, recorded in DECISIONS and switched
      off in `eslint.config.mjs`.
- [x] **DECISIONS.md split.** Five decisions sat beside the ones that reversed
      them (the pin, how an entry arrives, where the door is, the first shape
      of setup, schema.sql); each is now one entry stating the current rule,
      and the superseded argument moved to `docs/DECISIONS-ARCHIVE.md` with
      the licence reasoning. AGENTS.md points there and says not to read it at
      session start. The live file went from 1,781 lines to 1,736 — the rest
      is 250-odd decisions at six lines each, which is the format, not drift.
- [x] **The CSS cleanup pass** that was waiting on the cross settling. Three
      families, each deleted, looked at on the dev server, and committed on its
      own: the old homepage (`.hp-*` two-screen layout, dot nav, beacon box
      and its recent panel, scroll button), the pre-cross layout (sidebar,
      hero, tile overlays and labels, page headings, skeleton grid), and the
      old beacon stage with the recent-tracks panel — plus eight keyframes no
      animation named. `globals.css` 3,886 → 2,476 lines. Every rule went
      only after its class names were checked against `className=` in every
      JS file, not just against a grep.
- [x] `SessionDuration` had no caller and is gone; `AlbumFinder`'s header
      described a hook deleted with Echo and now describes `AlbumPicker`.
- [x] Audited and left alone, on purpose: `EchoNetwork` (a dashboard
      background), the `/rig` and `/about` redirect stubs (both earn their keep
      under the forwarding-stub rule in DECISIONS), `research_album` and
      `format_post`, the `tags` column.
- [x] Verified: `npm run build` clean (26 pages), lint clean, `/`, `/archive`,
      an entry, `/session` and `/submit` matched their before-screenshots on
      desktop and at 375px after each family.

**2026-09-02/03 — the entry grows from its tile, and swipes to the next**

Branch `expand-and-swipe`, merged to `main` 2026-09-03 after each gesture was
tested by thumb. See DECISIONS, *The cross*, for the reasoning.
- [x] `LayerEntry` has two arrivals: `side` (unchanged, the session and the
      send page) and `source` (the entry). Source flies a copy of the cover
      from the tile to the first screen with the Web Animations API, fades
      the sheet in under it, and flies it back on the way out when the tile
      is on screen.
- [x] `browse`: sideways swipe or arrow keys go to the neighbour on the wall;
      carets at the sheet's edges for a pointer; stop at the ends; the
      neighbour's first screen is handed over before `router.replace` so it
      draws at once; both routes prefetched.
- [x] Closing: pull down from the top of screen one, press outside the sheet
      on a wide screen (the sheet is a 1100px column over a scrim at
      ≥1024px), Escape, back.
- [x] `library/handoff.js` carries the wall's current order (`handOffOrder`,
      `neighboursOf`) and finds a cover's box on screen (`coverBoxOf`).
- [x] Verified in the desktop pane: open, arrow to next in wall order, Escape
      back to the wall with nothing moved, no console errors. The production
      build carries the new rules.

- [x] The flight verified in the pane at phone and wide widths, both ways,
      after three fixes: the cover comes from the tile (the sheet holds
      nothing at that moment), the wait for its landing spot is up to 1.5s
      (on a wide window the spot is on the entry itself), and the spot is
      `.ln-hero-row .ln-cover` there, not the phone's first screen. The
      column-and-scrim on a wide window and the send layer's side arrival
      also checked.

**Backed out to a baseline the same evening.** On a real phone the swipe was
glitchy, so the layer is back to `main`'s version with one change: it fades
in instead of sliding from the right. The expand-and-swipe work is intact in
this branch's history (commits "The entry expands from its cover" and "The
flight lands"); `git revert` of the baseline commit brings it back. Next
step is to judge the baseline on the phone, then decide whether the glitch
was the gestures or the layer itself.
- [x] **The blink when the entry lands** (2026-09-02, and "it has always
      done this"): the real page replayed the star-fill flourish, which
      starts every star empty for a beat, and mounted a fresh cover image
      that decoded a frame late. Now `FullPostPage` skips the flourish when
      the wait state already drew the score (`alreadyShown`, read off the
      handoff once), and the first-screen cover is `decoding="sync"`.
- [x] **The entry grows out of the tile** (2026-09-03): `LayerEntry` reads
      the pressed tile's box (`tileBoxOf` in handoff.js) before paint and
      runs the sheet from that exact square to the full screen with the Web
      Animations API, origin at the tile's corner; the stylesheet's fade is
      the fallback for a form or an off-wall tile. Measured in the pane: the
      sheet is the tile at the first frame and fills the screen at ~420ms,
      no stray frames. Closing (Escape, edge pull): the cover lifts off the
      page as a fixed copy and flies into the tile while the sheet fades
      under it in 200ms — only the art goes back, not the writing. Measured:
      cover from its place on the entry to the tile's exact square, sheet
      opacity to zero alongside, no copy left behind. The browser's back
      button just removes the sheet.
- [x] **Pull down to close** (2026-09-03): the whole sheet listens; the first
      move decides — mostly downward, from the top of the first screen, is
      the pull, and the sheet follows the finger; past a fifth of the screen
      or a flick it closes the same way as Escape. Anything else goes to the
      browser. Verified with synthetic touches in the pane, and by Miyel's
      thumb on the phone the same day.
- [x] **Left and right go to the neighbours** (2026-09-03): the wall hands
      over its current order (`handOffOrder` / `neighboursOf` in
      handoff.js); the content follows the finger sideways and stiffens at
      an end; a release past a fifth of the width or a flick goes to the
      neighbour by `router.replace`, its first screen handed over first so
      it draws at once; arrow keys and edge carets for a pointer; both
      routes prefetched. The edge pull is retired — sideways cannot mean
      both next and leave. Verified in the pane at both widths: key, swipe,
      order, neighbours, and closing afterwards.
- [x] **A neighbour just appears.** A new address is a new layer, so the
      first version grew from the tile again on every swipe and read as the
      journal reopening. The swipe now says so on its way out
      (`arrivingBySwipe` / `tookASwipe` in handoff.js) and the next layer
      does nothing on arrival — no growth, no fade, no slide. Verified: the
      swiped-to layer carries `lay--swiped` and does not grow or fade.
- [x] **Then a page turn, the same evening.** "Just appears" felt choppy on
      the phone: the page snapped back and the next one popped. Now the
      record on screen keeps going the way it was pushed, off the edge
      (`TURN_MS`, 240ms, the settling transition run to a full width), and
      only then does the address change; the new layer's content enters
      from the other side (`lay-content--from-right/left`, the direction
      travels in the handoff). Measured: old 0 → −1280 over ~240ms, then
      new +1280 → 0 over ~260ms. The address has to change *after* the
      exit — prefetched, the neighbour arrives so fast that changed
      together it replaced the layer before the exit moved a pixel.
- [x] **The header holds still.** The mark, the pencil and printer, and the
      lights used to be inside the content and turned with the page. The
      layer now makes a header slot outside the content (`LayerHeaderSlot`
      context in LayerEntry.js); `FullPostPage` portals its `SiteNav` into
      it, and so does `LayerWaiting` — with the keeper's tools inert — so
      the row is there for the length of the fetch too. The slot wears the
      entry's `ln-entry` / `ln-entry--scrolled` classes so the band behind
      the row keeps working. Measured: the row at the same place through the
      whole exit and entrance.
- [x] **The send page, after the merge** (2026-09-03): it arrives from the
      bottom (`arrives="bottom"`, `lay--rises`) and sinks back on the pull
      down; the layer claims sideways only where there are neighbours
      (`browses`), so scrolling rows work again everywhere else. The
      finder's shelf was rows for an hour and went back to covers the same
      day — and then became a wall (2026-09-03): the field first, a grid of
      large covers under it (`.af-wall`), newest first, 24 at most, and the
      rest of the form gated behind a pick in `app/submit/page.js`. The
      search folds accents in `norm` so "bjork" finds Björk. Then, the same
      day, the landing came back — sleeve, field and the whole form — and
      the wall became a chooser that opens over the page when the field is
      focused (`.af-chooser`); a picked cover flies down into the sleeve
      before the held state appears. The message box grows with its text.
      A misspelling
      ("micheal") still finds nothing — Apple's search is exact on the
      artist's name. The session rises from the bottom too.
- [x] **A close never waits forever on an animation.** A hidden tab freezes
      every animation and their finish never comes; `leave()` now also runs
      a timer a beat longer than the flight, and whichever comes first goes
      back. Found because the pane was hidden while testing.

**2026-09-01 — setup expanded, Settings, and the password out of deploy**

Two briefs in one session, on branch `setup-and-settings`, merged to `main`
on 2026-09-02 after the fresh-account run passed. See DECISIONS, *Setting a
copy up*, for what was decided; this is what was built.

- [x] **`/settings`** — `app/settings/page.js`, owner-only, reached from a
      gear beside the card's pencil. Address, Last.fm username and key,
      Anthropic key, password. The card's fields are listed at the foot as
      doors to `/?edit=card`. Theme and the key's wording were built and
      removed the same day (see Parked).
- [x] **The vault** — `migrations/003_secrets_and_theme.sql` adds a `secrets`
      table and `settings.theme`. `library/secrets.js` is its only reader:
      key resolution (database, then environment), scrypt password hashing,
      the self-minting session secret, the claim code. `/api/secrets` is the
      owner-only door; GET returns whether each thing is set and its last four
      characters, never a value. Applied to production 2026-09-01.
- [x] **Setup, one screen at a time** — `app/setup/page.js` rewritten. Name,
      then photo / prompts / Last.fm / links / rig each with Skip, then a
      password with a confirm. Address derived from the request host, founding
      date from the day. `POST /api/setup` takes name and password; `GET
      /api/setup` says whether the copy is claimed and whether a password
      exists. The gate asks for the claim code on a copy with no password.
- [x] **Claim code** — minted on the first migration run of an unclaimed copy,
      printed by `scripts/prepare_database.mjs` (now the first half of `npm
      run build`) and by `instrumentation.js` on every start, accepted by
      `/api/auth/login` in place of a password while unclaimed, cleared at
      claiming.
- [x] **Boots without `SESSION_PASSWORD` or `SESSION_SECRET`.** Login reads
      the hash from the vault, then the variable; the wristband's key comes
      from `sessionSecret()`.
- [x] **Lazy database connection** — `library/database_connection.js` opens
      on first use; the two entry pages use it instead of their own `neon()`.
      A copy with no `DATABASE_URL` builds, starts, and holds on a page that
      names the variable. Verified with `DATABASE_URL= npm run build` and a
      `next start` of that build.
- [x] **Four empty states** — no Last.fm: the journal is the centre pane's
      first screen (`beacon_available`, decided in the layout); a beacon with
      no track prints one quiet line; zero entries says "Nothing logged yet"
      instead of the filter message; a card with no portrait and no address
      draws no square. The pin row already printed nothing outside editing —
      the "empty pinned square" in the brief was the portrait slot.
- [x] **Holding page button** — a plain `<a>`; see Gotchas.
- [x] **Deploy button** — bare repository URL plus Neon's `products`
      parameter; `env` parameters dropped. README rewritten around the claim
      code, with the Git Scope / Private Repository Name note.

- [x] **Installation without Miyel present (third brief, same day)** — the
      button carries Neon's `products` parameter (their button has no
      `integration-ids`; see DECISIONS); the migrator prefers
      `DATABASE_URL_UNPOOLED`; `AddToHomeScreen` is the last setup screen
      and a Settings section; database failures become a sentence
      (`explainDatabaseError`) on a third holding page, in the build log and
      in the runtime log; every holding page and `/get` link to the issues;
      `/get` has the seven steps under the essay with screenshot slots.

- [x] **`/get` rebuilt as three routes, 2026-09-03**, on branch `get-rebuild`,
      unmerged and unreviewed. `/get` is one screen — hero line, the button,
      "Free, no subscription, about ten minutes", and a three-row table of
      contents. `/get/install` is the seven steps with a phone/laptop toggle
      whose choice goes into the address (`?on=laptop`) so the link can be
      texted; screenshot slots read from `public/install/{phone,laptop}/`.
      `/get/story` is the essay. "It didn't work" goes to the repository's
      issues from the door and from the foot of the steps. The README's link
      moved from `/get#install` to `/get/install`. Verified in the pane at
      375px and at desktop; the toggle was exercised by script because the
      pane's touch emulation hangs on a real click. Not yet tried on a phone.

- [x] **The steps rewritten from the notes, 2026-09-03** — nine now. The
      brief's seven skipped the Neon panel, where the Auth toggle is on by
      default and has to go off, and lost some of what the run found. A
      long version was tried and cut back the same day: each step is one or
      two sentences again, but Git Scope and the repository name, the Neon
      panel with Auth off, the half-hour window and Redeploy, and what Skip
      means are all named. Screenshot names renumbered to nine.

- [x] **Review pass on `/get` and the pitch pane, 2026-09-03** — a "← Get
      one" link above the heading on `/get/install` and `/get/story`; the
      door's button and caption centred, the "Free software" kicker gone,
      the paragraph opening "A free software that allows you to…" and the
      caption "About ten minute set up". The pitch pane: title "What is
      this?", third sentence "You host your own…", button "Get one" and
      centred, Sign in and Source stacked below it. A fourth sentence was
      tried and removed the same day (see DECISIONS).

- [x] **Claude removed from the contributors list, 2026-09-03** — the
      repository page's Contributors sidebar counts `Co-Authored-By`
      trailers (the contributors API does not, which is what made the first
      check wrong). All 16 branches on GitHub were rewritten with
      `git filter-branch --msg-filter` to drop only that line, trees and
      sign-offs verified identical, and force-pushed. Nobody else had a
      clone yet, so nothing broke. A mirror and a bundle from before the
      rewrite are in `~/listening-notes-backups/repo-before-rewrite-*`.
      Going forward the trailer is off in Claude Code's global settings.

- [x] **The essay reached the live database, 2026-09-03** — the first swap
      had gone into the stray copy (see Gotchas). `.env.local` now carries
      the live connection string; the essay was written again there, the
      August 25 version kept aside, the live page verified, and
      `npm run backup` run so the iCloud backups cover the live journal from
      today.

- [x] **The steps and the story open as a layer over the door, 2026-09-03**
      — `app/@layer/(.)get/install` and `(.)get/story` intercept the two
      routes the way `(.)submit` does: LayerEntry with `arrives="bottom"`
      and `scrolls`, so they rise from the foot of the screen and a pull
      down closes them. Cold loads of the same addresses still get the
      standalone pages with the nav row. The `.get-*` rules moved from
      app/get/layout.js into globals.css, because a layer never passes
      through that layout. "It didn't work" stays a plain link: it goes to
      GitHub, and another site opens in the browser, not on the sheet.

- [x] **The essay replaced, 2026-09-03** — the final version, five sections
      under `## ` headings, written straight into `settings.why_essay` with
      `why_date` set to the day. The previous text (1,787 characters, dated
      2026-09-02) is in the nightly backup from before the swap; Neon's six
      hours have passed. Its title line, "Listening Notes Story", was not
      stored: the page's heading is "Our story", per the brief.

- [x] **Fresh-account run, 2026-09-02** — the `products` parameter survived
      Vercel's sign-in redirect: a Neon database was attached and deploy
      asked for nothing. The claim code showed in the build log. Confusing,
      so the log prints a link with the code in it — and then, because the
      log is hidden behind Vercel's Congratulations screen and people press
      the picture instead, setup is simply open for half an hour after each
      build (`secrets.setup_open_until`, migration 004, applied to production
      2026-09-02). The code and the link are the fallback (see DECISIONS).

**Not verified here, and needs the fresh-account test again:** the whole
first-run flow end to end (there is no local Postgres and only the one live
database, which is claimed), whether `products` survives Vercel's sign-in
redirect, whether the claim code shows in the deploy screen's build log, and
setup's password step against a real password manager.

**2026-09-01 — the session, mobile-first**

Briefed as "the mobile version is not a reduced version." See DECISIONS, *The
session*, for what was decided; this is what was built, on branch
`session-overhaul`.

- [x] **`/session`** — one route replaces `/dashboard/echo` and
      `/dashboard/echo/session`. `app/session/page.js` holds the picker-or-
      listen switch, the landing animation and the session's styles (in the
      page, the way AlbumFinder keeps its own). Dashboard, hub and inbox point
      at it. No forwarding stub, per the retired-route rule.
- [x] **`AlbumPicker`** — a field, a grid of every cover the search found,
      the type-it-in fallback, and the Unfinished drafts under the field until
      you start typing. `useAlbumSelection`, the card phases, the fly-to-centre
      and `PreListenQuestionnaire` are deleted.
- [x] **`SessionHeader`** — 44px cover, title, artist · year, the four steps as
      a row, Save draft, and a back caret to the picker. Sticky, frosted, safe-
      area aware.
- [x] **`AlbumScreen`** (was `AlbumDebrief`) — the record, Start listening,
      and *Research this album* as a button. The briefing streams in below if
      asked; hidden entirely on a copy with no key.
- [x] **`TrackNotes`** — one track per screen. Dots for every track (filled
      once covered), stars, heart, an auto-growing note, Prev/Next, swipe on
      touch, Continue on the last track and a quiet *Album notes →* before it.
      Focuses the note only on a fine pointer, so a phone's keyboard stays down
      between swipes.
- [x] **`AlbumNotes`** — the horizon, the note, then the score and three marks.
      `ScoreScreen` is merged in and deleted.
- [x] **`SessionPreview`** — assembles itself on arrival (format_post is local)
      and re-assembles every time the Preview opens, so edits on the way back
      through Notes always show. Read it → / Log another / ← Dashboard after
      the save.
- [x] **`useListeningSession`** — `beginListen(record)` opens a record and
      returns the step to land on; `doResearch()` only researches, on demand,
      and reads the NDJSON stream itself (`library/baton.js` deleted — there is
      no route jump left to carry a request across). The browser draft now
      carries the tracklist and a timestamp; the newer of it and the `drafts`
      row wins. `save_draft` now actually receives `received_from` /
      `received_date` — the API accepted them and the hook never sent them.
- [x] **Echo, removed:** `ReflectChat`, `/api/echo`, `/api/reflect`,
      `ask_echo`, `SessionButton`, `session_styles.js`, `LOADING_PHRASES`.
      **Kept:** `EchoNetwork`, moved into `backgrounds/` and registered as the
      tenth scene; its canvas is `absolute` now like its siblings.
- [x] **Drafts' `step` column** — old rows counted five steps, new ones count
      four. Read clamped to the new range; a draft left on the old Score step
      reopens on Preview, which is one tap from where it was.

**Second pass, same day — the feedback round.** The session opens as a layer
from the desk (`app/@layer/(.)session/page.js`), Escape/swipe lands back on
the desk pane. Dashboard buttons gone from the picker and the saved screen;
the picker carries `SiteNav` (mark + theme switch), and the session header
carries the theme switch at the end of the steps row. Album screen centred on
the art with the horizon once ratings exist; notes screen reordered score →
horizon → note. `TrackNotes` dots replaced by the strip: bar, dot, rotated
title per track, `--dense` past 18 tracks. The reference is back without a
name: `/api/ask` (inline Anthropic call, plain-text answers, ~80 words),
`AskSheet` (bottom sheet with visualViewport keyboard lift and a head-drag to
dismiss; a 380px column past 900px with the writing moved over), a `?` badge
on the header cover, absent on a keyless copy. Verified in the pane: the
layer both ways, the sheet on a phone width, one real question answered with
the album in context. **Not driven:** the head-drag dismiss, the keyboard lift
and the cursor hand-back need a real phone. The wide column was checked at
1280px.

**Third pass, same day.** Header loses the cover and the Save draft button;
the question mark (glowing) and the theme switch sit top right. Drafts save
themselves (3s debounce in the hook, in-flight write awaited by doSave).
Landing flies to the album screen's big cover, and that screen fades rather
than slides while it does. Swipes turn steps on every screen; TrackNotes hands
over at either end (`onPrev`). Small round carets replace Prev/Next. Notes
screen: horizon → centred stars → small marks in their own colours → note.
"Start session" / "Resume session". Preview rebuilt on `FullPostPage` with a
`preview` prop (no fetch, no CommentBubble, no footer; `TrackThread` takes
`preview` too), standing on a `.lay` sheet with a save bar; every step is
tappable at any time. "Unfinished" → "Drafts". A favourited track wears a
heart above its bar in the strip, in ink rather than red. **Tried and
reverted the same evening:** folding the strip / horizon while a note had
focus and pinning the header to `visualViewport.offsetTop`, meant to give iOS
less to pan when the keyboard opens. On the device it hid the field entirely
("now I can't see anything"); the plain behaviour was better. The keyboard
pan is iOS's and is left alone. **Preview on a phone:** the sheet was drawn
inside the session's own `.lay--scrolls`, so `position: fixed` measured
against that sheet and the entry sat a scroll's worth too low with its foot
cut off. `SessionPreview` now portals to `document.body`, where a real entry
layer lives; the foot is two quiet links over a fade rather than a bar —
*← Return to session* and *Save to journal →* — and `.ln-content` gets room
under it. Every forward move in the listen is now
the same quiet centred link (Start/Resume session, Album notes →, which stays
on the last track too, Preview →). The band under the bar in Safari is Safari's own collapsed
toolbar strip, not the page; the installed app has none. All verified in the pane at
375×812; the test draft the autosave created was discarded afterwards.

**Verified:** `next build` passes; ESLint is clean on every file touched (the
two `set-state-in-effect` errors left are in the untouched share page and were
there before). Walked through in the Browser pane at 375×812: picker → grid
(three across) → album screen → tracks one at a time with a star, a heart and
a note → the note screen with the horizon → the preview, assembled and
correct; a reload reopened the same listen on the Preview step with everything
intact; the back caret filed it under Unfinished; discard removed it. The
research button was exercised from a second browser and answered in 38s.
**Not driven from here:** the swipe between tracks and the landing animation
(the pane's clicks time out on this site, so every tap was scripted). Try both
on a real phone, plus the keyboard over the note field and resuming a draft
after locking the screen.

**Before September 2026** — every earlier session, from the first research
overhaul to the transfer emergency, is in [docs/NOTES-ARCHIVE.md](docs/NOTES-ARCHIVE.md).
Nothing there is pending; it is how the site got here.
