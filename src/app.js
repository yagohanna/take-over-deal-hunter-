import { calculateDeal, getStatuses } from './calculator.js';

const form = document.querySelector('#deal-form');
const inputs = [...form.querySelectorAll('input, select')];
const currency = new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0});
const percent = new Intl.NumberFormat('en-US',{style:'percent',minimumFractionDigits:1,maximumFractionDigits:2});
const money = value => currency.format(Number.isFinite(value) ? value : 0);
const ratio = value => value === null || !Number.isFinite(value) ? '—' : `${value.toFixed(2)}x`;
const pct = value => value === null || !Number.isFinite(value) ? '—' : percent.format(value);
const values = () => Object.fromEntries(inputs.map(input => [input.id,input.value]));
const metricRows = [
  ['Monthly gross potential income','grossMonthlyIncome','money'],['Annual gross potential income','grossAnnualIncome','money'],['Effective income after vacancy','effectiveMonthlyIncome','money'],
  ['Total monthly operating expenses','monthlyOperatingExpenses','money'],['Total annual operating expenses','annualOperatingExpenses','money'],['Monthly NOI','monthlyNOI','money'],['Annual NOI','annualNOI','money'],
  ['Current / stabilized cap rate','currentCapRate','percent'],['Price for target cap rate','targetCapPrice','money'],['Monthly first-mortgage payment','firstMortgagePayment','money'],
  ['Monthly seller-financing payment','sellerFinancingPayment','money'],['Total monthly debt service','monthlyDebtService','money'],['Annual debt service','annualDebtService','money'],['DSCR','dscr','ratio'],
  ['Monthly cash flow','monthlyCashFlow','money'],['Annual cash flow','annualCashFlow','money'],['Total cash required to close','totalCashToClose','money'],['Cash-on-cash return','cashOnCashReturn','percent'],
  ['Estimated seller equity','sellerEquity','money'],['Break-even occupancy','breakEvenOccupancy','percent'],['Price per unit','pricePerUnit','money'],['Debt amount per unit','debtPerUnit','money']
];
const format = (value,type) => type === 'money' ? money(value) : type === 'percent' ? pct(value) : ratio(value);

function validate() {
  const bad = inputs.filter(input => input.type === 'number' && input.value !== '' && (!Number.isFinite(Number(input.value)) || Number(input.value) < Number(input.min || 0) || (input.max && Number(input.value) > Number(input.max))));
  const summary = document.querySelector('#validation-summary');
  summary.hidden = !bad.length;
  summary.textContent = bad.length ? 'Correct highlighted values: numbers must be within the permitted non-negative range.' : '';
  return !bad.length;
}

function update() {
  if (!validate()) return;
  const result = calculateDeal(values());
  const statuses = getStatuses(result);
  document.querySelector('[data-result="dscr"]').textContent = ratio(result.dscr);
  document.querySelector('[data-result="monthlyCashFlow"]').textContent = money(result.monthlyCashFlow);
  document.querySelector('[data-result="totalCashToClose"]').textContent = money(result.totalCashToClose);
  document.querySelector('[data-result="currentCapRate"]').textContent = pct(result.currentCapRate);
  Object.entries(statuses).forEach(([key,status]) => document.querySelector(`#status-${key}`).className = status);
  document.querySelector('#overall-status').textContent = Object.values(statuses).every(x => x === 'green') ? 'Strong indicators' : Object.values(statuses).includes('red') ? 'Needs review' : 'Marginal indicators';
  document.querySelector('#result-address').textContent = document.querySelector('#propertyAddress').value.trim() || 'Prospective acquisition';
  document.querySelector('#estimate-note').textContent = result.firstPaymentIsEstimate && result.firstMortgageBalance > 0 ? `Estimated first-mortgage payment: ${money(result.firstMortgagePayment)}. Verify the actual balance, escrow, payment, rate, and loan term.` : 'The entered existing mortgage payment is treated as provided; verify it against a current loan statement.';
  document.querySelector('#metrics').innerHTML = metricRows.map(([label,key,type]) => `<div><dt>${label}${key === 'sellerEquity' ? ' (estimate)' : ''}</dt><dd>${format(result[key],type)}</dd></div>`).join('');
  document.querySelector('#subject-warning').hidden = result.financingType !== 'subjectTo';
}

const sample = {propertyAddress:'418 Oakridge Avenue, Dayton, OH',propertyType:'2–4 Units',units:2,purchasePrice:285000,currentValue:310000,afterRepairValue:335000,renovationBudget:12000,closingCosts:4500,operatingReserves:6000,rentalIncome:3400,otherIncome:100,vacancy:5,propertyTaxes:310,insurance:145,utilities:100,maintenance:200,management:0,capex:175,hoa:0,financingType:'subjectTo',downPayment:0,existingMortgageBalance:228000,interestRate:3.25,remainingAmortization:25,existingMonthlyPayment:1111,sellerFinancedAmount:0,sellerInterestRate:0,sellerAmortization:0,sellerBalloonTerm:0,sellerCashRequired:18000,mortgageArrears:0,delinquentTaxes:0,assumptionFee:0,targetCapRate:10,targetCashFlow:500,targetCoc:12,maxCashToClose:45000};
function loadSample(){inputs.forEach(input => {input.value = sample[input.id] ?? ''});update()}
form.addEventListener('submit',event => {event.preventDefault();update();document.querySelector('.results').scrollIntoView({behavior:'smooth',block:'start'})});
form.addEventListener('input',update);form.addEventListener('reset',()=>requestAnimationFrame(update));document.querySelector('#sample-button').addEventListener('click',loadSample);document.querySelector('#print-button').addEventListener('click',()=>{update();window.print()});loadSample();
