import type { Page } from "playwright";
import { config } from "../config.js";
import type { mapSimrsToIdikPayload } from "../simrs/getPasien.js";

type Payload = ReturnType<typeof mapSimrsToIdikPayload>;

/** Mode B: isi modal Tambah Pasien di UI idik. */
export async function fillTambahPasienUi(
  page: Page,
  payload: Payload,
): Promise<void> {
  await page.goto(`${config.idikBaseUrl}/dashboard/layanan/tindakan`, {
    waitUntil: "domcontentloaded",
  });
  await page.getByRole("button", { name: /Tambah Pasien/i }).first().click();
  await page.getByText("Tambah Pasien", { exact: false }).first().waitFor({
    timeout: 15_000,
  });

  const fillByName = async (name: string, value: string) => {
    const loc = page.locator(`[name="${name}"]`).first();
    if ((await loc.count()) === 0) return;
    await loc.fill("");
    await loc.fill(value);
  };

  await fillByName("noRM", payload.noRM);
  // debounce lookup di modal — tunggu sebentar lalu timpa field dari getPasien
  await page.waitForTimeout(600);
  await fillByName("nama", payload.nama);
  await fillByName("tanggalLahir", payload.tanggalLahir);
  await fillByName("alamat", payload.alamat);

  const jk = page.locator('[name="jenisKelamin"]').first();
  if ((await jk.count()) > 0) {
    await jk.selectOption(payload.jenisKelamin);
  }

  // Jangan tebak pembiayaan/kelas dari SIMRS — biarkan default form bila sudah terisi
  const save = page.getByRole("button", { name: /Simpan/i }).first();
  await save.click();
  await page.waitForTimeout(1500);
}
