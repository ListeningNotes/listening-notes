'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useListeningBeacon } from '../../hooks/useListeningBeacon';

const MARQUEE_SPEED = 18;   // px/sec — slow, readable scroll pace
const MARQUEE_GAP = 48;     // px between the trailing copy and the next lap's leading copy
const MARQUEE_HOLD = 4;     // seconds paused at the cut-off (first-letter) state

// Long titles get a fixed-width lane instead of wrapping/ellipsis: hold at
// the cut-off (first-letter-visible) state for a fixed 4s, then scroll the
// whole title left in one continuous lap — off the left edge, a trailing
// copy following behind comes around to fill the gap — until it lands back
// on the exact starting position, then hold and repeat. The trailing copy
// makes the wrap seamless: translating by exactly one title-width + gap
// looks pixel-identical to the untranslated start, so the loop point is
// invisible. The hold needs to stay exactly 4s regardless of how long the
// lap takes, and CSS keyframe percentages can't be driven by custom
// properties — so each instance gets its own tiny generated @keyframes rule
// instead of a shared static one. Short titles that already fit just sit
// still, no animation, no trailing copy.
function MarqueeTitle({ text, clipClassName, textClassName }) {
  const clipRef = useRef(null);
  const trackRef = useRef(null);
  const textRef = useRef(null);
  const styleElRef = useRef(null);
  const [animating, setAnimating] = useState(false);
  const rawId = useId();
  const animName = 'marquee-' + rawId.replace(/[^a-zA-Z0-9]/g, '');

  useEffect(() => {
    const clip = clipRef.current;
    const track = trackRef.current;
    const el = textRef.current;
    if (!clip || !track || !el) return;

    if (!styleElRef.current) {
      const styleEl = document.createElement('style');
      document.head.appendChild(styleEl);
      styleElRef.current = styleEl;
    }
    const styleEl = styleElRef.current;

    const measure = () => {
      const overflow = el.scrollWidth - clip.clientWidth;
      if (overflow > 2) {
        const distance = el.scrollWidth + MARQUEE_GAP; // one full lap
        const scrollSeconds = Math.max(4, distance / MARQUEE_SPEED);
        const totalSeconds = MARQUEE_HOLD + scrollSeconds;
        const holdPct = (MARQUEE_HOLD / totalSeconds) * 100;
        styleEl.textContent = `@keyframes ${animName} {
          0%, ${holdPct}% { transform: translateX(0); }
          100% { transform: translateX(-${distance}px); }
        }`;
        track.style.animation = `${animName} ${totalSeconds.toFixed(2)}s linear infinite`;
        setAnimating(true);
      } else {
        track.style.animation = '';
        setAnimating(false);
      }
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [text, animName]);

  useEffect(() => () => styleElRef.current?.remove(), []);

  return (
    <div ref={clipRef} className={clipClassName + (animating ? ' is-marqueeing' : '')}>
      <div ref={trackRef} className="marquee-track">
        <span key={text} ref={textRef} className={textClassName}>{text}</span>
        {animating && <span className="marquee-track-gap" aria-hidden="true" />}
        {animating && <span className={textClassName} aria-hidden="true">{text}</span>}
      </div>
    </div>
  );
}

export default function ListeningBeacon({ compact = false, statusAboveArt = false }) {
  const { track: trackObj, isLive } = useListeningBeacon();
  const trackName = trackObj?.name || '—';
  const artistName = trackObj?.artist || '';
  const artUrl = trackObj?.image || '';
  const [panelOpen, setPanelOpen] = useState(false);
  const [recentStack, setRecentStack] = useState([]);
  const prevTrack = useRef(null);
  const prevArtRef = useRef('');

  // Pull recent tracks from last.fm and keep the last few past listens.
  useEffect(() => {
    async function fetchRecent() {
      try {
        const res = await fetch('https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=listeningnotes&api_key=f022ca293645cd4cf2beeb3be7ae4b6f&limit=6&format=json');
        const data = await res.json();
        const tracks = data?.recenttracks?.track || [];
        const nowPlaying = tracks.find(t => t['@attr']?.nowplaying);
        const past = tracks
          .filter(t => !t['@attr']?.nowplaying)
          .map(t => ({
            track: t.name,
            artist: t.artist['#text'],
            art: t.image?.[3]?.['#text'] || t.image?.[2]?.['#text'] || '',
          }))
          .filter(t => !(nowPlaying && t.track === nowPlaying.name && t.artist === nowPlaying.artist['#text']));
        setRecentStack(past.slice(0, 3));
      } catch (e) {}
    }
    fetchRecent();
    const interval = setInterval(fetchRecent, 30000);
    return () => clearInterval(interval);
  }, []);

  // When the current track changes, push the previous one onto the recent stack.
  useEffect(() => {
    if (!trackObj?.name) return;
    const key = trackObj.name + '|||' + trackObj.artist;
    if (key === prevTrack.current) return;
    if (prevTrack.current) {
      const [prevName, prevArtist] = prevTrack.current.split('|||');
      const prevArt = prevArtRef.current;
      setRecentStack(prev => {
        const newEntry = { track: prevName, artist: prevArtist, art: prevArt };
        const filtered = prev.filter(t => !(t.track === trackObj.name && t.artist === trackObj.artist));
        return [newEntry, ...filtered].slice(0, 3);
      });
    } else {
      setRecentStack(prev => prev.filter(t => !(t.track === trackObj.name && t.artist === trackObj.artist)));
    }
    prevTrack.current = key;
    prevArtRef.current = artUrl;
  }, [trackObj]);

  const sizes = [0.82, 0.68, 0.56];

  const statusLine = (
    <div className="beacon-status">
      <span className={'beacon-dot' + (isLive ? ' beacon-dot--live' : '')} />
      <span className="beacon-status-text">{isLive ? 'Now listening' : 'Not listening'}</span>
    </div>
  );

  if (compact) {
    return (
      <div className="beacon-mini-wrap">
        <div className="beacon-mini">
          <div className="beacon-mini-art">
            {artUrl
              ? <img src={artUrl} alt={trackName} className={'beacon-mini-img' + (!isLive ? ' beacon-art--idle' : '')} />
              : <div className="beacon-art-placeholder">♪</div>
            }
          </div>
          <div className="beacon-mini-meta">
            <MarqueeTitle
              text={trackName || '—'}
              clipClassName="beacon-mini-track-clip"
              textClassName="beacon-mini-track-text"
            />
            {artistName && <div className="beacon-mini-artist">{artistName}</div>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={'beacon-stage' + (panelOpen ? ' beacon-stage--open' : '')}>
      {recentStack.slice(0, 3).map((item, i) => (
        <div
          key={i}
          className="beacon-recent-tile"
          style={{ '--scale': sizes[i], '--delay': ((i + 1) * 0.08) + 's' }}
        >
          {item.art && <img src={item.art} alt={item.track} className="beacon-recent-art" />}
          <div className="beacon-recent-meta">
            <div className="beacon-recent-track">{item.track}</div>
            <div className="beacon-recent-artist">{item.artist}</div>
          </div>
        </div>
      ))}
      <button
        className="beacon-card beacon-card--main"
        onClick={() => setPanelOpen(v => !v)}
        aria-expanded={panelOpen}
        aria-label="Toggle recent listens"
      >
        {statusAboveArt && statusLine}
        <div className={'beacon-art-wrap' + (isLive ? ' beacon-art-wrap--live' : '')}>
          {artUrl
            ? <img src={artUrl} alt={trackName} className={'beacon-art' + (!isLive ? ' beacon-art--idle' : '')} />
            : <div className="beacon-art-placeholder">♪</div>
          }
          {!isLive && artUrl && <div className="beacon-idle-overlay"><span>Last played</span></div>}
        </div>
        <div className="beacon-meta">
          {!statusAboveArt && statusLine}
          <MarqueeTitle
            text={trackName || '—'}
            clipClassName="beacon-track-clip"
            textClassName="beacon-track"
          />
          {artistName && <div className="beacon-artist">{artistName}</div>}
        </div>
      </button>
    </div>
  );
}
