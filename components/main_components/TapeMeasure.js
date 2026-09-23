// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';

// components/main_components/TapeMeasure.js
// TEMPORARY, dev server only, and deleted before the branch merges. The same
// tape measure that found the in-app sheet's missing height, back for the
// keyboard.
//
// Miyel, 2026-09-22: "It still feels weird when I open the keyboard. Like it
// glitches just for a split second, but it's not seamless." Whatever moves
// moves inside a second, on her phone and nowhere else, so this records it:
// from the moment a field takes the focus, every frame for 1.2 seconds —
// where iOS has slid the visible part of the screen to, how tall it is, where
// the listen's sheet and its header actually are, and where the field is —
// and then prints the frames where anything changed, for a screenshot.
//
// Nothing here renders in a production build.

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

const FOR_MS = 1200;

function top(selector) {
  const el = document.querySelector(selector);
  if (!el) return '—';
  const r = el.getBoundingClientRect();
  return `${Math.round(r.top)}/${Math.round(r.bottom)}`;
}

export default function TapeMeasure() {
  const [rows, setRows] = useState(null);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return undefined;
    let recording = false;
    let clear = null;
    const heard = [];

    const snap = t0 => {
      const vv = window.visualViewport;
      const field = document.activeElement;
      const fr = field?.getBoundingClientRect?.();
      const sheet = document.querySelector('.lay');
      return [
        Math.round(performance.now() - t0),
        vv ? Math.round(vv.offsetTop) : '—',
        vv ? Math.round(vv.height) : '—',
        window.innerHeight,
        Math.round(window.scrollY),
        top('.lay'),
        sheet ? Math.round(sheet.scrollTop) : '—',
        top('.ses-head'),
        fr ? `${Math.round(fr.top)}/${Math.round(fr.bottom)}` : '—',
      ].join(' ');
    };

    const onFocus = event => {
      if (recording || !event.target?.matches?.('textarea, input')) return;
      recording = true;
      heard.length = 0;
      const t0 = performance.now();
      const frames = [];
      let last = '';
      const note = what => heard.push(`${Math.round(performance.now() - t0)} ${what}`);
      const vv = window.visualViewport;
      const onVvResize = () => note('vv resize');
      const onVvScroll = () => note('vv scroll');
      const onResize = () => note('win resize');
      const onScroll = () => note('win scroll');
      vv?.addEventListener('resize', onVvResize);
      vv?.addEventListener('scroll', onVvScroll);
      window.addEventListener('resize', onResize);
      window.addEventListener('scroll', onScroll, true);
      // The next frame, or 50ms, whichever comes first: a page that is not
      // being painted gets no frames, and a recording waiting on one would
      // never finish and never let the next one start.
      const next = () => {
        let went = false;
        const go = () => { if (!went) { went = true; step(); } };
        requestAnimationFrame(go);
        setTimeout(go, 50);
      };
      const step = () => {
        const line = snap(t0);
        // Only the frames where something other than the clock moved.
        const body = line.slice(line.indexOf(' '));
        if (body !== last) { frames.push(line); last = body; }
        if (performance.now() - t0 < FOR_MS) { next(); return; }
        vv?.removeEventListener('resize', onVvResize);
        vv?.removeEventListener('scroll', onVvScroll);
        window.removeEventListener('resize', onResize);
        window.removeEventListener('scroll', onScroll, true);
        const dvh = document.createElement('div');
        dvh.style.cssText = 'position:fixed;top:0;height:100dvh;width:1px;visibility:hidden';
        document.body.appendChild(dvh);
        const dvhNow = Math.round(dvh.getBoundingClientRect().height);
        dvh.remove();
        setRows({ frames: frames.slice(0, 34), heard: heard.slice(0, 14), dvhNow });
        recording = false;
        clearTimeout(clear);
        clear = setTimeout(() => setRows(null), 25000);
      };
      next();
    };
    document.addEventListener('focusin', onFocus);
    return () => { document.removeEventListener('focusin', onFocus); clearTimeout(clear); };
  }, []);

  if (!rows) return null;
  // Onto the body, not inside the sheet: the sheet can carry a transform, and
  // a fixed box inside a transformed one is fixed to it rather than to the
  // screen.
  return createPortal(
    <div
      onClick={() => setRows(null)}
      style={{
        position: 'fixed', left: 6, right: 6,
        top: `calc(${typeof window !== 'undefined' && window.visualViewport ? Math.round(window.visualViewport.offsetTop) : 0}px + 6px)`,
        zIndex: 9999, padding: '8px 10px', borderRadius: 10,
        background: 'rgba(200, 20, 20, 0.94)', color: '#fff',
        font: '9.5px/1.35 var(--font-label), monospace', whiteSpace: 'pre',
        overflow: 'hidden',
      }}
    >
      {'ms vvTop vvH innerH scrollY sheet sheetScroll head field\n'}
      {rows.frames.join('\n')}
      {'\n— events —\n'}
      {rows.heard.join('\n')}
      {`\n100dvh now ${rows.dvhNow} · tap to close`}
    </div>,
    document.body,
  );
}
