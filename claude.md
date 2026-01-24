# Claude Code Project Directives

## Project Context

**What This Project Does:**
NutriLog is an AI-powered food tracking app that helps users understand their eating patterns by logging meals through conversational AI, categorizing foods as non-processed/restaurant/processed, rating meals to learn preferences, tracking nutrition, providing comprehensive agent activity logs for learning LLM concepts, and delivering weekly insights personalized to user preferences for optimal health and longevity.

**Phase 1 Goal:**
Build a working conversational food tracker where users can log meals via voice/text, have an AI agent ask intelligent follow-up questions, categorize mealtely, rate meals to indicate preferences, view detailed agent activity logs with educational annotations, and see weekly summaries with personalized insights based on their ratings.

**Full Vision:**
Expand to multi-user family tracking, detailed micronutrient analysis, AI-generated meal planning based on learned preferences from ratings, fitness tracker integration (Whoop), medical report analysis, and eventually public release as a SaaS product.

---

## Guiding Principles

These principles MUST be followed throughout development:

### 1. LLM Agent is Conversational, Not Transactional
The core user experience is a natural conversation, not filling out forms. The agent should:
- Ask one question at a time (don't overwhelm with multiple questions)
- Use context from previous responses to ask smarter follow-up questions
- Know when to stop asking questions (have an "enough information" threshold)
- Be encouraging and health-focused in tone

**Example:**
❌ Bad: "Was flour packaged? Was chicken packaged? How much did you eat?"
✅ Good: "That sounds delicious! Was the flour you used packaged (like Pillsbury) or from a local vendor?"

### 2. Always Include Conversation History in LLM Context
The agent cannot make good categorization decisions without knowing what was already discussed. Every API call to Groq MUST include:
1. System prompt (defines agent behavior)
2. Full conversation history (all previous user + assistant messages)
3. New user message

**Why:** LLMs are stateless - they don't remember previous turns unless you explicitly include them in context.

### 3. Log EVERY Agent Activity with Educational Annotations
This is a critical learning tool. EVERY agent decision, LLM call, prompt construction, categorization, and rating MUST be logged to the agent_logs table with:
- Descriptive log message
- Educational annotation (🎓 explaining what's happening at an LLM concept level)
- Detailed metadata (prompt text, token counts, reasoning, etc.)

**Example:**
```typescript
await logAgentActivity('prompt_cction', {
  systemPromptLength: SYSTEM_PROMPT.length,
  conversationTurns: conversationHistory.length,
  estimatedTokens: estimateTokens(fullPrompt),
  learningNote: '🎓 Context window: Including conversation history so agent has memory'
}, mealId);
```

**Why:** Reviewing logs helps you understand HOW the agent makes decisions. This is the best way to learn LLM concepts in practice.

### 4. Validate and Sanitize All LLM Outputs
LLMs are non-deterministic and can return unexpected formats. ALWAYS:
- Use try-catch blocks when parsing JSON responses
- Validate category values against allowed list: `['non_processed', 'restaurant', 'processed']`
- Validate rating values against allowed list: `['liked', 'disliked', null]`
- Have fallback behavior if LLM returns malformed data
- Log unexpected responses for debugging

### 5. Database Schema is Relational - Use Foreign Keys
Meals are linked to conversations and agent_logs via `meal_id` foreign key. This allows us to:
- Retrieve full conversation history for a me
- Retrieve all agent logs for a specific meal
- Debug categorization decisions by seeing what questions were asked and how the agent reasoned

### 6. Use Meal Ratings to Personalize Experience
User ratings (liked/disliked) are powerful signals for:
- Generating personalized weekly insights ("You loved home-cooked roti - keep it up!")
- Future meal planning (suggest meals similar to liked ones)
- Understanding what works for THIS specific user

**Always:**
- Prompt users to rate after each meal is logged
- Store ratings in database (meals.rating column)
- Log rating events to agent_logs
- Include rating data in weekly summary calculations
- Use rating data in LLM prompts for insights generation

### 7. Optimize for Mobile Experience First
This is primarily a mobile app (PWA). Design decisions should prioritize:
- Touch-friendly UI (large buttons, adequate spacing)
- Voice input as primary input method (text as fallback)
- Fast load times (code splitting, lazy loading charts)
- Offline support where possible (service worker caching)

---

## Development Workflow

Follow this workflow for every feature:

### 1. Read the Plan
Always begin by reading the full step-by-step development plan. Understand which stage and step you're implementing.

### 2. Work Sequentially
Complete all steps in a Stage before moving to the next Stage. Do not skip steps or reorder them unless explicitly directed.

### 3. Create Tests As You Go
For every service function, API endpoint, or component with logic:
1. Write a corresponding test (unit or integration)
2. Run the test to verify correctness
3. Do not proceed to the next step until tests pass

**Testing philosophy:** Test-after (not TDD). Write feature first, then immediately write test before moving on.

### 4. Verify Changes
Before marking a step complete:
1. Run linter: `npm run lint`
2. Run all tests: `npm test`
3. Manually test the feature in browser
4. Check that no regressions were introduced (old features still work)
5. **NEW:** Check logs to verify agent activity was captured

### 5. Commit Frequently
Commit after each completed step with a clear, descriptive message:
```bash
git commit -m "Step 6: Set up Groq client and prompt templates with logging"
```

---

## Architecture Decisions

### Decision 1: Next.js App Router (Not Pages Router)
**Choice:** Use Next.js 14 App Router (`app/` directory) for routing and API routes
**Rationale:** App Router is modern, recommended. Server components by default improve performance. API routes become serverless functions automatically.
**Implications:** Files in `src/app/api/` become API endpoints (e.g., `src/app/api/chat/route.ts` → `/api/chat`)

### Decision 2: Single Conversational Agent (Not Multi-Agent)
**Choice:** One LLM handles the entire conversation flow and categorization
**Rationale:** Simpler architecture for Phase 1. Easier to debug and iterate on prompts. Sufficient for categorization task.
**Implications:** All agent logic is in `src/lib/groq.ts` and `src/lib/prompts.ts`. Can refactor to multi-agent in Phase 2 if need.

### Decision 3: Comprehensive Logging for Learning
**Choice:** Log EVERY agent activity (prompt construction, LLM calls, categorization decisions, ratings) to database with educational annotations
**Rationale:** Primary learning goal: understand how LLM agents work by observing their behavior. Debugging: logs show exactly why agent made decisions.
**Implications:** Logging adds ~10-20ms overhead per operation (acceptable). All agent functions must call logging utility.

### Decision 4: Groq API with Llama 3.1 8B
**Choice:** Use Groq's hosted Llama 3.1 8B model for the conversational agent
**Rationale:** Free tier (14,400 requests/day), extremely fast inference (~100-300 tokens/sec), strong reasoning capabilities
**Implications:** Must handle rate limits gracefully. Model responses are non-deterministic.

### Decision 5: Three Categories + Meal Ratings
**Choice:** Categorize meals as Non-processed / Restaurant / Processed, and allow users to rate meals as liked/disliked
**Rationale:** Restaurant food is different from packaged ingredients. Ratings provide direct user feedback for personalized insights.
**Implications:** Database has CHECK constraints for category and rating values. UI needs color-coding (green/yellow/red) and thumbs up/down icons.

### Decision 6: Web Speech API for Voice Input
**Choice:** Use browser's native Web Speech API (not third-party service)
**Rationale:** Zero cost, no API setup, works well for English voice input
**Implications:** Only works in Chrome/Safari. Requires HTTPS in production.

### Decision 7: Winston + Supabase for Logging Storage
**Choice:** Use Winston logging library with database transport (Supabase agent_logs table)
**Rationale:** Winston is industry-standard, flexible. Database storage allows querying, filtering, searching logs. JSONB metadata supports flexible structured data.
**Implications:** Logs persist indefinitely (may need archival strategy later). Can query logs by date, type, level, meal_id.

---

## Testing Strategy

### Approach
**Test-After:** Write feature first, then immediately write test before moving to next feature.

### Coverage Expectations
* LLM prompt templates: Unit tests
* Logging functions: Unit tests
* API endpoints: Integration tests
* Categorization logic: Unit tests
* Rating submission: Unit tests
* Summary calculations: Unit tests
* End-to-end: Full meal logging flow with rating and log verification

**Target:** >70% coverage on core business logic

### Running Tests
* Run all tests: `npm test`
* Run tests in watch mode: `npm test -- --watch`
* Run with coverage: `npm test -- --coverage`

---

## Common Commands

### Development
```bash
npm install          # Install dependencies
npm run dev          # Start dev server (http://localhost:3000)
npm run build        # Build for production
npm start            # Start production server
```

### Testing
```bash
npm test                              # Run all tests
npm test -- --watch                   # Run tests in watch mode
npm test -- --coverage                # Run with coverage report
npm test -- tests/unit/prompts.test.ts  # Run specific test
```

### Code Quality
```bash
npm run lint         # Run linter
npm run lint -- --fix  # Auto-fix linting issues
```

### Database
Use Supabase dashboard SQL editor for:
- Running migrations (creating tables)
- Inserting test data
- Viewing query results
- Checking agent_logs table

### Git
```bash
git checkout -b feature/agent-logging  # Create feature branch
git add .                              # Stage changes
git commit -m "Step X: [description]"  # Commit
git push origin feature/agent-logging  # Push to remote
```

---

## Error Handling Patterns

### Pattern 1: LLM API Errors
All calls to Groq API must be wrapped in try-catch with logging:
```typescript
try {
  await logAgentActivity('llm_request', {...}, mealId);
  const response = await groq.chat.completions.create({...});
  await logAgentActivity('llm_response', {...}, mealId);
} catch (error) {
  await logAgentActivity('llm_error', {error: error.message}, mealId, 'error');
  if (error.status === 429) {
    // Rate limit - retry with backoff
  } else {
    return { error: 'AI service temporarily unavailable' };
  }
}
```

### Pattern 2: Database Errors with Logging
```typescript
const { data, error } = await supabase.from('meals').insert({...});
if (error) {
  await logAgentActivity('database_error', {operation: 'insert meal', error: error.message}, null, 'error');
  return { error: 'Failed to save meal. Please try again.' };
}
```

---

## Code Style & Conventions

### Naming Conventions
* Files: kebab-case for regular files, PascalCase for React components
* Functions: camelCase, verb-noun format (`getUserMeals`, `logAgentActivity`)
* Variables: camelCase, descriptive names
* Constants: UPPER_SNAKE_CASE
* Types/Interfaces: PascalCase
* API routes: kebab-case directory names

### Logging Conventions
* Always use `logAgentActivity()` helper function
* Log type: descriptive kebab-case (`'prompt-construction'`, `'llm-request'`)
* Log level: `'info'` (normal), `'debug'` (detailed), `'error'` (failures)
* Always include educational annotation in metadata when relevant
* Always include meal_id when available (null for weekly insights)

---

## Performance Considerations

1. **Context Window Management:** Truncate to last 10 conversation turns
2. **Database Queries:** Use indexes on user_id, logged_at, meal_id
3. **Logging Overhead:** Async writes, don't block main flow (~10-20ms acceptable)
4. **Chart Rendering:** Lazy load, React.memo, limit to weekly data

---

## Security Considerations

1. **API Key Protection:** GROQ_API_KEY stays server-side only (in API routes)
2. **Input Sanitization:** Validate message length, escape special characters
3. **Log Data Privacy:** Logs stored in user-specific rows (row-level security in Phase 2)
4. **Rate Limiting:** Not needed for Phase 1 (single user), add in Phase 2

---

## Debugging & Troubleshooting

### Common Issues

**Issue: LLM returns malformed JSON**
- Check agent_logs for exact prompt sent
- Strip markdown code blocks: `llmResponse.replace(/```json|```/g, '')`
- Adjust system prompt to be more explicit

**Issue: Logs not appearing in log viewer**
- Verify `logAgentActivity()` is being called
- Check agent_logs table in Supabase dashboard
- Verify filters aren't excluding logs

**Issue: Voice input not working**
- Check browser supports Web Speech API
- Ensure HTTPS in production
- Check microphone permissions

### Debugging Tools
* React DevTools
* Browser Network Tab
* Supabase Logs
* Agent Log Viewer (in app at /logs)

---

## Contact & Resources

* Next.js Docs: https://nextjs.org/docs
* Supabase Docs: https://supabase.com/docs
* Groq API Docs: https://console.groq.com/docs
* Web Speech API: https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API
* Winston Logging: https://github.com/winstonjs/winston
