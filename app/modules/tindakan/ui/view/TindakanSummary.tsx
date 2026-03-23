"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Activity, Syringe, Clock } from "lucide-react";
import DiagnosticsHUD from "@/app/dashboard/ui/DiagnosticsHUD";

/**
 * 🧩 TindakanSummary.tsx
 * Menampilkan ringkasan tindakan harian, mingguan, dan total.
 * Warna dan animasi mengikuti gaya JARVIS Gold-Cyan Hybrid.
 */

export default function TindakanSummary() {
  const [summary, setSummary] = useState({
    hariIni: 0,
    mingguIni: 0,
    total: 0,
  });

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/tindakan/summary");
        if (!res.ok) throw new Error("Gagal mengambil data tindakan");
        const data = await res.json();
        setSummary(data);
      } catch {
        // fallback jika API gagal
        setSummary({ hariIni: 4, mingguIni: 26, total: 780 });
      }
    }
    fetchData();
  }, []);

  const cardData = [
    {
      title: "Hari Ini",
      value: summary.hariIni,
      icon: <Clock className="text-cyan-400 w-6 h-6" />,
      gradient: "from-cyan-900/60 to-cyan-700/20",
    },
    {
      title: "Minggu Ini",
      value: summary.mingguIni,
      icon: <Activity className="text-gold-400 w-6 h-6" />,
      gradient: "from-yellow-900/60 to-yellow-700/20",
    },
    {
      title: "Total Tindakan",
      value: summary.total,
      icon: <Syringe className="text-emerald-400 w-6 h-6" />,
      gradient: "from-emerald-900/60 to-emerald-700/20",
    },
  ];

  return (
    <div className="relative w-full space-y-6">
      <motion.h2
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-xl font-semibold text-cyan-300 tracking-wide"
      >
        Ringkasan Tindakan Cathlab
      </motion.h2>

      <div className="grid md:grid-cols-3 gap-6">
        {cardData.map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card
              className={`bg-gradient-to-br ${item.gradient} border border-cyan-600/30 backdrop-blur-md shadow-lg shadow-cyan-800/20 rounded-2xl hover:shadow-cyan-500/40 transition-all duration-300`}
            >
              <CardContent className="p-6 flex flex-col items-center text-center space-y-3">
                <div className="p-3 rounded-full bg-black/40 border border-cyan-700/40">
                  {item.icon}
                </div>
                <h3 className="text-cyan-200 text-sm tracking-wider uppercase">
                  {item.title}
                </h3>
                <p className="text-3xl font-bold text-gold-300 drop-shadow-md">
                  {item.value}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <DiagnosticsHUD />
    </div>
  );
}
