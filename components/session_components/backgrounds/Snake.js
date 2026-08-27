// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
import { useEffect, useRef } from 'react';
import { backgroundScale } from '../../../library/background_scale';

const CELL  = 100;
const SPEED = 250;

export default function Snake({ albums = [] }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!albums.length) return;
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext('2d');

    let cols, rows, dir, next, food, foodIdx, interval;
    let positions = []; // [{x,y}] — positions[0] = head
    let arts      = []; // arts[i] = albumIdx for body segment at positions[i+1]

    const images = albums.map(a => {
      const img = new Image();
      img.src = a.album_art;
      return img;
    });

    function resize() {
      // Mobile draws into a larger coordinate space than it displays, so the
      // artwork keeps its desktop share of the screen. 1 on desktop.
      const k = backgroundScale();
      canvas.width  = Math.round((canvas.parentElement?.clientWidth  || window.innerWidth) / k);
      canvas.height = Math.round((canvas.parentElement?.clientHeight || window.innerHeight) / k);
      cols = Math.floor(canvas.width  / CELL);
      rows = Math.floor(canvas.height / CELL);
      init();
    }

    function init() {
      positions = [{ x: Math.floor(cols / 2), y: Math.floor(rows / 2) }];
      arts      = [];
      dir       = { x: 1, y: 0 };
      next      = { x: 1, y: 0 };
      foodIdx   = 0;
      placeFood();
    }

    function placeFood() {
      const occupied = new Set(positions.map(p => `${p.x},${p.y}`));
      const head     = positions[0];
      const midX     = Math.floor(cols / 2);
      const midY     = Math.floor(rows / 2);

      // Score each quadrant: favour far from head + low snake density
      const quads = [
        { x1: 0,    y1: 0,    x2: midX, y2: midY  },
        { x1: midX, y1: 0,    x2: cols, y2: midY  },
        { x1: 0,    y1: midY, x2: midX, y2: rows  },
        { x1: midX, y1: midY, x2: cols, y2: rows  },
      ].map(q => {
        const cx      = (q.x1 + q.x2) / 2;
        const cy      = (q.y1 + q.y2) / 2;
        const dist    = Math.abs(cx - head.x) + Math.abs(cy - head.y);
        const density = positions.filter(p => p.x >= q.x1 && p.x < q.x2 && p.y >= q.y1 && p.y < q.y2).length;
        return { q, score: dist - density * 2 };
      }).sort((a, b) => b.score - a.score);

      for (const { q } of quads) {
        for (let a = 0; a < 60; a++) {
          const fx = q.x1 + Math.floor(Math.random() * (q.x2 - q.x1));
          const fy = q.y1 + Math.floor(Math.random() * (q.y2 - q.y1));
          if (!occupied.has(`${fx},${fy}`)) { food = { x: fx, y: fy }; return; }
        }
      }
      // Fallback
      let fx, fy;
      do { fx = Math.floor(Math.random() * cols); fy = Math.floor(Math.random() * rows); }
      while (occupied.has(`${fx},${fy}`));
      food = { x: fx, y: fy };
    }

    // BFS flood fill — count open cells reachable from (sx, sy)
    function floodFill(sx, sy, body) {
      const visited = new Set([`${sx},${sy}`]);
      const queue   = [{ x: sx, y: sy }];
      while (queue.length) {
        const { x, y } = queue.shift();
        for (const d of [{ x:1,y:0 },{ x:-1,y:0 },{ x:0,y:1 },{ x:0,y:-1 }]) {
          const nx = x + d.x, ny = y + d.y;
          const key = `${nx},${ny}`;
          if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) continue;
          if (body.has(key) || visited.has(key)) continue;
          visited.add(key);
          queue.push({ x: nx, y: ny });
        }
      }
      return visited.size;
    }

    function autoSteer() {
      const head = positions[0];
      const tail = positions[positions.length - 1];
      const body = new Set(positions.slice(1).map(p => `${p.x},${p.y}`));
      const dirs = [{ x:1,y:0 },{ x:-1,y:0 },{ x:0,y:1 },{ x:0,y:-1 }];

      const safe = dirs.filter(d => {
        if (d.x === -dir.x && d.y === -dir.y) return false;
        const nx = head.x + d.x, ny = head.y + d.y;
        if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) return false;
        return !body.has(`${nx},${ny}`);
      });

      if (!safe.length) { init(); return; }

      // Require meaningful open space — at least 35% of board or 2× snake length
      const minSpace = Math.max(Math.floor(cols * rows * 0.35), positions.length * 2);

      // Body centre of mass — used to reward moves that stretch outward
      const cmx = positions.reduce((s, p) => s + p.x, 0) / positions.length;
      const cmy = positions.reduce((s, p) => s + p.y, 0) / positions.length;

      const scored = safe.map(d => {
        const nx         = head.x + d.x, ny = head.y + d.y;
        const space      = floodFill(nx, ny, body);
        const distFood   = Math.abs(nx - food.x) + Math.abs(ny - food.y);
        const distTail   = Math.abs(nx - tail.x) + Math.abs(ny - tail.y);
        // How far this move takes the head away from the body cluster
        const spread     = Math.abs(nx - cmx) + Math.abs(ny - cmy);
        // Small bonus for continuing straight — reduces tight zigzagging
        const straight   = (d.x === dir.x && d.y === dir.y) ? 3 : 0;
        return { d, space, distFood, distTail, spread, straight };
      });

      const roomy = scored.filter(s => s.space >= minSpace);

      if (roomy.length) {
        // Enough space — head toward food, but reward spreading out and straight lines
        roomy.sort((a, b) => {
          const sa = -a.distFood * 3 + a.spread * 1.5 + a.straight;
          const sb = -b.distFood * 3 + b.spread * 1.5 + b.straight;
          return sb - sa;
        });
        next = Math.random() < 0.9 ? roomy[0].d : roomy[Math.min(1, roomy.length - 1)].d;
      } else {
        // Tight — chase the tail to buy space rather than getting cornered
        scored.sort((a, b) => a.distTail - b.distTail || b.space - a.space);
        next = scored[0].d;
      }
    }

    function shiftTo(nx, ny) {
      // Every segment takes the position of the one ahead of it, head moves to new pos
      for (let i = positions.length - 1; i > 0; i--) {
        positions[i].x = positions[i - 1].x;
        positions[i].y = positions[i - 1].y;
      }
      positions[0].x = nx;
      positions[0].y = ny;
    }

    function tick() {
      autoSteer();
      dir = next;
      const nx = positions[0].x + dir.x;
      const ny = positions[0].y + dir.y;

      if (positions.slice(1).some(p => p.x === nx && p.y === ny)) { init(); return; }

      const ate = nx === food.x && ny === food.y;

      if (ate) {
        // Grow: add new segment at tail (gets tail's current position, shifts forward with the rest)
        arts.unshift(foodIdx);
        positions.push({ x: positions[positions.length - 1].x, y: positions[positions.length - 1].y });
        shiftTo(nx, ny);
        foodIdx = (foodIdx + 1) % images.length;
        if (positions.length >= 40) { init(); return; }
        placeFood();
      } else {
        shiftTo(nx, ny);
      }

      draw();
    }

    function rr(x, y, w, h, r) {
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

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const pad = 3;
      const sz  = CELL - pad * 2;

      // Food
      const fi = images[foodIdx];
      if (fi?.complete) {
        ctx.save();
        rr(food.x * CELL + pad, food.y * CELL + pad, sz, sz, 12);
        ctx.clip();
        ctx.drawImage(fi, food.x * CELL + pad, food.y * CELL + pad, sz, sz);
        ctx.restore();
        ctx.shadowColor = 'rgba(0,0,0,0.3)';
        ctx.shadowBlur  = 16;
        ctx.strokeStyle = 'rgba(255,255,255,0.85)';
        ctx.lineWidth   = 2.5;
        rr(food.x * CELL + pad, food.y * CELL + pad, sz, sz, 12);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // Body — draw tail first so head renders on top
      for (let i = positions.length - 1; i >= 0; i--) {
        const p = positions[i];
        const x = p.x * CELL + pad;
        const y = p.y * CELL + pad;

        if (i === 0) {
          // Head
          ctx.fillStyle = 'rgba(26,25,22,0.92)';
          rr(x, y, sz, sz, 10);
          ctx.fill();
          const eyes = dir.x !== 0
            ? [{ ex: 0.65, ey: 0.28 }, { ex: 0.65, ey: 0.72 }]
            : [{ ex: 0.28, ey: 0.65 }, { ex: 0.72, ey: 0.65 }];
          ctx.fillStyle = '#eef0ec';
          eyes.forEach(({ ex, ey }) => {
            ctx.beginPath();
            ctx.arc(p.x * CELL + CELL * ex, p.y * CELL + CELL * ey, 4, 0, Math.PI * 2);
            ctx.fill();
          });
        } else {
          // Body segment — show its album art
          const artIdx = arts[i - 1];
          const img    = images[artIdx];
          const fade   = 1 - ((i - 1) / (positions.length + 2)) * 0.4;
          if (img?.complete) {
            ctx.globalAlpha = fade;
            ctx.save();
            rr(x, y, sz, sz, 10);
            ctx.clip();
            ctx.drawImage(img, x, y, sz, sz);
            ctx.restore();
            ctx.globalAlpha = 1;
          }
        }
      }
    }

    resize();
    window.addEventListener('resize', resize);
    interval = setInterval(tick, SPEED);
    return () => { clearInterval(interval); window.removeEventListener('resize', resize); };
  }, [albums]);

  // width/height are what make the scaled coordinate space work: an
  // absolutely positioned canvas with only inset:0 keeps its intrinsic
  // bitmap size and overflows, instead of scaling the bitmap into the box.
  return <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none' }} />;
}
