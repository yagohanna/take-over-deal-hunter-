from datetime import date, datetime
from decimal import Decimal
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field
from app.models import VerificationStatus

class StrictModel(BaseModel): model_config = ConfigDict(extra="forbid")
Money = Decimal
NonNegativeMoney = Field(default=Decimal("0"), ge=0)
class PropertyBase(StrictModel):
    address: str = Field(min_length=1, max_length=255); city: str = Field(min_length=1); state: str = Field(min_length=2, max_length=2); zip_code: str = Field(pattern=r"^\d{5}(-\d{4})?$"); county: str | None = None; parcel_number: str | None = None; property_type: str = Field(min_length=1); number_of_units: int | None = Field(default=None, ge=1); year_built: int | None = Field(default=None, ge=1600, le=2200); square_feet: int | None = Field(default=None, gt=0); occupancy: Decimal | None = Field(default=None, ge=0, le=1); asking_price: Money | None = Field(default=None, ge=0); estimated_value: Money | None = Field(default=None, ge=0); after_repair_value: Money | None = Field(default=None, ge=0); renovation_budget: Money | None = Field(default=None, ge=0)
class PropertyCreate(PropertyBase): pass
class PropertyUpdate(PropertyBase): pass
class PropertyRead(PropertyBase):
    model_config = ConfigDict(from_attributes=True, extra="forbid"); id: int; created_at: datetime; updated_at: datetime
class LoanCreate(StrictModel):
    loan_type: str = Field(min_length=1); original_balance: Money | None = Field(default=None, ge=0); estimated_current_balance: Money | None = Field(default=None, ge=0); verified_payoff: Money | None = Field(default=None, ge=0); interest_rate: Decimal | None = Field(default=None, ge=0); monthly_payment: Money | None = Field(default=None, ge=0); amortization_years: int | None = Field(default=None, gt=0); remaining_term_months: int | None = Field(default=None, ge=0); maturity_date: date | None = None; lender_name: str | None = None; loan_status: str | None = None; assumability_status: str | None = None; prepayment_penalty: Money | None = Field(default=None, ge=0); arrears: Money | None = Field(default=None, ge=0); information_status: VerificationStatus = VerificationStatus.UNKNOWN; source: str | None = None
class LoanRead(LoanCreate):
    model_config = ConfigDict(from_attributes=True, extra="forbid"); id: int; property_id: int; created_at: datetime; updated_at: datetime
class AnalysisInput(StrictModel):
    property_id: int | None = None; financing_structure: Literal["CASH", "CONVENTIONAL", "SUBJECT_TO", "SELLER_FINANCING", "LOAN_ASSUMPTION", "OTHER"]
    purchase_price: Money = Field(gt=0); down_payment: Money = Field(default=Decimal(0), ge=0); seller_cash_required: Money = Field(default=Decimal(0), ge=0); seller_financed_amount: Money = Field(default=Decimal(0), ge=0); seller_financing_rate: Decimal | None = Field(default=None, ge=0); seller_financing_payment: Money = Field(default=Decimal(0), ge=0); existing_monthly_debt_payment: Money | None = Field(default=None, ge=0)
    closing_costs: Money = Field(default=Decimal(0), ge=0); loan_arrears: Money = Field(default=Decimal(0), ge=0); delinquent_taxes: Money = Field(default=Decimal(0), ge=0); assumption_fees: Money = Field(default=Decimal(0), ge=0); immediate_renovation_expenses: Money = Field(default=Decimal(0), ge=0); initial_operating_reserves: Money = Field(default=Decimal(0), ge=0)
    monthly_rental_income: Money | None = Field(default=None, ge=0); monthly_other_income: Money = Field(default=Decimal(0), ge=0); vacancy_rate: Decimal = Field(default=Decimal("0.05"), ge=0, le=1); monthly_operating_expenses: Money | None = Field(default=None, ge=0); stabilized_annual_noi: Money | None = Field(default=None, ge=0); unsustainable_financing: bool = False; critical_information_missing: list[str] = []; verification_statuses: dict[str, VerificationStatus] = {}
class DealRead(StrictModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid"); id: int; property_id: int | None; financing_structure: str; purchase_price: Decimal; total_cash_to_close: Decimal; annual_noi: Decimal; annual_debt_service: Decimal; dscr: Decimal | None; cap_rate: Decimal | None; stabilized_cap_on_cost: Decimal | None; monthly_cash_flow: Decimal; annual_cash_flow: Decimal; cash_on_cash_return: Decimal | None; overall_grade: str; created_at: datetime; updated_at: datetime
