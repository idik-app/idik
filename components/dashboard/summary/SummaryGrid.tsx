"use client";

import SummaryCard from "./SummaryCard";

export default function SummaryGrid() {
  const data = [
    { label: "Pasien", value: 42 },
    { label: "Dokter", value: 7 },
    { label: "Prosedur", value: 58 },
    { label: "Alkes Reuse", value: 16 },
    { label: "Urgent", value: 4 },
    { label: "Alarm Aktif", value: 1 },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {data.map((item) => (
        <SummaryCard key={item.label} label={item.label} value={item.value} />
      ))}
    </div>
  );
}
