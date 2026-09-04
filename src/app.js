import { calculateDeal } from './calculator.js';

const form = document.querySelector('#deal-form');
const inputIds = ['purchasePrice', 'debtBalance', 'interestRate', 'debtPayment', 'rentalIncome', 'operatingExpenses', 'vacancy', 'repairs'];
const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

const money = (value, signed = false) => {
  const formatted = currency.format(Math.abs(value));
  if (!signed) return formatted;
  return `${value >= 0 ? '+' : '−'}${formatted}`;
};

function updateResults() {
  const values = Object.fromEntries(inputIds.map((id) => [id, document.querySelector(`#${id}`).value]));
  const result = calculateDeal(values);
  const positive = result.cashFlow >= 0;

  document.querySelector('#cashFlow').textContent = money(result.cashFlow, true);
  document.querySelector('#annualCashFlow').textContent = `${money(result.annualCashFlow, true)} per year`;
  document.querySelector('#grossIncome').textContent = money(result.rentalIncome);
  document.querySelector('#vacancyLoss').textContent = `−${money(result.vacancyLoss)}`;
  document.querySelector('#expenseTotal').textContent = `−${money(result.operatingExpenses)}`;
  document.querySelector('#repairTotal').textContent = `−${money(result.repairs)}`;
  document.querySelector('#paymentTotal').textContent = `−${money(result.debtPayment)}`;
  document.querySelector('#cashNeeded').textContent = money(result.cashNeeded);
  document.querySelector('#debtCoverage').textContent = result.debtCoverage === null ? '—' : `${result.debtCoverage.toFixed(2)}x`;

  const status = document.querySelector('#deal-status');
  status.textContent = positive ? 'Cash-flow positive' : 'Cash-flow negative';
  status.classList.toggle('negative', !positive);
  const callout = document.querySelector('#result-callout');
  callout.classList.toggle('negative', !positive);
  callout.innerHTML = positive
    ? '<span>↑</span><p><strong>Promising start.</strong><br>This deal produces positive monthly cash flow.</p>'
    : '<span>↓</span><p><strong>Take another look.</strong><br>This deal currently produces negative cash flow.</p>';
}

form.addEventListener('input', updateResults);
form.addEventListener('reset', () => requestAnimationFrame(updateResults));
updateResults();
