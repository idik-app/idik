export default function ArchitectureMap() {
  const modules = [
    "Patients",
    "Inventory",
    "Monitoring",
    "AI Engine",
    "Reports",
  ];
  return (
    <section className="py-16 text-center">
      <h3 className="text-cyan-400 font-semibold mb-8">
        System Architecture Overview
      </h3>
      <div className="flex flex-wrap justify-center gap-6">
        {modules.map((m) => (
          <div
            key={m}
            className="border border-cyan-500/30 rounded-xl px-5 py-3 hover:bg-cyan-500/10 transition"
          >
            {m}
          </div>
        ))}
      </div>
    </section>
  );
}
