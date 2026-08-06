'use client';
import { useState, useEffect } from 'react';
import { fonts } from '../../../library/sitewide_visuals';
import { tx, bdr, lbl } from '../../../library/session_styles';
import SessionButton from '../SessionButton';

// Step 0 — web-grounded research as cited prose. Each claim carries [n] footnote
// markers linking to the real source; a numbered Sources list sits at the bottom.
//
// The briefing streams in, but sections are held back until the model has
// finished each one — so they arrive whole and in order rather than growing a
// fragment at a time. onReset fires when research errored and the user wants to
// try another album.

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

// Reveals a finished section a few characters at a time so it reads as though
// it's being typed in. No caret — just the text arriving. A run's [n] citation
// appears only once that run has fully landed.
function TypedRuns({ runs, cite, style }) {
  const full = runs.map(r => r.text).join('');
  const [shown, setShown] = useState(0);

  // A section only reaches this component once it's finished, so `full` is
  // fixed for the life of the instance and the reveal runs exactly once.
  useEffect(() => {
    let n = 0;
    const id = setInterval(() => {
      n += 3;
      setShown(n);
      if (n >= full.length) clearInterval(id);
    }, 16);
    return () => clearInterval(id);
  }, [full]);

  const parts = withOffsets(runs);

  return (
    <div style={style}>
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

export default function AlbumDebrief({
  brief,
  researchState,
  researchError,
  onNext,
  onReset,
}) {
  // Collapsed by default — the citations are there to be checked, not read.
  const [sourcesShown, setSourcesShown] = useState(false);

  if (researchState === 'error') {
    return (
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: fonts.mono, fontSize: 12, color: '#ef4444', marginBottom: 28 }}>{researchError}</div>
        <SessionButton onClick={onReset}>← Try another album</SessionButton>
      </div>
    );
  }

  const researching = !brief?.done;
  const sources = brief?.sources || [];
  const srcByNum = n => sources.find(s => s.n === n);

  // Superscript [n] markers for a run's citations — each links to its source.
  const cite = nums => (nums || []).map(n => {
    const s = srcByNum(n);
    if (!s) return null;
    return (
      <sup key={n} style={{ lineHeight: 0, whiteSpace: 'nowrap' }}>
        <a href={s.url} target="_blank" rel="noopener noreferrer" title={s.title}
          style={{ fontFamily: fonts.mono, fontSize: 9.5, color: tx(0.5), textDecoration: 'none', padding: '0 1px' }}
          onMouseEnter={e => { e.currentTarget.style.color = tx(0.95); }}
          onMouseLeave={e => { e.currentTarget.style.color = tx(0.5); }}
        >[{n}]</a>
      </sup>
    );
  });

  const sections = (brief?.sections || []).filter(s => s.complete);

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

  return (
    <div style={{ width: '100%' }}>

      {/* Research sections — cited prose, each typed in once it's finished */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        {sections.map(sec => (
          <div key={sec.key} style={{ borderTop: `1px solid ${bdr(0.07)}`, paddingTop: 18 }}>
            <div style={{ ...lbl, marginBottom: 10 }}>{sec.label}</div>
            <TypedRuns runs={sec.runs} cite={cite}
              style={{ fontFamily: fonts.sans, fontSize: 13.5, lineHeight: 1.85, color: tx(0.8) }} />
          </div>
        ))}

        {factRuns.length > 0 && (
          <div style={{ borderTop: `1px solid ${bdr(0.07)}`, paddingTop: 18 }}>
            <div style={{ ...lbl, marginBottom: 10 }}>Key Facts</div>
            <TypedRuns runs={factRuns} cite={cite}
              style={{ fontFamily: fonts.sans, fontSize: 13.5, lineHeight: 1.7, color: tx(0.78), whiteSpace: 'pre-wrap' }} />
          </div>
        )}
      </div>

      {/* The one loading signal — sits below whatever has landed and travels
          down the page as each new section fills in. */}
      {researching && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '26px 0 10px' }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%', background: tx(0.75),
            boxShadow: '0 0 10px 2px rgba(255,255,255,0.35)',
            animation: 'ln-pulse 1.5s ease-in-out infinite',
          }} />
        </div>
      )}

      {/* Numbered sources — real links from the web search, for fact-checking.
          Held until the briefing is done so the count doesn't tick upward. */}
      {brief?.done && sources.length > 0 && (
        <div style={{ borderTop: `1px solid ${bdr(0.07)}`, paddingTop: 18, marginTop: 36, marginBottom: 36 }}>
          <button
            onClick={() => setSourcesShown(v => !v)}
            style={{
              ...lbl, display: 'flex', alignItems: 'center', gap: 8,
              background: 'none', border: 'none', padding: 0, cursor: 'pointer',
              marginBottom: sourcesShown ? 12 : 0,
              color: sourcesShown ? tx(0.55) : tx(0.38),
              transition: 'color 0.15s',
            }}
          >
            Sources ({sources.length})
            <span style={{ fontSize: 9, lineHeight: 1 }}>{sourcesShown ? '▴' : '▾'}</span>
          </button>
          <div style={{ display: sourcesShown ? 'flex' : 'none', flexDirection: 'column', gap: 8 }}>
            {sources.map(s => {
              let host = '';
              try { host = new URL(s.url).hostname.replace(/^www\./, ''); } catch { /* ignore */ }
              return (
                <a key={s.n} href={s.url} target="_blank" rel="noopener noreferrer"
                  style={{ fontFamily: fonts.sans, fontSize: 12.5, color: tx(0.7), textDecoration: 'none', display: 'flex', alignItems: 'baseline', gap: 8, lineHeight: 1.5 }}
                  onMouseEnter={e => { e.currentTarget.style.color = tx(0.95); e.currentTarget.querySelector('.src-title').style.textDecoration = 'underline'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = tx(0.7); e.currentTarget.querySelector('.src-title').style.textDecoration = 'none'; }}
                >
                  <span style={{ fontFamily: fonts.mono, fontSize: 10, color: tx(0.4), flexShrink: 0 }}>[{s.n}]</span>
                  <span className="src-title" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '72%' }}>{s.title}</span>
                  {host && <span style={{ fontFamily: fonts.mono, fontSize: 10, color: tx(0.38), flexShrink: 0 }}>{host} ↗</span>}
                </a>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'center', marginTop: brief?.done ? 0 : 24 }}>
        <SessionButton onClick={onNext} accent pulse>Start Listening →</SessionButton>
      </div>
    </div>
  );
}
