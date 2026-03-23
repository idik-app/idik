// memoryCache.ts
const cache = new Map<string, any>();
export const MemoryCache = {
  get: (key: string) => cache.get(key),
  set: (key: string, value: any) => cache.set(key, value),
  clear: () => cache.clear(),
};
