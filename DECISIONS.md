# DECISIONS.md

Settled decisions and the reasoning behind them. One line each, with the why.

**This file exists so decisions don't get relitigated.** If something here comes
up again, the answer is already written down — read the reason before
reopening it. Add to this file when a decision is made, not when it is
implemented.

**The test for an entry, 2026-09-06: would a future session reopen this, or
repeat a mistake, without it?** If not, it does not go here. How a thing was
built belongs in its commit; a lesson that cost time belongs in NOTES under
Gotchas; a small choice nobody will revisit belongs nowhere. An entry is the
rule and one reason, six lines at most.

**What is here is what could come up again.** Settled history nobody would
reopen — the licence reasoning, the arguments behind decisions since reversed
— lives in [docs/DECISIONS-ARCHIVE.md](docs/DECISIONS-ARCHIVE.md), which is
not read at the start of a session. When a decision is reversed, this file
keeps the rule as it now stands and the archive keeps the argument it
replaced.

---

## The model

**Free software, self-hosted, one copy per person.** Nobody pays, ever. Free is
what keeps API relationships simple — "commercial use" is the trigger clause in
Apple's terms, and was in Last.fm's while this used them.

**Hosting other people is ruled out.** Every reason to host is solved without a
server: the feed is pull-based, compare fetches a file, the address book is
local. Not "never" — just not a future being kept open.

**There is exactly one Listening Notes, at one address.** It is the only place
the software comes from, which is what makes anything else claiming the name
self-evidently fake.

**Visiting someone else's journal opens the browser.** This is the model made
visible, not a defect. Their journal loads from their server under their
address; the address bar is the receipt. An iframe or proxy would rebuild the
platform behaviour the whole architecture removes.

**A link to another journal opens a new window, and that is what keeps the
installed app on screen, 2026-09-13.** On a phone the journal lives on the
home screen, and a link out that opens a new window comes up as a sheet
inside the app — their journal, at their address, Done to come back. A
same-window link would hand the whole app to Safari and lose the desk. So
every link to another journal — the inbox's, the address book's, the feed's
and the person's page's to come — keeps `target="_blank"`. The address in
the sheet is still the receipt.

**A website and not a desktop app, because everything social needs an
address, 2026-09-11.** A local app would be a private journal: no visitors,
no sends, no comparing, no feed, and no colophon leading anyone anywhere.
Hosting is not a route that was picked among others; it is what being
readable by other people requires.

**The QR is the brand's answer to the URL.** Self-hosting produces addresses
nobody wants to read, and the code is where that stops being a flaw. On a
home screen there is no address bar, so the code is not hiding the address —
it is the only form the address takes. Scanning someone's face to reach
their journal is the native gesture, not a workaround.

**No follower counts, no notifications, no unread badges.** Presence is
outbound and opt-in. A journal can show what is playing; it never shows who is
reading.

**The schema is additive-only, from 2026-09-06.** Migrations add columns and
tables and never rename or drop them: copies in the wild have to survive every
migration, and one that fails is somebody's journal that stops opening. The
draft window that allowed drops closed that day — what went, and the rule
about reading a column's values before believing a grep, are in the archive.

---

## Licence and ownership

**AGPL-3.0-or-later, copyright in Miyel Brown's legal name, DCO sign-off on
every commit, the two-line notice per file, and no rights to the name.** The
reasoning — why not GPL, PolyForm, CPAL or a 7(b) clause — is settled and in
the archive. Two of these still bind day to day: the DCO means the licence can
no longer be changed unilaterally once a contribution is merged, and the
licence grants no use of the Listening Notes name or mark.

**No tool is named in a commit, 2026-09-03.** Commits carry Miyel's name and
sign-off and nothing else: a `Co-Authored-By` trailer naming a model was
putting one on GitHub's contributors list, and nothing — not the licence, the
DCO or GitHub — asked for it. The 428 commits already carrying the trailer
were rewritten the same day, while nobody else had a clone; see NOTES.

---

## Structure

**Cross navigation.** Beacon is home. Down → journal (only from the beacon).
Left → the pane that turns: your card, or your desk (the colophon, signed out).

**The cross is one route, not two.** A swipe that navigated would unmount the
pane being left and lose its scroll. The gesture has to be continuous and
reversible, so both panes stay mounted — and both faces of the turning one,
which is also what lets the feed go on updating and the inbox go on counting
behind the card. Home is a horizontal scroll container and the browser does
the physics. Entries stay real routes — an entry has an address you can send
somebody and a pane does not.

**Panes are named after the routes they absorb**, and those routes mount the
same component the pane does: `/archive` → Journal, `/about` → About. One
description of each thing, two places it can be reached.

**Dots on the beacon, a clear foot on the turning pane, 2026-09-15.** Dots
were ruled out against three panes and three carets — two vocabularies doing
one job — and with two panes they are the only one left: the active dot widens
rather than just darkening, which reads as a position instead of a count. No
side carets at all now. On the turning pane the foot is empty: anybody who got
there swiped or pressed the turn, and either way knows the way back.

**The down caret is the beacon's alone, under the dots, 2026-09-15.** It is
the one pane where nothing is visibly cut off — a whole screen of cover, art,
title and what came before — so something has to say there is more; the
turning pane scrolls and its writing running off the edge is the cue. No mark
over it: a side caret's mark named a destination worth knowing, and down has
only one.

**The light switch is the beacon's, top right, and nowhere else,
2026-09-15.** One home for it: the first screen of the journal, where it is
public (Settings is behind the password) and not sitting over somebody's
reading. It came off the entry pages' nav row and out of Settings the same
day. A sun and a moon — drawn as a switch on a wall for an hour on the
grounds that the component is called Lightswitch, and the file name was the
whole argument.

**A control is the mark, not a mark in a container, 2026-09-17.** Miyel
generally does not like the look of pills, and they had started appearing
wherever something needed to be pressable — a heart in a bordered lozenge, a
tick in a filled circle. The rule: a thing with its own mark wears it plainly
and earns its touch target from padding with a matching negative margin, so a
thumb gets its 44px and the eye sees only the mark. `.ln-pill` keeps its jobs —
navigation, and the one primary action a screen has — and stops being the
default shape for everything else.

**No loose icons in headers, 2026-09-15.** The mark is centred and the sides
are for navigation. A single ··· is not a row of tools, it is a door, and it
is allowed. Anything that acts on the thing you are looking at goes behind
that thing's ···; the desk's rows are for places you go, not tools you use on
what is in front of you.

**The ··· carries six tools on an entry, each a glyph over a word,
2026-09-17.** Share, Edit, Credit, Send, Relisten, Delete — Share nearest the
door, because it is the shortest reach and the one most often wanted; Delete
furthest and red. Words appear at four tools and not on a
particular surface: three glyphs in a corner are learned in one press and six
are not, so six say what they are, in the band's own glyph-over-a-word. The
card's two stay bare. Measured, because it is the kind of rule that overflows
quietly: 326px of a 375px row, 290px of a 320px one. This amends the three
tools below.

**An owner's tools are one ···, top right, opened in the row, 2026-09-15.**
On an entry: Edit, Print, Delete. On the ID pane: Edit and Print. Owner only,
the same corner on both, and the same component draws them (KeeperTools.js).
The card is corrected from the card and not from a desk row — everything
editable is edited where it prints, which is a rule this repo already keeps
for the name, the photo, the prompts, the links and the rig. Two glyphs in
the corner were what made an entry read as a toolbar; a menu over the page
would be a third surface on a sheet that already claims sideways for the next
record and down for closing. Delete opens the correction's own confirmation
rather than acting — a destructive thing does not get a shorter path for
moving to a shorter menu. A visitor sees nothing there: sharing stays one
path, the album art.

**The ··· does not move when it opens, 2026-09-15.** The mark stays in its
corner, turns into the ×, and the tools file out of it one at a time — the one
that ends up furthest away leaves first — and file back in nearest-first. The
first version put the × at the other end of the group, so the thing you had
just pressed jumped across the row.

**An open ··· takes the nav row's mark off the screen, 2026-09-15.** Only
there. The sitewide row is 28px of padding either side of a centred mark, and
three tools and a door reach into it on a 375px phone — so the row becomes the
menu while the menu is open and the mark comes back when it shuts. The card
has two tools and 29px to spare and keeps its mark.

**The cross is three panes on a phone: ID, beacon, desk, 2026-09-15.** You
land on the beacon. Three was tried before and failed, and neither reason was
the count — the panes were the same shape as each other and nothing said where
you were. Both are fixed: every pane is a different kind of thing now (a
portrait over writing, a record over the journal, a hero over rows), and a band
at the foot names all three all the time.

It replaced two panes and a button. Two existed because sideways meant two
things — about you on the left, your tools on the right — and the button that
resolved it never stopped feeling misplaced wherever it was put, through six
placements. The gesture that would have replaced the button cannot exist: the
left edge belongs to the rail (see the four ruled-out approaches above). Three
is also the more balanced arrangement — the beacon centred, the person on one
side, their tools on the other. With two, one page always carries more.

The book was an interpretation, not a rule. What it gave this project was an
object and then the writing underneath, and that survives at any pane count.

**The band at the foot: Card · Beacon · Desk, 2026-09-15.** A glyph over a
word, the pane you are on in ink and the other two pale. It is the whole of
what is down there — it replaced the dots, the edge carets and the mini beacon.

Pressing a name moves the rail exactly as a swipe does, because it is the
visible version of the gesture and not an alternative to it: somebody presses
Desk once, watches it move, and swipes from then on. That was always what the
carets were for, and a word does it better than a chevron — a chevron says
there is something that way and a word says what.

The labels carry the meaning and the glyphs are decoration that has to earn
17px. If one ever needs explaining, all three go and the words stay. An open
book for the desk is wrong whatever else is: the book is the journal, and the
journal is *down* from the beacon, not sideways.

**A flip and then a slide were built for a two-pane cross and are both gone,
2026-09-15.** The reasoning is in NOTES; what is worth keeping here is that
0.4s on `cubic-bezier(0.22, 0.61, 0.36, 1)` — the entry layer's arrival — is
the curve everything on this site moves on, and it is what drives the rail now.

**The down caret is drawn by measuring the pane, never by being told.** A pane
is deep when its scroller overflows, so a copy with no beacon has nothing
pointing down at it, for free. Measured on the beacon only — it is the one pane
with a cover, meaning the one pane where something is cut off at a fold rather
than simply running on. Everything else scrolls, and content running off the
edge is its own cue.

**No vertical snap on a one-long-scroll pane; the only vertical snap wanted
is the entry's, 2026-09-07.** Proximity on the long pane argued with the thumb
and came off 2026-08-28; mandatory over three screens and a bit would drag a
reader back to a screen edge halfway down the wall. The two-floor shape (NOTES)
is different: mandatory over exactly two viewport-tall floors with the reading
in an inner scroller, which is how the entry keeps its first screen still.

**The large mark is the beacon's alone, 2026-09-15.** It was on every pane at
one height, so the square under it landed on the same line whichever pane you
were on — and that reason went with the centred card: there is no third square
and no line to keep. A crown is for a cover. The card and the desk carry a
small one in their own header instead, beside the pencil and the gear; on a
desk even that goes, because the bar over the journal already has it and two
marks on screen is two marks.

**Every pane is an object, then the writing underneath, 2026-09-15.** The
beacon is the record playing over the journal; the ID is who keeps this over
their words; the desk is your tools over the feed; the entry is the record
over the notes. The panes read as disjointed when the objects are not equally
object-like — the structure was never the problem, the objects were.

**The ID's object is the portrait: full width, square, the size an entry's
album art is, 2026-09-15.** A record in one pane and a person in the next,
measured the same. Both 4:3 crops lost against the real photograph — the
clouds around the shoulders do real work — and the writing starting below the
fold is the accepted trade. A licence of typeset fields was tried the same day
and it was a column of facts, not an object.

**You browse on the wall and nowhere else, 2026-09-15.** The ID pane is a
snapshot of a person, not a second journal, so an entry opened from it — the
pinned record, a cover in a count's window — is handed no neighbours and
closes back to the card. It had the wall's order behind it and let you swipe
through the journal, which was the pane passing an order it has nothing to do
with. One layer at a time, too: a cover closes its window before the entry
opens.

**Masterpieces and Formative open a window; Albums does not, 2026-09-15.** A
window of covers, no bar and no search — a glance. Albums is the total, and a
window of all of them would be the wall with its controls taken off, one swipe
away. Only the two flag counts opening anything also says which of the numbers
mean something.

**No Favorites count, 2026-09-15.** Favourite applies to tracks as well as
albums, so forty favourite tracks across twelve records is not a number you
can set beside 14 masterpieces. Masterpiece and Formative are album-only,
which is exactly why they work here — and three fits the row where four is
cramped.

**Three counts, in the three flags' colours, 2026-09-15.** Albums,
masterpieces, formative — how somebody listens, which a genre list never says,
and the first work those tokens have had away from a mark on a record.
Typeset, not stamped: with a photograph that size above them the photo is the
flourish. Top genres moved below the fold, one line. A machine-readable line
was tried and cut — it references a passport rather than being one.

**Down is a cover, not a gesture, 2026-09-15.** Down means cover-then-contents,
and two things have that shape: the beacon, which is the journal's cover, and
an entry's card, which is the entry's. The card and the desk are not covers of
anything — they are pages, so no second floor, no arrival, no down caret. It
settles the axis argument as a side effect: a vertical drag on a page is
ordinary scrolling, and nothing has to choose between arriving and scrolling.

**Desktop is an open book: the spine and the page, 2026-09-15.** The spine is
a quarter of the window, draggable and remembered per browser, and turns
between the card and the desk with a control in its own header. Three columns
gave the desk width whether or not anybody was at it. It kept that shape when
the phone went to three panes (Miyel: don't touch desktop, this fits perfectly
the way it is) — and it is still not a second markup tree. The two boxes that
make a spine a spine go `display: contents` under 769px, which turns the same
two pages into rail panes of their own.

**The desk is a hero and its rows, and nothing under them, 2026-09-15.**
*Start a listen* as the band, then Inbox, Feed, Address book and Settings. Each
is a place you go; none is a tool you use on what is in front of you, which is
the header rule's other half. Settings was a gear in the header for an hour and
came back to a row — headers hold nothing. The feed ran on down this pane's own
scroll and is a row and a page of its own now (`/dashboard/feed`), which is
what lets the pane be a hero, its rows, and stop.

**Drafts have no door of their own, 2026-09-15.** The picker lists unfinished
listens with a resume and a discard the moment you start a listen, which is the
only place anybody goes looking for one. A row on the desk pointing at a place
you pass through anyway is a signpost to a room you are already walking into —
and it existed only to carry a number, which cost a `COUNT` over the drafts
table on every poll of `/api/waiting`. Both are gone. A second *page* of the
same rows was never on the table: that is the `/dashboard/entries` mistake.

**The right page is what you are reading or writing, 2026-09-15.** An entry
opens there and so does a listen, with the spine untouched beside it; the
inbox, the address book, a person and Settings open on the *spine*. The rule
is which of the two a thing belongs to, and it decides every case: put a
lookup on the right and it is fighting a session for the same page.

**Which face the spine was left on is remembered, and is not a setting,
2026-09-15.** It is where somebody put their own left-hand page down, per
device, like a composition book falling open where you left it. A settings
row would make it a preference to administer rather than a thing you did.

**The beacon's band stands on the page colour, 2026-09-15.** The record was
blurred across the top of the journal under a wash for two days and read as a
panel stuck on the page rather than the head of it; the wall underneath
already carries every colour this journal has, and the art is in the cover
88px away. The same call as the session's dark glass over a blurred cover,
which went for the same reason: a blurred ground under type is the thing this
site keeps reaching for and keeps taking back out.

**Prompts replace the free-text bio.** Nine openings in `library/bioprompt.js`;
a keeper answers three, one line each, and the answer completes the sentence —
`I can never skip — Voodoo, side two`. A blank box is a hard question badly
phrased: asked to describe yourself you write a paragraph about the project.

**The nine are fixed and every copy ships the same nine.** Writable prompts
would be the blank box one level up, and a fixed set is what lets two journals
answering the same opening be read against each other.

**Stored as key and answer, never as the sentence.** Wording will be revised
and must not orphan what somebody wrote. A key with no live prompt is dropped
on render, so retiring a prompt is safe and renaming one is a migration.

**"Looking for" is cut**, replaced by the prompt *If you're sending me
something, make it —*: the same information as a finished sentence, the one
opening addressed to the reader, and the reason the Send button exists.

**Top genres stays computed.** Computed says what somebody listens to and a
prompt says what they would claim; the gap is the interesting part.

**A free-text bio may come back as an optional field alongside the prompts,
and that is deliberately the later decision.** Easier to add than to take
away once people have filled it in.

**A pinned album goes on the card.** One entry from the owner's own journal,
shown as art, tapping through to it: the only image besides the portrait and
the thing that stops the card reading as all type. Below the name and
metrics, smaller than the portrait — the person is the subject and the record
is what they are pointing at. No label; art under a name says what it is.

**The pin is set from the card, behind the pencil, through a search sheet,
2026-08-28.** It is a settings field, so it is edited with the other card
fields; a pin control on an entry is an admin button in somebody's reading.
More steps for the rarer action, which is the right way round. (Pinning from
the record was tried first and reversed the same day; the archive has why.)

**One pin, and the shape is the rule.** A single column, so pinning a second
record unpins the first with nothing to check, and `ON DELETE SET NULL` clears
it when the record goes. A list of three was tried and reverted — see archive.

**The dot row is gone.** Every destination it pointed at has a route, and a
fixed strip on every page pointing at places already reachable is 56px spent.

**Tapping the top of a scrolled pane returns to the top of it.** The bar is
the target. Only while the pane is scrolled: at the top there is nothing to go
back to, and a dead tap zone across the cover is worse than none.

**The wall's bar sits on the floor, edge to edge.** Rounded corners and side
margins made it a pill floating over the covers; square and full width it is
the edge of the wall.

**Sideways is a decision made at the top of a pane.** The side controls go
away once a pane is scrolled: down in the wall or the reading, the only thing
worth offering is more of what you are in. The swipe itself is untouched —
hiding a control is a hint; disabling a gesture halfway down reads as broken.

**Fifty covers to a page.** Past that you are scrolling rather than looking.
Counted on the filtered set, so one artist inside three hundred records gives
you their four on one page.

**Nothing sits at the foot of the wall.** The foot of the archive is where
somebody has finished looking, and three links to elsewhere is the site
asking them to leave.

**The wall's controls sit at the bottom on a phone.** Where the thumb is, and
where they do not take the first hundred pixels of covers. Sticky, never
fixed — the wall lives inside a pane of the cross.

**The beacon captions itself, 2026-09-07, on Miyel's call.** One line under
the art, above the title, naming which of the three states below this is.
Reverses 2026-08-28 (the archive has why it came off). The idle art still
greys.

**The beacon is the listen, and Last.fm is gone, 2026-09-16.** *Now logging →
Last logged*, out of this journal's own sessions, on every copy. A scrobbler
says a file was played; this says somebody sat down with a record and wrote
about it, which is what the journal is for — and two of two testers failed to
connect one, Apple Music on an iPhone being unable to at all. It went while it
was still true that nobody had one set up, which is the cheapest moment a
removal ever has. The argument for keeping it is in the archive.

**The beacon is switched on or quiet, in Settings, and `beacon_source` carries
it, 2026-09-16.** Presence is opt-in and there was no way to decline. Quiet
says nothing to anybody, owner included: a beacon that checked who was asking
could not be answered once and handed round. The column used to say which of
two beacons ran here; the schema is additive-only, so it carries the switch
rather than sitting dead, and anything that is not `quiet` is on.

**The needle lifts; it is not thrown away, 2026-09-15.** Closing a record you
spent an evening with used to erase that listen and drop the beacon past it.
An ended needle stands as the most recent listen, keeping the track that was
open, until something newer happens. A record closed without a single track
opened is deleted — that is browsing, not listening.

**Closing a listen ends it, and an untouched one lifts itself after twenty
minutes, 2026-09-16.** Leaving the screen puts the needle down and coming back
lights it again; only posting and the picker did before, so a listen swiped
away went on claiming the beacon. Three hours was the first answer and was
excessive on first use — a beacon is a claim about right now. The clock is
interaction, never a tab sitting open, or walking away would claim you were
logging all weekend; and the expiry is enforced in the read, so a closed tab
or a flat battery needs nothing to run.

**The desk's door is green when the beacon is, not when a record is on the
desk, 2026-09-16.** Two facts on one control, deliberately: the words follow
the record, because pressing it is the way back to a listen; the green follows
the beacon, because that is the one colour here that means live and this is
where an owner sees it. They come apart — leave a listen and the door still
says Listening now and stops being green, which is true on both counts.

**Both "Last logged" and "Before that" are real listens, finished or not,
2026-09-15.** They come out of this journal — entries, drafts and lifted
needles — rather than off a scrobbler's history, where they were whatever
happened to autoplay. Logged means sat down with, not published: anybody who wants the posts has
the archive, and a listen written up over three evenings is still the thing
that was on. Somebody who sent you a record can see you sat with it, which is
the loop the send flow exists to close.

**The header belongs to the page, not to the listen, 2026-09-18.** The beacon
and the session each carried their own copy of a record, a name and a mark, so
every move between them was a hand-over between two objects — and an evening of
cross-fades, apertures, erases and settles proved that no animation hides one.
One header, three states (resting, choosing, listening), and the body is what
changes underneath it. The brief and the list of what was tried is in NOTES.

**Deleting an entry keeps the listen, 2026-09-18.** The beacon reads entries,
drafts and the one live needle row, so a published listen's only lasting
record was its entry, and deleting one took the evening with it. `delete_entry`
now writes the album, artist, cover and the entry's own `posted_at` into
`sat_with` (migration 020) and nothing else — no writing, no slug, so the cover
draws plain and opens nothing, the way a draft's tile already does. Written
only on a delete: this is not a log of everything played, which stays ruled out
above.

**The dot says the beacon is live, 2026-09-15.** The brief said green should
mean playback alone and Miyel overruled it on the spot — one mechanic, not
two. With playback gone (2026-09-16) there is one thing left that lights it,
and the rule is what survives: the dot follows the beacon, not any particular
source of one.

**The canonical instance must not become the reference, 2026-09-15.** Miyel's
copy is the one with everything connected, so it shows states nobody else's
does — and a feature checked only against it is a feature checked against the
best case. The default is what June sees. This is exactly how the Last.fm
setup screen survived two failed installs, and how Last.fm itself survived a
week past the point where nobody could connect one.

**No fourth metric on the card.** The card is a glance and four rows is the
most a glance holds. Ruled out rather than parked.

**Nothing about writing on the beacon.** The desk is one swipe right and
carries Start a listen and Messages; the cover was showing the same two
controls twice, a hundred pixels apart.

**No prompt on the card.** The card is the counted facts and the records; the
three prompts sit together on the screen below, which is what that pane is for.

**An entry is edited on the entry.** The list at `/dashboard/entries` was a
form for something you could not see while typing, and finding one entry among
many is what the wall's search already does. Two interfaces for one job means
neither is canonical.

**Editing is for typos, second thoughts soon after, and genuine mistakes — not
for revising a listen.** A relisten is a new entry; rewriting an old one
falsifies the encounter. That is what makes the edit stamp cheap.

**A changed note says so, next to the thing that changed.** "Edited {date}"
under that piece of writing, never at the top of the post: a stamp at the top
says only that something moved. An entry carrying five track stamps looks
different from one with a typo fix, and that visible difference is the
honesty. **Latest edit only, never a list** — a history is an audit trail,
which this is deliberately not.

**Delete lives at the foot of an entry's edit mode**, behind a confirmation
that opens in place, not a dialog dismissed by reflex, and not beside Save.
The delete cleans up after itself — comments, chain links, the pin — rather
than warning about the mess; the warning is two sentences.

**`source_entry_id` is parked, and its rules are gone, 2026-09-15.** It was
meant to point at the sender's entry for the same album, guarded by a
write-once rule, an `album_key` check and a cycle walk. Nothing could set
it, so that was forty lines protecting an empty column — Formative again.
**It cannot simply be wired to the send flow:** an `entries.id` is local to
one database, so a sender's id here is wrong or dangerous, and a send is a
visitor on *this* copy's form with their journal at an origin their browser
cannot read. Reviving it needs a reference that means something in both
places — their journal plus their entry's slug — and a send that starts on
the sender's own entry. The column stays (additive-only) and is still
stripped from public reads. Association would need its own column,
`prompted_by` — parked, not built.

**Everything editable is edited where it prints.** Fields on the card for
things a screen below it were a form filled in blind.

**The card is a glance; the reading is below it.** No prose on the card — a
face, a name, four facts and the ways to reach somebody. **The four facts are
one table**, the same label-and-answer shape for all four.

**The long note is at `/get`, and `/why` is retired.** The essay answers
*how did you get this*, which is asked at `/get`, where every copy's pitch
pane sends people; the About pane carries a short paragraph. `/get` is not
linked from the About pane, because it does not exist on a copy that has not
written one.

**The bar is a flush line with the small mark in it, 2026-09-06.** Once a
pane has scrolled its crown away the row becomes a bar: page colour, one
hairline, the small mark centred, which is also the way back up. Every other
page's nav row has the same edge. A fade was a smear the covers dissolved
into. The crown and the small mark are never on screen together, so it is
still one mark; the wall starts under the bar so its first row is whole.

**Each caret carries a mark for what is that way** — a card left, a book down,
a cog right for the owner and an `i` for a visitor. The caret is the verb and
the mark is the noun.

**The rig ships as rows and nothing else.** What the thing is and what it
does; the essay about why it matters stays out permanently — hardcoded it
would be one person's essay shipped inside everybody's software.

**Surprise gets a shake.** Shake the phone, a firework off the gold burst,
then `/shuffle`. Not built; the route waits for it.

**The card flip is dead.** Left *is* the About page. Having both means the
card exists in two places and neither is canonical.

**No journal names.** Nobody says "check out The Long Version" — they say "do
you have Listening Notes." Journals are named by their keeper.

**Titles read `{keeper_name} · Listening Notes` everywhere.** No exception for
the canonical instance; the mark is on every copy like the colophon.

**`keeper_name` is plain text; `display_name` is optional and card-only.**
Decorative Unicode gets mangled in PWA labels, feed readers and link previews.

**`/get` and `/specs` don't ship.** Drawer rule: blank on a fresh copy means
the page and its link don't render. These are Miyel's pages on Miyel's copy.

**A retired route only earns a forwarding stub if somebody has the URL.** A
stub ships to every install to redirect from an address that never existed on
their journal. `/about` earned its stub (months in the nav); `/why`, `/rig`
and `/dashboard/submissions` did not and are gone.

**`/dashboard` forwards home, 2026-09-06.** The desk is the right pane of the
cross and draws nothing of its own at the old address. The address stays
because Inbox lives under it and a bookmark should land somewhere.

**`/shuffle` stays, without a way in, 2026-09-06.** The shake is the only
entrance still meant to exist; deleting the route would delete the
destination of a gesture already decided on. Parked with Compare, below.

**`/archive` stays.** `/key` and the entry page's back link go there, and it
is the wall at an address. The pane absorbs the route; it does not replace it.

**The owner's pages rise from the foot of the screen over the desk, and are
plain, on the tokens, 2026-09-06.** Inbox, Settings and the printer: the
same sheet the send form uses, so reading what somebody sent, or changing a
key, never feels like leaving the journal. Plain because the desk is plain.
Each keeps its real address for a bookmark; signed out, Settings' sheet is
the password gate. **On a desk they open on the spine, 2026-09-15** — a
shallow stack over the left page, with a way back to the desk — so looking
one of them up never disturbs what is being written on the right.

**The Share door and the Instagram exporter behind it are gone, 2026-09-06.**
Sharing is an entry's own link and the card, not a page the owner exports
slides from. The desk is Start a listen, Inbox, Address book (2026-09-12)
and Settings. The slide drawing lives in git and on the `share-printer`
branch if a cover plate is wanted.

**The printer's door ships before the printer, 2026-09-06.** The glyph beside
the pencil, on an entry and on the card, opens `/printer`, which says the
press is coming — so the press lands where people have already been
pressing. `?entry=slug` travels from an entry; the card sends nobody,
meaning the profile. The press landed for the record on 2026-09-12; the
card's door still says so until its plate is reworked.

**The printer is a mode of the entry page, 2026-09-13.** Press the glyph and
the first screen becomes the flyer, the way correcting is a mode: the card
you already know, full size, in the real type. A sheet of its own — a
scaled-down preview with rows of buttons — was tried twice that week and was
the wrong shape for the front door. Also learned: the layer slot holds one
page, so a printer route over an entry replaced the entry underneath.

**Styles live in eight files by surface, not with their components,
2026-09-06.** `app/styles/`: base, nav, journal, entry, idcard, session, get,
forms. A rule is found where its surface is; one kept inside a component is
found only by whoever already knows which. The one exception is ComingSoon,
which must draw when nothing else does. Import order in `layout.js` is the
cascade and follows the order the rules had in the one file they came from.

**The pitch pane is three sentences and a button, 2026-09-03.** A fourth
sentence saying what a copy looks like was cut: the reader just swiped away
from one. "Get one" is centred; Sign in and Source stack under it, smallest
last — side by side they read as a caption on the button.

**The pitch pane ships on every copy.** Logged out, right swipe: the pitch and
a button to listeningnotes.blog/get. This is the growth mechanic — someone
asks how to get one, the owner swipes right and hands over the phone.

**Source link on every copy** — one faint line at the foot of the pitch pane,
under "Get one" (it left the About pane 2026-08-28). §13 is owed to visitors,
so a signed-in owner sees no Source line and is not owed one; it satisfies
AGPL §13 whether or not anyone has modified anything. **It is an
environment variable, never a setting:** a fork owes *its* source, and anybody
who forks is comfortable with `NEXT_PUBLIC_SOURCE_URL`. The settings page is
about the journal, not the software. An untested default is a default nobody
has read — the first one pointed at a repository that did not exist.

**One header everywhere, 2026-08-28.** Mark centred, one control each side.
One arrangement is what makes the site read as one system.

**The mini beacon goes from everywhere but the beacon pane.** Repeated on
every screen the beacon becomes wallpaper, and a thing nobody looks at is
worse than a thing that is not there.

**Owner tools are server-checked, not hidden with CSS.** Hiding what the
browser finds still ships the buttons to everyone. Two icons, top left, drawn
only for the owner; at a third the pencil becomes a menu. **Admin controls do
not sit in the reading flow** — the chip row under the rating is the reader's.

**The cross's gesture problem is unsolved, and four things are ruled out,
2026-08-29, the fourth 2026-09-15.** Wanted: down should feel like arriving,
and you should not slide sideways out of a pane's lower half. Do not try again:
`touch-action` on the rail (Safari ignores it for the container's own axis);
`overflow-x: hidden` while a pane is scrolled (stops the vertical scroll dead —
the stutter); a hand-rolled horizontal drag (loses to native momentum); and a
narrow edge strip with `touch-action: none` on the strip alone, which on a real
device sent the reader to the beacon instead of turning the leaf — the rail took
the leftward drag and did what a horizontal rail does with one, which is go to
the pane on the right. `scroll-snap-type: x mandatory` is load-bearing —
proximity stops landing on a pane at all.

**The left edge belongs to the rail, and a trigger cannot live there,
2026-09-15.** That is the lesson of all four. `touch-action` does not take the
horizontal axis away from the rail from anywhere inside it — not on the rail,
and not on a descendant of it either, which was the last idea standing. The
edge strip was the approach that had worked for the entry layer's back-pull, so
it was worth one try; it was written, it passed every synthesised test, and it
failed the first real thumb. Anything sideways on the cross is the rail's, and a
gesture that wants to mean something else has to be somewhere the rail is not.
**A two-floor pane did not need the axis problem solved, 2026-09-07:** the
pane is the snap container, `y mandatory` over two screen-tall floors with the
reading in an inner scroller, rail untouched, no gesture code. The 08-29 run
was three changes at once with the rail lock live; on its own the shape works.

**An entry is a layer over the journal, not a fourth pane, 2026-08-29.** Left
and right meaning different things depending on which row you are in is ruled
out: that is a mode, and modes make gesture navigation unlearnable. **On a
desk the layer is the right page, 2026-09-13, rewritten 2026-09-15,** with
the spine still beside it; the whole screen is the phone's shape.

**An entry expands from its cover, and sideways means the next record,
2026-09-02.** The sheet grows out of the tapped tile, the way a photo viewer
opens a picture; left and right are the previous and next record on the wall
as it stands (search, filters, sort — `library/handoff.js`), stopping at the
ends, by `router.replace` so back still means the wall. Closing is a pull
down from the top of the first screen, Escape, or back. No edge pull:
sideways cannot mean both next and leave.

**The layer takes a sideways drag only where a record is beside this one,
2026-09-03.** On a form, or an entry opened cold, sideways is the browser's.
Forms rise from the foot of the screen and sink back on the pull down.

**The send page keeps its landing, and the wall is a chooser over it,
2026-09-03.** Focus the field and a wall of large covers opens over the page,
newest first; a picked cover flies down into the sleeve. A row of small
thumbnails is not how anybody recognises a record. The search folds accents.

**The URL stays real either way, and that is not negotiable.** Intercepting
routes, not a modal: tap from the journal and the entry is a layer; open the
same address from a link and it is the standalone page. One address, two
presentations — and the journal never unmounts, so its scroll survives free.

**The tile flip is gone.** A card standing in for the entry has nothing left
to do when the entry itself is one tap away and slides back off.

**The layer opens with the record already on it.** The wall already had the
cover, title, artist, rating and date, so the tile hands them across
(`library/handoff.js`) and the first screen draws at once; only the writing is
waited for. The grey skeleton stays for every other way of arriving.

**The layer has no close button on a phone.** A corner cross took the lights'
place; a bottom caret sat on the entry's scroll cue. What is left is the pull
down, Escape and back, which is what people reach for anyway. **A desk gets a
back caret at the layer's top-left, 2026-09-13:** with the journal in the
dock there is no browser back, and Escape alone is a way out nobody is told
about. Never on the phone.

**The record stays at the head of the reading, 2026-08-30.** On a phone the
second screen is a wall of text with the record a swipe away, so a strip
holds the least of it that says which one: art, name, artist, score, marks.
It carries no controls. Phone only; a wide window's hero already does this.

**A field is real only when it has a way to be set and a place it shows.**
Formative had a column, a definition, a token and a chip tone, and was set on
0 of 39 entries — nothing scored it and nothing drew it. A grep for readers
run forwards is as misleading as one run backwards. (The build-out and the
`relationship` migration it forced are in the archive.)

**The flags are marks, not words, and there are no tags.** Heart, SketchLogo
and Fingerprint in `--fav`, `--mp` and `--formative`. Worded chips are too
wide for a strip that has to leave room for an album title. **A sent record
wears an envelope, 2026-09-13**, in faint ink rather than a colour: it says
where a record came from, not what the keeper thought of it. The same mark
everywhere the others are drawn — the strip, the feed, the key. **Not
inside the entry's chips, 2026-09-14:** the first screen's chips are words,
all of them alike, and the marks are the strip's on the screen below; a
mark in one chip and not the others was also the row changing shape when
an entry landed over the journal.

---

## The journal

**Three flags: Masterpiece, Favorite, Formative.** Each answers a different
question — the record, the track, your life. Not extensible; this is
deliberate. **Considered and rejected as flags:** Unfinished (needs a rating
exception and collides with "a journal of things worth writing about"), Live,
Sleeper, Comfort.

**Masterpiece is computed, not chosen, 2026-09-17.** Every track rated, every
rating five, and the mark appears; anything else and it does not. Nothing
presses it — not the session, not a correction — and the writer derives it
wherever an entry is written, beside `track_notes` and the horizon. It is not a
generated column, where it belongs on paper: `rating_value` is already
generated and already reads `masterpiece`, and Postgres will not let one
generated column depend on another. **Correcting a track from five to four
takes the mark off**, which is the point rather than a hole — the entry scores
what it scores. Favorite and Formative stay personal, and stay pressable;
Masterpiece is the one flag with an objective definition, which is what lets
the other two be subjective and what makes two journals comparable at all.
Checked before shipping: the rule agreed with all 40 entries, so nothing
gained or lost the mark.

**Favorite applies to tracks and albums. Masterpiece and Formative are
album-only.** Masterpiece is a full five-star tracklist, which cannot apply to
a single track.

**An album has many listens, numbered.** The number is computed from existing
entries, never chosen. Entries are never overwritten; a relisten is a new one.

**Definitions ship as editable defaults, and custom listen types are ruled
out.** Universal second-person text installs and the owner can edit any of
it: stable keys, editable labels and bodies, one JSONB column. Fixing the
vocabulary is what keeps two journals comparable.

**The swatch (rating distribution on the card) was cut.** You can see how
someone rates by reading their archive.

**Comparison uses one entry per `album_key`, most recent.** Never average
across listens. Compare rank order or z-scores, never raw stars — a generous
rater and a harsh rater with identical taste should score as identical.
**Applied 2026-09-13 as an offset:** across what two people both have,
their ratings are shifted by the average difference before a gap is
measured, and "rated alike" is within half a star after that — the simplest
rule that honours the sentence above and can be said in one line on the
page. Three records in common is the least the offset is trusted on.

**The cover is the control.** While a correction is open the album art is a
button: press it and the address opens underneath, with "Find it again"
re-asking Apple with the album and artist as now corrected — a wrong cover is
nearly always a wrong match. Outside a correction the cover is a picture.

---

## Sharing

**The printer's word to a reader is Share, 2026-09-17.** *Print* described the
mechanism and nobody prints anything; the tool makes a picture to post, which
is what everybody calls sharing. It takes the phone's own share glyph with it.
This softens the entry below rather than undoing it — the two things are still
two, and the tool's whole sentence says which one it is ("Make a picture of
this entry to share"). The address still travels by pressing the album art,
which remains the only path to a link and gets no control of its own.

**Two different things were sharing one word, 2026-08-28.** Addresses travel
freely, contents do not. **The printer** makes an artifact out of the owner's
writing: owner-only, server-checked, in the header. **Copy link and QR** pass
along an address: available to anyone, and on an entry they are one gesture
on the cover (below, 2026-09-12).

**An entry's cover turns into its code, for anyone, 2026-09-12.** Tap the
art and it becomes the code for that entry's address and the address is on
the clipboard — the card's gesture, the card's dots, the card's Copied line,
the card's corner badge. On a home screen there is no address bar, so the
code is the only form the address takes, and that is the argument for it
being on every entry rather than card-only. The code encodes the entry's
address, never the journal's.

**While the press is in the air the art breathes, on Miyel's call,
2026-09-12.** The pressed picture takes half a second to arrive, and a
cover that stays put for half a second reads as a button that did nothing
— the clipboard rule again. Tried the same day and not kept: the plain
code drawn at once, with the photograph developing inside it. It answered
the tap instantly, but it was a second picture replacing the first. The
pulse says the press landed without changing what is on screen; the plain
code stands in only when the press cannot be had.

**The cover's code is pressed on request and never stored; the row keeps
only the dot, 2026-09-12.** A pressed cover is 200–360 kB, and one per entry
would grow with the archive on every copy's free tier — `settings` reaching
310 kB on two pictures is the warning. So the picture is redrawn from the
art on each ask (a quarter second, on the server, because Apple's art cannot
be read in a browser), and `entries.cover_code` holds the proved dot with
the press's build and a fingerprint of the art and address: 21 bytes,
written on the first tap, never on save. Never verify on load; never base64
a picture into a row.

**Cards carry the mark only — no URL, and no code, 2026-09-12.** Printing
the address on everyone's cards advertises Miyel, not the software. A code
was tried the same day and cut: a story is viewed on the phone that would
have to scan it, so a code on a print does no work. Exporting copies the
entry's address for a link sticker; in person, the art on the entry already
turns into its photo code. A printed flyer would earn a toggle, not a redesign.

**No address is ever printed on a page, 2026-09-12.** A journal is shown by
its keeper's name and face; the address lives in the link and in the code.
Self-hosting produces addresses nobody wants to read, and the site's answer
is the code, not smaller type — so the address book's rows, the compare's
headings and the inbox's links say the name, and the public feed carries
`keeper_name` so another copy has one to say. A host is printed only when
nothing else is known, never by choice. **Two different QRs:** a journal's
About QR shares that person; the pitch pane's is a fixed code to `/get`, the
same on every copy.

**The photo QR: the photograph fills the dark modules, a dot of ink sits in
each, the finders and the alignment target are solid, 2026-09-11.** The
dots and the patterns carry the scan, so the picture keeps its tones and
the proof is by construction: the strictest reader passed both portraits
and all 39 covers at the smallest dot, where the photograph carrying the
code alone passed 21 covers on the most lenient. If a dot ever fails it
grows a step, ending at the plain code — something scannable always ships.

**Pressed on the server, judged by jsQR, one file with its ink flipped for
the dark page.** The judge is the strictest reader on purpose: what passes
it scans on any phone, and the answer is the same whatever phone the owner
holds — Safari has no reader of its own, which is how June's copy got the
plain code. The dark page's file is the light one with pure black and white
swapped at request time; the photo is banded so it never holds either.

**A code drawn by an older build is re-pressed on the owner's next visit;
one drawn by this build is left alone.** Every card ends up the same style,
and a save that fixed a typo never redraws a picture the owner already has.
The press also runs when the photograph or its framing moves, when the
address changes, and when a journal has a portrait and no code.

**Screenshots are not a threat model.** Don't fight them.

**Turning the card to its code also copies the address, 2026-08-29.** The
code is for a phone pointed at the screen; the rest of the time what is
wanted is the address, to paste into a send form. The copy says so on screen
— a silent clipboard write reads as a button that did nothing — and only on
the way to the code, never on the way back.

**Fixed layout, swappable background, and 9:16 is one frame.** On every
export variant the art, title, artist, rating and mark stay in locked
positions; the background changes mood, never information. A Story has room
for art and metadata together, so no carousel.

**The printer's options are the card itself, 2026-09-13.** Tap a line of
the card to leave it off; it fades where it stands, and comes back on a
second tap; the marks cycle chips, symbols, gone; a sideways swipe turns
the ground — the record blurred across the screen, plain day, plain night.
Six bubbles under a preview were sixty-four arrangements, most worse than
the default, with labels nobody outside the project knew. The paper on
screen takes the size picked in the bar, so the other shapes are seen, not
only saved; the card is scaled to fit whatever paper it is on.

**The print is the paper on screen, with no hidden margins, 2026-09-13.**
The saved picture kept bands for Instagram's furniture and a link sticker
that the preview did not show, and came out with the card smaller than the
one just approved. Anything a story needs kept clear is drawn on the
preview as a band, or not kept. On a phone Save is the share sheet — Save
Image and Instagram are on it — since no page can write to the camera roll.

**A print is the entry page's first screen on the record's own colour,
2026-09-12.** The cover blurred across the paper under the look's wash,
then the card a reader already knows from the journal: centred, the post's
chips, the post's stars. The first cut — the cover on plain cream with the
facts under it — was every other app's share card, and forty albums made
forty identical prints. Plain paper is not a look; the record is.

**An entry's link unfurls into a picture, 2026-09-06.** The framework's
`opengraph-image` file beside the entry page draws the card a message shows
— cover, keeper, album, artist and year, stars, marks — on the server, per
request, from the row the page reads, never stored. This is the visitor's
half of sharing; the printer is the owner's half. The journal's own address
draws none yet: that picture is the card, and the card is the printer's job.

---

## The network

**Backups are two features, not one.** Neon keeps six hours. The owner's own
copy gets a scheduled local backup (`scripts/backup.mjs`, a daily LaunchAgent,
thirty kept); every copy gets `/api/export`, a button that downloads the whole
journal as one file. A schedule needs somewhere to write and something always
running, neither of which can be handed to a stranger without hosting them —
so the automatic one never ships and the manual one always does.

**One format, both paths.** `scripts/restore.mjs` reads either the folder or
the downloaded file. The moment somebody needs a restore is the worst moment
to learn their backup is the wrong sort.

**The feed is pull-based.** Every copy publishes `/feed.xml`; each copy goes
and checks. Nobody learns they were read. **Two views: submissions and
recent** — submissions is the warmer default and cannot become a scroll. **A
shelf, not a river:** no counts, no badges, no unread state.

**The feed is entries, not people, 2026-09-12; built 2026-09-13.** The
desk's second floor: entry-shaped rows with a small face and a name — what
the people in the address book logged, not a list of who exists — read from
each journal's public feed in the browser, never stored. Recent is everyone
in the book, newest first, forty at most; Submissions is who logged what you
sent them and how they rated it, and is the default. A row offers Compare
only when it is a record you also have — this album, their rating against
yours and the two horizons; the track notes stay on the journals until an
entry can be read across origins. Compare arrives because something
happened; it is not a place you navigate to.

**Everything social lives on the visitor's own copy, 2026-09-12.** Their
copy holds their addresses and does their comparing; other people's journals
are things you read. The `?from=` link of 2026-09-10 is retired: it only
worked for somebody arriving from a link their own copy had written — an
inbox link, and nowhere else — and a text, a code or a shared card carry
none. Storage is per origin, so the link worked against that grain; the
argument it replaced is in the archive.

**The address book is a place on the desk, and a person in it is an
address, 2026-09-12.** Not a relationship: somebody can be added, compared
against and never have sent anything. Sends are a layer joined from
submissions by the same address, never what makes a person exist. The
`people` table holds the address and the name their journal gave; the face
is read off their journal and never stored.

**Adding is one-sided, and there is nothing to accept.** It is you writing
down where somebody lives. An accept flow would mean reaching into their
journal from outside — the phone-home already ruled out. Asymmetric by
design, the shape of RSS: nobody learns they were added.

**An address arrives without typing.** The Add press on the journal being
read copies its address — the one thing that journal can do for a copy it
cannot see, and it never learns whether the visitor keeps one; a send that
carried a journal has a button in the inbox; a card's or a cover's code can
be scanned. The paste field is the fallback for an address read aloud.

**Compare is not a destination; it is your page about someone,
2026-09-12; built 2026-09-13.** A face or a name in the feed, or a row in
the book, opens `/dashboard/people/[id]`: records you both have, rated
alike, what they sent you and your hit rate with it, then where you agree
and disagree hardest, what they sent and how it landed, and what only they
have heard. On your copy, owner-only, which is why it can hold what their
journal never could. `/compare` is gone with it — a public page that
compared this journal against a typed address, which the model has no
place for (everything social is on the visitor's own copy); nobody had the
URL, so no stub. A printer door on the page waits for the press.

**The page about a person stays on your copy; their journal gets no door
to it, 2026-09-13.** Considered: their right pane offering "Compare with
you" when you arrived from your own book. Ruled out as a mode — right would
mean the pitch for anyone who came by text or code and compare for you —
and it would reopen the address-in-the-link rule for one convenience, wait
on their copy updating, and land in a sheet that borrows Safari's sign-in.
Their journal is the thing you read; your page about them is where you
think about them, and the feed's face is the way there.

**Lineage runs backward only, and that is the feature, 2026-09-12.**
Walking upward gives everyone who passed a record before you; nothing sees
forward, because the link to the next person exists on their copy. The
forward half arrives through the submissions feed when somebody in the book
credits you — from them having written something, not from anything being
tracked. The Submission chip on an entry opens the chain. **Walked by
address, not by id, 2026-09-15:** each hop follows `received_from_url` to
that journal's public feed and finds their entry for the same album
(`Chain.js`), which works across copies where an id cannot.

**`received_from` is published per entry, and the sender decides,
2026-09-15.** Public credit is the default; quiet is a choice — and it is the
*sender's* choice, because the credit puts their name on somebody else's
public journal and they had no way to decline while the keeper could already
clear the field. The send form asks (`submissions.quiet`, off by default) and
the answer rides into the entry. The keeper can set it too, for what the form
cannot reach: a credit added by hand from the address book names somebody who
was never asked. One flag, two ways in, honoured in one place — `withoutChain`,
so the entry, the wall and the feed cannot disagree. **Built
2026-09-13 as the feed's credit, and on the entry itself 2026-09-14:** a
Submission entry carries `received_from` and `received_from_url` on every
read — the feed, the wall, the entry's own page — and on no other kind of
entry. The address is what a sender's copy matches on; the name only for
entries from before the address travelled. The quiet toggle is still owed.

**The sender is a line on the entry; only the trail is behind a press,
2026-09-15.** *Sent by*, a small face, a name linking to their journal, under
the chips and always visible — and nothing about what they thought of the
record, because that is their journal and comparing the two is their page in
the address book. Behind the press is only the trail: a `+2` opens a
horizontal band of who carried the record before them, with each hop's
rating, which is the record's history rather than a second opinion. No trail,
no pill. The Submission chip stands down wherever a name is printed and stays
where one cannot be. This reverses *the sender opens; it does not display*
of 2026-09-14, one day old; the argument it replaced is in the archive.

**The sender is picked off the address book, and a backfill carries no
date, 2026-09-14.** Crediting an old entry links the name to a journal in
the book, so the person's page counts it at once; free text stays for
anyone without a copy. No date is asked for and none defaults to today: the
entry's own date is the ceiling, ordering and hit rates work from it, and a
confident wrong date corrupts every statistic after it. `received_date` is
the send flow's, where the moment is exact.

**A send has four outcomes, and two of them are not the same claim,
2026-09-15.** Pending, started, logged, archived (stored as `dismissed`:
the word on screen changed and the column did not, because renaming a value
means rewriting rows on every copy to say the same thing differently). `reviewed` is set when
Start a listen is pressed and means an intention; `logged` carries
`entry_id` and means a record exists. Folding them would make a started and
abandoned listen claim to be logged. **Nothing ever matches a send to an
entry automatically** — a person recognises the record and presses once,
because a wrong guess writes a credit onto somebody's entry.

**The inbox is one list and a row opens where it sits, 2026-09-15.** New was
never a place — it is a property of a row, the way unread is in mail — so
there are no views to stand on: one list newest first, a dot for what is new,
the state as a word in the subtitle, archived behind a line at the foot.
**Pressing a row opens it, it does not navigate**; the listen is one of the
things you can then choose. **The sender's actions are there whatever state a
send is in**, which splitting the list had made impossible — a half-listened
album whose sender has since made a journal had nowhere to say so. One
primary action chosen by state, the rest as quiet rows under it; an archived
row's primary is Put back, which is why archiving needs no undo of its own.
**A resumed listen must find its draft:** a send and a draft are separate
rows joined only by album and artist, and starting fresh would upsert over
the saved notes.

**A send can start on the sender's own copy, and the visitor form stays,
2026-09-16.** A keeper sends out of their own address book, through
`/api/outbox` on their copy, which posts server-to-server to the recipient's
`/api/submissions` — a browser cannot make that write and does not have to,
because CORS is a rule browsers keep and not a rule of the internet. The form
on a card is unchanged and is the way in for everybody without a copy, which
is most people. This is not the phone-home ruled out elsewhere: nothing leaves
unless somebody presses Send.

**A server send is counted against the journal it names, never the address it
arrives from, 2026-09-16.** Every copy on a platform leaves from the same few
machines, so an IP-keyed limit counts every keeper in the world as one sender
and refuses the sixth send in ten minutes whoever sent it. The recipient asks
whether the named journal answers before believing it — the same question
filing an address already asks — and a second, loose limit on the address
exists only so one machine cannot make a copy fetch a thousand made-up
journals. Do not put the IP keying back.

**A cross-copy reference is a journal and a slug, never an id, 2026-09-16.**
`submissions.sender_entry` holds the entry a send came from, beside the
`sender_url` that holds the journal; together they are a URL, which is the one
identifier that means the same thing in two databases. This is what
`source_entry_id` could not be, and why it stays parked.

**A send is a gift, not a form, 2026-08-29.** Three parts, in this order: the
object, the note, and who it is from. The album is picked off covers, because
a cover is what makes it read as something handed across rather than a title
being reported. The message is the body of the page. A name is required.

**No email anywhere on the site, 2026-08-31.** Nothing here sends one — no
list, no notification, no account to recover — so an address is a personal
detail collected for no purpose, and that is the first crack in not holding
anyone's data. **A journal URL does every job an email might have:** it makes
somebody reachable, it is what an address book would be built from, and it is
where something is rather than who somebody is. Both forms ask a name, and a
journal if you keep one.

**One stored value, not one per feature.** The sender's URL lives in
localStorage under a single key owned by `return_address.js`, shared by the
send form and the comment form — fill it in once on any journal and it is
prefilled on every journal after. Nothing reads it to decide what a visitor
is (2026-09-12, above); the send form reads it to know who is sending.

**It cannot be filled in from the sender's session, and that is the
architecture working.** Cookies are scoped per origin, so no copy can see
what another set — which is exactly what stops anyone being followed from one
journal to the next. Per browser, not per person; the cost is one paste.

**Who is sending travels in the link, and the send form takes its shape
from how somebody got there, 2026-09-14.** Every link out of a copy to
another journal carries the keeper's name and address (`?from=` and `?as=`,
owner surfaces only); the journal landed on keeps them as the return
address. A keeper who arrived that way sees *Sending as Blue · his journal*
with a way to change it; anyone else is asked for a name and nothing else —
no journal field, because somebody without a copy has nothing to put there.

**Stored without a scheme, and normalised on the server as well as in the
browser.** The inbox turns the value into a link, and a route cannot assume
the only thing posting to it is the page that shipped with it.

**A dismissed layer must never eat a written message.** The send page is one
careless swipe from gone. A confirmation taxes every deliberate dismiss to
catch the rare accident, and a dialog is dismissed by reflex — so nothing is
confirmed and nothing is lost: what has been typed is kept in the browser and
put back when the page opens again.

**Starting a listen from the inbox asks nothing, because nothing is left to
ask.** The record, the pressing, who sent it and when are on the row, so it
goes straight to the session and `received_from` fills itself in — the loop
the send flow exists to close. `drafts` carries `received_from` and
`received_date` too, or the loop would close only for a listen finished in
one sitting.

**The send is one screen, 2026-08-29.** Nothing below the fold, no Back or
Archive pills at the foot — a row of links to elsewhere under a form offers to
leave at the moment somebody is halfway through doing something.

**It fits by layout, not by clipping.** Everything vertical is clamped against
dvh, the same trade `--hn-crown` makes; min-height and a scrollbar, because a
small phone, large type or the keyboard all have to be able to overflow, and
a form that fits by clipping has an unreachable Send button.

**One square holding three things.** The empty sleeve, the results, the chosen
record — same size, same place, so choosing is a sleeve being filled rather
than the page laying itself out again.

**Nothing on the send page is captioned that shows what it is.** No "The
album" over a cover; the field's placeholder asks and a picture says what it
is. The text fields keep their labels, because an empty box does not. **The
title is one small line, and only on the standalone address** — on the layer
you know what you tapped.

**Form fields are 16px on touch.** Safari zooms in on focusing anything
smaller and does not reliably zoom back out, so leaving a field leaves the
page scaled. Scoped to coarse pointers. Not `maximum-scale=1`, which takes
pinch-zoom from everyone who needs it.

**The inbox is a shelf, not a table.** The five-column grid hid the one part
that mattered — why somebody sent it — behind a button marked "Note". Cover,
message, name, in that order.

**One beacon poll per page, shared, not one per component, and none at all
from a tab nobody is looking at, 2026-09-16.** The timer lives in the module
with components subscribed to it. The answer is the same for everybody, so it
is cached at the edge for ten seconds and repeat asks never reach the
database — which is what makes the cost stop growing with the number of
people watching.

**No banner or message system pushed into copies.** That would require every
copy to phone home, producing a log of who is running one. A copy asks its
own server, which reads the public releases at most once a day and says one
line on the desk when a newer one exists — the only thing it can ever say.

**A copy updates itself once an hour, takes releases and never main, and
never crosses a major on its own, 2026-09-15.** The `Update this copy`
workflow runs on a schedule as well as on its button: it merges upstream's
latest release tag and pushes, on the keeper's account, with the token every
workflow gets — no terminal, nothing pressed. Cutting a release is the act
that ships; a push to main ships nothing until one is cut.
1.x to 2.0 waits for the button, because a major asks something of the
keeper. The logic is fetched from upstream each run, because GitHub will not
let a workflow rewrite workflow files — which is also why a copy from before
the schedule pastes the file once more, and then never again.

**The version moves with the merge; the release announces it,
2026-09-12.** A fix moves the last number, something new the middle, a change
that asks something of keepers the first — bumped in the same merge, so a
copy deployed from main shows a number that is true of its code. A release
is cut when there is something to tell a keeper: it is what makes every desk
say a newer version exists, one interruption per thing worth saying.

---

## Things open in the page, not over it

**An artist's name in a review lands you on the wall, filtered, 2026-09-06.**
`/?q=name`: the cross, landed on the centre pane one screen down, the search
showing the name. Not a page over the entry over the journal — that stack
is the Pinterest shape. The site has one wall, and everything that lists
records is that wall.

**A control opens where it belongs, 2026-08-31.** Not floating in the middle
of a darkened screen. Twice in a week a popup was built and taken back out —
the writing panel and the comment form — for the same reason, so it is a rule.
**A form is about the thing next to it:** put it in an overlay and it has been
carried away from its subject, which is dimmed behind it — the one thing you
might still want to read while writing.

**Pushing content down is not the problem to avoid.** A form unfolding in the
tracklist shoves everything below it down. That is what leaving room for
something looks like; the page grows and you scroll.

**What replaces an overlay depends on the shape of the thing.** A form
belonging to a spot in the page unfolds in the flow. Something occupying a
place already reserved — the mark's box — takes that place, the way the
portrait turns into its code. Neither covers anything.

**Two exceptions, and both are the same exception.** An entry over the journal
is a whole page with a real address, not a control; the wall's filter sheet on
a phone is a screenful of controls with nowhere in the flow to live. The test
is whether the thing has a *place* on the page.

**Dismissing is not the same question.** A layer closes on a stray gesture
because that is the platform's habit and nothing is lost. A form in the page
does not: a tap outside would throw away what has been typed. Both keep Escape.

---

## The lock

**The login is an ownership check, not an identity, 2026-08-30.** One owner,
no accounts, nothing to be here but yourself: a yes/no key to a locked room in
a building anybody may walk into.

**The blast radius of a compromised copy is one journal.** Every copy checks
its own password against its own server; there is no shared system to be let
into and no database of everybody. That is a structural consequence of
self-hosting, and the thing a hosted service can never offer.

**The way in is the right pane, and nothing on the mark opens it,
2026-09-02.** The pitch's key when you are out — pressed, the password field
opens under it in place (2026-09-10: a whole screen saying SIGN IN on
somebody else's journal read as being asked to log in); the desk's Settings
door when you are in. `/settings` signed out *is* the sign-in; `/login` stays
as the address form. No gesture on the logo, on Miyel's call.

**`/login` exists and nothing links to it prominently.** A gesture that is the
only way in cannot be linked, bookmarked, or reached when it breaks on a
device nobody tested.

**One password field, in one file.** A second copy is how the first drifted
out of the shape a password manager can read. Safari needs a real form, a real
submit, `autocomplete="current-password"` and a username to file the entry
under — the journal's address, visible, on all three screens that touch the
password (see Setting a copy up).

**Six months on the wristband.** A lock on one person's own room, opened on
the same two or three devices. Monthly logins are how a password gets weaker.
The trade is stated: an unlocked phone is dashboard access, and that is accepted.

**Rate limiting is in memory, and the limits it can honestly promise are
written down.** A managed store needs an account elsewhere most copies will
run without; a database table answers a flood by writing a row per request.
On one process the count is exact; on serverless it is a speed bump that
still stops one machine hammering one endpoint. `library/doorman.js` says
all of this at the top. Hiding an entrance is worth nothing; counting attempts
is worth everything.

**An upvote is one per person per comment, not a rate.** In memory, so it
forgets: a durable record of who voted for what is the kind of thing this
site does not keep about its readers.

---

## Setting a copy up

**A route, not a takeover, 2026-08-31.** `/setup`, redirecting home once the
journal is claimed — the same shape as `/login`. A screen only reached by
redirect cannot be linked, bookmarked, or reached again after a half-finished
attempt.

**An unclaimed copy holds its whole site behind a plain page.** Not a redirect
to setup: a stranger finding a fresh deployment would land on somebody else's
setup form, which reads as an invitation. *Cannot be taken* and *does not look
takeable* are different things. And behind the hold is an empty archive, a
nameless card and a dead beacon — nothing to read, so nothing to protect.

**`proxy.js` carries the pathname and does nothing else.** It runs on every
request, and a read there is a read per request — the exact shape of the
thing that spent the transfer allowance.

**The gate reads through `isSetUp()`, which does not catch.** `pull_settings`
swallows errors and returns `setup_complete: false` — right for rendering,
wrong for a gate, where an outage and "never set up" would become the same
answer. The reader lets the error throw and the caller fails closed: if the
question cannot be answered, assume the journal is somebody's.

**Setup is one screen at a time, and everything after the name says Skip,
2026-09-01.** Name → photo → prompts → rig → password (links retired; Last.fm
and the key moved out, below). The address is the host the request came in
on and the founding date is the day setup ran — an editable date anyone can
set says nothing. Skip means later: every field that can be skipped has a
home afterwards, on the card.

**Nothing in setup needs an account somewhere else, 2026-09-13.** Last.fm and
the Anthropic key are asked in Settings, never at setup: two of two testers
stopped at Last.fm — one on Apple Music on an iPhone, which cannot scrobble
reliably at all — and the key is the same wall with a card attached. A copy
without either works whole: the beacon falls back to the last record logged,
and research and the question mark are simply absent.

**The pitch says nothing about AI, 2026-09-13.** The README and `/get` argue
ownership, and for part of the audience AI and ownership read as opposites;
a feature that needs a key is found by whoever goes looking in Settings.

**The handle is derived and the serial is minted; neither is asked.** A second
name is the mistake `journal_name` made. The serial is the copy's identity and
random: anything derived from a name or a date is frozen wrong the moment
either is corrected, and `WRITE_ONCE` means no second chance.

**One owner row, and the guard is "the table is empty", not "this handle is
free".** `ON CONFLICT (handle)` stops a duplicate name and not a second owner.
Everything downstream reads the owner as `ORDER BY id LIMIT 1`. **Setup does
not reopen** once claimed, rather than showing a form that appears to save
`serial` and `founded_at` and silently drops both.

**Settings is the machinery, reached from the desk.** The address, the
beacon's switch, the Anthropic key, the password, the home-screen step. The card's own fields
are *not* edited there: everything editable is edited where it prints, and
two editors for one field means neither is canonical. No gear on the card;
`/?edit=card` opens the card editing for anything that wants to point there.
The starting theme is parked — its column exists; nothing writes it.

**The keys live in the database, in a table of their own.** A setup screen
cannot set an environment variable, and a key nobody is prompted for is a key
nobody sets. `secrets` holds the session secret, the password hash, the claim
code and the two API keys, with one narrow reader (`library/secrets.js`) and
never selected with `settings`. Database first, then environment — except the
session secret, environment first, so a copy is not signed out by a row it
did not know about.

**Deploy asks for nothing.** The password is chosen on the site near the end
of setup, in a real password field with a confirm, and has no Skip: nobody
typed one at deploy, so there is nothing to keep. The signing key mints itself
on first start. `SESSION_PASSWORD` and `SESSION_SECRET` still work where set.

**The window is closed with a claim code, and travels as a link.** An
unclaimed copy with no password would be claimable by whoever reached
`/setup` first. The code is minted by the first migration, printed in the
build log as `https://<site>/setup?code=…`, and cleared at claiming; it stands
in for the password at the gate and nowhere else. A person at a deploy screen
does not know what a claim code is, so the link opens on the name field.

**And the door is simply open for half an hour after a build, 2026-09-02.**
Vercel ends a deploy on a picture of the site with the log behind it; nobody
goes looking for a log. The build step opens setup for thirty minutes on an
unclaimed copy, and pressing the picture lands in setup with nothing typed.
Only at build — a start can be woken by anybody's visit, a build only by the
owner. Past the window: Redeploy, or the code from the log.

**The build migrates too.** `npm run build` runs the migrator before
`next build`, purely so the claim code reaches the build log. A build that
cannot reach the database says so and carries on rather than failing.

**A copy with no database, or one it cannot reach, holds on a page that says
so.** The connection opens on first use, never at import, so a missing
`DATABASE_URL` is an explained page rather than a failed build. The page names
what to check, in a sentence chosen from the driver's error
(`explainDatabaseError`), and every holding page carries an "It didn't work"
link to the repository's issues. The setup invitation is still never shown on
an error.

**There is always a beacon screen, 2026-09-16, Miyel's call.** A journal
showing a record it sat with months ago is not a beacon failing — that is the
signal — and a copy on its first afternoon gets a blank one standing in. It
reverses *no Last.fm means the journal is the first screen*, which dropped the
whole floor when there was nothing to say: a pane that changes shape on a fact
about the journal is one a fixed band at the foot cannot afford, and asking
the question cost two `EXISTS` subqueries on every page render.

**The holding page's door is a plain anchor.** A `<Link>` from a page the root
layout draws is dead — layouts do not re-render on a client navigation. First
thing a new owner presses.

**The deploy button carries `products`, not `env`.** The `env` parameters did
not survive Vercel's sign-in redirect. Neon's marketplace shape,
`products=[{"type":"integration","integrationSlug":"neon",…}]`, attaches a
database and sets `DATABASE_URL`, so the button asks for nothing; the bare
`?repository-url=` form is the fallback and the README says what to add by
hand.

**Migrations go through the direct endpoint, never the pooler.** The
migrator's advisory lock is session-level, and PgBouncer in transaction mode
hands statements to different backends. It reads `DATABASE_URL_UNPOOLED`, and
failing that strips `-pooler` off the host.

**Add to Home Screen is the last screen of setup, and lives in Settings.** The
one step the software cannot do, at the one moment somebody will do it. iOS
gets the share-sheet steps; Chrome gets its real prompt. No service worker —
a fetch handler that exists to satisfy a prompt is the anti-pattern Chrome
dropped the rule over.

**`/get` is three addresses, 2026-09-03.** Everyone arriving has already seen
a journal working, so the door is one screen — a hero line, the button, what
to expect — and three links. The steps live at `/get/install` because a
person stuck at step four needs a link that opens there; the essay at
`/get/story` because it is long-form reading. No demo, no feature list. The
two sub-pages rise as layers from the door and are standalone when opened cold.

**The hero line is "a music journal you actually OWN."** "At your own
address" is architecture, not a benefit.

**"It didn't work" goes to the issues, not a troubleshooting page.** A
troubleshooting page would be guesses; the issues people file become it once
three people have hit the same thing. The line promises they are read.
**The bug button is a box on the desk that sends to the one copy the
software comes from, 2026-09-13.** Report a problem opens a sheet: one box,
Send, and what was written lands in that copy's inbox beside the sends,
with the version, the browser, and the keeper's name and journal attached.
A GitHub issue lasted an hour: the people testing are not GitHub people,
and being sent there is where a report would stop. This is not the
phone-home ruled out above — nothing leaves unless a person presses Send;
it is a letter. The destination is `REPORTS_URL`, fixed like the pitch
pane's Get one, with an environment variable for a fork.

**The steps are written from the fresh-account run, never from a summary of
it.** The run found what a summary skipped: the Neon panel's "Auth" toggle is
on by default and must go off, and the Claude in-app browser cannot complete
the Neon step, so tests run in Safari. Nine steps, one or two sentences each.
The phone/laptop toggle is in the address (`?on=phone`) so a copied link opens
on the same set.

**The password is filed under the journal's address, in a visible field.**
Managers pair a password with a username and stay silent without one, and
Safari skips hidden and one-pixel fields. The host, on all three screens that
touch the password, so the entry saved at setup is the one offered at sign-in.

**Links are retired from view.** Not asked at setup, not on the About pane,
not in Settings. The column stays and `LINKS_SHOWN` in About.js is the whole
of bringing them back. Miyel's call.

---

## Migrations

**A copy builds its own database, 2026-08-31.** Pasting SQL into a console
survives exactly one database and one person, and it had already failed once
— a migration run against a dev branch while everybody believed it was
production. A second copy has an empty database and nowhere to get the SQL.

**`instrumentation.js` is where it runs**, because `register()` is called once
per server instance and finishes before the first request is served.

**The lock is the whole trick, and it lives on a session.** Serverless has no
single server, so without a lock two cold starts apply the same file.
`pg_advisory_lock` is session-scoped, so everything runs on one `Client`
rather than the HTTP driver, which opens a fresh connection per call and
would release the lock the instant the call returned. The `Client` is also
the only thing that can run a schema file: the HTTP driver refuses more than
one statement per call, and splitting on semicolons means parsing `DO` blocks. **And the session ends itself, 2026-09-13:** `idle_session_timeout`
two minutes and `lock_timeout` three, set on the migrator's session. Twice a
client died without closing — a dev server under a network change, then
Vercel's build container — and Neon kept its backend idle with the lock for
ten minutes, so every start queued behind a ghost. Only the server can see a
client has gone; a waiter that gives up with nothing pending is safe.

**No down migrations.** A half-applied `DROP` has no meaningful reverse. The
answer to a bad migration is a backup and a new file.

**No baseline step, because the schema was idempotent before the runner
existed.** Every `CREATE` and every added column carries `IF NOT EXISTS`, so
001 does nothing against the journal it was written on and builds everything
against an empty database.

**Nothing edits a migration that has run.** The filename is the identity, so
a renamed file is a file that runs again. A change is a new numbered file.

**`posted_at` is when an entry was posted; nothing reads `created_at`,
2026-09-06.** The old column has no zone and the driver returns it as local
time, hours off. The fix under additive-only was a zoned column filled from
the old one read as UTC; the old column stays, written by default, read by
nothing. The first migration of the new kind, and the shape of every later one.

**`edited_at` keeps its column and is read as UTC, 2026-09-06.** It was
already written correctly; only the read shifted it, so the one window every
entry passes through re-reads it `AT TIME ZONE 'UTC'`. No migration. Before
adding a column to fix a stamp, check whether the stamp is wrong or only the
reading of it is.

---

## What a read costs

**Album art is a plain `<img>`, not Next's image component, 2026-09-03.** The
optimiser is metered on Vercel and would run on every copy, for every cover,
on every read — and the covers are already sized upstream. The
`no-img-element` lint rule is off in `eslint.config.mjs`, with this reason.

**A list of records never carries the writing.** A wall, a search, a sort and
a picker all want the same eighteen fields; `pull_wall_entries` is that list.
Measured: a full row averages 8.5 kB and those fields 0.3 kB — 97% of what
the archive pulled was text it never drew.

**Lean list to choose from, full record for the one chosen.** The tile hands
eleven fields to the layer through `handoff.js` and the writing is fetched
when the entry opens. The rule for anything that shows many records and then
one.

**A query on a timer gets its own narrow reader, and it is never widened.**
`pull_beacon_settings` returns one column because the beacon asks every
fifteen seconds in every open tab. A general reader on a short timer is
exactly how the allowance got spent; give the next hot-path field its own.

**Nothing that reads settings gets the portrait.** `portrait_data` and
`portrait_code` are 307 kB of a 310 kB row; every surface that shows either
points at `/api/portrait`. They are excluded from `pull_settings` by an
explicit column list — a new settings column has to be added to that list, a
visible cost chosen over `to_jsonb` and subtract, which silently turns dates
into strings.

**Measure the row, not the query.** Compute was healthy and no query ran
long; the expensive query was cheap to run and carrying a suitcase.
`pg_column_size` is the first thing to reach for when transfer is high and
compute is not. **Neon's free allowances are per project** — a dev branch
isolates data, not usage.

**The target is a page view that costs the same at any journal size.** Reads
still scale with the archive: every visitor downloads a summary of every
record to look at one screen. Flat means the database paginating, not the
browser. Not built; see NOTES. **The journal should get better as it fills
up** — a cost that grows with the archive is backwards.

---

## The session

**One address, `/session`, 2026-09-01.** The picker and the note-taking tool
were two routes with a ceremony between them, named for a character this
software no longer has. With nothing on the desk it is the picker; tap a
cover and it is the listen. No stub for `/dashboard/echo` — the retired-route
rule. The record on the desk is kept in the browser, so a reload reopens
where you were.

**The Echo framing is dropped throughout.** Less companion, more function:
find the album, log the listen. The floating nodes assembling into album art
were beautiful and sat between "I want to log this" and logging it; they are
parked with the other screensavers.

**The chat comes back as a reference, not a character, 2026-09-01.** No name.
Something you can ask that already knows the album and what you have written
— what instrument is that, what connects my track notes — which is why it
lives in the app and not another tab. A question mark on the cover's corner;
a bottom sheet on a phone, a column on a desk. **Nothing it says ever enters
the entry** — AI is a tool the owner uses, never a voice on the page.

**The session opens as a layer over the desk.** Leaving it puts you back on
the desk rather than on the beacon, because the cross never unmounted. There
is no dashboard door on the picker or after a save; the way back is the layer's.

**The strip is the horizon being built.** The tracks screen shows every track
as a column — its bar rising as it is rated, a dot empty until something is
written, lit for the track on screen. A row of dots said where you were; it
could not say which song was three back.

**The album screen is the art**, large and centred, with the horizon once the
tracks have stars. On the notes screen the score and marks come first and the
writing last, where a growing field wants nothing under it but the button.

**The mobile version is not a reduced version.** Every screen holds one thing
and runs full-bleed on both devices; nothing exists on one and not the other.
The dark glass panel over a blurred cover is gone everywhere — the session
reads the same tokens as every other page.

**Research is a button, not a step.** Tap it for the background before
listening, skip it for a quick log; the API is called only when wanted. A copy
with no key logs a listen with the button simply absent.

**One track per screen.** Name, stars, a heart, a note, a swipe to the next.
It matches the pace of the record and turned out better on a desk too, so it
is the only layout. The step is not skippable; nothing insists on a note for
every song.

**The score lives on the note screen.** There is no score step: the score is
the last line of the note, not a thing on its own.

**No question before the listen.** Where a record is from is decided by how
the listen started — the inbox says Submission, anything else is the library.

**Nothing is confirmed and nothing is lost, again.** The back caret saves a
draft if anything has been written. The browser's own copy is written on
every change and carries the tracklist; where two copies exist, the newer
wins.

**The one moment kept is the landing.** The cover you tap flies to where the
album screen draws it. Nothing waits on it. **No small cover in the header:**
the album screen is the art, and a thumbnail a screen above was the same
picture twice.

**The draft saves itself.** Three seconds after the last change, and on the
way out; a Save draft button was a thing to remember on a phone that locks
mid-sentence. Saving the entry waits for any draft write still in the air.

**The whole listen is one swipe.** Album → tracks → notes → preview, and back.
Nothing on the way forward is gated; only the save waits for an album note.

**The preview is the entry page.** FullPostPage, handed a row that does not
exist yet — no fetches, no comment controls — on its own sheet, reachable
from any step: the page so far is how you find out what the note still needs.
**Start session, Resume session:** the album screen's button knows whether
you have been in.

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

**Surprise stays parked, 2026-09-13.** Compare has both its homes now — the
page about a person for the whole journal, a feed row for one record — and
the card's offer to a visitor (2026-09-10) is gone with the `?from=` link.
Surprise's shake is still unbuilt and `/shuffle` works if typed.

**An overall hit rate for what you send, 2026-09-12.** Two numbers exist and
only one is complete: what you receive is fully known, what you send is only
what comes back through the feed. If it is ever built it says so plainly —
8 of the 11 sent have come back — never a percentage pretending to be whole.
A number that quietly undercounts is worse than one that admits its gap.

**The ten screensavers, 2026-09-06.** 2,500 lines of canvas nothing mounts
since the owner's pages went plain. Kept behind their one index rather than
deleted, on Miyel's call: wanted back as plates for the share printer.
Wiring them back is importing the array. The one exception to "no reader,
no file".

- Spotify Connect transport control (fragile: two API tightenings in eighteen
  months; needs per-copy client ID and Premium). After the deploy button.
- Video exports. The ffmpeg-and-timeouts reason is gone, 2026-09-12: a
  browser records its own canvas into an H.264 MP4 with no server, in
  about a second for four seconds of 1080×1920 (proved in Chromium, see
  NOTES). Still parked until a phone has posted one and a moving card
  earns it — motion that means something, not a screensaver.
- Manual now-playing override — say what is on without opening a listen. It
  covered vinyl and iOS Apple Music while Last.fm was the other beacon; with
  Last.fm gone it is the only way the beacon could ever mean *playing* rather
  than *being written about*, which is a bigger question than it was.
