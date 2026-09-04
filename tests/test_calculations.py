from decimal import Decimal as D
import pytest
from app.calculations.financial import *
from app.services.analysis import analyze, grade_deal, SUBJECT_TO_WARNING
from app.schemas import AnalysisInput

def test_mortgage_payment(): assert monthly_mortgage_payment(D("100000"),D("0.06"),30)==D("599.55")
def test_cap_rate(): assert current_cap_rate(D("12000"),D("100000"))==D("0.1200")
def test_dscr(): assert dscr(D("15000"),D("12000"))==D("1.2500")
def test_noi(): assert annual_noi(D("2000"),D("100"),D("0.05"),D("500"))==D("17940.00")
def test_cash_flow(): assert monthly_cash_flow(D("18000"),D("12000"))==D("500.00")
def test_cash_on_cash(): assert cash_on_cash_return(D("5000"),D("25000"))==D("0.2000")
def test_total_cash():
    assert total_cash_required_to_close(down_payment=D(1),seller_cash_required=D(2),closing_costs=D(3),loan_arrears=D(4),delinquent_taxes=D(5),assumption_fees=D(6),immediate_renovation_expenses=D(7),initial_operating_reserves=D(8))==D("36.00")
def test_target_cap_price(): assert price_required_for_target_cap(D("12000"),D("0.12"))==D("100000.00")
def test_grades():
    assert grade_deal(cash_flow=D(500),coverage=D("1.3"),cash_ratio=D(".05"),stabilized_cap=D(".12"),coc=D(".1"),missing=[],unsustainable=False)=="A"
    assert grade_deal(cash_flow=D(1),coverage=D("1.16"),cash_ratio=D(".05"),stabilized_cap=D(".10"),coc=D(".1"),missing=["payoff"],unsustainable=False)=="B"
    assert grade_deal(cash_flow=D(-1),coverage=D(".9"),cash_ratio=D(".05"),stabilized_cap=D(".1"),coc=None,missing=[],unsustainable=False)=="REJECT"
def test_missing_data_not_invented():
    result=analyze(AnalysisInput(financing_structure="CONVENTIONAL",purchase_price=100000))
    assert result["calculated_metrics"]["annual_noi"] is None
    assert {"monthly_rental_income","monthly_operating_expenses","monthly_debt_payment"} <= set(result["missing_information"])
def test_verification_and_subject_to_warning():
    result=analyze(AnalysisInput(financing_structure="SUBJECT_TO",purchase_price=100000,monthly_rental_income=2000,monthly_operating_expenses=500,verification_statuses={"payoff":"ESTIMATED"}))
    assert any("not verified" in x for x in result["risk_flags"])
    assert SUBJECT_TO_WARNING in result["risk_flags"]
def test_negative_rejected():
    with pytest.raises(ValueError): AnalysisInput(financing_structure="CASH",purchase_price=-1)
def test_sensitive_field_rejected():
    with pytest.raises(ValueError): AnalysisInput(financing_structure="CASH",purchase_price=1,marital_status="divorced")
