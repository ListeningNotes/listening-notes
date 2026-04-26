'use client';
import { useEffect, useRef } from 'react';

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
      canvas.width  = canvas.parentElement?.clientWidth  || window.innerWidth;
      canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;
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
      let fx, fy;
      do {
        fx = Math.floor(Math.random() * cols);
        fy = Math.floor(Math.random() * rows);
      } while (occupied.has(`${fx},${fy}`));
      food = { x: fx, y: fy };
    }

    function autoSteer() {
      const head  = positions[0];
      const body  = new Set(positions.slice(1).map(p => `${p.x},${p.y}`));
      const safe  = [
        { x: 1, y: 0 }, { x: -1, y: 0 },
        { x: 0, y: 1 }, { x: 0,  y: -1 },
      ].filter(d => {
        if (d.x === -dir.x && d.y === -dir.y) return false;
        const nx = head.x + d.x;
        const ny = head.y + d.y;
        if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) return false;
        return !body.has(`${nx},${ny}`);
      });

      if (!safe.length) { init(); return; }

      safe.sort((a, b) => {
        const da = Math.abs(head.x + a.x - food.x) + Math.abs(head.y + a.y - food.y);
        const db = Math.abs(head.x + b.x - food.x) + Math.abs(head.y + b.y - food.y);
        return da - db;
      });
      next = Math.random() < 0.82 ? safe[0] : safe[Math.floor(Math.random() * safe.length)];
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

  return <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }} />;
}
