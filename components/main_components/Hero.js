'use client';

import { useEffect, useState } from 'react';
import { useListeningBeacon } from '../../hooks/useListeningBeacon';

export default function Hero() {
  const { track, isLive } = useListeningBeacon();
  const [panelOpen, setPanelOpen] = useState(false);
  const [recents, setRecents] = useState([]);

  // Pull the two tracks played just before the current one.
  useEffect(() => {
    async function fetchRecents() {
      try {
        const res = await fetch('https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=listeningnotes&api_key=f022ca293645cd4cf2beeb3be7ae4b6f&limit=5&format=json');
        const data = await res.json();
        const tracks = data?.recenttracks?.track || [];
        const nowPlaying = tracks.find(t => t['@attr']?.nowplaying);
        const past = tracks
          .filter(t => !t['@attr']?.nowplaying)
          .filter(t => !(nowPlaying && t.name === nowPlaying.name && t.artist['#text'] === nowPlaying.artist['#text']))
          .slice(0, 2)
          .map(t => ({
            name: t.name,
            artist: t.artist['#text'],
            art: t.image?.[2]?.['#text'] || '',
          }));
        setRecents(past);
      } catch {}
    }
    fetchRecents();
    const iv = setInterval(fetchRecents, 30000);
    return () => clearInterval(iv);
  }, []);

  const artUrl = track?.image || '';
  const trackName = track?.name || '';
  const artistName = track?.artist || '';

  return (
    <button
      className={'hp-beacon' + (panelOpen ? ' hp-beacon--open' : '')}
      onClick={() => setPanelOpen(v => !v)}
      aria-expanded={panelOpen}
      aria-label="Toggle recent tracks"
    >
      <div className="hp-beacon-row">
        <div className="hp-beacon-art">
          {artUrl
            ? <img src={artUrl} alt={trackName} />
            : <div className="hp-beacon-art-ph">♪</div>
          }
        </div>
        <div className="hp-beacon-body">
          <div className="hp-beacon-label">
            <span className={'hp-beacon-dot' + (isLive ? ' hp-beacon-dot--live' : '')} />
            {isLive ? 'Now listening' : 'Last played'}
          </div>
          <div className="hp-beacon-title">{trackName || '—'}</div>
          {artistName && <div className="hp-beacon-artist">{artistName}</div>}
        </div>
        <div
          className={'hp-beacon-eq' + (isLive ? ' hp-beacon-eq--live' : '')}
          aria-hidden="true"
        >
          <span /><span /><span /><span />
        </div>
      </div>

      <div className="hp-beacon-recent-wrap" aria-hidden={!panelOpen}>
        <div className="hp-beacon-recent">
          {recents.length === 0 ? (
            <div className="hp-beacon-recent-empty">No recent tracks.</div>
          ) : (
            recents.map((r, i) => (
              <div key={i} className="hp-beacon-recent-item">
                {r.art
                  ? <img src={r.art} alt={r.name} className="hp-beacon-recent-art" />
                  : <div className="hp-beacon-recent-art hp-beacon-recent-art--ph">♪</div>
                }
                <div className="hp-beacon-recent-meta">
                  <div className="hp-beacon-recent-track">{r.name}</div>
                  <div className="hp-beacon-recent-artist">{r.artist}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </button>
  );
}
