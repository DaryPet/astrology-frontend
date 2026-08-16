// Module-level registry of analysis requests currently in flight, keyed by an
// arbitrary string each caller builds from its own parameters (chart id,
// mode, planet name, etc). Unlike a component's useRef/useState, this lives
// outside the React tree — it survives a Dashboard remount (navigating to a
// different chart and back triggers a full remount via key={location.key} in
// App.tsx), so a request still running in the background after the component
// that started it unmounted won't get silently duplicated when the user
// returns to the same chart before it finishes.
//
// Cleared only by a full page reload (fresh JS module instance) — there is no
// cross-tab or cross-session persistence here; that would need a backend-side
// check instead. Callers are responsible for calling clearInFlight() on every
// exit path (success, cache hit, error) — a key left stuck in the registry
// blocks that request from ever starting again until the page is reloaded.
const inFlight = new Set<string>();

export function isInFlight(key: string): boolean {
  return inFlight.has(key);
}

export function markInFlight(key: string): void {
  inFlight.add(key);
}

export function clearInFlight(key: string): void {
  inFlight.delete(key);
}

// A blocked call (isInFlight(key) === true) has nowhere to get the result
// from on its own — the request that's actually running belongs to a
// different, unmounted component instance. This polls the registry until
// that key clears (the background request finished and cleared it), then
// runs onClear so the caller can re-check its own cache/DB and pick up the
// real result. Gives up after maxAttempts and calls onTimeout instead, so a
// key that somehow never clears (a bug, or a truly stuck request) doesn't
// leave the caller polling forever.
export function waitForClear(
  key: string,
  onClear: () => void,
  opts: { intervalMs?: number; maxAttempts?: number; onTimeout?: () => void } = {}
): void {
  const intervalMs = opts.intervalMs ?? 4000;
  const maxAttempts = opts.maxAttempts ?? 20;
  const attempt = (attemptsLeft: number) => {
    window.setTimeout(() => {
      if (!isInFlight(key)) {
        onClear();
        return;
      }
      if (attemptsLeft <= 1) {
        opts.onTimeout?.();
        return;
      }
      attempt(attemptsLeft - 1);
    }, intervalMs);
  };
  attempt(maxAttempts);
}
