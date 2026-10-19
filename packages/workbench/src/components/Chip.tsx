/** A copyable ID. `kind` picks the colour (`chip-<kind>`); ChipCopy does the copying. */
export function Chip({ id, kind, label }: { id: string; kind: string; label: string }) {
  return (
    // biome-ignore lint/a11y/useSemanticElements: chips also live inside card links, where a button is not allowed.
    <span
      className={`chip chip-${kind}`}
      data-id={id}
      role="button"
      tabIndex={0}
      title={`${label} · click to copy`}
    >
      {id}
    </span>
  );
}
