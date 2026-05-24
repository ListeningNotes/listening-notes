'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fonts } from '../../library/sitewide_visuals';
import DotNav from '../../components/main_components/DotNav';
import { useTheme } from '../../components/main_components/Lightswitch';

const SECTIONS = [
  { id: 'about',  label: 'About'  },
  { id: 'specs',  label: 'Specs'  },
  { id: 'index',  label: 'Index'  },
];

const STAR_NOTES = [
  { stars: '★★★★★', body: 'A full-body yes. An album or track that feels complete and emotionally alive. I return to it willingly and often. Nothing pulls me out of the experience; even its rough edges feel necessary. These are the tracks and albums that stay with me and sometimes shape how I listen to music altogether.' },
  { stars: '★★★★☆', body: 'Strong, memorable, and successful. The core vision lands, even if there are a few moments that don’t fully click for me. I might not love every second, but the highs are real and meaningful. Albums and tracks at this level earn repeat listens and attention.' },
  { stars: '★★★☆☆', body: 'Interesting, but uneven. I appreciate the ideas more than the execution, or the experience more than the replay value. These albums or tracks might matter to me more conceptually or contextually, but don’t quite pull me in emotionally.' },
  { stars: '★★☆☆☆', body: 'Respect more than attachment. I’m glad it exists and I’m glad I listened, but I don’t feel drawn back. Albums or tracks at this level might have some compelling moments, yet the immersion breaks too often. My attention drifts, the balance feels off, or the piece just doesn’t quite land for me.' },
  { stars: '★☆☆☆☆', body: 'Not for me. Either actively uncomfortable to listen to, or lacking the elements I need to stay engaged. Sometimes I hear intention, but the execution just doesn’t hold me. These ratings never mean “bad” — just disconnected from my listening habits.' },
  { stars: '½',     body: 'Half-stars appear when I’m genuinely pulled in two directions — simply too strong to place lower, but not fully aligned enough to place higher. I’ve actively wrestled with these albums or tracks and ultimately decided to meet in the middle.' },
  { stars: 'Masterpiece', body: 'Entire 5-star track list. Flawless.' },
];

const RELATIONSHIP_NOTES = [
  { label: 'First listen', body: 'My first time listening to an album front to back with intention. I may already know a handful of tracks, but this is the first time I’m hearing the full album as a complete work.' },
  { label: 'Revisit',      body: 'An album I’ve lived with before and am returning to with fresh attention, often in a new listening setup or emotional context.' },
  { label: 'Formative',    body: 'An album that shaped my relationship with music or how I listen, regardless of when I first heard it. These tend to be albums I’ve spent a significant portion of my life with.' },
  { label: 'Study',        body: 'A listen rooted in history, influence, or research. Usually the album matters culturally or technologically, even if it’s not built for repeat listening.' },
  { label: 'Submission',   body: 'An album recommended to me by someone else and listened to as a response or exchange.' },
];

export default function AboutPage() {
  const { theme, toggle } = useTheme();
  const [activeSection, setActiveSection] = useState('about');

  // Highlight active jump-nav item based on scroll position
  useEffect(() => {
    function onScroll() {
      const offset = window.innerHeight * 0.35;
      let current = 'about';
      for (const s of SECTIONS) {
        const el = document.getElementById(s.id);
        if (el && el.getBoundingClientRect().top <= offset) current = s.id;
      }
      setActiveSection(current);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  function jumpTo(id) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', color: 'var(--ink)', fontFamily: fonts.sans }}>
      <Link href="/" className="hp-logo-mini" aria-label="Listening Notes">
        <img src="/Logo.png" alt="Listening Notes" style={{ filter: theme === 'dark' ? 'invert(1)' : 'none' }} />
      </Link>
      <div className="hp-corner">
        <a
          href="https://instagram.com/listeningnotes.blog"
          target="_blank"
          rel="noopener noreferrer"
          className="hp-icon-btn"
          aria-label="Instagram"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none"/></svg>
        </a>
        <button className="hp-icon-btn" onClick={toggle} aria-label="Toggle theme">
          {theme === 'dark' ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1111.21 3a7 7 0 109.79 9.79z"/></svg>
          )}
        </button>
      </div>
      <DotNav />

      {/* Hero */}
      <header style={{ maxWidth: 760, margin: '0 auto', padding: '120px 24px 48px' }}>
        <div style={{ fontFamily: 'var(--font-label)', fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 18 }}>
          About
        </div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 'clamp(38px, 6vw, 60px)', margin: 0, lineHeight: 1.08, letterSpacing: '-0.02em' }}>
          A practice of intentional listening.
        </h1>
        <p style={{ fontFamily: fonts.sans, fontSize: 17, lineHeight: 1.6, color: 'var(--ink-soft)', marginTop: 24, maxWidth: 580 }}>
          Listening Notes started as an answer to a question about my favorite albums and grew into a practice of documenting intentional listening.
        </p>
      </header>

      {/* Sticky jump nav */}
      <nav style={{
        position: 'sticky', top: 12, zIndex: 50, padding: '12px 24px',
        display: 'flex', justifyContent: 'center',
      }}>
        <div style={{
          display: 'inline-flex', gap: 4, padding: 4, background: 'var(--panel)',
          backdropFilter: 'var(--card-blur)', WebkitBackdropFilter: 'var(--card-blur)',
          border: '1px solid var(--panel-border)', borderRadius: 999, boxShadow: 'var(--shadow-soft)',
        }}>
          {SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => jumpTo(s.id)}
              style={{
                fontFamily: 'var(--font-label)', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase',
                padding: '8px 18px', borderRadius: 999, border: 'none', cursor: 'pointer',
                background: activeSection === s.id ? 'var(--accent)' : 'transparent',
                color: activeSection === s.id ? '#1a1a1a' : 'var(--ink-soft)',
                transition: 'background 0.2s, color 0.2s',
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </nav>

      <main style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px 120px' }}>

        {/* ABOUT */}
        <Section id="about" label="About">
          <p>
            Listening Notes started as an answer to a question about my favorite albums and it grew into a practice of documenting intentional listening. Now it is becoming a larger system for mapping taste, preserving musical encounters, and creating space for shared reflection around sound.
          </p>
          <p>
            Back in 2020, a close friend asked me to send them a list of my favorite albums, and I never finished it&mdash;actually I never even started. For years I thought I&rsquo;d get around to it one day, but I just kept putting it off. I always thought I was just procrastinating, but now I think I was resisting the format of what was being asked of me. Music has always meant too much to me to throw into a quick list in my notes app and call it done. I did not just want to name the albums, I wanted to capture my feelings around them and why they mattered to me.
          </p>
          <p>
            Finally, in December 2025, I started Listening Notes. It was my way of finally addressing that question: what are my favorite albums? But somewhere along the way, it stopped being just about answering that. It became a way to document my relationship with music entirely, and in real time. That shift changed the whole project for me. What started as a Tumblr blog became something much more alive and closer to an archive of my listening habits than just a collection of reviews.
          </p>
          <p>
            At its core is the idea that listening is worth documenting. I have always been someone who likes to record things, preserve things, and leave a trace of who I am in this world. That is why I do not really think of these entries as judgments. They are more like evidence of an encounter. They show what stood out to me, what confused me, what moved me, and what stays with me even after the album has ended. Over time entries start to reveal patterns not only in my musical taste, but also patterns in how I listen. That is part of what this project has grown into for me. It is not only about asking what my favorite music is. It is also about asking what kind of listener I am and how my taste takes shape over time.
          </p>
          <p>
            A major turning point in how I listened came in 2024 when I visited the Art of Noise exhibition at SFMOMA and experienced Devon Turnbull&rsquo;s high-fidelity listening room installation. That experience genuinely changed something in me. It was not about volume or spectacle. It was about precision and the feeling that recorded sound could be presented with a kind of care that made its full shape more visible. Since then I have been much more conscious of listening as an intentional practice. Right now that means listening with my own Hi-Fi headphone setup while I slowly work towards building a dedicated listening room of my own. The setup used for listening can be explored more <button onClick={() => jumpTo('specs')} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--ink)', textDecoration: 'underline', cursor: 'pointer', font: 'inherit' }}>here</button>.
          </p>
          <p>
            I also know this project was never meant to stay private. Part of what has always fascinated me about music is how differently people can hear the same exact album. I have spent so much time reading other people&rsquo;s thoughts by looking up reddit threads or interpretations on Genius just to understand how a piece landed for someone else. I do not want Listening Notes to just be a private diary hidden away. I want it to be a place where exposure can happen, music can be shared, and opinions are openly discussed.
          </p>
          <p>
            Listening Notes is no longer just a blog where I post album thoughts. It has grown into something much bigger. What I am building now is not simply a place to store opinions, but a system for documenting taste, noticing patterns in what moves someone, and treating a relationship to sound as something worth preserving with real care. If someone asked me today for a list of my favorite albums I would point them here because this says much more fully what music actually means to me.
          </p>
        </Section>

        {/* SPECS */}
        <Section id="specs" label="Specs">
          <h3 style={subheadingStyle}>Current listening setup</h3>
          <ul style={specListStyle}>
            <li>
              <a href="https://us.sennheiser-hearing.com/products/hd-600" target="_blank" rel="noopener noreferrer" style={specLinkStyle}>
                Sennheiser HD 600 headphones ↗
              </a>
            </li>
            <li>
              <a href="https://ifi-audio.com/products/zen-dac-3" target="_blank" rel="noopener noreferrer" style={specLinkStyle}>
                iFi Zen DAC 3 ↗
              </a>
            </li>
            <li>Wired connection from laptop</li>
            <li>Apple Music source audio (Lossless / Dolby Atmos when available)</li>
          </ul>

          <h3 style={subheadingStyle}>Why it matters</h3>
          <p>
            The HD 600s were chosen for one reason: neutrality. They don&rsquo;t exaggerate bass, widen space artificially, or smooth over rough edges. They&rsquo;re open-back, which means sound isn&rsquo;t sealed inside the earcup&mdash;it breathes. That design trades isolation for realism. Space feels very natural through these headphones. If a mix has depth, you hear it. If it doesn&rsquo;t, that&rsquo;s revealed too.
          </p>
          <p>
            The iFi Zen DAC serves two roles at once. As a DAC, it converts digital audio&mdash;numbers&mdash;into a continuous electrical signal. As an amplifier, it supplies that signal with enough voltage and current to properly move the headphone drivers. This matters more than volume to me. Proper amplification stabilizes timing, dynamics, and control. The sound stops straining and quiet details hold steady instead of flickering.
          </p>
          <p>
            What changed my understanding completely was learning what&rsquo;s actually happening here. These headphones don&rsquo;t &ldquo;play back&rdquo; music the way a screen plays video. They recreate it physically. The electrical signal coming from the amp causes the drivers to move air&mdash;microscopically, precisely&mdash;right in front of my ears. That&rsquo;s also when I noticed that wired headphones don&rsquo;t need to be charged. They aren&rsquo;t computers, they&rsquo;re more like instruments. Power comes from the amplifier, timing comes from the signal, and the performance happens in real time. In that sense, every listening session is a small live performance built from scratch, moment by moment. This is different from the headphones I used before. Wireless headphones compress the signal, process it digitally, and rely on tiny internal amplifiers powered by batteries. With the wired setup, everything is separated: conversion, amplification, and transduction each have room to do their job properly.
          </p>
          <p>
            The result isn&rsquo;t &ldquo;better&rdquo; sound in a flashy way. It&rsquo;s more stable sound and much more legible. Music stops floating vaguely and starts occupying space with intention. That stability is what makes active listening possible.
          </p>
        </Section>

        {/* INDEX */}
        <Section id="index" label="Index">
          <p style={{ color: 'var(--ink-soft)', marginTop: 0 }}>
            How ratings and tags are used across entries.
          </p>

          <h3 style={subheadingStyle}>Star Notes</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginTop: 16 }}>
            {STAR_NOTES.map((s) => (
              <div key={s.stars} style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 20, alignItems: 'baseline' }}>
                <div style={{ fontFamily: 'var(--font-label)', fontSize: 14, color: 'var(--gold)', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                  {s.stars}
                </div>
                <div style={{ fontSize: 15, lineHeight: 1.6, color: 'var(--ink-soft)' }}>
                  {s.body}
                </div>
              </div>
            ))}
          </div>

          <h3 style={subheadingStyle}>Relationship Notes</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginTop: 16 }}>
            {RELATIONSHIP_NOTES.map((r) => (
              <div key={r.label} style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 20, alignItems: 'baseline' }}>
                <div style={{ fontFamily: 'var(--font-label)', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--accent)' }}>
                  {r.label}
                </div>
                <div style={{ fontSize: 15, lineHeight: 1.6, color: 'var(--ink-soft)' }}>
                  {r.body}
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Footer back link */}
        <div style={{ marginTop: 80, paddingTop: 32, borderTop: '1px solid var(--border)', textAlign: 'center' }}>
          <Link href="/" style={{
            fontFamily: 'var(--font-label)', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase',
            color: 'var(--ink-soft)', textDecoration: 'none',
          }}>
            ← Back home
          </Link>
        </div>
      </main>
    </div>
  );
}

// ── Section wrapper ─────────────────────────────────────────────────────
function Section({ id, label, children }) {
  return (
    <section id={id} style={{ marginTop: 72, scrollMarginTop: 96 }}>
      <div style={{
        fontFamily: 'var(--font-label)', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase',
        color: 'var(--ink-faint)', marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid var(--border)',
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: fonts.sans, fontSize: 16, lineHeight: 1.75, color: 'var(--ink-soft)',
      }}>
        {children}
      </div>
    </section>
  );
}

const subheadingStyle = {
  fontFamily: 'var(--font-display)',
  fontWeight: 400,
  fontSize: 24,
  letterSpacing: '-0.01em',
  marginTop: 40,
  marginBottom: 12,
  color: 'var(--ink)',
};

const specListStyle = {
  listStyle: 'none',
  padding: 0,
  margin: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  fontFamily: 'var(--font-label)',
  fontSize: 13,
};

const specLinkStyle = {
  color: 'var(--ink)',
  textDecoration: 'none',
  borderBottom: '1px solid var(--accent)',
  paddingBottom: 1,
};
