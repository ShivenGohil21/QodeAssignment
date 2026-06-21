from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.db.models import Company, StockPrice, FinancialStatement, FinancialRatio
from app.db.schemas import CompanyResponse, StockPriceResponse, FinancialStatementResponse, FinancialRatioResponse

router = APIRouter()

@router.get("/companies", response_model=List[CompanyResponse])
def get_companies(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    sector: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Company).filter(Company.symbol != "^NSEI")
    if search:
        query = query.filter(
            (Company.symbol.ilike(f"%{search}%")) | 
            (Company.company_name.ilike(f"%{search}%"))
        )
    if sector:
        query = query.filter(Company.sector == sector)
        
    return query.order_by(Company.symbol.asc()).offset(skip).limit(limit).all()

@router.get("/company/{symbol}", response_model=CompanyResponse)
def get_company_by_symbol(symbol: str, db: Session = Depends(get_db)):
    company = db.query(Company).filter(Company.symbol.ilike(symbol)).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return company

@router.get("/prices/{symbol}", response_model=List[StockPriceResponse])
def get_company_prices(
    symbol: str, 
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db)
):
    company = db.query(Company).filter(Company.symbol.ilike(symbol)).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
        
    query = db.query(StockPrice).filter(StockPrice.company_id == company.id)
    if start_date:
        query = query.filter(StockPrice.date >= start_date)
    if end_date:
        query = query.filter(StockPrice.date <= end_date)
        
    return query.order_by(StockPrice.date.asc()).all()

@router.get("/fundamentals/{symbol}")
def get_company_fundamentals(symbol: str, db: Session = Depends(get_db)):
    company = db.query(Company).filter(Company.symbol.ilike(symbol)).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
        
    statements = db.query(FinancialStatement).filter(
        FinancialStatement.company_id == company.id
    ).order_by(FinancialStatement.report_date.desc()).all()
    
    ratios = db.query(FinancialRatio).filter(
        FinancialRatio.company_id == company.id
    ).order_by(FinancialRatio.report_date.desc()).all()
    
    return {
        "statements": statements,
        "ratios": ratios
    }
