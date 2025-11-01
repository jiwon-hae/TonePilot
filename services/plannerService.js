export class PlannerService {
  constructor(apiService, searchService, memoryService) {
    this.api = apiService;
    this.search = searchService;
    this.memory = memoryService;
  }

  async generatePlanReAct(query) {
    const history = [];
    let reasoning = `Task: ${query}\nLet's plan step by step.`;
    let finalAnswer = null;

    for (let step = 0; step < 5; step++) {
      // 🧠 Step 1: Reason
      const thoughtPrompt = `
        ${reasoning}
        You can: (1) Search, (2) RecallMemory, or (3) Finish.
        Respond with JSON:
        {"thought":"...","action":"Search|RecallMemory|Finish","query":"..."}
      `;
      const decision = await this.api.query(thoughtPrompt, { parseJson: true });
      history.push(decision);

      // ⚙️ Step 2: Act
      let observation;
      if (decision.action === "Search") {
        observation = await this.search.searchWeb(decision.query);
      } else if (decision.action === "RecallMemory") {
        observation = this.memory.getRelevantContextString(decision.query, 3);
      } else if (decision.action === "Finish") {
        finalAnswer = decision.thought;
        break;
      }

      // 👀 Step 3: Observe
      reasoning += `
Thought: ${decision.thought}
Action: ${decision.action}(${decision.query})
Observation: ${JSON.stringify(observation).slice(0, 500)}
`;
    }

    // 🏁 Step 4: Summarize Plan
    const planPrompt = `
${reasoning}
Now, produce a structured plan with numbered steps, each with reasoning and outcome.
`;
    const plan = await this.api.query(planPrompt);

    return { type: "plan", primary: plan, trace: history };
  }
}