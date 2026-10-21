/** Keeps one built value until the stamp changes. Pure: the caller says how to stamp and build. */
export function makeCached<T>(stamp: () => string, build: () => T): () => T {
  let key: string | null = null;
  let value: T;
  return () => {
    const now = stamp();
    if (key !== now) {
      value = build();
      key = now;
    }
    return value;
  };
}
