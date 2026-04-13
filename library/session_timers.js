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
  'Searching the archive...',
  'Pulling press records...',
  'Checking release dates...',
  'Reading liner notes...',
  'Cross-referencing labels...',
  'Scanning chart history...',
  'Digging through the stacks...',
  'Consulting the canon...',
];