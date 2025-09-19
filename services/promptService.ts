export class PromptService {
  private session: { prompt: (s: string) => Promise<{ output?: string; output_text?: string }> } | null = null;
  private system: string;

  constructor(systemPrompt = "You are a precise and concise assistant.") {
    this.system = systemPrompt;
  }

  /** Lazy init so you can call send() without manually calling init() first */
  private async ensure() {
    if (!this.session) {
      const api = (window as any)?.ai?.languageModel;
      if (!api) throw new Error("Google Prompt API not available in this environment.");
      this.session = await api.create({
        initialPrompts: [{ role: "system", content: this.system }],
      });
    }
    return this.session;
  }

  /** Keep your init if you want to swap the system prompt at runtime */
  async init(initialPrompt: string) {
    this.system = initialPrompt;
    this.session = null;         // force re-create with new system prompt
    await this.ensure();
  }

  async send(input: string): Promise<string> {
    const s = await this.ensure();
    const res = await s?.prompt(input);
    const out = res?.output ?? res?.output_text ?? "";
    return String(out).trim();
  }
}