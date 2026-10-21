import { searchGame } from "../../../lib/find.ts";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q") ?? "";
  return Response.json({ hits: searchGame(q) });
}
