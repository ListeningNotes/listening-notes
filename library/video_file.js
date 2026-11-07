// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// library/video_file.js
// A moving print, recorded and packed as an MP4 — in the browser, by hand,
// no library, the way carbon_copy.js writes its zip.
//
// Recorded with WebCodecs rather than MediaRecorder: MediaRecorder writes a
// fragmented MP4 that Apple's players read as a twentieth of a second long
// (found 2026-09, the printer's first try). Here the browser's own H.264
// encoder makes the frames and this file writes the plain, unfragmented MP4
// around them that every phone plays: the index (moov) first, so a player
// can start before it has the whole file, then the frames (mdat).
//

const CODECS = ['avc1.640028', 'avc1.4d0028', 'avc1.42e028'];  // High, Main, Baseline — level 4, room for 1080×1920
const FPS = 30;
const TIMESCALE = 90000;               // the track's ticks a second, video's usual
const KEY_EVERY = FPS * 2;             // a whole picture every two seconds
const BITRATE = 14_000_000;            // well above what Instagram keeps, so its copy starts sharp

export function canRecord() {
  return typeof window !== 'undefined' && typeof window.VideoEncoder === 'function' && typeof window.VideoFrame === 'function';
}

// ── Filming ────────────────────────────────────────────────────────────────
// Makes `seconds` of film from `frame(ctx, dt)`, which draws the next frame,
// `dt` seconds on from the last. The scene is told the time rather than
// reading it, so this runs as fast as the phone can draw and encode, not in
// real time. Resolves to the MP4, or to null if this browser has no encoder for
// it, so the caller can say so.
export async function filmFrames({ width, height, seconds, frame }) {
  if (!canRecord()) return null;
  let config = null;
  for (const codec of CODECS) {
    const tried = { codec, width, height, bitrate: BITRATE, framerate: FPS, latencyMode: 'quality', avc: { format: 'avc' } };
    try {
      if ((await VideoEncoder.isConfigSupported(tried)).supported) { config = tried; break; }
    } catch { /* the next codec, then */ }
  }
  if (!config) return null;

  const chunks = [];
  let description = null;
  let failed = null;
  const encoder = new VideoEncoder({
    output(chunk, meta) {
      const data = new Uint8Array(chunk.byteLength);
      chunk.copyTo(data);
      chunks.push({ data, timestamp: chunk.timestamp, key: chunk.type === 'key' });
      const d = meta?.decoderConfig?.description;
      if (d && !description) {
        description = d instanceof ArrayBuffer
          ? new Uint8Array(d.slice(0))
          : new Uint8Array(d.buffer, d.byteOffset, d.byteLength).slice();
      }
    },
    error(error) { failed = error; },
  });
  encoder.configure(config);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const step = 1e6 / FPS;
  const total = Math.round(seconds * FPS);
  for (let i = 0; i < total && !failed; i++) {
    frame(ctx, 1 / FPS);
    const made = new VideoFrame(canvas, { timestamp: Math.round(i * step), duration: Math.round(step) });
    encoder.encode(made, { keyFrame: i % KEY_EVERY === 0 });
    made.close();
    // Hand the page back now and then, and wait when the encoder falls behind:
    // a phone that queues every frame at once runs out of memory.
    while (encoder.encodeQueueSize > 4 && !failed) await new Promise(r => setTimeout(r, 4));
    if (i % 6 === 0) await new Promise(r => setTimeout(r, 0));
  }
  try { await encoder.flush(); } catch (error) { failed = failed || error; }
  encoder.close();
  if (failed || !description || !chunks.length) return null;
  return videoFile({ width, height, chunks, description, lastFor: step });
}

// ── Packing ────────────────────────────────────────────────────────────────
// One H.264 track: `chunks` in the order they were made, each { data,
// timestamp (µs), key }; `description` the encoder's avcC; `lastFor` how
// long the last frame stays up, in µs.

const text = s => Uint8Array.from(s, ch => ch.charCodeAt(0));
const u8 = n => Uint8Array.of(n & 0xff);
const u16 = n => Uint8Array.of((n >>> 8) & 0xff, n & 0xff);
const u32 = n => Uint8Array.of((n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff);
const zeros = n => new Uint8Array(n);
const fixed16 = n => u32(Math.round(n * 65536));     // 16.16
// The identity matrix every track and movie carries.
const MATRIX = [u32(0x00010000), u32(0), u32(0), u32(0), u32(0x00010000), u32(0), u32(0), u32(0), u32(0x40000000)];

function join(parts) {
  const flat = parts.flat(Infinity);
  const out = new Uint8Array(flat.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of flat) { out.set(p, at); at += p.length; }
  return out;
}
function box(type, ...parts) {
  const body = join(parts);
  return join([u32(body.length + 8), text(type), body]);
}
const full = (type, version, flags, ...parts) => box(type, u8(version), u8(flags >>> 16), u16(flags & 0xffff), ...parts);

export function videoFile({ width, height, chunks, description, lastFor }) {
  const samples = [...chunks].sort((a, b) => a.timestamp - b.timestamp);
  const first = samples[0].timestamp;
  const ticks = samples.map(s => Math.round((s.timestamp - first) * TIMESCALE / 1e6));
  const deltas = ticks.map((t, i) => (i + 1 < ticks.length ? ticks[i + 1] - t : Math.round(lastFor * TIMESCALE / 1e6)));
  const duration = deltas.reduce((n, d) => n + d, 0);
  const movieDuration = Math.round(duration * 1000 / TIMESCALE);

  // Runs of equal durations, the way stts wants them.
  const runs = [];
  for (const d of deltas) {
    const last = runs[runs.length - 1];
    if (last && last.d === d) last.count++;
    else runs.push({ d, count: 1 });
  }
  const keys = samples.map((s, i) => (s.key ? i + 1 : 0)).filter(Boolean);

  const ftyp = box('ftyp', text('isom'), u32(512), text('isom'), text('iso2'), text('avc1'), text('mp41'));

  const moovWith = offset => box('moov',
    full('mvhd', 0, 0, u32(0), u32(0), u32(1000), u32(movieDuration), u32(0x00010000), u16(0x0100), zeros(10), MATRIX, zeros(24), u32(2)),
    box('trak',
      full('tkhd', 0, 3, u32(0), u32(0), u32(1), u32(0), u32(movieDuration), zeros(8), u16(0), u16(0), u16(0), u16(0), MATRIX, fixed16(width), fixed16(height)),
      box('mdia',
        full('mdhd', 0, 0, u32(0), u32(0), u32(TIMESCALE), u32(duration), u16(0x55c4), u16(0)),
        full('hdlr', 0, 0, u32(0), text('vide'), zeros(12), text('VideoHandler'), u8(0)),
        box('minf',
          full('vmhd', 0, 1, u16(0), zeros(6)),
          box('dinf', full('dref', 0, 0, u32(1), full('url ', 0, 1))),
          box('stbl',
            full('stsd', 0, 0, u32(1),
              box('avc1',
                zeros(6), u16(1),                      // reserved, data reference
                u16(0), u16(0), zeros(12),             // pre-defined, reserved
                u16(width), u16(height),
                u32(0x00480000), u32(0x00480000),      // 72 dpi
                u32(0), u16(1),                        // reserved, one frame a sample
                zeros(32),                             // no compressor name
                u16(0x0018), u16(0xffff),              // depth, pre-defined
                box('avcC', description))),
            full('stts', 0, 0, u32(runs.length), runs.map(r => [u32(r.count), u32(r.d)])),
            full('stss', 0, 0, u32(keys.length), keys.map(u32)),
            full('stsc', 0, 0, u32(1), u32(1), u32(samples.length), u32(1)),
            full('stsz', 0, 0, u32(0), u32(samples.length), samples.map(s => u32(s.data.length))),
            full('stco', 0, 0, u32(1), u32(offset)))))));

  // The frames go after the index, so where they start depends on how long
  // the index is — which does not depend on the number written into it.
  const moovLength = moovWith(0).length;
  const moov = moovWith(ftyp.length + moovLength + 8);
  const frames = samples.map(s => s.data);
  const mdatLength = frames.reduce((n, f) => n + f.length, 0) + 8;
  return new Blob([ftyp, moov, u32(mdatLength), text('mdat'), ...frames], { type: 'video/mp4' });
}
