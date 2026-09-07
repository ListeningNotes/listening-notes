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
both Apple's and Last.fm's terms.

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
stay as they are; rewriting them is a force push that breaks every clone.

---

## Structure

**Cross navigation.** Beacon is home. Down → journal (only from the beacon).
Left → About. Right → the desk when logged in, the pitch pane when logged out.

**The cross is one route, not three.** A swipe that navigated would unmount
the pane being left and lose its scroll. The gesture has to be continuous and
reversible, so all three panes stay mounted: home is a horizontal scroll
container and the browser does the physics. Entries stay real routes — an
entry has an address you can send somebody and a pane does not.

**Panes are named after the routes they absorb**, and those routes mount the
same component the pane does: `/archive` → Journal, `/about` → About. One
description of each thing, two places it can be reached.

**Edge carets, not a dot indicator.** A swipe is invisible; a caret pinned to
an edge says there is something that way, and pressing it does what swiping
does — which is how the swipe gets learned.

**The down caret is drawn by measuring the pane, never by being told.** A pane
is deep when its scroller overflows, so a fresh copy with nothing under the
card has nothing pointing down at it, for free.

**Vertical snapping is `proximity`, not `mandatory`.** The centre pane is three
screens and a bit — a whole archive under the beacon — and mandatory would
drag a reader back to a screen edge every time they stopped halfway down.

**The mark is large and centred at the top of every pane, at one height,** so
the square under it — portrait on the left, album in the centre — lands on
the same line whichever pane you are on. That is what makes the swipe read as
one object turning. On desktop the outer crowns are hidden, not removed: the
box has to stay or the columns stop agreeing where a square starts.

**Desktop is the same three components as three columns.** Not a second
layout. The site already carried two homepage trees that had drifted apart.

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

**The beacon stops captioning itself.** "Now listening" said what the screen
shows: a record, on a page whose mark carries a lit dot while something
plays. The idle state greys the art and prints "last played" across it, and
that label is never green — green means something *is* playing.

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

**`source_entry_id` is lineage, not association.** It points at *the sender's
entry for the same album*, never at the entry that prompted the send, so
walking it upward gives one record's whole history; a valid value must share
the entry's `album_key`, enforced on write. `null` means origin. Association
would need its own column, `prompted_by` — parked, not built.

**Lineage is written once; the rest of the chain is editable.** `received_from`
and `received_date` are corrections. `source_entry_id` is not: either their
entry led to yours or it did not, and lineage anyone can rewrite is a record
of nothing. Set while empty and never again — the `WRITE_ONCE` rule `serial`
and `founded_at` use — and dropped silently if sent again.

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
the password gate.

**The Share door and the Instagram exporter behind it are gone, 2026-09-06.**
Sharing is an entry's own link and the card, not a page the owner exports
slides from. The desk is Start a listen, Inbox, Settings. The slide drawing
lives in git and on the `share-printer` branch if a cover plate is wanted.

**The printer's door ships before the printer, 2026-09-06.** The glyph beside
the pencil, on an entry and on the card, opens `/printer`, which says the
press is coming — so the press lands where people have already been
pressing. `?entry=slug` travels from an entry; the card sends nobody,
meaning the profile.

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

**Source link on every copy** — one faint line at the foot of the About pane.
Satisfies AGPL §13 whether or not anyone has modified anything. **It is an
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

**The cross's gesture problem is unsolved, and three things are ruled out,
2026-08-29.** Wanted: down should feel like arriving, and you should not slide
sideways out of a pane's lower half. Do not try again: `touch-action` on the
rail (Safari ignores it for the container's own axis); `overflow-x: hidden`
while a pane is scrolled (stops the vertical scroll dead — the stutter); a
hand-rolled horizontal drag (loses to native momentum). `scroll-snap-type: x
mandatory` is load-bearing — proximity stops landing on a pane at all. A
two-screen pane needs the axis problem solved first.

**An entry is a layer over the journal, not a fourth pane, 2026-08-29.** Left
and right meaning different things depending on which row you are in is ruled
out: that is a mode, and modes make gesture navigation unlearnable.

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

**The layer has no close button.** A corner cross took the lights' place; a
bottom caret sat on the entry's scroll cue. What is left is the pull down,
Escape and back, which is what people reach for anyway.

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
wide for a strip that has to leave room for an album title.

---

## The journal

**Three flags: Masterpiece, Favorite, Formative.** Each answers a different
question — the record, the track, your life. Not extensible; this is
deliberate. **Considered and rejected as flags:** Unfinished (needs a rating
exception and collides with "a journal of things worth writing about"), Live,
Sleeper, Comfort.

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

**The cover is the control.** While a correction is open the album art is a
button: press it and the address opens underneath, with "Find it again"
re-asking Apple with the album and artist as now corrected — a wrong cover is
nearly always a wrong match. Outside a correction the cover is a picture.

---

## Sharing

**Two different things were sharing one word, 2026-08-28.** Addresses travel
freely, contents do not. **The printer** makes an artifact out of the owner's
writing: owner-only, server-checked, in the header. **Copy link and QR** pass
along an address: available to anyone, at the foot of an entry.

**Cards carry the mark only — no URL.** Printing the address on everyone's
cards advertises Miyel, not the software. **Two different QRs:** a journal's
About QR shares that person; the pitch pane's is a fixed code to `/get`, the
same on every copy.

**The photo QR: the photograph carries the dark modules, the finders stay
sharp, and it is verified by decoding.** Dark modules are scattered and read
as pixels of photo; light ones form regions and read as holes. A floor lifts
the shadows so one asset works on both themes; album art needs a band clamp,
not a floor, because covers vary more than faces. Rounded finders break
detection. Three broken QR pages were published in one session by eyeballing.

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

**`received_from` is published per entry**, with a per-entry toggle for
private sends. Public credit is the default; quiet is a choice.

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
send form, the comment form and later Compare — fill it in once on any journal
and it is prefilled on every journal after.

**It cannot be filled in from the sender's session, and that is the
architecture working.** Cookies are scoped per origin, so no copy can see
what another set — which is exactly what stops anyone being followed from one
journal to the next. Per browser, not per person; the cost is one paste.

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

**Each copy brings its own Last.fm key, read server-side.** `LASTFM_KEY` is
never `NEXT_PUBLIC_`: the key identifies the application, so a hardcoded one
means every copy shares one rate limit. The browser talks to
`/api/public/beacon`. The username stays in settings — a choice, not a secret.

**One beacon poll per page, shared, not one per component.** The timer lives
in the module with components subscribed to it, and the server caches the
upstream answer for ten seconds.

**No banner or message system pushed into copies.** That would require every
copy to phone home, producing a log of who is running one. Updates surface
by checking public GitHub releases.

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
2026-09-02.** The pitch's "Sign in" line when you are out; the desk's Settings
door when you are in. `/settings` signed out *is* the sign-in; `/login` stays
as the address form. No gesture on the logo, on Miyel's call: the lock, not
the door's placement, is what protects the room. (Three taps on the mark came
before this; the archive has them.)

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
2026-09-01.** Name → photo → prompts → Last.fm → links → rig → password. The
address is the host the request came in on and the founding date is the day
setup ran — an editable date anyone can set says nothing. Skip means later:
every field that can be skipped has a home afterwards, in Settings.

**The handle is derived and the serial is minted; neither is asked.** A second
name is the mistake `journal_name` made. The serial is the copy's identity and
random: anything derived from a name or a date is frozen wrong the moment
either is corrected, and `WRITE_ONCE` means no second chance.

**One owner row, and the guard is "the table is empty", not "this handle is
free".** `ON CONFLICT (handle)` stops a duplicate name and not a second owner.
Everything downstream reads the owner as `ORDER BY id LIMIT 1`. **Setup does
not reopen** once claimed, rather than showing a form that appears to save
`serial` and `founded_at` and silently drops both.

**Settings is the machinery, reached from the desk.** The address, Last.fm,
the Anthropic key, the password, the home-screen step. The card's own fields
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

**No Last.fm means the journal is the first screen.** No beacon screen at all;
the wall sits directly under the crown. Nothing pretending something might
play — which is why the empty-journal state was the first thing to write.

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
one statement per call, and splitting on semicolons means parsing `DO` blocks.

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

**Compare and Surprise stay parked until Junior has a copy, 2026-09-06.**
Both routes work if typed; nothing reaches them. Not cut, not built: a
comparison needs a second journal to design against, and the first one that
is not Miyel's is the one to design for.

**The ten screensavers, 2026-09-06.** 2,500 lines of canvas nothing mounts
since the owner's pages went plain. Kept behind their one index rather than
deleted, on Miyel's call: wanted back as plates for the share printer.
Wiring them back is importing the array. The one exception to "no reader,
no file".

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
