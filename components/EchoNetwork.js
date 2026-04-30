'use client';
import { useEffect, useRef } from 'react';


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
  const all = [...new Set(results.flat())];
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all;
}

const NODE_COUNT = 300;

function makeNodes(w, h) {
  const cx   = w / 2;
  const cy   = h / 2;
  const maxR = Math.min(w, h) * 0.50;

  const nodes = Array.from({ length: NODE_COUNT }, () => {
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
  dimmed = false, zooming = false,
  spotlitArts = [], spotlit = false, onSpotlit = null,
  cardsEmerging = false,
}) {
  const canvasRef = useRef(null);
  const propsRef  = useRef({ searchQuery, collapsed, albumArt, onCollapsed, zooming, spotlit, onSpotlit, cardsEmerging });
  const stateRef  = useRef({
    nodes: [], edges: [], w: 0, h: 0,
    collapseT: null, artImg: null, artOpacity: 0, collapseDone: false,
    zoomT: null,
    spotlitNodes: [],
    spotlitT: null,
    spotlitReported: false,
  });

  // Keep props in sync without restarting RAF
  useEffect(() => { propsRef.current = { searchQuery, collapsed, albumArt, onCollapsed, zooming, spotlit, onSpotlit, cardsEmerging }; });

  // Fetch random network art and assign to nodes as images load
  useEffect(() => {
    fetchNetworkArt().then(urls => {
      const nodes = stateRef.current.nodes;
      if (!nodes.length) return;
      urls.slice(0, NODE_COUNT).forEach((url, i) => {
        if (nodes[i].isSpotlit) return; // don't overwrite spotlit art
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = url;
        nodes[i].img = img;
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
  }, [spotlitArts.join('|')]);

  // Preload session album art (for collapse animation)
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
      const { searchQuery, collapsed, onCollapsed, zooming, spotlit, onSpotlit, cardsEmerging } = propsRef.current;
      const { nodes, edges, w, h } = s;
      const cx = w / 2, cy = h / 2;

      // Track zoom start for turbulence
      if (zooming && s.zoomT === null) s.zoomT = now;
      if (!zooming) s.zoomT = null;

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
      } else {
        // Flow field with turbulence burst on zoom
        const t = now * 0.00028;
        const turbulence = s.zoomT !== null
          ? Math.max(0, 1 - (now - s.zoomT) / 1800)
          : 0;
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

      // Edges
      ctx.lineWidth = 0.4;
      edges.forEach(([i, j]) => {
        const a = nodes[i], b = nodes[j];
        const alpha = Math.min(a.opacity, b.opacity) * 0.22;
        if (alpha < 0.01) return;
        ctx.strokeStyle = `rgba(80,70,110,${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      });

      function drawNode(n) {
        if (n.opacity < 0.008) return;
        if (!n.img?.complete || n.img.naturalWidth === 0) return;
        ctx.globalAlpha = n.opacity;
        const hs = n.size / 2;
        ctx.save();
        rrect(ctx, n.x - hs, n.y - hs, n.size, n.size, 3);
        ctx.clip();
        ctx.drawImage(n.img, n.x - hs, n.y - hs, n.size, n.size);
        ctx.restore();
      }

      // Irrelevant nodes first, found nodes on top so they're never obscured
      nodes.forEach(n => { if (!n.isSpotlit) drawNode(n); });
      nodes.forEach(n => { if (n.isSpotlit)  drawNode(n); });
      ctx.globalAlpha = 1;

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
        position: 'fixed', inset: 0, zIndex: 0, display: 'block',
        opacity: dimmed ? 0.12 : 1,
        transform: zooming ? 'scale(1.65)' : 'scale(1)',
        transition: 'transform 2.2s cubic-bezier(0.25,1.0,0.5,1), opacity 1.8s ease',
        transformOrigin: 'center center',
      }}
    />
  );
}
