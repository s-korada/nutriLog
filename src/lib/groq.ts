import { logAgentActivity, estimateTokens } from './logger';
import { buildPromptMessages, truncateConversationHistory, parseLLMResponse } from './prompts';
import type { ChatMessage, LLMCategorizationResponse } from './types';

const MODEL = 'llama-3.1-8b-instant';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Helper function to call Groq API directly via fetch
async function callGroqAPI(messages: Array<{ role: string; content: string }>, temperature: number, maxTokens: number) {
  const apiKey = process.env.GROQ_API_KEY;

  console.log('GROQ_API_KEY available at runtime:', apiKey ? `Yes (${apiKey.substring(0, 10)}...)` : 'No');

  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not set');
  }

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Groq API Error Response:', response.status, errorText);
    throw new Error(`Groq API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

/**
 * Send a message to the LLM and get a categorization response.
 * Includes comprehensive logging for learning purposes.
 */
export async function getChatResponse(
  userMessage: string,
  conversationHistory: ChatMessage[],
  mealId: string | null
): Promise<{
  success: boolean;
  data?: LLMCategorizationResponse;
  rawResponse?: string;
  error?: string;
}> {
  // Truncate conversation history to manage context window
  const truncatedHistory = truncateConversationHistory(conversationHistory);

  // Build the prompt messages
  const messages = buildPromptMessages(truncatedHistory, userMessage);

  // Log prompt construction
  const fullPromptText = messages.map((m) => m.content).join('\n');
  await logAgentActivity(
    'prompt-construction',
    {
      conversationTurns: truncatedHistory.length / 2,
      systemPromptIncluded: true,
      newMessageLength: userMessage.length,
      estimatedTokens: estimateTokens(fullPromptText),
      learningNote:
        '🎓 Context window management: We include the system prompt + conversation history + new message. The LLM is stateless, so we must send the full context each time.',
    },
    mealId
  );

  try {
    // Log LLM request
    await logAgentActivity(
      'llm-request',
      {
        model: MODEL,
        messageCount: messages.length,
        estimatedInputTokens: estimateTokens(fullPromptText),
        learningNote:
          '🎓 API call: Sending request to Groq API. The model will process our prompt and generate a response based on the full context we provided.',
      },
      mealId
    );

    const startTime = Date.now();

    const completion = await callGroqAPI(
      messages.map((m) => ({
        role: m.role as 'system' | 'user' | 'assistant',
        content: m.content,
      })),
      0.3, // Lower temperature for more consistent categorization
      500
    );

    const responseTime = Date.now() - startTime;
    const responseText = completion.choices[0]?.message?.content || '';

    // Log LLM response
    await logAgentActivity(
      'llm-response',
      {
        model: MODEL,
        responseTime,
        responseTokens: completion.usage?.completion_tokens || 0,
        totalTokens: completion.usage?.total_tokens || 0,
        rawResponse: responseText.substring(0, 500), // Truncate for logging
        learningNote:
          '🎓 Response received: The LLM generated a response. We now need to parse and validate this JSON to ensure it matches our expected format.',
      },
      mealId
    );

    // Parse and validate the response
    const parseResult = parseLLMResponse(responseText);

    if (!parseResult.success) {
      await logAgentActivity(
        'validation-error',
        {
          error: parseResult.error,
          rawResponse: responseText.substring(0, 200),
          learningNote:
            '🎓 Validation failed: LLMs can return unexpected formats. Always validate and have fallback behavior.',
        },
        mealId,
        'error'
      );

      return {
        success: false,
        rawResponse: responseText,
        error: parseResult.error,
      };
    }

    // Log the categorization decision if complete
    if (parseResult.data?.isComplete) {
      await logAgentActivity(
        'categorization-decision',
        {
          category: parseResult.data.category,
          reasoning: parseResult.data.reasoning,
          nutritionEstimate: parseResult.data.nutritionEstimate,
          learningNote:
            '🎓 Categorization complete: The agent has gathered enough information to make a decision. The reasoning field shows the agent\'s thought process.',
        },
        mealId
      );
    } else {
      await logAgentActivity(
        'follow-up-question',
        {
          question: parseResult.data?.followUpQuestion,
          conversationLength: conversationHistory.length + 1,
          learningNote:
            '🎓 Information gathering: The agent needs more info to categorize accurately. It\'s asking a targeted follow-up question based on the conversation context.',
        },
        mealId
      );
    }

    return {
      success: true,
      data: parseResult.data,
      rawResponse: responseText,
    };
  } catch (error) {
    const err = error as Error & { status?: number; code?: string };
    const errorMessage = err.message;

    // Enhanced error logging for debugging
    console.error('Groq API Error Details:', {
      message: errorMessage,
      status: err.status,
      code: err.code,
      name: err.name,
      stack: err.stack?.substring(0, 500),
    });

    await logAgentActivity(
      'llm-error',
      {
        error: errorMessage,
        errorStatus: err.status,
        errorCode: err.code,
        apiKeyPresent: !!process.env.GROQ_API_KEY,
        learningNote:
          '🎓 Error handling: LLM APIs can fail due to rate limits, network issues, or service outages. Always have error handling and graceful degradation.',
      },
      mealId,
      'error'
    );

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Generate weekly insights using the LLM.
 */
export async function generateWeeklyInsights(
  summary: {
    totalMeals: number;
    byCategory: { non_processed: number; restaurant: number; processed: number };
    byRating: { liked: number; disliked: number; unrated: number };
    likedMeals: string[];
    dislikedMeals: string[];
  }
): Promise<string[]> {
  const prompt = `Based on this user's weekly meal data, provide 3-4 personalized, actionable health insights.

Weekly Summary:
- Total meals logged: ${summary.totalMeals}
- Non-processed (home-cooked): ${summary.byCategory.non_processed}
- Restaurant meals: ${summary.byCategory.restaurant}
- Processed food: ${summary.byCategory.processed}

User Preferences:
- Liked meals: ${summary.likedMeals.join(', ') || 'None rated yet'}
- Disliked meals: ${summary.dislikedMeals.join(', ') || 'None rated yet'}

Focus on:
1. Acknowledging positive patterns (especially liked meals)
2. Gentle suggestions for improvement
3. Personalized tips based on their preferences

IMPORTANT: Respond with ONLY a valid JSON array of strings. No explanation, no markdown, no text before or after. Just the array.
Example: ["First insight here", "Second insight here", "Third insight here"]`;

  await logAgentActivity(
    'weekly-summary',
    {
      totalMeals: summary.totalMeals,
      byCategory: summary.byCategory,
      byRating: summary.byRating,
      learningNote:
        '🎓 Weekly insights: Using the LLM to generate personalized health advice based on the user\'s meal patterns and preferences.',
    },
    null
  );

  try {
    const completion = await callGroqAPI(
      [{ role: 'user', content: prompt }],
      0.7,
      500
    );

    const responseText = completion.choices[0]?.message?.content || '[]';

    // Clean up the response - remove markdown code blocks
    let cleanedResponse = responseText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    // Try to extract JSON array if there's extra text around it
    const jsonArrayMatch = cleanedResponse.match(/\[[\s\S]*\]/);
    if (jsonArrayMatch) {
      cleanedResponse = jsonArrayMatch[0];
    }

    const insights = JSON.parse(cleanedResponse);
    return Array.isArray(insights) ? insights : [];
  } catch (error) {
    await logAgentActivity(
      'llm-error',
      {
        error: (error as Error).message,
        context: 'weekly-insights',
        learningNote: '🎓 Fallback: When LLM fails, provide generic insights.',
      },
      null,
      'error'
    );

    // Fallback insights
    return [
      'Keep tracking your meals to see patterns over time.',
      'Try to incorporate more home-cooked meals when possible.',
      'Rate your meals to get personalized recommendations!',
    ];
  }
}
