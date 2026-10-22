import { useSyncExternalStore } from "react";

const noop = () => () => {};

/** İstemci tarafında true, sunucu ön-render sırasında false döner. */
export function useMounted(): boolean {
  return useSyncExternalStore(noop, () => true, () => false);
}
