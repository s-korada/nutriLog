import { logAgentActivity, estimateTokens } from './logger';
import { buildPromptMessages, truncateConversationHistory, parseLLMResponse, SYSTEM_PROMPT, ParsedLLMResponse } from './prompts';
import type { ChatMessage, LLMCategorizationResponse } from './types';

const MODEL = 'llama-3.1-8b-instant';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MAX_CONTEXT_WINDOW = 128000; // Llama 3.1 8B context window

/**
 * Analyze LLM response to understand why it made certain decisions.
 */
function analyzeResponse(parsed: ParsedLLMResponse, conversationHistory: ChatMessage[]): {
  decision: string;
  reason: string;
  keySignals: string[];
  confidence: string;
} {
  const keySignals: string[] = [];

  // Extract key signals from conversation that led to the decision
  for (const msg of conversationHistory) {
    if (msg.role === 'user') {
      const content = msg.content.toLowerCase();
      // Look for source indicators
      if (content.includes('local') || content.includes('market') || content.includes('fresh')) {
        keySignals.push(`User mentioned "local/market/fresh" → indicates non-processed`);
      }
      if (content.includes('packaged') || content.includes('amul') || content.includes('aashirvaad') || content.includes('maggi')) {
        keySignals.push(`User mentioned brand/packaged → indicates processed`);
      }
      if (content.includes('order') || content.includes('zomato') || content.includes('swiggy') || content.includes('restaurant')) {
        keySignals.push(`User mentioned ordering/restaurant → indicates restaurant`);
      }
      if (content.includes('homemade') || content.includes('home') || content.includes('made')) {
        keySignals.push(`User mentioned homemade → indicates non-processed`);
      }
    }
  }

  // Determine confidence based on clarity of signals
  let confidence = 'medium';
  if (keySignals.length >= 2) confidence = 'high';
  if (keySignals.length === 0) confidence = 'low';

  if (parsed.isComplete) {
    if (parsed.components && parsed.components.length > 0) {
      return {
        decision: `Categorized ${parsed.components.length} component(s) → ${parsed.overall_category}`,
        reason: parsed.components.map(c => `${c.name}: ${c.reasoning}`).join('; '),
        keySignals,
        confidence,
      };
    }
    return {
      decision: `Single category: ${parsed.category}`,
      reason: parsed.reasoning || 'No reasoning provided',
      keySignals,
      confidence,
    };
  }

  return {
    decision: 'Needs more info',
    reason: `Asking: ${parsed.followUpQuestion}`,
    keySignals,
    confidence: 'pending',
  };
}

/**
 * Extract key signals from the conversation that influenced categorization.
 */
function extractKeySignals(conversationHistory: ChatMessage[], category: string): string[] {
  const signals: string[] = [];
  const categoryKeywords: Record<string, string[]> = {
    non_processed: ['local', 'market', 'fresh', 'homemade', 'home', 'loose', 'vendor', 'butcher'],
    restaurant: ['order', 'zomato', 'swiggy', 'restaurant', 'delivery', 'takeout', 'cafe'],
    processed: ['packaged', 'amul', 'aashirvaad', 'maggi', 'britannia', 'store-bought', 'supermarket'],
  };

  const keywords = categoryKeywords[category] || [];

  for (const msg of conversationHistory) {
    if (msg.role === 'user') {
      for (const keyword of keywords) {
        if (msg.content.toLowerCase().includes(keyword)) {
          signals.push(`"${keyword}" found in: "${msg.content.substring(0, 50)}..."`);
        }
      }
    }
  }

  return signals;
}

/**
 * Estimate confidence level based on conversation clarity.
 */
function estimateConfidence(parsed: ParsedLLMResponse, conversationHistory: ChatMessage[]): string {
  if (!parsed.isComplete) return 'pending';

  const turnCount = conversationHistory.length / 2;

  // More turns usually means more certainty
  if (turnCount >= 3) return 'high';
  if (turnCount >= 1) return 'medium';

  // Single turn with clear indicators
  const lastUserMsg = conversationHistory.filter(m => m.role === 'user').pop();
  if (lastUserMsg) {
    const content = lastUserMsg.content.toLowerCase();
    const clearIndicators = ['maggi', 'zomato', 'swiggy', 'restaurant', 'homemade', 'ordered'];
    if (clearIndicators.some(ind => content.includes(ind))) {
      return 'high';
    }
  }

  return 'medium';
}

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
  const wasTruncated = conversationHistory.length > truncatedHistory.length;

  // Build the prompt messages
  const messages = buildPromptMessages(truncatedHistory, userMessage);

  // Calculate token estimates for each part
  const systemPromptTokens = estimateTokens(SYSTEM_PROMPT);
  const historyText = truncatedHistory.map(m => m.content).join('\n');
  const historyTokens = estimateTokens(historyText);
  const userMessageTokens = estimateTokens(userMessage);
  const totalEstimatedTokens = systemPromptTokens + historyTokens + userMessageTokens;
  const contextUsagePercent = ((totalEstimatedTokens / MAX_CONTEXT_WINDOW) * 100).toFixed(2);

  // v1.1: Enhanced logging with full prompt details
  await logAgentActivity(
    'prompt_constructed',
    {
      learningNote: '🎓 Full prompt construction: This is EXACTLY what the LLM sees. The system prompt defines its personality and rules, conversation history provides context, and the new message is what it needs to respond to.',
      fullPrompt: {
        systemPrompt: SYSTEM_PROMPT,
        conversationHistory: truncatedHistory,
        newUserMessage: userMessage,
      },
      promptStructure: {
        systemPromptTokens,
        historyTokens,
        userMessageTokens,
        totalEstimatedTokens,
      },
      contextWindowInfo: {
        maxContextWindow: MAX_CONTEXT_WINDOW,
        currentUsage: totalEstimatedTokens,
        percentageUsed: `${contextUsagePercent}%`,
        turnsIncluded: truncatedHistory.length / 2,
        truncationApplied: wasTruncated ? 'Yes' : 'No',
      },
    },
    mealId,
    'debug'
  );

  try {
    // Log LLM request
    await logAgentActivity(
      'llm-request',
      {
        model: MODEL,
        messageCount: messages.length,
        estimatedInputTokens: totalEstimatedTokens,
        contextUsage: `${contextUsagePercent}% of ${MAX_CONTEXT_WINDOW} tokens`,
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

    // Parse and validate the response
    const parseResult = parseLLMResponse(responseText);

    // v1.1: Enhanced response logging with analysis
    const analysis = parseResult.success && parseResult.data
      ? analyzeResponse(parseResult.data, truncatedHistory)
      : null;

    await logAgentActivity(
      'llm_response_received',
      {
        model: MODEL,
        performance: {
          responseTimeMs: responseTime,
          inputTokens: completion.usage?.prompt_tokens || totalEstimatedTokens,
          outputTokens: completion.usage?.completion_tokens || 0,
          totalTokens: completion.usage?.total_tokens || 0,
        },
        rawResponse: responseText,
        parsedSuccessfully: parseResult.success,
        reasoningAnalysis: analysis ? {
          decision: analysis.decision,
          reason: analysis.reason,
          keySignals: analysis.keySignals,
          confidence: analysis.confidence,
        } : null,
        learningNote:
          '🎓 Response received: The LLM generated a response. The reasoning analysis shows what signals in the conversation led to this decision.',
      },
      mealId,
      'debug'
    );

    if (!parseResult.success) {
      await logAgentActivity(
        'validation-error',
        {
          error: parseResult.error,
          rawResponse: responseText.substring(0, 500),
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
      const keySignals = parseResult.data.components
        ? parseResult.data.components.flatMap(c => extractKeySignals(truncatedHistory, c.category))
        : extractKeySignals(truncatedHistory, parseResult.data.category || '');

      await logAgentActivity(
        'categorization-decision',
        {
          // v1.1: Component-based categorization
          components: parseResult.data.components,
          overall_category: parseResult.data.overall_category,
          // Legacy fields
          category: parseResult.data.category,
          reasoning: parseResult.data.reasoning,
          nutritionEstimate: parseResult.data.nutritionEstimate || {
            calories: parseResult.data.calories,
            protein: parseResult.data.protein,
            carbs: parseResult.data.carbs,
            fats: parseResult.data.fats,
          },
          keySignals,
          confidence: estimateConfidence(parseResult.data, truncatedHistory),
          learningNote:
            '🎓 Categorization complete: The agent has gathered enough information to make a decision. Key signals show what words/phrases in the conversation influenced the categorization.',
        },
        mealId
      );
    } else {
      await logAgentActivity(
        'follow-up-question',
        {
          question: parseResult.data?.followUpQuestion,
          conversationLength: conversationHistory.length + 1,
          turnsElapsed: Math.floor(conversationHistory.length / 2),
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
