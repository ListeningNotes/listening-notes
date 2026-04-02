'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import StarRating from './StarRating';

const BLOCK_MAP = { '▁': 0.12, '▂': 0.25, '▃': 0.37, '▄': 0.50, '▅': 0.62, '▆': 0.75, '▇': 0.87, '█': 1.00 };
const VALID_BLOCKS = new Set(Object.keys(BLOCK_MAP));

function parseHorizon(horizon) {
  if (!horizon) return [];
  if (horizon.trim().startsWith('[')) {
    try {
      const arr = JSON.parse(horizon);
      if (Array.isArray(arr)) return arr.map(v => parseFloat(v) / 5);
    } catch {}
  }
  return [...horizon.trim()].filter(c => VALID_BLOCKS.has(c)).map(c => BLOCK_MAP[c]);
}

function HorizonBars({ horizon, animate }) {
  const bars = parseHorizon(horizon);
  if (!bars.length) return null;

  return (
    <div>
      <div style={{
        fontFamily: 'DM Mono, monospace',
        fontSize: 9,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: '#444',
        marginBottom: 8,
      }}>
        Horizon
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 48 }}>
        {bars.map((h, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: h * 100 + '%',
              background: '#c8d47a',
              borderRadius: '2px 2px 0 0',
              transformOrigin: 'bottom',
              transform: animate ? 'scaleY(1)' : 'scaleY(0)',
              opacity: animate ? 1 : 0,
              transition: animate
                ? 'transform 0.5s cubic-bezier(0.34,1.4,0.64,1) ' + (i * 40) + 'ms, opacity 0.3s ease ' + (i * 40) + 'ms'
                : 'none',
            }}
          />
        ))}
      </div>
    </div>
  );
}

function Chip({ children, accent }) {
  return (
    <span style={{
      fontFamily: 'DM Mono, monospace',
      fontSize: 10,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      border: '1px solid ' + (accent ? '#c8d47a44' : '#2a2a2a'),
      color: accent ? '#c8d47a' : '#666',
      borderRadius: 4,
      padding: '3px 8px',
      whiteSpace: 'nowrap',
    }}>
      {children}
    </span>
  );
}



function SectionLabel({ children }) {
  return (
    <div style={{
      fontFamily: 'DM Mono, monospace',
      fontSize: 9,
      letterSpacing: '0.14em',
      textTransform: 'uppercase',
      color: '#444',
      marginBottom: 10,
      paddingBottom: 8,
      borderBottom: '1px solid #2a2a2a',
    }}>
      {children}
    </div>
  );
}

export default function EntryModal({ slug, onClose }) {
  const [entry, setEntry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [animate, setAnimate] = useState(false);
  const modalRef = useRef(null);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setAnimate(false);
    setEntry(null);
    fetch('/api/entries/' + slug)
      .then(r => r.json())
      .then(data => {
        setEntry(data.entry || data);
        setLoading(false);
        requestAnimationFrame(() => requestAnimationFrame(() => setAnimate(true)));
      })
      .catch(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (slug) {
      window.history.pushState({}, '', '/entries/' + slug);
    }
    return () => {
      if (window.location.pathname.startsWith('/entries/')) {
        window.history.pushState({}, '', '/');
      }
    };
  }, [slug]);

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const tags = entry?.tags
    ? (Array.isArray(entry.tags) ? entry.tags : entry.tags.split(',').map(t => t.trim()).filter(Boolean))
    : [];



  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)',
          zIndex: 500, animation: 'modalFadeIn 0.2s ease forwards',
        }}
      />

      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        style={{
          position: 'fixed', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '75vw', maxWidth: 900, height: '85vh',
          background: '#161616', borderRadius: 12,
          border: '1px solid #2a2a2a', zIndex: 501,
          display: 'flex', overflow: 'hidden',
          animation: 'modalSlideIn 0.25s cubic-bezier(0.34,1.2,0.64,1) forwards',
        }}
      >
        <div style={{
          width: '40%', flexShrink: 0, background: '#111',
          display: 'flex', flexDirection: 'column',
          borderRight: '1px solid #2a2a2a', overflow: 'hidden',
        }}>
          <div style={{ width: '100%', aspectRatio: '1', flexShrink: 0, background: '#0e0e0e', overflow: 'hidden' }}>
            {entry?.album_art ? (
              <img src={entry.album_art} alt={entry.album} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#333', fontSize: 32 }}>
                ♪
              </div>
            )}
          </div>

          <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12, flex: 1, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[80, 55, 40].map((w, i) => (
                  <div key={i} style={{ height: 10, width: w + '%', background: '#2a2a2a', borderRadius: 3 }} />
                ))}
              </div>
            ) : entry ? (
              <>
                <div>
                  <div style={{ fontFamily: 'DM Serif Display, serif', fontSize: 15, color: '#e8e4dc', lineHeight: 1.25, marginBottom: 3 }}>
                    {entry.album}
                  </div>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, letterSpacing: '0.08em', color: '#555', textTransform: 'uppercase' }}>
                    {entry.artist}{entry.year ? ' · ' + entry.year : ''}
                  </div>
                </div>

                {entry.rating && <StarRating rating={entry.rating} size={16} />}

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {entry.relationship && <Chip>{entry.relationship}</Chip>}
                  {entry.entry_type && <Chip>{entry.entry_type}</Chip>}
                  {(entry.favorite === true || entry.favorite === 'true') && <Chip accent>Favorite</Chip>}
                </div>

                {entry.horizon && (
                  <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: '1px solid #2a2a2a' }}>
                    <HorizonBars horizon={entry.horizon} animate={animate} />
                  </div>
                )}
              </>
            ) : null}
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '14px 16px 0', flexShrink: 0 }}>
            <button
              onClick={onClose}
              style={{
                background: '#2a2a2a', border: 'none', borderRadius: '50%',
                width: 28, height: 28, display: 'flex', alignItems: 'center',
                justifyContent: 'center', cursor: 'pointer', color: '#888', fontSize: 13,
              }}
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 24px 0', display: 'flex', flexDirection: 'column', gap: 24 }}>
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 8 }}>
                {[100, 92, 97, 85, 90, 88, 95, 78, 93, 60].map((w, i) => (
                  <div key={i} style={{ height: 9, width: w + '%', background: '#2a2a2a', borderRadius: 3 }} />
                ))}
              </div>
            ) : entry ? (
              <>
                {entry.background && (
                  <section>
                    <SectionLabel>Background</SectionLabel>
                    <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, lineHeight: 1.85, color: '#888' }}>
                      {entry.background}
                    </div>
                  </section>
                )}

                {entry.notes && (
                  <section>
                    <SectionLabel>Notes</SectionLabel>
                    <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, lineHeight: 1.9, color: '#c8c4bc', whiteSpace: 'pre-wrap' }}>
                      {entry.notes}
                    </div>
                  </section>
                )}

                {tags.length > 0 && (
                  <section>
                    <SectionLabel>Tags</SectionLabel>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {tags.map((tag, i) => (
                        <span key={i} style={{
                          fontFamily: 'DM Mono, monospace', fontSize: 9, letterSpacing: '0.08em',
                          textTransform: 'uppercase', color: '#555', border: '1px solid #2a2a2a',
                          borderRadius: 4, padding: '3px 7px',
                        }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </section>
                )}

                <div style={{ height: 16 }} />
              </>
            ) : (
              <div style={{ color: '#444', fontFamily: 'DM Mono, monospace', fontSize: 11, paddingTop: 8 }}>
                entry not found
              </div>
            )}
          </div>

          <div style={{
            flexShrink: 0, borderTop: '1px solid #2a2a2a', padding: '12px 24px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: '#161616',
          }}>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, letterSpacing: '0.08em', color: '#333' }}>
              {entry ? '/entries/' + entry.slug : ''}
            </div>
            {entry && (
              <Link
                href={'/entries/' + entry.slug}
                onClick={onClose}
                style={{
                  fontFamily: 'DM Mono, monospace', fontSize: 10, letterSpacing: '0.1em',
                  textTransform: 'uppercase', color: '#c8d47a', textDecoration: 'none',
                  display: 'flex', alignItems: 'center', gap: 5,
                }}
              >
                Full page + comments ↗
              </Link>
            )}
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes modalFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes modalSlideIn {
          from { opacity: 0; transform: translate(-50%, calc(-50% + 16px)); }
          to { opacity: 1; transform: translate(-50%, -50%); }
        }
      ` }} />
    </>
  );
}
