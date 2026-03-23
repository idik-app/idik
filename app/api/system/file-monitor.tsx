"use client";
import { useEffect, useState } from "react";

type FileLogRow = {
  id: string;
  path: string;
  event: string;
  size: number;
  created_at: string;
};

export default function FileMonitorPage() {
  const [files, setFiles] = useState<FileLogRow[]>([]);

  useEffect(() => {
    fetch("/api/system/files")
      .then((r) => r.json())
      .then((res) => setFiles((res?.data as FileLogRow[]) || []));
  }, []);

  return (
    <div className="p-6 bg-black/70 text-cyan-200 rounded-2xl border border-cyan-700/40">
      <h1 className="text-lg font-bold text-gold mb-4">📁 File Monitor</h1>
      <table className="w-full text-sm">
        <thead className="text-cyan-400 border-b border-cyan-700/50">
          <tr>
            <th>File</th>
            <th>Event</th>
            <th>Size</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody>
          {files.map((f) => (
            <tr key={f.id} className="border-b border-cyan-900/30">
              <td>{f.path}</td>
              <td>{f.event}</td>
              <td>{f.size} B</td>
              <td>{new Date(f.created_at).toLocaleTimeString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
