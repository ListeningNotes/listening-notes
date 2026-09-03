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

Optionally, an [Anthropic API key](https://console.anthropic.com), on your own
usage. Without one the journal reads and writes exactly the same; two things
are simply absent from a listen. One is *Research this album*, a button on the
album screen that fetches a sourced briefing — useful, but any search engine
does the same. The other is the stronger reason to have a key: a question mark
on the cover, from any screen, that already knows the record and every note you
have written so far. What instrument is that, what is the word for this sound,
what connects my track notes — asked without leaving the page, because notes
spread across a dozen screens cannot reasonably be pasted anywhere else.
Nothing it says ever enters the entry; it is read, and then you write.

**Deploy.**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FListeningNotes%2Flistening-notes&products=%5B%7B%22type%22%3A%22integration%22%2C%22integrationSlug%22%3A%22neon%22%2C%22productSlug%22%3A%22neon%22%2C%22protocol%22%3A%22storage%22%7D%5D)

The button asks Vercel to clone the code into your GitHub, make a project, and
attach a Neon database to it. It should ask you for nothing else: the database
connection string arrives from Neon, the signing key generates itself, and your
password is chosen on the site.

Two things on Vercel's screens are worth knowing in advance. **Git Scope** is
which GitHub account the copy goes into — pick yours. **Private Repository
Name** is what your copy of the code will be called on GitHub; anything you
like. And GitHub's permissions screen looks alarming; it is asking to put the
code into your account, which is the point.

**First run.**

1. Deploy. When Vercel says Congratulations, press the picture of your site.
2. It says the journal isn't ready yet, with a small *Set it up* underneath.
   Press it. For half an hour after the build that is all it takes — the copy
   knows the person who just built it is the person looking. (Came back
   later? Press Redeploy in Vercel and try again, or type the code from the
   end of the build log.)
3. It asks for your name, then offers a photo, three prompts, Last.fm, links
   and your rig, each of which you can skip, then a password. Everything you
   skip has a home later — on the card, or in Settings behind the gear beside
   the card's pencil.
4. The last screen shows how to put the journal on your home screen, where it
   opens like an app. Skippable; it is in Settings too.

The same steps, with what to expect at each and roughly how long, are written
out on the canonical copy at [listeningnotes.blog/get](https://listeningnotes.blog/get#install).
If it did not work, [say so here](https://github.com/ListeningNotes/listening-notes/issues)
— what you pressed and what you saw.

If the site says it has no database yet, press Redeploy once in Vercel; the
database usually arrives a moment after the first build. If it still says so,
the page tells you where to look. The tables build themselves; you never open
a SQL editor. `.env.example` lists every variable, and all of them except
`DATABASE_URL` are optional.

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
