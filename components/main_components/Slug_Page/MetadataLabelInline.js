// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
import { fonts } from '../../../library/sitewide_visuals';

export default function MetadataLabelInline({ children }) {
  return (
    <span style={{ fontFamily: fonts.mono, fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink-faint)' }}>
      {children}
    </span>
  );
}
