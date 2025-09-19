export class PromptService {
  private session: any;

  async init(initialPrompt: string) {
    this.session = await (window as any).ai.languageModel.create({
      initialPrompts: [{ role: "system", content: initialPrompt }],
    });
  }

  async send(input: string): Promise<string> {
    if (!this.session) throw new Error("Prompt session not initialized");
    const result = await this.session.prompt(input);
    return result.output;
  }
}