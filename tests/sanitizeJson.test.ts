import { describe, it, expect } from 'vitest';
import { sanitizeJsonText } from '../src/data/sanitizeJson';

describe('sanitizeJsonText', () => {
  it('escapes literal newlines inside string values so JSON.parse succeeds', () => {
    const raw = '{"text": "line one\nline two"}';
    expect(() => JSON.parse(raw)).toThrow();

    const sanitized = sanitizeJsonText(raw);
    const parsed = JSON.parse(sanitized) as { text: string };
    expect(parsed.text).toBe('line one\nline two');
  });

  it('leaves already valid JSON structurally intact', () => {
    const raw = '{"a": 1, "b": ["x", "y"], "c": {"d": true}}';
    expect(JSON.parse(sanitizeJsonText(raw))).toEqual(JSON.parse(raw));
  });

  it('does not corrupt escaped characters', () => {
    const raw = '{"quote": "He said \\"hi\\"", "tab": "a\\tb"}';
    const parsed = JSON.parse(sanitizeJsonText(raw)) as { quote: string; tab: string };
    expect(parsed.quote).toBe('He said "hi"');
    expect(parsed.tab).toBe('a\tb');
  });
});
