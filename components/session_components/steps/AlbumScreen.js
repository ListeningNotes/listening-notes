// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
import { useState, useEffect } from 'react';
import { useBookplate } from '../../main_components/Bookplate';
import { entryTypeLabel } from '../../../library/entry_formatter';

// Step 0 — the record, and the way in. The cover, large and centred, because
// the art is the beauty here and needs no help; under it the title, the
// artist, what kind of listen this is, and two buttons: start listening, or
// research the album first. The cover is also where the picked tile lands:
// the page measures it and flies the tapped cover onto it.
//
// Research used to be the gate every listen passed through — the session
// opened on a briefing whether or not you wanted one, and the API was called
// every time. It is a button now. Tap it for the background before listening;
// skip it for a quick log. That is cheaper for whoever pays for the key, and
// it means a copy with no key at all still logs a listen: the button simply
// is not there.
//
// When asked for, the briefing is web-grounded research as cited prose. Each
// claim carries [n] footnote markers linking to the real source; a numbered
// Sources list sits at the bottom. It streams in, but sections are held back
// until the model has finished each one — so they arrive whole and in order
// rather than growing a fragment at a time.

// Character offset of each run within the joined text, so the reveal can be
// sliced across run boundaries. Kept outside the component — the running total
// must not be a render-scope binding.
function withOffsets(runs) {
  let offset = 0;
  return runs.map(r => {
    const start = offset;
    offset += r.text.length;
    return { r, start, end: offset };
  });
}

// How far each section has been revealed, kept by its own text and outside the
// component. The step remounts every time you navigate back to it, so without
// this a briefing you've already read types itself in from nothing on every
// visit. Keyed by content, so a re-researched briefing still types.
const revealed = new Map();

// Reveals a finished section a few characters at a time so it reads as though
// it's being typed in. No caret — just the text arriving. A run's [n] citation
// appears only once that run has fully landed.
function TypedRuns({ runs, cite, className }) {
  const full = runs.map(r => r.text).join('');
  const [shown, setShown] = useState(() => revealed.get(full) || 0);

  // A section only reaches this component once it's finished, so `full` is
  // fixed for the life of the instance. Picks up where it left off — a section
  // that finished comes straight back whole, one abandoned halfway resumes.
  useEffect(() => {
    let n = revealed.get(full) || 0;
    if (n >= full.length) return undefined;   // already whole — the initialiser has it
    const id = setInterval(() => {
      n += 3;
      revealed.set(full, n);
      setShown(n);
      if (n >= full.length) clearInterval(id);
    }, 16);
    return () => clearInterval(id);
  }, [full]);

  const parts = withOffsets(runs);

  return (
    <div className={className}>
      {parts.map(({ r, start, end }, i) => (
        shown > start ? (
          <span key={i}>
            {r.text.slice(0, shown - start)}
            {shown >= end && cite(r.cites)}
          </span>
        ) : null
      ))}
    </div>
  );
}

export default function AlbumScreen({
  album, artist, year, genre, entryType, receivedFrom, albumArt,
  resuming, coverRef, coverHidden,
  brief, researchState, researchError,
  onResearch, onRefresh, onNext,
}) {
  // Whether this copy has a key at all. Worked out on the server and carried
  // down with the rest of the bookplate, so the button can be absent rather
  // than present and broken.
  const { research_available } = useBookplate();

  // Collapsed by default — the citations are there to be checked, not read.
  const [sourcesShown, setSourcesShown] = useState(false);

  const sources = brief?.sources || [];
  const srcByNum = n => sources.find(s => s.n === n);

  // Superscript [n] markers for a run's citations — each links to its source.
  const cite = nums => (nums || []).map(n => {
    const s = srcByNum(n);
    if (!s) return null;
    return (
      <sup key={n} className="ses-cite">
        <a href={s.url} target="_blank" rel="noopener noreferrer" title={s.title}>[{n}]</a>
      </sup>
    );
  });

  const sections = (brief?.sections || []).filter(s => s.complete);

  // When this briefing was last researched — only present on a stored one.
  let researchedOn = '';
  if (brief?.researched_at) {
    const d = new Date(brief.researched_at);
    if (!isNaN(d)) researchedOn = d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  }

  // Key facts become one typed block: each fact on its own line, so the reveal
  // runs through them in order the same way the prose sections do.
  const factRuns = [];
  if (brief?.key_facts_complete) {
    (brief.key_facts || []).forEach(run => {
      run.text.split('\n')
        .map(line => line.replace(/^\s*[-—•]\s*/, '').trim())
        .filter(Boolean)
        .forEach(fact => factRuns.push({ text: (factRuns.length ? '\n' : '') + '— ' + fact, cites: run.cites }));
    });
  }

  const researching = researchState === 'loading' || (researchState === 'done' && brief && !brief.done);
  const showBriefing = sections.length > 0 || factRuns.length > 0;
  const shownYear = year || brief?.year || '';
  const shownGenre = genre || '';
  // "Start" the first time, "Resume" when you have been in and come back —
  // a draft picked up, or the album screen revisited mid-listen.
  const go = resuming ? 'Resume session →' : 'Start session →';

  return (
    <div className="ses-album">
      {/* The slot the picked cover lands in. Hidden for the half second the
          landing image is travelling towards it, so there is one cover on
          screen and not two. */}
      <div className="ses-album-art" ref={coverRef} style={{ opacity: coverHidden ? 0 : 1 }}>
        {albumArt && <img src={albumArt} alt="" />}
      </div>

      <h1 className="ses-title">{album}</h1>
      <div className="ses-byline">
        {artist}{shownYear ? ` · ${shownYear}` : ''}
      </div>

      {/* Everything about to be written to the row that isn't the writing
          itself. The type is decided by how the listen started — the inbox
          says Submission, anything else is the library — and the entry is
          where it gets corrected if that is wrong. */}
      <div className="ses-actions ses-actions--center" style={{ gap: 6 }}>
        <span className="ses-chip">{entryTypeLabel(entryType || 'Personal Library')}</span>
        {shownGenre && <span className="ses-chip">{shownGenre}</span>}
        {receivedFrom && <span className="ses-chip">from {receivedFrom}</span>}
      </div>

      {/* Quiet links, the way every screen in the listen moves on. */}
      <div className="ses-actions ses-actions--center" style={{ marginTop: 18, flexDirection: 'column', gap: 16 }}>
        <button type="button" className="ses-quiet" onClick={onNext}>{go}</button>
        {research_available && researchState === 'idle' && (
          <button type="button" className="ses-quiet" onClick={onResearch}>Research this album</button>
        )}
        {researching && (
          <span className="ses-actions" style={{ gap: 10 }}>
            <span className="ses-pulse" aria-hidden="true" />
            <span className="ses-label">Researching…</span>
          </span>
        )}
      </div>

      {!research_available && (
        <p className="ses-label" style={{ margin: 0, letterSpacing: '0.06em', textTransform: 'none' }}>
          Research is off on this copy — there is no Anthropic key set.
        </p>
      )}

      {researchState === 'error' && (
        <div className="ses-album-brief" style={{ marginTop: 10 }}>
          <p className="ses-prose" style={{ color: 'var(--ink-soft)', fontSize: 13, margin: '0 0 12px' }}>{researchError}</p>
          <button type="button" className="ses-quiet" onClick={onResearch}>Try again</button>
        </div>
      )}

      {showBriefing && (
        <div className="ses-album-brief" style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 24 }}>
          {sections.map(sec => (
            <section key={sec.key}>
              <hr className="ses-rule" />
              <div className="ses-label" style={{ margin: '18px 0 10px' }}>{sec.label}</div>
              <TypedRuns runs={sec.runs} cite={cite} className="ses-prose" />
            </section>
          ))}

          {factRuns.length > 0 && (
            <section>
              <hr className="ses-rule" />
              <div className="ses-label" style={{ margin: '18px 0 10px' }}>Key facts</div>
              <TypedRuns runs={factRuns} cite={cite} className="ses-prose" />
            </section>
          )}

          {/* The one loading signal — sits below whatever has landed and
              travels down the page as each new section fills in. */}
          {researching && (
            <div className="ses-center" style={{ padding: '6px 0' }}>
              <span className="ses-pulse" aria-hidden="true" />
            </div>
          )}

          {/* Numbered sources — real links from the web search, for
              fact-checking. Held until the briefing is done so the count
              doesn't tick upward. */}
          {brief?.done && sources.length > 0 && (
            <section>
              <hr className="ses-rule" />
              <button
                type="button"
                className="ses-quiet"
                style={{ marginTop: 18, borderBottom: 'none' }}
                onClick={() => setSourcesShown(v => !v)}
              >
                Sources ({sources.length}) {sourcesShown ? '▴' : '▾'}
              </button>
              {sourcesShown && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                  {sources.map(s => {
                    let host = '';
                    try { host = new URL(s.url).hostname.replace(/^www\./, ''); } catch { /* ignore */ }
                    return (
                      <a key={s.n} href={s.url} target="_blank" rel="noopener noreferrer" className="ses-source">
                        <span className="ses-label" style={{ flexShrink: 0 }}>[{s.n}]</span>
                        <span className="ses-source-title">{s.title}</span>
                        {host && <span className="ses-label" style={{ flexShrink: 0, textTransform: 'none' }}>{host} ↗</span>}
                      </a>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* Kept from a previous listen — offer a re-research, since that's
              the only thing that costs a fresh web search. */}
          {brief?.cached && (
            <div className="ses-actions" style={{ gap: 12 }}>
              <span className="ses-label" style={{ textTransform: 'none', letterSpacing: '0.04em' }}>
                From an earlier listen{researchedOn ? ` · ${researchedOn}` : ''}
              </span>
              <button type="button" className="ses-quiet" onClick={onRefresh}>research again</button>
            </div>
          )}

          <div className="ses-center" style={{ marginTop: 8 }}>
            <button type="button" className="ses-quiet" onClick={onNext}>{go}</button>
          </div>
        </div>
      )}
    </div>
  );
}
