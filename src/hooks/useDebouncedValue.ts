import { useEffect, useState } from "react";

/** Debounce any rapidly-changing value (search inputs etc.) so heavy
 *  downstream filters don't run on every keystroke. */
export function useDebouncedValue<T>(value: T, delayMs = 200): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}