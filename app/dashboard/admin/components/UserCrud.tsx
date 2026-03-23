"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import {
  Loader2,
  PencilLine,
  Search,
  ShieldCheck,
  Trash2,
  UserPlus,
} from "lucide-react";
// Note: modal/dialog dirender via portal agar tidak ke-clip oleh layout tab.

const ROLE_OPTIONS = [
  "pasien",
  "dokter",
  "perawat",
  "it",
  "radiografer",
  "casemix",
  "admin",
  "administrator",
  "superadmin",
  "distributor",
  "depo_farmasi",
] as const;

const ROLES_REQUIRE_DISTRIBUTOR = new Set(["distributor"]);

type AppUser = {
  id: string;
  username: string;
  role: string;
  distributor_id: string | null;
  distributor_nama_pt?: string | null;
  created_at: string;
  updated_at: string;
};

type Distributor = {
  id: string;
  nama_pt?: string | null;
  is_active?: boolean | null;
};

async function fetchJsonWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit & { timeoutMs?: number } = {}
) {
  const { timeoutMs = 15000, ...rest } = init;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(input, { ...rest, signal: controller.signal });
    const json = await res.json().catch(() => ({}));
    return { res, json };
  } finally {
    clearTimeout(t);
  }
}

export default function UserCrud() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const [query, setQuery] = useState("");

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);

  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [distributorsLoading, setDistributorsLoading] = useState(false);

  const [form, setForm] = useState<{
    username: string;
    password: string;
    role: (typeof ROLE_OPTIONS)[number];
    distributorId: string | null;
    distributorNamaBaru: string;
  }>({
    username: "",
    password: "",
    role: "pasien",
    distributorId: null,
    distributorNamaBaru: "",
  });

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      return (
        u.username.toLowerCase().includes(q) ||
        String(u.role).toLowerCase().includes(q) ||
        (u.distributor_id ?? "").toLowerCase().includes(q) ||
        (u.distributor_nama_pt ?? "").toLowerCase().includes(q)
      );
    });
  }, [users, query]);

  async function fetchUsers() {
    setLoading(true);
    setError(null);
    try {
      const { res, json } = await fetchJsonWithTimeout("/api/users", {
        cache: "no-store",
        timeoutMs: 15000,
      });
      if (!res.ok || !json.ok) throw new Error(json?.message || "Fetch failed");
      setUsers((json.data ?? []) as AppUser[]);
    } catch (e: any) {
      const msg =
        e?.name === "AbortError"
          ? "Request timeout saat memuat user (cek koneksi/server)."
          : e?.message || "Failed to load users";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function fetchDistributorsIfNeeded() {
    if (distributors.length > 0) return;
    setDistributorsLoading(true);
    try {
      const { res, json } = await fetchJsonWithTimeout(
        "/api/distributor/distributors",
        { cache: "no-store", timeoutMs: 15000 }
      );
      if (!res.ok || !json.ok) throw new Error(json?.message || "Failed to fetch distributors");
      setDistributors((json.data ?? []) as Distributor[]);
    } catch {
      // silent: distributor list is optional if tenant role not chosen
      setDistributors([]);
    } finally {
      setDistributorsLoading(false);
    }
  }

  function resetFormForCreate() {
    setForm({
      username: "",
      password: "",
      role: "pasien",
      distributorId: null,
      distributorNamaBaru: "",
    });
  }

  function resetFormForEdit(u: AppUser) {
    setEditingUser(u);
    setForm({
      username: u.username,
      password: "",
      role: u.role as any,
      distributorId: u.distributor_id ?? null,
      distributorNamaBaru: "",
    });
  }

  function openCreateModal() {
    setModalMode("create");
    setEditingUser(null);
    resetFormForCreate();
    setSubmitError(null);
    setModalOpen(true);
  }

  function openEditModal(u: AppUser) {
    setModalMode("edit");
    setSubmitError(null);
    resetFormForEdit(u);
    setModalOpen(true);
  }

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (modalOpen) setModalOpen(false);
      if (confirmDeleteId) setConfirmDeleteId(null);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mounted, modalOpen, confirmDeleteId]);

  useEffect(() => {
    if (!modalOpen) return;
    // fetch distributor options lazily when modal is opened
    fetchDistributorsIfNeeded();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalOpen]);

  useEffect(() => {
    // role changed: if not tenant role, clear distributorId
    if (!ROLES_REQUIRE_DISTRIBUTOR.has(form.role)) {
      setForm((prev) => ({
        ...prev,
        distributorId: null,
        distributorNamaBaru: "",
      }));
    }
  }, [form.role]);

  async function submitCreateOrEdit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    const requiresDistributor = ROLES_REQUIRE_DISTRIBUTOR.has(form.role);
    if (modalMode === "create") {
      if (!form.username.trim()) {
        return setSubmitError("username wajib");
      }
      if (!form.password || form.password.length < 6) {
        return setSubmitError("password wajib (min 6 karakter)");
      }
      const hasNamaBaru = form.distributorNamaBaru.trim().length > 0;
      if (requiresDistributor && !hasNamaBaru && !form.distributorId) {
        return setSubmitError("distributor wajib: isi nama PT baru atau pilih dari daftar");
      }
    }

    if (modalMode === "edit") {
      const hasNamaBaru = form.distributorNamaBaru.trim().length > 0;
      if (requiresDistributor && !hasNamaBaru && form.distributorId === null) {
        return setSubmitError("distributor wajib: isi nama PT baru atau pilih dari daftar");
      }
    }

    setSaving(true);
    try {
      if (modalMode === "create") {
        const namaBaru = form.distributorNamaBaru.trim();
        const { res, json } = await fetchJsonWithTimeout("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: form.username.trim(),
            password: form.password,
            role: form.role,
            distributor_id:
              requiresDistributor && !namaBaru ? form.distributorId : null,
            ...(requiresDistributor && namaBaru
              ? { distributor_nama_pt: namaBaru }
              : {}),
          }),
          timeoutMs: 15000,
        });
        if (!res.ok || !json.ok) throw new Error(json?.message || "Create failed");
      } else if (modalMode === "edit" && editingUser) {
        const namaBaru = form.distributorNamaBaru.trim();
        const updatePayload: Record<string, unknown> = {
          role: form.role,
        };
        if (requiresDistributor) {
          if (namaBaru) {
            updatePayload.distributor_nama_pt = namaBaru;
          } else {
            updatePayload.distributor_id = form.distributorId;
          }
        }
        if (form.password && form.password.length >= 6) {
          updatePayload.password = form.password;
        }

        const { res, json } = await fetchJsonWithTimeout(
          `/api/users/${editingUser.id}`,
          {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatePayload),
          timeoutMs: 15000,
          }
        );
        if (!res.ok || !json.ok) throw new Error(json?.message || "Update failed");
      }

      setModalOpen(false);
      await fetchUsers();
    } catch (err: any) {
      const msg =
        err?.name === "AbortError"
          ? "Request timeout saat menyimpan (cek koneksi/server)."
          : err?.message || "Gagal menyimpan data";
      setSubmitError(msg);
    } finally {
      setSaving(false);
    }
  }

  async function deleteUser(id: string) {
    try {
      const { res, json } = await fetchJsonWithTimeout(`/api/users/${id}`, {
        method: "DELETE",
        cache: "no-store",
        timeoutMs: 15000,
      });
      if (!res.ok || !json.ok) throw new Error(json?.message || "Delete failed");
      setConfirmDeleteId(null);
      await fetchUsers();
    } catch (err: any) {
      setConfirmDeleteId(null);
      const msg =
        err?.name === "AbortError"
          ? "Request timeout saat menghapus (cek koneksi/server)."
          : err?.message || "Gagal menghapus";
      setSubmitError(msg);
    }
  }

  const distributorById = useMemo(() => {
    const m = new Map<string, Distributor>();
    for (const d of distributors) m.set(d.id, d);
    return m;
  }, [distributors]);

  const userToDelete = useMemo(() => {
    if (!confirmDeleteId) return null;
    return users.find((u) => u.id === confirmDeleteId) ?? null;
  }, [users, confirmDeleteId]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-gray-200 border border-cyan-700/30 rounded-2xl shadow-lg shadow-cyan-900/40 backdrop-blur-sm p-4"
    >
      <div className="flex items-center justify-between mb-4 gap-3">
        <h2 className="text-2xl font-semibold text-cyan-400 flex items-center gap-2">
          <ShieldCheck size={20} /> Manajemen User
        </h2>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-300/70"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari username / role"
              className="pl-9 pr-3 py-1.5 rounded-lg bg-gray-800/60 border border-cyan-700/40 text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/60"
            />
          </div>

          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-3 py-1.5 bg-cyan-600/30 hover:bg-cyan-600/50 rounded-lg text-cyan-200 border border-cyan-500/40 transition-all"
          >
            <UserPlus size={16} />
            <span>Tambah</span>
          </button>
        </div>
      </div>

      {loading && (
        <div className="py-10 flex items-center justify-center gap-3 text-cyan-300">
          <Loader2 size={18} className="animate-spin" />
          Memuat user...
        </div>
      )}

      {error && !loading && (
        <div className="text-center py-10 text-red-400">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="overflow-x-auto rounded-xl border border-cyan-700/40 bg-black/20">
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 bg-black/60 text-yellow-400 backdrop-blur-sm">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Username</th>
                <th className="px-3 py-2 text-left font-medium">Role</th>
                <th className="px-3 py-2 text-left font-medium">Distributor</th>
                <th className="px-3 py-2 text-left font-medium">Created</th>
                <th className="px-3 py-2 text-center font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-cyan-300">
                    Tidak ada data.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const dist = u.distributor_id ? distributorById.get(u.distributor_id) : null;
                  const distLabel =
                    u.distributor_nama_pt ||
                    dist?.nama_pt ||
                    (u.distributor_id ?? "-");
                  return (
                    <tr
                      key={u.id}
                      className="border-t border-cyan-600/20 hover:bg-cyan-400/10 transition cursor-pointer"
                      onClick={() => openEditModal(u)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") openEditModal(u);
                      }}
                      tabIndex={0}
                      role="button"
                      aria-label={`Edit user ${u.username}`}
                    >
                      <td className="px-3 py-2">{u.username}</td>
                      <td className="px-3 py-2">{u.role}</td>
                      <td className="px-3 py-2">{distLabel}</td>
                      <td className="px-3 py-2 text-gray-300/80">
                        {u.created_at ? new Date(u.created_at).toLocaleDateString("id-ID") : "-"}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditModal(u);
                            }}
                            className="p-1.5 rounded-md border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10 transition"
                            title="Edit"
                          >
                            <PencilLine size={16} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDeleteId(u.id);
                            }}
                            className="p-1.5 rounded-md border border-red-500/40 text-red-400 hover:bg-red-500/10 transition"
                            title="Hapus"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {mounted && confirmDeleteId
        ? createPortal(
            <div
              className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-[9999]"
              onMouseDown={(e) => {
                if (e.target === e.currentTarget) setConfirmDeleteId(null);
              }}
              role="presentation"
            >
              <div
                className="bg-gray-900 border border-cyan-700/50 rounded-xl p-6 text-center shadow-xl text-gray-200 w-full max-w-sm"
                onMouseDown={(e) => e.stopPropagation()}
              >
                <p className="mb-2 text-cyan-300 text-base">
                  Hapus user{" "}
                  <span className="font-semibold text-yellow-300">
                    {userToDelete?.username ?? "ini"}
                  </span>
                  ?
                </p>
                {userToDelete && (
                  <p className="mb-5 text-sm text-gray-200/90">
                    role: <span className="text-gray-100">{userToDelete.role}</span>
                    {userToDelete.distributor_id ? (
                      <>
                        {" "}
                        • distributor:{" "}
                        <span className="text-gray-100">
                          {userToDelete.distributor_nama_pt ??
                            distributorById.get(userToDelete.distributor_id)?.nama_pt ??
                            userToDelete.distributor_id}
                        </span>
                      </>
                    ) : null}
                  </p>
                )}
                <div className="flex justify-center gap-4">
                  <button
                    onClick={() => deleteUser(confirmDeleteId)}
                    className="px-4 py-1.5 rounded-md bg-red-600/70 hover:bg-red-700 text-white"
                  >
                    Hapus
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(null)}
                    className="px-4 py-1.5 rounded-md bg-gray-700 hover:bg-gray-600 text-gray-300"
                  >
                    Batal
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}

      {mounted && modalOpen
        ? createPortal(
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999]"
              onMouseDown={(e) => {
                if (e.target === e.currentTarget) setModalOpen(false);
              }}
              role="presentation"
            >
              <motion.div
                initial={{ opacity: 0, y: -18 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-lg bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border border-cyan-700/40 rounded-2xl shadow-lg shadow-cyan-900/40 p-6 text-gray-200"
                onMouseDown={(e) => e.stopPropagation()}
              >
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold text-cyan-400">
                    {modalMode === "create" ? "Tambah User" : "Edit User"}
                  </h3>
                  <button
                    onClick={() => setModalOpen(false)}
                    className="text-gray-400 hover:text-cyan-300 transition-colors"
                    title="Tutup"
                  >
                    X
                  </button>
                </div>

                <form onSubmit={submitCreateOrEdit} className="space-y-4">
                  <div>
                    <label className="block text-sm mb-1 text-cyan-300">
                      Username
                    </label>
                    <input
                      value={form.username}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, username: e.target.value }))
                      }
                      disabled={modalMode === "edit"}
                      className="w-full bg-gray-800/60 border border-cyan-700/40 rounded-lg px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/60 disabled:opacity-70"
                    />
                  </div>

                  <div>
                    <label className="block text-sm mb-1 text-cyan-300">
                      {modalMode === "create" ? "Password" : "Password (opsional)"}
                    </label>
                    <input
                      type="password"
                      value={form.password}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, password: e.target.value }))
                      }
                      className="w-full bg-gray-800/60 border border-cyan-700/40 rounded-lg px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/60"
                      placeholder={
                        modalMode === "edit"
                          ? "Kosongkan jika tidak mengubah password"
                          : ""
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-sm mb-1 text-cyan-300">Role</label>
                    <select
                      value={form.role}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, role: e.target.value as any }))
                      }
                      className="w-full bg-gray-800/60 border border-cyan-700/40 rounded-lg px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/60"
                    >
                      {ROLE_OPTIONS.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>

              {ROLES_REQUIRE_DISTRIBUTOR.has(form.role) && (
                    <>
                      <div>
                        <label className="block text-sm mb-1 text-cyan-300">
                          Nama PT distributor (baru)
                        </label>
                        <input
                          type="text"
                          value={form.distributorNamaBaru}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              distributorNamaBaru: e.target.value,
                            }))
                          }
                          placeholder="Isi untuk membuat distributor baru di master_distributor"
                          className="w-full bg-gray-800/60 border border-cyan-700/40 rounded-lg px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/60"
                        />
                        <p className="mt-1 text-xs text-gray-400">
                          Jika diisi, nama disimpan ke database sebagai PT baru dan dipakai untuk user ini.
                          Kosongkan jika ingin memilih yang sudah ada.
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm mb-1 text-cyan-300">
                          Atau pilih distributor
                        </label>
                        <select
                          value={form.distributorId ?? ""}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              distributorId: e.target.value || null,
                            }))
                          }
                          className="w-full bg-gray-800/60 border border-cyan-700/40 rounded-lg px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/60"
                          disabled={distributorsLoading || !!form.distributorNamaBaru.trim()}
                        >
                          <option value="">
                            {distributorsLoading ? "Memuat distributor..." : "Pilih distributor"}
                          </option>
                          {distributors.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.nama_pt || d.id}
                            </option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}

                  {submitError && (
                    <p className="text-red-400 text-sm text-center">{submitError}</p>
                  )}

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setModalOpen(false)}
                      className="px-4 py-2 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-700/60 transition-all"
                      disabled={saving}
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-4 py-2 rounded-lg border border-cyan-500/40 bg-cyan-700/40 hover:bg-cyan-600/60 text-cyan-100 flex items-center gap-2 transition-all disabled:opacity-50"
                    >
                      {saving && <Loader2 size={16} className="animate-spin" />}
                      {modalMode === "create" ? "Simpan" : "Update"}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>,
            document.body
          )
        : null}
    </motion.div>
  );
}

