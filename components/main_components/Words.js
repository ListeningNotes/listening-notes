// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
// components/main_components/Words.js
// All the words with one friend, each conversation under the record it is
// about. At /dashboard/people/[id]/words, from their page's All words, and
// from Words on something they wrote, which opens at that record.
//
// Miyel's Friends brief, step four. A conversation you can see whole:
//
//   - The record pinned at the top — cover, title, artist, and About · N
//     notes. A conversation is always about something; that is what stops
//     this being a chat app.
//   - Theirs on the left, filled; yours on the right, outlined. No colour,
//     so it survives dark mode and never looks like a messaging product.
//   - A hairline spine down the middle behind them, seen in the gaps, so
//     the thread reads as one piece.
//   - When, in the label face at 9px (her answers: 6.5 was wrong for a
//     phone), under each.
//   - Write back at the foot.
//
// One conversation per record, never per person and never a list of all of
// them anywhere: this page is one friend's, and words always travel with a
// record. Something they wrote about no record — an old comment, a message
// from before — stands last, under no record at all.
//
// Your side is what this copy has kept since it began keeping it (said_back,
// migrations/045); earlier replies landed on their journal and left nothing
// here, which the foot of the page says (her answers, 2026-10-26).
//
// What they wrote is opened by reading it here: it stops saying New on
// their face, and nothing is told to anybody.

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowBendUpLeft, CaretLeft, User } from '@phosphor-icons/react';
import MessageForm from './Slug_Page/MessageForm';
import { journalUrl, tidyJournal } from '../../library/return_address';
import { arrivingBack } from '../../library/handoff';

// When one thing was said, short: a weekday and the time inside the week,
// the date after.
function stamp(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  const days = (Date.now() - d.getTime()) / 86400000;
  if (days < 6.5) return `${d.toLocaleDateString(undefined, { weekday: 'short' })} · ${time}`;
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return `${d.toLocaleDateString(undefined, sameYear ? { month: 'short', day: 'numeric' } : { month: 'short', day: 'numeric', year: 'numeric' })} · ${time}`;
}

// The record a thing was said about, as a key: the journal it lives on
// (empty for this journal's own) and its slug. Empty for no record.
const aboutOf = w => (w.about_slug ? `${tidyJournal(w.about_journal || '') || ''}/${w.about_slug}` : '');

function Face({ address }) {
  return (
    <span className="pn-face" aria-hidden="true">
      <User size={22} weight="regular" />
      {address && <img src={`${journalUrl(address)}/api/portrait`} alt="" onError={e => { e.currentTarget.style.display = 'none'; }} />}
    </span>
  );
}

export default function Words({ layered = false }) {
  const { id } = useParams();
  const router = useRouter();
  // null until asked; { failed } when it could not be read.
  const [read, setRead] = useState(null);
  const [writing, setWriting] = useState('');

  useEffect(() => {
    let gone = false;
    fetch(`/api/messages?person=${encodeURIComponent(id)}`, { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then(d => { if (!gone) setRead({ person: d.person, words: d.words || [], since: d.since || null }); })
      .catch(() => { if (!gone) setRead({ failed: true, words: [] }); });
    return () => { gone = true; };
  }, [id]);

  // Opened by reading: anything of theirs not seen yet is marked seen.
  const marked = useRef(false);
  useEffect(() => {
    if (!read?.words?.length || marked.current) return;
    marked.current = true;
    for (const w of read.words) {
      if (w.side !== 'theirs' || w.seen_at) continue;
      fetch('/api/messages', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: w.id }),
      }).catch(() => null);
    }
  }, [read]);

  const name = read?.person?.name || 'them';
  // Each record's words together, oldest first inside; the record whose
  // words moved last at the top; no record last of all.
  const chains = useMemo(() => {
    const by = new Map();
    for (const w of read?.words || []) {
      const key = aboutOf(w);
      let chain = by.get(key);
      if (!chain) { chain = { key, words: [] }; by.set(key, chain); }
      chain.words.push(w);
    }
    return [...by.values()].map(c => {
      const lead = c.words.find(w => w.about_album || w.about_song) || c.words[0];
      const last = c.words[c.words.length - 1];
      // What Write back answers: the newest thing they said here.
      const answer = [...c.words].reverse().find(w => w.side === 'theirs') || null;
      return {
        ...c,
        album: lead.about_album || '',
        artist: lead.about_artist || '',
        art: lead.about_art || '',
        song: lead.about_song || '',
        lastAt: Date.parse(last.at) || 0,
        answer,
      };
    }).sort((a, b) => (a.key === '' ? 1 : b.key === '' ? -1 : b.lastAt - a.lastAt));
  }, [read]);

  // Arriving at one record (Words on something they wrote): it is scrolled
  // to, once it is drawn.
  const rootRef = useRef(null);
  const went = useRef(false);
  useLayoutEffect(() => {
    if (went.current || chains.length === 0) return;
    const hash = typeof window !== 'undefined' ? decodeURIComponent(window.location.hash.slice(1)) : '';
    went.current = true;
    if (!hash) return;
    const el = rootRef.current?.querySelector(`[data-about="${CSS.escape(hash)}"]`);
    el?.scrollIntoView({ block: 'start' });
  }, [chains]);

  const goBack = () => {
    arrivingBack();
    if (typeof window !== 'undefined' && window.history.length > 1) router.back();
    else router.push(`/dashboard/people/${id}`);
  };

  // A reply, through the outbox as every reply goes; landed, it joins the
  // conversation here at once.
  const writeBack = async (chain, said) => {
    const r = await fetch('/api/outbox', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: true, reply_to: chain.answer.id, said }),
    }).catch(() => null);
    const d = await r?.json().catch(() => null);
    if (!r?.ok || !d?.ok) {
      return { ok: false, error: d?.error || 'Something went wrong. Nothing was sent, and your words are still here.' };
    }
    const at = d.said_at || new Date().toISOString();
    setRead(prev => ({
      ...prev,
      since: prev.since || at,
      words: [...prev.words, {
        id: `new-${Date.now()}`, side: 'mine', said, at,
        about_journal: chain.answer.about_journal, about_slug: chain.answer.about_slug,
        about_album: chain.answer.about_album, about_artist: chain.answer.about_artist,
        about_art: chain.answer.about_art, about_song: chain.answer.about_song,
      }],
    }));
    return { ok: true };
  };

  const since = read?.since ? new Date(read.since) : null;
  const keptFrom = since
    ? `What you write back is kept here from ${since.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })} on.`
    : 'What you write back is kept here from now on.';

  return (
    <div ref={rootRef} className={'own-screen pn-screen wd-screen' + (layered ? ' own-screen--layered' : '')}>
      <header className="pn-hdr">
        <button type="button" className="pn-hdr-back" onClick={goBack} aria-label="Back" title="Back">
          <CaretLeft size={20} weight="regular" aria-hidden="true" />
        </button>
        <Face address={read?.person?.address || ''} />
        <h1 className="wd-name">{read?.person ? name : ''}</h1>
      </header>

      <div className="own-body pn-body wd-body">
        {read === null ? null : read.failed ? (
          <p className="wd-said">These words could not be read just now.</p>
        ) : chains.length === 0 ? (
          <p className="wd-said">Nothing between you yet. Words start on a record — write from one of {name}&rsquo;s entries.</p>
        ) : chains.map(chain => (
          <section key={chain.key || 'none'} className="wd-chain" data-about={chain.key}>
            {chain.key && (
              <div className="wd-about">
                <span className="wd-about-art" aria-hidden="true">
                  {chain.art ? <img src={chain.art} alt="" loading="lazy" onError={e => { e.currentTarget.style.visibility = 'hidden'; }} /> : null}
                </span>
                <span className="wd-about-says">
                  <span className="wd-about-count">About · {chain.words.length} {chain.words.length === 1 ? 'note' : 'notes'}</span>
                  <span className="wd-about-title">{chain.song || chain.album}</span>
                  <span className="wd-about-artist">{chain.song ? chain.album : chain.artist}</span>
                </span>
              </div>
            )}
            <div className="wd-thread">
              {chain.words.map(w => (
                <div key={`${w.side}-${w.id}`} className={'wd-one wd-one--' + w.side}>
                  <p className="wd-bubble">{w.said}</p>
                  <span className="wd-when">{stamp(w.at)}</span>
                </div>
              ))}
            </div>
            {chain.answer && (
              writing === chain.key ? (
                <div className="wd-form">
                  <MessageForm
                    draftKey={`words-${id}-${chain.key}`}
                    label={`Your words to ${name}`}
                    placeholder={`Write back to ${name}`}
                    send={said => writeBack(chain, said)}
                    onSent={() => setWriting('')}
                    onLeave={() => setWriting('')}
                  />
                </div>
              ) : (
                <button type="button" className="wd-write" onClick={() => setWriting(chain.key)}>
                  <ArrowBendUpLeft size={16} weight="regular" aria-hidden="true" />
                  Write back
                </button>
              )
            )}
          </section>
        ))}
        {read && !read.failed && <p className="wd-kept">{keptFrom}</p>}
      </div>
    </div>
  );
}
