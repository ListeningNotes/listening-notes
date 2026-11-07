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

// ── A cover's color, 2026-10-22 ────────────────────────────────────────────
// For the wall's By color (Journal.js), which reads each cover in the browser,
// and for the server's reading of a cover a page may not read
// (app/api/entries/[slug]/color) — one reading, so the two cannot disagree.
// Given a cover drawn at COLOR_SIDE pixels square, as RGBA bytes.
//
// The hue it has most of, each pixel counted by how vivid it is, the middle
// of the strongest ten degrees leant toward whichever neighbour is stronger
// so two covers of one color still line up by shade; and `plain` for a cover
// with hardly any color at all, which the wall puts after the colored ones,
// dark to light by `light`.
export const COLOR_SIDE = 24;
// How much color a cover has to have, on average across its pixels, to be a
// color at all. Set against the test copy's covers: thirteen read exactly
// none, and the line falls between Back to Black and Grey Oceans.
const COLOR_FLOOR = 0.08;

export function colorOfArt(px) {
  const bins = new Array(36).fill(0);
  let vivid = 0;
  let light = 0;
  const count = px.length / 4;
  for (let i = 0; i < px.length; i += 4) {
    const r = px[i] / 255, g = px[i + 1] / 255, b = px[i + 2] / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), chroma = max - min;
    light += (max + min) / 2;
    if (chroma < 0.1) continue;
    let hue = max === r ? ((g - b) / chroma) % 6 : max === g ? (b - r) / chroma + 2 : (r - g) / chroma + 4;
    hue = (hue * 60 + 360) % 360;
    bins[Math.floor(hue / 10)] += chroma;
    vivid += chroma;
  }
  light /= count;
  if (vivid / count < COLOR_FLOOR) return { hue: 0, light, plain: true };
  let peak = 0;
  bins.forEach((v, i) => { if (v > bins[peak]) peak = i; });
  const left = bins[(peak + 35) % 36], right = bins[(peak + 1) % 36];
  const hue = (peak * 10 + 5 + 5 * ((right - left) / (bins[peak] + left + right)) + 360) % 360;
  return { hue, light, plain: false };
}

// Read in the browser: Apple's covers let a page read their pixels, so a
// cover is drawn at COLOR_SIDE from a 60px copy and read as above. Null for
// a cover that will not be read (one kept somewhere else, a failed load).
// The wall's By color reads with this, and so does the home beacon's wash
// (HomeNav, 2026-10-23), so the two say one color for one cover.
export function readArtColor(address) {
  return new Promise(resolve => {
    if (typeof Image === 'undefined' || !address) { resolve(null); return; }
    const art = new Image();
    art.crossOrigin = 'anonymous';
    art.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = COLOR_SIDE; canvas.height = COLOR_SIDE;
        const pen = canvas.getContext('2d', { willReadFrequently: true });
        pen.drawImage(art, 0, 0, COLOR_SIDE, COLOR_SIDE);
        resolve(colorOfArt(pen.getImageData(0, 0, COLOR_SIDE, COLOR_SIDE).data));
      } catch {
        resolve(null);
      }
    };
    art.onerror = () => resolve(null);
    art.src = sizedAlbumArt(address, 60);
  });
}

// Pull the FULL, ordered tracklist from iTunes/Apple Music. Two steps:
//   1. find the album's collection (scored match, like fetchAlbumArtUrl)
//   2. look up that exact collection's songs — returns every track in order
// A bare song-search (the old approach) only returns a partial, relevance-
// ranked grab-bag across editions, which dropped and reordered tracks.
// Optional collectionId skips step 1 when the caller already has the exact id.
//
// ── The id is a hint, not a fact, 2026-09-27 ─────────────────────────────
// Apple re-lists records under new ids. A send carries the id the sender's
// copy found on the day, and a draft carries the id from the day the listen
// began — and either can be dead by the time it is asked for. A dead id used
// to answer "No tracklist found" while the name search would have found the
// record at once (Wlfgrl, sent 2026-09-14, opened from the inbox on the 27th).
// So a given id is tried first, and when it answers nothing the name search
// runs as though no id had been given. What comes back names the id that
// actually worked, so the caller can keep that one instead.
export async function fetchTracklist(albumName, artistName, collectionId = null) {
  try {
    const given = collectionId ? String(collectionId) : '';
    if (given) {
      const found = await songsOf(given);
      if (found) return found;
    }
    const id = await findCollectionId(albumName, artistName);
    if (!id || String(id) === given) return null;
    return await songsOf(id);
  } catch { return null; }
}

// Step 1: the record's id, from a search on the name, scored so the plain
// edition wins over the deluxe when both match. `norm` is the module's, below.
async function findCollectionId(albumName, artistName) {
  const query = encodeURIComponent(`${artistName} ${albumName}`);
  const searchRes = await fetch(`https://itunes.apple.com/search?term=${query}&entity=album&limit=25`);
  const searchData = await searchRes.json();
  const results = (searchData.results || []).filter(r => r.wrapperType === 'collection' && r.collectionId);
  if (!results.length) return fromTheArtist(albumName, artistName);

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
  // The album's name has to be in the answer for it to be this record.
  if (best && bestScore >= 20 + 15) return best.collectionId;
  return (await fromTheArtist(albumName, artistName)) || (best ? best.collectionId : null);
}

// ── When the search does not know the record, 2026-10-13 ──────────────────
// Apple's search index leaves some records out while the artist's own list
// still holds them: "King Krule The OOZ" finds nothing at all, and King
// Krule's albums include The OOZ. So the artist is found by name, their
// albums are read, and the one whose title is the album's is taken — only an
// exact title, since there is no search score here to weigh a near one.
async function fromTheArtist(albumName, artistName) {
  if (!artistName) return null;
  const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(artistName)}&entity=musicArtist&limit=5`);
  const data = await res.json();
  const artist = (data.results || []).find(a => norm(a.artistName) === norm(artistName));
  if (!artist) return null;
  const look = await fetch(`https://itunes.apple.com/lookup?id=${artist.artistId}&entity=album&limit=200`);
  const lookData = await look.json();
  const albums = (lookData.results || []).filter(r => r.wrapperType === 'collection' && norm(r.collectionName) === norm(albumName));
  // The record as it was made before its clean edit (songsOf, below).
  const record = albums.find(r => r.collectionExplicitness === 'explicit') || albums[0];
  return record?.collectionId || null;
}

// One lookup: the record's row and its songs in disc and track order. Null
// when Apple has no songs under the id — a retired id, or one that was never
// a record's.
async function editionOf(id) {
  const lookupRes = await fetch(`https://itunes.apple.com/lookup?id=${id}&entity=song&limit=300`);
  const lookupData = await lookupRes.json();
  const rows = lookupData.results || [];
  const songs = rows.filter(r => r.wrapperType === 'track' && r.kind === 'song');
  if (!songs.length) return null;
  songs.sort((a, b) => (a.discNumber || 1) - (b.discNumber || 1) || (a.trackNumber || 0) - (b.trackNumber || 0));
  // The same response carries the album row. It is what the contents screen
  // prints its facts from, so it is read here rather than fetched again —
  // one lookup, both halves (Miyel's contents brief, 2026-09-18).
  return { id: String(id), album: rows.find(r => r.wrapperType === 'collection') || null, songs };
}

// ── The record as it was made, 2026-10-30 ─────────────────────────────────
// A record with swearing on it is two on Apple, the explicit one and its
// clean edit, each with clips of its own. Apple's search now answers with
// the clean edit alone — DAMN., SOS and IGOR each came back clean and only
// clean, `explicit=Yes` or not — so every preview played the edit, bleeped
// (Miyel: "on the music previews, they're censored"). The artist's own list
// still holds both. So a clean edit is traded for its explicit twin there:
// the same title, the same year, the same number of songs where there is a
// choice. None found, and the clean edit stands.
async function uncutTwin(clean) {
  if (clean?.collectionExplicitness !== 'cleaned' || !clean.artistId) return null;
  try {
    const look = await fetch(`https://itunes.apple.com/lookup?id=${clean.artistId}&entity=album&limit=200`);
    const lookData = await look.json();
    const year = String(clean.releaseDate || '').slice(0, 4);
    const twins = (lookData.results || []).filter(r => r.wrapperType === 'collection'
      && r.collectionExplicitness === 'explicit'
      && norm(r.collectionName) === norm(clean.collectionName)
      && String(r.releaseDate || '').slice(0, 4) === year);
    const twin = twins.find(r => r.trackCount === clean.trackCount) || twins[0];
    return twin ? await editionOf(twin.collectionId) : null;
  } catch { return null; }
}

// Step 2: every song under one id, in order, with the record's facts off the
// same answer — the explicit twin's, where the id is a clean edit's.
async function songsOf(id) {
  const given = await editionOf(id);
  if (!given) return null;
  const uncut = await uncutTwin(given.album);
  const { album, songs } = uncut || given;
  // A clean edit sometimes renames a song, not only bleeps it. A title saved
  // off the edit is still that song, so each song keeps the edit's name for
  // it beside its own — only where the two lists line up song for song.
  const editNames = uncut && given.songs.length === songs.length ? given.songs.map(s => s.trackName) : null;
  return {
    tracks: songs
      .map((s, i) => ({
        number: i + 1,
        title: s.trackName,
        duration: s.trackTimeMillis ? Math.round(s.trackTimeMillis / 1000) : null,
        // Only where a record actually has more than one, so a draft saved
        // before this existed reads the same as one saved after.
        disc: s.discNumber && s.discNumber > 1 ? s.discNumber : undefined,
      })),
    facts: factsFrom(album),
    // The id these songs came from — the one worth keeping.
    collectionId: (uncut || given).id,
    // Thirty seconds of each song, and its address on Apple, for the previews
    // (hooks/useSnippet.js), 2026-10-13. Beside the tracks rather than on
    // them, so a listen's draft, which keeps `tracks`, never stores a link
    // Apple may retire. `edit` is the clean edit's title, where it differs.
    clips: songs.map((s, i) => ({
      title: s.trackName,
      edit: editNames && editNames[i] !== s.trackName ? editNames[i] : '',
      clip: s.previewUrl || '',
      songUrl: s.trackViewUrl || '',
    })),
    recordUrl: album?.collectionViewUrl || '',
  };
}

// The label, out of the copyright line. It reads like `P 2011 True Panther
// Sounds` — sometimes with a © instead, sometimes with the year elsewhere,
// sometimes with neither. The mark and the year come off and what is left is
// the label; if that is nothing, there is no label and the row is dropped
// rather than printed blank (Miyel's brief).
//
// ── The licensing clause ─────────────────────────────────────────────────
// A good half of them are not that simple. King Krule's reads `P 2011 King
// Krule under exclusive license to True Panther Sounds`, and stripping only
// the mark and the year leaves a sentence rather than a label. What is before
// the clause is the rights holder — usually the artist — and the label is
// what comes after. Checked against real copyright strings rather than
// guessed, including both spellings of licence, which Apple carries.
const HANDED_OVER = /\b(?:under (?:an? )?exclusive licen[cs]e(?: to)?|under licen[cs]e to|issued under licen[cs]e to|distributed by|marketed by)\b/i;

export function labelFrom(copyright) {
  let text = String(copyright || '');
  const parts = text.split(HANDED_OVER);
  if (parts.length > 1) text = parts[parts.length - 1];
  const bare = text
    .replace(/[℗©]/g, ' ')
    .replace(/\b(19|20)\d{2}\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    // A comma, dash or stop left at either end by what was removed.
    .replace(/^[-–,.\s]+|[-–,.\s]+$/g, '');
  return bare.length > 1 ? bare : '';
}

// What the contents screen prints. Everything here is already in the album
// row of an iTunes lookup; nothing is inferred and nothing is fetched twice.
function factsFrom(album) {
  if (!album) return {};
  return {
    released: album.releaseDate ? String(album.releaseDate).slice(0, 4) : '',
    genre: album.primaryGenreName || '',
    label: labelFrom(album.copyright),
  };
}

// The facts on their own, for a listen resumed from a draft — the tracks come
// back with the row and nothing re-fetches them, so this is the one thing the
// contents screen would otherwise have no way of knowing. One lookup, and
// only when there is a collection id to ask about.
export async function fetchAlbumFacts(collectionId) {
  if (!collectionId) return {};
  try {
    const res = await fetch(`https://itunes.apple.com/lookup?id=${collectionId}`);
    const data = await res.json();
    return factsFrom((data.results || []).find(r => r.wrapperType === 'collection'));
  } catch { return {}; }
}

export async function fetchAlbumArtUrl(albumName, artistName, year) {
  try {
    // Accents folded before anything else is stripped, so "bjork" reads Björk
// and "beyonce" reads Beyoncé. Without the fold the ö was thrown away with
// the punctuation and Björk's name came out as two words neither search
// could match, so typing her name without the umlaut found nothing at all.
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/&/g, 'and').replace(/[^a-z0-9]+/g, ' ').trim();
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

// Accents folded before anything else is stripped, so "bjork" reads Björk
// and "beyonce" reads Beyoncé. Without the fold the ö was thrown away with
// the punctuation and Björk's name came out as two words neither search
// could match, so typing her name without the umlaut found nothing at all.
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/&/g, 'and').replace(/[^a-z0-9]+/g, ' ').trim();
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

// The first words of an artist's name without the rest of it: "tyler flower
// boy" for Tyler, The Creator. Returns what the query says after them, or
// null. At least four letters of name, so "a" or "in" never names anybody,
// and never the whole name, which is residualTerms' answer.
function partlyNamed(query, artistName) {
  const noThe = t => (t[0] === 'the' ? t.slice(1) : t);
  const q = noThe(words(query));
  const a = noThe(words(artistName));
  let n = 0;
  while (n < a.length && n < q.length && q[n] === a[n]) n++;
  if (n === 0 || n >= a.length || n >= q.length) return null;
  if (q.slice(0, n).join(' ').length < 4) return null;
  return q.slice(n);
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

// ── One song search per query, shared ─────────────────────────────────────
// The picker asks for records and songs in the same moment (AlbumPicker), and
// the records read the song search as well now (searchAlbums, below), so the
// two share one request rather than asking Apple the same question twice.
// Only the last query is kept: this saves the second ask, it is not a cache.
let heardLast = null;
function songsHeard(query) {
  if (heardLast?.query === query) return heardLast.answer;
  const answer = fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=50`)
    .then(res => res.json())
    .then(data => data.results || []);
  heardLast = { query, answer };
  // A failed ask is forgotten, so the next one goes to Apple again.
  answer.catch(() => { if (heardLast?.answer === answer) heardLast = null; });
  return answer;
}

// Does a record answer what was typed: its artist named, all or in part, or
// its title? The test a record from the song search has to pass to be shown.
function answersQuery(query, albumName, artistName) {
  if (residualTerms(query, artistName) !== null) return true;
  const rest = partlyNamed(query, artistName);
  if (rest && titleMatch(rest, albumName, artistName) >= 55) return true;
  return titleMatch(words(query), albumName, artistName) >= 55;
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
//
// ── And the song search, 2026-10-17 ───────────────────────────────────────
// Miyel: "when I search for an album by its name, for example Flower Boy, I'm
// expecting Tyler, the Creator's Flower Boy to pop up, but it doesn't. Only
// songs from Flower Boy show up." Apple's album search does not have it: two
// hundred results for "flower boy", strangers' singles every one, and no
// Tyler. Where it does have the record it has no idea which one is meant —
// "in rainbows", "rumours", "blonde" and "ok computer" each put four or five
// strangers' records of that name above the one anybody is looking for,
// ordered by nothing but how recent they were. The song search is in Apple's
// order, the most played first, and Tyler's record is its first answer. So it
// is the third search: a record it turns up that answers what was typed joins
// the list, and how early and how often it turns up lifts the record — the
// only sign this code gets of which "Flower Boy" somebody means.
export async function searchAlbums(searchQuery) {
  const query = searchQuery.trim();
  if (!query) return [];
  try {
    const [byArtist, byTitle, heard] = await Promise.all([
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
        if (!best) return { named: '', rows: [] };
        // 200, not 100: a prolific artist's catalogue was being truncated by
        // the API before any of this code got to see it.
        const look = await fetch(`https://itunes.apple.com/lookup?id=${best.artistId}&entity=album&limit=200`);
        const lookData = await look.json();
        return {
          named: best.artistName || '',
          rows: (lookData.results || [])
            .filter(r => r.wrapperType === 'collection')
            .map(r => ({ ...r, artistName: r.artistName || best.artistName })),
        };
      })(),
      // Albums whose title matches, whoever made them.
      (async () => {
        const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=album&limit=50`);
        const data = await res.json();
        return (data.results || []).filter(r => r.wrapperType === 'collection');
      })(),
      // Songs, most played first. A failure here costs the ranking, never
      // the records the other two found.
      songsHeard(query).catch(() => []),
    ]);

    // ── How far up Apple puts each record, and each artist ────────────────
    // Two orders, both Apple's. The album search's own: where it has the
    // record it nearly always has it first — Ctrl, In Rainbows, Rumours, Kid
    // A and Abbey Road each came back at the top of it, and the ranking below
    // used to throw that order away and sort records of one name by how new
    // they were. And the song search's, for the records the album search
    // does not have at all, Flower Boy and IGOR among them: a song is worth
    // 120 at the head of the list and four less for every song above it, so
    // nothing past the thirtieth counts, and a record is worth what its songs
    // there add up to — added up, not the first alone, so the three of Frank
    // Ocean's that "blonde" brings outweigh the one title track of Alizée's
    // that comes a place before them. An artist is worth what their songs add
    // up to, for the question of which the query means (below).
    const songs = heard.filter(s => s.wrapperType === 'track' && s.kind === 'song' && s.collectionId);
    const recordPlays = new Map();
    const artistPlays = new Map();
    songs.forEach((s, i) => {
      const worth = Math.max(0, 120 - 4 * i);
      recordPlays.set(s.collectionId, (recordPlays.get(s.collectionId) || 0) + worth);
      const who = new Set([norm(s.artistName), norm(s.collectionArtistName)]);
      for (const key of who) if (key) artistPlays.set(key, (artistPlays.get(key) || 0) + worth);
    });
    const albumRank = new Map();
    byTitle.forEach((r, i) => { if (!albumRank.has(r.collectionId)) albumRank.set(r.collectionId, i); });

    // The records the songs turned up that the other two searches did not —
    // Flower Boy, for one — asked of Apple by their ids, because a record's
    // year and its length are the record's own and a song's can differ: a
    // track put out as a single ahead of its album carries the single's date,
    // and the year is half of what makes a record itself on the wall
    // (DECISIONS, A record is its title, its artist and its year). Ten at
    // most, and only ones that answer what was typed. One more request, and
    // only when there is something to ask about.
    const known = new Set([...byArtist.rows, ...byTitle].map(r => r.collectionId));
    const wanted = [];
    for (const s of songs) {
      if (wanted.length >= 10) break;
      if (known.has(s.collectionId) || wanted.includes(s.collectionId)) continue;
      if (/^various artists$/i.test(s.collectionArtistName || '')) continue;
      if (/- single$/i.test(s.collectionName || '')) continue;
      if (!answersQuery(query, s.collectionName || '', s.collectionArtistName || s.artistName || '')) continue;
      wanted.push(s.collectionId);
    }
    let byEar = [];
    if (wanted.length) {
      try {
        const res = await fetch(`https://itunes.apple.com/lookup?id=${wanted.join(',')}`);
        const data = await res.json();
        byEar = (data.results || []).filter(r => r.wrapperType === 'collection');
      } catch { /* the other two searches still stand */ }
    }

    // One entry per release before pressings are collapsed — the searches
    // overlap heavily whenever the query names an artist.
    const byId = new Map();
    for (const r of [...byArtist.rows, ...byTitle, ...byEar]) {
      if (!r.collectionId || !r.artworkUrl100) continue;
      const trackCount = r.trackCount || 0;
      if (trackCount > 0 && trackCount <= 3) continue;
      if (/- single$/i.test(r.collectionName || '')) continue;
      if (!byId.has(r.collectionId)) byId.set(r.collectionId, r);
    }

    // Collapse pressings. A row folds into a record already kept only when
    // the two are plausibly one record: either name carries an edition marker
    // (a bracketed qualifier, or one of the words in NOT_THE_ALBUM), or both
    // came out the same year — a remaster carries the original's year, so a
    // plainly titled reissue still folds in. Two plainly titled rows from
    // different years are two records and both stay, 2026-10-13: an artist
    // put out two records with one title, and the second never reached the
    // list because the first had already taken its key, so a friend could
    // send only one of them. The row kept for a record is the one that reads
    // as the record itself: fewest edition markers, and the earliest release
    // among those.
    const yearOf = r => parseInt((r.releaseDate || '').slice(0, 4), 10) || null;
    const marked = name => editionPenalty(name) > 0 || albumKey(name) !== norm(name).replace(/\s+/g, '');
    const onePressing = (a, b) => {
      if (marked(a.collectionName || '') || marked(b.collectionName || '')) return true;
      const ya = yearOf(a), yb = yearOf(b);
      return !ya || !yb || ya === yb;
    };
    // A record is as far up as the highest of its pressings, and played as
    // much as all of them together: the songs people play are often on the
    // deluxe one, and the row kept is the plain one.
    const groups = new Map();
    for (const r of byId.values()) {
      const key = `${norm(r.artistName)}|${albumKey(r.collectionName)}`;
      const kept = groups.get(key) || [];
      const at = kept.findIndex(k => onePressing(k.row, r));
      const rank = albumRank.get(r.collectionId) ?? Infinity;
      const plays = recordPlays.get(r.collectionId) || 0;
      if (at === -1) { kept.push({ row: r, rank, plays }); groups.set(key, kept); continue; }
      const slot = kept[at];
      slot.rank = Math.min(slot.rank, rank);
      slot.plays += plays;
      const mine = editionPenalty(r.collectionName || '');
      const theirs = editionPenalty(slot.row.collectionName || '');
      const myYear = yearOf(r) || 9999;
      const theirYear = yearOf(slot.row) || 9999;
      if (mine < theirs || (mine === theirs && myYear < theirYear)) slot.row = r;
    }

    const albums = [...groups.values()].flat().map(({ row: r, rank, plays }) => {
      const name = r.collectionName || '';
      const artist = r.artistName || '';
      // Asked per row rather than once for the whole search: does this row's
      // artist lead the query? If so the title only has to answer what's left
      // over — for a bare "the beach boys" that's nothing, so the catalogue
      // ties and edition and year decide the order.
      const rest = residualTerms(query, artist);
      const theirs = rest !== null;
      // Or only the start of the artist's name does, and the rest of the
      // query is the title: "tyler flower boy" found nothing at all, because
      // it names no artist whole and no record has all three words in it.
      const after = theirs ? null : partlyNamed(query, artist);
      const partTitle = after ? titleMatch(after, name, artist) : 0;
      const partly = partTitle >= 55;
      const terms = theirs ? rest : words(query);
      const title = partly ? partTitle : titleMatch(terms, name, artist);
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
        _partly: partly,
        _title: title,
        // Its songs, and its place in the album search: 100 at the top of
        // it and ten less a place, so the first ten count. Under a song at
        // the head of the list, because "igor" puts a stranger's Igor first
        // among albums and Tyler's first among songs, and Tyler's is meant.
        _plays: plays,
        _loved: plays + (Number.isFinite(rank) ? Math.max(0, 100 - 10 * rank) : 0),
        // The artist's name and nothing else: a discography, which reads by
        // date alone (below). And the whole date, not the year, so two
        // records from one year still fall in the order they came out.
        _bare: theirs && rest.length === 0,
        _date: r.releaseDate || '',
        _penalty: editionPenalty(name),
      };
    });

    // ── An artist, or a record by that name? ──────────────────────────────
    // The artist search answers first and its head start is worth more than
    // any title, which is right for "radiohead ok computer" and wrong when
    // the words are somebody's band as well as somebody else's record: "in
    // rainbows" is a band whose EP stood over Radiohead, "igor" an artist whose
    // own "Igor" stood over Tyler's. The songs say which is meant. If a record
    // that answers the query by its title is played more among them than the
    // artist the query named, the artist's head start goes. Weighed, not
    // first-come: a band called Nirvana keeps its name against one stranger's
    // song called Nirvana at the top, because the rest of the page is theirs.
    // With no songs to go on, nothing changes.
    const namedPlays = byArtist.named ? (artistPlays.get(norm(byArtist.named)) || 0) : 0;
    const titlePlays = Math.max(0, ...albums
      .filter(a => !a._theirs && (a._partly || a._title >= 55))
      .map(a => a._plays));
    const headStart = titlePlays > namedPlays ? 0 : 200;
    for (const a of albums) {
      // 200 clears the highest a title can score (140), so once the query has
      // named an artist nobody else's record can outrank their own — which is
      // what put a covers album called Radiohead above Radiohead. Half the
      // name earns less than the whole of it.
      const head = a._theirs ? headStart : a._partly ? 150 : 0;
      // How far up Apple puts it (above), counted to 120: a record people
      // play stands over a stranger's of the same name. Never as much as a
      // title answering outright (140), so among the records of an artist the
      // query named, the one it named comes first — "beyonce lemonade" put two
      // of her better-played records over Lemonade while this went higher.
      a._score = head + a._title + Math.min(120, a._loved) - a._penalty;
    }

    // Nothing typed matches — usually the title search dragging in a stranger's
    // compilation. Someone else's record has to answer the title outright to
    // stand alongside the named artist's own, which is what keeps tribute and
    // covers albums off the top of "radiohead ok computer".
    const matched = albums.filter(a => a._theirs || a._partly || a._title >= 55);

    // Newest first, always, 2026-09-03. A bare artist name is a discography,
    // and for a while it read forwards — the argument being that the early
    // records were the ones being looked for. On a wall of covers the other
    // way round is the one that reads: the newest record at the top, scrolling
    // back through the years. With search terms present the score has already
    // decided the order and the date is only a tiebreak.
    //
    // A discography is the date and nothing else, 2026-09-26. The edition
    // penalty was still ordering it, so a live record sank below the first
    // album it followed; Miyel: "albums should be newest to oldest."
    //
    // Two records level after all that — both at the most being heard can
    // add — go by how far up Apple put them before the count stopped, and
    // only then by date.
    matched.sort((a, b) => (a._bare && b._bare ? 0 : (b._score - a._score) || (b._loved - a._loved)) || b._date.localeCompare(a._date));
    // Sixty, which on a phone is seven pages of nine — enough to hold a long
    // discography without the old cliff at twenty.
    return matched.slice(0, 60).map(({ _score, _theirs, _partly, _title, _plays, _loved, _bare, _date, _penalty, ...album }) => album);
  } catch { return []; }
}

// ── Songs, 2026-09-24 ────────────────────────────────────────────────────
// The picker's second section, under the records: a track note starts from a
// song, and search is where people already look for one (the track-notes
// brief). Apple's own song search, in Apple's order, which for a song title
// or an artist's name is already the order anybody would want — the most
// played first (Miyel, 2026-09-26: "tracks by popularity").
//
// One row per song per record. The same song comes back once for the clean
// and once for the explicit version, and once more for every edition of the
// same record, and those collapse on the record's key the way pressings do
// in searchAlbums. A single and the album it is on are two records and stay
// two rows — which one a note belongs to is the keeper's to say by pressing
// it. A compilation is somebody else's record, so it is left out.
//
// Unlike searchAlbums, singles are the point here: "a single, something a
// friend sent" is the reason a track note exists.
//
// Thirty, from 2026-09-26: the picker pages them on a phone, five at a time,
// so a longer list costs nothing on screen. It was eight when eight was all
// there was room to show.
const SONGS_SHOWN = 30;

export async function searchSongs(searchQuery) {
  const query = searchQuery.trim();
  if (!query) return [];
  try {
    const results = await songsHeard(query);
    const seen = new Set();
    const songs = [];
    for (const r of results) {
      if (r.wrapperType !== 'track' || r.kind !== 'song') continue;
      if (!r.trackName || !r.collectionName || !r.artworkUrl100) continue;
      if (/^various artists$/i.test(r.collectionArtistName || '')) continue;
      const key = `${norm(r.trackName)}|${norm(r.artistName)}|${albumKey(r.collectionName)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      songs.push({
        title: r.trackName,
        // The record, under the names a record goes by everywhere else.
        name: r.collectionName,
        artist: r.artistName || '',
        year: (r.releaseDate || '').slice(0, 4),
        collectionId: r.collectionId || null,
        genre: foldGenre(r.primaryGenreName),
        art: r.artworkUrl100.replace(/\d+x\d+bb/, '600x600bb'),
        artLarge: r.artworkUrl100.replace(/\d+x\d+bb/, '3000x3000bb'),
      });
      if (songs.length >= SONGS_SHOWN) break;
    }
    return songs;
  } catch { return []; }
}
