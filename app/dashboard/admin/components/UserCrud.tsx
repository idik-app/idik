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
import { UI_LAYERS } from "@/lib/ui/layers";
// Note: modal/dialog dirender via portal agar tidak ke-clip oleh layout tab.

const ROLE_OPTIONS = [
  "pasien",
  "dokter",
  "perawat",
  "cathlab",
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
  ruangan_id: string | null;
  ruangan_slug?: string | null;
  ruangan_nama?: string | null;
  distributor_nama_pt?: string | null;
  distributor_is_konsolidasi?: boolean | null;
  created_at: string;
  updated_at: string;
};

type RuanganOpt = {
  id: string;
  nama: string;
  slug: string | null;
};

type Distributor = {
  id: string;
  nama_pt?: string | null;
  is_active?: boolean | null;
  is_konsolidasi?: boolean | null;
};

async function fetchJsonWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit & { timeoutMs?: number } = {},
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

  const [ruanganList, setRuanganList] = useState<RuanganOpt[]>([]);
  const [ruanganLoading, setRuanganLoading] = useState(false);
  /** false = hanya ruangan yang sudah punya slug (default, daftar lebih pendek). */
  const [ruanganPickerShowAll, setRuanganPickerShowAll] = useState(false);

  const [form, setForm] = useState<{
    username: string;
    password: string;
    role: (typeof ROLE_OPTIONS)[number];
    distributorId: string | null;
    distributorNamaBaru: string;
    distributorIsKonsolidasi: boolean;
    isEditingExistingDistributor: boolean;
    ruanganId: string | null;
  }>({
    username: "",
    password: "",
    role: "pasien",
    distributorId: null,
    distributorNamaBaru: "",
    distributorIsKonsolidasi: false,
    isEditingExistingDistributor: false,
    ruanganId: null,
  });

  const distributorById = useMemo(() => {
    const m = new Map<string, Distributor>();
    for (const d of distributors) m.set(d.id, d);
    return m;
  }, [distributors]);

  const selectedRuanganOpt = useMemo(() => {
    if (!form.ruanganId) return null;
    return ruanganList.find((r) => r.id === form.ruanganId) ?? null;
  }, [form.ruanganId, ruanganList]);

  /** Opsi dropdown: default hanya yang punya slug; saat edit, sertakan unit terpilih walau belum slug. */
  const ruanganPickerOptions = useMemo(() => {
    const byName = (a: RuanganOpt, b: RuanganOpt) =>
      a.nama.localeCompare(b.nama, "id", { sensitivity: "base" });

    if (ruanganPickerShowAll) {
      return [...ruanganList].sort(byName);
    }

    const withSlug = ruanganList.filter((r) => r.slug && r.slug.trim());
    const sorted = [...withSlug].sort(byName);
    const idSet = new Set(sorted.map((r) => r.id));
    if (form.ruanganId && !idSet.has(form.ruanganId)) {
      const orphan = ruanganList.find((r) => r.id === form.ruanganId);
      if (orphan) return [orphan, ...sorted];
    }
    return sorted;
  }, [ruanganList, ruanganPickerShowAll, form.ruanganId]);

  const ruanganWithSlugCount = useMemo(
    () => ruanganList.filter((r) => r.slug && r.slug.trim()).length,
    [ruanganList],
  );

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      return (
        u.username.toLowerCase().includes(q) ||
        String(u.role).toLowerCase().includes(q) ||
        (u.distributor_id ?? "").toLowerCase().includes(q) ||
        (u.distributor_nama_pt ?? "").toLowerCase().includes(q) ||
        (u.ruangan_slug ?? "").toLowerCase().includes(q) ||
        (u.ruangan_nama ?? "").toLowerCase().includes(q)
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
        { cache: "no-store", timeoutMs: 15000 },
      );
      if (!res.ok || !json.ok)
        throw new Error(json?.message || "Failed to fetch distributors");
      setDistributors((json.data ?? []) as Distributor[]);
    } catch {
      // silent: distributor list is optional if tenant role not chosen
      setDistributors([]);
    } finally {
      setDistributorsLoading(false);
    }
  }

  async function fetchRuanganIfNeeded() {
    if (ruanganList.length > 0) return;
    setRuanganLoading(true);
    try {
      const { res, json } = await fetchJsonWithTimeout("/api/ruangan", {
        cache: "no-store",
        timeoutMs: 15000,
      });
      if (!res.ok || !json.ok)
        throw new Error(json?.message || "Failed to fetch ruangan");
      const rows = (json.ruangan ?? []) as Array<{
        id: string;
        nama?: string | null;
        slug?: string | null;
      }>;
      setRuanganList(
        rows.map((r) => ({
          id: String(r.id),
          nama: String(r.nama ?? "").trim(),
          slug:
            r.slug != null && String(r.slug).trim()
              ? String(r.slug).trim()
              : null,
        })),
      );
    } catch {
      setRuanganList([]);
    } finally {
      setRuanganLoading(false);
    }
  }

  function resetFormForCreate() {
    setForm({
      username: "",
      password: "",
      role: "pasien",
      distributorId: null,
      distributorNamaBaru: "",
      distributorIsKonsolidasi: false,
      isEditingExistingDistributor: false,
      ruanganId: null,
    });
  }

  function resetFormForEdit(u: AppUser) {
    setEditingUser(u);
    const dist = u.distributor_id
      ? distributorById.get(u.distributor_id)
      : null;
    setForm({
      username: u.username,
      password: "",
      role: u.role as any,
      distributorId: u.distributor_id ?? null,
      distributorNamaBaru: "",
      distributorIsKonsolidasi:
        u.distributor_is_konsolidasi ?? dist?.is_konsolidasi ?? false,
      isEditingExistingDistributor: false,
      ruanganId: u.ruangan_id ?? null,
    });
  }

  function openCreateModal() {
    setModalMode("create");
    setEditingUser(null);
    resetFormForCreate();
    setRuanganPickerShowAll(false);
    setSubmitError(null);
    setModalOpen(true);
  }

  function openEditModal(u: AppUser) {
    setModalMode("edit");
    setRuanganPickerShowAll(false);
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
    fetchRuanganIfNeeded();
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
        return setSubmitError(
          "distributor wajib: isi nama PT baru atau pilih dari daftar",
        );
      }
    }

    if (modalMode === "edit") {
      if (!form.username.trim()) {
        return setSubmitError("username wajib");
      }
      if (form.username.trim().length < 3) {
        return setSubmitError("username minimal 3 karakter");
      }
      const hasNamaBaru = form.distributorNamaBaru.trim().length > 0;
      if (requiresDistributor && !hasNamaBaru && form.distributorId === null) {
        return setSubmitError(
          "distributor wajib: isi nama PT baru atau pilih dari daftar",
        );
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
            distributor_is_konsolidasi: form.distributorIsKonsolidasi,
            ruangan_id: form.ruanganId,
            ...(requiresDistributor && namaBaru
              ? {
                  distributor_nama_pt: namaBaru,
                }
              : {}),
          }),
          timeoutMs: 15000,
        });
        if (!res.ok || !json.ok)
          throw new Error(json?.message || "Create failed");
      } else if (modalMode === "edit" && editingUser) {
        const namaBaru = form.distributorNamaBaru.trim();
        const updatePayload: Record<string, unknown> = {
          role: form.role,
          distributor_is_konsolidasi: form.distributorIsKonsolidasi,
          ruangan_id: form.ruanganId,
        };
        const needsDist = ROLES_REQUIRE_DISTRIBUTOR.has(form.role);
        if (needsDist) {
          if (namaBaru) {
            updatePayload.distributor_nama_pt = namaBaru;
            // Jika sedang edit PT yang sudah ada, sertakan ID-nya agar API tahu mana yang diupdate
            if (form.isEditingExistingDistributor && form.distributorId) {
              updatePayload.distributor_id = form.distributorId;
            }
          } else {
            updatePayload.distributor_id = form.distributorId;
          }
        } else {
          // Jika role bukan distributor, pastikan distributor_id dihapus
          updatePayload.distributor_id = null;
        }
        if (form.password && form.password.length >= 6) {
          updatePayload.password = form.password;
        }
        const trimmedUsername = form.username.trim();
        if (trimmedUsername !== editingUser.username) {
          updatePayload.username = trimmedUsername;
        }

        const { res, json } = await fetchJsonWithTimeout(
          `/api/users/${editingUser.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updatePayload),
            timeoutMs: 15000,
          },
        );
        if (!res.ok || !json.ok)
          throw new Error(json?.message || "Update failed");
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
      if (!res.ok || !json.ok)
        throw new Error(json?.message || "Delete failed");
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

  const userToDelete = useMemo(() => {
    if (!confirmDeleteId) return null;
    return users.find((u) => u.id === confirmDeleteId) ?? null;
  }, [users, confirmDeleteId]);

  const uniqueDistributors = useMemo(() => {
    const uniqueMap = new Map<string, Distributor>();
    const stripPt = (s: string) =>
      s
        .toUpperCase()
        .replace(/^PT\.?\s*/u, "")
        .replace(/\s+/g, " ")
        .trim();

    for (const d of distributors) {
      const name = d.nama_pt || d.id;
      const key = stripPt(name);
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, d);
      } else {
        // Prioritaskan yang UPPERCASE jika ada duplikat
        const existing = uniqueMap.get(key)!;
        const existingName = existing.nama_pt || existing.id;
        if (
          name === name.toUpperCase() &&
          existingName !== existingName.toUpperCase()
        ) {
          uniqueMap.set(key, d);
        }
      }
    }
    return Array.from(uniqueMap.values())
      .map((d) => ({
        ...d,
        nama_pt: d.nama_pt ? `PT. ${stripPt(d.nama_pt)}` : d.nama_pt,
      }))
      .sort((a, b) => {
        const nameA = a.nama_pt || a.id;
        const nameB = b.nama_pt || b.id;
        return nameA.localeCompare(nameB);
      });
  }, [distributors]);

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
              placeholder="Cari username / role / ruangan"
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
        <div className="text-center py-10 text-red-400">{error}</div>
      )}

      {!loading && !error && (
        <div className="overflow-x-auto rounded-xl border border-cyan-700/40 bg-black/20">
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 bg-black/60 text-yellow-400 backdrop-blur-sm">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Username</th>
                <th className="px-3 py-2 text-left font-medium">Role</th>
                <th className="px-3 py-2 text-left font-medium">Ruangan</th>
                <th className="px-3 py-2 text-left font-medium">Distributor</th>
                <th className="px-3 py-2 text-left font-medium">Created</th>
                <th className="px-3 py-2 text-center font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-3 py-6 text-center text-cyan-300"
                  >
                    Tidak ada data.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const dist = u.distributor_id
                    ? distributorById.get(u.distributor_id)
                    : null;
                  const isKonsolidasi =
                    u.distributor_is_konsolidasi ?? dist?.is_konsolidasi;
                  const distLabel = (
                    <div className="flex flex-col">
                      <span>
                        {u.distributor_nama_pt ||
                          dist?.nama_pt ||
                          (u.distributor_id ?? "-")}
                      </span>
                      {u.distributor_id && (
                        <span
                          className={`text-[10px] font-medium uppercase px-1.5 py-0.5 rounded w-fit mt-0.5 ${
                            isKonsolidasi
                              ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                              : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                          }`}
                        >
                          {isKonsolidasi ? "Konsolidasi" : "Non Konsolidasi"}
                        </span>
                      )}
                    </div>
                  );
                  return (
                    <tr
                      key={u.id}
                      className="border-t border-cyan-600/20 hover:bg-cyan-400/10 transition cursor-pointer"
                      onClick={() => openEditModal(u)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ")
                          openEditModal(u);
                      }}
                      tabIndex={0}
                      role="button"
                      aria-label={`Edit user ${u.username}`}
                    >
                      <td className="px-3 py-2">{u.username}</td>
                      <td className="px-3 py-2">{u.role}</td>
                      <td className="px-3 py-2 text-gray-200/90">
                        {u.ruangan_id || u.ruangan_slug || u.ruangan_nama ? (
                          <div className="flex flex-col">
                            <span className="text-gray-100">
                              {u.ruangan_nama ?? u.ruangan_slug ?? u.ruangan_id}
                            </span>
                            {u.ruangan_slug ? (
                              <span className="text-[11px] text-cyan-300/90 mt-0.5">
                                /{u.ruangan_slug}/dashboard
                              </span>
                            ) : (
                              <span className="text-[11px] text-amber-300/90 mt-0.5">
                                Master ruangan belum punya slug URL
                              </span>
                            )}
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {(() => {
                          const raw = u.distributor_nama_pt || dist?.nama_pt;
                          if (!raw) return u.distributor_id ?? "-";
                          const clean = raw.toUpperCase().replace(/^PT\.?\s*/u, "").replace(/\s+/g, " ").trim();
                          return (
                            <div className="flex flex-col">
                              <span>PT. {clean}</span>
                              {u.distributor_id && (
                                <span
                                  className={`text-[10px] font-medium uppercase px-1.5 py-0.5 rounded w-fit mt-0.5 ${
                                    isKonsolidasi
                                      ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                                      : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                                  }`}
                                >
                                  {isKonsolidasi ? "Konsolidasi" : "Non Konsolidasi"}
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                      <td className="px-3 py-2 text-gray-300/80">
                        {u.created_at
                          ? new Date(u.created_at).toLocaleDateString("id-ID")
                          : "-"}
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
              className={`fixed inset-0 flex items-center justify-center bg-black/75 ${UI_LAYERS.modal}`}
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
                    role:{" "}
                    <span className="text-gray-100">{userToDelete.role}</span>
                    {userToDelete.ruangan_slug || userToDelete.ruangan_nama ? (
                      <>
                        {" "}
                        • unit:{" "}
                        <span className="text-gray-100">
                          {userToDelete.ruangan_nama ?? userToDelete.ruangan_slug}
                          {userToDelete.ruangan_slug
                            ? ` (/${userToDelete.ruangan_slug}/dashboard)`
                            : ""}
                        </span>
                      </>
                    ) : null}
                    {userToDelete.distributor_id ? (
                      <>
                        {" "}
                        • distributor:{" "}
                        <span className="text-gray-100">
                          {userToDelete.distributor_nama_pt ??
                            distributorById.get(userToDelete.distributor_id)
                              ?.nama_pt ??
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
            document.body,
          )
        : null}

      {mounted && modalOpen
        ? createPortal(
            <div
              className={`fixed inset-0 bg-black/75 flex items-center justify-center ${UI_LAYERS.modal}`}
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
                        setForm((prev) => ({
                          ...prev,
                          username: e.target.value,
                        }))
                      }
                      className="w-full bg-gray-800/60 border border-cyan-700/40 rounded-lg px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/60"
                    />
                  </div>

                  <div>
                    <label className="block text-sm mb-1 text-cyan-300">
                      {modalMode === "create"
                        ? "Password"
                        : "Password (opsional)"}
                    </label>
                    <input
                      type="password"
                      value={form.password}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          password: e.target.value,
                        }))
                      }
                      className="w-full bg-gray-800/60 border border-cyan-700/40 rounded-lg px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/60"
                      placeholder={
                        modalMode === "edit"
                          ? "Kosongkan jika tidak mengubah password"
                          : ""
                      }
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm mb-1 text-cyan-300">
                        Role
                      </label>
                      <select
                        value={form.role}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            role: e.target.value as any,
                          }))
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

                    <div className="sm:col-span-2">
                      <label className="block text-sm mb-1 text-cyan-300">
                        Unit / ruangan (setelah login)
                      </label>
                      <select
                        value={form.ruanganId ?? ""}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            ruanganId: e.target.value || null,
                          }))
                        }
                        disabled={ruanganLoading}
                        className="w-full bg-gray-800/60 border border-cyan-700/40 rounded-lg px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/60 disabled:opacity-60 dark:text-white"
                      >
                        <option value="">
                          {ruanganLoading
                            ? "Memuat daftar ruangan..."
                            : "Tidak terikat unit (akses global)"}
                        </option>
                        {ruanganPickerOptions.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.nama}
                            {r.slug
                              ? `  →  /${r.slug}/dashboard`
                              : "  (belum ada slug URL)"}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-xs text-gray-200/90 dark:text-white/85">
                        {!ruanganPickerShowAll ? (
                          <>
                            Daftar dipersingkat: hanya ruangan yang sudah punya{" "}
                            <span className="text-cyan-200/95">slug URL</span> di
                            master ({ruanganWithSlugCount} unit).
                            Untuk staf/admin per unit, login mengarah ke{" "}
                            <span className="text-cyan-200/95">/{`{slug}`}/dashboard</span>.
                          </>
                        ) : (
                          <>
                            Menampilkan semua ruangan master. Pilih yang sudah ada
                            slug-nya agar redirect login jalan.
                          </>
                        )}
                      </p>
                      {!ruanganLoading &&
                      !ruanganPickerShowAll &&
                      ruanganWithSlugCount === 0 ? (
                        <p className="mt-1 text-xs text-amber-300/95">
                          Belum ada ruangan dengan slug. Isi kolom Slug URL di{" "}
                          <span className="text-gray-100">Dashboard → Ruangan</span>,
                          atau centang opsi di bawah untuk melihat semua baris.
                        </p>
                      ) : null}
                      <label className="mt-2 flex items-center gap-2 text-xs text-gray-200/95 dark:text-white/90 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={ruanganPickerShowAll}
                          onChange={(e) =>
                            setRuanganPickerShowAll(e.target.checked)
                          }
                          className="rounded border-cyan-600 bg-gray-900 text-cyan-500 focus:ring-cyan-500/50"
                        />
                        Tampilkan semua ruangan (termasuk tanpa slug)
                      </label>
                      {selectedRuanganOpt && !selectedRuanganOpt.slug ? (
                        <p className="mt-1 text-xs text-amber-300/95">
                          Ruangan ini belum punya slug di master — isi slug dulu
                          agar redirect login berfungsi.
                        </p>
                      ) : null}
                    </div>

                    {ROLES_REQUIRE_DISTRIBUTOR.has(form.role) && (
                      <div>
                        <label className="block text-sm mb-1 text-cyan-300">
                          Tipe Distributor
                        </label>
                        <select
                          value={form.distributorIsKonsolidasi ? "1" : "0"}
                          onChange={(e) => {
                            const isKonsolidasi = e.target.value === "1";
                            setForm((prev) => ({
                              ...prev,
                              distributorIsKonsolidasi: isKonsolidasi,
                            }));
                            // Jika sedang edit PT yang sudah ada, kita juga perlu update di distributorById map
                            // agar UI dropdown dan label langsung sinkron (meskipun biasanya nunggu fetchUsers)
                            if (form.distributorId) {
                              const d = distributorById.get(form.distributorId);
                              if (d) d.is_konsolidasi = isKonsolidasi;
                            }
                          }}
                          className="w-full bg-gray-800/60 border border-cyan-700/40 rounded-lg px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/60"
                        >
                          <option value="0">Non Konsolidasi</option>
                          <option value="1">Konsolidasi</option>
                        </select>
                      </div>
                    )}
                  </div>

                  {ROLES_REQUIRE_DISTRIBUTOR.has(form.role) && (
                    <>
                      <div>
                        <label className="block text-sm mb-1 text-cyan-300">
                          {form.isEditingExistingDistributor
                            ? "Edit Nama PT distributor"
                            : "Nama PT distributor (baru)"}
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={form.distributorNamaBaru}
                            onChange={(e) =>
                              setForm((prev) => ({
                                ...prev,
                                distributorNamaBaru: e.target.value.toUpperCase(),
                              }))
                            }
                            placeholder={
                              form.isEditingExistingDistributor
                                ? "Nama baru untuk PT ini"
                                : "Isi untuk membuat distributor baru di master_distributor"
                            }
                            className="flex-1 bg-gray-800/60 border border-cyan-700/40 rounded-lg px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/60"
                          />
                          {form.isEditingExistingDistributor && (
                            <button
                              type="button"
                              onClick={() =>
                                setForm((prev) => ({
                                  ...prev,
                                  isEditingExistingDistributor: false,
                                  distributorNamaBaru: "",
                                }))
                              }
                              className="px-3 py-2 bg-red-600/20 hover:bg-red-600/40 text-red-300 border border-red-500/30 rounded-lg transition-all text-xs"
                            >
                              Batal Edit
                            </button>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-gray-400">
                          {form.isEditingExistingDistributor
                            ? "Mengubah nama PT yang sudah ada di database."
                            : "Jika diisi, nama disimpan ke database sebagai PT baru dan dipakai untuk user ini. Kosongkan jika ingin memilih yang sudah ada."}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm mb-1 text-cyan-300">
                          Atau pilih distributor
                        </label>
                        <div className="flex gap-2">
                          <select
                            value={form.distributorId ?? ""}
                            onChange={(e) => {
                              const val = e.target.value || null;
                              const d = val ? distributorById.get(val) : null;
                              setForm((prev) => ({
                                ...prev,
                                distributorId: val,
                                isEditingExistingDistributor: false,
                                distributorNamaBaru: "",
                                distributorIsKonsolidasi: d?.is_konsolidasi ?? false,
                              }));
                            }}
                            className="flex-1 bg-gray-800/60 border border-cyan-700/40 rounded-lg px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/60"
                            disabled={
                              distributorsLoading ||
                              (!!form.distributorNamaBaru.trim() &&
                                !form.isEditingExistingDistributor)
                            }
                          >
                            <option value="">
                              {distributorsLoading
                                ? "Memuat distributor..."
                                : "Pilih distributor"}
                            </option>
                            {uniqueDistributors.map((d) => (
                              <option key={d.id} value={d.id}>
                                {d.nama_pt || d.id}
                              </option>
                            ))}
                          </select>
                          {form.distributorId &&
                            !form.isEditingExistingDistributor && (
                              <button
                                type="button"
                                onClick={() => {
                                  const d = distributorById.get(
                                    form.distributorId!,
                                  );
                                  setForm((prev) => ({
                                    ...prev,
                                    isEditingExistingDistributor: true,
                                    distributorNamaBaru: d?.nama_pt || "",
                                  }));
                                }}
                                className="px-3 py-2 bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-300 border border-cyan-500/30 rounded-lg transition-all text-xs flex items-center gap-1"
                                title="Edit nama PT terpilih"
                              >
                                <PencilLine size={14} />
                                Edit PT
                              </button>
                            )}
                        </div>
                      </div>
                    </>
                  )}

                  {submitError && (
                    <p className="text-red-400 text-sm text-center">
                      {submitError}
                    </p>
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
            document.body,
          )
        : null}
    </motion.div>
  );
}
