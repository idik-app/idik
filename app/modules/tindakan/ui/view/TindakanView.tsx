"use client";
import { useTindakanCrud } from "../../hooks/useTindakanCrud";

export default function TindakanView() {
  const { items, load } = useTindakanCrud();
  return (
    <div className="p-6 text-cyan-200">
      <h1 className="text-2xl font-bold mb-4">Tindakan Medis</h1>
      <button onClick={load} className="px-3 py-1 bg-cyan-600 rounded">
        Reload
      </button>
      <pre className="mt-4 text-xs">{JSON.stringify(items, null, 2)}</pre>
    </div>
  );
}
