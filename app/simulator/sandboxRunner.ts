// sandboxRunner.ts
export function runSandbox(testFn: Function) {
  try {
    testFn();
    console.log("[Sandbox] OK");
  } catch (e) {
    console.error("[Sandbox] Error", e);
  }
}
