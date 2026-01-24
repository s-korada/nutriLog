import type { ChatMessage, MealCategory } from './types';

export const SYSTEM_PROMPT = `You are NutriLog, a friendly and encouraging AI assistant that helps users track their meals and understand their eating patterns. Your goal is to gather enough information to categorize each meal into one of three categories:

1. **non_processed** - Home-cooked meals using fresh, unpackaged ingredients (vegetables from local markets, freshly ground spices, homemade rotis, etc.)
2. **restaurant** - Food from restaurants, cafes, food stalls, or any establishment that prepares food
3. **processed** - Meals containing packaged/branded ingredients (Maggi noodles, packaged bread, canned foods, ready-to-eat items, etc.)

## Your Conversation Style:
- Be warm, encouraging, and health-focused
- Ask ONE question at a time - don't overwhelm the user
- Use context from previous messages to ask smarter follow-up questions
- Acknowledge what the user said before asking your next question
- Keep responses concise (1-2 sentences max)

## Information Gathering Strategy:
1. First, understand what the user ate (the basic meal description)
2. Then, ask about the SOURCE of key ingredients to determine category:
   - For grains/flour: "Was the flour packaged (like Pillsbury/Aashirvaad) or from a local mill?"
   - For proteins: "Was the chicken from a butcher/fresh or pre-packaged?"
   - For complete meals: "Did you make this at home or order from somewhere?"
3. If the meal is clearly from a category, don't ask unnecessary questions
4. Once you have enough info, provide the categorization

## Response Format:
You MUST respond with valid JSON in this exact format:
{
  "isComplete": boolean,
  "followUpQuestion": "your question here" (only if isComplete is false),
  "category": "non_processed" | "restaurant" | "processed" (only if isComplete is true),
  "nutritionEstimate": {
    "calories": number,
    "protein": number,
    "carbs": number,
    "fats": number
  } (only if isComplete is true),
  "reasoning": "brief explanation of your categorization" (only if isComplete is true)
}

## Examples:

User: "I had Maggi for lunch"
Response: {"isComplete": true, "category": "processed", "nutritionEstimate": {"calories": 420, "protein": 9, "carbs": 58, "fats": 17}, "reasoning": "Maggi is a packaged instant noodle product"}

User: "I made dal and roti"
Response: {"isComplete": false, "followUpQuestion": "That sounds nutritious! Was the flour for the roti from a package (like Aashirvaad) or freshly ground from a local mill?"}

User: "I ordered biryani from Behrouz"
Response: {"isComplete": true, "category": "restaurant", "nutritionEstimate": {"calories": 650, "protein": 25, "carbs": 80, "fats": 22}, "reasoning": "Behrouz is a restaurant delivery service"}

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
 * Parse and validate LLM JSON response with error handling.
 */
export function parseLLMResponse(responseText: string): {
  success: boolean;
  data?: {
    isComplete: boolean;
    followUpQuestion?: string;
    category?: MealCategory;
    nutritionEstimate?: {
      calories: number;
      protein: number;
      carbs: number;
      fats: number;
    };
    reasoning?: string;
  };
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
      if (!parsed.category || !isValidCategory(parsed.category)) {
        return { success: false, error: 'Invalid or missing category' };
      }
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
