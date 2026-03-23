"use server";
import { bootRegenerativeCore } from "./index";
import { IDIK_BOOT_CONFIG } from "./bootstrap.config";

if (IDIK_BOOT_CONFIG.mode === "auto") {
  bootRegenerativeCore()
    .then(() => console.log("✅ Auto-boot complete"))
    .catch((err) => console.error("[Auto-boot Error]", err));
}
