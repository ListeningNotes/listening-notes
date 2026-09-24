# Operations

Looking after a running copy: getting your writing out, getting it back, and
the keys that hold the thing together.

---

## Keeping a copy of your journal

Two ways, because they answer different questions.

**An address — `/api/export`.** Open it in a browser where you are signed in
and it downloads your whole journal as one JSON file: every table the database
has — the entries and their notes, the settings, the comments, the address
book, the sends, the waves and what came back. No setup, nothing to configure,
works on any copy of this software. Nothing on the site links to it yet, so if
your journal lives on a phone's home screen, open the address in Safari
instead. It is owner-only — it hands over unpublished drafts, comments still
in moderation, the address book, and the return addresses people left with
submissions.

**It never carries the `secrets` table** — the password and the key that signs
you in. A download goes wherever downloads go, and whoever held that key could
sign in as you without the password. The file says what it left out.

**A schedule, if you want one.** The repo ships two scripts:

```bash
npm run backup
```

Writes every table to `$BACKUP_DIR/<timestamp>/` with a copy of `migrations/`
beside it, keeps the last 30 and prunes the rest. Nothing lists the tables: it
asks the database each time, so a table added by next month's update is in
that night's backup without anyone remembering to add it. It prints which
database it read and writes that into `manifest.json`.

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
It reads a downloaded export file just as happily as a backup folder, old ones
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

**Restoring into a brand-new database** — your Neon project is gone and you
have made another:

1. Point the copy at the new database (in Vercel: Settings → Environment
   Variables → `DATABASE_URL`) and redeploy. It builds its own tables.
2. Set it up as if it were new, choosing a password — an export does not carry
   your old one.
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
is chosen during setup and changed in Settings (the gear beside the card's
pencil). The key that signs the login cookie mints itself on first start.

**Two key columns stay behind unread**, because the schema is additive-only
and a column is never dropped: `secrets.lastfm_key`, from when Last.fm came
out of the software on 2026-09-16, and `secrets.anthropic_key`, from when the
research and the question mark came out on 2026-09-18 (the prompts are in
docs/RETIRED-PROMPTS.md). Nothing asks for either any more — the rows in
Settings are gone — and `library/secrets.js` still resolves them, which is
what a retirement is: the plumbing stays, nothing is connected to it. All of it sits in the
`secrets` table, which nothing but `library/secrets.js` reads. The nightly
backup carries it, so a restore from a backup brings the password back with
the writing; the export leaves it out, so a restore from an export keeps
whatever password the database already has.

**[`.env.example`](../.env.example) is still the list** of what the
environment *can* hold, with what each variable is for. Only `DATABASE_URL`
is required. A copy that set the others before Settings existed keeps
working: the database is read first, then the environment, so a value typed
into Settings takes over from the variable and the variable can then be
removed.

One worth knowing without opening the file:

- **The session secret** signs the login cookie. Setting `SESSION_SECRET`
  yourself is allowed and wins over the minted one; changing either signs you
  out of your own journal on every device and you log in again with the same
  password. Disruptive, not dangerous. Don't rotate it casually; do rotate it
  if you think it leaked — and whoever has it can sign in as you, which is why
  the export never carries it.

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
password lets nobody in at all: the claim code only ever opens a copy nobody
has claimed, so none is printed and none would be accepted.
