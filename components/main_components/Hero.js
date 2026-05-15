'use client';

import { useListeningBeacon } from '../../hooks/useListeningBeacon';

export default function Hero() {
  const { track, isLive } = useListeningBeacon();
  const artUrl = track?.image || '';
  const trackName = track?.name || '';
  const artistName = track?.artist || '';

  return (
    <div className="hp-now-card">
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
    </div>
  );
}
