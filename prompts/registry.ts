export const prompts = {
    summarize: `
  You are a helpful assistant.
  Summarize the following text in <= {{ maxWords }} words:
  ---
  {{ text }}
  ---`,
    qa: `
  Answer the question concisely:
  Q: {{ question }}
  Context: {{ context }}
  A:
  `
  };