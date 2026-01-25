'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { AgentLog } from '@/lib/types';

const levelColors = {
  info: 'bg-blue-100 text-blue-700',
  debug: 'bg-gray-100 text-gray-700',
  error: 'bg-red-100 text-red-700',
};

const logTypeLabels: Record<string, { label: string; icon: string }> = {
  'prompt_constructed': { label: 'Prompt Built', icon: '📝' },
  'llm_response_received': { label: 'LLM Response', icon: '🤖' },
  'llm-request': { label: 'API Request', icon: '📤' },
  'categorization-decision': { label: 'Categorization', icon: '🏷️' },
  'follow-up-question': { label: 'Follow-up', icon: '❓' },
  'meal-complete': { label: 'Meal Complete', icon: '✅' },
  'meal_components_saved': { label: 'Components Saved', icon: '📦' },
  'conversation-start': { label: 'New Session', icon: '🆕' },
  'validation-error': { label: 'Validation Error', icon: '⚠️' },
  'database-error': { label: 'DB Error', icon: '💾' },
  'llm-error': { label: 'LLM Error', icon: '🚨' },
};

export default function LogViewer() {
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    logLevel: '',
    logType: '',
    search: '',
  });
  const [logTypes, setLogTypes] = useState<string[]>([]);
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const fetchLogs = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (filters.logLevel) params.set('logLevel', filters.logLevel);
      if (filters.logType) params.set('logType', filters.logType);
      if (filters.search) params.set('search', filters.search);
      params.set('limit', '100');

      const response = await fetch(`/api/logs?${params}`);
      const data = await response.json();

      if (data.error) {
        setError(data.error);
      } else {
        setLogs(data.logs || []);
        setLogTypes(data.logTypes || []);
      }
    } catch (err) {
      setError('Failed to load logs');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [filters.logLevel, filters.logType, filters.search]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs();
  };

  const toggleExpand = (logId: string) => {
    setExpandedLogs((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(logId)) {
        newSet.delete(logId);
      } else {
        newSet.add(logId);
      }
      return newSet;
    });
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const renderCodeBlock = (content: string, title: string, sectionId: string) => {
    const isExpanded = expandedSections.has(sectionId);
    const truncatedContent = content.length > 500 ? content.substring(0, 500) + '...' : content;

    return (
      <div className="mt-2">
        <div className="flex items-center justify-between mb-1">
          <button
            onClick={() => toggleSection(sectionId)}
            className="text-xs font-medium text-gray-600 hover:text-gray-800 flex items-center gap-1"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
            {title}
          </button>
          <button
            onClick={() => copyToClipboard(content)}
            className="text-xs text-gray-400 hover:text-gray-600 px-2 py-0.5 rounded hover:bg-gray-100"
          >
            Copy
          </button>
        </div>
        {isExpanded && (
          <pre className="p-3 bg-gray-900 text-gray-100 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap">
            {content}
          </pre>
        )}
        {!isExpanded && (
          <pre className="p-2 bg-gray-100 text-gray-600 rounded text-xs overflow-x-auto whitespace-pre-wrap">
            {truncatedContent}
          </pre>
        )}
      </div>
    );
  };

  const renderPromptMetadata = (metadata: Record<string, unknown>, logId: string): React.ReactNode => {
    // Type assertions for metadata fields
    type FullPromptType = {
      systemPrompt?: string;
      conversationHistory?: Array<{ role: string; content: string }>;
      newUserMessage?: string;
    };
    type ContextInfoType = {
      maxContextWindow?: number;
      currentUsage?: number;
      percentageUsed?: string;
      turnsIncluded?: number;
      truncationApplied?: string;
    };
    type PromptStructureType = {
      systemPromptTokens?: number;
      historyTokens?: number;
      userMessageTokens?: number;
      totalEstimatedTokens?: number;
    };

    const fullPrompt = metadata.fullPrompt as FullPromptType | undefined;
    const contextInfo = metadata.contextWindowInfo as ContextInfoType | undefined;
    const promptStructure = metadata.promptStructure as PromptStructureType | undefined;
    const learningNote = metadata.learningNote as string | undefined;

    return (
      <div className="space-y-3">
        {/* Context Window Stats */}
        {contextInfo ? (
          <div className="bg-blue-50 p-3 rounded-lg">
            <h5 className="text-xs font-semibold text-blue-800 mb-2">Context Window Usage</h5>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-gray-500">Used: </span>
                <span className="font-medium">{contextInfo.percentageUsed}</span>
              </div>
              <div>
                <span className="text-gray-500">Turns: </span>
                <span className="font-medium">{contextInfo.turnsIncluded}</span>
              </div>
              <div>
                <span className="text-gray-500">Tokens: </span>
                <span className="font-medium">{contextInfo.currentUsage?.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-gray-500">Truncated: </span>
                <span className="font-medium">{contextInfo.truncationApplied}</span>
              </div>
            </div>
          </div>
        ) : null}

        {/* Token Breakdown */}
        {promptStructure ? (
          <div className="bg-gray-50 p-3 rounded-lg">
            <h5 className="text-xs font-semibold text-gray-700 mb-2">Token Breakdown</h5>
            <div className="flex gap-4 text-xs">
              <div>
                <span className="text-gray-500">System: </span>
                <span className="font-medium">{promptStructure.systemPromptTokens}</span>
              </div>
              <div>
                <span className="text-gray-500">History: </span>
                <span className="font-medium">{promptStructure.historyTokens}</span>
              </div>
              <div>
                <span className="text-gray-500">Message: </span>
                <span className="font-medium">{promptStructure.userMessageTokens}</span>
              </div>
            </div>
          </div>
        ) : null}

        {/* Full Prompt Sections */}
        {fullPrompt ? (
          <>
            {fullPrompt.systemPrompt ? renderCodeBlock(
              fullPrompt.systemPrompt,
              'System Prompt',
              `${logId}-system`
            ) : null}

            {fullPrompt.conversationHistory && fullPrompt.conversationHistory.length > 0 ? (
              <div className="mt-2">
                <h5 className="text-xs font-semibold text-gray-600 mb-1">Conversation History</h5>
                <div className="space-y-1">
                  {fullPrompt.conversationHistory.map((msg, i) => (
                    <div
                      key={i}
                      className={`p-2 rounded text-xs ${
                        msg.role === 'user' ? 'bg-blue-50 text-blue-800' : 'bg-green-50 text-green-800'
                      }`}
                    >
                      <span className="font-medium">{msg.role}: </span>
                      {msg.content.substring(0, 200)}
                      {msg.content.length > 200 ? '...' : ''}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {fullPrompt.newUserMessage ? (
              <div className="mt-2">
                <h5 className="text-xs font-semibold text-gray-600 mb-1">New User Message</h5>
                <div className="p-2 bg-blue-100 text-blue-900 rounded text-xs">
                  {fullPrompt.newUserMessage}
                </div>
              </div>
            ) : null}
          </>
        ) : null}

        {/* Learning Note */}
        {learningNote ? (
          <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-100">
            <p className="text-xs text-yellow-800">{learningNote}</p>
          </div>
        ) : null}
      </div>
    );
  };

  const renderResponseMetadata = (metadata: Record<string, unknown>, logId: string): React.ReactNode => {
    type PerformanceType = {
      responseTimeMs?: number;
      inputTokens?: number;
      outputTokens?: number;
      totalTokens?: number;
    };
    type ReasoningType = {
      decision?: string;
      reason?: string;
      keySignals?: string[];
      confidence?: string;
    };

    const performance = metadata.performance as PerformanceType | undefined;
    const reasoning = metadata.reasoningAnalysis as ReasoningType | undefined;
    const rawResponse = metadata.rawResponse as string | undefined;
    const learningNote = metadata.learningNote as string | undefined;

    return (
      <div className="space-y-3">
        {/* Performance Stats */}
        {performance ? (
          <div className="bg-green-50 p-3 rounded-lg">
            <h5 className="text-xs font-semibold text-green-800 mb-2">Performance</h5>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-gray-500">Response Time: </span>
                <span className="font-medium">{performance.responseTimeMs}ms</span>
              </div>
              <div>
                <span className="text-gray-500">Output Tokens: </span>
                <span className="font-medium">{performance.outputTokens}</span>
              </div>
              <div>
                <span className="text-gray-500">Input Tokens: </span>
                <span className="font-medium">{performance.inputTokens}</span>
              </div>
              <div>
                <span className="text-gray-500">Total Tokens: </span>
                <span className="font-medium">{performance.totalTokens}</span>
              </div>
            </div>
          </div>
        ) : null}

        {/* Reasoning Analysis */}
        {reasoning ? (
          <div className="bg-purple-50 p-3 rounded-lg">
            <h5 className="text-xs font-semibold text-purple-800 mb-2">Reasoning Analysis</h5>
            <div className="space-y-2 text-xs">
              <div>
                <span className="text-gray-500">Decision: </span>
                <span className="font-medium text-purple-900">{reasoning.decision}</span>
              </div>
              <div>
                <span className="text-gray-500">Reason: </span>
                <span className="text-gray-700">{reasoning.reason}</span>
              </div>
              {reasoning.keySignals && reasoning.keySignals.length > 0 ? (
                <div>
                  <span className="text-gray-500">Key Signals: </span>
                  <ul className="mt-1 space-y-0.5">
                    {reasoning.keySignals.map((signal, i) => (
                      <li key={i} className="text-gray-600 pl-2 border-l-2 border-purple-200">
                        {signal}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <div>
                <span className="text-gray-500">Confidence: </span>
                <span
                  className={`font-medium ${
                    reasoning.confidence === 'high'
                      ? 'text-green-600'
                      : reasoning.confidence === 'medium'
                      ? 'text-yellow-600'
                      : 'text-gray-600'
                  }`}
                >
                  {reasoning.confidence}
                </span>
              </div>
            </div>
          </div>
        ) : null}

        {/* Raw Response */}
        {rawResponse ? renderCodeBlock(rawResponse, 'Raw LLM Response', `${logId}-raw`) : null}

        {/* Learning Note */}
        {learningNote ? (
          <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-100">
            <p className="text-xs text-yellow-800">{learningNote}</p>
          </div>
        ) : null}
      </div>
    );
  };

  const renderMetadata = (log: AgentLog): React.ReactNode => {
    const metadata = log.metadata;
    if (!metadata) return null;

    // Special rendering for prompt construction logs
    if (log.log_type === 'prompt_constructed') {
      return renderPromptMetadata(metadata, log.id);
    }

    // Special rendering for LLM response logs
    if (log.log_type === 'llm_response_received') {
      return renderResponseMetadata(metadata, log.id);
    }

    const learningNote = metadata.learningNote as string | undefined;
    const components = metadata.components as Array<{ name: string; category: string; reasoning?: string }> | undefined;

    // Default rendering for other log types
    return (
      <div className="space-y-3">
        {/* Learning Note - show prominently */}
        {learningNote ? (
          <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-100">
            <p className="text-xs text-yellow-800">{learningNote}</p>
          </div>
        ) : null}

        {/* Components (for meal_components_saved and categorization-decision) */}
        {components && components.length > 0 ? (
          <div className="bg-gray-50 p-3 rounded-lg">
            <h5 className="text-xs font-semibold text-gray-700 mb-2">Components</h5>
            <div className="space-y-1">
              {components.map((comp, i) => (
                <div key={i} className="text-xs p-2 bg-white rounded border border-gray-100">
                  <span className="font-medium">{comp.name}</span>
                  <span
                    className={`ml-2 px-1.5 py-0.5 rounded text-xs ${
                      comp.category === 'non_processed'
                        ? 'bg-green-100 text-green-700'
                        : comp.category === 'restaurant'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {comp.category}
                  </span>
                  {comp.reasoning ? (
                    <p className="text-gray-500 mt-0.5">{comp.reasoning}</p>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* Other metadata as JSON */}
        <pre className="p-3 bg-gray-50 rounded-lg text-xs font-mono overflow-x-auto whitespace-pre-wrap">
          {JSON.stringify(
            Object.fromEntries(
              Object.entries(metadata).filter(([key]) => !['learningNote', 'components'].includes(key))
            ),
            null,
            2
          )}
        </pre>
      </div>
    );
  };

  const getLogTypeInfo = (logType: string) => {
    return logTypeLabels[logType] || { label: logType, icon: '📋' };
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
        <form onSubmit={handleSearch} className="flex flex-wrap gap-3">
          <select
            value={filters.logLevel}
            onChange={(e) => setFilters((f) => ({ ...f, logLevel: e.target.value }))}
            className="px-3 py-2 border rounded-lg text-sm"
          >
            <option value="">All Levels</option>
            <option value="info">Info</option>
            <option value="debug">Debug</option>
            <option value="error">Error</option>
          </select>

          <select
            value={filters.logType}
            onChange={(e) => setFilters((f) => ({ ...f, logType: e.target.value }))}
            className="px-3 py-2 border rounded-lg text-sm"
          >
            <option value="">All Types</option>
            {logTypes.map((type) => (
              <option key={type} value={type}>
                {getLogTypeInfo(type).icon} {getLogTypeInfo(type).label}
              </option>
            ))}
          </select>

          <div className="flex-1 flex gap-2">
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              placeholder="Search logs..."
              className="flex-1 px-3 py-2 border rounded-lg text-sm"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600"
            >
              Search
            </button>
          </div>
        </form>
      </div>

      {/* Learning Note */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
        <p className="text-sm text-yellow-800">
          <span className="font-semibold">🎓 Learning Tip:</span> These logs show every decision
          the AI agent makes. Click on <strong>prompt_constructed</strong> logs to see the exact
          prompt sent to the LLM, and <strong>llm_response_received</strong> logs to see the
          reasoning analysis!
        </p>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="text-center p-8 text-red-500">
          <p>{error}</p>
          <button
            onClick={fetchLogs}
            className="mt-4 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
          >
            Retry
          </button>
        </div>
      )}

      {/* Logs List */}
      {!isLoading && !error && (
        <div className="space-y-2">
          {logs.length === 0 ? (
            <div className="text-center p-8 text-gray-400">
              <p>No logs found. Start logging meals to see agent activity!</p>
            </div>
          ) : (
            logs.map((log) => {
              const typeInfo = getLogTypeInfo(log.log_type);
              return (
                <div
                  key={log.id}
                  className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
                >
                  <button
                    onClick={() => toggleExpand(log.id)}
                    className="w-full p-4 text-left hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span
                            className={`px-2 py-0.5 text-xs font-medium rounded ${
                              levelColors[log.log_level]
                            }`}
                          >
                            {log.log_level.toUpperCase()}
                          </span>
                          <span className="text-sm">
                            {typeInfo.icon} {typeInfo.label}
                          </span>
                        </div>
                        <p className="text-gray-800">{log.message}</p>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <span className="text-xs text-gray-400">{formatDate(log.created_at)}</span>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1.5}
                          stroke="currentColor"
                          className={`w-4 h-4 text-gray-400 transition-transform ${
                            expandedLogs.has(log.id) ? 'rotate-180' : ''
                          }`}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                          />
                        </svg>
                      </div>
                    </div>
                  </button>

                  {expandedLogs.has(log.id) && (
                    <div className="px-4 pb-4 border-t border-gray-100">
                      <div className="mt-3">{renderMetadata(log)}</div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
