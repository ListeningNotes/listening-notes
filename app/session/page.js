// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// app/session/page.js
// Find the album, log the listen.
//
// One address for the whole thing. With nothing on the desk it is the picker:
// a search field and a grid of covers. Tap one and the same page becomes the
// listen — the cover settles into the header, and the four screens turn
// underneath it: the album, the tracks one at a time, the note and score, the
// preview. The record being listened to is kept in the browser, so a reload,
// a locked phone or a closed tab reopens where you were.
//
// ── Why it is not two pages any more ──────────────────────────────────────
// It was: /dashboard/echo found the album and /dashboard/echo/session took
// the notes, with a network of floating covers between them that assembled
// into the album art while research ran. Both were named for a character
// this software no longer has, and the ceremony between them was paid for on
// every listen. What is left is the function. The network survives as one of
// the dashboard's backgrounds.
//
// ── The one moment kept ───────────────────────────────────────────────────
// The cover you tap travels to the header and settles there. Half a second,
// one gesture, on the same curve the entry layer uses to slide in — enough to
// feel like this site without performing. Nothing waits on it: the album
// screen is already on and usable while the cover is still moving.
//
// ── Not a reduced version on a phone ──────────────────────────────────────
// Every screen holds one thing and runs full-bleed, on both devices. The
// difference between a phone and a desk is the width of the column, and
// nothing else — no step, field or mark exists on one and not the other.
//
// ── How it is usually reached ─────────────────────────────────────────────
// From the desk, as a layer: app/@layer/(.)session intercepts this address
// and draws this same component on the sheet an entry arrives on, so it
// slides in from the right and a swipe puts you back on the desk. Opened
// cold it is a page. Nothing here knows which; the one rule that differs —
// where the nav row sits — is CSS scoped to the layer.

'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useListeningSession, SESSION_STEPS, PENDING_KEY, saidSoAboutTheDesk, saidSoAboutTheEntry } from '../../hooks/useListeningSession';
import AlbumPicker from '../../components/session_components/AlbumPicker';
import SessionHeader from '../../components/session_components/SessionHeader';
import RecordContents from '../../components/session_components/steps/RecordContents';
import TrackNotes from '../../components/session_components/steps/TrackNotes';
import AlbumNotes from '../../components/session_components/steps/AlbumNotes';
import SessionPreview from '../../components/session_components/steps/SessionPreview';
import Trouble from '../../components/session_components/Trouble';
import { useBeforeLeaving } from '../../components/main_components/LayerEntry';
// TEMPORARY — the keyboard's frames, dev only. Out before merging.
import TapeMeasure from '../../components/main_components/TapeMeasure';

// How long the picked cover takes to reach the header. The step body slides in
// on the same curve at nearly the same length, so the two read as one move.
const LANDING_MS = 520;

export default function SessionPage() {
  const [authed, setAuthed]     = useState(false);
  const [checking, setChecking] = useState(true);

  // The record on the desk, or null for the picker. Mirrors the browser's copy
  // under PENDING_KEY; this is the one React renders from. Read once, here,
  // rather than in an effect: the first paint is the blank checking screen
  // whatever this holds, so the server and the browser cannot disagree.
  const [pending, setPending] = useState(() => {
    if (typeof window === 'undefined') return null;
    try {
      const stored = JSON.parse(localStorage.getItem(PENDING_KEY));
      return stored?.album ? stored : null;
    } catch { return null; }
  });

  const [step, setStep]       = useState(0);
  const [maxStep, setMaxStep] = useState(0);
  const [stepDir, setStepDir] = useState(1);   // 1 forward, -1 back — drives the slide

  // The reference's sheet. Closed on every change of record.


  // The cover in flight from the grid to the album screen: where it started,
  // where it is going, and whether it has been told to go.
  const [landing, setLanding] = useState(null);

  // A finger travelling across a screen. The tracks screen turns its own
  // pages and hands over at either end; everywhere else this turns the step.
  const swipe = useRef(null);

  const s = useListeningSession({ step });

  // Puts a record on the desk — or clears it, with null — and lands on the
  // step it was left at. Called from whatever caused the change: the door
  // opening on a record already there, a tap in the picker, the back caret.
  function show(record) {
    const at = s.beginListen(record?.album ? record : null);
    setStep(at);
    setMaxStep(at);
    setStepDir(1);
    setPending(record?.album ? record : null);
  }

  useEffect(() => {
    fetch('/api/auth/check')
      .then(r => r.json())
      .then(d => {
        const ok = !!d.authed;
        setAuthed(ok);
        // What was left on the desk — by the inbox, or by this page before a
        // reload — opens as soon as the door does.
        if (ok && pending?.album) show(pending);
      })
      .catch(() => {})
      .finally(() => setChecking(false));
  // Once, on arrival: the check is a question asked at the door, and what
  // was left on the desk is read then and only then.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The landing. The album screen renders in the same commit as the record,
  // so on the next frame its cover can be measured and the image told where to
  // go; a frame later it is told to go, and once it has arrived it is removed.
  // While it flies the album screen fades in rather than sliding, so the
  // measurement is of where the cover will be and not where it is mid-slide.
  // Timers live in a ref rather than this effect's cleanup, because the effect
  // runs again as soon as the target is written and a cleanup there would
  // cancel the journey.
  const landingTimers = useRef([]);
  useEffect(() => {
    if (!landing || landing.to) return;
    landingTimers.current.push(requestAnimationFrame(() => {
      // The header's own cover — the mini beacon. It used to be the album
      // screen's large one, and that screen is gone with the Overview; the
      // contents screen deliberately has no cover on it, because the beacon
      // already does (Miyel's contents brief, 2026-09-18). Queried rather
      // than handed down a ref, the way the cross measures the beacon it
      // flies a record into: the destination belongs to the header, not to
      // whichever screen happens to be underneath it.
      const slot = document.querySelector('.ses-cover');
      if (!slot) { setLanding(null); return; }
      const to = slot.getBoundingClientRect();
      setLanding(l => l && { ...l, to });
      landingTimers.current.push(requestAnimationFrame(() => setLanding(l => l && { ...l, go: true })));
      landingTimers.current.push(setTimeout(() => setLanding(null), LANDING_MS + 120));
    }));
  }, [landing]);
  useEffect(() => () => {
    landingTimers.current.forEach(id => { clearTimeout(id); cancelAnimationFrame(id); });
  }, []);

  // The listen is an entry now. Forgetting the pending record means a reload
  // opens the picker rather than a saved listen; the screen you are on keeps
  // its own copy until you leave.
  //
  // And then the desk clears itself, 2026-09-16, Miyel's, after the first real
  // listen: posting and then being left on the thing you just posted is a
  // screen with nothing left to do on it. Long enough to read the tick, then
  // back to the picker, which is where the next record is chosen and where an
  // unfinished one is waiting. The entry is on the wall; it does not need a
  // link out of the room it was written in.
  useEffect(() => {
    if (!s.saved) return undefined;
    try { localStorage.removeItem(PENDING_KEY); } catch { /* nothing to clear */ }
    saidSoAboutTheDesk();

    // ── Over the cross, the ending belongs to the cross ────────────────────
    // A listen opened from the beacon is a layer over the home pane, and the
    // pane never unmounted. So the record does not end here: it is handed
    // back, and the cross closes this layer, drops the cover into the journal
    // underneath and puts the record on the beacon captioned Last logged
    // (Miyel's beacon brief, item 4). Read it → and Log another are gone with
    // that, because the journal is where you have just landed and the picker
    // is one press of the beacon away.
    //
    // Asked of the page rather than passed in: the cross is either underneath
    // us or it is not, and that is exactly the question. Opened cold from a
    // bookmark there is no cross, no journal to fall into, and this keeps the
    // ending it already had — the tick, then the picker.
    if (document.querySelector('.hn')) {
      saidSoAboutTheEntry({
        slug: s.savedEntry?.slug || '',
        album: s.albumInput,
        artist: s.artistName,
        art: s.albumArt,
      });
      return undefined;
    }

    const t = setTimeout(() => { leave(); }, 1100);
    return () => clearTimeout(t);
  // leave is remade every render and listing it would restart the beat on
  // renders that changed nothing; the save is what this is waiting on.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.saved]);

  // From the picker: a record, and the box its cover was tapped in.
  function pick(record, from) {
    try { localStorage.setItem(PENDING_KEY, JSON.stringify(record)); } catch { /* the listen still opens */ }
    saidSoAboutTheDesk();
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (from && record.artUrl && !still) setLanding({ art: record.artUrl, from, to: null, go: false });
    show(record);
  }

  // A saved draft travels whole, so the session can put the notes back without
  // a second round trip.
  // `from` is the box of the cover on the tile that was pressed, so a resumed
  // draft flies into the header exactly as a searched record does. It was
  // hardcoded null, which meant every draft opened with no movement at all —
  // the same one-argument miss the cross had (2026-09-18).
  function resume(draft, from = null) {
    pick({
      album: draft.album,
      artist: draft.artist || '',
      year: draft.year || '',
      artUrl: draft.album_art || '',
      collectionId: draft.collection_id || null,
      genre: draft.genre || '',
      entryType: draft.entry_type || '',
      // The send this listen answers, if it came out of one, so finishing it
      // from the picker settles that send exactly as finishing it from the
      // inbox does (migrations/015).
      submissionId: draft.submission_id ?? null,
      draft,
    }, from);
  }

  // ── Putting the record down ───────────────────────────────────────────────
  // The × in the corner, on its second press (Miyel, 2026-09-18). Ending a
  // listen belongs in the listen: it lived on the beacon for an hour as a
  // second line under "Back to the listen" and that was two lines of words on
  // a screen whose whole job is one record.
  //
  // It is not the same thing as swiping the sheet away. Swiping is stepping
  // away — the record stays on the desk, the beacon says Last logged until
  // you come back, and coming back lands you on the step you left. This is
  // putting it down: the draft is saved, the desk is cleared, and the pane
  // you land on offers a new record rather than the old one.
  //
  // Two presses because it ends something, which is the same rule the discard
  // on a draft follows — and the second press says what it will do rather
  // than asking whether you are sure.
  const router = useRouter();

  // ── Putting the record down ──────────────────────────────────────────────
  // There is no × any more (2026-09-18). The way out of a listen is the pull
  // down that brought it up, which is the layer's own gesture and the one
  // every other sheet on this site already uses — Miyel: "I don't have them
  // anywhere else on the site, and swiping down is intuitive since the screen
  // comes up."
  //
  // Which means the draft has to be written by the gesture rather than by a
  // button, and a write that fails has to stop the sheet going. That is what
  // this registers: the layer asks before it moves, and a false answer leaves
  // the listen exactly where it is with Trouble showing why.
  const layered = useBeforeLeaving(async () => {
    if (!s.saved && !(await s.saveDraft())) return false;
    try { localStorage.removeItem(PENDING_KEY); } catch { /* nothing to clear */ }
    saidSoAboutTheDesk();
    return true;
  });


  // Back to the picker. Nothing is confirmed and nothing is lost: a listen with
  // writing on it is kept as a draft first, so it is waiting under Unfinished
  // when the picker comes back.
  async function leave() {
    // Kept, always — not only when something has been written. A record you
    // went and found is a record you meant to play, and losing the search
    // because you closed the screen before typing a word is the one thing
    // Miyel kept running into while testing (2026-09-18: "let's just let the
    // drafts build"). Drafts are cleared in a press each; a lost search is an
    // afternoon done twice.
    //
    // A draft that would not save keeps you here. The message is up, the
    // listen is still on screen behind it, and nothing has been cleared — so
    // pressing again after fixing whatever it was does the whole thing
    // properly. Leaving anyway would have thrown away the one copy of the
    // afternoon that is not on this device.
    if (!s.saved && !(await s.saveDraft())) return;
    try { localStorage.removeItem(PENDING_KEY); } catch { /* nothing to clear */ }
    saidSoAboutTheDesk();
    setLanding(null);
    show(null);
  }

  // Every step change goes through here so the slide knows which way to travel.
  function goToStep(n) {
    if (n < 0 || n >= SESSION_STEPS.length) return;
    setStepDir(n >= step ? 1 : -1);
    setStep(n);
    setMaxStep(m => Math.max(m, n));
  }

  // No gate on the way forward: the preview is worth a look at any moment,
  // and saving is what waits for an album note.
  function forward() { goToStep(step + 1); }

  function swipeStart(e) {
    if (e.touches.length !== 1) return;
    // A drag that begins on a rating belongs to the rating. Setting the
    // album's score is a horizontal drag of exactly the kind this listens
    // for, so without this the last inch of a five-star drag turned the page
    // to the preview (Miyel, 2026-09-18: "make sure scroll is frozen for
    // rating album stars as well"). The same guard the tracks screen got the
    // day before, and the same one the layer's pull-to-close uses: the row
    // says what it is with role="slider", so nothing here has to know where
    // the stars are. The track strip earns the same guard and says it with
    // `data-slide`, because a tablist cannot claim to be a slider — sliding
    // along it moves through the tracks (Strip in steps/TrackNotes.js).
    if (e.target?.closest?.('[role="slider"], [data-slide]')) { swipe.current = null; return; }
    // And a drag in the note you are writing is selecting words, not turning
    // the page (Miyel, 2026-09-22: "I cannot highlight text without changing
    // screens"). The tracks screen keeps the same rule for its own swipe.
    if (e.target === document.activeElement && e.target.closest?.('textarea, input')) { swipe.current = null; return; }
    const t = e.touches[0];
    // Where the page was when the finger landed: a pull down means leave only
    // from the top, the same rule the sheet's own pull follows.
    swipe.current = { x: t.clientX, y: t.clientY, top: window.scrollY <= 0 };
  }
  function swipeEnd(e) {
    const from = swipe.current;
    swipe.current = null;
    if (!from) return;
    // A long press that selected a word on the way is not a swipe either.
    const field = document.activeElement;
    if (field?.matches?.('textarea, input') && field.selectionStart !== field.selectionEnd) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - from.x;
    const dy = t.clientY - from.y;
    // ── Down, out of a listen with no sheet around it ─────────────────────
    // In the layer this is the layer's own job and doing it here as well
    // would put the record down twice. Opened cold there is no layer and no
    // pull, and since the × came off (2026-09-18) there would otherwise be no
    // way out of the page at all — so the same gesture is honoured here, from
    // the top of the screen, and `leave` writes the draft exactly as the
    // sheet's own way out does.
    if (!layered && from.top && dy > 80 && dy > Math.abs(dx) * 1.5) { leave(); return; }
    if (step === 1) return;   // the tracks screen has its own
    if (Math.abs(dx) < 56 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    if (dx < 0) forward(); else goToStep(step - 1);
  }

  // ── Nothing blank where a record is already in hand ─────────────────────
  // This returned an empty box for the whole of the wristband check — a few
  // hundred milliseconds — which is invisible when you arrive at an address
  // and ruinous when you arrive by pressing a record. The cover is in the air
  // at that moment, flying toward the header this screen has not drawn yet:
  // it looks for `.ses-cover`, finds a blank box, and is set down where it
  // is. Which is precisely what Miyel kept seeing and I kept failing to
  // explain — "the album art you choose goes to the placeholder, good, then
  // the session screen just opens from the bottom and the art is at the mini
  // beacon from that." The second half of the move was never running.
  //
  // So a listen that already has a record on the desk draws while the check
  // happens. There is nothing to hide: the record came out of this browser's
  // own storage, every route it will ask for checks the wristband itself, and
  // the redirect below still fires the moment the answer says no.
  if (checking && !pending?.album) return <div style={{ minHeight: '100dvh', background: 'var(--bg)' }} />;
  if (!checking && !authed) { if (typeof window !== 'undefined') window.location.replace('/login'); return null; }

  const open = !!pending?.album;

  // Where the flying cover is drawn this frame: at its start until told to go,
  // then translated and scaled onto the header's slot.
  let landingStyle = null;
  if (landing) {
    const { from, to, go } = landing;
    const travelling = go && to;
    const dx = travelling ? to.left - from.left : 0;
    const dy = travelling ? to.top - from.top : 0;
    const k  = travelling ? to.width / from.width : 1;
    landingStyle = {
      left: from.left, top: from.top, width: from.width, height: from.height,
      transform: `translate(${dx}px, ${dy}px) scale(${k})`,
      transition: travelling ? `transform ${LANDING_MS}ms cubic-bezier(0.22, 0.61, 0.36, 1)` : 'none',
    };
  }

  return (
    <div className="ses">
      <TapeMeasure />

      {!open ? (
        <AlbumPicker onPick={pick} onResume={resume} />
      ) : (
        <>
          <SessionHeader
            album={s.albumInput}
            artist={s.artistName}
            year={s.year}
            /* The beacon's two things, so the strip at the top of a listen is
               the beacon rather than a caption about it. The same song the
               needle is sending, read the same way. */
            art={s.albumArt}
            track={s.tracks?.[s.openTrack]?.title || ''}
            step={step}
            onStep={goToStep}
            /* ── Back to drafts, not out of the session ──────────────────
               Miyel, 2026-09-18, and it is the reframe the whole thing was
               missing: "the session is a new state… drafts is really the
               landing starting page, and being in a session needs to take me
               back to drafts. I'm tired of going in and then closing and
               having to restart a listen. When you're in session you might be
               listening to multiple albums."
               Out to the cross, where the picker is. The picker belongs on
               the pane again (see the Start a listen button in HomeNav) and
               that pane never stopped choosing while this was open, so
               closing this lands on the drafts it was started from. `leave`
               is the answer when a session was opened cold at this address
               and there is no pane under it — endListen asks which. */
            hasWriting={s.hasWriting}
          />

          <main className="ses-body" onTouchStart={swipeStart} onTouchEnd={swipeEnd}>
            {/* Keyed on step so each screen mounts fresh and slides in. */}
            <div key={step} className={'ses-step' + (landing ? ' ses-step--fade' : stepDir < 0 ? ' ses-step--back' : '')}>
              {/* Overview — the record's contents: the facts and the
                  tracklist. A step of its own, so a swipe reaches it like
                  every other screen in the listen (Miyel, 2026-09-18). */}
              {step === 0 && (
                <RecordContents
                  tracks={s.tracks} tracksLoading={s.tracksLoading} facts={s.facts}
                  trackRatings={s.trackRatings} trackFavorites={s.trackFavorites}
                  onPick={k => { s.setOpenTrack(k); goToStep(1); }}
                  onNext={() => goToStep(2)}
                  onLookAgain={s.lookAgain}
                  onHandTracks={s.takeHandTracks}
                />
              )}
              {step === 1 && (
                <TrackNotes
                  tracks={s.tracks} tracksLoading={s.tracksLoading}
                  trackNotes={s.trackNotes} setTrackNotes={s.setTrackNotes}
                  trackRatings={s.trackRatings} setTrackRatings={s.setTrackRatings}
                  trackFavorites={s.trackFavorites} setTrackFavorites={s.setTrackFavorites}
                  openTrack={s.openTrack} setOpenTrack={s.setOpenTrack}
                  onPrev={() => goToStep(0)}
                  onNext={() => goToStep(2)}
                />
              )}
              {step === 2 && (
                <AlbumNotes
                  tracks={s.tracks} trackRatings={s.trackRatings} trackFavorites={s.trackFavorites}
                  overallNotes={s.overallNotes} setOverallNotes={s.setOverallNotes}
                  rating={s.rating} setRating={s.setRating}
                  Masterpiece={s.Masterpiece}
                  Favorite={s.Favorite} setFavorite={s.setFavorite}
                  Formative={s.Formative} setFormative={s.setFormative}
                />
              )}
            </div>
          </main>

          {/* The preview stands over the whole session on its own sheet — the
              entry page needs the viewport. The notes screen stays mounted
              underneath, so the way back is instant. */}
          {step === 3 && (
            <SessionPreview
              album={s.albumInput} artist={s.artistName} year={s.year} albumArt={s.albumArt} genre={s.genre}
              overallNotes={s.overallNotes} hasWriting={s.hasWriting}
              rating={s.rating} Masterpiece={s.Masterpiece} Favorite={s.Favorite} Formative={s.Formative}
              entryType={s.entryType} receivedFrom={s.receivedFrom} receivedFromUrl={s.receivedFromUrl}
              tracks={s.tracks} trackRatings={s.trackRatings} trackFavorites={s.trackFavorites} trackNotes={s.trackNotes}
              saving={s.saving} saved={s.saved} savedEntry={s.savedEntry}
              doSave={s.doSave}
              onBack={() => goToStep(2)}
              onAnother={leave}
            />
          )}

          {/* The ? that opened a reference, and the sheet it opened, came out
              on 2026-09-18. See docs/RETIRED-PROMPTS.md: it was one of the two
              things here that spent money per press, and Miyel's call is that
              a phone beside the record does the same job. */}
        </>
      )}

      {landing && landingStyle && (
        <img src={landing.art} alt="" aria-hidden="true" className="ses-landing" style={landingStyle} />
      )}

      {/* Outside the picker/listen split on purpose: something can go wrong on
          either side of it, and the message is about the listen rather than
          about the screen it happened on. Last in the tree so it is over the
          preview's own sheet — the save that fails is pressed there, and an
          answer underneath the button that asked for it is no answer. */}
      <Trouble
        says={s.trouble?.says}
        because={s.trouble?.because}
        onClose={() => s.setTrouble(null)}
      />
    </div>
  );
}
