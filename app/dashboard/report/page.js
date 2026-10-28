// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
// app/dashboard/report/page.js
// Report a problem: one box, and Send.
//
// Written on Listening Notes, on the keeper's own desk, and sent to the one
// copy the software comes from (REPORTS_URL), where it lands in the inbox
// beside the sends and the messages. Nothing leaves unless Send is pressed
// — a letter, not a phone-home — and what leaves is what was written plus
// what a keeper would otherwise be asked for: the version, the browser, and
// their name and journal so there is a way to find them.
//
// It was a link to a new GitHub issue for an hour on 2026-09-13. The people
// testing are not GitHub people; being sent there is where a report would
// have stopped. A box on the desk is a report that feels like it happened
// on Listening Notes, which is the whole ask.

import { useEffect, useState } from 'react';
import SiteNav from '../../../components/main_components/SiteNav';
import { useBookplate } from '../../../components/main_components/Bookplate';
import { REPORTS_URL, VERSION, SANDBOX, SANDBOX_SAID } from '../../../library/version';
import { carrySender, journalUrl, tidyJournal } from '../../../library/return_address';

// ── What keepers wrote in, 2026-10-27 ─────────────────────────────────────
// On the one copy reports are sent to (takes_reports), they are listed under
// the box. They lived at the foot of the inbox's sends (2026-09-22); the
// inbox retired with Miyel's Friends brief, and her answers of 2026-10-26
// put them here: "Problem reports → an admin-only view, not the inbox."
// Read marks one read; Dismiss puts it away, as it did there.
function Received() {
  const { keeper_name: myName, site_address: myAddress } = useBookplate();
  const me = { name: myName, address: myAddress };
  const [reports, setReports] = useState(null);
  useEffect(() => {
    fetch('/api/reports', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : { reports: [] }))
      .then(d => setReports(d.reports || []))
      .catch(() => setReports([]));
  }, []);
  async function settle(id, status) {
    const r = await fetch(`/api/reports/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
    }).catch(() => null);
    if (r?.ok) setReports(prev => prev.map(x => (x.id === id ? { ...x, status } : x)));
  }
  const kept = (reports || []).filter(r => r.status !== 'dismissed');
  if (reports === null) return null;
  return (
    <section className="rp-received" aria-label="Problem reports">
      <h2 className="rp-received-title">Problem reports</h2>
      {kept.length === 0 ? <p className="rp-said">Nothing has been reported.</p> : kept.map(r => (
        <div key={r.id} className={'ib-comment' + (r.status === 'read' ? ' ib-report--read' : '')}>
          <div className="ib-comment-head">
            <span className="ib-comment-who">{r.keeper_name || 'Someone'}</span>
            {r.journal && (
              <a href={carrySender(journalUrl(r.journal), me)} target="_blank" rel="noopener noreferrer" className="own-link ib-comment-where">
                their journal &#8599;
              </a>
            )}
            <span className="ib-comment-when">{new Date(r.created_at).toLocaleDateString()}</span>
          </div>
          <p className="ib-comment-text">{r.said}</p>
          <p className="ib-report-meta">{r.version ? `Version ${r.version}` : ''}{r.agent ? ` · ${r.agent}` : ''}</p>
          <div className="ib-comment-row">
            {r.status === 'pending' && (
              <button type="button" onClick={() => settle(r.id, 'read')} className="own-act own-act--solid">Read</button>
            )}
            <button type="button" onClick={() => settle(r.id, 'dismissed')} className="own-act own-act--danger">Dismiss</button>
          </div>
        </div>
      ))}
    </section>
  );
}

export default function ReportPage({ layered = false }) {
  const { keeper_name, site_address, takes_reports: takesReports } = useBookplate();
  const [said, setSaid] = useState('');
  const [state, setState] = useState('idle');   // idle | sending | sent | error
  const [trouble, setTrouble] = useState('');

  async function send(event) {
    event.preventDefault();
    if (!said.trim() || state === 'sending') return;
    // A sandbox sends nothing (library/version.js), and the words stay in
    // the box, as they do after any report that could not go.
    if (SANDBOX) { setState('error'); setTrouble(SANDBOX_SAID); return; }
    setState('sending');
    setTrouble('');
    try {
      const r = await fetch(REPORTS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          said: said.trim(),
          keeper_name: keeper_name || '',
          journal: tidyJournal(site_address),
          version: VERSION,
          agent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error || `It answered ${r.status}.`);
      }
      setState('sent');
      setSaid('');
    } catch (e) {
      setState('error');
      setTrouble(e instanceof TypeError ? "It couldn't be sent just now. Try again in a minute." : e.message);
    }
  }

  return (
    <div className={'own-screen' + (layered ? ' own-screen--layered' : '')}>
      <SiteNav />

      <div className="own-body rp-body">
        <div className="own-panel rp-panel">
          <form className="rp-form" onSubmit={send}>
            <h1 className="rp-title">Report a problem</h1>
            <p className="rp-lead">
              This will be sent to listeningnotes.blog with your journal&rsquo;s version number and
              URL attached.
            </p>
            <textarea
              className="rp-field"
              value={said}
              onChange={e => { setSaid(e.target.value); if (state !== 'idle') setState('idle'); }}
              placeholder="Please describe what went wrong"
              aria-label="What went wrong"
              rows={7}
              maxLength={4000}
            />
            <div className="rp-row">
              <button type="submit" className="own-act own-act--solid" disabled={state === 'sending' || !said.trim()}>
                {state === 'sending' ? 'Sending…' : 'Send'}
              </button>
              <span className="rp-said" role="status">
                {state === 'sent' && 'Sent. Thank you — it will be read.'}
                {state === 'error' && trouble}
              </span>
            </div>
          </form>
        </div>
        {takesReports && <Received />}
      </div>
    </div>
  );
}
