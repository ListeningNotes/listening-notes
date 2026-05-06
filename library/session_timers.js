export function TrackLength(seconds) {
  if (!seconds) return '';
  const m = Math.floor(seconds / 60);
  const s = String(seconds % 60).padStart(2, '0');
  return m + ':' + s;
}

export function SessionDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = String(seconds % 60).padStart(2, '0');
  return m + ':' + s;
}

export const LOADING_PHRASES = [
  "Let me read up on this one...",
  "Getting familiar with the record...",
  "Looking into the release...",
  "Checking what people said about this...",
  "Pulling everything I know...",
  "Let me do some digging...",
  "Reading up before we start...",
  "Give me a moment with this one...",
];