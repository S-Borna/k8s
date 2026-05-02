import { useCallback, useEffect, useState } from "react";

const STORAGE_EVENT = "k8s-app-state-changed";

export function useLocalStorage<T>(
  key: string,
  initial: T,
): [T, (next: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => readStorage(key, initial));

  useEffect(() => {
    const onChange = (event: Event) => {
      if (event instanceof CustomEvent && event.detail?.key === key) {
        setValue(readStorage(key, initial));
      }
      if (event instanceof StorageEvent && event.key === key) {
        setValue(readStorage(key, initial));
      }
    };
    window.addEventListener(STORAGE_EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(STORAGE_EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, [key, initial]);

  const setter = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved =
          typeof next === "function" ? (next as (p: T) => T)(prev) : next;
        try {
          window.localStorage.setItem(key, JSON.stringify(resolved));
          window.dispatchEvent(
            new CustomEvent(STORAGE_EVENT, { detail: { key } }),
          );
        } catch {
          /* quota or serialization issue — silently keep in-memory state */
        }
        return resolved;
      });
    },
    [key],
  );

  return [value, setter];
}

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
