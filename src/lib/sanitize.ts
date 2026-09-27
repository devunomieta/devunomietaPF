/**
 * Security, sanitization and spam detection utilities.
 */

/**
 * Strips dangerous HTML tags and escapes special characters to prevent XSS.
 */
export function sanitizeText(input: string | null | undefined): string {
  if (!input) return ''
  return input
    .replace(/<[^>]*>/g, '') // strip HTML tags
    .replace(/javascript:/gi, '') // strip pseudo protocols
    .replace(/vbscript:/gi, '')
    .replace(/data:/gi, '')
    .trim()
}

/**
 * Validates and normalizes email format.
 */
export function isValidEmail(email: string | null | undefined): boolean {
  if (!email) return false
  const clean = email.trim()
  if (clean.length > 254 || clean.length < 5) return false
  // Standard RFC 5322 compatible email pattern
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/
  return emailRegex.test(clean)
}

/**
 * Checks for obvious spam patterns in inquiry / contact submissions:
 * - Cyrillic spam characters commonly used by Russian link bots
 * - BBCode url links like [url=...]
 * - Known spam keywords (casino, jackpot, backlinks, intimate photos, seo rankings)
 */
export function detectSpam(payload: {
  name?: string
  email?: string
  message?: string
  honeypot?: string
}): { isSpam: boolean; reason?: string } {
  // Honeypot check: If the hidden honeypot field has any value, it's definitely a bot.
  if (payload.honeypot && payload.honeypot.trim() !== '') {
    return { isSpam: true, reason: 'Bot trap triggered' }
  }

  const textToScan = `${payload.name || ''} ${payload.email || ''} ${payload.message || ''}`

  // BBCode link pattern [url=...] or [/url]
  if (/\[url[=\s\]]/i.test(payload.message || '') || /\[\/url\]/i.test(payload.message || '')) {
    return { isSpam: true, reason: 'Contains BBCode spam links' }
  }

  // Excessive Cyrillic in english contact forms (common Russian spam bots)
  const cyrillicMatch = (payload.message || '').match(/[\u0400-\u04FF]/g)
  if (cyrillicMatch && cyrillicMatch.length > 15) {
    return { isSpam: true, reason: 'Automated Cyrillic script submission' }
  }

  // Suspicious spam domains and keywords
  const spamPatterns = [
    /\b(casino|backlinks|dailyseolinks|bonusbacklinks|intimate photos|lamborghini aventador|promo code|jackpot)\b/i,
    /telegra\.ph\/Win-/i,
    /tinyurl\.com\//i,
    /@(lilycake\.ru|victoria-photographer\.ru|vseindi\.com|mail220v\.org|mailboxvip\.org|geedymail\.com|jetskiadeje\.com|usmailerbox\.org|aimusicfixer\.com)/i
  ]

  for (const pattern of spamPatterns) {
    if (pattern.test(textToScan)) {
      return { isSpam: true, reason: 'Blocked by content security filter' }
    }
  }

  return { isSpam: false }
}
