"use client";

import { useEffect, useRef, useState } from "react";
import type { Pasien } from "@/app/dashboard/pasien/types/pasien";
import { formatKelasPerawatanDisplay } from "@/app/dashboard/pasien/utils/formatKelasPerawatan";
import { cn } from "@/lib/utils";

const DEBOUNCE_MS = 550;

type Jenis = Pasien["jenisPembiayaan"];
type Kelas = Pasien["kelasPerawatan"];

function normalizeJenis(raw: string): Jenis | null {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  const upper = s.toUpperCase().replace(/\s+/g, " ");
  if (upper === "BPJS" || upper === "BPJS-PBI" || upper === "BPJS PBI") return "BPJS";
  if (upper === "PBI") return "BPJS";
  if (upper === "NPBI" || upper === "NON PBI" || upper === "NON-PBI") return "NPBI";
  if (upper === "UMUM") return "Umum";
  if (upper === "ASURANSI") return "Asuransi";
  if (s === "Umum" || s === "Asuransi" || s === "BPJS" || s === "NPBI") return s;
  return null;
}

function parseCombo(raw: string): { jenis: Jenis; kelasDigit: 1 | 2 | 3 } | null {
  const m = raw.trim().match(/^(.+?)\s*-\s*([123])\s*$/);
  if (!m) return null;
  const jenis = normalizeJenis(m[1]!.trim());
  if (!jenis) return null;
  const d = Number(m[2]) as 1 | 2 | 3;
  return { jenis, kelasDigit: d };
}

function coerceJenis(s: string): Jenis {
  return normalizeJenis(s) ?? "Umum";
}

function coerceKelas(k: string): Kelas {
  const t = String(k ?? "").trim();
  if (t === "Kelas 1" || t === "Kelas 2" || t === "Kelas 3") return t;
  if (/^[123]$/.test(t)) return `Kelas ${t}` as Kelas;
  return "Kelas 2";
}

function buildKelasPembiayaanString(jenis: Jenis, kelas: Kelas): string {
  const digit = formatKelasPerawatanDisplay(kelas);
  if (!digit || digit === "—") return jenis;
  return `${jenis} - ${digit}`;
}

function serverNorm(v: unknown): string | null {
  const t = String(v ?? "").trim();
  return t === "" ? null : t;
}

function deriveState(
  kelasPembiayaan: unknown,
  pasien: Pasien | null,
): { jenis: Jenis; kelas: Kelas } {
  const raw = String(kelasPembiayaan ?? "").trim();
  if (raw) {
    const combo = parseCombo(raw);
    if (combo) {
      return {
        jenis: combo.jenis,
        kelas: `Kelas ${combo.kelasDigit}` as Kelas,
      };
    }
    const jOnly = normalizeJenis(raw);
    if (jOnly) {
      return {
        jenis: jOnly,
        kelas: jOnly === "BPJS" ? "Kelas 3" : coerceKelas("2"),
      };
    }
  }
  if (pasien) {
    return {
      jenis: coerceJenis(String(pasien.jenisPembiayaan ?? "Umum")),
      kelas: coerceKelas(String(pasien.kelasPerawatan ?? "Kelas 2")),
    };
  }
  return { jenis: "Umum", kelas: "Kelas 2" };
}

type Props = {
  tindakanId: string;
  value: unknown;
  pasien: Pasien | null;
  onSaved?: () => void;
};

export default function KelasPembiayaanBiayaField({
  tindakanId,
  value,
  pasien,
  onSaved,
}: Props) {
  const initial = deriveState(value, pasien);
  const [jenis, setJenis] = useState<Jenis>(initial.jenis);
  const [kelas, setKelas] = useState<Kelas>(initial.kelas);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncKeyRef = useRef("");

  const pasienSig = pasien
    ? `${pasien.jenisPembiayaan}:${pasien.kelasPerawatan}`
    : "";
  const syncKey = `${tindakanId}|${String(value ?? "")}|${pasienSig}`;

  useEffect(() => {
    if (syncKeyRef.current === syncKey) return;
    syncKeyRef.current = syncKey;
    const next = deriveState(value, pasien);
    setJenis(next.jenis);
    setKelas(next.jenis === "BPJS" ? "Kelas 3" : next.kelas);
  }, [syncKey, tindakanId, value, pasien]);

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    [],
  );

  const persist = async (nextJenis: Jenis, nextKelas: Kelas) => {
    const kFin = nextJenis === "BPJS" ? ("Kelas 3" as Kelas) : nextKelas;
    const payload = buildKelasPembiayaanString(nextJenis, kFin);
    if (serverNorm(payload) === serverNorm(value)) return;

    try {
      const res = await fetch(`/api/tindakan/${encodeURIComponent(tindakanId)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kelas_pembiayaan: payload }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
      };
      if (!res.ok || !json.ok) {
        throw new Error(json.message || res.statusText);
      }
      onSaved?.();
    } catch (e) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[KelasPembiayaanBiayaField]", e);
      }
    }
  };

  const schedulePersist = (j: Jenis, k: Kelas) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      void persist(j, k);
    }, DEBOUNCE_MS);
  };

  const selectClass = cn(
    "w-full rounded-md border px-2 py-1.5 text-sm font-semibold focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30",
    "border-cyan-400/55 bg-black/40 text-white",
  );

  return (
    <div className="mt-0.5 flex flex-col gap-2.5">
      <div>
        <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-white/80">
          Jenis pembiayaan
        </span>
        <select
          aria-label="Jenis pembiayaan"
          className={selectClass}
          value={jenis}
          onChange={(e) => {
            const next = coerceJenis(e.target.value);
            setJenis(next);
            const kNext = next === "BPJS" ? ("Kelas 3" as Kelas) : kelas;
            if (next === "BPJS") setKelas("Kelas 3");
            schedulePersist(next, kNext);
          }}
        >
          <option value="Umum">Umum</option>
          <option value="BPJS">BPJS-PBI</option>
          <option value="NPBI">NPBI</option>
          <option value="Asuransi">Asuransi</option>
        </select>
      </div>
      <div>
        <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-white/80">
          Kelas perawatan
        </span>
        <select
          aria-label="Kelas perawatan"
          className={cn(selectClass, jenis === "BPJS" && "opacity-90")}
          value={jenis === "BPJS" ? "Kelas 3" : kelas}
          disabled={jenis === "BPJS"}
          onChange={(e) => {
            if (jenis === "BPJS") return;
            const nextK = coerceKelas(e.target.value);
            setKelas(nextK);
            schedulePersist(jenis, nextK);
          }}
        >
          <option value="Kelas 1">1</option>
          <option value="Kelas 2">2</option>
          <option value="Kelas 3">3</option>
        </select>
      </div>
    </div>
  );
}
