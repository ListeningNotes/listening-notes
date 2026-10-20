# Operations

Looking after a running copy: getting your writing out, getting it back, and
the keys that hold the thing together.

---

## Keeping a copy of your journal

Two ways, because they answer different questions.

**A button — Settings → Back up your journal.** Press **Make a copy** and your
whole journal is gathered into one zip, and the page says how many entries and
people it holds. Then **Save** on a phone hands it to the share sheet (Mail,
Save to Files, AirDrop), and **Download** on a computer puts it in Downloads.
No setup, nothing to configure, works on any copy of this software. Inside:

- **`entries/`** — a page for every entry, in plain text (Markdown), named by
  the day it was posted. Each says what the entry page says — the record, the
  stars and marks, who put you onto it, the note, every track with its own —
  and opens in Notes, TextEdit, Files or any notes app, with nothing
  installed. This is your writing readable without this software.
- **`journal.json`** — every table the database has: the entries and their
  notes, the settings, the messages, the address book, the sends, the waves
  and what came back. This is what puts a journal back (below).
- **`Read me.txt`** — what the other two are, for whoever opens the folder.

`journal.json` alone is at `/api/export` for anyone who would rather use the
address. Both are owner-only — they hand over unpublished drafts, the
messages in the inbox, the address book, and the return addresses people
left with submissions.

**The journal asks for one.** When it has writing no copy holds, sixty days
after the last copy — or after its first entry, when it knows of none — a
journal puts a letter of its own at the top of its inbox asking for a copy,
with a **Make a copy** door to this button. It asks once: dismissed, it
waits another sixty days. Making a copy, here or with the nightly backup
below, takes it away. Each copy remembers the moment it was made, so a
journal brought back from one knows it has one.

**It never carries the `secrets` table** — the password and the key that signs
you in. A download goes wherever downloads go, and whoever held that key could
sign in as you without the password. Nor the keyring, your passkeys: each
opens only the address it was made at, so in a journal brought somewhere new
it would open nothing. The file says what it left out.

**A schedule, if you want one.** The repo ships two scripts:

```bash
npm run backup
```

Writes every table to `$BACKUP_DIR/<timestamp>/` with a copy of `migrations/`
beside it, keeps the last 30 and prunes the rest. Nothing lists the tables: it
asks the database each time, so a table added by next month's update is in
that night's backup without anyone remembering to add it. It prints which
database it read and writes that into `manifest.json`. Each run counts as a
copy — it writes down when it was made, and nothing else, in the journal it
reads — so a journal backed up every night is never asked for one.

**The backup does carry `secrets`**, so a restore from it brings your password
back with your writing — and the folder holds the same keys your `.env.local`
does. Keep it somewhere just as private. `BACKUP_DIR` defaults to
`~/listening-notes-backups`; point it at a synced folder — an iCloud Drive
directory, say — and your backups stop living on the same machine as the thing
they protect. See [`.env.example`](../.env.example).

To run it nightly, put it behind whatever your system uses for scheduled jobs:
a `launchd` agent on macOS, a cron entry or systemd timer on Linux. Be aware
that a laptop asleep at the scheduled hour runs the job on its next wake, so
"nightly" really means "once per day the machine is awake."

```bash
npm run restore -- <path-to-a-backup>
```

Prints what it would do and changes nothing. Add `--yes` to actually restore.
It reads the zip from Make a copy — as it came, or unzipped and zipped again —
just as happily as a backup folder or a bare `journal.json`, old ones
included. What it does:

- **Empties every table the file holds, and refills it.** It is a restore, not
  a merge.
- **Leaves every table the file does not hold exactly as it is**, and names
  them. An export never holds `secrets`, and backups from before 2026-09-23
  hold seven tables of fifteen — neither can empty your address book.
- **All or nothing.** It runs as one transaction: if anything goes wrong,
  nothing has changed.
- **Refuses a backup taken on a newer database** than the one it is going
  into, whose newer columns would otherwise be dropped. Update the copy first.
- **Warns when the journal would end up with no password**, which on a
  journal that is already set up means nobody can sign in (see Locked out).

Practise on a Neon branch before you ever need it for real. Branches are free
and instant, and a restore you have never run is a hope rather than a plan:

```bash
DATABASE_URL='postgres://...branch...' npm run restore -- <backup> --yes
```

Without `DATABASE_URL` in front, it restores into the database in `.env.local`
— for the copy this was written on, that is the live journal. Read the
`target:` line of the dry run before adding `--yes`.

**Bringing your journal into a new copy — no terminal.** A copy nobody has
claimed yet opens setup on two choices: **Start a new journal** or **Bring
your journal**. Choose the second, pick the zip from Make a copy, check the
line that says whose journal it is and how much is in it, and choose a
password. One request later the copy is yours, with everything in it: your
writing, your card, your address book and your inbox. The copy keeps its own
address and signing key, and lists itself on the Board at its new address
the first time it is opened, if your journal was on the Board. Only a copy
nobody has claimed can be brought into: putting a file over a journal
somebody keeps is the terminal's job, below, with its dry run in front.

**Restoring into a brand-new database** — your Neon project is gone and you
have made another:

1. Point the copy at the new database (in Vercel: Settings → Environment
   Variables → `DATABASE_URL`) and redeploy. It builds its own tables.
2. Open it and choose **Bring your journal** — or, from a terminal, set it up
   as if it were new, choosing a password (an export does not carry your old
   one), and then:
3. Restore into it: `DATABASE_URL='…the new one…' npm run restore -- <file> --yes`.

Your writing, your card and your address book come back, and the password is
the one you just chose. From a backup folder, which carries `secrets`, your old
password comes back instead.

> **Neon's own history is short** — six hours on the free plan. That covers the
> mistake you notice straight away and nothing else. Take your own snapshot
> before you touch the schema.

---

## Secret Keys

**Most of them live in the journal now, not in the environment.** The password
is chosen during setup and changed in Settings, which is reached from the
card's ··· (and, on a desk, from the desk's Settings row). The key that signs
the login cookie mints itself on first start.

**Two key columns stay behind unread**, because the schema is additive-only
and a column is never dropped: `secrets.lastfm_key`, from when Last.fm came
out of the software on 2026-09-16, and `secrets.anthropic_key`, from when the
research and the question mark came out on 2026-09-18. Nothing asks for
either any more — the rows in
Settings are gone — and `library/secrets.js` still resolves the Anthropic one
for nobody, which is what a retirement is: the plumbing stays, nothing is
connected to it. `ANTHROPIC_API_KEY` in the environment is likewise read and
unused; `.env.example` says so. All of it sits in the `secrets` table, which
nothing but `library/secrets.js` reads. The nightly backup carries it, so a
restore from a backup brings the password back with the writing; the export
leaves it out, so a restore from an export keeps whatever password the
database already has.

**[`.env.example`](../.env.example) is still the list** of what the
environment *can* hold, with what each variable is for — including the two
the deploy sets on its own (`DATABASE_URL_UNPOOLED`, `GIFT_FROM`) and the
one a fork sets for its own problem reports (`NEXT_PUBLIC_REPORTS_URL`). Only
`DATABASE_URL` is required. A copy that set the others before Settings
existed keeps working: the database is read first, then the environment, so a
value typed into Settings takes over from the variable and the variable can
then be removed.

One worth knowing without opening the file:

- **The session secret** signs the login cookie. Setting `SESSION_SECRET`
  yourself is allowed and wins over the minted one; changing either signs you
  out of your own journal on every device and you log in again with the same
  password. Disruptive, not dangerous. Don't rotate it casually; do rotate it
  if you think it leaked — and whoever has it can sign in as you, which is why
  the export never carries it.

**A lost phone.** Its passkey opens nothing without the phone and its Face
ID, but take it off anyway: Settings → Your keys, from any device you are
signed in on, or sign in with your password first. The password always
stays as a second way in.

**The spare key.** Sixteen letters and numbers, made in Settings → Your keys
(or when the foot of your card asks) and shown once: write it down or keep
it in your Passwords app. It opens your journal once, from the lock's *use
your spare key*, when every device and the password are gone, and the
sign-in spends it; make a new one straight after. Making a new one retires
the old. Neither the export nor Bring your journal carries it.

**Locked out.** With the password in the database there is no variable to
edit. Get in with a wristband you still hold on another device and change it
in Settings. Failing that:

1. In Vercel, set `SESSION_PASSWORD` (Settings → Environment Variables) and
   redeploy.
2. In Neon's SQL editor, clear `password_hash` in the `secrets` row — the
   database's password wins over the variable while it is there.
3. Sign in with the variable, choose a new password in Settings, and the
   variable can go.

**Never do step 2 without step 1.** A journal that is set up and has no
password, no key and no spare key lets nobody in at all: the claim code only
ever opens a copy nobody has claimed, so none is printed and none would be
accepted.

**A journal claimed with Face ID** has no password: its ways in are its keys
and its spare key. With every device and the spare key lost, step 1 alone
gets back in — set `SESSION_PASSWORD` in Vercel and redeploy; a journal with
no password in its database takes the variable — and then a key or a
password can be made in Settings → Your keys.

## A sandbox to try things on

A preview — the copy Vercel builds for each branch pushed to GitHub — can be
a sandbox: your journal copied to an address of its own, with a database of
its own, where nothing you do reaches your journal or anybody else's.
Everything works as it does on your journal, except that nothing leaves: no
send, wave, reply, Board listing or problem report — each says *Nothing
leaves the sandbox.* — and a violet glow runs round the edge of the screen,
with SANDBOX in the top-left corner, so it is never mistaken for the real one.

**Its database must be its own.** Building the site brings the database it
is pointed at up to date, so a preview pointed at your live database would
change it. Set it up once:

1. In Neon, make a branch called `sandbox` from your main branch, with its
   data, and keep it from expiring. It is your journal as it was that moment;
   Neon's *Reset from parent* brings it up to date later.
2. In Vercel, Settings → Environment Variables: tick `DATABASE_URL` — and
   `DATABASE_URL_UNPOOLED`, if you have it — for **Production** only. Then
   add each again for **Preview** only, with the sandbox branch's connection
   strings: the pooled one for `DATABASE_URL`, the direct one for
   `DATABASE_URL_UNPOOLED`.
3. Add `NEXT_PUBLIC_SANDBOX` with the value `1`, **Preview** only. Never on
   Production: that journal could then send nothing.
4. Push a branch called `sandbox`. Its preview keeps one address however
   often it is pushed, so it can live on a home screen; push to it whatever
   is being tried.

Vercel locks a preview to the project's owner, so opening one asks you to
sign in to Vercel once. It also means no other journal can reach a sandbox:
something that arrives from another journal cannot be tried there.

## LN. Admin letters

A letter is the one way to tell keepers something they cannot learn from
their own journal — an outage, what is new. It lands pinned at the top of
their inbox as *Message from LN. Admin*, words only, under a fixed line that
LN. Admin never asks for a password or a spare key. Nothing about it comes
back: not that it arrived, not that it was read.

**The key** lives only on the canonical keeper's Mac, in the Keychain as
`ln-letterhead`. Made once:

```bash
npm run letterhead -- keys
```

It prints the public half, which belongs in `library/letterhead.js`
(`CANONICAL_KEY`) and ships in every copy.

**Sending** — to each journal it concerns, by address:

```bash
npm run letterhead -- send some.journal.example another.example --said "Words."
```

Each says whether it was kept. A journal keeps one letter: a new one
replaces the last, and one already dismissed cannot be sent again — send a
new one. A letter that arrives also replaces the journal's own letter
asking for a copy, which asks again once yours is dismissed.

**If the key is lost or might have been seen**, make a new one (delete the
Keychain item, run `keys` again), put the new public half in
`library/letterhead.js` and release: copies on the updater take it within the
hour, and from then on the old key's letters are refused. A fork sets
`LETTERHEAD_KEY` to its own key's public half, or to nothing to take none.

## The directory's job

Only for the copy that keeps the directory (the one every other copy's
`DIRECTORY_URL` names). Every other copy can skip this section.

The directory shows what each listed journal is logging from a table, and
the table keeps itself fresh: whenever a Board is read, one round of the job
runs after the answer has gone. Each round asks only the journals whose turn
has come — every minute for one seen logging within the hour, every thirty
minutes otherwise, slower for one that has not been answering — and claims
them, so two looks a moment apart never ask a journal twice. There is
nothing to set up, and while nobody looks at a Board nothing runs.

**Optional: a schedule as well.** A Board that should stay fresh while
nobody is looking can also be refreshed on a clock:

1. In the registry's Vercel project, add an environment variable
   `CRON_SECRET` with a long random value, and redeploy.
2. Point a schedule at
   `https://www.listeningnotes.blog/api/directory/gather` — a `GET`, with the
   header `Authorization: Bearer <the CRON_SECRET value>`.

The schedule is deliberately not in `vercel.json`: that file goes to every
copy, and Vercel's free plan refuses a schedule more often than once a day,
so a per-minute cron there would stop every friend's copy deploying. Any
outside scheduler that can send a header will do.

To check it by hand:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://www.listeningnotes.blog/api/directory/gather
```

It answers `{"asked": N}`, how many journals it asked on that run.
