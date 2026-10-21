/** Keeps one built value until the stamp changes. Pure: the caller says how to stamp and build. */
export function makeCached<T>(stamp: () => string, build: () => T): () => T {
  // Stub: rebuilds every call (the bug), replaced by the fix.
  void stamp;
  return () => build();
}
