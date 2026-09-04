import test from 'node:test';
import assert from 'node:assert/strict';
import { assessDeal, calculateDeal, getStatuses, monthlyLoanPayment } from './calculator.js';

const sample = {units:2,purchasePrice:285000,currentValue:310000,renovationBudget:12000,closingCosts:4500,operatingReserves:6000,rentalIncome:3400,otherIncome:100,vacancy:5,propertyTaxes:310,insurance:145,utilities:100,maintenance:200,management:0,capex:175,hoa:0,financingType:'subjectTo',existingMortgageBalance:228000,interestRate:3.25,remainingAmortization:25,existingMonthlyPayment:1111,sellerCashRequired:18000,targetCapRate:10};

test('amortizes interest-bearing and zero-interest loans deterministically',()=>{
  assert.equal(monthlyLoanPayment(120000,0,10),1000);
  assert.equal(monthlyLoanPayment(200000,6,30).toFixed(2),'1199.10');
  assert.equal(monthlyLoanPayment(0,6,30),0);
});

test('calculates the complete subject-to sample',()=>{
  const r=calculateDeal(sample);
  assert.equal(r.grossMonthlyIncome,3500);assert.equal(r.effectiveMonthlyIncome,3325);
  assert.equal(r.monthlyOperatingExpenses,930);assert.equal(r.monthlyNOI,2395);
  assert.equal(r.monthlyDebtService,1111);assert.equal(r.monthlyCashFlow,1284);
  assert.equal(r.totalCashToClose,40500);assert.equal(r.pricePerUnit,142500);
  assert.equal(r.debtPerUnit,114000);assert.equal(r.targetCapPrice,287400);
  assert.equal(r.firstPaymentIsEstimate,false);
});

test('calculates conventional and seller-financed payments',()=>{
  const conventional=calculateDeal({financingType:'conventional',purchasePrice:250000,downPayment:50000,interestRate:6,remainingAmortization:30,rentalIncome:2500});
  assert.equal(conventional.firstMortgageBalance,200000);assert.equal(conventional.firstMortgagePayment.toFixed(2),'1199.10');assert.equal(conventional.totalCashToClose,50000);
  const seller=calculateDeal({financingType:'sellerFinancing',sellerFinancedAmount:180000,sellerInterestRate:5,sellerAmortization:30,sellerCashRequired:20000});
  assert.equal(seller.firstMortgagePayment,0);assert.equal(seller.sellerFinancingPayment.toFixed(2),'966.28');
});

test('sanitizes empty, invalid, negative, and excessive vacancy values',()=>{
  const r=calculateDeal({units:-2,purchasePrice:'bad',rentalIncome:1000,vacancy:120,maintenance:-50});
  assert.equal(r.units,1);assert.equal(r.grossMonthlyIncome,1000);assert.equal(r.effectiveMonthlyIncome,0);assert.equal(r.monthlyOperatingExpenses,0);assert.equal(r.currentCapRate,null);assert.equal(r.dscr,null);
});

test('applies requested status thresholds',()=>{
  assert.deepEqual(getStatuses({dscr:1.25,monthlyCashFlow:1,cashToCloseRatio:.05,currentCapRate:.12}),{dscr:'green',cashFlow:'green',cashToClose:'green',capRate:'green'});
  assert.deepEqual(getStatuses({dscr:1.1,monthlyCashFlow:0,cashToCloseRatio:.1,currentCapRate:.09}),{dscr:'yellow',cashFlow:'red',cashToClose:'yellow',capRate:'yellow'});
  assert.deepEqual(getStatuses({dscr:1.09,monthlyCashFlow:-1,cashToCloseRatio:.101,currentCapRate:.089}),{dscr:'red',cashFlow:'red',cashToClose:'red',capRate:'red'});
});

const verified = {propertyAddress:'1 Main St',purchasePrice:100000,rentalIncome:2000,propertyTaxes:100,insurance:100,renovationBudget:5000,maxCashToClose:30000,rentRollVerified:true,t12Verified:true,occupancyVerified:true,financingType:'conventional'};
test('assigns deterministic A, B, C, and reject grades',()=>{
  const aInput={...verified,currentValue:120000,afterRepairValue:150000,downPayment:20000,interestRate:0,remainingAmortization:30};
  assert.equal(assessDeal(calculateDeal(aInput),aInput).code,'a');
  const bInput={...verified,purchasePrice:200000,currentValue:200000,renovationBudget:0,downPayment:40000,interestRate:5,remainingAmortization:30,rentalIncome:2300,propertyTaxes:300,insurance:200};
  assert.equal(assessDeal(calculateDeal(bInput),bInput).code,'b');
  const cInput={...verified,purchasePrice:250000,downPayment:50000,interestRate:7,remainingAmortization:30,rentalIncome:2300,propertyTaxes:300,insurance:200};
  assert.equal(assessDeal(calculateDeal(cInput),cInput).code,'c');
  const rejectInput={...verified,purchasePrice:250000,downPayment:0,interestRate:12,remainingAmortization:15,rentalIncome:1000};
  assert.equal(assessDeal(calculateDeal(rejectInput),rejectInput).code,'reject');
});

test('reports unverified subject-to information and its deterministic risks',()=>{
  const input={financingType:'subjectTo',purchasePrice:200000,rentalIncome:2000,existingMortgageBalance:150000,existingMonthlyPayment:900};
  const assessment=assessDeal(calculateDeal(input),input);
  assert.ok(assessment.missing.some(item=>item.includes('loan statement')));
  assert.ok(assessment.risks.includes('Subject-to due-on-sale risk'));
});
