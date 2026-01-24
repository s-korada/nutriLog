'use client';

import { useState, useEffect, useCallback } from 'react';
import type { AgentLog } from '@/lib/types';

const levelColors = {
  info: 'bg-blue-100 text-blue-700',
  debug: 'bg-gray-100 text-gray-700',
  error: 'bg-red-100 text-red-700',
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const renderMetadata = (metadata: Record<string, unknown> | null) => {
    if (!metadata) return null;

    return (
      <div className="mt-2 p-3 bg-gray-50 rounded-lg text-sm font-mono overflow-x-auto">
        <pre className="whitespace-pre-wrap break-words">
          {JSON.stringify(metadata, null, 2)}
        </pre>
      </div>
    );
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
                {type}
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
          <span className="font-semibold">🎓 Learning Tip:</span> These logs show every
          decision the AI agent makes. Look for logs with{' '}
          <code className="bg-yellow-100 px-1 rounded">learningNote</code> in metadata
          to understand LLM concepts in action!
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
            logs.map((log) => (
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
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`px-2 py-0.5 text-xs font-medium rounded ${
                            levelColors[log.log_level]
                          }`}
                        >
                          {log.log_level.toUpperCase()}
                        </span>
                        <span className="text-xs text-gray-400 font-mono">
                          {log.log_type}
                        </span>
                      </div>
                      <p className="text-gray-800">{log.message}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <span className="text-xs text-gray-400">
                        {formatDate(log.created_at)}
                      </span>
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
                    {renderMetadata(log.metadata)}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
