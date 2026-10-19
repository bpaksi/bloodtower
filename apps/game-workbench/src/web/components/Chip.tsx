import { idKind, KIND_LABEL } from "../lib/ids.ts";

export function Chip({ id }: { id: string }) {
  const kind = idKind(id);
  return (
    // biome-ignore lint/a11y/useSemanticElements: chips also live inside card links, where a button is not allowed.
    <span
      className={`chip chip-${kind}`}
      data-id={id}
      role="button"
      tabIndex={0}
      title={`${KIND_LABEL[kind]} · click to copy`}
    >
      {id}
    </span>
  );
}
