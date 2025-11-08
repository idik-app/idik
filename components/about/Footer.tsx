export default function Footer() {
  return (
    <footer className="py-6 text-center text-xs text-cyan-400/70 border-t border-cyan-500/20">
      v5.6.5 • Gold-Cyan Hybrid • © 2025 IDIK-APP
      <div className="mt-2 flex justify-center gap-4">
        <button className="underline hover:text-cyan-300">
          Return to Dashboard
        </button>
        <button className="underline hover:text-cyan-300">Version Log</button>
      </div>
    </footer>
  );
}
