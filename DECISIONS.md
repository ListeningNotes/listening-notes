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
