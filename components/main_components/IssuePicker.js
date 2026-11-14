// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
// components/main_components/IssuePicker.js
// Add yours: choosing which of your own records go to this month's prompt
// (Community, Issue.js). Your wall's records in a strip — never a search,
// so if nothing on the wall answers the prompt, the answer is to go and
// listen — the one you are looking at large, with the writing it would
// send as it stands; a tray under it of up to the records you have left
// (three a prompt, 2026-11-12); and Send, the one filled control.
//
// A record is chosen by tapping it twice, or by dragging it down out of the
// strip onto a spot in the tray (Miyel, 2026-11-13); dragged off the tray it
// comes out again. Sideways is still the strip scrolling, so a drag starts
// only when the finger goes more down than across.
//
// Nothing here is typed into. What goes is the post as it stands, through
// the prompt's own door (/api/prompt, library/month_prompt.js), one record
// at a time; a record that fails stays in the tray and says why.

import { useEffect, useRef, useState } from 'react';
import { X } from '@phosphor-icons/react';
import { useMonthPrompt } from './MonthPrompt';

export default function IssuePicker({ prompt, left, sent, onClose, onSent }) {
  const [, tellPrompt] = useMonthPrompt(true);
  const [records, setRecords] = useState(null);
  const [looking, setLooking] = useState(null);
  const [writing, setWriting] = useState({});
  const [tray, setTray] = useState([]);
  const [sending, setSending] = useState(false);
  const [trouble, setTrouble] = useState('');
  const [drag, setDrag] = useState(null);
  const press = useRef(null);
  const dragged = useRef(false);
  const trayRef = useRef(null);
  const slotRefs = useRef([]);

  // The wall's records, newest first, less any already sent.
  useEffect(() => {
    let live = true;
    fetch('/api/entries').then(r => (r.ok ? r.json() : { entries: [] })).catch(() => ({ entries: [] })).then(d => {
      if (!live) return;
      const gone = new Set((sent || []).map(r => r.slug));
      const mine = (d.entries || []).filter(e => e.slug && !gone.has(e.slug));
      setRecords(mine);
      if (mine[0]) setLooking(mine[0].slug);
    });
    return () => { live = false; };
  }, [sent]);

  // The writing the one being looked at would send, read once each.
  useEffect(() => {
    if (!looking || writing[looking] !== undefined) return;
    fetch(`/api/entries/${encodeURIComponent(looking)}`).then(r => (r.ok ? r.json() : null)).catch(() => null).then(d => {
      setWriting(w => ({ ...w, [looking]: String(d?.entry?.notes || '') }));
    });
  }, [looking, writing]);

  // Escape puts it away.
  useEffect(() => {
    const key = e => { if (e.key === 'Escape' && !sending) onClose(); };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [onClose, sending]);

  const seen = records?.find(r => r.slug === looking) || null;
  const inTray = slug => tray.some(r => r.slug === slug);
  const toggle = record => {
    setTrouble('');
    if (inTray(record.slug)) setTray(t => t.filter(r => r.slug !== record.slug));
    else if (tray.length < left) setTray(t => [...t, record]);
  };

  // Where a record let go goes: onto spot i (taking the place of what is
  // there, or swapping with it when it came from the tray), into the next
  // free spot, or out when it came from the tray and landed off it.
  const place = (record, from, over) => {
    setTrouble('');
    setTray(t => {
      const at = t.findIndex(r => r.slug === record.slug);
      if (over === null) return at >= 0 && from === 'slot' ? t.filter(r => r.slug !== record.slug) : t;
      if (over === 'tray' || over >= t.length) {
        if (at >= 0) return t;
        return t.length < left ? [...t, record] : t;
      }
      const next = [...t];
      if (at >= 0) { next[at] = next[over]; next[over] = record; return next; }
      next[over] = record;
      return next;
    });
  };

  const overAt = (x, y) => {
    const hit = el => { const b = el?.getBoundingClientRect(); return b && x >= b.left - 8 && x <= b.right + 8 && y >= b.top - 8 && y <= b.bottom + 8; };
    const i = slotRefs.current.findIndex(hit);
    if (i >= 0) return i;
    return hit(trayRef.current) ? 'tray' : null;
  };

  // The spot a record held over the tray would land in, to light it: the
  // spots fill from the left, so past the last full one is the next free.
  const landsAt = d => {
    if (d.over === null) return null;
    const at = tray.findIndex(r => r.slug === d.record.slug);
    if (d.over !== 'tray' && d.over < tray.length) return d.over;
    if (at >= 0) return d.from === 'slot' ? at : null;
    return tray.length < left ? tray.length : null;
  };

  const grab = (record, from) => ({
    onPointerDown: e => {
      if (sending || (e.pointerType === 'mouse' && e.button !== 0)) return;
      if (e.pointerType === 'mouse') e.preventDefault();
      press.current = { record, from, id: e.pointerId, x: e.clientX, y: e.clientY, on: false };
    },
    onPointerMove: e => {
      const p = press.current;
      if (!p || p.id !== e.pointerId) return;
      if (!p.on) {
        const dx = Math.abs(e.clientX - p.x), dy = Math.abs(e.clientY - p.y);
        if (from === 'strip' && dx > 10 && dx >= dy) { press.current = null; return; }
        if (from === 'strip' ? !(dy > 8 && dy > dx) : Math.hypot(dx, dy) < 6) return;
        p.on = true;
        try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* the pointer is already gone */ }
      }
      setDrag({ record, from, x: e.clientX, y: e.clientY, over: overAt(e.clientX, e.clientY) });
    },
    onPointerUp: e => {
      const p = press.current;
      press.current = null;
      if (!p?.on) return;
      dragged.current = true;
      setTimeout(() => { dragged.current = false; }, 0);
      place(record, from, overAt(e.clientX, e.clientY));
      setDrag(null);
    },
    onPointerCancel: () => { press.current = null; setDrag(null); },
  });

  const send = async () => {
    if (!tray.length || sending) return;
    setSending(true);
    setTrouble('');
    let still = [...tray];
    for (const record of tray) {
      const answer = await fetch('/api/prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: record.slug }),
      }).then(r => r.json()).catch(() => null);
      if (!answer?.ok) {
        setTrouble(answer?.error || 'It couldn’t be sent just now. Try again in a minute.');
        break;
      }
      if (answer.prompt) tellPrompt(answer.prompt);
      still = still.filter(r => r.slug !== record.slug);
    }
    setTray(still);
    setSending(false);
    if (!still.length) onSent();
  };

  return (
    <div className="ip" role="dialog" aria-label="Add yours">
      <div className="ip-head">
        <p className="ip-tip">{prompt?.said}</p>
        <button type="button" className="ip-x" onClick={onClose} aria-label="Put this away" disabled={sending}>
          <X size={18} weight="bold" />
        </button>
      </div>

      {records === null ? (
        <p className="is-quiet">Your wall…</p>
      ) : records.length === 0 ? (
        <p className="is-quiet">Nothing on your wall to send yet. Go and listen.</p>
      ) : (
        <>
          <div className="ip-strip">
            {records.map(r => (
              <button
                key={r.slug}
                type="button"
                className={'ip-one' + (r.slug === looking ? ' ip-one--looking' : '') + (inTray(r.slug) ? ' ip-one--in' : '')}
                onClick={() => { if (dragged.current) return; if (r.slug === looking) toggle(r); else setLooking(r.slug); }}
                {...grab(r, 'strip')}
                aria-label={r.song || r.album}
                aria-pressed={inTray(r.slug)}
              >
                {r.album_art ? <img src={r.album_art} alt="" loading="lazy" draggable={false} /> : <span>♪</span>}
              </button>
            ))}
          </div>

          {seen && (
            <div className="ip-seen">
              <h3 className="ip-title">{seen.song || seen.album}</h3>
              <p className="ip-by">{[seen.song ? seen.album : '', seen.artist, seen.year].filter(Boolean).join(' · ')}</p>
              {writing[seen.slug] === undefined
                ? <p className="ip-writing ip-writing--none">…</p>
                : writing[seen.slug]
                  ? <p className="ip-writing">{writing[seen.slug]}</p>
                  : <p className="ip-writing ip-writing--none">Nothing written; the record goes alone.</p>}
              <button type="button" className="ln-word ip-pick" onClick={() => toggle(seen)} disabled={!inTray(seen.slug) && tray.length >= left}>
                {inTray(seen.slug) ? 'Take it out' : 'Choose this one'}
              </button>
            </div>
          )}

          <div className="ip-tray" aria-label="Chosen" ref={trayRef}>
            {Array.from({ length: left }, (_, i) => tray[i]).map((r, i) => (
              <span
                key={r?.slug || `empty-${i}`}
                ref={el => { slotRefs.current[i] = el; }}
                className={'ip-slot' + (r ? ' ip-slot--full' : '') + (drag && landsAt(drag) === i ? ' ip-slot--over' : '') + (drag?.from === 'slot' && r?.slug === drag.record.slug ? ' ip-slot--lifted' : '')}
                {...(r ? grab(r, 'slot') : {})}
              >
                {r?.album_art && !(drag?.from === 'slot' && r.slug === drag.record.slug) && <img src={r.album_art} alt="" draggable={false} />}
              </span>
            ))}
          </div>

          <p className="ip-said">What you send is on the issue for anyone: the record, its writing as it stands, and your name.</p>
          {trouble && <p className="ip-trouble">{trouble}</p>}
          <button type="button" className="is-add ip-send" onClick={send} disabled={!tray.length || sending}>
            {sending ? 'Sending…' : 'Send'}
          </button>
        </>
      )}

      {drag && (
        <span className="ip-ghost" style={{ left: drag.x, top: drag.y }} aria-hidden="true">
          {drag.record.album_art ? <img src={drag.record.album_art} alt="" draggable={false} /> : <span>♪</span>}
        </span>
      )}
    </div>
  );
}
