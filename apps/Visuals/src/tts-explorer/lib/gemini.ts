// Gemini TTS client. Two API shapes:
//  - gemini-3.8-*: Interactions API (verbatim text + speech_metadata.style)
//  - older (2.5 / 3.1 preview): generateContent; style is prompt text
const BASE = "https://generativelanguage.googleapis.com/v1beta";

export type ApiKind = "interactions" | "generateContent";
export interface ModelInfo {
  id: string;
  api: ApiKind;
  note: string;
}
export interface Voice {
  name: string;
  desc: string;
}
export interface Speaker {
  name: string;
  voice: string;
}
export interface TtsRequest {
  model: string;
  mode: "single" | "multi";
  voice?: string;
  text?: string;
  style?: string;
  backstory?: string;
  scene?: string;
  speakers?: Speaker[];
  script?: string;
  filename?: string;
}

export class HttpError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export const MODELS: ModelInfo[] = [
  {
    id: "gemini-3.8-flash-tts",
    api: "interactions",
    note: "Newest; best expressiveness",
  },
  {
    id: "gemini-3.8-flash-lite-tts",
    api: "interactions",
    note: "Fast / cheap",
  },
  {
    id: "gemini-3.1-flash-tts-preview",
    api: "generateContent",
    note: "Preview",
  },
  {
    id: "gemini-2.5-pro-preview-tts",
    api: "generateContent",
    note: "Older, high quality",
  },
  {
    id: "gemini-2.5-flash-preview-tts",
    api: "generateContent",
    note: "Older, fast",
  },
];

const VOICE_PAIRS: [string, string][] = [
  ["Zephyr", "Bright"],
  ["Puck", "Upbeat"],
  ["Charon", "Informative"],
  ["Kore", "Firm"],
  ["Fenrir", "Excitable"],
  ["Leda", "Youthful"],
  ["Orus", "Firm"],
  ["Aoede", "Breezy"],
  ["Callirrhoe", "Easy-going"],
  ["Autonoe", "Bright"],
  ["Enceladus", "Breathy"],
  ["Iapetus", "Clear"],
  ["Umbriel", "Easy-going"],
  ["Algieba", "Smooth"],
  ["Despina", "Smooth"],
  ["Erinome", "Clear"],
  ["Algenib", "Gravelly"],
  ["Rasalgethi", "Informative"],
  ["Laomedeia", "Upbeat"],
  ["Achernar", "Soft"],
  ["Alnilam", "Firm"],
  ["Schedar", "Even"],
  ["Gacrux", "Mature"],
  ["Pulcherrima", "Forward"],
  ["Achird", "Friendly"],
  ["Zubenelgenubi", "Casual"],
  ["Vindemiatrix", "Gentle"],
  ["Sadachbia", "Lively"],
  ["Sadaltager", "Knowledgeable"],
  ["Sulafat", "Warm"],
];
export const VOICES: Voice[] = VOICE_PAIRS.map(([name, desc]) => ({
  name,
  desc,
}));

export function pcmToWav(pcm: Buffer, rate = 24000, ch = 1, bits = 16): Buffer {
  const h = Buffer.alloc(44);
  h.write("RIFF", 0);
  h.writeUInt32LE(36 + pcm.length, 4);
  h.write("WAVE", 8);
  h.write("fmt ", 12);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(ch, 22);
  h.writeUInt32LE(rate, 24);
  h.writeUInt32LE((rate * ch * bits) / 8, 28);
  h.writeUInt16LE((ch * bits) / 8, 32);
  h.writeUInt16LE(bits, 34);
  h.write("data", 36);
  h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}

export function buildStyle(r: Pick<TtsRequest, "style" | "backstory" | "scene">): string {
  return [r.style, r.backstory && `Character: ${r.backstory}`, r.scene && `Scene: ${r.scene}`]
    .filter((s): s is string => Boolean(s?.trim()))
    .map((s) => s.trim())
    .join(". ");
}

export function parseScript(script: string): { speaker: string; text: string }[] {
  const turns: { speaker: string; text: string }[] = [];
  for (const raw of script.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const m = line.match(/^([^:]{1,40}):\s*(.*)$/);
    if (m) turns.push({ speaker: m[1].trim(), text: m[2] });
    else if (turns.length) turns[turns.length - 1].text += ` ${line}`;
  }
  return turns;
}

async function post(url: string, body: unknown): Promise<Record<string, unknown>> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new HttpError("GEMINI_API_KEY not set", 500);
  const r = await fetch(url, {
    method: "POST",
    headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const j = (await r.json().catch(() => ({}))) as Record<string, unknown> & {
    error?: { message?: string };
  };
  if (!r.ok) throw new HttpError(j.error?.message ?? `HTTP ${r.status}`, r.status);
  return j;
}

interface InteractionsResponse {
  steps?: { content?: { type: string; data?: string }[] }[];
}
interface GenerateContentResponse {
  candidates?: {
    finishReason?: string;
    content?: { parts?: { inlineData?: { data?: string } }[] };
  }[];
}

export async function synthesize(req: TtsRequest) {
  const model = MODELS.find((m) => m.id === req.model) ?? MODELS[0];
  const style = buildStyle(req);
  const speakers = req.speakers ?? [];
  let pcm: Buffer;

  if (model.api === "interactions") {
    let content: unknown[];
    let speechConfig: unknown;
    if (req.mode === "multi") {
      const turns = parseScript(req.script ?? "");
      if (!turns.length) throw new HttpError('Script has no "Name: line" turns', 400);
      content = turns.map((t) => ({
        type: "text",
        text: t.text,
        annotations: [
          {
            type: "speech_metadata",
            speaker: t.speaker,
            ...(style ? { style } : {}),
          },
        ],
      }));
      speechConfig = {
        speakers: speakers.map((s) => ({ speaker: s.name, voice: s.voice })),
      };
    } else {
      content = [
        {
          type: "text",
          text: req.text ?? "",
          annotations: style ? [{ type: "speech_metadata", style }] : [],
        },
      ];
      speechConfig = [{ voice: req.voice }];
    }
    const j = (await post(`${BASE}/interactions`, {
      model: model.id,
      input: [{ type: "user_input", content }],
      response_format: {
        type: "audio",
        mime_type: "audio/l16",
        sample_rate: 24000,
      },
      generation_config: { speech_config: speechConfig },
    })) as InteractionsResponse;
    const audio = (j.steps ?? [])
      .flatMap((s) => s.content ?? [])
      .filter((c) => c.type === "audio")
      .pop();
    if (!audio?.data) throw new HttpError("No audio in response", 502);
    pcm = Buffer.from(audio.data, "base64");
  } else {
    let prompt: string;
    let speechConfig: unknown;
    if (req.mode === "multi") {
      const names = speakers.map((s) => s.name).join(" and ");
      prompt = `${style ? `${style}\n` : ""}TTS the following conversation between ${names}:\n${req.script ?? ""}`;
      speechConfig = {
        multiSpeakerVoiceConfig: {
          speakerVoiceConfigs: speakers.map((s) => ({
            speaker: s.name,
            voiceConfig: { prebuiltVoiceConfig: { voiceName: s.voice } },
          })),
        },
      };
    } else {
      prompt = style ? `${style}. Say the following:\n${req.text ?? ""}` : (req.text ?? "");
      speechConfig = {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: req.voice } },
      };
    }
    const j = (await post(`${BASE}/models/${model.id}:generateContent`, {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ["AUDIO"], speechConfig },
    })) as GenerateContentResponse;
    const cand = j.candidates?.[0];
    const data = cand?.content?.parts?.find((p) => p.inlineData)?.inlineData?.data;
    if (!data) {
      throw new HttpError(
        `No audio in response${cand?.finishReason ? ` (${cand.finishReason})` : ""}`,
        502,
      );
    }
    pcm = Buffer.from(data, "base64");
  }
  const wav = pcm.subarray(0, 4).toString() === "RIFF" ? pcm : pcmToWav(pcm);
  return { wav, style, model: model.id, seconds: (wav.length - 44) / 48000 };
}
