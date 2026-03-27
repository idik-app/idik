"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, PencilLine, RefreshCcw, Trash2, UserPlus, UserRound, X } from "lucide-react";

type AppUser = {
  id: string;
  username: string;
  role: string;
  created_at: string;
  updated_at: string;
};

async function fetchJsonWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit & { timeoutMs?: number } = {}
) {
  const { timeoutMs = 15000, ...rest } = init;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(input, { ...rest, signal: controller.signal });
    const json = await res.json().catch(() => ({}));
    return { res, json };
  } finally {
    clearTimeout(timeout);
  }
}

export default function PerawatHubPage() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [createUsername, setCreateUsername] = useState("");
  const [createPassword, setCreatePassword] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editUsername, setEditUsername] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const perawatUsers = useMemo(
    () => users.filter((u) => String(u.role).toLowerCase() === "perawat"),
    [users]
  );
  const filteredPerawat = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return perawatUsers;
    return perawatUsers.filter((u) => u.username.toLowerCase().includes(q));
  }, [perawatUsers, query]);

  async function loadUsers() {
    setLoading(true);
    setError(null);
    try {
      const { res, json } = await fetchJsonWithTimeout("/api/users", {
        cache: "no-store",
        timeoutMs: 15000,
      });
      if (!res.ok || !json.ok) {
        throw new Error(json?.message || "Gagal memuat data perawat");
      }
      setUsers((json.data ?? []) as AppUser[]);
    } catch (err: any) {
      const message =
        err?.name === "AbortError"
          ? "Request timeout saat memuat data perawat."
          : err?.message || "Gagal memuat data perawat.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadUsers();
  }, []);

  async function createPerawat() {
    setSubmitError(null);
    if (createUsername.trim().length < 3) {
      setSubmitError("Username wajib minimal 3 karakter.");
      return;
    }
    if (createPassword.length < 6) {
      setSubmitError("Password wajib minimal 6 karakter.");
      return;
    }
    setSaving(true);
    try {
      const { res, json } = await fetchJsonWithTimeout("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: createUsername.trim(),
          password: createPassword,
          role: "perawat",
        }),
        timeoutMs: 15000,
      });
      if (!res.ok || !json.ok) {
        throw new Error(json?.message || "Gagal menambah perawat");
      }
      setCreateOpen(false);
      setCreateUsername("");
      setCreatePassword("");
      await loadUsers();
    } catch (err: unknown) {
      const message =
        err instanceof Error && err.name === "AbortError"
          ? "Request timeout saat menambah perawat."
          : err instanceof Error
            ? err.message
            : "Gagal menambah perawat.";
      setSubmitError(message);
    } finally {
      setSaving(false);
    }
  }

  function openEdit(user: AppUser) {
    setSubmitError(null);
    setEditingId(user.id);
    setEditUsername(user.username);
    setEditPassword("");
  }

  function closeEdit() {
    setEditingId(null);
    setEditUsername("");
    setEditPassword("");
  }

  async function saveEdit() {
    if (!editingId) return;
    setSubmitError(null);
    if (editUsername.trim().length < 3) {
      setSubmitError("Username wajib minimal 3 karakter.");
      return;
    }
    const payload: { username: string; password?: string; role: "perawat" } = {
      username: editUsername.trim(),
      role: "perawat",
    };
    if (editPassword.length > 0) {
      if (editPassword.length < 6) {
        setSubmitError("Password baru minimal 6 karakter.");
        return;
      }
      payload.password = editPassword;
    }
    setSaving(true);
    try {
      const { res, json } = await fetchJsonWithTimeout(`/api/users/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        timeoutMs: 15000,
      });
      if (!res.ok || !json.ok) {
        throw new Error(json?.message || "Gagal update perawat");
      }
      closeEdit();
      await loadUsers();
    } catch (err: unknown) {
      const message =
        err instanceof Error && err.name === "AbortError"
          ? "Request timeout saat update perawat."
          : err instanceof Error
            ? err.message
            : "Gagal update perawat.";
      setSubmitError(message);
    } finally {
      setSaving(false);
    }
  }

  async function deletePerawat(id: string) {
    setSubmitError(null);
    setSaving(true);
    try {
      const { res, json } = await fetchJsonWithTimeout(`/api/users/${id}`, {
        method: "DELETE",
        timeoutMs: 15000,
      });
      if (!res.ok || !json.ok) {
        throw new Error(json?.message || "Gagal hapus perawat");
      }
      setConfirmDeleteId(null);
      await loadUsers();
    } catch (err: unknown) {
      const message =
        err instanceof Error && err.name === "AbortError"
          ? "Request timeout saat menghapus perawat."
          : err instanceof Error
            ? err.message
            : "Gagal menghapus perawat.";
      setSubmitError(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-full overflow-y-auto bg-gradient-to-br from-black via-gray-900 to-cyan-950 p-4 md:p-6 space-y-6">
      <header className="space-y-1 border-b border-cyan-500/20 pb-4">
        <p className="text-xs font-mono uppercase tracking-widest text-cyan-500/80">
          Cathlab · Perawat
        </p>
        <h1 className="text-2xl md:text-3xl font-semibold text-cyan-100 tracking-tight">
          Data Perawat
        </h1>
        <p className="text-sm text-cyan-200/70 max-w-2xl">Daftar akun user dengan role perawat.</p>
      </header>

      <div className="flex flex-wrap justify-between gap-2">
        <div className="relative">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari username perawat"
            className="w-56 rounded-lg border border-cyan-700/40 bg-gray-800/50 px-3 py-1.5 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/60"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCreateOpen((prev) => !prev)}
            className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-800/20 px-3 py-1.5 text-sm text-emerald-200 hover:bg-emerald-700/35 transition"
          >
            {createOpen ? <X size={14} /> : <UserPlus size={14} />}
            {createOpen ? "Tutup Form" : "Tambah Perawat"}
          </button>
          <button
            type="button"
            onClick={() => void loadUsers()}
            className="inline-flex items-center gap-2 rounded-lg border border-cyan-500/40 bg-cyan-800/20 px-3 py-1.5 text-sm text-cyan-200 hover:bg-cyan-700/35 transition"
          >
            <RefreshCcw size={14} />
            Refresh
          </button>
        </div>
      </div>

      {createOpen && (
        <section className="rounded-2xl border border-emerald-500/25 bg-black/35 backdrop-blur-sm p-4 md:p-5 shadow-[0_0_20px_rgba(16,185,129,0.08)] space-y-3">
          <h2 className="text-lg font-semibold text-emerald-200">Tambah Data Perawat</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              value={createUsername}
              onChange={(e) => setCreateUsername(e.target.value)}
              placeholder="Username perawat"
              className="rounded-lg border border-emerald-700/40 bg-gray-800/50 px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/60"
            />
            <input
              type="password"
              value={createPassword}
              onChange={(e) => setCreatePassword(e.target.value)}
              placeholder="Password (min 6 karakter)"
              className="rounded-lg border border-emerald-700/40 bg-gray-800/50 px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/60"
            />
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => void createPerawat()}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-700/40 px-3 py-2 text-sm text-emerald-100 hover:bg-emerald-600/60 transition disabled:opacity-50"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              Simpan Perawat
            </button>
          </div>
        </section>
      )}

      {submitError && <div className="text-sm text-red-300">{submitError}</div>}

      <section className="rounded-2xl border border-cyan-500/25 bg-black/35 backdrop-blur-sm p-4 md:p-5 shadow-[0_0_20px_rgba(0,255,255,0.08)]">
        {loading ? (
          <div className="py-10 flex items-center justify-center gap-2 text-cyan-300">
            <Loader2 size={18} className="animate-spin" />
            Memuat data perawat...
          </div>
        ) : error ? (
          <div className="py-8 text-center text-red-300">{error}</div>
        ) : filteredPerawat.length === 0 ? (
          <div className="py-10 text-center text-cyan-200/75">Belum ada data perawat.</div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-cyan-700/40 bg-black/20">
            <table className="w-full text-sm border-collapse">
              <thead className="sticky top-0 bg-black/60 text-yellow-400 backdrop-blur-sm">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Username</th>
                  <th className="px-3 py-2 text-left font-medium">Role</th>
                  <th className="px-3 py-2 text-left font-medium">Dibuat</th>
                  <th className="px-3 py-2 text-left font-medium">Diperbarui</th>
                  <th className="px-3 py-2 text-center font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredPerawat.map((user) => (
                  <tr key={user.id} className="border-t border-cyan-600/20 hover:bg-cyan-400/10">
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center gap-2">
                        <UserRound size={15} className="text-cyan-400" />
                        {user.username}
                      </span>
                    </td>
                    <td className="px-3 py-2 capitalize">{user.role}</td>
                    <td className="px-3 py-2 text-gray-300/85">
                      {user.created_at
                        ? new Date(user.created_at).toLocaleString("id-ID")
                        : "-"}
                    </td>
                    <td className="px-3 py-2 text-gray-300/85">
                      {user.updated_at
                        ? new Date(user.updated_at).toLocaleString("id-ID")
                        : "-"}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(user)}
                          className="rounded-md border border-cyan-500/40 p-1.5 text-cyan-300 hover:bg-cyan-500/10"
                          title="Edit"
                        >
                          <PencilLine size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(user.id)}
                          className="rounded-md border border-red-500/40 p-1.5 text-red-300 hover:bg-red-500/10"
                          title="Hapus"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {editingId && (
        <section className="rounded-2xl border border-cyan-500/25 bg-black/35 backdrop-blur-sm p-4 md:p-5 shadow-[0_0_20px_rgba(0,255,255,0.08)] space-y-3">
          <h2 className="text-lg font-semibold text-cyan-100">Edit Data Perawat</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              value={editUsername}
              onChange={(e) => setEditUsername(e.target.value)}
              placeholder="Username perawat"
              className="rounded-lg border border-cyan-700/40 bg-gray-800/50 px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/60"
            />
            <input
              type="password"
              value={editPassword}
              onChange={(e) => setEditPassword(e.target.value)}
              placeholder="Password baru (opsional)"
              className="rounded-lg border border-cyan-700/40 bg-gray-800/50 px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/60"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={closeEdit}
              className="rounded-lg border border-gray-600 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700/50"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={() => void saveEdit()}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg border border-cyan-500/40 bg-cyan-700/40 px-3 py-2 text-sm text-cyan-100 hover:bg-cyan-600/60 transition disabled:opacity-50"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              Simpan Perubahan
            </button>
          </div>
        </section>
      )}

      {confirmDeleteId && (
        <section className="rounded-2xl border border-red-500/25 bg-black/35 backdrop-blur-sm p-4 md:p-5 shadow-[0_0_20px_rgba(239,68,68,0.08)]">
          <p className="text-red-200">
            Hapus data perawat ini? Tindakan ini tidak bisa dibatalkan.
          </p>
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setConfirmDeleteId(null)}
              className="rounded-lg border border-gray-600 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700/50"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={() => void deletePerawat(confirmDeleteId)}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-700/40 px-3 py-2 text-sm text-red-100 hover:bg-red-600/60 transition disabled:opacity-50"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              Hapus
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
