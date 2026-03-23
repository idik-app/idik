"use client";
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { tindakanRepository } from "../../../data/tindakanRepository";

const TindakanStatsCardComponent = ({
  title,
  metricKey,
}: {
  title: string;
  metricKey: "today" | "week" | "month" | "total";
}) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    tindakanRepository.getSummary().then((summary) => {
      setCount(summary[metricKey]);
    });
  }, [metricKey]);

  return (
    <motion.div
      className="rounded-2xl border border-cyan-800/40 bg-gradient-to-br from-gray-900 via-gray-950 to-cyan-950 p-4 shadow-md shadow-cyan-900/10"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="text-xs text-cyan-400/70 mb-1 font-medium uppercase tracking-wide">
        {title}
      </div>
      <div className="text-3xl font-semibold text-cyan-300 drop-shadow">
        {count.toLocaleString("id-ID")}
      </div>
    </motion.div>
  );
};

export default TindakanStatsCardComponent;
