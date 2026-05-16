'use client';

import { useListeningBeacon } from '../../hooks/useListeningBeacon';

export default function Hero() {
  const { track, isLive } = useListeningBeacon();
  const artUrl = track?.image || '';
  const trackName = track?.name || '';
  const artistName = track?.artist || '';

  return (
    <div className="hp-beacon">
      <div className="hp-beacon-art">
        {artUrl
          ? <img src={artUrl} alt={trackName} />
          : <div className="hp-beacon-art-ph">♪</div>
        }
      </div>
      <div className="hp-beacon-meta">
        <div className="hp-beacon-label">
          <span className={'hp-beacon-dot' + (isLive ? ' hp-beacon-dot--live' : '')} />
          {isLive ? 'Now listening' : 'Last played'}
        </div>
        <div className="hp-beacon-title">{trackName || '—'}</div>
        {artistName && <div className="hp-beacon-artist">{artistName}</div>}
      </div>
    </div>
  );
}
