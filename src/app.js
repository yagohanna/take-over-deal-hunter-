import { calculateDeal, assessDeal } from './calculator.js';

const form = document.querySelector('#deal-form');
const inputs = [...form.querySelectorAll('input, select')];
const report = document.querySelector('#deal-report');
const currency = new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0});
const percent = new Intl.NumberFormat('en-US',{style:'percent',minimumFractionDigits:1,maximumFractionDigits:2});
const money = value => Number.isFinite(value) ? currency.format(value) : 'Unknown';
const ratio = value => value === null || !Number.isFinite(value) ? 'Unknown' : `${value.toFixed(2)}x`;
const pct = value => value === null || !Number.isFinite(value) ? 'Unknown' : percent.format(value);
const rawValues = () => Object.fromEntries(inputs.map(input => [input.id,input.type === 'checkbox' ? input.checked : input.value]));
const knownMoney = (raw, key, calculated) => String(raw[key] ?? '').trim() === '' ? 'Unknown' : money(calculated ?? Number(raw[key]));
const knownText = (value, fallback='Unknown') => String(value ?? '').trim() || fallback;
const escapeHtml = value => String(value).replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
const financingLabels = {conventional:'Conventional Loan',assumption:'Existing Loan Assumption',subjectTo:'Subject-To Existing Loan',sellerFinancing:'Seller Financing',existingPlusSeller:'Existing Loan Plus Seller Financing'};
const subjectWarning = 'Subject-to transactions may trigger a due-on-sale clause. Existing loan terms, payment status, insurance requirements, title structure, and legal risks must be reviewed by a qualified real-estate attorney and title company before closing.';
let hasCalculated = false;
let copyText = '';

function validate() {
  const bad = inputs.filter(input => input.type === 'number' && input.value !== '' && (!Number.isFinite(Number(input.value)) || Number(input.value) < Number(input.min || 0) || (input.max && Number(input.value) > Number(input.max))));
  const summary = document.querySelector('#validation-summary');
  summary.hidden = !bad.length;
  summary.textContent = bad.length ? 'Correct highlighted values: numbers must be within the permitted non-negative range.' : '';
  return !bad.length;
}

const group = (title, rows) => `<section class="summary-group"><h3>${title}</h3><dl>${rows.map(([label,value])=>`<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join('')}</dl></section>`;
const bullets = (id, items) => { document.querySelector(id).innerHTML = (items.length ? items : ['None identified']).map(item=>`<li>${escapeHtml(item)}</li>`).join(''); };

function update() {
  if (!validate()) return;
  const raw = rawValues();
  const result = calculateDeal(raw);
  const assessment = assessDeal(result, raw);
  const generated = new Date();
  const propertyRows = [
    ['Property address',knownText(raw.propertyAddress)],['Property type',knownText(raw.propertyType)],['Number of units',raw.units ? String(result.units) : 'Unknown'],
    ['Purchase price',knownMoney(raw,'purchasePrice',result.purchasePrice)],['Estimated current value',knownMoney(raw,'currentValue',result.currentValue)],['After-repair value',knownMoney(raw,'afterRepairValue',result.afterRepairValue)],
    ['Renovation budget',knownMoney(raw,'renovationBudget',result.renovationBudget)],['Total project cost',raw.purchasePrice ? money(result.totalProjectCost) : 'Unknown']
  ];
  const financingRows = [
    ['Financing structure selected',financingLabels[result.financingType]],['Existing mortgage balance',knownMoney(raw,'existingMortgageBalance',result.firstMortgageBalance)],['Seller-financed amount',knownMoney(raw,'sellerFinancedAmount',result.sellerFinancedAmount)],
    ['Total debt',(raw.purchasePrice || raw.existingMortgageBalance || raw.sellerFinancedAmount) ? money(result.totalDebt) : 'Unknown'],['Down payment',knownMoney(raw,'downPayment')],['Seller cash required',knownMoney(raw,'sellerCashRequired')],
    ['Total estimated cash required to close',money(result.totalCashToClose)],['Total monthly debt service',money(result.monthlyDebtService)]
  ];
  const performanceRows = [
    ['Monthly NOI',money(result.monthlyNOI)],['Annual NOI',money(result.annualNOI)],['Current cap rate',pct(result.currentCapRate)],['Stabilized cap rate / cap on cost',pct(result.stabilizedCapRate)],
    ['DSCR',ratio(result.dscr)],['Monthly cash flow after expenses and debt',money(result.monthlyCashFlow)],['Annual cash flow',money(result.annualCashFlow)],['Cash-on-cash return',pct(result.cashOnCashReturn)],
    ['Break-even occupancy',pct(result.breakEvenOccupancy)],['Price per unit',raw.purchasePrice && raw.units ? money(result.pricePerUnit) : 'Unknown']
  ];
  document.querySelector('#summary-groups').innerHTML = group('Property summary',propertyRows)+group('Financing summary',financingRows)+group('Performance summary',performanceRows);
  document.querySelector('#result-address').textContent = knownText(raw.propertyAddress,'Property address unknown');
  document.querySelector('#generated-at').textContent = `Generated ${generated.toLocaleString()}`;
  const grade = document.querySelector('#deal-grade'); grade.className=`deal-grade grade-${assessment.code}`; grade.textContent=assessment.label;
  bullets('#why-list',assessment.why); bullets('#risk-list',assessment.risks); bullets('#missing-list',assessment.missing.length ? assessment.missing : ['No listed information gaps; independently verify all deal information']);
  document.querySelector('#recommendation').textContent=assessment.recommendation;
  const warning = document.querySelector('#subject-report-warning'); warning.hidden=result.financingType!=='subjectTo'; warning.textContent=subjectWarning;
  const textGroup=(title,rows)=>`${title.toUpperCase()}\n${rows.map(([a,b])=>`${a}: ${b}`).join('\n')}`;
  copyText = `TAKEOVER DEAL HUNTER\nDEAL SUMMARY & RECOMMENDATION\nGenerated: ${generated.toLocaleString()}\n\n${textGroup('Property summary',propertyRows)}\n\n${textGroup('Financing summary',financingRows)}\n\n${textGroup('Performance summary',performanceRows)}\n\nOVERALL DEAL GRADE\n${assessment.label}\n\nWHY THIS DEAL MAY WORK\n${assessment.why.map(x=>`• ${x}`).join('\n')}\n\nMAIN RISKS\n${assessment.risks.map(x=>`• ${x}`).join('\n')}\n\nINFORMATION STILL NEEDED\n${(assessment.missing.length?assessment.missing:['No listed information gaps; independently verify all deal information']).map(x=>`• ${x}`).join('\n')}\n\nRECOMMENDED NEXT ACTION\n${assessment.recommendation}${result.financingType==='subjectTo'?`\n\nSUBJECT-TO WARNING\n${subjectWarning}`:''}\n\nPreliminary investment analysis. All financial, loan, title, legal, property-condition, and rental information must be independently verified before purchase.`;
  report.hidden=false;
}

const sample = {propertyAddress:'418 Oakridge Avenue, Dayton, OH',propertyType:'2–4 Units',units:2,purchasePrice:285000,currentValue:310000,afterRepairValue:335000,renovationBudget:12000,closingCosts:4500,operatingReserves:6000,rentalIncome:3400,otherIncome:100,vacancy:5,propertyTaxes:310,insurance:145,utilities:100,maintenance:200,management:0,capex:175,hoa:0,financingType:'subjectTo',downPayment:0,existingMortgageBalance:228000,interestRate:3.25,remainingAmortization:25,existingMonthlyPayment:1111,sellerFinancedAmount:0,sellerInterestRate:0,sellerAmortization:0,sellerBalloonTerm:0,sellerCashRequired:18000,mortgageArrears:0,delinquentTaxes:0,assumptionFee:0,targetCapRate:8,targetCashFlow:500,targetCoc:12,maxCashToClose:45000};
function loadSample(){inputs.forEach(input => {if(input.type==='checkbox') input.checked=false; else input.value=sample[input.id] ?? ''});hasCalculated=true;update();report.scrollIntoView({behavior:'smooth',block:'start'})}
function resetDeal(){form.reset();hasCalculated=false;report.hidden=true;document.querySelector('#copy-status').textContent='';document.querySelector('#analyzer').scrollIntoView({behavior:'smooth'})}
form.addEventListener('submit',event=>{event.preventDefault();hasCalculated=true;update();if(!report.hidden)report.scrollIntoView({behavior:'smooth',block:'start'})});
form.addEventListener('input',()=>{if(hasCalculated)update()});
form.addEventListener('reset',()=>requestAnimationFrame(()=>{hasCalculated=false;report.hidden=true}));
document.querySelector('#sample-button').addEventListener('click',loadSample);
document.querySelector('#print-button').addEventListener('click',()=>{update();window.print()});
document.querySelector('#edit-button').addEventListener('click',()=>document.querySelector('.input-column').scrollIntoView({behavior:'smooth',block:'start'}));
document.querySelector('#reset-deal-button').addEventListener('click',resetDeal);
document.querySelector('#copy-button').addEventListener('click',async()=>{const status=document.querySelector('#copy-status');try{await navigator.clipboard.writeText(copyText);status.textContent='Summary copied.'}catch{status.textContent='Clipboard unavailable. Select and copy the report manually.'}});
