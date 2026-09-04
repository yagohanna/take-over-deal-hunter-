from decimal import Decimal as D
from app.calculations.financial import annual_cash_flow, annual_debt_service, annual_noi, cash_on_cash_return, current_cap_rate, dscr, monthly_cash_flow, stabilized_cap_on_cost, total_cash_required_to_close
from app.core.buy_box import BUY_BOX
from app.models import VerificationStatus
from app.schemas import AnalysisInput

SUBJECT_TO_WARNING = "Subject-to transactions may trigger a due-on-sale clause. Existing loan terms, payoff, payment status, insurance requirements, title structure, and legal risks must be independently verified before closing."

def grade_deal(*, cash_flow: D, coverage: D | None, cash_ratio: D, stabilized_cap: D | None, coc: D | None, missing: list[str], unsustainable: bool) -> str:
    if cash_flow < 0 or (coverage is not None and coverage < D("1.00")) or unsustainable: return "REJECT"
    if cash_flow > 0 and coverage is not None and coverage >= D("1.25") and cash_ratio <= D(str(BUY_BOX["maximum_cash_to_close_percent"])) and ((stabilized_cap is not None and stabilized_cap >= D("0.12")) or (coc is not None and coc >= D("0.20"))) and not missing: return "A"
    if cash_flow > 0 and coverage is not None and coverage >= D("1.15") and stabilized_cap is not None and D("0.09") <= stabilized_cap <= D("0.1199"): return "B"
    return "C"

def analyze(i: AnalysisInput) -> dict:
    missing = list(i.critical_information_missing)
    for name in ("monthly_rental_income", "monthly_operating_expenses"):
        if getattr(i, name) is None and name not in missing: missing.append(name)
    if i.financing_structure not in {"CASH"} and i.existing_monthly_debt_payment is None and i.seller_financing_payment == 0:
        missing.append("monthly_debt_payment")
    rent, expenses = i.monthly_rental_income, i.monthly_operating_expenses
    noi = annual_noi(rent, i.monthly_other_income, i.vacancy_rate, expenses) if rent is not None and expenses is not None else None
    debt_monthly = (i.existing_monthly_debt_payment or D(0)) + i.seller_financing_payment
    debt = annual_debt_service(debt_monthly)
    cash = total_cash_required_to_close(down_payment=i.down_payment, seller_cash_required=i.seller_cash_required, closing_costs=i.closing_costs, loan_arrears=i.loan_arrears, delinquent_taxes=i.delinquent_taxes, assumption_fees=i.assumption_fees, immediate_renovation_expenses=i.immediate_renovation_expenses, initial_operating_reserves=i.initial_operating_reserves)
    cf = annual_cash_flow(noi, debt) if noi is not None else None
    coverage = dscr(noi, debt) if noi is not None else None
    cap = current_cap_rate(noi, i.purchase_price) if noi is not None else None
    stabilized_noi = i.stabilized_annual_noi if i.stabilized_annual_noi is not None else noi
    stabilized = stabilized_cap_on_cost(stabilized_noi, i.purchase_price, i.immediate_renovation_expenses) if stabilized_noi is not None else None
    coc = cash_on_cash_return(cf, cash) if cf is not None else None
    cash_ratio = cash / i.purchase_price
    grade = grade_deal(cash_flow=cf or D(0), coverage=coverage, cash_ratio=cash_ratio, stabilized_cap=stabilized, coc=coc, missing=missing, unsustainable=i.unsustainable_financing)
    risks = []
    if cash_ratio > D("0.10"): risks.append("Cash to close exceeds configured maximum of 10%")
    if coverage is not None and coverage < D("1.25"): risks.append("DSCR is below the 1.25 buy-box minimum")
    for field, status in i.verification_statuses.items():
        if status in {VerificationStatus.ESTIMATED, VerificationStatus.UNKNOWN}: risks.append(f"{field} is {status.value.lower()} and is not verified")
    if i.financing_structure == "SUBJECT_TO": risks.append(SUBJECT_TO_WARNING)
    positives = []
    if cf is not None and cf > 0: positives.append("Positive monthly cash flow")
    if coverage is not None and coverage >= D("1.25"): positives.append("DSCR meets the buy-box minimum")
    action = "Reject under current terms" if grade == "REJECT" else ("Obtain and verify missing information" if missing else "Proceed to independent due diligence and negotiation")
    metrics = {"annual_noi": noi, "annual_debt_service": debt, "dscr": coverage, "cap_rate": cap, "stabilized_cap_on_cost": stabilized, "monthly_cash_flow": monthly_cash_flow(noi, debt) if noi is not None else None, "annual_cash_flow": cf, "cash_on_cash_return": coc, "total_cash_to_close": cash, "cash_to_close_ratio": cash_ratio}
    return {"inputs": i.model_dump(mode="json"), "calculated_metrics": metrics, "grade": grade, "positive_factors": positives, "risk_flags": risks, "missing_information": sorted(set(missing)), "recommended_next_action": action, "verification_statuses": {k: v.value for k, v in i.verification_statuses.items()}}
