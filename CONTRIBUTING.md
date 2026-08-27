# Contributing

Thank you for wanting to. A few things worth knowing before you send a change.

## Sign your commits off

Every commit needs a `Signed-off-by` line:

```
Signed-off-by: Your Name <your@email.example>
```

`git commit -s` adds it for you, and `git commit -s --amend` adds it to the
commit you just made without one. That is the whole of it — no forms, no
account, no scanning a PDF.

The line means you agree to the [Developer Certificate of Origin](DCO): that
you wrote the change, or have the right to submit it, and that you are
submitting it under this project's licence.

## Why this is asked for at all

Copyright is not one thing owned by one person. You own the copyright in the
lines you write, the moment you write them — and that stays true after they are
merged here.

Which means that once anyone else's work is in the tree, the project's licence
can no longer be changed by one person deciding to change it. Every contributor
would have to be found and asked. That is manageable with two contributors and
impossible with fifty, and it is the reason projects that skip this step end up
frozen on a licence they have outgrown.

The sign-off makes the chain explicit and recorded, from the start, so nobody
has to reconstruct it later from a commit log and a hope. It is the cheapest
thing on this page and by far the most expensive one to retrofit.

## The licence

This project is [AGPL-3.0-or-later](LICENSE). Contributions come in under the
same terms. Every source file opens with a copyright line and an
`SPDX-License-Identifier` line — keep both, and keep them at the top.

On a file you create, **put your own name on the copyright line**, not the
existing one:

```js
// Copyright (C) 2026 Your Name
// SPDX-License-Identifier: AGPL-3.0-or-later
```

That is not a formality. Signing off under the DCO certifies you have the right
to submit your work under this licence; it does not hand your copyright to
anybody, and it is not meant to. You keep it. The line should say so.

For edits to a file someone else started, leave the existing line alone — git
records who wrote what, and a header that grows a name per contributor stops
being read by anyone.

## Changes to the database

Migrations are **additive only**. Add columns and tables; never rename a
column, change its type, or repurpose what one means.

The reason is not tidiness. People run their own copies of this software, and
those databases hold somebody's writing on a machine nobody here can reach. A
migration that fails is not a failed build — it is a journal that stops
opening, belonging to a person who cannot be helped.
