export interface BenchmarkPrompt {
  id: string;
  category: 'Logic' | 'Creativity' | 'Coding' | 'Summary' | 'Function' | 'JSON' | 'ToolUse' | 'LongText';
  title: string;
  prompt: string;
}

export const BENCHMARK_PROMPTS: BenchmarkPrompt[] = [
  {
    id: 'logic-1',
    category: 'Logic',
    title: 'Transitive Reasoning',
    prompt: 'If Sally has 3 brothers, and each of her brothers has 2 sisters, how many sisters does Sally have? Explain your reasoning step-by-step.'
  },
  {
    id: 'json-1',
    category: 'JSON',
    title: 'Strict Schema Extraction',
    prompt: 'Extract the entities (people, places, dates) from this text and return ONLY a valid JSON object: "John Doe visited Paris on January 1st, 2024, to meet with Jane at the Eiffel Tower." Do not include any explanation.'
  },
  {
    id: 'coding-1',
    category: 'Coding',
    title: 'Optimized Fibonacci',
    prompt: 'Write a Python function to calculate the Nth Fibonacci number using a space-optimized iterative approach (O(1) space). Explain why this is better than a naive recursive approach.'
  },
  {
    id: 'function-1',
    category: 'Function',
    title: 'Recursive Pattern Match',
    prompt: 'Write a TypeScript function that deeply flattens a nested object, including arrays, into a single-level object with dot-notation keys. Handle edge cases like null and dates.'
  },
  {
    id: 'tooluse-1',
    category: 'ToolUse',
    title: 'Mock Tool Orchestration',
    prompt: 'You have access to a tool `get_weather(city: string)`. If a user asks "What should I wear in London today?", what tool call would you make and why? Respond with the tool call and the reasoning.'
  },
  {
    id: 'longtext-1',
    category: 'LongText',
    title: 'Analytic Summarization',
    prompt: 'Analyze the impact of artificial intelligence on the job market for creative professionals. Provide a pros/cons list and a 3-paragraph executive summary focusing on the next 5 years.'
  },
  {
    id: 'creativity-1',
    category: 'Creativity',
    title: 'Cyberpunk Metaphor',
    prompt: 'Write a single paragraph describing a futuristic city using only metaphors related to the human circulatory system. Do not use the word "neon" or "traffic".'
  }
];

export const FULL_AUDIT_SUITE = BENCHMARK_PROMPTS.map(p => p.id);
