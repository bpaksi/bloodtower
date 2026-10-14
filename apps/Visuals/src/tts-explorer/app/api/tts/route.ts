import { HttpError, synthesize, type TtsRequest } from "../../../lib/gemini.ts";
import { addHistory, type HistoryEntry, saveWav } from "../../../lib/store.ts";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const t0 = Date.now();
  try {
    const body = (await request.json()) as TtsRequest;
    const r = await synthesize(body);
    const safe = (body.filename ?? "").replace(/[^\w.-]/g, "");
    const file = safe ? (safe.endsWith(".wav") ? safe : `${safe}.wav`) : `tts-${Date.now()}.wav`;
    saveWav(file, r.wav);
    const entry: HistoryEntry = {
      id: Date.now(),
      file,
      url: `/output/${file}`,
      model: r.model,
      mode: body.mode,
      style: r.style,
      voice: body.voice,
      speakers: body.speakers,
      text: (body.mode === "multi" ? body.script : body.text) ?? "",
      seconds: Number(r.seconds.toFixed(2)),
      ms: Date.now() - t0,
      at: new Date().toISOString(),
    };
    addHistory(entry);
    return Response.json(entry);
  } catch (e) {
    const status = e instanceof HttpError && e.status < 600 ? e.status : 500;
    const message = e instanceof Error ? e.message : String(e);
    console.error("TTS error:", status, message);
    return Response.json({ error: message }, { status });
  }
}
