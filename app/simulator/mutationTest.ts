// mutationTest.ts
export function testMutation(engine: any, data: any) {
  return engine.mutate(data, (x: any) => ({ ...x, tested: true }));
}
