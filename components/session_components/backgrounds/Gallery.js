'use client';
import { useEffect, useRef } from 'react';

const ADVANCE  = 5000;
const EASE     = 0.06;
const R        = 18;
const MAX_SIDE = 3;

export default function Gallery({ albums = [] }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!albums.length) return;
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext('2d');
    let W, H, raf;

    const images = albums.map(a => {
      const img = new Image();
      img.src = a.album_art;
      return img;
    });

    let center  = 0;         // target index (integer)
    let offset  = 0;         // current float offset (eased)
    let timer   = setTimeout(advance, ADVANCE);

    function advance() {
      center = (center + 1) % images.length;
      clearTimeout(timer);
      timer = setTimeout(advance, ADVANCE);
    }

    function resize() {
      W = canvas.width  = canvas.parentElement?.clientWidth  || window.innerWidth;
      H = canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;
    }

    function rr(x, y, w, h) {
      ctx.beginPath();
      ctx.moveTo(x + R, y);
      ctx.lineTo(x + w - R, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + R);
      ctx.lineTo(x + w, y + h - R);
      ctx.quadraticCurveTo(x + w, y + h, x + w - R, y + h);
      ctx.lineTo(x + R, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - R);
      ctx.lineTo(x, y + R);
      ctx.quadraticCurveTo(x, y, x + R, y);
      ctx.closePath();
    }

    function drawCard(imgIdx, pos) {
      const img = images[imgIdx];
      if (!img?.complete) return;

      const CARD    = Math.min(W * 0.52, H * 0.78);
      const SPACING = CARD * 0.82;

      const maxAngle = Math.PI * 0.28;
      const angle    = Math.sign(pos) * Math.min(Math.abs(pos) * 1.0, maxAngle);
      const cosA     = Math.cos(angle);
      const w        = CARD * cosA;
      const h        = CARD;
      const cx       = W / 2;
      const cy       = H / 2;

      const x = cx + pos * SPACING - w / 2;
      const y = cy - h / 2;

      const dimAlpha = Math.abs(Math.sin(angle)) * 0.72;
      const scale    = 1 - Math.min(Math.abs(pos) * 0.1, 0.5);

      ctx.save();
      ctx.translate(cx + pos * SPACING, cy);
      ctx.scale(scale, scale);
      ctx.translate(-(cx + pos * SPACING), -cy);

      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur  = 40 * scale;
      rr(x, y, w, h);
      ctx.clip();
      ctx.drawImage(img, x, y, w, h);

      // Angle shading
      if (dimAlpha > 0) {
        ctx.fillStyle = `rgba(0,0,0,${dimAlpha})`;
        ctx.fillRect(x, y, w, h);
      }
      ctx.restore();

      // Reflection
      ctx.save();
      ctx.translate(cx + pos * SPACING, cy);
      ctx.scale(scale, -scale * 0.28);
      ctx.translate(-(cx + pos * SPACING), -(cy + h));
      ctx.globalAlpha = 0.15 * (1 - Math.min(Math.abs(pos) * 0.4, 0.9));
      rr(x, y + h, w, h);
      ctx.clip();
      ctx.drawImage(img, x, y + h, w, h);
      ctx.restore();
      ctx.globalAlpha = 1;

      // Reflection fade — plain screen-space gradient, no transforms
      const refTop = cy + (h / 2) * scale;
      const refBot = refTop + h * scale * 0.28;
      const grad   = ctx.createLinearGradient(0, refTop, 0, refBot);
      grad.addColorStop(0, 'rgba(238,240,236,0)');
      grad.addColorStop(1, 'rgba(238,240,236,1)');
      ctx.fillStyle = grad;
      ctx.fillRect(x, refTop, w, refBot - refTop);
    }

    function loop() {
      offset += (center - offset) * EASE;
      ctx.clearRect(0, 0, W, H);

      // Draw back-to-front: far left, far right, then center
      const order = [];
      for (let d = MAX_SIDE; d >= 0; d--) {
        if (d === 0) { order.push(0); continue; }
        order.push(-d);
        order.push(d);
      }

      order.forEach(d => {
        const idx = ((Math.round(offset) + d) % images.length + images.length) % images.length;
        const pos = d - (offset - Math.round(offset));
        drawCard(idx, pos);
      });

      raf = requestAnimationFrame(loop);
    }

    resize();
    window.addEventListener('resize', resize);
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
      window.removeEventListener('resize', resize);
    };
  }, [albums]);

  return <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }} />;
}
