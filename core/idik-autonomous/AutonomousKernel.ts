"use client";

import { TelemetryDaemon } from "@/core/telemetry/telemetryDaemon";
import { Observer } from "@/core/telemetry/observer";
import { AdaptiveGovernor } from "@/core/ai-engine/AdaptiveGovernor";
import { PatternLearner } from "@/core/cognition/patternLearner";
import { RollbackGuard } from "@/core/kernel/rollbackGuard";
import { MutationEngine } from "@/core/kernel/mutationEngine";
import { FileWatcher } from "./FileWatcher";
import { DiagnosticsBridge } from "./DiagnosticsBridge";

export class AutonomousKernel {
  private static instance: AutonomousKernel | null = null;

  telemetry = new TelemetryDaemon();
  observer = new Observer();
  governor = new AdaptiveGovernor();
  learner = new PatternLearner();
  guard = new RollbackGuard();
  mutation = new MutationEngine();
  files = new FileWatcher();
  bridge = DiagnosticsBridge;

  private running = false;
  private intervalIds: ReturnType<typeof setInterval>[] = [];

  static getInstance() {
    if (!this.instance) this.instance = new AutonomousKernel();
    return this.instance;
  }

  /** Alias untuk Provider: boot = start */
  async boot() {
    return this.start();
  }

  /** Alias untuk Provider: shutdown = stop */
  shutdown() {
    this.stop();
  }

  async start() {
    if (this.running) return;
    this.running = true;

    this.telemetry.start();
    this.observer.start();
    this.files.startWatching();
    this.bridge.start();

    const id1 = setInterval(() => {
      const patterns = this.observer.capture();
      const insights = this.learner.analyze(patterns);
      this.governor.adjust(insights);
    }, 3000);
    this.intervalIds.push(id1);

    const id2 = setInterval(() => {
      const state = this.mutation.checkSystemState();
      if (!state.safe) {
        this.guard.rollback(state.latestStable);
        this.telemetry.log("rollback", state);
      }
    }, 5000);
    this.intervalIds.push(id2);
  }

  stop() {
    if (!this.running) return;
    this.running = false;
    for (const id of this.intervalIds) clearInterval(id);
    this.intervalIds = [];
    this.telemetry.stop();
    this.observer.stop();
    this.files.stopWatching();
    this.bridge.stop();
  }
}
