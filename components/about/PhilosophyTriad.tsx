export default function PhilosophyTriad() {
  const items = [
    {
      icon: "🧠",
      title: "Belajar dari Data",
      text: "Menganalisis pola performa tindakan.",
    },
    {
      icon: "⚠️",
      title: "Mencegah Kesalahan",
      text: "Deteksi dini potensi anomali.",
    },
    {
      icon: "⚙️",
      title: "Efisiensi Maksimal",
      text: "Optimasi waktu dan sumber daya.",
    },
  ];
  return (
    <section className="py-20 grid md:grid-cols-3 gap-8 px-10 text-center">
      {items.map((i) => (
        <div
          key={i.title}
          className="bg-black/40 border border-cyan-500/20 rounded-2xl p-6"
        >
          <div className="text-3xl">{i.icon}</div>
          <h3 className="text-cyan-400 font-semibold mt-3">{i.title}</h3>
          <p className="text-sm text-cyan-300/70 mt-2">{i.text}</p>
        </div>
      ))}
    </section>
  );
}
