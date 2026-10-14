/** A voiced character in a story. `id` is referenced by script lines. */
export interface Character {
  id: string;
  name: string;
  backstory: string;
  /** Prebuilt Gemini voice name, e.g. "Algenib". */
  voice: string;
  /** One-line reason the voice was chosen. */
  voiceReason: string;
  /** Short default delivery style (keep it brief, per Google's guidance). */
  style: string;
}

export interface ScriptLine {
  /** Character id, or "narrator". */
  speaker: string;
  /** Spoken verbatim; inline cues like <short pause> are allowed. */
  text: string;
  /** Optional short per-line style that overrides the character default. */
  style?: string;
}

export interface Scenario {
  id: string;
  title: string;
  /** Setting and mood. */
  scene: string;
  /** Character ids appearing in this scenario. */
  cast: string[];
  script: ScriptLine[];
}

export interface Story {
  id: string;
  title: string;
  summary: string;
  narrator: Character;
  characters: Character[];
  scenarios: Scenario[];
}
