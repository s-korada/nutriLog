import { NextRequest, NextResponse } from 'next/server';
import { supabase, getDefaultUser } from '@/lib/supabase';
import { getChatResponse } from '@/lib/groq';
import { logAgentActivity } from '@/lib/logger';
import type { ChatMessage, ChatRequest, ChatResponse } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();
    const { message, mealId, conversationHistory = [] } = body;

    // Validate input
    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' } as ChatResponse,
        { status: 400 }
      );
    }

    // Sanitize message (prevent overly long inputs)
    const sanitizedMessage = message.trim().substring(0, 1000);

    // Get or create meal session
    let currentMealId: string | null = mealId ?? null;

    if (!currentMealId) {
      // Start a new conversation - create a placeholder meal
      const user = await getDefaultUser();
      if (!user) {
        return NextResponse.json(
          { error: 'No user found. Please set up the database.' } as ChatResponse,
          { status: 500 }
        );
      }

      // Log conversation start
      await logAgentActivity(
        'conversation-start',
        {
          userMessage: sanitizedMessage.substring(0, 100),
          learningNote:
            '🎓 New session: Starting a new meal logging conversation. A placeholder meal record is created to track this conversation.',
        },
        null
      );

      // Create placeholder meal (will be updated when categorization is complete)
      const { data: meal, error: mealError } = await supabase
        .from('meals')
        .insert({
          user_id: user.id,
          meal_description: sanitizedMessage,
          category: 'non_processed', // Placeholder, will be updated
        })
        .select()
        .single();

      if (mealError) {
        await logAgentActivity(
          'database-error',
          { operation: 'create meal', error: mealError.message },
          null,
          'error'
        );
        return NextResponse.json(
          { error: 'Failed to start conversation' } as ChatResponse,
          { status: 500 }
        );
      }

      currentMealId = meal.id;
    }

    // Save user message to conversation history
    await supabase.from('conversations').insert({
      meal_id: currentMealId,
      role: 'user',
      content: sanitizedMessage,
    });

    // Get LLM response
    const llmResult = await getChatResponse(
      sanitizedMessage,
      conversationHistory as ChatMessage[],
      currentMealId
    );

    if (!llmResult.success || !llmResult.data) {
      // Fallback response on LLM error
      const fallbackResponse =
        "I'm having trouble processing that. Could you tell me more about what you ate?";

      await supabase.from('conversations').insert({
        meal_id: currentMealId,
        role: 'assistant',
        content: fallbackResponse,
      });

      return NextResponse.json({
        response: fallbackResponse,
        mealId: currentMealId,
        isComplete: false,
      } as ChatResponse);
    }

    const { isComplete, followUpQuestion, category, nutritionEstimate, reasoning } =
      llmResult.data;

    // Determine the response text
    let responseText: string;

    if (isComplete && category) {
      // Update meal with final category and nutrition
      const { error: updateError } = await supabase
        .from('meals')
        .update({
          category,
          estimated_calories: nutritionEstimate?.calories,
          estimated_protein: nutritionEstimate?.protein,
          estimated_carbs: nutritionEstimate?.carbs,
          estimated_fats: nutritionEstimate?.fats,
        })
        .eq('id', currentMealId);

      if (updateError) {
        await logAgentActivity(
          'database-error',
          { operation: 'update meal category', error: updateError.message },
          currentMealId,
          'error'
        );
      }

      // Log meal completion
      await logAgentActivity(
        'meal-complete',
        {
          category,
          nutritionEstimate,
          reasoning,
          learningNote:
            '🎓 Meal logged: The agent has categorized the meal and estimated nutrition. The conversation is complete.',
        },
        currentMealId
      );

      // Generate a friendly completion message
      const categoryLabels = {
        non_processed: 'home-cooked/non-processed',
        restaurant: 'restaurant',
        processed: 'processed',
      };

      responseText = `Great! I've logged your meal as ${categoryLabels[category]}. ${
        nutritionEstimate
          ? `Estimated: ${nutritionEstimate.calories} calories, ${nutritionEstimate.protein}g protein.`
          : ''
      } Would you like to rate this meal? 👍👎`;
    } else {
      responseText = followUpQuestion || 'Could you tell me more about this meal?';
    }

    // Save assistant response to conversation history
    await supabase.from('conversations').insert({
      meal_id: currentMealId,
      role: 'assistant',
      content: responseText,
    });

    return NextResponse.json({
      response: responseText,
      mealId: currentMealId,
      isComplete: isComplete || false,
      category: isComplete ? category : undefined,
      nutritionEstimate: isComplete ? nutritionEstimate : undefined,
    } as ChatResponse);
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' } as ChatResponse,
      { status: 500 }
    );
  }
}
