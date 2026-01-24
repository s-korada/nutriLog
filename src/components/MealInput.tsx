'use client';

import { useState, useRef, useEffect, useSyncExternalStore } from 'react';

// Type declarations for Web Speech API
interface SpeechRecognitionEvent extends Event {
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition: new () => SpeechRecognitionInstance;
  }
}

interface MealInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

// Use useSyncExternalStore to avoid the setState in effect issue
function useIsMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

// Check for speech support
function useSpeechSupported() {
  const isMounted = useIsMounted();
  if (!isMounted) return false;
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export default function MealInput({
  onSend,
  disabled = false,
  placeholder = 'What did you eat? Try voice or type...',
}: MealInputProps) {
  const [message, setMessage] = useState('');
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const initializedRef = useRef(false);

  const speechSupported = useSpeechSupported();

  useEffect(() => {
    if (!speechSupported || initializedRef.current) return;
    initializedRef.current = true;

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = 'en-US';

    recognitionRef.current.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0].transcript)
        .join('');
      setMessage(transcript);
    };

    recognitionRef.current.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current.onerror = () => {
      setIsListening(false);
    };

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [speechSupported]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSend(message.trim());
      setMessage('');
    }
  };

  const toggleListening = () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <div className="flex-1 relative">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
      </div>

      {speechSupported && (
        <button
          type="button"
          onClick={toggleListening}
          disabled={disabled}
          className={`px-4 py-3 rounded-xl transition-all ${
            isListening
              ? 'bg-red-500 text-white animate-pulse'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
          title={isListening ? 'Stop listening' : 'Start voice input'}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-6 h-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
            />
          </svg>
        </button>
      )}

      <button
        type="submit"
        disabled={disabled || !message.trim()}
        className="px-6 py-3 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
      >
        Send
      </button>
    </form>
  );
}
