"use client";

/**
 * 🔒 clientBridge.ts — versi aman React 19 / Next 16
 * Semua fungsi di sini berjalan di sisi client
 * dan hanya memanggil endpoint API, bukan server action langsung.
 */

async function parseResponseJson(res: Response): Promise<any> {
  const text = await res.text();
  if (!text) {
    return res.ok ? { ok: true } : { ok: false, error: `HTTP ${res.status}` };
  }
  try {
    return JSON.parse(text);
  } catch {
    const snippet = text.replace(/\s+/g, " ").slice(0, 200);
    return {
      ok: false,
      error: `Respons server bukan JSON (${res.status}). ${snippet}`,
    };
  }
}

export async function addPatientAction(data: any) {
  const res = await fetch("/api/pasien/add", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
    cache: "no-store",
    credentials: "same-origin",
  });
  return parseResponseJson(res);
}

export async function editPatientAction(id: string, data: any) {
  const res = await fetch(`/api/pasien/${id}/edit`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
    cache: "no-store",
    credentials: "same-origin",
  });
  return parseResponseJson(res);
}

export async function deletePatientAction(id: string) {
  const res = await fetch(`/api/pasien/${id}`, {
    method: "DELETE",
    cache: "no-store",
    credentials: "same-origin",
  });
  return parseResponseJson(res);
}

export async function refreshPatientsAction() {
  const res = await fetch("/api/pasien", {
    cache: "no-store",
    credentials: "same-origin",
  });
  return parseResponseJson(res);
}
