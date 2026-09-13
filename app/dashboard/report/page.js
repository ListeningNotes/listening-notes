// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
// app/dashboard/report/page.js
// Report a problem: one box, and Send.
//
// Written on Listening Notes, on the keeper's own desk, and sent to the one
// copy the software comes from (REPORTS_URL), where it lands in the inbox
// beside the sends and the comments. Nothing leaves unless Send is pressed
// — a letter, not a phone-home — and what leaves is what was written plus
// what a keeper would otherwise be asked for: the version, the browser, and
// their name and journal so there is a way to find them.
//
// It was a link to a new GitHub issue for an hour on 2026-09-13. The people
// testing are not GitHub people; being sent there is where a report would
// have stopped. A box on the desk is a report that feels like it happened
// on Listening Notes, which is the whole ask.

import { useState } from 'react';
import SiteNav from '../../../components/main_components/SiteNav';
import { useBookplate } from '../../../components/main_components/Bookplate';
import { REPORTS_URL, VERSION } from '../../../library/version';
import { tidyJournal } from '../../../library/return_address';

export default function ReportPage({ layered = false }) {
  const { keeper_name, site_address } = useBookplate();
  const [said, setSaid] = useState('');
  const [state, setState] = useState('idle');   // idle | sending | sent | error
  const [trouble, setTrouble] = useState('');

  async function send(event) {
    event.preventDefault();
    if (!said.trim() || state === 'sending') return;
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
      </div>
    </div>
  );
}
