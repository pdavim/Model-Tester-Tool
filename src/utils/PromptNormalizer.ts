/**
 * Utility to normalize chat messages for specific model quirks.
 */
import { MessageSchema } from '../api/validation/chat.schema';
import { z } from 'zod';

type Message = z.infer<typeof MessageSchema>;

export class PromptNormalizer {
  /**
   * Identifies if a model is "picky" about system prompts or other structural elements.
   * Models like Gemma and Qwen often work better when the system prompt is merged into the first user message.
   */
  static isPickyModel(model: string): boolean {
    const pickyPatterns = [
      /gemma/i,
      /qwen/i,
      /dolphin/i,
      /deepseek-r1/i,
 // Some versions are also picky
      /command-r/i,
    ];
    return pickyPatterns.some(pattern => pattern.test(model));
  }

  /**
   * Normalizes the messages array based on the target model.
   */
  static normalize(model: string, messages: Message[]): Message[] {
    if (!this.isPickyModel(model)) {
      return messages;
    }

    // Clone to avoid mutating original
    let normalized = [...messages];

    // Find system message
    const systemIndex = normalized.findIndex(m => m.role === 'system');
    
    if (systemIndex !== -1) {
      const systemMessage = normalized[systemIndex];
      normalized.splice(systemIndex, 1);

      // Find first user message to merge system into
      const firstUserIndex = normalized.findIndex(m => m.role === 'user');
      
      const systemContent = typeof systemMessage.content === 'string' 
        ? systemMessage.content 
        : JSON.stringify(systemMessage.content);

      if (firstUserIndex !== -1) {
        const userMsg = normalized[firstUserIndex];
        const userContent = typeof userMsg.content === 'string' 
          ? userMsg.content 
          : JSON.stringify(userMsg.content);

        normalized[firstUserIndex] = {
          ...userMsg,
          content: `Instructions: ${systemContent}\n\nUser Question: ${userContent}`
        };
      } else {
        // If no user message yet (unlikely in chat but possible), 
        // convert system to user as the starting point
        normalized.unshift({
          role: 'user',
          content: systemContent
        });
      }
    }

    // Ensure alternating roles (User -> Assistant -> User ...)
    // Some models (like Gemma) strictly require this alternation.
    return this.ensureAlternatingRoles(normalized);
  }

  /**
   * Ensures that roles alternate between user and assistant.
   * Merges consecutive messages of the same role.
   */
  private static ensureAlternatingRoles(messages: Message[]): Message[] {
    if (messages.length === 0) return messages;

    const result: Message[] = [];
    
    for (const msg of messages) {
      if (result.length > 0 && result[result.length - 1].role === msg.role) {
        // Merge with previous message of same role
        const prev = result[result.length - 1];
        const prevContent = typeof prev.content === 'string' ? prev.content : JSON.stringify(prev.content);
        const currContent = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
        
        result[result.length - 1] = {
          ...prev,
          content: `${prevContent}\n\n${currContent}`
        };
      } else {
        result.push(msg);
      }
    }

    // Ensure it starts with a 'user' message if possible
    if (result.length > 0 && result[0].role === 'assistant') {
      const first = result.shift()!;
      if (result.length > 0 && result[0].role === 'user') {
        const nextUser = result[0];
        const firstContent = typeof first.content === 'string' ? first.content : JSON.stringify(first.content);
        const userContent = typeof nextUser.content === 'string' ? nextUser.content : JSON.stringify(nextUser.content);
        
        result[0] = {
          ...nextUser,
          content: `Assistant Context: ${firstContent}\n\nUser Question: ${userContent}`
        };
      } else {
        // Fallback: convert first assistant message to user
        result.unshift({
          ...first,
          role: 'user'
        });
      }
    }

    return result;
  }
}
