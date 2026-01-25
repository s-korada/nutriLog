import {
  buildPromptMessages,
  truncateConversationHistory,
  isValidCategory,
  isValidOverallCategory,
  calculateOverallCategory,
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
      expect(SYSTEM_PROMPT).toContain('components');
    });

    it('should contain v1.1 component-based format', () => {
      expect(SYSTEM_PROMPT).toContain('overall_category');
      expect(SYSTEM_PROMPT).toContain('home_cooked');
      expect(SYSTEM_PROMPT).toContain('mixed');
    });

    it('should contain Indian food examples', () => {
      expect(SYSTEM_PROMPT).toContain('Maggi');
      expect(SYSTEM_PROMPT).toContain('biryani');
      expect(SYSTEM_PROMPT).toContain('paratha');
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

  describe('isValidOverallCategory', () => {
    it('should return true for valid overall categories', () => {
      expect(isValidOverallCategory('home_cooked')).toBe(true);
      expect(isValidOverallCategory('mixed')).toBe(true);
      expect(isValidOverallCategory('restaurant')).toBe(true);
      expect(isValidOverallCategory('processed')).toBe(true);
    });

    it('should return false for invalid overall categories', () => {
      expect(isValidOverallCategory('non_processed')).toBe(false);
      expect(isValidOverallCategory('invalid')).toBe(false);
      expect(isValidOverallCategory('')).toBe(false);
    });
  });

  describe('calculateOverallCategory', () => {
    it('should return home_cooked when all components are non_processed', () => {
      const components = [
        { category: 'non_processed' as const },
        { category: 'non_processed' as const },
      ];
      expect(calculateOverallCategory(components)).toBe('home_cooked');
    });

    it('should return restaurant when all components are restaurant', () => {
      const components = [
        { category: 'restaurant' as const },
        { category: 'restaurant' as const },
      ];
      expect(calculateOverallCategory(components)).toBe('restaurant');
    });

    it('should return processed when all components are processed', () => {
      const components = [
        { category: 'processed' as const },
        { category: 'processed' as const },
      ];
      expect(calculateOverallCategory(components)).toBe('processed');
    });

    it('should return mixed when components have different categories', () => {
      const components = [
        { category: 'non_processed' as const },
        { category: 'processed' as const },
      ];
      expect(calculateOverallCategory(components)).toBe('mixed');
    });

    it('should return mixed for empty components', () => {
      expect(calculateOverallCategory([])).toBe('mixed');
    });

    it('should handle single component correctly', () => {
      expect(calculateOverallCategory([{ category: 'non_processed' as const }])).toBe('home_cooked');
      expect(calculateOverallCategory([{ category: 'restaurant' as const }])).toBe('restaurant');
      expect(calculateOverallCategory([{ category: 'processed' as const }])).toBe('processed');
    });
  });

  describe('parseLLMResponse', () => {
    // Legacy single-category responses
    it('should parse valid legacy complete response', () => {
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

    it('should treat short invalid JSON as follow-up question (fallback)', () => {
      const result = parseLLMResponse('not valid json');
      // With fallback, short text is treated as a follow-up question
      expect(result.success).toBe(true);
      expect(result.data?.isComplete).toBe(false);
      expect(result.data?.followUpQuestion).toBe('not valid json');
    });

    it('should return error for missing isComplete', () => {
      const response = JSON.stringify({ category: 'processed' });
      const result = parseLLMResponse(response);

      expect(result.success).toBe(false);
      expect(result.error).toContain('isComplete');
    });

    it('should return error for invalid category when complete (legacy)', () => {
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

    // v1.1: Component-based responses
    it('should parse valid component-based response', () => {
      const response = JSON.stringify({
        isComplete: true,
        components: [
          { name: 'paratha', category: 'non_processed', reasoning: 'Homemade' },
          { name: 'curd', category: 'processed', reasoning: 'Amul brand' },
        ],
        overall_category: 'mixed',
        calories: 400,
        protein: 15,
        carbs: 50,
        fats: 12,
      });

      const result = parseLLMResponse(response);
      expect(result.success).toBe(true);
      expect(result.data?.isComplete).toBe(true);
      expect(result.data?.components).toHaveLength(2);
      expect(result.data?.overall_category).toBe('mixed');
      expect(result.data?.calories).toBe(400);
    });

    it('should calculate overall_category if not provided', () => {
      const response = JSON.stringify({
        isComplete: true,
        components: [
          { name: 'rice', category: 'non_processed', reasoning: 'Homemade' },
          { name: 'dal', category: 'non_processed', reasoning: 'Homemade' },
        ],
        calories: 500,
      });

      const result = parseLLMResponse(response);
      expect(result.success).toBe(true);
      expect(result.data?.overall_category).toBe('home_cooked');
    });

    it('should validate component categories', () => {
      const response = JSON.stringify({
        isComplete: true,
        components: [
          { name: 'paratha', category: 'invalid_category', reasoning: 'Test' },
        ],
        overall_category: 'mixed',
      });

      const result = parseLLMResponse(response);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid category');
    });

    it('should validate component has name', () => {
      const response = JSON.stringify({
        isComplete: true,
        components: [
          { category: 'non_processed', reasoning: 'Test' },
        ],
        overall_category: 'home_cooked',
      });

      const result = parseLLMResponse(response);
      expect(result.success).toBe(false);
      expect(result.error).toContain('name');
    });

    it('should validate overall_category value', () => {
      const response = JSON.stringify({
        isComplete: true,
        components: [
          { name: 'rice', category: 'non_processed', reasoning: 'Test' },
        ],
        overall_category: 'invalid_overall',
      });

      const result = parseLLMResponse(response);
      expect(result.success).toBe(false);
      expect(result.error).toContain('overall_category');
    });

    it('should handle single component response', () => {
      const response = JSON.stringify({
        isComplete: true,
        components: [
          { name: 'Maggi noodles', category: 'processed', reasoning: 'Packaged instant noodles' },
        ],
        overall_category: 'processed',
        calories: 420,
        protein: 9,
        carbs: 58,
        fats: 17,
      });

      const result = parseLLMResponse(response);
      expect(result.success).toBe(true);
      expect(result.data?.components).toHaveLength(1);
      expect(result.data?.overall_category).toBe('processed');
    });

    // Fallback behavior tests
    it('should treat plain text as follow-up question (fallback)', () => {
      const response = 'So the chicken was from a local butcher. Was the biryani made at home or ordered?';
      const result = parseLLMResponse(response);

      expect(result.success).toBe(true);
      expect(result.data?.isComplete).toBe(false);
      expect(result.data?.followUpQuestion).toBe(response);
    });

    it('should extract JSON from mixed text response', () => {
      const response = 'Here is my response: {"isComplete": false, "followUpQuestion": "Was it homemade?"}';
      const result = parseLLMResponse(response);

      expect(result.success).toBe(true);
      expect(result.data?.isComplete).toBe(false);
      expect(result.data?.followUpQuestion).toBe('Was it homemade?');
    });

    it('should reject very long plain text responses', () => {
      const response = 'a'.repeat(1500); // Too long to be a reasonable follow-up
      const result = parseLLMResponse(response);

      expect(result.success).toBe(false);
    });
  });
});
