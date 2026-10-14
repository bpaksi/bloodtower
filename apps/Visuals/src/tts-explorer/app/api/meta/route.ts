import { MODELS, VOICES } from "../../../lib/gemini.ts";

export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({
    models: MODELS,
    voices: VOICES,
    keySet: Boolean(process.env.GEMINI_API_KEY),
  });
}
