import Link from 'next/link';

async function getEntries() {
  try {
    const res = await fetch('http://localhost:3000/api/entries', {
      cache: 'no-store'
    });
    const data = await res.json();
    return data.entries || [];
  } catch {
    return [];
  }
}

export default async function Home() {
  const entries = await getEntries();

  return (
    <main className="min-h-screen bg-[#0e0e0e] text-[#e8e4dc]">
      
      {/* Header */}
      <header className="border-b border-[#2a2a2a] px-8 py-6">
        <h1 className="text-3xl" style={{fontFamily: 'var(--font-serif)'}}>
          listening <em className="text-[#c8d47a]">notes</em>
        </h1>
        <p className="text-xs text-[#555] tracking-widest uppercase mt-1" style={{fontFamily: 'var(--font-mono)'}}>
          a music listening journal
        </p>
      </header>

      {/* Entries */}
      <div className="max-w-2xl mx-auto px-8 py-16">
        {entries.length === 0 ? (
          <p className="text-[#555] font-mono text-sm">no entries yet.</p>
        ) : (
          <div className="flex flex-col gap-16">
            {entries.map((entry) => (
              <article key={entry.id} className="border border-[#2a2a2a] rounded-lg overflow-hidden">
                
                {/* Album art */}
                {entry.album_art && (
                  <img 
                    src={entry.album_art} 
                    alt={entry.album}
                    className="w-full object-cover aspect-square"
                  />
                )}

                {/* Post header */}
                <div className="p-6 border-b border-[#2a2a2a]">
                  <h2 className="text-2xl mb-1" style={{fontFamily: 'var(--font-serif)'}}>
                    {entry.album}
                  </h2>
                  <div className="flex gap-3 items-center flex-wrap mt-2">
                    <span className="text-[#c8d47a] text-sm" style={{fontFamily: 'var(--font-mono)'}}>
                      {entry.artist}
                    </span>
                    <span className="text-[#555] text-xs" style={{fontFamily: 'var(--font-mono)'}}>
                      {entry.year}
                    </span>
                    {entry.rating && (
                      <span className="text-[#555] text-xs border border-[#2a2a2a] px-2 py-0.5 rounded" style={{fontFamily: 'var(--font-mono)'}}>
                        {entry.rating}
                      </span>
                    )}
                    {entry.relationship && (
                      <span className="text-[#555] text-xs border border-[#2a2a2a] px-2 py-0.5 rounded" style={{fontFamily: 'var(--font-mono)'}}>
                        {entry.relationship}
                      </span>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 flex flex-col gap-6">
                  {entry.background && (
                    <p className="text-sm leading-relaxed text-[#9a9590]" style={{fontFamily: 'var(--font-sans)'}}>
                      {entry.background}
                    </p>
                  )}

                  {entry.horizon && (
                    <p className="text-center text-[#3a3a3a] tracking-widest" style={{fontFamily: 'var(--font-mono)'}}>
                      {entry.horizon}
                    </p>
                  )}

                  {entry.notes && (
                    <p className="text-sm leading-relaxed" style={{fontFamily: 'var(--font-sans)'}}>
                      {entry.notes}
                    </p>
                  )}

                  {/* Tags */}
                  {entry.tags && entry.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-[#2a2a2a]">
                      {entry.tags.map((tag, i) => (
                        <span key={i} className="text-xs text-[#555]" style={{fontFamily: 'var(--font-mono)'}}>
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

              </article>
            ))}
          </div>
        )}
      </div>

    </main>
  );
}