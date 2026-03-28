"use client";

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useNotification } from "@/app/contexts/NotificationContext";

type MasterItem = {
  id: string;
  nama: string;
  urutan: number;
  aktif: boolean;
};

type Props = {
  tindakanId: string;
  value: string | null | undefined;
  onSaved?: () => void;
};

function norm(s: string) {
  return s.trim().replace(/\s+/g, " ");
}

export default function KategoriTindakanField({
  tindakanId,
  value,
  onSaved,
}: Props) {
  const { show } = useNotification();
  const listId = useId();
  const [items, setItems] = useState<MasterItem[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [draft, setDraft] = useState(() => norm(String(value ?? "")));
  const [savingRow, setSavingRow] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNama, setEditNama] = useState("");
  const [newNama, setNewNama] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await fetch("/api/master-tindakan-kategori", {
        credentials: "include",
        cache: "no-store",
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        items?: MasterItem[];
        message?: string;
      };
      if (!res.ok || !json.ok) {
        throw new Error(json.message || res.statusText);
      }
      setItems(Array.isArray(json.items) ? json.items : []);
    } catch (e) {
      show({
        type: "error",
        message: `Gagal memuat daftar kategori: ${(e as Error).message}`,
      });
    } finally {
      setLoadingList(false);
    }
  }, [show]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  useEffect(() => {
    setDraft(norm(String(value ?? "")));
  }, [value, tindakanId]);

  const activeNames = useMemo(
    () =>
      items
        .filter((x) => x.aktif !== false)
        .map((x) => x.nama)
        .filter(Boolean),
    [items],
  );

  const saveKategoriRow = async (next: string) => {
    const trimmed = norm(next);
    const apiVal = trimmed.length ? trimmed : null;
    const prev = value == null || value === "" ? "" : norm(String(value));
    if (trimmed === prev) return;

    setSavingRow(true);
    try {
      const res = await fetch(
        `/api/tindakan/${encodeURIComponent(tindakanId)}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kategori: apiVal }),
        },
      );
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
      };
      if (!res.ok || !json.ok) {
        throw new Error(json.message || res.statusText);
      }
      show({ type: "success", message: "Kategori tersimpan." });
      onSaved?.();
    } catch (e) {
      show({
        type: "error",
        message: `Gagal simpan kategori: ${(e as Error).message}`,
      });
      setDraft(prev);
    } finally {
      setSavingRow(false);
    }
  };

  const addMasterFromDraft = async () => {
    const nama = norm(draft);
    if (!nama) {
      show({ type: "warning", message: "Isi kategori terlebih dahulu." });
      return;
    }
    if (items.some((i) => i.nama.toUpperCase() === nama.toUpperCase())) {
      show({ type: "warning", message: "Sudah ada di daftar master." });
      return;
    }
    setBusyId("__add__");
    try {
      const res = await fetch("/api/master-tindakan-kategori", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nama, urutan: items.length * 10 }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
      };
      if (!res.ok || !json.ok) {
        throw new Error(json.message || res.statusText);
      }
      show({ type: "success", message: "Kategori ditambahkan ke daftar." });
      await loadItems();
    } catch (e) {
      show({
        type: "error",
        message: `Gagal tambah ke master: ${(e as Error).message}`,
      });
    } finally {
      setBusyId(null);
    }
  };

  const saveEdit = async (id: string) => {
    const nama = norm(editNama);
    if (!nama) {
      show({ type: "warning", message: "Nama tidak boleh kosong." });
      return;
    }
    setBusyId(id);
    try {
      const res = await fetch(
        `/api/master-tindakan-kategori/${encodeURIComponent(id)}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nama }),
        },
      );
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
      };
      if (!res.ok || !json.ok) {
        throw new Error(json.message || res.statusText);
      }
      show({ type: "success", message: "Nama diperbarui." });
      setEditingId(null);
      await loadItems();
    } catch (e) {
      show({
        type: "error",
        message: `Gagal ubah: ${(e as Error).message}`,
      });
    } finally {
      setBusyId(null);
    }
  };

  const removeMaster = async (id: string, nama: string) => {
    if (!window.confirm(`Hapus "${nama}" dari daftar master?`)) return;
    setBusyId(id);
    try {
      const res = await fetch(
        `/api/master-tindakan-kategori/${encodeURIComponent(id)}`,
        { method: "DELETE", credentials: "include" },
      );
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
      };
      if (!res.ok || !json.ok) {
        throw new Error(json.message || res.statusText);
      }
      show({ type: "success", message: "Dihapus dari daftar." });
      await loadItems();
    } catch (e) {
      show({
        type: "error",
        message: `Gagal hapus: ${(e as Error).message}`,
      });
    } finally {
      setBusyId(null);
    }
  };

  const addFromManage = async () => {
    const nama = norm(newNama);
    if (!nama) return;
    setBusyId("__new__");
    try {
      const res = await fetch("/api/master-tindakan-kategori", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nama, urutan: items.length * 10 }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
      };
      if (!res.ok || !json.ok) {
        throw new Error(json.message || res.statusText);
      }
      setNewNama("");
      show({ type: "success", message: "Ditambahkan." });
      await loadItems();
    } catch (e) {
      show({
        type: "error",
        message: (e as Error).message,
      });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-0 flex-1">
          <input
            className="mt-0.5 w-full rounded-md border border-cyan-900/50 bg-black/40 px-2 py-1.5 text-sm text-cyan-100 placeholder:text-gray-600 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
            list={listId}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => void saveKategoriRow(draft)}
            disabled={savingRow}
            placeholder="Pilih atau ketik kategori…"
            autoComplete="off"
          />
          <datalist id={listId}>
            {activeNames.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
        </div>
        <button
          type="button"
          title="Simpan teks ini ke daftar master"
          onClick={() => void addMasterFromDraft()}
          disabled={busyId !== null || savingRow}
          className="inline-flex shrink-0 items-center gap-1 rounded-md border border-cyan-700/40 bg-cyan-950/40 px-2 py-1.5 text-xs font-medium text-cyan-200 hover:bg-cyan-900/30 disabled:opacity-50"
        >
          <Plus size={14} />
          Master
        </button>
        <button
          type="button"
          onClick={() => {
            setManageOpen(true);
            void loadItems();
          }}
          className="inline-flex shrink-0 items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-xs font-medium text-gray-200 hover:bg-white/10"
        >
          Kelola daftar
        </button>
      </div>
      {savingRow ? (
        <p className="text-[11px] text-cyan-500/80">Menyimpan…</p>
      ) : loadingList && items.length === 0 ? (
        <p className="text-[11px] text-gray-500">Memuat saran…</p>
      ) : null}

      {manageOpen ? (
        <div
          className="fixed inset-0 z-[220] flex items-end justify-center p-3 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label="Kelola kategori master"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/75"
            aria-label="Tutup"
            onClick={() => {
              setManageOpen(false);
              setEditingId(null);
            }}
          />
          <div className="relative z-10 flex max-h-[min(70vh,520px)] w-full max-w-md flex-col overflow-hidden rounded-xl border border-cyan-500/35 bg-[#070d14] shadow-xl">
            <div className="border-b border-cyan-900/40 px-3 py-2">
              <p className="text-sm font-semibold text-cyan-100">
                Daftar kategori (master)
              </p>
              <p className="text-[11px] text-gray-500">
                Ubah / hapus entri di sini. Nilai pada kasus tidak ikut berubah
                otomatis.
              </p>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
              <ul className="space-y-1">
                {items.map((it) => (
                  <li
                    key={it.id}
                    className="flex items-center gap-1 rounded-lg border border-white/5 bg-black/25 px-2 py-1.5"
                  >
                    {editingId === it.id ? (
                      <>
                        <input
                          className="min-w-0 flex-1 rounded border border-cyan-800/50 bg-black/40 px-2 py-1 text-xs text-cyan-100"
                          value={editNama}
                          onChange={(e) => setEditNama(e.target.value)}
                        />
                        <button
                          type="button"
                          className="rounded border border-emerald-800/50 px-2 py-1 text-[11px] text-emerald-200 hover:bg-emerald-900/20 disabled:opacity-50"
                          disabled={busyId === it.id}
                          onClick={() => void saveEdit(it.id)}
                        >
                          Simpan
                        </button>
                        <button
                          type="button"
                          className="rounded px-2 py-1 text-[11px] text-gray-400 hover:bg-white/5"
                          onClick={() => setEditingId(null)}
                        >
                          Batal
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="min-w-0 flex-1 truncate text-xs text-cyan-100/95">
                          {it.nama}
                        </span>
                        <button
                          type="button"
                          title="Ubah nama"
                          className="shrink-0 rounded p-1 text-cyan-400 hover:bg-cyan-500/10 disabled:opacity-50"
                          disabled={busyId !== null}
                          onClick={() => {
                            setEditingId(it.id);
                            setEditNama(it.nama);
                          }}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          title="Hapus dari master"
                          className="shrink-0 rounded p-1 text-rose-400/90 hover:bg-rose-500/10 disabled:opacity-50"
                          disabled={busyId !== null}
                          onClick={() => void removeMaster(it.id, it.nama)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </li>
                ))}
              </ul>
              {items.length === 0 && !loadingList ? (
                <p className="px-2 py-4 text-center text-xs text-gray-500">
                  Belum ada data. Tambah di bawah.
                </p>
              ) : null}
            </div>
            <div className="border-t border-cyan-900/40 p-2">
              <p className="mb-1 text-[10px] uppercase tracking-wide text-gray-500">
                Tambah baru
              </p>
              <div className="flex gap-2">
                <input
                  className="min-w-0 flex-1 rounded-md border border-cyan-900/50 bg-black/40 px-2 py-1.5 text-xs text-cyan-100"
                  value={newNama}
                  onChange={(e) => setNewNama(e.target.value)}
                  placeholder="Nama kategori"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void addFromManage();
                    }
                  }}
                />
                <button
                  type="button"
                  className="shrink-0 rounded-md border border-cyan-600/40 bg-cyan-950/50 px-3 py-1.5 text-xs font-medium text-cyan-100 hover:bg-cyan-900/30 disabled:opacity-50"
                  disabled={busyId !== null}
                  onClick={() => void addFromManage()}
                >
                  Tambah
                </button>
              </div>
            </div>
            <div className="border-t border-white/5 p-2 text-right">
              <button
                type="button"
                className="rounded-md px-3 py-1.5 text-xs text-gray-300 hover:bg-white/5"
                onClick={() => {
                  setManageOpen(false);
                  setEditingId(null);
                }}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
