/**
 * Bug Test Cases for NutriLog Evaluations
 * 9 test cases based on discovered bugs
 */

import { TestCase } from './eval-framework';

// API configuration
const API_BASE_URL = process.env.NUTRILOG_API_URL || 'http://localhost:3000';

/**
 * Call NutriLog chat API and return the response text
 */
async function callNutriLogAPI(userInput: string): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: userInput,
      conversationHistory: [],
    }),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.response || JSON.stringify(data);
}

/**
 * Bug #1: Auto-categorized jaggery without asking
 */
const bug1_jaggeryAutoCategrorized: TestCase = {
  name: 'Should ask about jaggery source',
  bugNumber: 1,
  userInput: 'I had chapati with jaggery',
  expectedBehavior: `The assistant should ask about BOTH components (chapati and jaggery) before categorizing.
It should NOT auto-categorize jaggery without asking where it came from.
Jaggery can be: local/unpackaged (non_processed), packaged brand (processed), or from a restaurant.`,
  evaluationCriteria: [
    'CRITICAL: Must ask about jaggery source (homemade/local vs packaged/store-bought)',
    'Should ask about chapati flour source',
    'Should NOT auto-assign categories without asking',
    'Should NOT immediately categorize the meal as complete',
  ],
  getLLMResponse: () => callNutriLogAPI('I had chapati with jaggery'),
};

/**
 * Bug #2: "0" appears in UI
 */
const bug2_zeroInResponse: TestCase = {
  name: 'Should not have standalone "0" in response',
  bugNumber: 2,
  userInput: 'I had filter coffee',
  expectedBehavior: `The response should be a clean, conversational message.
No weird characters like standalone "0" or meaningless numbers should appear.
Should ask about where the coffee came from.`,
  evaluationCriteria: [
    'CRITICAL: No standalone "0" or meaningless characters in response',
    'Response must be valid conversational format',
    'Should ask about coffee source (homemade vs cafe vs instant)',
    'Response should be natural and friendly',
  ],
  getLLMResponse: () => callNutriLogAPI('I had filter coffee'),
};

/**
 * Bug #3: Overly verbose conversations
 */
const bug3_verboseResponse: TestCase = {
  name: 'Should be concise, not verbose',
  bugNumber: 3,
  userInput: 'I had hot chapati with ghee and jaggery',
  expectedBehavior: `The assistant should ask short, concise questions.
Should NOT include lengthy explanations like "This will help determine if..." or "This information is needed to...".
Keep questions under 15 words. Max 2-3 sentences per response.`,
  evaluationCriteria: [
    'CRITICAL: Questions should be under 15 words',
    'No explanatory phrases like "This will help us..." or "This information is needed..."',
    'Max 2-3 sentences per response',
    'Should be conversational, not robotic',
    'Should ask about main components',
  ],
  getLLMResponse: () => callNutriLogAPI('I had hot chapati with ghee and jaggery'),
};

/**
 * Bug #4: Components listed with labels mid-conversation
 */
const bug4_formattedLabels: TestCase = {
  name: 'Should not show formatted component lists',
  bugNumber: 4,
  userInput: 'I had hot chapati with ghee and jaggery',
  expectedBehavior: `The response should be natural conversation, NOT formatted lists.
Should NOT show internal labels like "**Chapati**: Store bought" or bullet points with categories.
Should ask natural questions like "Was the chapati homemade?"`,
  evaluationCriteria: [
    'CRITICAL: No formatted component lists like "**Chapati**: X" or "- Chapati: processed"',
    'No markdown formatting with ** or bullets showing categories',
    'Natural conversational questions',
    'Should ask about components naturally, not list them',
  ],
  getLLMResponse: () => callNutriLogAPI('I had hot chapati with ghee and jaggery'),
};

/**
 * Bug #5: Asked about component twice
 */
const bug5_duplicateQuestion: TestCase = {
  name: 'Should not ask about same component twice',
  bugNumber: 5,
  userInput: '3 rotis, paneer curry',
  expectedBehavior: `The assistant should ask about each component exactly ONCE.
Should not repeat questions about the same ingredient.
Should ask about roti flour and paneer source.`,
  evaluationCriteria: [
    'CRITICAL: No duplicate questions about the same component',
    'Should ask about roti/flour source',
    'Should ask about paneer source (once only)',
    'Should be efficient in questioning',
  ],
  getLLMResponse: () => callNutriLogAPI('3 rotis, paneer curry'),
};

/**
 * Bug #6: Unnecessary cultural information
 */
const bug6_culturalInfo: TestCase = {
  name: 'Should not mention dish origin/culture',
  bugNumber: 6,
  userInput: 'Daddojanam',
  expectedBehavior: `Daddojanam is curd rice (a South Indian dish). The assistant should NOT tell the user what it is or where it's from.
The user already knows what they ate! Just ask about the components: rice and curd.
Focus ONLY on categorization questions.`,
  evaluationCriteria: [
    'CRITICAL: Should NOT mention dish origin ("South Indian", "traditional", etc.)',
    'Should NOT explain what the dish is (user knows)',
    'Should ask about rice source',
    'Should ask about curd source',
    'Focus only on categorization, not education',
  ],
  getLLMResponse: () => callNutriLogAPI('Daddojanam'),
};

/**
 * Bug #7: Missing component question (rice)
 */
const bug7_missingRiceQuestion: TestCase = {
  name: 'Should ask about ALL components (rice + curd)',
  bugNumber: 7,
  userInput: 'Daddojanam',
  expectedBehavior: `Daddojanam has TWO main components: rice and curd.
The assistant MUST ask about BOTH before categorizing.
Missing any major component question is a failure.`,
  evaluationCriteria: [
    'CRITICAL: Must ask about rice (local/packaged)',
    'CRITICAL: Must ask about curd (homemade/packaged like Amul)',
    'Should not skip any major component',
    'Should not auto-categorize without asking about both',
  ],
  getLLMResponse: () => callNutriLogAPI('Daddojanam'),
};

/**
 * Bug #8: JSON response instead of conversational
 */
const bug8_jsonResponse: TestCase = {
  name: 'Should respond conversationally, not with JSON',
  bugNumber: 8,
  userInput: 'I had upma with veggies',
  expectedBehavior: `The response MUST be conversational English text.
Should NOT be raw JSON like {"isComplete": false, "followUpQuestion": "..."}.
Should ask about upma (rava/semolina) and vegetables naturally.`,
  evaluationCriteria: [
    'CRITICAL: Response must be conversational text, NOT raw JSON',
    'Should not contain JSON structure visible to user',
    'Should ask about upma/rava source',
    'Should ask about vegetables',
    'User-friendly, natural format',
  ],
  getLLMResponse: () => callNutriLogAPI('I had upma with veggies'),
};

/**
 * Bug #9: Macros only in JSON (not shown to user)
 */
const bug9_macrosNotShown: TestCase = {
  name: 'Should include macro nutrients in response',
  bugNumber: 9,
  userInput: 'I had upma with veggies',
  expectedBehavior: `When the meal is categorized (isComplete: true), the response should include nutrition estimates.
The user should see calories, protein, carbs, fats in a readable format.
Macros should not be hidden in backend JSON only.`,
  evaluationCriteria: [
    'When complete, response should mention nutrition estimates',
    'Calories should be mentioned if available',
    'Protein should be mentioned if available',
    'Macros should be in user-facing text, not just backend data',
    'Readable format for nutrition info',
  ],
  getLLMResponse: () => callNutriLogAPI('I had upma with veggies'),
};

/**
 * All bug test cases
 */
export const bugTestCases: TestCase[] = [
  bug1_jaggeryAutoCategrorized,
  bug2_zeroInResponse,
  bug3_verboseResponse,
  bug4_formattedLabels,
  bug5_duplicateQuestion,
  bug6_culturalInfo,
  bug7_missingRiceQuestion,
  bug8_jsonResponse,
  bug9_macrosNotShown,
];

export { callNutriLogAPI };
