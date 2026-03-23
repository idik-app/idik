"use client";

/**
 * 🔒 clientBridge.ts — versi aman React 19 / Next 16
 * Semua fungsi di sini berjalan di sisi client
 * dan hanya memanggil endpoint API, bukan server action langsung.
 */

export async function addPatientAction(data: any) {
  const res = await fetch("/api/pasien/add", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function editPatientAction(id: string, data: any) {
  const res = await fetch(`/api/pasien/${id}/edit`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deletePatientAction(id: string) {
  const res = await fetch(`/api/pasien/${id}`, { method: "DELETE" });
  return res.json();
}

export async function refreshPatientsAction() {
  const res = await fetch("/api/pasien");
  return res.json();
}
