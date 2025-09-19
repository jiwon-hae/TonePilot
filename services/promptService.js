class PromptService {
  constructor(systemPrompt = "You are a precise and concise assistant.") {
    this.session = null;
    this.system = systemPrompt;
  }

  async ensure() {
    if (!this.session) {
      const api = window?.ai?.languageModel;
      if (!api) {
        throw new Error("Chrome Built-in AI not available. Please enable it in chrome://flags");
      }
      this.session = await api.create({
        initialPrompts: [{ role: "system", content: this.system }],
      });
    }
    return this.session;
  }

  async init(initialPrompt) {
    this.system = initialPrompt;
    this.session = null;
    await this.ensure();
  }

  async send(input) {
    const s = await this.ensure();
    const res = await s?.prompt(input);
    const out = res?.output ?? res?.output_text ?? "";
    return String(out).trim();
  }
}

if (typeof window !== 'undefined') {
  window.PromptService = PromptService;
  console.log('✅ PromptService exported to window');
  console.log('PromptService type:', typeof window.PromptService);
} else {
  console.error('❌ Window object not available - classes not exported');
}