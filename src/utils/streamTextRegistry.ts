// Module-level buffer of text already streamed by an in-flight background
// analysis, keyed the same way as inFlightRegistry.ts (chart id + mode,
// etc). isInFlight only tells a returning caller THAT a background request
// is still running — it doesn't hand back what's already been typed. This
// buffer does: the live onDelta callback (wherever a request is actually
// running) appends every chunk here as it arrives, so a component that
// remounts while that request is still going (see inFlightRegistry.ts —
// leaving a chart and coming back before the previous generation finished)
// can replay everything already received and keep the typewriter moving
// instead of sitting on a bare spinner until the whole response is done.
//
// Same lifetime rules as inFlightRegistry.ts: lives only in memory, cleared
// by the caller once the request reaches a terminal state (final or error),
// and reset by a full page reload.
const buffers = new Map<string, string>();

export function appendStreamText(key: string, text: string): void {
  buffers.set(key, (buffers.get(key) ?? '') + text);
}

export function getStreamText(key: string): string {
  return buffers.get(key) ?? '';
}

export function clearStreamText(key: string): void {
  buffers.delete(key);
}
