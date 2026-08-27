// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
import { useEffect, useRef } from 'react';

const ALL_GENRE_TERMS = [
  'rock', 'jazz', 'pop', 'hip hop', 'electronic', 'indie', 'classical', 'r&b',
  'alternative', 'metal', 'folk', 'soul', 'blues', 'punk', 'country', 'funk',
  'ambient', 'psychedelic', 'disco', 'latin',
];

async function fetchNetworkArt() {
  const terms = [...ALL_GENRE_TERMS].sort(() => Math.random() - 0.5).slice(0, 6);
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

const NODE_COUNT  = 200;
const SPEED_MAX   = 3.5;
const SPEED_MIN   = 1.5;
const SEP_R       = 28;
const ALIGN_R     = 70;
const COHES_R     = 90;
const SEP_W       = 0.20;
const ALIGN_W     = 0.10;
const COHES_W     = 0.006;
const BRUSH_ALPHA = 0.009;
const BRUSH_R     = 22;
const SPREAD_MS   = 11000;
const SETTLE_MS   = 1800;

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

function makeNodes(w, h) {
  return Array.from({ length: NODE_COUNT }, () => {
    const spd = SPEED_MIN + Math.random() * (SPEED_MAX - SPEED_MIN);
    const ang = Math.random() * Math.PI * 2;
    return {
      x:  Math.random() * w,
      y:  Math.random() * h,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd,
      size: 18 + Math.random() * 10,
      img: null,
    };
  });
}

export default function EchoPaint({ albumArt, onHalfway, onAssembled, locked, onComplete }) {
  const canvasRef = useRef(null);
  const propsRef  = useRef({ onHalfway, onAssembled, onComplete });
  const stateRef  = useRef({
    nodes: [], artImg: null, paintCanvas: null, w: 0, h: 0,
    artLoadT: null, halfwayFired: false, assembledFired: false,
    lockTriggered: false, lockStartT: null, completeFired: false,
  });

  useEffect(() => { propsRef.current = { onHalfway, onAssembled, onComplete }; });

  useEffect(() => {
    if (!albumArt) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      stateRef.current.artImg = img;
      stateRef.current.artLoadT = null; // reset so RAF picks it up fresh
    };
    img.src = albumArt;
  }, [albumArt]);

  useEffect(() => {
    fetchNetworkArt().then(urls => {
      const nodes = stateRef.current.nodes;
      if (!nodes.length) return;
      urls.slice(0, NODE_COUNT).forEach((url, i) => {
        if (!nodes[i]) return;
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => { nodes[i].img = img; };
        img.src = url;
      });
    });
  }, []);

  useEffect(() => {
    if (!locked) return;
    const s = stateRef.current;
    if (s.lockTriggered) return;
    s.lockTriggered = true;
  }, [locked]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const s   = stateRef.current;

    s.w = canvas.width  = window.innerWidth;
    s.h = canvas.height = window.innerHeight;
    const { w, h } = s;

    const pc   = document.createElement('canvas');
    pc.width = w; pc.height = h;
    s.paintCanvas = pc;
    const pctx = pc.getContext('2d');

    s.nodes = makeNodes(w, h);

    let raf;
    function draw(now) {
      const { nodes, artImg } = s;

      if (s.lockTriggered && s.lockStartT === null) s.lockStartT = now;
      if (artImg && s.artLoadT === null) s.artLoadT = now;

      const lockAge = s.lockStartT !== null ? Math.min(1, (now - s.lockStartT) / SETTLE_MS) : 0;
      const artAge  = s.artLoadT   !== null ? now - s.artLoadT : 0;

      if (!s.halfwayFired && artAge > SPREAD_MS * 0.5) {
        s.halfwayFired = true; propsRef.current.onHalfway?.();
      }
      if (!s.assembledFired && artAge > SPREAD_MS) {
        s.assembledFired = true; propsRef.current.onAssembled?.();
      }

      // ── Paint album art in node wakes — offscreen canvas never cleared ──
      if (artImg) {
        nodes.forEach(n => {
          pctx.save();
          pctx.beginPath();
          pctx.arc(n.x, n.y, BRUSH_R, 0, Math.PI * 2);
          pctx.clip();
          pctx.globalAlpha = BRUSH_ALPHA;
          pctx.drawImage(artImg, 0, 0, w, h);
          pctx.restore();
        });
      }

      // ── Boid physics ──
      const speedCap = SPEED_MAX * (1 - lockAge * 0.95);

      nodes.forEach((n, i) => {
        let sepX = 0, sepY = 0, sepN = 0;
        let alignX = 0, alignY = 0, alignN = 0;
        let cohX = 0, cohY = 0, cohN = 0;

        for (let j = 0; j < nodes.length; j++) {
          if (i === j) continue;
          const b  = nodes[j];
          const dx = b.x - n.x, dy = b.y - n.y;
          const d2 = dx * dx + dy * dy;

          if (d2 < SEP_R * SEP_R && d2 > 0) {
            const d = Math.sqrt(d2);
            sepX -= dx / d; sepY -= dy / d; sepN++;
          }
          if (d2 < ALIGN_R * ALIGN_R) {
            alignX += b.vx; alignY += b.vy; alignN++;
          }
          if (d2 < COHES_R * COHES_R) {
            cohX += b.x; cohY += b.y; cohN++;
          }
        }

        if (sepN   > 0) { n.vx += (sepX / sepN)   * SEP_W;              n.vy += (sepY / sepN)   * SEP_W; }
        if (alignN > 0) { n.vx += (alignX / alignN - n.vx) * ALIGN_W;   n.vy += (alignY / alignN - n.vy) * ALIGN_W; }
        if (cohN   > 0) { n.vx += (cohX / cohN - n.x)      * COHES_W;   n.vy += (cohY / cohN - n.y)      * COHES_W; }

        // Occasional random dart — gives the erratic direction changes of a fish school
        if (Math.random() < 0.004) {
          const a = Math.random() * Math.PI * 2;
          n.vx += Math.cos(a) * 1.8;
          n.vy += Math.sin(a) * 1.8;
        }

        // Speed cap
        const spd = Math.hypot(n.vx, n.vy);
        if (spd > speedCap && speedCap > 0) { n.vx = n.vx / spd * speedCap; n.vy = n.vy / spd * speedCap; }
        else if (spd < SPEED_MIN && lockAge < 0.5) {
          const s2 = spd > 0 ? spd : 0.01;
          n.vx = n.vx / s2 * SPEED_MIN; n.vy = n.vy / s2 * SPEED_MIN;
        }

        // Soft boundary walls
        const margin = 60;
        if (n.x < margin)     n.vx += 0.5;
        if (n.x > w - margin) n.vx -= 0.5;
        if (n.y < margin)     n.vy += 0.5;
        if (n.y > h - margin) n.vy -= 0.5;

        n.x += n.vx;
        n.y += n.vy;
      });

      // ── Render ──
      ctx.fillStyle = '#f5f2ec';
      ctx.fillRect(0, 0, w, h);

      ctx.drawImage(s.paintCanvas, 0, 0);

      // Dynamic proximity edges — form and break as flock moves, fade on settle
      const edgeAlpha = 0.20 * (1 - lockAge);
      if (edgeAlpha > 0.01) {
        ctx.lineWidth = 0.4;
        ctx.strokeStyle = `rgba(80,70,110,${edgeAlpha.toFixed(3)})`;
        ctx.beginPath();
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            const a = nodes[i], b = nodes[j];
            const d2 = (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
            if (d2 > ALIGN_R * ALIGN_R) continue;
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
          }
        }
        ctx.stroke();
      }

      // Nodes — small squares with album thumbnails
      nodes.forEach(n => {
        const hs = n.size / 2;
        ctx.save();
        rrect(ctx, n.x - hs, n.y - hs, n.size, n.size, 2);
        ctx.clip();
        if (n.img?.complete && n.img.naturalWidth > 0) {
          ctx.drawImage(n.img, n.x - hs, n.y - hs, n.size, n.size);
        } else {
          ctx.fillStyle = 'rgba(26,21,32,0.08)';
          ctx.fill();
        }
        ctx.restore();
      });

      if (s.lockStartT !== null && lockAge >= 1 && !s.completeFired) {
        s.completeFired = true;
        propsRef.current.onComplete?.();
      }

      raf = requestAnimationFrame(draw);
    }

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  return <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, zIndex: 0, display: 'block' }} />;
}
