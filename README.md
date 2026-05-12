# NutriLog

An AI-powered food tracking app with conversational meal logging. Describe what you ate in plain language — NutriLog figures out the rest.

## What it does

Instead of hunting through a nutrition database, you just tell NutriLog what you ate. The LLM agent asks follow-up questions to understand your meal, categorizes it (home-cooked, restaurant, or processed), and you rate how you felt about it. At the end of the week, you get personalized insights.

**Categories the agent classifies meals into:**
- **Home-cooked** — Fresh ingredients, made at home
- **Restaurant** — Ordered from a restaurant, cafe, or delivery (Zomato, Swiggy, etc.)
- **Processed** — Includes packaged or branded ingredients (Maggi, packaged bread, etc.)
- **Mixed** — A combination of the above

**Key learning feature:** Every LLM decision is logged with educational annotations so you can inspect exactly how the agent thinks — useful for understanding LLM behavior in practice.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), React 19, Tailwind CSS |
| Backend | Next.js API routes (serverless) |
| Database | Supabase (PostgreSQL) |
| LLM | Groq API — Llama 4 Scout 17B |
| Logging | Winston + Supabase `agent_logs` table |
| Voice input | Web Speech API (browser native) |
| Charts | Recharts |
| Deployment | Vercel |

## Getting started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project
- A [Groq](https://console.groq.com) API key (free tier works)

### 1. Clone and install

```bash
git clone https://github.com/your-username/nutrilog.git
cd nutrilog
npm install
```

### 2. Set up environment variables

Create a `.env` file in the root:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
GROQ_API_KEY=your_groq_api_key
```

### 3. Set up the database

In your Supabase dashboard, go to **SQL Editor** and run the following:

```sql
-- Users table (single user for Phase 1)
create table users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  created_at timestamptz default now()
);

-- Meals table
create table meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  description text not null,
  category text check (category in ('home_cooked', 'restaurant', 'processed', 'mixed')),
  rating integer check (rating between 1 and 5),
  notes text,
  logged_at timestamptz default now()
);

-- Conversation history linked to meals
create table conversations (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid references meals(id),
  role text check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz default now()
);

-- Agent decision log with educational annotations
create table agent_logs (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid references meals(id),
  activity_type text not null,
  metadata jsonb,
  created_at timestamptz default now()
);

-- Default user
insert into users (email) values ('user@nutrilog.app');
```

After running the SQL, verify the setup:

```bash
node setup-db.js
```

### 4. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

```bash
npm run dev              # Start dev server
npm run build            # Build for production
npm run lint             # Run ESLint
npm run lint -- --fix    # Auto-fix linting issues
npm test                 # Run unit + integration tests
npm test -- --watch      # Watch mode
npm test -- --coverage   # Coverage report
npm run evals            # Run LLM-as-judge evaluations
```

## How the conversation works

```
User: "I had rajma chawal for lunch"
Agent: "Was this home-cooked or from a restaurant?"
User: "Home-cooked"
Agent: "Did you use any packaged ingredients, like canned rajma or packaged masala?"
User: "No, everything was fresh"
Agent: → Categorizes as "home_cooked", saves meal, asks for a rating
```

The agent always maintains full conversation history across turns (LLMs are stateless — history is passed explicitly every request).

## Project structure

```
src/
├── app/
│   ├── api/
│   │   ├── chat/route.ts          # Main conversation endpoint
│   │   ├── meals/route.ts         # Meal CRUD
│   │   ├── meals/summary/route.ts # Weekly insights with LLM-generated advice
│   │   └── logs/route.ts          # Agent activity log viewer
│   ├── logs/                      # Agent log browser UI
│   ├── summary/                   # Weekly summary UI
│   └── page.tsx                   # Main chat interface
├── components/
│   ├── MealInput.tsx              # Text + voice input
│   ├── ConversationView.tsx       # Chat UI
│   ├── MealRating.tsx             # Post-meal rating
│   ├── MealHistory.tsx            # Past meals list
│   ├── WeeklySummary.tsx          # Weekly stats
│   ├── ComponentPieChart.tsx      # Category breakdown chart
│   └── LogViewer.tsx              # Agent decision log viewer
└── lib/
    ├── prompts.ts                 # System prompt, LLM response parsing/validation
    ├── groq.ts                    # Groq API client with logging
    ├── logger.ts                  # logAgentActivity() helper
    ├── supabase.ts                # Database client
    └── types.ts                   # Shared TypeScript types

tests/
├── unit/                          # Unit tests (prompts, logger, components)
├── integration/                   # API integration tests
└── evals/                         # LLM-as-judge evaluation suite
    ├── eval-framework.ts          # Test runner
    ├── bug-evals.ts               # Test cases for known edge cases
    ├── llm-judge.ts               # Qwen3 32B judge implementation
    └── run-evals.ts               # CLI entry point
```

## Testing

### Unit and integration tests

```bash
npm test
npm test -- --coverage
```

Coverage targets: `prompts.ts` (100%), `logger.ts` (96%), `MealRating` component.

### LLM evaluations

The eval suite uses **LLM-as-judge**: Qwen3 32B evaluates responses from Llama 4 Scout 17B against a set of test cases covering known edge cases (restaurant name recognition, processed food detection, etc.).

```bash
# Make sure the dev server is running first
npm run dev

# In another terminal
npm run evals
```

Each test case specifies expected behavior and evaluation criteria. The judge returns a PASS/FAIL verdict with a score (1–10), reasoning, and specific issues found. Results are saved to `tests/evals/results/`.

## Agent activity logging

Every LLM interaction is logged to the `agent_logs` table with metadata and a learning annotation. Browse the full decision trail at `/logs` in the running app — useful for understanding why the agent asked a particular follow-up question or how it reached a category decision.

Example log entry:
```json
{
  "activity_type": "llm-request",
  "metadata": {
    "model": "llama-4-scout-17b",
    "estimatedTokens": 500,
    "learningNote": "🎓 Context window: Including history so agent has memory"
  }
}
```

## Deployment

The app auto-deploys to Vercel on push to `main`. To deploy manually:

```bash
vercel --prod
```

Make sure your Vercel project has the three environment variables set under **Settings → Environment Variables**.

## License

MIT
