"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  hospitalDirectory,
  type HospitalUnit,
} from "../constants/phone-directory";

const DEBOUNCE_MS = 550;

function isRowTextValid(row: HospitalUnit) {
  return (
    String(row.unit ?? "").trim().length > 0 &&
    String(row.ext ?? "").trim().length > 0
  );
}

type ApiItem = {
  id: string;
  unit: string;
  ext: string;
  location: string;
  floor?: string;
  isPinned: boolean;
};

function mapApiToUnit(r: ApiItem): HospitalUnit {
  return {
    id: r.id,
    unit: r.unit,
    ext: r.ext,
    location: r.location ?? "",
    floor: r.floor,
    isPinned: Boolean(r.isPinned),
  };
}

async function fetchDirectory(): Promise<{
  items: HospitalUnit[];
  setupNeeded?: boolean;
}> {
  const res = await fetch("/api/phone-directory", { cache: "no-store" });
  const json = (await res.json()) as {
    ok?: boolean;
    items?: ApiItem[];
    setupNeeded?: boolean;
    message?: string;
  };
  if (!res.ok || !json.ok) {
    throw new Error(String(json.message ?? "Gagal memuat direktori"));
  }
  const items = (json.items ?? []).map(mapApiToUnit);
  return { items, setupNeeded: json.setupNeeded };
}

type PhoneDirectoryValue = {
  data: HospitalUnit[];
  pinnedItems: HospitalUnit[];
  updateEntry: (id: string, updates: Partial<HospitalUnit>) => void;
  deleteEntry: (id: string) => void;
  addEntry: (entry: Omit<HospitalUnit, "id">) => void;
  togglePin: (id: string) => void;
  reorderPins: (reorderedPins: HospitalUnit[]) => void;
  isLoaded: boolean;
  loadError: string | null;
  /** Panggil saat keluar mode edit agar perubahan teks tersimpan ke server */
  flushPendingSaves: () => Promise<void>;
};

const PhoneDirectoryContext = createContext<PhoneDirectoryValue | null>(null);

export function PhoneDirectoryProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<HospitalUnit[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const latestById = useRef<Map<string, HospitalUnit>>(new Map());
  const debounceTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  const applyServerList = useCallback((items: HospitalUnit[]) => {
    setData(items);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { items, setupNeeded } = await fetchDirectory();
        if (cancelled) return;
        if (setupNeeded && items.length === 0) {
          applyServerList(hospitalDirectory);
          setLoadError(
            "Tabel database belum tersedia — menampilkan data bawaan. Jalankan migrasi internal_phone_directory.",
          );
        } else {
          applyServerList(items);
          setLoadError(null);
        }
      } catch (e) {
        if (!cancelled) {
          applyServerList(hospitalDirectory);
          setLoadError(
            e instanceof Error
              ? e.message
              : "Tidak terhubung ke server — data lokal bawaan.",
          );
        }
      } finally {
        if (!cancelled) setIsLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applyServerList]);

  const refreshList = useCallback(async () => {
    const { items } = await fetchDirectory();
    applyServerList(items);
    setLoadError(null);
  }, [applyServerList]);

  const patchFieldsToServer = useCallback(
    async (row: HospitalUnit) => {
      if (!isRowTextValid(row)) {
        return;
      }
      const res = await fetch(`/api/phone-directory/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unit: String(row.unit ?? "").trim(),
          ext: String(row.ext ?? "").trim(),
          location: String(row.location ?? "").trim(),
          floor:
            row.floor != null && String(row.floor).trim()
              ? String(row.floor).trim()
              : null,
        }),
      });
      const json = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !json.ok) {
        throw new Error(String(json.message ?? "Gagal menyimpan"));
      }
      setLoadError(null);
    },
    [],
  );

  const scheduleDebouncedFieldSave = useCallback(
    (id: string) => {
      const existing = debounceTimers.current.get(id);
      if (existing) clearTimeout(existing);
      const t = setTimeout(() => {
        debounceTimers.current.delete(id);
        const row = latestById.current.get(id);
        if (row) {
          void patchFieldsToServer(row).catch((err) => {
            console.error("[phone-directory]", err);
            setLoadError(
              err instanceof Error ? err.message : "Gagal menyimpan perubahan",
            );
          });
        }
      }, DEBOUNCE_MS);
      debounceTimers.current.set(id, t);
    },
    [patchFieldsToServer],
  );

  const flushPendingSaves = useCallback(async () => {
    for (const [id, t] of [...debounceTimers.current.entries()]) {
      clearTimeout(t);
      debounceTimers.current.delete(id);
      const row = latestById.current.get(id);
      if (row) {
        if (!isRowTextValid(row)) {
          setLoadError(
            "Unit dan ekstensi wajib diisi. Lengkapi isian sebelum selesai mengedit.",
          );
          return;
        }
        try {
          await patchFieldsToServer(row);
        } catch (err) {
          console.error("[phone-directory]", err);
          setLoadError(
            err instanceof Error ? err.message : "Gagal menyimpan perubahan",
          );
          throw err;
        }
      }
    }
  }, [patchFieldsToServer]);

  const updateEntry = useCallback(
    (id: string, updates: Partial<HospitalUnit>) => {
      setData((prev) => {
        const next = prev.map((item) =>
          item.id === id ? { ...item, ...updates } : item,
        );
        const row = next.find((i) => i.id === id);
        if (row) {
          latestById.current.set(id, row);
          const touchesText =
            updates.unit !== undefined ||
            updates.ext !== undefined ||
            updates.location !== undefined ||
            updates.floor !== undefined;
          if (touchesText) {
            scheduleDebouncedFieldSave(id);
          }
        }
        return next;
      });
    },
    [scheduleDebouncedFieldSave],
  );

  const deleteEntry = useCallback(
    async (id: string) => {
      await flushPendingSaves();
      let snapshot: HospitalUnit[] = [];
      setData((d) => {
        snapshot = d;
        return d.filter((item) => item.id !== id);
      });
      latestById.current.delete(id);
      try {
        const res = await fetch(`/api/phone-directory/${id}`, {
          method: "DELETE",
        });
        const json = (await res.json()) as { ok?: boolean; message?: string };
        if (!res.ok || !json.ok) {
          throw new Error(String(json.message ?? "Gagal menghapus"));
        }
        await refreshList();
      } catch (e) {
        setData(snapshot);
        setLoadError(
          e instanceof Error ? e.message : "Gagal menghapus entri",
        );
      }
    },
    [flushPendingSaves, refreshList],
  );

  const addEntry = useCallback(
    async (entry: Omit<HospitalUnit, "id">) => {
      await flushPendingSaves();
      try {
        const res = await fetch("/api/phone-directory", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            unit: entry.unit,
            ext: entry.ext,
            location: entry.location,
            floor: entry.floor ?? null,
            isPinned: Boolean(entry.isPinned),
          }),
        });
        const json = (await res.json()) as {
          ok?: boolean;
          item?: ApiItem;
          message?: string;
        };
        if (!res.ok || !json.ok || !json.item) {
          throw new Error(String(json.message ?? "Gagal menambah"));
        }
        await refreshList();
      } catch (e) {
        setLoadError(
          e instanceof Error ? e.message : "Gagal menambah entri",
        );
      }
    },
    [flushPendingSaves, refreshList],
  );

  const togglePin = useCallback(
    async (id: string) => {
      const current = data.find((i) => i.id === id);
      if (!current) return;
      const wasPinned = Boolean(current.isPinned);
      const nextPin = !wasPinned;
      let snapshot: HospitalUnit[] = [];
      setData((prev) => {
        snapshot = prev;
        return prev.map((item) =>
          item.id === id ? { ...item, isPinned: nextPin } : item,
        );
      });
      try {
        const res = await fetch(`/api/phone-directory/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isPinned: nextPin }),
        });
        const json = (await res.json()) as { ok?: boolean; message?: string };
        if (!res.ok || !json.ok) {
          throw new Error(String(json.message ?? "Gagal memperbarui"));
        }
        await refreshList();
      } catch (e) {
        setData(snapshot);
        setLoadError(
          e instanceof Error ? e.message : "Gagal memperbarui pin",
        );
      }
    },
    [data, refreshList],
  );

  const reorderPins = useCallback(
    async (reorderedPins: HospitalUnit[]) => {
      const orderedIds = reorderedPins.map((p) => p.id);
      if (orderedIds.length < 1) return;
      let snapshot: HospitalUnit[] = [];
      setData((d) => {
        snapshot = d;
        const nonPinned = d.filter((item) => !item.isPinned);
        return [...reorderedPins, ...nonPinned];
      });
      try {
        const res = await fetch("/api/phone-directory/reorder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderedIds }),
        });
        const json = (await res.json()) as { ok?: boolean; message?: string };
        if (!res.ok || !json.ok) {
          throw new Error(String(json.message ?? "Gagal mengurutkan"));
        }
        await refreshList();
      } catch (e) {
        setData(snapshot);
        setLoadError(
          e instanceof Error ? e.message : "Gagal mengurutkan shortcut",
        );
      }
    },
    [refreshList],
  );

  const pinnedItems = useMemo(
    () => data.filter((item) => item.isPinned),
    [data],
  );

  const value = useMemo<PhoneDirectoryValue>(
    () => ({
      data,
      pinnedItems,
      updateEntry,
      deleteEntry,
      addEntry,
      togglePin,
      reorderPins,
      isLoaded,
      loadError,
      flushPendingSaves,
    }),
    [
      data,
      pinnedItems,
      updateEntry,
      deleteEntry,
      addEntry,
      togglePin,
      reorderPins,
      isLoaded,
      loadError,
      flushPendingSaves,
    ],
  );

  return (
    <PhoneDirectoryContext.Provider value={value}>
      {children}
    </PhoneDirectoryContext.Provider>
  );
}

export function usePhoneDirectoryContext() {
  const ctx = useContext(PhoneDirectoryContext);
  if (!ctx) {
    throw new Error(
      "usePhoneDirectory must be used within PhoneDirectoryProvider",
    );
  }
  return ctx;
}
