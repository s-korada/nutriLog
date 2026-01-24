import { estimateTokens, logAgentActivity } from '@/lib/logger';

// Mock Supabase to avoid actual database calls
const mockInsert = jest.fn(() => ({ error: null }));
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      insert: mockInsert,
    })),
  },
}));

describe('logger', () => {
  describe('estimateTokens', () => {
    it('should estimate tokens based on character count', () => {
      // ~4 characters per token
      const shortText = 'Hello'; // 5 chars -> ~2 tokens
      expect(estimateTokens(shortText)).toBe(2);
    });

    it('should handle empty string', () => {
      expect(estimateTokens('')).toBe(0);
    });

    it('should handle longer text', () => {
      const text = 'This is a longer piece of text that should have more tokens';
      const tokens = estimateTokens(text);
      expect(tokens).toBeGreaterThan(10);
      expect(tokens).toBeLessThan(20);
    });

    it('should round up token count', () => {
      // 5 characters / 4 = 1.25, should round up to 2
      expect(estimateTokens('Hello')).toBe(2);
    });
  });

  describe('logAgentActivity', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should be defined', () => {
      expect(logAgentActivity).toBeDefined();
      expect(typeof logAgentActivity).toBe('function');
    });

    it('should log conversation-start type', async () => {
      await logAgentActivity('conversation-start', { learningNote: 'test' }, null);
      expect(mockInsert).toHaveBeenCalled();
    });

    it('should log prompt-construction type', async () => {
      await logAgentActivity('prompt-construction', { conversationTurns: 3 }, 'meal-123');
      expect(mockInsert).toHaveBeenCalled();
    });

    it('should log llm-request type', async () => {
      await logAgentActivity('llm-request', { model: 'llama-3.1' }, 'meal-123');
      expect(mockInsert).toHaveBeenCalled();
    });

    it('should log llm-response type', async () => {
      await logAgentActivity('llm-response', { responseTokens: 100 }, 'meal-123');
      expect(mockInsert).toHaveBeenCalled();
    });

    it('should log llm-error type with error level', async () => {
      await logAgentActivity('llm-error', { error: 'timeout' }, 'meal-123', 'error');
      expect(mockInsert).toHaveBeenCalled();
    });

    it('should log categorization-decision type', async () => {
      await logAgentActivity('categorization-decision', { category: 'processed' }, 'meal-123');
      expect(mockInsert).toHaveBeenCalled();
    });

    it('should log follow-up-question type', async () => {
      await logAgentActivity('follow-up-question', { question: 'Was it homemade?' }, 'meal-123');
      expect(mockInsert).toHaveBeenCalled();
    });

    it('should log meal-complete type', async () => {
      await logAgentActivity('meal-complete', { category: 'restaurant' }, 'meal-123');
      expect(mockInsert).toHaveBeenCalled();
    });

    it('should log rating-submitted type', async () => {
      await logAgentActivity('rating-submitted', { rating: 'liked' }, 'meal-123');
      expect(mockInsert).toHaveBeenCalled();
    });

    it('should log weekly-summary type', async () => {
      await logAgentActivity('weekly-summary', { totalMeals: 10 }, null);
      expect(mockInsert).toHaveBeenCalled();
    });

    it('should log database-error type', async () => {
      await logAgentActivity('database-error', { operation: 'insert' }, null, 'error');
      expect(mockInsert).toHaveBeenCalled();
    });

    it('should log validation-error type', async () => {
      await logAgentActivity('validation-error', { field: 'category' }, 'meal-123', 'error');
      expect(mockInsert).toHaveBeenCalled();
    });

    it('should log unknown type with default message', async () => {
      await logAgentActivity('unknown-type', { data: 'test' }, null);
      expect(mockInsert).toHaveBeenCalled();
    });

    it('should handle database insert errors gracefully', async () => {
      mockInsert.mockReturnValueOnce({ error: { message: 'DB error' } });
      // Should not throw
      await expect(logAgentActivity('test', {}, null)).resolves.not.toThrow();
    });
  });
});
