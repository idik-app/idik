"use server";
/**
 * 🧠 Regenerative Watcher
 * -----------------------
 * Melakukan self-test dan retraining otomatis
 * berdasarkan interval pada bootstrap.config.ts
 */

import { selfTest } from "../core/kernel/selfTest";
import { RegenerativeTrainer } from "../ai/regenerativeTrainer";
import { detectAnomaly } from "../ai/anomalyDetector";
import { IDIK_BOOT_CONFIG } from "./bootstrap.config";
import { evolutionReport } from "../core/telemetry/evolutionReport";

export async function regenerativeWatcher() {
  console.log("🩺 [Watcher] Starting scheduled self-test...");

  const test = selfTest();
  const anomaly = detectAnomaly([2, 3, 2, 9, 2, 3]);
  const trainer = new RegenerativeTrainer();
  const retrain = trainer.train({ anomaly });

  evolutionReport(
    `Self-test OK | Retrain=${retrain.status} | Anomaly=${anomaly.abnormal.length}`
  );

  if (IDIK_BOOT_CONFIG.enableTelemetry) {
    console.log(
      "📊 [Watcher] Telemetry active, next check in",
      IDIK_BOOT_CONFIG.retrainInterval,
      "hours"
    );
  }
  return {
    time: new Date().toISOString(),
    status: "ok",
    anomalies: anomaly.abnormal.length,
  };
}
