/**
 * LLM-as-Judge for NutriLog Evaluations
 * Uses Qwen3 32B to evaluate responses from Llama 4 Scout
 */

import Groq from 'groq-sdk';

const JUDGE_MODEL = 'qwen/qwen3-32b';
const JUDGE_TEMPERATURE = 0.2;

export interface JudgeResult {
  verdict: 'PASS' | 'FAIL';
  score: number;
  reasoning: string;
  specificIssues: string[];
  strengths: string[];
}

export interface EvalContext {
  testName: string;
  bugNumber: number;
  userInput: string;
  llmResponse: string;
  expectedBehavior: string;
  evaluationCriteria: string[];
}

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

/**
 * Build the judge prompt for evaluating a response
 */
function buildJudgePrompt(context: EvalContext): string {
  const criticalCriteria = context.evaluationCriteria
    .filter(c => c.includes('CRITICAL'))
    .map(c => `  - ${c}`)
    .join('\n');

  const regularCriteria = context.evaluationCriteria
    .filter(c => !c.includes('CRITICAL'))
    .map(c => `  - ${c}`)
    .join('\n');

  return `You are evaluating responses from a food tracking AI assistant called NutriLog.

## Your Role
You are a DIFFERENT model (Qwen3 32B) evaluating outputs from another model (Llama 4 Scout 17B).
Be critical but fair. Your job is to catch issues the other model might have.

## Test Information
- **Test Name**: ${context.testName}
- **Bug Number**: #${context.bugNumber}
- **User Input**: "${context.userInput}"

## Expected Behavior
${context.expectedBehavior}

## Evaluation Criteria
${criticalCriteria ? `**CRITICAL (Must Pass):**\n${criticalCriteria}` : ''}

${regularCriteria ? `**Standard Criteria:**\n${regularCriteria}` : ''}

## Actual Response from NutriLog
"""
${context.llmResponse}
"""

## Your Task
Evaluate the response against ALL criteria. A response FAILS if ANY critical criterion is violated.

## Scoring Guidelines
- 9-10: Excellent - All criteria met, natural conversation
- 7-8: Good - All critical criteria met, minor issues
- 5-6: Borderline - Some issues, but mostly acceptable
- 3-4: Poor - Critical issues or multiple problems
- 1-2: Very Poor - Major failures, completely wrong

## Response Format
Respond with ONLY valid JSON in this exact format:
{
  "verdict": "PASS" or "FAIL",
  "score": <number 1-10>,
  "reasoning": "<detailed explanation of your evaluation>",
  "specificIssues": ["<issue 1>", "<issue 2>"],
  "strengths": ["<strength 1>", "<strength 2>"]
}`;
}

/**
 * Parse the judge's JSON response
 */
function parseJudgeResponse(response: string): JudgeResult {
  // Try to extract JSON from the response
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON found in judge response');
  }

  const parsed = JSON.parse(jsonMatch[0]);

  // Validate required fields
  if (!parsed.verdict || !['PASS', 'FAIL'].includes(parsed.verdict)) {
    throw new Error('Invalid verdict in judge response');
  }
  if (typeof parsed.score !== 'number' || parsed.score < 1 || parsed.score > 10) {
    throw new Error('Invalid score in judge response');
  }

  return {
    verdict: parsed.verdict,
    score: parsed.score,
    reasoning: parsed.reasoning || 'No reasoning provided',
    specificIssues: Array.isArray(parsed.specificIssues) ? parsed.specificIssues : [],
    strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
  };
}

/**
 * Call the LLM judge to evaluate a response
 */
export async function evaluateWithJudge(context: EvalContext): Promise<JudgeResult> {
  const prompt = buildJudgePrompt(context);

  try {
    const completion = await groq.chat.completions.create({
      model: JUDGE_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are a strict but fair evaluator. Always respond with valid JSON only.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: JUDGE_TEMPERATURE,
      max_tokens: 1000,
    });

    const responseText = completion.choices[0]?.message?.content || '';
    return parseJudgeResponse(responseText);
  } catch (error) {
    // Return a failure result if judge fails
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      verdict: 'FAIL',
      score: 0,
      reasoning: `Judge evaluation failed: ${errorMessage}`,
      specificIssues: ['Judge could not evaluate this response'],
      strengths: [],
    };
  }
}

export { JUDGE_MODEL };
