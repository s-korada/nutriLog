import '@testing-library/jest-dom';

// Polyfill setImmediate for Winston in jsdom environment
global.setImmediate = global.setImmediate || ((fn, ...args) => setTimeout(fn, 0, ...args));

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
process.env.GROQ_API_KEY = 'test-groq-key';
