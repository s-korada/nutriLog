import type { ChatMessage, MealCategory, OverallCategory } from './types';

export const SYSTEM_PROMPT = `You are NutriLog, a friendly AI assistant that helps users track their meals by breaking them down into individual components.

## CATEGORIZATION RULES

**Non-Processed (Home Cooked):**
- Ingredients from local markets, vendors, farmers markets (loose flour, fresh vegetables, butcher meat)
- Food cooked at home from raw ingredients
- Vegetables, rice, atta purchased loose from supermarket or local stores
- Examples: Roti from loose atta, chicken curry with fresh chicken, dal from raw lentils, sabzi from fresh vegetables, idli/dosa from homemade batter

**Restaurant/External:**
- Food from restaurants, takeout, delivery, dining out
- Examples: Restaurant biryani, KFC chicken, Domino's pizza, food court meals, Zomato/Swiggy orders, Uber Eats, cafe food

**Processed/Packaged:**
- Packaged ingredients with brand names
- Store-bought processed items from supermarkets
- Examples: Amul curd, packaged bread, Maggi noodles, Britannia biscuits, store-bought paneer, Pilsbury/Aashirvaad atta, Melkan curd, canned foods, ready-to-eat items

## EDGE CASES
- Supermarket mention (Albert Heijn, Walmart, etc.) for packaged items → Processed
- "Local vendor" / "farmers market" / "loose from store" → Non-processed
- Homemade with packaged flour → Component breakdown (meal home-cooked, flour component processed)
- Healthy restaurant food → Still Restaurant (location matters, not healthiness)
- Mixed meal (e.g., homemade paratha with store-bought curd) → Break into components

## YOUR JOB
1. Break down the meal into individual components/items
2. Ask clarifying questions about EACH component's source if unclear
3. Categorize each component separately
4. Ask ONE question at a time, be conversational and brief

## RESPONSE FORMAT

When you have enough info about ALL components, respond with:
{
  "isComplete": true,
  "components": [
    {
      "name": "beetroot parathas",
      "category": "non_processed",
      "reasoning": "Made at home with flour from local market"
    },
    {
      "name": "curd",
      "category": "processed",
      "reasoning": "Store-bought Amul curd from supermarket"
    }
  ],
  "overall_category": "mixed",
  "calories": 400,
  "protein": 15,
  "carbs": 50,
  "fats": 12
}

If you need more info, respond with:
{
  "isComplete": false,
  "followUpQuestion": "Your question here"
}

## OVERALL CATEGORY RULES
- "home_cooked" = ALL components are non_processed
- "restaurant" = ALL components are restaurant
- "processed" = ALL components are processed
- "mixed" = components from multiple categories

## EXAMPLES

User: "I had Maggi for lunch"
Response: {"isComplete": true, "components": [{"name": "Maggi noodles", "category": "processed", "reasoning": "Maggi is a packaged instant noodle product"}], "overall_category": "processed", "calories": 420, "protein": 9, "carbs": 58, "fats": 17}

User: "I made dal and roti"
Response: {"isComplete": false, "followUpQuestion": "That sounds nutritious! Was the flour for the roti from a package (like Aashirvaad) or loose from a local store?"}

User: "I ordered biryani from Behrouz"
Response: {"isComplete": true, "components": [{"name": "Behrouz biryani", "category": "restaurant", "reasoning": "Ordered from Behrouz restaurant delivery"}], "overall_category": "restaurant", "calories": 650, "protein": 25, "carbs": 80, "fats": 22}

User: "Beetroot parathas with Amul curd"
Response: {"isComplete": false, "followUpQuestion": "Yum! Did you make the parathas at home? And was the flour packaged or from a local store?"}

Remember: Always respond with valid JSON only, no additional text.`;

/**
 * Build the messages array for the LLM, including system prompt and conversation history.
 */
export function buildPromptMessages(
  conversationHistory: ChatMessage[],
  newUserMessage: string
): ChatMessage[] {
  const messages: ChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...conversationHistory,
    { role: 'user', content: newUserMessage },
  ];

  return messages;
}

/**
 * Truncate conversation history to stay within context window limits.
 * Keeps the most recent messages (last 10 turns = 20 messages).
 */
export function truncateConversationHistory(
  history: ChatMessage[],
  maxTurns: number = 10
): ChatMessage[] {
  const maxMessages = maxTurns * 2; // Each turn has user + assistant message
  if (history.length <= maxMessages) {
    return history;
  }
  return history.slice(-maxMessages);
}

/**
 * Validate that the LLM response contains a valid category.
 */
export function isValidCategory(category: string): category is MealCategory {
  return ['non_processed', 'restaurant', 'processed'].includes(category);
}

/**
 * Validate that the overall category is valid.
 */
export function isValidOverallCategory(category: string): category is OverallCategory {
  return ['home_cooked', 'mixed', 'restaurant', 'processed'].includes(category);
}

/**
 * Calculate overall category from components.
 */
export function calculateOverallCategory(components: Array<{ category: MealCategory }>): OverallCategory {
  if (components.length === 0) return 'mixed';

  const categories = new Set(components.map(c => c.category));

  if (categories.size === 1) {
    const singleCategory = components[0].category;
    if (singleCategory === 'non_processed') return 'home_cooked';
    if (singleCategory === 'restaurant') return 'restaurant';
    if (singleCategory === 'processed') return 'processed';
  }

  return 'mixed';
}

export interface ParsedLLMResponse {
  isComplete: boolean;
  followUpQuestion?: string;
  // Legacy single-category (kept for backward compatibility)
  category?: MealCategory;
  nutritionEstimate?: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  };
  reasoning?: string;
  // v1.1: Component-based
  components?: Array<{
    name: string;
    category: MealCategory;
    reasoning: string;
  }>;
  overall_category?: OverallCategory;
  calories?: number;
  protein?: number;
  carbs?: number;
  fats?: number;
}

/**
 * Parse and validate LLM JSON response with error handling.
 * Supports both legacy single-category and v1.1 component-based formats.
 */
export function parseLLMResponse(responseText: string): {
  success: boolean;
  data?: ParsedLLMResponse;
  error?: string;
} {
  try {
    // Strip markdown code blocks if present
    const cleanedResponse = responseText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    const parsed = JSON.parse(cleanedResponse);

    // Validate required fields
    if (typeof parsed.isComplete !== 'boolean') {
      return { success: false, error: 'Missing or invalid isComplete field' };
    }

    if (parsed.isComplete) {
      // v1.1: Check for component-based response first
      if (parsed.components && Array.isArray(parsed.components)) {
        // Validate each component
        for (const comp of parsed.components) {
          if (!comp.name || typeof comp.name !== 'string') {
            return { success: false, error: 'Component missing name' };
          }
          if (!comp.category || !isValidCategory(comp.category)) {
            return { success: false, error: `Invalid category for component: ${comp.name}` };
          }
        }

        // Validate or calculate overall_category
        if (parsed.overall_category && !isValidOverallCategory(parsed.overall_category)) {
          return { success: false, error: 'Invalid overall_category' };
        }

        // If overall_category not provided, calculate it
        if (!parsed.overall_category) {
          parsed.overall_category = calculateOverallCategory(parsed.components);
        }

        return { success: true, data: parsed };
      }

      // Legacy: single category response
      if (!parsed.category || !isValidCategory(parsed.category)) {
        return { success: false, error: 'Invalid or missing category' };
      }

      return { success: true, data: parsed };
    } else {
      if (!parsed.followUpQuestion || typeof parsed.followUpQuestion !== 'string') {
        return { success: false, error: 'Missing follow-up question' };
      }
    }

    return { success: true, data: parsed };
  } catch (err) {
    return { success: false, error: `JSON parse error: ${(err as Error).message}` };
  }
}
