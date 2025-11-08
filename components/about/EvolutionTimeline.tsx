export default function EvolutionTimeline() {
  const milestones = [
    { ver: "v3.1", name: "Shimmer Integration" },
    { ver: "v4.0", name: "Realtime Sync Supabase" },
    { ver: "v5.6.5", name: "Autonomous Audit Engine" },
  ];
  return (
    <section className="py-20 text-center">
      <h3 className="text-cyan-400 font-semibold mb-6">Evolution Timeline</h3>
      <div className="flex justify-center gap-10">
        {milestones.map((m) => (
          <div key={m.ver}>
            <div className="text-cyan-300 font-bold">{m.ver}</div>
            <div className="text-xs text-cyan-400/70">{m.name}</div>
          </div>
        ))}
      </div>
      <div className="mt-4 h-1 w-2/3 bg-gradient-to-r from-cyan-500 to-yellow-400 mx-auto rounded-full"></div>
    </section>
  );
}
