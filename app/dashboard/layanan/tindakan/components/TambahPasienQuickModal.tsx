"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import type { Pasien } from "@/app/dashboard/pasien/types/pasien";
import { pasienSchema } from "@/app/dashboard/pasien/data/pasienValidation";
import { formatTanggalLahirFromDb } from "@/app/dashboard/pasien/data/pasienSchema";
import { hitungUsia } from "@/app/dashboard/pasien/utils/formatUsia";
import {
  normalizeNamaPasien,
  normalizeNamaPasienInput,
} from "@/app/dashboard/pasien/utils/normalizeNamaPasien";
import { formatPasienApiValidationError } from "@/app/dashboard/pasien/utils/pasienValidationMessages";
import { useTheme } from "@/contexts/ThemeContext";
import { useAppDialog } from "@/app/contexts/AppDialogContext";
import { cn } from "@/lib/utils";
import { UI_LAYERS } from "@/lib/ui/layers";

const RM_LOOKUP_DEBOUNCE_MS = 420;
const RM_LOOKUP_MIN_LEN = 2;

const initialForm = (): Omit<Pasien, "id"> => ({
  noRM: "",
  nama: "",
  jenisKelamin: "L",
  tanggalLahir: "",
  alamat: "",
  noHP: "",
  // DB: jenis_pembiayaan "BPJS" = BPJS-PBI / PBI Kelas 3; laporan: baris PBI.
  // "NPBI" + kelas → tab Biaya "Kelas pembiayaan" NPBI - 1|2|3; laporan: BPJS NON PBI KLS *.
  jenisPembiayaan: "BPJS",
  kelasPerawatan: "Kelas 3",
  asuransi: "",
});

function normalizeRmDigits(v: string) {
  return String(v ?? "").replace(/\D/g, "");
}

/** Cocokkan RM meski format beda (mis. spasi vs hanya angka). */
function rmEquivalent(dbNoRm: string, typedRm: string): boolean {
  const a = String(dbNoRm ?? "").trim();
  const b = String(typedRm ?? "").trim();
  if (a === b) return true;
  const da = normalizeRmDigits(a);
  const db = normalizeRmDigits(b);
  if (da.length >= RM_LOOKUP_MIN_LEN && da === db) return true;
  return false;
}

function coerceKelasPerawatan(
  raw: string | undefined,
): Pasien["kelasPerawatan"] {
  const k = String(raw ?? "").trim();
  if (k === "Kelas 1" || k === "1") return "Kelas 1";
  if (k === "Kelas 3" || k === "3") return "Kelas 3";
  return "Kelas 2";
}

function coerceJenisPembiayaan(
  raw: string | undefined,
): Pasien["jenisPembiayaan"] {
  const v = String(raw ?? "").trim();
  if (v === "BPJS-PBI") return "BPJS";
  if (v === "BPJS" || v === "NPBI" || v === "Umum" || v === "Asuransi")
    return v;
  return "Umum";
}

function patientToFormFields(p: Pasien): Omit<Pasien, "id"> {
  const jenisPembiayaan = coerceJenisPembiayaan(p.jenisPembiayaan);
  const kelasPerawatan = coerceKelasPerawatan(p.kelasPerawatan);
  return {
    noRM: String(p.noRM ?? "").trim(),
    nama: normalizeNamaPasienInput(p.nama ?? ""),
    jenisKelamin: p.jenisKelamin === "P" ? "P" : "L",
    tanggalLahir: formatTanggalLahirFromDb(p.tanggalLahir),
    alamat: p.alamat ?? "",
    noHP: String(p.noHP ?? "").trim(),
    jenisPembiayaan,
    kelasPerawatan: jenisPembiayaan === "BPJS" ? "Kelas 3" : kelasPerawatan,
    asuransi: p.asuransi ?? "",
  };
}

function formatTanggalIndo(dateStr: string) {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
  }
  return dateStr;
}

function formatDokter(dokter?: string) {
  if (!dokter) return "";
  const clean = dokter.trim();
  if (/^dr\b/i.test(clean)) return clean;
  return `dr. ${clean}`;
}

async function fetchPasienByNoRm(rm: string): Promise<Pasien | null> {
  const res = await fetch(`/api/pasien?noRm=${encodeURIComponent(rm)}`, {
    credentials: "include",
  });
  const json = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    data?: Pasien | null;
  };
  if (!json?.ok || !json.data?.id) return null;
  return json.data;
}

/** Fetch dari API SIMRS eksternal (via server proxy dengan fallback ke fetch langsung jika di Vercel/cloud) */
async function fetchPasienSimrs(rm: string): Promise<any | null> {
  let proxyErrorMsg = "";
  try {
    const res = await fetch(
      `/api/pasien/simrs?noRm=${encodeURIComponent(rm)}`,
    );
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      proxyErrorMsg = errJson.error || `HTTP ${res.status}`;
      throw new Error(proxyErrorMsg);
    }
    const json = (await res.json()) as {
      ok?: boolean;
      status?: string;
      data?: any;
    };
    if (json?.ok && json?.status === "Ok" && json.data) return json.data;
  } catch (e: any) {
    console.warn("Proxy SIMRS Fetch failed or timed out, trying direct browser fetch fallback:", e);
    
    // Tangkap pesan error dari proxy
    proxyErrorMsg = e.message || String(e);

    // Fallback: Ambil langsung dari browser (Client-side Fetch)
    // Ini sangat berguna jika aplikasi di-deploy di cloud/Vercel (tidak punya akses ke IP lokal RS),
    // tetapi komputer/browser pengguna berada di dalam Jaringan RS (Intranet) dan dapat mengakses IP tersebut.
    const baseUrl = process.env.NEXT_PUBLIC_SIMRS_API_URL || "http://10.250.10.107/apibdrs/apibdrs/getPasien";
    const cleanBaseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
    try {
      const directUrl = `${cleanBaseUrl}/${encodeURIComponent(rm)}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // timeout 3 detik untuk respon langsung
      
      const directRes = await fetch(directUrl, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      
      if (directRes.ok) {
        const json = await directRes.json();
        if (json && json.status === "Ok" && json.data) {
          console.log("%c✅ Direct Browser SIMRS Fetch Success!", "color: lime; font-weight: bold", json.data.nama);
          return json.data;
        }
      }
    } catch (directErr: any) {
      console.error("Direct browser fetch fallback also failed:", directErr);
      
      // Jika proxy timeout dan direct fetch juga gagal, berikan penjelasan komprehensif ke pengguna
      if (proxyErrorMsg.includes("timeout") || proxyErrorMsg.includes("504") || proxyErrorMsg.includes("Gateway Timeout")) {
        throw new Error(
          "Koneksi ke SIMRS timeout (5 detik).\n\n" +
          "💡 Penyebab:\n" +
          `Server cloud Vercel tidak dapat mengakses alamat/IP lokal RS (${cleanBaseUrl}).\n\n` +
          "🔧 Solusi:\n" +
          "1. Gunakan aplikasi versi lokal (localhost:3000) yang terhubung ke Jaringan RS.\n" +
          "2. Jika tetap memakai Vercel, izinkan 'Insecure Content' (Mixed Content) pada browser Anda (klik ikon setelan/gembok di kiri URL -> Site Settings -> Insecure Content -> ubah ke Allow) agar browser bisa memanggil IP lokal RS secara langsung."
        );
      }
      
      throw new Error(proxyErrorMsg);
    }
  }
  return null;
}

export default function TambahPasienQuickModal({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (patient: Pasien) => Promise<void> | void;
}) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { confirm } = useAppDialog();

  const [formData, setFormData] = useState<Omit<Pasien, "id">>(initialForm);
  const [matchedPatient, setMatchedPatient] = useState<Pasien | null>(null);
  const [simrsMatched, setSimrsMatched] = useState(false);
  const [rmChecking, setRmChecking] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [riwayatTindakan, setRiwayatTindakan] = useState<any[]>([]);

  const noRmInputRef = useRef<HTMLInputElement>(null);
  const rmInputRef = useRef("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastOpenRef = useRef(false);

  // Reset form HANYA saat modal baru dibuka (transisi false -> true)
  useEffect(() => {
    if (open && !lastOpenRef.current) {
      setFormData(initialForm());
      setMatchedPatient(null);
      setSimrsMatched(false);
      setError("");
      setRmChecking(false);
      setLoading(false);
      setRiwayatTindakan([]);
      rmInputRef.current = "";
      // Autofokus kursor ke input No. RM
      setTimeout(() => {
        noRmInputRef.current?.focus();
      }, 100);
    }
    lastOpenRef.current = open;
  }, [open]);

  const umurTeks = useMemo(() => {
    const t = formatTanggalLahirFromDb(formData.tanggalLahir?.trim() ?? "");
    if (!t || !/^\d{4}-\d{2}-\d{2}$/.test(t)) return "—";
    return hitungUsia(t).teks;
  }, [formData.tanggalLahir]);

  useEffect(() => {
    if (!open) {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      return;
    }

    const rmTyped = formData.noRM.trim();
    
    // Log untuk debug di console browser (F12)
    console.log("RM Typed:", rmTyped, "Length:", rmTyped.length);

    if (rmTyped.length < 1) { // Turunkan ke 1 agar lebih responsif
      setMatchedPatient(null);
      setSimrsMatched(false);
      setRmChecking(false);
      setRiwayatTindakan([]);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    setRmChecking(true);
    setRiwayatTindakan([]);
    debounceRef.current = setTimeout(() => {
      const lookupRm = formData.noRM.trim();
      if (!lookupRm) {
        setRmChecking(false);
        return;
      }

      console.log("%c🔍 SIMRS/Lokal Lookup Start:", "color: cyan; font-weight: bold", lookupRm);

      void (async () => {
        try {
          // 1. Cek Lokal
          const found = await fetchPasienByNoRm(lookupRm);
          
          // Pastikan modal masih terbuka dan RM masih sama
          if (!open) return;

          if (found && rmEquivalent(found.noRM, lookupRm)) {
            console.log("%c✅ Found Local:", "color: green", found.nama);
            setMatchedPatient(found);
            setSimrsMatched(false);
            const fields = patientToFormFields(found);
            setFormData((prev) => {
              // Hanya update jika RM masih sama untuk menghindari race condition
              if (prev.noRM.trim() === lookupRm) {
                return { ...fields, noRM: prev.noRM };
              }
              return prev;
            });

            // Ambil riwayat tindakan dari lokal
            try {
              const resHistory = await fetch(`/api/tindakan?search=${encodeURIComponent(lookupRm)}`);
              if (resHistory.ok) {
                const jsonHistory = await resHistory.json();
                if (jsonHistory && jsonHistory.ok && Array.isArray(jsonHistory.data)) {
                  const filtered = jsonHistory.data.filter((t: any) => rmEquivalent(t.no_rm || t.noRM || "", lookupRm));
                  setRiwayatTindakan(filtered);
                }
              }
            } catch (historyErr) {
              console.error("Gagal mengambil riwayat tindakan:", historyErr);
            }
          } else {
            // 2. Cek SIMRS
            console.log("%c📡 Checking SIMRS...", "color: orange");
            try {
              const simrs = await fetchPasienSimrs(lookupRm);
              if (!open) return;

              if (simrs && (rmEquivalent(simrs.norm, lookupRm) || rmEquivalent(simrs.norm_asli, lookupRm))) {
                console.log("%c✅ Found SIMRS:", "color: lime", simrs.nama);
                setMatchedPatient(null);
                setSimrsMatched(true);
                const alamatFull = [simrs.alamat, simrs.kota].filter(Boolean).join(", ");

                setFormData((prev) => {
                  if (prev.noRM.trim() === lookupRm) {
                    return {
                      ...prev,
                      nama: normalizeNamaPasienInput(simrs.nama || ""),
                      jenisKelamin: String(simrs.jenkel).toUpperCase().startsWith("P") ? "P" : "L",
                      tanggalLahir: formatTanggalLahirFromDb(simrs.tgl_lhr || ""),
                      alamat: alamatFull || prev.alamat,
                    };
                  }
                  return prev;
                });
              } else {
                console.log("%c❌ Not found in SIMRS", "color: red");
                setMatchedPatient(null);
                setSimrsMatched(false);
              }
            } catch (simrsErr: any) {
              console.error("SIMRS Lookup Error:", simrsErr);
              if (formData.noRM.trim() === lookupRm) {
                setError(`SIMRS: ${simrsErr.message}`);
              }
            }
          }
        } catch (err: any) {
          console.error("Lookup Error:", err);
        } finally {
          setRmChecking(false);
        }
      })();
    }, 450);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [open, formData.noRM]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setError("");
      const { name, value } = e.target;

      if (name === "noRM") {
        rmInputRef.current = value;
      }

      setFormData((p) => {
        const nextVal =
          name === "jenisKelamin"
            ? (value as "L" | "P")
            : name === "tanggalLahir"
              ? value
              : name === "nama"
                ? normalizeNamaPasienInput(value)
                : value;

        if (name === "jenisPembiayaan" && nextVal === "BPJS") {
          return {
            ...p,
            jenisPembiayaan: nextVal,
            kelasPerawatan: "Kelas 3",
          } as Omit<Pasien, "id">;
        }

        return { ...p, [name]: nextVal } as Omit<Pasien, "id">;
      });
    },
    [],
  );

  const handleTanggalLahirBlur = useCallback(() => {
    setFormData((p) => ({
      ...p,
      tanggalLahir: formatTanggalLahirFromDb(p.tanggalLahir.trim()),
    }));
  }, []);

  const handleSubmit = async () => {
    const namaFinal = normalizeNamaPasien(formData.nama);
    if (!formData.noRM.trim() || !namaFinal) {
      setError("No. RM dan Nama wajib diisi");
      return;
    }

    setLoading(true);
    setError("");
    try {
      let existing = matchedPatient;
      const rmNow = formData.noRM.trim();
      if (!existing || !rmEquivalent(existing.noRM, rmNow)) {
        const hit = await fetchPasienByNoRm(rmNow);
        if (hit && rmEquivalent(hit.noRM, rmNow)) existing = hit;
        else existing = null;
      }

      if (existing) {
        const tanggalLahirIso = formatTanggalLahirFromDb(
          formData.tanggalLahir.trim(),
        );
        const updatePayload = {
          ...formData,
          nama: namaFinal,
          tanggalLahir: tanggalLahirIso,
          noHP: (formData.noHP ?? "").trim(),
          noRM: rmNow,
        };

        const parsedUpdate = pasienSchema.safeParse(updatePayload);
        if (!parsedUpdate.success) {
          setError(
            formatPasienApiValidationError({
              error: parsedUpdate.error.flatten(),
            }),
          );
          return;
        }

        const putRes = await fetch(
          `/api/pasien/${encodeURIComponent(existing.id)}/edit`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(parsedUpdate.data),
          },
        );
        const putJson = (await putRes.json().catch(() => ({}))) as {
          ok?: boolean;
          data?: Pasien;
          error?: unknown;
          message?: string;
        };
        if (!putRes.ok || !putJson?.ok || !putJson.data) {
          throw new Error(formatPasienApiValidationError(putJson));
        }

        onClose(); // Berhasil simpan, langsung tutup tanpa konfirmasi
        await onSaved(putJson.data);
        return;
      }

      const tanggalLahirIso = formatTanggalLahirFromDb(
        formData.tanggalLahir.trim(),
      );
      const payload = {
        ...formData,
        nama: namaFinal,
        tanggalLahir: tanggalLahirIso,
        noHP: (formData.noHP ?? "").trim(),
      };

      const parsedLocal = pasienSchema.safeParse(payload);
      if (!parsedLocal.success) {
        setError(
          formatPasienApiValidationError({
            error: parsedLocal.error.flatten(),
          }),
        );
        return;
      }

      const res = await fetch("/api/pasien/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const json = (await res.json().catch(() => ({}))) as any;
      if (!res.ok || !json?.ok) {
        throw new Error(formatPasienApiValidationError(json));
      }

      const patient = json.data as Pasien;
      onClose(); // Berhasil simpan, langsung tutup tanpa konfirmasi
      await onSaved(patient);
    } catch (err: any) {
      setError(err?.message || "Terjadi kesalahan saat menyimpan data");
    } finally {
      setLoading(false);
    }
  };

  const primaryLabel = matchedPatient ? "Tambah kasus tindakan" : "💾 Simpan";
  const primaryLoadingLabel = matchedPatient
    ? "Memperbarui master & menambah kasus…"
    : "⏳ Menyimpan…";

  const isDirty = useMemo(() => {
    const initial = initialForm();
    return (
      formData.noRM !== initial.noRM ||
      formData.nama !== initial.nama ||
      formData.alamat !== initial.alamat ||
      formData.noHP !== initial.noHP ||
      formData.asuransi !== initial.asuransi
    );
  }, [formData]);

  const handleClose = async () => {
    if (isDirty) {
      const confirmClose = await confirm({
        title: "Batalkan Pengisian?",
        message: "Data yang Anda masukkan belum disimpan. Tetap keluar?",
        confirmLabel: "Ya, Keluar",
        cancelLabel: "Lanjutkan Mengisi",
        danger: true,
      });
      if (!confirmClose) return;
    }
    onClose();
  };

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(v) => {
        if (!v) handleClose();
      }}
      modal={true}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[100000] bg-black/20 backdrop-blur-sm transition-opacity animate-in fade-in duration-300" />
        <DialogPrimitive.Content
          className={cn(
            "fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] z-[100001] outline-none",
            "p-0 border-none bg-transparent shadow-none max-w-[min(30rem,95vw)] w-full",
          )}
          onPointerDownOutside={(e) => {
            if (isDirty) e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            if (isDirty) e.preventDefault();
          }}
        >
          <div
            className={cn(
              "animate-in fade-in zoom-in-95 duration-200 rounded-xl border p-3 sm:rounded-2xl sm:p-6",
              isDark
                ? "border-cyan-500/45 bg-slate-950 text-white shadow-2xl shadow-cyan-900/50"
                : "border-cyan-500/35 bg-white text-slate-800 shadow-2xl shadow-cyan-900/20",
            )}
          >
            <DialogPrimitive.Title
              className={cn(
                "mb-2 text-center text-lg font-semibold sm:mb-4 sm:text-2xl",
                isDark ? "text-cyan-100" : "text-cyan-900",
              )}
            >
              ➕ Tambah Pasien
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="sr-only">
              Lengkapi data pasien untuk menambahkan ke master dan kasus
              tindakan baru.
            </DialogPrimitive.Description>

            {matchedPatient ? (
              <div
                className={cn(
                  "text-xs mb-3 rounded-lg border px-3 py-2 leading-relaxed space-y-1",
                  isDark
                    ? "text-white border-amber-400/65 bg-amber-950/60"
                    : "text-amber-950 border-amber-400/45 bg-amber-50",
                )}
                role="status"
              >
                <div>
                  No. RM ini sudah ada di master pasien —{" "}
                  {riwayatTindakan.length > 0 ? (
                    <span className="font-bold">
                      Riwayat tindakan lain ({riwayatTindakan.length})
                    </span>
                  ) : (
                    "formulir diisi otomatis."
                  )}
                </div>

                {riwayatTindakan.length > 0 && (
                  <div className="mt-1 border-t border-amber-400/30 pt-1">
                    <p className="font-medium mb-0.5">- Pernah dilakukan:</p>
                    <ol className="list-decimal pl-4 space-y-0.5">
                      {riwayatTindakan.map((t, i) => (
                        <li key={t.id || i}>
                          <span className="font-semibold">{t.tindakan || "Tindakan"}</span>{" "}
                          {t.tanggal ? formatTanggalIndo(t.tanggal) : ""}{" "}
                          {t.dokter ? formatDokter(t.dokter) : ""}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                <div className="text-[11px] opacity-90 mt-1">
                  Anda boleh melengkapi atau mengoreksi data sebelum menyimpan; perubahan akan disimpan ke master pasien. Untuk kunjungan atau jenis tindakan baru, gunakan{" "}
                  <span
                    className={cn(
                      "font-semibold",
                      isDark ? "text-amber-100" : "text-amber-900",
                    )}
                  >
                    Tambah kasus tindakan
                  </span>{" "}
                  (tidak membuat pasien ganda).
                </div>
              </div>
            ) : null}

          {simrsMatched ? (
            <p
              className={cn(
                "text-[11px] mb-3 rounded-lg border px-3 py-2 leading-relaxed sm:text-xs",
                isDark
                  ? "text-white border-cyan-400/65 bg-cyan-950/60"
                  : "text-cyan-950 border-cyan-400/45 bg-cyan-50",
              )}
              role="status"
            >
              Data ditemukan di <span className="font-bold">SIMRS</span> —
              formulir diisi otomatis. Silakan lengkapi data (misal No. HP)
              sebelum menyimpan ke master pasien lokal.
            </p>
          ) : null}

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
              <div>
                <InputField
                  label="No. RM"
                  name="noRM"
                  value={formData.noRM}
                  onChange={handleChange}
                  isDark={isDark}
                  autoComplete="off"
                  inputRef={noRmInputRef}
                />
                {rmChecking && (
                  <p
                    className={cn(
                      "text-[10px] mt-1 flex items-center gap-1 font-bold animate-pulse",
                      isDark ? "text-cyan-300" : "text-cyan-700",
                    )}
                  >
                    <span className="h-2 w-2 rounded-full bg-cyan-500 shadow-[0_0_8px_cyan]"></span>
                    🔍 CEK SIMRS & LOKAL...
                  </p>
                )}
              </div>
              <InputField
                label="Nama"
                name="nama"
                value={formData.nama}
                onChange={handleChange}
                isDark={isDark}
                autoComplete="name"
              />

              <div className="col-span-1 grid grid-cols-1 gap-2 sm:col-span-2 sm:grid-cols-3 sm:gap-3">
                <div>
                  <label
                    className={cn(
                      "text-xs sm:text-sm",
                      isDark ? "text-white" : "text-cyan-900",
                    )}
                  >
                    Jenis Kelamin
                  </label>
                  <select
                    name="jenisKelamin"
                    value={formData.jenisKelamin}
                    onChange={handleChange}
                    className={cn(
                      "mt-1 w-full rounded-lg border px-2.5 py-1.5 text-sm focus:border-yellow-500 focus:outline-none sm:px-3 sm:py-2 sm:text-base",
                      isDark
                        ? "border-cyan-600/60 bg-slate-900 text-cyan-100 [color-scheme:dark]"
                        : "border-cyan-500/45 bg-white text-slate-800 [color-scheme:light]",
                    )}
                  >
                    <option value="L">Laki-laki</option>
                    <option value="P">Perempuan</option>
                  </select>
                </div>

                <InputField
                  label="Tanggal Lahir"
                  name="tanggalLahir"
                  type="text"
                  placeholder="1967-06-30 atau 30-06-1967"
                  value={formData.tanggalLahir}
                  onChange={handleChange}
                  onBlur={handleTanggalLahirBlur}
                  isDark={isDark}
                />

                <div>
                  <label
                    className={cn(
                      "text-xs sm:text-sm",
                      isDark ? "text-white" : "text-cyan-900",
                    )}
                  >
                    Umur
                  </label>
                  <input
                    readOnly
                    tabIndex={-1}
                    value={umurTeks}
                    className={cn(
                      "mt-1 w-full cursor-default rounded-lg border px-2.5 py-1.5 text-sm sm:px-3 sm:py-2 sm:text-base",
                      isDark
                        ? "border-cyan-600/30 bg-black/20 text-cyan-200"
                        : "border-cyan-500/35 bg-slate-100 text-slate-700",
                    )}
                    aria-live="polite"
                  />
                </div>
              </div>

              <InputField
                label="Alamat"
                name="alamat"
                value={formData.alamat}
                onChange={handleChange}
                colSpan
                isDark={isDark}
                autoComplete="street-address"
              />
              <InputField
                label="No. HP"
                name="noHP"
                value={formData.noHP}
                onChange={handleChange}
                colSpan
                isDark={isDark}
                autoComplete="tel"
              />

              <div>
                <label
                  className={cn(
                    "text-xs sm:text-sm",
                    isDark ? "text-white" : "text-cyan-900",
                  )}
                >
                  Jenis Pembiayaan
                </label>
                <select
                  name="jenisPembiayaan"
                  value={formData.jenisPembiayaan}
                  onChange={handleChange}
                  className={cn(
                    "mt-1 w-full rounded-lg border px-2.5 py-1.5 text-sm focus:border-yellow-500 focus:outline-none sm:px-3 sm:py-2 sm:text-base",
                    isDark
                      ? "border-cyan-600/60 bg-black/30 text-cyan-100 [color-scheme:dark]"
                      : "border-cyan-500/45 bg-white text-slate-800 [color-scheme:light]",
                  )}
                >
                  <option value="BPJS">BPJS-PBI</option>
                  <option value="NPBI">NPBI</option>
                  <option value="Umum">Umum</option>
                  <option value="Asuransi">Asuransi</option>
                </select>
                {formData.jenisPembiayaan === "BPJS" && (
                  <p
                    className={cn(
                      "mt-1.5 text-xs leading-snug",
                      isDark ? "text-white/90" : "text-slate-600",
                    )}
                  >
                    Disimpan sebagai{" "}
                    <span className="font-medium dark:text-white">
                      PBI Kelas 3
                    </span>
                    ; sama dengan baris laporan{" "}
                    <span className="font-medium dark:text-white">PBI</span>.
                  </p>
                )}
                {formData.jenisPembiayaan === "NPBI" && (
                  <p
                    className={cn(
                      "mt-1.5 text-xs leading-snug",
                      isDark ? "text-white/90" : "text-slate-600",
                    )}
                  >
                    Bersama angka kelas di bawah membentuk kolom{" "}
                    <span className="font-medium dark:text-white">
                      Kelas pembiayaan
                    </span>{" "}
                    di tab Biaya (mis.{" "}
                    <span className="font-medium dark:text-white">
                      NPBI - 1
                    </span>
                    ), sama dengan laporan{" "}
                    <span className="font-medium dark:text-white">
                      BPJS NON PBI KLS 1–3
                    </span>
                    .
                  </p>
                )}
              </div>

              <div>
                <label
                  className={cn(
                    "text-xs sm:text-sm",
                    isDark ? "text-white" : "text-cyan-900",
                  )}
                >
                  Kelas Perawatan
                </label>
                <select
                  name="kelasPerawatan"
                  value={formData.kelasPerawatan}
                  onChange={handleChange}
                  className={cn(
                    "mt-1 w-full rounded-lg border px-2.5 py-1.5 text-sm focus:border-yellow-500 focus:outline-none sm:px-3 sm:py-2 sm:text-base",
                    isDark
                      ? "border-cyan-600/60 bg-black/30 text-cyan-100 [color-scheme:dark]"
                      : "border-cyan-500/45 bg-white text-slate-800 [color-scheme:light]",
                  )}
                >
                  <option value="Kelas 1">1</option>
                  <option value="Kelas 2">2</option>
                  <option value="Kelas 3">3</option>
                </select>
              </div>

              <InputField
                label="Asuransi (opsional)"
                name="asuransi"
                value={formData.asuransi}
                onChange={handleChange}
                colSpan
                isDark={isDark}
              />
            </div>

            {error && (
              <p
                className={cn(
                  "mx-auto mt-3 max-w-full text-left text-sm whitespace-pre-line rounded-lg border px-3 py-2 sm:max-w-md",
                  isDark
                    ? "border-red-400/70 bg-red-950/70 text-white"
                    : "border-red-400/50 bg-red-50 text-red-900",
                )}
                role="alert"
              >
                {error}
              </p>
            )}

            <div className="mt-4 flex w-full flex-col-reverse gap-2 sm:mt-6 sm:flex-row sm:justify-center sm:gap-4">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading || rmChecking}
                className={cn(
                  "w-full shrink-0 rounded-lg border border-cyan-400/50 bg-cyan-600/60 px-4 py-2.5 shadow-[0_0_15px_rgba(0,255,255,0.5)] transition-all hover:bg-cyan-500/80 hover:shadow-[0_0_20px_rgba(0,255,255,0.8)] disabled:opacity-60 sm:w-auto sm:px-6 sm:py-2",
                  isDark ? "text-white" : "text-black",
                )}
              >
                {loading ? primaryLoadingLabel : primaryLabel}
              </button>
              <button
                onClick={handleClose}
                className={cn(
                  "w-full shrink-0 rounded-lg border bg-transparent px-4 py-2.5 transition-all sm:w-auto sm:px-6 sm:py-2",
                  isDark
                    ? "border-yellow-400/50 text-yellow-400 hover:bg-yellow-400/20 hover:shadow-[0_0_10px_rgba(255,215,0,0.4)]"
                    : "border-amber-600/50 text-amber-800 hover:bg-amber-100/80",
                )}
              >
                ✖ Batal
              </button>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function InputField({
  label,
  name,
  value,
  onChange,
  onBlur,
  type = "text",
  colSpan = false,
  placeholder,
  autoComplete,
  isDark,
  inputRef,
}: {
  label: string;
  name: string;
  value: any;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  type?: string;
  colSpan?: boolean;
  placeholder?: string;
  autoComplete?: string;
  isDark: boolean;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}) {
  return (
    <div className={colSpan ? "col-span-1 sm:col-span-2" : ""}>
      <label
        className={cn(
          "text-xs sm:text-sm",
          isDark ? "text-white" : "text-cyan-900",
        )}
      >
        {label}
      </label>
      <input
        ref={inputRef}
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={cn(
          "mt-1 w-full rounded-lg border px-2.5 py-1.5 text-sm focus:border-yellow-500 focus:outline-none sm:px-3 sm:py-2 sm:text-base",
          isDark
            ? "border-cyan-600/60 bg-slate-900 text-cyan-100 placeholder:text-cyan-200 [color-scheme:dark]"
            : "border-cyan-500/45 bg-white text-slate-800 placeholder:text-slate-500 [color-scheme:light]",
        )}
      />
    </div>
  );
}
