# DECISIONS.md

Settled decisions and the reasoning behind them. One line each, with the why.

**This file exists so decisions don't get relitigated.** If something here comes
up again, the answer is already written down — read the reason before
reopening it. Add to this file when a decision is made, not when it is
implemented.

---

## The model

**Free software, self-hosted, one copy per person.** Nobody pays, ever. Free is
what keeps API relationships simple — "commercial use" is the trigger clause in
both Apple's and Last.fm's terms.

**Hosting other people is ruled out.** Every reason to host is solved without a
server: the feed is pull-based, compare fetches a file, the address book is
local. Hosting would add liability, database bills, and support for nothing.
Not "never" — just not a future being kept open. If it returns it will be
because someone asked, not because it's needed.

**There is exactly one Listening Notes, at one address.** It is the only place
the software comes from, which is what makes anything else claiming the name
self-evidently fake.

**Visiting someone else's journal opens the browser.** This is the model made
visible, not a defect. Their journal loads from their server under their
address; the address bar is the receipt. An iframe or proxy would rebuild the
platform behaviour the whole architecture removes.

**No follower counts, no notifications, no unread badges.** Presence is
outbound and opt-in. A journal can show what is playing; it never shows who is
reading.

**Additive-only schema, starting at the first install that is not ours.** From
the first external install onward, migrations add columns and never rename or
drop them. Copies in the wild have to survive every migration, and one that
fails is somebody's journal that stops opening.

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

From the first external deploy onward, nothing is dropped at all.

**Until then the database is a draft.** Dropping a dead column, renaming a bad
one, deleting a table nothing uses — all fine, and worth doing while it is
still free. The rule protects databases on machines nobody here can reach;
until Junior installs one there are none, and paying the cost of a rule whose
reason has not arrived yet is how a schema accumulates columns nobody wanted to
keep. Publishing the repo does not end the draft — somebody installing from it
does.

These two sit here rather than under The journal because they are facts about
distribution. They were filed with the schema notes and kept being looked for
in the wrong place.

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

## Structure

**Cross navigation.** Beacon is home. Down → journal (only from the beacon).
Left → About. Right → actions when logged in, pitch pane when logged out.

**The cross is one route, not three.** A swipe that triggered a navigation
would unmount the pane being left, throw away its scroll position and re-fetch
it on the way back. Everything the gesture depends on — that it is continuous,
reversible, and returns you where you were — needs all three panes mounted at
once. So home is a horizontal scroll container and the browser does the
physics. Entries stay real routes: an entry has an address you can send
somebody and a pane does not.

**Panes are named after the routes they absorb**, and those routes mount the
same component the pane does. `/archive` → Journal, `/about` → About,
`/dashboard` → Dashboard. One description of each thing, two places it can be
reached, and no duplication to keep in step.

**Edge carets, not a dot indicator.** A swipe is invisible; nobody opens a page
knowing there is more of it sideways. A caret pinned to an edge says there is
something that way in a way three dots never do, and pressing it does what
swiping does — which is how the swipe gets learned. It is also the fallback if
the gesture feels wrong on a given device.

**The down caret is drawn by measuring the pane, never by being told.** A pane
is deep when its scroller overflows. That is what makes a fresh copy right for
free — an install with no about paragraph and no rig has nothing under the
card, so nothing points down at it — and it is why the pitch pane's missing
bottom edge needs no special case.

**Vertical snapping is `proximity`, not `mandatory`.** Mandatory is what made
the old two screens feel like two pages you could not stop between, and it only
works while a pane is exactly two screens tall. The centre pane is three and a
bit — a whole archive under the beacon — and mandatory would drag a reader back
to a screen edge every time they stopped halfway down the wall. Proximity keeps
the settle at the card-to-writing boundary, which is where the feeling was.

**The mark is large and centred at the top of every pane.** One height, so the
square directly under it — a portrait on the left, an album on the centre —
lands on the same line whichever pane you are on. That is what makes the swipe
read as one object turning. It also replaced the card's measured photo-lift
with two constants: arithmetic that has become a constant should be a constant.
On desktop the outer two crowns are hidden but not removed — the box has to
stay or the columns stop agreeing where a square starts.

**Desktop is the same three components as three columns.** Not a second layout.
The site already carried two separate homepage markup trees that had drifted
apart; a third would have been the same mistake twice.

**`bio` is the card, `about_intro` is the pane.** They used to fall back into
each other, which was right while the card was the whole about page and wrong
the moment there was somewhere longer to write — a card that borrowed the long
paragraph would print a page of prose on a card.

**Prompts replace the free-text bio.** Nine openings ship in
`library/bioprompt.js`, a keeper answers three in one line each, and the answer
completes the sentence on the same line — `I can never skip — Voodoo, side
two`. A blank box is a hard question badly phrased: asked to describe yourself
you write a paragraph about the project; asked what you can never skip you
write two words worth reading.

**The nine are fixed and every copy ships the same nine.** A keeper who could
write their own prompts would be back at the blank box one level up, and a
fixed set is what lets two journals answering the same opening be read against
each other.

**Stored as key and answer, never as the sentence.** The wording will be
revised and revising it must not orphan what somebody wrote. A key with no live
prompt is dropped on render, so retiring a prompt is safe and renaming one is a
migration.

**Looking for is cut**, replaced by the prompt *If you're sending me something,
make it —*. Same information as a finished sentence rather than a labelled
field. It is the one of the nine that can be promoted onto the card, because it
is the only one addressed to the reader rather than about the keeper, and it is
the reason the Send button under it exists. The pane drops it from its own list
rather than printing it twice. `send_me` keeps its old value and stops being
read.

**Top genres stays computed.** Not replaced by a self-reported prompt.
Computed says what somebody actually listens to and a prompt says what they
would claim; the gap between the two is the interesting part, and a
self-reported genre list would be the most generic thing on the page.

**A free-text bio may come back as an optional field alongside the prompts, and
that is deliberately the later decision.** It is much easier to add one than to
take one away once people have filled it in.

**A pinned album goes on the card.** One entry from the owner's own journal,
shown as art, tapping through to that entry. Not a favourite field and not an
open search — it points at something that already exists. It is the only image
on the card besides the portrait and the thing that stops the card reading as
all type and numbers. Below the name and metrics, above Send an Album, and
smaller than the portrait: the person is the subject and the record is what
they are pointing at. No label — art under a name says what it is.
`pinned_entry_id` already exists with `ON DELETE SET NULL`, so deleting a
pinned entry clears the pin rather than breaking the card, and null renders
nothing.

**The dot row is gone.** Archive, Compare, Submit and Surprise all have their
own routes and all sit at the foot of the wall now, so the row was a fixed
strip on every page pointing at places already reachable from where you were.
Removing it also gave back the 56px every page reserved to clear it — the nav
band went from 136 to 80.

**Tapping the top of a scrolled pane returns to the top of it.** Which on the
centre pane is the beacon and on the left is the card — each pane's own cover.
The band across the top is the target and it is invisible on purpose: the band
already appears when a pane is scrolled, so the affordance is the band, and
drawing something in it would be labelling a gesture the phone taught its owner
years ago. It exists only while a pane is scrolled, because at the top there is
nothing to go back to and a dead tap zone across the cover is worse than none.

**The wall's bar sits on the floor, edge to edge.** It hovered 68px up to clear
the row of carets — and those are hidden for as long as a pane is scrolled,
which is the only time the bar is on screen, so there was never anything under
it to clear. Rounded corners and side margins made it a pill floating over the
covers; square along the bottom and full width, it is the edge of the wall.

**Sideways is a decision made at the top of a pane.** The two side controls go
away as soon as a pane is scrolled at all: once you are down in the wall, or
down in the reading, the only thing worth offering is more of what you are
already in, and three marks parked over somebody's album art are the row
covering the thing they came to look at. The swipe itself is untouched — hiding
a control is a hint, while disabling a gesture halfway down a page is the thing
that would actually read as broken.

**Fifty covers to a page.** Past that you are scrolling rather than looking, and
the sort you chose stops meaning anything because you never reach the other end
of it. Counted on the filtered set, not the archive, so searching one artist
inside three hundred records gives you their four on one page.

**Nothing sits at the foot of the wall.** Compare, Submit and Surprise were put
there when the dot row went and taken off again: the foot of the archive is
where somebody has finished looking, and three links to elsewhere is the site
asking them to leave.

**The wall's controls sit at the bottom on a phone.** Where the thumb is. At
the top they were furthest from the hand and took the first hundred pixels of
the wall, which on a phone is most of a row of covers: the records get the top
of the screen and the controls go where you can reach them. Sticky, never
fixed — the wall is mounted inside a pane of the cross, and a fixed bar would
float over the card and the desk when you swiped away from it.

**The beacon stops captioning itself.** "Now listening" and "Not listening"
said what the screen already shows: a record with a title and an artist under
it, on a page whose mark carries a lit dot while something plays. The idle
state still greys the art and prints "last played" across it, which is the same
fact told by the thing it is about — and that label is no longer green, which
was the retired accent and, worse, the one colour on the site that means
something *is* playing.

**No fourth metric on the card.** *Most played* was proposed to balance three
counts with one line about taste, and turned down: the card is a glance and
four rows is already the most a glance holds. Ruled out rather than parked.

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

**One, and the shape is the rule.** `pinned_entry_id` is a single column, so
pinning a second record unpins the first without anything having to check, and
its foreign key carries ON DELETE SET NULL, so deleting a pinned entry clears
the pin rather than leaving the card pointing at nothing.

Three lived here for an afternoon and were taken back out. The reason is worth
keeping, because it is the same trade in both directions: three needed a jsonb
list, jsonb has no foreign key, and losing the key meant losing both the
guarantee and the self-clearing. It also meant a new column, a bump-the-oldest
rule and a message explaining what the bump had done — a good deal of machinery
around the fact that a card has room for one record. The list never reached the
live database, so reverting cost nothing.

**The album and artist read to the right of the art.** The row it sits in is a
table of labels and answers, and this is one answer: a cover and what it is.
Both lines ellipsis, because a long album name that refuses to would push the
row off the edge of the card.

**Nothing about writing on the beacon.** "+ Start a listen" and "Messages" sat
under it from when the cover was the only screen an owner had. The desk is one
swipe right and carries both, with the same unread count on the same door — so
the cover was showing the same two controls twice, a hundred pixels apart, on a
screen whose whole job is one record. Duplication was argued for once, on the
grounds that the moment you want to log something is while you are looking at
what is playing; the swipe turned out to be short enough that the argument did
not survive seeing it.

**No prompt on the card.** One was promoted there to give the Send button its
reason; the card is the counted facts and the records now, and all three
prompts sit together on the screen below, which is what that pane is for.

**An entry is edited on the entry.** The CMS list at `/dashboard/entries` was
built when there was nowhere else to do it, and it is the same shape the card
had before this session: a form for something you cannot see while you type
into it. Finding one among many is what the archive's search already does, so
the list is not earning its place either.

**Editing is for typos, second thoughts soon after, and genuine mistakes — not
for revising a listen.** A relisten is a new entry; the journal is a record of
encounters and rewriting an old one would be falsifying the encounter rather
than adding to it. That is what makes the next decision cheap: if editing is
only ever small, a mark saying it happened costs nothing and settles the
question of whether the record can be trusted.

**A changed note says so, next to the thing that changed.** Editing an album
note or a track note stamps "Edited {date}" under that piece of writing — not
at the top of the post. A stamp at the top says only that something moved,
which tells a reader nothing; a stamp under track two says what.

It is also what keeps this from becoming a quiet rewrite tool. An entry
carrying five track stamps looks different from one carrying a single typo fix,
and that visible difference is the honesty. The point is not an audit trail: a
journal nobody can silently rewrite is worth more than one where every entry
might have been.

**Latest edit only, never a list.** One date per piece of writing, replaced
each time. A history of every touch is an audit trail, which is the thing this
is deliberately not.

Built 2026-08-28. Two notes on the shape, because the brief that settled this
described it slightly wrong and the code is the thing that is true:

- The column is `entries.edited_at`, not `updated_at`. `updated_at` exists, but
  on `drafts`, and it means something else.
- It is not unrendered plumbing. `edited_at` belongs to the album note, which
  is the one piece of writing the entry itself owns, so it prints under the
  album note — a per-thing stamp like the track ones, not a post-level banner.
  The per-track stamps live in the `tracks` jsonb, one `edited` key each.

**Delete lives at the foot of an entry's edit mode**, behind a second
confirmation and a warning that says what it is. Not in the bar beside Save:
they are not the same weight, and a destructive control next to the one pressed
every time is one that gets pressed by accident. The first press opens the
warning in place rather than a dialog — a dialog is dismissed by reflex, and
this has to be read to be got past.

**The delete cleans up after itself rather than warning about the mess.** Only
one of the three things referring to an entry is a foreign key:
`settings.pinned_entry_id` clears itself, while `comments.entry_slug` is plain
text and `entries.source_entry_id` has an index and no key. So the delete
removes the entry's comments and clears the chain links pointing at it before
removing the row. The alternative was a warning long enough to explain the mess
it was about to leave, which is a worse answer than not leaving one.

**The warning is two sentences: it deletes this album permanently, and it can
only be undone by restoring a backed up copy.** It said four. The other two were true
of the database rather than of anything a reader would recognise — what happens
to comment rows, and what a broken source link means — and nobody should have
to understand the schema to be warned about losing an album. Both are handled
by the delete itself now, which is a better place for a consequence than a
paragraph.

**`source_entry_id` is lineage, not association.** It points at *the sender's
entry for the same album*, never at the entry that prompted the recommendation.
Zach logs Voodoo and sends it to Miyel; Miyel logs Voodoo and her entry's
`source_entry_id` points at Zach's Voodoo entry. Walking the column upward
gives the whole history of one record — who found it first and who passed it to
whom — and that only works because every hop is the same album. `null` means
origin.

The tempting misreading is association: somebody reads your entry on Voodoo,
sends you Black Messiah, and that new entry points back at the Voodoo entry.
That is a real relationship and it is not this one — the album changes at every
hop, so the trail cannot be walked because each step changes the subject.

**A valid `source_entry_id` must share the current entry's `album_key`,** and
that is enforced on write. The invariant is also the argument for keeping the
two ideas apart: it is impossible to state if one column carries both.

**`prompted_by` is the column association would need**, if it is ever wanted.
Parked, not built.

**Lineage is written once; the rest of the chain is editable.** `received_from`
and `received_date` are corrections — you log something and remember a week
later that Zach sent it, which is the same kind of fix as a typo.
`source_entry_id` is not: either their entry led to yours or it did not, and a
lineage anyone can rewrite is a record of nothing. So it may be set while it is
empty and never again, which is the `WRITE_ONCE` rule `serial` and `founded_at`
already use, and it is dropped silently for the same reason — the editor posts
every field it knows about and should not fail because one was already settled.

Two consequences worth having written down. It reopens if the entry it points
at is deleted, because `ON DELETE SET NULL` clears it — which is right, since
that is the one case where the lineage genuinely ended. And until the send flow
exists there is nothing to set it automatically, so the only setter is a hand
in the editor and a wrong one can only be undone in SQL. That is the accepted
cost of not having editable lineage.

**Everything editable is edited where it prints.** The link rows and the rig
rows were fields on the card for things that appear a screen below it, which is
filling in a form blind. They moved down into the sections they belong to when
the pane got long enough to have sections.

**The card is a glance; the reading is below it.** No prose on the card at all
— a face, a name, four facts and the ways to reach somebody. The bio came off
because it was a paragraph about the keeper printed two hundred pixels above a
longer, better paragraph about the keeper: with the about writing running
directly under the card, the card was introducing what the next screen was
about to say, in the same person's words, twice.

**The four facts are one table.** Albums logged, logging since, top genres,
looking for — same label-and-answer shape for all four. The first two used to
be a small centred sentence set differently from the second two, which made
four facts about one person read as two kinds of thing.

**`settings.bio` keeps its data and loses its reader.** Nothing renders it and
the card editor no longer writes it. The column stays: the schema is still a
draft, the value is somebody's writing, and a column dropped to tidy up is the
exact move DECISIONS already warns about. Revisit it at the welcome screen,
where it is either given a job or given up.

**The long note is at `/get`, and `/why` is retired.** Reversed the same day it
was decided, and the reason is worth keeping: the essay was first pulled onto
the About pane, on the argument that an about page whose about is four lines
and a button to read the about is a summary of itself. That is still true — but
the essay was answering a different question than the pane asks. "Why does
somebody keep a listening journal" is the answer to *how did you get this*, and
that question is asked at `/get`, which is where every copy's pitch pane sends
people. So the pane carries a short paragraph and the essay is the top of the
page a stranger lands on.

**`/get` is not linked from the About pane.** It does not exist on a copy that
has not written one, so a pill pointing at the path would be a dead link on
everybody else's journal. The pitch pane is where that address is reached, and
it reaches the canonical instance by its full address rather than by a path.

**`/get` owes a stranger two things and currently gives one.** The essay is the
why; what the software is, that it is free, and how to install a copy is not
written yet. Recorded as a known hole rather than discovered as one.

**No mark in the corner.** The crown at the head of every pane is the mark; a
small one in the bar is a second one whether or not the two are ever on screen
at once. The band behind that row stays, because it is what stops the wall of
covers scrolling through the theme toggle.

**Each caret carries a mark for what is that way** — a card left, a book down,
a cog right for the owner and an `i` for a visitor. The caret is the verb and
the mark is the noun: a chevron alone says something is over there, which is
enough to make somebody swipe once and not enough to say whether it was worth
it.

**The rig ships as rows and nothing else.** The specs come out of their drawer
and onto the About pane, because a drawer is what you build when there is
nowhere to put something and the pane is somewhere. The several hundred words
about why any of it matters stay out permanently — not parked, not waiting on a
column. What is worth saying is what the thing is and what it does; the rest is
the journal, and hardcoded it would be one person's essay shipped inside
everybody's software.

**Surprise keeps its pill and gains a shake.** The pill at the foot of the
journal is how anybody finds it; shaking the phone is for whoever already has.
The shake fires a firework off the existing gold burst and then goes to
`/shuffle`. Both, not either — a gesture nobody discovers is not a feature.

**The card flip is dead.** Left *is* the About page. Having both means the card
exists in two places and neither is canonical.

**No journal names.** Nobody says "check out The Long Version" — they say "do
you have Listening Notes." A journal title would compete with the product name.
Journals are named by their keeper.

**Titles read `{keeper_name} · Listening Notes` everywhere.** No exception for
the canonical instance. The mark is present on every copy like the colophon,
in the one place a curious person looks.

**`keeper_name` is plain text; `display_name` is optional and card-only.**
Decorative Unicode gets mangled in PWA labels, RSS readers, and link previews.
One name for machines, one for looks.

**`/get` and `/specs` don't ship.** Drawer rule: blank on a fresh copy means
the page and its link don't render. These are Miyel's pages on Miyel's copy.
(`/why` was the third of these; it is deleted, not forwarded — see below.)

**A retired route only earns a forwarding stub if somebody has the URL.**
`/why` was deleted outright rather than redirected to `/get`. It had lived for
three days, behind a pill on a card, on a site nobody else has a copy of — so
the bookmarks it was protecting do not exist. And a stub is not free: it is a
route that ships to every install, whose whole job is to redirect from an
address that never existed on their journal.
`/about` and `/rig` are still stubs and were right to be — `/about` was in the
dot row on every page for months. `/rig` is the borderline one and should be
asked the same question.

**The pitch pane ships on every copy.** Logged out, right swipe: three
sentences and a button to listeningnotes.blog/get. This is the growth
mechanic — someone asks how to get one, the owner swipes right and hands over
the phone. Not removable, but quiet.

**Source link on every copy** — one faint line at the foot of the About pane,
smallest type, no version number. Satisfies AGPL §13 whether or not anyone has
modified anything, so nobody has to think about compliance.

**And it is an environment variable, never a setting, 2026-08-31.** A fork owes
*its* source rather than this one's, so the value genuinely has to be
changeable — but almost nobody modifies the code, and anybody who does is
already comfortable with `NEXT_PUBLIC_SOURCE_URL`. A developer section in the
settings would advertise a capability most owners neither need nor should have
to think about. **The settings page is about the journal, not about the
software.** Resolution is the variable if set, then the canonical repository.

**A fallback that is always used is not a fallback.** The variable was missing
from the deploy button's environment list, so no fresh copy could set it and
every copy showed the default — which was pointing at a repository that does
not exist. That is the §13 offer attempted and missed, which is worse than a
plainly broken link because it looks discharged. Both fixed together, and they
were one bug: an untested default is a default nobody has read.

**One header everywhere, 2026-08-28.** Mark centred, one control each side —
the same arrangement the About card uses, scaled down. Entry pages and the
panes had different shapes, and one arrangement is what makes the site read as
one system rather than as several pages that happen to share a logo.

**The mini beacon goes from everywhere but the beacon pane.** It is a status
bar for something the visitor has already been told, and it competes with the
writing it sits above. It was also part of what had five components polling
Last.fm independently — worth recording as history rather than as a reason,
because that half is already fixed: `useListeningBeacon` runs one timer for
however many components subscribe, and the route caches the upstream answer, so
removing this saves renders and not requests.

The reason that does still stand is the one about repetition. Repeating the
beacon on every screen is how the beacon becomes wallpaper, and a thing nobody
looks at is worse than a thing that is not there.

**`/dashboard/entries` retires; editing happens on the entry itself.** Two
interfaces for one job means neither is canonical — you end up maintaining both
and trusting neither. Same reason the About tab died. See The journal below for
what the entry editor had to grow first.

**The pinned album belongs to the card, not the entry.** `pinned_entry_id` is a
field on the settings row, so it is edited from the About card's pencil beside
the other card fields, through a search over the journal. The entry editor has
no Pin control at all: changing your pin should not mean opening an editor for
an album you were not thinking about. Trade-off accepted — from an entry page
there is no "pin this one". The fuller version of this, including the argument
it reverses, is under The journal.

**Owner tools are server-checked, not hidden with CSS.** Two icons, top left,
rendered only for the owner: pencil to the editor, printer to the export flow.
The difference matters — asking the browser whether you are signed in and
hiding what it finds still ships the buttons to everyone. No `DotsThree`: if a
fourth tool appears the pencil becomes a menu and nothing else moves.

**Admin controls do not sit in the reading flow.** The Edit and Pin bubbles
come out of the chip row under the rating; that row is for the reader.

**The cross's gesture problem is unsolved, and three things are ruled out,
2026-08-29.** Two things are wanted and neither is built: going down a pane
should feel like arriving somewhere rather than scrolling, and you should not
be able to slide sideways out of a pane's lower half. The pane is a vertical
scroller inside a horizontal snapping rail, so every gesture is negotiated
between two axes, and that is what has to be designed around.

Do not try these again:

- **`touch-action` on the rail.** Ignored by Safari for a scroll container's
  own axis — the property governs what a touch does to *descendants*. It
  measured as applied and did nothing at all.
- **`overflow-x: hidden` on the rail while a pane is scrolled.** It does stop
  the sideways swipe, and it stops the vertical scroll dead as well: toggling a
  scroller's overflow in the middle of a scroll, every time a pane crosses the
  threshold, is the stutter. `main` scrolled smoothly and the branch carrying
  this did not.
- **A hand-rolled horizontal drag in edge strips.** Reimplementing momentum and
  snapping by hand loses to the browser doing both natively. It read as glitchy
  next to what it replaced.

**And `scroll-snap-type: x mandatory` on the rail is load-bearing.** Softening
it to `proximity` does reduce the fight, and the cross stops landing on a pane
at all — proximity only snaps when you are already near a snap point, which a
full-width swipe often is not.

**A two-screen pane needs the axis problem solved first.** Building the
card-then-down structure on top of the unresolved negotiation added a vertical
snap inside a horizontal one, with a third scroller under it, and the result
would not go down or come back up. The structure is right; it was built on the
wrong foundation.

**An entry is a layer over the journal, not a fourth pane, 2026-08-29.**
Tapping a cover slides the entry in over the wall and dismissing slides it
back. It comes from the right because that is where things arrive from, not
because right means entry.

Left and right meaning different things depending on which row you are in —
the desk upstairs, an entry downstairs — is **ruled out**. That is a mode, and
modes are what make gesture navigation unlearnable. Three directions, one
meaning each; a dimension that depends on invisible state undoes the legibility
the cross was built for.

**The URL stays real either way, and that is not negotiable.** Built with
intercepting routes rather than a modal component: tap from the journal and the
entry opens as a layer; open the same address from a QR, a shared link, a feed
item or an OG preview and you get the standalone page, server-rendered. One
address, two presentations.

It also solves the back-behaviour problem for free. The journal never unmounts,
so its scroll position survives with nothing having to remember it — including
the cross's nested pane scroller, which browsers do not restore and which
`usePlaceKeeper` was on the list to fix by hand.

**The tile flip is gone with it.** A phone tile used to turn over to a metadata
card, and a desktop tile opened a modal; both were ways to learn more about a
record without leaving the wall, and the layer does that better than either. A
card standing in for the entry has nothing left to do when the entry itself is
one tap away and slides back off.

**The layer opens with the record already on it — there is nothing to load.**
The journal has every entry in memory before you tap, because it loaded them to
draw the wall. So the tile hands the cover, the title, the artist, the rating,
the flags and the date across on its way out (`library/handoff.js`) and the
layer draws the whole first screen from that, in the exact place the real one
draws it. Only the writing is waited for, and it lands on the screen below the
one you are looking at.

The grey skeleton is still right for every other way of arriving — a link in
somebody's notes, a QR, the back button landing somewhere new. Nothing was
handed over then, and inventing a cover would be worse than admitting the wait.

**The layer has no close button.** It had a cross in the top right corner,
which took the lights' place on the one screen already departing from the
header rule; then an EdgeCaret in the row along the bottom, which sat on top of
the entry's own scroll cue. Two controls arguing over forty pixels is worse
than none. What is left is the swipe, which is what people reach for, plus
Escape and the browser's own back button.

**The back-pull starts at a 36px strip on the left edge**, carrying
`touch-action: none`, rather than reading the whole surface. Anywhere else on
the layer the browser owns vertical panning, and on a swipe that is mostly
sideways but slightly down it starts scrolling on the vertical component while
the handler is still deciding about the horizontal one — so a back-swipe took
you down into the notes. No ratio fixes that, because the browser has already
acted before the ratio is known. The strip removes the ambiguity instead of
arbitrating it, and it is what iOS does with its own back gesture.

**The record stays at the head of the reading, 2026-08-30.** An entry on a
phone is two screens, and the second one is a wall of text — an album note,
then a tracklist of them — with the thing all of it is about a swipe away. A
small strip holds the least of the record that still says which one it is: the
art, the name, the artist, the score and the marks. It sits between the header
band and the notes scroller, outside it, so it holds still while the writing
moves under it.

Nothing on it is new information, and that is the point rather than a problem:
it is not a second place to learn about the album, it is the card a screen
above shrunk to a line so the writing has something to sit under. Which is why
it carries no controls — it says what you are reading and gives you the way
back to it. Phone only; on a wide window the blurred hero over the notes is
already doing this.

**Formative was decided, defined, coloured, stored — and never built,
2026-08-30.** Found by looking for it and not finding it. It had a column, an
`ON`/`OFF` in the entry editor, a definition on `/key`, a `--formative` token in
globals.css and a `formative` tone on Chip. What it did not have was a control
anywhere a listen is actually scored, or a single place that drew it: the
session hook had no state for it and never sent it, so every entry logged since
the flag existed says false; the one component that drew the mark was
`EntryMarks`, inside `AlbumPreview.js`, which has no reader. Set on 0 of 39
entries.

So: a toggle on the score screen beside Masterpiece and Favorite, carried
through the hook into both the draft and the entry save; the chip on the
entry's own row, where Chip had been carrying a formative tone nobody passed;
and Formative in the archive's Highlights beside Favorites and Masterpieces.

**The lesson is the one already written down, arriving from the other side.**
This file warns against deciding a column is dead by grepping for readers. The
same grep run forwards is just as misleading: a flag can be fully specified,
documented and stored and still not exist, because what makes a field real is a
way to set it and a place it shows. Neither is visible in a schema.

**The nine legacy rows are migrated onto the flag.** `relationship =
'Formative'` on Cathedral, EP1, MAGDALENE, Come to Daddy, System, the BLEACH
soundtrack, Shrines, Grey Oceans and La Planète Sauvage. `AlbumPreview.js` said
they were deliberately not rewritten and that the owner would re-mark them —
which could never happen, because there was nowhere to do it. Reversed: they
are carried across, and `relationship` keeps its values.

**`relationship` is dropped, and the argument for it changed on the way.** The
original reason was that every value had dissolved into something else. That
turned out to be false: all seven Revisit rows have `listen_total` of 1,
because the listen number counts repeats *within the journal* and cannot know
about a record somebody lived with for years before starting one, and Study had
no replacement at all. So nine rows held something nothing else did.

Dropped anyway, on a better reason: **a journal records listens going forward,
and whether you had heard something before is a sentence, not a column.** The
point of the thing is that when you listen to an album you put it in here and
carry on from there; the past only belongs in it where somebody has written the
past into their own prose. Counting listens from the first entry onward is the
method, and it is the one that works for every keeper rather than only for the
one whose listening predates their journal. The nine facts are worth losing to
avoid a column that exists to describe the years before the record started.

**The check was still right.** The column was nearly dropped on a premise that
did not hold, and the premise was only visible by reading the values — which is
the guardrail this file already carries, arriving for the second time. The
decision that came out the other side is the same one, made on a reason that is
true.

**Formative was migrated first, and the order is the whole risk.** `UPDATE
entries SET formative = true WHERE relationship = 'Formative'` before the drop,
or the nine records go with the column. Done 2026-08-30, nine rows, verified
against the flag before anything was dropped.

**The flags are marks, not words, and there are no tags.** Heart, SketchLogo
and Fingerprint in `--fav`, `--mp` and `--formative`, which is the pairing the
rest of the site already uses. "Masterpiece" and "Formative" as worded chips
are too wide for a strip that has to leave room for an album title. Formative
appears here and not on screen one, which is a gap in screen one rather than a
decision made here.

---

## The journal

**Three flags: Masterpiece, Favorite, Formative.** Each answers a different
question — the record, the track, your life. Not extensible; this is
deliberate.

**Considered and rejected as flags:** Unfinished (requires a rating exception
and collides with "a journal of things worth writing about"), Live, Sleeper,
Comfort.

**The relationship field is removed.** Every value dissolved: Revisit → listen
number, Submission → `received_from`, Formative → flag, Study and First Listen
→ cut. Existing values stay as legacy data; the picker is gone.

**Favorite applies to tracks and albums. Masterpiece and Formative are
album-only.** Masterpiece is defined as a full five-star tracklist, which can't
apply to a single track.

**An album has many listens, numbered.** The number is computed from existing
entries, never chosen. Entries are never overwritten.

**Definitions ship as editable defaults.** Universal second-person text
installs; the owner can edit any of it. Stable keys, editable labels and
bodies. Stored as one JSONB column — custom listen types were ruled out, so
there are no rows to add.

**Custom listen types ruled out.** Fixing the vocabulary is what keeps two
journals comparable.

**The swatch (rating distribution on the card) was cut.** You can see how
someone rates by reading their archive, and the Index says it in words.

**Comparison uses one entry per `album_key`, most recent.** Never average
across listens. Compare rank order or z-scores, never raw stars — a generous
rater and a harsh rater with identical taste should score as identical.

**Editing corrects a listen; logging records a new one.** Every field is
editable. Changing a rating on an older entry prompts once: opinion changed, or
fixing a mistake?

**Editing happens on the entry, and nowhere else. `/dashboard/entries` is
deleted, 2026-08-28.** A table of every row with a form behind each one is a
CMS, and this site does not have a CMS shape — it has entries. The list you
find something in already exists and is called the journal. The last argument
for keeping the route was that it could change two things the entry could not,
album art and entry type; both are fields on the entry now, so the argument
went with them.

**The cover is the control.** While a correction is open the album art is a
button: press it and the address opens underneath, with a "Find it again" that
re-asks Apple using whatever album and artist are currently in the draft. That
second ask is the point — art arrives from a search on those two fields, so a
wrong cover is nearly always a wrong match, and by the time somebody is in here
the album and artist have usually just been corrected. Outside a correction the
cover is a picture and pressing it does nothing, which is what keeps the press
free for the parked tap-to-QR.

**No `relationship` picker in the entry editor.** The field was retired above
and this is where that finishes: the old dashboard form was the last place it
could be set, and deleting the route took the last picker off the site. Old
rows keep their values as legacy data.

**`entries.tags` dropped, 2026-08-27.** Autogenerated by the model in the old
format call, never written by hand, never used to find anything. Of 401 values,
54% restated a column the table already had and the rest were generic
descriptors — one was literally `music`. A Tumblr mechanic that stopped earning
its place once sorting moved into the code. Genre plus search over the notes is
how the archive works now.

**Do not decide a column is dead from a grep for readers.** That test nearly
took this column while it still held data; what settled it was reading the
values. Unread is not unused, and a `DROP COLUMN` is irreversible in a way
`git rm` is not — take a backup either way.

---

## Sharing

**Two different things were sharing one word, 2026-08-28.** They split by
audience, which is the same line the rest of this section draws — addresses
travel freely, contents do not:

- **The printer** makes an artifact out of the owner's writing and rating.
  Owner-only, server-checked, and it lives in the header.
- **Copy link and QR** pass along an address. Available to anyone, at the foot
  of an entry, and eventually on the art itself.

**Cards carry the mark only — no URL.** Printing the address on everyone's
cards advertises Miyel, not the software.

**Two different QRs.** A journal's About QR shares that person. The share item
on the right pane produces a fixed QR to `/get` — the same code on every copy.

**Photo QR spec:** photo carries the *dark* modules (scattered and isolated,
which gives discrete pixels of photo — light modules form connected regions and
read as a photo with holes punched in it). `max(pixel, 100)` floor, so one
asset works on both themes. Version chosen dynamically, EC level H, 4-module
quiet zone, no frame. **Finder patterns must stay sharp** — rounding them
breaks detection before decoding starts. Generate → decode → widen the band and
retry on failure.

**Album art needs a band clamp (roughly 90–200), not a floor.** Covers vary far
more than portraits; bright covers fail on light pages, dark ones on dark
pages.

**Verify by decoding, never by looking.** Three broken QR pages were published
in one session by eyeballing them.

**Export controls are owner-only, server-checked.** Addresses travel freely,
contents don't. A visitor can copy a link or a QR; they cannot generate a card
from someone else's entry.

**Screenshots are not a threat model.** Don't fight them.

**Turning the card to its code also copies the address, 2026-08-29.** The code
is for a phone pointed at the screen, which only helps somebody standing in
front of it; the rest of the time what is wanted is the address itself, to
paste into a send form. Reading a QR back into text by hand is not a thing
anybody does.

The copy is free, so it has to say so — a clipboard write with nothing on
screen is indistinguishable from a button that did nothing. The line reads
*Copied — paste it anywhere*, and it holds its space open empty on cards that
can show it so the name below never jumps. Only on the way to the code: turning
back to the portrait is undoing the press, and undoing it should not quietly
copy anything.

**Fixed layout, swappable background.** Album art, title, artist, rating and
mark stay in locked positions on every export variant. The background changes
mood, never information — the card stays deliberately insufficient.

**9:16 is one frame.** The two-slide format was a carousel solution; a Story
has room for art and metadata together.

---

## The network

**Backups are two features, not one.** Neon keeps six hours of history on
this plan, which covers the mistake you notice immediately and nothing else.
Past that: the owner's own copy gets a scheduled local backup writing to a
folder (`scripts/backup.mjs`, a daily LaunchAgent, thirty kept); every copy
including that one gets `/api/export`, a button that downloads the whole
journal as one file.

They cannot be the same feature. A schedule needs somewhere to write and
something always running, and neither can be handed to somebody running their
own copy — offering them storage on a machine they do not own is a hosting
business, which is ruled out. A button needs nothing: no configuration, no
service, no daemon. So the automatic version never ships and the manual one
always does.

**One format, both paths.** `scripts/restore.mjs` reads either the folder the
schedule writes or the single file the button downloads. The moment somebody
needs a restore is the worst possible moment to learn their backup is the wrong
sort.

**The feed is pull-based.** Every copy publishes `/feed.xml`; each copy goes
and checks. Nobody learns they were read, no server, no subscriptions.

**Two views: submissions and recent.** Submissions — who logged what you sent
and how they rated it — is the better default. It is smaller and warmer and
can't become a scroll.

**A shelf, not a river.** No counts, no badges, no unread state.

**`received_from` published per entry**, with a per-entry toggle for private
sends. Public credit is the default; quiet is a choice.

**A send is a gift, not a form, 2026-08-29.** The old page was six text fields
under "Submit an Album", and a form asking for a title, an artist and a year
reads as a request being filed. Three parts, in this order: the object, the
note, and who it is from. The album is picked off a shelf of covers, because a
cover is what makes it read as something handed across rather than a title
being reported. The message is the body of the page with a placeholder that
teaches what goes in it, not an optional notes box at the foot. A name is
required.

**No email, and this is the point rather than a detail.** The old form asked
for one and nothing ever used it — a contact detail held for no reason, which
is the first crack in not holding anyone's data.

**No email anywhere on the site, 2026-08-31.** Not in the send flow, not in
comments, not in the schema. Nothing here sends email — there is no mailing
list, no notification, no account to recover — so an address is a personal
detail collected for no purpose, and that is the first crack in not holding
anyone's data.

**A journal URL does every job an email might have.** It makes somebody
reachable, it is what the address book will be built from, and it is an
address rather than contact information: where something is, not who somebody
is. It is also the better signal of the two. An email is trivially invented; a
URL that resolves to a real journal is not.

**So both forms ask the same two things: a name, and a journal if you keep
one.** `submissions.sender_url` and `comments.author_url`, with
`submitter_email` and `author_email` dropped.

Read before dropping, as the guardrail requires. Submissions: three rows with
an address, two of them the owner's own tests, the third a real person — losing
her address is the actual cost here rather than a rounding error. Comments: one
of nine, and it was `test@test.com`.

**One stored value, not one per feature.** The URL lives in localStorage under
a single key owned by `return_address.js`, shared by the send form, the comment
form, and later the compare affordance. Fill it in once on any journal and it
is prefilled on every journal after. That sharing is also what makes Compare
possible for a visitor: a journal offers it when the browser holds an address,
regardless of which form put it there.

**A journal URL takes its place, and is not the same kind of thing.** An
address is where something is; an email is who somebody is. It is also the
thing an address book would eventually be built out of, which the email never
was.

**It cannot be filled in from the sender's session, and that is the
architecture working.** Cookies are scoped per origin, so a copy at one
address cannot see anything set by a copy at another — which is exactly what
stops anyone being followed from one journal to the next. So the URL is kept
in the sender's own browser instead and prefilled from there, which makes it
per browser and not per person: the same sender on a phone and a laptop pastes
it twice. The same honest limit `dog_ear.js` documents, and the cost is one
paste.

**Stored without a scheme, and normalised on the server as well as in the
browser.** The inbox turns this value into a link somebody clicks, and a route
cannot assume the only thing posting to it is the page that shipped with it. A
bare host is the one shape that cannot carry a scheme of its own, so the
inbox's `https://` is the only one there can be.

**The send page is a layer, at its real address.** `/submit` is not renamed and
not redirected: press the button on the card and it slides in over whatever you
were looking at, open the same address cold and you get the standalone page
with the nav row on it. One address, two presentations — the entry's rule,
applied unchanged, and the reason `LayerEntry` was written knowing nothing
about entries. It arrives from the right for the reason already recorded: that
is where things arrive from.

**A dismissed layer must never eat a written message.** The layer is one
careless swipe from gone and what would be lost is somebody's writing rather
than a scroll position. A confirmation was the other option and is the wrong
one — it taxes every deliberate dismiss to catch the rare accidental one, and
this file already has the finding that a dialog is dismissed by reflex. So
nothing is confirmed and nothing is lost: what has been typed is kept in the
browser and put back when the page opens again, layer or address.

**Starting a listen from the inbox asks nothing, because nothing is left to
ask.** The session's one remaining question is *Where's it from?*, and an album
that arrived in the inbox answers it by having arrived in the inbox. The
record, the pressing, who sent it and when are all on the row already. So it
goes straight to the session the way resuming a draft does, and `received_from`
fills itself in rather than being typed a week later from memory — which is the
loop the send flow exists to close.

**`drafts` carries `received_from` and `received_date` too.** Otherwise the
loop would close only for a listen finished in one sitting, and drafts exist
precisely because that is not the common case.

**The send is one screen, 2026-08-29.** A cover, a message, a name and an
address, with nothing below the fold — there is no reason to make somebody
scroll past the record they are sending to reach the button that sends it. The
subtitle under the title went, and so did the Back and Archive pills at the
foot: a row of links to elsewhere under a form is the same mistake already
taken off the foot of the archive, offering to leave at the moment somebody is
halfway through doing something. The mark at the top goes home and the layer is
left by swiping, which is what LayerEntry decided when it removed its own close
button.

**Everything vertical gives way together on a short window, and 180px is a
ceiling rather than a constant.** The square, the gaps, the title and the
message box are all clamped against dvh, the same trade `--hn-crown` makes one
screen away. The beacon can afford a fixed 180 because it has a screen to
itself; here the same square shares one with three fields. What is being kept
is the shape — square, then title, then artist, centred, in those proportions —
not the measurement, because what has to fit is different.

**It fits by layout and not by clipping.** min-height, and the sheet keeps its
scrollbar. A small phone, large accessibility type or the software keyboard
shortening the viewport all have to be able to overflow, because a form that
fits by clipping is a form with an unreachable Send button.

**The name and the journal share a row wherever there is width.** Two short
fields stacked left a column of empty page beside them and cost height the page
did not have. The rule that used to divide the required half from the optional
one went with the stack: the asterisks already say which is which, and a
divider cannot sit between two things in the same row.

**One square holding three things, 2026-08-29.** The finder is a square with a
field under it, and the square holds whichever is true: an empty sleeve while
there is nothing to show, the results while there are some, the record once one
is chosen. Same size, same place — so choosing is a sleeve being filled rather
than the page laying itself out again, and the empty state has the shape of the
chosen one instead of a short form floating in a screen it cannot fill.

**Results are a shelf, not a grid.** One row inside the square's height,
scrolling sideways. The grid under the field was four rows of covers on a phone
and pushed the message, the name and the Send button off the bottom; sideways
is the one axis the page is not already spending. It is safe inside the layer
because the back-swipe only listens on a 36px edge strip carrying
`touch-action: none`, so a drag across the covers can only be this.

**Nothing on this page is captioned that shows what it is.** No "The album"
over the sleeve or over the cover — the field's own placeholder asks for an
artist or an album, and a picture says what it is. The text fields keep their
labels, because an empty box does not. Same decision as the beacon's, which
stopped saying "Now listening" over a record with its title under it.

**Clearing the record is a mark on its corner, not a sentence under it.**
"Choose a different one" was a line of type explaining a control where the
control could simply be there, and it sat in the centred run under the cover
arguing with the album's own name.

**The title is one small line, and only on the standalone address.** The large
"Send an album" was captioning a button that had just been pressed — on the
layer you know what you tapped, and it was the biggest thing on a screen whose
subject is somebody else's record. It survives small, under the mark, on the
one arrival where nothing was pressed: a link somebody was sent, a bookmark, a
QR. The layer gets none.

**The form is aligned to the top, not centred.** Centring only looked right on
the chosen state, because that state happens to fill the screen; with nothing
picked it opened a band of empty page above the first field that read as
something missing.

**One example in the message placeholder, not three.** Three read as a list to
choose from. One reads as the kind of thing that goes here, which is what a
placeholder is for.

**Form fields are 16px on touch.** Safari zooms the page in on focusing
anything smaller and does not reliably zoom back out, so leaving a field leaves
the page scaled and offset — worst at the bottom, where there is nothing below
to scroll to, and it reads as the layout breaking on exit. Scoped to coarse
pointers, so the design keeps its 14px wherever there is a mouse and no zoom to
trigger. Not `maximum-scale=1`, which also stops it and takes pinch-zoom away
from everyone who needs it.

**The inbox is a shelf, not a table.** The five-column grid reported the right
facts in the shape of a database row, and hid the one part that mattered — why
somebody sent it — behind a button marked "Note". Cover, message, name, in that
order. The modal is gone with the table that needed it.

**Each copy brings its own Last.fm key, read server-side.** `LASTFM_KEY` in
the environment, never `NEXT_PUBLIC_` — the key identifies the *application*,
not the listener, so a hardcoded one means every copy shares a single rate
limit and a busy journal throttles a stranger's. The browser talks to
`/api/public/beacon` instead of to Last.fm. The listener's username stays in
the settings table, because that is the owner's choice rather than a secret.

**One beacon poll per page, shared, not one per component.** The hook is used
by five components and four mount on the landing page together; a timer inside
the hook meant a visitor sitting still made ~16 requests a minute. The timer
lives in the module with components subscribed to it. The server caches the
upstream answer for ten seconds, so readers cost one request, not one each.

**No banner or message system pushed into copies.** That would require every
copy to phone home, producing a log of who is running one. Updates surface by
checking public GitHub releases instead.

---

## Things open in the page, not over it

**A control opens where it belongs, 2026-08-31.** Not floating in the middle of
a darkened screen. Twice in a week a popup was built and then taken back out —
the writing panel and the comment form — and both times the reason was the
same, so it is a rule now rather than a preference to rediscover.

**A form is about the thing next to it.** A comment is a reply to the note
directly above it; the writing panel belongs to the mark it was tapped on. Put
either in an overlay and it has been carried away from its subject, and the
page it was answering is dimmed behind it — which is the one thing you might
still want to read while writing.

**Pushing content down is not the problem to avoid.** The old comment modal
existed on the argument that a form unfolding in the tracklist shoves
everything below it down the page. That is true, and it is what leaving room
for something looks like. The page grows and you scroll, which is what a page
does.

**What replaces an overlay depends on the shape of the thing.** A form belonging
to a spot in the page unfolds in the flow. Something occupying a place that is
already reserved — the mark's box — takes that place instead, the way the
portrait turns into its code. Neither covers anything.

**Two exceptions, and both are the same exception.** An entry arriving over the
journal is a whole page rather than a control, and it is a layer with a real
address behind it rather than a floating box; the archive's filter sheet on a
phone is the same case, a screenful of controls with nowhere in the flow to
live. The test is whether the thing has a *place* on the page. If it does, it
opens there. If it is a page in its own right, it may arrive over one.

**Dismissing is not the same question.** A layer closes on a stray gesture
because that is the platform's habit and nothing is lost. A form in the page
does not: a tap outside while reaching for a field would throw away what has
been typed, and there is nothing underneath needing to be got back to in a
hurry. Both keep Escape.

---

## The lock

**The login is an ownership check, not an identity, 2026-08-30.** There is one
owner, nobody else has an account, and there is nothing to be here but
yourself. So it is a yes/no key to a locked room in a building anybody may walk
into: the journal is the public floor, the writing side is the room.

**The blast radius of a compromised copy is one journal.** Every copy checks
its own password against its own server, so logging in on somebody else's copy
does nothing at all — there is no shared system to be let into, no central
login, and no database of everybody. A password that leaks costs its owner
their own journal and costs nobody else anything. This is a structural
consequence of self-hosting rather than an accident of the design, and it is
worth stating because it is the thing a hosted service can never offer.

**Which is why the entrance can be hidden.** A normal login has to be findable
because strangers need it; nobody needs this one but the keeper. Three taps on
the mark, and a quiet Sign in line beside the source link on the pitch pane for
when a gesture will not do. Hiding a door adds no security and this is honest
about that — the lock is what protects the room. It costs nothing either, which
is the whole argument.

**It opens where you pressed, not as a screen.** A full-screen gate is what you
build when the login is the destination. This one is a small panel under the
mark, because signing in is something done in passing on the way to writing.

**`/login` exists and nothing links to it prominently.** A gesture that is the
only way in is a way in that cannot be linked, bookmarked, or reached when it
breaks on a device nobody tested. It redirects home once you are wearing a
wristband. `/dashboard` stops being the de facto login route, which it had
become by being the page that happened to show the gate.

**One password field, in one file.** The form markup lives once and is rendered
two ways, because a second copy is exactly how the first drifted out of the
shape a password manager can read. Safari needs a real form, a real submit
button, `autocomplete="current-password"`, and a username to file the entry
under — the last of which looks wrong for a site with no usernames and is not:
managers store a pair, so with nothing to name the entry there is nowhere to
put it. There is one owner, so it is hidden and holds the keeper's name.

**Six months on the wristband.** A lock on one person's own room, opened by the
same person on the same two or three devices. Monthly logins are how a password
gets weaker, not stronger. The trade is stated rather than hidden: an unlocked
phone is dashboard access, and that is accepted.

**A door that can be knocked on is a door that gets counted.** See the rate
limiting decisions below; the two belong together, because hiding an entrance
is worth nothing and counting attempts is worth everything.

**Rate limiting is in memory, and the limits it can honestly promise are
written down.** A managed store is ruled out by what this software is — every
copy is run by its keeper for nothing, and a limiter needing an account
elsewhere is one most copies will run without. A database table answers a flood
by writing a row per request, spending the thing under pressure to protect it.
On a copy running as one process the count is exact; on serverless it is a
speed bump that still stops the realistic attack, which is one machine
hammering one endpoint. `library/doorman.js` says all of this at the top.

**An upvote is one per person per comment, not a rate.** Keyed on the comment
as well as the caller, so the rule reads the way the feature means it. In
memory, so it forgets: a durable record of who voted for what is the kind of
thing this site does not keep about its readers.

---

## Setting a copy up

**A route, not a takeover, 2026-08-31.** `/setup`, redirecting home once the
journal is claimed — the same shape as `/login` and for the same reason. A
screen only ever reached by being redirected to it cannot be linked,
bookmarked, or reached again after a half-finished attempt.

**An unclaimed copy holds its whole site behind a plain page.** Not a redirect
to setup: a stranger who found a fresh deployment would land on somebody else's
setup form, which reads as an invitation. It is behind the same password as
everything else and cannot actually be taken — the password is an environment
variable set in the deploy form before the URL resolves — but *cannot be taken*
and *does not look takeable* are different things, and only the second is a
design decision.

**Held, rather than left public.** An unconfigured copy does render correctly —
`coverName()` falls back, the About pane is designed for a journal with nothing
in it. But rendering correctly and being worth showing are different: behind
the hold is an empty archive, a nameless card and a dead beacon at somebody's
public address. There is nothing to read, so there is no reading to protect.

**`proxy.js` carries the pathname and does nothing else.** Holding everything
while keeping `/setup` reachable needs the path, and a server layout is not
given one. The proxy does no database work: it runs on every request, and a
read there is a read per request, which is the exact shape of the thing that
spent the transfer allowance.

**The gate reads through `isSetUp()`, which does not catch.** `pull_settings`
swallows database errors and returns `setup_complete: false` — right for
rendering, and exactly wrong for a gate, because an outage and "never set up"
become the same answer and a live journal gets held behind the holding page.
The reader lets the error throw and the caller fails closed: if the question
cannot be answered, assume the journal is somebody's. It caches once true,
because the latch never goes back.

**One step, four fields, and the rest is edited where it prints.** Name,
address, logging-since, Last.fm. Everything else on the card already has an
editor, so a longer setup would be a second one. The nine bio prompts
especially are not here: three get answered, and nine is a questionnaire.

**The handle is derived and the serial is minted; neither is asked.** A journal
is named after whoever keeps it, so asking for a second name is the mistake
`journal_name` already made. The serial is the copy's identity rather than the
keeper's, and it is random rather than derived — anything derived from a name
or a date is frozen wrong the moment either is corrected, and `WRITE_ONCE`
means there is no second chance.

**One owner row, and the guard is "the table is empty", not "this handle is
free".** The first version used `ON CONFLICT (handle)`, which stops a duplicate
name and not a second owner — a copy that already had a row got another under
a different handle. Everything downstream reads the owner as `ORDER BY id LIMIT
1`, so the row either does not exist yet or is not setup's to add to.

**It does not reopen.** Setup redirects away once claimed rather than showing a
form that appears to save `serial` and `founded_at` and silently drops both.
The cost is that `keeper_name` has no editor once a `display_name` exists; that
belongs in the card editor, which is where things are edited, and is in NOTES.

**Existing journals were claimed by a migration, not by asking.** Every copy in
the world read `setup_complete: false`, including this one after a year of
writing, because nothing had ever written the column. Turning it into a gate
without `002_claim_existing_journals.sql` would have held a live journal behind
the holding page on deploy. A non-null `keeper_name` is somebody having already
answered the question setup asks.

**Reversed 2026-09-01: setup is one screen at a time, and everything after the
name says Skip.** Name → photo → prompts → Last.fm → links → rig → password.
The fresh-account test showed that "one step, four fields" was one field that
mattered and three that nothing else could write — and the fix for the three
is not to ask, it is to derive: the address is the host the request came in
on, and the founding date is the day setup ran. An editable date anyone can
set to anything says nothing. Skip means later, not never: every field that
can be skipped has a home afterwards, which is what Settings is for.

**Settings is the machinery, reached from a gear beside the card's pencil.**
`/settings`, owner-only: the address, Last.fm (username and key), the
Anthropic key, and the password. The starting theme and the wording of the
key were on it for an afternoon and came off the same day, 2026-09-01, on
Miyel's call — parked, not rejected. Both columns exist; nothing writes them.
The card's own fields — name, photo, prompts, links, rig, pinned album — are
*not* edited there: everything editable is edited where it prints, and two
editors for one field means neither is canonical. Settings lists them at its
foot as doors that land on the card with the pencil already up (`/?edit=card`),
so nothing setup skipped is unfindable. The brief said Settings should hold
photo, prompts, links and rig outright; this is the narrower reading, and it
is Miyel's to widen.

**The keys live in the database now, in a table of their own.** Reversed from
"secrets stay in environment variables": a setup screen cannot set an
environment variable, and a key nobody is prompted for is a key nobody sets.
`secrets` holds the session secret, the password hash, the claim code and the
two API keys, has one narrow reader (`library/secrets.js`), and is never
selected by anything that reads `settings` — which is why it is a second
table rather than five more columns beside the portrait. Resolution is the
database first, then the environment, so a copy locked the old way keeps
working and a value typed into Settings wins because it is the later
decision. The session secret is the one exception — environment first — since
a copy that chose one should not be signed out by a row it did not know about.

**Deploy asks for nothing.** The password is chosen on the site, near the end
of setup, in a real password field with a confirm and `new-password`
autocomplete so a manager offers to save it. The signing key mints itself on
first start and persists. Nobody should invent their site's password in a
hosting dashboard, in a field named like a variable, before the site exists.
`SESSION_PASSWORD` and `SESSION_SECRET` still work where already set.
The password screen has no Skip, 2026-09-02: under this flow nobody typed one
at deploy, so there is nothing to keep, and a skip would leave a copy with a
password its owner never chose or none at all. The one person it could have
served, a developer who set `SESSION_PASSWORD` by hand, can find Settings.

**The window is closed with a claim code, not a timer.** An unclaimed copy
with no password would be claimable by whoever reached `/setup` first. Three
answers were weighed: a code printed in the build log, a timed window after
first boot, and accepting it. The code wins. A window closes on the slow and
opens for whoever's request happens to be the first cold start; accepting it
is a land grab waiting for a scanner. The code is minted by the first
migration run, printed in the build log — the screen the deployer is already
watching — and again on every start until the copy is claimed, then cleared
at the moment of claiming. It stands in for the password at the gate and
nowhere else.

**And it travels as a link, 2026-09-02.** The fresh-account run worked and
the code confused: a person at a deploy screen does not know what a claim
code is or where it goes. Vercel tells the build its own address, so the box
prints `https://<site>/setup?code=…` and the setup page reads the code off
the address, tries it once, and drops it from the history. Open the link and
the first thing on screen is the name field; the words "claim code" appear
only for somebody who lost the link. The bare code is still printed under it
for that case, and for a copy run somewhere with no address to print.

**The build migrates too.** `npm run build` runs the migrator before
`next build`, purely so the claim code reaches the build log. The server
still migrates on every start; the build step finding nothing pending is the
normal case, and a build that cannot reach the database says so and carries
on rather than failing.

**A copy with no database builds and says so.** The connection used to open at
import, so a missing `DATABASE_URL` failed the *build* and its owner read
"deployment failed" in a dashboard. It opens on first use now, and the root
layout holds on a page that names the variable and where to set it. Worth
deciding, and decided: a page that explains beats a build that refuses.

**No Last.fm means the journal is the first screen.** With no username or no
key, the centre pane has no beacon screen at all — the wall of covers sits
directly under the crown. Nothing pretending something might play. That is
what made the empty journal state the first thing to write: a new owner
would otherwise land on "No entries match these filters."

**The holding page's door is a plain anchor.** `<Link>` to `/setup` from a
page the *root layout* draws is dead: layouts do not re-render on a client
navigation, so the address changed and the hold stayed. A full load is the
only navigation that asks the layout again. First thing a new owner presses.

**The deploy button carries `products`, not `env`.** The `env`,
`envDescription` and `envLink` parameters did not survive Vercel's sign-in
redirect in the fresh-account test. Neon's own marketplace template uses a
`products=[{"type":"integration","integrationSlug":"neon",…}]` parameter,
which attaches a Neon database and sets `DATABASE_URL` — so with the password
gone from deploy, the button should ask for nothing at all. Whether
`products` survives the same redirect is untested from here; the bare
`?repository-url=` form is the known fallback and the README says what to
add by hand if the database does not arrive.

**Neon's integration is a `products` parameter, not an `integration-ids` one,
2026-09-01.** The brief said to find the `oac_` ID in Neon's own deploy
button; there is none. Neon's marketplace template uses
`products=[{"type":"integration","integrationSlug":"neon","productSlug":"neon","protocol":"storage"}]`,
which is Vercel's newer shape for the same thing, and that is what the button
carries. Whether it survives the sign-in redirect, and whether Neon's
integration has a UI hook that stops it rendering in the deploy flow, only
the fresh-account test can say.

**Migrations go through the direct endpoint, never the pooler.** The
integration sets `DATABASE_URL` pooled and `DATABASE_URL_UNPOOLED` direct.
The app's HTTP driver is happy on either; the migrator is not — its advisory
lock is session-level, and PgBouncer in transaction mode hands statements to
different backends, so the lock would be taken on one and released on
another. It reads the unpooled variable, and failing that strips `-pooler`
off the host.

**Add to Home Screen is the last screen of setup, and lives in Settings.**
It is the one step the software cannot do, so it goes at the one moment
somebody will do it: right after the journal starts working. iOS gets the
share-sheet steps with the icon; Chrome gets its real prompt where it fires
and the menu route where it does not. No service worker was added for it —
Chrome's menu install has not needed one since 108, and a fetch handler that
exists to satisfy a prompt is the anti-pattern Chrome dropped the rule over.

**A database that cannot be reached holds on a page that says so.** The
earlier rule — a thrown read fails closed and the site renders — stands for
the *setup* invitation, which is still never shown on an error. But rendering
a nameless empty journal during an outage told nobody anything, and for a
fresh copy with a mistyped string it was a dead end. The page now names what
to check, in a sentence chosen from the driver's error (`explainDatabaseError`
in `library/database_connection.js`), and the same sentence goes to the
build log and the runtime log. Every holding page carries an "It didn't
work" link to the repository's issues, which costs nothing.

**`/get` carries the steps.** Under the essay, on the canonical copy only:
the button, seven steps with what to expect and how long, screenshot slots
drawn only when `public/install/NN-*.png` exists, and the issues link. The
long-standing note that `/get` owed a stranger two things and gave one is
discharged.

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

**The password is filed under the journal's address, in a visible field.**
Password managers pair a password with a username and stay silent without
one. The hidden username field was read-only and one pixel wide, and Safari
skips both kinds — so the manager never offered to save. It is a visible
line now, showing the host, a real writable input that typing does nothing
to, on all three screens that touch the password: sign-in, setup, Settings.
The host rather than the keeper's name, because the name may not exist yet
at setup, and the same value everywhere is what makes the entry saved at
setup the one offered at sign-in.

---

## Migrations

**A copy builds its own database, 2026-08-31.** Until now every schema change
was somebody pasting SQL into a console and remembering which branch they were
pointed at. That survives exactly one database and one person, and it had
already failed once — an afternoon lost to a migration that ran against a dev
branch while everybody believed it had run against production. It does not
survive a second copy at all: somebody installs this, their database is empty,
and there is nowhere for them to get the SQL from and no reason they should
have to.

**`instrumentation.js` is where it runs**, because `register()` is called once
per server instance and finishes before the first request is served. A request
should never reach a schema older than the code answering it.

**The lock is the whole trick, and it lives on a session.** Serverless has no
single server: every cold start runs `register()` and several can start at
once, so without a lock two instances both apply the same file.
`pg_advisory_lock` is held by the database, so it works across instances that
know nothing about each other — and because it is session-scoped, everything
runs on one `Client` rather than through the app's usual handle. That handle is
the HTTP driver, which opens a fresh connection per call; take a lock through
it and the lock is released the instant the call returns, leaving something
that looks like a lock and holds nothing.

**A `Client` for the second reason too.** The HTTP driver prepares statements
and refuses more than one per call, so it cannot run a schema file at all —
and splitting one on semicolons means writing a SQL parser that understands
dollar-quoted `DO` blocks. Not a thing to write.

**No down migrations.** Reversing a migration by running SQL backwards assumes
the failure happened somewhere the reverse is meaningful, and a half-applied
`DROP` is not. The answer to a bad migration is a backup and a new file, which
is already the answer this file gives for a bad `DROP`.

**No baseline step, because the schema was idempotent before the runner
existed.** Every `CREATE` carries `IF NOT EXISTS`, every added column too, and
the foreign keys sit in `DO` blocks. So 001 does nothing against the journal it
was written on and builds everything against an empty database. The fiddliest
part of adopting a runner — teaching it that an existing database is already up
to date — never arises.

**`schema.sql` is retired and `migrations/001_initial.sql` is the schema.** Two
files describing one database is two files that drift, and this one already had
a rule about that. Backups carry the migrations rather than a separate copy.

**Nothing edits a migration that has run.** The filename is the identity, so a
renamed file is a file that runs again. A change is a new numbered file.

---

## What a read costs

Added 2026-08-30, after the Neon transfer allowance hit 95% and the cause
turned out to be two of these rules not existing.

**A list of records never carries the writing.** A wall of covers, a search, a
sort, a recent strip and a picker all want the same eighteen fields — the
cover, who made it, when, how it landed, and the slug to open it.
`pull_wall_entries` is that list and it is the only thing the archive reads.
Measured: a full row averages 8.5 kB and those fields average 0.3 kB, so 97% of
what the archive used to pull was text it never drew.

**Lean list to choose from, full record for the one chosen.** Already how the
journal worked without anybody naming it — the tile hands eleven fields to the
layer through `handoff.js` and the entry's writing is fetched when it opens.
Now also how `/dashboard/share` works, and the rule for anything that shows
many records and then one. The full list was never what made an entry open with
no wait; the handoff was.

**A query on a timer gets its own narrow reader, and it is never widened.**
`pull_beacon_settings` returns one column because the beacon asks every fifteen
seconds in every open tab. The temptation next time something on a hot path
needs a field will be to add it here. Don't — a general reader on a short timer
is exactly how the allowance got spent. Give the next one its own.

**Nothing that reads settings gets the portrait.** `portrait_data` and
`portrait_code` are base64 images and 307 kB of a 310 kB row; every surface
that shows either points at `/api/portrait`, which reads them itself. They are
excluded from `pull_settings` by an explicit column list. A new settings column
has to be added to that list — a visible cost, chosen over `to_jsonb` and
subtract, which silently turns dates into strings.

**Measure the row, not the query.** The monitoring was right that compute was
healthy and no query ran long. The expensive query was cheap to run and
carrying a suitcase — `pg_column_size` on the columns is what found it, and it
is the first thing to reach for when transfer is high and compute is not.

**Neon's free allowances are per project, and branches share them.** A dev
branch isolates the data, which is worth doing on its own merits; it does not
reduce transfer. Worth writing down because the opposite is easy to assume.

**The target is a page view that costs the same at any journal size.** Reads
are lean now but still scale with the archive: every visitor downloads a
summary of every record ever written to look at one screen. At 500 entries that
is about 16,000 views a month, at 1,000 about 8,000. The goal is roughly
160,000 a month and flat — which means the database paginating, not the
browser. Not built; see NOTES.

**The journal should get better as it fills up.** Which is the actual reason
any of this matters, and the sentence to measure a change against: a cost that
grows with the archive means the longer somebody keeps a journal the less it
can be read, and that is backwards.

---

## The session

**One address, `/session`, 2026-09-01.** The album picker and the note-taking
tool were two routes named for a character this software no longer has, with
a ceremony between them. They are one page now: with nothing on the desk it is
the picker, tap a cover and it is the listen. The record being listened to is
kept in the browser, so a reload or a locked phone reopens where you were.

**No forwarding stub for `/dashboard/echo`.** The retired-route rule applies:
only the owner ever had that address, the dashboard's Listen door is one tap
from home and points at the new one, and a stub ships to every install.

**The Echo framing is dropped throughout.** Less companion, more function: find
the album, log the listen. `EchoNetwork` is not deleted: it is one of the
dashboard's backgrounds, where it is ambient rather than in the way. The
floating nodes assembling into album art were beautiful and worth building;
they sat between "I want to log this" and logging it, and every listen paid
for a spectacle already seen.

**The chat comes back as a reference, not a character, 2026-09-01.** It has no
name. It is something you can ask questions of that already knows the album
and what you have written so far — what instrument is that, what is the word
for this sound, what connects my track notes. The reason it lives in the app
rather than another tab is the last of those: notes across a dozen screens
cannot reasonably be pasted elsewhere. Context is the whole feature. A
question mark on the cover's corner, from any screen; a bottom sheet on a
phone that opens on the field with the keyboard up, a column beside the
writing on a desk. Answers are a paragraph. Dismissing it gives the note back
its cursor. **Nothing it says ever enters the entry** — it is read, and then
the owner writes. Same principle as the research: AI is a tool the owner uses,
never a voice on the page. It is also the strongest argument for the optional
key, stronger than research, which any search engine can do; the README says
so.

**The session opens as a layer, 2026-09-01.** From the desk it slides in from
the right on the sheet an entry arrives on, and leaving it puts you back on
the desk rather than on the beacon the cross lands on from cold — the cross
never unmounted. `/session` opened cold is still a page. There is no dashboard
door on the picker or after a save: the dashboard is being retired, the desk
is where the listen opened from, and the way back to it is the layer's swipe.

**The strip is the horizon being built.** The tracks screen shows every track
as a column — its bar rising as it is rated, its title under it the way the
entry page writes them, and a dot that is empty until something is written,
filled once it is, lit for the track on screen. A row of dots said where you
were; it could not say which song was three back.

**The album screen is the art.** Cover large and centred, everything under it
centred too, and the horizon once the tracks have stars. On the notes screen
the score and marks come first and the writing last, where a growing field
wants nothing under it but the button.

**The mobile version is not a reduced version.** Every screen holds one thing
and runs full-bleed on both devices, and nothing exists on one and not the
other. The panel over a blurred cover is gone everywhere, not only on phones —
it was the one dark glass panel on a light site, and the session now reads the
same tokens as every other page and follows the theme.

**Research is a button, not a step.** *Research this album* on the album
screen; tap it for the background before listening, skip it for a quick log.
The API is called only when somebody wants it, which is cheaper for whoever
pays for the key, and a copy with no key logs a listen with the button simply
absent — `research_available` rides down with the bookplate for that. A
briefing already on file still comes back for free when asked.

**One track per screen.** Name and number at the top, stars, a heart, a note,
arrows or a swipe to the next. It matches the pace of the record — you are on
track four, so track four is on screen — and it turned out better on a desk
too, so it is the only layout. The step is not skippable; the track notes are
what the journal is built on. Nothing insists on a note for every song.

**The score lives on the note screen.** `pick → [research] → tracks → note →
preview → save` has no score step, on purpose: the score is the last line of
the note, not a thing on its own. Stars and the three marks sit under the
album note; the horizon sits above it.

**No question before the listen.** Relationship and source are both gone as
concepts. Where a record is from is decided by how the listen started — the
inbox says Submission, anything else is the library — and corrected on the
entry like everything else.

**Nothing is confirmed and nothing is lost, again.** The back caret saves a
draft if anything has been written, then goes to the picker, so the listen is
waiting under Drafts. The browser's own copy is written on every change
and carries the tracklist, so a restored listen files every note under the
song it was written about. Where two copies of a draft exist — the row and
the browser's — the newer one wins, so typing a little more after pressing
Save draft and then losing the tab no longer loses that little more.

**The one moment kept is the landing.** The cover you tap flies to where the
album screen draws it, large and centred, half a second on the entry layer's
curve. Nothing waits on it.

**No small cover in the header, 2026-09-01.** The album screen is the art; a
thumbnail of it a screen above was the same picture twice. The header is the
title line, the question mark and the theme switch, and the steps.

**The draft saves itself.** Three seconds after the last change, and on the
way out. A Save draft button was a thing to remember on a phone that locks
mid-sentence; the browser's copy covers the seconds between. Saving the entry
waits for any draft write still in the air before deleting the row.

**The whole listen is one swipe.** Album → tracks → each track → notes →
preview, left to right, and back the other way. The tracks screen turns its
own pages and hands over at either end. Nothing on the way forward is gated;
only the save waits for an album note.

**The preview is the entry page.** Not a rendering of its own: FullPostPage,
handed a row that does not exist yet and told it is a preview — no fetches,
no comment controls, no footer. It stands on its own sheet over the session,
because the entry's phone layout needs the viewport, and it is reachable from
any step at any time: the page so far is how you find out what the note still
needs.

**Start session, Resume session.** The album screen's button knows whether
you have been in: a draft picked up, or the screen revisited mid-listen.

---

## Ruled out

**Apple MusicKit.** Developer tokens are domain-scoped and expire in six
months, so one token can't serve copies at different addresses. $100/year each
or hand-reissuing forever.

**App Store.** $99/year installs a meter on a promise of no subscriptions, and
guideline 4.2 rejects a client with no server — which is structurally what a
self-hosted app is.

**Native app / iframe / proxy for viewing other journals.** All rebuild the
platform behaviour being removed.

**A directory of journals.** People arrive through Instagram, texting, and
someone sending it on. A directory doesn't solve discovery.

---

## Parked, not rejected

- Spotify Connect transport control (fragile: two API tightenings in eighteen
  months; needs per-copy client ID and Premium). After the deploy button.
- Video exports (ffmpeg server-side, Vercel function timeouts; wallpapers
  already exist as video, so the assets are ready).
- Manual now-playing override — covers vinyl and iOS Apple Music, where
  scrobbling is unreliable.
- Tap-to-QR on individual entries — tapping the art swaps it for a code to that
  entry and copies the link. It works; it was sluggish because verification ran
  on mount. Three things fix it: build on tap rather than on mount, cache the
  winning version and tonal band on the entry so later builds skip decoding,
  and do it server-side, because iTunes sends no CORS headers and a browser
  canvas cannot read album art pixels. Needs a "link copied" line — a clipboard
  write with no feedback reads as broken.
- Address book (`people` table) — turns journal compare from "paste a URL" into
  "pick a name."
