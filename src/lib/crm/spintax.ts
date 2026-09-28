/**
 * Spintax (Spin Syntax) Parser & Evaluator
 *
 * Supports patterns like `{Hello|Hi|Hey}` or nested `{Hi|Hello {there|friend}}`.
 * Also ignores merge tags like `{{first_name}}` so personalization variables are preserved intact.
 */

/**
 * Parses and resolves a Spintax string by randomly picking one variation for each `{A|B|C}` block.
 * Double-curly brackets like `{{tag}}` are deliberately protected.
 */
export function spinText(template: string): string {
  if (!template) return "";

  // Temporary mask for merge tags like {{first_name}}, {{company}}, etc.
  const tags: string[] = [];
  const masked = template.replace(/\{\{([^{}]+)\}\}/g, (_, inner) => {
    tags.push(inner);
    return `__CRM_TAG_${tags.length - 1}__`;
  });

  // Regex to match innermost {option1|option2|...}
  // Matches { followed by text not containing { or }, containing |, followed by }
  const spintaxRegex = /\{([^{}]+?\|[^{}]+?)\}/g;

  let spun = masked;
  let hasMatches = true;
  let safetyLimit = 20; // prevents infinite loop on weird recursion

  while (hasMatches && safetyLimit > 0) {
    safetyLimit--;
    const next = spun.replace(spintaxRegex, (_, optionsGroup) => {
      const options = optionsGroup.split("|");
      const chosen = options[Math.floor(Math.random() * options.length)];
      return chosen;
    });

    if (next === spun) {
      hasMatches = false;
    } else {
      spun = next;
    }
  }

  // Restore merge tags
  return spun.replace(/__CRM_TAG_(\d+)__/g, (_, idx) => {
    return `{{${tags[Number(idx)]}}}`;
  });
}

/**
 * Checks if a template string contains any Spintax patterns `{...|...}`
 * (excluding double brackets `{{...}}`).
 */
export function hasSpintax(template: string): boolean {
  if (!template) return false;
  const stripped = template.replace(/\{\{([^{}]+)\}\}/g, "");
  return /\{[^{}]+?\|[^{}]+?\}/.test(stripped);
}

/**
 * Generates N sample variations from a template containing Spintax and merge tags.
 */
export function generateVariations(
  template: string,
  sampleRecipient: { name?: string; company?: string; email?: string; phone?: string } = {
    name: "Alex Johnson",
    company: "Acme Corp",
    email: "alex@example.com",
    phone: "+2348012345678",
  },
  count: number = 3
): string[] {
  const variations: Set<string> = new Set();
  // Try up to count * 4 times to collect distinct variations
  for (let i = 0; i < count * 4 && variations.size < count; i++) {
    const spun = spinText(template);
    // Replace merge tags for sample preview
    const personalized = spun
      .replace(/\{\{\s*first_name\s*\}\}/gi, "Alex")
      .replace(/\{\{\s*last_name\s*\}\}/gi, "Johnson")
      .replace(/\{\{\s*(name|full_name)\s*\}\}/gi, sampleRecipient.name || "Alex Johnson")
      .replace(/\{\{\s*company\s*\}\}/gi, sampleRecipient.company || "Acme Corp")
      .replace(/\{\{\s*phone\s*\}\}/gi, sampleRecipient.phone || "+2348012345678");
    variations.add(personalized);
  }

  return Array.from(variations);
}
