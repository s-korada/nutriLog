// Database types
export interface User {
  id: string;
  name: string;
  email: string | null;
  created_at: string;
}

export interface Meal {
  id: string;
  user_id: string;
  meal_description: string;
  category: MealCategory;
  rating: MealRating | null;
  estimated_calories: number | null;
  estimated_protein: number | null;
  estimated_carbs: number | null;
  estimated_fats: number | null;
  logged_at: string;
  created_at: string;
}

export interface Conversation {
  id: string;
  meal_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface AgentLog {
  id: string;
  meal_id: string | null;
  log_level: LogLevel;
  log_type: string;
  message: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

// Enums
export type MealCategory = 'non_processed' | 'restaurant' | 'processed';
export type MealRating = 'liked' | 'disliked';
export type LogLevel = 'info' | 'debug' | 'error';

// API types
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatRequest {
  message: string;
  mealId?: string;
  conversationHistory?: ChatMessage[];
}

export interface ChatResponse {
  response: string;
  mealId?: string;
  isComplete?: boolean;
  category?: MealCategory;
  nutritionEstimate?: NutritionEstimate;
  error?: string;
}

export interface NutritionEstimate {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

export interface MealSummary {
  totalMeals: number;
  byCategory: {
    non_processed: number;
    restaurant: number;
    processed: number;
  };
  byRating: {
    liked: number;
    disliked: number;
    unrated: number;
  };
  averageCalories: number;
  insights: string[];
  likedMeals: Meal[];
  dislikedMeals: Meal[];
}

// LLM Response types
export interface LLMCategorizationResponse {
  isComplete: boolean;
  followUpQuestion?: string;
  category?: MealCategory;
  nutritionEstimate?: NutritionEstimate;
  reasoning?: string;
}
