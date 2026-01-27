/**
 * Core Evaluation Framework for NutriLog
 * Handles test execution, result collection, and output formatting
 */

import { evaluateWithJudge, JudgeResult, EvalContext, JUDGE_MODEL } from './llm-judge';
import * as fs from 'fs';
import * as path from 'path';

const TEST_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';

export interface TestCase {
  name: string;
  bugNumber: number;
  userInput: string;
  expectedBehavior: string;
  evaluationCriteria: string[];
  getLLMResponse: () => Promise<string>;
}

export interface TestResult {
  testName: string;
  bugNumber: number;
  userInput: string;
  llmResponse: string;
  judgeResult: JudgeResult;
  executionTimeMs: number;
  timestamp: string;
}

export interface EvalSummary {
  totalTests: number;
  passed: number;
  failed: number;
  averageScore: number;
  results: TestResult[];
  executedAt: string;
  testModel: string;
  judgeModel: string;
}

/**
 * Run a single test case
 */
export async function runTest(testCase: TestCase): Promise<TestResult> {
  const startTime = Date.now();

  // Get response from NutriLog
  let llmResponse: string;
  try {
    llmResponse = await testCase.getLLMResponse();
  } catch (error) {
    llmResponse = `ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }

  // Build context for judge
  const evalContext: EvalContext = {
    testName: testCase.name,
    bugNumber: testCase.bugNumber,
    userInput: testCase.userInput,
    llmResponse,
    expectedBehavior: testCase.expectedBehavior,
    evaluationCriteria: testCase.evaluationCriteria,
  };

  // Get judge's evaluation
  const judgeResult = await evaluateWithJudge(evalContext);

  const executionTimeMs = Date.now() - startTime;

  return {
    testName: testCase.name,
    bugNumber: testCase.bugNumber,
    userInput: testCase.userInput,
    llmResponse,
    judgeResult,
    executionTimeMs,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Run all test cases and collect results
 */
export async function runAllTests(testCases: TestCase[]): Promise<EvalSummary> {
  const results: TestResult[] = [];

  console.log('\n🎯 NutriLog Evals with LLM-as-Judge');
  console.log(`📊 Test Model: ${TEST_MODEL.split('/').pop()}`);
  console.log(`👨‍⚖️ Judge Model: ${JUDGE_MODEL.split('/').pop()}`);
  console.log('═'.repeat(60));

  for (const testCase of testCases) {
    console.log(`\n🧪 Running: ${testCase.name} (Bug #${testCase.bugNumber})`);

    const result = await runTest(testCase);
    results.push(result);

    // Print quick status
    const statusIcon = result.judgeResult.verdict === 'PASS' ? '✅' : '❌';
    console.log(`   ${statusIcon} ${result.judgeResult.verdict} (Score: ${result.judgeResult.score}/10)`);
  }

  // Calculate summary
  const passed = results.filter(r => r.judgeResult.verdict === 'PASS').length;
  const failed = results.length - passed;
  const averageScore = results.reduce((sum, r) => sum + r.judgeResult.score, 0) / results.length;

  return {
    totalTests: results.length,
    passed,
    failed,
    averageScore,
    results,
    executedAt: new Date().toISOString(),
    testModel: TEST_MODEL,
    judgeModel: JUDGE_MODEL,
  };
}

/**
 * Print detailed results to console
 */
export function printDetailedResults(summary: EvalSummary): void {
  console.log('\n\n📊 DETAILED RESULTS');
  console.log('═'.repeat(60));

  for (const result of summary.results) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`📝 Test: ${result.testName}`);
    console.log(`🐛 Bug #${result.bugNumber}`);
    console.log(`📥 Input: "${result.userInput}"`);
    console.log(`${'─'.repeat(60)}`);

    console.log(`\n💬 LLM Response:`);
    console.log(`   ${result.llmResponse.split('\n').join('\n   ')}`);

    const statusIcon = result.judgeResult.verdict === 'PASS' ? '✅' : '❌';
    console.log(`\n📋 Verdict: ${statusIcon} ${result.judgeResult.verdict}`);
    console.log(`📊 Score: ${result.judgeResult.score}/10`);

    console.log(`\n🤔 Judge's Reasoning:`);
    console.log(`   ${result.judgeResult.reasoning.split('\n').join('\n   ')}`);

    if (result.judgeResult.strengths.length > 0) {
      console.log(`\n💪 Strengths:`);
      for (const strength of result.judgeResult.strengths) {
        console.log(`   • ${strength}`);
      }
    }

    if (result.judgeResult.specificIssues.length > 0) {
      console.log(`\n⚠️ Specific Issues:`);
      for (const issue of result.judgeResult.specificIssues) {
        console.log(`   • ${issue}`);
      }
    }

    console.log(`\n⏱️ Execution time: ${result.executionTimeMs}ms`);
  }

  // Print summary
  console.log('\n\n📈 SUMMARY');
  console.log('═'.repeat(60));
  console.log(`Total Tests: ${summary.totalTests}`);
  console.log(`✅ Passed: ${summary.passed}`);
  console.log(`❌ Failed: ${summary.failed}`);
  console.log(`📊 Average Score: ${summary.averageScore.toFixed(1)}/10`);
  console.log(`🕐 Executed at: ${summary.executedAt}`);
}

/**
 * Save results to JSON file
 */
export function saveResults(summary: EvalSummary, filename?: string): string {
  const outputDir = path.join(process.cwd(), 'tests', 'evals', 'results');

  // Create results directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputFilename = filename || `eval-results-${Date.now()}.json`;
  const outputPath = path.join(outputDir, outputFilename);

  fs.writeFileSync(outputPath, JSON.stringify(summary, null, 2));

  console.log(`\n💾 Results saved to: ${outputPath}`);

  return outputPath;
}

export { TEST_MODEL };
