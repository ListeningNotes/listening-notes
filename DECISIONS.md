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

**`/get`, `/why`, `/specs` don't ship.** Drawer rule: blank on a fresh copy
means the page and its link don't render. These are Miyel's pages on Miyel's
copy.

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

**Additive schema only.** Add columns forever, never rename or drop. Copies in
the wild have to survive migrations.

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

**The feed is pull-based.** Every copy publishes `/feed.xml`; each copy goes
and checks. Nobody learns they were read, no server, no subscriptions.

**Two views: submissions and recent.** Submissions — who logged what you sent
and how they rated it — is the better default. It is smaller and warmer and
can't become a scroll.

**A shelf, not a river.** No counts, no badges, no unread state.

**`received_from` published per entry**, with a per-entry toggle for private
sends. Public credit is the default; quiet is a choice.

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
