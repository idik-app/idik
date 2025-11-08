export default function Header() {
  return (
    <header className="fixed top-0 w-full flex justify-between items-center px-8 py-3 bg-black/30 backdrop-blur-md border-b border-cyan-500/20 z-50">
      <h1 className="text-lg font-semibold text-cyan-400">IDIK-APP</h1>
      <p className="text-xs text-cyan-300/70">
        Autonomous Cathlab Intelligence
      </p>
      <button className="text-xs border border-cyan-500/40 px-3 py-1 rounded-lg hover:bg-cyan-500/10">
        Back to Dashboard
      </button>
    </header>
  );
}
