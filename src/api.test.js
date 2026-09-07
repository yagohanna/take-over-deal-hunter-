import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { createApi } from './api.js';
import { buildPayloads, InputError } from './api-payload.js';
import { calculateDeal } from './calculator.js';
import { PRODUCTION_API_BASE_URL } from './config.js';

const sample = {
  propertyAddress: '1 Test Street', propertyCity: 'Dayton', propertyState: 'oh', propertyZip: '45402', units: 2, propertyType: '2–4 Units',
  purchasePrice: 285000, currentValue: 310000, afterRepairValue: 335000, renovationBudget: 12000, closingCosts: 4500, operatingReserves: 6000,
  rentalIncome: 3400, otherIncome: 100, vacancy: 5, propertyTaxes: 310, insurance: 145, utilities: 100, maintenance: 200, management: 0, capex: 175, hoa: 0,
  financingType: 'subjectTo', downPayment: 0, existingMortgageBalance: 228000, interestRate: 3.25, remainingAmortization: 25, existingMonthlyPayment: 1111,
  sellerFinancedAmount: 0, sellerInterestRate: 0, sellerAmortization: 0, sellerCashRequired: 18000, mortgageArrears: 0, delinquentTaxes: 0, assumptionFee: 0,
};
const reply = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

test('maps the calculator contract, percentages and verification without inventing values', () => {
  const { property, analysis } = buildPayloads(sample);
  assert.equal(property.state, 'OH');
  assert.equal(analysis.financing_structure, 'SUBJECT_TO');
  assert.equal(analysis.monthly_operating_expenses, '930.00');
  assert.equal(analysis.vacancy_rate, '0.05');
  assert.equal(analysis.existing_loan_payment, '1111.00');
  assert.equal(analysis.loan_verification_status, 'ESTIMATED');
  const missingValues = buildPayloads({ ...sample, currentValue: '', afterRepairValue: '', units: '' });
  assert.equal(missingValues.property.estimated_value, null);
  assert.equal(missingValues.property.estimated_value_status, 'UNKNOWN');
  assert.equal(missingValues.property.number_of_units, null);
});

test('missing cost components are rejected while explicit zeros remain valid', () => {
  for (const field of ['rentalIncome', 'otherIncome', 'vacancy', 'hoa', 'insurance', 'closingCosts', 'mortgageArrears']) {
    assert.throws(() => buildPayloads({ ...sample, [field]: '' }), error => error instanceof InputError && error.fields.includes(field));
    assert.doesNotThrow(() => buildPayloads({ ...sample, [field]: 0 }));
  }
  for (const field of ['propertyCity', 'propertyState', 'propertyZip']) {
    assert.throws(() => buildPayloads({ ...sample, [field]: '' }), InputError);
  }
  assert.throws(() => buildPayloads({ ...sample, rentalIncome: Infinity }), InputError);
  assert.throws(() => buildPayloads({ ...sample, units: 1.5 }), InputError);
});

test('preserves every financing option and counts only the relevant acquisition cash', () => {
  const expected = { conventional: 'CONVENTIONAL', assumption: 'ASSUMPTION', subjectTo: 'SUBJECT_TO', sellerFinancing: 'SELLER_FINANCING', existingPlusSeller: 'HYBRID' };
  for (const [financingType, structure] of Object.entries(expected)) {
    const raw = { ...sample, financingType, downPayment: 50000, sellerFinancedAmount: 25000, sellerInterestRate: 5, sellerAmortization: 10 };
    const { analysis } = buildPayloads(raw);
    assert.equal(analysis.financing_structure, structure);
    assert.equal(analysis.down_payment, financingType === 'conventional' ? '50000.00' : '0.00');
    assert.equal(analysis.seller_cash_required, financingType === 'conventional' ? '0.00' : '18000.00');
    const total = ['down_payment', 'seller_cash_required', 'closing_costs', 'initial_reserves', 'renovation_budget', 'mortgage_arrears', 'delinquent_taxes', 'assumption_fee'].reduce((sum, key) => sum + Number(analysis[key]), 0);
    assert.equal(total, calculateDeal(raw).totalCashToClose);
    assert.equal(analysis.seller_financing_rate, ['sellerFinancing', 'existingPlusSeller'].includes(financingType) ? '0.05' : null);
  }
});

test('requires loan terms for estimated payments and only labels documentary evidence when marked', () => {
  assert.throws(() => buildPayloads({ ...sample, existingMonthlyPayment: '', interestRate: '' }), InputError);
  assert.equal(buildPayloads({ ...sample, loanStatementVerified: true, rateVerified: true }).analysis.loan_verification_status, 'VERIFIED_BY_DOCUMENT');
  assert.equal(buildPayloads({ ...sample, loanStatementVerified: true, rateVerified: true, existingMonthlyPayment: '' }).analysis.loan_verification_status, 'ESTIMATED');
  assert.equal(buildPayloads({ ...sample, loanStatementVerified: true, rateVerified: true, financingType: 'existingPlusSeller' }).analysis.loan_verification_status, 'ESTIMATED');
});

test('isolates the public API URL and sends no cookies', async () => {
  assert.equal(PRODUCTION_API_BASE_URL, 'https://takeover-deal-hunter-backend.onrender.com');
  const client = createApi({ fetchImpl: async (url, options) => {
    assert.equal(url, `${PRODUCTION_API_BASE_URL}/api/deals`);
    assert.equal(options.credentials, 'omit');
    assert.equal(options.cache, 'no-store');
    return reply([]);
  } });
  assert.deepEqual(await client.list(), []);
});

test('retries a partially completed save with the same keys, even after client reload', async () => {
  const store = new Map();
  const storage = { getItem: name => store.get(name), setItem: (name, value) => store.set(name, value) };
  const posts = [];
  let fail = true;
  const fetchImpl = async (url, options) => {
    if (options.method === 'GET') return reply({ status: 'healthy' });
    posts.push({ url, key: options.headers['Idempotency-Key'], payload: JSON.parse(options.body) });
    if (url.endsWith('/api/properties')) return reply({ id: 17 }, 201);
    if (fail) { fail = false; throw new TypeError('Connection lost after commit'); }
    return reply({ id: 23 }, 201);
  };
  const makeClient = () => createApi({ fetchImpl, cryptoImpl: webcrypto, storage });
  await assert.rejects(makeClient().save(buildPayloads(sample)), /retry the same inputs safely/i);
  assert.equal((await makeClient().save(buildPayloads(sample))).id, 23);
  assert.equal(posts[0].key, posts[2].key);
  assert.equal(posts[1].key, posts[3].key);
  assert.equal(posts[3].payload.property_id, 17);
  assert.equal(posts.length, 4); // No blind POST retry after the ambiguous error.
  assert.ok([...store.keys()].every(key => !key.includes('Test Street') && !key.includes('285000')));
});

test('times out an unresponsive service and shows a cold-start message', async () => {
  let slow = false;
  const api = createApi({ timeoutMs: 30, slowMs: 5, onSlow: () => { slow = true; },
    fetchImpl: (_url, options) => new Promise((_resolve, reject) => options.signal.addEventListener('abort', () => reject(new Error('aborted')))),
  });
  await assert.rejects(api.list(), /took too long/);
  assert.equal(slow, true);
});

test('handles validation, unavailable, invalid JSON and missing saved records', async () => {
  for (const [status, message] of [[422, /validate/], [503, /unavailable/], [409, /conflicts/], [404, /no longer available/]]) {
    const api = createApi({ fetchImpl: async () => reply({ detail: [{ loc: ['body', 'purchase_price'], input: 'should not be echoed' }] }, status) });
    await assert.rejects(api.list(), error => message.test(error.message) && !error.message.includes('should not be echoed'));
  }
  const api = createApi({ fetchImpl: async () => new Response('<html>Unavailable</html>') });
  await assert.rejects(api.list(), /unreadable/);
  assert.throws(() => api.summary('../../anything'), /Select a saved deal/);
});
