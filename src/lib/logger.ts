import winston from 'winston';
import { supabase } from './supabase';
import type { LogLevel } from './types';

// Winston logger for console output
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

/**
 * Log agent activity to the database with educational annotations.
 * This is the primary learning tool - every agent decision, LLM call,
 * and categorization should be logged with detailed metadata.
 *
 * @param logType - Descriptive type of log (e.g., 'prompt-construction', 'llm-request')
 * @param metadata - Detailed metadata including educational annotations
 * @param mealId - Associated meal ID (null for weekly insights)
 * @param level - Log level: 'info', 'debug', or 'error'
 */
export async function logAgentActivity(
  logType: string,
  metadata: Record<string, unknown>,
  mealId: string | null = null,
  level: LogLevel = 'info'
): Promise<void> {
  // Generate a descriptive message from the log type
  const message = generateLogMessage(logType, metadata);

  // Log to console via Winston
  logger.log(level, message, { logType, mealId, ...metadata });

  // Log to database for the log viewer
  try {
    const { error } = await supabase.from('agent_logs').insert({
      meal_id: mealId,
      log_level: level,
      log_type: logType,
      message,
      metadata,
    });

    if (error) {
      logger.error('Failed to insert agent log to database', { error: error.message });
    }
  } catch (err) {
    logger.error('Exception inserting agent log', { error: (err as Error).message });
  }
}

/**
 * Generate a human-readable log message from the log type and metadata.
 */
function generateLogMessage(logType: string, metadata: Record<string, unknown>): string {
  const learningNote = metadata.learningNote || '';

  switch (logType) {
    case 'conversation-start':
      return `New conversation started. ${learningNote}`;

    case 'prompt-construction':
      return `Constructing prompt with ${metadata.conversationTurns || 0} turns. ${learningNote}`;

    case 'llm-request':
      return `Sending request to LLM (${metadata.model || 'unknown'}). ${learningNote}`;

    case 'llm-response':
      return `Received LLM response (${metadata.responseTokens || 0} tokens). ${learningNote}`;

    case 'llm-error':
      return `LLM error: ${metadata.error || 'unknown'}. ${learningNote}`;

    case 'categorization-decision':
      return `Categorized meal as ${metadata.category || 'unknown'}. ${learningNote}`;

    case 'follow-up-question':
      return `Agent asking follow-up question. ${learningNote}`;

    case 'meal-complete':
      return `Meal logging complete. Category: ${metadata.category}. ${learningNote}`;

    case 'rating-submitted':
      return `User rated meal as ${metadata.rating || 'unknown'}. ${learningNote}`;

    case 'weekly-summary':
      return `Generated weekly summary with ${metadata.totalMeals || 0} meals. ${learningNote}`;

    case 'database-error':
      return `Database error: ${metadata.operation || 'unknown operation'}. ${learningNote}`;

    case 'validation-error':
      return `Validation error: ${metadata.field || 'unknown field'}. ${learningNote}`;

    default:
      return `${logType}: ${JSON.stringify(metadata).substring(0, 100)}`;
  }
}

/**
 * Estimate token count for a string (rough approximation).
 * Useful for logging and monitoring context window usage.
 */
export function estimateTokens(text: string): number {
  // Rough estimate: ~4 characters per token for English text
  return Math.ceil(text.length / 4);
}

export default logger;
