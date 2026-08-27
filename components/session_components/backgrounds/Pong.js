// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
import { useEffect, useRef } from 'react';
import { backgroundScale } from '../../../library/background_scale';

const PADDLE_W  = 15;
const PADDLE_H  = 200;
const BALL_SIZE = 200;
const SPEED     = 7;

export default function Pong({ albums = [] }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!albums.length) return;
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext('2d');

    let W, H, ball, left, right, ballImgIdx, raf;

    const images = albums.map(a => {
      const img = new Image();
      img.src = a.album_art;
      return img;
    });

    function resize() {
      // Mobile draws into a larger coordinate space than it displays, so the
      // artwork keeps its desktop share of the screen. 1 on desktop.
      const k = backgroundScale();
      W = canvas.width  = Math.round((canvas.parentElement?.clientWidth  || window.innerWidth) / k);
      H = canvas.height = Math.round((canvas.parentElement?.clientHeight || window.innerHeight) / k);
      init();
    }

    function init() {
      ballImgIdx = Math.floor(Math.random() * images.length);
      const angle = (Math.random() * 1.1 - 0.55); // ±0.55 rad ≈ ±31°
      const dir   = Math.random() < 0.5 ? 1 : -1;
      ball = { x: W / 2, y: H / 2, vx: SPEED * dir * Math.cos(angle), vy: SPEED * Math.sin(angle) };

      // Each paddle gets its own personality
      left = {
        x: 40,
        y: H / 2 - PADDLE_H / 2,
        vy: 0,
        maxSpeed: 5.5,
        reaction: 0.18,
        friction: 0.78,
        targetOffset: 0,
        idleTarget: H / 2 - PADDLE_H / 2,
        idleTimer: 0,
      };
      right = {
        x: W - 40 - PADDLE_W,
        y: H / 2 - PADDLE_H / 2,
        vy: 0,
        maxSpeed: 4,
        reaction: 0.10,
        friction: 0.85,
        targetOffset: 0,
        idleTarget: H / 2 - PADDLE_H / 2,
        idleTimer: 60,
      };
    }

    function updatePaddle(p, isLeft) {
      const approaching = isLeft ? ball.vx < 0 : ball.vx > 0;

      // Predict where ball will be when it reaches this paddle
      let targetY;
      if (approaching) {
        const distX = isLeft
          ? ball.x - (p.x + PADDLE_W)
          : p.x - (ball.x + BALL_SIZE);
        const framesAway = Math.abs(distX / ball.vx);
        targetY = ball.y + ball.vy * framesAway + BALL_SIZE / 2 - PADDLE_H / 2;
        // Clamp prediction to screen
        targetY = Math.max(0, Math.min(H - PADDLE_H, targetY));
        // Add per-paddle "personality" offset — makes one aim slightly different than the other
        targetY += p.targetOffset;
      } else {
        // Ball going away — wander to random positions
        p.idleTimer--;
        if (p.idleTimer <= 0) {
          p.idleTarget = Math.random() * (H - PADDLE_H);
          p.idleTimer  = 60 + Math.random() * 80;
        }
        targetY = p.idleTarget;
      }

      const diff = targetY - p.y;
      p.vy += diff * p.reaction;
      p.vy *= p.friction;
      p.vy = Math.max(-p.maxSpeed, Math.min(p.maxSpeed, p.vy));
      p.y += p.vy;
      p.y  = Math.max(0, Math.min(H - PADDLE_H, p.y));
    }

    function tick() {
      ball.x += ball.vx;
      ball.y += ball.vy;

      if (ball.y <= 0)             { ball.y = 0;             ball.vy =  Math.abs(ball.vy); }
      if (ball.y >= H - BALL_SIZE) { ball.y = H - BALL_SIZE; ball.vy = -Math.abs(ball.vy); }

      // Left hit
      if (ball.vx < 0 &&
          ball.x <= left.x + PADDLE_W && ball.x + BALL_SIZE >= left.x &&
          ball.y + BALL_SIZE >= left.y && ball.y <= left.y + PADDLE_H) {
        ball.x  = left.x + PADDLE_W;
        ball.vx = Math.abs(ball.vx);
        // Angle affected by where on paddle it hits
        const rel = (ball.y + BALL_SIZE / 2 - left.y) / PADDLE_H - 0.5;
        ball.vy   = rel * 14 + left.vy * 0.65;
        nextAlbum();
        left.targetOffset  = (Math.random() - 0.5) * 120;
        right.targetOffset = (Math.random() - 0.5) * 140;
      }

      // Right hit
      if (ball.vx > 0 &&
          ball.x + BALL_SIZE >= right.x && ball.x <= right.x + PADDLE_W &&
          ball.y + BALL_SIZE >= right.y && ball.y <= right.y + PADDLE_H) {
        ball.x  = right.x - BALL_SIZE;
        ball.vx = -Math.abs(ball.vx);
        const rel = (ball.y + BALL_SIZE / 2 - right.y) / PADDLE_H - 0.5;
        ball.vy   = rel * 14 + right.vy * 0.65;
        nextAlbum();
        left.targetOffset  = (Math.random() - 0.5) * 120;
        right.targetOffset = (Math.random() - 0.5) * 140;
      }

      // Cap speed
      const spd = Math.sqrt(ball.vx ** 2 + ball.vy ** 2);
      if (spd > 14) { ball.vx = ball.vx / spd * 14; ball.vy = ball.vy / spd * 14; }

      if (ball.x < -BALL_SIZE * 2 || ball.x > W + BALL_SIZE * 2) init();

      updatePaddle(left,  true);
      updatePaddle(right, false);

      draw();
      raf = requestAnimationFrame(tick);
    }

    function nextAlbum() {
      ballImgIdx = (ballImgIdx + 1) % images.length;
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
      ctx.clearRect(0, 0, W, H);

      // Center line
      ctx.setLineDash([12, 16]);
      ctx.strokeStyle = 'rgba(26,25,22,0.08)';
      ctx.lineWidth   = 3;
      ctx.beginPath();
      ctx.moveTo(W / 2, 0);
      ctx.lineTo(W / 2, H);
      ctx.stroke();
      ctx.setLineDash([]);

      // Paddles
      [left, right].forEach(p => {
        ctx.fillStyle = 'rgba(26,25,22,0.75)';
        rr(p.x, p.y, PADDLE_W, PADDLE_H, 6);
        ctx.fill();
      });

      // Ball
      const img = images[ballImgIdx];
      if (img?.complete) {
        ctx.save();
        rr(ball.x, ball.y, BALL_SIZE, BALL_SIZE, 16);
        ctx.clip();
        ctx.drawImage(img, ball.x, ball.y, BALL_SIZE, BALL_SIZE);
        ctx.restore();
        ctx.shadowColor = 'rgba(0,0,0,0.25)';
        ctx.shadowBlur  = 20;
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth   = 2;
        rr(ball.x, ball.y, BALL_SIZE, BALL_SIZE, 16);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    }

    resize();
    window.addEventListener('resize', resize);
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, [albums]);

  // width/height are what make the scaled coordinate space work: an
  // absolutely positioned canvas with only inset:0 keeps its intrinsic
  // bitmap size and overflows, instead of scaling the bitmap into the box.
  return <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none' }} />;
}
