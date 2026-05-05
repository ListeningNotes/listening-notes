'use client';
import Link from 'next/link';
import { fonts } from '../../../library/sitewide_visuals';

const BG = '#f5f2ed';
const TEXT = '#1a1916';
const MUTED = '#9a9590';
const BORDER = '#e0dcd5';

export default function Inbox() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: BG, fontFamily: fonts.sans, gap: 16,
    }}>
      <div style={{ fontFamily: fonts.serif, fontSize: 28, color: TEXT }}>Inbox</div>
      <div style={{ fontFamily: fonts.mono, fontSize: 11, color: MUTED, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        coming soon
      </div>
      <Link href="/dashboard" style={{
        marginTop: 24, fontFamily: fonts.mono, fontSize: 11,
        color: MUTED, letterSpacing: '0.06em', textDecoration: 'none',
        borderBottom: `1px solid ${BORDER}`,
      }}>← back</Link>
    </div>
  );
}
