'use client';

import { useEffect, useRef, useState } from 'react';
import { useListeningBeacon } from '../../hooks/useListeningBeacon';

export default function ListeningBeacon({ compact = false }) {
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

  if (compact) {
    return (
      <div className="beacon-mini">
        <div className="beacon-mini-art">
          {artUrl
            ? <img src={artUrl} alt={trackName} className={'beacon-mini-img' + (!isLive ? ' beacon-art--idle' : '')} />
            : <div className="beacon-art-placeholder">♪</div>
          }
        </div>
        <div className="beacon-mini-meta">
          <div className="beacon-mini-track">
            <span className={'beacon-dot' + (isLive ? ' beacon-dot--live' : '')} />
            {trackName}
          </div>
          {artistName && <div className="beacon-mini-artist">{artistName}</div>}
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
        <div className={'beacon-art-wrap' + (isLive ? ' beacon-art-wrap--live' : '')}>
          {artUrl
            ? <img src={artUrl} alt={trackName} className={'beacon-art' + (!isLive ? ' beacon-art--idle' : '')} />
            : <div className="beacon-art-placeholder">♪</div>
          }
          {!isLive && artUrl && <div className="beacon-idle-overlay"><span>Last played</span></div>}
        </div>
        <div className="beacon-meta">
          <div className="beacon-status">
            <span className={'beacon-dot' + (isLive ? ' beacon-dot--live' : '')} />
            <span className="beacon-status-text">{isLive ? 'Now listening' : 'Not listening'}</span>
          </div>
          <div className="beacon-track">{trackName || '—'}</div>
          {artistName && <div className="beacon-artist">{artistName}</div>}
        </div>
      </button>
    </div>
  );
}
