// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Submissions moved into the unified dashboard inbox (Submissions + Comments tabs).
export default function SubmissionsRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/dashboard/inbox'); }, [router]);
  return <div style={{ minHeight: '100vh', background: '#f5f3ef' }} />;
}
