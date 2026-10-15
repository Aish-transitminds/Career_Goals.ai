/**
 * CareerGoals - Real-Time Indian Rupee (INR) Currency Conversion Utility
 * File: src/utils/currencyUtils.ts
 *
 * Tailored for Indian students evaluating study-abroad programs.
 * Provides transparent, side-by-side conversions in the Indian numbering system (Lakhs / Crores / ₹).
 */

// Authoritative benchmark foreign exchange rates (INR)
export const EXCHANGE_RATES = {
  EUR: 91.25, // 1 EUR ≈ ₹91.25 INR
  GBP: 109.50, // 1 GBP ≈ ₹109.50 INR
  USD: 84.10, // 1 USD ≈ ₹84.10 INR
};

/**
 * Formats a raw INR number into readable Indian Rupee representation (e.g. ₹9.12 Lakhs or ₹45,000)
 */
export function formatInr(amountInr: number, compact: boolean = true): string {
  if (isNaN(amountInr) || amountInr <= 0) {
    return '₹0';
  }

  if (compact) {
    if (amountInr >= 10000000) {
      // Crores
      const cr = amountInr / 10000000;
      return `₹${cr.toFixed(2)} Cr`;
    }
    if (amountInr >= 100000) {
      // Lakhs
      const lakhs = amountInr / 100000;
      return `₹${lakhs.toFixed(2)} Lakhs`;
    }
    if (amountInr >= 1000) {
      const k = amountInr / 1000;
      return `₹${k.toFixed(1)}k`;
    }
  }

  // Standard Indian numbering locale
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amountInr);
}

/**
 * Converts EUR budget amount to INR
 */
export function convertEurToInr(eur: number | string | null | undefined): {
  inrRaw: number;
  inrFormatted: string;
  inrCompact: string;
} {
  const num = typeof eur === 'string' ? parseFloat(eur) : Number(eur || 0);
  if (isNaN(num) || num <= 0) {
    return { inrRaw: 0, inrFormatted: '₹0', inrCompact: '₹0' };
  }

  const inrRaw = num * EXCHANGE_RATES.EUR;
  return {
    inrRaw,
    inrFormatted: formatInr(inrRaw, false),
    inrCompact: formatInr(inrRaw, true),
  };
}

/**
 * Converts GBP to INR
 */
export function convertGbpToInr(gbp: number | string | null | undefined): {
  inrRaw: number;
  inrFormatted: string;
  inrCompact: string;
} {
  const num = typeof gbp === 'string' ? parseFloat(gbp) : Number(gbp || 0);
  if (isNaN(num) || num <= 0) {
    return { inrRaw: 0, inrFormatted: '₹0', inrCompact: '₹0' };
  }

  const inrRaw = num * EXCHANGE_RATES.GBP;
  return {
    inrRaw,
    inrFormatted: formatInr(inrRaw, false),
    inrCompact: formatInr(inrRaw, true),
  };
}

/**
 * Parses tuition strings like "€6,000 / semester", "£16,500 / year", "€0 (tuition-free)"
 * and produces a clean INR conversion indicator.
 */
export function getTuitionInrEstimate(tuitionStr: string | null | undefined): string | null {
  if (!tuitionStr) return null;

  const lower = tuitionStr.toLowerCase();

  // If free / 0
  if (lower.includes('€0') || lower.includes('free') || lower.includes('tuition-free')) {
    return '₹0 Tuition (Free Public Edu)';
  }

  // Check for EUR: e.g. €6,000 or €12,500
  const eurMatch = tuitionStr.match(/€\s*([\d,]+(?:\.\d+)?)/);
  if (eurMatch && eurMatch[1]) {
    const rawVal = parseFloat(eurMatch[1].replace(/,/g, ''));
    if (!isNaN(rawVal) && rawVal > 0) {
      const inr = rawVal * EXCHANGE_RATES.EUR;
      const isSemester = lower.includes('sem') || lower.includes('semester');
      return `~${formatInr(inr, true)}${isSemester ? '/sem' : '/yr'}`;
    }
  }

  // Check for GBP: e.g. £16,500 or £24,000
  const gbpMatch = tuitionStr.match(/£\s*([\d,]+(?:\.\d+)?)/);
  if (gbpMatch && gbpMatch[1]) {
    const rawVal = parseFloat(gbpMatch[1].replace(/,/g, ''));
    if (!isNaN(rawVal) && rawVal > 0) {
      const inr = rawVal * EXCHANGE_RATES.GBP;
      return `~${formatInr(inr, true)}/yr`;
    }
  }

  return null;
}
