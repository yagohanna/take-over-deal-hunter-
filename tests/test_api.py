import os
os.environ["DATABASE_URL"]="sqlite:///:memory:"
from fastapi.testclient import TestClient
from app.database.session import Base, engine
from app.main import app
Base.metadata.create_all(engine)
client=TestClient(app)
def test_health(): assert client.get("/health").json()["status"]=="ok"
def test_analysis_endpoint():
    response=client.post("/api/deals/analyze",json={"financing_structure":"SUBJECT_TO","purchase_price":"100000","monthly_rental_income":"2500","monthly_operating_expenses":"500","existing_monthly_debt_payment":"700","down_payment":"5000","stabilized_annual_noi":"25000","verification_statuses":{"payoff":"UNKNOWN"}})
    assert response.status_code==200
    body=response.json(); assert set(["inputs","calculated_metrics","grade","positive_factors","risk_flags","missing_information","recommended_next_action","verification_statuses"]) <= body.keys()
    assert any("due-on-sale" in flag for flag in body["risk_flags"])
def test_sensitive_api_input_rejected():
    response=client.post("/api/deals/analyze",json={"financing_structure":"CASH","purchase_price":1,"age":75})
    assert response.status_code==422
