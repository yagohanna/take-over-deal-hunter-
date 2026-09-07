import { calculateDeal } from './calculator.js';

export const expenseFields = ['propertyTaxes', 'insurance', 'utilities', 'maintenance', 'management', 'capex', 'hoa'];
const financing = { conventional: 'CONVENTIONAL', assumption: 'ASSUMPTION', subjectTo: 'SUBJECT_TO', sellerFinancing: 'SELLER_FINANCING', existingPlusSeller: 'HYBRID' };
const present = value => String(value ?? '').trim() !== '';
const amount = value => Number(value).toFixed(2);
const label = key => ({ propertyCity: 'City', propertyState: 'State', propertyZip: 'ZIP code', hoa: 'HOA or other expenses', capex: 'Capital expenditure reserve' }[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase()));

export class InputError extends Error {
  constructor(fields) {
    const labels = [...new Set(fields)].map(label);
    super(`Complete or correct: ${labels.join(', ')}. Enter 0 only for amounts known to be zero. The browser calculator remains available.`);
    this.fields = fields;
  }
}

export function buildPayloads(raw) {
  const existing = ['assumption', 'subjectTo', 'existingPlusSeller'].includes(raw.financingType);
  const seller = ['sellerFinancing', 'existingPlusSeller'].includes(raw.financingType);
  const required = ['purchasePrice', 'rentalIncome', 'otherIncome', 'vacancy', ...expenseFields,
    'renovationBudget', 'closingCosts', 'operatingReserves', 'mortgageArrears', 'delinquentTaxes', 'assumptionFee',
    raw.financingType === 'conventional' ? 'downPayment' : 'sellerCashRequired'];
  if (existing) required.push('existingMortgageBalance');
  if (seller) required.push('sellerFinancedAmount');
  const result = calculateDeal(raw);
  if ((existing && !(Number(raw.existingMonthlyPayment) > 0)) || raw.financingType === 'conventional' && result.firstMortgageBalance > 0) {
    required.push('interestRate', 'remainingAmortization');
  }
  if (seller && result.sellerFinancedAmount > 0) required.push('sellerInterestRate', 'sellerAmortization');
  const errors = required.filter(key => !present(raw[key]) || !Number.isFinite(Number(raw[key])) || Number(raw[key]) < 0 || Number(raw[key]) > 999999999999.99);
  if (!(Number(raw.purchasePrice) > 0)) errors.push('purchasePrice');
  if (Number(raw.vacancy) > 100) errors.push('vacancy');
  if (required.includes('remainingAmortization') && !(Number(raw.remainingAmortization) > 0)) errors.push('remainingAmortization');
  if (required.includes('sellerAmortization') && !(Number(raw.sellerAmortization) > 0)) errors.push('sellerAmortization');
  if (raw.financingType === 'conventional' && Number(raw.downPayment) > Number(raw.purchasePrice)) errors.push('downPayment');
  if (!financing[raw.financingType]) errors.push('financingType');
  if (!String(raw.propertyAddress || '').trim() || String(raw.propertyAddress).trim().length > 255) errors.push('propertyAddress');
  if (!String(raw.propertyCity || '').trim() || String(raw.propertyCity).trim().length > 100) errors.push('propertyCity');
  if (!/^[A-Za-z]{2}$/.test(String(raw.propertyState || '').trim())) errors.push('propertyState');
  if (!/^\d{5}(-\d{4})?$/.test(String(raw.propertyZip || '').trim())) errors.push('propertyZip');
  if (present(raw.units) && (!Number.isInteger(Number(raw.units)) || Number(raw.units) < 1)) errors.push('units');
  for (const key of ['currentValue', 'afterRepairValue', 'existingMonthlyPayment']) {
    if (present(raw[key]) && (!Number.isFinite(Number(raw[key])) || Number(raw[key]) < 0)) errors.push(key);
  }
  if (![result.firstMortgagePayment, result.sellerFinancingPayment].every(Number.isFinite)) errors.push('financingType');
  if (errors.length) throw new InputError([...new Set(errors)]);

  return {
    property: {
      address: raw.propertyAddress.trim(), city: raw.propertyCity.trim(), state: raw.propertyState.trim().toUpperCase(), zip_code: raw.propertyZip.trim(),
      property_type: raw.propertyType || null, number_of_units: present(raw.units) ? Number(raw.units) : null,
      asking_price: amount(raw.purchasePrice), estimated_value: present(raw.currentValue) ? amount(raw.currentValue) : null,
      estimated_value_status: present(raw.currentValue) ? 'ESTIMATED' : 'UNKNOWN',
      after_repair_value: present(raw.afterRepairValue) ? amount(raw.afterRepairValue) : null,
      after_repair_value_status: present(raw.afterRepairValue) ? 'ESTIMATED' : 'UNKNOWN',
      renovation_budget: amount(raw.renovationBudget),
    },
    analysis: {
      financing_structure: financing[raw.financingType], purchase_price: amount(raw.purchasePrice),
      down_payment: raw.financingType === 'conventional' ? amount(raw.downPayment) : '0.00',
      seller_cash_required: raw.financingType === 'conventional' ? '0.00' : amount(raw.sellerCashRequired),
      seller_financed_amount: amount(result.sellerFinancedAmount),
      seller_financing_rate: seller && present(raw.sellerInterestRate) ? String(Number(raw.sellerInterestRate) / 100) : null,
      seller_financing_payment: amount(result.sellerFinancingPayment), existing_loan_payment: amount(result.firstMortgagePayment),
      closing_costs: amount(raw.closingCosts), initial_reserves: amount(raw.operatingReserves), renovation_budget: amount(raw.renovationBudget),
      mortgage_arrears: amount(raw.mortgageArrears), delinquent_taxes: amount(raw.delinquentTaxes), assumption_fee: amount(raw.assumptionFee),
      monthly_rental_income: amount(raw.rentalIncome), monthly_other_income: amount(raw.otherIncome), vacancy_rate: String(Number(raw.vacancy) / 100),
      monthly_operating_expenses: amount(result.monthlyOperatingExpenses),
      income_verification_status: raw.rentRollVerified && raw.t12Verified ? 'VERIFIED_BY_DOCUMENT' : 'ESTIMATED',
      expense_verification_status: raw.t12Verified ? 'VERIFIED_BY_DOCUMENT' : 'ESTIMATED',
      loan_verification_status: existing && !seller && raw.loanStatementVerified && raw.rateVerified && Number(raw.existingMonthlyPayment) > 0 ? 'VERIFIED_BY_DOCUMENT' : 'ESTIMATED',
    },
  };
}
