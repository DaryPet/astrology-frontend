const isDev = import.meta.env.DEV;

// Single place where logging is routed. Production output is dropped here and,
// as a second line of defence, stripped from the bundle by esbuild `drop`.
// Wire an error reporter (e.g. Sentry) into `error` when one is added.
export const logger = {
  error: (message: string, ...data: unknown[]) => {
    if (isDev) console.error(message, ...data);
  },
  warn: (message: string, ...data: unknown[]) => {
    if (isDev) console.warn(message, ...data);
  },
  debug: (message: string, ...data: unknown[]) => {
    if (isDev) console.debug(message, ...data);
  },
};
