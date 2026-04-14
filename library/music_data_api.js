export async function fetchTracklist(albumName, artistName) {
  try {
    const query = encodeURIComponent(`${albumName} ${artistName}`);
    const res = await fetch(`https://itunes.apple.com/search?term=${query}&entity=song&limit=50`);
    const data = await res.json();

    if (!data.results?.length) return null;

    // Find the most likely matching album by name
    const normalized = albumName.toLowerCase();
    const songs = data.results.filter(r =>
      r.wrapperType === 'track' &&
      r.collectionName?.toLowerCase().includes(normalized)
    );

    if (!songs.length) return null;

    // Sort by disc/track number and dedupe
    const seen = new Set();
    return songs
      .sort((a, b) => a.trackNumber - b.trackNumber)
      .filter(s => {
        if (seen.has(s.trackId)) return false;
        seen.add(s.trackId);
        return true;
      })
      .map(s => ({
        number: s.trackNumber,
        title: s.trackName,
        duration: s.trackTimeMillis ? Math.round(s.trackTimeMillis / 1000) : null
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

export async function searchArtistAlbums(artistQuery) {
  if (!artistQuery.trim()) return [];
  try {
    const searchRes = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(artistQuery)}&entity=musicArtist&limit=5`
    );
    const searchData = await searchRes.json();
    const artists = searchData.results || [];
    if (!artists.length) return [];

    const q = artistQuery.toLowerCase().trim();
    const best = artists.find(a => a.artistName.toLowerCase() === q) || artists[0];
    const artistId = best.artistId;
    const artistName = best.artistName;

    const lookupRes = await fetch(
      `https://itunes.apple.com/lookup?id=${artistId}&entity=album&limit=100`
    );
    const lookupData = await lookupRes.json();
    const results = (lookupData.results || []).filter(r => r.wrapperType === 'collection');

    const seen = new Set();
    const albums = [];
    for (const r of results) {
      if (!r.artworkUrl100) continue;
      const trackCount = r.trackCount || 0;
      if (trackCount > 0 && trackCount <= 3) continue;
      const name = r.collectionName || '';
      if (/- single$/i.test(name)) continue;
      const key = name.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (seen.has(key)) continue;
      seen.add(key);
      albums.push({
        name,
        artist: artistName,
        year: (r.releaseDate || '').slice(0, 4),
        trackCount,
        art: r.artworkUrl100.replace(/\d+x\d+bb/, '600x600bb'),
        artLarge: r.artworkUrl100.replace(/\d+x\d+bb/, '3000x3000bb'),
      });
    }
    albums.sort((a, b) => (b.year || '0').localeCompare(a.year || '0'));
    return albums.slice(0, 20);
  } catch { return []; }
}
