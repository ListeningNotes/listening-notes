'use client';

import { useState, useEffect, useRef } from 'react';

const PASSWORD = 'listeningnotes';

export default function Session() {
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState('');
  const [pwError, setPwError] = useState(false);

  const [album, setAlbum] = useState('');
  const [artist, setArtist] = useState('');
  const [brief, setBrief] = useState(null);
  const [briefLoading, setBriefLoading] = useState(false);
  const [briefError, setBriefError] = useState('');

  const [notes, setNotes] = useState('');
  const [rating, setRating] = useState(0);
  const [masterpiece, setMasterpiece] = useState(false);
  const [favorite, setFavorite] = useState(false);
  const [entryType, setEntryType] = useState('');
  const [relationship, setRelationship] = useState('');
  const [horizonBar, setHorizonBar] = useState(true);

  const [formatting, setFormatting] = useState(false);
  const [output, setOutput] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    const stored = localStorage.getItem('ln_session_auth');
    if (stored === 'true') setAuthed(true);
  }, []);

  useEffect(() => {
    if (brief && !timerRef.current) {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    }
    return () => {};
  }, [brief]);

  function formatTime(s) {
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }

  function handleAuth() {
    if (pw === PASSWORD) {
      setAuthed(true);
      localStorage.setItem('ln_session_auth', 'true');
    } else {
      setPwError(true);
    }
  }

  async function doResearch() {
    if (!album.trim()) return;
    setBriefLoading(true);
    setBriefError('');
    setBrief(null);

    try {
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ album, artist })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setBrief(data);
    } catch (err) {
      setBriefError(err.message || 'Research failed. Try again.');
    } finally {
      setBriefLoading(false);
    }
  }

  async function doFormat() {
    if (!notes.trim() || !brief) return;
    setFormatting(true);

    try {
      const res = await fetch('/api/format', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brief, notes, rating, masterpiece,
          favorite, entryType, relationship, horizonBar
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setOutput(data);
    } catch (err) {
      alert('Formatting failed: ' + err.message);
    } finally {
      setFormatting(false);
    }
  }

  async function doSave() {
    if (!output) return;
    setSaving(true);

    try {
      const res = await fetch('/api/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          album: brief.album,
          artist: brief.artist,
          year: brief.year,
          entry_type: entryType || 'First Listen',
          relationship: relationship || '',
          rating: masterpiece ? 'masterpiece' : (rating ? rating + ' stars' : ''),
          favorite,
          background: output.background,
          notes: output.notes_prose,
          tags: output.tags || [],
          horizon: output.horizon || '',
          album_art: '',
          post_link: ''
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSaved(true);
    } catch (err) {
      alert('Save failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  // ── PASSWORD GATE ──
  if (!authed) {
    return (
      <div className="min-h-screen bg-[#0e0e0e] flex items-center justify-center p-6">
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-10 w-full max-w-sm flex flex-col gap-6">
          <h1 className="text-2xl" style={{fontFamily:'var(--font-serif)'}}>
            listening <em className="text-[#c8d47a]">notes</em>
          </h1>
          <p className="text-xs text-[#555] uppercase tracking-widest" style={{fontFamily:'var(--font-mono)'}}>
            session access
          </p>
          <input
            type="password"
            placeholder="password"
            value={pw}
            onChange={e => { setPw(e.target.value); setPwError(false); }}
            onKeyDown={e => e.key === 'Enter' && handleAuth()}
            className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-lg px-4 py-3 text-sm outline-none focus:border-[#c8d47a] text-[#e8e4dc]"
            style={{fontFamily:'var(--font-mono)'}}
          />
          {pwError && <p className="text-xs text-red-400" style={{fontFamily:'var(--font-mono)'}}>incorrect password</p>}
          <button
            onClick={handleAuth}
            className="bg-[#c8d47a] text-[#0e0e0e] rounded-lg py-3 text-xs uppercase tracking-widest font-medium cursor-pointer"
            style={{fontFamily:'var(--font-mono)'}}
          >
            Enter →
          </button>
        </div>
      </div>
    );
  }

  // ── MAIN SESSION ──
  return (
    <div className="min-h-screen bg-[#0e0e0e] text-[#e8e4dc] flex flex-col">

      {/* Topbar */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-[#2a2a2a] bg-[#161616]">
        <span className="text-lg" style={{fontFamily:'var(--font-serif)'}}>
          listening <em className="text-[#c8d47a]">notes</em>
        </span>
        <span className="text-[#2a2a2a]">|</span>
        <span className="text-xs text-[#555] uppercase tracking-widest" style={{fontFamily:'var(--font-mono)'}}>session</span>
        {brief && (
          <>
            <span className="text-[#2a2a2a]">|</span>
            <span className="text-xs text-[#555]" style={{fontFamily:'var(--font-mono)'}}>{formatTime(elapsed)} elapsed</span>
          </>
        )}
        <div className="ml-auto flex gap-3">
          <input
            value={album}
            onChange={e => setAlbum(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && doResearch()}
            placeholder="Album title..."
            className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-lg px-3 py-2 text-xs outline-none focus:border-[#c8d47a] text-[#e8e4dc] w-48"
            style={{fontFamily:'var(--font-mono)'}}
          />
          <input
            value={artist}
            onChange={e => setArtist(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && doResearch()}
            placeholder="Artist..."
            className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-lg px-3 py-2 text-xs outline-none focus:border-[#c8d47a] text-[#e8e4dc] w-36"
            style={{fontFamily:'var(--font-mono)'}}
          />
          <button
            onClick={doResearch}
            disabled={briefLoading}
            className="bg-[#c8d47a] text-[#0e0e0e] rounded-lg px-4 py-2 text-xs uppercase tracking-widest font-medium cursor-pointer disabled:opacity-40"
            style={{fontFamily:'var(--font-mono)'}}
          >
            {briefLoading ? '...' : 'Research →'}
          </button>
        </div>
      </div>

      {/* Main panels */}
      <div className="flex flex-1 overflow-hidden">

        {/* Brief panel */}
        <div className="w-1/2 border-r border-[#2a2a2a] flex flex-col overflow-hidden">
          <div className="px-5 py-3 border-b border-[#2a2a2a] flex items-center justify-between">
            <span className="text-xs text-[#555] uppercase tracking-widest" style={{fontFamily:'var(--font-mono)'}}>Album Briefing</span>
          </div>
          <div className="flex-1 overflow-y-auto p-5">
            {!brief && !briefLoading && !briefError && (
              <p className="text-xs text-[#555] text-center mt-20" style={{fontFamily:'var(--font-mono)'}}>
                Enter an album above and click Research to pull context before you listen.
              </p>
            )}
            {briefLoading && (
              <div className="flex flex-col gap-3 mt-4">
                {[100,70,100,50,100,80].map((w,i) => (
                  <div key={i} className="h-3 rounded bg-[#1e1e1e] animate-pulse" style={{width:`${w}%`}} />
                ))}
              </div>
            )}
            {briefError && (
              <p className="text-xs text-red-400 mt-4" style={{fontFamily:'var(--font-mono)'}}>{briefError}</p>
            )}
            {brief && (
              <div className="flex flex-col gap-5">
                <div>
                  <h2 className="text-2xl mb-1" style={{fontFamily:'var(--font-serif)'}}>{brief.album}</h2>
                  <p className="text-xs text-[#c8d47a]" style={{fontFamily:'var(--font-mono)'}}>{brief.artist}</p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {[brief.year, brief.genre, brief.label, brief.debut ? '⬖ debut' : null].filter(Boolean).map((t,i) => (
                      <span key={i} className="text-xs border border-[#2a2a2a] px-2 py-0.5 rounded text-[#9a9590]" style={{fontFamily:'var(--font-mono)'}}>{t}</span>
                    ))}
                  </div>
                </div>
                {[['Context', brief.context], ['Production', brief.production], ['Reception', brief.reception], ['Listen For', brief.listen_for]].map(([label, val]) => val ? (
                  <div key={label}>
                    <p className="text-xs text-[#555] uppercase tracking-widest mb-2 pb-1 border-b border-[#2a2a2a]" style={{fontFamily:'var(--font-mono)'}}>{label}</p>
                    <p className="text-xs leading-relaxed text-[#9a9590]">{val}</p>
                  </div>
                ) : null)}
                {brief.key_facts?.length > 0 && (
                  <div>
                    <p className="text-xs text-[#555] uppercase tracking-widest mb-2 pb-1 border-b border-[#2a2a2a]" style={{fontFamily:'var(--font-mono)'}}>Key Facts</p>
                    {brief.key_facts.map((f,i) => (
                      <p key={i} className="text-xs text-[#9a9590] mb-1">— {f}</p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Notes panel */}
        <div className="w-1/2 flex flex-col overflow-hidden">
          <div className="px-5 py-3 border-b border-[#2a2a2a] flex items-center gap-4 flex-wrap">
            <span className="text-xs text-[#555] uppercase tracking-widest" style={{fontFamily:'var(--font-mono)'}}>Session Notes</span>

            <select value={entryType} onChange={e => setEntryType(e.target.value)}
              className="bg-[#1e1e1e] border border-[#2a2a2a] rounded px-2 py-1 text-xs text-[#e8e4dc] outline-none ml-auto"
              style={{fontFamily:'var(--font-mono)'}}>
              <option value="">— type</option>
              <option>First Listen</option>
              <option>Revisit</option>
              <option>Deep Dive</option>
            </select>

            <select value={relationship} onChange={e => setRelationship(e.target.value)}
              className="bg-[#1e1e1e] border border-[#2a2a2a] rounded px-2 py-1 text-xs text-[#e8e4dc] outline-none"
              style={{fontFamily:'var(--font-mono)'}}>
              <option value="">— relationship</option>
              <option>first listen</option>
              <option>revisit</option>
              <option>submission</option>
              <option>favorite</option>
              <option>formative</option>
              <option>study</option>
            </select>
          </div>

          {/* Stars + toggles */}
          <div className="px-5 py-2 border-b border-[#2a2a2a] flex items-center gap-4 flex-wrap">
            <div className="flex gap-1">
              {[1,2,3,4,5].map(n => (
                <span key={n} onClick={() => setRating(rating === n ? 0 : n)}
                  className={`text-lg cursor-pointer transition-colors ${n <= rating ? 'text-[#c8d47a]' : 'text-[#555]'}`}>★</span>
              ))}
            </div>
            <label className="flex items-center gap-2 text-xs text-[#9a9590] cursor-pointer" style={{fontFamily:'var(--font-mono)'}}>
              <input type="checkbox" checked={masterpiece} onChange={e => setMasterpiece(e.target.checked)} className="accent-[#c8d47a]" />
              masterpiece
            </label>
            <label className="flex items-center gap-2 text-xs text-[#9a9590] cursor-pointer" style={{fontFamily:'var(--font-mono)'}}>
              <input type="checkbox" checked={favorite} onChange={e => setFavorite(e.target.checked)} className="accent-[#c8d47a]" />
              favorite
            </label>
            <label className="flex items-center gap-2 text-xs text-[#9a9590] cursor-pointer" style={{fontFamily:'var(--font-mono)'}}>
              <input type="checkbox" checked={horizonBar} onChange={e => setHorizonBar(e.target.checked)} className="accent-[#c8d47a]" />
              horizon bar
            </label>
          </div>

          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Start writing as you listen. Thoughts, timestamps, feelings, reactions — anything."
            className="flex-1 bg-transparent outline-none resize-none p-5 text-xs leading-relaxed text-[#e8e4dc] placeholder-[#555]"
            style={{fontFamily:'var(--font-mono)'}}
          />

          <div className="px-5 py-3 border-t border-[#2a2a2a] flex items-center justify-between">
            <span className="text-xs text-[#555]" style={{fontFamily:'var(--font-mono)'}}>{notes.length} chars</span>
            <button
              onClick={doFormat}
              disabled={!brief || notes.trim().length < 20 || formatting}
              className="bg-[#e8e4dc] text-[#0e0e0e] rounded-lg px-6 py-2 text-xs uppercase tracking-widest font-medium cursor-pointer disabled:opacity-30"
              style={{fontFamily:'var(--font-mono)'}}
            >
              {formatting ? 'Formatting…' : 'Format & Done →'}
            </button>
          </div>
        </div>
      </div>

      {/* Output modal */}
      {output && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-6">
          <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2a2a]">
              <h2 className="text-lg" style={{fontFamily:'var(--font-serif)'}}>Session Output</h2>
              <div className="flex gap-3">
                {!saved ? (
                  <button onClick={doSave} disabled={saving}
                    className="bg-[#c8d47a] text-[#0e0e0e] rounded-lg px-5 py-2 text-xs uppercase tracking-widest font-medium cursor-pointer disabled:opacity-40"
                    style={{fontFamily:'var(--font-mono)'}}>
                    {saving ? 'Saving…' : 'Save to Site →'}
                  </button>
                ) : (
                  <span className="text-xs text-[#c8d47a] px-5 py-2" style={{fontFamily:'var(--font-mono)'}}>✓ saved</span>
                )}
                <button onClick={() => setOutput(null)}
                  className="bg-[#2a2a2a] text-[#e8e4dc] rounded-lg px-4 py-2 text-xs cursor-pointer"
                  style={{fontFamily:'var(--font-mono)'}}>close</button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
              <div>
                <p className="text-xs text-[#555] uppercase tracking-widest mb-2" style={{fontFamily:'var(--font-mono)'}}>Background</p>
                <p className="text-xs leading-relaxed text-[#9a9590]">{output.background}</p>
              </div>
              {output.horizon && (
                <p className="text-center text-[#555] tracking-widest text-xs" style={{fontFamily:'var(--font-mono)'}}>{output.horizon}</p>
              )}
              <div>
                <p className="text-xs text-[#555] uppercase tracking-widest mb-2" style={{fontFamily:'var(--font-mono)'}}>Notes</p>
                <p className="text-xs leading-relaxed">{output.notes_prose}</p>
              </div>
              <div>
                <p className="text-xs text-[#555] uppercase tracking-widest mb-2" style={{fontFamily:'var(--font-mono)'}}>Tags</p>
                <div className="flex flex-wrap gap-2">
                  {(output.tags||[]).map((t,i) => (
                    <span key={i} className="text-xs text-[#555] border border-[#2a2a2a] px-2 py-0.5 rounded" style={{fontFamily:'var(--font-mono)'}}>#{t}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}