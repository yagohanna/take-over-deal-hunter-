import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateDeal } from './calculator.js';

test('calculates deal cash flow and supporting metrics', () => {
  const result = calculateDeal({ purchasePrice: 285000, debtBalance: 228000, rentalIncome: 3200, vacancy: 5, operatingExpenses: 650, repairs: 200, debtPayment: 1450 });
  assert.equal(result.cashFlow, 740);
  assert.equal(result.annualCashFlow, 8880);
  assert.equal(result.cashNeeded, 57000);
  assert.equal(result.debtCoverage.toFixed(2), '1.51');
});

test('sanitizes invalid and out-of-range values', () => {
  const result = calculateDeal({ purchasePrice: -1, debtBalance: 200, rentalIncome: 1000, vacancy: 120, operatingExpenses: 'bad', repairs: -50, debtPayment: 0 });
  assert.equal(result.cashNeeded, 0);
  assert.equal(result.vacancyLoss, 1000);
  assert.equal(result.cashFlow, 0);
  assert.equal(result.debtCoverage, null);
});
