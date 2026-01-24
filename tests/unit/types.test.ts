import type {
  MealCategory,
  MealRating,
  LogLevel,
  Meal,
  ChatMessage,
} from '@/lib/types';

describe('types', () => {
  describe('MealCategory', () => {
    it('should accept valid category values', () => {
      const categories: MealCategory[] = ['non_processed', 'restaurant', 'processed'];
      expect(categories).toHaveLength(3);
    });
  });

  describe('MealRating', () => {
    it('should accept valid rating values', () => {
      const ratings: MealRating[] = ['liked', 'disliked'];
      expect(ratings).toHaveLength(2);
    });
  });

  describe('LogLevel', () => {
    it('should accept valid log level values', () => {
      const levels: LogLevel[] = ['info', 'debug', 'error'];
      expect(levels).toHaveLength(3);
    });
  });

  describe('Meal type', () => {
    it('should have required fields', () => {
      const meal: Meal = {
        id: '123',
        user_id: '456',
        meal_description: 'Test meal',
        category: 'processed',
        rating: null,
        estimated_calories: 500,
        estimated_protein: 20,
        estimated_carbs: 60,
        estimated_fats: 15,
        logged_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };

      expect(meal.id).toBe('123');
      expect(meal.category).toBe('processed');
      expect(meal.rating).toBeNull();
    });
  });

  describe('ChatMessage type', () => {
    it('should have role and content', () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' },
        { role: 'system', content: 'You are helpful' },
      ];

      expect(messages[0].role).toBe('user');
      expect(messages[1].role).toBe('assistant');
      expect(messages[2].role).toBe('system');
    });
  });
});
