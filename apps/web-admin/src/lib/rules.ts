import { ApiError } from "@oruschools/api-client";

/** The machine rule the gateway named for a refused request (`classBusy`, `periodInUse` ...), or null. The words for it come from our catalogue, never from the gateway. */
export function ruleOf(error: unknown): string | null {
  return error instanceof ApiError ? error.details?.[0]?.rule ?? null : null;
}

/** The message key for a refusal: a catalogue entry for its rule when we have one, else the generic key for the error. */
export function ruleKey(error: unknown, known: Readonly<Record<string, string>>, fallback: (e: unknown) => string): string {
  const rule = ruleOf(error);
  return (rule && known[rule]) || fallback(error);
}
