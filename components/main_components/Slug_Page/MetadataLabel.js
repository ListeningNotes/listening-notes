// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
import { fonts } from '../../../library/sitewide_visuals';

// `sticky` pins the label to the top of whatever is scrolling it, so on phones
// the section you are reading names itself the whole time — Album Notes holds
// until Track Notes pushes it out of the way. The class does the pinning (see
// FullPostPage), and only inside the phone layout; on desktop it is inert.
export default function MetadataLabel({ children, sticky = false }) {
  // Tapping the heading you're reading under takes you back to the top of that
  // section — the thing your thumb reaches for once the header is the only
  // fixed thing on screen. Only where the heading is actually pinned: on
  // desktop it scrolls in the flow like any other text and there's nothing to
  // tap back to.
  function backToSectionTop(e) {
    if (!window.matchMedia('(max-width: 768px)').matches) return;
    const section = e.currentTarget.closest('section');
    if (!section) return;

    // Move only the element that actually scrolls this section. scrollIntoView
    // walks every scrollable ancestor, so it also dragged the snap container
    // the two screens sit in — which fights the snap and can leave you parked
    // past the end of the second screen with blank space below it.
    let scroller = section.parentElement;
    while (scroller) {
      const overflowY = getComputedStyle(scroller).overflowY;
      if ((overflowY === 'auto' || overflowY === 'scroll') && scroller.scrollHeight > scroller.clientHeight) break;
      scroller = scroller.parentElement;
    }
    if (!scroller) return;

    const top = scroller.scrollTop + (section.getBoundingClientRect().top - scroller.getBoundingClientRect().top);
    scroller.scrollTo({ top, behavior: 'smooth' });
  }

  return (
    <div
      className={sticky ? 'ln-meta-label--sticky' : undefined}
      onClick={sticky ? backToSectionTop : undefined}
      style={{ fontFamily: fonts.mono, fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink-faint)', marginBottom: '16px', paddingBottom: '10px', borderBottom: '1px solid var(--border)' }}
    >
      {children}
    </div>
  );
}
