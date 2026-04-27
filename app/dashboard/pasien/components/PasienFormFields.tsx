"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Calendar } from "lucide-react";
import { hitungUsia } from "../utils/formatUsia";
import { formatTanggalLahirFromDb } from "../data/pasienSchema";
import { cn } from "@/lib/utils";

function tanggalLahirIsoToTampilanId(iso: string): string {
  const n = formatTanggalLahirFromDb(String(iso ?? "").trim());
  if (!/^\d{4}-\d{2}-\d{2}$/.test(n)) return "";
  const [y, m, d] = n.split("-");
  return `${d}-${m}-${y}`;
}

const fieldBase =
  "rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30";

const fieldDefault = "bg-gray-900/60 border border-cyan-800";
const fieldFrost =
  "border border-blue-200/80 bg-white/90 text-slate-800 shadow-sm dark:border-blue-500/30 dark:bg-slate-900/60 dark:text-white dark:placeholder:text-white/90";

interface Props {
  form: any;
  handleChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => void;
  /** Glass / Jarvis light modal (contoh: REGISTER ICCU) */
  variant?: "default" | "frost";
}

export default function PasienFormFields({
  form,
  handleChange,
  variant = "default",
}: Props) {
  const f = variant === "frost" ? fieldFrost : fieldDefault;
  const dateInputRef = useRef<HTMLInputElement>(null);
  const [lahirText, setLahirText] = useState(() =>
    tanggalLahirIsoToTampilanId(form.tanggalLahir),
  );
  const [lahirFokus, setLahirFokus] = useState(false);

  const setTanggalLahirIso = useCallback(
    (value: string) => {
      handleChange({
        target: { name: "tanggalLahir", value },
      } as React.ChangeEvent<HTMLInputElement>);
    },
    [handleChange],
  );

  const onTanggalLahirNativeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleChange(e);
      setLahirText(tanggalLahirIsoToTampilanId(e.target.value));
    },
    [handleChange],
  );

  useEffect(() => {
    if (!lahirFokus) {
      setLahirText(tanggalLahirIsoToTampilanId(form.tanggalLahir));
    }
  }, [form.tanggalLahir, lahirFokus]);

  const commitLahirDariTeks = useCallback(() => {
    const t = lahirText.trim();
    if (!t) {
      if (form.tanggalLahir) {
        setTanggalLahirIso("");
      }
      return;
    }
    const parsed = formatTanggalLahirFromDb(t);
    if (/^\d{4}-\d{2}-\d{2}$/.test(parsed)) {
      setTanggalLahirIso(parsed);
      setLahirText(tanggalLahirIsoToTampilanId(parsed));
    } else {
      setLahirText(tanggalLahirIsoToTampilanId(form.tanggalLahir));
    }
  }, [lahirText, form.tanggalLahir, setTanggalLahirIso]);

  const jenisKelaminTanggalRow = (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <select
        name="jenisKelamin"
        value={form.jenisKelamin}
        onChange={handleChange}
        className={cn(fieldBase, f)}
      >
        <option value="L">Laki-laki</option>
        <option value="P">Perempuan</option>
      </select>

      <div className="flex min-w-0 items-stretch gap-1.5">
          <input
            type="text"
            value={lahirText}
            onChange={(e) => setLahirText(e.target.value)}
            onFocus={() => setLahirFokus(true)}
            onBlur={() => {
              setLahirFokus(false);
              commitLahirDariTeks();
            }}
            onPaste={(e) => {
              e.preventDefault();
              const t = e.clipboardData.getData("text")?.trim() ?? "";
              const parsed = formatTanggalLahirFromDb(t);
              if (/^\d{4}-\d{2}-\d{2}$/.test(parsed)) {
                setLahirText(tanggalLahirIsoToTampilanId(parsed));
                setTanggalLahirIso(parsed);
              } else {
                setLahirText(t);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                (e.target as HTMLInputElement).blur();
              }
            }}
            placeholder="DD-MM-YYYY"
            autoComplete="bday"
            inputMode="text"
            className={cn("min-w-0 flex-1", fieldBase, f)}
          />
          <input
            ref={dateInputRef}
            type="date"
            name="tanggalLahir"
            value={/^\d{4}-\d{2}-\d{2}$/.test(
              formatTanggalLahirFromDb(form.tanggalLahir),
            )
              ? formatTanggalLahirFromDb(form.tanggalLahir)
              : ""}
            onChange={onTanggalLahirNativeChange}
            tabIndex={-1}
            className="sr-only"
            aria-hidden
            title="Pilih lewat kalender"
          />
          <button
            type="button"
            className={cn(
              "inline-flex shrink-0 items-center justify-center rounded-md border px-2.5",
              "focus:outline-none focus:ring-2 focus:ring-blue-500/30",
              variant === "frost"
                ? "border-blue-200/80 bg-white/90 text-slate-700 shadow-sm dark:border-blue-500/30 dark:bg-slate-900/60 dark:text-white"
                : "border-cyan-800 bg-gray-900/60 text-cyan-200",
            )}
            aria-label="Buka kalender pilih tanggal lahir"
            onClick={() => {
              const el = dateInputRef.current;
              if (el) {
                el.showPicker?.();
              }
            }}
          >
            <Calendar className="h-4 w-4 opacity-90" aria-hidden />
          </button>
      </div>

      <div className="flex flex-col justify-end">
        <span
          className={cn(
            "mb-1 text-xs",
            variant === "frost"
              ? "text-blue-600 dark:text-sky-300"
              : "text-cyan-600/90",
          )}
        >
          Umur
        </span>
        <input
          readOnly
          tabIndex={-1}
          value={
            form.tanggalLahir
              ? hitungUsia(form.tanggalLahir).teks
              : "—"
          }
          className={cn(
            "cursor-default rounded-md border px-3 py-2",
            variant === "frost"
              ? "border-blue-200/80 bg-sky-50/80 text-slate-800 dark:border-blue-500/30 dark:bg-slate-800/50 dark:text-white"
              : "border-cyan-800/60 bg-gray-950/80 text-cyan-200",
          )}
          aria-live="polite"
        />
      </div>
    </div>
  );

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input
          name="noRM"
          placeholder="No. RM"
          value={form.noRM}
          onChange={handleChange}
          required
          className={cn(fieldBase, f)}
        />
        <input
          name="nama"
          placeholder="Nama"
          value={form.nama}
          onChange={handleChange}
          required
          className={cn(fieldBase, f)}
        />
      </div>

      {jenisKelaminTanggalRow}

      <input
        name="alamat"
        placeholder="Alamat"
        value={form.alamat}
        onChange={handleChange}
        className={cn("w-full", fieldBase, f)}
      />

      <input
        name="noHP"
        placeholder="No. HP"
        value={form.noHP}
        onChange={handleChange}
        className={cn("w-full", fieldBase, f)}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <select
          name="jenisPembiayaan"
          value={form.jenisPembiayaan}
          onChange={handleChange}
          className={cn(fieldBase, f)}
        >
          <option value="Umum">Umum</option>
          <option value="BPJS">BPJS-PBI</option>
          <option value="NPBI">NPBI</option>
          <option value="Asuransi">Asuransi</option>
        </select>

        <select
          name="kelasPerawatan"
          value={form.kelasPerawatan}
          onChange={handleChange}
          className={cn(fieldBase, f)}
        >
          <option value="Kelas 1">1</option>
          <option value="Kelas 2">2</option>
          <option value="Kelas 3">3</option>
        </select>

        <input
          name="asuransi"
          placeholder="Asuransi (jika ada)"
          value={form.asuransi}
          onChange={handleChange}
          className={cn(fieldBase, f)}
        />
      </div>
    </>
  );
}
