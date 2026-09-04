from datetime import date, datetime, timezone
from decimal import Decimal
from enum import StrEnum
from sqlalchemy import Date, DateTime, Enum, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.session import Base

def now() -> datetime:
    return datetime.now(timezone.utc)

class VerificationStatus(StrEnum):
    VERIFIED_BY_DOCUMENT = "VERIFIED_BY_DOCUMENT"
    SELLER_OR_BROKER_PROVIDED = "SELLER_OR_BROKER_PROVIDED"
    PUBLIC_RECORD = "PUBLIC_RECORD"
    ESTIMATED = "ESTIMATED"
    UNKNOWN = "UNKNOWN"

class SignalType(StrEnum):
    TAX_DELINQUENCY = "tax delinquency"
    CODE_VIOLATIONS = "code violations"
    VACANCY = "vacancy"
    ABSENTEE_OWNERSHIP = "absentee ownership"
    LONG_OWNERSHIP_PERIOD = "long ownership period"
    FREE_AND_CLEAR_OWNERSHIP = "free-and-clear ownership"
    LOW_RATE_EXISTING_DEBT = "low-rate existing debt"
    EXPIRED_LISTING = "expired listing"
    PRICE_REDUCTIONS = "price reductions"
    RECORDED_LIENS = "recorded liens"
    FORECLOSURE_FILING = "foreclosure filing from an authorized source"
    COMMERCIAL_LOAN_MATURITY = "commercial loan maturity"
    BELOW_MARKET_RENTS = "below-market rents"
    DEFERRED_MAINTENANCE = "deferred maintenance"
    SELLER_FINANCING_KEYWORDS = "seller-financing keywords"
    ASSUMPTION_KEYWORDS = "assumption keywords"
    CREATIVE_FINANCING_KEYWORDS = "creative-financing keywords"
    TITLE_CHANGE = "title change"

class Property(Base):
    __tablename__ = "properties"
    id: Mapped[int] = mapped_column(primary_key=True)
    address: Mapped[str] = mapped_column(String(255)); city: Mapped[str] = mapped_column(String(100)); state: Mapped[str] = mapped_column(String(2)); zip_code: Mapped[str] = mapped_column(String(10))
    county: Mapped[str | None] = mapped_column(String(100)); parcel_number: Mapped[str | None] = mapped_column(String(100)); property_type: Mapped[str] = mapped_column(String(100))
    number_of_units: Mapped[int | None]; year_built: Mapped[int | None]; square_feet: Mapped[int | None]; occupancy: Mapped[Decimal | None] = mapped_column(Numeric(7,4))
    asking_price: Mapped[Decimal | None] = mapped_column(Numeric(14,2)); estimated_value: Mapped[Decimal | None] = mapped_column(Numeric(14,2)); after_repair_value: Mapped[Decimal | None] = mapped_column(Numeric(14,2)); renovation_budget: Mapped[Decimal | None] = mapped_column(Numeric(14,2))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now); updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, onupdate=now)
    loans: Mapped[list["Loan"]] = relationship(cascade="all, delete-orphan"); deals: Mapped[list["Deal"]] = relationship(cascade="all, delete-orphan")

class Loan(Base):
    __tablename__ = "loans"
    id: Mapped[int] = mapped_column(primary_key=True); property_id: Mapped[int] = mapped_column(ForeignKey("properties.id", ondelete="CASCADE"), index=True)
    loan_type: Mapped[str]; original_balance: Mapped[Decimal | None] = mapped_column(Numeric(14,2)); estimated_current_balance: Mapped[Decimal | None] = mapped_column(Numeric(14,2)); verified_payoff: Mapped[Decimal | None] = mapped_column(Numeric(14,2))
    interest_rate: Mapped[Decimal | None] = mapped_column(Numeric(7,4)); monthly_payment: Mapped[Decimal | None] = mapped_column(Numeric(14,2)); amortization_years: Mapped[int | None]; remaining_term_months: Mapped[int | None]; maturity_date: Mapped[date | None] = mapped_column(Date)
    lender_name: Mapped[str | None]; loan_status: Mapped[str | None]; assumability_status: Mapped[str | None]; prepayment_penalty: Mapped[Decimal | None] = mapped_column(Numeric(14,2)); arrears: Mapped[Decimal | None] = mapped_column(Numeric(14,2))
    information_status: Mapped[str] = mapped_column(default=VerificationStatus.UNKNOWN.value); source: Mapped[str | None]
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now); updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, onupdate=now)

class Deal(Base):
    __tablename__ = "deals"
    id: Mapped[int] = mapped_column(primary_key=True); property_id: Mapped[int | None] = mapped_column(ForeignKey("properties.id", ondelete="CASCADE"), index=True); financing_structure: Mapped[str]
    purchase_price: Mapped[Decimal] = mapped_column(Numeric(14,2)); down_payment: Mapped[Decimal] = mapped_column(Numeric(14,2)); seller_cash_required: Mapped[Decimal] = mapped_column(Numeric(14,2)); seller_financed_amount: Mapped[Decimal] = mapped_column(Numeric(14,2)); seller_financing_rate: Mapped[Decimal | None] = mapped_column(Numeric(7,4)); seller_financing_payment: Mapped[Decimal] = mapped_column(Numeric(14,2)); closing_costs: Mapped[Decimal] = mapped_column(Numeric(14,2)); initial_reserves: Mapped[Decimal] = mapped_column(Numeric(14,2)); total_cash_to_close: Mapped[Decimal] = mapped_column(Numeric(14,2))
    monthly_rental_income: Mapped[Decimal] = mapped_column(Numeric(14,2)); monthly_other_income: Mapped[Decimal] = mapped_column(Numeric(14,2)); vacancy_rate: Mapped[Decimal] = mapped_column(Numeric(7,4)); monthly_operating_expenses: Mapped[Decimal] = mapped_column(Numeric(14,2)); annual_noi: Mapped[Decimal] = mapped_column(Numeric(14,2)); annual_debt_service: Mapped[Decimal] = mapped_column(Numeric(14,2)); dscr: Mapped[Decimal | None] = mapped_column(Numeric(12,4)); cap_rate: Mapped[Decimal | None] = mapped_column(Numeric(12,4)); stabilized_cap_on_cost: Mapped[Decimal | None] = mapped_column(Numeric(12,4)); monthly_cash_flow: Mapped[Decimal] = mapped_column(Numeric(14,2)); annual_cash_flow: Mapped[Decimal] = mapped_column(Numeric(14,2)); cash_on_cash_return: Mapped[Decimal | None] = mapped_column(Numeric(12,4)); overall_grade: Mapped[str]
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now); updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, onupdate=now)

class OpportunitySignal(Base):
    __tablename__ = "opportunity_signals"
    id: Mapped[int] = mapped_column(primary_key=True); property_id: Mapped[int] = mapped_column(ForeignKey("properties.id", ondelete="CASCADE")); signal_type: Mapped[SignalType] = mapped_column(Enum(SignalType, validate_strings=True)); description: Mapped[str] = mapped_column(Text); source: Mapped[str | None]; confidence: Mapped[Decimal | None] = mapped_column(Numeric(5,4)); detected_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

class SourceRecord(Base):
    __tablename__ = "source_records"
    id: Mapped[int] = mapped_column(primary_key=True); property_id: Mapped[int] = mapped_column(ForeignKey("properties.id", ondelete="CASCADE")); source_name: Mapped[str]; source_url: Mapped[str | None]; retrieved_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now); evidence_text: Mapped[str | None] = mapped_column(Text); confidence: Mapped[Decimal | None] = mapped_column(Numeric(5,4)); verification_status: Mapped[str] = mapped_column(default=VerificationStatus.UNKNOWN.value)
