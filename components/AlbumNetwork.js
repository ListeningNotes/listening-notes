'use client';
import { useEffect, useRef } from 'react';

// Fallback gradient palette — used until real art loads
const PALETTE = [
  ['#e85d04', '#fca311'],
  ['#4361ee', '#4cc9f0'],
  ['#7209b7', '#b5179e'],
  ['#2dc653', '#51cf66'],
  ['#f72585', '#ff6b6b'],
  ['#06d6a0', '#1b9aaa'],
  ['#ffd60a', '#f77f00'],
  ['#a8dadc', '#457b9d'],
  ['#e9c46a', '#f4a261'],
  ['#8338ec', '#3a86ff'],
  ['#ef476f', '#ffd166'],
  ['#118ab2', '#06d6a0'],
];

// Fetch ~350 album art URLs from iTunes across several genres
async function fetchNetworkArt() {
  const terms = ['rock', 'jazz', 'pop', 'hip hop', 'electronic', 'indie', 'classical', 'r&b'];
  const results = await Promise.all(
    terms.map(t =>
      fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(t)}&entity=album&limit=50`)
        .then(r => r.json())
        .then(d => (d.results || []).map(a => a.artworkUrl100).filter(Boolean))
        .catch(() => [])
    )
  );
  // Deduplicate and shuffle
  const all = [...new Set(results.flat())];
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all;
}

const NODE_COUNT = 320;
const SPRING     = 0.0012;
const DAMP       = 0.978;

function makeNodes(w, h) {
  const cx   = w / 2;
  const cy   = h / 2;
  const maxR = Math.min(w, h) * 0.44; // circle fits inside viewport

  const nodes = Array.from({ length: NODE_COUNT }, () => {
    // sqrt gives uniform area distribution (no center clustering)
    const angle = Math.random() * Math.PI * 2;
    const r     = Math.sqrt(Math.random()) * maxR;
    const x     = cx + Math.cos(angle) * r;
    const y     = cy + Math.sin(angle) * r;
    return {
      x, y, homeX: x, homeY: y,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      size:  20 + Math.random() * 16,
      color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
      opacity: 1,
      targetOpacity: 1,
      // spiral data
      angle: Math.atan2(y - h / 2, x - w / 2),
      dist:  Math.hypot(x - w / 2, y - h / 2),
    };
  });

  // Sparse edges — 1–2 per node using nearby indices
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

export default function AlbumNetwork({ searchQuery = '', collapsed = false, albumArt = '', onCollapsed }) {
  const canvasRef = useRef(null);
  const propsRef  = useRef({ searchQuery, collapsed, albumArt, onCollapsed });
  const stateRef  = useRef({
    nodes: [], edges: [], w: 0, h: 0,
    collapseT: null, artImg: null, artOpacity: 0, collapseDone: false,
  });

  // Keep props in sync without restarting RAF
  useEffect(() => { propsRef.current = { searchQuery, collapsed, albumArt, onCollapsed }; });

  // Fetch real album art and assign to nodes as images load
  useEffect(() => {
    fetchNetworkArt().then(urls => {
      const nodes = stateRef.current.nodes;
      if (!nodes.length) return;
      urls.slice(0, NODE_COUNT).forEach((url, i) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = url;
        nodes[i].img = img;
      });
    });
  }, []);

  // Preload art
  useEffect(() => {
    if (!albumArt) return;
    const img = new Image();
    img.onload = () => { stateRef.current.artImg = img; };
    img.src = albumArt;
  }, [albumArt]);

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
      const { searchQuery, collapsed, onCollapsed } = propsRef.current;
      const { nodes, edges, w, h } = s;
      const cx = w / 2, cy = h / 2;

      // Cream background
      ctx.fillStyle = '#f5f2ec';
      ctx.fillRect(0, 0, w, h);

      const hasSearch    = searchQuery.trim().length > 0;
      const targetOpacity = hasSearch ? 0.07 : 1;

      // Trigger collapse
      if (collapsed && s.collapseT === null) s.collapseT = now;

      if (s.collapseT !== null) {
        const elapsed = (now - s.collapseT) / 800;
        const t       = Math.min(elapsed, 1);
        const ease    = t * t * (3 - 2 * t); // smoothstep

        nodes.forEach(n => {
          const angle = n.angle + elapsed * 2.8;
          const dist  = n.dist * (1 - ease);
          n.x = cx + Math.cos(angle) * dist;
          n.y = cy + Math.sin(angle) * dist;
          n.opacity = Math.max(0, 1 - t * 1.3);
        });

        // Album art fades in at center
        if (t > 0.45 && s.artImg) {
          s.artOpacity = Math.min(1, (t - 0.45) / 0.55);
        }

        if (t >= 1 && !s.collapseDone) {
          s.collapseDone = true;
          onCollapsed?.();
        }
      } else {
        // Normal drift + spring
        nodes.forEach(n => {
          n.vx += (n.homeX - n.x) * SPRING;
          n.vy += (n.homeY - n.y) * SPRING;
          n.vx *= DAMP;
          n.vy *= DAMP;
          n.x  += n.vx;
          n.y  += n.vy;
          n.opacity += (targetOpacity - n.opacity) * 0.04;
        });
      }

      // Edges
      ctx.lineWidth = 0.4;
      edges.forEach(([i, j]) => {
        const a = nodes[i], b = nodes[j];
        const alpha = Math.min(a.opacity, b.opacity) * 0.05;
        if (alpha < 0.003) return;
        ctx.strokeStyle = `rgba(80,70,110,${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      });

      // Nodes
      nodes.forEach(n => {
        if (n.opacity < 0.008) return;
        ctx.globalAlpha = n.opacity;
        const hs = n.size / 2;

        if (n.img?.complete && n.img.naturalWidth > 0) {
          // Real album art — clip to rounded square then draw
          ctx.save();
          rrect(ctx, n.x - hs, n.y - hs, n.size, n.size, 2);
          ctx.clip();
          ctx.drawImage(n.img, n.x - hs, n.y - hs, n.size, n.size);
          ctx.restore();
        } else {
          // Gradient fallback while image loads
          const grad = ctx.createLinearGradient(n.x - hs, n.y - hs, n.x + hs, n.y + hs);
          grad.addColorStop(0, n.color[0]);
          grad.addColorStop(1, n.color[1]);
          ctx.fillStyle = grad;
          rrect(ctx, n.x - hs, n.y - hs, n.size, n.size, 2);
          ctx.fill();
        }
      });
      ctx.globalAlpha = 1;

      // Album art at center during collapse
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
      style={{ position: 'fixed', inset: 0, zIndex: 0, display: 'block' }}
    />
  );
}
