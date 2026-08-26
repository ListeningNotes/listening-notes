// hooks/useListeningBeacon.js
// Custom React hook that polls the Last.fm API to get the current listening status.
// Used by the ListeningBeacon on the homepage and the NavBeacon on entry pages.
//
// Returns:
// - track: { name, artist, image } — the current or last played track
// - isLive: boolean — true if a track is actively playing right now
// - recentAlbums: the last three distinct records, most recent first, each with
//   the key the journal files albums under so a scrobble can be matched to an
//   entry without a round trip

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

// Enough history to find three different records in. Last.fm answers in tracks,
// and a record played through is a dozen tracks with the same cover on them —
// asking for six and showing what came back is how the old recent row ended up
// printing one album three times and looking broken.
const HISTORY = 25;
const RECENT_ALBUMS = 3;

// Last.fm answers "no cover" with a URL to a grey star rather than with
// nothing, so a missing cover arrives looking exactly like a present one and
// the row fills up with somebody else's placeholder. Every size of that star
// shares this hash.
const LASTFM_NO_ART = '2a96cbd8b46e442fc41c2b86b821562f';
const realArt = url => (url && !url.includes(LASTFM_NO_ART) ? url : '');

// The same key the database generates for every entry, written out in
// JavaScript so a scrobble can be matched against the journal without asking
// the server. Lower-cased, accents folded, & spelled out, everything that is
// not a letter or a digit collapsed to a single space. It has to agree with the
// album_key column in schema.sql — if that expression ever changes, this is the
// other half of it.
export function foldKey(text) {
  return String(text ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function albumKey(album, artist) {
  return foldKey(`${album ?? ''} ${artist ?? ''}`);
}

export function useListeningBeacon() {
  const { lastfm_user } = useBookplate();
  const [track, setTrack] = useState(null);   // the track object to display
  const [isLive, setIsLive] = useState(false); // whether something is actively playing
  // The last few records, in albums rather than tracks. Derived from the same
  // answer as the beacon rather than fetched separately: one poll, two things
  // read off it, half the requests against a key every copy of this software
  // shares.
  const [recentAlbums, setRecentAlbums] = useState([]);

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
        const url = `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${encodeURIComponent(lastfm_user)}&api_key=${LASTFM_API_KEY}&limit=${HISTORY}&format=json`;
        const res = await fetch(url);
        const data = await res.json();
        const list = data?.recenttracks?.track || [];
        const t = list[0];
        if (!t) { setIsLive(false); return; }

        // Three different records, most recent first. The one on the beacon is
        // skipped: it is already the largest thing on the page and does not
        // need repeating underneath itself at a third of the size.
        //
        // Told apart by album title alone, not by title and artist. The same
        // record can arrive credited two ways — the first time this ran, a
        // Bleach soundtrack was playing as 鷺巣詩郎 and sitting in the history
        // as Shiro Sagisu, so a title-and-artist key saw two records and drew
        // the one that was playing underneath itself. Two different albums
        // sharing a title is the rarer accident, and a smaller one.
        const playing = foldKey(t.album?.['#text']);
        const seen = new Set(playing ? [playing] : []);
        const albums = [];
        for (const item of list) {
          const album = item.album?.['#text'];
          if (!album) continue;
          const artist = item.artist?.['#text'] || '';
          const title = foldKey(album);
          if (!title || seen.has(title)) continue;
          seen.add(title);
          albums.push({
            // What the journal files this album under, for finding the entry,
            // and the title on its own, for when the artist is spelled
            // differently in the two places.
            key: albumKey(album, artist),
            title,
            album,
            artist,
            art: realArt(item.image?.[3]?.['#text']) || realArt(item.image?.[2]?.['#text']),
          });
          if (albums.length === RECENT_ALBUMS) break;
        }
        setRecentAlbums(albums);

        // Last.fm marks the currently playing track with a nowplaying attribute
        const nowPlaying = t['@attr']?.nowplaying === 'true';

        const trackData = {
          name: t.name,
          artist: t.artist['#text'],
          // Prefer the large image (index 3), fall back to medium (index 2)
          image: realArt(t.image?.[3]?.['#text']) || realArt(t.image?.[2]?.['#text']),
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

  return { track, isLive, recentAlbums };
}