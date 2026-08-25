'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { FlipHorizontal } from '@phosphor-icons/react';
import { useTheme } from '../components/main_components/Lightswitch';
import { useListeningBeacon } from '../hooks/useListeningBeacon';
import DotNav from '../components/main_components/DotNav';
import SiteNav from '../components/main_components/SiteNav';
import ListeningBeacon from '../components/main_components/ListeningBeacon';
import AlbumStrip from '../components/main_components/AlbumStrip';
import IdentityCard from '../components/main_components/IdentityCard';
import { useBookplate } from '../components/main_components/Bookplate';

function ScrollButton({ onClick, direction = 'down' }) {
  return (
    <button className="hp-scroll-btn" onClick={onClick} aria-label={direction === 'up' ? 'Scroll to previous screen' : 'Scroll to next screen'}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: direction === 'up' ? 'rotate(180deg)' : 'none' }}>
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </button>
  );
}

// The one control that turns the cover over. Deliberately a single button and
// not a pair of tabs: a card has two sides, and a thing with two sides is
// turned, not selected from. Phosphor's flip mark rather than a hand-drawn
// card, which at 13px read as a mushroom.
function FlipButton({ onClick, children }) {
  return (
    <button type="button" className="ln-pill hp-flip" onClick={onClick}>
      <FlipHorizontal size={14} weight="bold" aria-hidden="true" />
      {children}
    </button>
  );
}

export default function HomePage() {
  const { theme, toggle: toggleTheme } = useTheme();
  const { isLive } = useListeningBeacon();
  const { instagram_url } = useBookplate();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  // Whether the person looking at this is the person who writes it. Not a
  // permission check — the writing side guards itself — just what decides
  // whether the cover shows its extra line.
  const [authed, setAuthed] = useState(false);
  // How many submissions and comments are sitting unread. Null until asked,
  // so the line can hold its place without flashing a zero on the way.
  const [waiting, setWaiting] = useState(null);
  // Which way up the cover is. Front is the beacon — what is playing. Back is
  // the card — whose journal this is. Not a route, because it is not a
  // different page: it is the same page, turned over.
  const [flipped, setFlipped] = useState(false);
  // The counts printed on the back. Null until they land, so the card holds
  // the shape of its number rows rather than flashing zeros into them.
  const [stamps, setStamps] = useState(null);
  const screenOneRef = useRef(null);
  const screenTwoRef = useRef(null);

  const scrollToScreenTwo = () => {
    screenTwoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  useEffect(() => {
    fetch('/api/entries')
      .then(r => r.json())
      .then(data => {
        const list = Array.isArray(data) ? data : (data.entries || []);
        setEntries(list);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Five integers for the back of the card. Fetched on mount rather than on
  // first flip: it is a few hundred bytes, and a card that assembles itself
  // while you are looking at it is a worse card than one that was already
  // printed. A failure leaves stamps null and the card prints blank rules.
  useEffect(() => {
    fetch('/api/public/stamps')
      .then(r => (r.ok ? r.json() : null))
      .then(d => d && setStamps(d))
      .catch(() => {});
  }, []);

  // Asking on the cover rather than only on the writing pages does two jobs.
  // It decides whether to show the way in — and because /api/auth/check renews
  // an ageing wristband, simply opening the journal keeps the key alive. On a
  // home screen, where there is no address bar to sign in from, that is what
  // stops the door quietly locking itself.
  useEffect(() => {
    fetch('/api/auth/check')
      .then(r => r.json())
      .then(d => {
        setAuthed(!!d.authed);
        // Only asked once the wristband is confirmed — the endpoint answers
        // 401 to anyone else, and a failed request on every public visit is
        // noise in the log for no reason.
        if (d.authed) {
          fetch('/api/waiting')
            .then(r => (r.ok ? r.json() : null))
            .then(w => w && setWaiting(w))
            .catch(() => {});
        }
      })
      .catch(() => {});
  }, []);

  // SiteNav's logo, clicked from any other page, flags this via
  // sessionStorage before navigating here (a full page navigation can't
  // carry it as component state) — land on screen two instead of the
  // default screen one.
  useEffect(() => {
    if (sessionStorage.getItem('ln-goto') === 'screen-two') {
      sessionStorage.removeItem('ln-goto');
      scrollToScreenTwo();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logo = (
    <Link href="/" className="hp-logo" aria-label="Listening Notes">
      <img
        src="/Logo.png"
        alt="Listening Notes"
        style={{ filter: theme === 'dark' ? 'invert(1)' : 'none' }}
      />
    </Link>
  );

  // Experiment: same live-dot-on-the-period logo as screen two, but at
  // screen one's original 112px size, in place of the plain PNG logo.
  const screenOneLiveLogo = (
    <Link href="/" className="hp-logo hp-logo--live" aria-label="Listening Notes">
      <svg viewBox="76 96 241 140" className="hp-logo-mark hp-logo-mark--large" xmlns="http://www.w3.org/2000/svg">
        <path
          transform="translate(73.734177, 220.794814)"
          d="M 44.65625 0 C 37.46875 0 31.160156 -1.601562 25.734375 -4.8125 C 20.304688 -8.019531 16.097656 -12.28125 13.109375 -17.59375 C 10.128906 -22.90625 8.640625 -28.773438 8.640625 -35.203125 L 8.640625 -116.21875 L 36.53125 -116.21875 L 36.53125 -33.203125 C 36.53125 -30.546875 37.46875 -28.222656 39.34375 -26.234375 C 41.226562 -24.242188 43.550781 -23.25 46.3125 -23.25 L 77.03125 -23.25 L 77.03125 0 Z M 44.65625 0 "
        />
        <path
          transform="translate(153.915942, 220.794814)"
          d="M 91.96875 2 C 85 2 78.742188 0.476562 73.203125 -2.5625 C 67.671875 -5.613281 63.300781 -9.847656 60.09375 -15.265625 C 56.882812 -20.691406 55.28125 -26.835938 55.28125 -33.703125 L 55.28125 -84.5 C 55.28125 -86.269531 54.835938 -87.875 53.953125 -89.3125 C 53.066406 -90.75 51.90625 -91.910156 50.46875 -92.796875 C 49.03125 -93.679688 47.425781 -94.125 45.65625 -94.125 C 43.882812 -94.125 42.28125 -93.679688 40.84375 -92.796875 C 39.40625 -91.910156 38.269531 -90.75 37.4375 -89.3125 C 36.601562 -87.875 36.1875 -86.269531 36.1875 -84.5 L 36.1875 0 L 8.96875 0 L 8.96875 -82.515625 C 8.96875 -89.484375 10.539062 -95.625 13.6875 -100.9375 C 16.84375 -106.25 21.21875 -110.453125 26.8125 -113.546875 C 32.40625 -116.648438 38.6875 -118.203125 45.65625 -118.203125 C 52.738281 -118.203125 59.046875 -116.648438 64.578125 -113.546875 C 70.109375 -110.453125 74.476562 -106.25 77.6875 -100.9375 C 80.90625 -95.625 82.515625 -89.484375 82.515625 -82.515625 L 82.515625 -31.703125 C 82.515625 -29.929688 82.957031 -28.300781 83.84375 -26.8125 C 84.726562 -25.320312 85.859375 -24.160156 87.234375 -23.328125 C 88.617188 -22.492188 90.144531 -22.078125 91.8125 -22.078125 C 93.582031 -22.078125 95.210938 -22.492188 96.703125 -23.328125 C 98.203125 -24.160156 99.394531 -25.320312 100.28125 -26.8125 C 101.164062 -28.300781 101.609375 -29.929688 101.609375 -31.703125 L 101.609375 -116.21875 L 128.65625 -116.21875 L 128.65625 -33.703125 C 128.65625 -26.835938 127.050781 -20.691406 123.84375 -15.265625 C 120.632812 -9.847656 116.265625 -5.613281 110.734375 -2.5625 C 105.203125 0.476562 98.945312 2 91.96875 2 Z M 91.96875 2 "
        />
        <circle
          cx="297.0547"
          cy="216.71875"
          r="14.1328"
          className={'hp-logo-mark-dot' + (isLive ? ' hp-logo-mark-dot--live' : '')}
        />
      </svg>
    </Link>
  );

  function renderStrip(variant) {
    if (loading) {
      const gridClass = variant === 'grid' ? ' hp-strip--grid' : '';
      const trackGridClass = variant === 'grid' ? ' hp-strip-track--grid' : '';
      const tileGridClass = variant === 'grid' ? ' strip-tile--grid' : '';
      return (
        <div className={'hp-strip' + gridClass}>
          <div className={'hp-strip-track' + trackGridClass}>
            {Array.from({ length: variant === 'grid' ? 6 : 8 }).map((_, i) => (
              <div key={i} className={'strip-tile strip-tile--skeleton' + tileGridClass} />
            ))}
          </div>
        </div>
      );
    }
    return <AlbumStrip entries={entries} variant={variant} />;
  }

  // The writing entrance.
  //
  // There is no login button anywhere on this site, and that is deliberate. A
  // journal does not ask you who you are; it is already yours. Signed in, the
  // cover simply has one more line on it than it did before — you are not going
  // somewhere else, you are seeing the part of your own page that was always
  // there. Signed out it renders nothing at all, so a visitor sees a cover with
  // no seam in it.
  //
  // Getting the cookie the first time is a URL you type once. After that it
  // renews itself on every visit here.
  // Two lines, not four. Starting a listen makes something that doesn't exist
  // yet, so it has no home but here. Messages earns its place for a different
  // reason: it is the only one you need to see *without going to look*, and a
  // count on the cover means opening your journal is enough to learn someone
  // sent you something. Everything else — editing an entry, printing a card —
  // belongs on the entry it acts on, not stacked up here.
  const writingLine = authed && (
    <div className="hp-write-row">
      <Link href="/dashboard/echo" className="hp-write">+ Start a listen</Link>
      <Link href="/dashboard/inbox" className="hp-write">
        Messages
        {waiting?.total > 0 && <span className="hp-write-count">{waiting.total}</span>}
      </Link>
    </div>
  );

  // The two ways on from the strip. They repeat the dot nav deliberately —
  // the dots live at the top of the screen and read as chrome, and by the
  // time you've come to the end of the recent listens you want something to
  // do rather than somewhere to look. Held back until the entries land, so
  // they don't appear under a row of loading skeletons.
  const stripActions = !loading && entries.length > 0 && (
    <div className="hp-strip-actions">
      <Link href="/archive" className="ln-pill">See full archive</Link>
      <Link href="/submit" className="ln-pill">Submit an album</Link>
    </div>
  );

  // One card, described once, mounted on whichever of the two layouts is on
  // screen. Both are in the DOM at all times — the desktop and mobile markup
  // are separate trees toggled by display — so this is written as a function
  // rather than an element to keep the two instances honestly separate.
  const cardFace = () => (
    <IdentityCard stamps={stamps} onFlipBack={() => setFlipped(false)} />
  );

  return (
    <div className={'hp' + (flipped ? ' hp--flipped' : '')}>
      <style>{`
        /* Quiet enough to belong to the cover rather than sit on top of it —
           this is a line of the page, not a button pinned to it. */
        .hp-write {
          display: inline-flex;
          align-items: center;
          margin-top: 18px;
          padding: 9px 20px;
          border: 1px solid var(--border);
          border-radius: 999px;
          font-family: var(--font-mono);
          font-size: 10px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--ink-soft);
          text-decoration: none;
          background: transparent;
          transition: color 0.15s, border-color 0.15s;
        }
        .hp-write:hover { color: var(--ink); border-color: var(--ink-faint); }
        .hp-write:focus-visible { outline: 2px solid var(--ink-faint); outline-offset: 3px; }
        .hp-write-row { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; }

        /* The count is the point of the line, so it carries the one bit of
           colour on the cover. --fav is the same red the favourite heart
           uses; nothing else here competes with it. */
        /* ── The cover, both sides of it ─────────────────────────────────
           .idc-scene holds the perspective, .idc-flip is the sheet that turns,
           and the two faces are stacked in one grid cell so the box is as tall
           as the taller of them without anything being measured in JavaScript.

           z-index 91 is not arbitrary: the logo and the dot row carry that
           value so they paint over the fixed edge fades at 50, and putting them
           inside a transformed element makes their z-index local to it. The
           scene inherits the number they used to hold. .hp-corner stays at 100
           and so stays above the card. */
        .idc-scene {
          position: relative;
          z-index: 91;
          width: 100%;
          perspective: 1800px;
          display: flex;
          justify-content: center;
        }
        .idc-flip {
          position: relative;
          width: 100%;
          display: grid;
          transform-style: preserve-3d;
          transition: transform 0.72s cubic-bezier(0.42, 0.02, 0.18, 1);
        }
        .idc-flip--over { transform: rotateY(180deg); }
        .idc-face {
          grid-area: 1 / 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          /* Without this the far side of the sheet shows through the near one
             for the whole turn, and both sides read at once. */
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }
        /* The gap .hp-main used to hand these children directly, now that they
           are one level further in. */
        .idc-face--front { gap: 22px; }
        .idc-face--back { transform: rotateY(180deg); }

        /* Desktop gives the card a fixed height, because a card has one. It
           does not grow to fit what is written on it — the writing scrolls
           inside it instead, which is also what stops a long note from
           dragging the recent listens half a screen down the page. */
        @media (min-width: 769px) {
          /* Tall enough to print the whole card on a roomy screen, short
             enough to stay on a 13-inch one — below that the card keeps its
             shape and the writing scrolls inside it, which is the right way
             round for an object that has a fixed size. */
          .hp-desktop-layout .idc-scene { min-height: clamp(520px, calc(100vh - 110px), 860px); }
          .hp-desktop-layout .idc { height: clamp(520px, calc(100vh - 110px), 860px); }
        }

        /* On a phone the card fills screen one and scrolls inside itself. The
           document does not scroll here — screen one and screen two are snapped
           panes — so anything taller than the pane has to carry its own
           scroller or its bottom is unreachable. */
        @media (max-width: 768px) {
          .hp-screen--one .idc-scene {
            flex: 1;
            min-height: 0;
            width: 100%;
            /* Top clears the notch — the card runs to the edge of the pane and
               its masthead is the first thing on it, so without this the
               journal's name sits under the clock. Bottom clears the row of
               utility icons this screen parks on its lower edge. */
            padding: max(14px, calc(env(safe-area-inset-top) + 4px)) 18px 96px;
          }
          /* minmax(0, 1fr), not the default auto row: a grid row sized to its
             content treats height:100% on the child as a floor rather than a
             ceiling, so a card with more written on it than fits simply grew
             past the pane and slid its footer under the utility icons. This
             pins the row to the pane and hands the overflow to .idc-inner,
             which is the thing that knows how to scroll. */
          .hp-screen--one .idc-flip { height: 100%; grid-template-rows: minmax(0, 1fr); }
          .hp-screen--one .idc-face { min-height: 0; }
          .hp-screen--one .idc { height: 100%; max-height: 100%; }
          /* Above the turned card, which now owns the pane. */
          .hp-screen-one-controls { z-index: 95; }
        }

        /* The recent listens belong to the front of the cover. They sit outside
           the sheet that turns — a horizontal scroller inside a 3D transform is
           a bad idea on iOS — so they are faded out instead, which reads as the
           whole cover having gone over rather than a panel in the middle of it
           having changed. inert on the wrapper keeps them off the tab order
           while they are invisible. */
        .hp-strip,
        .hp-strip-actions { transition: opacity 0.4s ease, visibility 0s; }
        /* visibility, not just opacity: an invisible link is still tabbable and
           still read aloud. This takes them out of both, and delays the
           visibility switch until the fade has finished so it isn't a pop. */
        .hp--flipped .hp-strip,
        .hp--flipped .hp-strip-actions {
          opacity: 0;
          visibility: hidden;
          pointer-events: none;
          transition: opacity 0.32s ease, visibility 0s linear 0.32s;
        }

        .hp-flip { gap: 8px; }
        .hp-flip svg { color: var(--ink-faint); transition: color 0.15s; }
        .hp-flip:hover svg { color: var(--ink); }

        @media (prefers-reduced-motion: reduce) {
          .idc-flip { transition: none; }
        }

        .hp-write-count {
          margin-left: 7px;
          min-width: 16px;
          height: 16px;
          padding: 0 4px;
          border-radius: 999px;
          background: var(--fav);
          color: #fff;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 9px;
          letter-spacing: 0;
        }
      `}</style>

      <div className="hp-corner">
        {instagram_url && <a
          href={instagram_url}
          target="_blank"
          rel="noopener noreferrer"
          className="hp-icon-btn"
          aria-label="Instagram"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none"/></svg>
        </a>}
        <button className="hp-icon-btn" onClick={toggleTheme} aria-label="Toggle theme">
          {theme === 'dark' ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1111.21 3a7 7 0 109.79 9.79z"/></svg>
          )}
        </button>
      </div>

      <main className="hp-main hp-desktop-layout">
        <div className="idc-scene">
          <div className={'idc-flip' + (flipped ? ' idc-flip--over' : '')}>
            {/* inert on the side facing away: backface-visibility hides it from
                the eye, and nothing else. Without this the card's links stay in
                the tab order behind the beacon, and a screen reader reads both
                sides of the cover as one page. */}
            <div className="idc-face idc-face--front" inert={flipped ? true : undefined}>
              {logo}
              <DotNav />
              <div className="hp-dashboard">
                <div className="hp-dash-cell hp-dash-beacon">
                  <ListeningBeacon />
                </div>
              </div>
              {writingLine}
              <FlipButton onClick={() => setFlipped(true)}>Turn the card</FlipButton>
            </div>
            <div className="idc-face idc-face--back" inert={flipped ? undefined : true}>
              {cardFace()}
            </div>
          </div>
        </div>
        {renderStrip('scroll')}
        {stripActions}
      </main>

      <div className="hp-mobile-screens">
        <section className="hp-screen hp-screen--one" id="hp-screen-one" ref={screenOneRef}>
          <div className="idc-scene">
            <div className={'idc-flip' + (flipped ? ' idc-flip--over' : '')}>
              <div className="idc-face idc-face--front" inert={flipped ? true : undefined}>
                {screenOneLiveLogo}
                <div className="hp-dashboard">
                  <div className="hp-dash-cell hp-dash-beacon">
                    <ListeningBeacon statusAboveArt />
                  </div>
                </div>
                {writingLine}
                <FlipButton onClick={() => setFlipped(true)}>Turn the card</FlipButton>
              </div>
              <div className="idc-face idc-face--back" inert={flipped ? undefined : true}>
                {cardFace()}
              </div>
            </div>
          </div>
          <div className="hp-screen-one-controls">
            {instagram_url && <a
              href={instagram_url}
              target="_blank"
              rel="noopener noreferrer"
              className="hp-icon-btn"
              aria-label="Instagram"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none"/></svg>
            </a>}
            <ScrollButton onClick={scrollToScreenTwo} />
            <button className="hp-icon-btn" onClick={toggleTheme} aria-label="Toggle theme">
              {theme === 'dark' ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1111.21 3a7 7 0 109.79 9.79z"/></svg>
              )}
            </button>
          </div>
        </section>
        <section className="hp-screen hp-screen--two" ref={screenTwoRef}>
          <SiteNav />
          <DotNav />
          <div className="hp-screen-strip">
            <div className="hp-screen-strip-title">Recent Listens</div>
            {/* Inside the scroller, so they sit at the end of the listens
                rather than pinned under them. */}
            <div className="hp-screen-strip-scroll">
              {renderStrip('grid')}
              {stripActions}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
