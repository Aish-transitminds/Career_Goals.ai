/**
 * AbroadPath AI - Financial Utilities Unit Tests
 * File: tests/unit/financialUtils.test.ts
 */

import {
  buildFeeBreakdown,
  convertFeeBreakdown,
  convertCurrency,
  formatCurrencyAmount,
  formatTotalCostSummary,
  checkBudgetFit,
  getExchangeRate,
} from '../../src/utils/financialUtils';
import { University } from '../../src/types';

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, desc: string) {
  if (condition) {
    passedCount++;
    console.log(`  ✓ ${desc}`);
  } else {
    failedCount++;
    console.error(`  ✗ FAIL: ${desc}`);
  }
}

function createUniversity(overrides: Partial<University> = {}): University {
  return {
    id: 'test_uni',
    countryId: 'germany',
    name: 'Test University',
    program: 'M.Sc. Computer Science',
    requirements: {
      min_ielts: 6.5,
      min_toefl: 88,
      gre_required: null,
      gmat_required: null,
      min_gre: null,
      min_gmat: null,
      language_requirement: 'IELTS 6.5',
      application_deadline: 'May 31',
      tuition_fee: '€6,000 per semester',
      notes: null,
    },
    tuition: '€6,000 / semester (Non-EU)',
    portalUrl: 'https://example.com/apply',
    sourceUrl: 'https://example.com/program',
    lastChecked: '2026-10-15',
    ruleChanged: false,
    ...overrides,
  };
}

console.log('\n=== RUNNING FINANCIAL UTILS UNIT TESTS ===\n');

// ==========================================
// Category 1: Exchange Rates
// ==========================================
console.log('--- Category 1: Exchange Rates ---');
{
  assert(getExchangeRate('EUR') > 0, 'F1.1: EUR exchange rate is positive');
  assert(getExchangeRate('GBP') > 0, 'F1.2: GBP exchange rate is positive');
  assert(getExchangeRate('USD') > 0, 'F1.3: USD exchange rate is positive');
  assert(getExchangeRate('INR') === 1, 'F1.4: INR base rate is 1');
  assert(getExchangeRate('XYZ') === 1, 'F1.5: Unknown currency defaults to 1');
}

// ==========================================
// Category 2: Currency Conversion
// ==========================================
console.log('\n--- Category 2: Currency Conversion ---');
{
  // Same currency = no conversion
  assert(convertCurrency(100, 'EUR', 'EUR') === 100, 'F2.1: Same currency returns same amount');

  // EUR to INR
  const eurToInr = convertCurrency(100, 'EUR', 'INR');
  assert(eurToInr > 9000, 'F2.2: 100 EUR converts to >9000 INR');

  // GBP to INR
  const gbpToInr = convertCurrency(100, 'GBP', 'INR');
  assert(gbpToInr > 10000, 'F2.3: 100 GBP converts to >10000 INR');

  // USD to INR
  const usdToInr = convertCurrency(100, 'USD', 'INR');
  assert(usdToInr > 8000, 'F2.4: 100 USD converts to >8000 INR');

  // EUR to GBP (cross conversion)
  const eurToGbp = convertCurrency(100, 'EUR', 'GBP');
  assert(eurToGbp > 80 && eurToGbp < 100, 'F2.5: 100 EUR converts to 80-100 GBP');
}

// ==========================================
// Category 3: Fee Breakdown Building
// ==========================================
console.log('\n--- Category 3: Fee Breakdown Building ---');
{
  // Basic university with tuition string only
  const uni = createUniversity();
  const breakdown = buildFeeBreakdown(uni, 'EUR');

  assert(breakdown.rows.length >= 1, 'F3.1: Breakdown has at least one row');
  assert(breakdown.annualTuition === 12000, 'F3.2: €6,000/semester → €12,000 annual');
  assert(breakdown.currency === 'EUR', 'F3.3: Currency detected as EUR');
  assert(breakdown.feesVerified === false, 'F3.4: Fees not explicitly verified by default');
  assert(breakdown.hasOfficialData === true, 'F3.5: Has official data (lastChecked set)');

  // Tuition-free university
  const uniFree = createUniversity({ tuition: '€0 (Tuition-free)', requirements: { ...uni.requirements, tuition_fee: '€0 (Tuition-free)' } });
  const breakdownFree = buildFeeBreakdown(uniFree);
  assert(breakdownFree.annualTuition === 0, 'F3.6: Tuition-free → annual tuition is 0');

  // With explicit fee breakdown fields
  const uniWithFees = createUniversity({
    requirements: {
      ...uni.requirements,
      annual_tuition_amount: 15000,
      fee_currency: 'EUR',
      fee_academic_year: '2025-2026',
      accommodation_cost: 6000,
      food_cost: 3000,
      transportation_cost: 1200,
      insurance_cost: 800,
      visa_cost: 100,
      application_fee: 75,
      fees_verified: true,
      scholarship_info: 'DAAD scholarship available',
      scholarship_url: 'https://example.com/scholarship',
    },
  });
  const breakdownDetailed = buildFeeBreakdown(uniWithFees, 'INR');

  assert(breakdownDetailed.annualTuition === 15000, 'F3.7: Explicit annual tuition used');
  assert(breakdownDetailed.academicYear === '2025-2026', 'F3.8: Academic year preserved');
  assert(breakdownDetailed.feesVerified === true, 'F3.9: Fees verified flag respected');
  assert(breakdownDetailed.estimatedAnnualLiving === 11000, 'F3.10: Living costs summed (6000+3000+1200+800=11000)');
  assert(breakdownDetailed.estimatedTotalAnnualCost === 26000, 'F3.11: Total annual cost = tuition + living = 26000');

  // Check rows include all categories
  const tuitionRows = breakdownDetailed.rows.filter((r) => r.type === 'tuition');
  const livingRows = breakdownDetailed.rows.filter((r) => r.type === 'living');
  assert(tuitionRows.length >= 1, 'F3.12: At least one tuition row');
  assert(livingRows.length === 4, 'F3.13: Four living cost rows (accommodation, food, transport, insurance)');
}

// ==========================================
// Category 4: Currency Conversion of Breakdown
// ==========================================
console.log('\n--- Category 4: Fee Breakdown Currency Conversion ---');
{
  const uni = createUniversity({
    requirements: {
      ...createUniversity().requirements,
      annual_tuition_amount: 10000,
      fee_currency: 'EUR',
      accommodation_cost: 5000,
    },
  });
  const breakdownEur = buildFeeBreakdown(uni, 'EUR');
  const breakdownInr = convertFeeBreakdown(breakdownEur, 'INR');

  assert(breakdownInr.currency === 'INR', 'F4.1: Converted currency is INR');
  assert(breakdownInr.annualTuition !== breakdownEur.annualTuition, 'F4.2: Converted tuition differs from EUR');
  assert(breakdownInr.annualTuition! > breakdownEur.annualTuition!, 'F4.3: INR tuition > EUR tuition (exchange rate)');
  assert(breakdownInr.estimatedAnnualLiving! > 0, 'F4.4: Living costs converted and positive');
}

// ==========================================
// Category 5: Total Cost Summary Formatting
// ==========================================
console.log('\n--- Category 5: Total Cost Summary ---');
{
  const uni = createUniversity({ tuition: '€6,000 / semester (Non-EU)' });
  const breakdown = buildFeeBreakdown(uni, 'INR');
  const summary = formatTotalCostSummary(breakdown, 'INR');
  assert(summary.length > 0, 'F5.1: Summary is non-empty');
  assert(summary.includes('₹'), 'F5.2: INR summary contains rupee symbol');

  // Tuition-free
  const uniFree = createUniversity({ tuition: '€0 (Tuition-free)' });
  const breakdownFree = buildFeeBreakdown(uniFree);
  const summaryFree = formatTotalCostSummary(breakdownFree, 'INR');
  assert(summaryFree.includes('Free') || summaryFree.includes('₹0'), 'F5.3: Tuition-free summary mentions free');
}

// ==========================================
// Category 6: Budget Fit Check
// ==========================================
console.log('\n--- Category 6: Budget Fit Check ---');
{
  const uni = createUniversity({ tuition: '€6,000 / semester (Non-EU)' });

  // Within budget
  const fit = checkBudgetFit(uni, 15000);
  assert(fit.fits === true, 'F6.1: €12,000 tuition within €15,000 budget → fits');
  assert(fit.annualCostEur === 12000, 'F6.2: Annual cost calculated correctly');

  // Exceeds budget
  const noFit = checkBudgetFit(uni, 10000);
  assert(noFit.fits === false, 'F6.3: €12,000 tuition exceeds €10,000 budget → does not fit');

  // Null budget (no constraint)
  const nullBudget = checkBudgetFit(uni, null);
  assert(nullBudget.fits === true, 'F6.4: Null budget → fits (no constraint)');

  // Tuition-free
  const uniFree = createUniversity({ tuition: '€0 (Tuition-free)' });
  const fitFree = checkBudgetFit(uniFree, 5000);
  assert(fitFree.fits === true, 'F6.5: Tuition-free fits any positive budget');
}

// ==========================================
// Category 7: Currency Amount Formatting
// ==========================================
console.log('\n--- Category 7: Currency Amount Formatting ---');
{
  const eurFormatted = formatCurrencyAmount(5000, 'EUR');
  assert(eurFormatted.includes('€'), 'F7.1: EUR formatting includes euro symbol');

  const gbpFormatted = formatCurrencyAmount(46000, 'GBP');
  assert(gbpFormatted.includes('£'), 'F7.2: GBP formatting includes pound symbol');

  const usdFormatted = formatCurrencyAmount(30000, 'USD');
  assert(usdFormatted.includes('$'), 'F7.3: USD formatting includes dollar symbol');

  const inrFormatted = formatCurrencyAmount(500000, 'INR');
  assert(inrFormatted.includes('₹'), 'F7.4: INR formatting includes rupee symbol');
}

// ==========================================
// Category 8: Living vs Tuition Distinction
// ==========================================
console.log('\n--- Category 8: Living vs Tuition Distinction ---');
{
  const uni = createUniversity({
    requirements: {
      ...createUniversity().requirements,
      annual_tuition_amount: 15000,
      fee_currency: 'EUR',
      accommodation_cost: 6000,
      food_cost: 3000,
      fees_verified: true,
    },
  });
  const breakdown = buildFeeBreakdown(uni, 'EUR');

  // Check that tuition rows are marked as verified and living rows have notes
  const tuitionRow = breakdown.rows.find((r) => r.type === 'tuition' && r.label === 'Annual Tuition')!;
  assert(tuitionRow.verified === true, 'F8.1: Tuition row is verified when fees_verified is true');

  const livingRows = breakdown.rows.filter((r) => r.type === 'living');
  assert(livingRows.every((r) => r.note !== null), 'F8.2: Living cost rows have notes indicating they are estimates');
}

console.log(`\n========================================`);
console.log(`TOTAL TESTS: ${passedCount + failedCount}`);
console.log(`TOTAL PASSED: ${passedCount}`);
console.log(`TOTAL FAILED: ${failedCount}`);
console.log(`========================================\n`);

if (failedCount > 0) {
  process.exit(1);
}
