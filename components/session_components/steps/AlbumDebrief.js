'use client';
import { fonts } from '../../../library/sitewide_visuals';
import { tx, bdr, lbl } from '../../../library/session_styles';
import SessionButton from '../SessionButton';

// Step 0 — web-grounded research as cited prose. Each claim carries [n] footnote
// markers linking to the real source; a numbered Sources list sits at the bottom.
// onReset fires when research errored and the user wants to try another album.

export default function AlbumDebrief({
  brief,
  researchState,
  researchError,
  onNext,
  onReset,
}) {
  if (researchState === 'error') {
    return (
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: fonts.mono, fontSize: 12, color: '#ef4444', marginBottom: 28 }}>{researchError}</div>
        <SessionButton onClick={onReset}>← Try another album</SessionButton>
      </div>
    );
  }

  if (!brief) return null;

  const sources = brief.sources || [];
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

  const sections = brief.sections || [];
  const keyFacts = brief.key_facts || [];

  return (
    <div style={{ width: '100%' }}>

      {/* Research sections — cited prose */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22, marginBottom: 36 }}>
        {sections.map(sec => (
          <div key={sec.key} style={{ borderTop: `1px solid ${bdr(0.07)}`, paddingTop: 18 }}>
            <div style={{ ...lbl, marginBottom: 10 }}>{sec.label}</div>
            <div style={{ fontFamily: fonts.sans, fontSize: 13.5, lineHeight: 1.85, color: tx(0.8) }}>
              {sec.runs.map((r, i) => <span key={i}>{r.text}{cite(r.cites)}</span>)}
            </div>
          </div>
        ))}

        {keyFacts.length > 0 && (
          <div style={{ borderTop: `1px solid ${bdr(0.07)}`, paddingTop: 18 }}>
            <div style={{ ...lbl, marginBottom: 10 }}>Key Facts</div>
            {keyFacts.flatMap((run, ri) =>
              run.text.split('\n')
                .map(line => line.replace(/^\s*[-—•]\s*/, '').trim())
                .filter(Boolean)
                .map((fact, li) => (
                  <div key={ri + '-' + li} style={{ fontFamily: fonts.sans, fontSize: 13.5, lineHeight: 1.7, color: tx(0.78), marginBottom: 6 }}>
                    — {fact}{cite(run.cites)}
                  </div>
                ))
            )}
          </div>
        )}
      </div>

      {/* Numbered sources — real links from the web search, for fact-checking */}
      {sources.length > 0 && (
        <div style={{ borderTop: `1px solid ${bdr(0.07)}`, paddingTop: 18, marginBottom: 36 }}>
          <div style={{ ...lbl, marginBottom: 12 }}>Sources</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
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

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <SessionButton onClick={onNext} accent>Start Listening →</SessionButton>
      </div>
    </div>
  );
}
