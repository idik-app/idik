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

let ruanganSupabaseWarned = false;

export type RuanganRow = {
  id: string;
  nama: string;
  kode: string | null;
  kategori: string | null;
  kapasitas: number | null;
  keterangan: string | null;
  aktif: boolean;
};

export type RuanganStatusFilter = "all" | "aktif" | "nonaktif";

type RuanganContextType = {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  filterKategori: string;
  setFilterKategori: (s: string) => void;
  statusFilter: RuanganStatusFilter;
  setStatusFilter: (s: RuanganStatusFilter) => void;
  kategoriOptions: string[];
  currentPage: number;
  setCurrentPage: (n: number) => void;
  rowsPerPage: number;
  setRowsPerPage: (n: number) => void;
  totalPages: number;
  rows: RuanganRow[];
  filteredRows: RuanganRow[];
  paginatedRows: RuanganRow[];
  loading: boolean;
  fetchRows: (opts?: { silent?: boolean }) => Promise<{ error?: unknown }>;
  patchRuangan: (
    id: string,
    patch: Partial<
      Pick<
        RuanganRow,
        "nama" | "kode" | "kategori" | "kapasitas" | "keterangan" | "aktif"
      >
    >
  ) => Promise<{ ok: boolean; message?: string }>;
  deleteRuangan: (id: string) => Promise<{ ok: boolean; error?: string }>;
};

const RuanganContext = createContext<RuanganContextType | undefined>(
  undefined
);

function mapRow(r: Record<string, unknown>): RuanganRow {
  return {
    id: String(r.id),
    nama: String(r.nama ?? ""),
    kode: r.kode != null ? String(r.kode) : null,
    kategori: r.kategori != null ? String(r.kategori) : null,
    kapasitas: (() => {
      if (r.kapasitas == null || r.kapasitas === "") return null;
      const n = Number(r.kapasitas);
      return Number.isFinite(n) ? n : null;
    })(),
    keterangan: r.keterangan != null ? String(r.keterangan) : null,
    aktif: r.aktif !== false,
  };
}

export function RuanganProvider({ children }: { children: React.ReactNode }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterKategori, setFilterKategori] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<RuanganStatusFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [rows, setRows] = useState<RuanganRow[]>([]);
  const [loading, setLoading] = useState(true);

  const kategoriOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) {
      const k = r.kategori?.trim();
      if (k) set.add(k);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "id"));
  }, [rows]);

  const fetchRows = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent === true;
    if (!isSupabaseConfigured()) {
      setRows([]);
      if (!silent) setLoading(false);
      if (!ruanganSupabaseWarned) {
        ruanganSupabaseWarned = true;
      }
      return {
        error:
          "Supabase belum dikonfigurasi. Set `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY` di `.env.local`.",
      };
    }
    if (!silent) setLoading(true);
    const { data, error } = await supabase
      .from("ruangan")
      .select("*")
      .order("nama");
    if (error) {
      if (!silent) setLoading(false);
      return { error };
    }
    if (data) {
      setRows(data.map((r) => mapRow(r as Record<string, unknown>)));
    }
    if (!silent) setLoading(false);
    return {};
  }, []);

  const patchRuangan = useCallback(
    async (
      id: string,
      patch: Partial<
        Pick<
          RuanganRow,
          "nama" | "kode" | "kategori" | "kapasitas" | "keterangan" | "aktif"
        >
      >
    ) => {
      try {
        const res = await fetch(`/api/ruangan/${encodeURIComponent(id)}`, {
          method: "PATCH",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
        const json = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          message?: string;
        };
        if (!res.ok || !json.ok) {
          const hint =
            res.status === 403
              ? "Hanya admin yang dapat mengubah data ruangan."
              : json.message || res.statusText || "Gagal menyimpan.";
          return { ok: false, message: hint };
        }
        await fetchRows({ silent: true });
        return { ok: true };
      } catch (e) {
        return {
          ok: false,
          message: e instanceof Error ? e.message : "Gagal menyimpan.",
        };
      }
    },
    [fetchRows]
  );

  const deleteRuangan = useCallback(
    async (id: string): Promise<{ ok: boolean; error?: string }> => {
      try {
        const res = await fetch(`/api/ruangan/${encodeURIComponent(id)}`, {
          method: "DELETE",
          credentials: "same-origin",
        });
        const json = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          message?: string;
        };
        if (!res.ok || !json.ok) {
          const hint =
            res.status === 403
              ? "Hanya admin yang dapat menghapus data ruangan."
              : json.message || res.statusText || "Gagal menghapus.";
          return { ok: false, error: hint };
        }
        await fetchRows({ silent: true });
        return { ok: true };
      } catch (e) {
        return {
          ok: false,
          error: e instanceof Error ? e.message : "Gagal menghapus.",
        };
      }
    },
    [fetchRows]
  );

  const filteredRows = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return rows.filter((r) => {
      const matchSearch =
        !q ||
        r.nama.toLowerCase().includes(q) ||
        (r.kode?.toLowerCase().includes(q) ?? false) ||
        (r.kategori?.toLowerCase().includes(q) ?? false) ||
        (r.keterangan?.toLowerCase().includes(q) ?? false) ||
        String(r.kapasitas ?? "").includes(q);
      const matchKat =
        !filterKategori || (r.kategori?.trim() ?? "") === filterKategori;
      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "aktif" ? r.aktif : !r.aktif);
      return matchSearch && matchKat && matchStatus;
    });
  }, [searchQuery, rows, filterKategori, statusFilter]);

  const totalPages = Math.ceil(filteredRows.length / rowsPerPage) || 1;

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredRows.slice(start, start + rowsPerPage);
  }, [filteredRows, currentPage, rowsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterKategori, statusFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [rowsPerPage]);

  useEffect(() => {
    setCurrentPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  return (
    <RuanganContext.Provider
      value={{
        searchQuery,
        setSearchQuery,
        filterKategori,
        setFilterKategori,
        statusFilter,
        setStatusFilter,
        kategoriOptions,
        currentPage,
        setCurrentPage,
        rowsPerPage,
        setRowsPerPage,
        totalPages,
        rows,
        filteredRows,
        paginatedRows,
        loading,
        fetchRows,
        patchRuangan,
        deleteRuangan,
      }}
    >
      {children}
    </RuanganContext.Provider>
  );
}

export function useRuangan() {
  const ctx = useContext(RuanganContext);
  if (!ctx) throw new Error("useRuangan must be used inside RuanganProvider");
  return ctx;
}
