'use client';
import { fonts } from '../../../library/sitewide_visuals';
import { tx, bdr, lbl } from '../../../library/session_styles';
import SessionButton from '../SessionButton';

// Step 0 — shows Echo's narrative briefing followed by the raw research sections.
// onReset fires when research errored and the user wants to try another album.

export default function AlbumDebrief({
  brief,
  researchState,
  researchError,
  echoDebrief,
  echoDebriefLoading,
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

  return (
    <div style={{ width: '100%' }}>

      {/* Echo debrief — narrative briefing, shown as skeleton while loading */}
      {echoDebriefLoading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
          {[88, 72, 84, 58, 78].map((w, i) => (
            <div key={i} style={{ height: 9, width: w + '%', borderRadius: 4, background: 'rgba(255,255,255,0.12)', animation: `ln-pulse 1.6s ease-in-out ${i * 0.12}s infinite` }} />
          ))}
        </div>
      )}

      {echoDebrief && !echoDebriefLoading && (
        <div style={{ marginBottom: 36, paddingBottom: 32, borderBottom: `1px solid ${bdr(0.07)}` }}>
          <div style={{ ...lbl, marginBottom: 14 }}>Echo</div>
          <div style={{ fontFamily: fonts.sans, fontSize: 15, lineHeight: 1.8, color: tx(0.92), whiteSpace: 'pre-wrap' }}>
            {echoDebrief}
          </div>
        </div>
      )}

      {/* Raw research sections */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22, marginBottom: 36 }}>
        {[['Context', brief.context], ['Production', brief.production], ['Reception', brief.reception], ['Listen For', brief.listen_for]].map(([l, val]) => val ? (
          <div key={l} style={{ borderTop: `1px solid ${bdr(0.07)}`, paddingTop: 18 }}>
            <div style={{ ...lbl, marginBottom: 10 }}>{l}</div>
            <div style={{ fontFamily: fonts.sans, fontSize: 13.5, lineHeight: 1.85, color: tx(0.8) }}>{val}</div>
          </div>
        ) : null)}
        {brief.key_facts?.length > 0 && (
          <div style={{ borderTop: `1px solid ${bdr(0.07)}`, paddingTop: 18 }}>
            <div style={{ ...lbl, marginBottom: 10 }}>Key Facts</div>
            {brief.key_facts.map((f, i) => (
              <div key={i} style={{ fontFamily: fonts.sans, fontSize: 13.5, lineHeight: 1.7, color: tx(0.78), marginBottom: 6 }}>— {f}</div>
            ))}
          </div>
        )}
      </div>

      {/* Sources — real links from Echo's web search, for fact-checking / digging deeper */}
      {brief.sources?.length > 0 && (
        <div style={{ borderTop: `1px solid ${bdr(0.07)}`, paddingTop: 18, marginBottom: 36 }}>
          <div style={{ ...lbl, marginBottom: 12 }}>Sources</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {brief.sources.map((s, i) => {
              let host = '';
              try { host = new URL(s.url).hostname.replace(/^www\./, ''); } catch {}
              return (
                <a key={i} href={s.url} target="_blank" rel="noopener noreferrer"
                  style={{ fontFamily: fonts.sans, fontSize: 12.5, color: tx(0.7), textDecoration: 'none', display: 'flex', alignItems: 'baseline', gap: 8, lineHeight: 1.5 }}
                  onMouseEnter={e => { e.currentTarget.style.color = tx(0.95); e.currentTarget.querySelector('span').style.textDecoration = 'underline'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = tx(0.7); e.currentTarget.querySelector('span').style.textDecoration = 'none'; }}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80%' }}>{s.title}</span>
                  {host && <span style={{ fontFamily: fonts.mono, fontSize: 10, color: tx(0.38), flexShrink: 0, textDecoration: 'none' }}>{host} ↗</span>}
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
