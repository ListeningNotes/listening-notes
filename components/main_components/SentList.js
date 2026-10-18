// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
import { useEffect, useState } from 'react';
import { BookOpen, PaperPlaneTilt, VinylRecord, X } from '@phosphor-icons/react';
import { journalUrl } from '../../library/return_address';

// The records this journal has sent that have not come back
// (library/sent_actions.js), behind the Sent door at the top of the inbox
// (Miyel, 2026-10-14: "a way to see the records you've sent ... waiting to be
// returned, basically"). Drawn in the inbox's own row classes, so it reads as
// a page of the same book.
//
// A row is the record and who it went to. Open, it is what was said with it
// and two doors: Visit their journal, and Remove — asked once, since a
// removed row is gone. A row also goes by itself when the record comes back,
// and then it is in the inbox as Came back. No count, no age, no reminder.

function shortDay(value) {
  const day = new Date(value);
  if (Number.isNaN(day.getTime())) return '';
  const sameYear = day.getFullYear() === new Date().getFullYear();
  return day.toLocaleDateString(undefined, sameYear
    ? { month: 'short', day: 'numeric' }
    : { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function SentList() {
  const [rows, setRows] = useState(null);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(null);
  const [sure, setSure] = useState(null);

  useEffect(() => {
    fetch('/api/sent')
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(d => setRows(d.sent || []))
      .catch(() => { setRows([]); setFailed(true); });
  }, []);

  function remove(row) {
    if (sure !== row.id) { setSure(row.id); return; }
    fetch('/api/sent', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: row.id }) }).catch(() => {});
    setRows(prev => prev.filter(r => r.id !== row.id));
    setOpen(null);
    setSure(null);
  }

  if (rows === null) {
    return (
      <div className="ib-list" style={{ gap: 10 }}>
        {[...Array(3)].map((_, i) => <div key={i} className="own-skeleton" style={{ height: 46 }} />)}
      </div>
    );
  }
  if (failed) return <div className="own-empty">The list of what you have sent could not be read just now.</div>;
  if (rows.length === 0) return <div className="own-empty">Nothing you have sent is still out.</div>;

  return (
    <div className="ib-list">
      {rows.map(row => {
        const isOpen = open === row.id;
        const title = row.song || row.album;
        const who = row.name || row.journal;
        return (
          <div key={row.id} className={'ib-r ib-r--sent' + (isOpen ? ' ib-r--open' : '')}>
            <button
              className="ib-rhead"
              aria-expanded={isOpen}
              onClick={() => { setOpen(isOpen ? null : row.id); setSure(null); }}
            >
              <span className="ib-newdot ib-newdot--off" aria-hidden="true" />
              <span className="ib-kind" aria-hidden="true"><PaperPlaneTilt size={17} weight="regular" /></span>
              <span className={'ib-rart' + (row.song && row.album_art ? ' ln-fold' : '')}>
                {row.album_art
                  ? <img src={row.album_art} alt="" loading="lazy" />
                  : <VinylRecord size={18} weight="regular" aria-hidden="true" />}
              </span>
              <span className="ib-rsaid">
                <span className="ib-rttl">{title}</span>
                <span className="ib-rsub">To {who} · {shortDay(row.sent_at)}</span>
              </span>
            </button>
            {isOpen && (
              <div className="ib-open ib-open--doors">
                <p className="ib-said-by">You said{row.song ? `, of ${row.album}` : ''}</p>
                {row.note && <p className="ib-msg">{row.note}</p>}
                <div className="ib-doors fr-doors-row">
                  <a className="fr-door" href={journalUrl(row.journal)} target="_blank" rel="noopener noreferrer">
                    <BookOpen size={22} weight="regular" aria-hidden="true" />
                    Visit
                  </a>
                  <button
                    type="button"
                    className={'fr-door' + (sure === row.id ? ' ib-door--sure' : '')}
                    onClick={() => remove(row)}
                  >
                    <X size={22} weight="regular" aria-hidden="true" />
                    {sure === row.id ? 'Remove?' : 'Remove'}
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
