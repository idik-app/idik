"use client";

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useNotification } from "@/app/contexts/NotificationContext";
import { cn } from "@/lib/utils";
import { UI_LAYERS } from "@/lib/ui/layers";

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
            className={cn(
              "mt-0.5 w-full rounded-md border px-2 py-1.5 text-sm font-semibold focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30",
              "border-cyan-400/55 bg-white text-slate-950 placeholder:text-slate-500 dark:border-cyan-900/50 dark:bg-black/40 dark:text-white dark:placeholder:text-white/90",
            )}
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
          className={cn(
            "inline-flex shrink-0 items-center gap-1 rounded-md border px-2 py-1.5 text-xs font-semibold disabled:opacity-50",
          "border-cyan-600/45 bg-cyan-100 text-cyan-900 hover:bg-cyan-200/80 dark:border-cyan-700/40 dark:bg-cyan-950/40 dark:text-white dark:hover:bg-cyan-900/30",
          )}
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
          className={cn(
            "inline-flex shrink-0 items-center gap-1 rounded-md border px-2 py-1.5 text-xs font-semibold",
            "border-slate-300 bg-slate-100 text-slate-800 hover:bg-slate-200/90 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10",
          )}
        >
          Kelola daftar
        </button>
      </div>
      {savingRow ? (
        <p
          className={cn(
            "text-[11px] font-medium",
            "text-cyan-700 dark:text-white",
          )}
        >
          Menyimpan…
        </p>
      ) : loadingList && items.length === 0 ? (
        <p
          className={cn(
            "text-[11px]",
            "text-slate-600 dark:text-white",
          )}
        >
          Memuat saran…
        </p>
      ) : null}

      {manageOpen ? (
        <div
          className={`fixed inset-0 ${UI_LAYERS.modalManager} flex items-end justify-center p-3 sm:items-center`}
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
          <div
            className={cn(
              "relative z-10 flex max-h-[min(70vh,520px)] w-full max-w-md flex-col overflow-hidden rounded-xl border shadow-xl",
              "border-slate-200 bg-white dark:border-cyan-500/35 dark:bg-[#070d14]",
            )}
          >
            <div
              className={cn(
                "border-b px-3 py-2",
                "border-slate-200 dark:border-cyan-900/40",
              )}
            >
              <p
                className={cn(
                  "text-sm font-semibold",
                  "text-slate-900 dark:text-white",
                )}
              >
                Daftar kategori (master)
              </p>
              <p
                className={cn(
                  "text-[11px]",
                  "text-slate-600 dark:text-white",
                )}
              >
                Ubah / hapus entri di sini. Nilai pada kasus tidak ikut berubah
                otomatis.
              </p>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
              <ul className="space-y-1">
                {items.map((it) => (
                  <li
                    key={it.id}
                    className={cn(
                      "flex items-center gap-1 rounded-lg border px-2 py-1.5",
                  "border-slate-200 bg-slate-50 dark:border-white/5 dark:bg-black/25",
                    )}
                  >
                    {editingId === it.id ? (
                      <>
                        <input
                          className={cn(
                            "min-w-0 flex-1 rounded border px-2 py-1 text-xs font-semibold",
                            "border-cyan-400/55 bg-white text-slate-950 dark:border-cyan-800/50 dark:bg-black/40 dark:text-white",
                          )}
                          value={editNama}
                          onChange={(e) => setEditNama(e.target.value)}
                        />
                        <button
                          type="button"
                          className={cn(
                            "rounded border px-2 py-1 text-[11px] font-medium disabled:opacity-50",
                            "border-emerald-600/40 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800/50 dark:text-white dark:hover:bg-emerald-900/20",
                          )}
                          disabled={busyId === it.id}
                          onClick={() => void saveEdit(it.id)}
                        >
                          Simpan
                        </button>
                        <button
                          type="button"
                          className={cn(
                            "rounded px-2 py-1 text-[11px] font-medium",
                            "text-slate-600 hover:bg-slate-200/80 dark:text-white/90 dark:hover:bg-white/5",
                          )}
                          onClick={() => setEditingId(null)}
                        >
                          Batal
                        </button>
                      </>
                    ) : (
                      <>
                        <span
                          className={cn(
                            "min-w-0 flex-1 truncate text-xs font-medium",
                            "text-slate-900 dark:text-white",
                          )}
                        >
                          {it.nama}
                        </span>
                        <button
                          type="button"
                          title="Ubah nama"
                          className={cn(
                            "shrink-0 rounded p-1 disabled:opacity-50",
                            "text-cyan-700 hover:bg-cyan-100 dark:text-white dark:hover:bg-cyan-500/10",
                          )}
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
                          className={cn(
                            "shrink-0 rounded p-1 disabled:opacity-50",
                            "text-rose-600 hover:bg-rose-100 dark:text-rose-200 dark:hover:bg-rose-500/10",
                          )}
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
                <p
                  className={cn(
                    "px-2 py-4 text-center text-xs",
                    "text-slate-600 dark:text-white",
                  )}
                >
                  Belum ada data. Tambah di bawah.
                </p>
              ) : null}
            </div>
            <div
              className={cn(
                "border-t p-2",
                "border-slate-200 dark:border-cyan-900/40",
              )}
            >
              <p
                className={cn(
                  "mb-1 text-[10px] font-semibold uppercase tracking-wide",
                    "text-slate-500 dark:text-white/90",
                )}
              >
                Tambah baru
              </p>
              <div className="flex gap-2">
                <input
                  className={cn(
                    "min-w-0 flex-1 rounded-md border px-2 py-1.5 text-xs font-semibold",
                    "border-cyan-400/55 bg-white text-slate-950 placeholder:text-slate-500 dark:border-cyan-900/50 dark:bg-black/40 dark:text-white",
                  )}
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
                  className={cn(
                    "shrink-0 rounded-md border px-3 py-1.5 text-xs font-semibold disabled:opacity-50",
                    "border-cyan-600/50 bg-cyan-600 text-white hover:bg-cyan-700 dark:border-cyan-600/40 dark:bg-cyan-950/50 dark:text-white dark:hover:bg-cyan-900/30",
                  )}
                  disabled={busyId !== null}
                  onClick={() => void addFromManage()}
                >
                  Tambah
                </button>
              </div>
            </div>
            <div
              className={cn(
                "border-t p-2 text-right",
                "border-slate-200 dark:border-white/5",
              )}
            >
              <button
                type="button"
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium",
                  "text-slate-700 hover:bg-slate-100 dark:text-white dark:hover:bg-white/5",
                )}
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
