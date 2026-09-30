/**
 * Client and server shared utility for parsing batch pasted email addresses.
 */
export function parseRawEmailsList(rawInput: string): string[] {
  if (!rawInput) return [];
  // Split on commas, semicolons, whitespace, newlines, or tabs
  const tokens = rawInput
    .split(/[\s,;]+/)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);

  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const seen = new Set<string>();
  const validEmails: string[] = [];

  for (const token of tokens) {
    // Strip accidental leading/trailing angle brackets, quotes, or punctuation
    const clean = token.replace(/^[<"'(]+|[>"'),.]+$/g, "").trim();
    if (clean && emailRe.test(clean) && !seen.has(clean)) {
      seen.add(clean);
      validEmails.push(clean);
    }
  }

  return validEmails;
}
