/**
 * Escapes raw control characters (newlines, carriage returns, tabs) that appear
 * *inside* JSON string literals. The host database contains multi-line text
 * with literal line breaks which is technically invalid JSON; this makes the
 * file parseable with `JSON.parse` without mutating it on disk.
 *
 * @param raw Raw JSON file contents.
 * @returns Sanitized JSON text safe to pass to `JSON.parse`.
 */
export function sanitizeJsonText(raw: string): string {
  let result = '';
  let inString = false;
  let escaped = false;

  for (const char of raw) {
    if (escaped) {
      result += char;
      escaped = false;
      continue;
    }
    if (char === '\\') {
      result += char;
      escaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      result += char;
      continue;
    }
    if (inString) {
      if (char === '\n') { result += '\\n'; continue; }
      if (char === '\r') { result += '\\r'; continue; }
      if (char === '\t') { result += '\\t'; continue; }
    }
    result += char;
  }
  return result;
}
