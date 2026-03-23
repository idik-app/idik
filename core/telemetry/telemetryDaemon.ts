/**
 * Stub: TelemetryDaemon — log & metrics untuk Autonomous Kernel
 */
export class TelemetryDaemon {
  private started = false;

  start() {
    this.started = true;
  }

  stop() {
    this.started = false;
  }

  log(_event: string, _payload?: unknown) {
    if (typeof console !== "undefined" && process.env.NODE_ENV === "development") {
      console.debug("[TelemetryDaemon]", _event, _payload);
    }
  }
}
