// SPDX-License-Identifier: AGPL-3.0-or-later
// library/baton.js
// Carries an in-flight research call across the jump from the album picker to
// the session page. The picker starts the request the moment you choose an
// album; a moment later the session page picks up that same request instead of
// starting a cold one — so the pre-listen questions and the loading animation
// are spent waiting on work that's already underway rather than in front of it.
//
// Module scope survives client-side navigation (both pages run in the same JS
// context), so a plain variable is enough. A hard reload clears it, which is
// correct: there'd be no live request left to inherit.

let carried = null;

const keyFor = (album, artist) => `${album}\u0000${artist}`.trim().toLowerCase();

// Starts the research request and holds onto it. Safe to call and never collect
// — if nobody takes the baton, the request simply finishes and is dropped.
// refresh:true bypasses the stored briefing and researches the album again.
export function handOff(album, artist, { refresh = false } = {}) {
  const entry = { key: keyFor(album, artist), latest: null, error: null, finished: false, listener: null };
  carried = entry;

  const emit = () => entry.listener?.(entry.latest, entry.error, entry.finished);

  (async () => {
    try {
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ album, artist, refresh }),
      });
      if (!res.ok) {
        throw new Error(res.status === 401 ? 'Session expired — log in again.' : `Research failed (${res.status})`);
      }

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();   // hold back the partial line
        for (const line of lines) {
          if (!line.trim()) continue;
          const data = JSON.parse(line);
          if (data.error) throw new Error(data.error);
          entry.latest = data;
          emit();
        }
      }
    } catch (err) {
      entry.error = err.message || 'Research failed.';
    } finally {
      entry.finished = true;
      emit();
    }
  })();
}

// Picks up a call started by handOff, if there's one running for this album.
// onUpdate(brief, error, finished) fires for every snapshot from here on, and
// immediately once with whatever already landed before you arrived.
// Returns false when there's nothing to inherit — start your own request.
export function takeOver(album, artist, onUpdate) {
  if (!carried || carried.key !== keyFor(album, artist)) return false;
  const entry = carried;
  entry.listener = onUpdate;
  if (entry.latest || entry.error || entry.finished) onUpdate(entry.latest, entry.error, entry.finished);
  return true;
}

// Forget the carried call — used when a session is abandoned or restarted.
export function drop() {
  carried = null;
}
