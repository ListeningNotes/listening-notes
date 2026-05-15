'use client';

import { useEffect, useState } from 'react';
import { useListeningBeacon } from '../../hooks/useListeningBeacon';

export default function Hero() {
  const { track, isLive } = useListeningBeacon();
  const artUrl = track?.image || '';
  const trackName = track?.name || '';
  const artistName = track?.artist || '';

  const [panelOpen, setPanelOpen] = useState(false);
  const [recentStack, setRecentStack] = useState([]);

  useEffect(() => {
    async function fetchRecent() {
      try {
        const res = await fetch('https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=listeningnotes&api_key=f022ca293645cd4cf2beeb3be7ae4b6f&limit=6&format=json');
        const data = await res.json();
        const tracks = data?.recenttracks?.track || [];
        const nowPlaying = tracks.find(t => t['@attr']?.nowplaying);
        const past = tracks
          .filter(t => !t['@attr']?.nowplaying)
          .map(t => ({ track: t.name, artist: t.artist['#text'], art: t.image?.[2]?.['#text'] || '' }))
          .filter(t => !(nowPlaying && t.track === nowPlaying.name && t.artist === nowPlaying.artist['#text']));
        setRecentStack(past.slice(0, 3));
      } catch (e) {}
    }
    fetchRecent();
    const interval = setInterval(fetchRecent, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className={'hp-now-card' + (panelOpen ? ' hp-now-card--open' : '')}
      style={{ backdropFilter: 'blur(48px)', WebkitBackdropFilter: 'blur(48px)' }}
    >
      <button
        className="hp-now-row"
        onClick={() => setPanelOpen(v => !v)}
        aria-expanded={panelOpen}
        aria-label="Toggle recent listens"
      >
        <div className="hp-now-art">
          {artUrl
            ? <img src={artUrl} alt={trackName} />
            : <div className="hp-now-art-placeholder">♪</div>
          }
        </div>
        <div className="hp-now-meta">
          <div className="hp-now-label">
            <span className={'hp-pulse-dot' + (isLive ? ' hp-pulse-dot--live' : '')} />
            {isLive ? 'Now listening' : 'Last played'}
          </div>
          <h2 className="hp-now-title">{trackName || '—'}</h2>
          {artistName && <div className="hp-now-artist">{artistName}</div>}
        </div>
        <span className="hp-now-chevron" aria-hidden="true">{panelOpen ? '▴' : '▾'}</span>
      </button>

      {panelOpen && (
        <div className="hp-now-recent">
          <div className="hp-now-recent-label">Recent listens</div>
          {recentStack.length === 0 ? (
            <div className="hp-now-recent-empty">No recent listens.</div>
          ) : (
            recentStack.map((item, i) => (
              <div key={i} className="hp-now-recent-item">
                {item.art && <img src={item.art} alt={item.track} className="hp-now-recent-art" />}
                <div className="hp-now-recent-meta">
                  <div className="hp-now-recent-track">{item.track}</div>
                  <div className="hp-now-recent-artist">{item.artist}</div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
