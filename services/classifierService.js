// src/services/classifierService.js
import { PromptService } from "./promptService.js";

/** @typedef {"proofread"|"revise"|"draft"|"other"} Intent */

export class ClassifierService {
  /**
   * @param {PromptService} svc
   */
  constructor(svc) {
    this.svc = svc;
  }

  /**
   * @param {string} input
   * @returns {Promise<{ intent: Intent, confidence: number }>}
   */
  async classify(input) {
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
      const parsed = JSON.parse(raw);
      const allowed = ["proofread", "revise", "draft", "other"];
      /** @type {Intent} */
      const intent = allowed.includes(parsed.intent) ? parsed.intent : "other";
      const confidence =
        typeof parsed.confidence === "number" ? parsed.confidence : 0.7;
      return { intent, confidence };
    } catch {
      // If the model ever returns non-JSON, degrade gracefully
      return { intent: "other", confidence: 0 };
    }
  }
}