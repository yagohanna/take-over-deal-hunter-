from decimal import Decimal, ROUND_HALF_UP
D = Decimal
MONEY = D("0.01")
RATE = D("0.0001")
def money(v: Decimal) -> Decimal: return v.quantize(MONEY, rounding=ROUND_HALF_UP)
def ratio(v: Decimal) -> Decimal: return v.quantize(RATE, rounding=ROUND_HALF_UP)
def monthly_mortgage_payment(principal: Decimal, annual_rate: Decimal, years: int) -> Decimal:
    if principal < 0 or annual_rate < 0 or years <= 0: raise ValueError("Invalid mortgage inputs")
    n = years * 12
    if annual_rate == 0: return money(principal / n)
    r = annual_rate / 12
    return money(principal * r * (1 + r) ** n / ((1 + r) ** n - 1))
def annual_debt_service(monthly_payments: Decimal) -> Decimal: return money(monthly_payments * 12)
def effective_rental_income(monthly_rent: Decimal, monthly_other: Decimal, vacancy_rate: Decimal) -> Decimal: return money((monthly_rent + monthly_other) * (1 - vacancy_rate) * 12)
def annual_noi(monthly_rent: Decimal, monthly_other: Decimal, vacancy_rate: Decimal, monthly_expenses: Decimal) -> Decimal: return money(effective_rental_income(monthly_rent, monthly_other, vacancy_rate) - monthly_expenses * 12)
def current_cap_rate(noi: Decimal, price: Decimal) -> Decimal | None: return ratio(noi / price) if price > 0 else None
def stabilized_cap_on_cost(noi: Decimal, purchase_price: Decimal, renovation: Decimal) -> Decimal | None:
    cost = purchase_price + renovation
    return ratio(noi / cost) if cost > 0 else None
def dscr(noi: Decimal, debt_service: Decimal) -> Decimal | None: return ratio(noi / debt_service) if debt_service > 0 else None
def annual_cash_flow(noi: Decimal, debt_service: Decimal) -> Decimal: return money(noi - debt_service)
def monthly_cash_flow(noi: Decimal, debt_service: Decimal) -> Decimal: return money((noi - debt_service) / 12)
def cash_on_cash_return(cash_flow: Decimal, cash_invested: Decimal) -> Decimal | None: return ratio(cash_flow / cash_invested) if cash_invested > 0 else None
def total_cash_required_to_close(*, down_payment: Decimal=D(0), seller_cash_required: Decimal=D(0), closing_costs: Decimal=D(0), loan_arrears: Decimal=D(0), delinquent_taxes: Decimal=D(0), assumption_fees: Decimal=D(0), immediate_renovation_expenses: Decimal=D(0), initial_operating_reserves: Decimal=D(0)) -> Decimal:
    # Each mutually exclusive line item is supplied exactly once by name.
    return money(sum((down_payment, seller_cash_required, closing_costs, loan_arrears, delinquent_taxes, assumption_fees, immediate_renovation_expenses, initial_operating_reserves), D(0)))
def estimated_seller_equity(value: Decimal, loan_balance: Decimal) -> Decimal: return money(value - loan_balance)
def price_required_for_target_cap(noi: Decimal, target_cap: Decimal) -> Decimal | None: return money(noi / target_cap) if target_cap > 0 else None
def price_per_unit(price: Decimal, units: int) -> Decimal | None: return money(price / units) if units > 0 else None
def break_even_occupancy(monthly_expenses: Decimal, monthly_debt: Decimal, gross_monthly_income: Decimal) -> Decimal | None: return ratio((monthly_expenses + monthly_debt) / gross_monthly_income) if gross_monthly_income > 0 else None
