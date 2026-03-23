// lifecycle.ts
export class Lifecycle {
  private phase: "boot" | "run" | "heal" | "shutdown" = "boot";

  start() {
    this.phase = "run";
    console.log("[Lifecycle] System running");
  }

  heal() {
    this.phase = "heal";
    console.log("[Lifecycle] Initiating self-healing");
  }

  stop() {
    this.phase = "shutdown";
    console.log("[Lifecycle] System shutdown");
  }

  get status() {
    return this.phase;
  }
}
