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
- **[NOTES.md](NOTES.md)** — what is pending, what is done, and the gotchas
  that cost real time.
- **[README.md](README.md)** — what this is and how to run a copy. The front
  door, for strangers.
- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** — where everything lives and
  what to touch to change a given thing. Read this before hunting for a file.
- **[docs/OPERATIONS.md](docs/OPERATIONS.md)** — backups, restore, export, keys.

# End of session

Update the files, without being asked:

- Finished items move to **Complete** in NOTES.md, with the date.
- New items go to **Pending**.
- Any gotcha that cost real time goes under **Gotchas**.
- Any decision made — chosen, rejected, or ruled out — goes in **DECISIONS.md**
  with its reason, when it is decided rather than when it is built.

# Naming

Before creating any new function, route, or file, stop and let Miyel name it.
Propose options; he picks or overrides. New things only — editing existing code
follows the normal flow.
