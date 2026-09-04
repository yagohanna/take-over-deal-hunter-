const nonNegative = (value) => Math.max(0, Number(value) || 0);

export function monthlyLoanPayment(principal, annualRate, years) {
  const balance = nonNegative(principal);
  const months = nonNegative(years) * 12;
  if (!balance || !months) return 0;
  const rate = nonNegative(annualRate) / 100 / 12;
  return rate ? (balance * rate * (1 + rate) ** months) / ((1 + rate) ** months - 1) : balance / months;
}

export function calculateDeal(input = {}) {
  const n = (key) => nonNegative(input[key]);
  const financingType = input.financingType || 'subjectTo';
  const units = Math.max(1, Math.floor(n('units') || 1));
  const purchasePrice = n('purchasePrice');
  const currentValue = n('currentValue');
  const grossMonthlyIncome = n('rentalIncome') + n('otherIncome');
  const vacancyRate = Math.min(n('vacancy'), 100) / 100;
  const effectiveMonthlyIncome = grossMonthlyIncome * (1 - vacancyRate);
  const expenseKeys = ['propertyTaxes', 'insurance', 'utilities', 'maintenance', 'management', 'capex', 'hoa'];
  const monthlyOperatingExpenses = expenseKeys.reduce((sum, key) => sum + n(key), 0);
  const monthlyNOI = effectiveMonthlyIncome - monthlyOperatingExpenses;

  const usesExistingLoan = ['assumption', 'subjectTo', 'existingPlusSeller'].includes(financingType);
  const usesSellerLoan = ['sellerFinancing', 'existingPlusSeller'].includes(financingType);
  const conventionalPrincipal = financingType === 'conventional' ? Math.max(0, purchasePrice - n('downPayment')) : 0;
  const firstMortgageBalance = usesExistingLoan ? n('existingMortgageBalance') : conventionalPrincipal;
  const enteredPayment = n('existingMonthlyPayment');
  const calculatedFirstPayment = monthlyLoanPayment(firstMortgageBalance, n('interestRate'), n('remainingAmortization'));
  const firstMortgagePayment = usesExistingLoan && enteredPayment > 0 ? enteredPayment : calculatedFirstPayment;
  const sellerFinancedAmount = usesSellerLoan ? n('sellerFinancedAmount') : 0;
  const sellerFinancingPayment = monthlyLoanPayment(sellerFinancedAmount, n('sellerInterestRate'), n('sellerAmortization'));
  const monthlyDebtService = firstMortgagePayment + sellerFinancingPayment;
  const monthlyCashFlow = monthlyNOI - monthlyDebtService;

  const acquisitionCash = financingType === 'conventional' ? n('downPayment') : n('sellerCashRequired');
  const totalCashToClose = acquisitionCash + n('renovationBudget') + n('closingCosts') + n('operatingReserves') + n('mortgageArrears') + n('delinquentTaxes') + n('assumptionFee');
  const annualNOI = monthlyNOI * 12;
  const annualDebtService = monthlyDebtService * 12;
  const annualCashFlow = monthlyCashFlow * 12;
  const totalDebt = firstMortgageBalance + sellerFinancedAmount;

  return {
    units, purchasePrice, grossMonthlyIncome, grossAnnualIncome: grossMonthlyIncome * 12,
    effectiveMonthlyIncome, effectiveAnnualIncome: effectiveMonthlyIncome * 12,
    monthlyOperatingExpenses, annualOperatingExpenses: monthlyOperatingExpenses * 12,
    monthlyNOI, annualNOI,
    currentCapRate: currentValue > 0 ? annualNOI / currentValue : null,
    targetCapPrice: n('targetCapRate') > 0 ? annualNOI / (n('targetCapRate') / 100) : null,
    firstMortgageBalance, firstMortgagePayment, calculatedFirstPayment,
    firstPaymentIsEstimate: !(usesExistingLoan && enteredPayment > 0),
    sellerFinancedAmount, sellerFinancingPayment, monthlyDebtService, annualDebtService,
    dscr: annualDebtService > 0 ? annualNOI / annualDebtService : null,
    monthlyCashFlow, annualCashFlow, totalCashToClose,
    cashOnCashReturn: totalCashToClose > 0 ? annualCashFlow / totalCashToClose : null,
    sellerEquity: Math.max(0, purchasePrice - n('existingMortgageBalance')),
    breakEvenOccupancy: grossMonthlyIncome > 0 ? (monthlyOperatingExpenses + monthlyDebtService) / grossMonthlyIncome : null,
    pricePerUnit: purchasePrice / units, debtPerUnit: totalDebt / units,
    cashToCloseRatio: purchasePrice > 0 ? totalCashToClose / purchasePrice : null,
    financingType,
  };
}

export function getStatuses(result) {
  const band = (value, green, yellow) => value >= green ? 'green' : value >= yellow ? 'yellow' : 'red';
  return {
    dscr: result.dscr === null ? 'red' : band(result.dscr, 1.25, 1.10),
    cashFlow: result.monthlyCashFlow > 0 ? 'green' : 'red',
    cashToClose: result.cashToCloseRatio === null ? 'red' : result.cashToCloseRatio <= .05 ? 'green' : result.cashToCloseRatio <= .10 ? 'yellow' : 'red',
    capRate: result.currentCapRate === null ? 'red' : band(result.currentCapRate, .12, .09),
  };
}
