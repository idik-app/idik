"use client";

/**
 * 🔒 addPatientClient
 * Pemanggilan aman dari sisi client untuk React 19 / Next 15.
 * Mengirim data ke route API /api/pasien/add yang memanggil server action addPatient().
 */
export async function addPatientClient(data: any) {
  const res = await fetch("/api/pasien/add", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gagal menambahkan pasien: ${err}`);
  }

  return await res.json();
}
