// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
import { useEffect, useRef } from 'react';

const COLS = 14;
const ROWS = 14;
const N    = COLS * ROWS;

function rrect(ctx, x, y, w, h, r) {
  if (r <= 0) { ctx.beginPath(); ctx.rect(x, y, w, h); return; }
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

export default function EchoPuzzle({ albumArt, progress = 0, onComplete }) {
  const canvasRef = useRef(null);
  const propsRef  = useRef({ progress, onComplete });
  const stateRef  = useRef({
    nodes: [], edges: [], w: 0, h: 0,
    artImg: null,
    completeFired: false,
    TILE: 28, puzzleX: 0, puzzleY: 0,
  });

  useEffect(() => { propsRef.current = { progress, onComplete }; });

  useEffect(() => {
    if (!albumArt) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => { stateRef.current.artImg = img; };
    img.src = albumArt;
  }, [albumArt]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const s = stateRef.current;

    s.w = canvas.width  = window.innerWidth;
    s.h = canvas.height = window.innerHeight;

    const TILE    = Math.max(18, Math.min(32, Math.floor(Math.min(s.w, s.h) * 0.55 / COLS)));
    const puzzleW = COLS * TILE;
    const puzzleH = ROWS * TILE;
    const puzzleX = (s.w - puzzleW) / 2;
    const puzzleY = (s.h - puzzleH) / 2;
    s.TILE = TILE; s.puzzleX = puzzleX; s.puzzleY = puzzleY;

    s.nodes = Array.from({ length: N }, (_, idx) => {
      const tileCol = idx % COLS;
      const tileRow = Math.floor(idx / COLS);
      const angle   = Math.random() * Math.PI * 2;
      const r       = Math.sqrt(Math.random()) * Math.min(s.w, s.h) * 0.44;
      const hx      = s.w / 2 + Math.cos(angle) * r;
      const hy      = s.h / 2 + Math.sin(angle) * r;
      return {
        x: hx, y: hy, homeX: hx, homeY: hy,
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        size: TILE + (Math.random() - 0.5) * TILE * 0.5,
        tileCol, tileRow,
        tx: puzzleX + tileCol * TILE + TILE / 2,
        ty: puzzleY + tileRow * TILE + TILE / 2,
        locked: false,
      };
    });

    // Organic random edges matching EchoNetwork style
    const edges = [];
    for (let i = 0; i < N; i++) {
      const n = Math.random() < 0.45 ? 2 : 1;
      for (let c = 0; c < n; c++) {
        edges.push([i, (i + 1 + Math.floor(Math.random() * 24)) % N]);
      }
    }
    s.edges = edges;

    let raf;
    function draw(now) {
      const { progress, onComplete } = propsRef.current;
      const { nodes, edges, w, h, artImg, TILE, puzzleX, puzzleY } = s;

      // Snap all simultaneously at 100%
      if (progress >= 1 && !s.completeFired) {
        nodes.forEach(n => { n.locked = true; n.x = n.tx; n.y = n.ty; });
        s.completeFired = true;
        propsRef.current.onComplete?.();
      }

      ctx.fillStyle = '#f5f2ec';
      ctx.fillRect(0, 0, w, h);

      const t       = now * 0.001;
      const springK = Math.min(progress / 0.4, 1) * 0.055;
      const damping = 0.88;
      const puzzleCX  = puzzleX + (COLS * TILE) / 2;
      const puzzleCY  = puzzleY + (ROWS * TILE) / 2;
      const puzzleMaxR = Math.hypot(COLS * TILE, ROWS * TILE) * 0.5;

      // Edges — fade out as tiles settle
      ctx.lineWidth = 0.5;
      const edgeAlpha = Math.max(0, 1 - progress * 1.3) * 0.28;
      if (edgeAlpha > 0.01) {
        ctx.strokeStyle = `rgba(80,70,110,${edgeAlpha.toFixed(3)})`;
        edges.forEach(([i, j]) => {
          const a = nodes[i], b = nodes[j];
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        });
      }

      // Physics + draw floating tiles
      nodes.forEach(n => {
        if (n.locked) return;

        // Distance of this tile's target from puzzle centre (normalised 0–1)
        const distNorm = Math.hypot(n.tx - puzzleCX, n.ty - puzzleCY) / puzzleMaxR;

        // Centre settles first — edge tiles lag behind
        const localSettle = Math.min(1, progress * (1.6 - distNorm * 0.7));
        const waveAmp = 52 * Math.max(0, 1 - localSettle * 1.1);

        // Smooth 2D wave — neighbouring tiles share similar displacement
        const waveX = Math.sin(n.tx * 0.022 + t * 1.4) * waveAmp;
        const waveY = Math.cos(n.ty * 0.019 - t * 1.1) * waveAmp;

        // Spring toward grid target + wave offset
        n.vx += (n.tx + waveX - n.x) * springK;
        n.vy += (n.ty + waveY - n.y) * springK;

        n.vx *= damping;
        n.vy *= damping;
        n.x  += n.vx;
        n.y  += n.vy;

        if (!artImg) return;

        const dist = Math.hypot(n.tx - n.x, n.ty - n.y);
        const closeRatio = Math.max(0, 1 - dist / (TILE * 4));
        const sz     = n.size + (TILE - n.size) * closeRatio;
        const radius = 8 * (1 - closeRatio * 0.9);
        const hs = sz / 2;
        const dx = n.x - hs, dy = n.y - hs;
        const srcX = (n.tileCol / COLS) * artImg.naturalWidth;
        const srcY = (n.tileRow / ROWS) * artImg.naturalHeight;
        const srcW = artImg.naturalWidth  / COLS;
        const srcH = artImg.naturalHeight / ROWS;

        ctx.save();
        rrect(ctx, dx, dy, sz, sz, radius);
        ctx.clip();
        ctx.drawImage(artImg, srcX, srcY, srcW, srcH, dx, dy, sz, sz);
        ctx.restore();
      });

      // Locked tiles — clipped to puzzle rounded rect
      const puzzleW = COLS * TILE, puzzleH = ROWS * TILE;
      ctx.save();
      rrect(ctx, puzzleX, puzzleY, puzzleW, puzzleH, 20);
      ctx.clip();
      nodes.forEach(n => {
        if (!n.locked || !artImg) return;
        const hs   = TILE / 2;
        const srcX = (n.tileCol / COLS) * artImg.naturalWidth;
        const srcY = (n.tileRow / ROWS) * artImg.naturalHeight;
        const srcW = artImg.naturalWidth  / COLS;
        const srcH = artImg.naturalHeight / ROWS;
        ctx.drawImage(artImg, srcX, srcY, srcW, srcH, n.x - hs, n.y - hs, TILE, TILE);
      });
      ctx.restore();


      raf = requestAnimationFrame(draw);
    }

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  return <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, zIndex: 0, display: 'block' }} />;
}
