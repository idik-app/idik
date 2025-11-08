"use client";

import {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
} from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

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
}

const DokterContext = createContext<DokterContextType | undefined>(undefined);

export function DokterProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClientComponentClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [doctors, setDoctors] = useState<Dokter[]>([]);
  const [loading, setLoading] = useState(true);

  // Ambil data dokter dari Supabase
  const fetchDoctors = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("dokter")
      .select("*")
      .order("nama");
    if (data) setDoctors(data);
    setLoading(false);
    return { error };
  }, [supabase]);

  // Hapus data dokter berdasarkan ID
  const deleteDoctor = useCallback(
    async (id: string) => {
      await supabase.from("dokter").delete().eq("id", id);
      await fetchDoctors();
    },
    [supabase, fetchDoctors]
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
