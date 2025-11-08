"use client";

import { motion } from "framer-motion";

const cathlabs = [
  { name: "Cathlab-1", status: "🟢 aktif", suhu: "22.5°C", rh: "50%" },
  { name: "Cathlab-2", status: "🟡 standby", suhu: "23.0°C", rh: "49%" },
  { name: "Cathlab-3", status: "🔴 idle", suhu: "25.0°C", rh: "52%" },
];

export default function MonitorCathlab() {
  return (
    <div className="bg-black/40 border border-cyan-500/30 rounded-xl p-4 shadow-lg">
      <p className="text-sm text-cyan-300 mb-2">Monitoring Cathlab</p>
      <div className="grid md:grid-cols-3 gap-4">
        {cathlabs.map((c, i) => (
          <motion.div
            key={i}
            whileHover={{ scale: 1.03 }}
            className="p-3 rounded-lg border border-cyan-500/20 bg-black/30 text-cyan-200"
          >
            <p className="font-semibold text-cyan-300">{c.name}</p>
            <p className="text-sm">{c.status}</p>
            <p className="text-xs text-cyan-400/80">
              Suhu {c.suhu} | Kelembapan {c.rh}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
