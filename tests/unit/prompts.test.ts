import {
  buildPromptMessages,
  truncateConversationHistory,
  isValidCategory,
  parseLLMResponse,
  SYSTEM_PROMPT,
} from '@/lib/prompts';
import type { ChatMessage } from '@/lib/types';

describe('prompts', () => {
  describe('SYSTEM_PROMPT', () => {
    it('should contain category definitions', () => {
      expect(SYSTEM_PROMPT).toContain('non_processed');
      expect(SYSTEM_PROMPT).toContain('restaurant');
      expect(SYSTEM_PROMPT).toContain('processed');
    });

    it('should define JSON response format', () => {
      expect(SYSTEM_PROMPT).toContain('isComplete');
      expect(SYSTEM_PROMPT).toContain('followUpQuestion');
      expect(SYSTEM_PROMPT).toContain('category');
    });
  });

  describe('buildPromptMessages', () => {
    it('should include system prompt as first message', () => {
      const messages = buildPromptMessages([], 'I had pizza');
      expect(messages[0].role).toBe('system');
      expect(messages[0].content).toBe(SYSTEM_PROMPT);
    });

    it('should include conversation history', () => {
      const history: ChatMessage[] = [
        { role: 'user', content: 'I had dal' },
        { role: 'assistant', content: 'Was it homemade?' },
      ];
      const messages = buildPromptMessages(history, 'Yes, homemade');

      expect(messages).toHaveLength(4); // system + 2 history + new message
      expect(messages[1].content).toBe('I had dal');
      expect(messages[2].content).toBe('Was it homemade?');
      expect(messages[3].content).toBe('Yes, homemade');
    });

    it('should add new user message at the end', () => {
      const messages = buildPromptMessages([], 'I had roti');
      const lastMessage = messages[messages.length - 1];

      expect(lastMessage.role).toBe('user');
      expect(lastMessage.content).toBe('I had roti');
    });
  });

  describe('truncateConversationHistory', () => {
    it('should not truncate if under limit', () => {
      const history: ChatMessage[] = [
        { role: 'user', content: 'msg1' },
        { role: 'assistant', content: 'msg2' },
      ];
      const result = truncateConversationHistory(history, 10);
      expect(result).toHaveLength(2);
    });

    it('should truncate to last N turns', () => {
      const history: ChatMessage[] = Array.from({ length: 30 }, (_, i) => ({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `msg${i}`,
      })) as ChatMessage[];

      const result = truncateConversationHistory(history, 5);
      expect(result).toHaveLength(10); // 5 turns = 10 messages
      expect(result[0].content).toBe('msg20'); // Should keep last 10 messages
    });

    it('should use default of 10 turns', () => {
      const history: ChatMessage[] = Array.from({ length: 30 }, (_, i) => ({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `msg${i}`,
      })) as ChatMessage[];

      const result = truncateConversationHistory(history);
      expect(result).toHaveLength(20); // 10 turns = 20 messages
    });
  });

  describe('isValidCategory', () => {
    it('should return true for valid categories', () => {
      expect(isValidCategory('non_processed')).toBe(true);
      expect(isValidCategory('restaurant')).toBe(true);
      expect(isValidCategory('processed')).toBe(true);
    });

    it('should return false for invalid categories', () => {
      expect(isValidCategory('invalid')).toBe(false);
      expect(isValidCategory('home_cooked')).toBe(false);
      expect(isValidCategory('')).toBe(false);
    });
  });

  describe('parseLLMResponse', () => {
    it('should parse valid complete response', () => {
      const response = JSON.stringify({
        isComplete: true,
        category: 'processed',
        nutritionEstimate: { calories: 400, protein: 10, carbs: 50, fats: 15 },
        reasoning: 'Maggi is packaged food',
      });

      const result = parseLLMResponse(response);
      expect(result.success).toBe(true);
      expect(result.data?.isComplete).toBe(true);
      expect(result.data?.category).toBe('processed');
    });

    it('should parse valid incomplete response with follow-up', () => {
      const response = JSON.stringify({
        isComplete: false,
        followUpQuestion: 'Was the flour packaged?',
      });

      const result = parseLLMResponse(response);
      expect(result.success).toBe(true);
      expect(result.data?.isComplete).toBe(false);
      expect(result.data?.followUpQuestion).toBe('Was the flour packaged?');
    });

    it('should strip markdown code blocks', () => {
      const response = '```json\n{"isComplete": false, "followUpQuestion": "Test?"}\n```';
      const result = parseLLMResponse(response);

      expect(result.success).toBe(true);
      expect(result.data?.followUpQuestion).toBe('Test?');
    });

    it('should return error for invalid JSON', () => {
      const result = parseLLMResponse('not valid json');
      expect(result.success).toBe(false);
      expect(result.error).toContain('JSON parse error');
    });

    it('should return error for missing isComplete', () => {
      const response = JSON.stringify({ category: 'processed' });
      const result = parseLLMResponse(response);

      expect(result.success).toBe(false);
      expect(result.error).toContain('isComplete');
    });

    it('should return error for invalid category when complete', () => {
      const response = JSON.stringify({
        isComplete: true,
        category: 'invalid_category',
      });

      const result = parseLLMResponse(response);
      expect(result.success).toBe(false);
      expect(result.error).toContain('category');
    });

    it('should return error for missing follow-up when incomplete', () => {
      const response = JSON.stringify({
        isComplete: false,
      });

      const result = parseLLMResponse(response);
      expect(result.success).toBe(false);
      expect(result.error).toContain('follow-up');
    });
  });
});
