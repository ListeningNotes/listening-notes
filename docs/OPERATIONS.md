# Operations

Looking after a running copy: getting your writing out, getting it back, and
the keys that hold the thing together.

---

## Keeping a copy of your journal

Two ways, because they answer different questions.

**A button — `/api/export`.** Signed in on the writing side, this downloads
your whole journal as one JSON file: every entry, every note, the settings, the
comments. No setup, nothing to configure, works on any copy of this software.
It is owner-only — it hands over unpublished drafts, comments still in
moderation, and the return addresses people left with submissions.

**A schedule, if you want one.** The repo ships two scripts:

```bash
npm run backup
```

Writes every table to `$BACKUP_DIR/<timestamp>/` with a copy of `migrations/`
beside it, keeps the last 30 and prunes the rest. `BACKUP_DIR` defaults to
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

Prints what it would do and changes nothing. Add `--yes` to actually restore,
which **empties every table first** — it is a restore, not a merge. It reads a
downloaded export file just as happily as a backup folder.

Practise on a Neon branch before you ever need it for real. Branches are free
and instant, and a restore you have never run is a hope rather than a plan:

```bash
DATABASE_URL='postgres://...branch...' npm run restore -- <backup> --yes
```

> **Neon's own history is short** — six hours on the free plan. That covers the
> mistake you notice straight away and nothing else. Take your own snapshot
> before you touch the schema.

---

## Secret Keys

**Most of them live in the journal now, not in the environment.** The password
is chosen during setup and changed in Settings (the gear beside the card's
pencil). The Last.fm and Anthropic keys are pasted into Settings. The key that
signs the login cookie mints itself on first start. All of it sits in the
`secrets` table, which nothing but `library/secrets.js` reads, and which the
backup carries like any other table — so a restore brings the password back
with the writing.

**[`.env.example`](../.env.example) is still the list** of what the
environment *can* hold, with what each variable is for. Only `DATABASE_URL`
is required. A copy that set the others before Settings existed keeps
working: the database is read first, then the environment, so a value typed
into Settings takes over from the variable and the variable can then be
removed.

Two worth knowing without opening the file:

- **The session secret** signs the login cookie. Setting `SESSION_SECRET`
  yourself is allowed and wins over the minted one; changing either signs you
  out of your own journal on every device and you log in again with the same
  password. Disruptive, not dangerous. Don't rotate it casually; do rotate it
  if you think it leaked.
- **The Anthropic key** bills to your Console **API credit balance**, which is
  a separate pool from a Claude.ai subscription. See the gotchas in
  [NOTES.md](../NOTES.md). Optional: without it the Research button and the
  question mark on the session's cover are absent, and everything else works.

**Locked out.** With the password in the database there is no variable to
edit. Get in with a wristband you still hold on another device and change it
in Settings; failing that, clear `password_hash` in the `secrets` row from
Neon's SQL editor and, if `SESSION_PASSWORD` is not set either, the copy is
back to asking for a claim code, which the next restart prints.
