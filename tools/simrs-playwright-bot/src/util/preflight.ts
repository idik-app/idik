import { config } from "../config.js";

export type PreflightResult = {
  ok: boolean;
  getPasien: { ok: boolean; ms: number; error?: string };
  simrsWeb: { ok: boolean; ms: number; error?: string };
  idik: { ok: boolean; ms: number; error?: string };
};

async function probe(
  url: string,
  timeoutMs = 5000,
): Promise<{ ok: boolean; ms: number; error?: string }> {
  const t0 = Date.now();
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "GET",
      signal: ac.signal,
      redirect: "follow",
    });
    clearTimeout(timer);
    return {
      ok: res.status < 500,
      ms: Date.now() - t0,
      error: res.status >= 500 ? `HTTP ${res.status}` : undefined,
    };
  } catch (e: unknown) {
    clearTimeout(timer);
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      ms: Date.now() - t0,
      error: msg.includes("abort")
        ? "timeout — jalankan di LAN/VPN RS"
        : msg,
    };
  }
}

export async function runPreflight(opts?: {
  skipWeb?: boolean;
  skipIdik?: boolean;
}): Promise<PreflightResult> {
  const sample = `${config.simrsGetPasienUrl}/0`;
  const getPasien = await probe(sample);
  const simrsWeb = opts?.skipWeb
    ? { ok: true, ms: 0 }
    : await probe(config.simrsWebUrl);
  const idik = opts?.skipIdik
    ? { ok: true, ms: 0 }
    : await probe(config.idikBaseUrl);

  const ok =
    (config.simrsMockPath ? true : getPasien.ok) &&
    (opts?.skipWeb || simrsWeb.ok) &&
    (opts?.skipIdik || idik.ok);

  return { ok, getPasien, simrsWeb, idik };
}

export function printPreflight(r: PreflightResult) {
  console.log("=== Preflight LAN ===");
  console.log(
    `getPasien (${config.simrsGetPasienUrl}): ${r.getPasien.ok ? "OK" : "FAIL"} ${r.getPasien.ms}ms ${r.getPasien.error ?? ""}`,
  );
  console.log(
    `SIMRS web (${config.simrsWebUrl}): ${r.simrsWeb.ok ? "OK" : "FAIL"} ${r.simrsWeb.ms}ms ${r.simrsWeb.error ?? ""}`,
  );
  console.log(
    `idik (${config.idikBaseUrl}): ${r.idik.ok ? "OK" : "FAIL"} ${r.idik.ms}ms ${r.idik.error ?? ""}`,
  );
  if (!r.ok) {
    console.error(
      "Preflight gagal. Pastikan PC di jaringan RS / VPN dan URL di .env benar.",
    );
  }
}
