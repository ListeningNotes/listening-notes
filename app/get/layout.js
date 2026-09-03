// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// app/get/layout.js
// The frame the three /get pages share: the nav row, the measure, the type.
//
// /get is three addresses now rather than one long page — the door, the
// steps, the story — because the person arriving has already seen a journal
// working and is trying to get from wanting one to having one. Each of those
// three is a different errand, and each needs a URL of its own: the steps so
// they can be texted to somebody stuck at step four with Vercel open in
// another tab, the story so it can be read as a piece of writing and not as
// the thing between a button and its instructions.
//
// What they share is here, so none of the three pages carries a stylesheet
// the other two repeat. The drawer rule is each page's own business: every
// one of them 404s on a copy that has not written the essay, because these
// are Miyel's pages on Miyel's copy.

import SiteNav from '../../components/main_components/SiteNav';

export default function GetLayout({ children }) {
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', color: 'var(--ink)' }}>
      <style>{`
        /* The same measure and rhythm the About page sets its prose in — this
           is the same writing, one page further along. */
        .get-wrap {
          --get-nav-bottom: calc(80px + var(--safe-top));
          max-width: 720px; margin: 0 auto;
          padding: calc(var(--get-nav-bottom) + 44px) 48px 120px;
        }
        @media (max-width: 640px) {
          .get-wrap { padding: calc(var(--get-nav-bottom) + 20px) 24px 80px; }
        }

        /* The way back to the door, above the heading on the two pages under
           it. A link and not the browser's back button, because the link the
           reader arrived by may have been a text message. */
        .get-back {
          display: inline-block; margin: 0 0 22px;
          font-family: var(--font-label); font-size: 10px; letter-spacing: 0.14em;
          text-transform: uppercase; color: var(--ink-soft); text-decoration: none;
        }
        .get-back:hover { color: var(--ink); }
        .get-kicker {
          font-family: var(--font-label);
          font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase;
          color: var(--ink-faint); margin: 0 0 10px;
        }
        .get-title {
          font-family: var(--font-display); font-weight: var(--font-display-weight);
          font-size: clamp(30px, 6vw, 46px); line-height: 1.05;
          letter-spacing: -0.02em; margin: 0;
        }
        /* The door's hero: regular weight, and only the one word bold. */
        .get-title--door { font-weight: 400; }
        .get-title--door strong { font-weight: var(--font-display-weight); }
        .get-lede {
          font-size: 15px; line-height: 1.8; color: var(--ink);
          margin: 22px 0 0; max-width: 34em;
        }

        /* The button. Solid, because it is the one thing on the door page a
           person came to press; the pill is for the ways out. */
        .get-cta {
          display: inline-flex; align-items: center; justify-content: center;
          margin: 30px 0 0; padding: 15px 26px;
          border-radius: 999px; border: 1px solid var(--ink);
          background: var(--ink); color: var(--bg);
          font-family: var(--font-label); font-size: 11px;
          letter-spacing: 0.16em; text-transform: uppercase;
          text-decoration: none; white-space: nowrap;
          transition: opacity 0.15s;
        }
        .get-cta:hover { opacity: 0.85; }
        .get-cta--step { margin-top: 14px; padding: 12px 22px; font-size: 10px; }
        /* The button and its caption, centred on the door. */
        .get-act { text-align: center; }
        .get-expect {
          font-family: var(--font-label); font-size: 10px; letter-spacing: 0.12em;
          text-transform: uppercase; color: var(--ink-faint); margin: 12px 0 0;
        }

        /* The table of contents: three rows, a rule between each, no cards. */
        .get-index { list-style: none; margin: 44px 0 0; padding: 0; border-top: 1px solid var(--border); }
        .get-index li { border-bottom: 1px solid var(--border); }
        .get-index a { display: block; padding: 18px 0; text-decoration: none; color: inherit; }
        .get-index a:hover .get-index-head { text-decoration: underline; text-underline-offset: 4px; }
        .get-index-head {
          font-family: var(--font-display); font-weight: var(--font-display-weight);
          font-size: 17px; letter-spacing: -0.01em; margin: 0;
        }
        .get-index-line { font-size: 14px; line-height: 1.6; color: var(--ink-soft); margin: 4px 0 0; }

        /* The steps. */
        .get-toggle {
          display: inline-flex; gap: 2px; margin: 26px 0 0; padding: 3px;
          border: 1px solid var(--border); border-radius: 999px;
        }
        .get-toggle button {
          padding: 8px 18px; border: 0; border-radius: 999px; background: transparent;
          color: var(--ink-soft); cursor: pointer;
          font-family: var(--font-label); font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase;
          transition: color 0.15s, background 0.15s;
        }
        .get-toggle button[aria-pressed="true"] { background: var(--ink); color: var(--bg); }
        .get-steps { list-style: none; margin: 40px 0 0; padding: 0; }
        .get-step { display: grid; grid-template-columns: 28px 1fr; gap: 14px; margin: 0 0 36px; }
        .get-num { font-family: var(--font-label); font-size: 11px; color: var(--ink-faint); padding-top: 5px; }
        .get-head {
          font-family: var(--font-display); font-weight: var(--font-display-weight);
          font-size: 18px; letter-spacing: -0.01em; margin: 0 0 4px;
        }
        .get-time {
          font-family: var(--font-label); font-size: 10px; letter-spacing: 0.12em;
          text-transform: uppercase; color: var(--ink-faint); margin: 0 0 8px;
        }
        .get-text { font-size: 14px; line-height: 1.8; color: var(--ink); margin: 0; }
        .get-shot { margin: 14px 0 0; border: 1px solid var(--border); border-radius: 12px; overflow: hidden; background: var(--panel); }
        .get-shot img { display: block; width: 100%; height: auto; }
        .get-shot--phone { max-width: 320px; }

        /* The essay. */
        .get-subhead {
          font-family: var(--font-display); font-weight: var(--font-display-weight);
          font-size: 20px; letter-spacing: -0.01em; color: var(--ink);
          margin: 48px 0 12px;
        }
        .get-subhead:first-of-type { margin-top: 0; }
        .get-para { font-size: 15px; line-height: 1.95; color: var(--ink); margin: 0 0 22px; }
        .get-prose { margin-top: 40px; }

        .get-foot {
          margin-top: 56px; padding-top: 28px; border-top: 1px solid var(--border);
          display: flex; flex-wrap: wrap; gap: 12px 20px; align-items: center;
        }
        .get-foot-help { font-size: 14px; line-height: 1.6; color: var(--ink-soft); margin: 0; }
        .get-foot-help a { color: var(--ink); }
      `}</style>

      <SiteNav />
      {children}
    </div>
  );
}
