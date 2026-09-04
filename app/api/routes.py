from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.core.buy_box import BUY_BOX
from app.database.session import get_db
from app.models import Deal, Loan, Property
from app.schemas import AnalysisInput, DealRead, LoanCreate, LoanRead, PropertyCreate, PropertyRead, PropertyUpdate
from app.services.analysis import analyze
router = APIRouter(prefix="/api")
@router.get("/properties", response_model=list[PropertyRead])
def properties(db: Session=Depends(get_db)): return db.scalars(select(Property).order_by(Property.id)).all()
@router.post("/properties", response_model=PropertyRead, status_code=201)
def create_property(body: PropertyCreate, db: Session=Depends(get_db)):
    item=Property(**body.model_dump()); db.add(item); db.commit(); db.refresh(item); return item

def property_or_404(property_id: int, db: Session):
    item=db.get(Property, property_id)
    if not item: raise HTTPException(404, "Property not found")
    return item
@router.get("/properties/{property_id}", response_model=PropertyRead)
def get_property(property_id: int, db: Session=Depends(get_db)): return property_or_404(property_id, db)
@router.put("/properties/{property_id}", response_model=PropertyRead)
def update_property(property_id: int, body: PropertyUpdate, db: Session=Depends(get_db)):
    item=property_or_404(property_id, db)
    for key,value in body.model_dump().items(): setattr(item,key,value)
    db.commit(); db.refresh(item); return item
@router.delete("/properties/{property_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_property(property_id: int, db: Session=Depends(get_db)):
    db.delete(property_or_404(property_id, db)); db.commit()
@router.post("/properties/{property_id}/loans", response_model=LoanRead, status_code=201)
def create_loan(property_id: int, body: LoanCreate, db: Session=Depends(get_db)):
    property_or_404(property_id, db); item=Loan(property_id=property_id, **body.model_dump()); db.add(item); db.commit(); db.refresh(item); return item
@router.get("/deals", response_model=list[DealRead])
def deals(db: Session=Depends(get_db)): return db.scalars(select(Deal).order_by(Deal.id)).all()
@router.post("/deals/analyze")
def analyze_deal(body: AnalysisInput, db: Session=Depends(get_db)):
    if body.property_id is not None: property_or_404(body.property_id, db)
    result=analyze(body); m=result["calculated_metrics"]
    if m["annual_noi"] is not None:
        item=Deal(property_id=body.property_id, financing_structure=body.financing_structure, purchase_price=body.purchase_price, down_payment=body.down_payment, seller_cash_required=body.seller_cash_required, seller_financed_amount=body.seller_financed_amount, seller_financing_rate=body.seller_financing_rate, seller_financing_payment=body.seller_financing_payment, closing_costs=body.closing_costs, initial_reserves=body.initial_operating_reserves, total_cash_to_close=m["total_cash_to_close"], monthly_rental_income=body.monthly_rental_income, monthly_other_income=body.monthly_other_income, vacancy_rate=body.vacancy_rate, monthly_operating_expenses=body.monthly_operating_expenses, annual_noi=m["annual_noi"], annual_debt_service=m["annual_debt_service"], dscr=m["dscr"], cap_rate=m["cap_rate"], stabilized_cap_on_cost=m["stabilized_cap_on_cost"], monthly_cash_flow=m["monthly_cash_flow"], annual_cash_flow=m["annual_cash_flow"], cash_on_cash_return=m["cash_on_cash_return"], overall_grade=result["grade"]); db.add(item); db.commit(); db.refresh(item); result["deal_id"]=item.id
    return result
@router.get("/deals/{deal_id}", response_model=DealRead)
def get_deal(deal_id: int, db: Session=Depends(get_db)):
    item=db.get(Deal,deal_id)
    if not item: raise HTTPException(404,"Deal not found")
    return item
@router.get("/deals/{deal_id}/summary")
def deal_summary(deal_id: int, db: Session=Depends(get_db)):
    item=get_deal(deal_id,db); return {"deal_id":item.id,"grade":item.overall_grade,"monthly_cash_flow":item.monthly_cash_flow,"dscr":item.dscr,"total_cash_to_close":item.total_cash_to_close}
@router.get("/config/buy-box")
def buy_box(): return BUY_BOX
