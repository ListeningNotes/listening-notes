// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
import { useEffect, useRef } from 'react';


const ALL_GENRE_TERMS = [
  'rock', 'jazz', 'pop', 'hip hop', 'electronic', 'indie', 'classical', 'r&b',
  'alternative', 'metal', 'folk', 'soul', 'blues', 'punk', 'country', 'funk',
  'ambient', 'psychedelic', 'disco', 'latin', '90s albums', '80s albums',
  'acoustic', 'experimental', 'reggae', 'gospel', 'emo', 'post-rock',
];

// Fetch ~350 album art URLs from iTunes across randomised genres each visit
async function fetchNetworkArt() {
  const terms = [...ALL_GENRE_TERMS].sort(() => Math.random() - 0.5).slice(0, 8);
  const results = await Promise.all(
    terms.map(t =>
      fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(t)}&entity=album&limit=50`)
        .then(r => r.json())
        .then(d => (d.results || []).map(a => a.artworkUrl100).filter(Boolean))
        .catch(() => [])
    )
  );
  const all = [...new Set(results.flat())];
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all;
}

const NODE_COUNT      = 300;
const TILE_COLS       = 20; // 20×15 = 300 exactly — every slot filled, clean rectangle
const TILE_ROWS       = 15;
const FOCUS_SPREAD_MS = 6000; // total time for the focus wave to cross all nodes
const FOCUS_FADE_MS   = 700;  // crossfade duration per node

function makeNodes(w, h) {
  const cx   = w / 2;
  const cy   = h / 2;
  const maxR = Math.min(w, h) * 0.50;

  const nodes = Array.from({ length: NODE_COUNT }, (_, idx) => {
    const angle = Math.random() * Math.PI * 2;
    const r     = Math.sqrt(Math.random()) * maxR;
    const x     = cx + Math.cos(angle) * r;
    const y     = cy + Math.sin(angle) * r;
    return {
      x, y, homeX: x, homeY: y,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      size:  26 + Math.random() * 18,
      opacity: 1,
      angle: Math.atan2(y - h / 2, x - w / 2),
      dist:  Math.hypot(x - w / 2, y - h / 2),
      isSpotlit: false,
      focusAlpha: 0, focusRevealDelay: 0, focusRevealT: null,
      spawnAlpha: 1,
      spawnDelay: 0,
    };
  });

  const edges = [];
  for (let i = 0; i < NODE_COUNT; i++) {
    const n = Math.random() < 0.45 ? 2 : 1;
    for (let c = 0; c < n; c++) {
      const j = (i + 1 + Math.floor(Math.random() * 24)) % NODE_COUNT;
      edges.push([i, j]);
    }
  }
  return { nodes, edges };
}

function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export default function AlbumNetwork({
  searchQuery = '', collapsed = false, albumArt = '', onCollapsed,
  dimmed = false, zooming = false, pulsing = false,
  spotlitArts = [], spotlit = false, onSpotlit = null,
  cardsEmerging = false, onReady = null,
  focusArt = '',
  nodeArt = '',
  assembling = false,
  rippleCount = 0,
  completing = false,
  onAssembled = null,
}) {
  const canvasRef = useRef(null);
  const propsRef  = useRef({ searchQuery, collapsed, albumArt, onCollapsed, zooming, spotlit, onSpotlit, cardsEmerging, onReady });
  const stateRef  = useRef({
    nodes: [], edges: [], w: 0, h: 0,
    collapseT: null, artImg: null, artOpacity: 0, collapseDone: false,
    zoomT: null, zoomReleaseT: null, pulseT: null,
    spotlitNodes: [],
    spotlitT: null,
    spotlitReported: false,
    imagesLoaded: 0,
    onReadyCalled: false,
    focusImg: null, focusRevealStartT: null,
    assembleStartT: null,
    ripples: [], rippleTotal: 0,
    rippleTimestamps: [],
    assemblePhase: 'idle',
    convergenceStartT: null,
    assembleComplete: false,
  });

  // Keep props in sync without restarting RAF
  useEffect(() => { propsRef.current = { searchQuery, collapsed, albumArt, onCollapsed, zooming, pulsing, spotlit, onSpotlit, cardsEmerging, onReady, assembling, onAssembled }; });

  // Fetch random network art and assign to nodes as images load.
  // Calls onReady once 50 nodes have art so the page can sequence its entrance animation.
  const spotlitKey = spotlitArts.join('|');
  useEffect(() => {
    fetchNetworkArt().then(urls => {
      const s = stateRef.current;
      const nodes = s.nodes;
      if (!nodes.length) return;
      urls.slice(0, NODE_COUNT).forEach((url, i) => {
        if (nodes[i].isSpotlit) return;
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          nodes[i].img = img;
          s.imagesLoaded++;
          if (s.imagesLoaded >= 50 && !s.onReadyCalled) {
            s.onReadyCalled = true;
            propsRef.current.onReady?.();
          }
        };
        img.src = url;
      });
    });
  }, []);

  // Load search result arts into specific evenly-distributed nodes
  // These appear IN the network during turbulence, then get spotlit when zoomReady
  useEffect(() => {
    const s = stateRef.current;
    const nodes = s.nodes;

    // Clear previous spotlit nodes
    s.spotlitNodes.forEach(n => {
      n.isSpotlit = false;
      n.size = n._origSize || n.size;
    });
    s.spotlitNodes = [];
    s.spotlitT = null;
    s.spotlitReported = false;

    if (!spotlitArts.length || !nodes.length) return;

    // Pick evenly distributed nodes by angle so they're spread around the circle
    const byAngle = nodes
      .map((n, i) => ({ n, i, angle: n.angle }))
      .sort((a, b) => a.angle - b.angle);

    const chosen = spotlitArts.map((_, i) => {
      const idx = Math.floor((i / spotlitArts.length) * byAngle.length);
      return byAngle[idx].n;
    });

    // Load search arts into those nodes, make them slightly larger so they stand out
    spotlitArts.forEach((url, i) => {
      if (!url || !chosen[i]) return;
      chosen[i]._origSize = chosen[i].size;
      chosen[i].size = 38; // consistent size for spotlit nodes
      chosen[i].isSpotlit = true;
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => { chosen[i].img = img; };
      img.src = url;
    });

    s.spotlitNodes = chosen;
  // Keyed on the arts' contents, not the array — a fresh array holding the
  // same URLs must not re-spotlight the nodes and restart their image loads.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spotlitKey]);

  // Preload session album art (for collapse animation)
  useEffect(() => {
    if (!albumArt) return;
    const img = new Image();
    img.onload = () => { stateRef.current.artImg = img; };
    img.src = albumArt;
  }, [albumArt]);

  // Focus art: load image, redistribute nodes into a donut ring, assign reveal delays
  useEffect(() => {
    if (!focusArt) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const s = stateRef.current;
      s.focusImg = img;
      const { nodes, w, h } = s;
      if (!nodes.length) return;
      const cx = w / 2, cy = h / 2;

      // Lose the circular structure — nodes spread to fill the whole background
      const margin = 40;
      nodes.forEach(n => {
        n.homeX = margin + Math.random() * (w - margin * 2);
        n.homeY = margin + Math.random() * (h - margin * 2);
        n.angle = Math.atan2(n.homeY - cy, n.homeX - cx);
        n.dist  = Math.hypot(n.homeX - cx, n.homeY - cy);
        n.size  = 28 + Math.random() * 22; // slightly larger — zoomed-in feel
      });

      // Reveal ripples outward from center across the full field
      const maxDist = Math.hypot(w / 2, h / 2);
      nodes.forEach(n => {
        const dist = Math.hypot(n.homeX - cx, n.homeY - cy);
        n.focusRevealDelay = (dist / maxDist) * FOCUS_SPREAD_MS * 0.85 + Math.random() * FOCUS_SPREAD_MS * 0.15;
        n.focusRevealT = null;
        n.focusAlpha   = 0;
      });
      s.focusRevealStartT = null;
    };
    img.src = focusArt;
  }, [focusArt]);

  // nodeArt: load album art, slice into TILE_COLS×TILE_ROWS pieces,
  // assign each node its own tile crop + final grid destination.
  // Inner half (by distance from center) = group 1 (ripple 1 triggers crossfade).
  // Outer half = group 2 (ripple 2 triggers crossfade).
  useEffect(() => {
    if (!nodeArt) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const s = stateRef.current;
      s.focusImg = img;
      const nodes = s.nodes;
      const { w, h } = s;
      const cx = w / 2, cy = h / 2;

      // gridSize matches the standalone album art: min(60vw, 60vh)
      const gridSize  = Math.min(w, h) * 0.60;
      const cellW     = gridSize / TILE_COLS;
      const cellH     = gridSize / TILE_ROWS;
      const gridLeft  = cx - gridSize / 2;
      const gridTop   = cy - gridSize / 2;

      // Build tile slots sorted by distance from grid center (center tiles assigned first)
      const allSlots = [];
      for (let r = 0; r < TILE_ROWS; r++)
        for (let c = 0; c < TILE_COLS; c++)
          allSlots.push({ c, r, dist: Math.hypot(c + 0.5 - TILE_COLS / 2, r + 0.5 - TILE_ROWS / 2) });
      allSlots.sort((a, b) => a.dist - b.dist);

      // Sort nodes by distance from canvas center (innermost → slot 0, outermost → last slot)
      const sorted = [...nodes].sort((a, b) =>
        Math.hypot(a.homeX - cx, a.homeY - cy) - Math.hypot(b.homeX - cx, b.homeY - cy)
      );

      sorted.forEach((n, i) => {
        const slot = allSlots[i];
        // Pixel-align each tile's bounds by rounding to the nearest integer.
        // Adjacent tiles share an exact boundary → no sub-pixel gaps.
        const px0 = Math.round(gridLeft + slot.c       * cellW);
        const py0 = Math.round(gridTop  + slot.r       * cellH);
        const px1 = Math.round(gridLeft + (slot.c + 1) * cellW);
        const py1 = Math.round(gridTop  + (slot.r + 1) * cellH);
        n.tileLeft  = px0;
        n.tileTop   = py0;
        n.tileW     = px1 - px0;
        n.tileH     = py1 - py0;
        n.tileDestX = px0 + (px1 - px0) / 2;
        n.tileDestY = py0 + (py1 - py0) / 2;
        n.tileSrcX  = (slot.c / TILE_COLS) * img.naturalWidth;
        n.tileSrcY  = (slot.r / TILE_ROWS) * img.naturalHeight;
        n.tileSrcW  = img.naturalWidth  / TILE_COLS;
        n.tileSrcH  = img.naturalHeight / TILE_ROWS;
        n.focusAlpha   = 0;
        n.focusRevealT = null;
      });
    };
    img.src = nodeArt;
  }, [nodeArt]);

  // 3-ripple sequence:
  // Ripple 1 — visual wave, crossfades inner 50% of nodes
  // Ripple 2 — visual wave, crossfades outer 50% of nodes
  // Ripple 3 — scatters all nodes outward, then draws them one-by-one into mosaic
  // Ripple 4+ — additional visual waves through the converging network
  useEffect(() => {
    if (rippleCount === 0) return;
    const s = stateRef.current;
    if (!s.nodes.length) return;

    const now = performance.now();
    s.rippleTimestamps.push(now);
    s.rippleTotal = s.rippleTimestamps.length;
    s.ripples.push({ startT: now });

    if (rippleCount === 1) {
      const { nodes } = s;
      // No scatter — nodes fly from wherever they are in echo's flow field.
      // Fully random delays so pieces arrive from all around, not centre-first.
      nodes.forEach(n => {
        n.assembleHomeX = n.tileDestX ?? n.x;
        n.assembleHomeY = n.tileDestY ?? n.y;
        n.locked = false;
        n.lockFlashT = null;
        n.cornerRadius = 6;
        n.convergenceDelay = Math.random() * 12000 + 300;
      });

      s.assemblePhase = 'converging';
      s.convergenceStartT = now; // start immediately as wave fires
    }
  }, [rippleCount]);

  // Assembly: snapshot current positions as home targets, reset all assembly state
  useEffect(() => {
    if (!assembling) return;
    const s = stateRef.current;
    if (!s.nodes.length) return;
    s.nodes.forEach(n => {
      n.assembleHomeX = n.x;
      n.assembleHomeY = n.y;
    });
    s.assembleStartT = null;
    s.rippleTimestamps = [];
    s.rippleTotal = 0;
    s.assemblePhase = 'idle';
    s.convergenceStartT = null;
    s.assembleComplete = false;
  }, [assembling]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const s   = stateRef.current;

    s.w = canvas.width  = window.innerWidth;
    s.h = canvas.height = window.innerHeight;
    const { nodes, edges } = makeNodes(s.w, s.h);
    s.nodes = nodes;
    s.edges = edges;

    let raf;
    function draw(now) {
      const { searchQuery, collapsed, onCollapsed, zooming, pulsing, spotlit, onSpotlit, cardsEmerging, assembling, onAssembled } = propsRef.current;
      const { nodes, edges, w, h } = s;
      const cx = w / 2, cy = h / 2;

      // Track zoom start for turbulence, and zoom release for node spawning
      if (!zooming && s.zoomT !== null && s.zoomReleaseT === null) s.zoomReleaseT = now;
      if (zooming && s.zoomT === null) s.zoomT = now;
      if (!zooming) s.zoomT = null;

      // Pulse: flow field surge without canvas scale (loading screen thinking animation)
      if (pulsing && s.pulseT === null) s.pulseT = now;
      if (!pulsing) s.pulseT = null;

      // Track spotlit start
      if (spotlit && s.spotlitNodes.length > 0 && s.spotlitT === null) s.spotlitT = now;
      if (!spotlit) { s.spotlitT = null; s.spotlitReported = false; }

      ctx.fillStyle = '#f5f2ec';
      ctx.fillRect(0, 0, w, h);

      const hasSearch     = searchQuery.trim().length > 0;
      const targetOpacity = hasSearch ? 0.07 : 1;

      // Collapse animation
      if (collapsed && s.collapseT === null) s.collapseT = now;

      if (s.collapseT !== null) {
        const elapsed = (now - s.collapseT) / 800;
        const t       = Math.min(elapsed, 1);
        const ease    = t * t * (3 - 2 * t);
        nodes.forEach(n => {
          const angle = n.angle + elapsed * 2.8;
          const dist  = n.dist * (1 - ease);
          n.x = cx + Math.cos(angle) * dist;
          n.y = cy + Math.sin(angle) * dist;
          n.opacity = Math.max(0, 1 - t * 1.3);
        });
        if (t > 0.45 && s.artImg) s.artOpacity = Math.min(1, (t - 0.45) / 0.55);
        if (t >= 1 && !s.collapseDone) { s.collapseDone = true; onCollapsed?.(); }
      } else if (assembling) {
        if (s.assembleStartT === null) s.assembleStartT = now;
        s.ripples = s.ripples.filter(r => now - r.startT < 4000);

        const converging = s.assemblePhase === 'converging';
        const convElapsed = s.convergenceStartT ? now - s.convergenceStartT : -1;
        const t = now * 0.00028;

        nodes.forEach(n => {
          const pulling = converging
            && n.assembleHomeX !== undefined
            && convElapsed >= (n.convergenceDelay || 0);

          if (pulling) {
            if (!n.locked) {
              // Pure lerp — exponential ease-out, mathematically cannot overshoot
              n.vx = 0; n.vy = 0;
              n.x += (n.assembleHomeX - n.x) * 0.13;
              n.y += (n.assembleHomeY - n.y) * 0.13;
              const dToTarget = Math.hypot(n.x - n.assembleHomeX, n.y - n.assembleHomeY);
              n.cornerRadius = Math.min(6, dToTarget * 0.12);
              if (dToTarget < 0.5) {
                n.x = n.assembleHomeX;
                n.y = n.assembleHomeY;
                n.cornerRadius = 0;
                n.locked = true;
                n.lockFlashT = now;
              }
            }
          } else {
            // Regular echo flow field until it's this node's turn
            const nx = n.homeX / w, ny = n.homeY / h;
            const flowAngle =
              Math.sin(nx * 4.1 + t * 1.3) * Math.cos(ny * 3.7 + t * 0.8) * Math.PI * 1.4 +
              Math.sin(ny * 5.2 - t * 1.1) * Math.cos(nx * 2.9 + t * 0.6) * 0.9 +
              Math.sin((nx + ny) * 3.8 + t * 0.5) * 0.6;
            n.vx += Math.cos(flowAngle) * 0.055;
            n.vy += Math.sin(flowAngle) * 0.055;
            n.vx += (n.homeX - n.x) * 0.004;
            n.vy += (n.homeY - n.y) * 0.004;

            // Wave kick from ripple 1 only
            if (s.rippleTimestamps.length > 0) {
              const age = now - s.rippleTimestamps[0];
              if (age >= 0 && age < 4000) {
                const dist = Math.hypot(n.x - cx, n.y - cy);
                const fromFront = dist - (age / 1000) * 450;
                if (fromFront > -40 && fromFront < 40) {
                  const kick = Math.sin(((fromFront + 40) / 80) * Math.PI) * 1.8;
                  n.vx += (n.x - cx) / (dist || 1) * kick;
                  n.vy += (n.y - cy) / (dist || 1) * kick;
                }
              }
            }
            n.vx *= 0.974; n.vy *= 0.974;
          }
          n.x += n.vx; n.y += n.vy;
        });

        // All nodes locked into their tile positions → fire onAssembled
        if (!s.assembleComplete && converging && convElapsed > 5000) {
          const maxDelay = Math.max(...nodes.map(n => n.convergenceDelay || 0));
          if (convElapsed > maxDelay + 3000) {
            if (nodes.every(n => !n.assembleHomeX || n.locked)) {
              s.assembleComplete = true;
              onAssembled?.();
            }
          }
        }
      } else {
        // Flow field with turbulence burst on zoom
        const t = now * 0.00028;
        const turbulence = Math.max(
          s.zoomT  !== null ? Math.max(0, 1 - (now - s.zoomT)  / 1800) : 0,
          s.pulseT !== null ? Math.max(0, 1 - (now - s.pulseT) / 900)  : 0,
        );
        const flowStrength   = 0.055 + turbulence * 0.32;
        const springStrength = 0.004 - turbulence * 0.003;

        nodes.forEach(n => {
          const nx = n.homeX / w;
          const ny = n.homeY / h;
          const flowAngle =
            Math.sin(nx * 4.1 + t * 1.3) * Math.cos(ny * 3.7 + t * 0.8) * Math.PI * 1.4 +
            Math.sin(ny * 5.2 - t * 1.1) * Math.cos(nx * 2.9 + t * 0.6) * 0.9 +
            Math.sin((nx + ny) * 3.8 + t * 0.5) * 0.6;

          n.vx += Math.cos(flowAngle) * flowStrength;
          n.vy += Math.sin(flowAngle) * flowStrength;
          n.vx += (n.homeX - n.x) * springStrength;
          n.vy += (n.homeY - n.y) * springStrength;

          // Spotlit nodes: slow down to stabilise, and grow larger as they're "found"
          if (n.isSpotlit && s.spotlitT !== null) {
            n.vx *= 0.80;
            n.vy *= 0.80;
            n.size += (52 - n.size) * 0.055; // grow toward 52px
          }

          n.vx *= 0.974;
          n.vy *= 0.974;
          n.x  += n.vx;
          n.y  += n.vy;

          // Opacity targeting:
          // • Cards emerging: spotlit nodes fade to 0 — the DOM card IS the node leaving
          // • Lock-on: spotlit stay full, irrelevant fade out
          // • Scan phase (first 350ms): everything bright while Echo searches
          let nodeTarget = targetOpacity;
          let lerpRate   = 0.04;
          if (cardsEmerging && n.isSpotlit) {
            nodeTarget = 0;
            lerpRate   = 0.10; // fade out faster than normal
          } else if (spotlit && s.spotlitT !== null) {
            const age = now - s.spotlitT;
            if (age < 350) {
              nodeTarget = 1.0;
            } else {
              nodeTarget = n.isSpotlit ? 1.0 : 0.06;
            }
          }
          n.opacity += (nodeTarget - n.opacity) * lerpRate;
        });
      }

      // Advance focus reveal
      if (s.focusImg && assembling && s.rippleTimestamps.length > 0) {
        // Single wave from ripple 1 sweeps all nodes centre-outward
        const rStartT = s.rippleTimestamps[0];
        nodes.forEach(n => {
          if (n.focusRevealT !== null) {
            if (n.focusAlpha < 1) n.focusAlpha = Math.min(1, (now - n.focusRevealT) / FOCUS_FADE_MS);
            return;
          }
          const nodeDist = Math.hypot(n.homeX - cx, n.homeY - cy);
          const wavePassT = rStartT + (nodeDist / 450) * 1000;
          if (now >= wavePassT) n.focusRevealT = wavePassT;
        });
      } else if (s.focusImg && !assembling) {
        // focusArt (non-assembly) mode — delay-based spread
        if (s.focusRevealStartT === null) s.focusRevealStartT = now;
        const elapsed = now - s.focusRevealStartT;
        nodes.forEach(n => {
          if (n.focusRevealT === null && elapsed >= n.focusRevealDelay) n.focusRevealT = now;
          if (n.focusRevealT !== null && n.focusAlpha < 1)
            n.focusAlpha = Math.min(1, (now - n.focusRevealT) / FOCUS_FADE_MS);
        });
      }

      // Edges — always drawn (like main echo page) so the web is visible from first frame.
      // When pulsing, strings bow and vibrate like plucked wires.
      ctx.lineWidth = 0.4;
      const tSec = now * 0.001;
      edges.forEach(([i, j]) => {
        const a = nodes[i], b = nodes[j];
        const alpha = Math.min(a.opacity, b.opacity) * Math.min(a.spawnAlpha, b.spawnAlpha) * 0.22;
        if (alpha < 0.01) return;
        ctx.strokeStyle = `rgba(80,70,110,${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        if (pulsing) {
          const edgeLen = Math.hypot(b.x - a.x, b.y - a.y);
          const mx = (a.x + b.x) / 2;
          const my = (a.y + b.y) / 2;
          const px = -(b.y - a.y) / (edgeLen || 1);
          const py =  (b.x - a.x) / (edgeLen || 1);
          const phase = (i * 0.73 + j * 0.41) * Math.PI * 2;
          const amp   = edgeLen * 0.18 * Math.sin(tSec * 3.2 + phase);
          ctx.quadraticCurveTo(mx + px * amp, my + py * amp, b.x, b.y);
        } else {
          ctx.lineTo(b.x, b.y);
        }
        ctx.stroke();
      });

      function drawNode(n) {
        if (n.opacity < 0.008 || n.spawnAlpha < 0.008) return;
        const hasThumbnail = n.img?.complete && n.img.naturalWidth > 0;
        if (!hasThumbnail && n.focusAlpha <= 0) return;

        const baseAlpha = n.opacity * n.spawnAlpha;

        // Locked tiles use exact cell dimensions (tileW × tileH) so adjacent cells share
        // a flush edge with zero gap. Flying tiles stay as squares.
        const drawW = n.locked && n.tileW ? n.tileW : n.size;
        const drawH = n.locked && n.tileH ? n.tileH : n.size;
        const dx = n.locked ? n.tileLeft : n.x - n.size / 2;
        const dy = n.locked ? n.tileTop  : n.y - n.size / 2;
        const cr = n.cornerRadius ?? 3;

        ctx.save();
        rrect(ctx, dx, dy, drawW, drawH, cr);
        ctx.clip();
        if (hasThumbnail && n.focusAlpha < 1) {
          ctx.globalAlpha = baseAlpha * (1 - n.focusAlpha);
          ctx.drawImage(n.img, dx, dy, drawW, drawH);
        }
        if (s.focusImg && n.focusAlpha > 0) {
          ctx.globalAlpha = baseAlpha * n.focusAlpha;
          ctx.drawImage(s.focusImg,
            n.tileSrcX, n.tileSrcY, n.tileSrcW, n.tileSrcH,
            dx, dy, drawW, drawH
          );
        }
        ctx.restore();

        // White flash on lock — fades out over 180ms
        if (n.lockFlashT !== null && now - n.lockFlashT < 180) {
          const flashAlpha = (1 - (now - n.lockFlashT) / 180) * baseAlpha;
          ctx.save();
          rrect(ctx, dx, dy, drawW, drawH, cr);
          ctx.clip();
          ctx.globalAlpha = flashAlpha;
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(dx, dy, drawW, drawH);
          ctx.restore();
        }

        ctx.globalAlpha = 1;
      }

      // Irrelevant nodes first, found nodes on top so they're never obscured
      nodes.forEach(n => { if (!n.isSpotlit) drawNode(n); });
      nodes.forEach(n => { if (n.isSpotlit)  drawNode(n); });
      ctx.globalAlpha = 1;

      // Round the assembled mosaic corners throughout assembly by painting background
      // colour over the four corner areas — matches the standalone album's borderRadius
      if (assembling && s.assemblePhase === 'converging') {
        const gs = Math.min(w, h) * 0.60;
        const gl = cx - gs / 2, gt = cy - gs / 2;
        const gx = gl + gs,    gb = gt + gs;
        const cr = 16;
        ctx.fillStyle = '#f5f2ec';

        // Top-left
        ctx.beginPath();
        ctx.moveTo(gl, gt);
        ctx.lineTo(gl + cr, gt);
        ctx.arc(gl + cr, gt + cr, cr, -Math.PI / 2, Math.PI, true);
        ctx.closePath();
        ctx.fill();

        // Top-right
        ctx.beginPath();
        ctx.moveTo(gx, gt);
        ctx.lineTo(gx - cr, gt);
        ctx.arc(gx - cr, gt + cr, cr, -Math.PI / 2, 0, false);
        ctx.closePath();
        ctx.fill();

        // Bottom-right
        ctx.beginPath();
        ctx.moveTo(gx, gb);
        ctx.lineTo(gx - cr, gb);
        ctx.arc(gx - cr, gb - cr, cr, Math.PI / 2, 0, true);
        ctx.closePath();
        ctx.fill();

        // Bottom-left
        ctx.beginPath();
        ctx.moveTo(gl, gb);
        ctx.lineTo(gl + cr, gb);
        ctx.arc(gl + cr, gb - cr, cr, Math.PI / 2, Math.PI, false);
        ctx.closePath();
        ctx.fill();
      }

      // Spotlit glow — white halos pulse around found nodes, only after scan phase
      if (s.spotlitT !== null && s.spotlitNodes.length > 0) {
        const elapsed = now - s.spotlitT;
        if (elapsed > 350) {
          const glowAge = elapsed - 350; // time since lock-on
          s.spotlitNodes.forEach((n, i) => {
            if (n.opacity < 0.3) return;
            // Fade glow in over first 200ms of lock-on so it doesn't snap
            const fadeIn = Math.min(1, glowAge / 200);
            const pulse  = 0.5 + 0.5 * Math.sin(glowAge * 0.005 + i * 1.1);
            const innerR = n.size / 2;
            const outerR = innerR + 12 + pulse * 10;

            const grad = ctx.createRadialGradient(n.x, n.y, innerR * 0.6, n.x, n.y, outerR + 8);
            grad.addColorStop(0,   `rgba(255,255,255,${(0.85 * pulse * fadeIn).toFixed(3)})`);
            grad.addColorStop(0.4, `rgba(255,255,255,${(0.35 * pulse * fadeIn).toFixed(3)})`);
            grad.addColorStop(1,   'rgba(255,255,255,0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(n.x, n.y, outerR + 8, 0, Math.PI * 2);
            ctx.fill();
          });

          // Report positions 650ms after lock-on (nodes have grown and settled)
          if (!s.spotlitReported && glowAge > 650 && onSpotlit) {
            s.spotlitReported = true;
            onSpotlit(s.spotlitNodes.map(n => ({ x: n.x, y: n.y, size: n.size })));
          }
        }
      }

      // Collapse centre art
      if (s.artImg && s.artOpacity > 0) {
        const sz = 88;
        ctx.globalAlpha = s.artOpacity;
        ctx.save();
        rrect(ctx, cx - sz / 2, cy - sz / 2, sz, sz, 10);
        ctx.clip();
        ctx.drawImage(s.artImg, cx - sz / 2, cy - sz / 2, sz, sz);
        ctx.restore();
        ctx.globalAlpha = 1;
      }

      raf = requestAnimationFrame(draw);
    }

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute', inset: 0, zIndex: 0, display: 'block',
        opacity: completing ? 0 : dimmed ? 0.12 : 1,
        transform: zooming ? 'scale(1.65)' : 'scale(1)',
        transition: completing
          ? 'opacity 1.2s ease'
          : 'transform 2.2s cubic-bezier(0.25,1.0,0.5,1), opacity 1.8s ease',
        transformOrigin: 'center center',
      }}
    />
  );
}
