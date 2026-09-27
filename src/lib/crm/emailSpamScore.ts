/**
 * CRM Email Spam Scorer & Safety Feedback
 * Evaluates subject line and body for common triggers that trip modern spam filters (Gmail, Outlook, SpamAssassin).
 */

export type SpamIssue = {
  type: "high" | "medium" | "low" | "good";
  message: string;
};

export type SpamAnalysis = {
  score: number; // 0 to 100, where 100 is cleanest/safest, < 60 is high risk
  verdict: "Safe" | "Moderate Risk" | "High Spam Risk";
  issues: SpamIssue[];
};

// Common spam trigger phrases
const HIGH_RISK_WORDS = [
  "100% free",
  "free gift",
  "earn extra cash",
  "fast cash",
  "make money fast",
  "risk free",
  "risk-free",
  "double your income",
  "congratulations you won",
  "you have been selected",
  "pure profit",
  "casino",
  "jackpot",
  "crypto giveaway",
  "viagra",
  "weight loss guaranteed",
  "miracle cure",
  "act now!",
  "urgent response required",
  "wire transfer",
  "nigerian prince",
];

const MEDIUM_RISK_WORDS = [
  "free",
  "buy direct",
  "click here",
  "click below",
  "order now",
  "limited time offer",
  "guaranteed",
  "lowest price",
  "no obligation",
  "save big",
  "apply now",
  "as seen on",
  "special promotion",
  "winner",
  "unlimited",
  "bonus",
  "dear friend",
];

export function analyzeEmailSpam({
  subject,
  html,
}: {
  subject: string;
  html: string;
}): SpamAnalysis {
  const issues: SpamIssue[] = [];
  let penalty = 0;

  const sub = (subject || "").trim();
  const textContent = (html || "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // 1. Subject checks
  if (!sub) {
    issues.push({ type: "high", message: "Subject is empty." });
    penalty += 30;
  } else {
    // Excessive caps in subject
    const lettersInSub = sub.replace(/[^a-zA-Z]/g, "");
    if (lettersInSub.length > 5) {
      const capsInSub = sub.replace(/[^A-Z]/g, "").length;
      if (capsInSub / lettersInSub.length > 0.6) {
        issues.push({
          type: "high",
          message: "Subject has excessive uppercase letters (triggers spam filters).",
        });
        penalty += 20;
      }
    }

    // Excessive exclamation marks in subject
    const exclamations = (sub.match(/!/g) || []).length;
    if (exclamations > 1) {
      issues.push({
        type: "medium",
        message: `Avoid multiple exclamation marks in subject (${exclamations} found).`,
      });
      penalty += 10;
    }

    // Dollar/Currency symbols in subject
    if (/[\$£€¥]{2,}/.test(sub)) {
      issues.push({
        type: "high",
        message: "Multiple currency symbols ($$$) in subject look like spam.",
      });
      penalty += 20;
    }
  }

  // 2. High risk keywords search
  const combined = `${sub} ${textContent}`.toLowerCase();
  for (const phrase of HIGH_RISK_WORDS) {
    if (combined.includes(phrase)) {
      issues.push({
        type: "high",
        message: `High-risk spam trigger phrase found: "${phrase}".`,
      });
      penalty += 15;
    }
  }

  // 3. Medium risk keywords search
  let mediumHits = 0;
  for (const word of MEDIUM_RISK_WORDS) {
    const regex = new RegExp(`\\b${word}\\b`, "i");
    if (regex.test(combined)) {
      mediumHits++;
      if (mediumHits <= 3) {
        issues.push({
          type: "medium",
          message: `Sales trigger word: "${word}". Use sparingly.`,
        });
        penalty += 5;
      }
    }
  }
  if (mediumHits > 3) {
    penalty += 10;
  }

  // 4. Image-to-text ratio check
  const imgMatches = (html || "").match(/<img\b[^>]*>/gi) || [];
  if (imgMatches.length > 0 && textContent.length < 50) {
    issues.push({
      type: "high",
      message: "Very low text-to-image ratio. Spam filters flag image-only emails.",
    });
    penalty += 25;
  }

  // 5. Short content check
  if (textContent.length > 0 && textContent.length < 20) {
    issues.push({
      type: "medium",
      message: "Email body is extremely short.",
    });
    penalty += 10;
  }

  // 6. Generic "click here" link check
  if (/href=["'][^"']*["'][^>]*>\s*click here\s*<\/a>/i.test(html || "")) {
    issues.push({
      type: "medium",
      message: 'Avoid generic "click here" links. Use descriptive anchor text instead.',
    });
    penalty += 8;
  }

  // Calculate final score
  const score = Math.max(0, Math.min(100, 100 - penalty));

  let verdict: SpamAnalysis["verdict"] = "Safe";
  if (score < 55) verdict = "High Spam Risk";
  else if (score < 80) verdict = "Moderate Risk";

  if (issues.length === 0) {
    issues.push({
      type: "good",
      message: "No obvious spam triggers detected. Looking clean and deliverable!",
    });
  }

  return { score, verdict, issues };
}
