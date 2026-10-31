/**
 * AbroadPath AI - Financial Data Utilities
 * File: src/utils/financialUtils.ts
 *
 * Provides structured fee breakdowns, total cost estimation, and currency
 * conversion for university programs. Distinguishes between officially
 * published tuition fees and estimated living expenses.
 *
 * This module is additive and does not replace existing currencyUtils or
 * matchEngine.parseAnnualTuition functionality.
 */

import { University } from '../types';
import { parseAnnualTuition } from './matchEngine';
import { EXCHANGE_RATES, formatInr } from './currencyUtils';

// ==========================================
// Fee Breakdown Types (local, not exported to global types)
// ==========================================

export interface FeeBreakdownRow {
  label: string;
  amount: number | null;
  currency: string;
  type: 'tuition' | 'living' | 'administrative' | 'visa' | 'other';
  verified: boolean;
  note: string | null;
}

export interface FeeBreakdown {
  rows: FeeBreakdownRow[];
  annualTuition: number | null;
  totalProgramTuition: number | null;
  estimatedAnnualLiving: number | null;
  estimatedTotalAnnualCost: number | null;
  currency: string;
  academicYear: string | null;
  feesVerified: boolean;
  hasOfficialData: boolean;
  displayCurrency: string;
}

// ==========================================
// Currency Helpers
// ==========================================

/** Supported display currencies */
export type DisplayCurrency = 'EUR' | 'GBP' | 'USD' | 'INR';

/**
 * Gets the exchange rate for a currency code.
 */
export function getExchangeRate(currency: string): number {
  const upper = currency.toUpperCase();
  if (upper === 'INR') return 1;
  if (upper === 'EUR') return EXCHANGE_RATES.EUR;
  if (upper === 'GBP') return EXCHANGE_RATES.GBP;
  if (upper === 'USD') return EXCHANGE_RATES.USD;
  return 1; // Fallback
}

/**
 * Converts an amount from one currency to another.
 */
export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): number {
  if (fromCurrency.toUpperCase() === toCurrency.toUpperCase()) {
    return amount;
  }

  // Convert via INR as the common base
  const amountInInr = amount * getExchangeRate(fromCurrency);
  const targetRate = getExchangeRate(toCurrency);
  return targetRate > 0 ? amountInInr / targetRate : amountInInr;
}

/**
 * Formats a currency amount for display.
 */
export function formatCurrencyAmount(
  amount: number,
  currency: string
): string {
  const symbols: Record<string, string> = {
    EUR: '€',
    GBP: '£',
    USD: '$',
    INR: '₹',
  };
  const symbol = symbols[currency.toUpperCase()] || '';

  if (currency.toUpperCase() === 'INR') {
    return formatInr(amount, true);
  }

  return `${symbol}${amount.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

// ==========================================
// Fee Breakdown Builder
// ==========================================

/**
 * Detects the currency symbol from a tuition string.
 */
function detectCurrencyFromTuition(tuitionStr: string): string {
  if (tuitionStr.includes('€')) return 'EUR';
  if (tuitionStr.includes('£')) return 'GBP';
  if (tuitionStr.includes('$')) return 'USD';
  return 'EUR'; // Default
}

/**
 * Builds a structured fee breakdown for a university program.
 * Combines officially published fees with estimated living costs.
 */
export function buildFeeBreakdown(
  university: University,
  displayCurrency: DisplayCurrency = 'INR'
): FeeBreakdown {
  const req = university.requirements;
  const rows: FeeBreakdownRow[] = [];

  // Determine base currency
  const currency = req.fee_currency ||
    detectCurrencyFromTuition(university.tuition || '') ||
    'EUR';
  const academicYear = req.fee_academic_year || null;
  const feesVerified = req.fees_verified === true;

  // 1. Annual Tuition
  let annualTuition: number | null = null;
  let totalProgramTuition: number | null = null;

  if (req.annual_tuition_amount != null) {
    annualTuition = req.annual_tuition_amount;
  } else {
    // Fall back to parsing the tuition string
    annualTuition = parseAnnualTuition(university.tuition);
  }

  if (req.total_program_tuition_amount != null) {
    totalProgramTuition = req.total_program_tuition_amount;
  }

  // Tuition row
  if (annualTuition !== null) {
    rows.push({
      label: 'Annual Tuition',
      amount: annualTuition,
      currency,
      type: 'tuition',
      verified: feesVerified || !!university.lastChecked,
      note: feesVerified ? null : 'Estimated from published tuition data — verify on official site.',
    });

    if (totalProgramTuition !== null) {
      rows.push({
        label: 'Total Program Tuition',
        amount: totalProgramTuition,
        currency,
        type: 'tuition',
        verified: feesVerified,
        note: null,
      });
    } else if (annualTuition === 0) {
      rows.push({
        label: 'Total Program Tuition',
        amount: 0,
        currency,
        type: 'tuition',
        verified: feesVerified || !!university.lastChecked,
        note: 'Tuition-free public education program.',
      });
    }
  } else {
    rows.push({
      label: 'Annual Tuition',
      amount: null,
      currency,
      type: 'tuition',
      verified: false,
      note: 'Tuition not confirmed in our catalog. Check the official program page.',
    });
  }

  // 2. Application Fee
  if (req.application_fee != null) {
    rows.push({
      label: 'Application Fee',
      amount: req.application_fee,
      currency,
      type: 'administrative',
      verified: feesVerified,
      note: null,
    });
  }

  // 3. Accommodation (estimated living)
  if (req.accommodation_cost != null) {
    rows.push({
      label: 'Accommodation (annual est.)',
      amount: req.accommodation_cost,
      currency,
      type: 'living',
      verified: feesVerified,
      note: 'Estimated living expense — not an official university fee.',
    });
  }

  // 4. Food
  if (req.food_cost != null) {
    rows.push({
      label: 'Food (annual est.)',
      amount: req.food_cost,
      currency,
      type: 'living',
      verified: feesVerified,
      note: 'Estimated living expense — not an official university fee.',
    });
  }

  // 5. Transportation
  if (req.transportation_cost != null) {
    rows.push({
      label: 'Transportation (annual est.)',
      amount: req.transportation_cost,
      currency,
      type: 'living',
      verified: feesVerified,
      note: 'Estimated living expense — not an official university fee.',
    });
  }

  // 6. Insurance
  if (req.insurance_cost != null) {
    rows.push({
      label: 'Health Insurance (annual est.)',
      amount: req.insurance_cost,
      currency,
      type: 'living',
      verified: feesVerified,
      note: 'Mandatory health insurance for international students.',
    });
  }

  // 7. Visa Costs
  if (req.visa_cost != null) {
    rows.push({
      label: 'Visa / Residence Permit',
      amount: req.visa_cost,
      currency,
      type: 'visa',
      verified: feesVerified,
      note: 'One-time visa application cost.',
    });
  }

  // 8. Other mandatory expenses
  if (req.other_mandatory_expenses) {
    rows.push({
      label: 'Other Mandatory Expenses',
      amount: null,
      currency,
      type: 'other',
      verified: feesVerified,
      note: req.other_mandatory_expenses,
    });
  }

  // Calculate estimated annual living costs
  const livingRows = rows.filter((r) => r.type === 'living' && r.amount !== null);
  const estimatedAnnualLiving = livingRows.length > 0
    ? livingRows.reduce((sum, r) => sum + (r.amount || 0), 0)
    : null;

  // Calculate estimated total annual cost
  const estimatedTotalAnnualCost = annualTuition !== null && estimatedAnnualLiving !== null
    ? annualTuition + estimatedAnnualLiving
    : annualTuition !== null
    ? annualTuition
    : null;

  // Check if we have any official (verified) data
  const hasOfficialData = rows.some((r) => r.verified);

  return {
    rows,
    annualTuition,
    totalProgramTuition,
    estimatedAnnualLiving,
    estimatedTotalAnnualCost,
    currency,
    academicYear,
    feesVerified,
    hasOfficialData,
    displayCurrency,
  };
}

/**
 * Converts a fee breakdown to the student's preferred display currency.
 */
export function convertFeeBreakdown(
  breakdown: FeeBreakdown,
  targetCurrency: DisplayCurrency
): FeeBreakdown {
  if (breakdown.currency === targetCurrency) {
    return breakdown;
  }

  const convertedRows = breakdown.rows.map((row) => ({
    ...row,
    amount: row.amount !== null
      ? convertCurrency(row.amount, row.currency, targetCurrency)
      : null,
    currency: targetCurrency,
  }));

  return {
    ...breakdown,
    rows: convertedRows,
    annualTuition: breakdown.annualTuition !== null
      ? convertCurrency(breakdown.annualTuition, breakdown.currency, targetCurrency)
      : null,
    totalProgramTuition: breakdown.totalProgramTuition !== null
      ? convertCurrency(breakdown.totalProgramTuition, breakdown.currency, targetCurrency)
      : null,
    estimatedAnnualLiving: breakdown.estimatedAnnualLiving !== null
      ? convertCurrency(breakdown.estimatedAnnualLiving, breakdown.currency, targetCurrency)
      : null,
    estimatedTotalAnnualCost: breakdown.estimatedTotalAnnualCost !== null
      ? convertCurrency(breakdown.estimatedTotalAnnualCost, breakdown.currency, targetCurrency)
      : null,
    currency: targetCurrency,
    displayCurrency: targetCurrency,
  };
}

/**
 * Produces a compact summary string for the total estimated annual cost.
 */
export function formatTotalCostSummary(
  breakdown: FeeBreakdown,
  targetCurrency: DisplayCurrency = 'INR'
): string {
  const converted = convertFeeBreakdown(breakdown, targetCurrency);
  if (converted.estimatedTotalAnnualCost === null) {
    if (converted.annualTuition === null) {
      return 'Tuition not confirmed';
    }
    return `Tuition: ${formatCurrencyAmount(converted.annualTuition, targetCurrency)}/yr`;
  }

  const tuition = converted.annualTuition ?? 0;
  const living = converted.estimatedAnnualLiving ?? 0;

  if (tuition === 0 && living > 0) {
    return `Tuition-free · Living ~${formatCurrencyAmount(living, targetCurrency)}/yr`;
  }

  return `${formatCurrencyAmount(converted.estimatedTotalAnnualCost, targetCurrency)}/yr total`;
}

/**
 * Checks if a student's budget covers the estimated total annual cost.
 */
export function checkBudgetFit(
  university: University,
  studentBudgetEur: number | null
): { fits: boolean; annualCostEur: number | null; note: string | null } {
  if (studentBudgetEur === null) {
    return { fits: true, annualCostEur: null, note: null };
  }

  const annualTuitionEur = parseAnnualTuition(university.tuition);
  if (annualTuitionEur === null) {
    return { fits: true, annualCostEur: null, note: 'Tuition data unavailable for budget comparison.' };
  }

  return {
    fits: annualTuitionEur <= studentBudgetEur,
    annualCostEur: annualTuitionEur,
    note: annualTuitionEur <= studentBudgetEur
      ? `Annual tuition (€${annualTuitionEur.toLocaleString()}) is within your budget (€${studentBudgetEur.toLocaleString()}).`
      : `Annual tuition (€${annualTuitionEur.toLocaleString()}) exceeds your budget (€${studentBudgetEur.toLocaleString()}).`,
  };
}
