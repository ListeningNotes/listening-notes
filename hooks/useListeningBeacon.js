'use client';

import { useEffect, useState } from 'react';

const LASTFM_USER = 'listeningnotes';
const LASTFM_API_KEY = 'f022ca293645cd4cf2beeb3be7ae4b6f';
const REFRESH_MS = 15000;
const LIVE_TIMEOUT = 8000;

export function useListeningBeacon() {
  const [track, setTrack] = useState(null);
  const [isLive, setIsLive] = useState(false);
  const [lastLive, setLastLive] = useState(null);

  useEffect(() => {
    let lastLiveTimestamp = null;
    let lastLiveData = null;
    let interval;

    async function fetch_() {
      try {
        const url = `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${LASTFM_USER}&api_key=${LASTFM_API_KEY}&limit=1&format=json`;
        const res = await fetch(url);
        const data = await res.json();
        const t = data?.recenttracks?.track?.[0];
        if (!t) { setIsLive(false); return; }

        const nowPlaying = t['@attr']?.nowplaying === 'true';
        const trackData = {
          name: t.name,
          artist: t.artist['#text'],
          image: t.image?.[3]?.['#text'] || t.image?.[2]?.['#text'] || '',
        };

        if (nowPlaying) {
          lastLiveTimestamp = Date.now();
          lastLiveData = trackData;
          setTrack(trackData);
          setIsLive(true);
        } else {
          const elapsed = lastLiveTimestamp ? Date.now() - lastLiveTimestamp : Infinity;
          if (elapsed < LIVE_TIMEOUT && lastLiveData) {
            setTrack(lastLiveData);
            setIsLive(false);
          } else {
            setTrack(trackData);
            setIsLive(false);
          }
        }
      } catch {
        // silently fail
      }
    }

    fetch_();
    interval = setInterval(fetch_, REFRESH_MS);
    return () => clearInterval(interval);
  }, []);

  return { track, isLive };
}