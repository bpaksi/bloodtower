import { Chip as BaseChip } from "@dark-tower/workbench/components";
import { idKind, KIND_LABEL } from "../lib/ids.ts";

export function Chip({ id }: { id: string }) {
  const kind = idKind(id);
  return <BaseChip id={id} kind={kind} label={KIND_LABEL[kind]} />;
}
