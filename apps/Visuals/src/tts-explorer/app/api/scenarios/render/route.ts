import { findStory } from "../../../../data/stories/index.ts";
import { HttpError } from "../../../../lib/gemini.ts";
import { DEFAULT_MODEL, renderScenario } from "../../../../lib/stories/render.ts";

export const runtime = "nodejs";
export const maxDuration = 600;

interface RenderBody {
  storyId: string;
  scenarioId: string;
  model?: string;
  /** false = only report what is already cached (no API calls). */
  generate?: boolean;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RenderBody;
    const story = findStory(body.storyId);
    const scenario = story?.scenarios.find((s) => s.id === body.scenarioId);
    if (!story || !scenario) throw new HttpError("Unknown story or scenario", 404);
    const result = await renderScenario(
      story,
      scenario,
      body.model ?? DEFAULT_MODEL,
      body.generate ?? false,
    );
    return Response.json(result);
  } catch (e) {
    const status = e instanceof HttpError && e.status < 600 ? e.status : 500;
    const message = e instanceof Error ? e.message : String(e);
    console.error("Scenario render error:", status, message);
    return Response.json({ error: message }, { status });
  }
}
