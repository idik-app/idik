"use client";

import {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
  useEffect,
} from "react";

export type MasterTindakanRow = {
  id: string;
  nama: string;
  urutan: number;
  aktif: boolean;
};

export type MasterTindakanStatusFilter = "all" | "aktif" | "nonaktif";

type MasterTindakanContextType = {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  statusFilter: MasterTindakanStatusFilter;
  setStatusFilter: (s: MasterTindakanStatusFilter) => void;
  currentPage: number;
  setCurrentPage: (n: number) => void;
  rowsPerPage: number;
  setRowsPerPage: (n: number) => void;
  totalPages: number;
  rows: MasterTindakanRow[];
  filteredRows: MasterTindakanRow[];
  paginatedRows: MasterTindakanRow[];
  loading: boolean;
  fetchRows: (opts?: { silent?: boolean }) => Promise<{ error?: unknown }>;
  patchMasterTindakan: (
    id: string,
    patch: Partial<Pick<MasterTindakanRow, "nama" | "urutan" | "aktif">>,
  ) => Promise<{ ok: boolean; message?: string }>;
  deleteMasterTindakan: (
    id: string,
  ) => Promise<{ ok: boolean; error?: string }>;
};

const MasterTindakanContext = createContext<
  MasterTindakanContextType | undefined
>(undefined);

function mapRow(r: Record<string, unknown>): MasterTindakanRow {
  const ur = r.urutan;
  const u =
    typeof ur === "number"
      ? ur
      : Number.isFinite(Number(ur))
        ? Math.trunc(Number(ur))
        : 0;
  return {
    id: String(r.id),
    nama: String(r.nama ?? ""),
    urutan: u,
    aktif: r.aktif !== false,
  };
}

export function MasterTindakanProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<MasterTindakanStatusFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [rows, setRows] = useState<MasterTindakanRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRows = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent === true;
    if (!silent) setLoading(true);
    try {
      const res = await fetch("/api/master-tindakan", {
        credentials: "include",
        cache: "no-store",
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        masterTindakan?: unknown;
        message?: string;
      };
      if (!res.ok || !json?.ok) {
        if (!silent) {
          setRows([]);
          setLoading(false);
        }
        return {
          error: json?.message || res.statusText || "Gagal memuat data.",
        };
      }
      const list = Array.isArray(json.masterTindakan)
        ? json.masterTindakan
        : [];
      setRows(
        list
          .map((r) =>
            r && typeof r === "object"
              ? mapRow(r as Record<string, unknown>)
              : null,
          )
          .filter(Boolean) as MasterTindakanRow[],
      );
    } catch (e) {
      if (!silent) setLoading(false);
      return { error: e };
    }
    if (!silent) setLoading(false);
    return {};
  }, []);

  const patchMasterTindakan = useCallback(
    async (
      id: string,
      patch: Partial<Pick<MasterTindakanRow, "nama" | "urutan" | "aktif">>,
    ) => {
      try {
        const res = await fetch(
          `/api/master-tindakan/${encodeURIComponent(id)}`,
          {
            method: "PATCH",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(patch),
          },
        );
        const json = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          message?: string;
        };
        if (!res.ok || !json.ok) {
          const hint =
            res.status === 403
              ? "Hanya admin yang dapat mengubah master tindakan."
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
    [fetchRows],
  );

  const deleteMasterTindakan = useCallback(
    async (id: string): Promise<{ ok: boolean; error?: string }> => {
      try {
        const res = await fetch(
          `/api/master-tindakan/${encodeURIComponent(id)}`,
          {
            method: "DELETE",
            credentials: "same-origin",
          },
        );
        const json = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          message?: string;
        };
        if (!res.ok || !json.ok) {
          const hint =
            res.status === 403
              ? "Hanya admin yang dapat menghapus master tindakan."
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
    [fetchRows],
  );

  const filteredRows = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return rows.filter((r) => {
      const matchSearch = !q || r.nama.toLowerCase().includes(q);
      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "aktif" ? r.aktif : !r.aktif);
      return matchSearch && matchStatus;
    });
  }, [searchQuery, rows, statusFilter]);

  const totalPages = Math.ceil(filteredRows.length / rowsPerPage) || 1;

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredRows.slice(start, start + rowsPerPage);
  }, [filteredRows, currentPage, rowsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [rowsPerPage]);

  useEffect(() => {
    setCurrentPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  return (
    <MasterTindakanContext.Provider
      value={{
        searchQuery,
        setSearchQuery,
        statusFilter,
        setStatusFilter,
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
        patchMasterTindakan,
        deleteMasterTindakan,
      }}
    >
      {children}
    </MasterTindakanContext.Provider>
  );
}

export function useMasterTindakan() {
  const ctx = useContext(MasterTindakanContext);
  if (!ctx) {
    throw new Error(
      "useMasterTindakan must be used inside MasterTindakanProvider",
    );
  }
  return ctx;
}
