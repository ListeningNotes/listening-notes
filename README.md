# Listening Notes

A personal music journal. You listen to a record, you write about it, and it
lives at your own address on the web.

You run your own copy. There is no account here, no subscription, and nothing
of yours is stored on anybody else's server — the journal is yours, the
database is yours, and it is named after you rather than after this software.

**Built with:** Next.js, Neon Postgres, Claude AI (optional)
**Licence:** [AGPL-3.0-or-later](LICENSE) — free to run, including for a business

---

## Run your own copy

**What you need.** Three free accounts, none of which need a card:

| | |
|---|---|
| [GitHub](https://github.com) | Holds your copy of the code |
| [Vercel](https://vercel.com) | Runs the site |
| [Neon](https://neon.tech) | The Postgres database your writing lives in |

Optionally, an [Anthropic API key](https://console.anthropic.com) for the album
research and the listening companion, on your own usage.

It is closer to required than optional today, and that is a known gap rather
than a design: without a key the journal still *reads* fine, but it cannot
easily be written in — a listening session stops at the briefing with an error,
and the step that turns your notes into a saved entry needs the same key.
Nothing checks for it and hides those controls the way the Last.fm key is
handled. Noted in [NOTES.md](NOTES.md).

**Deploy.**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FListeningNotes%2Flistening-notes&env=DATABASE_URL,SESSION_SECRET,SESSION_PASSWORD,NEXT_PUBLIC_SOURCE_URL&envDescription=The%20first%20three%20are%20required.%20The%20fourth%20only%20if%20you%20have%20modified%20the%20code%20%E2%80%94%20see%20.env.example&envLink=https%3A%2F%2Fgithub.com%2FListeningNotes%2Flistening-notes%2Fblob%2Fmain%2F.env.example)

**First run.**

1. Create a Neon project. Copy its connection string.
2. Set the environment variables — see [`.env.example`](.env.example) for the
   list and what each one is for. `SESSION_PASSWORD` is what you will type to
   reach the writing side of your own journal.
3. Deploy. The tables build themselves on first start — see
   [`migrations/`](migrations). You do not need to open a SQL editor.

On first visit the copy shows a holding page and asks to be set up. That is
four questions — your name, this journal's address, when you started logging,
and a Last.fm username if you use one — behind the `SESSION_PASSWORD` you just
set. Only the name matters; the rest can be left blank.

**Naming your copy.** Every copy is named after whoever keeps it, so yours is
not called Listening Notes and should not be. The name comes from `keeper_name`
in the `settings` table; the mark stays as a colophon, the way a press mark sits
in the back of a book.

**Working on it?** See [Architecture](docs/ARCHITECTURE.md) and
[Operations](docs/OPERATIONS.md).

---

## Licence

Listening Notes is free software, released under the **GNU Affero General Public
License, version 3 or later**. The full text is in [LICENSE](LICENSE), and every
source file opens with two lines:

```js
// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
```

Who holds the copyright, and what the licence is. Both, because a file copied
out of this repo has to still say both.

**In practice.** Anyone may run a copy, for anything, including a business.
Anyone may change it. The one condition is reciprocity: if you give your
modified version to other people *or run it as a service they can reach over a
network*, they are entitled to your source. A closed commercial fork is not
possible; a copy stays a copy.

**Warranty.** There is none. The software is provided as-is — see sections 15
through 17.

**Contributing.** See [CONTRIBUTING.md](CONTRIBUTING.md). Changes are signed off
under the [Developer Certificate of Origin](DCO) — one `git commit -s` per
commit.

**The name is not the code.** The licence covers the software. It does not grant
use of the Listening Notes name or mark to identify *your* journal. Every copy is
named by whoever keeps it.

The appendix notice, why section 13 rather than the plain GPL, and the reasoning
behind the sign-off are in [docs/LICENCE-NOTES.md](docs/LICENCE-NOTES.md).
