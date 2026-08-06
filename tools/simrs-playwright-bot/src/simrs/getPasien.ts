import fs from "node:fs";
import path from "node:path";
import { BOT_ROOT, config } from "../config.js";
import { timed } from "../util/timing.js";

export type SimrsPasienData = {
  id?: string;
  norm: string;
  nik?: string;
  nama: string;
  alamat?: string;
  jenkel?: string;
  tgl_lhr?: string;
  kota?: string;
  [key: string]: unknown;
};

export type GetPasienResult =
  | { ok: true; data: SimrsPasienData; ms: number; source: "api" | "mock" }
  | { ok: false; error: string; status?: number; ms: number };

function formatTanggalLahir(raw: unknown): string {
  if (raw == null || raw === "") return "";
  const s = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return s.slice(0, 10);
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m) {
    const [, d, mo, y] = m;
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return s;
}

export function mapSimrsToIdikPayload(data: SimrsPasienData) {
  const alamat = [data.alamat, data.kota]
    .map((x) => String(x ?? "").trim())
    .filter(Boolean)
    .join(", ");
  const jenkel = String(data.jenkel ?? "L").toUpperCase().startsWith("P")
    ? "P"
    : "L";
  return {
    noRM: String(data.norm ?? "").trim(),
    nama: String(data.nama ?? "").trim(),
    jenisKelamin: jenkel as "L" | "P",
    tanggalLahir: formatTanggalLahir(data.tgl_lhr),
    alamat: alamat || "-",
    noHP: "",
    // Not from getPasien — env defaults only (plan: jangan ditebak)
    jenisPembiayaan: config.defaultJenisPembiayaan as
      | "BPJS"
      | "NPBI"
      | "Umum"
      | "Asuransi",
    kelasPerawatan: config.defaultKelasPerawatan as
      | "Kelas 1"
      | "Kelas 2"
      | "Kelas 3",
    asuransi: "",
  };
}

export async function getPasien(norm: string): Promise<GetPasienResult> {
  const clean = String(norm ?? "").trim();
  if (!clean) {
    return { ok: false, error: "No. RM kosong", ms: 0 };
  }

  if (config.simrsMockPath) {
    const full = path.isAbsolute(config.simrsMockPath)
      ? config.simrsMockPath
      : path.join(BOT_ROOT, config.simrsMockPath);
    const { result, ms } = await timed("getPasien:mock", async () => {
      const json = JSON.parse(fs.readFileSync(full, "utf8")) as {
        status?: string;
        data?: SimrsPasienData;
      };
      return json;
    });
    if (result?.status === "Ok" && result.data) {
      return { ok: true, data: result.data, ms, source: "mock" };
    }
    return { ok: false, error: "Mock invalid", ms };
  }

  const url = `${config.simrsGetPasienUrl}/${encodeURIComponent(clean)}`;
  const { result, ms } = await timed("getPasien", async () => {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 5000);
    try {
      const res = await fetch(url, { signal: ac.signal, cache: "no-store" });
      clearTimeout(timer);
      const text = await res.text();
      let json: {
        status?: string;
        code?: number;
        message?: string;
        data?: SimrsPasienData;
      } = {};
      try {
        json = JSON.parse(text);
      } catch {
        return { httpStatus: res.status, parseError: true as const };
      }
      return { httpStatus: res.status, json };
    } catch (e: unknown) {
      clearTimeout(timer);
      throw e;
    }
  });

  if ("parseError" in result && result.parseError) {
    return {
      ok: false,
      error: `Response bukan JSON (HTTP ${result.httpStatus})`,
      status: result.httpStatus,
      ms,
    };
  }

  const { httpStatus, json } = result as {
    httpStatus: number;
    json: {
      status?: string;
      code?: number;
      message?: string;
      data?: SimrsPasienData;
    };
  };

  if (httpStatus === 404 || json.code === 404) {
    return {
      ok: false,
      error: json.message || "Data tidak ditemukan (404)",
      status: 404,
      ms,
    };
  }

  if (json.status === "Ok" && json.data?.norm) {
    return { ok: true, data: json.data, ms, source: "api" };
  }

  return {
    ok: false,
    error: json.message || `SIMRS status ${httpStatus}`,
    status: httpStatus,
    ms,
  };
}
