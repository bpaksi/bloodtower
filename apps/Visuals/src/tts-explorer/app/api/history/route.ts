import { readHistory } from "../../../lib/store.ts";

export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(readHistory());
}
