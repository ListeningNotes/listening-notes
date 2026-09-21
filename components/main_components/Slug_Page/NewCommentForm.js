// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { User } from '@phosphor-icons/react';
import { keep_receipt } from '../../../library/receipts';
import { recallSender, keepSender, journalUrl } from '../../../library/return_address';

// The one comment form. A new comment and a reply are the same act with a
// different parent, and they were two copies of these fields until 2026-09-21
// — two places to keep the receipts, the errors and the remembering in step,
// and the reply half had drifted already: it never sent `author_url`, so
// answering somebody cost you the link to your own journal that commenting
// did not. `parentId` is the whole difference between them.
//
// Styles are .ln-say-* in entry.css.
export default function NewCommentForm({ slug, trackIndex, parentId = null, onPosted, onLeave }) {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [text, setText] = useState('');
  // Whether to ask, even though we know. The one way out of a wrong answer:
  // a shared browser, an old address, somebody who would rather not be
  // introduced as themselves this time.
  const [asking, setAsking] = useState(false);

  // Both remembered, under the one key the send form uses — see
  // return_address.js. Type your name on any journal and it is already there
  // on the next one, which matters more here than on a send: somebody leaving
  // a second comment should not be asked who they are again.
  useEffect(() => {
    const known = recallSender();
    setName(known.name);
    setAddress(known.address);
  }, []);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');
  const mine = useRef(null);
  const saying = useRef(null);

  // ── Room under it, and the keyboard's own rules ─────────────────────────
  // The entry's notes live in an inner scroller (.ln-screen-two-scroll), and a
  // form opened on the last track lands against its bottom edge with the Post
  // under the keyboard. A correction already has the answer to this and so
  // does crediting a send: 96px of floor on the element that actually scrolls,
  // for as long as the thing is open. This is the third, and it asks for it
  // the same way — a class on the screens, written from here.
  //
  // From here rather than from CommentBubble because *both* forms are this
  // component now, on a track or on the album notes or inside a branch, and
  // one place that is mounted exactly when a form is open cannot get out of
  // step with itself. Written to the DOM rather than threaded up through
  // TrackThread, which is the same call About.js makes for the editing bar:
  // the scroller and this form have no component in common short of the page.
  useLayoutEffect(() => {
    const screens = mine.current?.closest('.ln-screens');
    if (!screens) return undefined;
    screens.classList.add('ln-saying');
    saying.current = screens;
    return () => { saying.current?.classList.remove('ln-saying'); saying.current = null; };
  }, []);

  // And the cursor, so the keyboard is already up. The same rule as the send
  // sheet's, and a layout effect for the same reason: iOS grants a focus that
  // is still the tap's, and a plain effect runs after the paint, which is past
  // it. See the note in SendSheet.js.
  //
  // No preventScroll here, which is where this differs: the sheet places
  // itself against the visible window and has nowhere to scroll, and this sits
  // in a scroller that *should* bring the field up over the keyboard. Letting
  // the browser do that is the whole of what makes it behave.
  const wrote = useRef(false);
  useLayoutEffect(() => {
    if (wrote.current) return;
    wrote.current = true;
    mine.current?.querySelector('textarea')?.focus();
  }, []);

  // ── When we already know whose journal this is ──────────────────────────
  // Miyel, 2026-09-21: "we don't need name if you're commenting from a
  // journal — it can just put your keeper name and pfp bubble and it will
  // already be linked to your journal. Much simpler. Now if you don't have a
  // journal, name is fine."
  //
  // Two fields become a face. The portrait is the one their own journal
  // serves, in an <img> from their address, the same way the address book and
  // the feed draw a person — nothing is stored here and nothing is fetched.
  //
  // Both, not either: an address with no name gives a face with nothing to
  // call it, and a name with no address is a stranger who typed one once. The
  // fields come back for anything short of both, with whatever is known
  // already in them, so there is at most one thing left to type.
  const knowMe = Boolean(name.trim() && address.trim()) && !asking;

  async function handlePost() {
    setError('');
    if (!name.trim() || !text.trim()) { setError('A name and a comment, and that is all.'); return; }
    setPosting(true);
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          track_index: trackIndex,
          parent_id: parentId || undefined,
          author_name: name,
          author_url: address,
          content: text,
        }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      // Kept for the next journal this reader comments on, which is the whole
      // reason the fields arrive filled in.
      keepSender({ name, address });
      setText('');

      // Keeping the receipt is what lets the next load show this comment back
      // to the person who wrote it while it waits to be read.
      keep_receipt(data.receipt);

      // Straight out, with no thank-you screen and no 1.6s wait. The comment
      // itself appearing in the thread is a better confirmation than any
      // message about it could be, and that used to be impossible: the comment
      // was invisible even to its author, so a message was all there was.
      onPosted();
    } catch { setError('Something went wrong. Nothing was posted.'); }
    finally { setPosting(false); }
  }

  return (
    <div className="ln-say-fields" ref={mine}>
      {knowMe ? (
        // Who this is going to be signed by. Not a field and not a label over
        // one: it is a statement, and the only thing to do with it is disagree.
        <div className="ln-say-me">
          <span className="ln-sender-portrait" aria-hidden="true">
            <User size={16} weight="regular" />
            <img
              src={`${journalUrl(address)}/api/portrait`}
              alt=""
              loading="lazy"
              onError={e => { e.currentTarget.style.display = 'none'; }}
            />
          </span>
          <span className="ln-say-me-name">{name}</span>
          <button type="button" className="ln-word ln-say-me-not" onClick={() => setAsking(true)}>
            Not you
          </button>
        </div>
      ) : (
        /* A name, and where you keep your own journal if you keep one. No
           email: nothing on this site sends any, so an address would be a
           personal detail held for no reason — and with nowhere for a reply to
           go, the way to find out whether anyone answered is to come back and
           look.

           The URL is not a replacement for that. It is the opposite kind of
           thing: an address is where something is rather than who somebody is,
           it is the same field the send form asks for and shares one stored
           value with, and a URL that resolves to a real journal is a better
           signal than an email, which anybody can invent. */
        <div className="ln-say-pair">
          <input
            className="ln-say-field"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Name"
            aria-label="Your name"
          />
          <input
            className="ln-say-field"
            value={address}
            onChange={e => setAddress(e.target.value)}
            placeholder="Your journal (optional)"
            aria-label="Your journal, if you keep one"
            autoComplete="off"
            inputMode="url"
          />
        </div>
      )}
      <textarea
        className="ln-say-field"
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder={parentId ? 'Leave a reply' : 'Leave a comment'}
        aria-label={parentId ? 'Your reply' : 'Your comment'}
        rows={3}
      />
      {error && <p className="ln-say-trouble">{error}</p>}
      {/* The same pair the editing bar carries, in the same words: the one that
          commits wears the rule, the other is a way out. */}
      <div className="ln-say-foot">
        <button type="button" className="ln-word ln-word--on" onClick={handlePost} disabled={posting}>
          {posting ? 'Posting' : 'Post'}
        </button>
        {onLeave && (
          <button type="button" className="ln-word" onClick={onLeave} disabled={posting}>
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
