// The journal as a feed, for people rather than for other journals.
//
// This is what following looks like without followers: someone subscribes in
// their own reader and gets new entries wherever they read things. The
// subscription lives on their side — there is no follower list here, no count,
// and no way to know who is reading. Nothing to check, nothing to perform for.
//
// Deliberately carries only what an item needs to be recognised and clicked:
// the record, how it was heard, and a link. The writing stays on the journal.

import { pull_public_entries } from '@/library/database_actions';
import { entryTypeLabel } from '@/library/entry_formatter';

const TITLE = 'Listening Notes';
const DESCRIPTION = 'A listening journal.';

// XML has five characters that cannot appear as themselves. Album titles are
// full of ampersands and quotes, so nothing reaches the output unescaped.
function xml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET(request) {
  const origin = new URL(request.url).origin;
  const entries = await pull_public_entries();

  const items = entries.map(e => {
    const link = `${origin}/entries/${e.slug}`;
    // pull_public_entries hands back a correct UTC instant; RFC 822 is what a
    // reader expects to parse.
    const date = e.created_at ? new Date(e.created_at).toUTCString() : null;
    const heard = entryTypeLabel(e.entry_type);
    const summary = [e.artist, e.year].filter(Boolean).join(' · ')
      + (e.rating ? ` — ${e.rating}` : '')
      + (heard ? ` (${heard})` : '');

    return `    <item>
      <title>${xml(e.album)} — ${xml(e.artist)}</title>
      <link>${xml(link)}</link>
      <guid isPermaLink="true">${xml(link)}</guid>
      <description>${xml(summary)}</description>${date ? `
      <pubDate>${xml(date)}</pubDate>` : ''}
    </item>`;
  }).join('\n');

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${xml(TITLE)}</title>
    <link>${xml(origin)}</link>
    <description>${xml(DESCRIPTION)}</description>
    <language>en</language>
    <atom:link href="${xml(origin)}/feed.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;

  return new Response(body, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
