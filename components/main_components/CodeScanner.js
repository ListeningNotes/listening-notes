// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/main_components/CodeScanner.js
// A camera pointed at a code.
//
// The address book's third way in. A card's code and a cover's code both
// carry an address, and a phone has a camera — so rather than scanning with
// the camera app, landing on the journal and copying its address back out,
// the book looks for itself. The reader is jsQR, the same one that judges
// every pressed code on the server, which is also why a code that passed the
// press can be trusted to read here.
//
// Frames are read a few times a second from a copy no wider than 640px: jsQR
// on a full camera frame is a noticeable pause on a phone, and a code held up
// to a camera is large in the frame anyway. Whatever it decodes is handed up
// as text; the caller decides whether it is an address.
//
// The camera wants https or localhost, the same as the clipboard — over a
// plain http address on the network it will not open, and the line says so.
'use client';
import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';

const WIDEST = 640;
const EVERY_MS = 150;

export default function CodeScanner({ onRead, onClose }) {
  const videoRef = useRef(null);
  const [trouble, setTrouble] = useState('');

  useEffect(() => {
    let stream = null;
    let timer = null;
    let stopped = false;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    function look() {
      if (stopped) return;
      const video = videoRef.current;
      if (video && video.readyState >= 2 && video.videoWidth) {
        const scale = Math.min(1, WIDEST / video.videoWidth);
        canvas.width = Math.round(video.videoWidth * scale);
        canvas.height = Math.round(video.videoHeight * scale);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
        // Both inks: the dark page's code is the light one with its ink
        // flipped, and a phone may be pointed at either.
        const found = jsQR(frame.data, frame.width, frame.height, { inversionAttempts: 'attemptBoth' });
        if (found?.data) { stopped = true; onRead(found.data); return; }
      }
      timer = setTimeout(look, EVERY_MS);
    }

    async function open() {
      // No camera API at all means the page is not on a secure address:
      // a phone reaching the dev server by its network address over plain
      // http. The live site is https; so is the dev server run with
      // --experimental-https (NOTES, the real-phone item).
      if (!navigator.mediaDevices?.getUserMedia) {
        setTrouble('The camera only opens on a secure address (https). Over a plain http address it cannot — use the live site, or run the dev server over https.');
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
      } catch (e) {
        // Say which, because the fixes are different: a refusal is a
        // setting in the browser (or a browser that will not ask, which is
        // what the Claude app's pane does), no camera is the machine, and
        // anything else is the camera being busy or unhappy.
        setTrouble(
          e?.name === 'NotAllowedError'
            ? 'The camera was refused. Allow it for this site in the browser, or open the address book in Safari.'
            : e?.name === 'NotFoundError' || e?.name === 'OverconstrainedError'
              ? 'No camera was found on this device.'
              : 'The camera could not be opened. Another app may be using it.'
        );
        return;
      }
      if (stopped) { stream.getTracks().forEach(t => t.stop()); return; }
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      try { await video.play(); } catch { /* autoplay refused; the frame still draws once it starts */ }
      look();
    }

    open();
    return () => {
      stopped = true;
      clearTimeout(timer);
      stream?.getTracks().forEach(t => t.stop());
    };
  }, [onRead]);

  return (
    <div className="bk-scan">
      <video ref={videoRef} className="bk-scan-video" playsInline muted autoPlay />
      {trouble && <p className="bk-scan-trouble">{trouble}</p>}
      <button type="button" className="own-act" onClick={onClose}>Cancel</button>
    </div>
  );
}
