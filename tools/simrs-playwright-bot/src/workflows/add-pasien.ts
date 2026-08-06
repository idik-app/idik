import fs from "node:fs";
import path from "node:path";
import { config, ensureDirs } from "../config.js";
import { getPasien, mapSimrsToIdikPayload } from "../simrs/getPasien.js";
import { ensureIdikSession, loginIdikPlaywright, launchIdikBrowser } from "../idik/login.js";
import {
  addPasien,
  findPasienByNoRm,
  updatePasien,
} from "../idik/pasien-api.js";
import { fillTambahPasienUi } from "../idik/tambah-pasien-ui.js";
import { postBotStatus } from "../idik/bot-status.js";
import { safePatientSummary } from "../util/pii.js";
import { acquireLock } from "../util/lock.js";
import { runPreflight, printPreflight } from "../util/preflight.js";

export type AddPasienOptions = {
  norm: string;
  /** default true — harus --write untuk menulis */
  dryRun?: boolean;
  forceUi?: boolean;
  skipExisting?: boolean;
  skipPreflight?: boolean;
};

export async function runAddPasien(opts: AddPasienOptions) {
  const dryRun = opts.dryRun !== false;
  const release = acquireLock(`add-pasien:${opts.norm}`);
  const t0 = Date.now();
  let session = null as Awaited<ReturnType<typeof ensureIdikSession>> | null;

  try {
    if (!opts.skipPreflight) {
      const pf = await runPreflight({
        skipWeb: true,
        skipIdik: Boolean(config.simrsMockPath) && dryRun,
      });
      printPreflight(pf);
      if (!pf.getPasien.ok && !config.simrsMockPath) {
        process.exitCode = 1;
        return;
      }
    }

    await postBotStatus(null, { state: "running", norm: opts.norm });

    const gp = await getPasien(opts.norm);
    if (!gp.ok) {
      console.error(`getPasien FAIL: ${gp.error}`);
      await postBotStatus(null, {
        state: "error",
        norm: opts.norm,
        error: gp.error,
        ms: gp.ms,
      });
      process.exitCode = gp.status === 404 ? 2 : 1;
      return;
    }

    const payload = mapSimrsToIdikPayload(gp.data);
    console.log(
      `Mapped ${safePatientSummary(gp.data)} source=${gp.source} (${gp.ms}ms)`,
    );
    console.log(
      "Payload (tanpa NIK):",
      JSON.stringify(
        {
          noRM: payload.noRM,
          nama: payload.nama,
          jenisKelamin: payload.jenisKelamin,
          tanggalLahir: payload.tanggalLahir,
          alamat: payload.alamat.slice(0, 40) + (payload.alamat.length > 40 ? "…" : ""),
          jenisPembiayaan: payload.jenisPembiayaan,
          kelasPerawatan: payload.kelasPerawatan,
        },
        null,
        2,
      ),
    );

    if (dryRun) {
      console.log("[dry-run] Tidak menulis. Pakai --write untuk menyimpan.");
      await postBotStatus(null, {
        state: "ok",
        norm: opts.norm,
        ms: Date.now() - t0,
      });
      ensureDirs();
      fs.writeFileSync(
        path.join(config.artifactsDir, "last-run.json"),
        JSON.stringify(
          {
            mode: "dry-run",
            norm: opts.norm,
            at: new Date().toISOString(),
            ms: Date.now() - t0,
          },
          null,
          2,
        ),
      );
      return;
    }

    try {
      session = await ensureIdikSession();
    } catch (e) {
      console.warn("Login API idik gagal, coba Playwright…", e);
      session = await loginIdikPlaywright();
    }

    const existing = await findPasienByNoRm(session, payload.noRM);
    if (existing) {
      if (opts.skipExisting || config.onExisting === "skip") {
        console.log(`RM ${payload.noRM} sudah ada — skip`);
        await postBotStatus(session, {
          state: "ok",
          norm: opts.norm,
          ms: Date.now() - t0,
        });
        return;
      }
      if (opts.forceUi) {
        const { browser, page } = await launchIdikBrowser(session);
        try {
          await fillTambahPasienUi(page, payload);
        } finally {
          await browser.close();
        }
      } else {
        const upd = await updatePasien(session, existing.id, payload);
        if (!upd.ok) {
          console.error("Update gagal:", upd.error);
          if (opts.forceUi !== false) {
            console.warn("Fallback UI…");
            const { browser, page } = await launchIdikBrowser(session);
            try {
              await fillTambahPasienUi(page, payload);
            } finally {
              await browser.close();
            }
          } else {
            process.exitCode = 1;
            await postBotStatus(session, {
              state: "error",
              norm: opts.norm,
              error: upd.error,
            });
            return;
          }
        } else {
          console.log(`Updated pasien id=${existing.id} (${upd.ms}ms)`);
        }
      }
    } else if (opts.forceUi) {
      const { browser, page } = await launchIdikBrowser(session);
      try {
        await fillTambahPasienUi(page, payload);
      } finally {
        await browser.close();
      }
    } else {
      const add = await addPasien(session, payload);
      if (!add.ok) {
        console.error("Add API gagal:", add.error);
        console.warn("Fallback Playwright UI…");
        const { browser, page } = await launchIdikBrowser(session);
        try {
          await fillTambahPasienUi(page, payload);
        } finally {
          await browser.close();
        }
      } else {
        console.log(`Added pasien id=${add.data?.id} (${add.ms}ms)`);
      }
    }

    const ms = Date.now() - t0;
    console.log(`OK RM ${opts.norm} · ${ms}ms`);
    await postBotStatus(session, { state: "ok", norm: opts.norm, ms });
    ensureDirs();
    fs.writeFileSync(
      path.join(config.artifactsDir, "last-run.json"),
      JSON.stringify(
        { mode: "write", norm: opts.norm, at: new Date().toISOString(), ms },
        null,
        2,
      ),
    );
  } finally {
    release();
  }
}
