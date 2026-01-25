// Database types
export interface User {
  id: string;
  name: string;
  email: string | null;
  created_at: string;
}

export interface MealComponent {
  id: string;
  meal_id: string;
  component_name: string;
  category: MealCategory;
  reasoning: string | null;
  created_at: string;
}

export interface Meal {
  id: string;
  user_id: string;
  meal_description: string;
  category: MealCategory;
  overall_category: OverallCategory | null;
  rating: MealRating | null;
  estimated_calories: number | null;
  estimated_protein: number | null;
  estimated_carbs: number | null;
  estimated_fats: number | null;
  logged_at: string;
  created_at: string;
  components?: MealComponent[];
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
export type OverallCategory = 'home_cooked' | 'mixed' | 'restaurant' | 'processed';
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
  overall_category?: OverallCategory;
  components?: LLMComponentResponse[];
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

// v1.1: Component-based summary types
export interface ComponentStats {
  total: number;
  byCategory: {
    non_processed: number;
    restaurant: number;
    processed: number;
  };
  percentages: {
    non_processed: string;
    restaurant: string;
    processed: string;
  };
}

export interface MealStats {
  total: number;
  byCategory: {
    home_cooked: number;
    mixed: number;
    restaurant: number;
    processed: number;
  };
}

export interface WeeklySummaryV2 {
  dateRange: { start: string; end: string };
  componentStats: ComponentStats;
  meals: Meal[];
  mealStats: MealStats;
  byRating: {
    liked: number;
    disliked: number;
    unrated: number;
  };
  averageCalories: number;
  insights: string[];
}

// LLM Response types
export interface LLMComponentResponse {
  name: string;
  category: MealCategory;
  reasoning: string;
}

export interface LLMCategorizationResponse {
  isComplete: boolean;
  followUpQuestion?: string;
  // Legacy single-category fields (kept for backward compatibility)
  category?: MealCategory;
  nutritionEstimate?: NutritionEstimate;
  reasoning?: string;
  // v1.1: Component-based response
  components?: LLMComponentResponse[];
  overall_category?: OverallCategory;
  calories?: number;
  protein?: number;
  carbs?: number;
  fats?: number;
}
