export default function Home() {
  return (
    <main className="min-h-screen bg-[#0e0e0e] text-[#e8e4dc] flex items-center justify-center">
      <div className="text-center flex flex-col gap-4">
        <h1 className="text-6xl" style={{fontFamily: 'var(--font-serif)'}}>
          listening <em className="text-[#c8d47a]">notes</em>
        </h1>
        <p style={{fontFamily: 'var(--font-mono)'}} className="text-xs text-[#555] tracking-widest uppercase">
          a music listening journal
        </p>
        <p style={{fontFamily: 'var(--font-mono)'}} className="text-xs text-[#3a3a3a] tracking-widest uppercase mt-8">
          coming soon — listeningnotes.blog
        </p>
      </div>
    </main>
  );
}