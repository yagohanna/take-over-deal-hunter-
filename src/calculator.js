export function calculateDeal(values) {
  const number = (value) => Math.max(0, Number(value) || 0);
  const purchasePrice = number(values.purchasePrice);
  const debtBalance = number(values.debtBalance);
  const rentalIncome = number(values.rentalIncome);
  const vacancyRate = Math.min(number(values.vacancy), 100) / 100;
  const operatingExpenses = number(values.operatingExpenses);
  const repairs = number(values.repairs);
  const debtPayment = number(values.debtPayment);
  const vacancyLoss = rentalIncome * vacancyRate;
  const netOperatingIncome = rentalIncome - vacancyLoss - operatingExpenses - repairs;
  const cashFlow = netOperatingIncome - debtPayment;

  return {
    rentalIncome,
    vacancyLoss,
    operatingExpenses,
    repairs,
    debtPayment,
    cashFlow,
    annualCashFlow: cashFlow * 12,
    cashNeeded: Math.max(0, purchasePrice - debtBalance),
    debtCoverage: debtPayment > 0 ? netOperatingIncome / debtPayment : null,
  };
}
