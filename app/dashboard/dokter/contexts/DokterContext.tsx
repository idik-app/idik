"use client";

import {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
  useEffect,
} from "react";
import {
  supabase,
  isSupabaseConfigured,
} from "@/lib/supabase/supabaseClient";

let dokterSupabaseWarned = false;

interface Dokter {
  id: string;
  nama: string;
  spesialis?: string;
  kontak?: string;
  status?: string;
}

export type DokterStatusFilter = "all" | "aktif" | "nonaktif";

interface DokterContextType {
  // UI states
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  filterSpesialis: string;
  setFilterSpesialis: (s: string) => void;
  statusFilter: DokterStatusFilter;
  setStatusFilter: (s: DokterStatusFilter) => void;
  spesialisOptions: string[];
  currentPage: number;
  setCurrentPage: (n: number) => void;
  rowsPerPage: number;
  setRowsPerPage: (n: number) => void;
  totalPages: number;

  // Data states
  doctors: Dokter[];
  filteredDoctors: Dokter[];
  paginatedDoctors: Dokter[];
  loading: boolean;

  // CRUD actions
  fetchDoctors: (opts?: { silent?: boolean }) => Promise<{ error?: any }>;
  deleteDoctor: (id: string) => Promise<{ ok: boolean; error?: string }>;
  addDoctor: (payload: Record<string, any>) => Promise<void>;
  updateDoctor: (id: string, payload: Record<string, any>) => Promise<void>;
}

const DokterContext = createContext<DokterContextType | undefined>(undefined);

export function DokterProvider({ children }: { children: React.ReactNode }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSpesialis, setFilterSpesialis] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<DokterStatusFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [doctors, setDoctors] = useState<Dokter[]>([]);
  const [loading, setLoading] = useState(true);

  const spesialisOptions = useMemo(() => {
    const set = new Set<string>();
    for (const d of doctors) {
      const s = d.spesialis?.trim();
      if (s) set.add(s);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "id"));
  }, [doctors]);

  // Ambil data dokter dari Supabase (tabel: doctor — konsisten dengan migration)
  const fetchDoctors = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent === true;
    if (!isSupabaseConfigured()) {
      setDoctors([]);
      if (!silent) setLoading(false);
      if (!dokterSupabaseWarned) {
        dokterSupabaseWarned = true;
        // Biarkan caller yang memutuskan mau pakai error ini atau tidak
        // tapi jangan spam toast berkali-kali
      }
      return {
        error:
          "Supabase belum dikonfigurasi. Set `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY` di `.env.local`, lalu restart dev server.",
      };
    }
    if (!silent) setLoading(true);
    const { data, error } = await supabase
      .from("doctor")
      .select("*")
      .order("nama_dokter");
    if (data)
      setDoctors(
        data.map((d: { id: string; nama_dokter?: string; spesialis?: string; kontak?: string; status?: boolean }) => ({
          id: d.id,
          nama: d.nama_dokter ?? "",
          spesialis: d.spesialis ?? undefined,
          kontak: d.kontak ?? undefined,
          status: d.status === true ? "aktif" : "nonaktif",
        }))
      );
    if (!silent) setLoading(false);
    return { error };
  }, [supabase]);

  const toDoctorPayload = (payload: Record<string, any>) => {
    const p = { ...payload };
    if (p.nama != null) {
      p.nama_dokter = p.nama;
      delete p.nama;
    }
    return p;
  };

  const deleteDoctor = useCallback(
    async (id: string): Promise<{ ok: boolean; error?: string }> => {
      try {
        const res = await fetch(
          `/api/doctors/${encodeURIComponent(id)}`,
          { method: "DELETE", credentials: "same-origin" }
        );
        const json = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          message?: string;
        };
        if (!res.ok || !json.ok) {
          const hint =
            res.status === 403
              ? "Hanya admin yang dapat menghapus data dokter."
              : json.message || res.statusText || "Gagal menghapus data dokter.";
          return { ok: false, error: hint };
        }
        await fetchDoctors({ silent: true });
        return { ok: true };
      } catch (e) {
        return {
          ok: false,
          error: e instanceof Error ? e.message : "Gagal menghapus data dokter.",
        };
      }
    },
    [fetchDoctors]
  );

  const addDoctor = useCallback(
    async (payload: Record<string, any>) => {
      if (!isSupabaseConfigured()) return;
      await (supabase as any).from("doctor").insert(toDoctorPayload(payload));
      await fetchDoctors();
    },
    [fetchDoctors]
  );

  const updateDoctor = useCallback(
    async (id: string, payload: Record<string, any>) => {
      if (!isSupabaseConfigured()) return;
      await (supabase as any)
        .from("doctor")
        .update(toDoctorPayload(payload))
        .eq("id", id);
      await fetchDoctors();
    },
    [fetchDoctors]
  );

  // Filter dan pagination
  const filteredDoctors = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return doctors.filter((d) => {
      const matchSearch =
        !q ||
        d.nama.toLowerCase().includes(q) ||
        (d.spesialis?.toLowerCase().includes(q) ?? false) ||
        (d.kontak?.toLowerCase().includes(q) ?? false);
      const matchSpesialis =
        !filterSpesialis || (d.spesialis?.trim() ?? "") === filterSpesialis;
      const matchStatus =
        statusFilter === "all" || d.status === statusFilter;
      return matchSearch && matchSpesialis && matchStatus;
    });
  }, [searchQuery, doctors, filterSpesialis, statusFilter]);

  const totalPages = Math.ceil(filteredDoctors.length / rowsPerPage) || 1;

  const paginatedDoctors = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredDoctors.slice(start, start + rowsPerPage);
  }, [filteredDoctors, currentPage, rowsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterSpesialis, statusFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [rowsPerPage]);

  useEffect(() => {
    setCurrentPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  return (
    <DokterContext.Provider
      value={{
        searchQuery,
        setSearchQuery,
        filterSpesialis,
        setFilterSpesialis,
        statusFilter,
        setStatusFilter,
        spesialisOptions,
        currentPage,
        setCurrentPage,
        rowsPerPage,
        setRowsPerPage,
        totalPages,
        doctors,
        filteredDoctors,
        paginatedDoctors,
        loading,
        fetchDoctors,
        deleteDoctor,
        addDoctor,
        updateDoctor,
      }}
    >
      {children}
    </DokterContext.Provider>
  );
}

export function useDokter() {
  const ctx = useContext(DokterContext);
  if (!ctx) throw new Error("useDokter must be used inside DokterProvider");
  return ctx;
}

// Aliases untuk kompatibilitas penamaan lama
export const useDoctor = useDokter;
export const DoctorProvider = DokterProvider;
