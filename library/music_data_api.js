// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// Apple serves album art two ways, and entries in the database carry both:
//
//   raw origin   https://a1.mzstatic.com/r40/<path>
//   thumb service https://is1-ssl.mzstatic.com/image/thumb/<path>/<W>x<H>bb.jpg
//
// The <path> is the same in each, so any raw URL can be re-pointed at the
// thumb service and any thumb URL can be re-sized, just by rewriting around
// that shared middle. Everything else — Discogs, Bandcamp, Spotify's CDN,
// anything hand-pasted into the dashboard's album_art field — is returned
// untouched, because there's no equivalent resizing endpoint to send it to.
//
// This matters more than it looks. The raw URLs are full-resolution masters
// (one cover in the archive is 14MB) and the thumb URLs were being stored at
// 3000x3000. The archive grid renders every entry at once, so the page was
// pulling ~75MB of artwork to fill tiles a couple of hundred pixels wide.
// Sizing on the way out brings that to under 3MB.
const APPLE_THUMB = /^https?:\/\/[a-z0-9-]+\.mzstatic\.com\/image\/thumb\/(.+?)\/\d+x\d+bb\.(?:jpg|png)$/i;
const APPLE_RAW   = /^https?:\/\/[a-z0-9-]+\.mzstatic\.com\/r\d+\/(.+)$/i;

export function sizedAlbumArt(url, size = 600) {
  if (typeof url !== 'string' || !url) return url;
  const path = url.match(APPLE_THUMB)?.[1] ?? url.match(APPLE_RAW)?.[1];
  if (!path) return url;
  return `https://is1-ssl.mzstatic.com/image/thumb/${path}/${size}x${size}bb.jpg`;
}

// Pull the FULL, ordered tracklist from iTunes/Apple Music. Two steps:
//   1. find the album's collection (scored match, like fetchAlbumArtUrl)
//   2. look up that exact collection's songs — returns every track in order
// A bare song-search (the old approach) only returns a partial, relevance-
// ranked grab-bag across editions, which dropped and reordered tracks.
// Optional collectionId skips step 1 when the caller already has the exact id.
export async function fetchTracklist(albumName, artistName, collectionId = null) {
  try {
    let id = collectionId;

    if (!id) {
      const norm = s => String(s || '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, ' ').trim();
      const query = encodeURIComponent(`${artistName} ${albumName}`);
      const searchRes = await fetch(`https://itunes.apple.com/search?term=${query}&entity=album&limit=25`);
      const searchData = await searchRes.json();
      const results = (searchData.results || []).filter(r => r.wrapperType === 'collection' && r.collectionId);
      if (!results.length) return null;

      const nAlbum = norm(albumName), nArtist = norm(artistName);
      let best = null, bestScore = -Infinity;
      for (const r of results) {
        const ra = norm(r.collectionName || ''), rar = norm(r.artistName || '');
        let score = 0;
        if (ra === nAlbum) score += 40;
        else if (ra.includes(nAlbum) || nAlbum.includes(ra)) score += 20;
        if (rar === nArtist) score += 30;
        else if (rar.includes(nArtist) || nArtist.includes(rar)) score += 15;
        // Prefer a plain edition over deluxe/expanded when scores otherwise tie.
        if (/\b(deluxe|expanded|special|anniversary)\b/.test(ra)) score -= 3;
        if (score > bestScore) { bestScore = score; best = r; }
      }
      if (!best) return null;
      id = best.collectionId;
    }

    const lookupRes = await fetch(`https://itunes.apple.com/lookup?id=${id}&entity=song&limit=300`);
    const lookupData = await lookupRes.json();
    const songs = (lookupData.results || []).filter(r => r.wrapperType === 'track' && r.kind === 'song');
    if (!songs.length) return null;

    return songs
      .sort((a, b) => (a.discNumber || 1) - (b.discNumber || 1) || (a.trackNumber || 0) - (b.trackNumber || 0))
      .map((s, i) => ({
        number: i + 1,
        title: s.trackName,
        duration: s.trackTimeMillis ? Math.round(s.trackTimeMillis / 1000) : null,
      }));
  } catch { return null; }
}

export async function fetchAlbumArtUrl(albumName, artistName, year) {
  try {
    const norm = s => String(s || '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, ' ').trim();
    const soundtrackTerms = ['soundtrack', 'original motion picture', 'ost', 'music from', 'score'];
    const albumWords = albumName.replace(/[^a-zA-Z0-9 ]/g, ' ').trim().split(/\s+/);
    const searchAlbum = albumWords.length > 4 ? albumWords.slice(0, 4).join(' ') : albumName;
    const query = encodeURIComponent(`${artistName} ${searchAlbum}`);
    const res = await fetch(`https://itunes.apple.com/search?term=${query}&entity=album&limit=25`);
    const data = await res.json();
    const results = data.results || [];
    if (!results.length) return '';

    const normAlbum = norm(albumName);
    const normArtist = norm(artistName);
    const isSoundtrack = soundtrackTerms.some(t => normAlbum.includes(t));
    const yearNum = year ? parseInt(String(year).match(/\d{4}/)?.[0] || '', 10) : NaN;

    let best = null, bestScore = -Infinity;
    for (const r of results) {
      const rAlbum = norm(r.collectionName || '');
      const rArtist = norm(r.artistName || '');
      const rYear = parseInt((r.releaseDate || '').slice(0, 4), 10);
      let score = 0;
      if (rAlbum === normAlbum) score += 40;
      else if (rAlbum.includes(normAlbum) || normAlbum.includes(rAlbum)) score += 20;
      if (rArtist === normArtist) score += 30;
      else if (rArtist.includes(normArtist) || normArtist.includes(rArtist)) score += 15;
      else if (isSoundtrack) score += 10;
      if (!isNaN(yearNum) && !isNaN(rYear)) {
        if (rYear === yearNum) score += 20;
        else if (Math.abs(rYear - yearNum) <= 2) score += 8;
      }
      if (score > bestScore) { bestScore = score; best = r; }
    }
    if (best?.artworkUrl100) return best.artworkUrl100.replace(/\d+x\d+bb/, '3000x3000bb');
    return '';
  } catch { return ''; }
}

// Bracketed qualifiers that mean "another pressing of a record already in the
// list" rather than a different record — (Deluxe Edition), [2016 Remaster],
// (Mono & Stereo). Stripped only to work out what two rows have in common;
// the name shown is always the one Apple returned.
const EDITION_BRACKET = /\s*[([][^)\]]*\b(deluxe|expanded|remaster(?:ed)?|anniversary|edition|mono|stereo|reissue|bonus|special|ocular|feat\.?)\b[^)\]]*[)\]]/gi;

// Releases that aren't the album itself. Each still appears — a live record you
// actually want to log has to be reachable — but never above the record it was
// drawn from, which is what buried Pet Sounds under its own session box.
const NOT_THE_ALBUM = [
  [/\b(greatest hits|best of|very best|anthology|collection|compilation)\b/i, 30],
  [/\b(sessions|demos|outtakes|box set|rarities)\b/i, 24],
  [/\b(live|in concert|unplugged)\b/i, 20],
  [/\b(karaoke|tribute|instrumental versions?)\b/i, 45],
  [/\b(deluxe|expanded|remaster(?:ed)?|anniversary|mono & stereo)\b/i, 10],
  [/\b(remixes?|rmx)\b/i, 20],
  // Apple writes these both ways — "Isn't It Time - EP" and "Drill EP".
  [/(?:-\s*)?\bep$/i, 14],
];

const norm = s => String(s || '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, ' ').trim();
const words = s => norm(s).split(' ').filter(Boolean);

// Apple splits some genres finer than an archive this size can use — Adult
// Alternative, Alternative Folk and Alternative would each be a filter button
// matching one or two records. Folded here, at the source, so the archive's
// filter row stays readable. A genre typed by hand in the CMS is left as typed.
const GENRE_FOLD = {
  'adult alternative': 'Alternative',
  'alternative folk': 'Alternative',
  'hip-hop': 'Hip-Hop/Rap',
};

export function foldGenre(genre) {
  const g = String(genre || '').trim();
  return GENRE_FOLD[g.toLowerCase()] || g;
}

// Did what was typed name this artist, and if so, what's left over? "the beach
// boys" leaves nothing — a plain discography browse. "beach boys pet sounds"
// leaves ["pet","sounds"], which is what titles then get matched against.
// Returns null when the query doesn't really name the artist.
//
// The artist has to lead the query, which is how people type this: artist
// first, then the record. Merely containing the name isn't enough — searching
// "I'm In Your Mind Fuzz" turns up a band called Fuzz, and on a contains test
// their catalogue lands on top of the album actually being looked for. A
// leading "the" is ignored on both sides, so "beach boys pet sounds" still
// reaches The Beach Boys.
function residualTerms(query, artistName) {
  const noThe = t => (t[0] === 'the' ? t.slice(1) : t);
  const q = noThe(words(query));
  const a = noThe(words(artistName));
  if (!q.length || !a.length) return null;
  if (!a.every((t, i) => q[i] === t)) return null;
  return q.slice(a.length);
}

// How well a title answers the terms still outstanding.
function titleMatch(terms, albumName, artistName) {
  if (!terms.length) return 0;
  const a = norm(albumName);
  const both = `${norm(artistName)} ${a}`;
  const phrase = terms.join(' ');
  let score = 0;
  if (a === phrase) score += 100;
  else if (a.startsWith(phrase)) score += 70;
  else if (a.includes(phrase)) score += 55;
  score += (terms.filter(t => both.includes(t)).length / terms.length) * 40;
  return score;
}

// What a row has in common with other pressings of the same record.
function albumKey(name) {
  return norm(String(name).replace(EDITION_BRACKET, '')).replace(/\s+/g, '');
}

function editionPenalty(name) {
  return NOT_THE_ALBUM.reduce((sum, [re, cost]) => sum + (re.test(name) ? cost : 0), 0);
}

// One row per record, ranked by what was typed.
//
// Was artist-only: it searched entity=musicArtist, so typing an album title
// found nothing, then took that artist's releases newest-first and cut the list
// to 20. A long catalogue lost its own back half — I'm In Your Mind Fuzz sat at
// position 25 — and for the Beach Boys all twenty visible slots went to session
// boxes and reissues while Pet Sounds waited at 61.
//
// Now two searches run together: the artist's full catalogue, and a direct album
// title search. They're merged, pressings of one record collapse into it, and
// what's left is ranked rather than sorted by release date.
export async function searchAlbums(searchQuery) {
  const query = searchQuery.trim();
  if (!query) return [];
  try {
    const [byArtist, byTitle] = await Promise.all([
      // The artist's catalogue, when what was typed leads with an artist name.
      // Every returned artist is checked, not just the first: searching
      // "radiohead ok computer" hands back three string quartets and no
      // Radiohead, and trusting results[0] pulled in a stranger's catalogue.
      //
      // Apple's term search is an AND across the whole string, so "idles tangk"
      // matches no artist and no album and came back completely empty. When the
      // full query finds nobody, the leading words are tried on their own —
      // that's where the artist's name actually is.
      (async () => {
        // Longest leading run first, so "twelve foot ninja silent machine"
        // reaches Twelve Foot Ninja before it can reach a band called Twelve.
        // Runs under four characters are never tried at all — otherwise "i'm in
        // your mind fuzz" ends up at an artist named I.
        const lead = words(query);
        const attempts = [query];
        for (let n = lead.length - 1; n >= 1; n--) {
          const term = lead.slice(0, n).join(' ');
          if (term.length >= 4) attempts.push(term);
        }

        let best = null;
        // Capped so a long query can't turn one search into a dozen calls.
        for (const term of attempts.slice(0, 4)) {
          const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=musicArtist&limit=5`);
          const data = await res.json();
          best = (data.results || []).find(a => residualTerms(query, a.artistName || '') !== null);
          if (best) break;
        }
        if (!best) return [];
        // 200, not 100: a prolific artist's catalogue was being truncated by
        // the API before any of this code got to see it.
        const look = await fetch(`https://itunes.apple.com/lookup?id=${best.artistId}&entity=album&limit=200`);
        const lookData = await look.json();
        return (lookData.results || [])
          .filter(r => r.wrapperType === 'collection')
          .map(r => ({ ...r, artistName: r.artistName || best.artistName }));
      })(),
      // Albums whose title matches, whoever made them.
      (async () => {
        const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=album&limit=50`);
        const data = await res.json();
        return (data.results || []).filter(r => r.wrapperType === 'collection');
      })(),
    ]);

    // One entry per release before pressings are collapsed — the two searches
    // overlap heavily whenever the query names an artist.
    const byId = new Map();
    for (const r of [...byArtist, ...byTitle]) {
      if (!r.collectionId || !r.artworkUrl100) continue;
      const trackCount = r.trackCount || 0;
      if (trackCount > 0 && trackCount <= 3) continue;
      if (/- single$/i.test(r.collectionName || '')) continue;
      if (!byId.has(r.collectionId)) byId.set(r.collectionId, r);
    }

    // Collapse pressings. The row kept is the one that reads as the record
    // itself: fewest edition markers, and the earliest release among those —
    // a remaster carries the original's year, so this picks the real issue.
    const groups = new Map();
    for (const r of byId.values()) {
      const key = `${norm(r.artistName)}|${albumKey(r.collectionName)}`;
      const current = groups.get(key);
      if (!current) { groups.set(key, r); continue; }
      const mine = editionPenalty(r.collectionName || '');
      const theirs = editionPenalty(current.collectionName || '');
      const myYear = parseInt((r.releaseDate || '').slice(0, 4), 10) || 9999;
      const theirYear = parseInt((current.releaseDate || '').slice(0, 4), 10) || 9999;
      if (mine < theirs || (mine === theirs && myYear < theirYear)) groups.set(key, r);
    }

    let browsing = false;
    const albums = [...groups.values()].map(r => {
      const name = r.collectionName || '';
      const artist = r.artistName || '';
      // Asked per row rather than once for the whole search: does this row's
      // artist lead the query? If so the title only has to answer what's left
      // over — for a bare "the beach boys" that's nothing, so the catalogue
      // ties and edition and year decide the order.
      const rest = residualTerms(query, artist);
      const theirs = rest !== null;
      if (theirs && !rest.length) browsing = true;
      const terms = theirs ? rest : words(query);
      const title = titleMatch(terms, name, artist);
      return {
        name,
        artist,
        year: (r.releaseDate || '').slice(0, 4),
        trackCount: r.trackCount || 0,
        collectionId: r.collectionId,
        // Apple's own genre for the record. A controlled vocabulary — Rock,
        // Alternative, Hip-Hop/Rap — which is what makes it filterable, where
        // the briefing's free-text genre is a sentence and isn't.
        genre: foldGenre(r.primaryGenreName),
        art: r.artworkUrl100.replace(/\d+x\d+bb/, '600x600bb'),
        artLarge: r.artworkUrl100.replace(/\d+x\d+bb/, '3000x3000bb'),
        _theirs: theirs,
        _title: title,
        // 200 clears the highest a title can score (140), so once the query has
        // named an artist nobody else's record can outrank their own — which is
        // what put a covers album called Radiohead above Radiohead.
        _score: (theirs ? 200 : 0) + title - editionPenalty(name),
      };
    });

    // Nothing typed matches — usually the title search dragging in a stranger's
    // compilation. Someone else's record has to answer the title outright to
    // stand alongside the named artist's own, which is what keeps tribute and
    // covers albums off the top of "radiohead ok computer".
    const matched = albums.filter(a => a._theirs || a._title >= 55);

    // A bare artist name is a discography, and a discography reads forwards.
    // Sorting it newest-first was half the original complaint: the early records
    // are the ones being looked for, and they were the ones pushed to the back
    // behind every later compilation. With search terms present the score has
    // already decided the order and the year is only a tiebreak.
    matched.sort((a, b) => b._score - a._score || (browsing
      ? (a.year || '9999').localeCompare(b.year || '9999')
      : (b.year || '0').localeCompare(a.year || '0')));
    // The grid pages at 15, so this is four pages deep — enough to hold a long
    // discography without the old cliff at twenty.
    return matched.slice(0, 60).map(({ _score, _theirs, _title, ...album }) => album);
  } catch { return []; }
}
