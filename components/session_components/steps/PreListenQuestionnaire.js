// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
import { useState, useEffect } from 'react';
import { fonts } from '../../../library/sitewide_visuals';

export default function PreListenQuestionnaire({
  pendingAlbum,
  confirmPhase,
  onPhaseChange,
  onConfirm,
  setEntryType,
}) {
  const art = pendingAlbum?.artUrl;
  const label = pendingAlbum
    ? `${pendingAlbum.album}${pendingAlbum.year ? ` · ${pendingAlbum.year}` : ''}`
    : '';

  // There used to be two questions here, and the first asked what your
  // relationship with the album was — first listen, revisit, formative, study.
  // Every one of those is now answered without asking: the listen number knows
  // whether this is the first time, and formative became a flag on the record
  // rather than a description of one occasion. So the session opens on what is
  // still a real question.
  const question = "Where's it from?";

  const [typedText, setTypedText]     = useState('');
  const [typingDone, setTypingDone]   = useState(false);
  const [cardVisible, setCardVisible] = useState(false);

  // Restart typewriter each time the phase changes
  useEffect(() => {
    setTypedText('');
    setTypingDone(false);
    setCardVisible(false);
    let i = 0;
    const id = setInterval(() => {
      i++;
      setTypedText(question.slice(0, i));
      if (i >= question.length) {
        clearInterval(id);
        setTimeout(() => setTypingDone(true), 120);
      }
    }, 22);
    return () => clearInterval(id);
  }, [confirmPhase]);

  // Drop buttons in after typing finishes — two rAF frames so transition fires
  useEffect(() => {
    if (!typingDone) return;
    requestAnimationFrame(() => requestAnimationFrame(() => setCardVisible(true)));
  }, [typingDone]);

  const optionBtn = {
    fontFamily: fonts.sans, fontWeight: 600, fontSize: 14, color: '#1a1520',
    background: 'rgba(245,242,236,0.72)', border: '1px solid rgba(26,21,32,0.18)',
    borderRadius: 32, padding: '11px 22px', cursor: 'pointer',
    backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
    transition: 'all 0.15s',
  };

  const topBackBtn = {
    position: 'fixed', top: 14, left: 28, zIndex: 10,
    fontFamily: fonts.mono, fontWeight: 600, fontSize: 10,
    letterSpacing: '0.1em', textTransform: 'uppercase',
    color: 'rgba(26,21,32,0.5)',
    background: 'rgba(245,242,236,0.6)', backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    border: '1px solid rgba(26,21,32,0.12)',
    borderRadius: 8, padding: '6px 10px', cursor: 'pointer',
  };

  // The label is what the button says; the value is what the column holds. They
  // came apart here: 'First listen' with a small L never matched the archive's
  // First Listen filter, and 'Personal collection' matched nothing anywhere —
  // every other file in the app tests for 'Personal Library'.
  //
  // Q2 hands its answer to onConfirm directly as well as setting it. Setting
  // state and calling the parent in the same breath meant the parent read the
  // value from before the click — which is why every session came out as
  // Library no matter which button was pressed.
  const buttons = [
    { label: 'Personal collection', action: () => { setEntryType('Personal Library'); onConfirm(pendingAlbum, { entryType: 'Personal Library' }); } },
    { label: 'Submission',          action: () => { setEntryType('Submission');       onConfirm(pendingAlbum, { entryType: 'Submission' }); } },
  ];

  return (
    <>
      <style>{`
        @keyframes q-art-glow {
          0%,100% { box-shadow: 0 8px 40px rgba(0,0,0,0.10), 0 0 60px 30px rgba(255,255,255,0.45); transform: scale(1); }
          50%      { box-shadow: 0 12px 52px rgba(0,0,0,0.15), 0 0 90px 55px rgba(255,255,255,0.65); transform: scale(1.012); }
        }
        @keyframes echo-cursor-blink { 0%,49%{opacity:1} 50%,100%{opacity:0} }
      `}</style>

      <button onClick={() => onPhaseChange(null)} style={topBackBtn}>← back</button>

      <div onClick={() => onPhaseChange(null)} style={{ position: 'fixed', inset: 0, zIndex: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 24px', cursor: 'default' }}>

        {/* Glowing album art */}
        {art && (
          <div onClick={e => e.stopPropagation()} style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
            <img src={art} alt={pendingAlbum.album} style={{ width: 220, height: 220, borderRadius: 16, objectFit: 'cover', animation: 'q-art-glow 2.4s ease-in-out infinite' }} />
          </div>
        )}
        <div onClick={e => e.stopPropagation()} style={{ fontFamily: fonts.mono, fontSize: 12, color: 'rgba(26,21,32,0.45)', letterSpacing: '0.06em', marginBottom: 20 }}>
          {label}
        </div>

        {/* Frosted card — question types inside, buttons drop in below */}
        <div onClick={e => e.stopPropagation()} style={{
          width: 'fit-content', minWidth: 320, maxWidth: 'min(720px, calc(100vw - 48px))',
          background: 'rgba(255,255,255,0.45)',
          backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)',
          borderRadius: 40,
          boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
          padding: '32px 32px 28px',
          position: 'relative', overflow: 'hidden',
          textAlign: 'center',
        }}>
          {/* Inner gloss */}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(145deg, rgba(255,255,255,0.6) 0%, transparent 60%)', pointerEvents: 'none' }} />

          {/* Typewriter question */}
          <div style={{ fontFamily: fonts.sans, fontWeight: 700, fontSize: 26, color: '#1a1520', lineHeight: 1.2, marginBottom: 24, minHeight: '1.3em', whiteSpace: 'nowrap' }}>
            {typedText}
            {!typingDone && <span style={{ display: 'inline-block', marginLeft: 1, animation: 'echo-cursor-blink 0.75s step-end infinite' }}>|</span>}
          </div>

          {/* Buttons drop in after typing — same transition as landing input */}
          {typingDone && (
            <div style={{
              opacity: cardVisible ? 1 : 0,
              transform: cardVisible ? 'translateY(0)' : 'translateY(-14px)',
              transition: 'opacity 1.4s cubic-bezier(0.16,1,0.3,1), transform 1.4s cubic-bezier(0.16,1,0.3,1)',
            }}>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
                {buttons.map(({ label: l, action }) => (
                  <button key={l} onClick={action} style={optionBtn}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,242,236,0.95)'; e.currentTarget.style.borderColor = 'rgba(26,21,32,0.4)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(245,242,236,0.72)'; e.currentTarget.style.borderColor = 'rgba(26,21,32,0.18)'; }}
                  >{l}</button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
