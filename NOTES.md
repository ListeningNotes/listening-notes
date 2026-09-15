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

- [x] **The stray database `ep-old-sea-am0rc38b`** — it was the `dev` branch; deleted in the Neon console 2026-09-06. What it was: A copy of the live one,
      written to from localhost for four days. Find it in the Neon console —
      likely a branch or a second project — and delete it once nothing there
      is wanted. It holds the September 2 essay draft and possibly `secrets`
      rows from a rehearsal. The live database has zero `secrets` rows, so
      the live site still signs in with the environment's `SESSION_PASSWORD`.

**Fresh-account test passed 2026-09-02** — see DECISIONS. What is left of
this list is what to keep an eye on rather than what to prove:

Everything below it was built blind against one claimed database. Watch for:
- the deploy button: does `products=` attach a Neon database and set
  `DATABASE_URL` after the sign-in redirect? If not, the bare
  `?repository-url=` form plus the "no database yet" page is the path.
- the build log: is the claim code box visible on the deploy screen?
- `/setup`: claim code at the gate, then five screens, Skip on each, password
  with confirm and an eye; does Safari offer to save the password?
- the landing: no Last.fm → the wall of covers under the crown, saying
  "Nothing logged yet."
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

**THE DESKTOP LAYOUT, 2026-09-13** — built on branch `desktop-columns`
(Complete), merged and released as 1.10.0 before a Safari look — Miyel's call, to refine later. Still to look at:

- [ ] **Both grips with a real mouse** — the browser tool's drag never
      landed on the nine pixels; dispatched pointer events proved the hook
      (196 → 300, remembered across a reload) and the trusted pointerdown
      does reach the grip, so a mouse should simply work. And the arrow keys
      on a focused grip.
- [ ] **The desk panel at 520px.** The inbox, the address book, a person,
      a report and Settings open there; their phone rules are viewport
      queries and do not apply inside a panel in a wide window, so rows may
      want a container query if anything overflows. Widen the desk's rail
      past 520 and the panel is the rail exactly.
- [ ] **The correction bar and the print bar inside an entry over the
      journal**, and **a window under 860px** — at 900 the
      rails still fit at rest (196 / 518 / 186 by script); below about 860
      they give way in proportion, to 150 each at the least. Not seen by eye.
- [ ] **Names to confirm, 2026-09-13 (the desktop)** — autonomous session,
      rename freely: branch `desktop-columns`; `hooks/useColumnWidths.js`
      with `useColumnWidths`, `fit` and `REST_WIDTHS`; the key `ln-columns`;
      `.hn-band`, `.hn-band-ground`, `.hn-grip`, `.hn--dragging`,
      `--hn-left`, `--hn-right`, `--hn-rail-top`; LayerEntry's `over`
      (`"journal"` | `"desk"`), `.lay--over-journal`, `.lay--over-desk`,
      `.lay-back`, `.lay-back-slot`, `--lay-desk-w`; the grips' labels
      "Resize the card" and "Resize the desk".
**THE ADDRESS BOOK, THE FEED, AND WHERE COMPARE LIVES** — briefed
2026-09-12. The address book merged to main that day, the feed and the
person's page the next (Complete). Left: the printer, and the chain.

- [ ] **The feed's two loose ends, 2026-09-13.** (a) The quiet toggle:
      DECISIONS promises a per-entry choice to credit a send privately, and
      the feed — and since 2026-09-14 the entry page — publishes the credit
      by default. The toggle is a boolean on the entry, a control beside
      the Sent by field at the head of edit mode, and a filter in one place:
      `withoutChain` in `database_actions.js`, which every read of the
      credit now goes through. (b) Track notes on
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
- [ ] **The chain.** Tapping the Submission chip on an entry opens the
      lineage upward. Backward only (DECISIONS).
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

**2026-09-14 — credit the person who sent it, branch `credit`, not
merged (1.13.0 when it is: something new)**

- [x] **Sent by is picked off the address book, sits at the head, and
      shows on the entry.** The three changes of the brief. In edit mode
      the Sent by field moved from the foot (where a heading called it
      private) up under the flags on the first screen; the address book's
      people are pills beneath it, narrowed by what is typed, and tapping
      one fills the name and links the entry to their journal
      (`received_from_url` — the editor now sends it, and no longer sends
      `received_date` at all: no date on a backfill, DECISIONS). Typing
      does not unlink, so his journal can say Zachin_Off and the entry say
      from Zach; tapping the lit pill unlinks and keeps the name; emptying
      the name drops both; naming a sender turns the Submission shelf on.
      On the page the envelope chip reads *from Kailea* and, when the
      credit carries a journal, is a link to it (new window, plain, no
      `?from=` — a visitor's surface). One rule for what leaves the
      building, `withoutChain`: the two credit fields on a Submission row
      on every read (entry, wall, feed); `source_entry_id` and
      `received_date` private always. The lineage picker stays at the foot
      under *Lineage · only you see this*.
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
      `senderChoices`, `sendBy`, `writeSender`, `sentChip`, `envelopeChip`
      in `FullPostPage.js`; the `.ln-sender*` and `.ln-from` classes in
      entry.css; the words *Sent by*, *Nobody — I found it*, *from Kailea*,
      *Lineage · only you see this*; `credited-<id>` as the synthetic id on
      the person's page.

**2026-09-15 — copies update themselves, 1.12.0, on main**

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
