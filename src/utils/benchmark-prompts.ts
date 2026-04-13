export interface BenchmarkPrompt {
  id: string;
  category: 'Logic' | 'Creativity' | 'Coding' | 'Summary';
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
    id: 'logic-2',
    category: 'Logic',
    title: 'The Counter-Intuitive Murder',
    prompt: 'A man is found dead in his study. The room is locked from the inside. There is a puddle of water and a piece of ice on the floor, but no weapon. How did he die and what was the cause? Think outside the box.'
  },
  {
    id: 'coding-1',
    category: 'Coding',
    title: 'Optimized Fibonacci',
    prompt: 'Write a Python function to calculate the Nth Fibonacci number using a space-optimized iterative approach (O(1) space). Explain why this is better than a naive recursive approach.'
  },
  {
    id: 'coding-2',
    category: 'Coding',
    title: 'SQL Schema Design',
    prompt: 'Design a normalized SQL schema for a simple blog system with Users, Posts, Comments, and Tags. Provide the CREATE TABLE statements and explain the relationships.'
  },
  {
    id: 'creativity-1',
    category: 'Creativity',
    title: 'Cyberpunk Metaphor',
    prompt: 'Write a single paragraph describing a futuristic city using only metaphors related to the human circulatory system. Do not use the word "neon" or "traffic".'
  },
  {
    id: 'creativity-2',
    category: 'Creativity',
    title: 'Character Dialogue',
    prompt: 'Write a dialogue between a time traveler from 1850 and a modern teenager trying to explain what the Internet is without using any electrical or technical terms.'
  },
  {
    id: 'summary-1',
    category: 'Summary',
    title: 'Complex Distillation',
    prompt: 'Summarize the core concept of Quantum Entanglement into a single sentence that a five-year-old could understand, without losing the scientific essence.'
  }
];
