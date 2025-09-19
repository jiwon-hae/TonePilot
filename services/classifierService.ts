import type { Intent } from "./semanticRouting"; // reuse the Intent type

export class ClassifierService {
  constructor(private svc: import("./promptService").PromptService) {}

  async classify(input: string): Promise<{ intent: Intent; confidence: number }> {
    // Minimal JSON-only classifier prompt
    const prompt = `
You are an intent classifier. Choose EXACTLY one intent from:
["proofread","revise","draft","other"].
Return minified JSON only, e.g. {"intent":"revise","confidence":0.82}.

Definitions:
- "proofread": grammar/spelling corrections
- "revise": tone/style/clarity rewrites
- "draft": composing new content (emails/messages/etc.)
- "other": anything else

User: ${input}
JSON:`;
    const raw = await this.svc.send(prompt);

    try {
      const parsed = JSON.parse(raw) as { intent?: Intent; confidence?: number };
      const intent: Intent = (["proofread", "revise", "draft", "other"] as const).includes(parsed.intent as Intent)
        ? (parsed.intent as Intent)
        : "other";
      const confidence = typeof parsed.confidence === "number" ? parsed.confidence : 0.7;
      return { intent, confidence };
    } catch {
      // If the model ever returns non-JSON, degrade gracefully
      return { intent: "other", confidence: 0 };
    }
  }
}