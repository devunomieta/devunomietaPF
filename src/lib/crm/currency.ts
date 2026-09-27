/** Formats an amount with its currency's real symbol (₦, $, €, ...) via Intl, not the ISO code. */
export function formatMoney(amount: number, currencyCode: string = "NGN"): string {
  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: currencyCode || "NGN",
      currencyDisplay: "narrowSymbol",
    }).format(amount || 0);
  } catch {
    // Unknown/invalid currency code — fall back to a plain, still-readable label.
    return `${currencyCode} ${(amount || 0).toFixed(2)}`;
  }
}

/**
 * Same formatting, but spells out the ISO code (e.g. "NGN 1,234.56") instead of the symbol.
 * Use this anywhere the text is rendered with a font that may not carry the currency's glyph —
 * the invoice PDF's base Helvetica font doesn't include ₦ (U+20A6), so it renders as a blank box
 * or a stray placeholder character. Screen/email HTML is fine with formatMoney() as normal.
 */
export function formatMoneyPlain(amount: number, currencyCode: string = "NGN"): string {
  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: currencyCode || "NGN",
      currencyDisplay: "code",
    }).format(amount || 0);
  } catch {
    return `${currencyCode} ${(amount || 0).toFixed(2)}`;
  }
}
