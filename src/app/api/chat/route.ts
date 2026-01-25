import { NextRequest, NextResponse } from 'next/server';
import { supabase, getDefaultUser } from '@/lib/supabase';
import { getChatResponse } from '@/lib/groq';
import { logAgentActivity } from '@/lib/logger';
import { calculateOverallCategory } from '@/lib/prompts';
import type { ChatMessage, ChatRequest, ChatResponse, MealCategory, OverallCategory } from '@/lib/types';

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

    const {
      isComplete,
      followUpQuestion,
      // Legacy fields
      category,
      nutritionEstimate,
      reasoning,
      // v1.1: Component-based fields
      components,
      overall_category,
      calories,
      protein,
      carbs,
      fats,
    } = llmResult.data;

    // Determine the response text
    let responseText: string;

    if (isComplete && (components || category)) {
      // v1.1: Handle component-based response
      let finalCategory: MealCategory;
      let finalOverallCategory: OverallCategory;
      let finalCalories: number | undefined;
      let finalProtein: number | undefined;
      let finalCarbs: number | undefined;
      let finalFats: number | undefined;

      if (components && components.length > 0) {
        // Component-based: calculate overall category from components
        finalOverallCategory = overall_category || calculateOverallCategory(components);
        // For legacy category field, use first component's category or derive from overall
        finalCategory = components.length === 1
          ? components[0].category
          : (finalOverallCategory === 'home_cooked' ? 'non_processed' : finalOverallCategory === 'mixed' ? 'non_processed' : finalOverallCategory as MealCategory);
        finalCalories = calories;
        finalProtein = protein;
        finalCarbs = carbs;
        finalFats = fats;
      } else {
        // Legacy single-category response
        finalCategory = category!;
        finalOverallCategory = category === 'non_processed' ? 'home_cooked' : category as OverallCategory;
        finalCalories = nutritionEstimate?.calories;
        finalProtein = nutritionEstimate?.protein;
        finalCarbs = nutritionEstimate?.carbs;
        finalFats = nutritionEstimate?.fats;
      }

      // Update meal with final category and nutrition
      const { error: updateError } = await supabase
        .from('meals')
        .update({
          category: finalCategory,
          overall_category: finalOverallCategory,
          estimated_calories: finalCalories,
          estimated_protein: finalProtein,
          estimated_carbs: finalCarbs,
          estimated_fats: finalFats,
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

      // v1.1: Save meal components if present
      if (components && components.length > 0) {
        const componentInserts = components.map((comp) => ({
          meal_id: currentMealId,
          component_name: comp.name,
          category: comp.category,
          reasoning: comp.reasoning,
        }));

        const { error: componentError } = await supabase
          .from('meal_components')
          .insert(componentInserts);

        if (componentError) {
          await logAgentActivity(
            'database-error',
            { operation: 'save meal components', error: componentError.message },
            currentMealId,
            'error'
          );
        } else {
          await logAgentActivity(
            'meal_components_saved',
            {
              mealId: currentMealId,
              components: components,
              overall_category: finalOverallCategory,
              learningNote:
                '🎓 Component breakdown: The meal was split into individual items, each categorized separately. This allows for more accurate tracking of food sources.',
            },
            currentMealId
          );
        }
      }

      // Log meal completion
      await logAgentActivity(
        'meal-complete',
        {
          category: finalCategory,
          overall_category: finalOverallCategory,
          components: components,
          nutritionEstimate: {
            calories: finalCalories,
            protein: finalProtein,
            carbs: finalCarbs,
            fats: finalFats,
          },
          reasoning,
          learningNote:
            '🎓 Meal logged: The agent has categorized the meal and estimated nutrition. The conversation is complete.',
        },
        currentMealId
      );

      // Generate a friendly completion message
      const overallCategoryLabels: Record<OverallCategory, string> = {
        home_cooked: 'home-cooked',
        mixed: 'mixed (home-cooked + processed)',
        restaurant: 'restaurant',
        processed: 'processed',
      };

      const componentSummary = components && components.length > 1
        ? ` (${components.length} items: ${components.map(c => c.name).join(', ')})`
        : '';

      responseText = `Great! I've logged your meal as ${overallCategoryLabels[finalOverallCategory]}${componentSummary}. ${
        finalCalories
          ? `Estimated: ${finalCalories} calories, ${finalProtein}g protein.`
          : ''
      } Would you like to rate this meal?`;
    } else {
      responseText = followUpQuestion || 'Could you tell me more about this meal?';
    }

    // Save assistant response to conversation history
    await supabase.from('conversations').insert({
      meal_id: currentMealId,
      role: 'assistant',
      content: responseText,
    });

    // Build response with v1.1 component data
    const response: ChatResponse = {
      response: responseText,
      mealId: currentMealId || undefined,
      isComplete: isComplete || false,
    };

    if (isComplete) {
      if (components && components.length > 0) {
        response.components = components;
        response.overall_category = overall_category || calculateOverallCategory(components);
        response.nutritionEstimate = {
          calories: calories || 0,
          protein: protein || 0,
          carbs: carbs || 0,
          fats: fats || 0,
        };
      } else if (category) {
        response.category = category;
        response.nutritionEstimate = nutritionEstimate;
      }
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' } as ChatResponse,
      { status: 500 }
    );
  }
}
