# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NutriLog is an AI-powered food tracking app with conversational meal logging. Users describe meals via voice/text, an LLM agent asks follow-up questions to categorize food as non-processed/restaurant/processed, users rate meals, and the app provides personalized weekly insights.

**Key learning feature:** Comprehensive agent activity logging with educational annotations (🎓) to understand LLM concepts in practice.

## Commands

```bash
npm run dev              # Start dev server (http://localhost:3000)
npm run build            # Build for production
npm run lint             # Run ESLint
npm run lint -- --fix    # Auto-fix linting issues
npm test                 # Run all tests
npm test -- --watch      # Watch mode
npm test -- --coverage   # Coverage report
npm test -- tests/unit/prompts.test.ts  # Run specific test file
```

## Architecture

### Tech Stack
- **Frontend:** Next.js 14 (App Router), React, Tailwind CSS
- **Backend:** Next.js API routes (serverless), Supabase (PostgreSQL)
- **LLM:** Groq API with Llama 3.1 8B
- **Logging:** Winston + Supabase agent_logs table
- **Voice:** Web Speech API (browser native)

### Core Data Flow
1. User sends message → `/api/chat` receives it
2. `src/lib/groq.ts` builds prompt with conversation history and calls Groq
3. LLM returns JSON with `isComplete`, `followUpQuestion`, or `category`
4. `src/lib/logger.ts` logs every decision to `agent_logs` table
5. When complete, meal is saved to `meals` table with category

### Key Files
- `src/lib/prompts.ts` - System prompt and LLM response parsing/validation
- `src/lib/groq.ts` - Groq API client with comprehensive logging
- `src/lib/logger.ts` - `logAgentActivity()` helper for database logging
- `src/app/api/chat/route.ts` - Main conversation endpoint
- `src/app/api/meals/summary/route.ts` - Weekly insights with LLM-generated advice

### Database Tables (Supabase)
- `users` - Single user for Phase 1
- `meals` - Logged meals with category, rating, nutrition estimates
- `conversations` - Message history linked to meals via meal_id
- `agent_logs` - All agent decisions with metadata (JSONB)

## Critical Patterns

### 1. Always Include Conversation History
LLMs are stateless. Every `/api/chat` call must include full conversation history:
```typescript
const messages = [
  { role: 'system', content: SYSTEM_PROMPT },
  ...conversationHistory,  // All previous turns
  { role: 'user', content: newMessage }
];
```

### 2. Log Every Agent Activity
All LLM interactions must call `logAgentActivity()` with educational annotations:
```typescript
await logAgentActivity('llm-request', {
  model: 'llama-3.1-8b',
  estimatedTokens: 500,
  learningNote: '🎓 Context window: Including history so agent has memory'
}, mealId);
```

### 3. Validate LLM Outputs
LLM responses are non-deterministic. Always use `parseLLMResponse()` from `src/lib/prompts.ts` which:
- Strips markdown code blocks
- Validates JSON structure
- Checks category against allowed values: `['non_processed', 'restaurant', 'processed']`
- Returns structured error on failure

### 4. Meal Categories
- **non_processed** - Home-cooked with fresh/unpackaged ingredients
- **restaurant** - From restaurants, cafes, delivery
- **processed** - Contains packaged/branded ingredients (Maggi, packaged bread, etc.)

## Environment Variables

Required in `.env`:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
GROQ_API_KEY=your_groq_api_key
```

## Testing

Tests are in `tests/` with Jest + React Testing Library. Coverage focuses on:
- `src/lib/prompts.ts` - 100% coverage (prompt building, parsing, validation)
- `src/lib/logger.ts` - 96% coverage (log message generation)
- `src/components/MealRating.tsx` - Component interaction tests
