'use client';

import { useEffect, useRef } from 'react';
import type { ChatMessage } from '@/lib/types';

interface ConversationViewProps {
  messages: ChatMessage[];
  isLoading?: boolean;
}

export default function ConversationView({
  messages,
  isLoading = false,
}: ConversationViewProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 p-8">
        <div className="text-center">
          <div className="text-4xl mb-4">🍽️</div>
          <p className="text-lg">Tell me what you ate today!</p>
          <p className="text-sm mt-2">
            Try: &quot;I had dal and roti for lunch&quot; or use the microphone
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((msg, index) => (
        <div
          key={index}
          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className={`max-w-[80%] px-4 py-3 rounded-2xl ${
              msg.role === 'user'
                ? 'bg-green-500 text-white rounded-br-md'
                : 'bg-gray-100 text-gray-800 rounded-bl-md'
            }`}
          >
            {msg.content}
          </div>
        </div>
      ))}

      {isLoading && (
        <div className="flex justify-start">
          <div className="bg-gray-100 px-4 py-3 rounded-2xl rounded-bl-md">
            <div className="flex space-x-2">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
              <div
                className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                style={{ animationDelay: '0.1s' }}
              />
              <div
                className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                style={{ animationDelay: '0.2s' }}
              />
            </div>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
