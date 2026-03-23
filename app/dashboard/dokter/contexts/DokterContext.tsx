"use client";

import {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
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

interface DokterContextType {
  // UI states
  searchQuery: string;
  setSearchQuery: (q: string) => void;
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
  fetchDoctors: () => Promise<{ error?: any }>;
  deleteDoctor: (id: string) => Promise<void>;
  addDoctor: (payload: Record<string, any>) => Promise<void>;
  updateDoctor: (id: string, payload: Record<string, any>) => Promise<void>;
}

const DokterContext = createContext<DokterContextType | undefined>(undefined);

export function DokterProvider({ children }: { children: React.ReactNode }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [doctors, setDoctors] = useState<Dokter[]>([]);
  const [loading, setLoading] = useState(true);

  // Ambil data dokter dari Supabase (tabel: doctor — konsisten dengan migration)
  const fetchDoctors = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setDoctors([]);
      setLoading(false);
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
    setLoading(true);
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
    setLoading(false);
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
    async (id: string) => {
      if (!isSupabaseConfigured()) return;
      await supabase.from("doctor").delete().eq("id", id);
      await fetchDoctors();
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
    return doctors.filter((d) =>
      d.nama.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, doctors]);

  const totalPages = Math.ceil(filteredDoctors.length / rowsPerPage) || 1;

  const paginatedDoctors = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredDoctors.slice(start, start + rowsPerPage);
  }, [filteredDoctors, currentPage, rowsPerPage]);

  return (
    <DokterContext.Provider
      value={{
        searchQuery,
        setSearchQuery,
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
