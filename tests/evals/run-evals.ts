#!/usr/bin/env npx tsx
/**
 * NutriLog Evaluation Runner
 * Run with: npm run evals
 */

import { runAllTests, printDetailedResults, saveResults } from './eval-framework';
import { bugTestCases } from './bug-evals';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function main() {
  console.log('\n🚀 Starting NutriLog Evaluations...\n');

  // Check for required environment variables
  if (!process.env.GROQ_API_KEY) {
    console.error('❌ Error: GROQ_API_KEY environment variable is not set');
    process.exit(1);
  }

  // Check if API is reachable
  const apiUrl = process.env.NUTRILOG_API_URL || 'http://localhost:3000';
  console.log(`📡 Testing API at: ${apiUrl}`);

  try {
    const healthCheck = await fetch(`${apiUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'test', conversationHistory: [] }),
    });

    if (!healthCheck.ok) {
      console.warn(`⚠️ Warning: API returned ${healthCheck.status}. Make sure the server is running.`);
    } else {
      console.log('✅ API is reachable\n');
    }
  } catch (error) {
    console.error(`❌ Error: Cannot reach API at ${apiUrl}`);
    console.error('   Make sure NutriLog is running: npm run dev');
    process.exit(1);
  }

  // Run all tests
  const summary = await runAllTests(bugTestCases);

  // Print detailed results
  printDetailedResults(summary);

  // Save results to JSON
  saveResults(summary);

  // Exit with appropriate code
  if (summary.failed > 0) {
    console.log(`\n❌ ${summary.failed} test(s) failed`);
    process.exit(1);
  } else {
    console.log('\n✅ All tests passed!');
    process.exit(0);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
