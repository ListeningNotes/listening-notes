// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
// app/dashboard/people/page.js
// The address book: the journals this keeper reads.
//
// A person is an address, written down here by the keeper and nobody else.
// Nothing is accepted on the other side and nobody learns they were added —
// the shape of a feed reader's list, not of a follow. A row is a face and a
// name read off the journal itself; what somebody has sent is a layer joined
// from the inbox by the same address, never what makes them exist here. See
// migrations/007_people.sql.
//
// Ways in, none of them typing: the Add press on the journal being read puts
// its address on the clipboard; a send in the inbox that carried one has a
// button; a code — a card's or a cover's — can be pointed at. The field is
// where the clipboard lands, and the fallback for somebody reading an
// address aloud.
//
// A row opens your page about that person. Until that page exists it opens
// the whole-journal compare with their address in hand, which is the larger
// half of what the page will be; the arrow beside it opens their journal, in
// the browser, where reading somebody happens.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Camera, User } from '@phosphor-icons/react';
import SiteNav from '../../../components/main_components/SiteNav';
import CodeScanner from '../../../components/main_components/CodeScanner';
import { journalUrl, tidyJournal } from '../../../library/return_address';

// The order the server keeps: by name, or by address for anyone without one.
function inOrder(people) {
  const called = p => (p.name || p.address).toLowerCase();
  return [...people].sort((a, b) => called(a).localeCompare(called(b)));
}

export default function AddressBook({ layered = false }) {
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typed, setTyped] = useState('');
  const [filing, setFiling] = useState(false);
  const [said, setSaid] = useState('');
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    fetch('/api/auth/check').then(r => r.json()).then(d => setAuthed(!!d.authed)).catch(() => {}).finally(() => setChecking(false));
  }, []);

  useEffect(() => {
    if (!authed) return;
    fetch('/api/people').then(r => r.json()).then(d => { setPeople(d.people || []); setLoading(false); }).catch(() => setLoading(false));
  }, [authed]);

  // Files an address, however it arrived — a paste, a scanned code, an
  // entry's whole link. The server tidies it again and reads the name off
  // the journal; the check here only saves a round trip for a name typed
  // into the wrong box.
  const file = useCallback(async (value) => {
    const address = tidyJournal(value);
    if (!address) { setSaid("That doesn't look like a web address."); return; }
    setFiling(true);
    setSaid('');
    try {
      const r = await fetch('/api/people', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setSaid(d.error || 'That could not be added.'); return; }
      setPeople(prev => inOrder([...prev.filter(p => p.id !== d.person.id), d.person]));
      setTyped('');
      setSaid(d.reached ? '' : `Added. ${address} isn't answering just now, so there's no name yet.`);
    } catch {
      setSaid('That could not be added.');
    } finally {
      setFiling(false);
    }
  }, []);

  const read = useCallback((text) => { setScanning(false); file(text); }, [file]);

  async function remove(id) {
    await fetch(`/api/people/${id}`, { method: 'DELETE' });
    setPeople(prev => prev.filter(p => p.id !== id));
  }

  if (checking) return <div style={{ minHeight: '100vh', background: 'var(--bg)' }} />;
  if (!authed) { if (typeof window !== 'undefined') window.location.replace('/login'); return null; }

  return (
    <div className={'own-screen' + (layered ? ' own-screen--layered' : '')}>
      <SiteNav />

      <div className="own-body bk-body">
        <div className="own-panel bk-panel">
          <div className="bk-scroll">
            {scanning ? (
              <CodeScanner onRead={read} onClose={() => setScanning(false)} />
            ) : (
              <form className="bk-add" onSubmit={e => { e.preventDefault(); file(typed); }}>
                <input
                  className="bk-field"
                  value={typed}
                  onChange={e => setTyped(e.target.value)}
                  placeholder="a journal's address"
                  aria-label="The address of a journal to add"
                  autoComplete="url"
                  inputMode="url"
                  spellCheck={false}
                />
                <button type="submit" className="own-act own-act--solid" disabled={filing || !typed.trim()}>
                  {filing ? 'Adding…' : 'Add'}
                </button>
                <button type="button" className="own-act" onClick={() => setScanning(true)} title="Point the camera at a code">
                  <Camera size={14} aria-hidden="true" /> Scan a code
                </button>
              </form>
            )}
            <p className="bk-said" role="status">{said}</p>

            {loading ? (
              <div className="bk-list" style={{ gap: 10 }}>
                {[...Array(3)].map((_, i) => <div key={i} className="own-skeleton" style={{ height: 46 }} />)}
              </div>
            ) : people.length === 0 ? (
              <div className="own-empty">Nobody yet. Add a journal&rsquo;s address, or scan a code.</div>
            ) : (
              <div className="bk-list">
                {people.map(p => (
                  <div key={p.id} className="bk-row">
                    <Link
                      href={`/compare?with=${encodeURIComponent(p.address)}`}
                      className="bk-person"
                      title={`Compare with ${p.name || p.address}`}
                    >
                      {/* The face is their journal's own portrait, read
                          straight off it; a journal without one, or one
                          that is out, leaves the plain mark showing. */}
                      <span className="bk-face" aria-hidden="true">
                        <User size={20} weight="regular" />
                        <img
                          src={`${journalUrl(p.address)}/api/portrait`}
                          alt=""
                          loading="lazy"
                          onError={e => { e.currentTarget.style.display = 'none'; }}
                        />
                      </span>
                      <span className="bk-who">
                        <span className="bk-name">{p.name || p.address}</span>
                        {p.name && <span className="bk-address">{p.address}</span>}
                      </span>
                    </Link>
                    <a href={journalUrl(p.address)} target="_blank" rel="noopener noreferrer" className="own-link bk-visit" title="Open their journal">
                      visit &#8599;
                    </a>
                    <button type="button" className="own-act own-act--danger" onClick={() => remove(p.id)}>Remove</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
