# DECISIONS-ARCHIVE.md

Settled history. Everything here was decided, and either reversed later or
settled so completely that nobody would reopen it. It is kept because the
arguments were real and somebody may one day want to know why the software is
shaped the way it is — and it is kept *here*, rather than in DECISIONS.md,
because that file is read at the start of every session and every line in it
is context spent before work begins.

Not read at session start. Read it when a question in DECISIONS.md points
here, or when something old comes up and the reason is not in the live file.

Each section names where the current rule lives.

---

## Licence and ownership

**AGPL-3.0-or-later.** Chosen over GPL because a journal is a website — section
13 is what stops a closed fork run as a service. Chosen over PolyForm
Noncommercial because a business (the hi-fi bar) has to be able to run a copy.

**No section 7(b) attribution clause.** Considered and rejected. It would force
the mark onto forks that legitimately aren't Listening Notes, and it doesn't
prevent the scenario actually feared — someone overtaking the project in a
different category. Trademark protects the name; the licence protects the code.

**CPAL ruled out.** Built on deprecated MPL 1.1, weaker file-level copyleft
than AGPL, incompatible with GPL/AGPL code, and obscure enough that the
friction lands on honest contributors.

**Copyright in Miyel Brown's legal name**, not "Listening Notes." No legal
entity exists by that name, so enforcement would require establishing identity
first. All commits are already authored under the real name in a public repo.

**Per-file notice is the two-line short form** — copyright line plus SPDX
identifier. The appendix's full 15-line notice across 125 files would be ~1,900
lines of boilerplate over comments written with care.

**DCO sign-off required on all commits.** From the first merged contribution
onward, that contributor owns the copyright in their lines and the licence can
no longer be changed unilaterally. Recorded now while it is cheap.

**The name is not the code.** The licence grants no use of the Listening Notes
name or mark. Every copy is named by its keeper; the mark travels as a
colophon.

---

## Structure — the pin

Superseded the same day it was decided, 2026-08-28. The current rule is under Structure in DECISIONS.md.

**It is pinned from the record, not picked from the card.** The search sheet
was the original plan and was dropped: by the time you are looking at your own
card you have to *remember* which album you wanted, where on the record itself
you *recognise* it. So the control is a pin in the chip row of an entry, owner
only, and there is no picker at all — which is also less machinery than the
sheet would have been.

**Reversed the same day, 2026-08-28. The pin goes back on the card, and the
search sheet with it.** Recognising beats remembering and that argument still
holds — it is just not worth what it costs here. `pinned_entry_id` is a field
on the settings row, so it belongs with the other settings fields, behind the
card's pencil; a control for it in the chip row of an entry is an admin button
sitting in the middle of somebody's reading. The entry editor gets no pin at
all: changing your pin should not mean opening an editor for an album you were
not thinking about.

**The trade, accepted:** from an entry there is no "pin this one" — you go to
the card and search for it. More steps for the rarer action, which is the right
way round.

---

## Structure — how an entry arrives

Superseded 2026-09-02; the entry expands from its cover now. The first version, for the record:

**An entry is a layer over the journal, not a fourth pane, 2026-08-29.**
Tapping a cover slides the entry in over the wall and dismissing slides it
back. It comes from the right because that is where things arrive from, not
because right means entry.

**Reversed for the entry, 2026-09-02: it expands from the cover, and
sideways means the next record.** Junior found there was no way to read
entry to entry — every next one meant going back to the wall. Adding a
next-entry swipe to a sheet that already slid sideways to open and close
would have put three sideways gestures on one screen: the cross's panes,
dismiss, and next. So the entry no longer slides in from the right. It
expands from the cover that was tapped, the way a photo viewer opens a
picture: the cover flies out of its tile into its place at the top of the
entry while the sheet fades in under it, and on the way out it flies back.
That frees the sideways axis for browsing — left and right are the previous
and next record — and closing becomes a pull down from the top of the first
screen, a press outside the sheet where there is an outside (a wide screen,
where the entry is a column with the wall showing either side), Escape, or
back. Both gestures are ones people already own.

---

## The lock — where the door was

Superseded 2026-09-02; the way in is the right pane and nothing on the mark opens it. What came before:

**Which is why the entrance can be hidden.** A normal login has to be findable
because strangers need it; nobody needs this one but the keeper. Three taps on
the mark, and a quiet Sign in line beside the source link on the pitch pane for
when a gesture will not do. Hiding a door adds no security and this is honest
about that — the lock is what protects the room. It costs nothing either, which
is the whole argument.

**It opens where you pressed, not as a screen.** A full-screen gate is what you
build when the login is the destination. This one is a small panel under the
mark, because signing in is something done in passing on the way to writing.

**The sign-in form lives on Settings, and nothing on the mark opens it,
2026-09-02.** The mark used to turn into a password panel in place, on the
cross — a login form on the beacon page, which is meant to be a record and
its art and nothing else. Then, for an afternoon, three taps went to Settings
instead. Both are out, on Miyel's call: no gesture on the logo at all. The
way in is the right pane and only the right pane — the pitch's "Sign in"
line when you are out, and the desk when you are in, which now carries a
Settings door beside Inbox and Share. `/settings` signed out *is* the
sign-in, titled so; `/login` stays as the address form. One form, one place.
This supersedes "The way in is three taps on the mark" under The lock.

---

## Setting a copy up — the first shape of setup

Superseded 2026-09-01; setup is one screen at a time now. The first version:

**One step, four fields, and the rest is edited where it prints.** Name,
address, logging-since, Last.fm. Everything else on the card already has an
editor, so a longer setup would be a second one. The nine bio prompts
especially are not here: three get answered, and nine is a questionnaire.

---

## Migrations — schema.sql

History: there is no schema.sql, and nothing should bring one back.

**`schema.sql` is retired and `migrations/001_initial.sql` is the schema.** Two
files describing one database is two files that drift, and this one already had
a rule about that. Backups carry the migrations rather than a separate copy.

---
