'use client';

import { useState, useCallback } from 'react';
import MealInput from '@/components/MealInput';
import ConversationView from '@/components/ConversationView';
import MealRating from '@/components/MealRating';
import MealHistory from '@/components/MealHistory';
import type { ChatMessage, MealRating as MealRatingType } from '@/lib/types';

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentMealId, setCurrentMealId] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const handleSend = useCallback(
    async (message: string) => {
      // Add user message to UI
      const userMessage: ChatMessage = { role: 'user', content: message };
      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message,
            mealId: currentMealId,
            conversationHistory: messages,
          }),
        });

        const data = await response.json();

        if (data.error) {
          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: 'Sorry, something went wrong. Please try again.',
            },
          ]);
        } else {
          // Add assistant response
          setMessages((prev) => [
            ...prev,
            { role: 'assistant', content: data.response },
          ]);

          // Update meal ID if this is a new conversation
          if (data.mealId) {
            setCurrentMealId(data.mealId);
          }

          // Check if meal logging is complete
          if (data.isComplete) {
            setIsComplete(true);
          }
        }
      } catch (error) {
        console.error('Chat error:', error);
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: 'Sorry, something went wrong. Please try again.',
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [currentMealId, messages]
  );

  const handleRate = async (mealId: string, rating: MealRatingType) => {
    try {
      const response = await fetch(`/api/meals/${mealId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating }),
      });

      if (response.ok) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: `Thanks for the feedback! ${
              rating === 'liked'
                ? "I'll remember you enjoyed this meal!"
                : "I'll note that for your preferences."
            } Ready to log another meal?`,
          },
        ]);
      }
    } catch (error) {
      console.error('Rating error:', error);
    }
  };

  const startNewConversation = () => {
    setMessages([]);
    setCurrentMealId(null);
    setIsComplete(false);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Toggle between chat and history */}
      <div className="flex border-b border-gray-100 bg-white">
        <button
          onClick={() => setShowHistory(false)}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            !showHistory
              ? 'text-green-600 border-b-2 border-green-500'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Log Meal
        </button>
        <button
          onClick={() => setShowHistory(true)}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            showHistory
              ? 'text-green-600 border-b-2 border-green-500'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          History
        </button>
      </div>

      {showHistory ? (
        <div className="flex-1 overflow-y-auto p-4">
          <MealHistory />
        </div>
      ) : (
        <>
          {/* Conversation */}
          <ConversationView messages={messages} isLoading={isLoading} />

          {/* Rating prompt when meal is complete */}
          {isComplete && currentMealId && (
            <div className="p-4 bg-green-50 border-t border-green-100">
              <div className="flex items-center justify-between">
                <span className="text-sm text-green-700">
                  How was this meal?
                </span>
                <div className="flex items-center gap-4">
                  <MealRating
                    mealId={currentMealId}
                    currentRating={null}
                    onRate={handleRate}
                  />
                  <button
                    onClick={startNewConversation}
                    className="text-sm text-green-600 hover:text-green-700 underline"
                  >
                    Log another
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-4 bg-white border-t border-gray-100">
            <MealInput
              onSend={handleSend}
              disabled={isLoading}
              placeholder={
                messages.length === 0
                  ? 'What did you eat today?'
                  : 'Continue the conversation...'
              }
            />
          </div>
        </>
      )}
    </div>
  );
}
