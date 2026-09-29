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

  const isValid = !hasLettersOrNoise && isDigitLengthValid;
  const sanitized = hasLeadingPlus ? `+${digitsOnly}` : digitsOnly;

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
  const result = validatePhone(phone);
  if (!result.isValid || !result.sanitized) return null;

  // WhatsApp wa.me requires digits without leading '+' or symbols
  const cleanDigits = result.sanitized.replace(/\D/g, "");
  const query = text ? `?text=${encodeURIComponent(text)}` : "";
  return `https://wa.me/${cleanDigits}${query}`;
}
