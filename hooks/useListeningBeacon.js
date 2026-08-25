// hooks/useListeningBeacon.js
// Custom React hook that polls the Last.fm API to get the current listening status.
// Used by the ListeningBeacon on the homepage and the NavBeacon on entry pages.
//
// Returns:
// - track: { name, artist, image } — the current or last played track
// - isLive: boolean — true if a track is actively playing right now

'use client';

import { useEffect, useState } from 'react';
import { useBookplate } from '../components/main_components/Bookplate';

// ── CONFIGURATION ──────────────────────────────────────────────────────────
// The account is no longer named here — it comes from the journal's own
// details, so a copy watches its owner's listening rather than this one's.
// A journal with no Last.fm simply has no beacon, which is a supported answer
// and not a broken one.
//
// The key is still shared. It is read-only and public by design, but every
// copy hitting Last.fm with the same one shares a rate limit, so this wants
// moving into the settings drawer too before copies go out.
const LASTFM_API_KEY = 'f022ca293645cd4cf2beeb3be7ae4b6f'; // read-only, intentionally public
const REFRESH_MS = 15000;  // poll Last.fm every 15 seconds
const LIVE_TIMEOUT = 8000; // treat a track as "still live" for 8 seconds after it stops reporting

export function useListeningBeacon() {
  const { lastfm_user } = useBookplate();
  const [track, setTrack] = useState(null);   // the track object to display
  const [isLive, setIsLive] = useState(false); // whether something is actively playing

  useEffect(() => {
    // No account, no polling. Returning early rather than fetching a URL with
    // an empty user in it, which Last.fm answers with an error every 15
    // seconds forever. Nothing needs clearing on the way out: track and isLive
    // still hold their initial empty values, because without an account there
    // was never a poll to fill them.
    if (!lastfm_user) return;

    // These are local to the effect so they persist across polls without causing re-renders.
    // Using refs here instead of state prevents unnecessary re-renders on every poll.
    let lastLiveTimestamp = null; // when we last saw a nowplaying track
    let lastLiveData = null;      // the track data from the last nowplaying response
    let interval;

    async function fetch_() {
      try {
        // Fetch the most recent track for the account.
        // limit=1 means we only get the single most recent scrobble.
        const url = `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${encodeURIComponent(lastfm_user)}&api_key=${LASTFM_API_KEY}&limit=1&format=json`;
        const res = await fetch(url);
        const data = await res.json();
        const t = data?.recenttracks?.track?.[0];
        if (!t) { setIsLive(false); return; }

        // Last.fm marks the currently playing track with a nowplaying attribute
        const nowPlaying = t['@attr']?.nowplaying === 'true';

        const trackData = {
          name: t.name,
          artist: t.artist['#text'],
          // Prefer the large image (index 3), fall back to medium (index 2)
          image: t.image?.[3]?.['#text'] || t.image?.[2]?.['#text'] || '',
        };

        if (nowPlaying) {
          // Track is actively playing — update the live timestamp and show it
          lastLiveTimestamp = Date.now();
          lastLiveData = trackData;
          setTrack(trackData);
          setIsLive(true);
        } else {
          // Track is not playing. Check if we were live recently.
          // Last.fm sometimes has a brief delay before marking a track as stopped,
          // so we keep showing isLive for LIVE_TIMEOUT ms to avoid flickering.
          const elapsed = lastLiveTimestamp ? Date.now() - lastLiveTimestamp : Infinity;
          if (elapsed < LIVE_TIMEOUT && lastLiveData) {
            // Still within the grace window — keep showing the last live track
            setTrack(lastLiveData);
            setIsLive(false);
          } else {
            // Grace window expired — show the last scrobbled track as "last played"
            setTrack(trackData);
            setIsLive(false);
          }
        }
      } catch {
        // Silently fail — if Last.fm is unreachable the beacon just shows stale data
      }
    }

    fetch_(); // run immediately on mount
    interval = setInterval(fetch_, REFRESH_MS); // then poll every 15 seconds
    return () => clearInterval(interval); // cleanup when the component unmounts
  }, [lastfm_user]);

  return { track, isLive };
}