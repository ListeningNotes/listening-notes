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
    e.currentTarget.closest('section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
