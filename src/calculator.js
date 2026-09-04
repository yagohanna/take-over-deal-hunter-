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
  const totalProjectCost = purchasePrice + n('renovationBudget') + n('closingCosts');

  return {
    units, purchasePrice, grossMonthlyIncome, grossAnnualIncome: grossMonthlyIncome * 12,
    effectiveMonthlyIncome, effectiveAnnualIncome: effectiveMonthlyIncome * 12,
    monthlyOperatingExpenses, annualOperatingExpenses: monthlyOperatingExpenses * 12,
    monthlyNOI, annualNOI,
    currentCapRate: currentValue > 0 ? annualNOI / currentValue : null,
    stabilizedCapRate: totalProjectCost > 0 ? annualNOI / totalProjectCost : null,
    totalProjectCost, currentValue, afterRepairValue: n('afterRepairValue'), renovationBudget: n('renovationBudget'), totalDebt,
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

export function assessDeal(result, input = {}) {
  const present = key => String(input[key] ?? '').trim() !== '' && Number(input[key]) > 0;
  const usesExisting = ['assumption', 'subjectTo', 'existingPlusSeller'].includes(result.financingType);
  const usesSeller = ['sellerFinancing', 'existingPlusSeller'].includes(result.financingType);
  const missing = [];
  if (!String(input.propertyAddress || '').trim()) missing.push('Property address — Unknown');
  if (!present('purchasePrice')) missing.push('Asking price — Unknown');
  if (!present('rentalIncome')) missing.push('Current rental income — Unknown');
  if (!input.rentRollVerified) missing.push('Current rent roll — Needs verification');
  if (!input.t12Verified) missing.push('T12 financial statement — Needs verification');
  if (!present('propertyTaxes')) missing.push('Property taxes — Unknown');
  if (!present('insurance')) missing.push('Insurance — Unknown');
  if (!present('renovationBudget')) missing.push('Renovation estimate — Unknown or needs verification');
  if (!input.occupancyVerified) missing.push('Occupancy and delinquency information — Needs verification');
  if (usesExisting) {
    if (!present('existingMortgageBalance')) missing.push('Existing mortgage balance — Unknown');
    if (!input.loanStatementVerified) missing.push('Existing loan statement and balance — Needs verification');
    if (!input.rateVerified) missing.push('Interest rate and monthly payment — Needs verification');
    if (!input.loanMaturityDate) missing.push('Loan maturity date — Unknown');
    if (!input.prepaymentPenalty) missing.push('Prepayment penalty — Unknown');
  }
  if (usesSeller && (!present('sellerFinancedAmount') || !present('sellerAmortization'))) missing.push('Seller financing terms — Unknown');
  if (result.financingType !== 'conventional' && !present('sellerCashRequired')) missing.push('Seller cash requirement — Unknown');

  const dscrOk = result.dscr === null ? result.monthlyDebtService === 0 : result.dscr >= 1.25;
  const cashWithin = present('maxCashToClose') && result.totalCashToClose <= Number(input.maxCashToClose);
  const exceptionalCoc = result.cashOnCashReturn !== null && result.cashOnCashReturn >= .20;
  const majorMissing = !present('purchasePrice') || !present('rentalIncome') || (usesExisting && (!present('existingMortgageBalance') || !input.loanStatementVerified));
  const missesTargets = (present('targetCashFlow') && result.monthlyCashFlow < Number(input.targetCashFlow)) || (present('targetCapRate') && (result.stabilizedCapRate === null || result.stabilizedCapRate < Number(input.targetCapRate) / 100)) || (present('targetCoc') && (result.cashOnCashReturn === null || result.cashOnCashReturn < Number(input.targetCoc) / 100));
  let code;
  if (result.monthlyCashFlow < 0 || (result.dscr !== null && result.dscr < 1) || missesTargets) code = 'reject';
  else if (result.monthlyCashFlow > 0 && dscrOk && cashWithin && ((result.stabilizedCapRate ?? 0) >= .12 || exceptionalCoc) && !majorMissing) code = 'a';
  else if (result.monthlyCashFlow > 0 && (result.dscr === null || result.dscr >= 1.15) && (result.stabilizedCapRate ?? 0) >= .09 && (result.stabilizedCapRate ?? 0) < .12 && !majorMissing) code = 'b';
  else code = 'c';
  const labels = {a:'A — Strong Deal',b:'B — Promising Deal',c:'C — Marginal Deal',reject:'REJECT — Does Not Meet Targets'};
  const recommendations = {a:'Pursue immediately. Request supporting documents and begin financing and legal review.',b:'Continue evaluating. Negotiate terms and verify the missing financial information.',c:'Proceed cautiously. The deal needs a lower price, better financing terms, or improved income.',reject:'Do not proceed under the current terms. Renegotiate substantially or reject the opportunity.'};
  const why = [];
  if (result.monthlyCashFlow > 500) why.push('Strong monthly cash flow'); else if (result.monthlyCashFlow > 0) why.push('Positive monthly cash flow');
  if (usesExisting && Number(input.interestRate) > 0 && Number(input.interestRate) <= 4) why.push('Low-rate existing debt');
  if (cashWithin) why.push('Cash to close is within the configured target');
  if ((result.stabilizedCapRate ?? 0) >= .12) why.push('High stabilized cap rate');
  if ((result.dscr ?? 0) >= 1.25) why.push('Strong DSCR');
  if (result.afterRepairValue > result.totalProjectCost) why.push('Renovation may create meaningful equity');
  if (usesSeller && result.sellerFinancedAmount > 0) why.push('Seller financing reduces cash required at closing');
  const risks = [];
  if (result.monthlyCashFlow <= 0) risks.push('Negative cash flow'); else if (result.monthlyCashFlow < 300) risks.push('Weak cash flow');
  if (result.dscr !== null && result.dscr < 1.15) risks.push('Low DSCR');
  if (present('maxCashToClose') && !cashWithin) risks.push('Cash requirement exceeds the configured maximum');
  if (result.renovationBudget > result.purchasePrice * .2) risks.push('Large renovation budget relative to purchase price');
  if (Number(input.sellerBalloonTerm) > 0) risks.push(`Seller-financing balloon payment in ${Number(input.sellerBalloonTerm)} years`);
  if (Number(input.remainingAmortization) > 0 && Number(input.remainingAmortization) < 10) risks.push('Short remaining loan term');
  if (Number(input.vacancy) >= 10) risks.push('High vacancy assumption');
  if (!input.rentRollVerified || !input.t12Verified) risks.push('Performance depends on unverified projected rents or expenses');
  if (usesExisting && !input.loanStatementVerified) risks.push('Existing mortgage terms are not verified');
  if (result.financingType === 'subjectTo') risks.push('Subject-to due-on-sale risk');
  return {code, label: labels[code], recommendation: recommendations[code], why: why.length ? why : ['No calculated strengths identified yet'], risks: risks.length ? risks : ['No calculation-based risk flags identified'], missing};
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
