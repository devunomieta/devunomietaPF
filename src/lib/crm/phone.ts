/**
 * Utility functions for phone number validation, sanitization, and flagging.
 */

export type PhoneValidationResult = {
  isValid: boolean;
  sanitized: string;
  hasNonNumericNoise: boolean;
  issueDescription?: string;
};

/**
 * Normalizes phone numbers to standard international digits (E.164 without leading '+').
 * Automatically resolves common Nigerian local formats (e.g., 0803..., 090..., 081...)
 * to international 234803... for WhatsApp GREEN-API compatibility.
 */
export function normalizeE164Phone(rawPhone: string | null | undefined, defaultCountryCode = "234"): string | null {
  if (!rawPhone) return null;
  const trimmed = String(rawPhone).trim();
  if (!trimmed) return null;

  // Extract only digits and check for leading '+'
  const hasLeadingPlus = trimmed.startsWith("+");
  const digitsOnly = trimmed.replace(/\D/g, "");

  if (digitsOnly.length < 7) return null;

  // If already starts with explicit plus, trust the country code
  if (hasLeadingPlus) {
    return digitsOnly;
  }

  // Nigerian standard local number: 11 digits starting with '0' (e.g. 0803..., 0912..., 070...)
  if (digitsOnly.length === 11 && digitsOnly.startsWith("0")) {
    return `${defaultCountryCode}${digitsOnly.slice(1)}`;
  }

  // 10 digits without leading zero for Nigeria (e.g. 8033061252)
  if (digitsOnly.length === 10 && (digitsOnly.startsWith("7") || digitsOnly.startsWith("8") || digitsOnly.startsWith("9"))) {
    return `${defaultCountryCode}${digitsOnly}`;
  }

  // If it already starts with the country code (e.g. 234803...)
  if (digitsOnly.startsWith(defaultCountryCode) && digitsOnly.length >= 12) {
    return digitsOnly;
  }

  return digitsOnly;
}

/**
 * Checks if a phone string contains invalid characters (letters, explanatory notes like "(call later)", etc.)
 * and tests whether it can be formatted into a clean E.164 or dialable string.
 */
export function validatePhone(phone: string | null | undefined): PhoneValidationResult {
  if (!phone || !phone.trim()) {
    return { isValid: false, sanitized: "", hasNonNumericNoise: false };
  }

  const trimmed = phone.trim();

  // Check for alphabetic characters or symbols beyond typical phone decorators (+, -, ., (, ), spaces)
  const hasLettersOrNoise = /[a-zA-Z]/.test(trimmed) || /[,;*#]/.test(trimmed);

  // Extract pure digits and leading plus
  const hasLeadingPlus = trimmed.startsWith("+");
  const digitsOnly = trimmed.replace(/\D/g, "");

  // An international phone number typically has 7 to 15 digits (E.164 standard)
  const isDigitLengthValid = digitsOnly.length >= 7 && digitsOnly.length <= 15;

  let issueDescription: string | undefined;
  if (hasLettersOrNoise) {
    issueDescription = "Contains letters or non-phone notes. WhatsApp and direct dialing will fail.";
  } else if (!isDigitLengthValid) {
    issueDescription = `Number has ${digitsOnly.length} digits. Standard phone numbers require between 7 and 15 digits.`;
  }

  const normalized = normalizeE164Phone(trimmed);
  const isValid = !hasLettersOrNoise && isDigitLengthValid && Boolean(normalized);
  const sanitized = normalized ? (hasLeadingPlus ? `+${normalized}` : normalized) : (hasLeadingPlus ? `+${digitsOnly}` : digitsOnly);

  return {
    isValid,
    sanitized,
    hasNonNumericNoise: hasLettersOrNoise,
    issueDescription,
  };
}

/**
 * Generates a clean WhatsApp web / api link or returns null if the phone is not viable.
 */
export function getWhatsAppDirectUrl(phone: string | null | undefined, text?: string): string | null {
  const normalized = normalizeE164Phone(phone);
  if (!normalized) return null;

  // WhatsApp wa.me requires digits without leading '+' or symbols
  const query = text ? `?text=${encodeURIComponent(text)}` : "";
  return `https://wa.me/${normalized}${query}`;
}

/**
 * Parses raw text input (delimited by newlines, commas, semicolons, tabs) into phone entries.
 * Supports "Name <Phone>", "Phone, Name", or pure phone numbers.
 */
export function parseRawPhoneInput(rawInput: string): Array<{ phone: string; name?: string; raw: string }> {
  if (!rawInput || !rawInput.trim()) return [];

  const lines = rawInput.split(/[\r\n;,]+/).map((l) => l.trim()).filter(Boolean);
  const out: Array<{ phone: string; name?: string; raw: string }> = [];

  for (const line of lines) {
    // Check format: Name <Phone>
    const angleMatch = line.match(/^([^<]+)<([^>]+)>$/);
    if (angleMatch) {
      const name = angleMatch[1].trim();
      const phone = angleMatch[2].trim();
      out.push({ phone, name: name || undefined, raw: line });
      continue;
    }

    // Check comma or tab separated: Phone, Name or Name, Phone
    const parts = line.split(/[,\t]/).map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
      const p1IsPhone = /\d{7,}/.test(parts[0].replace(/\D/g, ""));
      const p2IsPhone = /\d{7,}/.test(parts[1].replace(/\D/g, ""));
      if (p1IsPhone) {
        out.push({ phone: parts[0], name: parts[1], raw: line });
        continue;
      } else if (p2IsPhone) {
        out.push({ phone: parts[1], name: parts[0], raw: line });
        continue;
      }
    }

    out.push({ phone: line, raw: line });
  }

  return out;
}


