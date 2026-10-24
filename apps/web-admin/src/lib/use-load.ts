"use client";

import { useEffect, useState } from "react";
import { errorKey } from "@oruschools/web-auth";

export type Load<T> = { status: "loading" } | { status: "error"; messageKey: string } | { status: "ready"; data: T };

/**
 * Runs `run` whenever `key` changes (the key names everything `run` depends on) and gives back what a screen needs: loading,
 * an error with the message key to show, or the data. `reload` asks again. An answer for an old key is never shown: while the
 * new one is on its way the screen says loading.
 */
export function useLoad<T>(run: (() => Promise<T>) | null, key: string): [Load<T>, () => void] {
  const [attempt, setAttempt] = useState(0);
  const id = `${key}#${attempt}`;
  const [done, setDone] = useState<{ id: string; result: { ok: true; data: T } | { ok: false; messageKey: string } } | null>(null);

  useEffect(() => {
    if (!run) return;
    let current = true;
    Promise.resolve().then(run).then(
      (data) => current && setDone({ id, result: { ok: true, data } }),
      (e: unknown) => current && setDone({ id, result: { ok: false, messageKey: errorKey(e) } }),
    );
    return () => {
      current = false;
    };
    // `run` is a new function on every render; `key` is what says it would ask for something different.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const state: Load<T> = !run || done?.id !== id ? { status: "loading" } : done.result.ok ? { status: "ready", data: done.result.data } : { status: "error", messageKey: done.result.messageKey };
  return [state, () => setAttempt((n) => n + 1)];
}
