import { vi } from "vitest";

/** Cookies de la «solicitud» en curso; las pruebas la limpian con `jar.store.clear()`. */
export const jar = {
  store: new Map<string, string>(),
  setOptions: new Map<string, Record<string, unknown>>(),
  headers: { "cf-connecting-ip": "203.0.113.9" } as Record<string, string>,
};

export const nextHeadersMock = () => ({
  cookies: async () => ({
    get: (name: string) => (jar.store.has(name) ? { name, value: jar.store.get(name)! } : undefined),
    set: (name: string, value: string, options?: Record<string, unknown>) => {
      jar.store.set(name, value);
      if (options) jar.setOptions.set(name, options);
    },
    delete: (name: string) => void jar.store.delete(name),
  }),
  headers: async () => new Headers(jar.headers),
});

/** `redirect` lanza, igual que en Next, para que la acción se corte en ese punto. */
export const nextNavigationMock = () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
});

/** Congela el reloj (Date.now / new Date) hasta llamar a `restore()`. */
export function freezeTime(iso: string) {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(iso));
  return { restore: () => vi.useRealTimers() };
}
