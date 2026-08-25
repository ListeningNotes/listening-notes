'use client';

// components/main_components/IdentityCard.js
// The back of the cover.
//
// The landing page used to be one-sided, and everything a visitor might want
// to know about whose journal this is lived on a separate /about page nobody
// went to. This is that page, turned into an object: the card you'd be handed
// at the door. Front of the cover is the beacon — what is playing. Back is who
// is playing it.
//
// It is drawn as a real ID card on purpose, and the fields are laid out as a
// form rather than as prose. A form has a shape whether or not it is filled
// in, which is what makes this survive being copied: a fresh journal with no
// name, no portrait and no note renders a blank card waiting to be written on,
// not a page with holes in it. Every value here can be null and every null
// prints a ruled line.

import Link from 'next/link';
import { Fingerprint, FlipHorizontal, Heart, SketchLogo } from '@phosphor-icons/react';
import { useBookplate } from './Bookplate';

// A month and a year, never a day. The card says how long the journal has been
// kept, and a precise date invites the reader to do arithmetic that isn't the
// point. UTC because created_at is a naive column read through a driver that
// shifts it by the reader's own offset — a month is coarse enough that no
// plausible offset can move it, which is the whole reason to print one.
function monthAndYear(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', timeZone: 'UTC' });
}

// One row of the form. The label is fixed and always prints; the value either
// prints or leaves the rule it would have sat on. That empty rule is the point
// — see the note at the top of the file.
function Field({ label, value }) {
  return (
    <div className="idc-field">
      <span className="idc-field-label">{label}</span>
      <span className={'idc-field-value' + (value ? '' : ' idc-field-value--blank')}>
        {value || <span className="idc-blank-rule" aria-hidden="true" />}
      </span>
    </div>
  );
}

export default function IdentityCard({ stamps, onFlipBack }) {
  const {
    journal_name,
    keeper_name,
    bio,
    portrait_url,
    site_address,
    founded_at,
    about_intro,
    has_note: hasNote,
  } = useBookplate();

  const records = stamps?.records ?? null;

  // Founded date if the keeper set one, otherwise the day the first record was
  // logged. The second is the more honest answer anyway: a listening journal
  // starts when someone writes in it, not when the database row was created.
  const since = monthAndYear(founded_at) || monthAndYear(stamps?.first_listen);

  // The number on a card is what makes it a card rather than a poster. This one
  // is not an account number — it is how many records are in the journal, so it
  // goes up. A card that counts up is the correct kind of strange for a thing
  // that is only ever issued to one person.
  const serial = records == null ? null : String(records).padStart(4, '0');

  // The three marks, and how many records carry each. This is the swatch: an
  // ID card samples the product, and what this journal puts on a record is one
  // of these three inks. Rendered whether or not the count is zero — a mark
  // nobody has earned yet is still a mark the reader should know exists, and
  // the legend behind it is one tap away at /key.
  const marks = [
    { key: 'mp',        color: 'var(--mp)',        label: 'Masterpiece', count: stamps?.masterpieces, icon: <SketchLogo size={12} weight="fill" /> },
    { key: 'fav',       color: 'var(--fav)',       label: 'Favourite',   count: stamps?.favorites,    icon: <Heart size={12} weight="fill" /> },
    { key: 'formative', color: 'var(--formative)', label: 'Formative',   count: stamps?.formatives,   icon: <Fingerprint size={12} weight="bold" /> },
  ];

  return (
    <section className="idc" aria-label="About this journal">
      {/* href + precedence lets React hoist this once into the head rather than
          inline it per instance — the landing page mounts a card in both its
          desktop and its mobile markup, and without this the same two hundred
          lines of CSS would be in the document twice. */}
      <style href="ln-identity-card" precedence="default">{`
        .idc {
          --idc-rule: color-mix(in srgb, var(--ink) 24%, transparent);
          --idc-hair: color-mix(in srgb, var(--ink) 12%, transparent);
          width: 100%;
          max-width: 430px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          /* The card stock. Warm and opaque rather than the frosted --panel
             used elsewhere: glass reads as a control floating over a page, and
             this is meant to read as a thing lying on one. */
          background: var(--panel-solid);
          border: 1px solid var(--idc-hair);
          border-radius: 4px;
          box-shadow: 0 1px 2px rgba(0,0,0,0.05), 0 12px 40px rgba(0,0,0,0.08);
          overflow: hidden;
          text-align: left;
          position: relative;
        }
        /* Everything inside scrolls, the card itself does not. On a phone the
           landing page is a fixed pair of snapped screens with no document
           scroll of its own, so a card taller than the screen has to carry its
           own scroller or the bottom of it is simply unreachable. */
        .idc-inner {
          flex: 1;
          /* 24px of floor, against a 22px fade: at rest the fade lands
             entirely in the padding and is invisible, and it only starts
             eating ink once there is ink scrolling under it. */
          padding: 20px 22px 24px;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          min-height: 0;
          /* The writing fades into the stock at the bottom rather than being
             cut off square. Without it a card whose note runs past the fold
             looks like a card that stops mid-sentence instead of one with more
             on it. Same trick the album strip uses at its edges. */
          mask-image: linear-gradient(to bottom, #000 calc(100% - 22px), transparent);
          -webkit-mask-image: linear-gradient(to bottom, #000 calc(100% - 22px), transparent);
        }

        /* ── Rules ── the dashed lines that divide a form up. Drawn as a
           background gradient rather than a dashed border so the dash length
           and the gap are both controllable; a CSS dashed border picks its own
           and picks wrong at this weight. */
        .idc-rule {
          height: 1px;
          margin: 9px 0;
          background-image: linear-gradient(to right, var(--idc-rule) 0 4px, transparent 4px 9px);
          background-size: 9px 1px;
          background-repeat: repeat-x;
        }
        .idc-rule--solid { background: var(--idc-rule); background-image: none; }

        /* ── Masthead ── who issued the card, and its number. */
        .idc-masthead {
          display: flex; align-items: baseline; justify-content: space-between; gap: 12px;
        }
        .idc-issuer {
          font-family: var(--font-label);
          font-size: 10px; letter-spacing: 0.16em; text-transform: uppercase;
          color: var(--ink);
        }
        .idc-serial {
          font-family: var(--font-label);
          font-size: 10px; letter-spacing: 0.12em;
          color: var(--ink-soft); white-space: nowrap;
        }

        /* ── Headline ── the one place Anton is allowed. Condensed poster caps
           are most of what makes a rectangle read as a card, and the two body
           faces cannot be squeezed into that shape without looking squeezed.
           Nothing a reader reads as prose is set in it. */
        .idc-headline {
          font-family: var(--font-anton), var(--font-display), sans-serif;
          font-weight: 400;
          font-size: clamp(38px, 12vw, 54px);
          line-height: 0.84;
          letter-spacing: 0.005em;
          text-transform: uppercase;
          color: var(--ink);
          margin: 9px 0 9px;
        }
        .idc-standfirst {
          font-family: var(--font-label);
          font-size: 9.5px; letter-spacing: 0.19em; text-transform: uppercase;
          color: var(--ink-soft);
        }

        /* ── Portrait + fields ── the photo box on the left, the filled-in
           form on the right, the same arrangement every laminated badge uses. */
        .idc-body { display: grid; grid-template-columns: 88px 1fr; gap: 16px; align-items: start; }
        .idc-portrait {
          aspect-ratio: 3 / 4;
          background: var(--bg-warm);
          border: 1px solid var(--idc-hair);
          overflow: hidden;
          position: relative;
        }
        .idc-portrait img { width: 100%; height: 100%; object-fit: cover; display: block; }
        /* No portrait set. Registration corners rather than a grey box with a
           person-shaped icon in it — this is a frame waiting for a photo, and
           it should look like one. */
        .idc-portrait--empty::before,
        .idc-portrait--empty::after {
          content: ''; position: absolute; width: 11px; height: 11px;
          border: 1px solid var(--idc-rule);
        }
        .idc-portrait--empty::before { top: 6px; left: 6px; border-right: 0; border-bottom: 0; }
        .idc-portrait--empty::after  { bottom: 6px; right: 6px; border-left: 0; border-top: 0; }

        .idc-fields { display: flex; flex-direction: column; gap: 8px; padding-top: 1px; }
        .idc-field { display: grid; grid-template-columns: 58px 1fr; gap: 10px; align-items: baseline; }
        .idc-field-label {
          font-family: var(--font-label);
          font-size: 8.5px; letter-spacing: 0.13em; text-transform: uppercase;
          color: var(--ink-faint);
        }
        .idc-field-value {
          font-family: var(--font-label);
          font-size: 12px; letter-spacing: 0.01em; color: var(--ink);
          min-width: 0; word-break: break-word;
        }
        /* An unfilled row still has to occupy its line, or a blank card
           collapses into a stack of labels. */
        .idc-field-value--blank { align-self: end; }
        .idc-blank-rule { display: block; height: 1px; width: 100%; background: var(--idc-hair); }

        /* ── The note ── what the journal is, in the keeper's own words. */
        .idc-note {
          font-size: 12px; line-height: 1.66; color: var(--ink-soft);
          margin: 0;
        }

        /* ── Swatch ── an ID card samples the product. What this journal puts
           on a record is one of three inks, so the sample is those three, and
           the box doubles as the shortest possible legend for them. */
        .idc-swatch-head {
          display: flex; align-items: baseline; justify-content: space-between; gap: 10px;
          margin-bottom: 6px;
        }
        .idc-swatch-title {
          font-family: var(--font-label);
          font-size: 8.5px; letter-spacing: 0.15em; text-transform: uppercase;
          color: var(--ink-faint);
        }
        .idc-swatch-key {
          font-family: var(--font-label);
          font-size: 8.5px; letter-spacing: 0.11em; text-transform: uppercase;
          color: var(--ink-faint); text-decoration: none;
          border-bottom: 1px solid var(--idc-hair);
        }
        .idc-swatch-key:hover { color: var(--ink); border-bottom-color: var(--ink-faint); }
        .idc-swatch-box {
          border: 1px solid var(--idc-hair);
          padding: 8px 10px 6px;
        }
        .idc-swatch-smear { display: block; width: 100%; height: 34px; }
        .idc-swatch-legend {
          display: flex; justify-content: space-between; gap: 8px;
          margin-top: 6px;
        }
        .idc-swatch-item {
          display: flex; align-items: center; gap: 5px;
          font-family: var(--font-label);
          font-size: 8.5px; letter-spacing: 0.08em; text-transform: uppercase;
          color: var(--ink-soft); white-space: nowrap;
        }
        .idc-swatch-count { color: var(--ink); }

        /* ── Signature ── the address, written across the bottom the way a
           cardholder signs one. It is the only thing on the card that tells a
           reader where they are, which matters most when the card has been
           screenshotted out of the site. */
        .idc-sign { display: flex; align-items: flex-end; justify-content: space-between; gap: 14px; }
        .idc-sign-label {
          font-family: var(--font-label);
          font-size: 8.5px; letter-spacing: 0.13em; text-transform: uppercase;
          color: var(--ink-faint); display: block; margin-bottom: 4px;
        }
        .idc-sign-value {
          font-family: var(--font-label); font-size: 12px; color: var(--ink);
          text-decoration: none; word-break: break-all;
        }
        .idc-stamp {
          font-family: var(--font-label); font-size: 18px; letter-spacing: 0.02em;
          color: var(--ink); white-space: nowrap; line-height: 1;
        }

        /* ── Doors ── everything the card is the way to. /why only exists once
           its owner has written it, which is why it is conditional here. */
        /* ── The band along the bottom ── outside the scroller, so it is on
           the card at every scroll position. This is the way back, and a way
           back you have to scroll to find is not one. It carries the issued
           line as well, which is the one piece of writing on a card that is
           printed rather than filled in and so belongs to the card itself
           rather than to what is written on it. */
        .idc-foot {
          flex-shrink: 0;
          display: flex; align-items: center; justify-content: space-between; gap: 12px;
          padding: 9px 14px 9px 22px;
          border-top: 1px solid var(--idc-hair);
          background: var(--panel-solid);
        }
        .idc-turn {
          flex-shrink: 0;
          gap: 7px;
          padding: 7px 15px;
          border-color: var(--idc-hair);
        }
        .idc-turn svg { color: var(--ink-faint); transition: color 0.15s; }
        .idc-turn:hover svg { color: var(--ink); }

        .idc-doors { display: flex; flex-wrap: wrap; gap: 6px; }
        .idc-doors .ln-pill { padding: 7px 13px; font-size: 8.5px; letter-spacing: 0.1em; }

        .idc-fineprint {
          font-family: var(--font-label);
          font-size: 8px; line-height: 1.6; letter-spacing: 0.1em; text-transform: uppercase;
          color: var(--ink-faint);
        }

        @media (max-width: 480px) {
          .idc-inner { padding: 18px 18px 16px; }
          .idc-body { grid-template-columns: 76px 1fr; gap: 13px; }
          .idc-field { grid-template-columns: 52px 1fr; gap: 8px; }
          .idc-note { font-size: 12px; }
        }
      `}</style>

      <div className="idc-inner">
        <div className="idc-masthead">
          <span className="idc-issuer">{journal_name}</span>
          {serial && <span className="idc-serial">№ {serial}</span>}
        </div>

        <div className="idc-rule" />

        <h1 className="idc-headline">The<br />Keeper</h1>

        <div className="idc-rule idc-rule--solid" />

        <div className="idc-standfirst">Active listening · one album at a time</div>

        <div className="idc-rule" />

        <div className="idc-body">
          <div className={'idc-portrait' + (portrait_url ? '' : ' idc-portrait--empty')}>
            {portrait_url && <img src={portrait_url} alt={keeper_name ? `${keeper_name}` : 'The keeper'} />}
          </div>
          <div className="idc-fields">
            <Field label="Name" value={keeper_name} />
            <Field label="Since" value={since} />
            <Field label="Records" value={records == null ? null : String(records)} />
            <Field label="Bio" value={bio} />
          </div>
        </div>

        <div className="idc-rule" />

        {about_intro && (
          <>
            <p className="idc-note">{about_intro}</p>
            <div className="idc-rule" />
          </>
        )}

        <div className="idc-swatch-head">
          <span className="idc-swatch-title">Swatch</span>
          <Link href="/key" className="idc-swatch-key">What these mean →</Link>
        </div>
        <div className="idc-swatch-box">
          {/* Three smears, overlapping where they meet. Drawn as thick round
              strokes rather than shapes: a stroke with a round cap already has
              the loaded-then-lifted profile of a brush, and three of them at
              partial opacity mix at the overlaps the way wet ink would. */}
          <svg className="idc-swatch-smear" viewBox="0 0 200 44" preserveAspectRatio="none" aria-hidden="true">
            <g fill="none" strokeLinecap="round" opacity="0.82">
              <path d="M14 27 C 30 13, 48 32, 70 20" stroke="var(--mp)" strokeWidth="21" />
              <path d="M74 20 C 92 33, 110 12, 128 24" stroke="var(--fav)" strokeWidth="23" />
              <path d="M130 25 C 148 14, 166 30, 186 19" stroke="var(--formative)" strokeWidth="20" />
            </g>
            {/* The dry tail every real smear has, where the brush ran out. */}
            <g fill="none" strokeLinecap="round" opacity="0.34">
              <path d="M70 20 C 78 17, 84 23, 92 21" stroke="var(--mp)" strokeWidth="7" />
              <path d="M128 24 C 136 27, 142 20, 150 23" stroke="var(--fav)" strokeWidth="7" />
              <path d="M186 19 C 190 18, 193 21, 196 20" stroke="var(--formative)" strokeWidth="6" />
            </g>
          </svg>
          <div className="idc-swatch-legend">
            {marks.map(mark => (
              <span key={mark.key} className="idc-swatch-item">
                <span style={{ color: mark.color, display: 'inline-flex' }}>{mark.icon}</span>
                {mark.label}
                {mark.count != null && <span className="idc-swatch-count">{mark.count}</span>}
              </span>
            ))}
          </div>
        </div>

        <div className="idc-rule" />

        <div className="idc-sign">
          <span>
            <span className="idc-sign-label">Signature</span>
            {site_address
              ? <a className="idc-sign-value" href={`https://${site_address.replace(/^https?:\/\//, '')}`} target="_blank" rel="noopener noreferrer">{site_address}</a>
              : <span className="idc-blank-rule" style={{ width: 150 }} aria-hidden="true" />}
          </span>
          {serial && <span className="idc-stamp">LN&thinsp;{serial}</span>}
        </div>

        <div className="idc-rule" />

        <div className="idc-doors">
          {hasNote && <Link href="/why" className="ln-pill">Read the note</Link>}
          <Link href="/rig" className="ln-pill">The rig</Link>
          <Link href="/key" className="ln-pill">The key</Link>
          <Link href="/submit" className="ln-pill">Send an album</Link>
        </div>

      </div>

      <div className="idc-foot">
        <p className="idc-fineprint">
          The holder of this card<br />keeps a listening journal
        </p>
        {onFlipBack && (
          <button type="button" className="ln-pill idc-turn" onClick={onFlipBack}>
            <FlipHorizontal size={14} weight="bold" aria-hidden="true" />
            Turn back
          </button>
        )}
      </div>
    </section>
  );
}
