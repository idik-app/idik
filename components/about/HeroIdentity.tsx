import { motion } from "framer-motion";

export default function HeroIdentity() {
  return (
    <section className="min-h-screen flex flex-col justify-center items-center text-center">
      <motion.div
        className="w-64 h-64 rounded-full border-2 border-cyan-500/50 shadow-[0_0_40px_cyan]"
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
      />
      <h2 className="text-3xl md:text-4xl mt-8 text-cyan-300 font-bold">
        Instalasi Diagnostik Intervensi Kardiovaskular
      </h2>
      <p className="text-cyan-400 mt-2">Sistem Otonom yang Belajar dari Data</p>
      <motion.p
        className="mt-4 text-sm text-cyan-200/80"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ repeat: Infinity, duration: 3 }}
      >
        Empowering Humans with Predictive Precision.
      </motion.p>
    </section>
  );
}
