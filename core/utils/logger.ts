/**
 * 🧠 logger.ts
 * Utilitas logging sederhana untuk IDIK-App (Cathlab JARVIS Mode)
 * ---------------------------------------------------------------
 * - Menampilkan log dengan label modul berwarna
 * - Mengirim log ke console dan ke server telemetry (opsional)
 */

type LogLevel = "info" | "warn" | "error" | "debug";

export function createLogger(scope: string) {
  const colorMap: Record<LogLevel, string> = {
    info: "\x1b[36m", // cyan
    warn: "\x1b[33m", // yellow
    error: "\x1b[31m", // red
    debug: "\x1b[90m", // gray
  };

  const reset = "\x1b[0m";

  function log(level: LogLevel, ...args: unknown[]) {
    const color = colorMap[level];
    const prefix = `[${new Date().toISOString()}][${scope}]`;
    // eslint-disable-next-line no-console
    console.log(`${color}${prefix} ${level.toUpperCase()}${reset}`, ...args);
  }

  return {
    info: (...args: unknown[]) => log("info", ...args),
    warn: (...args: unknown[]) => log("warn", ...args),
    error: (...args: unknown[]) => log("error", ...args),
    debug: (...args: unknown[]) => log("debug", ...args),
  };
}
