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

## The last drop — 2026-09-06

The schema's draft window closed on 2026-09-06. What went, and how, is
history now: nothing is ever dropped again, so nobody will reopen it.

**`bio` was the card and `about_intro` was the pane, and both are gone,
2026-09-06.** They used to fall back into each other, which was right while
the card was the whole about page and wrong the moment there was somewhere
longer to write. Then the prompts replaced the bio, nothing read either
column, and the two held the same paragraph. Dropped together on the
owner's say-so.

**The last drop, 2026-09-06, and the draft window closes with it.**
`entries.background` and `post_link`, `settings.journal_name`, `bio`,
`instagram_url` and `send_me`, and the tables `conversations`, `echo_memory`
and `playing_with_neon`. Each had no reader: the background was a
model-written paragraph from when posts opened with one, `post_link` the old
Tumblr address, `bio` a paragraph the prompts replaced, `send_me` a line the
"If you're sending me something" prompt replaced, `journal_name` a title a
journal does not have, `instagram_url` an address that lives in
`social_links`. The two tables were built for a companion this software no
longer has and never held a row; the third is Neon's sample. `bio` and
`send_me` are the owner's writing and were dropped on the owner's say-so,
which is the only way writing is ever dropped — and `about_intro`, the same
paragraph under a second name, went with them the same day.

**Removed from `001_initial.sql` as well, which is the documented exception to
"nothing edits a migration that has run".** The runner keys on the filename,
so an edit never re-runs; what the edit changes is what a fresh copy builds.
Dropped columns have come out of 001 this way since `relationship` did. The
live database loses them by hand, after the code that stopped naming them is
deployed — never before, because the code on `main` still writes into them.

## The model — the draft window

The schema was a draft until the first external install, and these were the
rules while it was. The window closed on 2026-09-06; nothing is dropped now.

**Additive-only starts at the first external deploy, and until then dropping
is free — with one exception.** Any column may go while the schema is a draft,
*except* one holding writing the owner authored: entries, notes, tags, bio,
prompt answers. Those are somebody's work and are never dropped to tidy up.
Everything else is fair game, including data collected from visitors through
forms that no longer exist — that is the category email fell into, and keeping
it would have meant holding personal details precisely because nothing was
using them.

Confirm before dropping anything with rows in it. A grep finding no readers is
not evidence a column is unused; read the values. That rule has now been right
twice — it saved `entries.tags` from being misjudged, and it is what turned up
that dropping `relationship` would destroy nine rows of listening history
rather than none.

**Until then the database is a draft.** Dropping a dead column, renaming a bad
one, deleting a table nothing uses — all fine, and worth doing while it is
still free. The rule protects databases on machines nobody here can reach;
until Junior installs one there are none. Publishing the repo does not end the
draft — somebody installing from it does.

## Structure — settled and shortened, 2026-09-06

The live file keeps each of these as a rule and one reason. The fuller
arguments are here.

**One pin, three tried.** Three lived on the card for an afternoon and were
taken back out: three needed a jsonb list, jsonb has no foreign key, and losing
the key meant losing both the guarantee and the self-clearing. It also meant a
new column, a bump-the-oldest rule and a message explaining what the bump had
done — a good deal of machinery around the fact that a card has room for one
record. The list never reached the live database, so reverting cost nothing.

**The album and artist read to the right of the art.** The row it sits in is a
table of labels and answers, and this is one answer: a cover and what it is.
Both lines ellipsis, because a long album name that refuses to would push the
row off the edge of the card.

**The edit stamp, as built 2026-08-28.** The column is `entries.edited_at`,
not `updated_at` (`updated_at` exists on `drafts` and means something else).
`edited_at` belongs to the album note, the one piece of writing the entry
itself owns, so it prints under the album note; the per-track stamps live in
the `tracks` jsonb, one `edited` key each.

**The delete's warning said four things and now says two.** The other two were
true of the database rather than of anything a reader would recognise — what
happens to comment rows, and what a broken source link means — and nobody
should have to understand the schema to be warned about losing an album. Both
are handled by the delete itself now.

**Lineage, the tempting misreading.** Somebody reads your entry on Voodoo,
sends you Black Messiah, and that new entry points back at the Voodoo entry.
That is a real relationship and it is not `source_entry_id` — the album changes
at every hop, so the trail cannot be walked because each step changes the
subject. The invariant (same `album_key`) is also the argument for keeping the
two ideas apart: it is impossible to state if one column carries both.

**Write-once lineage, two consequences.** It reopens if the entry it points at
is deleted, because `ON DELETE SET NULL` clears it — which is right, since that
is the one case where the lineage genuinely ended. And until the send flow sets
it automatically, the only setter is a hand in the editor and a wrong one can
only be undone in SQL. That is the accepted cost of not having editable lineage.

**`settings.bio` kept its data and lost its reader** (2026-08-30), on the rule
that a column of the owner's writing is never dropped to tidy up. Dropped
2026-09-06 on the owner's say-so, with `about_intro`, which held the same
paragraph.

**The long note moved twice.** The essay was first pulled onto the About pane,
on the argument that an about page whose about is four lines and a button to
read the about is a summary of itself. Still true — but the essay was answering
a different question than the pane asks: "why keep a listening journal" is the
answer to *how did you get this*, which is asked at `/get`.

**`/get` owes a stranger two things and gives one.** The essay is the why; what
the software is, that it is free, and how to install a copy is not written yet.
Discharged 2026-09-03, when `/get` got its steps.

**Surprise's pill.** It sat at the foot of the wall for a day with Compare and
Submit and came off with them; the shake was decided as the second way in
before the first was removed.

**A fallback that is always used is not a fallback.** `NEXT_PUBLIC_SOURCE_URL`
was missing from the deploy button's environment list, so no fresh copy could
set it and every copy showed the default — which pointed at a repository that
did not exist. That is the §13 offer attempted and missed, which is worse than
a plainly broken link because it looks discharged.

**The mini beacon and the five pollers.** Removing the mini beacon was once
argued for on the grounds that five components polled Last.fm independently.
That half was fixed separately: `useListeningBeacon` runs one timer for however
many components subscribe, and the route caches the upstream answer.

**Built for real, in this order, 2026-09-03.** The whole sheet grows out of the
tile that was pressed and, on close, only the cover flies back into it while
the page fades under it — a page of writing shrinking to a thumbnail read as a
page, not a record being put back. The earlier expand-and-swipe attempt, which
flew the cover both ways and was glitchy on a real phone, is in the branch's
history; this one was built a gesture at a time and tested by thumb after each.

**The finder's shelf and the chooser, 2026-09-03.** The shelf of covers was rows
for an hour, on the argument that sideways had stopped being a free axis — but
the layer only takes sideways where there is a record beside this one, and on
the send page there is none, so the browser scrolls the shelf. Then the wall
replaced the shelf: the chooser has its own field at the top, so the keyboard
never scrolls the header under the clock, and newest first reverses "a
discography reads forwards" — on a wall the newest record at the top is the
order that reads.

**The back-pull strip, superseded.** The layer's back-swipe once started at a
36px strip on the left edge carrying `touch-action: none`, because anywhere
else the browser owned vertical panning and a mostly-sideways swipe scrolled
you into the notes before the handler had decided. Retired 2026-09-03 when
sideways became "next record" and closing became the pull down.

**Formative, decided, defined, coloured, stored — and never built, 2026-08-30.**
It had a column, an ON/OFF in the entry editor, a definition on `/key`, a
`--formative` token and a `formative` tone on Chip. What it did not have was a
control anywhere a listen is scored, or a single place that drew it. So: a
toggle on the score screen beside Masterpiece and Favorite, carried through the
hook into the draft and the entry save; the chip on the entry's own row; and
Formative in the archive's Highlights.

**The nine legacy rows were migrated onto the flag** — `relationship =
'Formative'` on Cathedral, EP1, MAGDALENE, Come to Daddy, System, the BLEACH
soundtrack, Shrines, Grey Oceans and La Planète Sauvage — before the column
was dropped, and the order was the whole risk. Done 2026-08-30, nine rows,
verified against the flag first.

**`relationship` was dropped, and the argument changed on the way.** The first
reason — every value had dissolved into something else — was false: the seven
Revisit rows all had `listen_total` of 1, because the listen number counts
repeats within the journal, and Study had no replacement at all. Dropped
anyway, on a better reason: a journal records listens going forward, and
whether you had heard something before is a sentence, not a column. The check
— read the values before believing a grep — was still right; it is what made
the premise visible.

## The journal, Sharing, The network, The lock, Setting up — shortened 2026-09-06

**`entries.tags` dropped, 2026-08-27.** Autogenerated by the model in the old
format call, never written by hand, never used to find anything. Of 401 values,
54% restated a column the table already had and the rest were generic
descriptors — one was literally `music`. Genre plus search over the notes is
how the archive works now. The grep-for-readers test nearly took this column
while it still held data; reading the values settled it.

**The relationship field, and its picker.** Every value dissolved: Revisit →
listen number, Submission → `received_from`, Formative → flag, Study and First
Listen → cut. The old dashboard form was the last place it could be set;
deleting `/dashboard/entries` took the last picker off the site.

**Editing corrects a listen; logging records a new one.** Every field is
editable. A prompt on changing an older rating — opinion changed, or fixing a
mistake? — was decided and never built.

**Dropping the two email columns, as read before dropping.** Submissions:
three rows with an address, two of them the owner's own tests, the third a real
person — losing her address was the actual cost. Comments: one of nine, and it
was `test@test.com`.

**The send page's small decisions, 2026-08-29.** The name and the journal share
a row wherever there is width, because two short fields stacked left a column
of empty page. The form is aligned to the top, because centring only looked
right on the chosen state. One example in the message placeholder, not three:
three read as a list to choose from. Clearing the record is a mark on the
cover's corner, not a sentence under it. Results were a shelf — one row inside
the square, scrolling sideways — until the chooser wall replaced it on
2026-09-03.

**The door counted.** Hiding an entrance is worth nothing and counting attempts
is worth everything; the rate-limiting decision and the login's placement
belong together.

**Existing journals were claimed by a migration, not by asking.** Every copy in
the world read `setup_complete: false`, including this one after a year of
writing, because nothing had ever written the column. Turning it into a gate
without `002_claim_existing_journals.sql` would have held a live journal behind
the holding page on deploy. A non-null `keeper_name` is somebody having already
answered the question setup asks.

**Settings, day by day.** A gear sat beside the card's pencil for a day and
came off, 2026-09-02: the card and Settings do not need to link to each other.
The starting theme and the wording of the key were on the page for an
afternoon and came off the same day, 2026-09-01, on Miyel's call — parked.
For a day Settings listed the card's fields at its foot as doors to the card
with the pencil up; those came off on 2026-09-02 — a list of rows saying "not
here" was the page apologising for it.

**The claim window, weighed three ways.** A code printed in the build log, a
timed window after first boot, and accepting the risk. The code won first: a
window closes on the slow and opens for whoever's request is the first cold
start; accepting it is a land grab waiting for a scanner. Then the second
fresh-account run found nobody reads a build log, and the timed window won
after all — combined with the code rather than instead of it, and opened only
at build, which only the owner can trigger.

**Neon's integration is a `products` parameter, not an `integration-ids` one,
2026-09-01.** The brief said to find the `oac_` ID in Neon's own deploy button;
there is none. Whether `products` survives the sign-in redirect only the
fresh-account test can say — and it did, 2026-09-02.

**The fresh-account run passed, 2026-09-02, in Safari.** Button → GitHub → Add
on the Neon row → Free → Create → Deploy → picture → Set it up → name → screens
→ password → home screen → a working journal.

**`/get` carried the steps under the essay** for a day before becoming three
addresses: seven steps with what to expect and how long, screenshot slots
drawn only when `public/install/NN-*.png` exists, and the issues link.

## The session — shortened 2026-09-06

**The session opened as a layer from the right, 2026-09-01,** on the sheet an
entry then arrived on. It rises from the foot of the screen now, with the
other forms. `/session` opened cold is still a page.

**The plain `<img>` rule was added 2026-08-30**, after the Neon transfer
allowance hit 95% and the cause turned out to be two of the read-cost rules
not existing.
