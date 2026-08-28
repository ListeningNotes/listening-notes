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

**Additive schema only — starting at the first install that is not ours.** Add columns forever,
never rename or drop. Copies in the wild have to survive migrations, and a
migration that fails is somebody's journal that stops opening.

**Before any copy exists, the database is a draft.** Dropping a dead column,
renaming a bad one, deleting a table nothing uses — all fine, and worth doing
while it is still free. The rule protects databases on machines nobody here can
reach; until Junior installs one there are none, and paying the cost of a rule
whose reason has not arrived yet is how a schema accumulates columns nobody
wanted to keep. Publishing the repo does not end the draft — somebody
installing from it does.

---

## Sharing

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
- Photo-QR on individual entries — works, but verification on mount makes pages
  sluggish. Store the winning version and band instead of re-verifying.
- Address book (`people` table) — turns journal compare from "paste a URL" into
  "pick a name."
