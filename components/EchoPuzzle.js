'use client';
import { useEffect, useRef } from 'react';

const COLS = 14;
const ROWS = 14;
const N    = COLS * ROWS; // 196 tiles
const FLY_MS = 950;

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

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function EchoPuzzle({ albumArt, progress = 0, onComplete }) {
  const canvasRef = useRef(null);
  const propsRef  = useRef({ progress, onComplete });
  const stateRef  = useRef({
    nodes: [], edges: [], w: 0, h: 0,
    artImg: null,
    lockOrder: [],
    flashT: null,
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
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        tileCol, tileRow,
        tx: puzzleX + tileCol * TILE + TILE / 2,
        ty: puzzleY + tileRow * TILE + TILE / 2,
        state: 'floating',
        flyT: null, flyStartX: 0, flyStartY: 0,
        lockGlowT: null,
      };
    });

    // Edges: each tile connects to its right and bottom neighbour
    const edges = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const i = r * COLS + c;
        if (c < COLS - 1) edges.push([i, i + 1]);
        if (r < ROWS - 1) edges.push([i, i + COLS]);
      }
    }
    s.edges = edges;

    s.lockOrder = shuffle(Array.from({ length: N }, (_, i) => i));

    let raf;
    function draw(now) {
      const { progress, onComplete } = propsRef.current;
      const { nodes, edges, w, h, artImg, TILE, puzzleX, puzzleY } = s;
      const targetLocked = Math.round(progress * N);

      for (let i = 0; i < targetLocked; i++) {
        const n = nodes[s.lockOrder[i]];
        if (n.state === 'floating') {
          n.state = 'flying';
          n.flyT = now;
          n.flyStartX = n.x;
          n.flyStartY = n.y;
        }
      }

      if (targetLocked >= N && s.flashT === null) s.flashT = now;

      ctx.fillStyle = '#f5f2ec';
      ctx.fillRect(0, 0, w, h);

      const ft = now * 0.00025;

      // ── Strings — fade as tiles fly home ──
      ctx.lineWidth = 0.5;
      edges.forEach(([i, j]) => {
        const a = nodes[i], b = nodes[j];
        const alphaA = a.state === 'locked' ? 0 : a.state === 'flying' ? Math.max(0, 1 - (now - a.flyT) / FLY_MS) : 1;
        const alphaB = b.state === 'locked' ? 0 : b.state === 'flying' ? Math.max(0, 1 - (now - b.flyT) / FLY_MS) : 1;
        const alpha  = Math.min(alphaA, alphaB) * 0.28;
        if (alpha < 0.01) return;
        ctx.strokeStyle = `rgba(80,70,110,${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      });

      nodes.forEach(n => {
        // ── Physics ──
        if (n.state === 'floating') {
          const nx = n.homeX / w, ny = n.homeY / h;
          const fa =
            Math.sin(nx * 4.1 + ft * 1.3) * Math.cos(ny * 3.7 + ft * 0.8) * Math.PI * 1.4 +
            Math.sin(ny * 5.2 - ft * 1.1) * Math.cos(nx * 2.9 + ft * 0.6) * 0.9;
          n.vx += Math.cos(fa) * 0.05;
          n.vy += Math.sin(fa) * 0.05;
          n.vx += (n.homeX - n.x) * 0.004;
          n.vy += (n.homeY - n.y) * 0.004;
          n.vx *= 0.974; n.vy *= 0.974;
          n.x += n.vx; n.y += n.vy;
        } else if (n.state === 'flying') {
          const p     = Math.min(1, (now - n.flyT) / FLY_MS);
          const eased = 1 - Math.pow(1 - p, 3);
          n.x = n.flyStartX + (n.tx - n.flyStartX) * eased;
          n.y = n.flyStartY + (n.ty - n.flyStartY) * eased;
          if (p >= 1) {
            n.state = 'locked'; n.x = n.tx; n.y = n.ty;
            n.lockGlowT = now;
          }
        }

        // ── Draw tile ──
        const hs = TILE / 2;
        const dx = n.x - hs, dy = n.y - hs;
        let radius = 4;
        if (n.state === 'flying')  radius = 4 * Math.max(0, 1 - (now - n.flyT) / FLY_MS);
        if (n.state === 'locked')  radius = 0;

        if (!artImg) {
          ctx.globalAlpha = 0.08;
          rrect(ctx, dx, dy, TILE, TILE, radius);
          ctx.fillStyle = '#1a1520'; ctx.fill();
          ctx.globalAlpha = 1;
        } else {
          const srcX = (n.tileCol / COLS) * artImg.naturalWidth;
          const srcY = (n.tileRow / ROWS) * artImg.naturalHeight;
          const srcW = artImg.naturalWidth  / COLS;
          const srcH = artImg.naturalHeight / ROWS;
          if (radius > 0.5) {
            ctx.save();
            rrect(ctx, dx, dy, TILE, TILE, radius);
            ctx.clip();
            ctx.drawImage(artImg, srcX, srcY, srcW, srcH, dx, dy, TILE, TILE);
            ctx.restore();
          } else {
            ctx.drawImage(artImg, srcX, srcY, srcW, srcH, dx, dy, TILE, TILE);
          }
        }

        // Brief glow when a tile locks in
        if (n.lockGlowT !== null) {
          const ge = now - n.lockGlowT;
          if (ge < 350) {
            const a = Math.sin((ge / 350) * Math.PI) * 0.7;
            ctx.fillStyle = `rgba(255,255,255,${a.toFixed(3)})`;
            rrect(ctx, dx, dy, TILE, TILE, 0); ctx.fill();
          } else { n.lockGlowT = null; }
        }
      });

      // ── Full white flash at completion ──
      if (s.flashT !== null) {
        const fe = now - s.flashT;
        if (fe < 700) {
          ctx.fillStyle = `rgba(255,255,255,${Math.sin((fe / 700) * Math.PI).toFixed(3)})`;
          ctx.fillRect(0, 0, w, h);
        } else if (!s.completeFired) {
          s.completeFired = true;
          onComplete?.();
        }
      }

      raf = requestAnimationFrame(draw);
    }

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  return <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, zIndex: 0, display: 'block' }} />;
}
