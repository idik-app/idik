"use client";

import { useEffect, useState } from "react";
import ChangePasswordForm from "@/components/auth/ChangePasswordForm";

type DistributorRow = {
  nama_pt: string;
  nama_sales: string | null;
  kontak_wa: string | null;
  email: string | null;
  alamat: string | null;
  catatan: string | null;
  is_active: boolean;
};

type MeResponse =
  | {
      ok: true;
      mode?: string;
      distributor: DistributorRow | null;
      ruangan: string;
    }
  | { ok: false; message?: string };

export default function DistributorProfilPage() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [form, setForm] = useState({
    nama_pt: "",
    nama_sales: "",
    kontak_wa: "",
    email: "",
    alamat: "",
    catatan: "",
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);

  const load = () => {
    setMessage(null);
    fetch("/api/distributor/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((j: MeResponse) => {
        setMe(j);
        if (j.ok && j.distributor) {
          const d = j.distributor;
          setForm({
            nama_pt: d.nama_pt ?? "",
            nama_sales: d.nama_sales ?? "",
            kontak_wa: d.kontak_wa ?? "",
            email: d.email ?? "",
            alamat: d.alamat ?? "",
            catatan: d.catatan ?? "",
          });
        }
      })
      .catch(() => setMe({ ok: false, message: "Gagal memuat profil" }));
  };

  useEffect(() => {
    load();
  }, []);

  if (!me) return <div className="text-[12px] text-cyan-300/70">Memuat…</div>;
  if (!me.ok) {
    return (
      <div className="text-[12px] text-rose-300">
        {me.message ?? "Tidak dapat memuat profil."}
      </div>
    );
  }

  if (me.mode === "admin_view" || !me.distributor) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-lg font-semibold text-[#D4AF37]">
            Profil Distributor
          </h1>
          <p className="text-[12px] text-cyan-300/70">
            Mode administrator: pilih distributor di header untuk melihat data,
            atau ubah master lewat{" "}
            <span className="text-cyan-200">Dashboard Farmasi → Master Distributor</span>
            .
          </p>
        </div>
        <div className="rounded-2xl border border-cyan-900/60 bg-slate-950/40 p-4">
          <ChangePasswordForm variant="distributor" />
        </div>
      </div>
    );
  }

  const d = me.distributor;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/distributor/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          nama_pt: form.nama_pt.trim(),
          nama_sales: form.nama_sales.trim() || null,
          kontak_wa: form.kontak_wa.trim() || null,
          email: form.email.trim() || null,
          alamat: form.alamat.trim() || null,
          catatan: form.catatan.trim() || null,
        }),
      });
      const j = await res.json();
      if (!res.ok || !j?.ok) {
        setMessage({
          type: "err",
          text: j?.message ?? "Gagal menyimpan",
        });
        return;
      }
      setMe(j as MeResponse);
      if (j.distributor) {
        const u = j.distributor as DistributorRow;
        setForm({
          nama_pt: u.nama_pt ?? "",
          nama_sales: u.nama_sales ?? "",
          kontak_wa: u.kontak_wa ?? "",
          email: u.email ?? "",
          alamat: u.alamat ?? "",
          catatan: u.catatan ?? "",
        });
      }
      setMessage({ type: "ok", text: "Profil berhasil disimpan." });
    } catch {
      setMessage({ type: "err", text: "Gagal menyimpan (jaringan)." });
    } finally {
      setSaving(false);
    }
  }

  const inputCls =
    "w-full rounded-lg border border-cyan-900/60 bg-slate-950/70 px-3 py-2 text-[12px] text-cyan-100 placeholder:text-cyan-600 focus:outline-none focus:ring-1 focus:ring-cyan-400";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-[#D4AF37]">Profil Distributor</h1>
        <p className="text-[12px] text-cyan-300/70">
          Perbarui kontak dan alamat PT. Status keaktifan hanya dapat diubah oleh
          administrator RS.
        </p>
        {message ? (
          <p
            className={
              message.type === "ok"
                ? "mt-1 text-[11px] text-emerald-400/95"
                : "mt-1 text-[11px] text-rose-300"
            }
          >
            {message.text}
          </p>
        ) : null}
      </div>

      <form
        onSubmit={onSubmit}
        className="rounded-2xl border border-cyan-900/60 bg-slate-950/40 p-4 text-[12px] space-y-4"
      >
        <Field label="Nama PT">
          <input
            className={inputCls}
            value={form.nama_pt}
            onChange={(e) => setForm((f) => ({ ...f, nama_pt: e.target.value }))}
            required
            autoComplete="organization"
          />
        </Field>
        <Field label="Nama Sales">
          <input
            className={inputCls}
            value={form.nama_sales}
            onChange={(e) =>
              setForm((f) => ({ ...f, nama_sales: e.target.value }))
            }
            autoComplete="name"
          />
        </Field>
        <Field label="Kontak WA">
          <input
            className={inputCls}
            value={form.kontak_wa}
            onChange={(e) =>
              setForm((f) => ({ ...f, kontak_wa: e.target.value }))
            }
            inputMode="tel"
            autoComplete="tel"
          />
        </Field>
        <Field label="Email">
          <input
            className={inputCls}
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            autoComplete="email"
          />
        </Field>
        <Field label="Alamat">
          <textarea
            className={`${inputCls} min-h-[72px] resize-y`}
            value={form.alamat}
            onChange={(e) => setForm((f) => ({ ...f, alamat: e.target.value }))}
            rows={3}
          />
        </Field>
        <Field label="Catatan">
          <textarea
            className={`${inputCls} min-h-[56px] resize-y`}
            value={form.catatan}
            onChange={(e) =>
              setForm((f) => ({ ...f, catatan: e.target.value }))
            }
            rows={2}
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-900/60">
          <ReadRow label="Status" value={d.is_active ? "Aktif" : "Nonaktif"} />
          <ReadRow label="Lokasi" value={me.ruangan} />
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-xl text-[12px] font-medium bg-cyan-500/20 border border-cyan-400/50 text-cyan-100 hover:bg-cyan-500/30 disabled:opacity-50 disabled:pointer-events-none"
          >
            {saving ? "Menyimpan…" : "Simpan perubahan"}
          </button>
        </div>
      </form>

      <div className="rounded-2xl border border-cyan-900/60 bg-slate-950/40 p-4">
        <ChangePasswordForm variant="distributor" />
      </div>
    </div>
  );
}

function Field(props: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-[11px] text-cyan-300/80">{props.label}</label>
      {props.children}
    </div>
  );
}

function ReadRow(props: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] text-cyan-300/70">{props.label}</div>
      <div className="text-cyan-100">{props.value}</div>
    </div>
  );
}
